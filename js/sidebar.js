(function () {
  'use strict';

  var PAGES = [
    { href: 'index.html',    icon: '🏠', label: 'Home' },
    { href: 'calendar.html', icon: '📅', label: 'Calendar' },
    { id: 'aiAssistant',     icon: '🤖', label: 'AI Assistant', action: 'ai' },
    { id: 'analytics',       icon: '📊', label: 'Analytics', action: 'analytics' },
    { href: 'settings.html', icon: '⚙️', label: 'Settings' }
  ];

  function currentPage() {
    return window.location.pathname.split('/').pop() || 'index.html';
  }

  function getInitials(name) {
    if (!name) return '?';
    var parts = name.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0].substring(0, 2).toUpperCase();
  }

  function buildToggleBtn() {
    var btn = document.createElement('button');
    btn.className = 'sidebar-toggle';
    btn.id = 'sidebarToggle';
    btn.setAttribute('aria-label', 'Toggle navigation');
    btn.innerHTML = '<span class="toggle-line"></span><span class="toggle-line"></span><span class="toggle-line"></span>';
    return btn;
  }

  function buildSidebar() {
    var current = currentPage();

    var aside = document.createElement('aside');
    aside.className = 'sidebar';
    aside.id = 'sidebar';
    aside.setAttribute('role', 'navigation');
    aside.setAttribute('aria-label', 'Main navigation');

    var brand = document.createElement('div');
    brand.className = 'sidebar-brand';
    brand.innerHTML = '<span class="sidebar-logo">📅</span><span class="sidebar-brand-text">BlockFlow</span>';
    aside.appendChild(brand);

    var nav = document.createElement('nav');
    nav.className = 'sidebar-nav';
    PAGES.forEach(function (p, i) {
      var el;
      if (p.action === 'ai') {
        el = document.createElement('button');
        el.className = 'sidebar-link';
        el.dataset.action = 'ai';
        el.addEventListener('click', function () {
          closeSidebar();
          if (typeof AIAssistant !== 'undefined' && AIAssistant.toggle) AIAssistant.toggle();
        });
      } else if (p.action === 'analytics') {
        el = document.createElement('button');
        el.className = 'sidebar-link';
        el.dataset.action = 'analytics';
        el.addEventListener('click', function () {
          closeSidebar();
          if (typeof UI !== 'undefined' && UI.showToast) UI.showToast('Analytics coming soon', 'info');
        });
      } else {
        el = document.createElement('a');
        el.className = 'sidebar-link' + (p.href === current ? ' active' : '');
        el.href = p.href;
        if (p.href === current) el.setAttribute('aria-current', 'page');
        el.addEventListener('click', function (e) {
          if (p.href === current) { e.preventDefault(); closeSidebar(); return; }
          e.preventDefault();
          var target = p.href;
          closeSidebar();
          setTimeout(function () { window.location.href = target; }, 650);
        });
      }
      el.innerHTML = '<span class="sidebar-link-icon">' + p.icon + '</span><span class="sidebar-link-label">' + p.label + '</span>';
      el.style.transitionDelay = (i * 0.04) + 's';
      nav.appendChild(el);
    });
    aside.appendChild(nav);

    var footer = document.createElement('div');
    footer.className = 'sidebar-footer';

    var userBox = document.createElement('div');
    userBox.className = 'sidebar-user';
    userBox.id = 'sidebarUser';
    userBox.innerHTML = '<div class="sidebar-avatar" id="sidebarAvatar">?</div>' +
      '<div class="sidebar-user-info"><div class="sidebar-user-name" id="sidebarUserName">Guest</div>' +
      '<div class="sidebar-user-email" id="sidebarUserEmail">Local mode</div></div>';
    footer.appendChild(userBox);

    var signBtn = document.createElement('button');
    signBtn.className = 'sidebar-signout-btn';
    signBtn.id = 'sidebarSignOut';
    signBtn.textContent = 'Sign Out';
    signBtn.addEventListener('click', function () {
      if (typeof FirebaseAuth !== 'undefined') FirebaseAuth.signOut();
    });
    footer.appendChild(signBtn);

    aside.appendChild(footer);
    return aside;
  }

  function buildOverlay() {
    var overlay = document.createElement('div');
    overlay.className = 'sidebar-overlay';
    overlay.id = 'sidebarOverlay';
    overlay.addEventListener('click', closeSidebar);
    return overlay;
  }

  function openSidebar() {
    document.body.classList.remove('sidebar-closing');
    document.body.classList.add('sidebar-open');
    var toggle = document.getElementById('sidebarToggle');
    if (toggle) toggle.setAttribute('aria-expanded', 'true');
  }

  function closeSidebar() {
    if (!document.body.classList.contains('sidebar-open')) return;
    document.body.classList.add('sidebar-closing');
    var toggle = document.getElementById('sidebarToggle');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
    setTimeout(function () {
      document.body.classList.remove('sidebar-open', 'sidebar-closing');
    }, 650);
  }

  function toggleSidebar() {
    if (document.body.classList.contains('sidebar-closing')) return;
    if (document.body.classList.contains('sidebar-open')) closeSidebar();
    else openSidebar();
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
        avatarEl.innerHTML = '<img src="' + user.photoURL + '" alt="" style="width:100%;height:100%;border-radius:50%;object-fit:cover;">';
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
        signBtn.onclick = function () { FirebaseAuth.signIn(); };
      } else {
        signBtn.style.display = 'none';
      }
    }
  }

  function init() {
    var container = document.querySelector('.container');
    if (!container) return;
    if (container.parentElement && container.parentElement.classList.contains('app-shell')) return;

    var shell = document.createElement('div');
    shell.className = 'app-shell';
    container.parentNode.insertBefore(shell, container);
    shell.appendChild(container);

    var sidebar = buildSidebar();
    var overlay = buildOverlay();
    shell.insertBefore(sidebar, container);
    shell.appendChild(overlay);

    var toggle = buildToggleBtn();
    toggle.addEventListener('click', toggleSidebar);
    container.insertBefore(toggle, container.firstChild);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && document.body.classList.contains('sidebar-open') && !document.body.classList.contains('sidebar-closing')) closeSidebar();
    });

    if (typeof FirebaseAuth !== 'undefined') {
      FirebaseAuth.onAuthChange(updateUserUI);
      updateUserUI(FirebaseAuth.getUser());
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
