import { useState, useEffect } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../services/firebase';

export function useGeneralSettings() {
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [appName, setAppName] = useState('MaxPlay');
  const [customLogoUrl, setCustomLogoUrl] = useState('');

  useEffect(() => {
    const unsubGen = onSnapshot(doc(db, 'settings', 'general'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setMaintenanceMode(data.maintenanceMode || false);
        if (data.appName) setAppName(data.appName);
        if (data.customLogoUrl !== undefined) {
          setCustomLogoUrl(data.customLogoUrl || '');
        }
      }
    }, (error) => {
      console.warn('General settings listener note:', error?.message || error);
    });

    const unsubLegal = onSnapshot(doc(db, 'settings', 'legal'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.customLogoUrl) {
          setCustomLogoUrl((prev) => prev || data.customLogoUrl);
        }
      }
    }, () => {});

    return () => {
      unsubGen();
      unsubLegal();
    };
  }, []);
  
  return { maintenanceMode, appName, customLogoUrl };
}
