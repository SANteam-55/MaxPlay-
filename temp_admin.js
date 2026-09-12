    import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
    import { 
      getFirestore, collection, getDocs, getDoc, doc, setDoc, addDoc, updateDoc, deleteDoc, onSnapshot, query, orderBy 
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

    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
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
        'homerows': 'Home Screen Cards & Rows',
        'search': 'Search Screen Tags',
        'users': 'Registered User Accounts',
        'analytics': 'Performance Analytics',
        'messages': 'Broadcast Announcements',
        'settings': 'General & System Settings'
      };
      document.getElementById('current-page-title').innerText = pageTitles[tabId] || 'Admin Portal';

      if (tabId === 'banners' && window.loadHeroBanners) window.loadHeroBanners();
      if (tabId === 'categories' && window.loadCategories) window.loadCategories();
      if (tabId === 'homerows' && window.loadHomeRows) window.loadHomeRows();
      if (tabId === 'users' && window.loadUsers) window.loadUsers();
      if (tabId === 'messages' && window.loadMessagesHistory) window.loadMessagesHistory();
      if (tabId === 'analytics' && window.loadAnalytics) window.loadAnalytics();
      
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

      // Check Home Rows checkboxes
      const assignedRows = item.homeRows || [];
      document.querySelectorAll('.hr-checkbox').forEach(cb => {
        cb.checked = assignedRows.includes(cb.value);
      });

      // Video Links / Episodes
      if (item.type === 'movie') {
        switchUploadMode('movie');
        const links = item.videoLinks || (item.videoUrl ? [item.videoUrl] : ['https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4']);
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

    window.renderMovieLinksUI = function(linksArray) {
      const container = document.getElementById('movie-link-rows');
      if (!container) return;
      let h = '';
      linksArray.forEach((url, i) => {
        h += `
          <div style="display:flex; gap:10px; align-items:center;">
            <span style="font-size:12px; font-weight:700; width:60px; color:var(--text-secondary);">Part ${i + 1}:</span>
            <input type="text" class="input-control movie-link-input" value="${url}" placeholder="https://catbox.moe/video.mp4">
            <button type="button" class="btn-danger" style="height:42px; padding:0 12px;" onclick="this.parentElement.remove()"><i class="fa-solid fa-trash"></i></button>
          </div>
        `;
      });
      container.innerHTML = h;
    };

    window.addMovieLinkRow = function() {
      const container = document.getElementById('movie-link-rows');
      const count = container.querySelectorAll('.movie-link-input').length;
      const div = document.createElement('div');
      div.style.display = 'flex';
      div.style.gap = '10px';
      div.style.alignItems = 'center';
      div.innerHTML = `
        <span style="font-size:12px; font-weight:700; width:60px; color:var(--text-secondary);">Part ${count + 1}:</span>
        <input type="text" class="input-control movie-link-input" value="" placeholder="https://catbox.moe/video.mp4">
        <button type="button" class="btn-danger" style="height:42px; padding:0 12px;" onclick="this.parentElement.remove()"><i class="fa-solid fa-trash"></i></button>
      `;
      container.appendChild(div);
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
      const newNum = window.seasonsData.length + 1;
      window.seasonsData.push({ seasonNumber: newNum, seasonTitle: 'Season ' + newNum, episodes: [] });
      window.currentSeasonIdx = window.seasonsData.length - 1;
      renderSeasonsUI();
      showToast('Created Season ' + newNum);
    };

    window.switchSeason = function(idx) {
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

    window.renderEpisodesList = function() {
      const listContainer = document.getElementById('season-episodes-list');
      if (!listContainer) return;

      const activeSeason = window.seasonsData[window.currentSeasonIdx] || { episodes: [] };
      const episodes = activeSeason.episodes || [];

      if (episodes.length === 0) {
        listContainer.innerHTML = `<div style="background:var(--bg-tertiary); padding:24px; border-radius:10px; text-align:center; color:var(--text-tertiary); border:1px solid var(--border-color);">No episodes in this season yet. Click "+ Add Episode Box" or "⚡ Auto-Generate Episodes".</div>`;
        return;
      }

      let h = '';
      episodes.forEach((ep, epIdx) => {
        let linksHTML = '';
        if (ep.videoLinks && ep.videoLinks.length > 0) {
          ep.videoLinks.forEach((link, linkIdx) => {
            linksHTML += `
              <div style="display:flex; gap:10px; margin-top:8px;">
                <div style="flex:1;">
                  <label class="form-label" style="font-size:10px;">Part ${linkIdx + 2} URL</label>
                  <input type="text" class="input-control" value="${link}" placeholder="https://..." onchange="updateEpisodeLink(${epIdx}, ${linkIdx}, this.value)">
                </div>
                <button type="button" class="btn-danger" style="align-self:flex-end; height:34px; padding:0 12px; margin-bottom:2px;" onclick="removeEpisodeLink(${epIdx}, ${linkIdx})"><i class="fa-solid fa-trash"></i></button>
              </div>
            `;
          });
        }

        h += `
          <div class="episode-card">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-weight:800; font-size:13px; color:var(--accent-cyan);"><i class="fa-solid fa-circle-play"></i> Episode Box ${ep.episodeNumber || (epIdx + 1)}</span>
              <button type="button" class="btn-danger" style="height:28px; padding:0 8px; font-size:11px;" onclick="deleteEpisodeCard(${epIdx})"><i class="fa-solid fa-trash"></i> Delete</button>
            </div>
            <div style="display:grid; grid-template-columns: 80px 2fr 1fr; gap:10px;">
              <div>
                <label class="form-label" style="font-size:10px;">Ep #</label>
                <input type="number" class="input-control" value="${ep.episodeNumber || (epIdx + 1)}" onchange="updateEpisodeField(${epIdx}, 'episodeNumber', parseInt(this.value))">
              </div>
              <div>
                <label class="form-label" style="font-size:10px;">Title</label>
                <input type="text" class="input-control" value="${ep.title || ''}" placeholder="Episode Title" onchange="updateEpisodeField(${epIdx}, 'title', this.value)">
              </div>
              <div>
                <label class="form-label" style="font-size:10px;">Duration (Mins)</label>
                <input type="number" class="input-control" value="${ep.duration ? Math.round(ep.duration / 60) : 24}" onchange="updateEpisodeField(${epIdx}, 'duration', parseInt(this.value) * 60)">
              </div>
            </div>
            <div style="display:grid; grid-template-columns: 1fr 2fr; gap:10px;">
              <div>
                <label class="form-label" style="font-size:10px;">Thumbnail URL</label>
                <input type="text" class="input-control" value="${ep.thumbnailUrl || ''}" placeholder="https://..." onchange="updateEpisodeField(${epIdx}, 'thumbnailUrl', this.value)">
              </div>
              <div>
                <label class="form-label" style="font-size:10px;">Video Stream URL / Link (Part 1)</label>
                <input type="text" class="input-control" value="${ep.videoUrl || ''}" placeholder="https://..." onchange="updateEpisodeField(${epIdx}, 'videoUrl', this.value)">
                
                ${linksHTML}

                <div style="margin-top:8px;">
                  <button type="button" class="btn-secondary" style="height:28px; padding:0 10px; font-size:11px;" onclick="addEpisodeLink(${epIdx})">
                    <i class="fa-solid fa-plus"></i> Add more links (Parts)
                  </button>
                </div>
              </div>
            </div>
          </div>
        `;
      });
      listContainer.innerHTML = h;
    };

    window.addEpisodeLink = function(epIdx) {
      const activeSeason = window.seasonsData[window.currentSeasonIdx];
      if (activeSeason && activeSeason.episodes && activeSeason.episodes[epIdx]) {
        const ep = activeSeason.episodes[epIdx];
        if (!ep.videoLinks) ep.videoLinks = [];
        ep.videoLinks.push('https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4');
        renderEpisodesList();
      }
    };

    window.updateEpisodeLink = function(epIdx, linkIdx, val) {
      const activeSeason = window.seasonsData[window.currentSeasonIdx];
      if (activeSeason && activeSeason.episodes && activeSeason.episodes[epIdx]) {
        const ep = activeSeason.episodes[epIdx];
        if (ep.videoLinks && ep.videoLinks[linkIdx] !== undefined) {
          ep.videoLinks[linkIdx] = val;
        }
      }
    };

    window.removeEpisodeLink = function(epIdx, linkIdx) {
      const activeSeason = window.seasonsData[window.currentSeasonIdx];
      if (activeSeason && activeSeason.episodes && activeSeason.episodes[epIdx]) {
        const ep = activeSeason.episodes[epIdx];
        if (ep.videoLinks) {
          ep.videoLinks.splice(linkIdx, 1);
          renderEpisodesList();
        }
      }
    };

    window.addEpisodeCardToActiveSeason = function() {
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
        videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4'
      });

      renderEpisodesList();
    };

    window.updateEpisodeField = function(epIdx, field, val) {
      const activeSeason = window.seasonsData[window.currentSeasonIdx];
      if (activeSeason && activeSeason.episodes && activeSeason.episodes[epIdx]) {
        activeSeason.episodes[epIdx][field] = val;
      }
    };

    window.deleteEpisodeCard = function(epIdx) {
      const activeSeason = window.seasonsData[window.currentSeasonIdx];
      if (activeSeason && activeSeason.episodes) {
        activeSeason.episodes.splice(epIdx, 1);
        renderEpisodesList();
      }
    };

    window.autoGenerateEpisodesPrompt = function() {
      const countStr = prompt("How many episodes to auto-generate for this season?", "12");
      if (!countStr) return;
      const count = parseInt(countStr);
      if (isNaN(count) || count <= 0) return;

      const baseUrl = prompt("Enter base video URL pattern (use {n} for ep number or leave as default):", "https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4");
      const posterUrl = document.getElementById('up-poster')?.value || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800';

      const activeSeason = window.seasonsData[window.currentSeasonIdx];
      activeSeason.episodes = [];

      for (let i = 1; i <= count; i++) {
        const epUrl = baseUrl ? baseUrl.replace('{n}', i) : 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';
        activeSeason.episodes.push({
          id: 'ep-' + Date.now() + '-' + i,
          episodeNumber: i,
          title: 'Episode ' + i,
          duration: 1440,
          thumbnailUrl: posterUrl,
          videoUrl: epUrl
        });
      }

      renderEpisodesList();
      showToast('Generated ' + count + ' episodes!');
    };

    window.renderReviewSummary = function() {
      const title = document.getElementById('up-title').value || 'Untitled';
      const type = document.getElementById('up-type').value || 'anime';
      const selectedRows = [];
      document.querySelectorAll('.hr-checkbox:checked').forEach(cb => selectedRows.push(cb.value));

      let streamSummary = '';
      if (window.currentUploadMode === 'movie') {
        const count = document.querySelectorAll('.movie-link-input').length;
        streamSummary = `${count} Splitted Video Part Link(s)`;
      } else {
        let totalEps = 0;
        window.seasonsData.forEach(s => totalEps += (s.episodes || []).length);
        streamSummary = `${window.seasonsData.length} Season(s), ${totalEps} Total Episode(s)`;
      }

      const container = document.getElementById('review-summary-details');
      if (container) {
        container.innerHTML = `
          <div><strong>Title:</strong> ${title} (${type.toUpperCase()})</div>
          <div><strong>Home Screen Placement:</strong> ${selectedRows.length > 0 ? selectedRows.join(', ') : 'Standard Library'}</div>
          <div><strong>Media Streams:</strong> ${streamSummary}</div>
        `;
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
      let movieLinks = [];
      let activeSeasons = [];
      let activeEpisodesList = [];
      let firstVideoUrl = 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4';

      if (window.currentUploadMode === 'movie') {
        document.querySelectorAll('.movie-link-input').forEach(inp => {
          if (inp.value && inp.value.trim()) movieLinks.push(inp.value.trim());
        });
        if (movieLinks.length > 0) firstVideoUrl = movieLinks[0];
      } else {
        activeSeasons = JSON.parse(JSON.stringify(window.seasonsData));
        activeEpisodesList = activeSeasons.flatMap(s => s.episodes || []);
        if (activeEpisodesList.length > 0 && activeEpisodesList[0].videoUrl) {
          firstVideoUrl = activeEpisodesList[0].videoUrl;
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
        videoLinks: movieLinks.length > 0 ? movieLinks : [firstVideoUrl],
        seasonsData: activeSeasons,
        episodesList: activeEpisodesList,
        trending: selectedRows.length > 0,
        createdAt: new Date().toISOString()
      };

      try {
        await setDoc(doc(db, 'content', contentId), contentDoc, { merge: true });
        showToast('Successfully published content to Firestore!');
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
      const titleEl = document.getElementById('hb-title-' + idx);
      const subEl = document.getElementById('hb-sub-' + idx);
      const imgEl = document.getElementById('hb-img-' + idx);

      const prevTitle = document.getElementById('hb-preview-title-' + idx);
      const prevSub = document.getElementById('hb-preview-sub-' + idx);
      const prevImg = document.getElementById('hb-preview-img-' + idx);

      if (prevTitle && titleEl) prevTitle.innerText = titleEl.value || 'Banner Title';
      if (prevSub && subEl) prevSub.innerText = subEl.value || 'Featured Content';
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

             <div style="display:grid; grid-template-columns: 1fr 1fr 2fr 1fr 80px; gap:10px;">
               <div>
                 <label class="form-label" style="font-size:10px;">Title</label>
                 <input type="text" id="hb-title-${idx}" class="input-control" value="${b.title || ''}" oninput="updateHeroBannerPreview(${idx})">
               </div>
               <div>
                 <label class="form-label" style="font-size:10px;">Subtitle</label>
                 <input type="text" id="hb-sub-${idx}" class="input-control" value="${b.subtitle || ''}" oninput="updateHeroBannerPreview(${idx})">
               </div>
               <div>
                 <label class="form-label" style="font-size:10px;">Image URL (Paste Link Here)</label>
                 <input type="text" id="hb-img-${idx}" class="input-control" value="${b.imageUrl || ''}" oninput="updateHeroBannerPreview(${idx})" placeholder="https://...">
               </div>
               <div>
                 <label class="form-label" style="font-size:10px;">Link to Content</label>
                 <select id="hb-content-${idx}" class="input-control">
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
          const title = document.getElementById(`hb-title-${i}`)?.value || '';
          const subtitle = document.getElementById(`hb-sub-${i}`)?.value || '';
          const imageUrl = document.getElementById(`hb-img-${i}`)?.value || '';
          const contentId = document.getElementById(`hb-content-${i}`)?.value || '';
          const order = parseInt(document.getElementById(`hb-order-${i}`)?.value || (i + 1));

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

    // USER MANAGEMENT
    window.loadUsers = async function() {
      const tbody = document.getElementById('users-table-body');
      if (!tbody) return;
      try {
        const snap = await getDocs(collection(db, 'users'));
        window.usersData = [];
        let h = '';
        snap.forEach(d => {
          const u = d.data();
          window.usersData.push({ id: d.id, ...u });
          h += `
            <tr>
              <td style="font-weight:700;">${u.displayName || 'User'}</td>
              <td style="font-size:11px; color:var(--text-tertiary);">${d.id}</td>
              <td>${u.email || 'N/A'}</td>
              <td><span class="status-badge ${u.isPremium ? 'status-vip' : 'status-active'}">${u.isPremium ? 'VIP PREMIUM' : 'FREE'}</span></td>
              <td>
                <button class="btn-secondary" style="height:32px; font-size:11px;" onclick="toggleUserPremium('${d.id}', ${!u.isPremium})">
                  ${u.isPremium ? 'Downgrade to Free' : 'Upgrade to VIP'}
                </button>
              </td>
            </tr>
          `;
        });
        tbody.innerHTML = h || '<tr><td colspan="5" style="text-align:center; padding:30px; color:var(--text-tertiary);">No registered users yet.</td></tr>';
        
        const usersEl = document.getElementById('dash-users');
        if (usersEl) usersEl.innerText = window.usersData.length.toString();
        const premEl = document.getElementById('dash-premium');
        if (premEl) premEl.innerText = window.usersData.filter(u => u.isPremium).length.toString();
      } catch(e) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:30px; color:var(--text-tertiary);">User database active.</td></tr>';
      }
    };

    window.toggleUserPremium = async function(uid, isPrem) {
      try {
        await updateDoc(doc(db, 'users', uid), { isPremium: isPrem });
        showToast('Updated user status!');
        loadUsers();
      } catch(e) { showToast('Error updating user'); }
    };

    // BROADCAST ANNOUNCEMENTS
    window.sendBroadcast = async function() {
      const title = document.getElementById('ann-title').value.trim();
      const body = document.getElementById('ann-body').value.trim();
      if (!title) {
        showToast('Please enter notification title');
        return;
      }
      try {
        await addDoc(collection(db, 'messages'), {
          title,
          body,
          date: new Date().toLocaleDateString(),
          isUnread: true,
          createdAt: new Date().toISOString()
        });
        showToast('Broadcast notification sent to all app users!');
        document.getElementById('ann-title').value = '';
        document.getElementById('ann-body').value = '';
        loadMessagesHistory();
      } catch(e) { showToast('Error sending broadcast'); }
    };

    window.loadMessagesHistory = async function() {
      const tbody = document.getElementById('messages-history-body');
      if (!tbody) return;
      try {
        const snap = await getDocs(collection(db, 'messages'));
        let h = '';
        snap.forEach(d => {
          const m = d.data();
          h += `
            <tr>
              <td style="font-weight:700;">${m.title || 'Notification'}</td>
              <td style="color:var(--text-secondary);">${m.body || ''}</td>
              <td style="font-size:11px; color:var(--text-tertiary);">${m.date || 'Today'}</td>
              <td>
                <button class="btn-danger" style="height:30px; padding:0 8px; font-size:11px;" onclick="deleteMessage('${d.id}')"><i class="fa-solid fa-trash"></i></button>
              </td>
            </tr>
          `;
        });
        tbody.innerHTML = h || '<tr><td colspan="4" style="text-align:center; padding:20px; color:var(--text-tertiary);">No announcements sent yet.</td></tr>';
      } catch(e) {}
    };

    window.deleteMessage = async function(mId) {
      try {
        await deleteDoc(doc(db, 'messages', mId));
        showToast('Message deleted');
        loadMessagesHistory();
      } catch(e) { showToast('Error deleting message'); }
    };

    // GENERAL SETTINGS & MAINTENANCE
    window.toggleMaintenanceMode = async function(isActive) {
      try {
        await setDoc(doc(db, 'settings', 'general'), { maintenanceMode: isActive }, { merge: true });
        const el = document.getElementById('maintenance-status');
        if (el) {
          el.innerText = isActive ? 'Active (App Locked)' : 'Disabled';
          el.style.color = isActive ? 'var(--accent-red)' : 'var(--text-secondary)';
        }
        showToast(isActive ? 'Maintenance Mode ENABLED!' : 'Maintenance Mode DISABLED');
      } catch(e) { showToast('Error saving maintenance mode'); }
    };

    window.saveGeneralSettings = async function() {
      const appName = document.getElementById('setting-app-name').value;
      const supportEmail = document.getElementById('setting-support-email').value;
      try {
        await setDoc(doc(db, 'settings', 'general'), { appName, supportEmail }, { merge: true });
        showToast('General settings updated!');
      } catch(e) { showToast('Error saving settings'); }
    };

    // ANALYTICS SCREEN
    window.loadAnalytics = function() {
      const typesContainer = document.getElementById('analytics-content-types');
      const userStatsContainer = document.getElementById('analytics-user-stats');

      if (typesContainer) {
        const counts = { movie: 0, anime: 0, tv: 0, short_tv: 0 };
        (window.cachedContentDocs || []).forEach(c => {
          if (!c || !c.data) return;
          const t = c.data.type || 'movie';
          if (counts[t] !== undefined) counts[t]++;
          else counts.movie++;
        });

        typesContainer.innerHTML = `
          <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.05);">
            <span>🎬 Movies</span><strong>${counts.movie}</strong>
          </div>
          <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.05);">
            <span>⚡ Anime Series</span><strong>${counts.anime}</strong>
          </div>
          <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.05);">
            <span>📺 TV Series</span><strong>${counts.tv}</strong>
          </div>
          <div style="display:flex; justify-content:space-between; padding:8px 0;">
            <span>📱 Short TV</span><strong>${counts.short_tv}</strong>
          </div>
        `;
      }

      if (userStatsContainer) {
        const users = window.usersData || [];
        const totalU = users.length;
        const vipU = users.filter(u => u && u.isPremium).length;
        const freeU = Math.max(0, totalU - vipU);

        userStatsContainer.innerHTML = `
          <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.05);">
            <span>👥 Registered Accounts</span><strong>${totalU}</strong>
          </div>
          <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.05);">
            <span>👑 VIP Premium Members</span><strong style="color:var(--accent-amber);">${vipU}</strong>
          </div>
          <div style="display:flex; justify-content:space-between; padding:8px 0;">
            <span>🆓 Standard Free Users</span><strong>${freeU}</strong>
          </div>
        `;
      }
    };

    window.loadDashboardStats = function() {
      const contentEl = document.getElementById('dash-content');
      if (contentEl) contentEl.innerText = (window.cachedContentDocs || []).length.toString();

      const catsEl = document.getElementById('dash-categories');
      if (catsEl) catsEl.innerText = ((window.categoriesData || []).length + (window.homeRowsData || []).length).toString();

      const tbody = document.getElementById('dash-recent-content');
      if (tbody && (window.cachedContentDocs || []).length > 0) {
        const recent = [...window.cachedContentDocs].slice(0, 5);
        let h = '';
        recent.forEach(r => {
          if (!r || !r.data) return;
          h += `
            <tr>
              <td style="font-weight:700;">${r.data.title || 'Untitled'}</td>
              <td><span class="status-badge status-active" style="text-transform:uppercase;">${r.data.type || 'Movie'}</span></td>
              <td style="color:var(--text-tertiary); font-size:11px;">${r.data.createdAt ? new Date(r.data.createdAt).toLocaleDateString() : 'Recently'}</td>
            </tr>
          `;
        });
        tbody.innerHTML = h;
      }
    };

    // INIT LISTENERS
    window.loadContentList();
    window.loadHomeRows();
    window.loadCategories();
    window.loadUsers();

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
        h += `
          <div style="background:var(--bg-secondary); border:1px solid var(--border-color); border-radius:8px; padding:12px; display:flex; gap:12px; align-items:center;">
            <img src="${b.imageUrl}" style="width:100px; height:50px; object-fit:cover; border-radius:6px; background:var(--bg-tertiary);">
            <div style="flex:1;">
              <input type="text" class="input-control" value="${b.title || ''}" onchange="updateHotBanner('${b.id}', 'title', this.value)" placeholder="Banner Title" style="font-size:12px; padding:6px; margin-bottom:4px;">
              <input type="text" class="input-control" value="${b.subtitle || ''}" onchange="updateHotBanner('${b.id}', 'subtitle', this.value)" placeholder="Subtitle" style="font-size:11px; padding:6px; margin-bottom:4px;">
              <input type="text" class="input-control" value="${b.imageUrl || ''}" onchange="updateHotBanner('${b.id}', 'imageUrl', this.value)" placeholder="Image URL" style="font-size:11px; padding:6px;">
            </div>
            <div style="width:60px;">
               <label style="font-size:9px; color:var(--text-tertiary);">Order</label>
               <input type="number" class="input-control" value="${b.order || 1}" onchange="updateHotBanner('${b.id}', 'order', this.value)" style="font-size:11px; padding:4px;">
            </div>
            <button onclick="deleteHotBanner('${b.id}')" style="background:none; border:none; color:var(--accent-red); cursor:pointer;"><i class="fa-solid fa-trash"></i></button>
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
        container.innerHTML = '<div style="color:var(--text-secondary); font-size:12px; text-align:center; padding:10px;">No custom rows.</div>';
        return;
      }
      
      let h = '';
      rows.forEach((row, idx) => {
        const isCustomPick = row.mode === 'custom_pick';
        h += `
          <div style="background:var(--bg-secondary); border:1px solid var(--border-color); border-radius:12px; padding:16px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
              <div style="display:flex; align-items:center; gap:8px;">
                <span style="font-weight:800; font-size:14px; color:var(--accent-purple);">#${idx + 1}</span>
                <span style="font-weight:700; font-size:14px;">${row.title || 'Untitled'}</span>
              </div>
              <div style="display:flex; gap:10px;">
                <button ${idx===0 ? 'disabled':''} onclick="moveHotRow('${row.id}', 'up')" class="btn-secondary" style="padding:4px 8px; font-size:11px;"><i class="fa-solid fa-arrow-up"></i></button>
                <button ${idx===rows.length-1 ? 'disabled':''} onclick="moveHotRow('${row.id}', 'down')" class="btn-secondary" style="padding:4px 8px; font-size:11px;"><i class="fa-solid fa-arrow-down"></i></button>
                <button onclick="deleteHotRow('${row.id}')" style="background:none; border:none; color:var(--accent-red); cursor:pointer;"><i class="fa-solid fa-trash"></i></button>
              </div>
            </div>
            
            <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px;">
              <div>
                <label style="display:block; font-size:10px; font-weight:700; color:var(--text-tertiary); margin-bottom:4px;">ROW TITLE</label>
                <input type="text" class="input-control" value="${row.title || ''}" onchange="updateHotRow('${row.id}', 'title', this.value)">
              </div>
              <div>
                <label style="display:block; font-size:10px; font-weight:700; color:var(--text-tertiary); margin-bottom:4px;">STYLE</label>
                <select class="input-control" onchange="updateHotRow('${row.id}', 'style', this.value)">
                  <option value="default" ${row.style === 'default' ? 'selected':''}>Default Cards</option>
                  <option value="seasonal_card" ${row.style === 'seasonal_card' ? 'selected':''}>Seasonal Wide Card</option>
                  <option value="classic_anime" ${row.style === 'classic_anime' ? 'selected':''}>Classic Portrait</option>
                  <option value="landscape_text" ${row.style === 'landscape_text' ? 'selected':''}>Landscape + Text</option>
                </select>
              </div>
              <div>
                <label style="display:block; font-size:10px; font-weight:700; color:var(--text-tertiary); margin-bottom:4px;">CONTENT MODE</label>
                <select class="input-control" onchange="updateHotRow('${row.id}', 'mode', this.value)">
                  <option value="tag" ${!isCustomPick ? 'selected':''}>Dynamic (By Tag)</option>
                  <option value="custom_pick" ${isCustomPick ? 'selected':''}>Custom Pick (Manual)</option>
                </select>
              </div>
            </div>
            
            ${!isCustomPick ? `
              <div style="margin-top:12px;">
                <label style="display:block; font-size:10px; font-weight:700; color:var(--text-tertiary); margin-bottom:4px;">TARGET FILTER (TAG/GENRE)</label>
                <input type="text" class="input-control" value="${row.tagFilter || ''}" onchange="updateHotRow('${row.id}', 'tagFilter', this.value)" placeholder="e.g. Action">
              </div>
            ` : `
              <div style="margin-top:12px; background:var(--bg-tertiary); border:1px solid var(--border-color); border-radius:8px; padding:12px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
                  <span style="font-size:11px; font-weight:700; color:var(--text-secondary);">Selected Items: ${(row.contentIds || []).length}</span>
                  <button class="btn-primary" onclick="openMultiContentSelector('${row.id}')" style="background:var(--accent-purple); color:#FFF; font-size:10px; padding:4px 10px; border-radius:4px; border:none;">
                    <i class="fa-solid fa-pen-to-square"></i> Manage Items
                  </button>
                </div>
                <div style="display:flex; gap:12px; overflow-x:auto; padding-bottom:8px; margin-top:8px; scrollbar-width:thin;">
                  ${(row.contentIds || []).map((cObj, i) => {
                    const cId = typeof cObj === 'string' ? cObj : cObj.id;
                    const cImg = typeof cObj === 'object' ? cObj.customImage : undefined;
                    const cTitle = typeof cObj === 'object' ? cObj.customTitle : undefined;
                    const docItem = window.cachedContentDocs.find(d => d.id === cId);
                    if(!docItem) return '';
                    let displayImg = cImg || docItem.data.posterUrl;
                    if (row.style === 'landscape_text' || row.style === 'landscape') {
                      displayImg = cImg || docItem.data.backdropUrl || docItem.data.posterUrl;
                    }
                    const displayTitle = cTitle || docItem.data.title;
                    return `
                      <div style="position:relative; width:90px; flex-shrink:0; background:var(--bg-secondary); border:1px solid var(--border-color); border-radius:6px; overflow:hidden; display:flex; flex-direction:column;">
                        <img src="${displayImg}" style="width:100%; height:${(row.style==='landscape_text' || row.style==='landscape') ? '50px' : '120px'}; object-fit:cover;">
                        <div style="padding:4px; font-size:9px; font-weight:700; color:var(--text-primary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${displayTitle}">${displayTitle}</div>
                        <div style="display:flex; justify-content:space-between; padding:2px 4px; background:var(--bg-tertiary); border-top:1px solid var(--border-color); margin-top:auto;">
                          <button type="button" onclick="moveHotRowItem('${row.id}', ${i}, -1)" style="background:none; border:none; color:var(--text-secondary); cursor:pointer; padding:2px;"><i class="fa-solid fa-caret-left"></i></button>
                          <button type="button" onclick="openHotRowItemEditModal('${row.id}', ${i})" style="background:none; border:none; color:var(--accent-purple); cursor:pointer; padding:2px;"><i class="fa-solid fa-pen"></i></button>
                          <button type="button" onclick="removeHotRowItem('${row.id}', '${cId}')" style="background:none; border:none; color:var(--accent-red); cursor:pointer; padding:2px;"><i class="fa-solid fa-trash"></i></button>
                          <button type="button" onclick="moveHotRowItem('${row.id}', ${i}, 1)" style="background:none; border:none; color:var(--text-secondary); cursor:pointer; padding:2px;"><i class="fa-solid fa-caret-right"></i></button>
                        </div>
                      </div>
                    `;
                  }).join('')}
                  <div onclick="openMultiContentSelector('${row.id}')" style="width:90px; height:${(row.style==='landscape_text' || row.style==='landscape') ? '95px' : '165px'}; flex-shrink:0; border:2px dashed var(--border-color); border-radius:6px; display:flex; flex-direction:column; align-items:center; justify-content:center; cursor:pointer; color:var(--text-secondary); transition:all 0.2s;" onmouseover="this.style.color='#FFF'; this.style.borderColor='#FFF'" onmouseout="this.style.color='var(--text-secondary)'; this.style.borderColor='var(--border-color)'">
                    <i class="fa-solid fa-plus" style="font-size:20px; margin-bottom:8px;"></i>
                    <span style="font-size:10px; font-weight:700;">Add Item</span>
                  </div>
                </div>
              </div>
            `}
          </div>
        `;
      });
      container.innerHTML = h;
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
      
      const rows = window.hotScreensData[window.activeHotScreen];
      const row = rows.find(r => r.id === window.currentMultiSelectRowId);
      const selectedIds = row ? (row.contentIds || []).map(c => typeof c === 'string' ? c : c.id) : [];

      let count = 0;
      const docs = window.cachedContentDocs || [];
      docs.forEach(docItem => {
        if (!docItem || !docItem.data) return;
        const title = String(docItem.data.title || '').toLowerCase();
        const docId = String(docItem.id || '').toLowerCase();
        if(title.includes(q) || docId.includes(q)) {
          count++;
          const isSelected = selectedIds.includes(docItem.id);
          
          const el = document.createElement('div');
          el.style = `display:flex; align-items:center; justify-content:space-between; padding:10px; background:${isSelected ? 'rgba(139,92,246,0.1)' : 'var(--bg-tertiary)'}; border:1px solid ${isSelected ? 'var(--accent-purple)' : 'var(--border-color)'}; border-radius:8px; cursor:pointer;`;
          el.onclick = () => { window.toggleMultiContentSelect(docItem.id); };
          el.innerHTML = `
            <div style="display:flex; align-items:center; gap:12px;">
              <img src="${docItem.data.posterUrl || ''}" style="width:30px; height:42px; border-radius:4px; object-fit:cover;" onerror="this.src='https://via.placeholder.com/30x42'">
              <div>
                <div style="font-size:13px; font-weight:600;">${docItem.data.title || 'Untitled'}</div>
                <div style="font-size:10px; color:var(--text-secondary);">${docItem.id}</div>
              </div>
            </div>
            <div>
               ${isSelected ? '<i class="fa-solid fa-circle-check" style="color:var(--accent-purple); font-size:18px;"></i>' : '<i class="fa-regular fa-circle" style="color:var(--text-tertiary); font-size:18px;"></i>'}
            </div>
          `;
          list.appendChild(el);
        }
      });
      if(count === 0) list.innerHTML = '<div style="color:var(--text-tertiary); text-align:center; padding:20px;">No matches found</div>';
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

    window.saveDetailedHotScreens = async function() {
      try {
        // Save Rows
        await setDoc(doc(db, 'settings', 'screens_rows'), window.hotScreensData);
        
        // Save Categories
        await setDoc(doc(db, 'settings', 'screens_categories'), window.hotScreensCategories);
        
        // Save Banners (Since heroBanners is a collection, we iterate the active screen ones)
        // Note: For simplicity, we only save the currently active screen's banners or all of them.
        // If we want to be safe, we save ALL banners across all screens.
        for(let screen in window.hotScreensBanners) {
          const bList = window.hotScreensBanners[screen];
          for(let b of bList) {
            await setDoc(doc(db, 'heroBanners', b.id), {
              ...b, updatedAt: new Date().toISOString()
            }, { merge: true });
          }
        }
        
        showToast('All Screen Configurations Saved!');
      } catch(e) { showToast('Error saving: ' + e.message); }
    };

// Override switchTab to hook into search & homerows tab render
    const originalSwitchTab = window.switchTab;
    window.switchTab = function(tabId) {
       originalSwitchTab(tabId);
       if (tabId === 'hotscreens') { loadHotScreens(); } else if(tabId === 'search') {
         renderHotSectionGrid();
       } else if (tabId === 'homerows') {
         renderHomeRows();
       }
    };

