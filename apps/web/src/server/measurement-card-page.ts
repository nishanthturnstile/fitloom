import "server-only";
import { randomBytes } from "node:crypto";
import {
  type measurementCardResolved,
  measurementCardValueText,
} from "@fitloom/application/measurement-card-contracts";

const htmlEscape = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ] ?? char,
  );
export function cardHtml(
  data: ReturnType<typeof measurementCardResolved.parse>,
) {
  const nonce = randomBytes(18).toString("base64");
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Measurement card | Fitloom</title><meta name="referrer" content="no-referrer"><style>
 *{box-sizing:border-box}body{margin:0;background:#f5f7f5;color:#142d25;font:16px/1.5 sans-serif}main{max-width:800px;margin:32px auto;padding:28px;background:white;border:1px solid #d8e0dc;border-radius:12px}h1,h2,p{margin:0 0 12px;overflow-wrap:anywhere}h1{font-size:28px;overflow-wrap:anywhere}h2{font-size:20px}small{display:block;color:#475f54}header{display:flex;justify-content:space-between;gap:16px;align-items:start}.brand{font-size:22px;font-weight:bold}.warning{padding:12px;border:1px solid #b3863c;background:#fff8e9;font-weight:bold;margin:20px 0}.qr{width:160px;height:160px;max-width:100%;image-rendering:pixelated}section{margin:24px 0;break-inside:avoid}dl{margin:12px 0;display:grid;grid-template-columns:1fr 1fr;gap:12px 24px}dt{font-weight:bold;overflow-wrap:anywhere}dd{margin:0;white-space:pre-wrap;overflow-wrap:anywhere}button,a{font:inherit;color:inherit}button{padding:10px 16px;background:white;border:1px solid #648575;border-radius:6px;cursor:pointer}footer{border-top:1px solid #d8e0dc;padding-top:16px}.actions{display:flex;flex-wrap:wrap;gap:16px;align-items:center;margin:16px 0}@media(max-width:480px){main{margin:0;padding:20px;border-radius:0}header{flex-direction:column}dl{grid-template-columns:1fr}}@page{size:A4;margin:15mm}@media print{body{background:white;color:black}main{margin:0;max-width:none;border:0;padding:0}.actions{display:none}section{break-inside:avoid}h1{font-size:24px}.qr{width:32mm;height:32mm}}
 </style></head><body><main><header><div><p class="brand">fitloom.</p><small>STAFF MEASUREMENT CARD</small><h1>${htmlEscape(data.wearerLabel)}</h1><p>Issued ${htmlEscape(data.issuedAt)}<br>Expires ${htmlEscape(data.expiresAt)}</p></div><img class="qr" src="/api/measurement-cards/${data.cardId}/qr.png" alt="Authenticated measurement card QR code" width="160" height="160"></header><p class="warning">Verify before cutting</p><div class="actions"><button id="print-card" type="button">Print card</button><a href="/api/measurement-cards/${data.cardId}/qr.png" download="measurement-card.png">Download QR PNG</a></div>${data.items.map((item) => `<section><h2>${htmlEscape(item.profileLabel)}</h2><p>${htmlEscape(item.schemaLabel)} · Measured ${htmlEscape(item.measuredOn)} · ${htmlEscape(item.sourceKind)}</p><dl>${item.values.map((value) => `<div><dt>${htmlEscape(value.label)}</dt><dd>${htmlEscape(measurementCardValueText(value))}</dd></div>`).join("")}</dl></section>`).join("")}<footer><p>Authenticated staff access is required to open this QR link.</p><p>Printed and downloaded copies remain available to their holder. Revocation blocks subsequent reads.</p></footer></main><script nonce="${nonce}">document.getElementById('print-card').addEventListener('click',()=>window.print());</script></body></html>`;
  return new Response(html, {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "private, no-store",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
      "Content-Security-Policy": `default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; script-src 'nonce-${nonce}'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'`,
    },
  });
}
export function cardUnavailable(status = 404) {
  return new Response(
    '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Measurement card | Fitloom</title></head><body><main><h1>Measurement card unavailable</h1><p>This card cannot be opened with your current access.</p><a href="/account">Your account</a></main></body></html>',
    {
      status,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "private, no-store",
        "Referrer-Policy": "no-referrer",
        "X-Content-Type-Options": "nosniff",
        ...(status === 429 ? { "Retry-After": "60" } : {}),
      },
    },
  );
}
