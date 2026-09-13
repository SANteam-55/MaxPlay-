export const SMART_LINK = 'https://www.profitableratecpmnetwork.com/jzti8g4u0?key=e656e2aa9595a540eeb85090eea2154a';
export const POPUNDER_SCRIPT_URL = 'https://pl31325136.profitableratecpmnetwork.com/1a/c8/8e/1ac88ea5a8cc8d5523ba3cd38b64b984.js';

class AdService {
  private tabClicks = new Set<string>();
  private homeCategoryClicks = new Set<string>();
  private lastCardClickTime = 0;
  private lastPlayerClickTime = 0;
  private lastActionDockClickTime = 0;
  private lastSectionToggleClickTime = 0;
  private lastSelectorClickTime = 0;
  private lastEpisodeClickTime = 0;

  constructor() {
    this.initTimes();
  }

  private initTimes() {
    try {
      this.lastPlayerClickTime = parseInt(localStorage.getItem('maxplay_last_player_popunder') || '0', 10) || 0;
      this.lastCardClickTime = parseInt(localStorage.getItem('maxplay_last_card_popunder') || '0', 10) || 0;
      this.lastActionDockClickTime = parseInt(localStorage.getItem('maxplay_last_action_dock_ad') || '0', 10) || 0;
      this.lastSectionToggleClickTime = parseInt(localStorage.getItem('maxplay_last_section_toggle_ad') || '0', 10) || 0;
      this.lastSelectorClickTime = parseInt(localStorage.getItem('maxplay_last_selector_ad') || '0', 10) || 0;
      this.lastEpisodeClickTime = parseInt(localStorage.getItem('maxplay_last_episode_ad') || '0', 10) || 0;
    } catch (_) {}
  }
  
  private openPopunder(isPremium?: boolean) {
    if (isPremium) return;
    try {
      window.open(SMART_LINK, '_blank');
      if (!document.getElementById('cpm-popunder-script')) {
        const script = document.createElement('script');
        script.id = 'cpm-popunder-script';
        script.src = POPUNDER_SCRIPT_URL;
        script.async = true;
        document.body.appendChild(script);
      }
    } catch (_) {}
  }

  // 1. Navigation Tab Click (once per tab session)
  handleTabClick(tabName: string, isPremium?: boolean) {
    if (isPremium) return;
    if (!this.tabClicks.has(tabName)) {
      this.tabClicks.add(tabName);
      this.openPopunder(isPremium);
    }
  }

  // 2. Home Category Pill Click (once per category session)
  handleHomeCategoryClick(category: string, isPremium?: boolean) {
    if (isPremium) return;
    if (!this.homeCategoryClicks.has(category)) {
      this.homeCategoryClicks.add(category);
      this.openPopunder(isPremium);
    }
  }

  // 3. Content Card Click (10 min cooldown)
  handleContentCardClick(isPremium?: boolean) {
    if (isPremium) return;
    const now = Date.now();
    let lastTime = this.lastCardClickTime;
    try {
      const stored = localStorage.getItem('maxplay_last_card_popunder');
      if (stored) lastTime = Math.max(lastTime, parseInt(stored, 10) || 0);
    } catch (_) {}

    // 10 minutes cooldown
    if (lastTime === 0 || now - lastTime > 600000) {
      this.lastCardClickTime = now;
      try {
        localStorage.setItem('maxplay_last_card_popunder', now.toString());
      } catch (_) {}
      this.openPopunder(isPremium);
    }
  }

  // 4. Video Player Touch / Click (5 min cooldown)
  handlePlayerAction(isPremium?: boolean) {
    if (isPremium) return;
    const now = Date.now();
    let lastTime = this.lastPlayerClickTime;
    try {
      const stored = localStorage.getItem('maxplay_last_player_popunder');
      if (stored) lastTime = Math.max(lastTime, parseInt(stored, 10) || 0);
    } catch (_) {}

    // 5 minutes cooldown: 300,000 ms
    if (lastTime === 0 || now - lastTime > 300000) {
      this.lastPlayerClickTime = now;
      try {
        localStorage.setItem('maxplay_last_player_popunder', now.toString());
      } catch (_) {}
      this.openPopunder(isPremium);
    }
  }

  // 5. 4 Action Buttons (My List, Share, Comments, Details) (5 min cooldown)
  handleActionDockClick(isPremium?: boolean) {
    if (isPremium) return;
    const now = Date.now();
    let lastTime = this.lastActionDockClickTime;
    try {
      const stored = localStorage.getItem('maxplay_last_action_dock_ad');
      if (stored) lastTime = Math.max(lastTime, parseInt(stored, 10) || 0);
    } catch (_) {}

    // 5 minutes cooldown
    if (lastTime === 0 || now - lastTime > 300000) {
      this.lastActionDockClickTime = now;
      try {
        localStorage.setItem('maxplay_last_action_dock_ad', now.toString());
      } catch (_) {}
      this.openPopunder(isPremium);
    }
  }

  // 6. Section Toggles (More Like This, Comments section) (5 min cooldown)
  handleSectionToggleClick(isPremium?: boolean) {
    if (isPremium) return;
    const now = Date.now();
    let lastTime = this.lastSectionToggleClickTime;
    try {
      const stored = localStorage.getItem('maxplay_last_section_toggle_ad');
      if (stored) lastTime = Math.max(lastTime, parseInt(stored, 10) || 0);
    } catch (_) {}

    // 5 minutes cooldown
    if (lastTime === 0 || now - lastTime > 300000) {
      this.lastSectionToggleClickTime = now;
      try {
        localStorage.setItem('maxplay_last_section_toggle_ad', now.toString());
      } catch (_) {}
      this.openPopunder(isPremium);
    }
  }

  // 7. Selectors (Season Selector box, Language Selector box) (5 min cooldown)
  handleSelectorClick(isPremium?: boolean) {
    if (isPremium) return;
    const now = Date.now();
    let lastTime = this.lastSelectorClickTime;
    try {
      const stored = localStorage.getItem('maxplay_last_selector_ad');
      if (stored) lastTime = Math.max(lastTime, parseInt(stored, 10) || 0);
    } catch (_) {}

    // 5 minutes cooldown
    if (lastTime === 0 || now - lastTime > 300000) {
      this.lastSelectorClickTime = now;
      try {
        localStorage.setItem('maxplay_last_selector_ad', now.toString());
      } catch (_) {}
      this.openPopunder(isPremium);
    }
  }

  // 8. Episode Click (Popunder ad ek bar)
  handleEpisodeClick(isPremium?: boolean) {
    if (isPremium) return;
    const now = Date.now();
    let lastTime = this.lastEpisodeClickTime;
    try {
      const stored = localStorage.getItem('maxplay_last_episode_ad');
      if (stored) lastTime = Math.max(lastTime, parseInt(stored, 10) || 0);
    } catch (_) {}

    // 5 minutes cooldown between episode ad popunders so user experience remains clean
    if (lastTime === 0 || now - lastTime > 300000) {
      this.lastEpisodeClickTime = now;
      try {
        localStorage.setItem('maxplay_last_episode_ad', now.toString());
      } catch (_) {}
      this.openPopunder(isPremium);
    }
  }

  // Backward compatibility alias
  handleDetailScreenAction(isPremium?: boolean) {
    this.handleActionDockClick(isPremium);
  }

  // Generic direct click (e.g., custom actions)
  handleSmartLinkClick(isPremium?: boolean) {
    if (isPremium) return;
    this.openPopunder(isPremium);
  }
}

export const adManager = new AdService();
