(function () {
  const lockedStatuses = new Set(['locked', 'suspended', 'flagged']);
  const actionPattern = /transfer|card|loan|deposit/i;

  function getCurrentUser() {
    try {
      return JSON.parse(localStorage.getItem('evergreenCurrentUser') || 'null');
    } catch (error) {
      return null;
    }
  }

  function isAccountLocked() {
    const currentUser = getCurrentUser();
    if (!currentUser?.email) return false;

    try {
      const users = JSON.parse(localStorage.getItem('evergreenUsers') || '[]');
      const storedUser = users.find((user) => (user.email || '').trim().toLowerCase() === currentUser.email.trim().toLowerCase());
      return lockedStatuses.has(String(storedUser?.status || '').toLowerCase());
    } catch (error) {
      return false;
    }
  }

  function isRestrictedAction(element) {
    if (!element || !element.closest('main')) return false;
    if (element.closest('.notification-center, .sidebar, #logoutModal')) return false;
    if (element.matches('form')) {
      return /transfer|loan|card|deposit/i.test(element.id || '');
    }

    const label = `${element.textContent || ''} ${element.getAttribute('href') || ''} ${element.id || ''}`;
    return actionPattern.test(label);
  }

  function showLockedMessage() {
    let message = document.getElementById('accountLockedMessage');
    if (!message) {
      message = document.createElement('div');
      message.id = 'accountLockedMessage';
      message.className = 'account-locked-message';
      message.setAttribute('role', 'status');
      message.textContent = 'Your account is locked and under review. Transfers, cards, loans, and deposits are temporarily unavailable.';
      const main = document.querySelector('main');
      if (main) main.prepend(message);
    }
    message.classList.remove('account-locked-message-visible');
    void message.offsetWidth;
    message.classList.add('account-locked-message-visible');
  }

  function applyLockState() {
    if (!isAccountLocked()) return;

    document.querySelectorAll('main button, main a').forEach((element) => {
      if (isRestrictedAction(element)) {
        element.classList.add('account-locked-action');
        element.setAttribute('aria-disabled', 'true');
      }
    });
  }

  function handleLockedInteraction(event) {
    if (!isAccountLocked()) return;
    const target = event.target.closest('button, a');
    if (!isRestrictedAction(target)) return;

    event.preventDefault();
    event.stopImmediatePropagation();
    showLockedMessage();
  }

  function handleLockedSubmit(event) {
    if (!isAccountLocked() || !isRestrictedAction(event.target)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    showLockedMessage();
  }

  function mount() {
    applyLockState();
    document.addEventListener('click', handleLockedInteraction, true);
    document.addEventListener('submit', handleLockedSubmit, true);
    window.addEventListener('storage', applyLockState);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
}());
