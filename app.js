// ===== Logika sklepu PeptiLab =====

// ----- Katalog produktów -----
const products = [
  { id: 1, name: 'Retarutide',     desc: 'Fiolka 10 mg · czystość 99,8%',  price: 400.00, tag: 'Bestseller', color: 'from-sky-400 to-blue-600' },
  { id: 2, name: 'GHK-Cu',      desc: 'Fiolka 100 mg · czystość 99,7%',  price: 399.99, tag: 'Popularne',  color: 'from-violet-400 to-purple-600' },
  { id: 3, name: 'Semaglutyd',      desc: 'Fiolka 10 mg · czystość 99,9%', price: 299.99, tag: null,         color: 'from-emerald-400 to-teal-600' },
  { id: 4, name: 'Mots-C',  desc: 'Fiolka 10 mg · czystość 99,6%',  price: 199.99, tag: 'Nowość',     color: 'from-amber-400 to-orange-600' },
];

const STORAGE_KEY = 'peptilab.cart';

// ----- Konfiguracja wysyłki zamówień e-mailem (Web3Forms) -----
// Bezpłatny klucz dostępu uzyskasz na https://web3forms.com (podaj adres e-mail,
// na który mają trafiać zamówienia; klucz przyjdzie od razu pocztą). Wklej go niżej.
// Dopóki pozostaje wartość zastępcza, zamówienie działa, ale jest tylko
// potwierdzane lokalnie, bez wysyłki e-maila.
const WEB3FORMS_ACCESS_KEY = '20d7db36-36ee-47c1-8934-f3c447f01c0a';

// ----- Wysyłka i płatność -----
// Koszt wysyłki wg obszaru (w złotówkach)
const SHIPPING_COSTS = { pl: 20, eu: 100 };
const SHIPPING_REGION_LABELS = { pl: 'Polska', eu: 'Europa' };
const SHIPPING_METHOD_LABELS = { kurier: 'Kurier', paczkomat: 'Paczkomat' };

// Numer konta do przelewu — WPISZ TUTAJ swój numer, gdy będziesz go mieć.
const BANK_ACCOUNT = '00 0000 0000 0000 0000 0000 0000';
// Odbiorca przelewu
const BANK_RECIPIENT = 'PeptiLab';

// ----- E-mail potwierdzający do KLIENTA (EmailJS) -----
// Darmowe konto: https://www.emailjs.com — połącz usługę e-mail (np. Gmail),
// utwórz szablon i wklej trzy wartości poniżej. Dopóki są wartości zastępcze,
// e-mail do klienta jest pomijany (zamówienie i tak działa, dane do przelewu
// klient widzi na ekranie potwierdzenia).
const EMAILJS_PUBLIC_KEY  = 'MOlwfu9oJ4fjhJG8v';
const EMAILJS_SERVICE_ID  = 'service_fa14yml';
const EMAILJS_TEMPLATE_ID = 'template_xu4zjso';

// cart: Map<id, { product, qty }>
const cart = new Map();

// Format ceny w złotówkach, np. „199,99 zł”
const plnFormatter = new Intl.NumberFormat('pl-PL', { style: 'currency', currency: 'PLN' });
const fmt = n => plnFormatter.format(n);

const vialIcon = (size) => `
  <svg xmlns="http://www.w3.org/2000/svg" class="${size} text-white/90" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.3">
    <path stroke-linecap="round" stroke-linejoin="round" d="M9 3h6m-5 0v4.586a2 2 0 01-.586 1.414l-4.243 4.243A4 4 0 008 20h8a4 4 0 002.829-6.757l-4.243-4.243A2 2 0 0114 7.586V3" />
  </svg>`;

// ----- Trwałość (localStorage) -----
function saveCart() {
  const data = [...cart.values()].map(({ product, qty }) => ({ id: product.id, qty }));
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    /* pamięć może być niedostępna (tryb prywatny, limit) — pomijamy po cichu */
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

// ----- Renderowanie siatki produktów -----
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
          <button data-add="${p.id}" class="rounded-full bg-brand-500 text-white px-4 py-2 text-sm font-semibold hover:bg-brand-600 transition">Dodaj</button>
        </div>
      </div>
    </div>
  `).join('');
}

// ----- Elementy koszyka -----
const cartCount = document.getElementById('cart-count');
const cartItems = document.getElementById('cart-items');
const cartEmpty = document.getElementById('cart-empty');
const cartTotal = document.getElementById('cart-total');
const checkoutBtn = document.getElementById('checkout-btn');

// ----- Logika koszyka -----
function addToCart(id) {
  const product = products.find(p => p.id === id);
  if (!product) return;
  const entry = cart.get(id) || { product, qty: 0 };
  entry.qty++;
  cart.set(id, entry);
  renderCart();
  showToast(`Dodano do koszyka: ${product.name}`);
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

// ----- Delegacja zdarzeń: dodaj / zwiększ / zmniejsz -----
document.addEventListener('click', e => {
  const add = e.target.closest('[data-add]');
  const inc = e.target.closest('[data-inc]');
  const dec = e.target.closest('[data-dec]');
  if (add) addToCart(+add.dataset.add);
  if (inc) changeQty(+inc.dataset.inc, 1);
  if (dec) changeQty(+dec.dataset.dec, -1);
});

// ----- Otwieranie / zamykanie panelu koszyka -----
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

// ----- Okno zamówienia -----
const checkoutOverlay = document.getElementById('checkout-overlay');
const checkoutModal = document.getElementById('checkout-modal');
const checkoutView = document.getElementById('checkout-view');
const confirmView = document.getElementById('confirm-view');
const checkoutForm = document.getElementById('checkout-form');
const checkoutSummary = document.getElementById('checkout-summary');
const checkoutTitle = document.getElementById('checkout-title');
const placeOrderBtn = document.getElementById('place-order-btn');
const placeOrderLabel = document.getElementById('place-order-label');
const checkoutError = document.getElementById('checkout-error');

function cartTotalValue() {
  return [...cart.values()].reduce((s, e) => s + e.qty * e.product.price, 0);
}

// ----- Wysyłka -----
function getShipMethod() {
  const r = checkoutForm.elements['shipMethod'];
  return (r && r.value) || 'kurier';
}
function getShipRegion() {
  const r = checkoutForm.elements['shipRegion'];
  return (r && r.value) || 'pl';
}
function shippingCost() {
  return SHIPPING_COSTS[getShipRegion()] || 0;
}
function orderTotal() {
  return cartTotalValue() + shippingCost();
}

// Pokaż/ukryj pole numeru paczkomatu zależnie od wybranego rodzaju przesyłki
function togglePaczkomat() {
  const show = getShipMethod() === 'paczkomat';
  document.getElementById('paczkomat-wrap').classList.toggle('hidden', !show);
  if (!show) setError('paczkomat', '');
}

// Przelicz i wyświetl kwoty (produkty / wysyłka / razem)
function renderCheckoutTotals() {
  const subtotal = cartTotalValue();
  const ship = shippingCost();
  const total = subtotal + ship;
  document.getElementById('sum-subtotal').textContent = fmt(subtotal);
  document.getElementById('sum-shipping').textContent = fmt(ship);
  document.getElementById('checkout-total').textContent = fmt(total);
  document.getElementById('checkout-btn-total').textContent = fmt(total);
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

  renderCheckoutTotals();
}

function openCheckout() {
  if (cartTotalValue() <= 0) return;
  // przywróć widok formularza
  checkoutView.classList.remove('hidden');
  confirmView.classList.add('hidden');
  checkoutTitle.textContent = 'Zamówienie';
  clearFieldErrors();
  renderCheckoutSummary();
  togglePaczkomat();

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

// ----- Walidacja formularza -----
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
      msg = 'To pole jest wymagane.';
    } else if (name === 'email' && !emailRe.test(value)) {
      msg = 'Podaj prawidłowy adres e-mail.';
    } else if (name === 'phone' && value.replace(/\D/g, '').length < 6) {
      msg = 'Podaj prawidłowy numer telefonu.';
    }
    setError(name, msg);
    if (msg && !firstInvalid) firstInvalid = checkoutForm.elements[name];
  });

  // Numer paczkomatu wymagany tylko przy wyborze przesyłki do paczkomatu
  if (getShipMethod() === 'paczkomat') {
    const paczEl = checkoutForm.elements['paczkomat'];
    if (!paczEl.value.trim()) {
      setError('paczkomat', 'Podaj numer paczkomatu.');
      if (!firstInvalid) firstInvalid = paczEl;
    } else {
      setError('paczkomat', '');
    }
  }

  if (firstInvalid) firstInvalid.focus();
  return !firstInvalid;
}

// Usuń komunikat o błędzie, gdy tylko użytkownik zacznie poprawiać pole
checkoutForm.addEventListener('input', e => {
  if (fields.includes(e.target.name) || e.target.name === 'paczkomat') setError(e.target.name, '');
});

// Reaguj na zmianę rodzaju przesyłki / obszaru wysyłki
checkoutForm.addEventListener('change', e => {
  if (e.target.name === 'shipMethod') togglePaczkomat();
  if (e.target.name === 'shipMethod' || e.target.name === 'shipRegion') renderCheckoutTotals();
});

// ----- Wysyłka zamówienia e-mailem (Web3Forms) -----
function buildOrderLines() {
  return [...cart.values()]
    .map(({ product: p, qty }) => `  ${qty} x ${p.name} (${p.desc}) — ${fmt(p.price * qty)}`)
    .join('\n');
}

// Wysyła zamówienie przez Web3Forms. Zwraca true przy powodzeniu.
// Jeśli klucz dostępu nie jest jeszcze ustawiony, zwraca true bez wysyłki (tryb demo).
async function emailOrder(order, captchaToken) {
  if (!WEB3FORMS_ACCESS_KEY || WEB3FORMS_ACCESS_KEY === 'YOUR_ACCESS_KEY_HERE') {
    console.warn('Brak klucza dostępu Web3Forms — pomijam wysyłkę e-maila (tryb demo).');
    return true;
  }

  const message =
    `Nowe zamówienie ${order.orderNo}\n\n` +
    `Produkty:\n${order.lines}\n\n` +
    `Produkty razem: ${fmt(order.subtotal)}\n` +
    `Wysyłka (${order.shipMethodLabel}, ${order.shipRegionLabel}): ${fmt(order.shipping)}\n` +
    `RAZEM DO ZAPŁATY: ${fmt(order.total)}\n\n` +
    `Dostawa:\n` +
    `  Rodzaj przesyłki: ${order.shipMethodLabel}\n` +
    (order.paczkomat ? `  Numer paczkomatu: ${order.paczkomat}\n` : '') +
    `  Obszar: ${order.shipRegionLabel}\n\n` +
    `Klient:\n` +
    `  Imię i nazwisko: ${order.name}\n` +
    `  E-mail: ${order.email}\n` +
    `  Telefon: ${order.phone}\n\n` +
    `Adres dostawy:\n` +
    `  ${order.address}\n` +
    `  ${order.postal} ${order.city}\n` +
    `  ${order.country}\n\n` +
    `Uwagi: ${order.notes || '—'}\n\n` +
    `Płatność: przelew\n` +
    `  Odbiorca: ${BANK_RECIPIENT}\n` +
    `  Tytuł: ${order.orderNo}\n` +
    `  Kwota: ${fmt(order.total)}\n` +
    `  Numer konta: ${BANK_ACCOUNT}`;

  const res = await fetch('https://api.web3forms.com/submit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
    body: JSON.stringify({
      access_key: WEB3FORMS_ACCESS_KEY,
      subject: `Nowe zamówienie PeptiLab ${order.orderNo} — ${fmt(order.total)}`,
      from_name: 'Sklep PeptiLab',
      replyto: order.email,
      'h-captcha-response': captchaToken,
      message,
    }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.success) {
    throw new Error(data.message || 'Usługa e-mail zwróciła błąd.');
  }
  return true;
}

// Treść wiadomości potwierdzającej wysyłanej do KLIENTA
function buildCustomerMessage(order) {
  return (
    `Dziękujemy za zamówienie w PeptiLab!\n\n` +
    `Numer zamówienia: ${order.orderNo}\n\n` +
    `Produkty:\n${order.lines}\n\n` +
    `Produkty razem: ${fmt(order.subtotal)}\n` +
    `Wysyłka (${order.shipMethodLabel}, ${order.shipRegionLabel}): ${fmt(order.shipping)}\n` +
    `Razem do zapłaty: ${fmt(order.total)}\n\n` +
    (order.paczkomat ? `Numer paczkomatu: ${order.paczkomat}\n` : '') +
    `Adres dostawy:\n` +
    `  ${order.name}\n` +
    `  ${order.address}\n` +
    `  ${order.postal} ${order.city}\n` +
    `  ${order.country}\n\n` +
    `PŁATNOŚĆ PRZELEWEM\n` +
    `Prosimy o przelew na poniższe dane. Zamówienie realizujemy po zaksięgowaniu wpłaty.\n` +
    `  Odbiorca: ${BANK_RECIPIENT}\n` +
    `  Tytuł płatności: ${order.orderNo}\n` +
    `  Kwota: ${fmt(order.total)}\n` +
    `  Numer konta: ${BANK_ACCOUNT}\n\n` +
    `W razie pytań po prostu odpisz na tę wiadomość.\n` +
    `Pozdrawiamy,\nZespół PeptiLab`
  );
}

// Wysyła e-mail potwierdzający do klienta przez EmailJS.
// Błędy są tylko logowane — nie blokują złożenia zamówienia.
async function emailCustomer(order) {
  const notConfigured =
    !window.emailjs ||
    !EMAILJS_PUBLIC_KEY || EMAILJS_PUBLIC_KEY === 'YOUR_PUBLIC_KEY' ||
    !EMAILJS_SERVICE_ID || EMAILJS_SERVICE_ID === 'YOUR_SERVICE_ID' ||
    !EMAILJS_TEMPLATE_ID || EMAILJS_TEMPLATE_ID === 'YOUR_TEMPLATE_ID';
  if (notConfigured) {
    console.warn('EmailJS nie skonfigurowany — pomijam e-mail do klienta.');
    return;
  }
  try {
    await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
      to_email: order.email,
      to_name: order.name,
      subject: `Potwierdzenie zamówienia ${order.orderNo} — PeptiLab`,
      order_no: order.orderNo,
      total: fmt(order.total),
      message: buildCustomerMessage(order),
    }, { publicKey: EMAILJS_PUBLIC_KEY });
  } catch (e) {
    console.warn('Nie udało się wysłać e-maila do klienta:', e);
  }
}

checkoutForm.addEventListener('submit', async e => {
  e.preventDefault();

  // Honeypot: użytkownicy nie widzą tego pola, więc jeśli jest wypełnione, to bot.
  // Po cichu odrzucamy zgłoszenie bez wysyłki i bez komunikatu o błędzie.
  if (checkoutForm.elements['botcheck'] && checkoutForm.elements['botcheck'].value) {
    console.warn('Honeypot wykrył bota — zgłoszenie zignorowane.');
    return;
  }

  if (!validateForm()) return;

  // Wymagaj rozwiązania zadania hCaptcha (gdy widżet jest załadowany).
  const captchaToken = (window.hcaptcha && typeof hcaptcha.getResponse === 'function')
    ? hcaptcha.getResponse()
    : '';
  if (window.hcaptcha && !captchaToken) {
    checkoutError.textContent = 'Potwierdź, że nie jesteś robotem.';
    checkoutError.classList.remove('hidden');
    return;
  }

  const method = getShipMethod();
  const region = getShipRegion();
  const order = {
    orderNo: 'PL-' + Date.now().toString(36).toUpperCase(),
    subtotal: cartTotalValue(),
    shipping: shippingCost(),
    total: orderTotal(),
    lines: buildOrderLines(),
    shipMethod: method,
    shipMethodLabel: SHIPPING_METHOD_LABELS[method],
    shipRegion: region,
    shipRegionLabel: SHIPPING_REGION_LABELS[region],
    paczkomat: method === 'paczkomat' ? checkoutForm.elements['paczkomat'].value.trim() : '',
    name: checkoutForm.elements['name'].value.trim(),
    email: checkoutForm.elements['email'].value.trim(),
    phone: checkoutForm.elements['phone'].value.trim(),
    address: checkoutForm.elements['address'].value.trim(),
    city: checkoutForm.elements['city'].value.trim(),
    postal: checkoutForm.elements['postal'].value.trim(),
    country: checkoutForm.elements['country'].value.trim(),
    notes: checkoutForm.elements['notes'].value.trim(),
  };

  // stan ładowania
  checkoutError.classList.add('hidden');
  placeOrderBtn.disabled = true;
  placeOrderLabel.textContent = 'Składanie zamówienia…';

  try {
    await emailOrder(order, captchaToken);
  } catch (err) {
    checkoutError.textContent = 'Niestety nie udało się złożyć zamówienia: ' + err.message + ' Spróbuj ponownie.';
    checkoutError.classList.remove('hidden');
    placeOrderBtn.disabled = false;
    placeOrderLabel.innerHTML = 'Złóż zamówienie · <span id="checkout-btn-total">' + fmt(order.total) + '</span>';
    if (window.hcaptcha) hcaptcha.reset();
    return;
  }

  if (window.hcaptcha) hcaptcha.reset();

  // wyślij e-mail potwierdzający do klienta (nie blokuje w razie błędu)
  emailCustomer(order);

  // powodzenie → uzupełnij i pokaż potwierdzenie
  document.getElementById('confirm-name').textContent = order.name;
  document.getElementById('confirm-email').textContent = order.email;
  document.getElementById('confirm-details').innerHTML = `
    <div class="rounded-xl bg-slate-50 border border-slate-200 p-5 space-y-4 text-left">
      <div>
        <div class="text-sm text-slate-500">Numer zamówienia</div>
        <div class="font-mono font-bold text-lg text-slate-900">${order.orderNo}</div>
      </div>
      <div>
        <div class="text-sm text-slate-500">Dostawa</div>
        <div class="font-medium text-slate-800">${order.shipMethodLabel} — ${order.shipRegionLabel} (${fmt(order.shipping)})</div>
        ${order.paczkomat ? `<div class="text-sm text-slate-600">Numer paczkomatu: ${order.paczkomat}</div>` : ''}
      </div>
      <div class="pt-4 border-t border-slate-200">
        <div class="font-bold text-slate-900 mb-1">Płatność przelewem</div>
        <p class="text-sm text-slate-500 mb-3">Prosimy o przelew na poniższe dane. Zamówienie realizujemy po zaksięgowaniu wpłaty.</p>
        <dl class="text-sm space-y-2">
          <div class="flex justify-between gap-4"><dt class="text-slate-500">Odbiorca</dt><dd class="font-medium text-slate-900 text-right">${BANK_RECIPIENT}</dd></div>
          <div class="flex justify-between gap-4"><dt class="text-slate-500">Tytuł płatności</dt><dd class="font-mono font-medium text-slate-900 text-right">${order.orderNo}</dd></div>
          <div class="flex justify-between gap-4"><dt class="text-slate-500">Kwota</dt><dd class="font-bold text-slate-900 text-right">${fmt(order.total)}</dd></div>
          <div class="flex justify-between gap-4"><dt class="text-slate-500">Numer konta</dt><dd class="font-mono font-medium text-slate-900 text-right break-all">${BANK_ACCOUNT}</dd></div>
        </dl>
      </div>
    </div>`;

  checkoutTitle.textContent = 'Potwierdzenie';
  checkoutView.classList.add('hidden');
  confirmView.classList.remove('hidden');

  // zresetuj przycisk na przyszłość i opróżnij koszyk
  placeOrderBtn.disabled = false;
  placeOrderLabel.innerHTML = 'Złóż zamówienie · <span id="checkout-btn-total">0,00 zł</span>';
  cart.clear();
  renderCart();
});

// Otwórz okno zamówienia z panelu koszyka
checkoutBtn.addEventListener('click', openCheckout);

// Obsługa zamykania
document.getElementById('checkout-close').addEventListener('click', closeCheckout);
document.getElementById('confirm-done').addEventListener('click', closeCheckout);
checkoutOverlay.addEventListener('click', e => { if (!checkoutModal.contains(e.target)) closeCheckout(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeCheckout(); });

// ----- Powiadomienie (toast) -----
const toast = document.getElementById('toast');
let toastTimer;
function showToast(msg) {
  toast.textContent = msg;
  toast.classList.remove('translate-y-20', 'opacity-0');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.add('translate-y-20', 'opacity-0'), 2200);
}

// ----- Inicjalizacja -----
renderProducts();
loadCart();
renderCart();
