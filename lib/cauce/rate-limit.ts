import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { CauceCheckoutError, validCheckoutUuid } from "@/lib/cauce/checkout";
import { cauceOrderClient } from "@/lib/cauce/order-store";

const MAX_NEW_RESERVATIONS = 5;
const WINDOW_SECONDS = 10 * 60;

/** Hashes Vercel's trusted client IP and idempotency key; raw values never reach storage. */
export function cauceReservationRateLimitHashes(clientIp: string | null, requestKey: unknown, secret: string) {
  if (!clientIp || isIP(clientIp.trim()) === 0 || !validCheckoutUuid(requestKey) || secret.length < 16) {
    throw new CauceCheckoutError("No se pudo comprobar el origen del pedido.", 503);
  }
  return {
    clientHash: createHmac("sha256", secret).update(clientIp.trim()).digest("hex"),
    requestHash: createHmac("sha256", secret).update(requestKey).digest("hex"),
  };
}

/** A database RPC enforces a shared quota across concurrent/serverless instances. */
export async function enforceCauceReservationRateLimit(request: Request, requestKey: unknown) {
  const hashes = cauceReservationRateLimitHashes(
    request.headers.get("x-vercel-forwarded-for"),
    requestKey,
    process.env.CAUCE_SUPABASE_SECRET_KEY ?? "",
  );
  const { data, error } = await cauceOrderClient().rpc("cauce_reservation_rate_limit", {
    p_client_hash: hashes.clientHash,
    p_request_hash: hashes.requestHash,
    p_max_attempts: MAX_NEW_RESERVATIONS,
    p_window_seconds: WINDOW_SECONDS,
  });
  if (error || typeof data !== "boolean") {
    throw new CauceCheckoutError("No pudimos comprobar el límite de pedidos. Reintentá más tarde.", 503);
  }
  if (!data) throw new CauceCheckoutError("Alcanzaste el límite temporal de pedidos. Probá más tarde.", 429);
}
