(() => {
  const isOwnerPage = () => /owner\.html$/i.test(window.location.pathname);
  const sessionDuration = 5 * 60 * 1000;
  let sessionTimer;
  const form = () => document.querySelector('#modalForm');
  const resetSessionTimer = () => {
    clearTimeout(sessionTimer);
    sessionTimer = setTimeout(() => {
      window.lockOwner();
      window.showToast('Owner session locked after inactivity');
    }, sessionDuration);
  };
  window.lockOwner = () => {
    clearTimeout(sessionTimer);
    if (window.state) window.state.ownerUnlocked = false;
    const ownerView = document.querySelector('#ownerView');
    ownerView?.classList.remove('active');
    if (isOwnerPage() && ownerView) {
      ownerView.style.display = 'none';
      openAccess();
      fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' }).catch(() => {});
    } else {
      document.querySelector('#modalBackdrop')?.classList.add('hidden');
    }
    document.querySelector('#publicView')?.classList.add('active');
    document.body.classList.remove('owner-mode');
  };
  const openAccess = () => {
    document.querySelector('#modalBackdrop').classList.remove('hidden');
    document.querySelector('#modalEyebrow').textContent = 'SECURE ACCESS';
    document.querySelector('#modalTitle').textContent = 'Owner sign in';
    document.querySelector('#modalCopy').textContent = 'Sign in to manage inventory, sales, and expenses.';
    form().innerHTML = '<label>Owner password<input name="ownerPassword" type="password" required autofocus placeholder="Enter owner password"></label><button class="button button-dark form-submit">Unlock owner desk</button>';
  };
  const openPasswordChange = () => {
    document.querySelector('#modalBackdrop').classList.remove('hidden');
    document.querySelector('#modalEyebrow').textContent = 'OWNER SECURITY';
    document.querySelector('#modalTitle').textContent = 'Change owner password';
    document.querySelector('#modalCopy').textContent = 'Choose a new password with at least 12 characters. You will need to sign in again.';
    form().innerHTML = '<label>Current password<input name="currentPassword" type="password" autocomplete="current-password" required></label><label>New password<input name="newPassword" type="password" autocomplete="new-password" minlength="12" maxlength="128" required></label><label>Confirm new password<input name="confirmPassword" type="password" autocomplete="new-password" minlength="12" maxlength="128" required></label><button class="button button-dark form-submit">Change password</button>';
  };
  const showOwnerPage = () => {
    if (window.state) window.state.ownerUnlocked = true;
    const ownerView = document.querySelector('#ownerView');
    if (ownerView) {
      ownerView.style.display = '';
      ownerView.classList.add('active');
    }
    document.querySelector('#modalBackdrop')?.classList.add('hidden');
    window.showOwner?.();
    window.dispatchEvent(new Event('secure-owner-login'));
  };
  const restoreBackendSession = async () => {
    try {
      const response = await fetch('/api/auth/me', { credentials: 'same-origin' });
      if (response.ok) {
        showOwnerPage();
        resetSessionTimer();
      }
    } catch {
      window.showToast?.('Owner server is unavailable');
    }
  };
  const loginWithBackend = async (password) => {
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      return response.ok;
    } catch {
      return false;
    }
  };
  document.addEventListener('click', (event) => {
    const ownerButton = event.target.closest('.owner-toggle');
    if (ownerButton) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (window.state?.ownerUnlocked) return window.showOwner();
      openAccess();
      return;
    }
  }, true);
  document.addEventListener('submit', (event) => {
    if (event.target.id !== 'modalForm') return;
    const data = Object.fromEntries(new FormData(event.target));
    if (data.ownerPassword !== undefined) {
      event.preventDefault();
      event.stopImmediatePropagation();
      loginWithBackend(data.ownerPassword).then((authenticated) => {
        if (!authenticated) return window.showToast?.('Invalid owner credentials or unavailable server');
        showOwnerPage();
        resetSessionTimer();
      });
      return;
    }
    if (data.currentPassword !== undefined) {
      event.preventDefault();
      event.stopImmediatePropagation();
      if (data.newPassword !== data.confirmPassword) return window.showToast?.('New passwords do not match');
      fetch('/api/auth/password', {
        method: 'PUT',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: data.currentPassword, newPassword: data.newPassword })
      }).then(async (response) => {
        if (!response.ok) {
          const result = await response.json().catch(() => ({}));
          throw new Error(result.error || 'Password change failed');
        }
        window.location.assign('/owner-login.html?passwordChanged=1');
      }).catch((error) => window.showToast?.(error.message));
      return;
    }
  }, true);
  document.addEventListener('click', (event) => {
    if (event.target.closest('#changeOwnerPasswordButton') && window.state?.ownerUnlocked) {
      event.preventDefault();
      openPasswordChange();
      return;
    }
    if (!event.target.closest('#logoutButton')) return;
    event.preventDefault();
    fetch('/api/auth/logout', { method: 'POST', credentials: 'same-origin' })
      .finally(() => window.location.assign('index.html'));
  }, true);
  document.addEventListener('click', () => {
    if (window.state?.ownerUnlocked) resetSessionTimer();
  }, true);
  document.addEventListener('DOMContentLoaded', () => {
    if (isOwnerPage()) {
      const ownerNav = document.querySelector('.owner-nav');
      if (ownerNav && !document.querySelector('#changeOwnerPasswordButton')) {
        ownerNav.insertAdjacentHTML('beforeend', '<button class="nav-item" id="changeOwnerPasswordButton" type="button">Change password</button>');
      }
      const ownerView = document.querySelector('#ownerView');
      if (ownerView) ownerView.style.display = 'none';
      openAccess();
      restoreBackendSession();
    }
  });
})();
