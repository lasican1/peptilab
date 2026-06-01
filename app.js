// ===== PeptiLab storefront logic =====

// ----- Product catalog -----
const products = [
  { id: 1, name: 'BPC-157',     desc: '5mg vial · 99.8% purity',  price: 49.99, tag: 'Best seller', color: 'from-sky-400 to-blue-600' },
  { id: 2, name: 'TB-500',      desc: '5mg vial · 99.7% purity',  price: 59.99, tag: 'Popular',     color: 'from-violet-400 to-purple-600' },
  { id: 3, name: 'GHK-Cu',      desc: '50mg vial · 99.9% purity', price: 39.99, tag: null,          color: 'from-emerald-400 to-teal-600' },
  { id: 4, name: 'Semaglutide', desc: '3mg vial · 99.6% purity',  price: 89.99, tag: 'New',         color: 'from-amber-400 to-orange-600' },
];

const STORAGE_KEY = 'peptilab.cart';

// ----- Email-the-order config (Web3Forms) -----
// Get a free access key at https://web3forms.com (enter the email where you
// want orders delivered; the key is emailed to you instantly). Paste it below.
// While left as the placeholder, the checkout still works but only confirms
// locally without sending an email.
const WEB3FORMS_ACCESS_KEY = 'YOUR_ACCESS_KEY_HERE';

// cart: Map<id, { product, qty }>
const cart = new Map();

const fmt = n => '$' + n.toFixed(2);

const vialIcon = (size) => `
  <svg xmlns="http://www.w3.org/2000/svg" class="${size} text-white/90" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.3">
    <path stroke-linecap="round" stroke-linejoin="round" d="M9 3h6m-5 0v4.586a2 2 0 01-.586 1.414l-4.243 4.243A4 4 0 008 20h8a4 4 0 002.829-6.757l-4.243-4.243A2 2 0 0114 7.586V3" />
  </svg>`;

// ----- Persistence -----
function saveCart() {
  const data = [...cart.values()].map(({ product, qty }) => ({ id: product.id, qty }));
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    /* storage may be unavailable (private mode, quota) — fail silently */
  }
}

function loadCart() {
  let data;
  try {
    data = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch (e) {
    data = [];
  }
  if (!Array.isArray(data)) return;
  for (const { id, qty } of data) {
    const product = products.find(p => p.id === id);
    if (product && qty > 0) cart.set(id, { product, qty });
  }
}

// ----- Render product grid -----
function renderProducts() {
  const grid = document.getElementById('product-grid');
  grid.innerHTML = products.map(p => `
    <div class="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col">
      <div class="relative aspect-[4/3] bg-gradient-to-br ${p.color} grid place-items-center">
        ${p.tag ? `<span class="absolute top-3 left-3 bg-white/90 text-slate-800 text-[11px] font-bold px-2.5 py-1 rounded-full">${p.tag}</span>` : ''}
        ${vialIcon('w-16 h-16')}
      </div>
      <div class="p-5 flex flex-col flex-1">
        <h3 class="font-bold text-lg text-slate-900">${p.name}</h3>
        <p class="text-slate-500 text-sm mt-1">${p.desc}</p>
        <div class="mt-4 flex items-center justify-between">
          <span class="text-xl font-extrabold text-slate-900">${fmt(p.price)}</span>
          <button data-add="${p.id}" class="rounded-full bg-brand-500 text-white px-4 py-2 text-sm font-semibold hover:bg-brand-600 transition">Add</button>
        </div>
      </div>
    </div>
  `).join('');
}

// ----- Cart elements -----
const cartCount = document.getElementById('cart-count');
const cartItems = document.getElementById('cart-items');
const cartEmpty = document.getElementById('cart-empty');
const cartTotal = document.getElementById('cart-total');
const checkoutBtn = document.getElementById('checkout-btn');

// ----- Cart logic -----
function addToCart(id) {
  const product = products.find(p => p.id === id);
  if (!product) return;
  const entry = cart.get(id) || { product, qty: 0 };
  entry.qty++;
  cart.set(id, entry);
  renderCart();
  showToast(`${product.name} added to cart`);
}

function changeQty(id, delta) {
  const entry = cart.get(id);
  if (!entry) return;
  entry.qty += delta;
  if (entry.qty <= 0) cart.delete(id);
  renderCart();
}

function renderCart() {
  const entries = [...cart.values()];
  const totalItems = entries.reduce((s, e) => s + e.qty, 0);
  const totalPrice = entries.reduce((s, e) => s + e.qty * e.product.price, 0);

  cartCount.textContent = totalItems;
  cartTotal.textContent = fmt(totalPrice);
  checkoutBtn.disabled = totalItems === 0;

  const isEmpty = entries.length === 0;
  cartEmpty.classList.toggle('hidden', !isEmpty);
  cartItems.classList.toggle('hidden', isEmpty);

  cartItems.innerHTML = entries.map(({ product: p, qty }) => `
    <div class="cart-row flex gap-4 items-center">
      <div class="w-16 h-16 shrink-0 rounded-xl bg-gradient-to-br ${p.color} grid place-items-center">
        ${vialIcon('w-7 h-7')}
      </div>
      <div class="flex-1 min-w-0">
        <div class="font-semibold text-slate-900 truncate">${p.name}</div>
        <div class="text-sm text-slate-500">${fmt(p.price)}</div>
      </div>
      <div class="flex items-center gap-2">
        <button data-dec="${p.id}" class="w-7 h-7 grid place-items-center rounded-full border border-slate-300 hover:bg-slate-100 transition">−</button>
        <span class="w-6 text-center font-semibold">${qty}</span>
        <button data-inc="${p.id}" class="w-7 h-7 grid place-items-center rounded-full border border-slate-300 hover:bg-slate-100 transition">+</button>
      </div>
    </div>
  `).join('');

  saveCart();
}

// ----- Event delegation for add / inc / dec -----
document.addEventListener('click', e => {
  const add = e.target.closest('[data-add]');
  const inc = e.target.closest('[data-inc]');
  const dec = e.target.closest('[data-dec]');
  if (add) addToCart(+add.dataset.add);
  if (inc) changeQty(+inc.dataset.inc, 1);
  if (dec) changeQty(+dec.dataset.dec, -1);
});

// ----- Cart drawer open/close -----
const overlay = document.getElementById('cart-overlay');
const drawer = document.getElementById('cart-drawer');

function openCart() {
  overlay.classList.remove('hidden');
  requestAnimationFrame(() => overlay.classList.remove('opacity-0'));
  drawer.classList.remove('translate-x-full');
}
function closeCart() {
  overlay.classList.add('opacity-0');
  drawer.classList.add('translate-x-full');
  setTimeout(() => overlay.classList.add('hidden'), 300);
}

document.getElementById('cart-btn').addEventListener('click', openCart);
document.getElementById('cart-close').addEventListener('click', closeCart);
overlay.addEventListener('click', closeCart);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeCart(); });

// ----- Checkout modal -----
const checkoutOverlay = document.getElementById('checkout-overlay');
const checkoutModal = document.getElementById('checkout-modal');
const checkoutView = document.getElementById('checkout-view');
const confirmView = document.getElementById('confirm-view');
const checkoutForm = document.getElementById('checkout-form');
const checkoutSummary = document.getElementById('checkout-summary');
const checkoutTitle = document.getElementById('checkout-title');

function cartTotalValue() {
  return [...cart.values()].reduce((s, e) => s + e.qty * e.product.price, 0);
}

function renderCheckoutSummary() {
  const entries = [...cart.values()];
  checkoutSummary.innerHTML = entries.map(({ product: p, qty }) => `
    <div class="flex items-center justify-between px-4 py-3">
      <div class="flex items-center gap-2 min-w-0">
        <span class="shrink-0 w-6 h-6 grid place-items-center rounded-full bg-slate-100 text-xs font-bold text-slate-600">${qty}</span>
        <span class="font-medium text-slate-800 truncate">${p.name}</span>
        <span class="text-slate-400 text-sm truncate hidden sm:inline">${p.desc}</span>
      </div>
      <span class="font-semibold text-slate-900 whitespace-nowrap">${fmt(p.price * qty)}</span>
    </div>
  `).join('');

  const total = fmt(cartTotalValue());
  document.getElementById('checkout-total').textContent = total;
  document.getElementById('checkout-btn-total').textContent = total;
}

function openCheckout() {
  if (cartTotalValue() <= 0) return;
  // reset to form view
  checkoutView.classList.remove('hidden');
  confirmView.classList.add('hidden');
  checkoutTitle.textContent = 'Checkout';
  clearFieldErrors();
  renderCheckoutSummary();

  closeCart();
  checkoutOverlay.classList.remove('hidden');
  requestAnimationFrame(() => {
    checkoutOverlay.classList.remove('opacity-0');
    checkoutModal.classList.remove('translate-y-4');
  });
}

function closeCheckout() {
  checkoutOverlay.classList.add('opacity-0');
  checkoutModal.classList.add('translate-y-4');
  setTimeout(() => checkoutOverlay.classList.add('hidden'), 300);
}

// ----- Form validation -----
const fields = ['name', 'email', 'phone', 'address', 'city', 'postal', 'country'];

function setError(name, message) {
  const input = checkoutForm.elements[name];
  const errEl = input.parentElement.querySelector('.err');
  if (message) {
    input.classList.add('field-error');
    if (errEl) { errEl.textContent = message; errEl.classList.add('show'); }
  } else {
    input.classList.remove('field-error');
    if (errEl) { errEl.classList.remove('show'); }
  }
}

function clearFieldErrors() {
  fields.forEach(f => setError(f, ''));
}

function validateForm() {
  let firstInvalid = null;
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  fields.forEach(name => {
    const value = checkoutForm.elements[name].value.trim();
    let msg = '';
    if (!value) {
      msg = 'This field is required.';
    } else if (name === 'email' && !emailRe.test(value)) {
      msg = 'Enter a valid email address.';
    } else if (name === 'phone' && value.replace(/\D/g, '').length < 6) {
      msg = 'Enter a valid phone number.';
    }
    setError(name, msg);
    if (msg && !firstInvalid) firstInvalid = checkoutForm.elements[name];
  });

  if (firstInvalid) firstInvalid.focus();
  return !firstInvalid;
}

// Clear a field's error as soon as the user edits it
checkoutForm.addEventListener('input', e => {
  if (fields.includes(e.target.name)) setError(e.target.name, '');
});

// ----- Submit / place order -----
const placeOrderBtn = document.getElementById('place-order-btn');
const placeOrderLabel = document.getElementById('place-order-label');
const checkoutError = document.getElementById('checkout-error');

function buildOrderLines() {
  return [...cart.values()]
    .map(({ product: p, qty }) => `  ${qty} x ${p.name} (${p.desc}) — ${fmt(p.price * qty)}`)
    .join('\n');
}

// Sends the order via Web3Forms. Returns true on success.
// If no access key is configured yet, resolves true without sending (demo mode).
async function emailOrder(order) {
  if (!WEB3FORMS_ACCESS_KEY || WEB3FORMS_ACCESS_KEY === 'YOUR_ACCESS_KEY_HERE') {
    console.warn('Web3Forms access key not set — skipping email (demo mode).');
    return true;
  }

  const message =
    `New order ${order.orderNo}\n\n` +
    `Items:\n${order.lines}\n\n` +
    `Total: ${fmt(order.total)}\n\n` +
    `Customer:\n` +
    `  Name: ${order.name}\n` +
    `  Email: ${order.email}\n` +
    `  Phone: ${order.phone}\n\n` +
    `Ship to:\n` +
    `  ${order.address}\n` +
    `  ${order.city}, ${order.postal}\n` +
    `  ${order.country}\n\n` +
    `Notes: ${order.notes || '—'}`;

  const res = await fetch('https://api.web3forms.com/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({
      access_key: WEB3FORMS_ACCESS_KEY,
      subject: `New PeptiLab order ${order.orderNo} — ${fmt(order.total)}`,
      from_name: 'PeptiLab Store',
      replyto: order.email,
      message,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Email service returned an error.');
  }
  return true;
}

checkoutForm.addEventListener('submit', async e => {
  e.preventDefault();
  if (!validateForm()) return;

  const order = {
    orderNo: 'PL-' + Date.now().toString(36).toUpperCase(),
    total: cartTotalValue(),
    lines: buildOrderLines(),
    name: checkoutForm.elements['name'].value.trim(),
    email: checkoutForm.elements['email'].value.trim(),
    phone: checkoutForm.elements['phone'].value.trim(),
    address: checkoutForm.elements['address'].value.trim(),
    city: checkoutForm.elements['city'].value.trim(),
    postal: checkoutForm.elements['postal'].value.trim(),
    country: checkoutForm.elements['country'].value.trim(),
    notes: checkoutForm.elements['notes'].value.trim(),
  };

  // loading state
  checkoutError.classList.add('hidden');
  placeOrderBtn.disabled = true;
  placeOrderLabel.textContent = 'Placing order…';

  try {
    await emailOrder(order);
  } catch (err) {
    checkoutError.textContent = "Sorry, we couldn't submit your order: " + err.message + ' Please try again.';
    checkoutError.classList.remove('hidden');
    placeOrderBtn.disabled = false;
    placeOrderLabel.innerHTML = 'Place order · <span id="checkout-btn-total">' + fmt(order.total) + '</span>';
    return;
  }

  // success → fill + show confirmation
  document.getElementById('confirm-name').textContent = order.name;
  document.getElementById('confirm-email').textContent = order.email;
  document.getElementById('confirm-order').textContent = order.orderNo;
  document.getElementById('confirm-total').textContent = fmt(order.total);

  checkoutTitle.textContent = 'Confirmation';
  checkoutView.classList.add('hidden');
  confirmView.classList.remove('hidden');

  // reset button for next time + empty the cart
  placeOrderBtn.disabled = false;
  placeOrderLabel.innerHTML = 'Place order · <span id="checkout-btn-total">$0.00</span>';
  cart.clear();
  renderCart();
});

// Open checkout from the cart drawer button
checkoutBtn.addEventListener('click', openCheckout);

// Close handlers
document.getElementById('checkout-close').addEventListener('click', closeCheckout);
document.getElementById('confirm-done').addEventListener('click', closeCheckout);
checkoutOverlay.addEventListener('click', e => { if (!checkoutModal.contains(e.target)) closeCheckout(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeCheckout(); });

// ----- Toast -----
const toast = document.getElementById('toast');
let toastTimer;
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.remove('translate-y-20', 'opacity-0');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add('translate-y-20', 'opacity-0'), 2200);
}

// ----- Init -----
renderProducts();
loadCart();
renderCart();
