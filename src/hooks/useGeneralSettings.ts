import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';

export const CURRENT_APK_VERSION = '1.1';

export function isVersionNewer(remoteVersion?: string, localVersion: string = CURRENT_APK_VERSION): boolean {
  if (!remoteVersion || typeof remoteVersion !== 'string') return false;
  const cleanRemote = remoteVersion.trim().replace(/^v/i, '');
  const cleanLocal = localVersion.trim().replace(/^v/i, '');
  if (!cleanRemote || cleanRemote === cleanLocal) return false;

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

export function useGeneralSettings() {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [appName, setAppName] = useState('MaxPlay');
  const [customLogoUrl, setCustomLogoUrl] = useState('');
  const [latestApkVersion, setLatestApkVersion] = useState('');
  const [apkDownloadUrl, setApkDownloadUrl] = useState('');
  const [forceUpdate, setForceUpdate] = useState(false);
  const [minRequiredVersion, setMinRequiredVersion] = useState('');
  const [updateReleaseNotes, setUpdateReleaseNotes] = useState('');

  useEffect(() => {
    const applyUpdateFields = (data: Record<string, any>) => {
      const ver =
        data.apkVersion ||
        data.latestVersion ||
        data.appVersion ||
        data.version ||
        data.updateVersion ||
        '';
      if (ver) setLatestApkVersion(String(ver).trim());

      const link =
        data.apkUrl ||
        data.apkDownloadUrl ||
        data.apkLink ||
        data.updateUrl ||
        data.downloadUrl ||
        '';
      if (link) setApkDownloadUrl(String(link).trim());

      if (
        data.forceUpdate !== undefined ||
        data.isForceUpdate !== undefined ||
        data.disableOldVersions !== undefined
      ) {
        setForceUpdate(
          Boolean(data.forceUpdate || data.isForceUpdate || data.disableOldVersions)
        );
      }

      const minVer = data.minRequiredVersion || data.minVersion || '';
      if (minVer) setMinRequiredVersion(String(minVer).trim());

      const notes =
        data.updateNotes ||
        data.releaseNotes ||
        data.updateMessage ||
        data.apkDescription ||
        '';
      if (notes) setUpdateReleaseNotes(String(notes).trim());
    };

    const unsubGen = onSnapshot(
      doc(db, 'settings', 'general'),
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setMaintenanceMode(data.maintenanceMode || false);
          if (data.appName) setAppName(data.appName);
          if (data.customLogoUrl !== undefined) {
            setCustomLogoUrl(data.customLogoUrl || '');
          }
          applyUpdateFields(data);
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
          applyUpdateFields(snap.data());
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

    return () => {
      unsubGen();
      unsubUpdate();
      unsubLegal();
    };
  }, []);

  const hasApkUpdate = isVersionNewer(latestApkVersion, CURRENT_APK_VERSION);
  const isForceUpdateRequired =
    (hasApkUpdate && forceUpdate) ||
    (Boolean(minRequiredVersion) && isVersionNewer(minRequiredVersion, CURRENT_APK_VERSION));

  return {
    maintenanceMode,
    appName,
    customLogoUrl,
    currentApkVersion: CURRENT_APK_VERSION,
    latestApkVersion,
    apkDownloadUrl,
    hasApkUpdate,
    forceUpdate: isForceUpdateRequired,
    updateReleaseNotes,
  };
}
