"use client";

import { useState } from "react";
import { CAUCE_TEST_SCENARIOS, CAUCE_TEST_VISA, type CauceTestScenarioId } from "@/lib/cauce/test-payment-guide";

export function CauceTestPaymentGuide() {
  const [scenarioId, setScenarioId] = useState<CauceTestScenarioId>("approved");
  const [feedback, setFeedback] = useState("");
  const scenario = CAUCE_TEST_SCENARIOS.find((item) => item.id === scenarioId)!;
  const card = CAUCE_TEST_VISA;

  async function copy(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setFeedback(`${label} copiado`);
    } catch {
      setFeedback(`No se pudo copiar ${label.toLowerCase()}. Seleccionalo manualmente.`);
    }
  }

  return <section className="c-test-payment" aria-label="Guía para pago de demostración">
    <div className="c-test-payment-heading">
      <span className="c-test-payment-kicker">DEMO · DATOS FICTICIOS</span>
      <strong>Probá el pago en Mercado Pago</strong>
      <p>Elegí un resultado y copiá los datos al formulario seguro de Mercado Pago. No uses tarjetas reales.</p>
    </div>
    <div className="c-test-payment-scenarios" role="group" aria-label="Resultado que querés simular">
      {CAUCE_TEST_SCENARIOS.map((item) => <button key={item.id} type="button"
        className={item.id === scenarioId ? "is-selected" : ""}
        aria-pressed={item.id === scenarioId}
        onClick={() => { setScenarioId(item.id); setFeedback(""); }}>{item.label}</button>)}
    </div>
    <div className="c-test-payment-fields">
      <div className="c-test-payment-field c-test-payment-number">
        <span>Número de tarjeta · {card.brand}</span>
        <strong>{card.displayNumber}</strong>
        <button type="button" onClick={() => void copy("Número", card.cardNumber)}
          aria-label="Copiar número de tarjeta de prueba">Copiar</button>
      </div>
      <div className="c-test-payment-field">
        <span>Vencimiento</span><strong>{card.expiration}</strong>
        <button type="button" onClick={() => void copy("Vencimiento", card.expiration)}>Copiar</button>
      </div>
      <div className="c-test-payment-field">
        <span>CVV</span><strong>{card.securityCode}</strong>
        <button type="button" onClick={() => void copy("CVV", card.securityCode)}>Copiar</button>
      </div>
      <div className="c-test-payment-field">
        <span>Titular · escenario {scenario.label.toLowerCase()}</span><strong>{scenario.cardholder}</strong>
        <button type="button" onClick={() => void copy("Titular", scenario.cardholder)}>Copiar</button>
      </div>
      <div className="c-test-payment-field">
        <span>Documento · {card.documentType}</span><strong>{card.documentNumber}</strong>
        <button type="button" onClick={() => void copy("Documento", card.documentNumber)}>Copiar</button>
      </div>
    </div>
    <p className="c-test-payment-hint">{scenario.explanation} El resultado final lo confirma Mercado Pago y lo verifica nuestro servidor.</p>
    <span className="c-test-payment-feedback" role="status" aria-live="polite">{feedback}</span>
    <p className="c-test-payment-footnote">Abrí el checkout en una sesión privada. Mercado Pago puede solicitar una cuenta de comprador de prueba: nunca compartas tu contraseña real.</p>
    <a className="c-test-payment-docs" target="_blank" rel="noopener noreferrer"
      href="https://www.mercadopago.com.ar/developers/es/docs/checkout-pro-preferences/integration-test/test-purchases">
      Datos oficiales de prueba · Mercado Pago ↗
    </a>
  </section>;
}
