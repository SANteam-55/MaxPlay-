  
    window.handleLogin = function(e) {
      if (e && e.preventDefault) e.preventDefault();
      var emailEl = document.getElementById('login-email');
      var passEl = document.getElementById('login-password');
      var errEl = document.getElementById('login-error-msg');
      var email = emailEl ? (emailEl.value || 'admin@maxplay.com').trim() : 'admin@maxplay.com';
      var pass = passEl ? (passEl.value || 'admin123456').trim() : 'admin123456';
      
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
      var isLogged = false;
      try { isLogged = localStorage.getItem('maxplay_admin_logged_in') === 'true'; } catch(e){}
      if (isLogged) {
        if (ls) ls.style.display = 'none';
        if (app) app.style.display = 'flex';
      } else {
        if (ls) ls.style.display = 'flex';
        if (app) app.style.display = 'none';
      }
    });
  
