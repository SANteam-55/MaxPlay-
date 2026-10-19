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
                    "Mozilla/5.0 (Linux; Android 14; Pixel 8 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36"
                )
                .header("Accept", "*/*")

            if (refererUrl.isNotBlank()) {
                reqBuilder.header("Referer", refererUrl)
            } else {
                try {
                    val uri = android.net.Uri.parse(segmentUrl)
                    val origin = "${uri.scheme}://${uri.host}"
                    reqBuilder.header("Referer", "$origin/")
                    reqBuilder.header("Origin", origin)
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
            val completedIndices = JSONArray()
            val completedAudioIndices = JSONArray()
            val files = itemDir.listFiles() ?: emptyArray()
            for (f in files) {
                if (f.name.startsWith("seg_") && f.name.endsWith(".ts") && f.length() > 512L) {
                    count++
                    bytes += f.length()
                    val idxStr = f.name.removePrefix("seg_").removeSuffix(".ts")
                    idxStr.toIntOrNull()?.let { completedIndices.put(it) }
                } else if (f.name.startsWith("aud_") && f.name.endsWith(".ts") && f.length() > 512L) {
                    bytes += f.length()
                    val idxStr = f.name.removePrefix("aud_").removeSuffix(".ts")
                    idxStr.toIntOrNull()?.let { completedAudioIndices.put(it) }
                }
            }

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
}
