export const SMARTLINK_URL = 'https://www.profitableratecpmnetwork.com/jzti8g4u0?key=e656e2aa9595a540eeb85090eea2154a';

export const triggerCardPopunder = (isPremium: boolean = false) => {
  if (isPremium) return;
  try {
    const lastPopTime = localStorage.getItem('maxplay_last_card_popunder');
    const now = Date.now();
    
    // 10 minutes cooldown = 10 * 60 * 1000 = 600000 ms
    if (!lastPopTime || (now - parseInt(lastPopTime, 10)) > 600000) {
      localStorage.setItem('maxplay_last_card_popunder', now.toString());
      window.open(SMARTLINK_URL, '_blank');
    }
  } catch (e) {
    // ignore
  }
};

export const triggerTabPopunder = (tabName: string, isPremium: boolean = false) => {
  if (isPremium) return;
  
  try {
    const sessionKey = `maxplay_tab_popunder_${tabName}`;
    const hasPopped = sessionStorage.getItem(sessionKey);
    
    if (!hasPopped) {
      sessionStorage.setItem(sessionKey, 'true');
      window.open(SMARTLINK_URL, '_blank');
    }
  } catch (e) {
    // ignore
  }
};
