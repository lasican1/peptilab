// ===== PeptiLab storefront logic =====

// ----- Product catalog -----
const products = [
  { id: 1, name: 'BPC-157',     desc: '5mg vial · 99.8% purity',  price: 49.99, tag: 'Best seller', color: 'from-sky-400 to-blue-600' },
  { id: 2, name: 'TB-500',      desc: '5mg vial · 99.7% purity',  price: 59.99, tag: 'Popular',     color: 'from-violet-400 to-purple-600' },
  { id: 3, name: 'GHK-Cu',      desc: '50mg vial · 99.9% purity', price: 39.99, tag: null,          color: 'from-emerald-400 to-teal-600' },
  { id: 4, name: 'Semaglutide', desc: '3mg vial · 99.6% purity',  price: 89.99, tag: 'New',         color: 'from-amber-400 to-orange-600' },
];

const STORAGE_KEY = 'peptilab.cart';

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

// ----- Checkout -----
checkoutBtn.addEventListener('click', () => {
  const total = [...cart.values()].reduce((s, e) => s + e.qty * e.product.price, 0);
  showToast(`Order placed! Total: ${fmt(total)} 🎉`);
  cart.clear();
  renderCart();
  closeCart();
});

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
