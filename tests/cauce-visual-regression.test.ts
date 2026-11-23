import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const cartProvider = readFileSync("components/cauce/CauceCartProvider.tsx", "utf8");
const cauceCss = readFileSync("app/cauce.css", "utf8");
const historicalCss = readFileSync("app/globals.css", "utf8");
const testGuide = readFileSync("components/cauce/CauceTestPaymentGuide.tsx", "utf8");

test("Cauce has a single min-height viewport root wrapping both page content and floating cart", () => {
  assert.equal((cartProvider.match(/className="c-site"/g) ?? []).length, 1);
  assert.match(cartProvider, /<div className="c-site">\s*\{children\}[\s\S]*?<CartDrawer[\s\S]*?<\/div>\s*<\/Context.Provider>/);
});

test("Cauce overrides inherited historical brand colors only within its own site", () => {
  assert.match(cauceCss, /\.c-site\s*\{[\s\S]*?--magenta-text:\s*var\(--c-olive\)/);
  assert.match(cauceCss, /\.c-site \.cart-head \.eyebrow\s*\{[^}]*color:\s*var\(--c-olive\)/);
  assert.match(cauceCss, /\.c-site \.cart-drawer \.text-button\s*\{[^}]*color:\s*var\(--c-olive\)/);
  assert.match(historicalCss, /--magenta:\s*#e5007f/);
});

test("Checkout Pro demo explicitly warns that a card is insufficient without a test buyer", () => {
  assert.match(testGuide, /cuenta compradora de prueba/);
  assert.match(testGuide, /Una de las partes con la que intentás hacer el pago es de prueba/);
  assert.match(testGuide, /checkout-pro-preferences\/test-accounts/);
});
