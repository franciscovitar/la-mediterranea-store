import { NextResponse } from "next/server";
import { CauceAccessError } from "@/lib/cauce/auth";
import { CauceCheckoutError } from "@/lib/cauce/checkout";
import { HttpRequestError } from "@/lib/http/request";

export const checkoutHeaders = { "Cache-Control": "no-store" };

export function checkoutJson(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: checkoutHeaders });
}

export function checkoutHttpError(reason: unknown) {
  if (reason instanceof CauceCheckoutError) return checkoutJson({ error: reason.message }, reason.status);
  if (reason instanceof CauceAccessError) return checkoutJson({ error: reason.message }, reason.status);
  if (reason instanceof HttpRequestError) return checkoutJson({ error: reason.message }, reason.status);
  return checkoutJson({ error: "No se pudo completar la operación. Intentá de nuevo." }, 500);
}
