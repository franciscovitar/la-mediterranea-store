import { createState, move, runScenario, calculateQuote, formatMoney } from './model.mjs';

let state = createState();
let eventCounter = 0;
const $ = (id) => document.getElementById(id);
const pad = (n) => String(n).padStart(2, '0');

function el(tag, className, value) {
  const element = document.createElement(tag);
  if (className) element.className = className;
  if (value !== undefined) element.textContent = value;
  return element;
}
function control(text, action, id, extraClass = '') {
  const button = el('button', extraClass, text);
  button.type = 'button'; button.dataset.action = action; button.dataset.id = id;
  return button;
}
function paintCatalog() {
  const target = $('products'); target.replaceChildren();
  for (const product of state.catalog) {
    const card = el('article', 'product-card');
    const image = el('div', `product-visual ${product.tone}`);
    image.setAttribute('aria-hidden', 'true');
    image.append(el('span', 'product-art-object'), el('span', 'product-art-label', `CAUCE / ${product.code}`));
    const content = el('div', 'product-info');
    const top = el('div', 'product-name'); top.append(el('span', 'product-category', product.category), el('strong', '', product.name));
    const meta = el('p', '', `${product.variant} · ${product.stock} ${product.stock === 1 ? 'unidad' : 'unidades'} disponibles`);
    const bottom = el('div', 'product-bottom');
    bottom.append(el('b', '', formatMoney(product.price)), control('+ Añadir', 'add', product.id, 'add-product'));
    content.append(top, meta, bottom); card.append(image, content); target.append(card);
  }
}
function paintCart() {
  const target = $('cart'); target.replaceChildren();
  if (!state.cart.length) target.append(el('p', 'empty-cart', 'Tu carrito está vacío. Sumá algún objeto de la izquierda.'));
  for (const line of state.cart) {
    const product = state.catalog.find((p) => p.id === line.id);
    const row = el('div', 'cart-line');
    const name = el('div', 'cart-name'); name.append(el('strong', '', product.name), el('span', '', formatMoney(product.price)));
    const qty = el('div', 'qty');
    qty.append(control('−', 'decrease', line.id), el('span', '', String(line.quantity)), control('+', 'increase', line.id));
    row.append(name, qty); target.append(row);
  }
  const total = state.cart.reduce((sum, line) => sum + state.catalog.find((p) => p.id === line.id).price * line.quantity, 0);
  $('client-total').textContent = formatMoney(total);
  $('quote-output').textContent = state.quote?.ok
    ? `QUOTE / ${formatMoney(state.quote.total)} · ${state.quote.lines.length} SKU · Catálogo v${state.quote.catalogVersion}`
    : 'Sin cotización vigente. El checkout recalcula la información antes de generar pedidos.';
  $('checkout-key').textContent = state.checkoutKey;
}
function paintAdmin() {
  $('visitor').classList.toggle('selected', !state.admin);
  $('admin').classList.toggle('selected', state.admin);
  $('visitor').setAttribute('aria-pressed', String(!state.admin));
  $('admin').setAttribute('aria-pressed', String(state.admin));
  $('draft-status').textContent = state.draft
    ? `Borrador: ${state.draft.id} · stock ${state.draft.before} → ${state.draft.after}. Todavía no publicado.`
    : 'Sin borrador pendiente. Visitante y administrador son roles simulados en esta página.';
}
function paintEventLog() {
  const current = $('current-result'); current.replaceChildren();
  current.append(el('span', 'event-code', state.last.code), el('p', '', state.last.message));
  current.className = `current-result ${/^(409|403|422|401)/.test(state.last.code) ? 'rejected' : ''}`;
  const list = $('events'); list.replaceChildren();
  for (const item of state.events) {
    const row = el('li'); row.append(el('span', 'event-status', item.code), el('p', '', item.message)); list.append(row);
  }
  $('metric-quotes').textContent = pad(state.metrics.quotes);
  $('metric-conflicts').textContent = pad(state.metrics.conflicts);
  $('metric-webhooks').textContent = pad(state.metrics.paymentWebhooks);
  $('metric-debits').textContent = pad(state.metrics.inventoryDebits);
  $('order-status').textContent = state.order
    ? `${state.order.id} · ${state.order.status.replaceAll('_', ' ').toUpperCase()}` : 'SIN PEDIDO';
}
function paint() { paintCatalog(); paintCart(); paintAdmin(); paintEventLog(); }
function perform(action) { state = move(state, action); paint(); }

document.addEventListener('click', (event) => {
  const scenario = event.target.closest('[data-scenario]');
  if (scenario) {
    state = runScenario(scenario.dataset.scenario); paint();
    $('laboratorio').scrollIntoView({ behavior: 'smooth', block: 'start' });
    return;
  }
  const action = event.target.closest('[data-action]');
  if (!action) return;
  if (action.dataset.action === 'add') perform({ type: 'add', id: action.dataset.id });
  if (action.dataset.action === 'increase') perform({ type: 'quantity', id: action.dataset.id, delta: 1 });
  if (action.dataset.action === 'decrease') perform({ type: 'quantity', id: action.dataset.id, delta: -1 });
});

$('quote').addEventListener('click', () => perform({ type: 'quote' }));
$('checkout').addEventListener('click', () => perform({ type: 'checkout', email: $('buyer').value }));
$('repeat').addEventListener('click', () => perform({ type: 'checkout', email: $('buyer').value }));
$('rotate-key').addEventListener('click', () => perform({ type: 'rotate-key' }));
$('pay-pending').addEventListener('click', () => perform({ type: 'webhook', signed: true, providerStatus: 'pending', eventId: `evt-pending-${++eventCounter}` }));
$('pay-approve').addEventListener('click', () => perform({ type: 'webhook', signed: true, providerStatus: 'approved', eventId: `evt-approved-${++eventCounter}` }));
$('pay-duplicate').addEventListener('click', () => {
  const firstApproved = state.seenCallbacks.find((x) => x.startsWith('evt-approved'));
  perform({ type: 'webhook', signed: true, providerStatus: 'approved', eventId: firstApproved || `evt-approved-${++eventCounter}` });
});
$('pay-unsigned').addEventListener('click', () => perform({ type: 'webhook', signed: false, providerStatus: 'approved', eventId: `evt-forged-${++eventCounter}` }));
$('visitor').addEventListener('click', () => perform({ type: 'role', admin: false }));
$('admin').addEventListener('click', () => perform({ type: 'role', admin: true }));
$('admin-draft').addEventListener('click', () => perform({ type: 'edit-stock', id: $('admin-sku').value, stock: Number($('admin-stock').value) }));
$('admin-publish').addEventListener('click', () => perform({ type: 'publish' }));
$('reset').addEventListener('click', () => { eventCounter = 0; state = createState(); paint(); });

paint();
