package com.maxplay.app

import android.content.Context
import android.os.StatFs
import android.webkit.WebResourceResponse
import okhttp3.OkHttpClient
import okhttp3.Request
import org.json.JSONArray
import org.json.JSONObject
import java.io.ByteArrayInputStream
import java.io.File
import java.io.FileInputStream
import java.io.FileOutputStream
import java.io.InputStream
import java.util.concurrent.TimeUnit

/**
 * Native Disk Storage Engine for MaxPlay Offline Downloads.
 *
 * Saves HLS video segments (.ts / .m4s) and MP4 files directly into Android's private
 * internal storage (context.filesDir/maxplay_offline_vault/{safeKey}/) instead of
 * holding hundreds of megabytes in WebView RAM / IndexedDB Blobs.
 *
 * Supports:
 * 1. Direct native OkHttp segment downloading to disk with automatic retry.
 * 2. Segment checkpoint tracking (pause/resume from exact segment index even after app restart).
 * 3. Virtual local HLS server via shouldInterceptRequest:
 *    - https://maxplay.local/offline-vault/{safeKey}/index.m3u8
 *    - https://maxplay.local/offline-vault/{safeKey}/seg_{index}.ts
 *    - https://maxplay.local/offline-vault/{safeKey}/direct.mp4
 * 4. Real device storage statistics via Android StatFs.
 */
object MaxPlayOfflineVault {

    private const val VAULT_DIR_NAME = "maxplay_offline_vault"

    private val downloadHttpClient: OkHttpClient by lazy {
        OkHttpClient.Builder()
            .connectTimeout(20, TimeUnit.SECONDS)
            .readTimeout(45, TimeUnit.SECONDS)
            .followRedirects(true)
            .followSslRedirects(true)
            .retryOnConnectionFailure(true)
            .build()
    }

    private fun getVaultRoot(context: Context): File {
        val dir = File(context.filesDir, VAULT_DIR_NAME)
        if (!dir.exists()) {
            dir.mkdirs()
        }
        return dir
    }

    fun sanitizeKey(storageKey: String): String {
        return storageKey.replace(Regex("[^a-zA-Z0-9._-]"), "_")
    }

    fun getItemDir(context: Context, storageKey: String): File {
        val safe = sanitizeKey(storageKey)
        val dir = File(getVaultRoot(context), safe)
        if (!dir.exists()) {
            dir.mkdirs()
        }
        return dir
    }

    /**
     * Downloads a single HLS segment (video or audio) or MP4 chunk directly to internal storage via OkHttp.
     * If the segment already exists on disk and has > 512 bytes, returns its size immediately (0ms checkpoint resume).
     */
    fun downloadSegmentToDisk(
        context: Context,
        storageKey: String,
        segmentIndex: Int,
        segmentUrl: String,
        refererUrl: String = "",
        isAudio: Boolean = false
    ): JSONObject {
        val res = JSONObject()
        try {
            val itemDir = getItemDir(context, storageKey)
            val prefix = if (isAudio) "aud_" else "seg_"
            val segFile = File(itemDir, "${prefix}${segmentIndex}.ts")

            // Checkpoint Resume: If segment was already downloaded in an earlier session, reuse it!
            if (segFile.exists() && segFile.length() > 512L) {
                res.put("ok", true)
                res.put("bytes", segFile.length())
                res.put("cached", true)
                return res
            }

            val reqBuilder = Request.Builder()
                .url(segmentUrl)
                .header(
                    "User-Agent",
                    InbuiltStreamScraper.DEFAULT_USER_AGENT
                )
                .header("Accept", "*/*")

            val resolvedRef = if (refererUrl.isNotBlank()) {
                refererUrl
            } else {
                val segHost = try { android.net.Uri.parse(segmentUrl).host ?: "" } catch (_: Exception) { "" }
                CorsFreeWebViewClient.resolveRefererForHost(segHost)
            }

            if (resolvedRef.isNotBlank()) {
                reqBuilder.header("Referer", resolvedRef)
                try {
                    val refUri = android.net.Uri.parse(resolvedRef)
                    val refOrigin = "${refUri.scheme}://${refUri.host}"
                    if (!refUri.host.isNullOrBlank()) {
                        reqBuilder.header("Origin", refOrigin)
                    }
                } catch (_: Exception) {}
            }

            downloadHttpClient.newCall(reqBuilder.build()).execute().use { response ->
                if (!response.isSuccessful) {
                    res.put("ok", false)
                    res.put("error", "HTTP ${response.code}")
                    return res
                }

                val body = response.body
                if (body == null) {
                    res.put("ok", false)
                    res.put("error", "Empty response body")
                    return res
                }

                val tmpFile = File(itemDir, "${prefix}${segmentIndex}.tmp")
                body.byteStream().use { input ->
                    FileOutputStream(tmpFile).use { output ->
                        val buffer = ByteArray(32 * 1024)
                        var read: Int
                        while (input.read(buffer).also { read = it } != -1) {
                            output.write(buffer, 0, read)
                        }
                        output.flush()
                    }
                }

                if (tmpFile.exists() && tmpFile.length() > 0L) {
                    if (segFile.exists()) segFile.delete()
                    tmpFile.renameTo(segFile)
                    res.put("ok", true)
                    res.put("bytes", segFile.length())
                    res.put("cached", false)
                    return res
                } else {
                    tmpFile.delete()
                    res.put("ok", false)
                    res.put("error", "Zero bytes written")
                    return res
                }
            }
        } catch (e: Exception) {
            res.put("ok", false)
            res.put("error", e.message ?: "Disk segment download failed")
            return res
        }
    }

    /**
     * Writes metadata for a completed or in-progress HLS download so that we can generate
     * a valid local HLS playlist (index.m3u8, plus video.m3u8 & audio.m3u8 when separate audio track exists).
     */
    fun saveDownloadManifest(
        context: Context,
        storageKey: String,
        totalSegments: Int,
        totalDurationSec: Double,
        isSingleFile: Boolean = false,
        totalAudioSegments: Int = 0,
        languageLabel: String = "Default"
    ): Boolean {
        return try {
            val itemDir = getItemDir(context, storageKey)
            val metaFile = File(itemDir, "manifest.json")
            val json = JSONObject().apply {
                put("storageKey", storageKey)
                put("totalSegments", totalSegments)
                put("totalAudioSegments", totalAudioSegments)
                put("languageLabel", languageLabel)
                put("totalDurationSec", totalDurationSec)
                put("isSingleFile", isSingleFile)
                put("updatedAt", System.currentTimeMillis())
            }
            metaFile.writeText(json.toString())

            // Pre-generate local m3u8 playlist(s) on disk for instant playback
            generateLocalM3u8File(itemDir, totalSegments, totalDurationSec, totalAudioSegments, languageLabel)
            true
        } catch (_: Exception) {
            false
        }
    }

    private fun generateLocalM3u8File(
        itemDir: File,
        totalSegments: Int,
        totalDurationSec: Double,
        totalAudioSegments: Int = 0,
        languageLabel: String = "Default"
    ) {
        if (totalSegments <= 0) return
        val avgSegDur = if (totalDurationSec > 0 && totalSegments > 0) {
            (totalDurationSec / totalSegments).coerceIn(1.5, 12.0)
        } else {
            4.0
        }
        val targetDur = kotlin.math.ceil(avgSegDur + 2.0).toInt().coerceAtLeast(6)
        val segDurFormatted = String.format(java.util.Locale.US, "%.3f", avgSegDur)

        val videoSb = StringBuilder()
        videoSb.appendLine("#EXTM3U")
        videoSb.appendLine("#EXT-X-VERSION:3")
        videoSb.appendLine("#EXT-X-TARGETDURATION:$targetDur")
        videoSb.appendLine("#EXT-X-MEDIA-SEQUENCE:0")
        videoSb.appendLine("#EXT-X-PLAYLIST-TYPE:VOD")

        for (i in 0 until totalSegments) {
            val segFile = File(itemDir, "seg_${i}.ts")
            if (segFile.exists() && segFile.length() > 0L) {
                videoSb.appendLine("#EXTINF:$segDurFormatted,")
                videoSb.appendLine("seg_${i}.ts")
            }
        }
        videoSb.appendLine("#EXT-X-ENDLIST")

        // Check if separate audio segments exist on disk
        val hasAudioSegments = totalAudioSegments > 0 && File(itemDir, "aud_0.ts").exists()
        if (hasAudioSegments) {
            // Write video.m3u8
            File(itemDir, "video.m3u8").writeText(videoSb.toString())

            // Write audio.m3u8
            val avgAudDur = if (totalDurationSec > 0 && totalAudioSegments > 0) {
                (totalDurationSec / totalAudioSegments).coerceIn(1.5, 12.0)
            } else {
                avgSegDur
            }
            val audTargetDur = kotlin.math.ceil(avgAudDur + 2.0).toInt().coerceAtLeast(6)
            val audDurFormatted = String.format(java.util.Locale.US, "%.3f", avgAudDur)

            val audioSb = StringBuilder()
            audioSb.appendLine("#EXTM3U")
            audioSb.appendLine("#EXT-X-VERSION:3")
            audioSb.appendLine("#EXT-X-TARGETDURATION:$audTargetDur")
            audioSb.appendLine("#EXT-X-MEDIA-SEQUENCE:0")
            audioSb.appendLine("#EXT-X-PLAYLIST-TYPE:VOD")

            for (i in 0 until totalAudioSegments) {
                val audFile = File(itemDir, "aud_${i}.ts")
                if (audFile.exists() && audFile.length() > 0L) {
                    audioSb.appendLine("#EXTINF:$audDurFormatted,")
                    audioSb.appendLine("aud_${i}.ts")
                }
            }
            audioSb.appendLine("#EXT-X-ENDLIST")
            File(itemDir, "audio.m3u8").writeText(audioSb.toString())

            // Write Master index.m3u8 binding video.m3u8 + audio.m3u8
            val safeLangName = languageLabel.replace("\"", "").ifBlank { "Selected Audio" }
            val masterSb = StringBuilder()
            masterSb.appendLine("#EXTM3U")
            masterSb.appendLine("#EXT-X-VERSION:3")
            masterSb.appendLine("#EXT-X-MEDIA:TYPE=AUDIO,GROUP-ID=\"offline_audio\",NAME=\"$safeLangName\",LANGUAGE=\"$safeLangName\",DEFAULT=YES,AUTOSELECT=YES,URI=\"audio.m3u8\"")
            masterSb.appendLine("#EXT-X-STREAM-INF:BANDWIDTH=2000000,AUDIO=\"offline_audio\"")
            masterSb.appendLine("video.m3u8")
            File(itemDir, "index.m3u8").writeText(masterSb.toString())
        } else {
            // Single muxed stream: index.m3u8 is the media playlist directly
            File(itemDir, "index.m3u8").writeText(videoSb.toString())
        }
    }

    /**
     * Returns checkpoint status for a storageKey (how many video & audio segments exist on disk and total bytes).
     */
    fun getCheckpointInfo(context: Context, storageKey: String): JSONObject {
        val json = JSONObject()
        try {
            val safe = sanitizeKey(storageKey)
            val itemDir = File(getVaultRoot(context), safe)
            if (!itemDir.exists()) {
                json.put("exists", false)
                json.put("downloadedSegments", 0)
                json.put("totalBytes", 0L)
                return json
            }

            var count = 0
            var bytes = 0L
            val videoIdxList = mutableListOf<Int>()
            val audioIdxList = mutableListOf<Int>()
            val files = itemDir.listFiles() ?: emptyArray()
            for (f in files) {
                if (f.name.startsWith("seg_") && f.name.endsWith(".ts") && f.length() > 512L) {
                    count++
                    bytes += f.length()
                    val idxStr = f.name.removePrefix("seg_").removeSuffix(".ts")
                    idxStr.toIntOrNull()?.let { videoIdxList.add(it) }
                } else if (f.name.startsWith("aud_") && f.name.endsWith(".ts") && f.length() > 512L) {
                    bytes += f.length()
                    val idxStr = f.name.removePrefix("aud_").removeSuffix(".ts")
                    idxStr.toIntOrNull()?.let { audioIdxList.add(it) }
                }
            }

            videoIdxList.sort()
            audioIdxList.sort()
            val completedIndices = JSONArray()
            videoIdxList.forEach { completedIndices.put(it) }
            val completedAudioIndices = JSONArray()
            audioIdxList.forEach { completedAudioIndices.put(it) }

            json.put("exists", count > 0)
            json.put("downloadedSegments", count)
            json.put("totalBytes", bytes)
            json.put("completedIndices", completedIndices)
            json.put("completedAudioIndices", completedAudioIndices)
            json.put("playbackUrl", getLocalPlaybackUrl(storageKey))
        } catch (e: Exception) {
            json.put("exists", false)
            json.put("error", e.message ?: "Error")
        }
        return json
    }

    /**
     * Packages an offline item's segments directly on disk into a `.maxplay` container file with zero RAM overhead.
     */
    fun exportOfflineItemToMaxPlayFile(
        context: Context,
        storageKey: String,
        fileName: String,
        metadataJson: String
    ): File? {
        return try {
            val safe = sanitizeKey(storageKey)
            val itemDir = File(getVaultRoot(context), safe)
            if (!itemDir.exists()) return null

            val segFiles = (itemDir.listFiles { _, name ->
                name.startsWith("seg_") && name.endsWith(".ts")
            } ?: emptyArray()).filter { it.length() > 512L }.sortedBy {
                it.name.removePrefix("seg_").removeSuffix(".ts").toIntOrNull() ?: 0
            }

            if (segFiles.isEmpty()) return null

            val audFiles = (itemDir.listFiles { _, name ->
                name.startsWith("aud_") && name.endsWith(".ts")
            } ?: emptyArray()).filter { it.length() > 512L }.sortedBy {
                it.name.removePrefix("aud_").removeSuffix(".ts").toIntOrNull() ?: 0
            }

            val videoLengths = JSONArray()
            segFiles.forEach { videoLengths.put(it.length()) }
            val audioLengths = JSONArray()
            audFiles.forEach { audioLengths.put(it.length()) }

            val metadataObj = try {
                JSONObject(metadataJson)
            } catch (_: Exception) {
                JSONObject()
            }

            val headerObj = JSONObject().apply {
                put("magic", "MAXPLAY_CONTAINER_V1")
                put("exportedAt", System.currentTimeMillis())
                put("storageKey", storageKey)
                put("totalDurationSec", segFiles.size * 4)
                put("isSingleFile", segFiles.size == 1)
                put("videoSegmentLengths", videoLengths)
                put("audioSegmentLengths", audioLengths)
                put("metadata", metadataObj)
            }

            val headerBytes = headerObj.toString().toByteArray(Charsets.UTF_8)
            val magicBytes = "MAXPLAY1".toByteArray(Charsets.UTF_8)
            val hLen = headerBytes.size
            val lenBytes = byteArrayOf(
                ((hLen ushr 24) and 0xFF).toByte(),
                ((hLen ushr 16) and 0xFF).toByte(),
                ((hLen ushr 8) and 0xFF).toByte(),
                (hLen and 0xFF).toByte()
            )

            val cleanName = fileName.replace(Regex("[^a-zA-Z0-9._-]"), "_").let {
                if (it.endsWith(".maxplay")) it else "$it.maxplay"
            }
            val outDir = context.externalCacheDir ?: context.cacheDir
            val outFile = File(outDir, cleanName)
            if (outFile.exists()) outFile.delete()

            FileOutputStream(outFile).use { out ->
                out.write(magicBytes)
                out.write(lenBytes)
                out.write(headerBytes)
                val buf = ByteArray(64 * 1024)
                for (seg in segFiles) {
                    FileInputStream(seg).use { input ->
                        var r: Int
                        while (input.read(buf).also { r = it } != -1) {
                            out.write(buf, 0, r)
                        }
                    }
                }
                for (aud in audFiles) {
                    FileInputStream(aud).use { input ->
                        var r: Int
                        while (input.read(buf).also { r = it } != -1) {
                            out.write(buf, 0, r)
                        }
                    }
                }
                out.flush()
            }

            if (outFile.exists() && outFile.length() > 12L) outFile else null
        } catch (_: Exception) {
            null
        }
    }

    /**
     * Returns the virtual HTTPS URL intercepted by CorsFreeWebViewClient for zero-RAM playback.
     */
    fun getLocalPlaybackUrl(storageKey: String): String {
        val safe = sanitizeKey(storageKey)
        return "https://maxplay.local/offline-vault/$safe/index.m3u8"
    }

    /**
     * Checks if a downloaded item exists on native disk and is playable.
     */
    fun hasPlayableOfflineItem(context: Context, storageKey: String): Boolean {
        val safe = sanitizeKey(storageKey)
        val itemDir = File(getVaultRoot(context), safe)
        if (!itemDir.exists()) return false
        val seg0 = File(itemDir, "seg_0.ts")
        return seg0.exists() && seg0.length() > 512L
    }

    /**
     * Deletes all segments and metadata for a specific storageKey from native disk.
     */
    fun deleteOfflineItem(context: Context, storageKey: String): Boolean {
        return try {
            val safe = sanitizeKey(storageKey)
            val itemDir = File(getVaultRoot(context), safe)
            if (itemDir.exists()) {
                itemDir.deleteRecursively()
            }
            true
        } catch (_: Exception) {
            false
        }
    }

    /**
     * Returns real Android internal storage statistics (total, free, and used by MaxPlay downloads).
     */
    fun getDeviceStorageStats(context: Context): JSONObject {
        val json = JSONObject()
        try {
            val stat = StatFs(context.filesDir.absolutePath)
            val totalBytes = stat.totalBytes
            val freeBytes = stat.availableBytes
            val usedByAppBytes = calculateDirectorySize(getVaultRoot(context))

            json.put("ok", true)
            json.put("totalBytes", totalBytes)
            json.put("freeBytes", freeBytes)
            json.put("usedByAppBytes", usedByAppBytes)
            json.put("totalGb", String.format(java.util.Locale.US, "%.1f", totalBytes / (1024.0 * 1024.0 * 1024.0)).toDouble())
            json.put("freeGb", String.format(java.util.Locale.US, "%.1f", freeBytes / (1024.0 * 1024.0 * 1024.0)).toDouble())
            json.put("usedByAppMb", String.format(java.util.Locale.US, "%.1f", usedByAppBytes / (1024.0 * 1024.0)).toDouble())
        } catch (e: Exception) {
            json.put("ok", false)
            json.put("error", e.message ?: "Failed to read storage")
        }
        return json
    }

    private fun calculateDirectorySize(dir: File): Long {
        if (!dir.exists()) return 0L
        var total = 0L
        val files = dir.listFiles() ?: return 0L
        for (f in files) {
            total += if (f.isDirectory) calculateDirectorySize(f) else f.length()
        }
        return total
    }

    /**
     * Serves virtual local requests to https://maxplay.local/offline-vault/{safeKey}/...
     * directly from Android internal storage with 0% RAM overhead.
     */
    fun interceptOfflineVaultRequest(context: Context, url: String): WebResourceResponse? {
        try {
            // Expected pattern: https://maxplay.local/offline-vault/{safeKey}/{fileName}
            val marker = "/offline-vault/"
            val idx = url.indexOf(marker)
            if (idx == -1) return null

            val subPath = url.substring(idx + marker.length).substringBefore("?")
            val parts = subPath.split("/")
            if (parts.size < 2) return null

            val safeKey = sanitizeKey(parts[0])
            val fileName = parts[1]
            val itemDir = File(getVaultRoot(context), safeKey)
            if (!itemDir.exists()) return null

            val corsHeaders = mapOf(
                "Access-Control-Allow-Origin" to "*",
                "Access-Control-Allow-Methods" to "GET, HEAD, OPTIONS",
                "Access-Control-Allow-Headers" to "*",
                "Cache-Control" to "no-cache"
            )

            if (fileName == "index.m3u8" || fileName == "video.m3u8" || fileName == "audio.m3u8") {
                val m3u8File = File(itemDir, fileName)
                if (!m3u8File.exists() && fileName == "index.m3u8") {
                    // Dynamically build index.m3u8 from whatever seg_*.ts and aud_*.ts files exist on disk
                    val segFiles = (itemDir.listFiles { _, name ->
                        name.startsWith("seg_") && name.endsWith(".ts")
                    } ?: emptyArray()).sortedBy {
                        it.name.removePrefix("seg_").removeSuffix(".ts").toIntOrNull() ?: 0
                    }
                    val audFiles = (itemDir.listFiles { _, name ->
                        name.startsWith("aud_") && name.endsWith(".ts")
                    } ?: emptyArray()).sortedBy {
                        it.name.removePrefix("aud_").removeSuffix(".ts").toIntOrNull() ?: 0
                    }

                    if (segFiles.isEmpty()) return null
                    generateLocalM3u8File(itemDir, segFiles.size, segFiles.size * 4.0, audFiles.size, "Selected Audio")
                }

                if (m3u8File.exists()) {
                    val bytes = m3u8File.readBytes()
                    return WebResourceResponse(
                        "application/vnd.apple.mpegurl",
                        "UTF-8",
                        200,
                        "OK",
                        corsHeaders,
                        ByteArrayInputStream(bytes)
                    )
                }
            } else if ((fileName.startsWith("seg_") || fileName.startsWith("aud_")) && fileName.endsWith(".ts")) {
                val segFile = File(itemDir, fileName)
                if (segFile.exists() && segFile.length() > 0L) {
                    val fileHeaders = corsHeaders + ("Content-Length" to segFile.length().toString())
                    return WebResourceResponse(
                        "video/mp2t",
                        null,
                        200,
                        "OK",
                        fileHeaders,
                        FileInputStream(segFile)
                    )
                }
            }
        } catch (_: Exception) {
        }
        return null
    }

    /**
     * Scans the user's Android device storage via MediaStore.Video.Media for all video files
     * so they can be listed automatically in Downloads > Local files and played directly in MaxPlay.
     */
    fun scanDeviceLocalVideos(context: Context): JSONObject {
        val out = JSONObject()
        val arr = JSONArray()
        try {
            val projection = arrayOf(
                android.provider.MediaStore.Video.Media._ID,
                android.provider.MediaStore.Video.Media.DISPLAY_NAME,
                android.provider.MediaStore.Video.Media.TITLE,
                android.provider.MediaStore.Video.Media.SIZE,
                android.provider.MediaStore.Video.Media.DURATION,
                android.provider.MediaStore.Video.Media.WIDTH,
                android.provider.MediaStore.Video.Media.HEIGHT,
                android.provider.MediaStore.Video.Media.MIME_TYPE,
                android.provider.MediaStore.Video.Media.BUCKET_DISPLAY_NAME,
                android.provider.MediaStore.Video.Media.DATE_MODIFIED
            )

            val sortOrder = "${android.provider.MediaStore.Video.Media.DATE_MODIFIED} DESC"
            val cursor = context.contentResolver.query(
                android.provider.MediaStore.Video.Media.EXTERNAL_CONTENT_URI,
                projection,
                null,
                null,
                sortOrder
            )

            cursor?.use { c ->
                val idCol = c.getColumnIndexOrThrow(android.provider.MediaStore.Video.Media._ID)
                val nameCol = c.getColumnIndexOrThrow(android.provider.MediaStore.Video.Media.DISPLAY_NAME)
                val titleCol = c.getColumnIndexOrThrow(android.provider.MediaStore.Video.Media.TITLE)
                val sizeCol = c.getColumnIndexOrThrow(android.provider.MediaStore.Video.Media.SIZE)
                val durCol = c.getColumnIndexOrThrow(android.provider.MediaStore.Video.Media.DURATION)
                val wCol = c.getColumnIndexOrThrow(android.provider.MediaStore.Video.Media.WIDTH)
                val hCol = c.getColumnIndexOrThrow(android.provider.MediaStore.Video.Media.HEIGHT)
                val mimeCol = c.getColumnIndexOrThrow(android.provider.MediaStore.Video.Media.MIME_TYPE)
                val folderCol = c.getColumnIndexOrThrow(android.provider.MediaStore.Video.Media.BUCKET_DISPLAY_NAME)
                val dateCol = c.getColumnIndexOrThrow(android.provider.MediaStore.Video.Media.DATE_MODIFIED)

                var count = 0
                while (c.moveToNext() && count < 200) {
                    val id = c.getLong(idCol)
                    val sizeBytes = c.getLong(sizeCol)
                    if (sizeBytes < 64 * 1024L) continue // Ignore tiny/corrupt files

                    val displayName = c.getString(nameCol) ?: ""
                    val rawTitle = c.getString(titleCol) ?: displayName
                    val cleanTitle = rawTitle.replace(Regex("\\.(mp4|mkv|webm|mov|avi|flv|3gp)$", RegexOption.IGNORE_CASE), "")
                        .ifBlank { "Video $id" }

                    val durMs = c.getLong(durCol)
                    val width = c.getInt(wCol)
                    val height = c.getInt(hCol)
                    val mime = c.getString(mimeCol) ?: "video/mp4"
                    val folder = c.getString(folderCol) ?: "Phone Storage"
                    val dateMod = c.getLong(dateCol)

                    val shortSide = kotlin.math.min(width, height).let { if (it > 0) it else height }
                    val resLabel = when {
                        shortSide >= 2000 || width >= 3800 -> "4K"
                        shortSide >= 1000 || height >= 1000 -> "1080p"
                        shortSide >= 700 || height >= 700 -> "720p"
                        shortSide >= 450 || height >= 450 -> "480p"
                        shortSide > 0 -> "${shortSide}p"
                        else -> "HD"
                    }

                    val sizeMb = String.format(java.util.Locale.US, "%.1f", sizeBytes / (1024.0 * 1024.0)).toDouble()

                     val isVertical = height > width && width > 0

                    val obj = JSONObject().apply {
                        put("id", id.toString())
                        put("title", cleanTitle)
                        put("folderName", folder)
                        put("sizeMb", sizeMb)
                        put("durationSec", (durMs / 1000L).toInt())
                        put("resolution", resLabel)
                        put("width", width)
                        put("height", height)
                        put("isVertical", isVertical)
                        put("mimeType", mime)
                        put("dateModified", dateMod)
                        put("playbackUrl", "https://maxplay.local/device-video/$id")
                        put("thumbnailUrl", "https://maxplay.local/device-video-thumb/$id")
                    }
                    arr.put(obj)
                    count++
                }
            }
            out.put("ok", true)
            out.put("videos", arr)
        } catch (e: Exception) {
            out.put("ok", false)
            out.put("videos", arr)
            out.put("error", e.message ?: "Scan failed")
        }
        return out
    }

    /**
     * Generates and serves a real video frame thumbnail for any local video (`https://maxplay.local/device-video-thumb/{id}`)
     * with disk caching so subsequent opens render in 0ms.
     */
    fun interceptDeviceVideoThumbRequest(
        context: Context,
        url: String
    ): WebResourceResponse? {
        return try {
            val marker = "/device-video-thumb/"
            val idx = url.indexOf(marker)
            if (idx == -1) return null

            val idStr = url.substring(idx + marker.length).substringBefore("?").substringBefore("/").trim()
            val videoId = idStr.toLongOrNull() ?: return null

            val corsHeaders = mapOf(
                "Access-Control-Allow-Origin" to "*",
                "Access-Control-Allow-Methods" to "GET, HEAD, OPTIONS",
                "Access-Control-Allow-Headers" to "*",
                "Cache-Control" to "public, max-age=86400"
            )

            val thumbDir = File(context.cacheDir, "video_thumbs")
            if (!thumbDir.exists()) thumbDir.mkdirs()
            val cachedThumb = File(thumbDir, "thumb_$videoId.jpg")

            if (cachedThumb.exists() && cachedThumb.length() > 256L) {
                return WebResourceResponse(
                    "image/jpeg",
                    null,
                    200,
                    "OK",
                    corsHeaders,
                    FileInputStream(cachedThumb)
                )
            }

            val contentUri = android.content.ContentUris.withAppendedId(
                android.provider.MediaStore.Video.Media.EXTERNAL_CONTENT_URI,
                videoId
            )

            var bitmap: android.graphics.Bitmap? = null

            // 1. Fast Android 10+ (API 29+) MediaStore loadThumbnail
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.Q) {
                try {
                    bitmap = context.contentResolver.loadThumbnail(
                        contentUri,
                        android.util.Size(640, 360),
                        null
                    )
                } catch (_: Exception) {}
            }

            // 2. Fallback: MediaMetadataRetriever real frame extraction (preserves true video aspect ratio)
            if (bitmap == null) {
                val retriever = android.media.MediaMetadataRetriever()
                try {
                    retriever.setDataSource(context, contentUri)
                    bitmap = retriever.getFrameAtTime(
                        1_500_000L,
                        android.media.MediaMetadataRetriever.OPTION_CLOSEST_SYNC
                    ) ?: retriever.getFrameAtTime()
                } catch (_: Exception) {
                } finally {
                    try { retriever.release() } catch (_: Exception) {}
                }
            }

            // 3. Fallback: Legacy MediaStore Video.Thumbnails
            if (bitmap == null) {
                try {
                    @Suppress("DEPRECATION")
                    bitmap = android.provider.MediaStore.Video.Thumbnails.getThumbnail(
                        context.contentResolver,
                        videoId,
                        android.provider.MediaStore.Video.Thumbnails.MINI_KIND,
                        null
                    )
                } catch (_: Exception) {}
            }

            if (bitmap != null) {
                val baos = java.io.ByteArrayOutputStream()
                bitmap.compress(android.graphics.Bitmap.CompressFormat.JPEG, 84, baos)
                val bytes = baos.toByteArray()
                if (bytes.isNotEmpty()) {
                    try {
                        FileOutputStream(cachedThumb).use { it.write(bytes) }
                    } catch (_: Exception) {}
                    return WebResourceResponse(
                        "image/jpeg",
                        null,
                        200,
                        "OK",
                        corsHeaders,
                        ByteArrayInputStream(bytes)
                    )
                }
            }
            null
        } catch (_: Exception) {
            null
        }
    }

    /**
     * Streams any local video from Android MediaStore (`https://maxplay.local/device-video/{id}`)
     * with full HTTP Range seeking support so users can scrub anywhere in 0ms without copying the file into RAM.
     */
    fun interceptDeviceVideoRequest(
        context: Context,
        url: String,
        rangeHeader: String?
    ): WebResourceResponse? {
        return try {
            val marker = "/device-video/"
            val idx = url.indexOf(marker)
            if (idx == -1) return null

            val idStr = url.substring(idx + marker.length).substringBefore("?").substringBefore("/").trim()
            val videoId = idStr.toLongOrNull() ?: return null

            val contentUri = android.content.ContentUris.withAppendedId(
                android.provider.MediaStore.Video.Media.EXTERNAL_CONTENT_URI,
                videoId
            )

            val mimeType = context.contentResolver.getType(contentUri) ?: "video/mp4"
            val afd = context.contentResolver.openAssetFileDescriptor(contentUri, "r") ?: return null
            val totalLength = afd.length

            val baseHeaders = mutableMapOf(
                "Access-Control-Allow-Origin" to "*",
                "Access-Control-Allow-Methods" to "GET, HEAD, OPTIONS",
                "Access-Control-Allow-Headers" to "*",
                "Access-Control-Expose-Headers" to "Content-Length, Content-Range, Accept-Ranges",
                "Accept-Ranges" to "bytes"
            )

            if (!rangeHeader.isNullOrBlank() && rangeHeader.startsWith("bytes=") && totalLength > 0) {
                val rangeSpec = rangeHeader.removePrefix("bytes=").substringBefore(",")
                val parts = rangeSpec.split("-")
                val start = parts.getOrNull(0)?.trim()?.toLongOrNull() ?: 0L
                val end = parts.getOrNull(1)?.trim()?.takeIf { it.isNotEmpty() }?.toLongOrNull()
                    ?: (totalLength - 1L)
                val clampedStart = start.coerceIn(0L, (totalLength - 1L).coerceAtLeast(0L))
                val clampedEnd = end.coerceIn(clampedStart, (totalLength - 1L).coerceAtLeast(clampedStart))
                val contentLength = (clampedEnd - clampedStart + 1L).coerceAtLeast(0L)

                val fis = afd.createInputStream()
                if (clampedStart > 0L) {
                    var skipped = 0L
                    while (skipped < clampedStart) {
                        val s = fis.skip(clampedStart - skipped)
                        if (s <= 0L) break
                        skipped += s
                    }
                }

                baseHeaders["Content-Range"] = "bytes $clampedStart-$clampedEnd/$totalLength"
                baseHeaders["Content-Length"] = contentLength.toString()

                return WebResourceResponse(
                    mimeType,
                    null,
                    206,
                    "Partial Content",
                    baseHeaders,
                    fis
                )
            } else {
                if (totalLength > 0) {
                    baseHeaders["Content-Length"] = totalLength.toString()
                }
                return WebResourceResponse(
                    mimeType,
                    null,
                    200,
                    "OK",
                    baseHeaders,
                    afd.createInputStream()
                )
            }
        } catch (_: Exception) {
            null
        }
    }

    // =========================================================================
    // DIRECT APP-TO-APP P2P TRANSFER ENGINE (MaxPlay-to-MaxPlay Direct Stream)
    // =========================================================================
    @Volatile
    private var p2pServerSocket: java.net.ServerSocket? = null
    @Volatile
    private var p2pActiveCode: String = ""
    @Volatile
    private var p2pActiveStorageKey: String = ""
    @Volatile
    private var p2pActiveMetadataJson: String = "{}"

    private fun getLocalLanIpAddress(context: Context): String {
        try {
            val interfaces = java.net.NetworkInterface.getNetworkInterfaces()
            var candidateIp = ""
            while (interfaces.hasMoreElements()) {
                val intf = interfaces.nextElement()
                if (!intf.isUp || intf.isLoopback) continue
                val name = intf.name.lowercase()
                val addrs = intf.inetAddresses
                while (addrs.hasMoreElements()) {
                    val addr = addrs.nextElement()
                    if (!addr.isLoopbackAddress && addr is java.net.Inet4Address) {
                        val ip = addr.hostAddress ?: continue
                        if (name.contains("wlan") || name.contains("ap") || name.contains("swlan")) {
                            return ip
                        }
                        if (candidateIp.isEmpty()) {
                            candidateIp = ip
                        }
                    }
                }
            }
            if (candidateIp.isNotEmpty()) return candidateIp
        } catch (_: Exception) {}
        return "127.0.0.1"
    }

    fun stopDirectTransferServer() {
        try {
            p2pActiveCode = ""
            p2pServerSocket?.close()
            p2pServerSocket = null
        } catch (_: Exception) {}
    }

    /**
     * Starts an embedded HTTP ServerSocket on port 48821 (or dynamic fallback port) so another
     * MaxPlay app on the same Wi-Fi / Hotspot can stream segments directly App-to-App.
     */
    fun startDirectTransferServer(
        context: Context,
        storageKey: String,
        transferCode: String,
        metadataJson: String
    ): JSONObject {
        val out = JSONObject()
        try {
            stopDirectTransferServer()

            val safe = sanitizeKey(storageKey)
            val itemDir = File(getVaultRoot(context), safe)
            if (!itemDir.exists()) {
                out.put("ok", false)
                out.put("error", "Offline item directory not found on disk")
                return out
            }

            val segFiles = (itemDir.listFiles { _, name ->
                name.startsWith("seg_") && name.endsWith(".ts")
            } ?: emptyArray()).filter { it.length() > 512L }.sortedBy {
                it.name.removePrefix("seg_").removeSuffix(".ts").toIntOrNull() ?: 0
            }

            if (segFiles.isEmpty()) {
                out.put("ok", false)
                out.put("error", "No video segments found for this download")
                return out
            }

            val audFiles = (itemDir.listFiles { _, name ->
                name.startsWith("aud_") && name.endsWith(".ts")
            } ?: emptyArray()).filter { it.length() > 512L }.sortedBy {
                it.name.removePrefix("aud_").removeSuffix(".ts").toIntOrNull() ?: 0
            }

            var totalBytes = 0L
            segFiles.forEach { totalBytes += it.length() }
            audFiles.forEach { totalBytes += it.length() }

            val server = try {
                java.net.ServerSocket(48821)
            } catch (_: Exception) {
                java.net.ServerSocket(0)
            }

            p2pServerSocket = server
            p2pActiveCode = transferCode.trim()
            p2pActiveStorageKey = storageKey
            p2pActiveMetadataJson = metadataJson

            val boundPort = server.localPort
            val localIp = getLocalLanIpAddress(context)

            InbuiltStreamScraper.backgroundExecutor.execute {
                while (p2pServerSocket == server && !server.isClosed) {
                    try {
                        val client = server.accept()
                        InbuiltStreamScraper.backgroundExecutor.execute {
                            handleP2pClientSocket(context, client, segFiles, audFiles, totalBytes)
                        }
                    } catch (_: Exception) {
                        break
                    }
                }
            }

            out.put("ok", true)
            out.put("ip", localIp)
            out.put("port", boundPort)
            out.put("totalSegments", segFiles.size)
            out.put("totalAudioSegments", audFiles.size)
            out.put("totalBytes", totalBytes)
        } catch (e: Exception) {
            out.put("ok", false)
            out.put("error", e.message ?: "Failed to start transfer server")
        }
        return out
    }

    private fun handleP2pClientSocket(
        context: Context,
        socket: java.net.Socket,
        segFiles: List<File>,
        audFiles: List<File>,
        totalBytes: Long
    ) {
        socket.use { s ->
            try {
                s.soTimeout = 15000
                val reader = java.io.BufferedReader(java.io.InputStreamReader(s.getInputStream()))
                val requestLine = reader.readLine() ?: return
                val parts = requestLine.split(" ")
                if (parts.size < 2) return
                val reqPath = parts[1].substringBefore("?")

                val outStream = s.getOutputStream()
                val prefix = "/maxplay-p2p/$p2pActiveCode/"
                if (!reqPath.startsWith(prefix)) {
                    val errBytes = "Not Found".toByteArray()
                    outStream.write("HTTP/1.1 404 Not Found\r\nContent-Length: ${errBytes.size}\r\n\r\n".toByteArray())
                    outStream.write(errBytes)
                    outStream.flush()
                    return
                }

                val targetName = reqPath.removePrefix(prefix)
                if (targetName == "manifest.json") {
                    val metaObj = try { JSONObject(p2pActiveMetadataJson) } catch (_: Exception) { JSONObject() }
                    val manifestJson = JSONObject().apply {
                        put("ok", true)
                        put("code", p2pActiveCode)
                        put("storageKey", p2pActiveStorageKey)
                        put("totalSegments", segFiles.size)
                        put("totalAudioSegments", audFiles.size)
                        put("totalDurationSec", segFiles.size * 4.0)
                        put("totalBytes", totalBytes)
                        put("metadata", metaObj)
                    }.toString().toByteArray(Charsets.UTF_8)

                    val headers = "HTTP/1.1 200 OK\r\n" +
                        "Content-Type: application/json\r\n" +
                        "Access-Control-Allow-Origin: *\r\n" +
                        "Content-Length: ${manifestJson.size}\r\n" +
                        "Connection: close\r\n\r\n"
                    outStream.write(headers.toByteArray(Charsets.UTF_8))
                    outStream.write(manifestJson)
                    outStream.flush()
                    return
                }

                val safe = sanitizeKey(p2pActiveStorageKey)
                val itemDir = File(getVaultRoot(context), safe)
                val targetFile = if (targetName.startsWith("seg_") && targetName.endsWith(".ts")) {
                    val idx = targetName.removePrefix("seg_").removeSuffix(".ts").toIntOrNull() ?: -1
                    segFiles.getOrNull(idx) ?: File(itemDir, targetName)
                } else if (targetName.startsWith("aud_") && targetName.endsWith(".ts")) {
                    val idx = targetName.removePrefix("aud_").removeSuffix(".ts").toIntOrNull() ?: -1
                    audFiles.getOrNull(idx) ?: File(itemDir, targetName)
                } else {
                    null
                }

                if (targetFile != null && targetFile.exists()) {
                    val headers = "HTTP/1.1 200 OK\r\n" +
                        "Content-Type: video/mp2t\r\n" +
                        "Access-Control-Allow-Origin: *\r\n" +
                        "Content-Length: ${targetFile.length()}\r\n" +
                        "Connection: close\r\n\r\n"
                    outStream.write(headers.toByteArray(Charsets.UTF_8))
                    FileInputStream(targetFile).use { fis ->
                        val buf = ByteArray(64 * 1024)
                        var r: Int
                        while (fis.read(buf).also { r = it } != -1) {
                            outStream.write(buf, 0, r)
                        }
                    }
                    outStream.flush()
                } else {
                    outStream.write("HTTP/1.1 404 Not Found\r\nContent-Length: 0\r\n\r\n".toByteArray())
                    outStream.flush()
                }
            } catch (_: Exception) {}
        }
    }

    /**
     * Streams all segments directly from another MaxPlay device over LAN HTTP (`http://senderIp:senderPort/maxplay-p2p/{code}/...`)
     * into this device's native offline vault (`targetStorageKey`).
     */
    fun receiveDirectTransferFromPeer(
        context: Context,
        senderIp: String,
        senderPort: Int,
        transferCode: String,
        targetStorageKey: String,
        onProgress: (Int, String) -> Unit
    ): JSONObject {
        val out = JSONObject()
        try {
            val baseUrl = "http://${senderIp.trim()}:$senderPort/maxplay-p2p/${transferCode.trim()}"
            onProgress(5, "Connecting to sender MaxPlay app ($senderIp)...")

            val manifestReq = Request.Builder().url("$baseUrl/manifest.json").build()
            val manifestObj = downloadHttpClient.newCall(manifestReq).execute().use { resp ->
                if (!resp.isSuccessful) {
                    throw Exception("Could not connect to sender phone over Wi-Fi/Hotspot (HTTP ${resp.code})")
                }
                val str = resp.body?.string() ?: throw Exception("Empty manifest from sender")
                JSONObject(str)
            }

            val totalSegs = manifestObj.optInt("totalSegments", 0)
            val totalAudSegs = manifestObj.optInt("totalAudioSegments", 0)
            val totalDur = manifestObj.optDouble("totalDurationSec", totalSegs * 4.0)
            val metaObj = manifestObj.optJSONObject("metadata") ?: JSONObject()
            val langLabel = metaObj.optString("language", "Default")

            if (totalSegs <= 0) {
                throw Exception("Sender has 0 segments for this item")
            }

            val itemDir = getItemDir(context, targetStorageKey)
            var receivedBytes = 0L
            val totalUnits = (totalSegs + totalAudSegs).coerceAtLeast(1)
            var completedUnits = 0

            for (i in 0 until totalSegs) {
                val segUrl = "$baseUrl/seg_${i}.ts"
                val segFile = File(itemDir, "seg_${i}.ts")
                val req = Request.Builder().url(segUrl).build()
                downloadHttpClient.newCall(req).execute().use { resp ->
                    if (!resp.isSuccessful) throw Exception("Segment $i transfer interrupted")
                    val body = resp.body ?: throw Exception("Empty segment $i")
                    FileOutputStream(segFile).use { fos ->
                        body.byteStream().use { input ->
                            val buf = ByteArray(64 * 1024)
                            var r: Int
                            while (input.read(buf).also { r = it } != -1) {
                                fos.write(buf, 0, r)
                                receivedBytes += r
                            }
                        }
                    }
                }
                completedUnits++
                val pct = (10 + ((completedUnits.toDouble() / totalUnits.toDouble()) * 85.0)).toInt().coerceIn(10, 95)
                if (i % 3 == 0 || i == totalSegs - 1) {
                    val mbNow = String.format(java.util.Locale.US, "%.1f", receivedBytes / (1024.0 * 1024.0))
                    onProgress(pct, "Receiving directly from MaxPlay ($mbNow MB)...")
                }
            }

            for (i in 0 until totalAudSegs) {
                val audUrl = "$baseUrl/aud_${i}.ts"
                val audFile = File(itemDir, "aud_${i}.ts")
                val req = Request.Builder().url(audUrl).build()
                downloadHttpClient.newCall(req).execute().use { resp ->
                    if (resp.isSuccessful && resp.body != null) {
                        FileOutputStream(audFile).use { fos ->
                            resp.body!!.byteStream().use { input ->
                                val buf = ByteArray(64 * 1024)
                                var r: Int
                                while (input.read(buf).also { r = it } != -1) {
                                    fos.write(buf, 0, r)
                                    receivedBytes += r
                                }
                            }
                        }
                    }
                }
                completedUnits++
                val pct = (10 + ((completedUnits.toDouble() / totalUnits.toDouble()) * 85.0)).toInt().coerceIn(10, 96)
                if (i % 4 == 0 || i == totalAudSegs - 1) {
                    val mbNow = String.format(java.util.Locale.US, "%.1f", receivedBytes / (1024.0 * 1024.0))
                    onProgress(pct, "Receiving audio track ($mbNow MB)...")
                }
            }

            saveDownloadManifest(
                context = context,
                storageKey = targetStorageKey,
                totalSegments = totalSegs,
                totalDurationSec = totalDur,
                isSingleFile = totalSegs == 1,
                totalAudioSegments = totalAudSegs,
                languageLabel = langLabel
            )

            onProgress(100, "Transfer Complete!")
            out.put("ok", true)
            out.put("totalBytes", receivedBytes)
            out.put("metadata", metaObj)
        } catch (e: Exception) {
            out.put("ok", false)
            out.put("error", e.message ?: "Direct P2P transfer failed")
        }
        return out
    }
}
