(function () {
  const storageKey = 'evergreenNotifications';

  function normalizeEmail(email) {
    return String(email || '').trim().toLowerCase();
  }

  function readNotifications() {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || '{}');
    } catch (error) {
      return {};
    }
  }

  function writeNotifications(notifications) {
    localStorage.setItem(storageKey, JSON.stringify(notifications));
  }

  function getUserNotifications(email) {
    const emailKey = normalizeEmail(email);
    const notifications = readNotifications();
    return Array.isArray(notifications[emailKey])
      ? notifications[emailKey].filter((notification) => !isPassphraseUpdate(notification))
      : [];
  }

  function isPassphraseUpdate(notification) {
    return notification?.type === 'passphrase-update' || /transfer security passphrases were updated/i.test(notification?.message || '');
  }

  function addNotification(email, message, type = 'account') {
    const emailKey = normalizeEmail(email);
    if (!emailKey || !message) return;

    const notifications = readNotifications();
    const userNotifications = Array.isArray(notifications[emailKey]) ? notifications[emailKey] : [];
    userNotifications.unshift({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      message: String(message),
      type,
      createdAt: new Date().toISOString(),
      read: false
    });
    notifications[emailKey] = userNotifications.slice(0, 50);
    writeNotifications(notifications);
    window.dispatchEvent(new CustomEvent('evergreen:notifications-updated'));
  }

  function markNotificationRead(email, notificationId) {
    const emailKey = normalizeEmail(email);
    const notifications = readNotifications();
    const userNotifications = Array.isArray(notifications[emailKey]) ? notifications[emailKey] : [];
    notifications[emailKey] = userNotifications.map((notification) => notification.id === notificationId ? { ...notification, read: true } : notification);
    writeNotifications(notifications);
  }

  function formatNotificationDate(value) {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>'"]/g, (character) => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[character]));
  }

  function renderNotificationCenter(button, panel, badge, email) {
    const notifications = getUserNotifications(email);
    const unreadCount = notifications.filter((notification) => !notification.read).length;
    badge.textContent = unreadCount > 99 ? '99+' : String(unreadCount);
    badge.hidden = unreadCount === 0;

    if (!notifications.length) {
      panel.innerHTML = '<div class="notification-empty">No new notifications</div>';
      return;
    }

    panel.innerHTML = notifications.map((notification) => `
      <button type="button" class="notification-item${notification.read ? '' : ' unread'}" data-notification-id="${notification.id}">
        <span class="notification-item-dot"></span>
        <span class="notification-item-content">
          <strong>${escapeHtml(notification.message)}</strong>
          <small>${escapeHtml(formatNotificationDate(notification.createdAt))}</small>
        </span>
      </button>
    `).join('');

    panel.querySelectorAll('[data-notification-id]').forEach((item) => {
      item.addEventListener('click', () => {
        markNotificationRead(email, item.dataset.notificationId);
        renderNotificationCenter(button, panel, badge, email);
      });
    });
  }

  function mountNotificationCenter() {
    const currentUser = JSON.parse(localStorage.getItem('evergreenCurrentUser') || 'null');
    const email = normalizeEmail(currentUser?.email);
    const actions = document.querySelector('.dashboard-actions');
    if (!email || !actions || actions.querySelector('.notification-center')) return;

    const wrapper = document.createElement('div');
    wrapper.className = 'notification-center';
    wrapper.innerHTML = `
      <button type="button" class="notification-button" aria-label="Open notifications" aria-expanded="false">
        <span aria-hidden="true">&#128276;</span>
        <span class="notification-badge" hidden>0</span>
      </button>
      <div class="notification-panel" hidden>
        <div class="notification-panel-header">
          <strong>Notifications</strong>
          <span>Account updates</span>
        </div>
        <div class="notification-list"></div>
      </div>
    `;
    actions.prepend(wrapper);

    const button = wrapper.querySelector('.notification-button');
    const panel = wrapper.querySelector('.notification-panel');
    const badge = wrapper.querySelector('.notification-badge');
    const list = wrapper.querySelector('.notification-list');

    function refresh() {
      renderNotificationCenter(button, list, badge, email);
    }

    button.addEventListener('click', (event) => {
      event.stopPropagation();
      const isOpen = !panel.hidden;
      panel.hidden = isOpen;
      button.setAttribute('aria-expanded', String(!isOpen));
      if (!isOpen) refresh();
    });

    document.addEventListener('click', (event) => {
      if (!wrapper.contains(event.target)) {
        panel.hidden = true;
        button.setAttribute('aria-expanded', 'false');
      }
    });

    window.addEventListener('storage', (event) => {
      if (event.key === storageKey) refresh();
    });
    window.addEventListener('evergreen:notifications-updated', refresh);
    refresh();
  }

  window.EvergreenNotifications = {
    add: addNotification,
    getForUser: getUserNotifications
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountNotificationCenter);
  } else {
    mountNotificationCenter();
  }
}());
