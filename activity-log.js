(function () {
  const storageKey = 'evergreenAdminActivity';

  function readActivity() {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || '[]');
    } catch (error) {
      return [];
    }
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

  function logActivity(user, action, details, type = 'activity') {
    const email = String(user?.email || '').trim().toLowerCase();
    const name = `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || email || 'Unknown user';
    if (!email && !name) return;

    const activity = readActivity();
    activity.unshift({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      userName: name,
      userEmail: email,
      action: String(action),
      details: String(details || ''),
      type,
      read: false,
      createdAt: new Date().toISOString()
    });
    localStorage.setItem(storageKey, JSON.stringify(activity.slice(0, 100)));
    window.dispatchEvent(new CustomEvent('evergreen:admin-activity-updated'));
  }

  function formatDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  }

  function markActivityRead(activityId) {
    const activity = readActivity();
    const updatedActivity = activity.map((entry) => entry.id === activityId ? { ...entry, read: true } : entry);
    localStorage.setItem(storageKey, JSON.stringify(updatedActivity));
    window.dispatchEvent(new CustomEvent('evergreen:admin-activity-updated'));
  }

  function markAllActivityRead() {
    const activity = readActivity();
    localStorage.setItem(storageKey, JSON.stringify(activity.map((entry) => ({ ...entry, read: true }))));
    window.dispatchEvent(new CustomEvent('evergreen:admin-activity-updated'));
  }

  function clearAllActivity() {
    localStorage.setItem(storageKey, '[]');
    window.dispatchEvent(new CustomEvent('evergreen:admin-activity-updated'));
  }

  function mountAdminActivityCenter() {
    const actions = document.querySelector('.topbar-actions');
    if (!actions || actions.querySelector('.admin-activity-center')) return;

    const style = document.createElement('style');
    style.textContent = `
      .admin-activity-center { position: relative; }
      .admin-activity-button { position: relative; width: 44px; height: 44px; border: 1px solid var(--line); border-radius: 50%; background: #fff; color: var(--green-deep); font-size: 1.15rem; cursor: pointer; }
      .admin-activity-badge { position: absolute; top: -5px; right: -5px; min-width: 19px; height: 19px; padding: 0 5px; border-radius: 999px; background: var(--danger); color: #fff; font-size: 0.65rem; font-weight: 900; line-height: 19px; }
      .admin-activity-panel { position: absolute; top: calc(100% + 12px); right: 0; z-index: 30; width: min(390px, calc(100vw - 32px)); overflow: hidden; border: 1px solid var(--line); border-radius: 18px; background: #fff; box-shadow: 0 20px 45px rgba(20, 55, 46, 0.16); }
      .admin-activity-panel[hidden], .admin-activity-badge[hidden] { display: none; }
      .admin-activity-header { display: flex; justify-content: space-between; gap: 12px; padding: 16px 18px; border-bottom: 1px solid var(--line); color: var(--dark); }
      .admin-activity-header span { color: var(--muted); font-size: 0.72rem; font-weight: 800; }
      .admin-activity-actions { display: flex; gap: 8px; padding: 10px 18px; border-bottom: 1px solid var(--line); }
      .admin-activity-actions button { border: 0; background: transparent; color: var(--green-deep); font: inherit; font-size: 0.7rem; font-weight: 800; cursor: pointer; padding: 4px 0; }
      .admin-activity-actions button:hover { text-decoration: underline; }
      .admin-activity-actions button + button { color: var(--danger); }
      .admin-activity-list { max-height: 390px; overflow-y: auto; }
      .admin-activity-item { display: grid; width: 100%; gap: 5px; padding: 14px 18px; border: 0; border-bottom: 1px solid var(--line); background: #fff; color: var(--text); font: inherit; text-align: left; cursor: pointer; }
      .admin-activity-item:hover { background: var(--panel-soft); }
      .admin-activity-item.unread { background: #f4f8f5; }
      .admin-activity-item strong { font-size: 0.82rem; }
      .admin-activity-item span { color: var(--muted); font-size: 0.76rem; line-height: 1.35; }
      .admin-activity-item small { color: var(--muted); font-size: 0.68rem; }
      .admin-activity-empty { padding: 24px 18px; color: var(--muted); font-weight: 700; text-align: center; }
    `;
    document.head.appendChild(style);

    const wrapper = document.createElement('div');
    wrapper.className = 'admin-activity-center';
    wrapper.innerHTML = `
      <button class="admin-activity-button" type="button" aria-label="Open user activity" aria-expanded="false">&#128276;<span class="admin-activity-badge" hidden>0</span></button>
      <div class="admin-activity-panel" hidden>
        <div class="admin-activity-header"><strong>User activity</strong><span>Live account events</span></div>
        <div class="admin-activity-actions"><button type="button" data-mark-all-read>Mark all read</button><button type="button" data-clear-all>Clear all</button></div>
        <div class="admin-activity-list"></div>
      </div>
    `;
    actions.prepend(wrapper);

    const button = wrapper.querySelector('.admin-activity-button');
    const badge = wrapper.querySelector('.admin-activity-badge');
    const panel = wrapper.querySelector('.admin-activity-panel');
    const list = wrapper.querySelector('.admin-activity-list');
    const markAllReadButton = wrapper.querySelector('[data-mark-all-read]');
    const clearAllButton = wrapper.querySelector('[data-clear-all]');

    function render() {
      const activity = readActivity();
      const unreadCount = activity.filter((item) => !item.read).length;
      badge.textContent = unreadCount > 99 ? '99+' : String(unreadCount);
      badge.hidden = unreadCount === 0;
      list.innerHTML = activity.length ? activity.slice(0, 40).map((item) => `
        <button class="admin-activity-item${item.read ? '' : ' unread'}" type="button" data-activity-id="${escapeHtml(item.id)}" data-activity-type="${escapeHtml(item.type)}">
          <strong>${escapeHtml(item.action)}</strong>
          <span>${escapeHtml(item.userName)}${item.userEmail ? ` • ${escapeHtml(item.userEmail)}` : ''}<br>${escapeHtml(item.details)}</span>
          <small>${escapeHtml(formatDate(item.createdAt))}</small>
        </button>
      `).join('') : '<div class="admin-activity-empty">No user activity yet</div>';

      list.querySelectorAll('[data-activity-type]').forEach((item) => {
        item.addEventListener('click', () => {
          markActivityRead(item.dataset.activityId);
          render();
          panel.hidden = true;
          button.setAttribute('aria-expanded', 'false');
          window.dispatchEvent(new CustomEvent('evergreen:activity-selected', { detail: { type: item.dataset.activityType } }));
        });
      });
    }

    button.addEventListener('click', (event) => {
      event.stopPropagation();
      panel.hidden = !panel.hidden;
      button.setAttribute('aria-expanded', String(!panel.hidden));
      render();
    });
    markAllReadButton.addEventListener('click', (event) => {
      event.stopPropagation();
      markAllActivityRead();
      render();
    });
    clearAllButton.addEventListener('click', (event) => {
      event.stopPropagation();
      clearAllActivity();
      render();
    });
    document.addEventListener('click', (event) => {
      if (!wrapper.contains(event.target)) {
        panel.hidden = true;
        button.setAttribute('aria-expanded', 'false');
      }
    });
    window.addEventListener('storage', render);
    window.addEventListener('evergreen:admin-activity-updated', render);
    render();
  }

  window.EvergreenActivity = { log: logActivity, getAll: readActivity };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountAdminActivityCenter);
  } else {
    mountAdminActivityCenter();
  }
}());
