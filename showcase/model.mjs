// Browser-only deterministic domain model. NOT a Supabase / Mercado Pago backend.
export const PRODUCTS = Object.freeze([
  { id: 'notebook', name: 'Cuaderno Base', category: 'Escritorio', price: 18500, stock: 4, variant: 'Grafito', tone: 'clay', code: 'C-01' },
  { id: 'bottle', name: 'Botella Nómada', category: 'Objetos', price: 28900, stock: 7, variant: 'Arena', tone: 'olive', code: 'C-02' },
  { id: 'tote', name: 'Bolso Lienzo', category: 'Textiles', price: 22900, stock: 2, variant: 'Natural', tone: 'blue', code: 'C-03' },
]);

export const formatMoney = (number) => new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(number);
const isInt = (n) => Number.isInteger(n) && n >= 0;
const clone = (s) => structuredClone(s);

export function createState() {
  return {
    catalog: PRODUCTS.map((p) => ({ ...p })), cart: [], quote: null, order: null,
    checkoutKey: 'checkout-demo-001', claims: {},
    admin: false, draft: null, backup: null, seenCallbacks: [], sequence: 0,
    last: { code: 'READY', message: 'La tienda ficticia está lista. Agregá un producto o elegí un escenario.' },
    events: [{ code: 'READY', message: 'Estado sintético inicial; ninguna operación real se ejecutó.' }],
    metrics: { quotes: 0, conflicts: 0, paymentWebhooks: 0, inventoryDebits: 0 },
  };
}

function append(s, code, message) {
  s.last = { code, message };
  s.events.unshift({ code, message });
  s.events = s.events.slice(0, 16);
  if (code.startsWith('409') || code.startsWith('403') || code.startsWith('422')) s.metrics.conflicts++;
  return s;
}

function getProduct(s, id) { return s.catalog.find((p) => p.id === id); }
function normalizedCart(cart) {
  return [...cart].map(({ id, quantity }) => ({ id, quantity })).sort((a, b) => a.id.localeCompare(b.id));
}
export function checkoutFingerprint(cart, email) {
  return JSON.stringify({ buyer: String(email).trim().toLowerCase(), lines: normalizedCart(cart) });
}

export function calculateQuote(s) {
  if (!s.cart.length) return { ok: false, code: '422', message: 'El carrito está vacío.' };
  let total = 0;
  const lines = [];
  for (const line of s.cart) {
    const product = getProduct(s, line.id);
    if (!product || !isInt(line.quantity) || line.quantity < 1 || line.quantity > 99) return { ok: false, code: '422', message: 'Línea de carrito inválida o producto inactivo.' };
    if (line.quantity > product.stock) return { ok: false, code: '409', message: `${product.name}: el stock disponible es ${product.stock}, pero el carrito pide ${line.quantity}.` };
    const amount = product.price * line.quantity;
    total += amount;
    lines.push({ id: line.id, title: product.name, quantity: line.quantity, unitPrice: product.price, amount });
  }
  return { ok: true, currency: 'ARS', total, lines, catalogVersion: s.sequence, fingerprint: JSON.stringify(normalizedCart(s.cart)) };
}

export function move(state, action) {
  const s = clone(state);
  switch (action.type) {
    case 'reset': return createState();
    case 'add': {
      const product = getProduct(s, action.id);
      if (!product) return append(s, '422', 'Producto no encontrado.');
      const existing = s.cart.find((l) => l.id === action.id);
      if (existing) existing.quantity = Math.min(existing.quantity + 1, 99);
      else s.cart.push({ id: action.id, quantity: 1 });
      s.quote = null;
      return append(s, 'CART', `${product.name} agregado. El precio de pantalla no es autoridad para el checkout.`);
    }
    case 'quantity': {
      const line = s.cart.find((l) => l.id === action.id);
      if (!line) return append(s, '422', 'La línea no existe.');
      const next = line.quantity + action.delta;
      if (!isInt(next) || next > 99) return append(s, '422', 'Cantidad fuera del rango permitido.');
      if (next === 0) s.cart = s.cart.filter((l) => l !== line); else line.quantity = next;
      s.quote = null;
      return append(s, 'CART', 'Carrito actualizado; la cotización anterior ya no es válida.');
    }
    case 'quote': {
      s.metrics.quotes++;
      const result = calculateQuote(s);
      if (!result.ok) { s.quote = null; return append(s, result.code, result.message); }
      s.quote = result;
      return append(s, '200', `Cotización de servidor: ${formatMoney(result.total)}. Precios reconstruidos desde el catálogo canónico.`);
    }
    case 'tamper': {
      if (!s.cart.length) s.cart.push({ id: 'notebook', quantity: 1 });
      const fakeBrowserTotal = 1;
      const authoritative = calculateQuote(s);
      if (!authoritative.ok) return append(s, authoritative.code, authoritative.message);
      s.quote = authoritative; s.metrics.quotes++;
      return append(s, '409 · TAMPER', `El navegador informó ${formatMoney(fakeBrowserTotal)}; el servidor recalculó ${formatMoney(authoritative.total)}. Precio manipulado rechazado.`);
    }
    case 'stock-race': {
      if (!s.cart.length) s.cart.push({ id: 'tote', quantity: 1 });
      const line = s.cart[0]; const p = getProduct(s, line.id);
      s.quote = calculateQuote(s);
      p.stock = 0; s.sequence++;
      const fresh = calculateQuote(s); s.quote = null;
      return append(s, fresh.code, `Otra compra agotó ${p.name} después de la cotización. El checkout revalidó y rechazó el stock obsoleto.`);
    }
    case 'rotate-key': {
      s.checkoutKey = `checkout-demo-${String(Number(s.checkoutKey.split('-').at(-1) || '1') + 1).padStart(3, '0')}`;
      return append(s, 'KEY', `Nueva identidad idempotente: ${s.checkoutKey}.`);
    }
    case 'checkout': {
      const email = String(action.email ?? '').trim().toLowerCase();
      if (!/^\S+@\S+\.\S+$/.test(email)) return append(s, '422', 'Necesitás un correo sintético válido. No se envía nada.');
      const fingerprint = checkoutFingerprint(s.cart, email);
      const prior = s.claims[s.checkoutKey];
      if (prior) {
        if (prior.fingerprint !== fingerprint) return append(s, '409', 'Idempotency-Key reutilizada con otro carrito o email: conflicto, sin segundo pedido.');
        return append(s, '200 · REPLAY', 'Solicitud repetida: se recuperó el mismo pedido, sin crear uno nuevo.');
      }
      const quote = calculateQuote(s);
      if (!quote.ok) return append(s, quote.code, quote.message);
      if (s.order?.status === 'awaiting_payment') return append(s, '409', 'Terminá el pedido abierto antes de iniciar otro.');
      s.quote = quote; s.metrics.quotes++;
      const id = `ORD-${String(Object.keys(s.claims).length + 1).padStart(3, '0')}`;
      s.order = { id, email, total: quote.total, lines: quote.lines, status: 'awaiting_payment', createdBy: s.checkoutKey };
      s.claims[s.checkoutKey] = { fingerprint, id };
      return append(s, '201', `${id} creado como pendiente. Aún NO se cobró ni descontó stock.`);
    }
    case 'webhook': {
      if (!s.order) return append(s, '422', 'Primero creá un pedido ficticio.');
      if (!action.signed) return append(s, '401 · HMAC', 'Firma inválida: el evento es rechazado antes de modificar el pedido.');
      const eventId = String(action.eventId || 'evt-paid-001');
      s.metrics.paymentWebhooks++;
      if (s.seenCallbacks.includes(eventId)) return append(s, '200 · DEDUP', `Callback ${eventId} repetido: sin doble descuento de stock.`);
      s.seenCallbacks.push(eventId);
      if (action.providerStatus !== 'approved') return append(s, '202', 'Estado del proveedor simulado: pago pendiente; el pedido no se marca pagado.');
      if (s.order.status === 'paid') return append(s, '200 · DEDUP', 'Pedido ya pagado: otro evento legítimo no descuenta stock de nuevo.');
      for (const line of s.order.lines) {
        if (getProduct(s, line.id).stock < line.quantity) {
          s.order.status = 'needs_review';
          return append(s, '409', 'Pago aprobado, pero stock insuficiente. Se eleva a revisión; nunca se crea inventario negativo.');
        }
      }
      for (const line of s.order.lines) getProduct(s, line.id).stock -= line.quantity;
      s.order.status = 'paid'; s.sequence++; s.metrics.inventoryDebits++;
      return append(s, '200 · PAID', 'Proveedor confirmado (simulado): el pedido pasó a pagado y el stock se descontó una sola vez.');
    }
    case 'role':
      s.admin = Boolean(action.admin);
      return append(s, 'IDENTITY', s.admin ? 'Sesión de administrador simulada. Esto NO autentica contra Supabase.' : 'Vista de visitante; las operaciones administrativas quedan bloqueadas.');
    case 'edit-stock': {
      if (!s.admin) return append(s, '403', 'Operación denegada para visitante. En el backend real, Auth + RLS protegen administración.');
      const p = getProduct(s, action.id || 'tote');
      if (!p || !isInt(action.stock) || action.stock > 9999) return append(s, '422', 'Stock inválido; no se guarda.');
      s.draft = { id: p.id, before: p.stock, after: action.stock };
      return append(s, 'DRAFT', `Borrador: ${p.name} ${p.stock} → ${action.stock}. La tienda sigue con el stock original.`);
    }
    case 'publish': {
      if (!s.admin) return append(s, '403', 'Publicación denegada: permisos insuficientes.');
      if (!s.draft) return append(s, '422', 'No hay borrador para publicar.');
      getProduct(s, s.draft.id).stock = s.draft.after;
      s.sequence++; s.quote = null;
      const name = getProduct(s, s.draft.id).name;
      s.draft = null;
      return append(s, '200 · ADMIN', `Inventario de ${name} publicado. Cotizaciones anteriores invalidadas.`);
    }
    default: return append(s, '422', 'Operación desconocida, sin efectos.');
  }
}

export function runScenario(type) {
  let s = createState();
  if (type === 'tamper') return move(s, { type: 'tamper' });
  if (type === 'race') return move(s, { type: 'stock-race' });
  if (type === 'forbidden') return move(s, { type: 'edit-stock', id: 'tote', stock: 10 });
  if (type === 'payment') {
    s = move(s, { type: 'add', id: 'notebook' });
    s = move(s, { type: 'checkout', email: 'demo@example.test' });
    s = move(s, { type: 'webhook', signed: true, providerStatus: 'approved', eventId: 'evt-paid-001' });
    return move(s, { type: 'webhook', signed: true, providerStatus: 'approved', eventId: 'evt-paid-001' });
  }
  return s;
}
