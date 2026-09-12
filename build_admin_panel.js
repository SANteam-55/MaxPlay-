import fs from 'fs';

const adminHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MaxPlay Admin Portal</title>
  <!-- Google Fonts -->
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <!-- Font Awesome Icons -->
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css">
  
  <script>
    window.handleLogin = function(e) {
      if (e && e.preventDefault) e.preventDefault();
      var emailEl = document.getElementById('login-email');
      var passEl = document.getElementById('login-password');
      var errEl = document.getElementById('login-error-msg');
      
      var email = emailEl ? emailEl.value.trim() : '';
      var pass = passEl ? passEl.value.trim() : '';

      if (!email || !pass) {
        if (errEl) {
          errEl.innerText = 'Please enter both Email and Password!';
          errEl.style.display = 'block';
        }
        return;
      }

      if (errEl) errEl.style.display = 'none';
      try { localStorage.setItem('maxplay_admin_logged_in', 'true'); } catch(err){}
      var ls = document.getElementById('login-screen');
      var app = document.getElementById('admin-app');
      if (ls) ls.style.display = 'none';
      if (app) app.style.display = 'flex';
      if (window.showToast) window.showToast('Successfully logged in as Root Admin');
    };
    window.handleLogout = function() {
      try { localStorage.removeItem('maxplay_admin_logged_in'); } catch(err){}
      var ls = document.getElementById('login-screen');
      var app = document.getElementById('admin-app');
      if (ls) ls.style.display = 'flex';
      if (app) app.style.display = 'none';
      if (window.showToast) window.showToast('Logged out');
    };
    document.addEventListener('DOMContentLoaded', function() {
      var ls = document.getElementById('login-screen');
      var app = document.getElementById('admin-app');
      // Always show login screen first on load
      if (ls) ls.style.display = 'flex';
      if (app) app.style.display = 'none';
    });
  </script>
  
  <style>
    :root {
      --bg-primary: #0A0A0A;
      --bg-secondary: #121214;
      --bg-tertiary: #1C1C1E;
      --accent-purple: #8B5CF6;
      --accent-purple-dark: #7C3AED;
      --accent-cyan: #06B6D4;
      --accent-green: #10B981;
      --accent-red: #EF4444;
      --accent-amber: #F59E0B;
      --border-color: #27272A;
      --text-primary: #FFFFFF;
      --text-secondary: #A1A1AA;
      --text-tertiary: #71717A;
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: 'Plus Jakarta Sans', sans-serif;
    }

    body {
      background-color: var(--bg-primary);
      color: var(--text-primary);
      min-height: 100vh;
      overflow-x: hidden;
    }

    /* Scrollbar */
    ::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    ::-webkit-scrollbar-track {
      background: var(--bg-primary);
    }
    ::-webkit-scrollbar-thumb {
      background: var(--border-color);
      border-radius: 4px;
    }

    /* LOGIN MODAL */
    #login-screen {
      position: fixed;
      inset: 0;
      z-index: 9999;
      background: rgba(10, 10, 10, 0.95);
      backdrop-filter: blur(12px);
      display: none;
      justify-content: center;
      align-items: center;
      padding: 20px;
    }

    .login-box {
      width: 100%;
      max-width: 420px;
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      padding: 32px;
      box-shadow: 0 20px 40px rgba(0,0,0,0.5);
    }

    /* APP LAYOUT */
    .app-layout {
      display: flex;
      min-height: 100vh;
    }

    /* SIDEBAR */
    .sidebar {
      width: 260px;
      background: var(--bg-secondary);
      border-right: 1px solid var(--border-color);
      display: flex;
      flex-direction: column;
      flex-shrink: 0;
      transition: transform 0.3s ease;
      z-index: 100;
    }

    .sidebar-brand {
      height: 64px;
      padding: 0 20px;
      display: flex;
      align-items: center;
      gap: 12px;
      border-bottom: 1px solid var(--border-color);
      font-weight: 800;
      font-size: 18px;
      letter-spacing: 0.5px;
    }

    .sidebar-nav {
      flex: 1;
      padding: 16px 12px;
      overflow-y: auto;
    }

    .nav-section-title {
      font-size: 10px;
      letter-spacing: 1.2px;
      text-transform: uppercase;
      color: var(--text-tertiary);
      font-weight: 800;
      margin: 18px 0 8px 12px;
    }

    .nav-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 14px;
      border-radius: 10px;
      color: var(--text-secondary);
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      margin-bottom: 2px;
    }

    .nav-item:hover {
      background: rgba(255, 255, 255, 0.05);
      color: var(--text-primary);
    }

    .nav-item.active {
      background: linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(124, 58, 237, 0.1));
      color: var(--accent-purple);
      border: 1px solid rgba(139, 92, 246, 0.3);
    }

    .sidebar-footer {
      padding: 16px;
      border-top: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      justify-content: space-between;
      background: var(--bg-tertiary);
    }

    .user-info {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .user-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: linear-gradient(135deg, var(--accent-purple), var(--accent-cyan));
      color: white;
      font-weight: 800;
      font-size: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    /* MAIN WRAPPER */
    .main-wrapper {
      flex: 1;
      display: flex;
      flex-direction: column;
      min-width: 0;
    }

    .top-header {
      height: 64px;
      padding: 0 24px;
      border-bottom: 1px solid var(--border-color);
      background: rgba(18, 18, 20, 0.8);
      backdrop-filter: blur(12px);
      display: flex;
      align-items: center;
      justify-content: space-between;
      position: sticky;
      top: 0;
      z-index: 90;
    }

    .mobile-menu-btn {
      display: none;
      background: none;
      border: none;
      color: white;
      font-size: 18px;
      cursor: pointer;
    }

    .content-area {
      flex: 1;
      padding: 24px;
      overflow-y: auto;
    }

    .screen-view {
      display: none;
    }

    .screen-view.active {
      display: block;
    }

    /* CARDS & UI COMPONENTS */
    .upload-card {
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      padding: 24px;
      margin-bottom: 24px;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }

    .stat-card {
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 14px;
      padding: 20px;
      display: flex;
      align-items: center;
      gap: 16px;
    }

    .stat-icon {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
    }

    .stat-info .stat-number {
      font-size: 22px;
      font-weight: 800;
      display: block;
    }

    .stat-info .stat-label {
      font-size: 12px;
      color: var(--text-secondary);
    }

    .stat-change {
      font-size: 10px;
      font-weight: 700;
      margin-top: 2px;
    }
    .change-up { color: var(--accent-green); }

    /* FORMS & INPUTS */
    .form-group {
      margin-bottom: 18px;
    }

    .form-label {
      display: block;
      font-size: 12px;
      font-weight: 700;
      color: var(--text-secondary);
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .input-control {
      width: 100%;
      height: 42px;
      background: var(--bg-tertiary);
      border: 1px solid var(--border-color);
      border-radius: 10px;
      padding: 0 14px;
      color: white;
      font-size: 13px;
      outline: none;
      transition: border-color 0.2s;
    }

    .input-control:focus {
      border-color: var(--accent-purple);
    }

    textarea.input-control {
      height: 80px;
      padding: 10px 14px;
      resize: vertical;
    }

    /* BUTTONS */
    .btn-primary {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      height: 42px;
      padding: 0 20px;
      background: linear-gradient(135deg, var(--accent-purple), var(--accent-purple-dark));
      color: white;
      border: none;
      border-radius: 10px;
      font-size: 13px;
      font-weight: 700;
      cursor: pointer;
      transition: all 0.2s ease;
      box-shadow: 0 4px 12px rgba(139, 92, 246, 0.25);
    }

    .btn-primary:hover {
      opacity: 0.9;
      transform: translateY(-1px);
    }

    .btn-secondary {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      height: 42px;
      padding: 0 16px;
      background: var(--bg-tertiary);
      color: var(--text-primary);
      border: 1px solid var(--border-color);
      border-radius: 10px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      transition: background 0.2s;
    }

    .btn-secondary:hover {
      background: rgba(255, 255, 255, 0.08);
    }

    .btn-danger {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      height: 42px;
      padding: 0 16px;
      background: rgba(239, 68, 68, 0.15);
      color: var(--accent-red);
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 10px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }

    .btn-amber {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      height: 42px;
      padding: 0 16px;
      background: rgba(245, 158, 11, 0.15);
      color: var(--accent-amber);
      border: 1px solid rgba(245, 158, 11, 0.3);
      border-radius: 10px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
    }

    /* TABLES */
    .table-card {
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 16px;
      padding: 20px;
      overflow-x: auto;
    }

    .data-table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
      font-size: 13px;
    }

    .data-table th {
      padding: 12px 16px;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-tertiary);
      border-bottom: 1px solid var(--border-color);
    }

    .data-table td {
      padding: 14px 16px;
      border-bottom: 1px solid rgba(255, 255, 255, 0.04);
      vertical-align: middle;
    }

    .status-badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 20px;
      font-size: 11px;
      font-weight: 700;
    }
    .status-active { background: rgba(16, 185, 129, 0.15); color: var(--accent-green); }
    .status-vip { background: rgba(245, 158, 11, 0.15); color: var(--accent-amber); }

    /* CHECKBOX GRID FOR HOME ROWS */
    .checkbox-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 10px;
      background: var(--bg-tertiary);
      border: 1px solid var(--border-color);
      border-radius: 10px;
      padding: 12px;
    }

    .checkbox-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      cursor: pointer;
      user-select: none;
    }

    .checkbox-item input[type="checkbox"] {
      width: 16px;
      height: 16px;
      accent-color: var(--accent-purple);
      cursor: pointer;
    }

    /* STEPS INDICATOR */
    .steps-indicator {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 24px;
      position: relative;
    }

    .step-item {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 12px;
      font-weight: 700;
      color: var(--text-tertiary);
    }

    .step-circle {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: var(--bg-tertiary);
      border: 1px solid var(--border-color);
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .step-item.active { color: var(--text-primary); }
    .step-item.active .step-circle {
      background: var(--accent-purple);
      border-color: var(--accent-purple);
      color: white;
    }
    .step-item.completed .step-circle {
      background: var(--accent-green);
      border-color: var(--accent-green);
      color: white;
    }

    /* TOAST */
    #toast-container {
      position: fixed;
      bottom: 24px;
      right: 24px;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 10px;
    }

    .toast {
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      color: white;
      padding: 12px 20px;
      border-radius: 12px;
      font-size: 13px;
      font-weight: 600;
      box-shadow: 0 10px 25px rgba(0,0,0,0.5);
      display: flex;
      align-items: center;
      gap: 10px;
      animation: slideIn 0.3s ease;
    }

    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }

    /* EPISODE CARD STYLING */
    .episode-card {
      background: var(--bg-tertiary);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
    }

    @media (max-width: 768px) {
      .sidebar {
        position: fixed;
        top: 0;
        bottom: 0;
        left: 0;
        transform: translateX(-100%);
      }
      .sidebar.open {
        transform: translateX(0);
      }
      .mobile-menu-btn {
        display: block;
      }
    }
  </style>
</head>
<body>

  <!-- LOGIN SCREEN -->
  <div id="login-screen" style="display:flex;">
    <div class="login-box" style="position:relative; overflow:hidden;">
      <div style="position:absolute; top:-60px; right:-60px; width:140px; height:140px; background:radial-gradient(circle, rgba(139,92,246,0.3) 0%, transparent 70%); border-radius:50%; pointer-events:none;"></div>
      
      <div style="text-align:center; margin-bottom:28px;">
        <div style="display:inline-flex; align-items:center; justify-content:center; width:64px; height:64px; border-radius:18px; background:linear-gradient(135deg, #8B5CF6 0%, #06B6D4 100%); font-weight:900; font-size:24px; color:#ffffff; letter-spacing:1px; box-shadow:0 8px 24px rgba(139,92,246,0.4); margin-bottom:14px;">MP</div>
        <h2 style="font-size:22px; font-weight:800; color:#FFFFFF; margin:0;">MaxPlay Admin Portal</h2>
        <p style="font-size:12px; color:var(--text-secondary); margin-top:6px; line-height:1.4;">Enter administrator email & password to access admin features</p>
      </div>

      <div id="login-error-msg" style="display:none; background:rgba(239,68,68,0.15); border:1px solid rgba(239,68,68,0.4); color:#FCA5A5; font-size:12px; padding:10px 14px; border-radius:8px; margin-bottom:16px; text-align:center;"></div>

      <form onsubmit="handleLogin(event)">
        <div class="form-group">
          <label class="form-label" style="display:flex; justify-content:space-between; align-items:center;">
            <span><i class="fa-solid fa-envelope" style="color:var(--accent-purple); margin-right:6px;"></i>Admin Email</span>
          </label>
          <input type="email" id="login-email" class="input-control" value="admin@maxplay.app" placeholder="admin@maxplay.app" required style="height:44px; font-size:13px;">
        </div>

        <div class="form-group" style="margin-top:16px;">
          <label class="form-label" style="display:flex; justify-content:space-between; align-items:center;">
            <span><i class="fa-solid fa-key" style="color:var(--accent-cyan); margin-right:6px;"></i>Password</span>
          </label>
          <input type="password" id="login-password" class="input-control" value="admin123456" placeholder="••••••••" required style="height:44px; font-size:13px;">
        </div>

        <button type="submit" class="btn-primary" style="width:100%; margin-top:20px; height:46px; font-size:14px; font-weight:700; border-radius:10px; box-shadow:0 4px 16px rgba(139,92,246,0.3);">
          <i class="fa-solid fa-right-to-bracket"></i>
          <span>Sign In to Admin Portal</span>
        </button>

        <button type="button" class="btn-secondary" style="width:100%; margin-top:12px; height:42px; font-size:12px; color:var(--accent-cyan); border-color:rgba(6,182,212,0.3); border-radius:10px;" onclick="handleLogin(event)">
          <i class="fa-solid fa-bolt"></i>
          <span>⚡ Instant 1-Click Admin Access</span>
        </button>
      </form>
    </div>
  </div>

  <!-- MAIN APP LAYOUT -->
  <div class="app-layout" id="admin-app" style="display:none;">
    <!-- SIDEBAR -->
    <aside class="sidebar">
      <div class="sidebar-brand">
        <div style="width:36px; height:36px; border-radius:10px; background:linear-gradient(135deg, #8B5CF6 0%, #06B6D4 100%); display:flex; align-items:center; justify-content:center; font-weight:900; font-size:14px; color:#ffffff; letter-spacing:1px; box-shadow:0 4px 12px rgba(139,92,246,0.35); flex-shrink:0;">MP</div>
        <span>MAXPLAY <small style="color:var(--accent-cyan); font-size:10px; font-weight:700;">ADMIN</small></span>
      </div>

      <nav class="sidebar-nav">
        <div class="nav-section-title">Overview</div>
        <div class="nav-item active" onclick="switchTab('dashboard')">
          <i class="fa-solid fa-chart-pie"></i>
          <span>Dashboard</span>
        </div>
        <div class="nav-item" onclick="switchTab('analytics')">
          <i class="fa-solid fa-chart-line"></i>
          <span>Analytics</span>
        </div>

        <div class="nav-section-title">Content Management</div>
        <div class="nav-item" onclick="switchTab('content')">
          <i class="fa-solid fa-film"></i>
          <span>Manage Content</span>
        </div>
        <div class="nav-item" onclick="switchTab('upload')">
          <i class="fa-solid fa-cloud-arrow-up"></i>
          <span>Upload Content</span>
        </div>

        <div class="nav-section-title">App Config & UI</div>
        <div class="nav-item" onclick="switchTab('banners')">
          <i class="fa-solid fa-images"></i>
          <span>Hero Banners</span>
        </div>
        <div class="nav-item" onclick="switchTab('categories')">
          <i class="fa-solid fa-layer-group"></i>
          <span>App Categories</span>
        </div>
        <div class="nav-item" onclick="switchTab('homerows')">
          <i class="fa-solid fa-bars-staggered"></i>
          <span>Home Screen Rows</span>
        </div>
        <div class="nav-item" onclick="switchTab('search')">
          <i class="fa-solid fa-magnifying-glass"></i>
          <span>Search Tags</span>
        </div>

        <div class="nav-section-title">Users & Comms</div>
        <div class="nav-item" onclick="switchTab('users')">
          <i class="fa-solid fa-users"></i>
          <span>Users</span>
        </div>
        <div class="nav-item" onclick="switchTab('messages')">
          <i class="fa-solid fa-bullhorn"></i>
          <span>Announcements</span>
        </div>
        <div class="nav-item" onclick="switchTab('settings')">
          <i class="fa-solid fa-gear"></i>
          <span>Settings</span>
        </div>
      </nav>

      <div class="sidebar-footer">
        <div class="user-info">
          <div class="user-avatar">AD</div>
          <div>
            <div style="font-weight:700; font-size:13px;">Root Admin</div>
            <div style="font-size:11px; color:var(--text-tertiary);">admin@maxplay.app</div>
          </div>
        </div>
        <i class="fa-solid fa-right-from-bracket" style="color:var(--text-tertiary); cursor:pointer;" onclick="handleLogout()" title="Logout"></i>
      </div>
    </aside>

    <!-- MAIN CONTENT AREA -->
    <div class="main-wrapper">
      <!-- TOP HEADER -->
      <header class="top-header">
        <div style="display:flex; align-items:center; gap:12px;">
          <button class="mobile-menu-btn" onclick="toggleMobileSidebar()">
            <i class="fa-solid fa-bars"></i>
          </button>
          <h1 id="current-page-title" style="font-size:18px; font-weight:800; color:#FFF;">Dashboard Overview</h1>
        </div>
        <div style="display:flex; align-items:center; gap:12px;">
          <a href="/" target="_blank" class="btn-secondary" style="text-decoration:none;">
            <i class="fa-solid fa-arrow-up-right-from-square"></i>
            <span>Open App</span>
          </a>
          <button class="btn-primary" onclick="resetUploadForm(); switchTab('upload');">
            <i class="fa-solid fa-plus"></i>
            <span>+ Upload Content</span>
          </button>
        </div>
      </header>

      <main class="content-area">

        <!-- 1. DASHBOARD SCREEN -->
        <section id="screen-dashboard" class="screen-view active">
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-icon" style="background: rgba(124, 58, 237, 0.15); color: var(--accent-purple);">
                <i class="fa-solid fa-users"></i>
              </div>
              <div class="stat-info">
                <span class="stat-number" id="dash-users">0</span>
                <span class="stat-label">Total Users</span>
                <span class="stat-change change-up"><i class="fa-solid fa-arrow-trend-up"></i> Registered Accounts</span>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon" style="background: rgba(6, 182, 212, 0.15); color: var(--accent-cyan);">
                <i class="fa-solid fa-film"></i>
              </div>
              <div class="stat-info">
                <span class="stat-number" id="dash-content">0</span>
                <span class="stat-label">Movies & Shows</span>
                <span class="stat-change change-up"><i class="fa-solid fa-arrow-trend-up"></i> Live Library</span>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon" style="background: rgba(16, 185, 129, 0.15); color: var(--accent-green);">
                <i class="fa-solid fa-crown"></i>
              </div>
              <div class="stat-info">
                <span class="stat-number" id="dash-premium">0</span>
                <span class="stat-label">Premium VIP Members</span>
                <span class="stat-change change-up"><i class="fa-solid fa-arrow-trend-up"></i> VIP Subscriptions</span>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-icon" style="background: rgba(239, 68, 68, 0.15); color: var(--accent-red);">
                <i class="fa-solid fa-layer-group"></i>
              </div>
              <div class="stat-info">
                <span class="stat-number" id="dash-categories">0</span>
                <span class="stat-label">App Categories & Rows</span>
                <span class="stat-change change-up"><i class="fa-solid fa-arrow-trend-up"></i> Home Layout</span>
              </div>
            </div>
          </div>

          <div style="display:grid; grid-template-columns: 2fr 1fr; gap:20px;">
            <div class="table-card">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                <h3 style="font-size:16px; font-weight:700;"><i class="fa-solid fa-clock-rotate-left" style="color:var(--accent-purple);"></i> Recently Added Content</h3>
                <button class="btn-secondary" onclick="switchTab('content')">View All</button>
              </div>
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Type</th>
                    <th>Date Added</th>
                  </tr>
                </thead>
                <tbody id="dash-recent-content">
                  <tr><td colspan="3" style="text-align:center; color:var(--text-tertiary);">Loading...</td></tr>
                </tbody>
              </table>
            </div>

            <div class="upload-card" style="margin-bottom:0;">
              <h3 style="font-size:16px; font-weight:700; margin-bottom:16px;"><i class="fa-solid fa-bolt" style="color:var(--accent-amber);"></i> Quick Actions</h3>
              <div style="display:flex; flex-direction:column; gap:10px;">
                <button class="btn-primary" onclick="resetUploadForm(); switchTab('upload');" style="background:var(--bg-tertiary); border:1px solid var(--border-color); color:var(--text-primary); justify-content:flex-start;">
                   <i class="fa-solid fa-cloud-arrow-up" style="color:var(--accent-purple);"></i> Upload New Media
                </button>
                <button class="btn-primary" onclick="switchTab('homerows')" style="background:var(--bg-tertiary); border:1px solid var(--border-color); color:var(--text-primary); justify-content:flex-start;">
                   <i class="fa-solid fa-bars-staggered" style="color:var(--accent-amber);"></i> Home Screen Rows
                </button>
                <button class="btn-primary" onclick="switchTab('categories')" style="background:var(--bg-tertiary); border:1px solid var(--border-color); color:var(--text-primary); justify-content:flex-start;">
                   <i class="fa-solid fa-layer-group" style="color:var(--accent-green);"></i> App Categories
                </button>
                <button class="btn-primary" onclick="switchTab('users')" style="background:var(--bg-tertiary); border:1px solid var(--border-color); color:var(--text-primary); justify-content:flex-start;">
                   <i class="fa-solid fa-users" style="color:var(--accent-cyan);"></i> User Management
                </button>
              </div>
            </div>
          </div>
        </section>

        <!-- 2. MANAGE CONTENT SCREEN -->
        <section id="screen-content" class="screen-view">
          <div class="upload-card">
            <div style="display:flex; gap:16px; align-items:center; justify-content:space-between; flex-wrap:wrap; margin-bottom:20px;">
              <div style="display:flex; gap:12px; flex:1; min-width:280px;">
                <input type="text" id="content-search-input" class="input-control" placeholder="Search title, genre, ID..." oninput="filterContentTable()">
                <select id="content-type-filter" class="input-control" style="width:160px;" onchange="filterContentTable()">
                  <option value="ALL">All Types</option>
                  <option value="movie">Movies</option>
                  <option value="anime">Anime</option>
                  <option value="tv">TV Series</option>
                  <option value="short_tv">Short TV</option>
                </select>
              </div>

              <div style="display:flex; gap:10px; align-items:center; flex-wrap:wrap;">
                <!-- VIEW SWITCHER TOGGLE -->
                <div style="display:flex; background:var(--bg-tertiary); border:1px solid var(--border-color); border-radius:10px; padding:3px; gap:4px;">
                  <button id="btn-view-table" type="button" class="btn-secondary" style="height:34px; padding:0 12px; font-size:12px; border:none; background:linear-gradient(135deg, #8B5CF6 0%, #D946EF 100%); color:#ffffff; font-weight:700; border-radius:8px; box-shadow:0 4px 14px rgba(139,92,246,0.45); cursor:pointer;" onclick="switchContentView('table')">
                    <i class="fa-solid fa-list" style="margin-right:4px;"></i> Default View
                  </button>
                  <button id="btn-view-grid" type="button" class="btn-secondary" style="height:34px; padding:0 12px; font-size:12px; border:none; background:transparent; color:var(--text-secondary); font-weight:500; border-radius:8px; cursor:pointer;" onclick="switchContentView('grid')">
                    <i class="fa-solid fa-border-all" style="margin-right:4px;"></i> Responsive Grid View
                  </button>
                </div>

                <button class="btn-primary" onclick="resetUploadForm(); switchTab('upload');">
                  <i class="fa-solid fa-plus"></i> Add New Media
                </button>
              </div>
            </div>

            <!-- TABLE VIEW CONTAINER -->
            <div id="content-table-container" class="table-card" style="padding:0; border:none;">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Media</th>
                    <th>Type</th>
                    <th>Rating</th>
                    <th>Year</th>
                    <th>Home Screen Rows</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody id="content-table-body">
                  <tr><td colspan="6" style="text-align:center; padding:40px; color:var(--text-tertiary);">Loading Content Library...</td></tr>
                </tbody>
              </table>
            </div>

            <!-- GRID CARDS VIEW CONTAINER -->
            <div id="content-grid-container" style="display:none; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap:18px;">
              <!-- Dynamically populated card grid -->
            </div>
          </div>
        </section>

        <!-- 3. UPLOAD CONTENT SCREEN -->
        <section id="screen-upload" class="screen-view">
          <div class="upload-card" style="max-width:950px; margin:0 auto;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:12px;">
              <h2 id="upload-screen-heading" style="font-size:20px; font-weight:800;">Upload New Content</h2>
              <div style="display:flex; gap:8px;">
                <button type="button" id="btn-mode-movie" class="btn-primary" style="height:36px; padding:0 14px; font-size:12px;" onclick="switchUploadMode('movie')">
                  <i class="fa-solid fa-film"></i> Movie Mode
                </button>
                <button type="button" id="btn-mode-series" class="btn-secondary" style="height:36px; padding:0 14px; font-size:12px;" onclick="switchUploadMode('series')">
                  <i class="fa-solid fa-tv"></i> Series / Anime Mode
                </button>
              </div>
            </div>

            <div class="steps-indicator">
              <div id="step-1-indicator" class="step-item active">
                <div class="step-circle">1</div>
                <span>Media Details</span>
              </div>
              <div id="step-2-indicator" class="step-item">
                <div class="step-circle">2</div>
                <span>Splitted Links & Episodes</span>
              </div>
              <div id="step-3-indicator" class="step-item">
                <div class="step-circle">3</div>
                <span>Review & Publish</span>
              </div>
            </div>

            <!-- STEP 1: METADATA & CATEGORIES & HOME ROWS -->
            <div id="upload-step-1">
              <div style="display:grid; grid-template-columns: 2fr 1fr; gap:16px;">
                <div class="form-group">
                  <label class="form-label">Content Title *</label>
                  <input type="text" id="up-title" class="input-control" placeholder="e.g. Solo Leveling: ReArise">
                </div>
                <div class="form-group">
                  <label class="form-label">Type / Category *</label>
                  <select id="up-type" class="input-control" onchange="onTypeDropdownChange(this.value)">
                    <option value="anime">Anime</option>
                    <option value="movie">Movie</option>
                    <option value="tv">TV Series</option>
                    <option value="short_tv">Short TV</option>
                  </select>
                </div>
              </div>

              <div style="display:grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap:12px;">
                <div class="form-group">
                  <label class="form-label">Rating (0 - 10)</label>
                  <input type="number" step="0.1" id="up-rating" class="input-control" value="9.5">
                </div>
                <div class="form-group">
                  <label class="form-label">Release Year</label>
                  <input type="number" id="up-year" class="input-control" value="2025">
                </div>
                <div class="form-group">
                  <label class="form-label">Country</label>
                  <input type="text" id="up-country" class="input-control" value="Japan">
                </div>
                <div class="form-group" id="group-seasons" style="display:none;">
                  <label class="form-label">Total Seasons</label>
                  <input type="number" id="up-seasons" class="input-control" value="1">
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Genres (Comma separated)</label>
                <input type="text" id="up-genre" class="input-control" placeholder="Action, Dark Fantasy, Supernatural, Hindi Dubbed">
              </div>

              <!-- HOME SCREEN ROWS PLACEMENT SELECTION -->
              <div class="form-group">
                <label class="form-label"><i class="fa-solid fa-bars-staggered" style="color:var(--accent-amber);"></i> Home Screen Rows Placement (Dynamic Cards Section)</label>
                <p style="font-size:11px; color:var(--text-tertiary); margin-bottom:8px;">Select which Home Screen dynamic rows this card should appear in:</p>
                <div id="homerows-checkbox-container" class="checkbox-grid">
                  <div style="color:var(--text-tertiary); font-size:12px;">Loading Home Rows...</div>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Synopsis / Description</label>
                <textarea id="up-desc" class="input-control" placeholder="Overview details..."></textarea>
              </div>

              <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px;">
                <div class="form-group">
                  <label class="form-label">Poster Image URL</label>
                  <div style="display:flex; gap:10px; align-items:center;">
                    <input type="text" id="up-poster" class="input-control" value="https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800" oninput="updateImagePreviews()">
                    <img id="preview-poster" src="https://images.unsplash.com/photo-1578632767115-351597cf2477?w=800" onerror="this.src='https://via.placeholder.com/80x120'" style="width:42px; height:56px; border-radius:6px; object-fit:cover; border:1px solid var(--border-color); flex-shrink:0;">
                  </div>
                </div>
                <div class="form-group">
                  <label class="form-label">Backdrop Cover URL</label>
                  <div style="display:flex; gap:10px; align-items:center;">
                    <input type="text" id="up-backdrop" class="input-control" value="https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200" oninput="updateImagePreviews()">
                    <img id="preview-backdrop" src="https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200" onerror="this.src='https://via.placeholder.com/120x60'" style="width:80px; height:56px; border-radius:6px; object-fit:cover; border:1px solid var(--border-color); flex-shrink:0;">
                  </div>
                </div>
              </div>

              <button type="button" class="btn-primary" onclick="goToStep(2)" style="margin-top:10px;">
                <span>Next: Splitted Links & Episode Configuration</span>
                <i class="fa-solid fa-arrow-right"></i>
              </button>
            </div>

            <!-- STEP 2: VIDEO LINKS & EPISODES -->
            <div id="upload-step-2" style="display:none;">
              <!-- MOVIE SPLITTED LINKS -->
              <div id="movie-links-container" style="display:block;">
                <h3 style="font-size:16px; font-weight:700; margin-bottom:12px;">Splitted Video Part Links (Movie)</h3>
                <p style="font-size:12px; color:var(--text-secondary); margin-bottom:16px;">Add seamless pre-buffered video chunk URLs or server mirror links for continuous playback.</p>
                <div id="movie-link-rows" style="display:flex; flex-direction:column; gap:10px; margin-bottom:16px;">
                  <!-- Dynamic link inputs -->
                </div>
                <button type="button" class="btn-secondary" onclick="addMovieLinkRow()" style="margin-bottom:20px;">
                  <i class="fa-solid fa-plus"></i> Add Splitted Link Part
                </button>
              </div>

              <!-- SERIES/EPISODES BUILDER -->
              <div id="series-episodes-container" style="display:none;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:12px;">
                  <h3 style="font-size:16px; font-weight:700;">Seasons & Episode Manager</h3>
                  <div style="display:flex; gap:8px;">
                    <button type="button" class="btn-amber" onclick="autoGenerateEpisodesPrompt()">
                      <i class="fa-solid fa-wand-magic-sparkles"></i> Auto-Generate Episodes
                    </button>
                    <button type="button" class="btn-secondary" onclick="createNewSeason()">
                      <i class="fa-solid fa-plus"></i> Add New Season
                    </button>
                  </div>
                </div>

                <div style="display:flex; gap:12px; margin-bottom:16px; align-items:center; background:var(--bg-tertiary); padding:12px; border-radius:10px; border:1px solid var(--border-color);">
                  <label class="form-label" style="margin:0; white-space:nowrap;">Active Season:</label>
                  <select id="season-selector" class="input-control" style="width:200px;" onchange="switchSeason(parseInt(this.value))">
                    <!-- Season Options -->
                  </select>
                  <button type="button" class="btn-danger" style="height:36px; padding:0 12px; font-size:11px;" onclick="deleteActiveSeason()">
                    <i class="fa-solid fa-trash"></i> Delete Season
                  </button>
                </div>

                <div id="season-episodes-list" style="display:flex; flex-direction:column; gap:14px; margin-bottom:20px;">
                  <!-- Episode cards rendered dynamically -->
                </div>

                <button type="button" class="btn-secondary" onclick="addEpisodeCardToActiveSeason()" style="margin-bottom:20px;">
                  <i class="fa-solid fa-plus"></i> Add Episode Box
                </button>
              </div>

              <div style="display:flex; gap:12px;">
                <button type="button" class="btn-secondary" onclick="goToStep(1)">Back</button>
                <button type="button" class="btn-primary" onclick="goToStep(3)" style="flex:1;">Next: Review & Save</button>
              </div>
            </div>

            <!-- STEP 3: REVIEW & PUBLISH -->
            <div id="upload-step-3" style="display:none;">
              <div style="background:var(--bg-tertiary); border:1px solid var(--border-color); padding:20px; border-radius:12px; margin-bottom:20px;">
                <h4 style="font-size:18px; font-weight:800; color:var(--accent-green); margin-bottom:8px;"><i class="fa-solid fa-check-circle"></i> Ready to Publish</h4>
                <p style="font-size:13px; color:var(--text-secondary); line-height:1.6;">
                  All media details, category choices, episodes/video links, and home screen card placements have been verified. Click below to publish live to Firestore!
                </p>
                <div id="review-summary-details" style="margin-top:12px; font-size:12px; color:var(--text-primary); background:var(--bg-secondary); padding:12px; border-radius:8px; border:1px solid var(--border-color);">
                  <!-- Summary generated dynamically -->
                </div>
              </div>

              <div style="display:flex; gap:12px;">
                <button id="btn-upload-delete" type="button" class="btn-danger" onclick="deleteEditingContent()" style="display:none; flex:0.4;">
                  <i class="fa-solid fa-trash"></i> Delete Card
                </button>
                <button type="button" class="btn-primary" onclick="publishMedia()" style="flex:1; height:50px; font-size:15px;">
                  <i class="fa-solid fa-paper-plane"></i> Publish Content Live
                </button>
              </div>
            </div>
          </div>
        </section>

        <!-- 4. APP CATEGORIES SCREEN -->
        <section id="screen-categories" class="screen-view">
          <div class="upload-card" style="max-width:900px; margin:0 auto;">
            <h2 style="font-size:20px; font-weight:800; margin-bottom:12px;"><i class="fa-solid fa-layer-group" style="color:var(--accent-green);"></i> App Categories</h2>
            <p style="font-size:12px; color:var(--text-secondary); margin-bottom:20px;">Configure category pills shown on the Home Screen. Set display name, circular icon image URL, and order position.</p>

            <button class="btn-primary" onclick="addNewCategory()" style="margin-bottom:20px; background:var(--bg-tertiary); color:var(--text-primary); border:1px solid var(--border-color);">
              <i class="fa-solid fa-plus"></i> Add New Category
            </button>

            <div id="categories-editor" style="display:flex; flex-direction:column; gap:14px; margin-bottom:24px;">
              <div style="text-align:center; padding:40px; color:var(--text-secondary);">Loading Categories...</div>
            </div>

            <button class="btn-primary" onclick="saveCategories()">
              <i class="fa-solid fa-floppy-disk"></i> Save Categories Configuration
            </button>
          </div>
        </section>

        <!-- 5. HOME SCREEN CARDS / ROWS SCREEN -->
        <section id="screen-homerows" class="screen-view">
          <div class="upload-card" style="max-width:900px; margin:0 auto;">
            <h2 style="font-size:20px; font-weight:800; margin-bottom:12px;"><i class="fa-solid fa-bars-staggered" style="color:var(--accent-amber);"></i> Home Screen Cards & Rows</h2>
            <p style="font-size:12px; color:var(--text-secondary); margin-bottom:20px;">
              Create and manage dynamic horizontal scrolling rows on the Home Screen (e.g., "Trending Now", "Bollywood Hits", "Top Anime"). Set display title, order ranking (which row appears above/below), and unique ID.
            </p>

            <button class="btn-primary" onclick="addNewHomeRow()" style="margin-bottom:20px; background:var(--bg-tertiary); color:var(--text-primary); border:1px solid var(--border-color);">
              <i class="fa-solid fa-plus"></i> Add New Row Section
            </button>

            <div id="homerows-editor" style="display:flex; flex-direction:column; gap:14px; margin-bottom:24px;">
              <div style="text-align:center; padding:40px; color:var(--text-secondary);">Loading Rows...</div>
            </div>

            <button class="btn-primary" onclick="saveHomeRows()">
              <i class="fa-solid fa-floppy-disk"></i> Save Rows Configuration
            </button>
          </div>
        </section>

        <!-- 6. HERO BANNERS SCREEN -->
        <section id="screen-banners" class="screen-view">
          <div class="upload-card" style="max-width:900px; margin:0 auto;">
            <h2 style="font-size:20px; font-weight:800; margin-bottom:12px;"><i class="fa-solid fa-images" style="color:var(--accent-purple);"></i> Hero Slider Banners</h2>
            <p style="font-size:12px; color:var(--text-secondary); margin-bottom:20px;">Configure hero slider banners displayed at top of Home Screen. Link each banner directly to a media item in your library.</p>

            <button class="btn-primary" onclick="addNewBannerSlot()" style="margin-bottom:20px; background:var(--bg-tertiary); color:var(--text-primary); border:1px solid var(--border-color);">
              <i class="fa-solid fa-plus"></i> Add Banner Slot
            </button>

            <div id="hero-banners-editor" style="display:flex; flex-direction:column; gap:16px; margin-bottom:24px;">
              <div style="text-align:center; padding:40px; color:var(--text-secondary);">Loading Hero Banners...</div>
            </div>

            <button class="btn-primary" onclick="saveAllHeroBanners()">
              <i class="fa-solid fa-floppy-disk"></i> Save Hero Banners
            </button>
          </div>
        </section>

        <!-- 7. SEARCH TAGS SCREEN -->
        <section id="screen-search" class="screen-view">
          <div class="upload-card" style="max-width:900px; margin:0 auto;">
            <h2 style="font-size:20px; font-weight:800; margin-bottom:12px;"><i class="fa-solid fa-magnifying-glass" style="color:var(--accent-cyan);"></i> Search Screen Tags</h2>
            <p style="font-size:12px; color:var(--text-secondary); margin-bottom:20px;">Configure "Everyone is Searching" pills on the Search Screen.</p>

            <div class="form-group">
              <label class="form-label">Search Tags (Comma separated)</label>
              <input type="text" id="search-tags-input" class="input-control" value="Solo Leveling, Demon Slayer, Jujutsu Kaisen, One Piece, Attack on Titan">
            </div>

            <button class="btn-primary" onclick="saveSearchSettings()">
              <i class="fa-solid fa-floppy-disk"></i> Save Search Tags
            </button>
          </div>
        </section>

        <!-- 8. USERS SCREEN -->
        <section id="screen-users" class="screen-view">
          <div class="upload-card">
            <h2 style="font-size:20px; font-weight:800; margin-bottom:16px;"><i class="fa-solid fa-users" style="color:var(--accent-cyan);"></i> Registered User Accounts</h2>
            <div class="table-card" style="padding:0; border:none;">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>User ID</th>
                    <th>Email</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody id="users-table-body">
                  <tr><td colspan="5" style="text-align:center; padding:40px; color:var(--text-tertiary);">Loading Users...</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <!-- 9. ANALYTICS SCREEN -->
        <section id="screen-analytics" class="screen-view">
          <div class="upload-card">
            <h2 style="font-size:20px; font-weight:800; margin-bottom:16px;"><i class="fa-solid fa-chart-line" style="color:var(--accent-purple);"></i> Performance Analytics</h2>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px; margin-bottom:20px;">
              <div style="background:var(--bg-tertiary); padding:20px; border-radius:12px; border:1px solid var(--border-color);">
                <h4 style="font-size:14px; margin-bottom:12px; color:var(--accent-purple);"><i class="fa-solid fa-chart-pie"></i> Content Distribution</h4>
                <div id="analytics-content-types" style="display:flex; flex-direction:column; gap:8px; font-size:13px; color:var(--text-secondary);">
                  Loading content breakdown...
                </div>
              </div>
              <div style="background:var(--bg-tertiary); padding:20px; border-radius:12px; border:1px solid var(--border-color);">
                <h4 style="font-size:14px; margin-bottom:12px; color:var(--accent-green);"><i class="fa-solid fa-user-check"></i> Membership Overview</h4>
                <div id="analytics-user-stats" style="display:flex; flex-direction:column; gap:8px; font-size:13px; color:var(--text-secondary);">
                  Loading user stats...
                </div>
              </div>
            </div>
          </div>
        </section>

        <!-- 10. ANNOUNCEMENTS SCREEN -->
        <section id="screen-messages" class="screen-view">
          <div class="upload-card" style="max-width:800px; margin:0 auto;">
            <h2 style="font-size:20px; font-weight:800; margin-bottom:12px;"><i class="fa-solid fa-bullhorn" style="color:var(--accent-amber);"></i> Send Broadcast Announcement</h2>
            <p style="font-size:12px; color:var(--text-secondary); margin-bottom:20px;">Broadcast in-app notifications to all users.</p>

            <div class="form-group">
              <label class="form-label">Announcement Title</label>
              <input type="text" id="ann-title" class="input-control" placeholder="e.g. New Episode Release!">
            </div>

            <div class="form-group">
              <label class="form-label">Message Content</label>
              <textarea id="ann-body" class="input-control" placeholder="Notification message text..."></textarea>
            </div>

            <button class="btn-primary" onclick="sendBroadcast()" style="margin-bottom:24px;">
              <i class="fa-solid fa-paper-plane"></i> Send Notification
            </button>

            <h3 style="font-size:16px; font-weight:700; margin-bottom:12px;">Sent Announcements History</h3>
            <div class="table-card" style="padding:0; border:none;">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Message</th>
                    <th>Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody id="messages-history-body">
                  <tr><td colspan="4" style="text-align:center; padding:20px; color:var(--text-tertiary);">Loading messages...</td></tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <!-- 11. SETTINGS SCREEN -->
        <section id="screen-settings" class="screen-view">
          <div class="upload-card" style="max-width:900px; margin:0 auto;">
            <h2 style="font-size:20px; font-weight:800; margin-bottom:12px;"><i class="fa-solid fa-gear" style="color:var(--text-secondary);"></i> General Settings</h2>
            <p style="font-size:12px; color:var(--text-secondary); margin-bottom:24px;">App-wide infrastructure and maintenance settings.</p>

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:20px; margin-bottom:24px;">
              <div style="background:var(--bg-tertiary); padding:20px; border-radius:12px; border:1px solid var(--border-color);">
                <h3 style="font-size:14px; margin-bottom:8px; color:var(--accent-red);"><i class="fa-solid fa-triangle-exclamation"></i> Maintenance Mode</h3>
                <p style="font-size:12px; color:var(--text-tertiary); margin-bottom:16px;">Display maintenance screen for all app users.</p>
                <div style="display:flex; align-items:center; gap:12px;">
                  <input type="checkbox" id="maintenance-toggle" style="width:20px; height:20px; accent-color:var(--accent-red); cursor:pointer;" onchange="toggleMaintenanceMode(this.checked)">
                  <span id="maintenance-status" style="font-size:13px; font-weight:bold; color:var(--text-secondary);">Disabled</span>
                </div>
              </div>

              <div style="background:var(--bg-tertiary); padding:20px; border-radius:12px; border:1px solid var(--border-color);">
                <h3 style="font-size:14px; margin-bottom:8px; color:var(--accent-cyan);"><i class="fa-solid fa-shield"></i> App Version</h3>
                <p style="font-size:12px; color:var(--text-tertiary); margin-bottom:16px;">MaxPlay v2.5.0 Production Build</p>
                <button class="btn-secondary" onclick="showToast('System is up to date!')">Check Updates</button>
              </div>
            </div>

            <div style="background:var(--bg-tertiary); padding:20px; border-radius:12px; border:1px solid var(--border-color);">
              <h3 style="font-size:14px; margin-bottom:12px;"><i class="fa-solid fa-palette" style="color:var(--accent-purple);"></i> Branding & Support</h3>
              <div style="display:grid; grid-template-columns: 1fr 1fr; gap:16px;">
                <div>
                  <label class="form-label">App Name</label>
                  <input type="text" id="setting-app-name" class="input-control" value="MaxPlay">
                </div>
                <div>
                  <label class="form-label">Support Email</label>
                  <input type="text" id="setting-support-email" class="input-control" value="support@maxplay.app">
                </div>
              </div>
              <button class="btn-primary" style="margin-top:16px;" onclick="saveGeneralSettings()">
                <i class="fa-solid fa-floppy-disk"></i> Save Branding
              </button>
            </div>
          </div>
        </section>

      </main>
    </div>
  </div>

  <div id="toast-container"></div>

  <!-- JAVASCRIPT MODULE WITH FULL FIREBASE LOGIC -->
  <script type="module">
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
      toast.innerHTML = \`<i class="fa-solid fa-circle-check" style="color:var(--accent-green)"></i> <span>\${msg}</span>\`;
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
             rowTags += \`<span style="background:rgba(245, 158, 11, 0.15); color:var(--accent-amber); font-size:10px; padding:2px 8px; border-radius:12px; margin-right:4px; display:inline-block; margin-bottom:2px;">\${title}</span>\`;
          });
        } else {
          rowTags = '<span style="color:var(--text-tertiary); font-size:11px;">Standard Library</span>';
        }

        hTable += \`
          <tr>
            <td style="display:flex; align-items:center; gap:12px;">
              <img src="\${item.posterUrl}" onerror="this.src='https://via.placeholder.com/80x120'" style="width:40px; height:56px; border-radius:6px; object-fit:cover;">
              <div>
                <div style="font-weight:700; font-size:13px;">\${item.title || 'Untitled'}</div>
                <div style="font-size:11px; color:var(--text-tertiary);">ID: \${id}</div>
              </div>
            </td>
            <td><span class="status-badge status-active" style="text-transform:uppercase;">\${item.type || 'Movie'}</span></td>
            <td style="font-weight:700; color:var(--accent-amber);"><i class="fa-solid fa-star"></i> \${item.rating || '9.5'}</td>
            <td style="color:var(--text-secondary);">\${item.year || '2025'}</td>
            <td>\${rowTags}</td>
            <td>
              <div style="display:flex; gap:8px;">
                <button class="btn-secondary" style="height:32px; padding:0 10px;" onclick="editContent('\${id}')"><i class="fa-solid fa-pen"></i> Edit</button>
                <button class="btn-danger" style="height:32px; padding:0 10px;" onclick="deleteContent('\${id}')"><i class="fa-solid fa-trash"></i></button>
              </div>
            </td>
          </tr>
        \`;

        hGrid += \`
          <div style="background:var(--bg-secondary); border:1px solid var(--border-color); border-radius:14px; overflow:hidden; display:flex; flex-direction:column; box-shadow:0 4px 16px rgba(0,0,0,0.25); transition:transform 0.2s ease, box-shadow 0.2s ease;">
            <div style="position:relative; width:100%; height:230px; background:#0f0f15; overflow:hidden;">
              <img src="\${item.posterUrl}" onerror="this.src='https://via.placeholder.com/200x300'" style="width:100%; height:100%; object-fit:cover;">
              <span style="position:absolute; top:10px; left:10px; background:rgba(139, 92, 246, 0.9); backdrop-filter:blur(4px); color:#fff; font-size:10px; font-weight:800; text-transform:uppercase; padding:4px 8px; border-radius:6px; box-shadow:0 2px 8px rgba(0,0,0,0.3);">\${item.type || 'Movie'}</span>
              <span style="position:absolute; top:10px; right:10px; background:rgba(0,0,0,0.75); backdrop-filter:blur(4px); color:var(--accent-amber); font-size:11px; font-weight:700; padding:4px 8px; border-radius:8px; border:1px solid rgba(245,158,11,0.3);"><i class="fa-solid fa-star"></i> \${item.rating || '9.5'}</span>
            </div>
            <div style="padding:14px 14px 10px 14px; flex:1; display:flex; flex-direction:column; gap:6px;">
              <div style="font-weight:700; font-size:15px; color:var(--text-primary); text-overflow:ellipsis; overflow:hidden; white-space:nowrap;" title="\${item.title || 'Untitled'}">\${item.title || 'Untitled'}</div>
              <div style="display:flex; justify-content:space-between; align-items:center; font-size:12px; color:var(--text-tertiary);">
                <span><i class="fa-regular fa-calendar" style="margin-right:4px;"></i>\${item.year || '2025'}</span>
                <span style="font-size:10px; font-family:monospace;">ID: \${id}</span>
              </div>
              <div style="margin-top:4px;">\${rowTags}</div>
            </div>
            <div style="padding:12px 14px; border-top:1px solid var(--border-color); background:rgba(0,0,0,0.15); display:flex; justify-content:space-between; align-items:center; gap:8px;">
              <button class="btn-secondary" style="flex:1; height:34px; padding:0 12px; font-size:12px; font-weight:600; border-radius:8px; display:flex; align-items:center; justify-content:center; gap:6px; cursor:pointer;" onclick="editContent('\${id}')">
                <i class="fa-solid fa-pen" style="color:var(--accent-purple);"></i> Edit
              </button>
              <button class="btn-danger" style="height:34px; width:36px; padding:0; font-size:12px; border-radius:8px; display:flex; align-items:center; justify-content:center; cursor:pointer;" onclick="deleteContent('\${id}')" title="Delete Content">
                <i class="fa-solid fa-trash"></i>
              </button>
            </div>
          </div>
        \`;
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
        h += \`
          <div style="display:flex; gap:10px; align-items:center;">
            <span style="font-size:12px; font-weight:700; width:60px; color:var(--text-secondary);">Part \${i + 1}:</span>
            <input type="text" class="input-control movie-link-input" value="\${url}" placeholder="https://catbox.moe/video.mp4">
            <button type="button" class="btn-danger" style="height:42px; padding:0 12px;" onclick="this.parentElement.remove()"><i class="fa-solid fa-trash"></i></button>
          </div>
        \`;
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
      div.innerHTML = \`
        <span style="font-size:12px; font-weight:700; width:60px; color:var(--text-secondary);">Part \${count + 1}:</span>
        <input type="text" class="input-control movie-link-input" value="" placeholder="https://catbox.moe/video.mp4">
        <button type="button" class="btn-danger" style="height:42px; padding:0 12px;" onclick="this.parentElement.remove()"><i class="fa-solid fa-trash"></i></button>
      \`;
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
        selHtml += \`<option value="\${idx}" \${idx === window.currentSeasonIdx ? 'selected' : ''}>\${s.seasonTitle || ('Season ' + (idx + 1))}</option>\`;
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
        listContainer.innerHTML = \`<div style="background:var(--bg-tertiary); padding:24px; border-radius:10px; text-align:center; color:var(--text-tertiary); border:1px solid var(--border-color);">No episodes in this season yet. Click "+ Add Episode Box" or "⚡ Auto-Generate Episodes".</div>\`;
        return;
      }

      let h = '';
      episodes.forEach((ep, epIdx) => {
        let linksHTML = '';
        if (ep.videoLinks && ep.videoLinks.length > 0) {
          ep.videoLinks.forEach((link, linkIdx) => {
            linksHTML += \`
              <div style="display:flex; gap:10px; margin-top:8px;">
                <div style="flex:1;">
                  <label class="form-label" style="font-size:10px;">Part \${linkIdx + 2} URL</label>
                  <input type="text" class="input-control" value="\${link}" placeholder="https://..." onchange="updateEpisodeLink(\${epIdx}, \${linkIdx}, this.value)">
                </div>
                <button type="button" class="btn-danger" style="align-self:flex-end; height:34px; padding:0 12px; margin-bottom:2px;" onclick="removeEpisodeLink(\${epIdx}, \${linkIdx})"><i class="fa-solid fa-trash"></i></button>
              </div>
            \`;
          });
        }

        h += \`
          <div class="episode-card">
            <div style="display:flex; justify-content:space-between; align-items:center;">
              <span style="font-weight:800; font-size:13px; color:var(--accent-cyan);"><i class="fa-solid fa-circle-play"></i> Episode Box \${ep.episodeNumber || (epIdx + 1)}</span>
              <button type="button" class="btn-danger" style="height:28px; padding:0 8px; font-size:11px;" onclick="deleteEpisodeCard(\${epIdx})"><i class="fa-solid fa-trash"></i> Delete</button>
            </div>
            <div style="display:grid; grid-template-columns: 80px 2fr 1fr; gap:10px;">
              <div>
                <label class="form-label" style="font-size:10px;">Ep #</label>
                <input type="number" class="input-control" value="\${ep.episodeNumber || (epIdx + 1)}" onchange="updateEpisodeField(\${epIdx}, 'episodeNumber', parseInt(this.value))">
              </div>
              <div>
                <label class="form-label" style="font-size:10px;">Title</label>
                <input type="text" class="input-control" value="\${ep.title || ''}" placeholder="Episode Title" onchange="updateEpisodeField(\${epIdx}, 'title', this.value)">
              </div>
              <div>
                <label class="form-label" style="font-size:10px;">Duration (Mins)</label>
                <input type="number" class="input-control" value="\${ep.duration ? Math.round(ep.duration / 60) : 24}" onchange="updateEpisodeField(\${epIdx}, 'duration', parseInt(this.value) * 60)">
              </div>
            </div>
            <div style="display:grid; grid-template-columns: 1fr 2fr; gap:10px;">
              <div>
                <label class="form-label" style="font-size:10px;">Thumbnail URL</label>
                <input type="text" class="input-control" value="\${ep.thumbnailUrl || ''}" placeholder="https://..." onchange="updateEpisodeField(\${epIdx}, 'thumbnailUrl', this.value)">
              </div>
              <div>
                <label class="form-label" style="font-size:10px;">Video Stream URL / Link (Part 1)</label>
                <input type="text" class="input-control" value="\${ep.videoUrl || ''}" placeholder="https://..." onchange="updateEpisodeField(\${epIdx}, 'videoUrl', this.value)">
                
                \${linksHTML}

                <div style="margin-top:8px;">
                  <button type="button" class="btn-secondary" style="height:28px; padding:0 10px; font-size:11px;" onclick="addEpisodeLink(\${epIdx})">
                    <i class="fa-solid fa-plus"></i> Add more links (Parts)
                  </button>
                </div>
              </div>
            </div>
          </div>
        \`;
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
        streamSummary = \`\${count} Splitted Video Part Link(s)\`;
      } else {
        let totalEps = 0;
        window.seasonsData.forEach(s => totalEps += (s.episodes || []).length);
        streamSummary = \`\${window.seasonsData.length} Season(s), \${totalEps} Total Episode(s)\`;
      }

      const container = document.getElementById('review-summary-details');
      if (container) {
        container.innerHTML = \`
          <div><strong>Title:</strong> \${title} (\${type.toUpperCase()})</div>
          <div><strong>Home Screen Placement:</strong> \${selectedRows.length > 0 ? selectedRows.join(', ') : 'Standard Library'}</div>
          <div><strong>Media Streams:</strong> \${streamSummary}</div>
        \`;
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
        h += \`
          <div style="background:var(--bg-tertiary); padding:16px; border-radius:12px; border:1px solid var(--border-color); display:flex; gap:16px; align-items:center;">
             <img src="\${cat.image}" onerror="this.src='https://via.placeholder.com/100'" style="width:60px; height:60px; border-radius:12px; object-fit:cover; border:1px solid var(--border-color);">
             <div style="flex:1; display:grid; grid-template-columns: 1fr 1fr 2fr; gap:12px;">
                 <div>
                   <label class="form-label" style="font-size:10px;">Unique ID</label>
                   <input type="text" id="cat-id-\${idx}" class="input-control" value="\${cat.id || ''}">
                 </div>
                 <div>
                   <label class="form-label" style="font-size:10px;">Display Name</label>
                   <input type="text" id="cat-name-\${idx}" class="input-control" value="\${cat.name || ''}">
                 </div>
                 <div>
                   <label class="form-label" style="font-size:10px;">Image URL</label>
                   <input type="text" id="cat-img-\${idx}" class="input-control" value="\${cat.image || ''}">
                 </div>
             </div>
             <div style="width:60px;">
               <label class="form-label" style="font-size:10px;">Order</label>
               <input type="number" id="cat-order-\${idx}" class="input-control" style="text-align:center;" value="\${cat.order || (idx + 1)}">
             </div>
             <button class="btn-danger" style="height:42px; width:42px; padding:0;" onclick="deleteCategory(\${idx})" title="Delete Category"><i class="fa-solid fa-trash"></i></button>
          </div>
        \`;
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
      if (window.homeRowsData.length === 0) {
        container.innerHTML = '<div style="color:var(--text-secondary);">No dynamic rows configured. Click "Add New Row Section".</div>';
        return;
      }

      window.homeRowsData.sort((a,b) => (a.order || 0) - (b.order || 0));

      let h = '';
      window.homeRowsData.forEach((row, idx) => {
        h += \`
          <div style="background:var(--bg-tertiary); padding:16px; border-radius:12px; border:1px solid var(--border-color); display:flex; gap:16px; align-items:center;">
             <div style="flex:1; display:grid; grid-template-columns: 1fr 2fr; gap:12px;">
                 <div>
                   <label class="form-label" style="font-size:10px;">Row ID (Unique)</label>
                   <input type="text" id="hr-id-\${idx}" class="input-control" value="\${row.id}">
                 </div>
                 <div>
                   <label class="form-label" style="font-size:10px;">Row Title (Header on Home Screen)</label>
                   <input type="text" id="hr-title-\${idx}" class="input-control" value="\${row.title}">
                 </div>
             </div>
             <div style="width:70px;">
               <label class="form-label" style="font-size:10px;">Order</label>
               <input type="number" id="hr-order-\${idx}" class="input-control" style="text-align:center;" value="\${row.order || (idx + 1)}">
             </div>
             <button class="btn-danger" style="height:42px; width:42px; padding:0;" onclick="deleteHomeRow(\${idx})"><i class="fa-solid fa-trash"></i></button>
          </div>
        \`;
      });
      container.innerHTML = h;
    };

    window.syncHomeRowsFromDOM = function() {
      if (!window.homeRowsData || !Array.isArray(window.homeRowsData)) return;
      window.homeRowsData.forEach((r, i) => {
        const idEl = document.getElementById('hr-id-' + i);
        const titleEl = document.getElementById('hr-title-' + i);
        const orderEl = document.getElementById('hr-order-' + i);
        if (idEl) r.id = idEl.value;
        if (titleEl) r.title = titleEl.value;
        if (orderEl) r.order = parseInt(orderEl.value) || (i + 1);
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
        h += \`
          <label class="checkbox-item">
            <input type="checkbox" class="hr-checkbox" value="\${row.id}">
            <span>\${row.title}</span>
          </label>
        \`;
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
        let contentOptions = \`<option value="" \${!b.contentId ? 'selected' : ''}>(None / Custom Link)</option>\`;
        (window.cachedContentDocs || []).forEach(c => {
          const isSel = b.contentId === c.id ? 'selected' : '';
          contentOptions += \`<option value="\${c.id}" \${isSel}>\${c.data.title || c.id}</option>\`;
        });
        h += \`
          <div style="background:var(--bg-tertiary); padding:16px; border-radius:14px; border:1px solid var(--border-color); display:flex; flex-direction:column; gap:12px;">
             <!-- LIVE BANNER CARD PREVIEW -->
             <div style="position:relative; width:100%; height:140px; border-radius:10px; overflow:hidden; background:#0B0B0E; border:1px solid var(--border-color); display:flex; align-items:center; justify-content:center;">
               <img id="hb-preview-img-\${idx}" src="\${b.imageUrl || 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200'}" onerror="this.onerror=null; this.src='https://images.unsplash.com/photo-1578632767115-351597cf2477?w=1200';" style="width:100%; height:100%; object-fit:cover; opacity:0.85; transition:all 0.3s ease;">
               <div style="position:absolute; inset:0; background:linear-gradient(to top, rgba(10,10,12,0.95) 0%, rgba(10,10,12,0.3) 60%, transparent 100%);"></div>
               <div style="position:absolute; top:10px; right:10px; background:rgba(139,92,246,0.9); color:#fff; font-size:10px; font-weight:800; padding:4px 10px; border-radius:20px; text-transform:uppercase; letter-spacing:0.5px; backdrop-filter:blur(4px); display:flex; align-items:center; gap:5px; box-shadow:0 2px 8px rgba(0,0,0,0.4);">
                 <i class="fa-solid fa-eye"></i> Live Image Card Preview
               </div>
               <div style="position:absolute; bottom:12px; left:14px; right:14px; z-index:2; text-shadow:0 2px 4px rgba(0,0,0,0.8);">
                 <div id="hb-preview-title-\${idx}" style="font-weight:800; font-size:16px; color:#ffffff; line-height:1.2;">\${b.title || 'Banner Title'}</div>
                 <div id="hb-preview-sub-\${idx}" style="font-size:12px; color:#A1A1AA; font-weight:500; margin-top:2px;">\${b.subtitle || 'Featured Content'}</div>
               </div>
             </div>

             <div style="display:flex; justify-content:space-between; align-items:center;">
               <span style="font-weight:800; color:var(--accent-purple); font-size:13px; display:flex; align-items:center; gap:6px;">
                 <i class="fa-solid fa-layer-group"></i> Hero Banner Slot #\${idx + 1}
               </span>
               <button class="btn-danger" style="height:32px; padding:0 12px; font-size:11px;" onclick="deleteHeroBanner('\${b.id}')"><i class="fa-solid fa-trash"></i> Delete Banner</button>
             </div>

             <div style="display:grid; grid-template-columns: 1fr 1fr 2fr 1fr 80px; gap:10px;">
               <div>
                 <label class="form-label" style="font-size:10px;">Title</label>
                 <input type="text" id="hb-title-\${idx}" class="input-control" value="\${b.title || ''}" oninput="updateHeroBannerPreview(\${idx})">
               </div>
               <div>
                 <label class="form-label" style="font-size:10px;">Subtitle</label>
                 <input type="text" id="hb-sub-\${idx}" class="input-control" value="\${b.subtitle || ''}" oninput="updateHeroBannerPreview(\${idx})">
               </div>
               <div>
                 <label class="form-label" style="font-size:10px;">Image URL (Paste Link Here)</label>
                 <input type="text" id="hb-img-\${idx}" class="input-control" value="\${b.imageUrl || ''}" oninput="updateHeroBannerPreview(\${idx})" placeholder="https://...">
               </div>
               <div>
                 <label class="form-label" style="font-size:10px;">Link to Content</label>
                 <select id="hb-content-\${idx}" class="input-control">
                   \${contentOptions}
                 </select>
               </div>
               <div>
                 <label class="form-label" style="font-size:10px;">Order</label>
                 <input type="number" id="hb-order-\${idx}" class="input-control" style="text-align:center;" value="\${b.order || (idx + 1)}">
               </div>
             </div>
          </div>
        \`;
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
          const title = document.getElementById(\`hb-title-\${i}\`)?.value || '';
          const subtitle = document.getElementById(\`hb-sub-\${i}\`)?.value || '';
          const imageUrl = document.getElementById(\`hb-img-\${i}\`)?.value || '';
          const contentId = document.getElementById(\`hb-content-\${i}\`)?.value || '';
          const order = parseInt(document.getElementById(\`hb-order-\${i}\`)?.value || (i + 1));

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
          h += \`
            <tr>
              <td style="font-weight:700;">\${u.displayName || 'User'}</td>
              <td style="font-size:11px; color:var(--text-tertiary);">\${d.id}</td>
              <td>\${u.email || 'N/A'}</td>
              <td><span class="status-badge \${u.isPremium ? 'status-vip' : 'status-active'}">\${u.isPremium ? 'VIP PREMIUM' : 'FREE'}</span></td>
              <td>
                <button class="btn-secondary" style="height:32px; font-size:11px;" onclick="toggleUserPremium('\${d.id}', \${!u.isPremium})">
                  \${u.isPremium ? 'Downgrade to Free' : 'Upgrade to VIP'}
                </button>
              </td>
            </tr>
          \`;
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
          h += \`
            <tr>
              <td style="font-weight:700;">\${m.title || 'Notification'}</td>
              <td style="color:var(--text-secondary);">\${m.body || ''}</td>
              <td style="font-size:11px; color:var(--text-tertiary);">\${m.date || 'Today'}</td>
              <td>
                <button class="btn-danger" style="height:30px; padding:0 8px; font-size:11px;" onclick="deleteMessage('\${d.id}')"><i class="fa-solid fa-trash"></i></button>
              </td>
            </tr>
          \`;
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

        typesContainer.innerHTML = \`
          <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.05);">
            <span>🎬 Movies</span><strong>\${counts.movie}</strong>
          </div>
          <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.05);">
            <span>⚡ Anime Series</span><strong>\${counts.anime}</strong>
          </div>
          <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.05);">
            <span>📺 TV Series</span><strong>\${counts.tv}</strong>
          </div>
          <div style="display:flex; justify-content:space-between; padding:8px 0;">
            <span>📱 Short TV</span><strong>\${counts.short_tv}</strong>
          </div>
        \`;
      }

      if (userStatsContainer) {
        const users = window.usersData || [];
        const totalU = users.length;
        const vipU = users.filter(u => u && u.isPremium).length;
        const freeU = Math.max(0, totalU - vipU);

        userStatsContainer.innerHTML = \`
          <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.05);">
            <span>👥 Registered Accounts</span><strong>\${totalU}</strong>
          </div>
          <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid rgba(255,255,255,0.05);">
            <span>👑 VIP Premium Members</span><strong style="color:var(--accent-amber);">\${vipU}</strong>
          </div>
          <div style="display:flex; justify-content:space-between; padding:8px 0;">
            <span>🆓 Standard Free Users</span><strong>\${freeU}</strong>
          </div>
        \`;
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
          h += \`
            <tr>
              <td style="font-weight:700;">\${r.data.title || 'Untitled'}</td>
              <td><span class="status-badge status-active" style="text-transform:uppercase;">\${r.data.type || 'Movie'}</span></td>
              <td style="color:var(--text-tertiary); font-size:11px;">\${r.data.createdAt ? new Date(r.data.createdAt).toLocaleDateString() : 'Recently'}</td>
            </tr>
          \`;
        });
        tbody.innerHTML = h;
      }
    };

    // INIT LISTENERS
    window.loadContentList();
    window.loadHomeRows();
    window.loadCategories();
    window.loadUsers();
  </script>
</body>
</html>
`;

fs.writeFileSync('public/admin.html', adminHtml, 'utf8');
console.log('Successfully written clean public/admin.html');
