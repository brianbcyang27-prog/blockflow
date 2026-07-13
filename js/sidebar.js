/**
 * sidebar.js — Dynamic sidebar navigation for BlockFlow
 * Wraps existing .container in .app-shell and injects sidebar
 */
(function () {
  'use strict';

  var PAGES = [
    { href: 'index.html',   icon: '🏠', label: 'Dashboard' },
    { href: 'calendar.html', icon: '📅', label: 'Calendar' },
    { href: 'settings.html', icon: '⚙️', label: 'Settings' }
  ];

  function currentPage() {
    var path = window.location.pathname.split('/').pop() || 'index.html';
    return path;
  }

  function getInitials(name) {
    if (!name) return '?';
    var parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0].substring(0, 2).toUpperCase();
  }

  function buildSidebar() {
    var current = currentPage();

    var aside = document.createElement('aside');
    aside.className = 'sidebar';
    aside.setAttribute('role', 'navigation');
    aside.setAttribute('aria-label', 'Main navigation');

    // Brand
    var brand = document.createElement('div');
    brand.className = 'sidebar-brand';
    brand.innerHTML = '<span class="sidebar-logo">📅</span><span class="sidebar-brand-text">BlockFlow</span>';
    aside.appendChild(brand);

    // Nav links
    var nav = document.createElement('nav');
    nav.className = 'sidebar-nav';
    PAGES.forEach(function (p) {
      var a = document.createElement('a');
      a.className = 'sidebar-link' + (p.href === current ? ' active' : '');
      a.href = p.href;
      a.innerHTML = '<span class="sidebar-link-icon">' + p.icon + '</span><span class="sidebar-link-label">' + p.label + '</span>';
      if (p.href === current) a.setAttribute('aria-current', 'page');
      nav.appendChild(a);
    });
    aside.appendChild(nav);

    // User section
    var footer = document.createElement('div');
    footer.className = 'sidebar-footer';

    var userBox = document.createElement('div');
    userBox.className = 'sidebar-user';
    userBox.id = 'sidebarUser';

    var avatar = document.createElement('div');
    avatar.className = 'sidebar-avatar';
    avatar.id = 'sidebarAvatar';
    avatar.textContent = '?';

    var info = document.createElement('div');
    info.className = 'sidebar-user-info';
    info.innerHTML = '<div class="sidebar-user-name" id="sidebarUserName">Guest</div>' +
                     '<div class="sidebar-user-email" id="sidebarUserEmail">Local mode</div>';

    userBox.appendChild(avatar);
    userBox.appendChild(info);
    footer.appendChild(userBox);

    // Sign out / Sign in button
    var signBtn = document.createElement('button');
    signBtn.className = 'sidebar-signout-btn';
    signBtn.id = 'sidebarSignOut';
    signBtn.textContent = 'Sign Out';
    signBtn.addEventListener('click', function () {
      if (typeof FirebaseAuth !== 'undefined') {
        FirebaseAuth.signOut();
      }
    });
    footer.appendChild(signBtn);

    aside.appendChild(footer);

    return aside;
  }

  function updateUserUI(user) {
    var nameEl = document.getElementById('sidebarUserName');
    var emailEl = document.getElementById('sidebarUserEmail');
    var avatarEl = document.getElementById('sidebarAvatar');
    var signBtn = document.getElementById('sidebarSignOut');

    if (!nameEl) return;

    if (user && !user.isAnonymous) {
      var name = (user.displayName || '').trim() || 'User';
      var email = user.email || '';
      nameEl.textContent = name;
      emailEl.textContent = email || 'Signed in';
      if (user.photoURL) {
        avatarEl.innerHTML = '<img src="' + user.photoURL + '" alt="' + name + '" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">';
      } else {
        avatarEl.textContent = getInitials(name);
      }
      signBtn.textContent = 'Sign Out';
      signBtn.style.display = '';
    } else {
      nameEl.textContent = 'Guest';
      emailEl.textContent = 'Local mode';
      avatarEl.textContent = '?';
      if (typeof FirebaseAuth !== 'undefined' && FirebaseAuth.isBypassMode()) {
        signBtn.textContent = 'Sign In';
        signBtn.onclick = function () {
          FirebaseAuth.signIn();
        };
      } else {
        signBtn.style.display = 'none';
      }
    }
  }

  function init() {
    var container = document.querySelector('.container');
    if (!container) return;

    // Don't double-init
    if (container.parentElement && container.parentElement.classList.contains('app-shell')) return;

    // Create app-shell wrapper
    var shell = document.createElement('div');
    shell.className = 'app-shell';

    // Insert shell before container, then move container into shell
    container.parentNode.insertBefore(shell, container);
    shell.appendChild(container);

    // Build and prepend sidebar
    var sidebar = buildSidebar();
    shell.insertBefore(sidebar, container);

    // Create main-area wrapper around existing content inside container
    // (container already has header + nav-tabs + main/section content)
    // We just need to let it flow naturally — container IS the main area now

    // Hide the old nav-tabs (sidebar replaces them)
    var oldNav = container.querySelector('.nav-tabs');
    if (oldNav) oldNav.style.display = 'none';

    // Listen for auth changes
    if (typeof FirebaseAuth !== 'undefined') {
      FirebaseAuth.onAuthChange(function (user) {
        updateUserUI(user);
      });
      // Set initial state
      updateUserUI(FirebaseAuth.getUser());
    }
  }

  // Run after DOM is ready but before other scripts that depend on layout
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
