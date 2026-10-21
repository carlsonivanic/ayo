import { ADVANCE } from "./bannerMetrics";

/**
 * Promo banner for stores, drawn as one SVG in millimetres so the same markup
 * previews on screen and converts to a print-size vector PDF. Only the hand
 * mockup is raster.
 */

export const BANNER_SIZES = [
  { id: "4x1", label: "4 × 1 m", w: 4000, h: 1000 },
  { id: "3x1", label: "3 × 1 m", w: 3000, h: 1000 },
  { id: "2x1", label: "2 × 1 m", w: 2000, h: 1000 },
  { id: "1.6x0.8", label: "1,6 × 0,8 m", w: 1600, h: 800 },
] as const;

export type BannerSize = (typeof BANNER_SIZES)[number];

export type BannerInfo = {
  storeName: string;
  whatsapp: string;
  instagram: string;
  facebook: string;
};

// Families are registered under these names both as CSS @font-face (preview)
// and in jsPDF (export), so svg2pdf resolves them without style mapping.
export const BANNER_FONTS = {
  BnXBI: "Poppins-ExtraBoldItalic",
  BnBI: "Poppins-BoldItalic",
  BnSB: "Poppins-SemiBold",
  BnBlack: "Poppins-Black",
} as const;
type Family = keyof typeof BANNER_FONTS;

export const HAND_SRC = "/banner/hand-phone.png";
const HAND_RATIO = 970 / 1465;

const BLUE = "#1238C4";
const NAVY = "#0A2378";
const YELLOW = "#FFD200";
const TEAL = "#16A3B5";

export function textWidth(text: string, family: Family, size: number): number {
  const table = ADVANCE[BANNER_FONTS[family]];
  let em = 0;
  for (const ch of text) {
    const code = ch.charCodeAt(0);
    em += code >= 32 && code <= 126 ? table[code - 32] : 0.6;
  }
  return em * size;
}

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const n = (v: number) => Math.round(v * 10) / 10;
const poly = (pts: [number, number][], fill: string, extra = "") =>
  `<polygon points="${pts.map(([x, y]) => `${n(x)},${n(y)}`).join(" ")}" fill="${fill}"${extra}/>`;

export function placeholders(info: BannerInfo): BannerInfo {
  return {
    storeName: (info.storeName.trim() || "Nama Toko").toUpperCase(),
    whatsapp: info.whatsapp.trim(),
    instagram: info.instagram.trim().replace(/^@/, ""),
    facebook: info.facebook.trim(),
  };
}

export function buildBanner(size: { w: number; h: number }, raw: BannerInfo, handHref = HAND_SRC) {
  const { w: W, h: H } = size;
  const info = placeholders(raw);
  const wide = W / H >= 2.5;

  // Columns: text block on the left, phone in hand on the right.
  const left = (wide ? 0.3 : 0.15) * H;
  const phoneH = (wide ? 0.98 : 0.9) * H;
  const phoneW = phoneH * HAND_RATIO;
  const textW = Math.min(W - left - phoneW - (wide ? 0.45 : 0.24) * H, 2.3 * H);
  const gap = 0.12 * H;
  const spare = Math.max(0, W - left - textW - gap - phoneW - 0.1 * H);
  const phoneX = left + textW + gap + spare * 0.25;
  const phoneY = H - phoneH + 0.07 * H;

  // Type sizes, each shrunk until its line fits the column.
  const L1 = "LEBIH CEPAT,";
  const L2 = "LEBIH TEPAT";
  const head = Math.min(
    (wide ? 0.1 : 0.09) * H,
    (textW * 0.97) / (Math.max(textWidth(L1, "BnXBI", 1), textWidth(L2, "BnXBI", 1)) + 0.06),
  );
  const barsW = 0.17 * H;
  const nameX = left + barsW + 0.04 * H;
  const nameMax = left + textW - nameX;
  const name = Math.min((wide ? 0.215 : 0.19) * H, nameMax / (textWidth(info.storeName, "BnBI", 1) + 0.04));
  const tag = 0.05 * H;
  const tagText = "PAKAI SELLMORE.ID";
  const tagW = textWidth(tagText, "BnBlack", tag) + tag * 1.4;
  const tagH = tag * 1.75;
  const tagX = phoneX - tagW * 0.42;
  const tagY = phoneY + phoneH * 0.58;

  // Contact rows run until the tag; long handles shrink instead of colliding.
  const contactX = left + barsW * 0.35 + 0.047 * H * 1.35 * 1.45 + 0.03 * H;
  // Contacts are optional; only filled ones get a row.
  const rows = (
    [
      [ICON_WA, info.whatsapp],
      [ICON_IG, info.instagram],
      [ICON_FB, info.facebook],
    ] as [string, string][]
  ).filter(([, value]) => value);
  const longest = Math.max(0.01, ...rows.map(([, v]) => textWidth(v, "BnSB", 1)));
  const contact = Math.min(0.047 * H, (tagX - 0.04 * H - contactX) / longest);
  const rowH = 0.047 * H * 1.75;

  const total = head * 0.74 + head * 0.98 + head * 0.36 + name * 0.74 + (rows.length ? name * 0.75 + rowH * rows.length : name * 0.3);
  const top = (H - total) / 2;
  const b1 = top + head * 0.74;
  const b2 = b1 + head * 0.98;
  const bName = b2 + head * 0.36 + name * 0.74;
  const rows0 = bName + name * 0.75;

  const out: string[] = [];
  out.push(
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}mm" height="${H}mm" viewBox="0 0 ${W} ${H}">`,
    `<defs>`,
    `<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0D2C9E"/><stop offset="0.45" stop-color="${BLUE}"/><stop offset="1" stop-color="#0B278A"/></linearGradient>`,
    `<linearGradient id="ig" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#FEDA75"/><stop offset="0.35" stop-color="#FA7E1E"/><stop offset="0.6" stop-color="#D62976"/><stop offset="1" stop-color="#4F5BD5"/></linearGradient>`,
    `</defs>`,
    `<rect x="0" y="0" width="${W}" height="${H}" fill="url(#bg)"/>`,
  );

  // Halftone patch behind the lower text, fading toward the centre.
  for (let i = 0; i < 9; i++) {
    for (let j = 0; j < 7; j++) {
      const r = 0.0065 * H * (1 - i / 11);
      out.push(
        `<circle cx="${n(left * 0.6 + i * 0.03 * H)}" cy="${n(0.52 * H + j * 0.03 * H)}" r="${n(r)}" fill="#ffffff" fill-opacity="0.08"/>`,
      );
    }
  }

  // "/" stripes: k is horizontal drift per unit of height.
  const k = 0.78;
  const slash = (xb: number, wd: number, y0: number, y1: number, fill: string, extra = "") =>
    poly(
      [
        [xb + (H - y0) * k, y0],
        [xb + wd + (H - y0) * k, y0],
        [xb + wd + (H - y1) * k, y1],
        [xb + (H - y1) * k, y1],
      ],
      fill,
      extra,
    );

  // Left edge.
  out.push(
    poly([[0, 0.56 * H], [0.44 * H, H], [0, H]], YELLOW),
    poly([[0, 0.66 * H], [0.34 * H, H], [0.28 * H, H], [0, 0.72 * H]], "#ffffff", ` fill-opacity="0.9"`),
    slash(-0.33 * H, 0.06 * H, 0.38 * H, 0.62 * H, TEAL),
    slash(-0.5 * H, 0.03 * H, 0.1 * H, 0.36 * H, "#ffffff"),
    slash(-0.58 * H, 0.025 * H, 0.04 * H, 0.2 * H, YELLOW),
  );

  // Right edge.
  out.push(
    poly([[W - 0.7 * H, H], [W, H], [W, 0.1 * H]], YELLOW),
    slash(W - 1.15 * H, 0.2 * H, 0, 0.42 * H, YELLOW),
    slash(W - 0.72 * H, 0.035 * H, 0, H, "#ffffff"),
    slash(W - 0.5 * H, 0.08 * H, 0.2 * H, 0.9 * H, TEAL),
    slash(W - 0.36 * H, 0.06 * H, 0, H, BLUE),
    slash(W - 0.22 * H, 0.03 * H, 0, 0.75 * H, "#ffffff"),
    // Speed streaks under the phone.
    slash(phoneX - 0.42 * H, 0.04 * H, 0.74 * H, H, "#ffffff"),
    slash(phoneX - 0.34 * H, 0.07 * H, 0.82 * H, H, YELLOW),
  );

  // Wide sizes leave a gap between text and phone; carry the stripes through it.
  if (spare > 0.3 * H) {
    const mid = left + textW + gap + spare * 0.2;
    out.push(
      slash(mid - 0.75 * H, 0.012 * H, 0, 0.3 * H, "#ffffff", ` fill-opacity="0.5"`),
      slash(mid - 0.6 * H, 0.05 * H, 0.05 * H, 0.22 * H, YELLOW),
      slash(mid - 0.3 * H, 0.02 * H, 0.62 * H, H, "#ffffff", ` fill-opacity="0.35"`),
    );
  }

  // Headline with a hard drop shadow (svg2pdf has no filters).
  const shadow = 0.012 * H;
  const headText = (y: number, text: string, fill: string) =>
    `<text x="${n(left + shadow * 0.6)}" y="${n(y + shadow)}" font-family="BnXBI" font-size="${n(head)}" fill="${NAVY}" fill-opacity="0.55">${text}</text>` +
    `<text x="${n(left)}" y="${n(y)}" font-family="BnXBI" font-size="${n(head)}" fill="${fill}">${text}</text>`;
  out.push(headText(b1, L1, "#ffffff"), headText(b2, L2, YELLOW));

  // Speed bars + store name.
  const barY = bName - name * 0.42;
  const bar = (x: number, y: number, wd: number, fill: string) =>
    poly(
      [
        [x + 0.012 * H, y],
        [x + wd + 0.012 * H, y],
        [x + wd, y + 0.012 * H],
        [x, y + 0.012 * H],
      ],
      fill,
    );
  out.push(
    bar(left, barY - 0.022 * H, barsW * 0.55, YELLOW),
    bar(left + barsW * 0.6, barY - 0.022 * H, barsW * 0.2, "#F5E28A"),
    bar(left + barsW * 0.83, barY - 0.022 * H, barsW * 0.17, TEAL),
    bar(left, barY + 0.006 * H, barsW * 0.68, "#ffffff"),
    bar(left + barsW * 0.73, barY + 0.006 * H, barsW * 0.27, TEAL),
    `<text x="${n(nameX + shadow * 0.4)}" y="${n(bName + shadow * 0.6)}" font-family="BnBI" font-size="${n(name)}" fill="${NAVY}" fill-opacity="0.5">${esc(info.storeName)}</text>`,
    `<text x="${n(nameX)}" y="${n(bName)}" font-family="BnBI" font-size="${n(name)}" fill="#ffffff">${esc(info.storeName)}</text>`,
  );

  // Contacts.
  const icon = 0.047 * H * 1.35;
  const iconX = left + barsW * 0.35;
  rows.forEach(([glyph, value], i) => {
    const cy = rows0 + rowH * (i + 0.5);
    const s = icon / 24;
    out.push(
      `<circle cx="${n(iconX + icon / 2)}" cy="${n(cy)}" r="${n(icon * 0.5)}" fill="#ffffff"/>`,
      `<g transform="translate(${n(iconX + icon * 0.12)} ${n(cy - icon * 0.38)}) scale(${s * 0.76})">${glyph}</g>`,
      `<rect x="${n(iconX + icon * 1.45)}" y="${n(cy - icon * 0.36)}" width="${n(0.006 * H)}" height="${n(icon * 0.72)}" fill="${YELLOW}"/>`,
      `<text x="${n(contactX)}" y="${n(cy + contact * 0.36)}" font-family="BnSB" font-size="${n(contact)}" fill="#ffffff">${esc(value)}</text>`,
    );
  });

  // Phone in hand; its wrist runs off the bottom edge.
  out.push(
    `<image x="${n(phoneX)}" y="${n(phoneY)}" width="${n(phoneW)}" height="${n(phoneH)}" xlink:href="${handHref}" href="${handHref}" preserveAspectRatio="none"/>`,
  );

  // "PAKAI SELLMORE.ID" tag over the fingers, clear of the headline.
  out.push(
    `<g transform="rotate(-6 ${n(tagX + tagW / 2)} ${n(tagY + tagH / 2)})">`,
    `<rect x="${n(tagX + 0.008 * H)}" y="${n(tagY + 0.01 * H)}" width="${n(tagW)}" height="${n(tagH)}" rx="${n(tagH * 0.22)}" fill="${NAVY}" fill-opacity="0.45"/>`,
    `<rect x="${n(tagX)}" y="${n(tagY)}" width="${n(tagW)}" height="${n(tagH)}" rx="${n(tagH * 0.22)}" fill="${YELLOW}"/>`,
    `<text x="${n(tagX + tag * 0.7)}" y="${n(tagY + tagH / 2 + tag * 0.36)}" font-family="BnBlack" font-size="${n(tag)}" fill="${NAVY}">${tagText}</text>`,
    `</g>`,
  );

  out.push(`</svg>`);
  return out.join("");
}

// simple-icons (CC0), 24×24.
const ICON_WA = `<path fill="#25D366" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>`;
const ICON_IG = `<path fill="url(#ig)" d="M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077"/>`;
const ICON_FB = `<path fill="#1877F2" d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z"/>`;
