'use strict';

/* ==========================================================================
   Eco-LogiX - Client-side application
   Replaces: config/database.php, app/Models/StateModel.php, and the
   server-side bootstrap that previously injected initialStateJson.
   ========================================================================== */

const STORAGE_KEY = 'ecologix_state_v1';

// Equivalent of the PHP $initialStateJson (null = no server state available).
// Set this to a JSON object string to seed the app; otherwise localStorage is used.
const initialStateJson = null;

const ORDER_FLOW = ['menunggu', 'diambil', 'dikirim', 'selesai'];
const ORDER_NEXT_LABEL = {
  diambil: 'Ambil Pesanan',
  dikirim: 'Tandai Dikirim',
  selesai: 'Selesaikan'
};

/* ---------------------------- State / storage ---------------------------- */

function defaultState() {
  return { users: [], session: null, orders: [], products: [] };
}

function loadState() {
  try {
    if (initialStateJson && initialStateJson !== 'null') {
      return { ...defaultState(), ...JSON.parse(initialStateJson) };
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaultState(), ...JSON.parse(raw) };
  } catch (e) {
    console.error('Gagal memuat state:', e);
  }
  return defaultState();
}

let state = loadState();

function saveState() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Gagal menyimpan state:', e);
  }
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function esc(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatRupiah(n) {
  return 'Rp ' + Number(n || 0).toLocaleString('id-ID');
}

function currentUser() {
  return state.users.find(u => u.id === state.session) || null;
}

/* ------------------------------ Modals ----------------------------------- */

const alertModal = document.getElementById('modal-alert');
const confirmModal = document.getElementById('modal-confirm');

function showAlert(message, title = 'Info') {
  document.getElementById('modal-alert-title').textContent = title;
  document.getElementById('modal-alert-message').textContent = message;
  alertModal.hidden = false;
  return new Promise(resolve => {
    const ok = document.getElementById('modal-alert-ok');
    const close = () => {
      alertModal.hidden = true;
      ok.removeEventListener('click', close);
      resolve();
    };
    ok.addEventListener('click', close);
  });
}

function showConfirm(message) {
  document.getElementById('modal-confirm-message').textContent = message;
  confirmModal.hidden = false;
  return new Promise(resolve => {
    const okBtn = document.getElementById('modal-confirm-ok');
    const cancelBtn = document.getElementById('modal-confirm-cancel');
    const finish = result => {
      confirmModal.hidden = true;
      okBtn.removeEventListener('click', onOk);
      cancelBtn.removeEventListener('click', onCancel);
      resolve(result);
    };
    const onOk = () => finish(true);
    const onCancel = () => finish(false);
    okBtn.addEventListener('click', onOk);
    cancelBtn.addEventListener('click', onCancel);
  });
}

/* ------------------------------- Auth ------------------------------------ */

async function hashPassword(password) {
  // Requires a secure context (https or localhost) for crypto.subtle.
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(password));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function setAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.authTab === tab)
  );
  document.getElementById('form-login').hidden = tab !== 'login';
  document.getElementById('form-register').hidden = tab !== 'register';
}

async function handleLogin(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const email = form.email.value.trim().toLowerCase();
  const password = form.password.value;
  const hash = await hashPassword(password);
  const user = state.users.find(u => u.email === email && u.passwordHash === hash);
  if (!user) {
    await showAlert('Email atau password salah.', 'Gagal Masuk');
    return;
  }
  state.session = user.id;
  saveState();
  form.reset();
  renderApp();
}

async function handleRegister(e) {
  e.preventDefault();
  const form = e.currentTarget;
  const name = form.name.value.trim();
  const email = form.email.value.trim().toLowerCase();
  const password = form.password.value;
  const role = form.role.value;

  if (password.length < 6) {
    await showAlert('Password minimal 6 karakter.', 'Pendaftaran Gagal');
    return;
  }
  if (state.users.some(u => u.email === email)) {
    await showAlert('Email sudah terdaftar.', 'Pendaftaran Gagal');
    return;
  }
  const user = {
    id: uid(),
    name,
    email,
    role,
    passwordHash: await hashPassword(password)
  };
  state.users.push(user);
  state.session = user.id;
  saveState();
  form.reset();
  renderApp();
}

async function handleLogout() {
  const ok = await showConfirm('Yakin ingin keluar?');
  if (!ok) return;
  state.session = null;
  saveState();
  renderApp();
}

/* ------------------------------- Navigation ------------------------------ */

function switchTab(tab) {
  document.querySelectorAll('.tab-panel').forEach(panel => {
    panel.hidden = panel.id !== `tab-${tab}`;
  });
  document.querySelectorAll('.nav-btn').forEach(btn =>
    btn.classList.toggle('active', btn.dataset.tab === tab)
  );
  sessionStorage.setItem('ecologix_tab', tab);
}

/* ------------------------------ Sender view ------------------------------ */

function handleCreateOrder(e) {
  e.preventDefault();
  const user = currentUser();
  if (!user) return;
  const form = e.currentTarget;
  const weight = parseFloat(form.weight.value);
  if (!(weight > 0)) {
    showAlert('Berat harus lebih dari 0.', 'Input Tidak Valid');
    return;
  }
  state.orders.push({
    id: uid(),
    senderId: user.id,
    courierId: null,
    item: form.item.value.trim(),
    weight,
    pickup: form.pickup.value.trim(),
    dropoff: form.dropoff.value.trim(),
    status: 'menunggu',
    createdAt: new Date().toISOString()
  });
  saveState();
  form.reset();
  renderApp();
  showAlert('Permintaan pengiriman berhasil dibuat.', 'Berhasil');
}

function renderSender() {
  const user = currentUser();
  const list = document.getElementById('list-sender');
  const mine = state.orders
    .filter(o => o.senderId === user.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  if (!mine.length) {
    list.innerHTML = '<div class="empty">Belum ada pengiriman.</div>';
    return;
  }
  list.innerHTML = mine.map(o => `
    <div class="item-card">
      <div class="item-row">
        <strong>${esc(o.item)}</strong>
        <span class="badge badge-${esc(o.status)}">${esc(o.status)}</span>
      </div>
      <div class="muted">${esc(o.weight)} kg &middot; ${esc(o.pickup)} &rarr; ${esc(o.dropoff)}</div>
      <div class="muted">Kurir: ${o.courierId ? esc(getUserName(o.courierId)) : 'Belum ditentukan'}</div>
    </div>
  `).join('');
}

function getUserName(id) {
  const u = state.users.find(x => x.id === id);
  return u ? u.name : '-';
}

/* ------------------------------ Courier view ----------------------------- */

async function handleAcceptOrder(id) {
  const user = currentUser();
  const order = state.orders.find(o => o.id === id);
  if (!order || order.status !== 'menunggu' || order.courierId) {
    await showAlert('Pesanan ini sudah tidak tersedia.', 'Gagal');
    renderApp();
    return;
  }
  order.courierId = user.id;
  order.status = 'diambil';
  saveState();
  renderApp();
}

async function handleAdvanceOrder(id) {
  const user = currentUser();
  const order = state.orders.find(o => o.id === id);
  if (!order || order.courierId !== user.id) return;
  const idx = ORDER_FLOW.indexOf(order.status);
  if (idx < 0 || idx >= ORDER_FLOW.length - 1) return;
  order.status = ORDER_FLOW[idx + 1];
  saveState();
  renderApp();
}

function renderCourier() {
  const user = currentUser();
  const available = state.orders
    .filter(o => o.status === 'menunggu' && !o.courierId)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  const mine = state.orders
    .filter(o => o.courierId === user.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  const availableEl = document.getElementById('list-available');
  availableEl.innerHTML = available.length
    ? available.map(o => `
        <div class="item-card">
          <div class="item-row">
            <strong>${esc(o.item)}</strong>
            <span class="badge badge-menunggu">menunggu</span>
          </div>
          <div class="muted">${esc(o.weight)} kg &middot; ${esc(o.pickup)} &rarr; ${esc(o.dropoff)}</div>
          <div class="item-row">
            <span class="muted">Pengirim: ${esc(getUserName(o.senderId))}</span>
            <button type="button" class="btn btn-primary btn-sm" data-action="accept" data-id="${esc(o.id)}">Ambil</button>
          </div>
        </div>
      `).join('')
    : '<div class="empty">Tidak ada pesanan tersedia.</div>';

  const mineEl = document.getElementById('list-courier');
  mineEl.innerHTML = mine.length
    ? mine.map(o => {
        const idx = ORDER_FLOW.indexOf(o.status);
        const canAdvance = idx < ORDER_FLOW.length - 1;
        const nextLabel = canAdvance ? ORDER_NEXT_LABEL[ORDER_FLOW[idx + 1]] : '';
        return `
          <div class="item-card">
            <div class="item-row">
              <strong>${esc(o.item)}</strong>
              <span class="badge badge-${esc(o.status)}">${esc(o.status)}</span>
            </div>
            <div class="muted">${esc(o.weight)} kg &middot; ${esc(o.pickup)} &rarr; ${esc(o.dropoff)}</div>
            <div class="muted">Pengirim: ${esc(getUserName(o.senderId))}</div>
            ${canAdvance ? `
              <div class="item-row">
                <span></span>
                <button type="button" class="btn btn-primary btn-sm" data-action="advance" data-id="${esc(o.id)}">${esc(nextLabel)}</button>
              </div>` : ''}
          </div>`;
      }).join('')
    : '<div class="empty">Belum ada tugas.</div>';
}

/* ------------------------------ Vendor view ------------------------------ */

function handleCreateProduct(e) {
  e.preventDefault();
  const user = currentUser();
  if (!user) return;
  const form = e.currentTarget;
  const stock = parseInt(form.stock.value, 10);
  const price = parseFloat(form.price.value);
  if (!(stock >= 0) || !(price >= 0)) {
    showAlert('Stok dan harga tidak boleh negatif.', 'Input Tidak Valid');
    return;
  }
  state.products.push({
    id: uid(),
    vendorId: user.id,
    name: form.name.value.trim(),
    stock,
    price
  });
  saveState();
  form.reset();
  renderApp();
}

function adjustStock(id, delta) {
  const user = currentUser();
  const product = state.products.find(p => p.id === id && p.vendorId === user.id);
  if (!product) return;
  product.stock = Math.max(0, product.stock + delta);
  saveState();
  renderApp();
}

async function handleDeleteProduct(id) {
  const user = currentUser();
  const product = state.products.find(p => p.id === id && p.vendorId === user.id);
  if (!product) return;
  const ok = await showConfirm(`Hapus produk "${product.name}"?`);
  if (!ok) return;
  state.products = state.products.filter(p => p.id !== id);
  saveState();
  renderApp();
}

function renderVendor() {
  const user = currentUser();
  const mine = state.products.filter(p => p.vendorId === user.id);
  const el = document.getElementById('list-products');
  el.innerHTML = mine.length
    ? mine.map(p => `
        <div class="item-card">
          <div class="item-row">
            <strong>${esc(p.name)}</strong>
            <span class="muted">${esc(formatRupiah(p.price))}</span>
          </div>
          <div class="item-row">
            <span class="muted">Stok: <strong>${esc(p.stock)}</strong></span>
            <div class="flex gap-2">
              <button type="button" class="btn btn-ghost btn-sm" data-action="stock-minus" data-id="${esc(p.id)}">-1</button>
              <button type="button" class="btn btn-ghost btn-sm" data-action="stock-plus" data-id="${esc(p.id)}">+1</button>
              <button type="button" class="btn btn-danger btn-sm" data-action="delete-product" data-id="${esc(p.id)}">Hapus</button>
            </div>
          </div>
        </div>`).join('')
    : '<div class="empty">Belum ada produk.</div>';
}

/* ------------------------------- Rendering ------------------------------- */

const ROLE_LABEL = { pengirim: 'Pengirim', kurir: 'Kurir', vendor: 'Vendor' };

function renderApp() {
  const user = currentUser();
  const shell = document.getElementById('app-authenticated-shell');
  const auth = document.getElementById('auth-section');

  if (!user) {
    shell.hidden = true;
    auth.hidden = false;
    return;
  }

  auth.hidden = true;
  shell.hidden = false;
  document.getElementById('header-name').textContent = user.name;
  document.getElementById('header-role').textContent = ROLE_LABEL[user.role] || user.role;

  renderSender();
  renderCourier();
  renderVendor();

  const savedTab = sessionStorage.getItem('ecologix_tab');
  const defaultTab = user.role in ROLE_LABEL ? user.role : 'pengirim';
  switchTab(savedTab && ['pengirim', 'kurir', 'vendor'].includes(savedTab) ? savedTab : defaultTab);
}

/* -------------------------------- Bootstrap ------------------------------ */

function init() {
  document.querySelectorAll