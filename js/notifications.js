var SmartNotifications = (function() {
  'use strict';

  var CHECK_INTERVAL = 60000;
  var notifiedEvents = {};
  var NOTIFICATION_KEY = 'blockflow_notified_events';

  function init() {
    loadNotified();
    setInterval(checkUpcomingEvents, CHECK_INTERVAL);
    setTimeout(checkUpcomingEvents, 5000);
  }

  function loadNotified() {
    try {
      var data = localStorage.getItem(NOTIFICATION_KEY);
      if (data) notifiedEvents = JSON.parse(data);
      var cutoff = Date.now() - 86400000;
      Object.keys(notifiedEvents).forEach(function(key) {
        if (notifiedEvents[key] < cutoff) delete notifiedEvents[key];
      });
    } catch (e) { notifiedEvents = {}; }
  }

  function saveNotified() {
    try { localStorage.setItem(NOTIFICATION_KEY, JSON.stringify(notifiedEvents)); } catch (e) {}
  }

  function checkUpcomingEvents() {
    if (typeof Materials === 'undefined') return;
    if (typeof Calendar === 'undefined') return;
    if (!Calendar.events || Calendar.events.length === 0) return;

    var now = new Date();

    Calendar.events.forEach(function(event) {
      if (!event.date || !event.time) return;

      var eventDateTime = new Date(event.date + 'T' + event.time);
      var diffMinutes = (eventDateTime - now) / 60000;

      if (diffMinutes <= 0 || diffMinutes > 65) return;

      var remindMinutes = [15, 30, 60];
      var shouldRemind = remindMinutes.some(function(m) {
        return diffMinutes > m - 2 && diffMinutes <= m + 2;
      });

      if (!shouldRemind) return;

      var eventKey = event.id + '_' + event.date;
      if (notifiedEvents[eventKey]) return;

      var relevantMaterials = Materials.findRelevantMaterials(event.title, event.date);
      if (relevantMaterials.length === 0) return;

      notifiedEvents[eventKey] = Date.now();
      saveNotified();
      showNotification(event, relevantMaterials, Math.round(diffMinutes));
    });
  }

  function showNotification(event, materials, minutesLeft) {
    var existing = document.querySelector('.smart-notification');
    if (existing) existing.remove();

    var notification = document.createElement('div');
    notification.className = 'smart-notification';

    var timeText = minutesLeft <= 1 ? 'in 1 minute' : 'in ' + minutesLeft + ' minutes';

    var materialsHtml = materials.slice(0, 3).map(function(m) {
      var icon = m.type === 'image' ? '🖼️' : '📄';
      return '<span class="smart-notification-material-tag" data-id="' + m.id + '">' + icon + ' ' + escapeHtml(m.name) + '</span>';
    }).join('');

    notification.innerHTML =
      '<div class="smart-notification-header">' +
        '<span class="smart-notification-icon">🔔</span>' +
        '<span class="smart-notification-title">Upcoming: ' + escapeHtml(event.title) + '</span>' +
        '<span class="smart-notification-time">' + timeText + '</span>' +
      '</div>' +
      '<div class="smart-notification-body">' +
        'You have ' + materials.length + ' material' + (materials.length > 1 ? 's' : '') + ' to review before this event.' +
      '</div>' +
      '<div class="smart-notification-materials">' + materialsHtml + '</div>' +
      '<div class="smart-notification-actions">' +
        '<button class="btn btn-primary smart-notification-review">Review Now</button>' +
        '<button class="btn btn-secondary smart-notification-dismiss">Dismiss</button>' +
      '</div>';

    document.body.appendChild(notification);

    notification.querySelector('.smart-notification-review').addEventListener('click', function() {
      window.location.href = 'materials.html';
    });

    notification.querySelector('.smart-notification-dismiss').addEventListener('click', function() {
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(100px)';
      notification.style.transition = 'all 0.3s ease';
      setTimeout(function() { notification.remove(); }, 300);
    });

    notification.querySelectorAll('.smart-notification-material-tag').forEach(function(tag) {
      tag.addEventListener('click', function() {
        window.location.href = 'materials.html';
      });
    });

    setTimeout(function() {
      if (notification.parentNode) {
        notification.style.opacity = '0';
        notification.style.transform = 'translateX(100px)';
        notification.style.transition = 'all 0.3s ease';
        setTimeout(function() { if (notification.parentNode) notification.remove(); }, 300);
      }
    }, 30000);
  }

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str || '';
    return div.innerHTML;
  }

  return {
    init: init,
    checkUpcomingEvents: checkUpcomingEvents
  };
})();

SmartNotifications.init();
