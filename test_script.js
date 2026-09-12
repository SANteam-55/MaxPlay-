
    import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
    import { 
      initializeFirestore, getFirestore, memoryLocalCache, collection, getDocs, getDoc, doc, setDoc, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy 
    } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
    import {
      getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged
    } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

    // Firebase Config
    const firebaseConfig = {
      apiKey: "AIzaSyB9ru5QTU3Wt8xr8aPPx38NuDhoV87KdQ0",
      authDomain: "gen-lang-client-0291911037.firebaseapp.com",
      projectId: "gen-lang-client-0291911037",
      storageBucket: "gen-lang-client-0291911037.firebasestorage.app",
      messagingSenderId: "596965139357",
      appId: "1:596965139357:web:5a1d0502c7745f44f58574",
      firestoreDatabaseId: "ai-studio-maxplay-e5163e97-7cd5-4a42-875c-8b5dce9fd72d"
    };

    window.addEventListener('unhandledrejection', (event) => {
      if (
        event?.reason?.message?.includes('Database is closing') ||
        event?.reason?.message?.includes('closing/hidden') ||
        event?.reason?.name === 'InvalidStateError'
      ) {
        event.preventDefault();
      }
    });

    const app = initializeApp(firebaseConfig);
    let db;
    try {
      db = initializeFirestore(app, {
        localCache: memoryLocalCache(),
        experimentalForceLongPolling: true,
        experimentalAutoDetectLongPolling: true,
        ignoreUndefinedProperties: true
      }, firebaseConfig.firestoreDatabaseId);
    } catch (e) {
      try {
        db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
      } catch(err2) {
        db = getFirestore(app);
      }
    }
    const auth = getAuth(app);    // Global default sample content so admin portal is never empty
    const DEFAULT_SAMPLE_CONTENT = [

      {
        id: 'one-piece-egghead',
        data: {
          title: 'One Piece: Egghead Arc',
          type: 'anime',
          description: 'The Straw Hats arrive at Egghead, the island of the future, where they meet Dr. Vegapunk and face off against CP0 and the Navy.',
          posterUrl: 'https://images.unsplash.com/photo-1541562232579-512a21360020?w=800&auto=format&fit=crop&q=80',
          backdropUrl: 'https://images.unsplash.com/photo-1541562232579-512a21360020?w=1200&auto=format&fit=crop&q=80',
          rating: 9.7,
          year: 2024,
          country: 'Japan',
          genres: ['Adventure', 'Action', 'Comedy'],
          mature: false,
          duration: 1440,
          seasons: 21,
          episodes: 1100,
          trending: true,
          featured: false,
          views: 500000,
          languages: ['Hindi', 'English', 'Japanese']
        }
      },
      {
        id: 'naruto-shippuden-classic',
        data: {
          title: 'Naruto Shippuden',
          type: 'anime',
          description: 'Naruto returns to the Hidden Leaf Village after two and a half years of training to take on the Akatsuki and save his friend Sasuke.',
          posterUrl: 'https://images.unsplash.com/photo-1580477651163-f222687c4767?w=800&auto=format&fit=crop&q=80',
          backdropUrl: 'https://images.unsplash.com/photo-1580477651163-f222687c4767?w=1200&auto=format&fit=crop&q=80',
          rating: 9.5,
          year: 2007,
          country: 'Japan',
          genres: ['Action', 'Ninja', 'Adventure'],
          mature: false,
          duration: 1440,
          seasons: 21,
          episodes: 500,
          trending: false,
          featured: false,
          views: 890000,
          languages: ['Hindi', 'English', 'Japanese']
        }
      },
      {
        id: 'avatar-way-of-water',
        data: {
          title: 'Avatar: The Way of Water',
          type: 'movie',
          description: 'Jake Sully lives with his newfound family formed on the extrasolar moon Pandora. Once a familiar threat returns to finish what was previously started, Jake must work with Neytiri and the army of the Navi race to protect their home.',
          posterUrl: 'https://images.unsplash.com/photo-1618331835717-801e976710b2?w=800&auto=format&fit=crop&q=80',
          backdropUrl: 'https://images.unsplash.com/photo-1618331835717-801e976710b2?w=1200&auto=format&fit=crop&q=80',
          rating: 9.2,
          year: 2022,
          country: 'USA',
          genres: ['Sci-Fi', 'Action', 'Adventure'],
          mature: false,
          duration: 11520,
          seasons: 1,
          episodes: 1,
          trending: true,
          featured: true,
          views: 1500000,
          languages: ['English', 'Hindi']
        }
      },
      {
        id: 'dune-part-two',
        data: {
          title: 'Dune: Part Two',
          type: 'movie',
          description: 'Paul Atreides unites with Chani and the Fremen while on a warpath of revenge against the conspirators who destroyed his family.',
          posterUrl: 'https://images.unsplash.com/photo-1546143977-96a9ce8b4d8d?w=800&auto=format&fit=crop&q=80',
          backdropUrl: 'https://images.unsplash.com/photo-1546143977-96a9ce8b4d8d?w=1200&auto=format&fit=crop&q=80',
          rating: 9.6,
          year: 2024,
          country: 'USA',
          genres: ['Sci-Fi', 'Drama', 'Action'],
          mature: false,
          duration: 9960,
          seasons: 1,
          episodes: 1,
          trending: true,
          featured: true,
          views: 800000,
          languages: ['English', 'Hindi']
        }
      },
      {
        id: 'content-sl-s2',
        data: {
          title: 'Solo Leveling: ReArise',
          type: 'anime',
          rating: 9.8,
          year: 2025,
          country: 'Japan / Korea',
          seasons: 2,
          episodes: 24,
          genres: ['Action', 'Fantasy', 'Supernatural', 'Hindi Dubbed'],
          description: 'Sung Jinwoo faces new dungeon portals and shadow army challenges in Season 2.',
          posterUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800',
          backdropUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200',
          homeRows: ['row-trending', 'row-foryou'],
          videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
          videoLinks: ['https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'],
          seasonsData: [{
            seasonNumber: 1,
            seasonTitle: 'Season 1',
            episodes: [
              { id: 'ep-1', episodeNumber: 1, title: "I'm Used to It", duration: 1440, videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4' },
              { id: 'ep-2', episodeNumber: 2, title: 'If I Had One More Chance', duration: 1440, videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4' }
            ]
          }],
          episodesList: [],
          createdAt: new Date().toISOString()
        }
      },
      {
        id: 'content-ds-hashira',
        data: {
          title: 'Demon Slayer: Hashira Training',
          type: 'anime',
          rating: 9.6,
          year: 2024,
          country: 'Japan',
          seasons: 4,
          episodes: 8,
          genres: ['Action', 'Demons', 'Shounen'],
          description: 'Tanjiro undergoes intense training with the Hashira.',
          posterUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=800',
          backdropUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1200',
          homeRows: ['row-trending'],
          videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
          videoLinks: ['https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4'],
          seasonsData: [],
          episodesList: [],
          createdAt: new Date().toISOString()
        }
      },
      {
        id: 'content-jjk-shibuya',
        data: {
          title: 'Jujutsu Kaisen: Shibuya Incident',
          type: 'anime',
          rating: 9.7,
          year: 2023,
          country: 'Japan',
          seasons: 2,
          episodes: 23,
          genres: ['Action', 'Curse', 'Supernatural'],
          description: 'The intense battle of Shibuya unfolds on Halloween night.',
          posterUrl: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=800',
          backdropUrl: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=1200',
          homeRows: ['row-cinema', 'row-foryou'],
          videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4',
          videoLinks: ['https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerEscapes.mp4'],
          seasonsData: [],
          episodesList: [],
          createdAt: new Date().toISOString()
        }
      }
    ];

    // Global state variables
    
    window.activeLanguages = ['English'];
    window.updateActiveLanguages = function() {
        const checked = Array.from(document.querySelectorAll('.lang-checkbox:checked')).map(cb => cb.value);
        window.activeLanguages = checked.length > 0 ? checked : ['English'];
        if (window.currentUploadMode === 'movie') {
            // Keep existing counts but re-render
            const container = document.getElementById('movie-link-rows');
            const list = [];
            if(container) {
               const count = container.querySelectorAll('.movie-part-card').length;
               for(let i=0; i<(count || 1); i++) list.push({});
            }
            if(window.renderMovieLinksUI) window.renderMovieLinksUI(list.length > 0 ? list : [{}]);
        } else {
            if(window.renderEpisodesList) window.renderEpisodesList();
        }
    };

    window.cachedContentDocs = [...DEFAULT_SAMPLE_CONTENT];
    window.categoriesData = [];
    window.homeRowsData = [];
    window.heroBannersData = [];
    window.usersData = [];
    window.messagesData = [];

    window.editingContentId = null;
    window.currentUploadMode = 'movie'; // 'movie' or 'series'
    window.seasonsData = [
      { seasonNumber: 1, seasonTitle: "Season 1", episodes: [] }
    ];
    window.currentSeasonIdx = 0;

    // Toast helper
    window.showToast = function(msg) {
      const container = document.getElementById('toast-container');
      if (!container) return;
      const toast = document.createElement('div');
      toast.className = 'toast';
      toast.innerHTML = `<i class="fa-solid fa-circle-check" style="color:var(--accent-green)"></i> <span>${msg}</span>`;
      container.appendChild(toast);
      setTimeout(() => { toast.remove(); }, 3500);
    };

    // Auth handling
    window.handleLogin = function(e) {
      if (e && e.preventDefault) e.preventDefault();
      try { localStorage.setItem('maxplay_admin_logged_in', 'true'); } catch(err){}
      const loginScreen = document.getElementById('login-screen');
      const adminApp = document.getElementById('admin-app');
      if (loginScreen) loginScreen.style.display = 'none';
      if (adminApp) adminApp.style.display = 'flex';
      
      if (window.showToast) window.showToast('Successfully logged in as Root Admin');

      const emailEl = document.getElementById('login-email');
      const passEl = document.getElementById('login-password');
      const email = emailEl ? emailEl.value : '';
      const pass = passEl ? passEl.value : '';

      if (email && pass && typeof signInWithEmailAndPassword === 'function' && auth) {
        signInWithEmailAndPassword(auth, email, pass).catch((err) => {
          console.log('Auth fallback used:', err.message);
        });
      }
    };

    window.handleLogout = function() {
      try { localStorage.removeItem('maxplay_admin_logged_in'); } catch(err){}
      try { if (auth && typeof signOut === 'function') signOut(auth); } catch(e){}
      const loginScreen = document.getElementById('login-screen');
      const adminApp = document.getElementById('admin-app');
      if (loginScreen) loginScreen.style.display = 'flex';
      if (adminApp) adminApp.style.display = 'none';
      if (window.showToast) window.showToast('Logged out');
    };

    onAuthStateChanged(auth, (user) => {
      // Do not auto-bypass login screen on load
    });

    // Navigation Tabs
    window.switchTab = function(tabId) {
      document.querySelectorAll('.screen-view').forEach(el => el.classList.remove('active'));
      document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
      
      const screen = document.getElementById('screen-' + tabId);
      if (screen) screen.classList.add('active');

      document.querySelectorAll('.nav-item').forEach(item => {
        if (item.getAttribute('onclick')?.includes(tabId)) {
          item.classList.add('active');
        }
      });

      const pageTitles = {
        'dashboard': 'Dashboard Overview',
        'content': 'Manage Content Library',
        'upload': 'Upload New Media',
        'banners': 'Hero Slider Banners',
        'categories': 'App Categories Configuration',
        'hotscreens': 'Manage Hot Screens',
        'hotscreens': 'Manage Hot Screens',
        'search': 'Search Screen Tags',
        'users': 'Registered User Accounts',
        'reports': 'Comment Moderation & Reports Queue',
        'comments': 'Content Comments Manager',
        'analytics': 'Performance Analytics',
        'messages': 'Broadcast Announcements',
        'settings': 'General & System Settings',
        'legal': 'App Information & Legal Content'
      };
      document.getElementById('current-page-title').innerText = pageTitles[tabId] || 'Admin Portal';

      if (tabId === 'banners' && window.loadHeroBanners) window.loadHeroBanners();
      if (tabId === 'categories' && window.loadCategories) window.loadCategories();
      if (tabId === 'homerows' && window.loadHomeRows) window.loadHomeRows();
      if (tabId === 'users' && window.loadUsers) window.loadUsers();
      if (tabId === 'reports' && window.renderReportsTable) window.renderReportsTable();
      if (tabId === 'comments' && window.loadCommentsManager) window.loadCommentsManager();
      if (tabId === 'messages' && window.loadMessagesHistory) window.loadMessagesHistory();
      if (tabId === 'analytics' && window.loadAnalytics) window.loadAnalytics();
      if (tabId === 'legal' && window.loadLegalContent) window.loadLegalContent();
      
      const sidebar = document.querySelector('.sidebar');
      if (sidebar && sidebar.classList.contains('open')) sidebar.classList.remove('open');
    };

    window.toggleMobileSidebar = function() {
      const sidebar = document.querySelector('.sidebar');
      if (sidebar) sidebar.classList.toggle('open');
    };

    // CONTENT MANAGEMENT LOGIC WITH SAMPLE FALLBACK
    window.loadContentList = function() {
      try {
        onSnapshot(collection(db, 'content'), (snap) => {
          if (snap.empty) {
            window.cachedContentDocs = [...DEFAULT_SAMPLE_CONTENT];
            // Auto seed sample docs to Firestore so client app gets items too
            DEFAULT_SAMPLE_CONTENT.forEach(item => {
              setDoc(doc(db, 'content', item.id), item.data, { merge: true }).catch(err => {});
            });
          } else {
            window.cachedContentDocs = [];
            snap.forEach(d => window.cachedContentDocs.push({ id: d.id, data: d.data() }));
          }
          renderContentTable();
          loadDashboardStats();
        }, (err) => {
          console.warn('Firestore snapshot error, using cached defaults:', err);
          if (!window.cachedContentDocs || window.cachedContentDocs.length === 0) {
            window.cachedContentDocs = [...DEFAULT_SAMPLE_CONTENT];
          }
          renderContentTable();
          loadDashboardStats();
        });
      } catch(e) {
        console.error('loadContentList catch:', e);
        if (!window.cachedContentDocs || window.cachedContentDocs.length === 0) {
          window.cachedContentDocs = [...DEFAULT_SAMPLE_CONTENT];
        }
        renderContentTable();
        loadDashboardStats();
      }
    };

    window.currentContentView = 'table';
    window.switchContentView = function(mode) {
      window.currentContentView = mode;
      var btnTable = document.getElementById('btn-view-table');
      var btnGrid = document.getElementById('btn-view-grid');
      var containerTable = document.getElementById('content-table-container');
      var containerGrid = document.getElementById('content-grid-container');

      var activeStyle = "height:34px; padding:0 12px; font-size:12px; border:none; background:linear-gradient(135deg, #8B5CF6 0%, #D946EF 100%); color:#ffffff; font-weight:700; border-radius:8px; box-shadow:0 4px 14px rgba(139,92,246,0.45); cursor:pointer;";
      var inactiveStyle = "height:34px; padding:0 12px; font-size:12px; border:none; background:transparent; color:var(--text-secondary); font-weight:500; border-radius:8px; cursor:pointer;";

      if (mode === 'grid') {
        if (btnGrid) btnGrid.style.cssText = activeStyle;
        if (btnTable) btnTable.style.cssText = inactiveStyle;
        if (containerTable) containerTable.style.display = 'none';
        if (containerGrid) containerGrid.style.display = 'grid';
      } else {
        if (btnTable) btnTable.style.cssText = activeStyle;
        if (btnGrid) btnGrid.style.cssText = inactiveStyle;
        if (containerTable) containerTable.style.display = 'block';
        if (containerGrid) containerGrid.style.display = 'none';
      }
    };

    window.renderContentTable = function() {
      var tbody = document.getElementById('content-table-body');
      var gridContainer = document.getElementById('content-grid-container');
      if (!tbody && !gridContainer) return;

      var searchInput = document.getElementById('content-search-input');
      var search = (searchInput ? searchInput.value : '').toLowerCase();
      var typeFilterEl = document.getElementById('content-type-filter');
      var typeFilter = typeFilterEl ? typeFilterEl.value : 'ALL';

      var items = window.cachedContentDocs.filter(function(doc) {
        var item = doc.data;
        var matchesType = typeFilter === 'ALL' || item.type === typeFilter;
        var matchesSearch = !search || 
          (item.title && item.title.toLowerCase().includes(search)) ||
          (item.genres && JSON.stringify(item.genres).toLowerCase().includes(search));
        return matchesType && matchesSearch;
      });

      if (items.length === 0) {
        if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding:30px; color:var(--text-tertiary);">No content matching filters.</td></tr>';
        if (gridContainer) gridContainer.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:40px; color:var(--text-tertiary); background:var(--bg-secondary); border-radius:12px; border:1px solid var(--border-color);">No content matching filters.</div>';
        return;
      }

      var hTable = '';
      var hGrid = '';

      items.forEach(function(docItem) {
        var item = docItem.data;
        var id = docItem.id;

        // Render Home Row Tags
        var rowTags = '';
        if (item.homeRows && item.homeRows.length > 0) {
          item.homeRows.forEach(function(rId) {
             var foundRow = (window.homeRowsData || []).find(function(r) { return r.id === rId; });
             var title = foundRow ? foundRow.title : rId;
             rowTags += `<span style="background:rgba(245, 158, 11, 0.15); color:var(--accent-amber); font-size:10px; padding:2px 8px; border-radius:12px; margin-right:4px; display:inline-block; margin-bottom:2px;">${title}</span>`;
          });
        } else {
          rowTags = '<span style="color:var(--text-tertiary); font-size:11px;">Standard Library</span>';
        }

        hTable += `
          <tr>
            <td style="display:flex; align-items:center; gap:12px;">
              <img src="${item.posterUrl}" onerror="this.src='https://via.placeholder.com/80x120'" style="width:40px; height:56px; border-radius:6px; object-fit:cover;">
              <div>
                <div style="font-weight:700; font-size:13px;">${item.title || 'Untitled'}</div>
                <div style="font-size:11px; color:var(--text-tertiary);">ID: ${id}</div>
              </div>
            </td>
            <td><span class="status-badge status-active" style="text-transform:uppercase;">${item.type || 'Movie'}</span></td>
            <td style="font-weight:700; color:var(--accent-amber);"><i class="fa-solid fa-star"></i> ${item.rating || '9.5'}</td>
            <td style="color:var(--text-secondary);">${item.year || '2025'}</td>
            <td>${rowTags}</td>
            <td>
              <div style="display:flex; gap:8px;">
                <button class="btn-secondary" style="height:32px; padding:0 10px;" onclick="editContent('${id}')"><i class="fa-solid fa-pen"></i> Edit</button>
                <button class="btn-danger" style="height:32px; padding:0 10px;" onclick="deleteContent('${id}')"><i class="fa-solid fa-trash"></i></button>
              </div>
            </td>
          </tr>
        `;

        hGrid += `
          <div style="background:var(--bg-secondary); border:1px solid var(--border-color); border-radius:14px; overflow:hidden; display:flex; flex-direction:column; box-shadow:0 4px 16px rgba(0,0,0,0.25); transition:transform 0.2s ease, box-shadow 0.2s ease;">
            <div style="position:relative; width:100%; height:230px; background:#0f0f15; overflow:hidden;">
              <img src="${item.posterUrl}" onerror="this.src='https://via.placeholder.com/200x300'" style="width:100%; height:100%; object-fit:cover;">
              <span style="position:absolute; top:10px; left:10px; background:rgba(139, 92, 246, 0.9); backdrop-filter:blur(4px); color:#fff; font-size:10px; font-weight:800; text-transform:uppercase; padding:4px 8px; border-radius:6px; box-shadow:0 2px 8px rgba(0,0,0,0.3);">${item.type || 'Movie'}</span>
              <span style="position:absolute; top:10px; right:10px; background:rgba(0,0,0,0.75); backdrop-filter:blur(4px); color:var(--accent-amber); font-size:11px; font-weight:700; padding:4px 8px; border-radius:8px; border:1px solid rgba(245,158,11,0.3);"><i class="fa-solid fa-star"></i> ${item.rating || '9.5'}</span>
            </div>
            <div style="padding:14px 14px 10px 14px; flex:1; display:flex; flex-direction:column; gap:6px;">
              <div style="font-weight:700; font-size:15px; color:var(--text-primary); text-overflow:ellipsis; overflow:hidden; white-space:nowrap;" title="${item.title || 'Untitled'}">${item.title || 'Untitled'}</div>
              <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; color:var(--text-tertiary);">
                <span><i class="fa-regular fa-calendar" style="margin-right:4px;"></i>${item.year || '2025'}</span>
                <span style="font-size:10px; font-family:monospace;">ID: ${id}</span>
              </div>
              <div style="margin-top:4px;">${rowTags}</div>
            </div>
            <div style="padding:12px 14px; border-top:1px solid var(--border-color); background:rgba(0,0,0,0.15); display:flex; justify-content:space-between; align-items:center; gap:8px;">
              <button class="btn-secondary" style="flex:1; height:34px; padding:0 12px; font-size:12px; font-weight:600; border-radius:8px; display:flex; align-items:center; justify-content:center; gap:6px; cursor:pointer;" onclick="editContent('${id}')">
                <i class="fa-solid fa-pen" style="color:var(--accent-purple);"></i> Edit
              </button>
              <button class="btn-danger" style="height:34px; width:36px; padding:0; font-size:12px; border-radius:8px; display:flex; align-items:center; justify-content:center; cursor:pointer;" onclick="deleteContent('${id}')" title="Delete Content">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          </div>
        `;
      });

      if (tbody) tbody.innerHTML = hTable;
      if (gridContainer) gridContainer.innerHTML = hGrid;
    };

    window.filterContentTable = function() {
      renderContentTable();
    };

    window.editContent = function(id) {
      const docItem = window.cachedContentDocs.find(d => d.id === id);
      if (!docItem) return;
      const item = docItem.data;
      window.editingContentId = id;

      document.getElementById('upload-screen-heading').innerText = 'Editing Content: ' + (item.title || id);
      document.getElementById('up-title').value = item.title || '';
      document.getElementById('up-type').value = item.type || 'movie';
      document.getElementById('up-rating').value = item.rating || 9.5;
      document.getElementById('up-year').value = item.year || 2025;
      document.getElementById('up-country').value = item.country || 'Japan';
      document.getElementById('up-seasons').value = item.seasons || 1;
      document.getElementById('up-genre').value = Array.isArray(item.genres) ? item.genres.join(', ') : (item.genres || '');
      document.getElementById('up-desc').value = item.description || '';
      document.getElementById('up-poster').value = item.posterUrl || '';
      document.getElementById('up-search-hot-section').value = item.searchHotSection || '';
      document.getElementById('up-search-hot-position').value = item.searchHotPosition || 0;
      document.getElementById('up-backdrop').value = item.backdropUrl || '';

      updateImagePreviews();
      onTypeDropdownChange(item.type || 'movie');
      // Load available languages
      window.activeLanguages = (item.availableLanguages && item.availableLanguages.length > 0) ? item.availableLanguages : ['English'];
      const langContainer = document.getElementById('languages-checkbox-container');
      if (langContainer) {
        window.activeLanguages.forEach(lang => {
          let existing = langContainer.querySelector(`input[value="${lang}"]`);
          if (!existing) {
            const label = document.createElement('label');
            label.style.cssText = 'display:flex; align-items:center; gap:6px; font-size:12px; color:#D4D4D8; background:rgba(255,255,255,0.05); padding:5px 10px; border-radius:6px; border:1px solid rgba(255,255,255,0.1); cursor:pointer;';
            label.innerHTML = `<input type="checkbox" class="lang-checkbox" value="${lang}" checked onchange="updateActiveLanguages()"> 🌐 ${lang}`;
            langContainer.appendChild(label);
          }
        });
      }
      document.querySelectorAll('.lang-checkbox').forEach(cb => {
        cb.checked = window.activeLanguages.includes(cb.value);
      });

      // Extract existing qualities
      let foundQualities = new Set();
      if (item.type === 'movie' && item.videoLinks) {
        item.videoLinks.forEach(part => {
          if (part.videoSources) {
            Object.values(part.videoSources).forEach(langObj => {
              Object.keys(langObj).forEach(q => foundQualities.add(q));
            });
          } else if (part.qualityLinks) {
             Object.keys(part.qualityLinks).forEach(q => { if(q.toLowerCase() !== 'default') foundQualities.add(q.toLowerCase()); });
          } else if (typeof part === 'object') {
             Object.keys(part).forEach(q => { if(q.toLowerCase() !== 'default') foundQualities.add(q.toLowerCase()); });
          }
        });
      } else if (item.type === 'series' && item.seasonsData) {
        item.seasonsData.forEach(season => {
          (season.episodes || []).forEach(ep => {
            if (ep.videoSources) {
              Object.values(ep.videoSources).forEach(langObj => {
                Object.keys(langObj).forEach(q => foundQualities.add(q));
              });
            }
            if (ep.videoLinks) {
              ep.videoLinks.forEach(part => {
                if (part.videoSources) {
                  Object.values(part.videoSources).forEach(langObj => {
                    Object.keys(langObj).forEach(q => foundQualities.add(q));
                  });
                }
              });
            }
          });
        });
      }
      if (foundQualities.size > 0) {
        // Standardize keys just in case
        window.activeQualities = Array.from(foundQualities).map(q => q.toLowerCase());
      } else {
        window.activeQualities = ['1080p', '720p', '480p', '360p']; // fallback default
      }
      
      document.querySelectorAll('.quality-checkbox').forEach(cb => {
        cb.checked = window.activeQualities.includes(cb.value);
      });

      // Check Home Rows checkboxes
      const assignedRows = item.homeRows || [];
      document.querySelectorAll('.hr-checkbox').forEach(cb => {
        cb.checked = assignedRows.includes(cb.value);
      });

      // Video Links / Episodes
      if (item.type === 'movie') {
        switchUploadMode('movie');
        let links = [];
        if (item.videoLinks && item.videoLinks.length > 0) {
          links = item.videoLinks;
        } else if (item.qualityLinks && Object.keys(item.qualityLinks).length > 0) {
          links = [item.qualityLinks];
        } else if (item.videoUrl) {
          links = [item.videoUrl];
        } else {
          links = ['https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'];
        }
        renderMovieLinksUI(links);
      } else {
        switchUploadMode('series');
        if (item.seasonsData && Array.isArray(item.seasonsData) && item.seasonsData.length > 0) {
          window.seasonsData = JSON.parse(JSON.stringify(item.seasonsData));
        } else if (item.episodesList && Array.isArray(item.episodesList) && item.episodesList.length > 0) {
          window.seasonsData = [{ seasonNumber: 1, seasonTitle: "Season 1", episodes: JSON.parse(JSON.stringify(item.episodesList)) }];
        } else {
          window.seasonsData = [{ seasonNumber: 1, seasonTitle: "Season 1", episodes: [] }];
        }
        window.currentSeasonIdx = 0;
        renderSeasonsUI();
      }

      document.getElementById('btn-upload-delete').style.display = 'inline-flex';
      switchTab('upload');
      goToStep(1);
    };

    window.resetUploadForm = function() {
      window.editingContentId = null;
      document.getElementById('upload-screen-heading').innerText = 'Upload New Content';
      document.getElementById('up-title').value = '';
      document.getElementById('up-type').value = 'anime';
      document.getElementById('up-rating').value = '9.5';
      document.getElementById('up-year').value = '2025';
      document.getElementById('up-country').value = 'Japan';
      document.getElementById('up-seasons').value = '1';
      document.getElementById('up-genre').value = '';
      document.getElementById('up-desc').value = '';
      document.getElementById('btn-upload-delete').style.display = 'none';

      document.querySelectorAll('.hr-checkbox').forEach(cb => cb.checked = false);
      
      onTypeDropdownChange('anime');
      switchUploadMode('series');
      window.seasonsData = [{ seasonNumber: 1, seasonTitle: "Season 1", episodes: [] }];
      window.currentSeasonIdx = 0;
      renderSeasonsUI();

      renderMovieLinksUI(['https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4']);
      updateImagePreviews();
      goToStep(1);
    };

    window.deleteContent = async function(id) {
      if (!confirm('Are you sure you want to delete this content item?')) return;
      try {
        await deleteDoc(doc(db, 'content', id));
        showToast('Content deleted successfully!');
      } catch(e) {
        showToast('Error deleting content');
      }
    };

    window.deleteEditingContent = function() {
      if (window.editingContentId) deleteContent(window.editingContentId);
    };

    // TYPE DROPDOWN CHANGE LISTENER
    window.onTypeDropdownChange = function(typeVal) {
      const groupSeasons = document.getElementById('group-seasons');
      if (typeVal === 'movie') {
        if (groupSeasons) groupSeasons.style.display = 'none';
        switchUploadMode('movie');
      } else {
        if (groupSeasons) groupSeasons.style.display = 'block';
        switchUploadMode('series');
      }
    };

    window.updateImagePreviews = function() {
      const pUrl = document.getElementById('up-poster')?.value || '';
      const bUrl = document.getElementById('up-backdrop')?.value || '';
      const imgP = document.getElementById('preview-poster');
      const imgB = document.getElementById('preview-backdrop');
      if (imgP) imgP.src = pUrl || 'https://via.placeholder.com/80x120';
      if (imgB) imgB.src = bUrl || 'https://via.placeholder.com/120x60';
    };

    // MULTI-STEP UPLOAD & HOME ROWS RENDERER
    window.goToStep = function(step) {
      document.getElementById('upload-step-1').style.display = step === 1 ? 'block' : 'none';
      document.getElementById('upload-step-2').style.display = step === 2 ? 'block' : 'none';
      document.getElementById('upload-step-3').style.display = step === 3 ? 'block' : 'none';

      document.querySelectorAll('.step-item').forEach((el, idx) => {
        el.classList.remove('active', 'completed');
        if (idx + 1 === step) el.classList.add('active');
        if (idx + 1 < step) el.classList.add('completed');
      });

      if (step === 3) {
        renderReviewSummary();
      }
    };

    window.switchUploadMode = function(mode) {
      window.currentUploadMode = mode;
      if (mode === 'movie') {
        document.getElementById('btn-mode-movie').className = 'btn-primary';
        document.getElementById('btn-mode-series').className = 'btn-secondary';
        document.getElementById('movie-links-container').style.display = 'block';
        document.getElementById('series-episodes-container').style.display = 'none';
      } else {
        document.getElementById('btn-mode-movie').className = 'btn-secondary';
        document.getElementById('btn-mode-series').className = 'btn-primary';
        document.getElementById('movie-links-container').style.display = 'none';
        document.getElementById('series-episodes-container').style.display = 'block';
      }
    };

    
    // ACTIVE LANGUAGES & QUALITIES MANAGEMENT
    window.activeLanguages = ['Hindi', 'English'];
    window.activeQualities = ['1080p', '720p', '480p', '360p'];

    window.updateActiveLanguages = function() {
      const checked = [];
      document.querySelectorAll('.lang-checkbox:checked').forEach(cb => {
        if (cb.value && !checked.includes(cb.value)) checked.push(cb.value);
      });
      window.activeLanguages = checked.length > 0 ? checked : ['Hindi', 'English'];

      if (window.currentUploadMode === 'movie') {
        const currentParts = collectCurrentMoviePartsData();
        renderMovieLinksUI(currentParts);
      } else {
        syncEpisodesFromDOM();
        renderEpisodesList();
      }
    };

    window.updateActiveQualities = function() {
      const checked = [];
      document.querySelectorAll('.quality-checkbox:checked').forEach(cb => {
        if (cb.value && !checked.includes(cb.value)) checked.push(cb.value);
      });
      window.activeQualities = checked.length > 0 ? checked : ['1080p']; // Fallback so at least one is visible

      if (window.currentUploadMode === 'movie') {
        const currentParts = collectCurrentMoviePartsData();
        renderMovieLinksUI(currentParts);
      } else {
        syncEpisodesFromDOM();
        renderEpisodesList();
      }
    };

    window.addCustomLanguage = function() {
      const input = document.getElementById('custom-lang-input');
      if (!input) return;
      const langName = input.value.trim();
      if (!langName) return;

      const formatted = langName.charAt(0).toUpperCase() + langName.slice(1);
      const container = document.getElementById('languages-checkbox-container');
      if (container) {
        const existing = container.querySelector(`input[value="${formatted}"]`);
        if (existing) {
          existing.checked = true;
        } else {
          const label = document.createElement('label');
          label.style.cssText = 'display:flex; align-items:center; gap:6px; font-size:12px; color:#D4D4D8; background:rgba(255,255,255,0.05); padding:5px 10px; border-radius:6px; border:1px solid rgba(255,255,255,0.1); cursor:pointer;';
          label.innerHTML = `<input type="checkbox" class="lang-checkbox" value="${formatted}" checked onchange="updateActiveLanguages()"> 🌐 ${formatted}`;
          container.appendChild(label);
        }
        input.value = '';
        updateActiveLanguages();
        showToast(`Added ${formatted} Audio Track`);
      }
    };

    // MOVIE MODE MULTI-PART & MULTI-LANGUAGE COLLECTOR
    window.collectCurrentMoviePartsData = function() {
      const cards = document.querySelectorAll('.movie-part-card');
      if (!cards || cards.length === 0) return [];
      const parts = [];

      cards.forEach((card) => {
        const partSources = {};
        window.activeLanguages.forEach((lang) => {
          const q1080 = card.querySelector(`.movie-q-1080[data-lang="${lang}"]`)?.value.trim() || '';
          const q720 = card.querySelector(`.movie-q-720[data-lang="${lang}"]`)?.value.trim() || '';
          const q480 = card.querySelector(`.movie-q-480[data-lang="${lang}"]`)?.value.trim() || '';
          const q360 = card.querySelector(`.movie-q-360[data-lang="${lang}"]`)?.value.trim() || '';

          if (q1080 || q720 || q480 || q360) {
            partSources[lang] = {};
            if (q1080) partSources[lang]['1080p'] = q1080;
            if (q720) partSources[lang]['720p'] = q720;
            if (q480) partSources[lang]['480p'] = q480;
            if (q360) partSources[lang]['360p'] = q360;
          }
        });
        parts.push({ videoSources: partSources });
      });

      return parts;
    };

    window.renderMovieLinksUI = function(linksArray) {
      const container = document.getElementById('movie-link-rows');
      if (!container) return;
      let h = '';
      const list = (linksArray && linksArray.length > 0) ? linksArray : [{ videoSources: {} }];

      list.forEach((item, i) => {
        let langInputs = '';
        window.activeLanguages.forEach(lang => {
          let q1080 = '', q720 = '', q480 = '', q360 = '';
          if (item && item.videoSources && item.videoSources[lang]) {
            q1080 = item.videoSources[lang]['1080p'] || '';
            q720 = item.videoSources[lang]['720p'] || '';
            q480 = item.videoSources[lang]['480p'] || '';
            q360 = item.videoSources[lang]['360p'] || '';
          } else if (i === 0 && window.activeLanguages.indexOf(lang) === 0 && !item.videoSources) {
            // Fallback for legacy format
            if (typeof item === 'string') q1080 = item;
            else if (typeof item === 'object') {
              q1080 = item['1080p'] || item['1080P'] || item['default'] || '';
              q720 = item['720p'] || item['720P'] || '';
              q480 = item['480p'] || item['480P'] || '';
              q360 = item['360p'] || '';
            }
          }

          let qInputs = '';
          if (window.activeQualities.includes('1080p')) {
            qInputs += `
                <div>
                  <label class="form-label" style="font-size:10px; color:#A78BFA; font-weight:700; margin-bottom:4px;">🟣 1080p (Full HD URL)</label>
                  <input type="text" class="input-control movie-q-1080" data-lang="${lang}" value="${q1080}" placeholder="Paste 1080p URL here...">
                </div>`;
          }
          if (window.activeQualities.includes('720p')) {
            qInputs += `
                <div>
                  <label class="form-label" style="font-size:10px; color:#60A5FA; font-weight:700; margin-bottom:4px;">🔵 720p (HD URL)</label>
                  <input type="text" class="input-control movie-q-720" data-lang="${lang}" value="${q720}" placeholder="Paste 720p URL here...">
                </div>`;
          }
          if (window.activeQualities.includes('480p')) {
            qInputs += `
                <div>
                  <label class="form-label" style="font-size:10px; color:#34D399; font-weight:700; margin-bottom:4px;">🟢 480p (SD URL)</label>
                  <input type="text" class="input-control movie-q-480" data-lang="${lang}" value="${q480}" placeholder="Paste 480p URL here...">
                </div>`;
          }
          if (window.activeQualities.includes('360p')) {
            qInputs += `
                <div>
                  <label class="form-label" style="font-size:10px; color:#FBBF24; font-weight:700; margin-bottom:4px;">🟡 360p (Data Saver URL)</label>
                  <input type="text" class="input-control movie-q-360" data-lang="${lang}" value="${q360}" placeholder="Paste 360p URL here...">
                </div>`;
          }

          langInputs += `
            <div style="background:rgba(0,0,0,0.25); border:1px solid rgba(255,255,255,0.08); padding:12px; border-radius:10px; margin-top:8px;">
              <div style="display:flex; align-items:center; gap:6px; font-size:12px; font-weight:800; color:var(--accent-amber); margin-bottom:8px;">
                <i class="fa-solid fa-language"></i> ${lang} Audio Track
              </div>
              <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:10px;">
                ${qInputs}
              </div>
            </div>
          `;
        });

        h += `
          <div class="movie-part-card" style="background:var(--bg-tertiary); border:1px solid var(--border-color); border-radius:12px; padding:16px; display:flex; flex-direction:column; gap:10px;">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); pb:8px; margin-bottom:4px;">
              <span style="font-size:13px; font-weight:800; color:var(--accent-purple); display:flex; align-items:center; gap:8px;">
                <i class="fa-solid fa-film"></i> Part ${i + 1}
              </span>
              ${i > 0 ? `
              <button type="button" class="btn-danger" style="height:28px; padding:0 10px; font-size:11px;" onclick="this.closest('.movie-part-card').remove()">
                <i class="fa-solid fa-trash"></i> Remove Part
              </button>` : `<span style="font-size:10px; color:var(--text-tertiary);">Main Movie Stream</span>`}
            </div>
            ${langInputs}
          </div>
        `;
      });
      container.innerHTML = h;
    };

    window.addMovieLinkRow = function() {
      const currentParts = collectCurrentMoviePartsData();
      currentParts.push({ videoSources: {} });
      renderMovieLinksUI(currentParts);
    };

    // SERIES / SEASONS / EPISODES MANAGER
    window.renderSeasonsUI = function() {
      const selector = document.getElementById('season-selector');
      if (!selector) return;

      if (!window.seasonsData || window.seasonsData.length === 0) {
        window.seasonsData = [{ seasonNumber: 1, seasonTitle: "Season 1", episodes: [] }];
      }

      let selHtml = '';
      window.seasonsData.forEach((s, idx) => {
        selHtml += `<option value="${idx}" ${idx === window.currentSeasonIdx ? 'selected' : ''}>${s.seasonTitle || ('Season ' + (idx + 1))}</option>`;
      });
      selector.innerHTML = selHtml;

      renderEpisodesList();
    };

    window.createNewSeason = function() {
      syncEpisodesFromDOM();
      const newNum = window.seasonsData.length + 1;
      window.seasonsData.push({ seasonNumber: newNum, seasonTitle: 'Season ' + newNum, episodes: [] });
      window.currentSeasonIdx = window.seasonsData.length - 1;
      renderSeasonsUI();
      showToast('Created Season ' + newNum);
    };

    window.switchSeason = function(idx) {
      syncEpisodesFromDOM();
      window.currentSeasonIdx = parseInt(idx);
      renderEpisodesList();
    };

    window.deleteActiveSeason = function() {
      if (window.seasonsData.length <= 1) {
        showToast('At least one season must remain.');
        return;
      }
      if (!confirm('Are you sure you want to delete this season and all its episodes?')) return;
      window.seasonsData.splice(window.currentSeasonIdx, 1);
      window.currentSeasonIdx = Math.max(0, window.currentSeasonIdx - 1);
      renderSeasonsUI();
      showToast('Season deleted');
    };

    // SYNC EPISODES FROM CURRENT DOM INPUTS
    window.syncEpisodesFromDOM = function() {
      const activeSeason = window.seasonsData[window.currentSeasonIdx];
      if (!activeSeason || !activeSeason.episodes) return;

      const epCards = document.querySelectorAll('#season-episodes-list .episode-card');
      epCards.forEach((card, epIdx) => {
        if (!activeSeason.episodes[epIdx]) return;
        const ep = activeSeason.episodes[epIdx];

        // Basic Info
        const epNumInput = card.querySelector('.ep-input-num');
        const titleInput = card.querySelector('.ep-input-title');
        const durInput = card.querySelector('.ep-input-dur');
        const thumbInput = card.querySelector('.ep-input-thumb');

        if (epNumInput) ep.episodeNumber = parseInt(epNumInput.value) || (epIdx + 1);
        if (titleInput) ep.title = titleInput.value.trim();
        if (durInput) ep.duration = (parseInt(durInput.value) || 24) * 60;
        if (thumbInput) ep.thumbnailUrl = thumbInput.value.trim();

        // Part 1 Multi-Language Video Sources
        const part1Sources = {};
        window.activeLanguages.forEach(lang => {
          const q1080 = card.querySelector(`.ep-part1-1080[data-lang="${lang}"]`)?.value.trim() || '';
          const q720 = card.querySelector(`.ep-part1-720[data-lang="${lang}"]`)?.value.trim() || '';
          const q480 = card.querySelector(`.ep-part1-480[data-lang="${lang}"]`)?.value.trim() || '';
          const q360 = card.querySelector(`.ep-part1-360[data-lang="${lang}"]`)?.value.trim() || '';

          if (q1080 || q720 || q480 || q360) {
            part1Sources[lang] = {};
            if (q1080) part1Sources[lang]['1080p'] = q1080;
            if (q720) part1Sources[lang]['720p'] = q720;
            if (q480) part1Sources[lang]['480p'] = q480;
            if (q360) part1Sources[lang]['360p'] = q360;
          }
        });
        ep.videoSources = part1Sources;

        // Fallbacks for legacy fields
        const firstLang = Object.keys(part1Sources)[0];
        if (firstLang && part1Sources[firstLang]) {
          ep.qualityLinks = part1Sources[firstLang];
          ep.videoUrl = ep.qualityLinks['1080p'] || ep.qualityLinks['720p'] || ep.qualityLinks['480p'] || ep.qualityLinks['360p'] || '';
        }

        // Additional Parts (Part 2, Part 3...)
        const extraCards = card.querySelectorAll('.ep-extra-part-card');
        const extraParts = [];
        extraCards.forEach((exCard) => {
          const exSources = {};
          window.activeLanguages.forEach(lang => {
            const eq1080 = exCard.querySelector(`.ep-extra-1080[data-lang="${lang}"]`)?.value.trim() || '';
            const eq720 = exCard.querySelector(`.ep-extra-720[data-lang="${lang}"]`)?.value.trim() || '';
            const eq480 = exCard.querySelector(`.ep-extra-480[data-lang="${lang}"]`)?.value.trim() || '';
            const eq360 = exCard.querySelector(`.ep-extra-360[data-lang="${lang}"]`)?.value.trim() || '';

            if (eq1080 || eq720 || eq480 || eq360) {
              exSources[lang] = {};
              if (eq1080) exSources[lang]['1080p'] = eq1080;
              if (eq720) exSources[lang]['720p'] = eq720;
              if (eq480) exSources[lang]['480p'] = eq480;
              if (eq360) exSources[lang]['360p'] = eq360;
            }
          });
          extraParts.push({ videoSources: exSources });
        });
        ep.videoLinks = extraParts;
      });
    };

    window.renderEpisodesList = function() {
      const listContainer = document.getElementById('season-episodes-list');
      if (!listContainer) return;

      const activeSeason = window.seasonsData[window.currentSeasonIdx] || { episodes: [] };
      const episodes = activeSeason.episodes || [];

      if (episodes.length === 0) {
        listContainer.innerHTML = `<div style="background:var(--bg-tertiary); padding:28px; border-radius:12px; text-align:center; color:var(--text-tertiary); border:1px solid var(--border-color);">No episodes in this season yet. Click "+ Add Episode Box" or "⚡ Auto-Generate Episodes".</div>`;
        return;
      }

      let h = '';
      episodes.forEach((ep, epIdx) => {
        // Render Part 1 Multi-Language Inputs
        let part1LangsHTML = '';
        window.activeLanguages.forEach(lang => {
          let p1_1080 = '', p1_720 = '', p1_480 = '', p1_360 = '';
          if (ep.videoSources && ep.videoSources[lang]) {
            p1_1080 = ep.videoSources[lang]['1080p'] || '';
            p1_720 = ep.videoSources[lang]['720p'] || '';
            p1_480 = ep.videoSources[lang]['480p'] || '';
            p1_360 = ep.videoSources[lang]['360p'] || '';
          } else if (window.activeLanguages.indexOf(lang) === 0 && ep.qualityLinks && typeof ep.qualityLinks === 'object' && !ep.videoSources) {
            p1_1080 = ep.qualityLinks['1080p'] || ep.qualityLinks['1080P'] || ep.qualityLinks['default'] || ep.videoUrl || '';
            p1_720 = ep.qualityLinks['720p'] || ep.qualityLinks['720P'] || '';
            p1_480 = ep.qualityLinks['480p'] || ep.qualityLinks['480P'] || '';
            p1_360 = ep.qualityLinks['360p'] || '';
          }

          let qInputs = '';
          if (window.activeQualities.includes('1080p')) {
            qInputs += `
                <div>
                  <label class="form-label" style="font-size:10px; color:#A78BFA; font-weight:700; margin-bottom:4px;">🟣 1080p (Full HD URL)</label>
                  <input type="text" class="input-control ep-part1-1080" data-lang="${lang}" value="${p1_1080}" placeholder="Paste 1080p URL here...">
                </div>`;
          }
          if (window.activeQualities.includes('720p')) {
            qInputs += `
                <div>
                  <label class="form-label" style="font-size:10px; color:#60A5FA; font-weight:700; margin-bottom:4px;">🔵 720p (HD URL)</label>
                  <input type="text" class="input-control ep-part1-720" data-lang="${lang}" value="${p1_720}" placeholder="Paste 720p URL here...">
                </div>`;
          }
          if (window.activeQualities.includes('480p')) {
            qInputs += `
                <div>
                  <label class="form-label" style="font-size:10px; color:#34D399; font-weight:700; margin-bottom:4px;">🟢 480p (SD URL)</label>
                  <input type="text" class="input-control ep-part1-480" data-lang="${lang}" value="${p1_480}" placeholder="Paste 480p URL here...">
                </div>`;
          }
          if (window.activeQualities.includes('360p')) {
            qInputs += `
                <div>
                  <label class="form-label" style="font-size:10px; color:#FBBF24; font-weight:700; margin-bottom:4px;">🟡 360p (Data Saver URL)</label>
                  <input type="text" class="input-control ep-part1-360" data-lang="${lang}" value="${p1_360}" placeholder="Paste 360p URL here...">
                </div>`;
          }

          part1LangsHTML += `
            <div style="background:rgba(0,0,0,0.25); border:1px solid rgba(255,255,255,0.08); padding:12px; border-radius:10px; margin-top:8px;">
              <div style="display:flex; align-items:center; gap:6px; font-size:12px; font-weight:800; color:var(--accent-amber); margin-bottom:8px;">
                <i class="fa-solid fa-language"></i> ${lang} Audio Track
              </div>
              <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:10px;">
                ${qInputs}
              </div>
            </div>
          `;
        });

        // Render Additional Splitted Parts (Part 2, Part 3...)
        let extraParts = ep.videoLinks || [];
        let extraPartsHTML = '';

        extraParts.forEach((extraItem, extraIdx) => {
          let extraLangsHTML = '';
          window.activeLanguages.forEach(lang => {
            let eq1080 = '', eq720 = '', eq480 = '', eq360 = '';
            if (extraItem && extraItem.videoSources && extraItem.videoSources[lang]) {
              eq1080 = extraItem.videoSources[lang]['1080p'] || '';
              eq720 = extraItem.videoSources[lang]['720p'] || '';
              eq480 = extraItem.videoSources[lang]['480p'] || '';
              eq360 = extraItem.videoSources[lang]['360p'] || '';
            } else if (window.activeLanguages.indexOf(lang) === 0 && !extraItem.videoSources) {
              if (typeof extraItem === 'string') eq1080 = extraItem;
              else if (typeof extraItem === 'object') {
                eq1080 = extraItem['1080p'] || extraItem['1080P'] || extraItem['default'] || '';
                eq720 = extraItem['720p'] || extraItem['720P'] || '';
                eq480 = extraItem['480p'] || extraItem['480P'] || '';
                eq360 = extraItem['360p'] || '';
              }
            }

            let qInputs = '';
            if (window.activeQualities.includes('1080p')) {
              qInputs += `
                  <div>
                    <label class="form-label" style="font-size:10px; color:#A78BFA; font-weight:700; margin-bottom:4px;">🟣 1080p (Full HD URL)</label>
                    <input type="text" class="input-control ep-extra-1080" data-lang="${lang}" value="${eq1080}" placeholder="Paste 1080p URL here...">
                  </div>`;
            }
            if (window.activeQualities.includes('720p')) {
              qInputs += `
                  <div>
                    <label class="form-label" style="font-size:10px; color:#60A5FA; font-weight:700; margin-bottom:4px;">🔵 720p (HD URL)</label>
                    <input type="text" class="input-control ep-extra-720" data-lang="${lang}" value="${eq720}" placeholder="Paste 720p URL here...">
                  </div>`;
            }
            if (window.activeQualities.includes('480p')) {
              qInputs += `
                  <div>
                    <label class="form-label" style="font-size:10px; color:#34D399; font-weight:700; margin-bottom:4px;">🟢 480p (SD URL)</label>
                    <input type="text" class="input-control ep-extra-480" data-lang="${lang}" value="${eq480}" placeholder="Paste 480p URL here...">
                  </div>`;
            }
            if (window.activeQualities.includes('360p')) {
              qInputs += `
                  <div>
                    <label class="form-label" style="font-size:10px; color:#FBBF24; font-weight:700; margin-bottom:4px;">🟡 360p (Data Saver URL)</label>
                    <input type="text" class="input-control ep-extra-360" data-lang="${lang}" value="${eq360}" placeholder="Paste 360p URL here...">
                  </div>`;
            }

            extraLangsHTML += `
              <div style="background:rgba(0,0,0,0.25); border:1px solid rgba(255,255,255,0.08); padding:12px; border-radius:10px; margin-top:8px;">
                <div style="display:flex; align-items:center; gap:6px; font-size:12px; font-weight:800; color:var(--accent-amber); margin-bottom:8px;">
                  <i class="fa-solid fa-language"></i> ${lang} Audio Track
                </div>
                <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:10px;">
                  ${qInputs}
                </div>
              </div>
            `;
          });

          extraPartsHTML += `
            <div class="ep-extra-part-card" style="background:rgba(255,255,255,0.03); border:1px solid var(--border-color); border-radius:10px; padding:12px; margin-top:12px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px; border-bottom:1px solid var(--border-color); padding-bottom:6px;">
                <span style="font-size:12px; font-weight:800; color:var(--text-secondary);"><i class="fa-solid fa-film"></i> Part ${extraIdx + 2}</span>
                <button type="button" class="btn-danger" style="height:26px; padding:0 8px; font-size:10px;" onclick="removeEpisodeExtraPart(${epIdx}, ${extraIdx})">
                  <i class="fa-solid fa-trash"></i> Remove Part
                </button>
              </div>
              ${extraLangsHTML}
            </div>
          `;
        });

        h += `
          <div class="episode-card" style="background:var(--bg-secondary); border:1px solid var(--border-color); border-radius:14px; padding:18px; display:flex; flex-direction:column; gap:14px; box-shadow: 0 4px 20px rgba(0,0,0,0.2);">
            <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-color); padding-bottom:10px;">
              <span style="font-weight:800; font-size:15px; color:var(--accent-cyan); display:flex; align-items:center; gap:8px;">
                <i class="fa-solid fa-circle-play"></i> Episode Box ${ep.episodeNumber || (epIdx + 1)}
              </span>
              <button type="button" class="btn-danger" style="height:30px; padding:0 12px; font-size:11px;" onclick="deleteEpisodeCard(${epIdx})">
                <i class="fa-solid fa-trash"></i> Delete Ep
              </button>
            </div>
            
            <div style="display:grid; grid-template-columns: 90px 2fr 1fr; gap:12px;">
              <div>
                <label class="form-label" style="font-size:10px; font-weight:700;">Episode #</label>
                <input type="number" class="input-control ep-input-num" value="${ep.episodeNumber || (epIdx + 1)}">
              </div>
              <div>
                <label class="form-label" style="font-size:10px; font-weight:700;">Episode Title</label>
                <input type="text" class="input-control ep-input-title" value="${ep.title || ''}" placeholder="Episode Title">
              </div>
              <div>
                <label class="form-label" style="font-size:10px; font-weight:700;">Duration (Mins)</label>
                <input type="number" class="input-control ep-input-dur" value="${ep.duration ? Math.round(ep.duration / 60) : 24}">
              </div>
            </div>

            <div>
              <label class="form-label" style="font-size:10px; font-weight:700;">Episode Thumbnail URL</label>
              <input type="text" class="input-control ep-input-thumb" value="${ep.thumbnailUrl || ''}" placeholder="https://...">
            </div>

            <!-- Part 1: Multi-Language Stream Matrix -->
            <div style="background:var(--bg-tertiary); border:1px solid var(--border-color); border-radius:12px; padding:14px;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                <label class="form-label" style="font-size:12px; font-weight:800; color:var(--text-primary); margin-bottom:0;">
                  <i class="fa-solid fa-circle-nodes" style="color:var(--accent-purple);"></i> Episode Part 1 (Main Stream)
                </label>
                <span style="font-size:10px; color:var(--text-tertiary);">Fill stream links for each selected language</span>
              </div>
              
              ${part1LangsHTML}

              <!-- Extra Splitted Parts -->
              ${extraPartsHTML}

              <div style="margin-top:14px; pt:8px; border-top:1px solid var(--border-color);">
                <button type="button" class="btn-secondary" style="height:32px; padding:0 14px; font-size:11px; border-radius:8px; font-weight:700;" onclick="addEpisodeExtraPart(${epIdx})">
                  <i class="fa-solid fa-plus"></i> Add more links (Part ${extraParts.length + 2})
                </button>
              </div>
            </div>
          </div>
        `;
      });
      listContainer.innerHTML = h;
    };

    window.addEpisodeExtraPart = function(epIdx) {
      syncEpisodesFromDOM();
      const activeSeason = window.seasonsData[window.currentSeasonIdx];
      if (activeSeason && activeSeason.episodes && activeSeason.episodes[epIdx]) {
        const ep = activeSeason.episodes[epIdx];
        if (!ep.videoLinks) ep.videoLinks = [];
        ep.videoLinks.push({ videoSources: {} });
        renderEpisodesList();
      }
    };

    window.removeEpisodeExtraPart = function(epIdx, extraIdx) {
      syncEpisodesFromDOM();
      const activeSeason = window.seasonsData[window.currentSeasonIdx];
      if (activeSeason && activeSeason.episodes && activeSeason.episodes[epIdx]) {
        const ep = activeSeason.episodes[epIdx];
        if (ep.videoLinks) {
          ep.videoLinks.splice(extraIdx, 1);
          renderEpisodesList();
        }
      }
    };

    window.addEpisodeCardToActiveSeason = function() {
      syncEpisodesFromDOM();
      const activeSeason = window.seasonsData[window.currentSeasonIdx];
      if (!activeSeason) return;

      const epCount = (activeSeason.episodes || []).length + 1;
      const posterUrl = document.getElementById('up-poster')?.value || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800';

      activeSeason.episodes.push({
        id: 'ep-' + Date.now() + '-' + epCount,
        episodeNumber: epCount,
        title: 'Episode ' + epCount,
        duration: 1440, // 24 mins
        thumbnailUrl: posterUrl,
        videoSources: {},
        videoLinks: []
      });

      renderEpisodesList();
    };

    window.deleteEpisodeCard = function(epIdx) {
      syncEpisodesFromDOM();
      const activeSeason = window.seasonsData[window.currentSeasonIdx];
      if (activeSeason && activeSeason.episodes) {
        activeSeason.episodes.splice(epIdx, 1);
        renderEpisodesList();
      }
    };

    window.autoGenerateEpisodesPrompt = function() {
      syncEpisodesFromDOM();
      const count = parseInt(prompt('How many episodes to auto-generate?', '12'));
      if (!count || count <= 0) return;
      const baseLink = prompt('Enter base link (use {lang} for language, {ep} for episode number)\nExample: https://cdn.com/{lang}/ep{ep}_1080p.mp4', 'https://cdn.com/{lang}/ep{ep}_1080p.mp4');
      if (!baseLink) return;

      const activeSeason = window.seasonsData[window.currentSeasonIdx];
      const currentCount = activeSeason.episodes.length;
      const posterUrl = document.getElementById('up-poster')?.value || '';

      for (let i = 1; i <= count; i++) {
        let epNum = currentCount + i;
        let vSources = {};

        window.activeLanguages.forEach(lang => {
          const langStr = lang.toLowerCase();
          const epUrl = baseLink.replace(/{ep}/g, epNum).replace(/{lang}/g, langStr);
          vSources[lang] = {
            '1080p': epUrl,
            '720p': '',
            '480p': '',
            '360p': ''
          };
        });

        activeSeason.episodes.push({
          id: 'ep-' + Date.now() + '-' + epNum,
          episodeNumber: epNum,
          title: 'Episode ' + epNum,
          duration: 1440,
          thumbnailUrl: posterUrl,
          videoSources: vSources,
          videoLinks: []
        });
      }
      renderEpisodesList();
      showToast('Generated ' + count + ' episodes!');
    };

    window.renderReviewSummary = function() {
      if (window.currentUploadMode === 'movie') {
        const parts = collectCurrentMoviePartsData();
        const filledParts = parts.filter(p => p.videoSources && Object.keys(p.videoSources).length > 0);
        const title = document.getElementById('up-title').value || 'Untitled';
        const type = document.getElementById('up-type').value || 'movie';
        const selectedRows = [];
        document.querySelectorAll('.hr-checkbox:checked').forEach(cb => selectedRows.push(cb.value));

        const container = document.getElementById('review-summary-details');
        if (container) {
          container.innerHTML = `
            <div><strong>Title:</strong> ${title} (${type.toUpperCase()})</div>
            <div><strong>Home Screen Placement:</strong> ${selectedRows.length > 0 ? selectedRows.join(', ') : 'Standard Library'}</div>
            <div><strong>Media Streams:</strong> ${filledParts.length || 1} Splitted Video Part(s) with Multi-Language Matrix (${window.activeLanguages.join(', ')})</div>
          `;
        }
      } else {
        syncEpisodesFromDOM();
        const title = document.getElementById('up-title').value || 'Untitled';
        const type = document.getElementById('up-type').value || 'anime';
        const selectedRows = [];
        document.querySelectorAll('.hr-checkbox:checked').forEach(cb => selectedRows.push(cb.value));

        let totalEps = 0;
        window.seasonsData.forEach(s => totalEps += (s.episodes || []).length);

        const container = document.getElementById('review-summary-details');
        if (container) {
          container.innerHTML = `
            <div><strong>Title:</strong> ${title} (${type.toUpperCase()})</div>
            <div><strong>Home Screen Placement:</strong> ${selectedRows.length > 0 ? selectedRows.join(', ') : 'Standard Library'}</div>
            <div><strong>Media Streams:</strong> ${window.seasonsData.length} Season(s), ${totalEps} Total Episode(s) with Multi-Language Matrix (${window.activeLanguages.join(', ')})</div>
          `;
        }
      }
    };

    window.publishMedia = async function() {
      const title = document.getElementById('up-title').value.trim();
      if (!title) {
        showToast('Please enter content title!');
        goToStep(1);
        return;
      }

      const type = document.getElementById('up-type').value;
      const rating = parseFloat(document.getElementById('up-rating').value || '9.5');
      const year = parseInt(document.getElementById('up-year').value || '2025');
      const country = document.getElementById('up-country').value || 'Japan';
      const seasons = parseInt(document.getElementById('up-seasons').value || '1');
      const genreStr = document.getElementById('up-genre').value || 'Action, Anime';
      const desc = document.getElementById('up-desc').value || 'Watch high quality content on MaxPlay.';
      const posterUrl = document.getElementById('up-poster').value || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800';
      const backdropUrl = document.getElementById('up-backdrop').value || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200';
      const searchHotSection = document.getElementById('up-search-hot-section').value;
      const searchHotPosition = parseInt(document.getElementById('up-search-hot-position').value || '0');

      // Selected Home Rows
      const selectedRows = [];
      document.querySelectorAll('.hr-checkbox:checked').forEach(cb => selectedRows.push(cb.value));

      // Movie Links vs Series Episodes
      let movieParts = [];
      let activeSeasons = [];
      let activeEpisodesList = [];
      let firstVideoUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
      let mainQualityLinks = {};
      let mainVideoSources = {}; // Multi-Language Matrix

      if (window.currentUploadMode === 'movie') {
        movieParts = collectCurrentMoviePartsData();
        if (movieParts.length > 0) {
          const p1 = movieParts[0];
          if (p1 && p1.videoSources && Object.keys(p1.videoSources).length > 0) {
            mainVideoSources = p1.videoSources;
            const firstLang = Object.keys(p1.videoSources)[0];
            if (firstLang && p1.videoSources[firstLang]) {
              mainQualityLinks = p1.videoSources[firstLang];
              firstVideoUrl = mainQualityLinks['1080p'] || mainQualityLinks['720p'] || mainQualityLinks['480p'] || mainQualityLinks['360p'] || firstVideoUrl;
            }
          }
        }
      } else {
        syncEpisodesFromDOM();
        activeSeasons = JSON.parse(JSON.stringify(window.seasonsData));
        activeEpisodesList = activeSeasons.flatMap(s => s.episodes || []);

        if (activeEpisodesList.length > 0) {
          const ep1 = activeEpisodesList[0];
          if (ep1.videoSources && typeof ep1.videoSources === 'object' && Object.keys(ep1.videoSources).length > 0) {
            mainVideoSources = ep1.videoSources;
            const firstLang = Object.keys(mainVideoSources)[0];
            if (firstLang && mainVideoSources[firstLang]) {
              mainQualityLinks = mainVideoSources[firstLang];
              firstVideoUrl = mainQualityLinks['1080p'] || mainQualityLinks['720p'] || mainQualityLinks['480p'] || mainQualityLinks['360p'] || firstVideoUrl;
            }
          } else if (ep1.qualityLinks && typeof ep1.qualityLinks === 'object') {
            mainQualityLinks = ep1.qualityLinks;
            firstVideoUrl = ep1.videoUrl || (mainQualityLinks['1080p'] || mainQualityLinks['720p'] || mainQualityLinks['480p'] || mainQualityLinks['360p'] || firstVideoUrl);
          }
        }
      }

      const contentId = window.editingContentId || ('content-' + Date.now());
      const contentDoc = {
        id: contentId,
        title,
        type,
        rating,
        year,
        country,
        seasons: activeSeasons.length || seasons,
        episodes: activeEpisodesList.length,
        genres: genreStr.split(',').map(g => g.trim()).filter(Boolean),
        description: desc,
        posterUrl,
        backdropUrl,
        searchHotSection: searchHotSection || null,
        searchHotPosition: searchHotPosition || 0,
        homeRows: selectedRows,
        videoUrl: firstVideoUrl,
        qualityLinks: mainQualityLinks,
        videoSources: mainVideoSources,
        availableLanguages: window.activeLanguages,
        videoLinks: movieParts.length > 0 ? movieParts : [firstVideoUrl],
        seasonsData: activeSeasons,
        episodesList: activeEpisodesList,
        trending: selectedRows.length > 0,
        createdAt: new Date().toISOString()
      };

      try {
        await setDoc(doc(db, 'content', contentId), contentDoc, { merge: true });
        showToast('Successfully published content with Multi-Language Matrix!');
        switchTab('content');
      } catch (e) {
        showToast('Error saving to Firestore: ' + e.message);
      }
    };

    // APP CATEGORIES SYSTEM
    window.loadCategories = async function() {
      try {
        const snap = await getDoc(doc(db, 'settings', 'categories'));
        if (snap.exists() && snap.data().list) {
          window.categoriesData = snap.data().list;
        } else {
          window.categoriesData = [
            { id: 'cat-all', name: 'All', image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=300', order: 1 },
            { id: 'cat-anime', name: 'Anime', image: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=300', order: 2 },
            { id: 'cat-movies', name: 'Movies', image: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=300', order: 3 },
            { id: 'cat-series', name: 'Web Series', image: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=300', order: 4 }
          ];
        }
        renderCategories();
      } catch(e) { console.error('Categories load err:', e); }
    };

    window.syncCategoriesFromDOM = function() {
      if (!window.categoriesData || !Array.isArray(window.categoriesData)) return;
      window.categoriesData.forEach((c, i) => {
        const idEl = document.getElementById('cat-id-' + i);
        const nameEl = document.getElementById('cat-name-' + i);
        const imgEl = document.getElementById('cat-img-' + i);
        const orderEl = document.getElementById('cat-order-' + i);
        if (idEl) c.id = idEl.value;
        if (nameEl) c.name = nameEl.value;
        if (imgEl) c.image = imgEl.value;
        if (orderEl) c.order = parseInt(orderEl.value) || (i + 1);
      });
    };

    window.renderCategories = function() {
      const container = document.getElementById('categories-editor');
      if (!container) return;
      if (window.categoriesData.length === 0) {
        container.innerHTML = '<div style="color:var(--text-secondary); padding:20px; text-align:center; background:var(--bg-tertiary); border-radius:12px; border:1px solid var(--border-color);">No categories created. Click "Add New Category" below.</div>';
        return;
      }

      window.categoriesData.sort((a,b) => (a.order || 0) - (b.order || 0));

      let h = '';
      window.categoriesData.forEach((cat, idx) => {
        h += `
          <div style="background:var(--bg-tertiary); padding:16px; border-radius:12px; border:1px solid var(--border-color); display:flex; gap:16px; align-items:center;">
             <img src="${cat.image}" onerror="this.src='https://via.placeholder.com/100'" style="width:60px; height:60px; border-radius:12px; object-fit:cover; border:1px solid var(--border-color);">
             <div style="flex:1; display:grid; grid-template-columns: 1fr 1fr 2fr; gap:12px;">
                 <div>
                   <label class="form-label" style="font-size:10px;">Unique ID</label>
                   <input type="text" id="cat-id-${idx}" class="input-control" value="${cat.id || ''}">
                 </div>
                 <div>
                   <label class="form-label" style="font-size:10px;">Display Name</label>
                   <input type="text" id="cat-name-${idx}" class="input-control" value="${cat.name || ''}">
                 </div>
                 <div>
                   <label class="form-label" style="font-size:10px;">Image URL</label>
                   <input type="text" id="cat-img-${idx}" class="input-control" value="${cat.image || ''}">
                 </div>
             </div>
             <div style="width:60px;">
               <label class="form-label" style="font-size:10px;">Order</label>
               <input type="number" id="cat-order-${idx}" class="input-control" style="text-align:center;" value="${cat.order || (idx + 1)}">
             </div>
             <button class="btn-danger" style="height:42px; width:42px; padding:0;" onclick="deleteCategory(${idx})" title="Delete Category"><i class="fa-solid fa-trash"></i></button>
          </div>
        `;
      });
      container.innerHTML = h;
    };

    window.addNewCategory = async function() {
      window.syncCategoriesFromDOM();
      window.categoriesData.push({ id: 'cat-' + Date.now(), name: 'New Category', image: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=300', order: window.categoriesData.length + 1 });
      renderCategories();
      try {
        await setDoc(doc(db, 'settings', 'categories'), { list: window.categoriesData });
        showToast('New category added and saved to Firestore!');
      } catch(e) { showToast('Error saving category: ' + e.message); }
    };

    window.deleteCategory = async function(idx) {
      if (!confirm('Are you sure you want to delete this category?')) return;
      window.syncCategoriesFromDOM();
      window.categoriesData.splice(idx, 1);
      renderCategories();
      try {
        await setDoc(doc(db, 'settings', 'categories'), { list: window.categoriesData });
        showToast('Category deleted and saved to Firestore!');
        if (window.loadDashboardStats) window.loadDashboardStats();
      } catch(e) { showToast('Error saving changes to Firestore: ' + e.message); }
    };

    window.saveCategories = async function() {
      window.syncCategoriesFromDOM();
      try {
        await setDoc(doc(db, 'settings', 'categories'), { list: window.categoriesData });
        showToast('Categories updated in Firestore!');
        renderCategories();
      } catch(e) { showToast('Error saving categories: ' + e.message); }
    };

    // HOME SCREEN CARDS / ROWS SYSTEM
    window.loadHomeRows = async function() {
      try {
        const snap = await getDoc(doc(db, 'settings', 'homerows'));
        if (snap.exists() && snap.data().list) {
          window.homeRowsData = snap.data().list;
        } else {
          window.homeRowsData = [
            { id: 'row-trending', title: 'Trending Now', order: 1 },
            { id: 'row-cinema', title: 'Cinema', order: 2 },
            { id: 'row-foryou', title: 'For You', order: 3 }
          ];
        }
        renderHomeRows();
        renderHomeRowsCheckboxesInUpload();
      } catch(e) { console.error('Home rows load err:', e); }
    };

    window.renderHomeRows = function() {
      const container = document.getElementById('homerows-editor');
      if (!container) return;
      if (!window.homeRowsData || window.homeRowsData.length === 0) {
        container.innerHTML = '<div style="color:var(--text-secondary);">No dynamic rows configured. Click "Add New Row Section".</div>';
        return;
      }

      window.homeRowsData.sort((a,b) => (a.order || 0) - (b.order || 0));

      // Gather all existing media types and genres from cached content
      const baseTypes = ['All', 'Anime', 'Movie', 'TV', 'Short TV', 'Cinema', 'Trending', 'For You'];
      const defaultGenres = ['Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Hindi Dubbed', 'Horror', 'Romance', 'Sci-Fi', 'Thriller'];

      const libraryTypesSet = new Set(baseTypes);
      const libraryGenresSet = new Set(defaultGenres);

      if (window.cachedContentDocs && Array.isArray(window.cachedContentDocs)) {
        window.cachedContentDocs.forEach(item => {
          const d = item.data || item;
          if (d.type && typeof d.type === 'string') {
            const formatted = d.type.charAt(0).toUpperCase() + d.type.slice(1);
            libraryTypesSet.add(formatted);
          }
          if (d.category && typeof d.category === 'string') {
            const formatted = d.category.charAt(0).toUpperCase() + d.category.slice(1);
            libraryTypesSet.add(formatted);
          }
          if (d.genres && Array.isArray(d.genres)) {
            d.genres.forEach(g => {
              if (g && typeof g === 'string' && g.trim()) {
                libraryGenresSet.add(g.trim());
              }
            });
          }
        });
      }

      const allTypesList = Array.from(libraryTypesSet);
      const allGenresList = Array.from(libraryGenresSet);

      // Create or update target filter datalist for native browser popups on click
      let datalistEl = document.getElementById('target-filter-datalist');
      if (!datalistEl) {
        datalistEl = document.createElement('datalist');
        datalistEl.id = 'target-filter-datalist';
        document.body.appendChild(datalistEl);
      }
      datalistEl.innerHTML = [...allTypesList, ...allGenresList].map(opt => `<option value="${opt}"></option>`).join('');

      let h = '';
      window.homeRowsData.forEach((row, idx) => {
        const curFilter = row.targetFilter || 'All';
        
        // Count matching items in cached library
        let matchCount = 0;
        if (window.cachedContentDocs && Array.isArray(window.cachedContentDocs)) {
          matchCount = window.cachedContentDocs.filter(item => {
            const d = item.data || item;
            if (d.homeRows && Array.isArray(d.homeRows) && d.homeRows.includes(row.id)) return true;
            if (!curFilter || curFilter === 'All') return true;
            const targetLower = curFilter.toLowerCase();
            const typeMatch = d.type && d.type.toLowerCase() === targetLower;
            const categoryMatch = d.category && d.category.toLowerCase() === targetLower;
            const genreMatch = d.genres && Array.isArray(d.genres) && d.genres.some(g => String(g).toLowerCase() === targetLower);
            return typeMatch || categoryMatch || genreMatch;
          }).length;
        }

        h += `
          <div id="homerow-card-${idx}" style="background:var(--bg-secondary); border:1px solid var(--border-color); border-radius:14px; padding:18px; margin-bottom:14px; box-shadow:0 4px 16px rgba(0,0,0,0.2); transition:all 0.2s ease;">
            <!-- Row Header Bar -->
            <div style="display:flex; align-items:center; justify-content:space-between; padding-bottom:12px; margin-bottom:14px; border-bottom:1px solid rgba(255,255,255,0.06); flex-wrap:wrap; gap:10px;">
              <div style="display:flex; align-items:center; gap:10px;">
                <span style="background:rgba(139, 92, 246, 0.15); border:1px solid rgba(139, 92, 246, 0.3); color:#A78BFA; font-size:11px; font-weight:800; padding:4px 10px; border-radius:8px;">
                  Row #${idx + 1}
                </span>
                <span style="font-size:14px; font-weight:700; color:#FFF;" id="hr-title-preview-${idx}">
                  ${row.title || 'Untitled Row'}
                </span>
              </div>

              <div style="display:flex; align-items:center; gap:10px;">
                <!-- Live Target Badge -->
                <span id="hr-badge-${idx}" style="background:rgba(6, 182, 212, 0.15); border:1px solid rgba(6, 182, 212, 0.3); color:#22D3EE; font-size:11px; font-weight:700; padding:4px 10px; border-radius:8px; display:inline-flex; align-items:center; gap:6px;">
                  <i class="fa-solid fa-filter" style="font-size:10px;"></i>
                  <span>Target: ${curFilter}</span>
                </span>

                <!-- Matching Content Count -->
                <span style="background:rgba(255,255,255,0.05); border:1px solid var(--border-color); color:#A1A1AA; font-size:11px; font-weight:600; padding:4px 10px; border-radius:8px; display:inline-flex; align-items:center; gap:6px;">
                  <i class="fa-solid fa-film" style="color:#A78BFA; font-size:10px;"></i>
                  <span>${matchCount} Titles Match</span>
                </span>

                <!-- Delete Button -->
                <button type="button" class="btn-danger" style="height:32px; width:32px; padding:0; border-radius:8px; display:flex; align-items:center; justify-content:center; cursor:pointer;" onclick="deleteHomeRow(${idx})" title="Delete Row">
                  <i class="fa-solid fa-trash-can" style="font-size:12px;"></i>
                </button>
              </div>
            </div>

            <!-- Form Grid -->
            <div style="display:grid; grid-template-columns:1fr 1fr 100px; gap:14px; margin-bottom:14px;">
              <div>
                <label class="form-label" style="font-size:11px; font-weight:700; color:#D4D4D8; margin-bottom:6px; display:block;">Row Title (Header in App)</label>
                <input 
                  type="text" 
                  id="hr-title-${idx}" 
                  class="input-control" 
                  value="${row.title || ''}" 
                  placeholder="e.g. ⛩️ Top Anime Series" 
                  oninput="document.getElementById('hr-title-preview-${idx}').innerText = this.value || 'Untitled Row'"
                  style="background:var(--bg-tertiary);"
                >
              </div>
              <div>
                <label class="form-label" style="font-size:11px; font-weight:700; color:#D4D4D8; margin-bottom:6px; display:block;">Row ID (Unique Identifier)</label>
                <input 
                  type="text" 
                  id="hr-id-${idx}" 
                  class="input-control" 
                  value="${row.id || ''}" 
                  placeholder="e.g. row-anime" 
                  style="background:var(--bg-tertiary);"
                >
              </div>
              <div>
                <label class="form-label" style="font-size:11px; font-weight:700; color:#D4D4D8; margin-bottom:6px; display:block;">Order</label>
                <input 
                  type="number" 
                  id="hr-order-${idx}" 
                  class="input-control" 
                  value="${row.order || (idx + 1)}" 
                  style="text-align:center; background:var(--bg-tertiary);"
                >
              </div>
            </div>

            <!-- Target Filter Interactive Selector Box -->
            <div style="background:var(--bg-tertiary); border:1px solid var(--border-color); border-radius:12px; padding:14px;">
              <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; flex-wrap:wrap; gap:8px;">
                <label class="form-label" style="font-size:11px; font-weight:700; color:#FFF; margin-bottom:0; display:flex; align-items:center; gap:6px;">
                  <i class="fa-solid fa-filter" style="color:#8B5CF6;"></i>
                  <span>Target Filter (Pre-selects Filter Screen on 'See All')</span>
                </label>
                <span style="font-size:10px; color:#A1A1AA;">Click a chip below or pick from dropdown</span>
              </div>

              <!-- Input & Dropdown Row -->
              <div style="display:flex; gap:10px; align-items:center; margin-bottom:12px;">
                <div style="position:relative; flex:1;">
                  <i class="fa-solid fa-magnifying-glass" style="position:absolute; left:12px; top:50%; transform:translateY(-50%); font-size:11px; color:#71717A;"></i>
                  <input 
                    type="text" 
                    id="hr-filter-${idx}" 
                    class="input-control" 
                    value="${curFilter}" 
                    placeholder="Type or select filter (e.g. Anime, Movie, Action)..." 
                    oninput="window.updateTargetFilterPills(${idx}, this.value)"
                    style="padding-left:32px; background:var(--bg-secondary); border-color:var(--border-color);"
                  >
                </div>
                <select 
                  class="input-control" 
                  style="width:160px; font-size:11px; font-weight:600; cursor:pointer; background:var(--bg-secondary); border-color:var(--border-color); color:#FFF;" 
                  onchange="if(this.value){ window.setRowTargetFilter(${idx}, this.value); this.value=''; }"
                >
                  <option value="">Choose Filter...</option>
                  <optgroup label="🎬 Media Types">
                    ${allTypesList.map(t => `<option value="${t}" ${curFilter.toLowerCase() === t.toLowerCase() ? 'selected' : ''}>${t}</option>`).join('')}
                  </optgroup>
                  <optgroup label="🎭 Genres & Tags">
                    ${allGenresList.map(g => `<option value="${g}" ${curFilter.toLowerCase() === g.toLowerCase() ? 'selected' : ''}>${g}</option>`).join('')}
                  </optgroup>
                </select>
              </div>

              <!-- Quick Selection Pills -->
              <div style="display:flex; flex-direction:column; gap:8px;">
                <!-- Media Types Row -->
                <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                  <span style="font-size:10px; font-weight:700; color:#71717A; min-width:48px;">Types:</span>
                  ${['All', 'Anime', 'Movie', 'TV', 'Short TV', 'Cinema', 'Trending', 'For You'].map(pill => {
                    const isAct = curFilter.toLowerCase() === pill.toLowerCase();
                    return `
                      <button 
                        type="button" 
                        id="hr-pill-${idx}-${pill.replace(/\s+/g, '')}"
                        class="hr-filter-pill-${idx}"
                        data-pill-val="${pill}"
                        style="height:26px; padding:0 10px; font-size:11px; font-weight:600; border-radius:8px; cursor:pointer; transition:all 0.15s ease; ${
                          isAct 
                            ? 'background:rgba(139, 92, 246, 0.25); border:1px solid #8B5CF6; color:#FFF; box-shadow:0 0 8px rgba(139, 92, 246, 0.3);' 
                            : 'background:var(--bg-secondary); border:1px solid var(--border-color); color:#A1A1AA;'
                        }" 
                        onclick="window.setRowTargetFilter(${idx}, '${pill}')"
                      >
                        ${pill}
                      </button>
                    `;
                  }).join('')}
                </div>

                <!-- Genres Row -->
                <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                  <span style="font-size:10px; font-weight:700; color:#71717A; min-width:48px;">Genres:</span>
                  ${['Action', 'Drama', 'Comedy', 'Romance', 'Fantasy', 'Horror', 'Sci-Fi', 'Hindi Dubbed'].map(pill => {
                    const isAct = curFilter.toLowerCase() === pill.toLowerCase();
                    return `
                      <button 
                        type="button" 
                        id="hr-pill-${idx}-${pill.replace(/\s+/g, '')}"
                        class="hr-filter-pill-${idx}"
                        data-pill-val="${pill}"
                        style="height:26px; padding:0 10px; font-size:11px; font-weight:600; border-radius:8px; cursor:pointer; transition:all 0.15s ease; ${
                          isAct 
                            ? 'background:rgba(139, 92, 246, 0.25); border:1px solid #8B5CF6; color:#FFF; box-shadow:0 0 8px rgba(139, 92, 246, 0.3);' 
                            : 'background:var(--bg-secondary); border:1px solid var(--border-color); color:#A1A1AA;'
                        }" 
                        onclick="window.setRowTargetFilter(${idx}, '${pill}')"
                      >
                        ${pill}
                      </button>
                    `;
                  }).join('')}
                </div>
              </div>
            </div>
          </div>
        `;
      });
      container.innerHTML = h;
    };

    window.setRowTargetFilter = function(idx, value) {
      const inputEl = document.getElementById('hr-filter-' + idx);
      if (inputEl) {
        inputEl.value = value;
        window.updateTargetFilterPills(idx, value);
      }
    };

    window.updateTargetFilterPills = function(idx, val) {
      const valLower = (val || '').trim().toLowerCase();
      
      // Update badge preview
      const badgeEl = document.getElementById('hr-badge-' + idx);
      if (badgeEl) {
        badgeEl.innerHTML = `<i class="fa-solid fa-filter" style="font-size:10px;"></i><span>Target: ${val || 'All'}</span>`;
      }

      // Update pills highlighting
      const pills = document.querySelectorAll('.hr-filter-pill-' + idx);
      pills.forEach(p => {
        const pVal = (p.getAttribute('data-pill-val') || '').toLowerCase();
        if (pVal === valLower) {
          p.style.background = 'rgba(139, 92, 246, 0.25)';
          p.style.border = '1px solid #8B5CF6';
          p.style.color = '#FFF';
          p.style.boxShadow = '0 0 8px rgba(139, 92, 246, 0.3)';
        } else {
          p.style.background = 'var(--bg-secondary)';
          p.style.border = '1px solid var(--border-color)';
          p.style.color = '#A1A1AA';
          p.style.boxShadow = 'none';
        }
      });
    };

    window.syncHomeRowsFromDOM = function() {
      if (!window.homeRowsData || !Array.isArray(window.homeRowsData)) return;
      window.homeRowsData.forEach((r, i) => {
        const idEl = document.getElementById('hr-id-' + i);
        const titleEl = document.getElementById('hr-title-' + i);
        const orderEl = document.getElementById('hr-order-' + i);
        const filterEl = document.getElementById('hr-filter-' + i);
        
        if (idEl) r.id = idEl.value;
        if (titleEl) r.title = titleEl.value;
        if (orderEl) r.order = parseInt(orderEl.value) || 0;
        if (filterEl) r.targetFilter = filterEl.value;
      });
    };

    window.addNewHomeRow = async function() {
      window.syncHomeRowsFromDOM();
      window.homeRowsData.push({ id: 'row-' + Date.now(), title: 'New Row Section', order: window.homeRowsData.length + 1 });
      renderHomeRows();
      renderHomeRowsCheckboxesInUpload();
      try {
        await setDoc(doc(db, 'settings', 'homerows'), { list: window.homeRowsData });
        showToast('New home row added and saved!');
      } catch(e) {}
    };

    window.deleteHomeRow = async function(idx) {
      if(!confirm("Are you sure? Items assigned to this row won't display under it anymore.")) return;
      window.syncHomeRowsFromDOM();
      window.homeRowsData.splice(idx, 1);
      renderHomeRows();
      renderHomeRowsCheckboxesInUpload();
      try {
        await setDoc(doc(db, 'settings', 'homerows'), { list: window.homeRowsData });
        showToast('Row section deleted and saved to Firestore!');
      } catch(e) { showToast('Error deleting row section: ' + e.message); }
    };

    window.saveHomeRows = async function() {
      window.syncHomeRowsFromDOM();
      try {
        await setDoc(doc(db, 'settings', 'homerows'), { list: window.homeRowsData });
        showToast('Home Screen Rows updated in Firestore!');
        renderHomeRows();
        renderHomeRowsCheckboxesInUpload();
      } catch(e) { showToast('Error saving home rows'); }
    };

    window.renderHomeRowsCheckboxesInUpload = function() {
      const container = document.getElementById('homerows-checkbox-container');
      if (!container) return;
      if (window.homeRowsData.length === 0) {
        container.innerHTML = '<div style="color:var(--text-tertiary); font-size:12px;">No home rows created yet.</div>';
        return;
      }
      let h = '';
      window.homeRowsData.forEach(row => {
        h += `
          <label class="checkbox-item">
            <input type="checkbox" class="hr-checkbox" value="${row.id}">
            <span>${row.title}</span>
          </label>
        `;
      });
      container.innerHTML = h;
    };

    // HERO BANNERS MANAGEMENT
    window.loadHeroBanners = async function() {
      try {
        const snap = await getDocs(collection(db, 'heroBanners'));
        window.heroBannersData = [];
        snap.forEach(d => window.heroBannersData.push({ id: d.id, ...d.data() }));
        if (window.heroBannersData.length === 0) {
          window.heroBannersData = [
            { id: 'b1', title: 'Solo Leveling', subtitle: 'Arise S2 Premiering', imageUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200', order: 1 }
          ];
        }
        renderHeroBanners();
      } catch(e) { console.error('Hero banners err:', e); }
    };

    window.updateHeroBannerPreview = function(idx) {
      const imgEl = document.getElementById('hb-img-' + idx);
      const contentEl = document.getElementById('hb-content-' + idx);

      const prevTitle = document.getElementById('hb-preview-title-' + idx);
      const prevSub = document.getElementById('hb-preview-sub-' + idx);
      const prevImg = document.getElementById('hb-preview-img-' + idx);

      let titleText = 'Banner Title';
      let subText = 'Featured Content';

      if (contentEl && contentEl.value) {
        const cId = contentEl.value;
        const attachedDoc = (window.cachedContentDocs || []).find(d => d.id === cId);
        if (attachedDoc && attachedDoc.data) {
           titleText = attachedDoc.data.title || titleText;
           subText = attachedDoc.data.description || subText;
           // limit subtitle length for preview
           if (subText.length > 60) subText = subText.substring(0, 60) + '...';
        }
      }

      if (prevTitle) prevTitle.innerText = titleText;
      if (prevSub) prevSub.innerText = subText;
      
      if (prevImg && imgEl && imgEl.value.trim()) {
        prevImg.src = imgEl.value.trim();
      }
    };

    window.renderHeroBanners = function() {
      const container = document.getElementById('hero-banners-editor');
      if (!container) return;
      let h = '';

      window.heroBannersData.forEach((b, idx) => {
        let contentOptions = `<option value="" ${!b.contentId ? 'selected' : ''}>(None / Custom Link)</option>`;
        (window.cachedContentDocs || []).forEach(c => {
          const isSel = b.contentId === c.id ? 'selected' : '';
          contentOptions += `<option value="${c.id}" ${isSel}>${c.data.title || c.id}</option>`;
        });
        h += `
          <div style="background:var(--bg-tertiary); padding:16px; border-radius:14px; border:1px solid var(--border-color); display:flex; flex-direction:column; gap:12px;">
             <!-- LIVE BANNER CARD PREVIEW -->
             <div style="position:relative; width:100%; height:140px; border-radius:10px; overflow:hidden; background:#0B0B0E; border:1px solid var(--border-color); display:flex; align-items:center; justify-content:center;">
               <img id="hb-preview-img-${idx}" src="${b.imageUrl || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200'}" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200';" style="width:100%; height:100%; object-fit:cover; opacity:0.85; transition:all 0.3s ease;">
               <div style="position:absolute; inset:0; background:linear-gradient(to top, rgba(10,10,12,0.95) 0%, rgba(10,10,12,0.3) 60%, transparent 100%);"></div>
               <div style="position:absolute; top:10px; right:10px; background:rgba(139,92,246,0.9); color:#fff; font-size:10px; font-weight:800; padding:4px 10px; border-radius:20px; text-transform:uppercase; letter-spacing:0.5px; backdrop-filter:blur(4px); display:flex; align-items:center; gap:5px; box-shadow:0 2px 8px rgba(0,0,0,0.4);">
                 <i class="fa-solid fa-eye"></i> Live Image Card Preview
               </div>
               <div style="position:absolute; bottom:12px; left:14px; right:14px; z-index:2; text-shadow:0 2px 4px rgba(0,0,0,0.8);">
                 <div id="hb-preview-title-${idx}" style="font-weight:800; font-size:16px; color:#ffffff; line-height:1.2;">${b.title || 'Banner Title'}</div>
                 <div id="hb-preview-sub-${idx}" style="font-size:12px; color:#A1A1AA; font-weight:500; margin-top:2px;">${b.subtitle || 'Featured Content'}</div>
               </div>
             </div>

             <div style="display:flex; justify-content:space-between; align-items:center;">
               <span style="font-weight:800; color:var(--accent-purple); font-size:13px; display:flex; align-items:center; gap:6px;">
                 <i class="fa-solid fa-layer-group"></i> Hero Banner Slot #${idx + 1}
               </span>
               <button class="btn-danger" style="height:32px; padding:0 12px; font-size:11px;" onclick="deleteHeroBanner('${b.id}')"><i class="fa-solid fa-trash"></i> Delete Banner</button>
             </div>

             <div style="display:grid; grid-template-columns: 2fr 2fr 80px; gap:10px;">
               <div>
                 <label class="form-label" style="font-size:10px; color:var(--accent-purple);">Main Wide Backdrop Image URL</label>
                 <input type="text" id="hb-img-${idx}" class="input-control" value="${b.imageUrl || ''}" oninput="updateHeroBannerPreview(${idx})" placeholder="https://...">
               </div>
               <div>
                 <label class="form-label" style="font-size:10px; color:var(--accent-green);">Attach Content (Mini Poster & Details)</label>
                 <select id="hb-content-${idx}" class="input-control" onchange="updateHeroBannerPreview(${idx})">
                   ${contentOptions}
                 </select>
               </div>
               <div>
                 <label class="form-label" style="font-size:10px;">Order</label>
                 <input type="number" id="hb-order-${idx}" class="input-control" style="text-align:center;" value="${b.order || (idx + 1)}">
               </div>
             </div>
          </div>
        `;
      });
      container.innerHTML = h;
    };

    window.addNewBannerSlot = function() {
      window.heroBannersData.push({ id: 'banner-' + Date.now(), title: 'New Banner', subtitle: 'Featured Content', imageUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200', order: window.heroBannersData.length + 1 });
      renderHeroBanners();
    };

    window.deleteHeroBanner = async function(bId) {
      try {
        await deleteDoc(doc(db, 'heroBanners', bId));
        showToast('Banner deleted');
        loadHeroBanners();
      } catch(e) { showToast('Error deleting banner'); }
    };

    window.saveAllHeroBanners = async function() {
      try {
        for (let i = 0; i < window.heroBannersData.length; i++) {
          const b = window.heroBannersData[i];
          const bId = b.id || ('banner-' + Date.now() + '-' + i);
          const imageUrl = document.getElementById(`hb-img-${i}`)?.value || '';
          const contentId = document.getElementById(`hb-content-${i}`)?.value || '';
          const order = parseInt(document.getElementById(`hb-order-${i}`)?.value || (i + 1));

          let title = '';
          let subtitle = '';
          if (contentId) {
             const attachedDoc = (window.cachedContentDocs || []).find(d => d.id === contentId);
             if (attachedDoc && attachedDoc.data) {
                 title = attachedDoc.data.title || '';
                 subtitle = attachedDoc.data.description || '';
             }
          }

          await setDoc(doc(db, 'heroBanners', bId), {
            id: bId,
            title,
            subtitle,
            imageUrl,
            contentId,
            order,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        }
        showToast('Hero banners saved!');
      } catch(e) { showToast('Error saving banners'); }
    };

    // SEARCH SETTINGS
    window.saveSearchSettings = async function() {
      const raw = document.getElementById('search-tags-input')?.value || '';
      const tags = raw.split(',').map(t => t.trim()).filter(Boolean);
      try {
        await setDoc(doc(db, 'settings', 'search'), { everyoneSearching: tags });
        showToast('Search tags updated!');
      } catch(e) { showToast('Error saving search tags'); }
    };

    // 8. ADVANCED REAL-TIME USER MANAGEMENT SYSTEM
    window.usersData = [];
    // 8. USER MANAGEMENT SYSTEM
    window.usersData = [];
    window.userFilterStatus = 'all';
    let usersSnapshotUnsubscribe = null;

    window.setUserStatusFilter = function(filterVal) {
      window.userFilterStatus = filterVal;
      ['all', 'active', 'blocked', 'admin'].forEach(f => {
        const btn = document.getElementById('user-filter-' + f);
        if (btn) {
          if (f === filterVal) {
            btn.classList.add('active');
            btn.style.background = 'linear-gradient(135deg, #06B6D4, #8B5CF6)';
            btn.style.color = '#FFF';
            btn.style.border = 'none';
          } else {
            btn.classList.remove('active');
            btn.style.background = 'var(--bg-secondary)';
            btn.style.color = 'var(--text-secondary)';
            btn.style.border = '1px solid rgba(255,255,255,0.08)';
          }
        }
      });
      window.renderUsersTable();
    };

    window.filterUsersTable = function() {
      window.renderUsersTable();
    };

    window.copyUserUID = function(uid) {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(uid).then(() => {
            if (window.showToast) window.showToast('Copied UID: ' + uid);
          }).catch(() => fallbackCopyUID(uid));
        } else {
          fallbackCopyUID(uid);
        }
      } catch(e) {
        fallbackCopyUID(uid);
      }
    };

    function fallbackCopyUID(text) {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus();
      ta.select();
      try {
        document.execCommand('copy');
        if (window.showToast) window.showToast('Copied UID: ' + text);
      } catch (e) {
        prompt('Copy UID manually:', text);
      }
      document.body.removeChild(ta);
    }

    window.loadUsers = async function() {
      const tbody = document.getElementById('users-table-body');
      if (tbody && (!window.usersData || window.usersData.length === 0)) {
        tbody.innerHTML = `
          <tr>
            <td colspan="5" style="text-align:center; padding:35px; color:var(--text-tertiary);">
              <i class="fa-solid fa-spinner fa-spin" style="margin-right:8px; color:#06B6D4; font-size:18px;"></i>
              Loading real-time user accounts from Firestore...
            </td>
          </tr>
        `;
      }

      try {
        // Initial fetch
        const snap = await getDocs(collection(db, 'users'));
        window.usersData = [];
        snap.forEach(d => {
          const u = d.data() || {};
          window.usersData.push({
            id: d.id,
            uid: d.id,
            displayName: u.displayName || u.name || 'Anonymous User',
            email: u.email || 'No email attached',
            photoURL: u.photoURL || u.avatar || '',
            role: u.role || (u.isAdmin ? 'admin' : 'user'),
            status: u.status || (u.isBlocked ? 'blocked' : 'active'),
            gender: u.gender || 'Male',
            age: u.age || 20,
            bio: u.bio || '',
            isPremium: !!u.isPremium,
            createdAt: u.createdAt || '',
            updatedAt: u.updatedAt || u.lastLoginAt || ''
          });
        });

        // Update badge count
        const badgeCount = document.getElementById('users-badge-count');
        if (badgeCount) badgeCount.innerText = `${window.usersData.length} Users`;

        const statUsers = document.getElementById('stat-total-users');
        if (statUsers) statUsers.innerText = window.usersData.length.toString();

        const dashUsers = document.getElementById('dash-users');
        if (dashUsers) dashUsers.innerText = window.usersData.length.toString();

        window.renderUsersTable();

        // Attach live real-time listener if not already attached
        if (!usersSnapshotUnsubscribe) {
          usersSnapshotUnsubscribe = onSnapshot(collection(db, 'users'), (snapshot) => {
            window.usersData = [];
            snapshot.forEach(d => {
              const u = d.data() || {};
              window.usersData.push({
                id: d.id,
                uid: d.id,
                displayName: u.displayName || u.name || 'Anonymous User',
                email: u.email || 'No email attached',
                photoURL: u.photoURL || u.avatar || '',
                role: u.role || (u.isAdmin ? 'admin' : 'user'),
                status: u.status || (u.isBlocked ? 'blocked' : 'active'),
                gender: u.gender || 'Male',
                age: u.age || 20,
                bio: u.bio || '',
                isPremium: !!u.isPremium,
                createdAt: u.createdAt || '',
                updatedAt: u.updatedAt || u.lastLoginAt || ''
              });
            });

            const bCount = document.getElementById('users-badge-count');
            if (bCount) bCount.innerText = `${window.usersData.length} Users`;
            const sUsers = document.getElementById('stat-total-users');
            if (sUsers) sUsers.innerText = window.usersData.length.toString();
            const dUsers = document.getElementById('dash-users');
            if (dUsers) dUsers.innerText = window.usersData.length.toString();

            window.renderUsersTable();
          }, (err) => {
            console.warn('Real-time users listener warning:', err);
          });
        }
      } catch(e) {
        console.error('Error loading users:', e);
        if (tbody) {
          tbody.innerHTML = `
            <tr>
              <td colspan="5" style="text-align:center; padding:30px; color:var(--text-tertiary);">
                <div style="color:#EF4444; font-weight:700; margin-bottom:6px;"><i class="fa-solid fa-triangle-exclamation"></i> Error connecting to Firestore users collection</div>
                <div style="font-size:11px; margin-bottom:12px;">${e.message}</div>
                <button class="btn-primary" onclick="loadUsers()" style="height:32px; padding:0 14px; font-size:11px; margin:0 auto;">
                  <i class="fa-solid fa-arrows-rotate"></i> Retry Loading Users
                </button>
              </td>
            </tr>
          `;
        }
      }
    };

    window.renderUsersTable = function() {
      const tbody = document.getElementById('users-table-body');
      if (!tbody) return;

      const q = (document.getElementById('users-search-input')?.value || '').toLowerCase().trim();
      const filter = window.userFilterStatus || 'all';

      const filtered = (window.usersData || []).filter(u => {
        // Status filter
        if (filter === 'active' && (u.status === 'blocked' || u.status === 'banned')) return false;
        if (filter === 'blocked' && u.status !== 'blocked' && u.status !== 'banned') return false;
        if (filter === 'admin' && u.role !== 'admin' && u.role !== 'moderator') return false;

        // Search query
        if (q) {
          const matchName = (u.displayName || '').toLowerCase().includes(q);
          const matchEmail = (u.email || '').toLowerCase().includes(q);
          const matchId = (u.id || '').toLowerCase().includes(q);
          if (!matchName && !matchEmail && !matchId) return false;
        }

        return true;
      });

      if (filtered.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="5" style="text-align:center; padding:45px 20px; color:var(--text-tertiary);">
              <i class="fa-solid fa-user-slash" style="font-size:28px; margin-bottom:10px; display:block; color:rgba(255,255,255,0.2);"></i>
              <div style="font-weight:700; color:#FFF; font-size:14px; margin-bottom:4px;">No User Accounts Found</div>
              <div style="font-size:12px; max-width:320px; margin:0 auto;">No accounts match the current filter or search criteria. Use "Add User" button above to register new users.</div>
            </td>
          </tr>
        `;
        return;
      }

      let h = '';
      filtered.forEach(u => {
        const isBlocked = u.status === 'blocked' || u.status === 'banned';
        const isAdmin = u.role === 'admin' || u.role === 'moderator';

        let statusBadge = '<span class="status-badge status-active"><i class="fa-solid fa-circle-check"></i> Active</span>';
        if (isBlocked) {
          statusBadge = '<span class="status-badge" style="background:rgba(239,68,68,0.15); color:#EF4444; border:1px solid rgba(239,68,68,0.3);"><i class="fa-solid fa-ban"></i> Blocked</span>';
        } else if (isAdmin) {
          statusBadge = '<span class="status-badge" style="background:rgba(139,92,246,0.15); color:#A78BFA; border:1px solid rgba(139,92,246,0.3);"><i class="fa-solid fa-shield"></i> Admin</span>';
        }

        const initial = (u.displayName || 'U').charAt(0).toUpperCase();
        const avatarHtml = u.photoURL 
          ? `<img src="${u.photoURL}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';" style="width:38px; height:38px; border-radius:50%; object-fit:cover; border:1px solid rgba(255,255,255,0.15); flex-shrink:0;">
             <div style="display:none; width:38px; height:38px; border-radius:50%; background:linear-gradient(135deg, #06B6D4, #8B5CF6); align-items:center; justify-content:center; font-weight:800; color:#FFF; font-size:14px; flex-shrink:0;">${initial}</div>`
          : `<div style="width:38px; height:38px; border-radius:50%; background:linear-gradient(135deg, #06B6D4, #8B5CF6); display:flex; align-items:center; justify-content:center; font-weight:800; color:#FFF; font-size:14px; flex-shrink:0;">${initial}</div>`;

        h += `
          <tr>
            <td>
              <div style="display:flex; align-items:center; gap:12px; cursor:pointer;" onclick="window.openEditUserModal('${(u.id || '').replace(/'/g, "\\'")}')" title="Click to view full user profile & telemetry">
                ${avatarHtml}
                <div style="min-width:0;">
                  <div style="font-weight:700; font-size:13px; color:#FFF; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${u.displayName}">${u.displayName}</div>
                  <div style="font-size:11px; color:var(--text-tertiary); display:flex; align-items:center; gap:6px;">
                    <span>${u.role === 'admin' ? '<span style="color:#A78BFA; font-weight:700;">Administrator</span>' : (u.role === 'moderator' ? '<span style="color:#38BDF8; font-weight:700;">Moderator</span>' : 'Standard Member')}</span>
                    ${u.isPremium ? '<span style="background:rgba(245,158,11,0.15); color:#FBBF24; font-size:9px; padding:1px 5px; border-radius:4px; font-weight:800; border:1px solid rgba(245,158,11,0.3);">VIP</span>' : ''}
                  </div>
                </div>
              </div>
            </td>
            <td>
              <div style="display:flex; align-items:center; gap:6px;">
                <span style="font-family:monospace; font-size:11px; color:var(--text-secondary); max-width:140px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;" title="${u.id}">${u.id}</span>
                <button type="button" onclick="copyUserUID('${(u.id || '').replace(/'/g, "\\'")}')" style="background:none; border:none; color:var(--text-tertiary); cursor:pointer; font-size:12px; padding:2px 4px;" title="Copy UID">
                  <i class="fa-regular fa-copy"></i>
                </button>
              </div>
            </td>
            <td>
              <div style="font-size:12px; color:var(--text-secondary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:180px;" title="${u.email}">${u.email}</div>
            </td>
            <td>
              ${statusBadge}
            </td>
            <td>
              <div style="display:flex; justify-content:flex-end; gap:6px;">
                <button type="button" class="btn-secondary" style="height:32px; padding:0 10px; font-size:11px; cursor:pointer;" onclick="window.openEditUserModal('${(u.id || '').replace(/'/g, "\\'")}')" title="Edit Profile & View Telemetry">
                  <i class="fa-solid fa-pen"></i>
                </button>
                <button type="button" class="btn-secondary" style="height:32px; padding:0 10px; font-size:11px; cursor:pointer; color:${isBlocked ? '#10B981' : '#F59E0B'};" onclick="toggleUserBlock('${(u.id || '').replace(/'/g, "\\'")}', '${u.status || 'active'}')" title="${isBlocked ? 'Unblock User' : 'Block User'}">
                  <i class="fa-solid ${isBlocked ? 'fa-unlock' : 'fa-ban'}"></i>
                </button>
                <button type="button" class="btn-danger" style="height:32px; padding:0 10px; font-size:11px; cursor:pointer;" onclick="deleteUserAccount('${(u.id || '').replace(/'/g, "\\'")}')" title="Delete User">
                  <i class="fa-solid fa-trash"></i>
                </button>
              </div>
            </td>
          </tr>
        `;
      });

      tbody.innerHTML = h;
    };

    window.switchUserModalTab = function(tabName) {
      const tabs = ['activity', 'reports', 'suspension', 'profile'];
      tabs.forEach(t => {
        const btn = document.getElementById(`tab-btn-user-${t}`);
        const pane = document.getElementById(`user-modal-tab-${t}`);
        if (btn) {
          if (t === tabName) {
            btn.style.borderBottom = '2px solid #06B6D4';
            btn.style.color = '#FFF';
            btn.classList.add('active');
          } else {
            btn.style.borderBottom = '2px solid transparent';
            btn.style.color = 'var(--text-tertiary)';
            btn.classList.remove('active');
          }
        }
        if (pane) {
          pane.style.display = (t === tabName) ? 'flex' : 'none';
        }
      });
    };

    window.applySuspensionPreset = function() {
      const preset = document.getElementById('edit-user-reason-preset')?.value;
      const reasonInput = document.getElementById('edit-user-block-reason');
      const messageInput = document.getElementById('edit-user-block-message');
      const previewText = document.getElementById('preview-user-block-text');

      if (!preset) return;

      const presetMessages = {
        'Comment Policy Violation': 'Your account has been suspended by administration due to violating community comment guidelines (inappropriate, offensive, or prohibited content). If you believe this is an error, please contact MaxPlay support.',
        'Spamming & Promotional Links': 'Your account has been suspended due to unauthorized spamming, link promotion, or automated posting behavior in the discussion feeds. Please contact support.',
        'Harassment & Misconduct': 'Your account has been suspended due to verified user reports of harassment, abusive behavior, or toxic comments directed at other members.',
        'Multiple Copyright Infringements': 'Your account has been suspended for repeated copyright policy infringements and prohibited content distribution.',
        'Terms of Service Violation': 'Your account access has been restricted due to non-compliance with MaxPlay terms of service and community standards.',
        'Custom': 'Your MaxPlay account has been suspended by administration. If you have questions regarding this action, please reach out to support.'
      };

      if (reasonInput) reasonInput.value = preset === 'Custom' ? 'Account Violation' : preset;
      if (messageInput) {
        messageInput.value = presetMessages[preset] || presetMessages['Terms of Service Violation'];
        if (previewText) previewText.innerText = `"${messageInput.value}"`;
      }
    };

    window.handleUserStatusDropdownChange = function() {
      const status = document.getElementById('edit-user-status')?.value;
      const heroStatus = document.getElementById('edit-user-hero-status-badge');
      const reasonInput = document.getElementById('edit-user-block-reason');
      const messageInput = document.getElementById('edit-user-block-message');
      const previewText = document.getElementById('preview-user-block-text');

      if (status === 'blocked') {
        if (heroStatus) {
          heroStatus.style.background = 'rgba(239,68,68,0.15)';
          heroStatus.style.color = '#EF4444';
          heroStatus.style.borderColor = 'rgba(239,68,68,0.3)';
          heroStatus.innerHTML = '<i class="fa-solid fa-ban"></i> SUSPENDED';
        }
        if (reasonInput && !reasonInput.value.trim()) {
          reasonInput.value = 'Comment Policy Violation';
        }
        if (messageInput && !messageInput.value.trim()) {
          messageInput.value = 'Your account has been suspended by administration due to community guidelines violation on comments. If you believe this is an error, please contact MaxPlay support.';
        }
      } else {
        if (heroStatus) {
          heroStatus.style.background = 'rgba(16,185,129,0.15)';
          heroStatus.style.color = '#10B981';
          heroStatus.style.borderColor = 'rgba(16,185,129,0.3)';
          heroStatus.innerHTML = '<i class="fa-solid fa-circle-check"></i> ACTIVE';
        }
      }

      if (previewText && messageInput) {
        previewText.innerText = `"${messageInput.value || 'Your account has been suspended by administration...'}"`;
      }
    };

    window.setAccountSuspendedQuick = function(shouldSuspend) {
      const statusSelect = document.getElementById('edit-user-status');
      if (statusSelect) {
        statusSelect.value = shouldSuspend ? 'blocked' : 'active';
        handleUserStatusDropdownChange();
        if (shouldSuspend) {
          applySuspensionPreset();
        }
      }
      showToast(shouldSuspend ? 'Status set to Suspended. Click "Save All Changes" to enforce.' : 'Status set to Active. Click "Save All Changes" to unblock.');
    };

    window.openEditUserModal = async function(uid) {
      try {
        const user = (window.usersData || []).find(u => u.id === uid) || { id: uid };
        
        // 1. Set IDs and Base Hero Values
        const uidInput = document.getElementById('edit-user-uid');
        if (uidInput) uidInput.value = user.id || uid;

        const heroUid = document.getElementById('edit-user-hero-uid');
        if (heroUid) heroUid.innerText = `UID: ${user.id || uid}`;

        const heroName = document.getElementById('edit-user-hero-name');
        if (heroName) heroName.innerText = user.displayName || user.name || 'User Member';

        const heroEmail = document.getElementById('edit-user-hero-email');
        if (heroEmail) heroEmail.innerText = user.email || 'No email provided';
        
        // 2. Avatar preview
        const initial = (user.displayName || user.name || 'U').charAt(0).toUpperCase();
        const prev = document.getElementById('edit-user-avatar-preview');
        if (prev) {
          if (user.photoURL || user.avatar) {
            prev.innerHTML = `<img src="${user.photoURL || user.avatar}" style="width:100%; height:100%; object-fit:cover;" onerror="this.parentElement.innerText='${initial}'">`;
          } else {
            prev.innerText = initial;
          }
        }

        // 3. VIP badge
        const isVip = Boolean(user.isPremium || user.isVip || user.role === 'vip');
        const vipBadge = document.getElementById('edit-user-vip-badge');
        if (vipBadge) vipBadge.style.display = isVip ? 'inline-block' : 'none';

        // 4. Live status pill
        const isBlocked = user.status === 'blocked' || user.status === 'banned' || user.isBlocked === true;
        const heroStatus = document.getElementById('edit-user-hero-status-badge');
        if (heroStatus) {
          if (isBlocked) {
            heroStatus.style.background = 'rgba(239,68,68,0.15)';
            heroStatus.style.color = '#EF4444';
            heroStatus.style.borderColor = 'rgba(239,68,68,0.3)';
            heroStatus.innerHTML = '<i class="fa-solid fa-ban"></i> SUSPENDED';
          } else {
            heroStatus.style.background = 'rgba(16,185,129,0.15)';
            heroStatus.style.color = '#10B981';
            heroStatus.style.borderColor = 'rgba(16,185,129,0.3)';
            heroStatus.innerHTML = '<i class="fa-solid fa-circle-check"></i> ACTIVE';
          }
        }

        // 5. Tab 3: Suspension Form Pre-population
        const statusSelect = document.getElementById('edit-user-status');
        if (statusSelect) statusSelect.value = isBlocked ? 'blocked' : 'active';

        const reasonInput = document.getElementById('edit-user-block-reason');
        if (reasonInput) reasonInput.value = user.blockReason || (isBlocked ? 'Comment Policy Violation' : '');

        const messageInput = document.getElementById('edit-user-block-message');
        const defaultBanMsg = 'Your account has been suspended by administration due to community guidelines violation on comments. If you believe this is an error, please contact MaxPlay support.';
        if (messageInput) messageInput.value = user.blockMessage || defaultBanMsg;

        const previewText = document.getElementById('preview-user-block-text');
        if (previewText) previewText.innerText = `"${messageInput ? messageInput.value : defaultBanMsg}"`;

        // 6. Tab 4: Edit Details Pre-population
        const nameInput = document.getElementById('edit-user-name');
        if (nameInput) nameInput.value = user.displayName || user.name || '';

        const emailInput = document.getElementById('edit-user-email');
        if (emailInput) emailInput.value = user.email || '';

        const roleInput = document.getElementById('edit-user-role');
        if (roleInput) roleInput.value = user.role || 'user';

        const vipInput = document.getElementById('edit-user-vip');
        if (vipInput) vipInput.value = isVip ? 'true' : 'false';

        const genderInput = document.getElementById('edit-user-gender');
        if (genderInput) genderInput.value = user.gender || 'Male';

        const ageInput = document.getElementById('edit-user-age');
        if (ageInput) ageInput.value = user.age || 20;

        const avatarInput = document.getElementById('edit-user-avatar');
        if (avatarInput) avatarInput.value = user.photoURL || user.avatar || '';

        const bioInput = document.getElementById('edit-user-bio');
        if (bioInput) bioInput.value = user.bio || '';

        // 7. Account Metadata & KPI Card Values
        const metaCreated = document.getElementById('user-meta-created-at');
        if (metaCreated) metaCreated.innerText = user.createdAt ? new Date(user.createdAt).toLocaleString() : 'Registered recently';

        const metaLogin = document.getElementById('user-meta-last-login');
        if (metaLogin) metaLogin.innerText = user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : (user.updatedAt ? new Date(user.updatedAt).toLocaleString() : 'Active session');

        const roleTitleEl = document.getElementById('user-stat-role-title');
        if (roleTitleEl) {
          roleTitleEl.innerText = user.role === 'admin' ? 'Admin' : (user.role === 'moderator' ? 'Moderator' : (isVip ? 'VIP Member' : 'Member'));
        }

        const roleDescEl = document.getElementById('user-stat-role-desc');
        if (roleDescEl) {
          roleDescEl.innerText = isBlocked ? 'Suspended Account' : (isVip ? 'Premium VIP Access' : 'Standard Member Account');
        }

        const vipTierBadge = document.getElementById('user-stat-vip-tier-badge');
        if (vipTierBadge) {
          vipTierBadge.innerText = isVip ? '👑 VIP PRO' : (user.role === 'admin' ? '🛡️ Admin' : 'Free Member');
          vipTierBadge.style.color = isVip ? '#FBBF24' : (user.role === 'admin' ? '#A78BFA' : 'var(--text-tertiary)');
          vipTierBadge.style.background = isVip ? 'rgba(245,158,11,0.2)' : (user.role === 'admin' ? 'rgba(139,92,246,0.2)' : 'rgba(255,255,255,0.08)');
        }

        // Switch to Activity Tab by default
        switchUserModalTab('activity');

        // Open Modal
        const modalEl = document.getElementById('user-edit-modal');
        if (modalEl) {
          modalEl.style.display = 'flex';
        }

        // Load Watch History & Calculate Hours
        loadUserWatchTelemetry(uid, user);

        // Load Reports against this user
        loadUserCommentReportsHistory(uid, user);
      } catch(err) {
        console.error('Error opening user modal:', err);
        // Fallback open modal anyway
        const modalEl = document.getElementById('user-edit-modal');
        if (modalEl) modalEl.style.display = 'flex';
      }
    };

    // User Hub Watch Telemetry State
    window.currentUserWatchHistoryItems = [];
    window.currentUserWatchFilter = 'all';
    window.currentUserWatchShowAll = false;

    window.toggleUserVipQuick = function() {
      const vipSelect = document.getElementById('edit-user-vip');
      const vipBadge = document.getElementById('edit-user-vip-badge');
      const vipStatBadge = document.getElementById('user-stat-vip-tier-badge');
      const roleTitleEl = document.getElementById('user-stat-role-title');
      const roleDescEl = document.getElementById('user-stat-role-desc');
      if (vipSelect) {
        const nextVal = vipSelect.value === 'true' ? 'false' : 'true';
        vipSelect.value = nextVal;
        const isVip = nextVal === 'true';
        if (vipBadge) vipBadge.style.display = isVip ? 'inline-block' : 'none';
        if (vipStatBadge) {
          vipStatBadge.innerText = isVip ? '👑 VIP PRO' : 'Free Member';
          vipStatBadge.style.background = isVip ? 'rgba(245,158,11,0.2)' : 'rgba(255,255,255,0.08)';
          vipStatBadge.style.color = isVip ? '#FBBF24' : 'var(--text-tertiary)';
        }
        if (roleTitleEl) roleTitleEl.innerText = isVip ? 'VIP Member' : 'Member';
        if (roleDescEl) roleDescEl.innerText = isVip ? 'Premium VIP Access' : 'Standard Member Account';
        showToast(`User VIP status set to ${isVip ? 'VIP PRO' : 'Standard'}. Click "Save All Changes" to enforce.`);
      }
    };

    window.loadUserWatchTelemetry = async function(uid, user) {
      const historyListEl = document.getElementById('user-watch-history-list');
      const hoursEl = document.getElementById('user-stat-watch-hours');
      const minsEl = document.getElementById('user-stat-watch-mins');
      const countEl = document.getElementById('user-stat-streamed-count');
      const commentsCountEl = document.getElementById('user-stat-comments-count');

      try {
        let totalWatchedSeconds = 0;
        let streamedItems = [];

        // 1. Fetch from Firestore subcollection: watchHistory/{uid}/items
        try {
          const snap = await getDocs(collection(db, 'watchHistory', uid, 'items'));
          snap.forEach(docSnap => {
            const data = docSnap.data();
            const itemId = docSnap.id;
            const watchedSecs = Number(data.watchedSeconds || data.position || data.currentTime || 0);
            const durationSecs = Number(data.duration || 0);
            const percent = Number(data.percentWatched || data.progress || (durationSecs > 0 ? (watchedSecs / durationSecs) * 100 : 0));
            
            streamedItems.push({
              id: itemId,
              contentId: data.contentId || itemId,
              title: data.title || data.contentTitle || 'MaxPlay Stream',
              poster: data.thumbnailUrl || data.poster || data.backdropUrl || data.posterUrl || 'https://via.placeholder.com/160x90',
              watchedSeconds: watchedSecs,
              duration: durationSecs,
              progress: Math.min(100, Math.round(percent)),
              currentEpisode: data.currentEpisode || data.episodeNumber || 1,
              totalEpisodes: data.totalEpisodes || 1,
              type: (data.type || 'anime').toLowerCase(),
              watchedAt: data.watchedAt || data.lastWatchedAt || data.updatedAt || data.timestamp || new Date().toISOString()
            });

            totalWatchedSeconds += watchedSecs;
          });
        } catch(err) {
          console.warn('WatchHistory subcollection fetch note:', err);
        }

        // 2. Also check userProgress/{uid}/progress for any recent unmerged progress
        try {
          const pSnap = await getDocs(collection(db, 'userProgress', uid, 'progress'));
          pSnap.forEach(pDoc => {
            const pData = pDoc.data();
            const pId = pDoc.id;
            if (!streamedItems.some(i => i.id === pId || i.contentId === pId)) {
              const watchedSecs = Number(pData.currentTime || pData.watchedSeconds || 0);
              const durationSecs = Number(pData.duration || 0);
              const percent = Number(pData.percentWatched || pData.progress || (durationSecs > 0 ? (watchedSecs / durationSecs) * 100 : 0));
              streamedItems.push({
                id: pId,
                contentId: pId,
                title: pData.title || 'MaxPlay Stream',
                poster: pData.thumbnailUrl || pData.posterUrl || 'https://via.placeholder.com/160x90',
                watchedSeconds: watchedSecs,
                duration: durationSecs,
                progress: Math.min(100, Math.round(percent)),
                currentEpisode: pData.currentEpisode || 1,
                totalEpisodes: pData.totalEpisodes || 1,
                type: (pData.type || 'series').toLowerCase(),
                watchedAt: pData.lastWatchedAt || pData.updatedAt || new Date().toISOString()
              });
              totalWatchedSeconds += watchedSecs;
            }
          });
        } catch(pErr) {
          console.warn('userProgress query note:', pErr);
        }

        // Fallback to user document watchHours if recorded
        if (totalWatchedSeconds === 0 && user.watchHours) {
          totalWatchedSeconds = user.watchHours * 3600;
        }

        // Sort strictly by latest watched timestamp (newest first)
        streamedItems.sort((a, b) => new Date(b.watchedAt).getTime() - new Date(a.watchedAt).getTime());
        window.currentUserWatchHistoryItems = streamedItems;

        // Compute total hours & minutes
        const totalMinutes = Math.round(totalWatchedSeconds / 60);
        const totalHours = (totalWatchedSeconds / 3600).toFixed(1);

        if (hoursEl) hoursEl.innerText = `${totalHours} hrs`;
        if (minsEl) minsEl.innerText = `${totalMinutes} minutes total stream time`;
        if (countEl) countEl.innerText = streamedItems.length;

        // Count user comments from Firestore
        try {
          const commentsSnap = await getDocs(query(collection(db, 'comments'), where('userId', '==', uid)));
          if (commentsCountEl) commentsCountEl.innerText = commentsSnap.size;
        } catch(cErr) {
          if (commentsCountEl) commentsCountEl.innerText = user.commentsCount || '0';
        }

        // Render watch history cards
        window.renderUserWatchHistoryCards();

      } catch(e) {
        console.warn('Error loading watch telemetry:', e);
        if (historyListEl) {
          historyListEl.innerHTML = `<div style="text-align:center; padding:20px; color:#EF4444; font-size:12px;">Failed to load telemetry: ${e.message}</div>`;
        }
      }
    };

    window.filterUserWatchHistory = function(category) {
      window.currentUserWatchFilter = category;
      const pills = ['all', 'anime', 'movie', 'series', 'this_week'];
      pills.forEach(p => {
        const btn = document.getElementById(`user-watch-pill-${p}`);
        if (btn) {
          if (p === category) {
            btn.style.background = '#06B6D4';
            btn.style.color = '#000';
            btn.style.fontWeight = '800';
          } else {
            btn.style.background = 'rgba(255,255,255,0.06)';
            btn.style.color = 'var(--text-secondary)';
            btn.style.fontWeight = '600';
          }
        }
      });
      window.renderUserWatchHistoryCards();
    };

    window.toggleUserWatchShowAll = function() {
      window.currentUserWatchShowAll = !window.currentUserWatchShowAll;
      window.renderUserWatchHistoryCards();
    };

    window.renderUserWatchHistoryCards = function() {
      const historyListEl = document.getElementById('user-watch-history-list');
      const listCountEl = document.getElementById('user-watch-history-count');
      const showAllBtn = document.getElementById('user-watch-toggle-all-btn');
      if (!historyListEl) return;

      const items = window.currentUserWatchHistoryItems || [];
      const filter = window.currentUserWatchFilter || 'all';

      let filteredItems = items;
      const now = new Date().getTime();
      const sevenDaysAgo = now - (7 * 24 * 60 * 60 * 1000);

      if (filter === 'this_week') {
        filteredItems = items.filter(i => new Date(i.watchedAt).getTime() >= sevenDaysAgo);
      } else if (filter !== 'all') {
        filteredItems = items.filter(i => (i.type || '').toLowerCase().includes(filter));
      }

      if (listCountEl) {
        listCountEl.innerText = `${filteredItems.length} item${filteredItems.length === 1 ? '' : 's'} (${items.length} total)`;
      }

      if (filteredItems.length === 0) {
        historyListEl.innerHTML = `
          <div style="text-align:center; padding:35px 20px; color:var(--text-tertiary); background:rgba(0,0,0,0.2); border-radius:12px; border:1px dashed rgba(255,255,255,0.08);">
            <i class="fa-solid fa-film" style="font-size:26px; color:rgba(255,255,255,0.15); margin-bottom:8px; display:block;"></i>
            <div style="font-size:13px; font-weight:700; color:#FFF;">No stream history found</div>
            <div style="font-size:11px; margin-top:2px;">No watched titles match the "${filter.replace('_', ' ')}" filter criteria.</div>
          </div>
        `;
        if (showAllBtn) showAllBtn.style.display = 'none';
        return;
      }

      const showAll = window.currentUserWatchShowAll;
      const displayItems = showAll ? filteredItems : filteredItems.slice(0, 5);

      if (showAllBtn) {
        if (filteredItems.length > 5) {
          showAllBtn.style.display = 'flex';
          showAllBtn.innerHTML = showAll 
            ? `<i class="fa-solid fa-chevron-up"></i> Show Top 5 Only` 
            : `<i class="fa-solid fa-list"></i> View All History (${filteredItems.length} Titles)`;
        } else {
          showAllBtn.style.display = 'none';
        }
      }

      let listHtml = '';
      displayItems.forEach((item, index) => {
        const poster = item.poster || 'https://via.placeholder.com/160x90';
        const progress = Math.min(100, Math.max(0, item.progress || 0));
        const title = item.title || 'MaxPlay Stream';
        const type = (item.type || 'anime').toUpperCase();
        
        let typeBadgeBg = 'rgba(6,182,212,0.15)';
        let typeBadgeColor = '#06B6D4';
        let typeIcon = 'fa-film';
        if (type.includes('ANIME')) {
          typeBadgeBg = 'rgba(139,92,246,0.15)';
          typeBadgeColor = '#A78BFA';
          typeIcon = 'fa-wand-magic-sparkles';
        } else if (type.includes('MOVIE')) {
          typeBadgeBg = 'rgba(245,158,11,0.15)';
          typeBadgeColor = '#FBBF24';
          typeIcon = 'fa-clapperboard';
        } else if (type.includes('SERIES')) {
          typeBadgeBg = 'rgba(16,185,129,0.15)';
          typeBadgeColor = '#34D399';
          typeIcon = 'fa-tv';
        }

        // Relative time calculation
        let timeAgoStr = 'Recently';
        if (item.watchedAt) {
          const diffMs = now - new Date(item.watchedAt).getTime();
          const diffMins = Math.floor(diffMs / (1000 * 60));
          const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
          const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
          if (diffMins < 5) timeAgoStr = 'Just now';
          else if (diffMins < 60) timeAgoStr = `${diffMins}m ago`;
          else if (diffHours < 24) timeAgoStr = `${diffHours}h ago`;
          else if (diffDays === 1) timeAgoStr = 'Yesterday';
          else if (diffDays < 7) timeAgoStr = `${diffDays} days ago`;
          else timeAgoStr = new Date(item.watchedAt).toLocaleDateString();
        }

        // Minutes streamed calculation
        const streamedMinutes = item.watchedSeconds ? Math.round(item.watchedSeconds / 60) : (item.duration ? Math.round((item.duration * progress) / 6000) : 0);
        const durationMinutes = item.duration ? Math.round(item.duration / 60) : 0;
        const timeDetail = durationMinutes > 0 ? `${streamedMinutes} / ${durationMinutes} min` : `${streamedMinutes} min streamed`;

        listHtml += `
          <div style="display:flex; align-items:center; gap:14px; padding:10px 14px; background:rgba(0,0,0,0.35); border:1px solid rgba(255,255,255,0.06); border-radius:12px; transition:border-color 0.2s;" onmouseover="this.style.borderColor='rgba(6,182,212,0.4)'" onmouseout="this.style.borderColor='rgba(255,255,255,0.06)'">
            <!-- Rank / Index -->
            <div style="font-size:11px; font-weight:800; color:var(--text-tertiary); width:18px; text-align:center;">#${index + 1}</div>

            <!-- Thumbnail Image (Horizontal 16:9) -->
            <div style="position:relative; width:90px; height:54px; border-radius:8px; overflow:hidden; flex-shrink:0; background:#000; border:1px solid rgba(255,255,255,0.1);">
              <img src="${poster}" style="width:100%; height:100%; object-fit:cover;" onerror="this.src='https://via.placeholder.com/160x90'">
              <div style="position:absolute; inset:0; background:linear-gradient(to top, rgba(0,0,0,0.7), transparent); display:flex; align-items:center; justify-content:center;">
                <div style="width:22px; height:22px; border-radius:50%; background:rgba(6,182,212,0.8); display:flex; align-items:center; justify-content:center; color:#000; font-size:9px; padding-left:1px;">
                  <i class="fa-solid fa-play"></i>
                </div>
              </div>
              <div style="position:absolute; bottom:2px; right:4px; font-size:9px; font-weight:800; color:#FFF; text-shadow:0 1px 2px #000; font-family:monospace;">
                ${progress}%
              </div>
            </div>

            <!-- Title & Metadata -->
            <div style="flex:1; min-width:0;">
              <div style="display:flex; align-items:center; gap:8px; margin-bottom:4px; flex-wrap:wrap;">
                <span style="background:${typeBadgeBg}; color:${typeBadgeColor}; font-size:10px; font-weight:800; padding:1px 6px; border-radius:5px; display:inline-flex; align-items:center; gap:4px;">
                  <i class="fa-solid ${typeIcon}"></i> ${type}
                </span>
                <span style="font-size:13px; font-weight:800; color:#FFF; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:280px;">${title}</span>
              </div>

              <!-- Stream progress bar -->
              <div style="display:flex; align-items:center; gap:8px;">
                <div style="flex:1; height:5px; background:rgba(255,255,255,0.08); border-radius:3px; overflow:hidden;">
                  <div style="width:${progress}%; height:100%; background:linear-gradient(90deg, #06B6D4, #8B5CF6); border-radius:3px;"></div>
                </div>
                <span style="font-size:11px; color:var(--text-tertiary); white-space:nowrap; font-weight:600;">${timeDetail}</span>
              </div>
            </div>

            <!-- Timestamp & Tag -->
            <div style="text-align:right; flex-shrink:0;">
              <div style="font-size:11px; font-weight:700; color:#FFF;">${timeAgoStr}</div>
              <div style="font-size:10px; color:var(--text-tertiary); margin-top:2px;">Last stream</div>
            </div>
          </div>
        `;
      });

      historyListEl.innerHTML = listHtml;
    };

    window.loadUserCommentReportsHistory = async function(uid, user) {
      const reportsListEl = document.getElementById('user-reports-history-list');
      const counterEl = document.getElementById('user-reports-total-counter');
      const heroReportsBadge = document.getElementById('edit-user-hero-reports-badge');
      const tabBadge = document.getElementById('tab-user-reports-count-badge');

      try {
        let matchingReports = [];

        // Check window.reportsData first
        if (Array.isArray(window.reportsData)) {
          matchingReports = window.reportsData.filter(r => 
            r.commentAuthorId === uid || 
            r.reportedUserId === uid || 
            (r.commentAuthorName && user.displayName && r.commentAuthorName.toLowerCase() === user.displayName.toLowerCase())
          );
        }

        // Also query reports collection from Firestore
        try {
          const rSnap = await getDocs(collection(db, 'reports'));
          rSnap.forEach(d => {
            const data = { id: d.id, ...d.data() };
            if (data.commentAuthorId === uid || data.reportedUserId === uid || (data.commentAuthorName && user.displayName && data.commentAuthorName.toLowerCase() === user.displayName.toLowerCase())) {
              if (!matchingReports.some(m => m.id === data.id)) {
                matchingReports.push(data);
              }
            }
          });
        } catch(err) {
          console.warn('Reports query note:', err);
        }

        const reportCount = matchingReports.length;

        // Update Counter & Hero Badges
        if (counterEl) counterEl.innerText = `${reportCount} Report${reportCount === 1 ? '' : 's'} Filed`;
        if (tabBadge) {
          tabBadge.innerText = reportCount;
          tabBadge.style.display = reportCount > 0 ? 'inline-block' : 'none';
        }

        if (heroReportsBadge) {
          if (reportCount === 0) {
            heroReportsBadge.style.background = 'rgba(16,185,129,0.15)';
            heroReportsBadge.style.color = '#10B981';
            heroReportsBadge.style.borderColor = 'rgba(16,185,129,0.3)';
            heroReportsBadge.innerHTML = '<i class="fa-solid fa-shield-halved"></i> Clean Record (0 Reports)';
          } else if (reportCount <= 2) {
            heroReportsBadge.style.background = 'rgba(245,158,11,0.15)';
            heroReportsBadge.style.color = '#FBBF24';
            heroReportsBadge.style.borderColor = 'rgba(245,158,11,0.3)';
            heroReportsBadge.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> ${reportCount} Moderate Flag${reportCount > 1 ? 's' : ''}`;
          } else {
            heroReportsBadge.style.background = 'rgba(239,68,68,0.2)';
            heroReportsBadge.style.color = '#EF4444';
            heroReportsBadge.style.borderColor = 'rgba(239,68,68,0.4)';
            heroReportsBadge.innerHTML = `<i class="fa-solid fa-triangle-exclamation"></i> ⚠️ High Risk (${reportCount} Reports)`;
          }
        }

        // Render Reports List
        if (reportsListEl) {
          if (reportCount === 0) {
            reportsListEl.innerHTML = `
              <div style="text-align:center; padding:35px 20px; color:var(--text-tertiary);">
                <i class="fa-solid fa-circle-check" style="font-size:32px; color:#10B981; margin-bottom:10px; display:block;"></i>
                <div style="font-size:14px; font-weight:800; color:#FFF; margin-bottom:4px;">Pristine Moderation Record</div>
                <div style="font-size:12px; max-width:340px; margin:0 auto;">No users have reported any comments or content from this account. Community behavior is clean.</div>
              </div>
            `;
          } else {
            let rHtml = '';
            matchingReports.forEach((r, idx) => {
              const reason = r.reason || r.category || 'Policy Violation';
              const commentText = r.commentText || r.text || 'Flagged comment content';
              const contentTitle = r.contentTitle || r.title || 'MaxPlay Title';
              const reportedBy = r.reportedByName || r.reporterEmail || 'Community Member';
              const dateStr = r.createdAt ? new Date(r.createdAt).toLocaleDateString() : 'Recent';
              const status = r.status || 'pending';

              let statusBadge = '<span style="background:rgba(245,158,11,0.2); color:#FBBF24; font-size:10px; padding:2px 8px; border-radius:6px; font-weight:800; border:1px solid rgba(245,158,11,0.3);">PENDING</span>';
              if (status === 'resolved') {
                statusBadge = '<span style="background:rgba(16,185,129,0.2); color:#10B981; font-size:10px; padding:2px 8px; border-radius:6px; font-weight:800; border:1px solid rgba(16,185,129,0.3);">RESOLVED</span>';
              } else if (status === 'dismissed') {
                statusBadge = '<span style="background:rgba(161,161,170,0.2); color:#A1A1AA; font-size:10px; padding:2px 8px; border-radius:6px; font-weight:800;">DISMISSED</span>';
              }

              rHtml += `
                <div style="background:rgba(0,0,0,0.4); border:1px solid rgba(239,68,68,0.25); border-radius:14px; padding:14px; display:flex; flex-direction:column; gap:10px;">
                  <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:8px;">
                    <div style="display:flex; align-items:center; gap:8px;">
                      <span style="background:#EF4444; color:#FFF; font-size:10px; font-weight:800; padding:2px 8px; border-radius:6px;">
                        <i class="fa-solid fa-flag"></i> Violation #${idx + 1}
                      </span>
                      <span style="font-size:12px; font-weight:800; color:#EF4444;">${reason}</span>
                    </div>
                    <div style="display:flex; align-items:center; gap:8px;">
                      ${statusBadge}
                      <span style="font-size:11px; color:var(--text-tertiary);">${dateStr}</span>
                    </div>
                  </div>

                  <div style="background:rgba(255,255,255,0.03); border:1px solid rgba(255,255,255,0.06); border-radius:10px; padding:12px; font-size:12px; color:#E4E4E7; font-style:italic;">
                    "${commentText}"
                  </div>

                  <div style="display:flex; justify-content:space-between; align-items:center; font-size:11px; color:var(--text-tertiary); flex-wrap:wrap; gap:8px;">
                    <span><i class="fa-solid fa-film" style="color:#8B5CF6;"></i> On Title: <strong style="color:#FFF;">${contentTitle}</strong></span>
                    <span><i class="fa-solid fa-user-shield" style="color:#06B6D4;"></i> Reported by: ${reportedBy}</span>
                  </div>

                  <!-- Quick Action Bar on each violation -->
                  <div style="display:flex; justify-content:flex-end; align-items:center; gap:8px; padding-top:8px; border-top:1px solid rgba(255,255,255,0.06); flex-wrap:wrap;">
                    <button type="button" onclick="window.sendWarningToUserFromHub('${uid}', '${(user.displayName || user.name || 'User').replace(/'/g, "\\'")}', '${reason.replace(/'/g, "\\'")}')" style="background:rgba(245,158,11,0.15); border:1px solid rgba(245,158,11,0.3); color:#FBBF24; font-size:11px; font-weight:800; padding:6px 12px; border-radius:8px; cursor:pointer; display:flex; align-items:center; gap:5px;">
                      <i class="fa-solid fa-envelope"></i> Send Warning Notice
                    </button>
                    <button type="button" onclick="window.deleteReportCommentFromUserHub('${r.id}', '${r.contentId || ''}', '${r.commentId || ''}', '${r.replyId || ''}', '${uid}', '${(user.displayName || user.name || 'User').replace(/'/g, "\\'")}')" style="background:rgba(239,68,68,0.2); border:1px solid rgba(239,68,68,0.4); color:#EF4444; font-size:11px; font-weight:800; padding:6px 12px; border-radius:8px; cursor:pointer; display:flex; align-items:center; gap:5px;">
                      <i class="fa-solid fa-trash"></i> Delete Comment
                    </button>
                    ${status === 'pending' ? `
                      <button type="button" onclick="window.dismissReportFromUserHub('${r.id}')" style="background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.15); color:#FFF; font-size:11px; font-weight:700; padding:6px 12px; border-radius:8px; cursor:pointer; display:flex; align-items:center; gap:5px;">
                        <i class="fa-solid fa-xmark"></i> Dismiss
                      </button>
                    ` : ''}
                    <button type="button" onclick="window.jumpToSuspensionFromViolation('${reason.replace(/'/g, "\\'")}', '${commentText.replace(/'/g, "\\'")}')" style="background:rgba(239,68,68,0.85); border:none; color:#FFF; font-size:11px; font-weight:800; padding:6px 14px; border-radius:8px; cursor:pointer; display:flex; align-items:center; gap:5px;">
                      <i class="fa-solid fa-ban"></i> Suspend Account
                    </button>
                  </div>
                </div>
              `;
            });
            reportsListEl.innerHTML = rHtml;
          }
        }

      } catch(e) {
        console.warn('Error loading reports history:', e);
      }
    };

    window.sendWarningToUserFromHub = async function(userId, userName, violationReason) {
      const title = `⚠️ Official Warning: Comment Policy Violation`;
      const defaultBody = `Hello ${userName},\n\nYour comment has been flagged and reviewed by MaxPlay administration for violating community guidelines (${violationReason}). Please ensure all future discussions remain polite, spoiler-free, and respectful. Continued violations may result in temporary or permanent account suspension.`;
      
      const body = prompt(`Send Direct Warning to ${userName}:\n\nEdit message content:`, defaultBody);
      if (!body || !body.trim()) return;

      try {
        await addDoc(collection(db, 'messages'), {
          title,
          body: body.trim(),
          date: new Date().toLocaleDateString(),
          createdAt: new Date().toISOString(),
          targetUserId: userId,
          isUnread: true,
          type: 'warning'
        });
        showToast(`Official warning delivered to ${userName}'s notifications!`);
      } catch(err) {
        showToast('Error sending warning: ' + err.message);
      }
    };

    window.deleteReportCommentFromUserHub = async function(reportId, contentId, commentId, replyId, userId, userName) {
      if (!confirm('Permanently delete this comment from the app and resolve the report?')) return;
      try {
        if (contentId && commentId) {
          const commentRef = doc(db, 'content', contentId, 'comments', commentId);
          if (replyId) {
            const snap = await getDoc(commentRef);
            if (snap.exists()) {
              const data = snap.data();
              const replies = (data.replies || []).filter(r => r.id !== replyId);
              await updateDoc(commentRef, { replies });
            }
          } else {
            await deleteDoc(commentRef);
          }
        }

        // Also update report status if reportId exists
        if (reportId) {
          const reportRef = doc(db, 'reports', reportId);
          await updateDoc(reportRef, {
            status: 'resolved',
            adminNotes: 'Comment permanently removed by Admin from User Hub',
            resolvedAt: new Date().toISOString()
          });
        }

        showToast('Comment permanently deleted & report marked as resolved!');
        
        // Reload user reports history
        const user = (window.usersData || []).find(u => u.id === userId) || { id: userId, displayName: userName };
        loadUserCommentReportsHistory(userId, user);

      } catch(err) {
        showToast('Error deleting comment: ' + err.message);
      }
    };

    window.dismissReportFromUserHub = async function(reportId) {
      try {
        const reportRef = doc(db, 'reports', reportId);
        await updateDoc(reportRef, {
          status: 'dismissed',
          adminNotes: 'Reviewed and dismissed by Admin from User Hub',
          resolvedAt: new Date().toISOString()
        });
        showToast('Report marked as dismissed!');
        const uid = document.getElementById('edit-user-uid')?.value;
        if (uid) {
          const user = (window.usersData || []).find(u => u.id === uid) || { id: uid };
          loadUserCommentReportsHistory(uid, user);
        }
      } catch(err) {
        showToast('Error dismissing report: ' + err.message);
      }
    };

    window.jumpToSuspensionFromViolation = function(reason, commentText) {
      switchUserModalTab('suspension');
      const statusSelect = document.getElementById('edit-user-status');
      if (statusSelect) statusSelect.value = 'blocked';
      
      const reasonInput = document.getElementById('edit-user-block-reason');
      if (reasonInput) reasonInput.value = reason || 'Comment Policy Violation';

      const messageInput = document.getElementById('edit-user-block-message');
      if (messageInput) {
        messageInput.value = `Your account has been suspended by administration due to community guidelines violation on comments: "${commentText.slice(0, 100)}...". If you believe this is an error, please contact MaxPlay support.`;
      }
      handleUserStatusDropdownChange();
      showToast('Switched to Suspension tab with pre-filled violation details. Review and click "Save All Changes" to lock.');
    };

    window.closeUserEditModal = function() {
      document.getElementById('user-edit-modal').style.display = 'none';
    };

    window.updateEditUserAvatarPreview = function() {
      const url = document.getElementById('edit-user-avatar')?.value || '';
      const name = document.getElementById('edit-user-name')?.value || 'U';
      const initial = name.charAt(0).toUpperCase();
      const prev = document.getElementById('edit-user-avatar-preview');
      const heroName = document.getElementById('edit-user-hero-name');
      if (heroName) heroName.innerText = name || 'User Member';

      if (prev) {
        if (url) {
          prev.innerHTML = `<img src="${url}" style="width:100%; height:100%; object-fit:cover;" onerror="this.parentElement.innerText='${initial}'">`;
        } else {
          prev.innerText = initial;
        }
      }
    };

    window.saveUserEditChanges = async function() {
      const uid = document.getElementById('edit-user-uid')?.value;
      if (!uid) return;

      const displayName = document.getElementById('edit-user-name')?.value.trim() || 'User';
      const email = document.getElementById('edit-user-email')?.value.trim() || '';
      const role = document.getElementById('edit-user-role')?.value || 'user';
      const status = document.getElementById('edit-user-status')?.value || 'active';
      const isVip = document.getElementById('edit-user-vip')?.value === 'true';
      const gender = document.getElementById('edit-user-gender')?.value || 'Male';
      const age = Number(document.getElementById('edit-user-age')?.value) || 20;
      const photoURL = document.getElementById('edit-user-avatar')?.value.trim() || '';
      const bio = document.getElementById('edit-user-bio')?.value.trim() || '';

      const isBlocked = status === 'blocked';
      const blockReason = isBlocked ? (document.getElementById('edit-user-block-reason')?.value.trim() || 'Comment Policy Violation') : '';
      const blockMessage = isBlocked ? (document.getElementById('edit-user-block-message')?.value.trim() || 'Your account has been suspended by administration. Please contact support.') : '';

      try {
        const updatePayload = {
          displayName,
          name: displayName,
          email,
          role,
          isAdmin: role === 'admin',
          isPremium: isVip,
          isVip,
          gender,
          age,
          status: isBlocked ? 'blocked' : 'active',
          isBlocked,
          blockReason,
          blockMessage,
          photoURL,
          avatar: photoURL,
          bio,
          updatedAt: new Date().toISOString()
        };

        if (isBlocked) {
          updatePayload.blockedAt = new Date().toISOString();
        }

        await setDoc(doc(db, 'users', uid), updatePayload, { merge: true });

        showToast(isBlocked 
          ? `User account suspended! Custom notice sent to user screen.` 
          : `User account updated and active!`);

        closeUserEditModal();
        loadUsers();
      } catch(e) {
        console.error('Error saving user:', e);
        showToast('Error updating user: ' + e.message);
      }
    };

    window.toggleUserBlock = async function(uid, currentStatus) {
      const isCurrentlyBlocked = currentStatus === 'blocked' || currentStatus === 'banned';
      const newStatus = isCurrentlyBlocked ? 'active' : 'blocked';
      const actionName = newStatus === 'blocked' ? 'Suspend & Block' : 'Unblock';

      if (!confirm(`Are you sure you want to ${actionName} this user account?`)) return;

      try {
        if (newStatus === 'blocked') {
          await setDoc(doc(db, 'users', uid), {
            status: 'blocked',
            isBlocked: true,
            blockReason: 'Administrative Account Suspension',
            blockMessage: 'Your MaxPlay account has been suspended by administration. If you believe this is an error, please contact support.',
            blockedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          }, { merge: true });
          showToast('User account suspended! User will see suspension notice popup with logout button.');
        } else {
          await setDoc(doc(db, 'users', uid), {
            status: 'active',
            isBlocked: false,
            blockReason: '',
            blockMessage: '',
            updatedAt: new Date().toISOString()
          }, { merge: true });
          showToast('User account unblocked! Account access restored automatically in real time.');
        }
        loadUsers();
      } catch(e) {
        showToast('Error changing user status: ' + e.message);
      }
    };

    window.deleteUserAccount = async function(uid) {
      if (!confirm('Are you sure you want to permanently delete this user account from Firestore? This action cannot be undone.')) return;
      try {
        await deleteDoc(doc(db, 'users', uid));
        showToast('User account deleted from Firestore!');
        closeUserEditModal();
        loadUsers();
      } catch(e) {
        showToast('Error deleting user: ' + e.message);
      }
    };

    window.openAddUserModal = function() {
      document.getElementById('add-user-name').value = '';
      document.getElementById('add-user-email').value = '';
      document.getElementById('add-user-uid').value = '';
      document.getElementById('add-user-avatar').value = '';
      document.getElementById('add-user-role').value = 'user';
      document.getElementById('add-user-status').value = 'active';
      document.getElementById('user-add-modal').style.display = 'flex';
    };

    window.closeAddUserModal = function() {
      document.getElementById('user-add-modal').style.display = 'none';
    };

    window.createUserAccount = async function() {
      const name = document.getElementById('add-user-name').value.trim();
      const email = document.getElementById('add-user-email').value.trim();
      let uid = document.getElementById('add-user-uid').value.trim();
      const role = document.getElementById('add-user-role').value;
      const status = document.getElementById('add-user-status').value;
      const photoURL = document.getElementById('add-user-avatar').value.trim();

      if (!name) {
        alert('Please enter user full name.');
        return;
      }
      if (!email) {
        alert('Please enter user email address.');
        return;
      }

      if (!uid) {
        uid = 'usr_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
      }

      try {
        await setDoc(doc(db, 'users', uid), {
          id: uid,
          uid: uid,
          displayName: name,
          name: name,
          email: email,
          role: role,
          isAdmin: role === 'admin',
          status: status,
          isBlocked: status === 'blocked',
          photoURL: photoURL,
          avatar: photoURL,
          gender: 'Male',
          age: 20,
          bio: 'Registered User',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }, { merge: true });

        showToast('New user account registered!');
        closeAddUserModal();
        loadUsers();
      } catch(e) {
        console.error('Error creating user:', e);
        showToast('Error registering user: ' + e.message);
      }
    };

    // 9. ADVANCED BROADCAST ANNOUNCEMENTS STUDIO SYSTEM
    window.currentAnnouncementMode = 'media_release';
    window.currentAnnMediaCatalogFilter = 'all';

    window.setAnnouncementMode = function(mode) {
      window.currentAnnouncementMode = mode;
      ['release', 'episode', 'notice', 'promo'].forEach(m => {
        const btn = document.getElementById(`ann-mode-${m}`);
        if (btn) btn.classList.remove('active');
      });

      if (mode === 'media_release') {
        document.getElementById('ann-mode-release')?.classList.add('active');
        document.getElementById('ann-media-attach-container').style.display = 'flex';
      } else if (mode === 'episode_update') {
        document.getElementById('ann-mode-episode')?.classList.add('active');
        document.getElementById('ann-media-attach-container').style.display = 'flex';
      } else if (mode === 'notice') {
        document.getElementById('ann-mode-notice')?.classList.add('active');
      } else if (mode === 'promo') {
        document.getElementById('ann-mode-promo')?.classList.add('active');
      }

      window.updateAnnouncementLivePreview();
    };

    window.setAnnouncementTitlePrefix = function(prefix) {
      const titleInput = document.getElementById('ann-title');
      if (titleInput) {
        // If current value starts with one of our prefixes, replace it
        let current = titleInput.value.replace(/^(🎬 Premiere: |⚡ New Episode: |📢 System Update: |🎁 Special Event: )/, '');
        titleInput.value = prefix + current;
        window.updateAnnouncementLivePreview();
      }
    };

    window.setSenderPresetAvatar = function(url) {
      const avatarInput = document.getElementById('ann-sender-avatar');
      if (avatarInput) {
        avatarInput.value = url;
        window.updateAnnouncementLivePreview();
      }
    };

    window.openAnnouncementMediaSelector = function() {
      const modal = document.getElementById('ann-media-selector-modal');
      if (modal) {
        modal.style.display = 'flex';
        window.renderAnnouncementMediaSelectorGrid();
      }
    };

    window.closeAnnouncementMediaSelector = function() {
      const modal = document.getElementById('ann-media-selector-modal');
      if (modal) modal.style.display = 'none';
    };

    window.filterAnnouncementMediaCatalog = function(type) {
      window.currentAnnMediaCatalogFilter = type;
      ['all', 'movie', 'series', 'anime'].forEach(t => {
        const btn = document.getElementById(`ann-filter-${t}`);
        if (btn) {
          if (t === type) {
            btn.className = 'btn-secondary active';
          } else {
            btn.className = 'btn-secondary';
          }
        }
      });
      window.renderAnnouncementMediaSelectorGrid();
    };

    window.renderAnnouncementMediaSelectorGrid = function() {
      const grid = document.getElementById('ann-media-catalog-grid');
      if (!grid) return;

      const items = window.cachedContentDocs || [];
      const search = (document.getElementById('ann-media-search')?.value || '').toLowerCase().trim();
      const filter = window.currentAnnMediaCatalogFilter;

      let filtered = items.filter(docItem => {
        const d = docItem.data;
        if (!d) return false;
        
        // Type filter
        if (filter !== 'all') {
          const itemType = (d.type || 'movie').toLowerCase();
          if (filter === 'movie' && itemType !== 'movie') return false;
          if (filter === 'series' && itemType !== 'series' && itemType !== 'tv_show') return false;
          if (filter === 'anime' && itemType !== 'anime') return false;
        }

        // Search filter
        if (search) {
          const title = (d.title || '').toLowerCase();
          const genres = Array.isArray(d.genres) ? d.genres.join(' ').toLowerCase() : (d.genres || '').toLowerCase();
          if (!title.includes(search) && !genres.includes(search) && !docItem.id.toLowerCase().includes(search)) {
            return false;
          }
        }
        return true;
      });

      if (filtered.length === 0) {
        grid.innerHTML = '<div style="grid-column:1/-1; text-align:center; padding:40px 20px; color:var(--text-tertiary); font-size:13px;"><i class="fa-solid fa-ghost" style="font-size:24px; margin-bottom:8px; display:block;"></i>No media found matching filter.</div>';
        return;
      }

      let html = '';
      filtered.forEach(docItem => {
        const d = docItem.data;
        const id = docItem.id;
        const poster = d.posterUrl || 'https://via.placeholder.com/150x220';
        const type = (d.type || 'movie').toUpperCase();
        const rating = d.rating || '9.5';
        const year = d.year || '2025';

        html += `
          <div onclick="selectAnnouncementMedia('${id}')" style="cursor:pointer; background:var(--bg-tertiary); border:1px solid rgba(255,255,255,0.08); border-radius:10px; overflow:hidden; display:flex; flex-direction:column; transition:transform 0.15s, border-color 0.15s; position:relative;" onmouseover="this.style.borderColor='var(--accent-cyan)'; this.style.transform='translateY(-2px)'" onmouseout="this.style.borderColor='rgba(255,255,255,0.08)'; this.style.transform='none'">
            <div style="position:relative; width:100%; height:160px; background:#000;">
              <img src="${poster}" onerror="this.src='https://via.placeholder.com/150x220'" style="width:100%; height:100%; object-fit:cover;">
              <span style="position:absolute; top:6px; left:6px; background:rgba(0,0,0,0.8); color:#FFF; font-size:8px; font-weight:800; padding:2px 6px; border-radius:4px; text-transform:uppercase;">${type}</span>
              <span style="position:absolute; top:6px; right:6px; background:rgba(0,0,0,0.8); color:#FBBF24; font-size:9px; font-weight:800; padding:2px 6px; border-radius:4px;"><i class="fa-solid fa-star"></i> ${rating}</span>
            </div>
            <div style="padding:8px 10px; display:flex; flex-direction:column; gap:2px;">
              <div style="font-size:12px; font-weight:800; color:#FFF; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${d.title}">${d.title || 'Untitled'}</div>
              <div style="font-size:10px; color:var(--text-tertiary); display:flex; justify-content:space-between;">
                <span>${year}</span>
                <span style="color:#06B6D4; font-weight:700;"><i class="fa-solid fa-plus"></i> Select</span>
              </div>
            </div>
          </div>
        `;
      });

      grid.innerHTML = html;
    };

    window.selectAnnouncementMedia = function(id) {
      const docItem = (window.cachedContentDocs || []).find(d => d.id === id);
      if (!docItem) return;
      const item = docItem.data;

      document.getElementById('ann-attached-id').value = id;
      document.getElementById('ann-attached-title').value = item.title || '';
      document.getElementById('ann-attached-type').value = item.type || 'movie';
      document.getElementById('ann-attached-poster').value = item.posterUrl || '';
      document.getElementById('ann-attached-backdrop').value = item.backdropUrl || item.posterUrl || '';
      document.getElementById('ann-attached-rating').value = item.rating || 9.5;
      document.getElementById('ann-attached-year').value = item.year || 2025;

      // Extract languages
      let langs = (item.availableLanguages && item.availableLanguages.length > 0) ? item.availableLanguages.join(', ') : 'Hindi, English';
      document.getElementById('ann-attached-languages').value = langs;

      // Quality tag
      let quality = item.rating >= 9.0 ? '4K UHD' : '1080p FHD';
      document.getElementById('ann-attached-quality').value = quality;

      // Display in preview box
      const box = document.getElementById('ann-selected-media-box');
      const optBox = document.getElementById('ann-media-options-box');
      if (box) {
        box.style.display = 'flex';
        document.getElementById('ann-media-preview-poster').src = item.posterUrl || '';
        document.getElementById('ann-media-preview-title').innerText = item.title || 'Selected Title';
        document.getElementById('ann-media-preview-type').innerText = (item.type || 'Movie').toUpperCase();
        document.getElementById('ann-media-preview-rating').innerHTML = `<i class="fa-solid fa-star"></i> ${item.rating || 9.5}`;
        document.getElementById('ann-media-preview-year').innerText = item.year || 2025;
      }
      if (optBox) {
        optBox.style.display = 'grid';
      }

      // Auto-populate Title if empty
      const titleInput = document.getElementById('ann-title');
      if (titleInput && (!titleInput.value || titleInput.value.startsWith('🎬 Premiere:') || titleInput.value.startsWith('⚡ New Episode:'))) {
        if (window.currentAnnouncementMode === 'episode_update') {
          titleInput.value = `⚡ New Episode: ${item.title} is now streaming!`;
        } else {
          titleInput.value = `🎬 Premiere: ${item.title} is now available in 4K!`;
        }
      }

      // Auto-populate Body if empty
      const bodyInput = document.getElementById('ann-body');
      if (bodyInput && !bodyInput.value) {
        bodyInput.value = `Experience "${item.title}" with crisp ultra high-definition video, multi-language dubbing (${langs}), and high-speed streaming servers on MaxPlay.`;
      }

      window.closeAnnouncementMediaSelector();
      window.updateAnnouncementLivePreview();
      showToast(`Attached "${item.title}" to announcement!`);
    };

    window.removeAnnouncementMedia = function() {
      document.getElementById('ann-attached-id').value = '';
      document.getElementById('ann-attached-title').value = '';
      document.getElementById('ann-attached-type').value = '';
      document.getElementById('ann-attached-poster').value = '';
      document.getElementById('ann-attached-backdrop').value = '';
      document.getElementById('ann-attached-rating').value = '';
      document.getElementById('ann-attached-year').value = '';

      const box = document.getElementById('ann-selected-media-box');
      const optBox = document.getElementById('ann-media-options-box');
      if (box) box.style.display = 'none';
      if (optBox) optBox.style.display = 'none';

      window.updateAnnouncementLivePreview();
      showToast('Removed attached media.');
    };

    window.updateAnnouncementLivePreview = function() {
      // 1. Sender Info
      const sName = document.getElementById('ann-sender-name')?.value || 'MaxPlay Official';
      const sHandle = document.getElementById('ann-sender-handle')?.value || '@MaxPlayAdmin';
      const sAvatar = document.getElementById('ann-sender-avatar')?.value || '';
      const sVerified = document.getElementById('ann-sender-verified')?.checked;

      const pName = document.getElementById('mockup-sender-name');
      const pHandle = document.getElementById('mockup-sender-handle');
      const pVerified = document.getElementById('mockup-sender-verified');
      const pInitial = document.getElementById('mockup-sender-avatar-initial');
      const pAvatarImg = document.getElementById('mockup-sender-avatar-img');

      if (pName) pName.innerText = sName;
      if (pHandle) pHandle.innerText = sHandle.startsWith('@') ? sHandle : ('@' + sHandle);
      if (pVerified) pVerified.style.display = sVerified ? 'inline-block' : 'none';

      if (sAvatar && pAvatarImg && pInitial) {
        pAvatarImg.src = sAvatar;
        pAvatarImg.style.display = 'block';
        pInitial.style.display = 'none';
      } else if (pAvatarImg && pInitial) {
        pAvatarImg.style.display = 'none';
        pInitial.innerText = sName.charAt(0).toUpperCase() || 'M';
        pInitial.style.display = 'block';
      }

      // 2. Title & Body
      const title = document.getElementById('ann-title')?.value || 'Solo Leveling Season 2 Finale is Now Streaming!';
      const body = document.getElementById('ann-body')?.value || 'Episode 12 is available in 4K Ultra HD with Hindi Audio Dubbed and Multi-Audio streaming servers.';
      const priority = document.getElementById('ann-priority')?.value || 'normal';

      const pTitle = document.getElementById('mockup-ann-title');
      const pBody = document.getElementById('mockup-ann-body');
      const pUrgent = document.getElementById('mockup-urgent-pill');
      const pIcon = document.getElementById('mockup-ann-icon');

      if (pTitle) {
        let iconClass = 'fa-solid fa-bullhorn';
        if (window.currentAnnouncementMode === 'media_release') iconClass = 'fa-solid fa-film';
        else if (window.currentAnnouncementMode === 'episode_update') iconClass = 'fa-solid fa-tv';
        else if (window.currentAnnouncementMode === 'notice') iconClass = 'fa-solid fa-triangle-exclamation';
        else if (window.currentAnnouncementMode === 'promo') iconClass = 'fa-solid fa-sparkles';
        
        if (pIcon) pIcon.className = iconClass;
        pTitle.innerHTML = `<i class="${iconClass}" style="color:#06B6D4;"></i> <span>${title}</span>`;
      }
      if (pBody) pBody.innerText = body;

      if (pUrgent) {
        if (priority === 'urgent') {
          pUrgent.style.display = 'inline-block';
          pUrgent.style.background = 'rgba(239,68,68,0.2)';
          pUrgent.style.color = '#EF4444';
          pUrgent.innerText = 'URGENT';
        } else if (priority === 'important') {
          pUrgent.style.display = 'inline-block';
          pUrgent.style.background = 'rgba(245,158,11,0.2)';
          pUrgent.style.color = '#FBBF24';
          pUrgent.innerText = 'IMPORTANT';
        } else {
          pUrgent.style.display = 'none';
        }
      }

      // 3. Attached Media Preview
      const attachedId = document.getElementById('ann-attached-id')?.value;
      const mediaCard = document.getElementById('mockup-attached-media-card');
      if (attachedId && mediaCard) {
        mediaCard.style.display = 'flex';
        const mTitle = document.getElementById('ann-attached-title')?.value || 'Selected Title';
        const mPoster = document.getElementById('ann-attached-poster')?.value || '';
        const mBackdrop = document.getElementById('ann-attached-backdrop')?.value || mPoster;
        const mType = document.getElementById('ann-attached-type')?.value || 'movie';
        const mRating = document.getElementById('ann-attached-rating')?.value || '9.5';
        const mQuality = document.getElementById('ann-attached-quality')?.value || '4K UHD';
        const actLabel = document.getElementById('ann-action-label')?.value || 'Watch Now';
        const epInfo = document.getElementById('ann-episode-info')?.value || '';

        const pThumb = document.getElementById('mockup-media-thumb');
        const pMTitle = document.getElementById('mockup-media-title');
        const pMType = document.getElementById('mockup-media-type-tag');
        const pMRating = document.getElementById('mockup-media-rating-tag');
        const pMQuality = document.getElementById('mockup-media-quality');
        const pMEpTag = document.getElementById('mockup-media-ep-tag');
        const pActBtn = document.getElementById('mockup-action-btn-text');

        if (pThumb) pThumb.src = mBackdrop || mPoster;
        if (pMTitle) pMTitle.innerText = mTitle;
        if (pMType) pMType.innerText = mType.toUpperCase();
        if (pMRating) pMRating.innerHTML = `<i class="fa-solid fa-star"></i> ${mRating}`;
        if (pMQuality) pMQuality.innerText = mQuality;
        if (pActBtn) pActBtn.innerText = actLabel;

        if (pMEpTag) {
          if (epInfo) {
            pMEpTag.innerText = epInfo;
            pMEpTag.style.display = 'inline-block';
          } else {
            pMEpTag.style.display = 'none';
          }
        }
      } else if (mediaCard) {
        mediaCard.style.display = 'none';
      }
    };

    window.sendBroadcast = async function() {
      const title = document.getElementById('ann-title')?.value.trim();
      const body = document.getElementById('ann-body')?.value.trim();
      if (!title) {
        showToast('Please enter an announcement title');
        return;
      }
      if (!body) {
        showToast('Please enter message content');
        return;
      }

      const senderName = document.getElementById('ann-sender-name')?.value.trim() || 'MaxPlay Official';
      const senderHandle = document.getElementById('ann-sender-handle')?.value.trim() || '@MaxPlayAdmin';
      const senderAvatar = document.getElementById('ann-sender-avatar')?.value.trim() || '';
      const senderVerified = document.getElementById('ann-sender-verified')?.checked !== false;

      const priority = document.getElementById('ann-priority')?.value || 'normal';
      const bannerUrl = document.getElementById('ann-banner-url')?.value.trim() || '';

      const attachedId = document.getElementById('ann-attached-id')?.value;
      let attachedContent = null;

      if (attachedId) {
        const langsStr = document.getElementById('ann-attached-languages')?.value || 'Hindi, English';
        const langsArr = langsStr.split(',').map(s => s.trim()).filter(Boolean);
        const epInfo = document.getElementById('ann-episode-info')?.value.trim() || '';

        attachedContent = {
          id: attachedId,
          title: document.getElementById('ann-attached-title')?.value || 'Untitled',
          type: document.getElementById('ann-attached-type')?.value || 'movie',
          posterUrl: document.getElementById('ann-attached-poster')?.value || '',
          backdropUrl: document.getElementById('ann-attached-backdrop')?.value || '',
          rating: parseFloat(document.getElementById('ann-attached-rating')?.value) || 9.5,
          year: parseInt(document.getElementById('ann-attached-year')?.value, 10) || 2025,
          quality: document.getElementById('ann-attached-quality')?.value || '4K UHD',
          availableLanguages: langsArr,
          actionLabel: document.getElementById('ann-action-label')?.value || 'Watch Now',
          episodeInfo: epInfo
        };
      }

      const messageDoc = {
        title,
        body,
        type: window.currentAnnouncementMode || 'media_release',
        priority,
        sender: {
          name: senderName,
          handle: senderHandle.startsWith('@') ? senderHandle : ('@' + senderHandle),
          avatar: senderAvatar,
          verified: senderVerified
        },
        attachedContent: attachedContent || null,
        bannerUrl: bannerUrl || null,
        date: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
        createdAt: new Date().toISOString(),
        isUnread: true
      };

      try {
        await addDoc(collection(db, 'messages'), messageDoc);
        showToast('🚀 Broadcast announcement successfully sent to all user inboxes!');
        
        // Reset composer inputs
        document.getElementById('ann-title').value = '';
        document.getElementById('ann-body').value = '';
        document.getElementById('ann-banner-url').value = '';
        window.removeAnnouncementMedia();
        window.loadMessagesHistory();
      } catch(e) { 
        console.error('Error sending broadcast:', e);
        showToast('Error sending broadcast: ' + e.message); 
      }
    };

    window.loadMessagesHistory = async function() {
      const tbody = document.getElementById('messages-history-body');
      if (!tbody) return;
      try {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:20px; color:var(--text-tertiary);"><i class="fa-solid fa-spinner fa-spin"></i> Fetching announcements...</td></tr>';
        
        const snap = await getDocs(collection(db, 'messages'));
        if (snap.empty) {
          tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:30px; color:var(--text-tertiary);">No announcements sent yet. Compose your first message above!</td></tr>';
          return;
        }

        let docsList = [];
        snap.forEach(d => {
          docsList.push({ id: d.id, data: d.data() });
        });

        // Sort latest first
        docsList.sort((a, b) => new Date(b.data.createdAt || 0) - new Date(a.data.createdAt || 0));

        let h = '';
        docsList.forEach(item => {
          const m = item.data;
          const id = item.id;
          
          // Sender
          const sName = m.sender?.name || 'MaxPlay Official';
          const sHandle = m.sender?.handle || '@MaxPlayAdmin';
          const sVerified = m.sender?.verified !== false;
          const sAvatar = m.sender?.avatar || '';

          // Mode / Type Badge
          let typeBadge = '<span style="background:rgba(6,182,212,0.15); color:#22D3EE; font-size:10px; font-weight:800; padding:2px 8px; border-radius:10px; text-transform:uppercase;">Media Release</span>';
          if (m.type === 'episode_update') {
            typeBadge = '<span style="background:rgba(139,92,246,0.15); color:#A78BFA; font-size:10px; font-weight:800; padding:2px 8px; border-radius:10px; text-transform:uppercase;">Episode</span>';
          } else if (m.type === 'notice') {
            typeBadge = '<span style="background:rgba(245,158,11,0.15); color:#FBBF24; font-size:10px; font-weight:800; padding:2px 8px; border-radius:10px; text-transform:uppercase;">Notice</span>';
          } else if (m.type === 'promo') {
            typeBadge = '<span style="background:rgba(244,114,182,0.15); color:#F472B6; font-size:10px; font-weight:800; padding:2px 8px; border-radius:10px; text-transform:uppercase;">Promo</span>';
          }

          // Priority badge
          let prioTag = '';
          if (m.priority === 'urgent') {
            prioTag = '<span style="background:rgba(239,68,68,0.2); color:#EF4444; font-size:9px; font-weight:900; padding:2px 6px; border-radius:4px; margin-left:6px;">URGENT</span>';
          } else if (m.priority === 'important') {
            prioTag = '<span style="background:rgba(245,158,11,0.2); color:#FBBF24; font-size:9px; font-weight:900; padding:2px 6px; border-radius:4px; margin-left:6px;">IMPORTANT</span>';
          }

          // Attached Content Visual
          let attachedHTML = '<span style="color:var(--text-tertiary); font-size:11px;">Standard Message</span>';
          if (m.attachedContent) {
            const ac = m.attachedContent;
            attachedHTML = `
              <div style="display:flex; align-items:center; gap:8px; background:rgba(0,0,0,0.3); padding:4px 8px; border-radius:8px; border:1px solid rgba(255,255,255,0.06);">
                <img src="${ac.backdropUrl || ac.posterUrl}" onerror="this.src='https://via.placeholder.com/80x50'" style="width:44px; height:30px; border-radius:4px; object-fit:cover;">
                <div style="min-width:0;">
                  <div style="font-size:11px; font-weight:800; color:#FFF; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${ac.title}">${ac.title}</div>
                  <div style="font-size:9px; color:#22D3EE; font-weight:700;">${ac.quality || '4K UHD'} · ${ac.actionLabel || 'Watch'}</div>
                </div>
              </div>
            `;
          }

          h += `
            <tr>
              <td>
                <div style="display:flex; align-items:center; gap:10px;">
                  <div style="width:32px; height:32px; border-radius:50%; background:linear-gradient(135deg, #06B6D4, #8B5CF6); display:flex; align-items:center; justify-content:center; font-weight:800; font-size:12px; color:#FFF; overflow:hidden; flex-shrink:0;">
                    ${sAvatar ? `<img src="${sAvatar}" style="width:100%; height:100%; object-fit:cover;">` : (sName.charAt(0).toUpperCase())}
                  </div>
                  <div>
                    <div style="font-weight:800; font-size:12px; color:#FFF; display:flex; align-items:center; gap:4px;">
                      ${sName} ${sVerified ? '<i class="fa-solid fa-circle-check" style="color:#06B6D4; font-size:10px;"></i>' : ''}
                    </div>
                    <div style="font-size:10px; font-family:monospace; color:#06B6D4;">${sHandle}</div>
                  </div>
                </div>
              </td>
              <td>
                <div style="display:flex; flex-direction:column; gap:4px;">
                  <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                    ${typeBadge}
                    ${prioTag}
                    <span style="font-weight:800; font-size:13px; color:#FFF;">${m.title || 'Notification'}</span>
                  </div>
                  <div style="color:var(--text-secondary); font-size:11px; line-height:1.4; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">
                    ${m.body || ''}
                  </div>
                </div>
              </td>
              <td>${attachedHTML}</td>
              <td>
                <div style="font-size:11px; font-weight:700; color:#FFF;">${m.date || 'Today'}</div>
                <div style="font-size:10px; color:var(--text-tertiary);">${m.timestamp || ''}</div>
              </td>
              <td style="text-align:right;">
                <div style="display:flex; justify-content:flex-end; gap:6px;">
                  <button class="btn-danger" style="height:30px; width:30px; padding:0; font-size:11px; border-radius:6px;" onclick="deleteMessage('${id}')" title="Delete Announcement">
                    <i class="fa-solid fa-trash"></i>
                  </button>
                </div>
              </td>
            </tr>
          `;
        });
        tbody.innerHTML = h;
      } catch(e) {
        console.error('Error loading messages:', e);
      }
    };

    window.deleteMessage = async function(mId) {
      if (!confirm('Are you sure you want to delete this announcement? It will disappear from all user inboxes.')) return;
      try {
        await deleteDoc(doc(db, 'messages', mId));
        showToast('Announcement deleted.');
        loadMessagesHistory();
      } catch(e) { 
        showToast('Error deleting announcement: ' + e.message); 
      }
    };

    // 10. GENERAL SETTINGS & MAINTENANCE SYSTEM
    window.loadGeneralSettings = async function() {
      try {
        const snap = await getDoc(doc(db, 'settings', 'general'));
        if (snap.exists()) {
          const s = snap.data();
          const isMaint = !!s.maintenanceMode;
          const toggle = document.getElementById('maintenance-toggle');
          if (toggle) toggle.checked = isMaint;

          const statusEl = document.getElementById('maintenance-status');
          if (statusEl) {
            statusEl.innerText = isMaint ? 'Active (App Locked)' : 'Disabled (App Online)';
            statusEl.style.color = isMaint ? 'var(--accent-red)' : 'var(--accent-green)';
          }

          const dashMaint = document.getElementById('dash-maintenance-text');
          if (dashMaint) {
            dashMaint.innerText = isMaint ? 'ENABLED (Locked)' : 'Disabled (Live)';
            dashMaint.style.color = isMaint ? 'var(--accent-red)' : '#34D399';
          }

          if (s.maintenanceMessage) {
            const msgEl = document.getElementById('setting-maintenance-msg');
            if (msgEl) msgEl.value = s.maintenanceMessage;
          }

          if (s.appVersion) {
            const vEl = document.getElementById('setting-app-version');
            if (vEl) vEl.value = s.appVersion;
            const dashV = document.getElementById('dash-version-text');
            if (dashV) dashV.innerText = `${s.appVersion} Production`;
          }

          if (s.minVersion) {
            const mvEl = document.getElementById('setting-min-version');
            if (mvEl) mvEl.value = s.minVersion;
          }

          if (s.downloadUrl) {
            const dlEl = document.getElementById('setting-download-url');
            if (dlEl) dlEl.value = s.downloadUrl;
          }
          if (s.appLanguages) {
            const alEl = document.getElementById('setting-app-languages');
            if (alEl) alEl.value = Array.isArray(s.appLanguages) ? s.appLanguages.join(', ') : s.appLanguages;
          }

          if (s.appName) {
            const anEl = document.getElementById('setting-app-name');
            if (anEl) anEl.value = s.appName;
          }

          if (s.supportEmail) {
            const seEl = document.getElementById('setting-support-email');
            if (seEl) seEl.value = s.supportEmail;
          }

          if (s.telegram) {
            const tgEl = document.getElementById('setting-telegram');
            if (tgEl) tgEl.value = s.telegram;
          }

          if (s.discord) {
            const dcEl = document.getElementById('setting-discord');
            if (dcEl) dcEl.value = s.discord;
          }
        }
      } catch(e) {
        console.error('Error loading general settings:', e);
      }
    };

    window.toggleMaintenanceMode = async function(isActive) {
      try {
        await setDoc(doc(db, 'settings', 'general'), {
          maintenanceMode: isActive,
          updatedAt: new Date().toISOString()
        }, { merge: true });

        const el = document.getElementById('maintenance-status');
        if (el) {
          el.innerText = isActive ? 'Active (App Locked)' : 'Disabled (App Online)';
          el.style.color = isActive ? 'var(--accent-red)' : 'var(--accent-green)';
        }

        const dashMaint = document.getElementById('dash-maintenance-text');
        if (dashMaint) {
          dashMaint.innerText = isActive ? 'ENABLED (Locked)' : 'Disabled (Live)';
          dashMaint.style.color = isActive ? 'var(--accent-red)' : '#34D399';
        }

        showToast(isActive ? '⚠️ Maintenance Mode ENABLED! Client apps locked.' : '✅ Maintenance Mode DISABLED. Client apps live.');
      } catch(e) { 
        showToast('Error updating maintenance mode: ' + e.message); 
      }
    };

    window.saveGeneralSettings = async function() {
      const appName = document.getElementById('setting-app-name')?.value || 'MaxPlay';
      const supportEmail = document.getElementById('setting-support-email')?.value || 'support@maxplay.app';
      const maintenanceMessage = document.getElementById('setting-maintenance-msg')?.value || '';
      const appVersion = document.getElementById('setting-app-version')?.value || 'v2.5.0';
      const minVersion = document.getElementById('setting-min-version')?.value || 'v2.0.0';
      const downloadUrl = document.getElementById('setting-download-url')?.value || '';
      const telegram = document.getElementById('setting-telegram')?.value || '';
      const discord = document.getElementById('setting-discord')?.value || '';
      const isMaint = !!document.getElementById('maintenance-toggle')?.checked;
      
      const appLanguagesRaw = document.getElementById('setting-app-languages')?.value || 'English, Hindi';
      const appLanguages = appLanguagesRaw.split(',').map(l => l.trim()).filter(l => l);

      try {
        await setDoc(doc(db, 'settings', 'general'), {
          appName,
          supportEmail,
          maintenanceMode: isMaint,
          maintenanceMessage,
          appVersion,
          minVersion,
          downloadUrl,
          appLanguages,
          telegram,
          discord,
          updatedAt: new Date().toISOString()
        }, { merge: true });

        showToast('All General Settings saved successfully to Firestore!');
      } catch(e) { 
        showToast('Error saving settings: ' + e.message); 
      }
    };

    window.exportDatabaseBackup = function() {
      try {
        const backupData = {
          exportDate: new Date().toISOString(),
          content: window.cachedContentDocs || [],
          categories: window.categoriesData || [],
          homeRows: window.homeRowsData || [],
          heroBanners: window.heroBannersData || [],
          usersCount: (window.usersData || []).length
        };
        const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(backupData, null, 2));
        const downloadAnchor = document.createElement('a');
        downloadAnchor.setAttribute("href", dataStr);
        downloadAnchor.setAttribute("download", `maxplay_backup_${Date.now()}.json`);
        document.body.appendChild(downloadAnchor);
        downloadAnchor.click();
        downloadAnchor.remove();
        showToast('Database JSON backup downloaded successfully!');
      } catch(e) {
        showToast('Error exporting backup: ' + e.message);
      }
    };

    // 12. APP INFORMATION & LEGAL CONTENT VISUAL STUDIO
    window.currentLegalTab = 'about';

    window.switchLegalStudioTab = function(tab) {
      window.currentLegalTab = tab;
      
      // Update top header tab buttons
      const tabs = ['about', 'privacy', 'agreement'];
      tabs.forEach(t => {
        const btn = document.getElementById(`legal-tab-${t}-btn`);
        const form = document.getElementById(`legal-form-${t}`);
        const simPill = document.getElementById(`sim-pill-${t}`);
        
        if (t === tab) {
          if (btn) {
            btn.style.background = '#8B5CF6';
            btn.style.color = '#FFF';
            const icon = btn.querySelector('i');
            if (icon) icon.style.color = '#FFF';
          }
          if (form) form.style.display = 'flex';
          if (simPill) {
            simPill.style.background = '#8B5CF6';
            simPill.style.color = '#FFF';
          }
        } else {
          if (btn) {
            btn.style.background = 'transparent';
            btn.style.color = 'var(--text-secondary)';
            const icon = btn.querySelector('i');
            if (icon) {
              if (t === 'about') icon.style.color = 'var(--accent-cyan)';
              if (t === 'privacy') icon.style.color = 'var(--accent-purple)';
              if (t === 'agreement') icon.style.color = 'var(--accent-amber)';
            }
          }
          if (form) form.style.display = 'none';
          if (simPill) {
            simPill.style.background = 'transparent';
            simPill.style.color = '#A1A1AA';
          }
        }
      });

      // Update simulator title
      const simTitle = document.getElementById('sim-header-title');
      if (simTitle) {
        if (tab === 'about') simTitle.innerText = 'About MaxPlay';
        if (tab === 'privacy') simTitle.innerText = 'Privacy Policy';
        if (tab === 'agreement') simTitle.innerText = 'User Agreement';
      }

      window.renderSimulatorCanvas();
    };

    window.onVisualFormChange = function() {
      // 1. Generate ABOUT US Markdown
      const aTitle = document.getElementById('v-about-title')?.value || 'MAXPLAY STREAMING';
      const aBadge = document.getElementById('v-about-badge')?.value || 'POWERED BY SAN TEAM';
      const aLead = document.getElementById('v-about-lead')?.value || '';
      const aMisTitle = document.getElementById('v-about-mission-title')?.value || 'Our Mission & Purpose';
      const aMisText = document.getElementById('v-about-mission-text')?.value || '';
      const aF1T = document.getElementById('v-about-f1-title')?.value || 'Seamless Chunk Playback';
      const aF1D = document.getElementById('v-about-f1-desc')?.value || '';
      const aF2T = document.getElementById('v-about-f2-title')?.value || 'Active Global Community';
      const aF2D = document.getElementById('v-about-f2-desc')?.value || '';
      const aF3T = document.getElementById('v-about-f3-title')?.value || 'Family Safe & Private';
      const aF3D = document.getElementById('v-about-f3-desc')?.value || '';
      const aF4T = document.getElementById('v-about-f4-title')?.value || 'Curated by SAN TEAM';
      const aF4D = document.getElementById('v-about-f4-desc')?.value || '';
      const aTeamName = document.getElementById('v-about-team-name')?.value || 'SAN TEAM Operations';
      const aTeamStatus = document.getElementById('v-about-team-status')?.value || 'Operational 24/7';

      const aboutMarkdown = `# ${aTitle}
${aBadge}

${aLead}

## ${aMisTitle}
${aMisText}

## Key Platform Features
- **${aF1T}**: ${aF1D}
- **${aF2T}**: ${aF2D}
- **${aF3T}**: ${aF3D}
- **${aF4T}**: ${aF4D}

> ${aTeamName} is actively maintaining and engineering MaxPlay (${aTeamStatus}).`;

      const aboutEl = document.getElementById('legal-about');
      if (aboutEl) aboutEl.value = aboutMarkdown;

      // 2. Generate PRIVACY Markdown
      const pTitle = document.getElementById('v-priv-title')?.value || 'MaxPlay Privacy Statement';
      const pDate = document.getElementById('v-priv-date')?.value || 'August 2026';
      const pIntro = document.getElementById('v-priv-intro')?.value || '';
      const pS1T = document.getElementById('v-priv-s1-title')?.value || '1. What Information We Collect';
      const pS1Items = document.getElementById('v-priv-s1-items')?.value || '';
      const pS2T = document.getElementById('v-priv-s2-title')?.value || '2. How We Use Your Data';
      const pS2Desc = document.getElementById('v-priv-s2-desc')?.value || '';
      const pS3T = document.getElementById('v-priv-s3-title')?.value || '3. Data Storage & Protection';
      const pS3Desc = document.getElementById('v-priv-s3-desc')?.value || '';
      const pCallout = document.getElementById('v-priv-callout')?.value || '';

      const privacyMarkdown = `# ${pTitle}
Effective Date: ${pDate}

${pIntro}

## ${pS1T}
${pS1Items}

## ${pS2T}
${pS2Desc}

## ${pS3T}
${pS3Desc}

> ${pCallout}`;

      const privEl = document.getElementById('legal-privacy');
      if (privEl) privEl.value = privacyMarkdown;

      // 3. Generate AGREEMENT Markdown
      const agrTitle = document.getElementById('v-agr-title')?.value || 'MaxPlay User Agreement & Terms';
      const agrSub = document.getElementById('v-agr-sub')?.value || 'Terms of Service — SAN TEAM Network';
      const agrIntro = document.getElementById('v-agr-intro')?.value || '';
      const agrA1T = document.getElementById('v-agr-a1-title')?.value || '1. Acceptance & Eligibility';
      const agrA1D = document.getElementById('v-agr-a1-desc')?.value || '';
      const agrA2T = document.getElementById('v-agr-a2-title')?.value || '2. Personal & Non-Commercial Use';
      const agrA2D = document.getElementById('v-agr-a2-desc')?.value || '';
      const agrA3T = document.getElementById('v-agr-a3-title')?.value || '3. Community Guidelines & Comment Rules';
      const agrA3R = document.getElementById('v-agr-a3-rules')?.value || '';
      const agrA4T = document.getElementById('v-agr-a4-title')?.value || '4. Account Moderation & Suspensions';
      const agrA4D = document.getElementById('v-agr-a4-desc')?.value || '';

      const agreementMarkdown = `# ${agrTitle}
${agrSub}

${agrIntro}

## ${agrA1T}
${agrA1D}

## ${agrA2T}
${agrA2D}

## ${agrA3T}
${agrA3R}

## ${agrA4T}
${agrA4D}`;

      const agrEl = document.getElementById('legal-agreement');
      if (agrEl) agrEl.value = agreementMarkdown;

      // Refresh Live Simulator
      window.renderSimulatorCanvas();
    };

    window.renderSimulatorCanvas = function() {
      const canvas = document.getElementById('sim-canvas');
      if (!canvas) return;

      const tab = window.currentLegalTab;

      if (tab === 'about') {
        const title = document.getElementById('v-about-title')?.value || 'MAXPLAY STREAMING';
        const badge = document.getElementById('v-about-badge')?.value || 'POWERED BY SAN TEAM';
        const lead = document.getElementById('v-about-lead')?.value || '';
        const misTitle = document.getElementById('v-about-mission-title')?.value || 'Our Mission & Purpose';
        const misText = document.getElementById('v-about-mission-text')?.value || '';
        const f1T = document.getElementById('v-about-f1-title')?.value || 'Seamless Chunk Playback';
        const f1D = document.getElementById('v-about-f1-desc')?.value || '';
        const f2T = document.getElementById('v-about-f2-title')?.value || 'Active Global Community';
        const f2D = document.getElementById('v-about-f2-desc')?.value || '';
        const f3T = document.getElementById('v-about-f3-title')?.value || 'Family Safe & Private';
        const f3D = document.getElementById('v-about-f3-desc')?.value || '';
        const f4T = document.getElementById('v-about-f4-title')?.value || 'Curated by SAN TEAM';
        const f4D = document.getElementById('v-about-f4-desc')?.value || '';
        const teamName = document.getElementById('v-about-team-name')?.value || 'SAN TEAM Operations';
        const teamStatus = document.getElementById('v-about-team-status')?.value || 'Operational 24/7';
        const teamDesc = document.getElementById('v-about-team-desc')?.value || 'Dedicated to building next-gen web & streaming experiences.';

        canvas.innerHTML = `
          <!-- Hero Card -->
          <div style="position:relative; overflow:hidden; border-radius:20px; background:linear-gradient(135deg, #1C1917, #18181B 60%, #09090B); padding:16px; border:1px solid #292524; text-align:center; box-shadow:0 10px 25px rgba(0,0,0,0.5);">
            <div style="width:44px; height:44px; margin:0 auto 10px; border-radius:14px; background:linear-gradient(135deg, #8B5CF6, #06B6D4); display:flex; align-items:center; justify-content:center; color:#FFF; font-size:20px; box-shadow:0 8px 16px rgba(139,92,246,0.3);">
              <i class="fa-solid fa-film"></i>
            </div>
            <div style="display:inline-flex; align-items:center; gap:5px; background:rgba(139,92,246,0.15); border:1px solid rgba(139,92,246,0.3); border-radius:20px; padding:3px 10px; font-size:9px; font-weight:800; color:#A78BFA; margin-bottom:8px;">
              <i class="fa-solid fa-sparkles"></i> ${escapeHtml(badge)}
            </div>
            <h2 style="font-size:16px; font-weight:900; color:#FFF; margin:0; letter-spacing:0.5px;">${escapeHtml(title)}</h2>
            <p style="font-size:11px; color:#A1A1AA; margin:6px 0 0 0; line-height:1.4;">${escapeHtml(lead)}</p>
          </div>

          <!-- Mission Card -->
          <div style="background:#121214; border-radius:16px; padding:14px; border:1px solid #1C1C1E;">
            <div style="display:flex; align-items:center; gap:6px; color:#06B6D4; margin-bottom:6px;">
              <i class="fa-solid fa-bolt" style="font-size:12px;"></i>
              <h3 style="font-size:11px; font-weight:800; color:#FFF; text-transform:uppercase; margin:0; letter-spacing:0.5px;">${escapeHtml(misTitle)}</h3>
            </div>
            <p style="font-size:11px; color:#A1A1AA; line-height:1.45; margin:0;">${escapeHtml(misText)}</p>
          </div>

          <!-- Feature Cards Grid (2x2) -->
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
            <div style="background:#121214; border-radius:14px; padding:10px; border:1px solid #1C1C1E;">
              <div style="width:24px; height:24px; border-radius:8px; background:rgba(139,92,246,0.2); color:#A78BFA; display:flex; align-items:center; justify-content:center; font-size:11px; margin-bottom:6px;">
                <i class="fa-solid fa-film"></i>
              </div>
              <div style="font-size:11px; font-weight:800; color:#FFF; margin-bottom:2px;">${escapeHtml(f1T)}</div>
              <div style="font-size:9px; color:#71717A; line-height:1.3;">${escapeHtml(f1D)}</div>
            </div>

            <div style="background:#121214; border-radius:14px; padding:10px; border:1px solid #1C1C1E;">
              <div style="width:24px; height:24px; border-radius:8px; background:rgba(16,185,129,0.2); color:#34D399; display:flex; align-items:center; justify-content:center; font-size:11px; margin-bottom:6px;">
                <i class="fa-solid fa-users"></i>
              </div>
              <div style="font-size:11px; font-weight:800; color:#FFF; margin-bottom:2px;">${escapeHtml(f2T)}</div>
              <div style="font-size:9px; color:#71717A; line-height:1.3;">${escapeHtml(f2D)}</div>
            </div>

            <div style="background:#121214; border-radius:14px; padding:10px; border:1px solid #1C1C1E;">
              <div style="width:24px; height:24px; border-radius:8px; background:rgba(245,158,11,0.2); color:#FBBF24; display:flex; align-items:center; justify-content:center; font-size:11px; margin-bottom:6px;">
                <i class="fa-solid fa-lock"></i>
              </div>
              <div style="font-size:11px; font-weight:800; color:#FFF; margin-bottom:2px;">${escapeHtml(f3T)}</div>
              <div style="font-size:9px; color:#71717A; line-height:1.3;">${escapeHtml(f3D)}</div>
            </div>

            <div style="background:#121214; border-radius:14px; padding:10px; border:1px solid #1C1C1E;">
              <div style="width:24px; height:24px; border-radius:8px; background:rgba(236,72,153,0.2); color:#F472B6; display:flex; align-items:center; justify-content:center; font-size:11px; margin-bottom:6px;">
                <i class="fa-solid fa-heart"></i>
              </div>
              <div style="font-size:11px; font-weight:800; color:#FFF; margin-bottom:2px;">${escapeHtml(f4T)}</div>
              <div style="font-size:9px; color:#71717A; line-height:1.3;">${escapeHtml(f4D)}</div>
            </div>
          </div>

          <!-- Team Ownership Card -->
          <div style="background:linear-gradient(to right, #18181B, #121214); border-radius:14px; padding:12px; border:1px solid #27272A; display:flex; align-items:center; justify-content:space-between;">
            <div>
              <div style="font-size:9px; font-weight:800; color:#A78BFA; text-transform:uppercase;">Platform Ownership</div>
              <div style="font-size:12px; font-weight:800; color:#FFF;">${escapeHtml(teamName)}</div>
              <div style="font-size:9px; color:#71717A;">${escapeHtml(teamDesc)}</div>
            </div>
            <span style="background:rgba(16,185,129,0.15); color:#10B981; border:1px solid rgba(16,185,129,0.3); border-radius:8px; padding:3px 8px; font-size:9px; font-weight:800;">
              ${escapeHtml(teamStatus)}
            </span>
          </div>
        `;
      } else if (tab === 'privacy') {
        const pTitle = document.getElementById('v-priv-title')?.value || 'MaxPlay Privacy Statement';
        const pDate = document.getElementById('v-priv-date')?.value || 'August 2026';
        const pIntro = document.getElementById('v-priv-intro')?.value || '';
        const b1T = document.getElementById('v-priv-b1-title')?.value || 'Encrypted Sync';
        const b1D = document.getElementById('v-priv-b1-desc')?.value || 'End-to-end security';
        const b2T = document.getElementById('v-priv-b2-title')?.value || 'Zero Data Selling';
        const b2D = document.getElementById('v-priv-b2-desc')?.value || 'No advertiser brokers';
        const b3T = document.getElementById('v-priv-b3-title')?.value || 'User Control';
        const b3D = document.getElementById('v-priv-b3-desc')?.value || '1-click history wipe';
        const s1T = document.getElementById('v-priv-s1-title')?.value || '1. What Information We Collect';
        const s1Items = (document.getElementById('v-priv-s1-items')?.value || '').split('\n').filter(Boolean);
        const s2T = document.getElementById('v-priv-s2-title')?.value || '2. How We Use Your Data';
        const s2Desc = document.getElementById('v-priv-s2-desc')?.value || '';
        const s3T = document.getElementById('v-priv-s3-title')?.value || '3. Data Storage & Protection';
        const s3Desc = document.getElementById('v-priv-s3-desc')?.value || '';
        const callout = document.getElementById('v-priv-callout')?.value || '';

        const s1ItemsHtml = s1Items.map(item => `
          <div style="display:flex; align-items:flex-start; gap:6px; font-size:10px; color:#A1A1AA; line-height:1.4;">
            <i class="fa-solid fa-circle-check" style="color:#10B981; font-size:10px; margin-top:2px;"></i>
            <span>${escapeHtml(item.replace(/^-\s*/, ''))}</span>
          </div>
        `).join('');

        canvas.innerHTML = `
          <!-- Privacy Header -->
          <div style="background:#121214; border-radius:16px; padding:14px; border:1px solid #1C1C1E;">
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
              <div style="width:32px; height:32px; border-radius:10px; background:rgba(6,182,212,0.2); color:#06B6D4; display:flex; align-items:center; justify-content:center; font-size:14px;">
                <i class="fa-solid fa-shield-halved"></i>
              </div>
              <div>
                <h2 style="font-size:13px; font-weight:800; color:#FFF; margin:0;">${escapeHtml(pTitle)}</h2>
                <span style="font-size:9px; color:#71717A;">Effective: ${escapeHtml(pDate)}</span>
              </div>
            </div>
            <p style="font-size:10px; color:#A1A1AA; line-height:1.4; margin:0;">${escapeHtml(pIntro)}</p>
          </div>

          <!-- 3 Badges Row -->
          <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:6px;">
            <div style="background:#121214; border-radius:10px; padding:8px; border:1px solid #1C1C1E; text-align:center;">
              <div style="font-size:10px; font-weight:800; color:#10B981;">${escapeHtml(b1T)}</div>
              <div style="font-size:8px; color:#71717A; margin-top:2px;">${escapeHtml(b1D)}</div>
            </div>
            <div style="background:#121214; border-radius:10px; padding:8px; border:1px solid #1C1C1E; text-align:center;">
              <div style="font-size:10px; font-weight:800; color:#A78BFA;">${escapeHtml(b2T)}</div>
              <div style="font-size:8px; color:#71717A; margin-top:2px;">${escapeHtml(b2D)}</div>
            </div>
            <div style="background:#121214; border-radius:10px; padding:8px; border:1px solid #1C1C1E; text-align:center;">
              <div style="font-size:10px; font-weight:800; color:#06B6D4;">${escapeHtml(b3T)}</div>
              <div style="font-size:8px; color:#71717A; margin-top:2px;">${escapeHtml(b3D)}</div>
            </div>
          </div>

          <!-- Topic 1 -->
          <div style="background:#121214; border-radius:14px; padding:12px; border:1px solid #1C1C1E;">
            <h3 style="font-size:11px; font-weight:800; color:#FFF; margin:0 0 8px 0;">${escapeHtml(s1T)}</h3>
            <div style="display:flex; flex-direction:column; gap:6px;">
              ${s1ItemsHtml}
            </div>
          </div>

          <!-- Topic 2 -->
          <div style="background:#121214; border-radius:14px; padding:12px; border:1px solid #1C1C1E;">
            <h3 style="font-size:11px; font-weight:800; color:#FFF; margin:0 0 6px 0;">${escapeHtml(s2T)}</h3>
            <p style="font-size:10px; color:#A1A1AA; line-height:1.4; margin:0;">${escapeHtml(s2Desc)}</p>
          </div>

          <!-- Topic 3 -->
          <div style="background:#121214; border-radius:14px; padding:12px; border:1px solid #1C1C1E;">
            <h3 style="font-size:11px; font-weight:800; color:#FFF; margin:0 0 6px 0;">${escapeHtml(s3T)}</h3>
            <p style="font-size:10px; color:#A1A1AA; line-height:1.4; margin:0;">${escapeHtml(s3Desc)}</p>
          </div>

          <!-- Callout -->
          <div style="background:rgba(139,92,246,0.1); border-left:3px solid #8B5CF6; border-radius:8px; padding:10px; font-size:10px; color:#DDD6FE; line-height:1.4;">
            ${escapeHtml(callout)}
          </div>
        `;
      } else if (tab === 'agreement') {
        const agrTitle = document.getElementById('v-agr-title')?.value || 'MaxPlay User Agreement & Terms';
        const agrSub = document.getElementById('v-agr-sub')?.value || 'Terms of Service';
        const agrIntro = document.getElementById('v-agr-intro')?.value || '';
        const a1T = document.getElementById('v-agr-a1-title')?.value || '1. Acceptance & Eligibility';
        const a1D = document.getElementById('v-agr-a1-desc')?.value || '';
        const a2T = document.getElementById('v-agr-a2-title')?.value || '2. Personal & Non-Commercial Use';
        const a2D = document.getElementById('v-agr-a2-desc')?.value || '';
        const a3T = document.getElementById('v-agr-a3-title')?.value || '3. Community Guidelines';
        const a3Rules = (document.getElementById('v-agr-a3-rules')?.value || '').split('\n').filter(Boolean);
        const a4T = document.getElementById('v-agr-a4-title')?.value || '4. Account Moderation';
        const a4D = document.getElementById('v-agr-a4-desc')?.value || '';

        const a3RulesHtml = a3Rules.map(r => `
          <div style="display:flex; align-items:flex-start; gap:6px; font-size:10px; color:#FCA5A5; line-height:1.4;">
            <i class="fa-solid fa-triangle-exclamation" style="color:#EF4444; font-size:10px; margin-top:2px;"></i>
            <span>${escapeHtml(r.replace(/^-\s*/, ''))}</span>
          </div>
        `).join('');

        canvas.innerHTML = `
          <!-- Agreement Header -->
          <div style="background:#121214; border-radius:16px; padding:14px; border:1px solid #1C1C1E;">
            <div style="display:flex; align-items:center; gap:8px; margin-bottom:8px;">
              <div style="width:32px; height:32px; border-radius:10px; background:rgba(245,158,11,0.2); color:#F59E0B; display:flex; align-items:center; justify-content:center; font-size:14px;">
                <i class="fa-solid fa-scale-balanced"></i>
              </div>
              <div>
                <h2 style="font-size:13px; font-weight:800; color:#FFF; margin:0;">${escapeHtml(agrTitle)}</h2>
                <span style="font-size:9px; color:#71717A;">${escapeHtml(agrSub)}</span>
              </div>
            </div>
            <p style="font-size:10px; color:#A1A1AA; line-height:1.4; margin:0;">${escapeHtml(agrIntro)}</p>
          </div>

          <!-- Article 1 -->
          <div style="background:#121214; border-radius:14px; padding:12px; border:1px solid #1C1C1E;">
            <h3 style="font-size:11px; font-weight:800; color:#FFF; margin:0 0 6px 0;">${escapeHtml(a1T)}</h3>
            <p style="font-size:10px; color:#A1A1AA; line-height:1.4; margin:0;">${escapeHtml(a1D)}</p>
          </div>

          <!-- Article 2 -->
          <div style="background:#121214; border-radius:14px; padding:12px; border:1px solid #1C1C1E;">
            <h3 style="font-size:11px; font-weight:800; color:#FFF; margin:0 0 6px 0;">${escapeHtml(a2T)}</h3>
            <p style="font-size:10px; color:#A1A1AA; line-height:1.4; margin:0;">${escapeHtml(a2D)}</p>
          </div>

          <!-- Article 3 -->
          <div style="background:#121214; border-radius:14px; padding:12px; border:1px solid rgba(239,68,68,0.2);">
            <div style="display:flex; align-items:center; gap:6px; color:#EF4444; margin-bottom:6px;">
              <i class="fa-solid fa-shield-exclamation" style="font-size:11px;"></i>
              <h3 style="font-size:11px; font-weight:800; color:#FFF; margin:0;">${escapeHtml(a3T)}</h3>
            </div>
            <div style="display:flex; flex-direction:column; gap:6px;">
              ${a3RulesHtml}
            </div>
          </div>

          <!-- Article 4 -->
          <div style="background:#121214; border-radius:14px; padding:12px; border:1px solid #1C1C1E;">
            <h3 style="font-size:11px; font-weight:800; color:#FFF; margin:0 0 6px 0;">${escapeHtml(a4T)}</h3>
            <p style="font-size:10px; color:#A1A1AA; line-height:1.4; margin:0;">${escapeHtml(a4D)}</p>
          </div>
        `;
      }
    };

    function escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }

    window.loadDefaultLegalTemplates = function() {
      if (!confirm('Load the official SAN TEAM detailed templates for About Us, Privacy Policy, and User Agreement?')) {
        return;
      }

      // About Us Visual Fields
      if (document.getElementById('v-about-title')) document.getElementById('v-about-title').value = 'MAXPLAY STREAMING';
      if (document.getElementById('v-about-badge')) document.getElementById('v-about-badge').value = 'POWERED BY SAN TEAM';
      if (document.getElementById('v-about-lead')) document.getElementById('v-about-lead').value = 'The next-generation entertainment network engineered by SAN TEAM for anime enthusiasts, movie lovers, and binge-watchers worldwide.';
      if (document.getElementById('v-about-mission-title')) document.getElementById('v-about-mission-title').value = 'Our Mission & Purpose';
      if (document.getElementById('v-about-mission-text')) document.getElementById('v-about-mission-text').value = 'At MaxPlay, our goal is to deliver uninterrupted, high-definition entertainment with lightning-fast streaming speeds, adaptive bitrates, offline downloads, multi-audio tracks, and real-time cloud synchronization across all your personal devices.';
      if (document.getElementById('v-about-f1-title')) document.getElementById('v-about-f1-title').value = 'Seamless Chunk Playback';
      if (document.getElementById('v-about-f1-desc')) document.getElementById('v-about-f1-desc').value = 'Buffer-free multi-res chunk player designed to conserve mobile data while offering crystal clear visuals.';
      if (document.getElementById('v-about-f2-title')) document.getElementById('v-about-f2-title').value = 'Active Global Community';
      if (document.getElementById('v-about-f2-desc')) document.getElementById('v-about-f2-desc').value = 'Episode-specific discussions, spoilers filtering, interactive comments, and real-time community engagement.';
      if (document.getElementById('v-about-f3-title')) document.getElementById('v-about-f3-title').value = 'Family Safe & Private';
      if (document.getElementById('v-about-f3-desc')) document.getElementById('v-about-f3-desc').value = 'Built-in PIN family protection mode, custom ratings filters, and encrypted watch telemetry.';
      if (document.getElementById('v-about-f4-title')) document.getElementById('v-about-f4-title').value = 'Curated by SAN TEAM';
      if (document.getElementById('v-about-f4-desc')) document.getElementById('v-about-f4-desc').value = 'Constantly updated library with seasonal anime releases, multi-audio dubs, and member-requested series.';
      if (document.getElementById('v-about-team-name')) document.getElementById('v-about-team-name').value = 'SAN TEAM Operations';
      if (document.getElementById('v-about-team-status')) document.getElementById('v-about-team-status').value = 'Operational 24/7';
      if (document.getElementById('v-about-team-desc')) document.getElementById('v-about-team-desc').value = 'Dedicated to building next-gen web & streaming experiences.';

      // Privacy Policy Visual Fields
      if (document.getElementById('v-priv-title')) document.getElementById('v-priv-title').value = 'MaxPlay Privacy Statement';
      if (document.getElementById('v-priv-date')) document.getElementById('v-priv-date').value = 'August 2026';
      if (document.getElementById('v-priv-intro')) document.getElementById('v-priv-intro').value = 'We respect your personal privacy. MaxPlay and the SAN TEAM are strictly committed to safeguarding your personal data and giving you full control over your streaming history.';
      if (document.getElementById('v-priv-b1-title')) document.getElementById('v-priv-b1-title').value = 'Encrypted Sync';
      if (document.getElementById('v-priv-b1-desc')) document.getElementById('v-priv-b1-desc').value = 'End-to-end data security via Firestore';
      if (document.getElementById('v-priv-b2-title')) document.getElementById('v-priv-b2-title').value = 'Zero Data Selling';
      if (document.getElementById('v-priv-b2-desc')) document.getElementById('v-priv-b2-desc').value = 'We never sell your data to advertisers';
      if (document.getElementById('v-priv-b3-title')) document.getElementById('v-priv-b3-title').value = 'User Control';
      if (document.getElementById('v-priv-b3-desc')) document.getElementById('v-priv-b3-desc').value = 'Clear watch history with 1-click';
      if (document.getElementById('v-priv-s1-title')) document.getElementById('v-priv-s1-title').value = '1. What Information We Collect';
      if (document.getElementById('v-priv-s1-items')) document.getElementById('v-priv-s1-items').value = '- Account Profile: Display Name, Email address, and optional avatar URL chosen by you.\n- Playback Telemetry: Video progress positions and episode timestamps so you can resume where you left off.\n- User Content: Public comments, replies, likes, and custom watchlist entries created inside the app.';
      if (document.getElementById('v-priv-s2-title')) document.getElementById('v-priv-s2-title').value = '2. How We Use Your Data';
      if (document.getElementById('v-priv-s2-desc')) document.getElementById('v-priv-s2-desc').value = 'Your information is used strictly to authenticate your login, save watch bookmarks, personalize homepage recommendations, enforce community comment standards, and improve video streaming bandwidth.';
      if (document.getElementById('v-priv-s3-title')) document.getElementById('v-priv-s3-title').value = '3. Data Storage & Protection';
      if (document.getElementById('v-priv-s3-desc')) document.getElementById('v-priv-s3-desc').value = 'All account credentials and preferences are securely persisted via Firebase Cloud Authentication and Google Cloud Firestore. We employ industry-standard encryption protocols in transit and at rest.';
      if (document.getElementById('v-priv-callout')) document.getElementById('v-priv-callout').value = 'You have the right to clear your watch history or delete your account at any time from the Me settings menu.';

      // User Agreement Visual Fields
      if (document.getElementById('v-agr-title')) document.getElementById('v-agr-title').value = 'MaxPlay User Agreement & Terms';
      if (document.getElementById('v-agr-sub')) document.getElementById('v-agr-sub').value = 'Terms of Service — SAN TEAM Network';
      if (document.getElementById('v-agr-intro')) document.getElementById('v-agr-intro').value = 'By accessing, browsing, or creating an account on MaxPlay, you legally agree to abide by these terms and conditions. Please read them attentively.';
      if (document.getElementById('v-agr-a1-title')) document.getElementById('v-agr-a1-title').value = '1. Acceptance & Eligibility';
      if (document.getElementById('v-agr-a1-desc')) document.getElementById('v-agr-a1-desc').value = 'By installing or streaming via MaxPlay, you certify that you are of legal age in your jurisdiction or are accessing the platform with parent/guardian guidance through Family Mode.';
      if (document.getElementById('v-agr-a2-title')) document.getElementById('v-agr-a2-title').value = '2. Personal & Non-Commercial Use';
      if (document.getElementById('v-agr-a2-desc')) document.getElementById('v-agr-a2-desc').value = 'MaxPlay content is provided solely for personal, non-commercial viewing. You may not re-broadcast, rip, sell, or publicly exhibit streams without authorization.';
      if (document.getElementById('v-agr-a3-title')) document.getElementById('v-agr-a3-title').value = '3. Community Guidelines & Comment Rules';
      if (document.getElementById('v-agr-a3-rules')) document.getElementById('v-agr-a3-rules').value = '- Harassment, hate speech, abusive language, or personal threats.\n- Unsolicited advertising, spam links, bot scripts, or malicious phishing.\n- Unmarked episode ending spoilers that ruin the experience for other members.';
      if (document.getElementById('v-agr-a4-title')) document.getElementById('v-agr-a4-title').value = '4. Account Moderation & Suspensions';
      if (document.getElementById('v-agr-a4-desc')) document.getElementById('v-agr-a4-desc').value = 'MaxPlay administrators reserve the right to review reported comments and suspend or terminate accounts that repeatedly violate community standards.';

      window.onVisualFormChange();
      if (window.showToast) window.showToast('Official SAN TEAM templates loaded into visual studio!');
    };

    window.loadLegalContent = async function() {
      const statusEl = document.getElementById('legal-sync-status');
      if (statusEl) statusEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Loading...';
      try {
        const snap = await getDoc(doc(db, 'settings', 'legal'));
        if (snap.exists()) {
          const data = snap.data();
          
          // If raw markdown is stored, also populate textareas
          const about = data.aboutUs || '';
          const privacy = data.privacyPolicy || '';
          const agreement = data.userAgreement || '';

          if (document.getElementById('legal-about')) document.getElementById('legal-about').value = about;
          if (document.getElementById('legal-privacy')) document.getElementById('legal-privacy').value = privacy;
          if (document.getElementById('legal-agreement')) document.getElementById('legal-agreement').value = agreement;

          // If structured fields exist in Firestore, populate them directly
          if (data.aboutUsStructured) {
            const s = data.aboutUsStructured;
            if (s.title && document.getElementById('v-about-title')) document.getElementById('v-about-title').value = s.title;
            if (s.badge && document.getElementById('v-about-badge')) document.getElementById('v-about-badge').value = s.badge;
            if (s.lead && document.getElementById('v-about-lead')) document.getElementById('v-about-lead').value = s.lead;
            if (s.misTitle && document.getElementById('v-about-mission-title')) document.getElementById('v-about-mission-title').value = s.misTitle;
            if (s.misText && document.getElementById('v-about-mission-text')) document.getElementById('v-about-mission-text').value = s.misText;
            if (s.f1T && document.getElementById('v-about-f1-title')) document.getElementById('v-about-f1-title').value = s.f1T;
            if (s.f1D && document.getElementById('v-about-f1-desc')) document.getElementById('v-about-f1-desc').value = s.f1D;
            if (s.f2T && document.getElementById('v-about-f2-title')) document.getElementById('v-about-f2-title').value = s.f2T;
            if (s.f2D && document.getElementById('v-about-f2-desc')) document.getElementById('v-about-f2-desc').value = s.f2D;
            if (s.f3T && document.getElementById('v-about-f3-title')) document.getElementById('v-about-f3-title').value = s.f3T;
            if (s.f3D && document.getElementById('v-about-f3-desc')) document.getElementById('v-about-f3-desc').value = s.f3D;
            if (s.f4T && document.getElementById('v-about-f4-title')) document.getElementById('v-about-f4-title').value = s.f4T;
            if (s.f4D && document.getElementById('v-about-f4-desc')) document.getElementById('v-about-f4-desc').value = s.f4D;
            if (s.teamName && document.getElementById('v-about-team-name')) document.getElementById('v-about-team-name').value = s.teamName;
            if (s.teamStatus && document.getElementById('v-about-team-status')) document.getElementById('v-about-team-status').value = s.teamStatus;
            if (s.teamDesc && document.getElementById('v-about-team-desc')) document.getElementById('v-about-team-desc').value = s.teamDesc;
          }

          if (data.privacyStructured) {
            const p = data.privacyStructured;
            if (p.title && document.getElementById('v-priv-title')) document.getElementById('v-priv-title').value = p.title;
            if (p.date && document.getElementById('v-priv-date')) document.getElementById('v-priv-date').value = p.date;
            if (p.intro && document.getElementById('v-priv-intro')) document.getElementById('v-priv-intro').value = p.intro;
            if (p.b1T && document.getElementById('v-priv-b1-title')) document.getElementById('v-priv-b1-title').value = p.b1T;
            if (p.b1D && document.getElementById('v-priv-b1-desc')) document.getElementById('v-priv-b1-desc').value = p.b1D;
            if (p.b2T && document.getElementById('v-priv-b2-title')) document.getElementById('v-priv-b2-title').value = p.b2T;
            if (p.b2D && document.getElementById('v-priv-b2-desc')) document.getElementById('v-priv-b2-desc').value = p.b2D;
            if (p.b3T && document.getElementById('v-priv-b3-title')) document.getElementById('v-priv-b3-title').value = p.b3T;
            if (p.b3D && document.getElementById('v-priv-b3-desc')) document.getElementById('v-priv-b3-desc').value = p.b3D;
            if (p.s1T && document.getElementById('v-priv-s1-title')) document.getElementById('v-priv-s1-title').value = p.s1T;
            if (p.s1Items && document.getElementById('v-priv-s1-items')) document.getElementById('v-priv-s1-items').value = p.s1Items;
            if (p.s2T && document.getElementById('v-priv-s2-title')) document.getElementById('v-priv-s2-title').value = p.s2T;
            if (p.s2Desc && document.getElementById('v-priv-s2-desc')) document.getElementById('v-priv-s2-desc').value = p.s2Desc;
            if (p.s3T && document.getElementById('v-priv-s3-title')) document.getElementById('v-priv-s3-title').value = p.s3T;
            if (p.s3Desc && document.getElementById('v-priv-s3-desc')) document.getElementById('v-priv-s3-desc').value = p.s3Desc;
            if (p.callout && document.getElementById('v-priv-callout')) document.getElementById('v-priv-callout').value = p.callout;
          }

          if (data.agreementStructured) {
            const g = data.agreementStructured;
            if (g.title && document.getElementById('v-agr-title')) document.getElementById('v-agr-title').value = g.title;
            if (g.sub && document.getElementById('v-agr-sub')) document.getElementById('v-agr-sub').value = g.sub;
            if (g.intro && document.getElementById('v-agr-intro')) document.getElementById('v-agr-intro').value = g.intro;
            if (g.a1T && document.getElementById('v-agr-a1-title')) document.getElementById('v-agr-a1-title').value = g.a1T;
            if (g.a1D && document.getElementById('v-agr-a1-desc')) document.getElementById('v-agr-a1-desc').value = g.a1D;
            if (g.a2T && document.getElementById('v-agr-a2-title')) document.getElementById('v-agr-a2-title').value = g.a2T;
            if (g.a2D && document.getElementById('v-agr-a2-desc')) document.getElementById('v-agr-a2-desc').value = g.a2D;
            if (g.a3T && document.getElementById('v-agr-a3-title')) document.getElementById('v-agr-a3-title').value = g.a3T;
            if (g.a3Rules && document.getElementById('v-agr-a3-rules')) document.getElementById('v-agr-a3-rules').value = g.a3Rules;
            if (g.a4T && document.getElementById('v-agr-a4-title')) document.getElementById('v-agr-a4-title').value = g.a4T;
            if (g.a4D && document.getElementById('v-agr-a4-desc')) document.getElementById('v-agr-a4-desc').value = g.a4D;
          }

          window.onVisualFormChange();
          if (statusEl) statusEl.innerHTML = '<i class="fa-solid fa-circle-check"></i> Synced with Firestore';
        } else {
          // Default content if not exists
          window.loadDefaultLegalTemplates();
          if (statusEl) statusEl.innerHTML = '<i class="fa-solid fa-circle-info"></i> Default Templates Loaded';
        }
      } catch (e) {
        if (statusEl) statusEl.innerHTML = '<i class="fa-solid fa-triangle-exclamation" style="color:var(--accent-red);"></i> Error';
        if (window.showToast) window.showToast('Error loading legal content: ' + e.message);
      }
    };

    window.saveLegalContent = async function() {
      const statusEl = document.getElementById('legal-sync-status');
      if (statusEl) statusEl.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Saving to Firestore...';

      // Ensure all fields are compiled
      window.onVisualFormChange();

      const privacy = document.getElementById('legal-privacy')?.value || '';
      const agreement = document.getElementById('legal-agreement')?.value || '';
      const about = document.getElementById('legal-about')?.value || '';

      const aboutUsStructured = {
        title: document.getElementById('v-about-title')?.value || '',
        badge: document.getElementById('v-about-badge')?.value || '',
        lead: document.getElementById('v-about-lead')?.value || '',
        misTitle: document.getElementById('v-about-mission-title')?.value || '',
        misText: document.getElementById('v-about-mission-text')?.value || '',
        f1T: document.getElementById('v-about-f1-title')?.value || '',
        f1D: document.getElementById('v-about-f1-desc')?.value || '',
        f2T: document.getElementById('v-about-f2-title')?.value || '',
        f2D: document.getElementById('v-about-f2-desc')?.value || '',
        f3T: document.getElementById('v-about-f3-title')?.value || '',
        f3D: document.getElementById('v-about-f3-desc')?.value || '',
        f4T: document.getElementById('v-about-f4-title')?.value || '',
        f4D: document.getElementById('v-about-f4-desc')?.value || '',
        teamName: document.getElementById('v-about-team-name')?.value || '',
        teamStatus: document.getElementById('v-about-team-status')?.value || '',
        teamDesc: document.getElementById('v-about-team-desc')?.value || ''
      };

      const privacyStructured = {
        title: document.getElementById('v-priv-title')?.value || '',
        date: document.getElementById('v-priv-date')?.value || '',
        intro: document.getElementById('v-priv-intro')?.value || '',
        b1T: document.getElementById('v-priv-b1-title')?.value || '',
        b1D: document.getElementById('v-priv-b1-desc')?.value || '',
        b2T: document.getElementById('v-priv-b2-title')?.value || '',
        b2D: document.getElementById('v-priv-b2-desc')?.value || '',
        b3T: document.getElementById('v-priv-b3-title')?.value || '',
        b3D: document.getElementById('v-priv-b3-desc')?.value || '',
        s1T: document.getElementById('v-priv-s1-title')?.value || '',
        s1Items: document.getElementById('v-priv-s1-items')?.value || '',
        s2T: document.getElementById('v-priv-s2-title')?.value || '',
        s2Desc: document.getElementById('v-priv-s2-desc')?.value || '',
        s3T: document.getElementById('v-priv-s3-title')?.value || '',
        s3Desc: document.getElementById('v-priv-s3-desc')?.value || '',
        callout: document.getElementById('v-priv-callout')?.value || ''
      };

      const agreementStructured = {
        title: document.getElementById('v-agr-title')?.value || '',
        sub: document.getElementById('v-agr-sub')?.value || '',
        intro: document.getElementById('v-agr-intro')?.value || '',
        a1T: document.getElementById('v-agr-a1-title')?.value || '',
        a1D: document.getElementById('v-agr-a1-desc')?.value || '',
        a2T: document.getElementById('v-agr-a2-title')?.value || '',
        a2D: document.getElementById('v-agr-a2-desc')?.value || '',
        a3T: document.getElementById('v-agr-a3-title')?.value || '',
        a3Rules: document.getElementById('v-agr-a3-rules')?.value || '',
        a4T: document.getElementById('v-agr-a4-title')?.value || '',
        a4D: document.getElementById('v-agr-a4-desc')?.value || ''
      };

      try {
        await setDoc(doc(db, 'settings', 'legal'), {
          privacyPolicy: privacy,
          userAgreement: agreement,
          aboutUs: about,
          aboutUsStructured: aboutUsStructured,
          privacyStructured: privacyStructured,
          agreementStructured: agreementStructured,
          updatedAt: new Date().toISOString()
        });
        if (statusEl) statusEl.innerHTML = '<i class="fa-solid fa-circle-check" style="color:var(--accent-green);"></i> Saved to Firestore';
        if (window.showToast) window.showToast('App information & legal pages saved successfully!');
      } catch (e) {
        if (statusEl) statusEl.innerHTML = '<i class="fa-solid fa-triangle-exclamation" style="color:var(--accent-red);"></i> Save Failed';
        if (window.showToast) window.showToast('Error saving content: ' + e.message);
      }
    };

    // 11. ENHANCED ANALYTICS ENGINE
    window.loadAnalytics = function() {
      const typesContainer = document.getElementById('analytics-content-types');
      const qualityContainer = document.getElementById('analytics-quality-spread');
      const genresContainer = document.getElementById('analytics-genres-spread');

      const items = window.cachedContentDocs || [];
      const totalItems = items.length;

      // Update overview summary stats
      const totalTitlesEl = document.getElementById('stat-total-titles');
      if (totalTitlesEl) totalTitlesEl.innerText = totalItems.toString();

      // Count streaming networks from hotScreensData
      let netCount = 0;
      if (window.hotScreensData) {
        Object.values(window.hotScreensData).forEach(rows => {
          if (Array.isArray(rows)) {
            rows.forEach(r => {
              if (r.contentIds && Array.isArray(r.contentIds)) {
                r.contentIds.forEach(c => {
                  if (c && typeof c === 'object' && c.isNetwork) netCount++;
                });
              }
            });
          }
        });
      }
      const statNets = document.getElementById('stat-total-networks');
      if (statNets) statNets.innerText = netCount.toString();

      const totalRowsCount = (window.homeRowsData || []).length;
      const statRows = document.getElementById('stat-total-rows');
      if (statRows) statRows.innerText = totalRowsCount.toString();

      // 1. Content Format Breakdown
      if (typesContainer) {
        const counts = { movie: 0, anime: 0, tv: 0, short_tv: 0 };
        items.forEach(c => {
          if (!c || !c.data) return;
          const t = (c.data.type || 'movie').toLowerCase();
          if (counts[t] !== undefined) counts[t]++;
          else if (t === 'series' || t === 'tv_show') counts.tv++;
          else counts.movie++;
        });

        const safePct = (val) => totalItems > 0 ? Math.round((val / totalItems) * 100) : 0;

        typesContainer.innerHTML = `
          <!-- Movies -->
          <div>
            <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px;">
              <span style="color:#FFF; font-weight:700;"><i class="fa-solid fa-film" style="color:#22D3EE; margin-right:6px;"></i> Movies</span>
              <span style="color:#22D3EE; font-weight:800;">${counts.movie} <span style="color:var(--text-tertiary); font-weight:500;">(${safePct(counts.movie)}%)</span></span>
            </div>
            <div style="width:100%; height:6px; background:rgba(255,255,255,0.08); border-radius:10px; overflow:hidden;">
              <div style="width:${safePct(counts.movie)}%; height:100%; background:#22D3EE; border-radius:10px;"></div>
            </div>
          </div>

          <!-- Anime Series -->
          <div>
            <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px;">
              <span style="color:#FFF; font-weight:700;"><i class="fa-solid fa-bolt" style="color:#A78BFA; margin-right:6px;"></i> Anime Series</span>
              <span style="color:#A78BFA; font-weight:800;">${counts.anime} <span style="color:var(--text-tertiary); font-weight:500;">(${safePct(counts.anime)}%)</span></span>
            </div>
            <div style="width:100%; height:6px; background:rgba(255,255,255,0.08); border-radius:10px; overflow:hidden;">
              <div style="width:${safePct(counts.anime)}%; height:100%; background:#A78BFA; border-radius:10px;"></div>
            </div>
          </div>

          <!-- TV Series -->
          <div>
            <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px;">
              <span style="color:#FFF; font-weight:700;"><i class="fa-solid fa-tv" style="color:#34D399; margin-right:6px;"></i> TV Series</span>
              <span style="color:#34D399; font-weight:800;">${counts.tv} <span style="color:var(--text-tertiary); font-weight:500;">(${safePct(counts.tv)}%)</span></span>
            </div>
            <div style="width:100%; height:6px; background:rgba(255,255,255,0.08); border-radius:10px; overflow:hidden;">
              <div style="width:${safePct(counts.tv)}%; height:100%; background:#34D399; border-radius:10px;"></div>
            </div>
          </div>

          <!-- Short TV -->
          <div>
            <div style="display:flex; justify-content:space-between; font-size:12px; margin-bottom:4px;">
              <span style="color:#FFF; font-weight:700;"><i class="fa-solid fa-mobile-screen" style="color:#FBBF24; margin-right:6px;"></i> Short TV / Shorts</span>
              <span style="color:#FBBF24; font-weight:800;">${counts.short_tv} <span style="color:var(--text-tertiary); font-weight:500;">(${safePct(counts.short_tv)}%)</span></span>
            </div>
            <div style="width:100%; height:6px; background:rgba(255,255,255,0.08); border-radius:10px; overflow:hidden;">
              <div style="width:${safePct(counts.short_tv)}%; height:100%; background:#FBBF24; border-radius:10px;"></div>
            </div>
          </div>
        `;
      }

      // 2. Video Quality & Audio Breakdown
      if (qualityContainer) {
        let count4K = 0, count1080p = 0, count720p = 0, countHindi = 0, countDual = 0, countEnglish = 0;

        items.forEach(c => {
          const d = c.data || {};
          const genres = Array.isArray(d.genres) ? d.genres.join(' ').toLowerCase() : '';
          const langs = Array.isArray(d.availableLanguages) ? d.availableLanguages.map(l => l.toLowerCase()) : [];

          if (genres.includes('hindi') || langs.includes('hindi')) countHindi++;
          if (genres.includes('dual') || langs.length > 1) countDual++;
          if (langs.includes('english') || genres.includes('english')) countEnglish++;

          // Check video quality
          count1080p++;
          if (d.rating >= 9.0) count4K++;
          else count720p++;
        });

        qualityContainer.innerHTML = `
          <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.05); font-size:12px;">
            <span><i class="fa-solid fa-circle-check" style="color:#A78BFA; margin-right:6px;"></i> 4K Ultra HD Streams</span>
            <span style="font-weight:800; color:#FFF;">${count4K} Titles</span>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.05); font-size:12px;">
            <span><i class="fa-solid fa-circle-check" style="color:#22D3EE; margin-right:6px;"></i> 1080p Full HD</span>
            <span style="font-weight:800; color:#FFF;">${count1080p} Titles</span>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.05); font-size:12px;">
            <span><i class="fa-solid fa-language" style="color:#FBBF24; margin-right:6px;"></i> Hindi Dubbed Audio</span>
            <span style="font-weight:800; color:#FBBF24;">${countHindi} Titles</span>
          </div>
          <div style="display:flex; justify-content:space-between; align-items:center; padding:6px 0; font-size:12px;">
            <span><i class="fa-solid fa-headphones" style="color:#34D399; margin-right:6px;"></i> Multi-Audio / Dual Audio</span>
            <span style="font-weight:800; color:#34D399;">${countDual} Titles</span>
          </div>
        `;
      }

      // 3. Top Genres Spread
      if (genresContainer) {
        const genreTally = {};
        items.forEach(c => {
          const d = c.data || {};
          if (Array.isArray(d.genres)) {
            d.genres.forEach(g => {
              if (g && typeof g === 'string' && g.trim()) {
                const norm = g.trim();
                genreTally[norm] = (genreTally[norm] || 0) + 1;
              }
            });
          }
        });

        const sortedGenres = Object.entries(genreTally).sort((a,b) => b[1] - a[1]);
        if (sortedGenres.length === 0) {
          genresContainer.innerHTML = `<span style="font-size:12px; color:var(--text-tertiary);">No genres detected in catalog.</span>`;
        } else {
          genresContainer.innerHTML = sortedGenres.slice(0, 10).map(([g, count]) => `
            <span style="background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1); padding:5px 10px; border-radius:20px; font-size:11px; font-weight:700; color:#FFF; display:inline-flex; align-items:center; gap:6px;">
              <span>${g}</span>
              <span style="background:rgba(139,92,246,0.3); color:#A78BFA; font-size:10px; padding:1px 6px; border-radius:10px;">${count}</span>
            </span>
          `).join('');
        }
      }
    };

    // 12. ENHANCED DASHBOARD METRICS & RECENT CONTENT
    window.loadDashboardStats = function() {
      const items = window.cachedContentDocs || [];
      const contentEl = document.getElementById('dash-content');
      if (contentEl) contentEl.innerText = items.length.toString();

      const movieCount = items.filter(c => (c.data?.type || '').toLowerCase() === 'movie').length;
      const seriesCount = items.length - movieCount;
      const breakdownEl = document.getElementById('dash-content-breakdown');
      if (breakdownEl) breakdownEl.innerText = `${movieCount} Movies · ${seriesCount} Series`;

      // Streaming networks count
      let netCount = 0;
      if (window.hotScreensData) {
        Object.values(window.hotScreensData).forEach(rows => {
          if (Array.isArray(rows)) {
            rows.forEach(r => {
              if (r.contentIds && Array.isArray(r.contentIds)) {
                r.contentIds.forEach(c => {
                  if (c && typeof c === 'object' && c.isNetwork) netCount++;
                });
              }
            });
          }
        });
      }
      const netEl = document.getElementById('dash-networks');
      if (netEl) netEl.innerText = netCount.toString();

      // App Categories & Rows
      const catCount = (window.categoriesData || []).length;
      const rowCount = (window.homeRowsData || []).length;
      const catsEl = document.getElementById('dash-categories');
      if (catsEl) catsEl.innerText = (catCount + rowCount).toString();
      const catsSub = document.getElementById('dash-categories-sub');
      if (catsSub) catsSub.innerText = `${catCount} Tabs · ${rowCount} Rows`;

      // Enhanced Recently Added Content Table
      const tbody = document.getElementById('dash-recent-content');
      if (tbody) {
        if (items.length === 0) {
          tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; padding:30px; color:var(--text-tertiary);">No media uploads found in library.</td></tr>`;
          return;
        }

        const recent = [...items].slice(0, 6);
        let h = '';
        recent.forEach(r => {
          if (!r || !r.data) return;
          const d = r.data;
          const id = r.id;
          const initialPoster = d.posterUrl || 'https://via.placeholder.com/80x120';
          const typeBadge = `<span class="status-badge status-active" style="text-transform:uppercase; font-size:10px;">${d.type || 'Movie'}</span>`;
          const audioText = (d.availableLanguages && d.availableLanguages.length > 0) ? d.availableLanguages.join(', ') : 'Hindi / English';
          const dateAdded = d.createdAt ? new Date(d.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Recently Added';

          h += `
            <tr>
              <td style="display:flex; align-items:center; gap:12px;">
                <img src="${initialPoster}" onerror="this.src='https://via.placeholder.com/80x120'" style="width:36px; height:50px; border-radius:6px; object-fit:cover; border:1px solid rgba(255,255,255,0.1); flex-shrink:0;">
                <div style="overflow:hidden;">
                  <div style="font-weight:700; font-size:13px; color:#FFF; text-overflow:ellipsis; overflow:hidden; white-space:nowrap;" title="${d.title || 'Untitled'}">${d.title || 'Untitled'}</div>
                  <div style="font-size:11px; color:var(--text-tertiary); display:flex; align-items:center; gap:6px;">
                    <span>${d.year || '2025'}</span>
                    <span>·</span>
                    <span style="color:var(--accent-amber);"><i class="fa-solid fa-star" style="font-size:9px;"></i> ${d.rating || '9.5'}</span>
                  </div>
                </div>
              </td>
              <td>${typeBadge}</td>
              <td style="font-size:11px; color:var(--text-secondary);">${audioText}</td>
              <td style="color:var(--text-tertiary); font-size:11px;">${dateAdded}</td>
              <td style="text-align:right;">
                <div style="display:flex; justify-content:flex-end; gap:6px;">
                  <button class="btn-secondary" style="height:28px; padding:0 8px; font-size:11px;" onclick="editContent('${id}')" title="Edit Media">
                    <i class="fa-solid fa-pen"></i>
                  </button>
                  <button class="btn-danger" style="height:28px; padding:0 8px; font-size:11px;" onclick="deleteContent('${id}')" title="Delete Media">
                    <i class="fa-solid fa-trash"></i>
                  </button>
                </div>
              </td>
            </tr>
          `;
        });
        tbody.innerHTML = h;
      }
    };

    // INIT ALL LISTENERS
    window.loadContentList();
    window.loadHomeRows();
    window.loadCategories();
    window.loadUsers();
    window.loadGeneralSettings();
    window.loadMessagesHistory();

    // HOT SECTION MANAGEMENT
    window.renderHotSectionGrid = function() {
      const selectEl = document.getElementById('manage-hot-section-select');
      const section = selectEl ? selectEl.value : 'movies';
      const grid = document.getElementById('hot-section-grid');
      const titleLabel = document.getElementById('hot-section-title');
      
      const sectionsMap = {
        'movies': 'Hot Movies',
        'series': 'Hot Series',
        'short_tv': 'Hot Short TV',
        'music': 'Hot Music'
      };
      
      if(titleLabel) titleLabel.innerText = "Add Content to " + (sectionsMap[section] || 'Section');

      if(!grid) return;
      
      let items = (window.cachedContentDocs || []).filter(d => d && d.data && d.data.searchHotSection === section);
      items.sort((a, b) => (a.data.searchHotPosition || 0) - (b.data.searchHotPosition || 0));

      grid.innerHTML = '';
      if(items.length === 0) {
        grid.innerHTML = '<div style="padding:20px; text-align:center; color:var(--text-tertiary); background:var(--bg-tertiary); border-radius:10px; border:1px solid var(--border-color);">No content added to this section yet.</div>';
        return;
      }

      items.forEach(docItem => {
        const d = docItem.data;
        const pos = d.searchHotPosition || 0;
        
        const el = document.createElement('div');
        el.style = "display:flex; align-items:center; justify-content:space-between; background:var(--bg-secondary); border:1px solid var(--border-color); border-radius:10px; padding:12px;";
        el.innerHTML = `
          <div style="display:flex; align-items:center; gap:12px;">
            <div style="width:32px; height:32px; border-radius:8px; background:var(--bg-tertiary); display:flex; align-items:center; justify-content:center; font-weight:800; color:var(--accent-purple);">${pos}</div>
            <img src="${d.posterUrl || ''}" style="width:40px; height:56px; border-radius:6px; object-fit:cover;" onerror="this.src='https://via.placeholder.com/40x56'">
            <div>
              <div style="font-size:14px; font-weight:700;">${d.title || 'Untitled'}</div>
              <div style="font-size:11px; color:var(--text-secondary);">ID: ${docItem.id || 'N/A'}</div>
            </div>
          </div>
          <button type="button" class="btn-danger" style="height:32px; padding:0 12px; font-size:11px;" onclick="removeContentFromHotSection('${docItem.id}')">
            <i class="fa-solid fa-trash"></i> Delete
          </button>
        `;
        grid.appendChild(el);
      });
    };

    window.openContentSelectorModal = function() {
      document.getElementById('content-selector-modal').style.display = 'flex';
      document.getElementById('content-selector-search').value = '';
      window.filterContentSelector();
    };

    window.filterContentSelector = function() {
      const searchEl = document.getElementById('content-selector-search');
      const q = (searchEl ? searchEl.value || '' : '').toLowerCase();
      const list = document.getElementById('content-selector-list');
      if (!list) return;
      list.innerHTML = '';
      
      let count = 0;
      const docs = window.cachedContentDocs || [];
      
docs.forEach(docItem => {
        if (!docItem || !docItem.data) return;
        const title = String(docItem.data.title || '').toLowerCase();
        const docId = String(docItem.id || '').toLowerCase();
        if(title.includes(q) || docId.includes(q)) {
          count++;
          const el = document.createElement('div');
          el.style = "display:flex; align-items:center; gap:12px; padding:10px; background:var(--bg-tertiary); border:1px solid var(--border-color); border-radius:8px; cursor:pointer;";
          el.onclick = () => { window.selectContentForHot(docItem.id, docItem.data.title); };
          el.innerHTML = `
            <img src="${docItem.data.posterUrl || ''}" style="width:30px; height:42px; border-radius:4px; object-fit:cover;" onerror="this.src='https://via.placeholder.com/30x42'">
            <div>
              <div style="font-size:13px; font-weight:600;">${docItem.data.title || 'Untitled'}</div>
              <div style="font-size:10px; color:var(--text-secondary);">${docItem.id || 'N/A'} | ${docItem.data.type || 'N/A'}</div>
            </div>
          `;
          list.appendChild(el);
        }
      });
      if(count === 0) {
        list.innerHTML = '<div style="color:var(--text-tertiary); text-align:center; padding:20px;">No matches found</div>';
      }
    };

    window.selectContentForHot = function(id, title) {
      document.getElementById('hot-add-content-id').value = id;
      document.getElementById('hot-add-content-title').value = title;
      document.getElementById('content-selector-modal').style.display = 'none';
    };

    window.addContentToHotSection = async function() {
      const id = document.getElementById('hot-add-content-id').value;
      const pos = parseInt(document.getElementById('hot-add-content-position').value || '1');
      const section = document.getElementById('manage-hot-section-select').value;

      if(!id) {
        showToast('Please select a content first!');
        return;
      }
      
      try {
        const ref = doc(db, 'content', id);
        await updateDoc(ref, {
          searchHotSection: section,
          searchHotPosition: pos,
          updatedAt: new Date().toISOString()
        });
        showToast('Added to ' + section + ' at position ' + pos);
        
        // Update local cache
        const idx = window.cachedContentDocs.findIndex(d => d.id === id);
        if(idx > -1) {
          window.cachedContentDocs[idx].data.searchHotSection = section;
          window.cachedContentDocs[idx].data.searchHotPosition = pos;
        }
        
        // Reset form
        document.getElementById('hot-add-content-id').value = '';
        document.getElementById('hot-add-content-title').value = '';
        document.getElementById('hot-add-content-position').value = pos + 1;
        
        renderHotSectionGrid();
      } catch(e) {
        console.error(e);
        showToast('Error saving: ' + e.message);
      }
    };

    window.removeContentFromHotSection = async function(id) {
      if(!confirm('Are you sure you want to remove this item from the Hot section?')) return;
      try {
        const ref = doc(db, 'content', id);
        await updateDoc(ref, {
          searchHotSection: null,
          searchHotPosition: null,
          updatedAt: new Date().toISOString()
        });
        showToast('Removed from Hot section');
        
        // Update local cache
        const idx = window.cachedContentDocs.findIndex(d => d.id === id);
        if(idx > -1) {
          window.cachedContentDocs[idx].data.searchHotSection = null;
          window.cachedContentDocs[idx].data.searchHotPosition = null;
        }
        renderHotSectionGrid();
      } catch(e) {
        console.error(e);
        showToast('Error removing: ' + e.message);
      }
    };

    
    
    // MANAGE HOT SCREENS LOGIC
    window.hotScreensTabs = ['Trending', 'Anime', 'TV', 'Short TV', 'Movies', 'LIVE'];
    window.activeHotScreen = 'Trending';
    window.hotScreensData = {}; // Rows
    window.hotScreensCategories = {}; // Categories per screen
    window.hotScreensBanners = {}; // Banners per screen
    
    window.currentMultiSelectRowId = null;

    window.loadHotScreens = async function() {
      try {
        // Load Rows
        const snapRows = await getDoc(doc(db, 'settings', 'screens_rows'));
        if (snapRows.exists() && snapRows.data()) {
          window.hotScreensData = snapRows.data();
        } else {
          window.hotScreensData = {};
        }

        // Apply defaults for any missing tabs
        window.hotScreensTabs.forEach(tab => {
          if(!window.hotScreensData[tab] || window.hotScreensData[tab].length === 0) {
            let defaults = [];
            if (tab === 'Anime') {
              defaults = [
                { id: 'anime-seasonal', title: 'Seasonal Anime', order: 1, style: 'seasonal_card', mode: 'tag', tagFilter: 'Anime', contentIds: [] },
                { id: 'anime-classic', title: 'Classic Anime Series', order: 2, style: 'classic_anime', mode: 'tag', tagFilter: 'Anime', contentIds: [] },
                { id: 'anime-otherworld', title: 'Welcome to Otherworld', order: 3, style: 'landscape_text', mode: 'tag', tagFilter: 'Anime', contentIds: [] },
                { id: 'anime-popular', title: 'Popular Anime', order: 4, style: 'default', mode: 'tag', tagFilter: 'Anime', contentIds: [] },
              ];
            } else if (tab === 'TV') {
              defaults = [
                { id: 'tv-seasonal', title: 'Seasonal Series', order: 1, style: 'seasonal_card', mode: 'tag', tagFilter: 'TV', contentIds: [] },
                { id: 'tv-classic', title: 'Classic Series', order: 2, style: 'classic_anime', mode: 'tag', tagFilter: 'TV', contentIds: [] },
                { id: 'tv-world', title: 'Welcome to TV Worlds', order: 3, style: 'landscape_text', mode: 'tag', tagFilter: 'TV', contentIds: [] },
                { id: 'tv-popular', title: 'Popular TV Shows', order: 4, style: 'default', mode: 'tag', tagFilter: 'TV', contentIds: [] },
              ];
            } else if (tab === 'Short TV') {
              defaults = [
                { id: 'shorttv-seasonal', title: 'Seasonal Short Drama', order: 1, style: 'seasonal_card', mode: 'tag', tagFilter: 'Short TV', contentIds: [] },
                { id: 'shorttv-classic', title: 'Classic Mini Series', order: 2, style: 'classic_anime', mode: 'tag', tagFilter: 'Short TV', contentIds: [] },
                { id: 'shorttv-quick', title: 'Quick Stories', order: 3, style: 'landscape_text', mode: 'tag', tagFilter: 'Short TV', contentIds: [] },
                { id: 'shorttv-trending', title: 'Trending Short Dramas', order: 4, style: 'default', mode: 'tag', tagFilter: 'Short TV', contentIds: [] },
              ];
            } else if (tab === 'Movies') {
              defaults = [
                { id: 'movies-premieres', title: 'Blockbuster Premieres', order: 1, style: 'seasonal_card', mode: 'tag', tagFilter: 'Movie', contentIds: [] },
                { id: 'movies-classic', title: 'Classic Movie Favorites', order: 2, style: 'classic_anime', mode: 'tag', tagFilter: 'Movie', contentIds: [] },
                { id: 'movies-cinema', title: 'Cinema Showcase', order: 3, style: 'landscape_text', mode: 'tag', tagFilter: 'Movie', contentIds: [] },
                { id: 'movies-trending', title: 'Trending Movies', order: 4, style: 'default', mode: 'tag', tagFilter: 'Movie', contentIds: [] },
              ];
            } else if (tab === 'LIVE') {
              defaults = [
                { id: 'live-broadcasts', title: 'Live Broadcasts', order: 1, style: 'seasonal_card', mode: 'tag', tagFilter: 'LIVE', contentIds: [] },
                { id: 'live-streams', title: 'Trending Streams', order: 2, style: 'landscape_text', mode: 'tag', tagFilter: 'LIVE', contentIds: [] },
                { id: 'live-channels', title: 'Featured Channels', order: 3, style: 'default', mode: 'tag', tagFilter: 'LIVE', contentIds: [] },
              ];
            } else {
              defaults = [
                { id: 'trending-now', title: 'Trending Now', order: 1, style: 'default', mode: 'tag', tagFilter: '', contentIds: [] },
                { id: 'trending-featured', title: 'Featured Highlights', order: 2, style: 'seasonal_card', mode: 'tag', tagFilter: '', contentIds: [] },
                { id: 'trending-otherworld', title: 'Welcome to Otherworld', order: 3, style: 'landscape_text', mode: 'tag', tagFilter: '', contentIds: [] },
                { id: 'trending-classic', title: 'Classic Hits', order: 4, style: 'classic_anime', mode: 'tag', tagFilter: '', contentIds: [] },
              ];
            }
            window.hotScreensData[tab] = defaults;
          }
        });

        // Load Categories
        const snapCats = await getDoc(doc(db, 'settings', 'screens_categories'));
        if (snapCats.exists() && snapCats.data()) window.hotScreensCategories = snapCats.data();
        else window.hotScreensCategories = {};

        // Load Banners (Filter by category)
        const snapBanners = await getDocs(collection(db, 'heroBanners'));
        window.hotScreensBanners = {};
        snapBanners.forEach(d => {
          const b = { id: d.id, ...d.data() };
          const screen = b.category || 'Trending';
          if(!window.hotScreensBanners[screen]) window.hotScreensBanners[screen] = [];
          window.hotScreensBanners[screen].push(b);
        });

        renderHotScreensTabs();
        renderDetailedHotScreen();
      } catch(e) { console.error('Hot screens load err:', e); }
    };

    window.renderHotScreensTabs = function() {
      const container = document.getElementById('hotscreens-tabs');
      if (!container) return;
      container.innerHTML = window.hotScreensTabs.map(tab => `
        <button onclick="setActiveHotScreen('${tab}')" style="white-space:nowrap; cursor:pointer; padding:8px 16px; border-radius:20px; font-size:12px; font-weight:700; border:none; transition:all 0.2s; background:${window.activeHotScreen === tab ? '#8B5CF6' : 'var(--bg-tertiary)'}; color:${window.activeHotScreen === tab ? '#FFF' : 'var(--text-secondary)'}; box-shadow:${window.activeHotScreen === tab ? '0 4px 12px rgba(139,92,246,0.2)' : 'none'};">
          ${tab}
        </button>
      `).join('');
      document.getElementById('hotscreens-active-title').innerText = `Layout for ${window.activeHotScreen}`;
    };

    window.setActiveHotScreen = function(tab) {
      window.activeHotScreen = tab;
      renderHotScreensTabs();
      renderDetailedHotScreen();
    };

    window.renderDetailedHotScreen = function() {
      renderHotBanners();
      renderHotCategories();
      renderHotRows();
    };

    // --- BANNERS ---
    window.updateHotBannerPreviewUI = function(bId, cId) {
      const prevTitle = document.getElementById('hot-hb-preview-title-' + bId);
      const prevSub = document.getElementById('hot-hb-preview-sub-' + bId);
      
      let titleText = 'Banner Title';
      let subText = 'Featured Content';

      if (cId) {
        const attachedDoc = (window.cachedContentDocs || []).find(d => d.id === cId);
        if (attachedDoc && attachedDoc.data) {
           titleText = attachedDoc.data.title || titleText;
           subText = attachedDoc.data.description || subText;
           if (subText.length > 60) subText = subText.substring(0, 60) + '...';
        }
      }

      if (prevTitle) prevTitle.innerText = titleText;
      if (prevSub) prevSub.innerText = subText;
    };

    window.renderHotBanners = function() {
      const container = document.getElementById('hotscreens-banners-editor');
      let banners = window.hotScreensBanners[window.activeHotScreen] || [];
      banners.sort((a,b) => (a.order||0) - (b.order||0));
      
      if(banners.length === 0) {
        container.innerHTML = '<div style="color:var(--text-secondary); font-size:12px; text-align:center; padding:10px;">No hero banners for this screen.</div>';
        return;
      }
      
      let h = '';
      banners.forEach((b, idx) => {
        let contentOpts = '<option value="">-- No Attached Content --</option>';
        (window.cachedContentDocs || []).forEach(c => {
           let sel = (b.contentId === c.id) ? 'selected' : '';
           contentOpts += `<option value="${c.id}" ${sel}>${c.data?.title || c.id}</option>`;
        });

        h += `
          <div style="background:var(--bg-tertiary); padding:16px; border-radius:14px; border:1px solid var(--border-color); display:flex; flex-direction:column; gap:12px; margin-bottom:12px;">
             <!-- LIVE BANNER CARD PREVIEW -->
             <div style="position:relative; width:100%; height:140px; border-radius:10px; overflow:hidden; background:#0B0B0E; border:1px solid var(--border-color); display:flex; align-items:center; justify-content:center;">
               <img id="hot-hb-preview-img-${b.id}" src="${b.imageUrl || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200'}" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200';" style="width:100%; height:100%; object-fit:cover; opacity:0.85; transition:all 0.3s ease;">
               <div style="position:absolute; inset:0; background:linear-gradient(to top, rgba(10,10,12,0.95) 0%, rgba(10,10,12,0.3) 60%, transparent 100%);"></div>
               <div style="position:absolute; top:10px; right:10px; background:rgba(139,92,246,0.9); color:#fff; font-size:10px; font-weight:800; padding:4px 10px; border-radius:20px; text-transform:uppercase; letter-spacing:0.5px; backdrop-filter:blur(4px); display:flex; align-items:center; gap:5px; box-shadow:0 2px 8px rgba(0,0,0,0.4);">
                 <i class="fa-solid fa-eye"></i> Live Image Card Preview
               </div>
               <div style="position:absolute; bottom:12px; left:14px; right:14px; z-index:2; text-shadow:0 2px 4px rgba(0,0,0,0.8);">
                 <div id="hot-hb-preview-title-${b.id}" style="font-weight:800; font-size:16px; color:#ffffff; line-height:1.2;">${b.title || 'Banner Title'}</div>
                 <div id="hot-hb-preview-sub-${b.id}" style="font-size:12px; color:#A1A1AA; font-weight:500; margin-top:2px;">${(b.subtitle || 'Featured Content').substring(0, 60)}</div>
               </div>
             </div>

             <div style="display:flex; justify-content:space-between; align-items:center;">
               <span style="font-weight:800; color:var(--accent-purple); font-size:13px; display:flex; align-items:center; gap:6px;">
                 <i class="fa-solid fa-layer-group"></i> Hero Banner Slot #${idx + 1}
               </span>
               <button class="btn-danger" style="height:32px; padding:0 12px; font-size:11px;" onclick="deleteHotBanner('${b.id}')"><i class="fa-solid fa-trash"></i> Delete Banner</button>
             </div>

             <div style="display:grid; grid-template-columns: 2fr 2fr 80px; gap:10px;">
               <div>
                 <label class="form-label" style="font-size:10px; color:var(--accent-purple);">Main Wide Backdrop Image URL</label>
                 <input type="text" id="hot-hb-img-${b.id}" class="input-control" value="${b.imageUrl || ''}" onchange="updateHotBanner('${b.id}', 'imageUrl', this.value); document.getElementById('hot-hb-preview-img-${b.id}').src=this.value;" placeholder="https://...">
               </div>
               <div>
                 <label class="form-label" style="font-size:10px; color:var(--accent-green);">Attach Content (Mini Poster & Details)</label>
                 <select id="hot-hb-content-${b.id}" class="input-control" onchange="updateHotBanner('${b.id}', 'contentId', this.value); updateHotBannerPreviewUI('${b.id}', this.value);">
                   ${contentOpts}
                 </select>
               </div>
               <div>
                 <label class="form-label" style="font-size:10px;">Order</label>
                 <input type="number" id="hot-hb-order-${b.id}" class="input-control" style="text-align:center;" value="${b.order || (idx + 1)}" onchange="updateHotBanner('${b.id}', 'order', this.value)">
               </div>
             </div>
          </div>
        `;
      });
      container.innerHTML = h;
    };
    
    window.addNewHotBanner = function() {
      if(!window.hotScreensBanners[window.activeHotScreen]) window.hotScreensBanners[window.activeHotScreen] = [];
      const newB = { id: 'banner-' + Date.now(), title: 'New Banner', subtitle: '', imageUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200', category: window.activeHotScreen, order: window.hotScreensBanners[window.activeHotScreen].length + 1 };
      window.hotScreensBanners[window.activeHotScreen].push(newB);
      renderHotBanners();
    };
    
    window.updateHotBanner = function(id, field, val) {
      const banners = window.hotScreensBanners[window.activeHotScreen];
      const idx = banners.findIndex(b => b.id === id);
      if(idx > -1) {
        if(field === 'order') val = parseInt(val) || 1;
        banners[idx][field] = val;

        if (field === 'contentId') {
           const attachedDoc = (window.cachedContentDocs || []).find(d => d.id === val);
           if (attachedDoc && attachedDoc.data) {
               banners[idx].title = attachedDoc.data.title || '';
               banners[idx].subtitle = attachedDoc.data.description || '';
           } else {
               banners[idx].title = '';
               banners[idx].subtitle = '';
           }
        }
      }
    };
    
    window.deleteHotBanner = function(id) {
      if(!confirm('Delete this banner?')) return;
      window.hotScreensBanners[window.activeHotScreen] = window.hotScreensBanners[window.activeHotScreen].filter(b => b.id !== id);
      renderHotBanners();
    };

    // --- CATEGORIES ---
    window.renderHotCategories = function() {
      const container = document.getElementById('hotscreens-categories-editor');
      let cats = window.hotScreensCategories[window.activeHotScreen] || [];
      cats.sort((a,b) => (a.order||0) - (b.order||0));
      
      if(cats.length === 0) {
        container.innerHTML = '<div style="color:var(--text-secondary); font-size:12px; text-align:center; padding:10px;">No categories for this screen. Defaults will show.</div>';
        return;
      }
      
      let h = '';
      cats.forEach((c, idx) => {
        h += `
          <div style="background:var(--bg-secondary); border:1px solid var(--border-color); border-radius:8px; padding:12px; display:flex; gap:12px; align-items:center;">
            <img src="${c.image}" style="width:40px; height:40px; border-radius:50%; object-fit:cover; background:var(--bg-tertiary);">
            <div style="flex:1; display:grid; grid-template-columns: 1fr 1fr; gap:10px;">
              <input type="text" class="input-control" value="${c.name || ''}" onchange="updateHotCategory('${c.id}', 'name', this.value)" placeholder="Category Name" style="font-size:12px; padding:6px;">
              <input type="text" class="input-control" value="${c.image || ''}" onchange="updateHotCategory('${c.id}', 'image', this.value)" placeholder="Image URL" style="font-size:11px; padding:6px;">
            </div>
            <div style="width:60px;">
               <label style="font-size:9px; color:var(--text-tertiary);">Order</label>
               <input type="number" class="input-control" value="${c.order || 1}" onchange="updateHotCategory('${c.id}', 'order', this.value)" style="font-size:11px; padding:4px;">
            </div>
            <button onclick="deleteHotCategory('${c.id}')" style="background:none; border:none; color:var(--accent-red); cursor:pointer;"><i class="fa-solid fa-trash"></i></button>
          </div>
        `;
      });
      container.innerHTML = h;
    };
    
    window.addNewHotCategory = function() {
      if(!window.hotScreensCategories[window.activeHotScreen]) window.hotScreensCategories[window.activeHotScreen] = [];
      const newC = { id: 'cat-' + Date.now(), name: 'New Cat', image: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=300', order: window.hotScreensCategories[window.activeHotScreen].length + 1 };
      window.hotScreensCategories[window.activeHotScreen].push(newC);
      renderHotCategories();
    };
    
    window.updateHotCategory = function(id, field, val) {
      const cats = window.hotScreensCategories[window.activeHotScreen];
      const idx = cats.findIndex(c => c.id === id);
      if(idx > -1) {
        if(field === 'order') val = parseInt(val) || 1;
        cats[idx][field] = val;
      }
      if (field === 'image') renderHotCategories(); // re-render to update img
    };
    
    window.deleteHotCategory = function(id) {
      if(!confirm('Delete this category?')) return;
      window.hotScreensCategories[window.activeHotScreen] = window.hotScreensCategories[window.activeHotScreen].filter(c => c.id !== id);
      renderHotCategories();
    };

    // --- ROWS ---
    window.renderHotRows = function() {
      const container = document.getElementById('hotscreens-editor');
      let rows = window.hotScreensData[window.activeHotScreen] || [];
      rows.sort((a,b) => (a.order||0) - (b.order||0));
      
      if(rows.length === 0) {
        container.innerHTML = `
          <div style="color:var(--text-tertiary); font-size:13px; text-align:center; padding:40px; background:var(--bg-secondary); border:1px dashed var(--border-color); border-radius:14px;">
            <i class="fa-solid fa-layer-group" style="font-size:24px; color:var(--text-tertiary); margin-bottom:10px; display:block;"></i>
            No custom rows configured for <strong>${window.activeHotScreen.toUpperCase()}</strong> tab screen yet.<br>Click "Add New Content Row" above to create one.
          </div>
        `;
        return;
      }
      
      let h = '';
      
      const iconList = [
        { id: '', name: 'Auto (Dynamic)', icon: 'wand-2' },
        { id: 'Sparkles', name: 'Sparkles', icon: 'sparkles' },
        { id: 'Flame', name: 'Flame (Hot)', icon: 'flame' },
        { id: 'Zap', name: 'Zap (New)', icon: 'zap' },
        { id: 'Trophy', name: 'Trophy (Top)', icon: 'trophy' },
        { id: 'Crown', name: 'Crown (Premium)', icon: 'crown' },
        { id: 'Swords', name: 'Swords (Action)', icon: 'swords' },
        { id: 'Smile', name: 'Smile (Comedy)', icon: 'smile' },
        { id: 'Heart', name: 'Heart (Romance)', icon: 'heart' },
        { id: 'Ghost', name: 'Ghost (Horror)', icon: 'ghost' },
        { id: 'Rocket', name: 'Rocket (Sci-Fi)', icon: 'rocket' },
        { id: 'Map', name: 'Map (Adventure)', icon: 'map' },
        { id: 'Gamepad2', name: 'Gamepad (Gaming)', icon: 'gamepad-2' },
        { id: 'Tv', name: 'TV', icon: 'tv' },
        { id: 'Clapperboard', name: 'Clapperboard', icon: 'clapperboard' },
        { id: 'Film', name: 'Film', icon: 'film' },
        { id: 'PlayCircle', name: 'Play Circle', icon: 'play-circle' },
        { id: 'PlaySquare', name: 'Play Square', icon: 'play-square' },
        { id: 'Clock', name: 'Clock (Recent)', icon: 'clock' },
        { id: 'Compass', name: 'Compass (Explore)', icon: 'compass' },
        { id: 'Star', name: 'Star', icon: 'star' }
      ];

      rows.forEach((row, idx) => {
        const isCustomPick = row.mode === 'custom_pick';
        
        // Style name helper
        const styleNames = {
          'default': 'Default Cards',
          'three_column': 'Three Column Mode',
          'network_grid': 'Networks & Studios Grid',
          'seasonal_card': 'Seasonal Wide Card',
          'classic_anime': 'Classic Portrait',
          'landscape_text': 'Landscape + Text'
        };
        const styleBadges = {
          'default': '<span style="background:rgba(139,92,246,0.15); color:#A78BFA; border:1px solid rgba(139,92,246,0.3); font-size:10px; font-weight:700; padding:3px 8px; border-radius:6px;"><i class="fa-solid fa-rectangle-ad"></i> Default Cards</span>',
          'three_column': '<span style="background:rgba(168,85,247,0.2); color:#C084FC; border:1px solid rgba(168,85,247,0.4); font-size:10px; font-weight:800; padding:3px 8px; border-radius:6px;"><i class="fa-solid fa-table-cells"></i> Three Column Mode</span>',
          'network_grid': '<span style="background:rgba(6,182,212,0.2); color:#22D3EE; border:1px solid rgba(6,182,212,0.4); font-size:10px; font-weight:800; padding:3px 8px; border-radius:6px;"><i class="fa-solid fa-tv"></i> Networks Hub (Squircles)</span>',
          'seasonal_card': '<span style="background:rgba(6,182,212,0.15); color:#38BDF8; border:1px solid rgba(6,182,212,0.3); font-size:10px; font-weight:700; padding:3px 8px; border-radius:6px;"><i class="fa-solid fa-square-full"></i> Seasonal Wide</span>',
          'classic_anime': '<span style="background:rgba(244,63,94,0.15); color:#FB7185; border:1px solid rgba(244,63,94,0.3); font-size:10px; font-weight:700; padding:3px 8px; border-radius:6px;"><i class="fa-solid fa-image"></i> Classic Portrait</span>',
          'landscape_text': '<span style="background:rgba(245,158,11,0.15); color:#FBBF24; border:1px solid rgba(245,158,11,0.3); font-size:10px; font-weight:700; padding:3px 8px; border-radius:6px;"><i class="fa-solid fa-film"></i> Landscape + Text</span>'
        };

        h += `
          <div style="background:var(--bg-secondary); border:1px solid var(--border-color); border-radius:16px; padding:20px; box-shadow:0 8px 24px rgba(0,0,0,0.25); transition:all 0.2s;" onmouseover="this.style.borderColor='rgba(139,92,246,0.4)'" onmouseout="this.style.borderColor='var(--border-color)'">
            
            <!-- ROW TOP BAR -->
            <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:16px; border-bottom:1px solid var(--border-color); padding-bottom:12px;">
              <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
                <span style="background:linear-gradient(135deg, #8B5CF6, #06B6D4); color:#FFF; font-weight:900; font-size:12px; padding:4px 10px; border-radius:8px; box-shadow:0 2px 8px rgba(139,92,246,0.3);">
                  #${idx + 1}
                </span>
                <span style="font-weight:800; font-size:15px; color:#FFF;">${row.title || 'Untitled Row'}</span>
                ${styleBadges[row.style] || styleBadges['default']}
                ${isCustomPick 
                  ? `<span style="background:rgba(16,185,129,0.15); color:#34D399; border:1px solid rgba(16,185,129,0.3); font-size:10px; font-weight:700; padding:3px 8px; border-radius:6px;"><i class="fa-solid fa-hand-pointer"></i> Custom Pick</span>`
                  : `<span style="background:rgba(234,179,8,0.15); color:#FACC15; border:1px solid rgba(234,179,8,0.3); font-size:10px; font-weight:700; padding:3px 8px; border-radius:6px;"><i class="fa-solid fa-filter"></i> Tag: ${row.tagFilter || 'All'}</span>`
                }
              </div>

              <!-- ACTION BUTTONS -->
              <div style="display:flex; align-items:center; gap:8px;">
                <button ${idx===0 ? 'disabled style="opacity:0.3; cursor:not-allowed;"':''} onclick="moveHotRow('${row.id}', 'up')" class="btn-secondary" style="height:32px; width:32px; padding:0; display:flex; align-items:center; justify-content:center; border-radius:8px; cursor:pointer;" title="Move Up">
                  <i class="fa-solid fa-arrow-up" style="font-size:11px;"></i>
                </button>
                <button ${idx===rows.length-1 ? 'disabled style="opacity:0.3; cursor:not-allowed;"':''} onclick="moveHotRow('${row.id}', 'down')" class="btn-secondary" style="height:32px; width:32px; padding:0; display:flex; align-items:center; justify-content:center; border-radius:8px; cursor:pointer;" title="Move Down">
                  <i class="fa-solid fa-arrow-down" style="font-size:11px;"></i>
                </button>
                <button onclick="deleteHotRow('${row.id}')" class="btn-danger" style="height:32px; padding:0 12px; display:flex; align-items:center; gap:6px; font-size:12px; border-radius:8px; cursor:pointer;" title="Delete Row">
                  <i class="fa-solid fa-trash"></i> Delete
                </button>
              </div>
            </div>
            
            <!-- ROW CONFIG FORM GRID -->
            <div style="display:grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap:14px; margin-bottom:16px;">
              <div>
                <label style="display:block; font-size:10px; font-weight:800; color:var(--text-tertiary); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px;">Row Title</label>
                <input type="text" class="input-control" value="${row.title || ''}" onchange="updateHotRow('${row.id}', 'title', this.value)" placeholder="Row Title...">
              </div>
              <div style="grid-column: 1 / -1;">
                <label style="display:block; font-size:10px; font-weight:800; color:var(--text-tertiary); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px;">Row Icon</label>
                <div style="display:flex; gap:8px; overflow-x:auto; padding-bottom:8px; scrollbar-width:thin; scrollbar-color:var(--border-color) transparent;">
                  ${iconList.map(ic => {
                    const isSelected = (row.icon || '') === ic.id;
                    return `
                      <div
                        onclick="updateHotRow('${row.id}', 'icon', '${ic.id}')"
                        title="${ic.name}"
                        style="flex-shrink:0; width:44px; height:44px; border-radius:10px; border:2px solid ${isSelected ? 'var(--accent-purple)' : 'var(--border-color)'}; background:${isSelected ? 'rgba(139,92,246,0.15)' : 'var(--bg-secondary)'}; color:${isSelected ? '#FFF' : 'var(--text-secondary)'}; display:flex; align-items:center; justify-content:center; cursor:pointer; transition:all 0.2s;"
                        onmouseover="this.style.borderColor='var(--accent-purple)'; this.style.color='#FFF'"
                        onmouseout="if(!${isSelected}) { this.style.borderColor='var(--border-color)'; this.style.color='var(--text-secondary)'; }"
                      >
                        <i data-lucide="${ic.icon}" style="width:20px; height:20px;"></i>
                      </div>
                    `;
                  }).join('')}
                </div>
              </div>
              <div>
                <label style="display:block; font-size:10px; font-weight:800; color:var(--text-tertiary); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px;">Card Style Layout</label>
                <select class="input-control" onchange="updateHotRow('${row.id}', 'style', this.value)">
                  <option value="default" ${row.style === 'default' ? 'selected':''}>Default Cards (Horizontal Scroll)</option>
                  <option value="three_column" ${row.style === 'three_column' ? 'selected':''}>Three Column Mode (3 Cards Per Row)</option>
                  <option value="network_grid" ${row.style === 'network_grid' ? 'selected':''}>Network Grid (Logo Squircles)</option>
                  <option value="seasonal_card" ${row.style === 'seasonal_card' ? 'selected':''}>Seasonal Wide Card</option>
                  <option value="classic_anime" ${row.style === 'classic_anime' ? 'selected':''}>Classic Portrait</option>
                  <option value="landscape_text" ${row.style === 'landscape_text' ? 'selected':''}>Landscape + Text</option>
                </select>
              </div>
              <div>
                <label style="display:block; font-size:10px; font-weight:800; color:var(--text-tertiary); text-transform:uppercase; letter-spacing:0.5px; margin-bottom:6px;">Content Mode</label>
                <select class="input-control" onchange="updateHotRow('${row.id}', 'mode', this.value)">
                  <option value="tag" ${!isCustomPick ? 'selected':''}>Dynamic (Auto-fetch by Category / Tag)</option>
                  <option value="custom_pick" ${isCustomPick ? 'selected':''}>Custom Pick (Manual Select Cards)</option>
                </select>
              </div>
            </div>

            ${row.style === 'network_grid' ? `
              <!-- NETWORK GRID SPECIAL CONFIG & HUB -->
              <div style="background:linear-gradient(135deg, rgba(6,182,212,0.12), rgba(139,92,246,0.12)); border:1px solid rgba(6,182,212,0.35); border-radius:14px; padding:16px; margin-bottom:14px;">
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:12px;">
                  <div>
                    <div style="display:flex; align-items:center; gap:8px;">
                      <span style="background:linear-gradient(135deg, #06B6D4, #8B5CF6); color:#FFF; font-size:11px; font-weight:900; padding:3px 8px; border-radius:6px;">
                        <i class="fa-solid fa-tv"></i> NETWORK SQUIRCLE GRID
                      </span>
                      <span style="font-size:13px; font-weight:800; color:#FFF;">Official Channels & Studios Hub</span>
                    </div>
                    <p style="font-size:11px; color:#D4D4D8; line-height:1.4; margin:4px 0 0 0;">
                      Each card displays a brand squircle logo. In client app, clicking opens a dedicated Hub with <strong>All, Movies, Series</strong> tabs.
                    </p>
                  </div>

                  <div style="display:flex; align-items:center; gap:8px;">
                    <button type="button" onclick="quickImportNetworkPresets('${row.id}')" class="btn-secondary" style="background:rgba(255,255,255,0.08); border:1px solid rgba(255,255,255,0.2); color:#FFF; font-size:11px; font-weight:700; padding:7px 12px; border-radius:8px; cursor:pointer; display:flex; align-items:center; gap:6px;">
                      <i class="fa-solid fa-bolt" style="color:#F59E0B;"></i> Quick Import Presets
                    </button>
                    <button type="button" onclick="openNetworkModal('${row.id}')" class="btn-primary" style="background:linear-gradient(135deg, #06B6D4, #8B5CF6); color:#FFF; font-size:11px; font-weight:800; padding:7px 14px; border-radius:8px; border:none; cursor:pointer; display:flex; align-items:center; gap:6px; box-shadow:0 4px 12px rgba(6,182,212,0.3);">
                      <i class="fa-solid fa-plus"></i> Add Network
                    </button>
                  </div>
                </div>

                <!-- SQUIRCLE NETWORKS PREVIEW GRID -->
                <div style="display:grid; grid-template-columns:repeat(auto-fill, minmax(135px, 1fr)); gap:12px; margin-top:12px;">
                  ${(row.contentIds && row.contentIds.length > 0) ? row.contentIds.map((net, nIdx) => {
                    const netName = net.name || net.customTitle || 'Network';
                    const netLogo = net.logoUrl || net.customImage || 'https://via.placeholder.com/150';
                    const itemCount = (net.contentIds || net.collectionIds || []).length;

                    return `
                      <div style="position:relative; background:#121218; border:1px solid rgba(255,255,255,0.12); border-radius:14px; padding:10px; display:flex; flex-direction:column; align-items:center; gap:6px; box-shadow:0 4px 12px rgba(0,0,0,0.4); text-align:center;">
                        <div style="width:52px; height:52px; border-radius:14px; background:#1C1C24; border:1px solid rgba(255,255,255,0.15); display:flex; align-items:center; justify-content:center; overflow:hidden; padding:4px;">
                          <img src="${netLogo}" style="max-width:100%; max-height:100%; object-fit:contain;" onerror="this.src='https://via.placeholder.com/60'">
                        </div>
                        <span style="font-size:11px; font-weight:800; color:#FFF; width:100%; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${netName}</span>
                        <span style="font-size:9px; font-weight:700; color:#06B6D4; background:rgba(6,182,212,0.15); padding:1px 6px; border-radius:6px;">
                          ${itemCount > 0 ? (itemCount + ' Titles') : 'Dynamic Tag'}
                        </span>

                        <!-- Actions -->
                        <div style="display:flex; justify-content:center; align-items:center; gap:4px; margin-top:4px; width:100%; border-top:1px solid rgba(255,255,255,0.08); padding-top:6px;">
                          <button type="button" onclick="moveHotRowItem('${row.id}', ${nIdx}, -1)" style="background:none; border:none; color:#AAA; cursor:pointer; font-size:10px; padding:2px 4px;" title="Move Left"><i class="fa-solid fa-caret-left"></i></button>
                          <button type="button" onclick="openNetworkModal('${row.id}', ${nIdx})" style="background:rgba(139,92,246,0.3); border:1px solid rgba(139,92,246,0.5); color:#C084FC; font-size:10px; font-weight:700; padding:2px 8px; border-radius:4px; cursor:pointer;" title="Edit Network & Select Content"><i class="fa-solid fa-pen"></i> Edit</button>
                          <button type="button" onclick="removeHotRowItem('${row.id}', '${net.id}')" style="background:none; border:none; color:#F43F5E; cursor:pointer; font-size:10px; padding:2px 4px;" title="Delete Network"><i class="fa-solid fa-trash"></i></button>
                          <button type="button" onclick="moveHotRowItem('${row.id}', ${nIdx}, 1)" style="background:none; border:none; color:#AAA; cursor:pointer; font-size:10px; padding:2px 4px;" title="Move Right"><i class="fa-solid fa-caret-right"></i></button>
                        </div>
                      </div>
                    `;
                  }).join('') : `
                    <div style="grid-column:1/-1; text-align:center; padding:24px; color:#A1A1AA; font-size:12px; background:rgba(0,0,0,0.2); border-radius:10px; border:1px dashed rgba(255,255,255,0.1);">
                      <i class="fa-solid fa-tv" style="font-size:24px; margin-bottom:8px; display:block; opacity:0.5;"></i>
                      No custom networks added yet. Click <strong>"Quick Import Presets"</strong> or <strong>"+ Add Network"</strong> above to configure Disney, Sony, Netflix, Hungama, etc.
                    </div>
                  `}
                </div>
              </div>
            ` : ''}

            ${row.style === 'three_column' ? `
              <!-- THREE COLUMN MODE SPECIAL CONFIG & HELPER -->
              <div style="background:linear-gradient(135deg, rgba(139,92,246,0.12), rgba(6,182,212,0.08)); border:1px solid rgba(139,92,246,0.35); border-radius:12px; padding:14px; margin-bottom:14px;">
                <div style="display:flex; align-items:center; gap:8px; margin-bottom:6px;">
                  <span style="background:linear-gradient(135deg, #8B5CF6, #06B6D4); color:#FFF; font-size:10px; font-weight:900; padding:2px 8px; border-radius:6px;">
                    <i class="fa-solid fa-table-cells"></i> 3-COL VERTICAL GRID
                  </span>
                  <span style="font-size:12px; font-weight:800; color:#FFF;">Three Column Mode Active</span>
                </div>
                <p style="font-size:11px; color:#D4D4D8; line-height:1.4; margin:0 0 10px 0;">
                  In client app, this section displays a clean row header and renders cards directly in <strong>3 columns (3 cards per row)</strong> flowing downwards with <strong>no horizontal scroll</strong>. The targeted category content (e.g., <em>Movie, Anime, TV, etc.</em>) set below will load automatically.
                </p>
              </div>
            ` : ''}
            
            <!-- TARGET CATEGORY FILTER FOR THREE COLUMN MODE & DYNAMIC FILTERING -->
            <div style="background:var(--bg-tertiary); border:1px solid var(--border-color); border-radius:12px; padding:14px; margin-bottom:14px;">
              <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; flex-wrap:wrap; gap:8px;">
                <label style="display:flex; align-items:center; gap:6px; font-size:11px; font-weight:800; color:#FFF;">
                  <i class="fa-solid fa-filter" style="color:#8B5CF6;"></i>
                  <span>Target Content Category / Genre / Tag (e.g. Movie, Anime, TV, Action, All)</span>
                </label>
                <span style="font-size:10px; color:#A1A1AA;">Targeted content will automatically load in this row</span>
              </div>
              <div style="display:flex; gap:10px; align-items:center; margin-bottom:10px;">
                <input type="text" class="input-control" value="${row.tagFilter || ''}" onchange="updateHotRow('${row.id}', 'tagFilter', this.value)" placeholder="e.g. Anime, Movie, TV, Short TV, Action, Romance, All...">
              </div>
              <div style="display:flex; align-items:center; gap:6px; flex-wrap:wrap;">
                <span style="font-size:10px; font-weight:700; color:#71717A; min-width:54px;">Quick Select:</span>
                ${['Anime', 'Movie', 'TV', 'Short TV', 'Action', 'Romance', 'Comedy', 'Drama', 'Sci-Fi', 'Horror', 'Hindi Dubbed', 'All'].map(pill => {
                  const isAct = (row.tagFilter || '').toLowerCase() === pill.toLowerCase();
                  return `
                    <button
                      type="button"
                      class="btn-secondary"
                      style="height:26px; padding:0 10px; font-size:11px; font-weight:600; border-radius:8px; cursor:pointer; transition:all 0.15s ease; ${
                        isAct
                          ? 'background:rgba(139, 92, 246, 0.25); border:1px solid #8B5CF6; color:#FFF; box-shadow:0 0 8px rgba(139, 92, 246, 0.3);'
                          : 'background:var(--bg-secondary); border:1px solid var(--border-color); color:#A1A1AA;'
                      }"
                      onclick="updateHotRow('${row.id}', 'tagFilter', '${pill}')"
                    >
                      ${pill}
                    </button>
                  `;
                }).join('')}
              </div>
            </div>

            ${isCustomPick ? `
              <div style="background:var(--bg-tertiary); border:1px solid var(--border-color); border-radius:12px; padding:16px;">
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px; margin-bottom:12px;">
                  <div style="display:flex; align-items:center; gap:8px;">
                    <span style="font-size:12px; font-weight:800; color:#FFF;">Selected Content Items</span>
                    <span style="background:rgba(139,92,246,0.2); color:#A78BFA; font-size:11px; font-weight:800; padding:2px 8px; border-radius:12px; border:1px solid rgba(139,92,246,0.3);">
                      ${(row.contentIds || []).length} Items
                    </span>
                  </div>
                  <button class="btn-primary" onclick="openMultiContentSelector('${row.id}')" style="background:linear-gradient(135deg, #06B6D4, #3B82F6); color:#FFF; font-size:11px; font-weight:700; padding:6px 14px; border-radius:8px; border:none; cursor:pointer; display:flex; align-items:center; gap:6px;">
                    <i class="fa-solid fa-list-check"></i> Select / Manage Items
                  </button>
                </div>

                <!-- HORIZONTAL ITEMS SCROLLER WITH REALTIME CARD STYLE PREVIEWS -->
                <div style="display:flex; gap:14px; overflow-x:auto; padding-bottom:12px; margin-top:10px; scrollbar-width:thin; scrollbar-color:rgba(255,255,255,0.2) transparent;">
                  ${(row.contentIds || []).map((cObj, i) => {
                    const cId = typeof cObj === 'string' ? cObj : cObj.id;
                    const cImg = typeof cObj === 'object' ? cObj.customImage : undefined;
                    const cTitle = typeof cObj === 'object' ? cObj.customTitle : undefined;
                    let docItem = window.cachedContentDocs.find(d => d.id === cId);
                    if (!docItem && typeof cObj === 'object' && cObj.isCollection) {
                      docItem = {
                        id: cId,
                        data: {
                          title: cObj.customTitle || 'Collection',
                          posterUrl: cObj.customImage,
                          backdropUrl: cObj.backdropImage
                        }
                      };
                    }
                    if(!docItem) return '';

                    const isSeasonal = (row.style === 'seasonal_card');
                    const isLandscapeText = (row.style === 'landscape_text' || row.style === 'landscape');
                    const isClassicAnime = (row.style === 'classic_anime');

                    let displayImg = cImg || docItem.data.posterUrl;
                    if (isSeasonal || isLandscapeText) {
                      displayImg = cImg || docItem.data.backdropUrl || docItem.data.posterUrl;
                    }
                    const displayTitle = cTitle || docItem.data.title;

                    // 1. SEASONAL WIDE CARD PREVIEW
                    if (isSeasonal) {
                      return `
                        <div style="position:relative; width:240px; height:125px; flex-shrink:0; background:#000; border:1px solid rgba(255,255,255,0.18); border-radius:12px; overflow:hidden; display:flex; flex-direction:column; box-shadow:0 8px 20px rgba(0,0,0,0.4); transition:all 0.2s;" onmouseover="this.style.borderColor='rgba(139,92,246,0.6)'" onmouseout="this.style.borderColor='rgba(255,255,255,0.18)'">
                          <!-- Wide Backdrop Image -->
                          <img src="${displayImg}" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover;" onerror="this.src='https://via.placeholder.com/240x125'">
                          <!-- Dark Gradient -->
                          <div style="position:absolute; inset:0; background:linear-gradient(to right, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 60%, transparent 100%);"></div>

                          <!-- Inner Content Flex: Left Poster Card & Right Info -->
                          <div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:space-between; padding:8px 10px; bottom:26px;">
                            <!-- Floating Portrait Poster Card -->
                            <div style="width:58px; height:78px; flex-shrink:0; border-radius:8px; overflow:hidden; border:1.5px solid rgba(255,255,255,0.35); box-shadow:0 6px 14px rgba(0,0,0,0.8); background:#121212;">
                              <img src="${docItem.data.posterUrl || ''}" style="width:100%; height:100%; object-fit:cover;" onerror="this.src='https://via.placeholder.com/60x80'">
                            </div>

                            <!-- Right Info -->
                            <div style="flex:1; margin-left:10px; display:flex; flex-direction:column; align-items:flex-end; text-align:right;">
                              <span style="background:rgba(255,255,255,0.18); backdrop-filter:blur(4px); border:1px solid rgba(255,255,255,0.25); color:#FFF; font-size:8px; font-weight:900; padding:2px 7px; border-radius:10px; text-transform:uppercase;">
                                ${row.tagFilter || 'HOT LIST'}
                              </span>
                              <h4 style="font-size:11px; font-weight:800; color:#FFF; margin-top:4px; text-shadow:0 2px 4px rgba(0,0,0,0.9); line-height:1.2; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">
                                ${displayTitle}
                              </h4>
                            </div>
                          </div>

                          <!-- Custom Override Indicators -->
                          ${cImg ? `
                            <span style="position:absolute; top:4px; right:4px; background:rgba(16,185,129,0.95); backdrop-filter:blur(4px); color:#FFF; font-size:7px; font-weight:900; padding:2px 5px; border-radius:4px; border:1px solid rgba(255,255,255,0.3);" title="Custom Image Active">
                              <i class="fa-solid fa-image"></i> BG OVERRIDE
                            </span>
                          ` : ''}
                          ${cTitle ? `
                            <span style="position:absolute; top:4px; left:4px; background:rgba(6,182,212,0.95); backdrop-filter:blur(4px); color:#FFF; font-size:7px; font-weight:900; padding:2px 5px; border-radius:4px; border:1px solid rgba(255,255,255,0.3);" title="Custom Title Active">
                              <i class="fa-solid fa-pen-nib"></i> TITLE
                            </span>
                          ` : ''}

                          <!-- Bottom Controls -->
                          <div style="position:absolute; bottom:0; inset-x:0; display:flex; justify-content:space-between; align-items:center; padding:3px 6px; background:rgba(0,0,0,0.75); backdrop-filter:blur(4px); border-top:1px solid rgba(255,255,255,0.12);">
                            <button type="button" onclick="moveHotRowItem('${row.id}', ${i}, -1)" style="background:none; border:none; color:#FFF; cursor:pointer; padding:2px 6px;" title="Move Left"><i class="fa-solid fa-caret-left"></i></button>
                            <button type="button" onclick="openHotRowItemEditModal('${row.id}', ${i})" style="background:rgba(139,92,246,0.35); border:1px solid rgba(139,92,246,0.6); color:#A78BFA; border-radius:4px; font-size:10px; font-weight:800; cursor:pointer; padding:2px 8px; display:flex; align-items:center; gap:4px;" title="Customize Image/Title"><i class="fa-solid fa-pen"></i> Edit</button>
                            <button type="button" onclick="removeHotRowItem('${row.id}', '${cId}')" style="background:none; border:none; color:#F43F5E; cursor:pointer; padding:2px 6px;" title="Remove Item"><i class="fa-solid fa-trash"></i></button>
                            <button type="button" onclick="moveHotRowItem('${row.id}', ${i}, 1)" style="background:none; border:none; color:#FFF; cursor:pointer; padding:2px 6px;" title="Move Right"><i class="fa-solid fa-caret-right"></i></button>
                          </div>
                        </div>
                      `;
                    } else if (isLandscapeText) {
                      // 2. LANDSCAPE + TEXT PREVIEW
                      return `
                        <div style="position:relative; width:190px; height:120px; flex-shrink:0; background:#000; border:1px solid rgba(255,255,255,0.15); border-radius:12px; overflow:hidden; display:flex; flex-direction:column; box-shadow:0 6px 16px rgba(0,0,0,0.4); transition:all 0.2s;" onmouseover="this.style.borderColor='rgba(245,158,11,0.6)'" onmouseout="this.style.borderColor='rgba(255,255,255,0.15)'">
                          <img src="${displayImg}" style="width:100%; height:100%; object-fit:cover;" onerror="this.src='https://via.placeholder.com/190x120'">
                          
                          ${cImg ? `
                            <span style="position:absolute; top:4px; right:4px; background:rgba(16,185,129,0.95); color:#FFF; font-size:7px; font-weight:900; padding:2px 5px; border-radius:4px;"><i class="fa-solid fa-image"></i> CUSTOM</span>
                          ` : ''}

                          <div style="position:absolute; inset-x:0; bottom:25px; padding:5px 8px; background:rgba(0,0,0,0.65); backdrop-filter:blur(6px); border-top:1px solid rgba(255,255,255,0.12); text-align:center;">
                            <h4 style="font-size:10px; font-weight:800; color:#FFF; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${displayTitle}</h4>
                          </div>

                          <div style="position:absolute; bottom:0; inset-x:0; display:flex; justify-content:space-between; align-items:center; padding:3px 6px; background:rgba(0,0,0,0.85); border-top:1px solid rgba(255,255,255,0.12);">
                            <button type="button" onclick="moveHotRowItem('${row.id}', ${i}, -1)" style="background:none; border:none; color:#FFF; cursor:pointer; padding:2px 6px;" title="Move Left"><i class="fa-solid fa-caret-left"></i></button>
                            <button type="button" onclick="openHotRowItemEditModal('${row.id}', ${i})" style="background:rgba(245,158,11,0.3); border:1px solid rgba(245,158,11,0.5); color:#FBBF24; border-radius:4px; font-size:10px; font-weight:800; cursor:pointer; padding:2px 8px;" title="Edit Image/Title"><i class="fa-solid fa-pen"></i> Edit</button>
                            <button type="button" onclick="removeHotRowItem('${row.id}', '${cId}')" style="background:none; border:none; color:#F43F5E; cursor:pointer; padding:2px 6px;" title="Remove Item"><i class="fa-solid fa-trash"></i></button>
                            <button type="button" onclick="moveHotRowItem('${row.id}', ${i}, 1)" style="background:none; border:none; color:#FFF; cursor:pointer; padding:2px 6px;" title="Move Right"><i class="fa-solid fa-caret-right"></i></button>
                          </div>
                        </div>
                      `;
                    } else if (isClassicAnime) {
                      // 3. CLASSIC PORTRAIT PREVIEW
                      return `
                        <div style="width:100px; flex-shrink:0; display:flex; flex-direction:column; transition:all 0.2s;">
                          <div style="position:relative; width:90px; aspect-ratio:3/4; background:#1a1a1a; border:1px solid rgba(255,255,255,0.15); border-radius:8px; overflow:hidden; display:flex; flex-direction:column; box-shadow:0 4px 12px rgba(0,0,0,0.4);" onmouseover="this.style.borderColor='rgba(244,63,94,0.6)'" onmouseout="this.style.borderColor='rgba(255,255,255,0.15)'">
                            <img src="${displayImg}" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover;">
                            
                            ${cImg ? `
                              <span style="position:absolute; top:4px; right:4px; background:rgba(16,185,129,0.95); color:#FFF; font-size:7px; font-weight:900; padding:2px 5px; border-radius:4px;"><i class="fa-solid fa-image"></i> CUSTOM</span>
                            ` : ''}

                            <div style="position:absolute; bottom:0; inset-x:0; display:flex; justify-content:space-between; align-items:center; padding:3px 6px; background:rgba(0,0,0,0.85); border-top:1px solid rgba(255,255,255,0.12);">
                              <button type="button" onclick="moveHotRowItem('${row.id}', ${i}, -1)" style="background:none; border:none; color:#FFF; cursor:pointer; padding:2px 4px;" title="Move Left"><i class="fa-solid fa-caret-left"></i></button>
                              <button type="button" onclick="openHotRowItemEditModal('${row.id}', ${i})" style="background:rgba(244,63,94,0.3); border:1px solid rgba(244,63,94,0.5); color:#FB7185; border-radius:4px; font-size:9px; font-weight:800; cursor:pointer; padding:2px 6px;" title="Edit Image/Title"><i class="fa-solid fa-pen"></i></button>
                              <button type="button" onclick="removeHotRowItem('${row.id}', '${cId}')" style="background:none; border:none; color:#F43F5E; cursor:pointer; padding:2px 4px;" title="Remove Item"><i class="fa-solid fa-trash"></i></button>
                              <button type="button" onclick="moveHotRowItem('${row.id}', ${i}, 1)" style="background:none; border:none; color:#FFF; cursor:pointer; padding:2px 4px;" title="Move Right"><i class="fa-solid fa-caret-right"></i></button>
                            </div>
                          </div>
                          <div style="margin-top:8px; text-align:left; width:90px;">
                            <h4 style="font-size:11px; font-weight:500; color:#FFF; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin:0;">${displayTitle}</h4>
                          </div>
                        </div>
                      `;
                    } else {
                      // 4. DEFAULT CARD PREVIEW
                      return `
                        <div style="position:relative; width:110px; flex-shrink:0; background:var(--bg-secondary); border:1px solid var(--border-color); border-radius:10px; overflow:hidden; display:flex; flex-direction:column; box-shadow:0 4px 12px rgba(0,0,0,0.3); transition:all 0.2s;">
                          <div style="position:relative; width:100%; height:135px; background:#0f0f15; overflow:hidden;">
                            <img src="${displayImg}" style="width:100%; height:100%; object-fit:cover;" onerror="this.src='https://via.placeholder.com/150x200'">
                            
                            ${cImg ? `
                              <span style="position:absolute; top:4px; right:4px; background:rgba(16,185,129,0.9); backdrop-filter:blur(4px); color:#FFF; font-size:8px; font-weight:900; padding:2px 5px; border-radius:4px; border:1px solid rgba(255,255,255,0.3);" title="Custom Image Active">
                                <i class="fa-solid fa-image"></i> CUSTOM
                              </span>
                            ` : ''}

                            ${cTitle ? `
                              <span style="position:absolute; top:4px; left:4px; background:rgba(6,182,212,0.9); backdrop-filter:blur(4px); color:#FFF; font-size:8px; font-weight:900; padding:2px 5px; border-radius:4px; border:1px solid rgba(255,255,255,0.3);" title="Custom Title Active">
                                <i class="fa-solid fa-pen-nib"></i> TITLE
                              </span>
                            ` : ''}
                          </div>

                          <div style="padding:6px; font-size:10px; font-weight:700; color:var(--text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis; background:var(--bg-secondary);" title="${displayTitle}">
                            ${displayTitle}
                          </div>

                          <div style="display:flex; justify-content:space-between; align-items:center; padding:4px 6px; background:rgba(0,0,0,0.3); border-top:1px solid var(--border-color); margin-top:auto;">
                            <button type="button" onclick="moveHotRowItem('${row.id}', ${i}, -1)" style="background:none; border:none; color:var(--text-secondary); cursor:pointer; padding:4px 6px;" title="Move Left"><i class="fa-solid fa-caret-left"></i></button>
                            <button type="button" onclick="openHotRowItemEditModal('${row.id}', ${i})" style="background:none; border:none; color:var(--accent-purple); cursor:pointer; padding:4px 6px;" title="Customize Image & Title"><i class="fa-solid fa-pen"></i></button>
                            <button type="button" onclick="removeHotRowItem('${row.id}', '${cId}')" style="background:none; border:none; color:var(--accent-red); cursor:pointer; padding:4px 6px;" title="Remove Item"><i class="fa-solid fa-trash"></i></button>
                            <button type="button" onclick="moveHotRowItem('${row.id}', ${i}, 1)" style="background:none; border:none; color:var(--text-secondary); cursor:pointer; padding:4px 6px;" title="Move Right"><i class="fa-solid fa-caret-right"></i></button>
                          </div>
                        </div>
                      `;
                    }
                  }).join('')}

                  <div onclick="openMultiContentSelector('${row.id}')" style="width:110px; min-height:160px; flex-shrink:0; border:2px dashed rgba(139,92,246,0.4); border-radius:10px; display:flex; flex-direction:column; align-items:center; justify-content:center; cursor:pointer; color:var(--accent-purple); background:rgba(139,92,246,0.05); transition:all 0.2s;" onmouseover="this.style.background='rgba(139,92,246,0.15)'; this.style.borderColor='rgba(139,92,246,0.8)';" onmouseout="this.style.background='rgba(139,92,246,0.05)'; this.style.borderColor='rgba(139,92,246,0.4)';">
                    <i class="fa-solid fa-circle-plus" style="font-size:24px; margin-bottom:8px;"></i>
                    <span style="font-size:11px; font-weight:800; text-align:center;">Add Items</span>
                  </div>
                </div>
              </div>
            ` : ''}
          </div>
        `;
      });
      container.innerHTML = h;
      if (window.lucide) {
        window.lucide.createIcons();
      }
    };

    window.addNewHotRow = function() {
      if(!window.hotScreensData[window.activeHotScreen]) window.hotScreensData[window.activeHotScreen] = [];
      const newR = { id: 'row-' + Date.now(), title: 'New Custom Row', style: 'default', mode: 'tag', tagFilter: window.activeHotScreen, contentIds: [], order: window.hotScreensData[window.activeHotScreen].length + 1 };
      window.hotScreensData[window.activeHotScreen].push(newR);
      renderHotRows();
    };

    window.updateHotRow = function(id, field, val) {
      const rows = window.hotScreensData[window.activeHotScreen];
      const idx = rows.findIndex(r => r.id === id);
      if(idx > -1) {
        rows[idx][field] = val;
        renderHotRows();
      }
    };
    
    window.deleteHotRow = function(id) {
      if(!confirm('Delete this row?')) return;
      window.hotScreensData[window.activeHotScreen] = window.hotScreensData[window.activeHotScreen].filter(r => r.id !== id);
      renderHotRows();
    };
    
    window.moveHotRow = function(id, dir) {
      const rows = window.hotScreensData[window.activeHotScreen];
      const idx = rows.findIndex(r => r.id === id);
      if(idx === -1) return;
      
      const targetIdx = dir === 'up' ? idx - 1 : idx + 1;
      if (targetIdx < 0 || targetIdx >= rows.length) return;
      
      const temp = rows[idx];
      rows[idx] = rows[targetIdx];
      rows[targetIdx] = temp;
      
      rows.forEach((r, i) => { r.order = i + 1; });
      renderHotRows();
    };

    window.openMultiContentSelector = function(rowId) {
      const rows = window.hotScreensData[window.activeHotScreen] || [];
      const row = rows.find(r => r.id === rowId);
      const actionBar = document.getElementById('multi-content-selector-action-bar');
      if (actionBar) {
        if (row && (row.style === 'classic_anime' || row.style === 'landscape_text' || row.style === 'landscape' || row.style === 'seasonal_card' || row.style === 'seasonal_card')) {
          actionBar.style.display = 'flex';
          const textSpan = actionBar.querySelector('span');
          if (textSpan) {
             textSpan.textContent = row.style === 'classic_anime' ? 'Classic Portrait Layout - You can group multiple items into a single card' : (row.style === 'seasonal_card' ? 'Seasonal Wide Card - Requires Collection Cards' : 'Landscape Text Layout - Requires Collection Cards');
          }
        } else {
          actionBar.style.display = 'none';
        }
      }
      window.currentMultiSelectRowId = rowId;
      document.getElementById('multi-content-selector-modal').style.display = 'flex';
      document.getElementById('multi-content-selector-search').value = '';
      window.renderMultiContentSelector();
    };

    window.renderMultiContentSelector = function() {
      const searchEl = document.getElementById('multi-content-selector-search');
      const q = (searchEl ? searchEl.value || '' : '').toLowerCase();
      const list = document.getElementById('multi-content-selector-list');
      if (!list) return;
      list.innerHTML = '';
      
      const rows = window.hotScreensData[window.activeHotScreen] || [];
      const row = rows.find(r => r.id === window.currentMultiSelectRowId);
      const selectedIds = row ? (row.contentIds || []).map(c => typeof c === 'string' ? c : c.id) : [];

      let count = 0;
      const docs = window.cachedContentDocs || [];
      
      if (row && (row.style === 'landscape_text' || row.style === 'landscape' || row.style === 'seasonal_card')) {
        list.innerHTML = `<div style="grid-column:1/-1; padding:40px; text-align:center; color:var(--text-tertiary);">
          <i class="fa-solid fa-layer-group" style="font-size:36px; margin-bottom:16px; opacity:0.5;"></i>
          <h4 style="font-size:16px; font-weight:700; color:#FFF; margin-bottom:8px;">Collections Only</h4>
          <p style="font-size:13px; max-width:400px; margin:0 auto;">This layout only supports Collection Cards. Please use the 'Create Collection Card' button above to add items to this row.</p>
        </div>`;
        return;
      }
      
      docs.forEach(docItem => {
        if (!docItem || !docItem.data) return;
        const title = String(docItem.data.title || '').toLowerCase();
        const docId = String(docItem.id || '').toLowerCase();
        if(title.includes(q) || docId.includes(q)) {
          count++;
          const isSelected = selectedIds.includes(docItem.id);
          
          const el = document.createElement('div');
          el.style = `position:relative; display:flex; flex-direction:column; background:${isSelected ? 'rgba(139,92,246,0.18)' : 'var(--bg-tertiary)'}; border:2px solid ${isSelected ? 'var(--accent-purple)' : 'var(--border-color)'}; border-radius:12px; overflow:hidden; cursor:pointer; transition:all 0.15s; box-shadow:0 4px 12px rgba(0,0,0,0.2);`;
          el.onmouseover = function() { if(!isSelected) this.style.borderColor = 'rgba(255,255,255,0.3)'; };
          el.onmouseout = function() { if(!isSelected) this.style.borderColor = 'var(--border-color)'; };
          el.onclick = () => { window.toggleMultiContentSelect(docItem.id); };
          el.innerHTML = `
            <div style="position:relative; width:100%; height:110px; background:#000; overflow:hidden;">
              <img src="${docItem.data.posterUrl || ''}" style="width:100%; height:100%; object-fit:cover;" onerror="this.src='https://via.placeholder.com/100x110'">
              <span style="position:absolute; top:4px; left:4px; background:rgba(0,0,0,0.75); color:#FFF; font-size:9px; font-weight:800; padding:2px 6px; border-radius:4px; text-transform:uppercase;">${docItem.data.type || 'Movie'}</span>
              <div style="position:absolute; top:4px; right:4px; width:22px; height:22px; border-radius:50%; background:${isSelected ? 'var(--accent-purple)' : 'rgba(0,0,0,0.6)'}; display:flex; align-items:center; justify-content:center; color:#FFF; font-size:11px; border:1px solid rgba(255,255,255,0.4);">
                ${isSelected ? '<i class="fa-solid fa-check"></i>' : ''}
              </div>
            </div>
            <div style="padding:8px 6px; flex:1; display:flex; flex-direction:column; justify-content:space-between; gap:2px;">
              <div style="font-size:11px; font-weight:800; color:#FFF; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${docItem.data.title || 'Untitled'}">${docItem.data.title || 'Untitled'}</div>
              <div style="font-size:9px; color:var(--text-tertiary); font-family:monospace;">${docItem.id}</div>
            </div>
          `;
          list.appendChild(el);
        }
      });
      if(count === 0) list.innerHTML = '<div style="grid-column:1/-1; color:var(--text-tertiary); text-align:center; padding:40px;">No matching content found in library.</div>';
    };

    window.toggleMultiContentSelect = function(id) {
      const rows = window.hotScreensData[window.activeHotScreen];
      const row = rows.find(r => r.id === window.currentMultiSelectRowId);
      if(!row) return;
      if(!row.contentIds) row.contentIds = [];
      
      const idx = row.contentIds.findIndex(c => (typeof c === 'string' ? c === id : c.id === id));
      if(idx > -1) {
        row.contentIds.splice(idx, 1);
      } else {
        row.contentIds.push({ id });
      }
      window.renderMultiContentSelector();
      window.renderHotRows(); // Update UI behind modal
    };
    
    window.closeMultiContentSelector = function() {
      document.getElementById('multi-content-selector-modal').style.display = 'none';
      window.currentMultiSelectRowId = null;
    };

    
    window.openHotRowItemEditModal = function(rowId, index) {
      const rows = window.hotScreensData[window.activeHotScreen];
      const row = rows.find(r => r.id === rowId);
      if(!row || !row.contentIds || !row.contentIds[index]) return;
      
      const item = row.contentIds[index];
      const cTitle = typeof item === 'object' ? (item.customTitle || '') : '';
      const cImg = typeof item === 'object' ? (item.customImage || '') : '';
      
      document.getElementById('edit-item-row-id').value = rowId;
      document.getElementById('edit-item-index').value = index;
      document.getElementById('edit-item-title').value = cTitle;
      document.getElementById('edit-item-image').value = cImg;
      
      const imgLabel = document.getElementById('edit-item-image-label');
      const imgHelper = document.getElementById('edit-item-image-helper');

      if (row.style === 'seasonal_card') {
        if (imgLabel) imgLabel.innerText = "CUSTOM BACKGROUND IMAGE URL (Seasonal Wide Card)";
        if (imgHelper) imgHelper.innerText = "Replaces the wide background image. If left empty, it automatically falls back to the item's default landscape backdrop.";
      } else if (row.style === 'classic_anime') {
        if (imgLabel) imgLabel.innerText = "CUSTOM PORTRAIT POSTER IMAGE URL (Classic Portrait)";
        if (imgHelper) imgHelper.innerText = "Replaces the portrait poster image. If left empty, it automatically falls back to the item's default poster.";
      } else if (row.style === 'landscape_text') {
        if (imgLabel) imgLabel.innerText = "CUSTOM LANDSCAPE BACKDROP IMAGE URL";
        if (imgHelper) imgHelper.innerText = "Replaces the landscape card image. If left empty, it automatically falls back to the item's default landscape backdrop.";
      } else {
        if (imgLabel) imgLabel.innerText = "CUSTOM CARD IMAGE URL";
        if (imgHelper) imgHelper.innerText = "If left empty, it defaults to standard poster.";
      }

      window.updateItemEditPreview();
      document.getElementById('edit-item-modal').style.display = 'flex';
    };

    window.updateItemEditPreview = function() {
      const rowId = document.getElementById('edit-item-row-id').value;
      const index = parseInt(document.getElementById('edit-item-index').value, 10);
      const inputTitle = document.getElementById('edit-item-title').value.trim();
      const inputImg = document.getElementById('edit-item-image').value.trim();
      
      const previewBox = document.getElementById('edit-item-preview-box');
      if(!previewBox) return;

      const rows = window.hotScreensData[window.activeHotScreen];
      const row = rows ? rows.find(r => r.id === rowId) : null;
      if(!row || !row.contentIds || !row.contentIds[index]) return;

      const item = row.contentIds[index];
      const cId = typeof item === 'string' ? item : item.id;
      const docItem = window.cachedContentDocs.find(d => d.id === cId);
      if(!docItem || !docItem.data) return;

      const defaultTitle = docItem.data.title || 'Untitled';
      const displayTitle = inputTitle || defaultTitle;
      
      const defaultPoster = docItem.data.posterUrl || 'https://via.placeholder.com/100x140';
      const defaultBackdrop = docItem.data.backdropUrl || defaultPoster;

      if (row.style === 'seasonal_card') {
        const displayBg = inputImg || defaultBackdrop;
        previewBox.innerHTML = `
          <div style="background:rgba(0,0,0,0.5); border:1px solid rgba(139,92,246,0.3); border-radius:14px; padding:12px;">
            <div style="font-size:10px; font-weight:800; color:#A78BFA; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px; display:flex; align-items:center; justify-content:space-between;">
              <span><i class="fa-solid fa-mobile-screen"></i> SEASONAL CARD REALTIME PREVIEW</span>
              <span style="color:${inputImg ? '#10B981' : 'var(--text-tertiary)'}; font-size:9px;">${inputImg ? '✓ Custom BG Image' : 'Default Backdrop'}</span>
            </div>
            <div style="position:relative; width:100%; height:125px; border-radius:12px; overflow:hidden; border:1px solid rgba(255,255,255,0.25); box-shadow:0 8px 20px rgba(0,0,0,0.7); background:#000;">
              <!-- Wide Background Backdrop -->
              <img src="${displayBg}" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover;" onerror="this.src='${defaultBackdrop}'">
              <!-- Dark Gradient -->
              <div style="position:absolute; inset:0; background:linear-gradient(to right, rgba(0,0,0,0.85) 0%, rgba(0,0,0,0.4) 60%, transparent 100%);"></div>
              
              <div style="position:absolute; inset:0; display:flex; align-items:center; justify-content:space-between; padding:10px 12px;">
                <!-- Left Floating Portrait Poster Card -->
                <div style="width:62px; height:82px; flex-shrink:0; border-radius:8px; overflow:hidden; border:1.5px solid rgba(255,255,255,0.4); box-shadow:0 6px 14px rgba(0,0,0,0.85); background:#121212;">
                  <img src="${defaultPoster}" style="width:100%; height:100%; object-fit:cover;" onerror="this.src='https://via.placeholder.com/60x80'">
                </div>
                
                <!-- Right Info -->
                <div style="flex:1; margin-left:10px; display:flex; flex-direction:column; align-items:flex-end; text-align:right;">
                  <span style="background:rgba(255,255,255,0.2); backdrop-filter:blur(6px); border:1px solid rgba(255,255,255,0.3); color:#FFF; font-size:8px; font-weight:900; padding:2px 8px; border-radius:10px; text-transform:uppercase;">
                    ${row.tagFilter || 'HOT LIST'}
                  </span>
                  <h4 style="font-size:12px; font-weight:900; color:#FFF; margin-top:4px; text-shadow:0 2px 6px rgba(0,0,0,0.9); line-height:1.2; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">
                    ${displayTitle}
                  </h4>
                </div>
              </div>
            </div>
            <div style="font-size:10px; color:var(--text-tertiary); margin-top:8px; text-align:center; line-height:1.3;">
              <i class="fa-solid fa-circle-info" style="color:#A78BFA;"></i> Floating portrait poster on the left stays default. As you edit the image URL above, the background backdrop image changes live!
            </div>
          </div>
        `;
      } else if (row.style === 'landscape_text') {
        const displayBg = inputImg || defaultBackdrop;
        previewBox.innerHTML = `
          <div style="background:rgba(0,0,0,0.5); border:1px solid rgba(245,158,11,0.3); border-radius:12px; padding:12px;">
            <div style="font-size:10px; font-weight:800; color:#FBBF24; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px;">
              <i class="fa-solid fa-mobile-screen"></i> LANDSCAPE CARD PREVIEW
            </div>
            <div style="position:relative; width:100%; height:110px; border-radius:10px; overflow:hidden; border:1px solid rgba(255,255,255,0.2); box-shadow:0 8px 20px rgba(0,0,0,0.6); background:#000;">
              <img src="${displayBg}" style="width:100%; height:100%; object-fit:cover;" onerror="this.src='${defaultBackdrop}'">
              <div style="position:absolute; inset-x:0; bottom:0; padding:6px 10px; background:rgba(0,0,0,0.7); backdrop-filter:blur(6px); border-top:1px solid rgba(255,255,255,0.15); text-align:center;">
                <h4 style="font-size:11px; font-weight:900; color:#FFF; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${displayTitle}</h4>
              </div>
            </div>
          </div>
        `;
      } else if (row.style === 'classic_anime') {
        const displayPoster = inputImg || defaultPoster;
        previewBox.innerHTML = `
          <div style="background:rgba(0,0,0,0.5); border:1px solid rgba(244,63,94,0.3); border-radius:12px; padding:12px;">
            <div style="font-size:10px; font-weight:800; color:#FB7185; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px; text-align:center;">
              <i class="fa-solid fa-mobile-screen"></i> CLASSIC PORTRAIT PREVIEW
            </div>
            <div style="position:relative; width:90px; aspect-ratio:3/4; margin:0 auto; border-radius:8px; overflow:hidden; border:none; box-shadow:0 4px 12px rgba(0,0,0,0.4); background:#1a1a1a;">
              <img src="${displayPoster}" style="position:absolute; inset:0; width:100%; height:100%; object-fit:cover;" onerror="this.src='${defaultPoster}'">
            </div>
            <div style="margin-top:8px; text-align:center; width:100%;">
              <h4 style="font-size:11px; font-weight:500; color:#FFF; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; margin:0;">${displayTitle}</h4>
            </div>
          </div>
        `;
      } else {
        const displayPoster = inputImg || defaultPoster;
        previewBox.innerHTML = `
          <div style="background:rgba(0,0,0,0.5); border:1px solid rgba(139,92,246,0.3); border-radius:12px; padding:12px;">
            <div style="font-size:10px; font-weight:800; color:#A78BFA; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px; text-align:center;">
              <i class="fa-solid fa-mobile-screen"></i> DEFAULT CARD PREVIEW
            </div>
            <div style="position:relative; width:100px; height:140px; margin:0 auto; border-radius:10px; overflow:hidden; border:1px solid rgba(255,255,255,0.2); box-shadow:0 8px 20px rgba(0,0,0,0.6); background:#000;">
              <img src="${displayPoster}" style="width:100%; height:100%; object-fit:cover;">
              <div style="position:absolute; inset-x:0; bottom:0; padding:4px; background:rgba(0,0,0,0.8); text-align:center;">
                <h4 style="font-size:9px; font-weight:800; color:#FFF; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${displayTitle}</h4>
              </div>
            </div>
          </div>
        `;
      }
    };

    window.closeHotRowItemEditModal = function() {
      document.getElementById('edit-item-modal').style.display = 'none';
    };

    window.saveHotRowItemEdit = function() {
      const rowId = document.getElementById('edit-item-row-id').value;
      const index = parseInt(document.getElementById('edit-item-index').value, 10);
      const cTitle = document.getElementById('edit-item-title').value.trim();
      const cImg = document.getElementById('edit-item-image').value.trim();
      
      const rows = window.hotScreensData[window.activeHotScreen];
      const row = rows ? rows.find(r => r.id === rowId) : null;
      if(!row || !row.contentIds || !row.contentIds[index]) return;
      
      let item = row.contentIds[index];
      let id = typeof item === 'string' ? item : item.id;
      
      const updatedObj = { id: id };
      if (cTitle) updatedObj.customTitle = cTitle;
      if (cImg) updatedObj.customImage = cImg;

      row.contentIds[index] = updatedObj;
      
      window.closeHotRowItemEditModal();
      window.renderHotRows();
    };

    
    window.colSelectedItems = [];

    window.updateColPreview = function() {
      const title = document.getElementById('col-card-title').value;
      const poster = document.getElementById('col-card-poster').value;
      document.getElementById('col-preview-title').textContent = title || 'Title';
      document.getElementById('col-preview-img').src = poster || 'https://via.placeholder.com/150x200/1a1a1a/666666?text=No+Image';
    };

    window.openCollectionCardModal = function(rowId) {
      document.getElementById('col-card-row-id').value = rowId;
      document.getElementById('col-card-title').value = '';
      document.getElementById('col-card-poster').value = '';
      document.getElementById('col-card-backdrop').value = '';
      document.getElementById('col-card-search').value = '';
      
      window.colSelectedItems = [];
      window.updateColPreview();
      window.renderColSelector();

      document.getElementById('collection-card-modal').style.display = 'flex';
    };

    window.toggleColItem = function(id) {
      const idx = window.colSelectedItems.indexOf(id);
      if (idx > -1) {
        window.colSelectedItems.splice(idx, 1);
      } else {
        window.colSelectedItems.push(id);
      }
      window.renderColSelector();
    };

    window.renderColSelector = function() {
      const searchEl = document.getElementById('col-card-search');
      const q = (searchEl ? searchEl.value || '' : '').toLowerCase();
      const list = document.getElementById('col-card-list');
      if (!list) return;
      list.innerHTML = '';
      
      const countEl = document.getElementById('col-selected-count');
      if (countEl) countEl.textContent = `${window.colSelectedItems.length} Selected`;

      const docs = window.cachedContentDocs || [];
      
      let rendered = 0;
      docs.forEach(docItem => {
        const title = (docItem.data.title || '').toLowerCase();
        const id = docItem.id.toLowerCase();
        if (q && !title.includes(q) && !id.includes(q)) return;
        
        const isSelected = window.colSelectedItems.includes(docItem.id);
        const poster = docItem.data.posterUrl;

        const borderStyle = isSelected 
          ? 'border:2px solid #10B981; transform:scale(0.95);' 
          : 'border:2px solid transparent;';
        
        const overlay = isSelected 
          ? `<div style="position:absolute; inset:0; background:rgba(16,185,129,0.3); display:flex; align-items:center; justify-content:center; backdrop-filter:blur(2px);">
               <div style="width:32px; height:32px; background:#10B981; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#FFF; font-size:16px; box-shadow:0 4px 10px rgba(0,0,0,0.5);">
                 <i class="fa-solid fa-check"></i>
               </div>
             </div>` 
          : `<div style="position:absolute; inset:0; background:linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 50%);"></div>`;

        list.innerHTML += `
          <div onclick="toggleColItem('${docItem.id}')" style="cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:6px; transition:all 0.2s;">
            <div style="width:100%; aspect-ratio:3/4; border-radius:8px; overflow:hidden; position:relative; background:#1a1a1a; ${borderStyle} transition:all 0.2s;">
              <img src="${poster}" style="width:100%; height:100%; object-fit:cover;" onerror="this.style.display='none'">
              ${overlay}
            </div>
            <span style="font-size:10px; color:${isSelected ? '#10B981' : 'var(--text-secondary)'}; text-align:center; width:100%; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-weight:${isSelected ? '800' : '600'};">
              ${docItem.data.title}
            </span>
          </div>
        `;
        rendered++;
      });
      
      if (rendered === 0) {
        list.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:40px; color:var(--text-tertiary); font-size:13px;"><i class="fa-solid fa-ghost" style="font-size:24px; margin-bottom:12px; display:block;"></i>No items found</div>`;
      }
    };

    window.saveCollectionCard = function() {
      const rowId = document.getElementById('col-card-row-id').value;
      const title = document.getElementById('col-card-title').value;
      const poster = document.getElementById('col-card-poster').value;
      const backdrop = document.getElementById('col-card-backdrop').value;

      if(!title || !poster) {
        alert("Please provide a title and a portrait poster URL.");
        return;
      }

      if(window.colSelectedItems.length === 0) {
        alert("Please select at least one content item for this collection.");
        return;
      }

      const rows = window.hotScreensData[window.activeHotScreen];
      const row = rows.find(r => r.id === rowId);
      if(!row) return;

      if(!row.contentIds) row.contentIds = [];
      row.contentIds.push({
        id: 'col_' + Date.now(),
        isCollection: true,
        customTitle: title,
        customImage: poster,
        backdropImage: backdrop,
        collectionIds: [...window.colSelectedItems] // Save selected items directly
      });

      document.getElementById('collection-card-modal').style.display = 'none';
      window.renderHotRows();
    };

    // NETWORK GRID CONTROLLER
    window.networkPresetsList = [
      {
        id: 'net-disney',
        isNetwork: true,
        name: 'Disney Channel',
        logoUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=400',
        bannerUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=1200',
        description: 'The official home of classic cartoons, magical adventures, Disney animations, and family movies.',
        tagFilter: 'Disney'
      },
      {
        id: 'net-sonyyay',
        isNetwork: true,
        name: 'Sony YAY!',
        logoUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400',
        bannerUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200',
        description: 'Ultimate destination for high-energy cartoons, kids comedy shows, action anime and entertainment.',
        tagFilter: 'Sony'
      },
      {
        id: 'net-hungama',
        isNetwork: true,
        name: 'Hungama',
        logoUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=400',
        bannerUrl: 'https://images.unsplash.com/photo-1607604276583-eef5d076aa5f?w=1200',
        description: 'Non-stop fun, classic animated adventures, anime dubs, and comedy shows for everyone.',
        tagFilter: 'Hungama'
      },
      {
        id: 'net-cartoonnetwork',
        isNetwork: true,
        name: 'Cartoon Network',
        logoUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=400',
        bannerUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?w=1200',
        description: 'Iconic world-class cartoon shows, superhero action, and evergreen animated blockbuster series.',
        tagFilter: 'Cartoon'
      },
      {
        id: 'net-netflix',
        isNetwork: true,
        name: 'Netflix',
        logoUrl: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=400',
        bannerUrl: 'https://images.unsplash.com/photo-1574375927938-d5a98e8ffe85?w=1200',
        description: 'Award-winning Netflix originals, trending series, blockbuster movies and anime streams.',
        tagFilter: 'Netflix'
      },
      {
        id: 'net-prime',
        isNetwork: true,
        name: 'Prime Video',
        logoUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=400',
        bannerUrl: 'https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=1200',
        description: 'Amazon Original series, blockbuster movies, popular TV hits and exclusive premium cinema.',
        tagFilter: 'Prime'
      },
      {
        id: 'net-crunchyroll',
        isNetwork: true,
        name: 'Crunchyroll',
        logoUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=400',
        bannerUrl: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200',
        description: 'The world’s largest anime library streaming the latest simulcasts, subbed & dubbed masterworks.',
        tagFilter: 'Anime'
      },
      {
        id: 'net-hotstar',
        isNetwork: true,
        name: 'Disney+ Hotstar',
        logoUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=400',
        bannerUrl: 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=1200',
        description: 'Live sports, Indian cinema specials, regional dubbed hits and Marvel superhero franchises.',
        tagFilter: 'Hotstar'
      }
    ];

    window.netSelectedItems = [];
    window.netActiveCategoryFilter = 'all';

    window.quickImportNetworkPresets = function(rowId) {
      const rows = window.hotScreensData[window.activeHotScreen];
      const row = rows.find(r => r.id === rowId);
      if (!row) return;

      if (!row.contentIds) row.contentIds = [];
      const existingNames = new Set(row.contentIds.map(c => (c.name || c.customTitle || '').toLowerCase()));

      let added = 0;
      window.networkPresetsList.forEach(preset => {
        if (!existingNames.has(preset.name.toLowerCase())) {
          row.contentIds.push(JSON.parse(JSON.stringify(preset)));
          added++;
        }
      });

      window.renderHotRows();
      showToast(`Added ${added} popular network presets!`);
    };

    window.openNetworkModal = function(rowId, networkIndex) {
      document.getElementById('net-row-id').value = rowId;
      document.getElementById('net-item-index').value = (networkIndex !== undefined && networkIndex !== null) ? networkIndex : -1;
      
      const rows = window.hotScreensData[window.activeHotScreen];
      const row = rows ? rows.find(r => r.id === rowId) : null;
      let existingNet = null;
      if (row && row.contentIds && networkIndex >= 0 && networkIndex < row.contentIds.length) {
        existingNet = row.contentIds[networkIndex];
      }

      if (existingNet) {
        document.getElementById('net-modal-heading').textContent = 'Edit Network Channel / Studio';
        document.getElementById('net-name').value = existingNet.name || existingNet.customTitle || '';
        document.getElementById('net-logo').value = existingNet.logoUrl || existingNet.customImage || '';
        document.getElementById('net-banner').value = existingNet.bannerUrl || existingNet.backdropImage || '';
        document.getElementById('net-desc').value = existingNet.description || '';
        document.getElementById('net-tag').value = existingNet.tagFilter || '';
        window.netSelectedItems = [...(existingNet.contentIds || existingNet.collectionIds || [])];
      } else {
        document.getElementById('net-modal-heading').textContent = 'Add New Network Channel / Studio';
        document.getElementById('net-name').value = '';
        document.getElementById('net-logo').value = '';
        document.getElementById('net-banner').value = '';
        document.getElementById('net-desc').value = '';
        document.getElementById('net-tag').value = '';
        window.netSelectedItems = [];
      }

      document.getElementById('net-search').value = '';
      window.netActiveCategoryFilter = 'all';
      window.updateNetworkPreview();
      window.renderNetworkPresetsUI();
      window.renderNetworkContentSelector();
      document.getElementById('network-modal').style.display = 'flex';
    };

    window.updateNetworkPreview = function() {
      const name = document.getElementById('net-name').value;
      const logo = document.getElementById('net-logo').value;
      document.getElementById('net-preview-name').textContent = name || 'Network Name';
      document.getElementById('net-preview-img').src = logo || 'https://via.placeholder.com/150/1a1a1a/666666?text=Logo';
    };

    window.applyPresetToNetworkForm = function(presetId) {
      const preset = window.networkPresetsList.find(p => p.id === presetId);
      if (!preset) return;
      document.getElementById('net-name').value = preset.name;
      document.getElementById('net-logo').value = preset.logoUrl;
      document.getElementById('net-banner').value = preset.bannerUrl;
      document.getElementById('net-desc').value = preset.description;
      document.getElementById('net-tag').value = preset.tagFilter;
      window.updateNetworkPreview();
    };

    window.renderNetworkPresetsUI = function() {
      const container = document.getElementById('net-preset-chips');
      if (!container) return;
      container.innerHTML = window.networkPresetsList.map(p => `
        <button
          type="button"
          onclick="applyPresetToNetworkForm('${p.id}')"
          style="background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.15); color:#E4E4E7; font-size:11px; font-weight:700; padding:4px 10px; border-radius:8px; cursor:pointer; display:flex; align-items:center; gap:6px; transition:all 0.15s;"
          onmouseover="this.style.background='rgba(139,92,246,0.3)'; this.style.borderColor='#8B5CF6'; this.style.color='#FFF';"
          onmouseout="this.style.background='rgba(255,255,255,0.06)'; this.style.borderColor='rgba(255,255,255,0.15)'; this.style.color='#E4E4E7';"
        >
          <img src="${p.logoUrl}" style="width:14px; height:14px; border-radius:3px; object-fit:contain;">
          <span>${p.name}</span>
        </button>
      `).join('');
    };

    window.setNetworkContentTab = function(tab) {
      window.netActiveCategoryFilter = tab;
      const tabs = ['all', 'movies', 'series'];
      tabs.forEach(t => {
        const el = document.getElementById(`net-tab-${t}`);
        if (el) {
          if (t === tab) {
            el.style.background = 'linear-gradient(135deg, #06B6D4, #8B5CF6)';
            el.style.color = '#FFF';
            el.style.fontWeight = '800';
          } else {
            el.style.background = 'rgba(255,255,255,0.06)';
            el.style.color = 'var(--text-secondary)';
            el.style.fontWeight = '600';
          }
        }
      });
      window.renderNetworkContentSelector();
    };

    window.toggleNetworkContentItem = function(id) {
      const idx = window.netSelectedItems.indexOf(id);
      if (idx > -1) {
        window.netSelectedItems.splice(idx, 1);
      } else {
        window.netSelectedItems.push(id);
      }
      window.renderNetworkContentSelector();
    };

    window.renderNetworkContentSelector = function() {
      const searchEl = document.getElementById('net-search');
      const q = (searchEl ? searchEl.value || '' : '').toLowerCase();
      const list = document.getElementById('net-content-list');
      if (!list) return;
      list.innerHTML = '';

      const countEl = document.getElementById('net-selected-count');
      if (countEl) countEl.textContent = `${window.netSelectedItems.length} Selected`;

      const docs = window.cachedContentDocs || [];
      let rendered = 0;

      docs.forEach(docItem => {
        const title = (docItem.data.title || '').toLowerCase();
        const type = (docItem.data.type || '').toLowerCase();
        const cat = (docItem.data.category || '').toLowerCase();
        const id = docItem.id.toLowerCase();

        // Filter by Tab (all / movies / series)
        if (window.netActiveCategoryFilter === 'movies') {
          if (type !== 'movie' && !cat.includes('movie')) return;
        } else if (window.netActiveCategoryFilter === 'series') {
          if (type === 'movie' && !cat.includes('series') && !cat.includes('tv') && !cat.includes('anime')) return;
        }

        if (q && !title.includes(q) && !id.includes(q)) return;

        const isSelected = window.netSelectedItems.includes(docItem.id);
        const poster = docItem.data.posterUrl;

        const borderStyle = isSelected 
          ? 'border:2px solid #06B6D4; transform:scale(0.95);' 
          : 'border:2px solid transparent;';
        
        const overlay = isSelected 
          ? `<div style="position:absolute; inset:0; background:rgba(6,182,212,0.35); display:flex; align-items:center; justify-content:center; backdrop-filter:blur(2px);">
               <div style="width:32px; height:32px; background:#06B6D4; border-radius:50%; display:flex; align-items:center; justify-content:center; color:#FFF; font-size:16px; box-shadow:0 4px 10px rgba(0,0,0,0.5);">
                 <i class="fa-solid fa-check"></i>
               </div>
             </div>` 
          : `<div style="position:absolute; inset:0; background:linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 50%);"></div>`;

        list.innerHTML += `
          <div onclick="toggleNetworkContentItem('${docItem.id}')" style="cursor:pointer; display:flex; flex-direction:column; align-items:center; gap:6px; transition:all 0.2s;">
            <div style="width:100%; aspect-ratio:3/4; border-radius:8px; overflow:hidden; position:relative; background:#1a1a1a; ${borderStyle} transition:all 0.2s;">
              <img src="${poster}" style="width:100%; height:100%; object-fit:cover;" onerror="this.style.display='none'">
              ${overlay}
              <div style="position:absolute; top:4px; right:4px; font-size:8px; font-weight:800; background:rgba(0,0,0,0.7); color:#FFF; padding:1px 4px; border-radius:3px;">
                ${(docItem.data.type || 'item').toUpperCase()}
              </div>
            </div>
            <span style="font-size:10px; color:${isSelected ? '#06B6D4' : 'var(--text-secondary)'}; text-align:center; width:100%; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; font-weight:${isSelected ? '800' : '600'};">
              ${docItem.data.title}
            </span>
          </div>
        `;
        rendered++;
      });

      if (rendered === 0) {
        list.innerHTML = `<div style="grid-column:1/-1; text-align:center; padding:40px; color:var(--text-tertiary); font-size:13px;"><i class="fa-solid fa-ghost" style="font-size:24px; margin-bottom:12px; display:block;"></i>No items found in this tab</div>`;
      }
    };

    window.saveNetworkItem = function() {
      const rowId = document.getElementById('net-row-id').value;
      const index = parseInt(document.getElementById('net-item-index').value, 10);
      const name = document.getElementById('net-name').value.trim();
      const logo = document.getElementById('net-logo').value.trim();
      const banner = document.getElementById('net-banner').value.trim();
      const desc = document.getElementById('net-desc').value.trim();
      const tag = document.getElementById('net-tag').value.trim();

      if (!name) {
        alert("Please enter a Network / Brand Name.");
        return;
      }
      if (!logo) {
        alert("Please enter a Network Logo URL.");
        return;
      }

      const rows = window.hotScreensData[window.activeHotScreen];
      const row = rows ? rows.find(r => r.id === rowId) : null;
      if (!row) return;

      if (!row.contentIds) row.contentIds = [];

      const networkObj = {
        id: (index >= 0 && row.contentIds[index]?.id) ? row.contentIds[index].id : ('net_' + Date.now()),
        isNetwork: true,
        name: name,
        logoUrl: logo,
        bannerUrl: banner || logo,
        description: desc,
        tagFilter: tag || name,
        contentIds: [...window.netSelectedItems]
      };

      if (index >= 0 && index < row.contentIds.length) {
        row.contentIds[index] = networkObj;
      } else {
        row.contentIds.push(networkObj);
      }

      document.getElementById('network-modal').style.display = 'none';
      window.renderHotRows();
      showToast('Network saved successfully!');
    };

    window.removeHotRowItem = function(rowId, cId) {
      if(!confirm('Remove this item?')) return;
      const rows = window.hotScreensData[window.activeHotScreen];
      const row = rows ? rows.find(r => r.id === rowId) : null;
      if(!row || !row.contentIds) return;
      
      row.contentIds = row.contentIds.filter(c => {
        let currentId = typeof c === 'string' ? c : c.id;
        return currentId !== cId;
      });
      window.renderHotRows();
    };

    window.moveHotRowItem = function(rowId, index, dir) {
      const rows = window.hotScreensData[window.activeHotScreen];
      const row = rows ? rows.find(r => r.id === rowId) : null;
      if(!row || !row.contentIds) return;
      
      if(index + dir < 0 || index + dir >= row.contentIds.length) return;
      
      const temp = row.contentIds[index];
      row.contentIds[index] = row.contentIds[index + dir];
      row.contentIds[index + dir] = temp;
      
      window.renderHotRows();
    };

    window.saveDetailedHotScreens = async function() {
      try {
        // Strip out any undefined fields before saving to Firestore
        const cleanRowsData = JSON.parse(JSON.stringify(window.hotScreensData || {}));
        await setDoc(doc(db, 'settings', 'screens_rows'), cleanRowsData);
        
        // Save Categories
        if (window.hotScreensCategories) {
          const cleanCatData = JSON.parse(JSON.stringify(window.hotScreensCategories));
          await setDoc(doc(db, 'settings', 'screens_categories'), cleanCatData);
        }
        
        // Save Banners
        if (window.hotScreensBanners) {
          for(let screen in window.hotScreensBanners) {
            const bList = window.hotScreensBanners[screen];
            if (Array.isArray(bList)) {
              for(let b of bList) {
                if (b && b.id) {
                  const cleanBanner = JSON.parse(JSON.stringify({
                    ...b,
                    updatedAt: new Date().toISOString()
                  }));
                  await setDoc(doc(db, 'heroBanners', b.id), cleanBanner, { merge: true });
                }
              }
            }
          }
        }
        
        showToast('All Screen Configurations Saved Successfully!');
      } catch(e) { 
        console.error('Error saving screens:', e);
        showToast('Error saving: ' + e.message); 
      }
    };

    // ==========================================
    // REPORTS & MODERATION LOGIC
    // ==========================================
    window.reportsData = [];
    window.currentReportsStatusFilter = 'all';

    const REPORT_CATEGORY_META = {
      'hate_speech': { label: 'Hate Speech', color: '#EF4444', bg: 'rgba(239,68,68,0.15)' },
      'abusive': { label: 'Abusive / Vulgar', color: '#F97316', bg: 'rgba(249,115,22,0.15)' },
      'spoiler': { label: 'Major Spoiler', color: '#FBBF24', bg: 'rgba(251,191,36,0.15)' },
      'spam': { label: 'Spam & Promo', color: '#A855F7', bg: 'rgba(168,85,247,0.15)' },
      'misinformation': { label: 'Misinformation', color: '#06B6D4', bg: 'rgba(6,182,212,0.15)' },
      'other': { label: 'Policy Violation', color: '#9CA3AF', bg: 'rgba(156,163,175,0.15)' }
    };

    window.initReportsListener = function() {
      try {
        onSnapshot(collection(db, 'reports'), (snap) => {
          window.reportsData = [];
          snap.forEach(d => {
            window.reportsData.push({ id: d.id, ...d.data() });
          });
          
          // Sort newest first
          window.reportsData.sort((a, b) => {
            const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
            const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
            return dateB - dateA;
          });

          // Update sidebar counter badge
          const pendingCount = window.reportsData.filter(r => (r.status || 'pending') === 'pending').length;
          const badgeEl = document.getElementById('reports-nav-badge');
          if (badgeEl) {
            badgeEl.innerText = pendingCount;
            badgeEl.style.display = pendingCount > 0 ? 'inline-block' : 'none';
          }

          // Update KPI metrics
          const totalCount = window.reportsData.length;
          const resolvedCount = window.reportsData.filter(r => r.status === 'resolved').length;
          const dismissedCount = window.reportsData.filter(r => r.status === 'dismissed').length;

          const totalEl = document.getElementById('stat-reports-total');
          const pendingEl = document.getElementById('stat-reports-pending');
          const resolvedEl = document.getElementById('stat-reports-resolved');
          const dismissedEl = document.getElementById('stat-reports-dismissed');

          if (totalEl) totalEl.innerText = totalCount;
          if (pendingEl) pendingEl.innerText = pendingCount;
          if (resolvedEl) resolvedEl.innerText = resolvedCount;
          if (dismissedEl) dismissedEl.innerText = dismissedCount;

          window.renderReportsTable();
        }, (err) => {
          console.warn('Reports realtime listener notice:', err);
        });
      } catch(e) {
        console.error('initReportsListener error:', e);
      }
    };

    window.loadReportsData = function() {
      window.initReportsListener();
      showToast('Refreshing moderation queue...');
    };

    window.filterReportsStatus = function(status) {
      window.currentReportsStatusFilter = status;
      ['all', 'pending', 'resolved', 'dismissed'].forEach(s => {
        const btn = document.getElementById('filter-rep-' + s);
        if (btn) {
          if (s === status) {
            btn.classList.add('active');
            btn.style.background = 'linear-gradient(135deg, #06B6D4, #8B5CF6)';
            btn.style.color = '#FFF';
            btn.style.border = 'none';
          } else {
            btn.classList.remove('active');
            btn.style.background = 'transparent';
            btn.style.color = 'var(--text-secondary)';
            btn.style.border = '1px solid rgba(255,255,255,0.1)';
          }
        }
      });
      window.renderReportsTable();
    };

    window.renderReportsTable = function() {
      const tbody = document.getElementById('reports-table-body');
      if (!tbody) return;

      const searchInput = document.getElementById('reports-search-input');
      const search = (searchInput ? searchInput.value : '').toLowerCase().trim();
      const statusFilter = window.currentReportsStatusFilter || 'all';

      const filtered = (window.reportsData || []).filter(r => {
        const matchesStatus = statusFilter === 'all' || (r.status || 'pending') === statusFilter;
        const matchesSearch = !search || 
          (r.commentAuthorName && r.commentAuthorName.toLowerCase().includes(search)) ||
          (r.commentText && r.commentText.toLowerCase().includes(search)) ||
          (r.contentTitle && r.contentTitle.toLowerCase().includes(search)) ||
          (r.category && r.category.toLowerCase().includes(search)) ||
          (r.reportedByUserName && r.reportedByUserName.toLowerCase().includes(search));
        return matchesStatus && matchesSearch;
      });

      if (filtered.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="6" style="text-align:center; padding:40px 20px; color:var(--text-tertiary);">
              <i class="fa-solid fa-shield-heart" style="font-size:32px; color:rgba(16,185,129,0.5); margin-bottom:12px; display:block;"></i>
              <strong style="color:#FFF; font-size:14px;">No reports in this view</strong>
              <p style="font-size:12px; margin-top:4px;">All reported comments have been reviewed or no reports match your search criteria.</p>
            </td>
          </tr>`;
        return;
      }

      let h = '';
      filtered.forEach(r => {
        const catMeta = REPORT_CATEGORY_META[r.category] || { label: r.reasonText || r.category || 'Violation', color: '#EF4444', bg: 'rgba(239,68,68,0.15)' };
        const status = r.status || 'pending';

        let statusBadge = '';
        if (status === 'pending') {
          statusBadge = `<span style="background:rgba(239,68,68,0.15); color:#F87171; border:1px solid rgba(239,68,68,0.3); font-size:10px; font-weight:800; padding:3px 8px; border-radius:12px; display:inline-flex; align-items:center; gap:4px;">
            <i class="fa-solid fa-clock" style="font-size:8px;"></i> Pending
          </span>`;
        } else if (status === 'resolved') {
          statusBadge = `<span style="background:rgba(16,185,129,0.15); color:#34D399; border:1px solid rgba(16,185,129,0.3); font-size:10px; font-weight:800; padding:3px 8px; border-radius:12px; display:inline-flex; align-items:center; gap:4px;">
            <i class="fa-solid fa-check" style="font-size:8px;"></i> Actioned
          </span>`;
        } else {
          statusBadge = `<span style="background:rgba(156,163,175,0.15); color:#9CA3AF; border:1px solid rgba(156,163,175,0.3); font-size:10px; font-weight:800; padding:3px 8px; border-radius:12px; display:inline-flex; align-items:center; gap:4px;">
            <i class="fa-solid fa-ban" style="font-size:8px;"></i> Dismissed
          </span>`;
        }

        const formattedDate = r.createdAt ? new Date(r.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Recently';

        const posterImg = r.contentPosterUrl || 'https://via.placeholder.com/60x90';

        h += `
          <tr>
            <!-- Comment & Media Column -->
            <td>
              <div style="display:flex; gap:12px; align-items:flex-start;">
                <img src="${posterImg}" onerror="this.src='https://via.placeholder.com/60x90'" style="width:36px; height:52px; border-radius:6px; object-fit:cover; border:1px solid rgba(255,255,255,0.1); flex-shrink:0;">
                <div style="min-width:0; flex:1;">
                  <div style="font-size:11px; font-weight:800; color:var(--accent-cyan); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${r.contentTitle || ''}">
                    ${r.contentTitle || 'Unknown Media'}
                    ${r.replyId ? '<span style="font-size:9px; background:rgba(255,255,255,0.1); color:#A1A1AA; padding:1px 5px; border-radius:4px; margin-left:4px;">REPLY</span>' : ''}
                  </div>
                  <div style="background:rgba(0,0,0,0.3); padding:6px 10px; border-radius:8px; border:1px solid rgba(255,255,255,0.06); font-size:12px; color:#F3F4F6; margin-top:4px; font-style:italic; line-height:1.4;">
                    "${r.commentText || ''}"
                  </div>
                </div>
              </div>
            </td>

            <!-- Author Column -->
            <td>
              <div style="display:flex; align-items:center; gap:8px;">
                <div style="width:28px; height:28px; border-radius:50%; background:linear-gradient(135deg, #EF4444, #F97316); display:flex; align-items:center; justify-content:center; font-size:11px; font-weight:800; color:#FFF; flex-shrink:0; overflow:hidden;">
                  ${r.commentAuthorAvatar ? `<img src="${r.commentAuthorAvatar}" style="width:100%; height:100%; object-fit:cover;">` : (r.commentAuthorName ? r.commentAuthorName.charAt(0).toUpperCase() : 'U')}
                </div>
                <div style="min-width:0;">
                  <div style="font-size:12px; font-weight:700; color:#FFF; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                    ${r.commentAuthorName || 'Anonymous'}
                  </div>
                  <div style="font-size:10px; font-family:monospace; color:var(--text-tertiary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                    ${r.commentAuthorId ? r.commentAuthorId.substring(0, 10) + '...' : ''}
                  </div>
                </div>
              </div>
            </td>

            <!-- Violation Category Column -->
            <td>
              <span style="background:${catMeta.bg}; color:${catMeta.color}; border:1px solid ${catMeta.color}40; font-size:10px; font-weight:800; padding:3px 8px; border-radius:10px; display:inline-block; margin-bottom:4px;">
                <i class="fa-solid fa-triangle-exclamation" style="margin-right:4px;"></i> ${catMeta.label}
              </span>
              ${r.details ? `<div style="font-size:11px; color:#D1D5DB; line-height:1.3; margin-top:2px;">${r.details}</div>` : ''}
              ${r.adminNotes ? `<div style="font-size:10px; color:#34D399; margin-top:2px;"><i class="fa-solid fa-clipboard-check"></i> ${r.adminNotes}</div>` : ''}
            </td>

            <!-- Reporter Column -->
            <td>
              <div style="font-size:11px; font-weight:700; color:#E5E7EB;">
                ${r.reportedByUserName || 'MaxPlay User'}
              </div>
              <div style="font-size:10px; color:var(--text-tertiary);">
                ${formattedDate}
              </div>
            </td>

            <!-- Status Column -->
            <td>
              ${statusBadge}
            </td>

            <!-- Actions Column -->
            <td style="text-align:right;">
              <div style="display:flex; justify-content:flex-end; gap:6px;">
                ${status === 'pending' ? `
                  <button type="button" class="btn-primary" onclick="window.deleteReportComment('${r.id}', '${r.contentId}', '${r.commentId}', '${r.replyId || ''}', '${r.reportedByUserId || ''}', '${(r.reportedByUserName || '').replace(/'/g, "\\'")}', '${r.commentAuthorId || ''}', '${(r.commentAuthorName || '').replace(/'/g, "\\'")}')" style="background:#EF4444; border:none; height:30px; padding:0 10px; font-size:11px; font-weight:800; border-radius:6px; cursor:pointer;" title="Delete comment from app and mark report resolved">
                    <i class="fa-solid fa-trash"></i> Delete
                  </button>
                  <button type="button" class="btn-secondary" onclick="window.dismissReport('${r.id}')" style="height:30px; padding:0 8px; font-size:11px; border-radius:6px; cursor:pointer;" title="Dismiss report without deleting comment">
                    <i class="fa-solid fa-xmark"></i>
                  </button>
                ` : `
                  <button type="button" class="btn-secondary" onclick="window.sendDirectMessage('${r.reportedByUserId}', '${(r.reportedByUserName || '').replace(/'/g, "\\'")}', 'Update on your Report', 'Thank you for your report. The content has been reviewed and action has been taken.')" style="height:30px; padding:0 8px; font-size:11px; border-radius:6px; cursor:pointer;" title="Message Reporter">
                    <i class="fa-solid fa-envelope" style="color:#10B981;"></i>
                  </button>
                  <button type="button" class="btn-secondary" onclick="window.sendDirectMessage('${r.commentAuthorId}', '${(r.commentAuthorName || '').replace(/'/g, "\\'")}', 'Community Guidelines Notice', 'Your recent comment was removed for violating our community guidelines.')" style="height:30px; padding:0 8px; font-size:11px; border-radius:6px; cursor:pointer;" title="Message Offender">
                    <i class="fa-solid fa-envelope" style="color:#EF4444;"></i>
                  </button>
                  <button type="button" class="btn-secondary" onclick="window.deleteReportRecord('${r.id}')" style="height:30px; padding:0 8px; font-size:11px; border-radius:6px; cursor:pointer; color:var(--text-tertiary);" title="Delete log record">
                    <i class="fa-solid fa-trash-can"></i>
                  </button>
                `}
              </div>
            </td>
          </tr>
        `;
      });

      tbody.innerHTML = h;
    };

    window.sendDirectMessage = async function(userId, userName, defaultTitle, defaultBody) {
      if (!userId || userId === 'undefined' || userId === 'unknown-user' || userId === 'guest-user') {
        showToast('Cannot send message: User ID is missing or anonymous.');
        return;
      }
      const msgBody = prompt(`Send Direct Message to ${userName}\n\nEnter message body:`, defaultBody);
      if (!msgBody) return;
      
      try {
        await addDoc(collection(db, 'messages'), {
          title: defaultTitle,
          body: msgBody,
          date: new Date().toLocaleDateString(),
          createdAt: new Date().toISOString(),
          targetUserId: userId,
          isUnread: true
        });
        showToast(`Message sent to ${userName}`);
      } catch(e) {
        showToast('Error sending message: ' + e.message);
      }
    };

    // Action: Delete Comment & Resolve Report
    window.deleteReportComment = async function(reportId, contentId, commentId, replyId, reporterId, reporterName, offenderId, offenderName) {
      if (!confirm('Are you sure you want to permanently delete this comment from the app?')) return;
      try {
        if (contentId && commentId) {
          const commentRef = doc(db, 'content', contentId, 'comments', commentId);
          if (replyId) {
            const snap = await getDoc(commentRef);
            if (snap.exists()) {
              const data = snap.data();
              const replies = (data.replies || []).filter(rep => rep.id !== replyId);
              await updateDoc(commentRef, { replies });
            }
          } else {
            await deleteDoc(commentRef);
          }
        }

        // Update report status
        const reportRef = doc(db, 'reports', reportId);
        await updateDoc(reportRef, {
          status: 'resolved',
          adminNotes: 'Comment permanently removed by Admin',
          resolvedAt: new Date().toISOString()
        });

        showToast('Comment deleted & report marked as resolved!');

        // Message Prompts
        setTimeout(() => {
          if (reporterId && reporterId !== 'unknown-user' && reporterId !== 'guest-user') {
            if (confirm(`Would you like to send an update message to the Reporter (${reporterName})?`)) {
              window.sendDirectMessage(reporterId, reporterName, 'Update on your Report', 'Thank you for your report. The content has been reviewed and removed for violating our community guidelines.');
            }
          }
          if (offenderId && offenderId !== 'unknown-user' && offenderId !== 'guest-user') {
             setTimeout(() => {
                if (confirm(`Would you like to send a warning message to the Offender (${offenderName})?`)) {
                  window.sendDirectMessage(offenderId, offenderName, 'Community Guidelines Notice', 'Your recent comment was removed for violating our community guidelines. Please adhere to our policies to avoid account suspension.');
                }
             }, 500);
          }
        }, 500);

      } catch (err) {
        console.error('Error removing comment:', err);
        showToast('Error removing comment: ' + err.message);
      }
    };

    // Action: Dismiss Report
    window.dismissReport = async function(reportId) {
      try {
        const reportRef = doc(db, 'reports', reportId);
        await updateDoc(reportRef, {
          status: 'dismissed',
          adminNotes: 'Reviewed & dismissed by Admin',
          resolvedAt: new Date().toISOString()
        });
        showToast('Report marked as dismissed');
      } catch (err) {
        console.error('Error dismissing report:', err);
        showToast('Error: ' + err.message);
      }
    };

    // Action: Delete Report Record from Firestore
    window.deleteReportRecord = async function(reportId) {
      if (!confirm('Delete this report log entry permanently?')) return;
      try {
        await deleteDoc(doc(db, 'reports', reportId));
        showToast('Report log record removed');
      } catch (err) {
        console.error('Error deleting report doc:', err);
        showToast('Error: ' + err.message);
      }
    };

    // ==========================================
    // CONTENT COMMENTS MANAGER LOGIC
    // ==========================================
    window.commentsManagerData = [];
    window.activeCommentsListener = null;

    window.loadCommentsManager = async function() {
      const grid = document.getElementById('comments-content-grid');
      if (!grid) return;
      grid.innerHTML = '<div style="grid-column: 1 / -1; text-align:center; padding:40px; color:var(--text-tertiary);"><i class="fa-solid fa-spinner fa-spin" style="font-size:24px; margin-bottom:10px;"></i><div>Loading content catalog...</div></div>';
      
      try {
        const snap = await getDocs(query(collection(db, 'content'), orderBy('createdAt', 'desc')));
        window.commentsManagerData = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        window.renderCommentsGrid();
      } catch (err) {
        console.error('Error loading content for comments:', err);
        grid.innerHTML = `<div style="grid-column: 1 / -1; text-align:center; padding:40px; color:#EF4444;">Error: ${err.message}</div>`;
      }
    };

    window.renderCommentsGrid = function() {
      const grid = document.getElementById('comments-content-grid');
      if (!grid) return;

      const search = (document.getElementById('comments-search-input')?.value || '').toLowerCase().trim();
      const filtered = window.commentsManagerData.filter(c => (c.title || '').toLowerCase().includes(search));

      if (filtered.length === 0) {
        grid.innerHTML = '<div style="grid-column: 1 / -1; text-align:center; padding:40px; color:var(--text-tertiary);">No content matches your search.</div>';
        return;
      }

      let h = '';
      filtered.forEach(c => {
        const posterUrl = c.posterUrl || 'https://via.placeholder.com/140x210';
        h += `
          <div style="background:var(--bg-tertiary); border:1px solid rgba(255,255,255,0.06); border-radius:12px; overflow:hidden; display:flex; flex-direction:column; position:relative; cursor:pointer; transition:transform 0.2s;" onmouseover="this.style.transform='scale(1.02)'" onmouseout="this.style.transform='scale(1)'" onclick="window.openCommentsDetail('${c.id}')">
             <div style="aspect-ratio:2/3; width:100%; position:relative;">
               <img src="${posterUrl}" onerror="this.src='https://via.placeholder.com/140x210'" style="width:100%; height:100%; object-fit:cover;">
               <div style="position:absolute; inset:0; background:linear-gradient(to top, rgba(0,0,0,0.9), transparent); display:flex; flex-direction:column; justify-content:flex-end; padding:10px;">
                 <div style="font-size:12px; font-weight:800; color:#FFF; text-shadow:0 1px 4px rgba(0,0,0,0.8); display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">${c.title}</div>
               </div>
             </div>
             <div style="padding:10px; background:rgba(0,0,0,0.5); display:flex; justify-content:center; align-items:center;">
               <button class="btn-secondary" style="width:100%; font-size:11px; padding:6px; background:rgba(255,255,255,0.1); border:none; color:var(--accent-cyan); font-weight:800;">
                 <i class="fa-solid fa-comments"></i> Manage Comments
               </button>
             </div>
          </div>
        `;
      });
      grid.innerHTML = h;
    };

    window.openCommentsDetail = function(contentId) {
      document.getElementById('comments-master-view').style.display = 'none';
      const detailView = document.getElementById('comments-detail-view');
      detailView.style.display = 'block';

      const content = window.commentsManagerData.find(c => c.id === contentId);
      if (!content) return;

      document.getElementById('cd-poster').src = content.posterUrl || '';
      document.getElementById('cd-bg-blur').style.backgroundImage = `url(${content.backdropUrl || content.posterUrl || ''})`;
      document.getElementById('cd-title').innerText = content.title || 'Unknown Title';
      document.getElementById('cd-desc').innerText = content.description || 'No description available.';

      let metaHtml = '';
      if (content.type) metaHtml += `<span style="background:rgba(255,255,255,0.1); padding:2px 8px; border-radius:4px; color:#FFF;">${content.type.toUpperCase()}</span>`;
      if (content.year) metaHtml += `<span>${content.year}</span>`;
      if (content.rating) metaHtml += `<span style="color:#FBBF24;"><i class="fa-solid fa-star"></i> ${content.rating}</span>`;
      document.getElementById('cd-meta').innerHTML = metaHtml;

      // Load Comments Realtime
      const listContainer = document.getElementById('cd-comments-list');
      listContainer.innerHTML = '<div style="text-align:center; padding:30px; color:var(--text-tertiary);"><i class="fa-solid fa-spinner fa-spin"></i> Loading comments...</div>';
      document.getElementById('cd-comment-count').innerText = '... comments';

      if (window.activeCommentsListener) window.activeCommentsListener();

      const commentsRef = collection(db, 'content', contentId, 'comments');
      const q = query(commentsRef, orderBy('createdAt', 'desc'));
      
      window.activeCommentsListener = onSnapshot(q, (snap) => {
         const comments = [];
         let totalCount = snap.docs.length;
         snap.forEach(d => {
           const data = d.data();
           comments.push({ id: d.id, ...data });
           if (data.replies && data.replies.length) totalCount += data.replies.length;
         });
         
         document.getElementById('cd-comment-count').innerText = totalCount + ' comments';

         if (comments.length === 0) {
           listContainer.innerHTML = '<div style="text-align:center; padding:40px; color:var(--text-tertiary);"><i class="fa-regular fa-comment-dots" style="font-size:32px; margin-bottom:10px; display:block; opacity:0.5;"></i>No comments yet for this content.</div>';
           return;
         }

         let ch = '';
         comments.forEach(cmt => {
           ch += window.renderSingleAdminComment(contentId, cmt);
         });
         listContainer.innerHTML = ch;
      }, (err) => {
         console.error('Comments Listener Error:', err);
         listContainer.innerHTML = `<div style="color:#EF4444; padding:20px;">Error loading comments: ${err.message}</div>`;
      });
    };

    window.closeCommentsDetail = function() {
      if (window.activeCommentsListener) {
        window.activeCommentsListener();
        window.activeCommentsListener = null;
      }
      document.getElementById('comments-detail-view').style.display = 'none';
      document.getElementById('comments-master-view').style.display = 'block';
    };

    window.renderSingleAdminComment = function(contentId, cmt) {
      const avatar = cmt.avatarUrl || cmt.authorAvatar || 'https://via.placeholder.com/40';
      const name = cmt.username || cmt.authorName || 'Anonymous';
      const text = cmt.text || '';
      const date = cmt.createdAt ? new Date(cmt.createdAt).toLocaleDateString() : '';

      let html = `
        <div style="background:rgba(0,0,0,0.3); border:1px solid rgba(255,255,255,0.06); border-radius:12px; padding:16px;">
          <div style="display:flex; justify-content:space-between; align-items:flex-start;">
             <div style="display:flex; gap:12px; align-items:flex-start; width:100%;">
               <img src="${avatar}" onerror="this.src='https://via.placeholder.com/40'" style="width:32px; height:32px; border-radius:50%; object-fit:cover; border:1px solid rgba(255,255,255,0.1);">
               <div style="flex:1;">
                 <div style="font-size:13px; font-weight:800; color:#FFF;">${name} <span style="font-size:10px; color:var(--text-tertiary); font-weight:400; margin-left:6px;">${date}</span></div>
                 <div style="font-size:13px; color:#E5E7EB; line-height:1.5; margin-top:4px;">${text}</div>
                 <div style="margin-top:8px; display:flex; gap:16px; align-items:center;">
                   <button onclick="window.adminReplyToCommentAction('${contentId}', '${cmt.id}', '${name.replace(/'/g, "\\'")}')" style="background:none; border:none; padding:0; font-size:11px; color:var(--text-tertiary); cursor:pointer; font-weight:700; transition:color 0.2s;" onmouseover="this.style.color='#10B981'" onmouseout="this.style.color='var(--text-tertiary)'"><i class="fa-solid fa-reply"></i> Reply</button>
                   <button onclick="window.adminDeleteCommentAction('${contentId}', '${cmt.id}')" style="background:none; border:none; padding:0; font-size:11px; color:var(--text-tertiary); cursor:pointer; font-weight:700; transition:color 0.2s;" onmouseover="this.style.color='#EF4444'" onmouseout="this.style.color='var(--text-tertiary)'"><i class="fa-solid fa-trash"></i> Delete</button>
                 </div>
               </div>
             </div>
          </div>
      `;

      if (cmt.replies && cmt.replies.length > 0) {
        html += `<div style="margin-top:12px; margin-left:44px; display:flex; flex-direction:column; gap:10px; border-left:2px solid rgba(255,255,255,0.08); padding-left:12px;">`;
        cmt.replies.forEach(rep => {
          const rAvatar = rep.avatarUrl || rep.authorAvatar || 'https://via.placeholder.com/30';
          const rName = rep.username || rep.authorName || 'User';
          const rText = rep.text || '';
          const rDate = rep.createdAt ? new Date(rep.createdAt).toLocaleDateString() : '';
          const isAdmin = rep.userId === 'admin' || rep.authorId === 'admin';
          
          html += `
            <div style="background:rgba(255,255,255,0.02); padding:10px 12px; border-radius:8px; display:flex; justify-content:space-between; align-items:flex-start;">
               <div style="display:flex; gap:10px; align-items:flex-start; width:100%;">
                 <img src="${rAvatar}" onerror="this.src='https://via.placeholder.com/30'" style="width:24px; height:24px; border-radius:50%; object-fit:cover; ${isAdmin ? 'border:1px solid #10B981;' : ''}">
                 <div style="flex:1;">
                   <div style="font-size:12px; font-weight:800; color:${isAdmin ? '#10B981' : '#FFF'};">${rName} ${isAdmin ? '<i class="fa-solid fa-circle-check" style="font-size:10px;"></i>' : ''} <span style="font-size:10px; color:var(--text-tertiary); font-weight:400; margin-left:6px;">${rDate}</span></div>
                   <div style="font-size:12px; color:#D1D5DB; line-height:1.4; margin-top:2px;">${rText}</div>
                   <div style="margin-top:8px; display:flex; gap:16px; align-items:center;">
                     <button onclick="window.adminReplyToCommentAction('${contentId}', '${cmt.id}', '${rName.replace(/'/g, "\\'")}')" style="background:none; border:none; padding:0; font-size:11px; color:var(--text-tertiary); cursor:pointer; font-weight:700; transition:color 0.2s;" onmouseover="this.style.color='#10B981'" onmouseout="this.style.color='var(--text-tertiary)'"><i class="fa-solid fa-reply"></i> Reply</button>
                     <button onclick="window.adminDeleteCommentAction('${contentId}', '${cmt.id}', true, '${rep.id}')" style="background:none; border:none; padding:0; font-size:11px; color:var(--text-tertiary); cursor:pointer; font-weight:700; transition:color 0.2s;" onmouseover="this.style.color='#EF4444'" onmouseout="this.style.color='var(--text-tertiary)'"><i class="fa-solid fa-trash"></i> Delete</button>
                   </div>
                 </div>
               </div>
            </div>
          `;
        });
        html += `</div>`;
      }

      html += `</div>`;
      return html;
    };

    window.openCommentSettings = function() {
      const savedName = localStorage.getItem('commentAdminName') || document.getElementById('ann-sender-name')?.value || document.getElementById('setting-app-name')?.value || 'MaxPlay Official';
      const savedAvatar = localStorage.getItem('commentAdminAvatar') || document.getElementById('ann-sender-avatar')?.value || '';
      
      document.getElementById('comment-admin-name').value = savedName;
      document.getElementById('comment-admin-avatar').value = savedAvatar;
      document.getElementById('comment-settings-modal').style.display = 'flex';
    };

    window.closeCommentSettings = function() {
      document.getElementById('comment-settings-modal').style.display = 'none';
    };

    window.saveCommentSettings = function() {
      const name = document.getElementById('comment-admin-name').value;
      const avatar = document.getElementById('comment-admin-avatar').value;
      localStorage.setItem('commentAdminName', name);
      localStorage.setItem('commentAdminAvatar', avatar);
      window.closeCommentSettings();
      showToast('Admin reply profile saved!');
    };

    window.adminDeleteCommentAction = async function(contentId, commentId, isReply = false, replyId = null) {
      if (!confirm('Permanently delete this comment?')) return;
      try {
        const commentRef = doc(db, 'content', contentId, 'comments', commentId);
        if (isReply && replyId) {
          const snap = await getDoc(commentRef);
          if (snap.exists()) {
            const data = snap.data();
            const replies = (data.replies || []).filter(r => r.id !== replyId);
            await updateDoc(commentRef, { replies });
          }
        } else {
          await deleteDoc(commentRef);
        }
        showToast('Comment deleted successfully');
      } catch (err) {
        showToast('Error deleting comment: ' + err.message);
      }
    };

    window.adminReplyToCommentAction = async function(contentId, commentId, userName) {
      const replyText = prompt(`Reply to ${userName} as Admin:\n(Your identity will be shown as the Official App Admin)`);
      if (!replyText || !replyText.trim()) return;

      const adminName = localStorage.getItem('commentAdminName') || document.getElementById('ann-sender-name')?.value || document.getElementById('setting-app-name')?.value || 'Admin';
      let adminAvatar = localStorage.getItem('commentAdminAvatar') || document.getElementById('ann-sender-avatar')?.value;
      if (!adminAvatar || !adminAvatar.trim()) {
        adminAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(adminName)}&background=10B981&color=fff&bold=true`;
      }
      
      try {
        const commentRef = doc(db, 'content', contentId, 'comments', commentId);
        const snap = await getDoc(commentRef);
        if (snap.exists()) {
          const data = snap.data();
          const replies = data.replies || [];
          replies.push({
            id: 'rep_' + Date.now() + Math.random().toString(36).substr(2, 5),
            text: replyText.trim(),
            userId: 'admin',
            authorId: 'admin',
            username: adminName,
            authorName: adminName,
            avatarUrl: adminAvatar,
            authorAvatar: adminAvatar,
            time: 'Just now',
            createdAt: new Date().toISOString()
          });
          await updateDoc(commentRef, { replies });
          showToast('Admin reply posted!');
        }
      } catch (err) {
        showToast('Error posting reply: ' + err.message);
      }
    };

    // Auto-init reports listener on script boot
    setTimeout(() => {
      if (window.initReportsListener) window.initReportsListener();
    }, 500);

    // Override switchTab to hook into all tabs renders
    const originalSwitchTab = window.switchTab;
    window.switchTab = function(tabId) {
       originalSwitchTab(tabId);
       if (tabId === 'dashboard') {
         if (window.loadDashboardStats) window.loadDashboardStats();
       } else if (tabId === 'users') {
         if (window.loadUsers) window.loadUsers();
       } else if (tabId === 'reports') {
         if (window.renderReportsTable) window.renderReportsTable();
       } else if (tabId === 'comments') {
         if (window.loadCommentsManager) window.loadCommentsManager();
       } else if (tabId === 'analytics') {
         if (window.loadAnalytics) window.loadAnalytics();
       } else if (tabId === 'messages') {
         if (window.loadMessagesHistory) window.loadMessagesHistory();
         if (window.updateAnnouncementLivePreview) window.updateAnnouncementLivePreview();
       } else if (tabId === 'settings') {
         if (window.loadGeneralSettings) window.loadGeneralSettings();
       } else if (tabId === 'hotscreens') {
         if (window.loadHotScreens) window.loadHotScreens();
       } else if (tabId === 'search') {
         if (window.renderHotSectionGrid) window.renderHotSectionGrid();
       } else if (tabId === 'homerows') {
         if (window.renderHomeRows) window.renderHomeRows();
       } else if (tabId === 'feedback') {
         if (window.loadFeedback) window.loadFeedback();
       }
    }; 
    window.feedbackData = []; window.currentFeedbackFilter = 'all'; 
    window.loadFeedback = async function() { 
      const tbody = document.getElementById('feedback-table-body'); 
      if (tbody) tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:40px; color:var(--text-tertiary);">Loading...</td></tr>'; 
      try { 
        const { collection, getDocs, query, orderBy } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
        const db = window.db || (await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js')).getFirestore();
        const q = query(collection(db, 'feedbacks'), orderBy('createdAt', 'desc')); 
        const snapshot = await getDocs(q); 
        const data = []; 
        snapshot.forEach(docSnap => data.push({ id: docSnap.id, ...docSnap.data() })); 
        window.feedbackData = data; window.filterFeedbackTable(); window.updateFeedbackStats(); 
      } catch(e) { console.error("Error", e); } 
    }; 
    window.updateFeedbackStats = function() { 
      const pendingCount = window.feedbackData.filter(f => f.status === 'pending').length; 
      const t1 = document.getElementById('fb-stat-total'); if(t1) t1.innerText = window.feedbackData.length; 
      const t2 = document.getElementById('fb-stat-pending'); if(t2) t2.innerText = pendingCount; 
      const t3 = document.getElementById('fb-stat-review'); if(t3) t3.innerText = window.feedbackData.filter(f => f.status === 'under_review').length; 
      const t4 = document.getElementById('fb-stat-resolved'); if(t4) t4.innerText = window.feedbackData.filter(f => f.status === 'resolved').length; 
      const b1 = document.getElementById('feedback-badge-count'); if(b1) b1.innerText = pendingCount + ' Pending'; 
      const b2 = document.getElementById('feedback-nav-badge'); if(b2) { b2.innerText = pendingCount; b2.style.display = pendingCount > 0 ? 'inline-block' : 'none'; } 
    }; 
    window.setFeedbackStatusFilter = function(status) { 
      window.currentFeedbackFilter = status; 
      document.querySelectorAll('[id^="feedback-filter-"]').forEach(btn => { btn.classList.remove('active'); btn.style.background = 'transparent'; btn.style.color = '#FFF'; btn.style.border = '1px solid rgba(255,255,255,0.1)'; }); 
      const activeBtn = document.getElementById('feedback-filter-' + status); 
      if(activeBtn) { activeBtn.classList.add('active'); activeBtn.style.background = 'linear-gradient(135deg, #06B6D4, #8B5CF6)'; activeBtn.style.border = 'none'; } 
      window.filterFeedbackTable(); 
    }; 
    window.filterFeedbackTable = function() { 
      const term = (document.getElementById('feedback-search-input')?.value || '').toLowerCase(); 
      const cat = document.getElementById('feedback-category-filter')?.value || 'ALL'; 
      const tbody = document.getElementById('feedback-table-body'); if(!tbody) return; 
      const filtered = window.feedbackData.filter(f => { 
        const mS = !term || (f.userName||'').toLowerCase().includes(term) || (f.userEmail||'').toLowerCase().includes(term) || (f.userId||'').toLowerCase().includes(term) || (f.customTopic||'').toLowerCase().includes(term) || (f.details||'').toLowerCase().includes(term); 
        const mC = cat === 'ALL' || f.category === cat; 
        const mSt = window.currentFeedbackFilter === 'all' || f.status === window.currentFeedbackFilter; 
        return mS && mC && mSt; 
      }); 
      if(filtered.length === 0) { tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:40px; color:var(--text-tertiary);">No results</td></tr>'; return; } 
      tbody.innerHTML = filtered.map(f => { 
        let sc='#A1A1AA', sb='rgba(255,255,255,0.1)', sl='Unknown'; 
        if(f.status==='pending'){sc='#FBBF24';sb='rgba(245,158,11,0.15)';sl='Pending';} 
        if(f.status==='under_review'){sc='#22D3EE';sb='rgba(6,182,212,0.15)';sl='In Review';} 
        if(f.status==='resolved'){sc='#34D399';sb='rgba(16,185,129,0.15)';sl='Resolved';} 
        if(f.status==='dismissed'){sc='#71717A';sb='rgba(255,255,255,0.05)';sl='Dismissed';} 
        return '<tr><td style="padding:14px;"><b>' + (f.userName||'U') + '</b><br><span style="font-size:10px;color:gray;">'+new Date(f.createdAt).toLocaleString()+'</span></td><td style="padding:14px;">' + (f.userId ? f.userId.substring(0,8) : 'N/A') + '</td><td style="padding:14px;">' + (f.userEmail||'N/A') + '</td><td style="padding:14px;">' + (f.categoryLabel||f.category) + (f.customTopic ? '<br><span style="font-size:10px;color:#FBBF24;">' + f.customTopic + '</span>' : '') + '</td><td style="padding:14px;"><span style="color:'+sc+';background:'+sb+';padding:2px 6px;border-radius:4px;">'+sl+'</span></td><td style="padding:14px;">' + (f.screenshots?.length>0 ? f.screenshots.length + ' imgs' : 'Text') + '</td><td style="padding:14px;"><button type="button" class="btn-primary" onclick="window.openFeedbackDetailModal(\'' + f.id + '\')">Review</button></td></tr>'; 
      }).join(''); 
    }; 
    window.currentFeedbackTicket = null; 
    window.openFeedbackDetailModal = function(id) { 
      const tk = window.feedbackData.find(x => x.id === id); if(!tk) return; 
      window.currentFeedbackTicket = tk; 
      document.getElementById('fb-modal-ticket-id').innerText = '#' + id.substring(0,8).toUpperCase(); 
      document.getElementById('fb-modal-date').innerText = new Date(tk.createdAt).toLocaleString(); 
      document.getElementById('fb-modal-user-name').innerText = tk.userName||'U'; 
      document.getElementById('fb-modal-user-email').innerText = tk.userEmail||'N/A'; 
      document.getElementById('fb-modal-user-uid').innerText = tk.userId||'N/A'; 
      document.getElementById('fb-modal-category-badge').innerText = tk.categoryLabel||tk.category; 
      document.getElementById('fb-modal-telemetry-meta').innerText = tk.deviceInfo||'Unknown'; 
      document.getElementById('fb-modal-custom-topic-box').style.display = tk.customTopic ? 'block' : 'none';
      if(tk.customTopic) document.getElementById('fb-modal-custom-topic-text').innerText = tk.customTopic;
      document.getElementById('fb-modal-details-text').innerText = tk.details||''; 
      document.getElementById('fb-modal-status-select').value = tk.status||'pending'; 
      document.getElementById('fb-modal-reply-body').value = tk.adminReply||''; 
      const sg = document.getElementById('fb-modal-screenshots-grid'); 
      if(tk.screenshots?.length > 0) { 
        document.getElementById('fb-modal-screenshots-section').style.display='block'; 
        sg.innerHTML = tk.screenshots.map(s => '<img src="' + s + '" style="width:100%;aspect-ratio:16/9;object-fit:cover;cursor:pointer;" onclick="window.openFeedbackScreenshotLightbox(\'' + s + '\')">').join(''); 
      } else { 
        document.getElementById('fb-modal-screenshots-section').style.display='none'; 
      } 
      document.getElementById('feedback-detail-modal').style.display = 'flex'; 
    }; 
    window.closeFeedbackDetailModal = function() { document.getElementById('feedback-detail-modal').style.display = 'none'; }; 
    window.openFeedbackScreenshotLightbox = function(s) { document.getElementById('lightbox-img-element').src = s; document.getElementById('lightbox-open-newtab').href = s; document.getElementById('feedback-screenshot-lightbox').style.display = 'flex'; }; 
    window.closeFeedbackScreenshotLightbox = function() { document.getElementById('feedback-screenshot-lightbox').style.display = 'none'; }; 
    window.applyFeedbackTemplate = function(k) { 
      const r = document.getElementById('fb-modal-reply-body'); 
      const s = document.getElementById('fb-modal-status-select'); 
      if(k==='resolved'){ r.value='Fixed! Thanks!'; s.value='resolved'; } 
      else if(k==='investigating'){ r.value='Investigating now.'; s.value='under_review'; } 
      else if(k==='feature_logged'){ r.value='Feature request logged.'; s.value='resolved'; }
      else if(k==='more_info'){ r.value='Need more info.'; s.value='under_review'; } 
    }; 
    window.saveFeedbackTicketResolution = async function() { 
      if(!window.currentFeedbackTicket) return; 
      const id = window.currentFeedbackTicket.id; 
      const s = document.getElementById('fb-modal-status-select').value; 
      const r = document.getElementById('fb-modal-reply-body').value.trim(); 
      const snd = document.getElementById('fb-modal-send-inbox-notification').checked; 
      try { 
        const { updateDoc, doc, addDoc, collection } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
        const db = window.db || (await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js')).getFirestore();
        const d = { status: s, updatedAt: new Date().toISOString() }; 
        if(r) { d.adminReply = r; d.adminReplyDate = new Date().toISOString(); d.adminReplySubject = "Response to your feedback: " + (window.currentFeedbackTicket.categoryLabel || 'Support Ticket'); } 
        await updateDoc(doc(db, 'feedbacks', id), d); 
        if(snd && r && window.currentFeedbackTicket.userId) { 
          await addDoc(collection(db, 'systemMessages'), { userId: window.currentFeedbackTicket.userId, title: "Support Ticket Update", message: r, type: 'support_reply', priority: 'normal', createdAt: new Date().toISOString(), isUnread: true }); 
        } 
        if(window.showToast) window.showToast('Updated'); 
        window.closeFeedbackDetailModal(); 
        window.loadFeedback(); 
      } catch(e) { console.error(e); } 
    }; 
    window.deleteCurrentFeedbackTicket = async function() { 
      if(!window.currentFeedbackTicket) return; 
      if(!confirm('Delete?')) return; 
      try { 
        const { deleteDoc, doc } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
        const db = window.db || (await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js')).getFirestore();
        await deleteDoc(doc(db, 'feedbacks', window.currentFeedbackTicket.id)); 
        window.closeFeedbackDetailModal(); window.loadFeedback(); 
      } catch(e) {} 
    }; 
    window.openDirectMessageModal = function(u,n,e) { 
      document.getElementById('dm-target-uid').value = u||''; 
      document.getElementById('dm-recipient-info').value = n ? n + ' (' + (e||'') + ')' : ''; 
      document.getElementById('dm-msg-title').value = 'Support Update'; 
      document.getElementById('dm-msg-body').value = ''; 
      document.getElementById('direct-message-user-modal').style.display = 'flex'; 
    }; 
    window.closeDirectMessageModal = function() { document.getElementById('direct-message-user-modal').style.display = 'none'; }; 
    window.sendDirectMessageToUser = async function() { 
      const u = document.getElementById('dm-target-uid').value.trim(); 
      const t = document.getElementById('dm-msg-title').value.trim(); 
      const b = document.getElementById('dm-msg-body').value.trim(); 
      if(!u || !b) return; 
      try { 
        const { addDoc, collection } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
        const db = window.db || (await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js')).getFirestore();
        await addDoc(collection(db, 'systemMessages'), { userId: u, title: t||'Admin Message', message: b, type: 'support_reply', priority: 'normal', createdAt: new Date().toISOString(), isUnread: true }); 
        window.closeDirectMessageModal(); 
        if(window.showToast) window.showToast('Sent!'); 
      } catch(e) {} 
    }; 
  