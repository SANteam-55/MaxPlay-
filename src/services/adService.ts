export const SMART_LINK = 'https://www.profitableratecpmnetwork.com/jzti8g4u0?key=e656e2aa9595a540eeb85090eea2154a';
export const POPUNDER_SCRIPT_URL = 'https://pl31325136.profitableratecpmnetwork.com/1a/c8/8e/1ac88ea5a8cc8d5523ba3cd38b64b984.js';

class AdService {
  private homeCategoryClicks = new Set<string>();
  private lastCardClickTime = 0;

  // Details Screen strict session tracking:
  // - 0 popunders during the first 10 minutes (600,000 ms) of opening a Details Screen
  // - Maximum 2 popunders total per Details Screen visit
  private detailsScreenEnteredAt = 0;
  private detailsScreenAdCount = 0;
  private lastDetailsScreenAdShownAt = 0;
  private adOverlayElement: HTMLDivElement | null = null;

  constructor() {
    this.initTimes();
    this.setupPopStateShield();
  }

  private initTimes() {
    try {
      this.lastCardClickTime = parseInt(localStorage.getItem('maxplay_last_card_popunder') || '0', 10) || 0;
    } catch (_) {}
  }

  private setupPopStateShield() {
    if (typeof window === 'undefined') return;
    window.addEventListener('popstate', () => {
      if (this.isAdOverlayOpen()) {
        this.closeAdOverlay();
      }
    });
  }

  /**
   * Returns true if the Popunder Ad view is currently open on top of the player/details screen.
   */
  public isAdOverlayOpen(): boolean {
    return Boolean(this.adOverlayElement && document.body.contains(this.adOverlayElement));
  }

  /**
   * Closes the active Popunder Ad view and returns the user directly to the Video Player or Details Screen
   * without reloading the app or interrupting playback.
   */
  public closeAdOverlay(): boolean {
    if (this.adOverlayElement) {
      try {
        this.adOverlayElement.remove();
      } catch (_) {}
      this.adOverlayElement = null;
      return true;
    }
    return false;
  }

  /**
   * Opens the Popunder Ad inside a Back-button shielded layer so:
   * 1. It is never blocked by browser/WebView popup blockers.
   * 2. Pressing the phone's Back button returns directly to the Video Player or Details Screen instead of exiting the app.
   */
  private openPopunder(isPremium?: boolean) {
    if (isPremium || typeof document === 'undefined') return;
    if (this.isAdOverlayOpen()) return;

    try {
      // Push a shield history state so browser/WebView back button closes the ad first
      try {
        window.history.pushState({ maxplayAdShield: true }, '');
      } catch (_) {}

      const overlay = document.createElement('div');
      overlay.id = 'maxplay-popunder-shield-overlay';
      overlay.style.cssText =
        'position:fixed;inset:0;z-index:2147483646;background:#0A0A0A;display:flex;flex-direction:column;width:100vw;height:100vh;';

      const topBar = document.createElement('div');
      topBar.style.cssText =
        'display:flex;align-items:center;justify-content:space-between;padding:10px 14px;background:#121216;border-bottom:1px solid rgba(255,255,255,0.1);color:#fff;font-family:sans-serif;font-size:13px;flex-shrink:0;';

      const label = document.createElement('span');
      label.textContent = 'Sponsored • Press Back to return to MaxPlay';
      label.style.cssText = 'color:#A1A1AA;font-weight:600;font-size:12px;';

      const closeBtn = document.createElement('button');
      closeBtn.textContent = '✕ Return to Video';
      closeBtn.style.cssText =
        'background:linear-gradient(135deg,#8B5CF6,#6366F1);color:#fff;border:none;border-radius:999px;padding:6px 14px;font-size:12px;font-weight:700;cursor:pointer;';
      closeBtn.onclick = (e) => {
        e.stopPropagation();
        this.closeAdOverlay();
      };

      topBar.appendChild(label);
      topBar.appendChild(closeBtn);

      const iframe = document.createElement('iframe');
      iframe.src = SMART_LINK;
      iframe.style.cssText = 'flex:1;width:100%;height:100%;border:none;background:#fff;';
      iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms allow-popups');

      overlay.appendChild(topBar);
      overlay.appendChild(iframe);
      document.body.appendChild(overlay);
      this.adOverlayElement = overlay;
    } catch (_) {}
  }

  // 1. Navigation Tab Click - ADS REMOVED
  handleTabClick(_tabName: string, _isPremium?: boolean) {
    return;
  }

  // 2. Home Category Pill Click
  handleHomeCategoryClick(_category: string, _isPremium?: boolean) {
    // Keep home browsing smooth and uninterrupted
    return;
  }

  // 3. Content Card Click
  handleContentCardClick(_isPremium?: boolean) {
    // Opening a card enters Details Screen where the strict 10-min / max-2 rule governs ads
    return;
  }

  // ===== DETAILS SCREEN & VIDEO PLAYER ADS (STRICT 10-MIN DELAY + MAX 2 ADS RULE) ===== //

  /**
   * Called when entering a Details Screen.
   * Resets the per-Details-Screen counter (0/2) and starts the 10-minute ad-free timer.
   */
  enterDetailsScreen(_contentId?: string) {
    this.detailsScreenEnteredAt = Date.now();
    this.detailsScreenAdCount = 0;
    this.lastDetailsScreenAdShownAt = 0;
  }

  /**
   * Called when leaving a Details Screen.
   * Safely cleans up any open popunder overlay and resets timers without throwing.
   */
  exitDetailsScreen() {
    this.closeAdOverlay();
    this.detailsScreenEnteredAt = 0;
    this.detailsScreenAdCount = 0;
    this.lastDetailsScreenAdShownAt = 0;
  }

  /**
   * Checks whether a Popunder Ad is allowed on the current Details Screen:
   * 1. Must be at least 10 minutes (600,000 ms) after opening the Details Screen.
   * 2. Maximum 2 Popunder ads total per Details Screen visit (`detailsScreenAdCount < 2`).
   * 3. At least 3 minutes (180,000 ms) spacing between the 1st and 2nd ad.
   */
  private tryTriggerDetailsScreenPopunder(isPremium?: boolean) {
    if (isPremium) return;
    const now = Date.now();

    if (this.detailsScreenEnteredAt === 0) {
      this.detailsScreenEnteredAt = now;
    }

    // Rule 1: Strictly no popunders during the first 10 minutes on the Details Screen
    const elapsedOnDetailsMs = now - this.detailsScreenEnteredAt;
    if (elapsedOnDetailsMs < 10 * 60 * 1000) {
      return;
    }

    // Rule 2: Strictly maximum 2 popunders per Details Screen visit
    if (this.detailsScreenAdCount >= 2) {
      return;
    }

    // Rule 3: Minimum 3 minutes between Ad #1 and Ad #2
    if (this.lastDetailsScreenAdShownAt > 0 && now - this.lastDetailsScreenAdShownAt < 3 * 60 * 1000) {
      return;
    }

    this.detailsScreenAdCount += 1;
    this.lastDetailsScreenAdShownAt = now;
    this.openPopunder(isPremium);
  }

  // 4. Video Player Touch / Click
  handlePlayerAction(isPremium?: boolean) {
    this.tryTriggerDetailsScreenPopunder(isPremium);
  }

  // 5. 4 Action Buttons (My List, Share, Comments, Details)
  handleActionDockClick(isPremium?: boolean) {
    this.tryTriggerDetailsScreenPopunder(isPremium);
  }

  // 6. Section Toggles (More Like This, Comments section)
  handleSectionToggleClick(isPremium?: boolean) {
    this.tryTriggerDetailsScreenPopunder(isPremium);
  }

  // 7. Selectors (Season Selector box, Language Selector box)
  handleSelectorClick(isPremium?: boolean) {
    this.tryTriggerDetailsScreenPopunder(isPremium);
  }

  // 8. Episode Click - ADS REMOVED FROM EPISODE SELECTION
  handleEpisodeClick(_isPremium?: boolean) {
    return;
  }

  // Backward compatibility alias
  handleDetailScreenAction(isPremium?: boolean) {
    this.tryTriggerDetailsScreenPopunder(isPremium);
  }

  // Generic direct click
  handleSmartLinkClick(isPremium?: boolean) {
    this.tryTriggerDetailsScreenPopunder(isPremium);
  }
}

export const adManager = new AdService();

