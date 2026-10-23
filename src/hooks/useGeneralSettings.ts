import { useState, useEffect, useCallback } from 'react';
import { doc, onSnapshot, getDoc, getDocs, collection } from 'firebase/firestore';
import { db } from '../services/firebase';
import { subscribeToAnnouncements, MESSAGES_COLLECTION } from '../services/contentService';

export const DEFAULT_INSTALLED_APK_VERSION = 'v2.5.0';

export function formatVersionTag(ver?: string): string {
  if (!ver || typeof ver !== 'string') return DEFAULT_INSTALLED_APK_VERSION;
  const trimmed = ver.trim();
  if (!trimmed) return DEFAULT_INSTALLED_APK_VERSION;
  return /^v/i.test(trimmed) ? `v${trimmed.slice(1)}` : `v${trimmed}`;
}

export function cleanVersionDigits(ver?: string): string {
  if (!ver || typeof ver !== 'string') return '';
  const match = ver.trim().match(/(\d+(?:\.\d+)*)/);
  return match ? match[1] : '';
}

export function isVersionNewer(remoteVersion?: string, localVersion: string = DEFAULT_INSTALLED_APK_VERSION): boolean {
  const cleanRemote = cleanVersionDigits(remoteVersion);
  const cleanLocal = cleanVersionDigits(localVersion);
  if (!cleanRemote || !cleanLocal || cleanRemote === cleanLocal) return false;

  const rParts = cleanRemote.split('.').map((n) => parseInt(n, 10) || 0);
  const lParts = cleanLocal.split('.').map((n) => parseInt(n, 10) || 0);
  const maxLen = Math.max(rParts.length, lParts.length);

  for (let i = 0; i < maxLen; i++) {
    const r = rParts[i] || 0;
    const l = lParts[i] || 0;
    if (r > l) return true;
    if (r < l) return false;
  }
  return false;
}

/**
 * Extracts a version string from an Admin Announcement / Message if it represents an App/APK update.
 * Supports:
 * - Explicit fields: `apkVersion`, `appVersion`, `version`, `latestVersion`, `updateVersion`
 * - `v2.6.0`, `v2.6`, `v3.0` anywhere in title or body
 * - `Update 2.6.0`, `Version 2.6`, `APK 2.6.0`, `MaxPlay 2.6` in title or body
 */
export function extractVersionFromAdminMessage(msg: any): string {
  if (!msg || typeof msg !== 'object') return '';

  const explicit =
    msg.apkVersion ||
    msg.updateVersion ||
    msg.latestVersion ||
    msg.appVersion ||
    msg.version ||
    '';
  if (explicit && cleanVersionDigits(String(explicit))) {
    return cleanVersionDigits(String(explicit));
  }

  const title = String(msg.title || '').trim();
  const body = String(msg.body || '').trim();
  const combined = `${title}\n${body}`;
  const msgType = String(msg.type || '').toLowerCase();

  const candidateVersions: string[] = [];

  // Pattern 1: Explicit 'v' prefix followed by major.minor(.patch), e.g., v2.6.0, v2.6, v3.0
  const vPrefixRegex = /\bv\s*(\d+\.\d+(?:\.\d+){0,2})\b/gi;
  let m: RegExpExecArray | null;
  while ((m = vPrefixRegex.exec(combined)) !== null) {
    if (m[1]) candidateVersions.push(m[1]);
  }

  // Pattern 2: Keyword (update, apk, version, upgrade, build, release, maxplay, force) followed by version
  const keywordVerRegex =
    /\b(?:update|apk|version|ver|upgrade|build|release|maxplay|force\s+update)\s*(?:to|is|available|now|v|:|-|#)?\s*v?(\d+(?:\.\d+){1,3})\b/gi;
  while ((m = keywordVerRegex.exec(combined)) !== null) {
    if (m[1]) candidateVersions.push(m[1]);
  }

  // Pattern 3: Version followed by keyword (e.g., "2.6.0 APK" or "2.6.0 Update")
  const verBeforeKeywordRegex =
    /\bv?(\d+\.\d+(?:\.\d+){0,2})\s*(?:apk|update|version|release|build)\b/gi;
  while ((m = verBeforeKeywordRegex.exec(combined)) !== null) {
    if (m[1]) candidateVersions.push(m[1]);
  }

  // Pattern 4: If message type or title clearly indicates an app/system update, match any X.Y.Z or X.Y
  const isUpdateContext =
    msgType.includes('update') ||
    msgType.includes('apk') ||
    /\b(apk|update|version|upgrade|new\s+release|force\s+update)\b/i.test(combined);
  if (isUpdateContext && candidateVersions.length === 0) {
    const genericSemver = /\b(\d+\.\d+(?:\.\d+){0,2})\b/g;
    while ((m = genericSemver.exec(combined)) !== null) {
      if (m[1]) candidateVersions.push(m[1]);
    }
  }

  if (candidateVersions.length === 0) return '';

  // Pick the highest version mentioned in this message
  let highest = candidateVersions[0];
  for (let i = 1; i < candidateVersions.length; i++) {
    if (isVersionNewer(candidateVersions[i], highest)) {
      highest = candidateVersions[i];
    }
  }
  return highest;
}

export function isAdminMessageForceUpdate(msg: any): boolean {
  if (!msg || typeof msg !== 'object') return false;
  if (msg.forceUpdate === true || msg.isForceUpdate === true || msg.disableOldVersions === true) {
    return true;
  }
  const msgType = String(msg.type || '').toLowerCase();
  if (msgType.includes('force')) return true;

  const combined = `${msg.title || ''} ${msg.body || ''}`.toLowerCase();
  if (
    combined.includes('force update') ||
    combined.includes('force-update') ||
    combined.includes('mandatory update') ||
    combined.includes('compulsory update') ||
    combined.includes('required update') ||
    combined.includes('[force]')
  ) {
    return true;
  }

  if (msg.priority === 'urgent' && /\b(apk|update|version|upgrade)\b/i.test(combined)) {
    return true;
  }

  return false;
}

export function extractApkUrlFromMessage(msg: any, fallbackUrl: string = ''): string {
  if (!msg || typeof msg !== 'object') return fallbackUrl;
  const direct =
    msg.actionUrl ||
    msg.apkUrl ||
    msg.apkDownloadUrl ||
    msg.downloadUrl ||
    msg.updateUrl ||
    msg.link ||
    '';
  if (direct && typeof direct === 'string' && direct.trim()) {
    return direct.trim();
  }
  const body = String(msg.body || '');
  const urlMatch = body.match(/https?:\/\/[^\s"'<>]+/i);
  if (urlMatch && urlMatch[0]) {
    return urlMatch[0].trim();
  }
  return fallbackUrl;
}

export interface AdminUpdateMessageInfo {
  id: string;
  version: string;
  formattedVersion: string;
  title: string;
  body: string;
  downloadUrl: string;
  bannerUrl: string;
  isForceUpdate: boolean;
  date: string;
  senderName: string;
  senderHandle: string;
  senderAvatar?: string;
}

export function useGeneralSettings() {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [appName, setAppName] = useState('MaxPlay');
  const [customLogoUrl, setCustomLogoUrl] = useState('');

  // The baseline version shown in Me -> Settings -> Check Update (from settings/general.appVersion or v2.5.0)
  const [installedAppVersion, setInstalledAppVersion] = useState<string>(DEFAULT_INSTALLED_APK_VERSION);
  const [generalDownloadUrl, setGeneralDownloadUrl] = useState<string>('');

  // Optional direct update fields from settings/update or settings/general
  const [settingsLatestVersion, setSettingsLatestVersion] = useState<string>('');
  const [settingsForceUpdate, setSettingsForceUpdate] = useState<boolean>(false);
  const [settingsMinRequiredVersion, setSettingsMinRequiredVersion] = useState<string>('');
  const [settingsReleaseNotes, setSettingsReleaseNotes] = useState<string>('');

  // Announcements from Admin Panel (`messages` collection)
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [lastCheckedAt, setLastCheckedAt] = useState<number>(() => Date.now());

  useEffect(() => {
    const applyUpdateConfigFields = (data: Record<string, any>, isDedicatedUpdateDoc: boolean) => {
      // Dedicated update fields
      const dedicatedVer =
        data.apkVersion ||
        data.latestVersion ||
        data.updateVersion ||
        (isDedicatedUpdateDoc ? data.appVersion || data.version : '') ||
        '';
      if (dedicatedVer) {
        setSettingsLatestVersion(String(dedicatedVer).trim());
      }

      const link =
        data.apkUrl ||
        data.apkDownloadUrl ||
        data.apkLink ||
        data.updateUrl ||
        data.downloadUrl ||
        '';
      if (link) {
        setGeneralDownloadUrl(String(link).trim());
      }

      if (
        data.forceUpdate !== undefined ||
        data.isForceUpdate !== undefined ||
        data.disableOldVersions !== undefined
      ) {
        setSettingsForceUpdate(
          Boolean(data.forceUpdate || data.isForceUpdate || data.disableOldVersions)
        );
      }

      const minVer = data.minRequiredVersion || data.minVersion || '';
      if (minVer) {
        setSettingsMinRequiredVersion(String(minVer).trim());
      }

      const notes =
        data.updateNotes ||
        data.releaseNotes ||
        data.updateMessage ||
        data.apkDescription ||
        '';
      if (notes) {
        setSettingsReleaseNotes(String(notes).trim());
      }
    };

    const unsubGen = onSnapshot(
      doc(db, 'settings', 'general'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setMaintenanceMode(Boolean(data.maintenanceMode));
          if (data.appName) setAppName(data.appName);
          if (data.customLogoUrl !== undefined) {
            setCustomLogoUrl(data.customLogoUrl || '');
          }
          // `appVersion` in `settings/general` is the baseline version displayed in Me -> Settings -> Check update
          if (data.appVersion) {
            setInstalledAppVersion(formatVersionTag(String(data.appVersion)));
          }
          applyUpdateConfigFields(data, false);
        }
      },
      (error) => {
        console.warn('General settings listener note:', error?.message || error);
      }
    );

    const unsubUpdate = onSnapshot(
      doc(db, 'settings', 'update'),
      (snap) => {
        if (snap.exists()) {
          applyUpdateConfigFields(snap.data(), true);
        }
      },
      () => {}
    );

    const unsubLegal = onSnapshot(
      doc(db, 'settings', 'legal'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data.customLogoUrl) {
            setCustomLogoUrl((prev) => prev || data.customLogoUrl);
          }
        }
      },
      () => {}
    );

    const unsubMsgs = subscribeToAnnouncements(undefined, (msgs) => {
      setAnnouncements(Array.isArray(msgs) ? msgs : []);
    });

    return () => {
      unsubGen();
      unsubUpdate();
      unsubLegal();
      unsubMsgs();
    };
  }, []);

  // Manual trigger to re-verify update status from Firestore on demand (used by Me -> Settings -> Check update)
  const triggerManualUpdateCheck = useCallback(async () => {
    try {
      const [genSnap, updSnap, msgSnap] = await Promise.allSettled([
        getDoc(doc(db, 'settings', 'general')),
        getDoc(doc(db, 'settings', 'update')),
        getDocs(collection(db, MESSAGES_COLLECTION)),
      ]);

      if (genSnap.status === 'fulfilled' && genSnap.value.exists()) {
        const d = genSnap.value.data();
        if (d.appVersion) setInstalledAppVersion(formatVersionTag(String(d.appVersion)));
        if (d.downloadUrl || d.apkUrl) setGeneralDownloadUrl(String(d.downloadUrl || d.apkUrl).trim());
      }
      if (updSnap.status === 'fulfilled' && updSnap.value.exists()) {
        const d = updSnap.value.data();
        const ver = d.apkVersion || d.latestVersion || d.updateVersion || d.appVersion || d.version;
        if (ver) setSettingsLatestVersion(String(ver).trim());
        if (d.downloadUrl || d.apkUrl) setGeneralDownloadUrl(String(d.downloadUrl || d.apkUrl).trim());
      }
      if (msgSnap.status === 'fulfilled') {
        const list = msgSnap.value.docs.map((docItem) => ({ id: docItem.id, ...docItem.data() }));
        setAnnouncements(list);
      }
      setLastCheckedAt(Date.now());
    } catch {}
  }, []);

  // Evaluate Admin Messages (newest-first) against the version in Me -> Settings -> Check Update (`installedAppVersion`)
  let matchedAdminUpdateMsg: AdminUpdateMessageInfo | null = null;
  if (announcements.length > 0) {
    const sorted = [...announcements].sort((a, b) => {
      const tA = new Date(a.createdAt || a.date || 0).getTime() || 0;
      const tB = new Date(b.createdAt || b.date || 0).getTime() || 0;
      return tB - tA;
    });

    for (const msg of sorted) {
      const msgVer = extractVersionFromAdminMessage(msg);
      if (msgVer && isVersionNewer(msgVer, installedAppVersion)) {
        if (!matchedAdminUpdateMsg || isVersionNewer(msgVer, matchedAdminUpdateMsg.version)) {
          const attachedImg =
            msg.bannerUrl ||
            msg.imageUrl ||
            msg.image ||
            msg.attachedContent?.backdropUrl ||
            msg.attachedContent?.posterUrl ||
            '';
          matchedAdminUpdateMsg = {
            id: msg.id || `upd_${ msgVer }`,
            version: msgVer,
            formattedVersion: formatVersionTag(msgVer),
            title: msg.title || `MaxPlay APK Update ${formatVersionTag(msgVer)}`,
            body:
              msg.body ||
              `A new official version (${formatVersionTag(msgVer)}) of MaxPlay is now available from Admin. Please update your APK for the latest features and stability improvements.`,
            downloadUrl: extractApkUrlFromMessage(msg, generalDownloadUrl),
            bannerUrl: attachedImg,
            isForceUpdate: isAdminMessageForceUpdate(msg),
            date: msg.date || (msg.createdAt ? new Date(msg.createdAt).toLocaleDateString() : 'Latest Release'),
            senderName: msg.sender?.name || 'MaxPlay Official',
            senderHandle: msg.sender?.handle || '@MaxPlayAdmin',
            senderAvatar: msg.sender?.avatar || '',
          };
        }
      }
    }
  }

  // Combine with dedicated settings/update if higher than installedAppVersion
  const hasSettingsNewer = isVersionNewer(settingsLatestVersion, installedAppVersion);
  const hasMessageNewer = Boolean(matchedAdminUpdateMsg);
  const hasApkUpdate = hasMessageNewer || hasSettingsNewer;

  let latestApkVersion = '';
  if (matchedAdminUpdateMsg && hasSettingsNewer) {
    latestApkVersion = isVersionNewer(settingsLatestVersion, matchedAdminUpdateMsg.version)
      ? cleanVersionDigits(settingsLatestVersion)
      : matchedAdminUpdateMsg.version;
  } else if (matchedAdminUpdateMsg) {
    latestApkVersion = matchedAdminUpdateMsg.version;
  } else if (hasSettingsNewer) {
    latestApkVersion = cleanVersionDigits(settingsLatestVersion);
  }

  const apkDownloadUrl =
    matchedAdminUpdateMsg?.downloadUrl || generalDownloadUrl || '';

  const updateReleaseNotes =
    matchedAdminUpdateMsg?.body ||
    settingsReleaseNotes ||
    '';

  const updateTitle =
    matchedAdminUpdateMsg?.title ||
    (latestApkVersion ? `MaxPlay Update v${latestApkVersion} Available` : 'App Update Status');

  const updateBannerUrl = matchedAdminUpdateMsg?.bannerUrl || '';

  const isForceUpdateRequired =
    (hasMessageNewer && Boolean(matchedAdminUpdateMsg?.isForceUpdate)) ||
    (hasApkUpdate && settingsForceUpdate) ||
    (Boolean(settingsMinRequiredVersion) && isVersionNewer(settingsMinRequiredVersion, installedAppVersion));

  return {
    maintenanceMode,
    appName,
    customLogoUrl,
    currentApkVersion: cleanVersionDigits(installedAppVersion) || '2.5.0',
    formattedCurrentVersion: formatVersionTag(installedAppVersion),
    latestApkVersion,
    formattedLatestVersion: latestApkVersion ? formatVersionTag(latestApkVersion) : formatVersionTag(installedAppVersion),
    apkDownloadUrl,
    hasApkUpdate,
    forceUpdate: isForceUpdateRequired,
    updateTitle,
    updateReleaseNotes,
    updateBannerUrl,
    adminUpdateMessage: matchedAdminUpdateMsg,
    lastCheckedAt,
    triggerManualUpdateCheck,
  };
}
