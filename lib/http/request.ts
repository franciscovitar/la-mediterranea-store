export class HttpRequestError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "HttpRequestError";
    this.status = status;
  }
}

export async function readJsonBody<T>(request: Request, maxBytes = 32_768): Promise<T> {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("application/json")) {
    throw new HttpRequestError(415, "La solicitud debe enviarse como JSON.");
  }

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    throw new HttpRequestError(413, "La solicitud es demasiado grande.");
  }

  const raw = await request.text();
  if (new TextEncoder().encode(raw).byteLength > maxBytes) {
    throw new HttpRequestError(413, "La solicitud es demasiado grande.");
  }

  try {
    return JSON.parse(raw) as T;
  } catch {
    throw new HttpRequestError(400, "El JSON de la solicitud no es válido.");
  }
}

export function noStoreJson(body: unknown, init: ResponseInit = {}) {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", "no-store");
  return Response.json(body, { ...init, headers });
}
