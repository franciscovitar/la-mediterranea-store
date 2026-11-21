import test from 'node:test';
import assert from 'node:assert/strict';
import { createState, move, calculateQuote, checkoutFingerprint, runScenario } from './model.mjs';

function withCart(id = 'notebook') { return move(createState(), { type: 'add', id }); }
function withOrder(id = 'notebook') { return move(withCart(id), { type: 'checkout', email: 'test@example.test' }); }
function paid(s = withOrder()) { return move(s, { type: 'webhook', signed: true, providerStatus: 'approved', eventId: 'callback-1' }); }

test('catalog source, not forged client price, decides checkout total', () => {
  const s = move(withCart(), { type: 'tamper' });
  assert.match(s.last.code, /TAMPER/);
  assert.equal(s.quote.total, 18500);
});
test('cart quantity merges into one SKU', () => {
  const s = move(withCart(), { type: 'add', id: 'notebook' });
  assert.deepEqual(s.cart, [{ id: 'notebook', quantity: 2 }]);
  assert.equal(calculateQuote(s).total, 37000);
});
test('empty quote fails closed', () => assert.equal(calculateQuote(createState()).code, '422'));
test('stock race invalidates stale quote and prevents checkout', () => {
  const s = move(withCart('tote'), { type: 'stock-race' });
  assert.equal(s.last.code, '409');
  assert.equal(s.quote, null);
  assert.equal(move(s, { type: 'checkout', email: 'a@example.test' }).order, null);
});
test('pricing is recalculated from current catalog after admin edit', () => {
  let s = withCart();
  s.catalog[0].price = 20000;
  assert.equal(calculateQuote(s).total, 20000);
});
test('checkout creates one pending order without charging or debiting stock', () => {
  const s = withOrder();
  assert.equal(s.order.status, 'awaiting_payment');
  assert.equal(s.catalog[0].stock, 4);
  assert.equal(s.metrics.inventoryDebits, 0);
});
test('idempotent repeat returns previous order', () => {
  const s = withOrder();
  const repeated = move(s, { type: 'checkout', email: 'TEST@example.test' });
  assert.equal(repeated.last.code, '200 · REPLAY');
  assert.equal(repeated.order.id, s.order.id);
  assert.equal(Object.keys(repeated.claims).length, 1);
});
test('same idempotency key with another buyer conflicts', () => {
  const s = move(withOrder(), { type: 'checkout', email: 'someone@else.test' });
  assert.equal(s.last.code, '409');
  assert.equal(Object.keys(s.claims).length, 1);
});
test('fingerprint normalizes buyer casing and line order', () => {
  assert.equal(checkoutFingerprint([{id:'b',quantity:1},{id:'a',quantity:2}], ' A@B.TEST '), checkoutFingerprint([{id:'a',quantity:2},{id:'b',quantity:1}], 'a@b.test'));
});
test('invalid email cannot create an order', () => assert.equal(move(withCart(), { type: 'checkout', email: 'not-an-email' }).order, null));
test('unsigned payment callback fails closed', () => {
  const s = move(withOrder(), { type: 'webhook', signed: false, providerStatus: 'approved' });
  assert.match(s.last.code, /HMAC/);
  assert.equal(s.order.status, 'awaiting_payment');
  assert.equal(s.catalog[0].stock, 4);
});
test('pending callback never pays an order', () => {
  const s = move(withOrder(), { type: 'webhook', signed: true, providerStatus: 'pending', eventId:'pending-1' });
  assert.equal(s.order.status, 'awaiting_payment');
  assert.equal(s.metrics.inventoryDebits, 0);
});
test('approved callback debits inventory exactly once', () => {
  const s = paid();
  assert.equal(s.order.status, 'paid');
  assert.equal(s.catalog[0].stock, 3);
  assert.equal(s.metrics.inventoryDebits, 1);
});
test('duplicate callback does not debit stock twice', () => {
  const s = move(paid(), { type: 'webhook', signed: true, providerStatus: 'approved', eventId: 'callback-1' });
  assert.equal(s.catalog[0].stock, 3);
  assert.equal(s.metrics.inventoryDebits, 1);
  assert.match(s.last.code, /DEDUP/);
});
test('distinct approved callback after payment is also idempotent', () => {
  const s = move(paid(), { type: 'webhook', signed: true, providerStatus: 'approved', eventId: 'callback-2' });
  assert.equal(s.catalog[0].stock, 3);
  assert.equal(s.metrics.inventoryDebits, 1);
});
test('stock exhausted after checkout yields manual review, not negative inventory', () => {
  let s = withOrder('tote');
  s.catalog.find((p) => p.id === 'tote').stock = 0;
  s = paid(s);
  assert.equal(s.order.status, 'needs_review');
  assert.equal(s.catalog.find((p) => p.id === 'tote').stock, 0);
});
test('visitor cannot edit stock or publish drafts', () => {
  const s = move(createState(), { type: 'edit-stock', id:'tote', stock:10 });
  assert.equal(s.last.code, '403');
  assert.equal(s.catalog[2].stock, 2);
  assert.equal(move(s, { type:'publish' }).last.code, '403');
});
test('admin draft does not affect public catalog before publishing', () => {
  let s = move(createState(), { type:'role', admin:true });
  s = move(s, { type:'edit-stock', id:'tote', stock:10 });
  assert.equal(s.catalog[2].stock, 2);
  assert.equal(s.draft.after, 10);
  s = move(s, { type:'publish' });
  assert.equal(s.catalog[2].stock, 10);
  assert.equal(s.draft, null);
});
test('invalid admin stock cannot publish', () => {
  let s = move(createState(), { type:'role', admin:true });
  s = move(s, { type:'edit-stock', id:'tote', stock:-1 });
  assert.equal(s.draft, null);
  assert.equal(s.catalog[2].stock, 2);
});
test('scenario presets produce demonstrable negative states', () => {
  assert.match(runScenario('tamper').last.code, /TAMPER/);
  assert.equal(runScenario('race').last.code, '409');
  assert.equal(runScenario('forbidden').last.code, '403');
  assert.match(runScenario('payment').last.code, /DEDUP/);
});
