(() => {
  const card = document.querySelector('#paymentMethodsCard');
  const list = document.querySelector('#paymentMethodsList');
  const maximumMethods = 8;
  let currentMethods = [];

  function renderMethods(methods) {
    currentMethods = Array.isArray(methods) ? methods : [];
    if (!card || !list) return;
    list.replaceChildren();
    card.classList.toggle('hidden', currentMethods.length === 0);
    currentMethods.forEach((method) => {
      const entry = document.createElement('span');
      entry.className = 'payment-method-entry';
      const name = document.createElement('b');
      const details = document.createElement('em');
      name.textContent = method.name;
      details.textContent = method.details || '';
      details.hidden = !method.details;
      entry.append(name, details);
      list.append(entry);
    });
  }

  async function loadMethods() {
    try {
      const response = await fetch('/api/payment-methods', { credentials: 'same-origin' });
      if (response.ok) renderMethods((await response.json()).methods);
    } catch {
      // Keep the last successfully loaded methods visible when temporarily offline.
    }
  }

  function addMethodRow(container, method = { name: '', details: '' }) {
    const row = document.createElement('div');
    row.className = 'form-grid payment-method-row';
    row.innerHTML = '<label>Method name<input name="methodName" maxlength="40" required placeholder="e.g. M-Pesa Till"></label><label>Customer payment details<input name="methodDetails" maxlength="160" placeholder="Till number, account, or instructions"></label><button class="button button-quiet" type="button" data-remove-method aria-label="Remove payment method">Remove</button>';
    row.querySelector('[name="methodName"]').value = method.name || '';
    row.querySelector('[name="methodDetails"]').value = method.details || '';
    row.querySelector('[data-remove-method]').addEventListener('click', () => row.remove());
    container.append(row);
  }

  async function openEditor() {
    if (!window.state?.ownerUnlocked) return;
    await loadMethods();
    const form = document.querySelector('#modalForm');
    const backdrop = document.querySelector('#modalBackdrop');
    document.querySelector('#modalEyebrow').textContent = 'OWNER SETTINGS';
    document.querySelector('#modalTitle').textContent = 'Payment methods';
    document.querySelector('#modalCopy').textContent = 'These methods and payment details appear on the customer website.';
    form.innerHTML = '<div id="paymentMethodRows"></div><button class="button button-quiet" type="button" id="addPaymentMethod">＋ Add method</button><button class="button button-dark form-submit" type="submit">Save payment methods</button>';
    const rows = form.querySelector('#paymentMethodRows');
    (currentMethods.length ? currentMethods : [{ name: '', details: '' }]).forEach((method) => addMethodRow(rows, method));
    form.querySelector('#addPaymentMethod').addEventListener('click', () => {
      if (rows.children.length >= maximumMethods) return window.showToast?.(`You can add up to ${maximumMethods} methods`);
      addMethodRow(rows);
    });
    form.onsubmit = async (event) => {
      event.preventDefault();
      const methods = [...rows.querySelectorAll('.payment-method-row')].map((row) => ({
        name: row.querySelector('[name="methodName"]').value.trim(),
        details: row.querySelector('[name="methodDetails"]').value.trim()
      }));
      if (!methods.length) return window.showToast?.('Add at least one payment method');
      try {
        const response = await fetch('/api/owner/payment-methods', {
          method: 'PUT',
          credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ methods })
        });
        if (!response.ok) throw new Error('Save failed');
        renderMethods((await response.json()).methods);
        window.closeModal?.();
        window.showToast?.('Customer payment methods updated');
      } catch {
        window.showToast?.('Could not save payment methods');
      }
    };
    backdrop.classList.remove('hidden');
  }

  document.addEventListener('DOMContentLoaded', () => {
    const ownerNav = document.querySelector('.owner-nav');
    if (ownerNav) {
      const button = document.createElement('button');
      button.className = 'nav-item';
      button.type = 'button';
      button.textContent = 'Payment methods';
      button.addEventListener('click', openEditor);
      ownerNav.append(button);
    }
    loadMethods();
    if (card) window.setInterval(loadMethods, 10000);
  });
})();