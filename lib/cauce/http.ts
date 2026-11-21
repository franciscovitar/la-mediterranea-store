import { NextResponse } from "next/server";
import { CauceAccessError } from "@/lib/cauce/auth";
import { CauceValidationError } from "@/lib/cauce/validation";
import { HttpRequestError } from "@/lib/http/request";

export function merchantError(error: unknown) {
  if (error instanceof CauceAccessError) return NextResponse.json({ error: error.message }, { status: error.status, headers: { "Cache-Control": "no-store" } });
  if (error instanceof CauceValidationError) return NextResponse.json({ error: error.message }, { status: 400, headers: { "Cache-Control": "no-store" } });
  if (error instanceof HttpRequestError) return NextResponse.json({ error: error.message }, { status: error.status, headers: { "Cache-Control": "no-store" } });
  const code = (error as { code?: string })?.code;
  const status = code === "23505" ? 409 : code === "40001" ? 409 : 500;
  return NextResponse.json({ error: status === 409 ? "Conflicto: actualizá los datos e intentá de nuevo." : "No se pudo completar la operación." }, { status, headers: { "Cache-Control": "no-store" } });
}

export function merchantJson(data: unknown, status = 200) {
  return NextResponse.json(data, { status, headers: { "Cache-Control": "private, no-store" } });
}
