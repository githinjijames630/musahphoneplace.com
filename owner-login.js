const form = document.querySelector('#ownerLoginForm');
const passwordInput = document.querySelector('#ownerPassword');
const statusMessage = document.querySelector('#ownerLoginStatus');

if (new URLSearchParams(window.location.search).has('passwordChanged')) {
  statusMessage.textContent = 'Password changed. Sign in with your new password.';
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  statusMessage.textContent = 'Signing in...';
  const button = form.querySelector('button[type="submit"]');
  button.disabled = true;
  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: passwordInput.value })
    });
    if (!response.ok) {
      statusMessage.textContent = response.status === 401 ? 'Incorrect password.' : 'Could not sign in. Try again later.';
      passwordInput.focus();
      return;
    }
    window.location.replace('/owner.html');
  } catch {
    statusMessage.textContent = 'Could not connect to the owner service.';
  } finally {
    button.disabled = false;
  }
});