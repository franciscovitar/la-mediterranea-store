/** Public, fictional Mercado Pago Checkout Pro test fixtures. Never use or log real card details. */
export const CAUCE_TEST_VISA = {
  brand: "Visa",
  cardNumber: "4509953566233704",
  displayNumber: "4509 9535 6623 3704",
  expiration: "11/30",
  securityCode: "123",
  documentType: "DNI",
  documentNumber: "12345678",
} as const;

export const CAUCE_TEST_SCENARIOS = [
  { id: "approved", label: "Aprobado", cardholder: "APRO", explanation: "Mercado Pago simula una aprobación." },
  { id: "rejected", label: "Rechazado", cardholder: "OTHE", explanation: "Mercado Pago simula un rechazo general." },
  { id: "pending", label: "Pendiente", cardholder: "CONT", explanation: "Mercado Pago simula un pago pendiente." },
] as const;

export type CauceTestScenarioId = typeof CAUCE_TEST_SCENARIOS[number]["id"];
