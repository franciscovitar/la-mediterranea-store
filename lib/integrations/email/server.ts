import { formatMoney } from "@/lib/products";
import { getOrderEmailConfig } from "@/lib/integrations/config";
import {
  claimOrderNotification,
  completeOrderNotification,
  failOrderNotification,
  getStoreOrderForNotification,
} from "@/lib/integrations/supabase/server";

type NotificationKind = "buyer_paid" | "merchant_paid";

class ResendDeliveryError extends Error {
  constructor(message: string, public readonly retryable: boolean) {
    super(message);
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;",
  })[char] ?? char);
}

function fulfillmentLabel(method: "pickup" | "delivery") {
  return method === "delivery" ? "Entrega a coordinar" : "Retiro";
}

function itemRows(items: Array<{
  productName: string;
  colorLabel?: string;
  size?: string;
  quantity: number;
  lineTotal: number;
}>) {
  return items.map((item) => {
    const detail = [item.colorLabel, item.size ? "Talle " + item.size : null, "x" + item.quantity].filter(Boolean).join(" · ");
    return `<tr>
      <td style="padding:10px 0;border-bottom:1px solid #eadfd3">
        <strong style="color:#2b211d">${escapeHtml(item.productName)}</strong>
        <div style="margin-top:3px;color:#786b64;font-size:12px">${escapeHtml(detail)}</div>
      </td>
      <td style="padding:10px 0;border-bottom:1px solid #eadfd3;text-align:right;font-weight:700;color:#2b211d">${escapeHtml(formatMoney(item.lineTotal))}</td>
    </tr>`;
  }).join("");
}

function shell(title: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#fbf5ea;font-family:Arial,sans-serif;color:#2b211d">
    <div style="max-width:620px;margin:0 auto;padding:32px 18px">
      <div style="background:#fff;border:1px solid #e3d8cc;border-radius:22px;padding:28px">
        <div style="font-size:12px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#c4006c">La Mediterránea</div>
        <h1 style="margin:10px 0 20px;font-size:28px;line-height:1.15">${escapeHtml(title)}</h1>
        ${body}
      </div>
    </div>
  </body></html>`;
}

function buyerEmail(order: NonNullable<Awaited<ReturnType<typeof getStoreOrderForNotification>>>) {
  const body = `
    <p style="color:#675b55;line-height:1.6">Hola ${escapeHtml(order.buyerName)}. Mercado Pago confirmó tu pago y tu pedido quedó registrado.</p>
    <table style="width:100%;border-collapse:collapse;margin:20px 0">${itemRows(order.items)}</table>
    <div style="display:flex;justify-content:space-between;gap:16px;font-size:18px;font-weight:800">
      <span>Total</span><span>${escapeHtml(formatMoney(order.total))}</span>
    </div>
    <div style="margin-top:22px;padding:14px;border-radius:14px;background:#fbf5ea;color:#675b55;line-height:1.55">
      <strong style="color:#2b211d">Forma de entrega:</strong> ${escapeHtml(fulfillmentLabel(order.fulfillmentMethod))}.<br>
      Coordinaremos los detalles por WhatsApp al ${escapeHtml(order.buyerPhone)}.
    </div>
    <p style="margin-top:22px;color:#8b7d75;font-size:12px">Pedido #${escapeHtml(order.id.slice(0, 8).toUpperCase())}</p>`;
  return {
    subject: "Tu compra en La Mediterránea fue confirmada",
    html: shell("¡Gracias por tu compra!", body),
  };
}

function merchantEmail(order: NonNullable<Awaited<ReturnType<typeof getStoreOrderForNotification>>>) {
  const notes = order.buyerNotes
    ? `<div style="margin-top:16px"><strong>Observaciones:</strong><br>${escapeHtml(order.buyerNotes).replace(/\n/g, "<br>")}</div>`
    : "";
  const body = `
    <div style="padding:14px;border-radius:14px;background:#fbf5ea;line-height:1.65">
      <strong>Cliente:</strong> ${escapeHtml(order.buyerName)}<br>
      <strong>Teléfono / WhatsApp:</strong> ${escapeHtml(order.buyerPhone)}<br>
      <strong>Email:</strong> ${escapeHtml(order.buyerEmail ?? "No informado")}<br>
      <strong>Entrega:</strong> ${escapeHtml(fulfillmentLabel(order.fulfillmentMethod))}
      ${notes}
    </div>
    <table style="width:100%;border-collapse:collapse;margin:20px 0">${itemRows(order.items)}</table>
    <div style="font-size:20px;font-weight:800;text-align:right">Total: ${escapeHtml(formatMoney(order.total))}</div>
    <p style="margin-top:22px;color:#8b7d75;font-size:12px">Pedido #${escapeHtml(order.id.slice(0, 8).toUpperCase())}</p>`;
  return {
    subject: "Nueva compra confirmada #" + order.id.slice(0, 8).toUpperCase(),
    html: shell("Nueva compra confirmada", body),
  };
}

async function sendResendEmail(input: {
  to: string;
  subject: string;
  html: string;
  idempotencyKey: string;
}) {
  const config = getOrderEmailConfig();
  if (!config.apiKey || !config.from) throw new ResendDeliveryError("Email transaccional no configurado.", false);

  let response: Response;
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: "Bearer " + config.apiKey,
        "Content-Type": "application/json",
        "Idempotency-Key": input.idempotencyKey,
      },
      body: JSON.stringify({
        from: config.from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
      }),
    });
  } catch {
    throw new ResendDeliveryError("No se pudo contactar al proveedor de email.", true);
  }

  if (!response.ok) {
    throw new ResendDeliveryError(
      "El proveedor de email respondió " + response.status + ".",
      response.status === 429 || response.status >= 500,
    );
  }

  const data = await response.json() as { id?: string };
  if (!data.id) throw new ResendDeliveryError("El proveedor de email no devolvió un identificador.", true);
  return data.id;
}

async function deliver(orderId: string, kind: NotificationKind, to: string, subject: string, html: string) {
  const claimed = await claimOrderNotification(orderId, kind);
  if (!claimed) return { status: "already_handled" as const, retryable: false };

  try {
    const providerId = await sendResendEmail({
      to,
      subject,
      html,
      idempotencyKey: "paid-order/" + orderId + "/" + kind,
    });
    await completeOrderNotification(orderId, kind, providerId);
    return { status: "sent" as const, retryable: false };
  } catch (error) {
    const retryable = error instanceof ResendDeliveryError ? error.retryable : true;
    try {
      await failOrderNotification(orderId, kind, error instanceof Error ? error.message : "email_error");
    } catch {
      // The original delivery result is more important than bookkeeping failure.
    }
    return { status: "failed" as const, retryable };
  }
}

export async function sendPaidOrderNotifications(orderId: string) {
  const config = getOrderEmailConfig();
  if (!config.ready || !config.merchantTo) {
    return { configured: false, retryableFailure: false, results: [] as string[] };
  }

  const order = await getStoreOrderForNotification(orderId);
  if (!order || order.status !== "paid") {
    return { configured: true, retryableFailure: false, results: ["not_paid"] };
  }

  const jobs: Array<{ kind: NotificationKind; to: string; subject: string; html: string }> = [];
  const merchant = merchantEmail(order);
  jobs.push({ kind: "merchant_paid", to: config.merchantTo, ...merchant });

  if (order.buyerEmail) {
    const buyer = buyerEmail(order);
    jobs.push({ kind: "buyer_paid", to: order.buyerEmail, ...buyer });
  }

  let retryableFailure = false;
  const results: string[] = [];
  for (const job of jobs) {
    const result = await deliver(order.id, job.kind, job.to, job.subject, job.html);
    results.push(job.kind + ":" + result.status);
    retryableFailure ||= result.status === "failed" && result.retryable;
  }

  return { configured: true, retryableFailure, results };
}
