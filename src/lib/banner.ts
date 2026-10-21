import { ADVANCE } from "./bannerMetrics";

/**
 * Promo banner for stores, drawn as one SVG in millimetres so the same markup
 * previews on screen and converts to a print-size vector PDF. Only the hand
 * mockup is raster. Left half: store info. Right half: SellMore sponsor area.
 */

export const BANNER_SIZES = [
  { id: "4x1", label: "4 × 1 m", w: 4000, h: 1000 },
  { id: "3x1", label: "3 × 1 m", w: 3000, h: 1000 },
  { id: "2x1", label: "2 × 1 m", w: 2000, h: 1000 },
  { id: "1.6x0.8", label: "1,6 × 0,8 m", w: 1600, h: 800 },
  { id: "1x1", label: "1 × 1 m", w: 1000, h: 1000 },
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
const path = (d: string, fill: string, extra = "") => `<path d="${d}" fill="${fill}"${extra}/>`;
const stroke = (d: string, color: string, width: number, extra = "") =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${n(width)}" stroke-linecap="round"${extra}/>`;

export function placeholders(info: BannerInfo): BannerInfo {
  return {
    storeName: (info.storeName.trim() || "Nama Toko").toUpperCase(),
    whatsapp: info.whatsapp.trim(),
    instagram: info.instagram.trim().replace(/^@/, ""),
    facebook: info.facebook.trim(),
  };
}

type Box = { x: number; y: number; w: number; h: number };
type Ctx = { W: number; H: number; phone: Box; split: number; id: (s: string) => string };

type Theme = {
  id: string;
  label: string;
  bg: [string, string, string];
  name: "gold" | "white";
  accent: string;
  draw: (c: Ctx) => string[];
};

/** Sine-ish ribbon across the full width: top edge, then bottom edge back. */
function ribbon(W: number, y: number, amp: number, per: number, thick: number, shift: number) {
  const half = per / 2;
  const xs: number[] = [];
  for (let x = -per + (shift % per); x <= W + per; x += half) xs.push(x);
  const edge = (dy: number, a: number, order: number[]) =>
    order
      .slice(1)
      .map((i, k) => {
        const x0 = xs[order[k]];
        const x1 = xs[i];
        const s = (Math.min(i, order[k]) % 2 ? -1 : 1) * a * (4 / 3);
        return `C ${n(x0 + (x1 - x0) * 0.3)} ${n(y + dy + s)} ${n(x0 + (x1 - x0) * 0.7)} ${n(y + dy + s)} ${n(x1)} ${n(y + dy)}`;
      })
      .join(" ");
  const idx = xs.map((_, i) => i);
  const back = [...idx].reverse();
  return `M ${n(xs[0])} ${n(y)} ${edge(0, amp, idx)} L ${n(xs[xs.length - 1])} ${n(y + thick)} ${edge(thick, amp * 0.7, back)} Z`;
}

/** Pointed leaf, s long, pointing right from the origin. */
const leaf = (s: number) =>
  `M 0 0 C ${n(s * 0.3)} ${n(-s * 0.32)} ${n(s * 0.7)} ${n(-s * 0.32)} ${n(s)} 0 C ${n(s * 0.7)} ${n(s * 0.32)} ${n(s * 0.3)} ${n(s * 0.32)} 0 0 Z`;

/** Four-point sparkle centred at x,y. */
const sparkle = (x: number, y: number, r: number) => {
  const q = r * 0.18;
  return `M ${n(x)} ${n(y - r)} L ${n(x + q)} ${n(y - q)} L ${n(x + r)} ${n(y)} L ${n(x + q)} ${n(y + q)} L ${n(x)} ${n(y + r)} L ${n(x - q)} ${n(y + q)} L ${n(x - r)} ${n(y)} L ${n(x - q)} ${n(y - q)} Z`;
};

// Deterministic scatter so preview and PDF match.
function rand(seed: number) {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return s / 2147483647;
  };
}

const swoosh = (W: number, H: number, x0: number, yEnd: number) =>
  `M ${n(x0)} ${n(H)} C ${n(x0 + (W - x0) * 0.45)} ${n(H * 0.94)} ${n(x0 + (W - x0) * 0.8)} ${n(yEnd + (H - yEnd) * 0.45)} ${n(W)} ${n(yEnd)}`;

export const BANNER_THEMES: Theme[] = [
  {
    id: "klasik",
    label: "Klasik",
    bg: ["#0A2BB0", "#1442D6", "#0B2A9C"],
    name: "gold",
    accent: YELLOW,
    draw: ({ W, H }) => {
      const x0 = W - Math.max(1.9 * H, W * 0.6);
      return [
        path(`M 0 0 L ${n(W * 0.5)} 0 C ${n(W * 0.32)} ${n(H * 0.4)} ${n(W * 0.18)} ${n(H * 0.7)} 0 ${n(H * 0.85)} Z`, "#ffffff", ` fill-opacity="0.04"`),
        path(`${swoosh(W, H, x0 - 0.2 * H, 0.15 * H)} L ${W} ${H} Z`, "#2C5FF0", ` fill-opacity="0.45"`),
        path(`${swoosh(W, H, x0 + 0.3 * H, 0.5 * H)} L ${W} ${H} Z`, "#08228A", ` fill-opacity="0.55"`),
        stroke(swoosh(W, H, x0, 0.32 * H), YELLOW, 0.016 * H),
        stroke(swoosh(W, H, x0 + 0.08 * H, 0.4 * H), "#ffffff", 0.006 * H, ` stroke-opacity="0.5"`),
      ];
    },
  },
  {
    id: "ombak",
    label: "Ombak",
    bg: ["#0C33C8", "#0F3AD6", "#0A2696"],
    name: "gold",
    accent: YELLOW,
    draw: ({ W, H }) => {
      const out = [
        path(ribbon(W, 0.2 * H, 0.12 * H, 1.7 * H, 0.1 * H, 0), "#3BB2F7", ` fill-opacity="0.5"`),
        path(ribbon(W, 0.34 * H, 0.1 * H, 1.7 * H, 0.025 * H, 0.2 * H), "#8FDFFF", ` fill-opacity="0.45"`),
        path(ribbon(W, 0.82 * H, 0.09 * H, 2.1 * H, 0.12 * H, 0.9 * H), "#2C8DF0", ` fill-opacity="0.5"`),
        path(ribbon(W, 0.94 * H, 0.07 * H, 2.1 * H, 0.03 * H, 1.2 * H), "#8FDFFF", ` fill-opacity="0.4"`),
      ];
      // Leaf sprays along the top, repeated across the width.
      for (let x = 0.15 * H; x < W; x += 1.6 * H) {
        [-35, 5, 45].forEach((deg, i) =>
          out.push(
            `<g transform="translate(${n(x)} ${n(0.18 * H)}) rotate(${deg - 20})">${path(leaf(0.3 * H - i * 0.04 * H), "#1D52E6", ` fill-opacity="0.7" stroke="#6FD0FF" stroke-width="${n(0.008 * H)}"`)}</g>`,
          ),
        );
        out.push(path(sparkle(x + 0.75 * H, 0.12 * H, 0.08 * H), "none", ` stroke="#6FD0FF" stroke-width="${n(0.008 * H)}"`));
      }
      return out;
    },
  },
  {
    id: "kilat",
    label: "Kilat",
    bg: ["#0D2C9E", BLUE, "#0B278A"],
    name: "white",
    accent: YELLOW,
    draw: ({ W, H, phone }) => {
      const out: string[] = [];
      // Halftone patch, fading toward the centre.
      for (let i = 0; i < 9; i++) {
        for (let j = 0; j < 7; j++) {
          const r = 0.0065 * H * (1 - i / 11);
          out.push(`<circle cx="${n(0.12 * H + i * 0.03 * H)}" cy="${n(0.6 * H + j * 0.03 * H)}" r="${n(r)}" fill="#ffffff" fill-opacity="0.08"/>`);
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
      out.push(
        poly([[0, 0.7 * H], [0.3 * H, H], [0, H]], YELLOW),
        poly([[0, 0.78 * H], [0.22 * H, H], [0.17 * H, H], [0, 0.83 * H]], "#ffffff", ` fill-opacity="0.9"`),
        slash(-0.5 * H, 0.03 * H, 0.0, 0.2 * H, "#ffffff"),
        slash(-0.58 * H, 0.025 * H, 0.0, 0.12 * H, YELLOW),
        poly([[W - 0.6 * H, H], [W, H], [W, 0.5 * H]], YELLOW),
        slash(W - 0.72 * H, 0.035 * H, 0.45 * H, H, "#ffffff"),
        slash(W - 0.5 * H, 0.08 * H, 0.45 * H, 0.9 * H, TEAL),
        slash(W - 0.36 * H, 0.06 * H, 0, H, BLUE),
        slash(W - 0.22 * H, 0.03 * H, 0, 0.75 * H, "#ffffff"),
        slash(phone.x - 0.42 * H, 0.04 * H, 0.74 * H, H, "#ffffff"),
        slash(phone.x - 0.34 * H, 0.07 * H, 0.82 * H, H, YELLOW),
      );
      return out;
    },
  },
  {
    id: "malam",
    label: "Malam",
    bg: ["#071237", "#0E1E5C", "#050C2A"],
    name: "gold",
    accent: "#FFC93C",
    draw: ({ W, H, phone }) => {
      const out: string[] = [];
      // Light rays fanning from behind the phone.
      const cx = phone.x + phone.w * 0.55;
      const cy = H * 0.45;
      const R = Math.max(W, H) * 1.2;
      for (let i = 0; i < 18; i++) {
        const a0 = (i / 18) * Math.PI * 2;
        const a1 = a0 + Math.PI / 36;
        out.push(
          poly(
            [
              [cx, cy],
              [cx + Math.cos(a0) * R, cy + Math.sin(a0) * R],
              [cx + Math.cos(a1) * R, cy + Math.sin(a1) * R],
            ],
            "#FFD200",
            ` fill-opacity="0.05"`,
          ),
        );
      }
      const r = rand(7);
      for (let i = 0; i < Math.round((W / H) * 7); i++) {
        out.push(path(sparkle(r() * W, r() * H, (0.012 + r() * 0.03) * H), "#FFD66B", ` fill-opacity="${n(0.4 + r() * 0.5)}"`));
      }
      out.push(
        stroke(swoosh(W, H, W * 0.25, 0.55 * H), "#E2A815", 0.01 * H),
        stroke(swoosh(W, H, W * 0.32, 0.68 * H), "#E2A815", 0.005 * H, ` stroke-opacity="0.5"`),
      );
      return out;
    },
  },
  {
    id: "merah",
    label: "Merah",
    bg: ["#D3132F", "#B30E27", "#760716"],
    name: "gold",
    accent: YELLOW,
    draw: ({ W, H }) => {
      const out: string[] = [];
      for (let i = 0; i < 10; i++) {
        for (let j = 0; j < 6; j++) {
          out.push(`<circle cx="${n(0.05 * H + i * 0.035 * H)}" cy="${n(0.05 * H + j * 0.035 * H)}" r="${n(0.007 * H * (1 - (i + j) / 16))}" fill="#ffffff" fill-opacity="0.12"/>`);
        }
      }
      const x0 = W - Math.max(1.9 * H, W * 0.6);
      out.push(
        path(`${swoosh(W, H, x0 - 0.2 * H, 0.1 * H)} L ${W} ${H} Z`, "#8A0A1D", ` fill-opacity="0.6"`),
        stroke(swoosh(W, H, x0, 0.28 * H), YELLOW, 0.02 * H),
        stroke(swoosh(W, H, x0 + 0.1 * H, 0.38 * H), "#ffffff", 0.007 * H, ` stroke-opacity="0.6"`),
        path(`M 0 ${n(H)} L 0 ${n(0.82 * H)} C ${n(0.3 * W)} ${n(0.9 * H)} ${n(0.5 * W)} ${n(0.97 * H)} ${n(0.6 * W)} ${n(H)} Z`, "#ffffff", ` fill-opacity="0.06"`),
      );
      return out;
    },
  },
];

export type BannerThemeId = string;

/** Split the name into 2 lines at the space nearest its middle. */
function twoLines(name: string): [string, string] | null {
  const mid = name.length / 2;
  let best = -1;
  for (let i = 0; i < name.length; i++) {
    if (name[i] === " " && (best < 0 || Math.abs(i - mid) < Math.abs(best - mid))) best = i;
  }
  return best < 0 ? null : [name.slice(0, best), name.slice(best + 1)];
}

export function buildBanner(
  size: { w: number; h: number },
  raw: BannerInfo,
  themeId: BannerThemeId = BANNER_THEMES[0].id,
  { prefix = "", handHref = HAND_SRC } = {},
) {
  const { w: W, h: H } = size;
  const info = placeholders(raw);
  const theme = BANNER_THEMES.find((t) => t.id === themeId) ?? BANNER_THEMES[0];
  const id = (s: string) => prefix + s;
  const r = W / H;
  const wide = r >= 2.5;
  const square = r < 1.5;

  // Sponsor copy (right side).
  const PILL = "PAKAI SELLMORE";
  const T1 = "Lebih cepat,";
  const T2 = "lebih tepat.";
  const tag = (wide ? 0.115 : square ? 0.075 : 0.088) * H;
  const tagW = Math.max(textWidth(T1, "BnBI", tag), textWidth(T2, "BnXBI", tag));
  const pill = tag * 0.42;
  const pillW = textWidth(PILL, "BnBlack", pill) + pill * 1.6;
  const pillH = pill * 1.8;

  // Phone: beside the tagline on wide banners, under it otherwise.
  let phone: Box;
  let tagRight: number;
  let pillY: number;
  if (wide) {
    const h = 1.0 * H;
    const w = h * HAND_RATIO;
    phone = { x: W - w - 0.12 * H, y: 0.05 * H, w, h };
    tagRight = phone.x + 0.02 * H;
    pillY = 0.14 * H;
  } else {
    pillY = 0.06 * H;
    const y = pillY + pillH + tag * 2.3;
    const h = H - y + 0.08 * H;
    const w = h * HAND_RATIO;
    tagRight = W - (square ? 0.05 : 0.07) * H;
    phone = { x: tagRight - Math.max(w, tagW) / 2 - w / 2, y, w, h };
  }
  const t1 = pillY + pillH + tag * 0.95;
  const t2 = t1 + tag * 1.05;
  const tagLeft = tagRight - tagW;
  const split = Math.min(tagLeft, wide ? Infinity : phone.x) - 0.08 * H;

  // Store info (left side).
  const left = (wide ? 0.17 : square ? 0.07 : 0.1) * H;
  const maxW = split - left;
  const nameMax = (wide ? 0.21 : square ? 0.12 : 0.17) * H;
  const one = Math.min(nameMax, maxW / (textWidth(info.storeName, "BnBI", 1) + 0.04));
  const pair = twoLines(info.storeName);
  const two = pair
    ? Math.min(nameMax * 0.9, maxW / (Math.max(...pair.map((l) => textWidth(l, "BnBI", 1))) + 0.04))
    : 0;
  const lines = two > one * 1.25 ? pair! : [info.storeName];
  const name = lines.length > 1 ? two : one;
  const lineH = name * 0.98;

  const rows = (
    [
      [ICON_WA, info.whatsapp],
      [ICON_IG, info.instagram],
      [ICON_FB, info.facebook],
    ] as [string, string][]
  ).filter(([, value]) => value);
  // Contacts sit in one row like the name, or stack when the column is narrow.
  const baseIcon = (square ? 0.07 : 0.08) * H;
  const baseText = baseIcon * 0.58;
  const rowGap = baseIcon * 0.55;
  const itemW = (v: string, ic: number, tx: number) => ic * 1.3 + textWidth(v, "BnSB", tx);
  const rowTotal = rows.reduce((s, [, v]) => s + itemW(v, baseIcon, baseText), 0) + rowGap * Math.max(0, rows.length - 1);
  const stack = square || (rows.length > 1 && maxW / rowTotal < 0.75);
  const scale = stack
    ? Math.min(1, maxW / Math.max(0.01, ...rows.map(([, v]) => itemW(v, baseIcon, baseText))))
    : Math.min(1, maxW / Math.max(0.01, rowTotal));
  const icon = baseIcon * scale;
  const ctext = baseText * scale;
  const contactsH = !rows.length ? 0 : stack ? icon * 1.35 * rows.length : icon;

  const blockH = name * 0.74 + lineH * (lines.length - 1) + (rows.length ? name * 0.35 + contactsH : 0);
  const top = (wide ? 0.58 : square ? 0.55 : 0.52) * H - blockH / 2;
  const base0 = top + name * 0.74;
  const lastBase = base0 + lineH * (lines.length - 1);
  const rows0 = lastBase + name * 0.35;

  const ctx: Ctx = { W, H, phone, split, id };
  const [c0, c1, c2] = theme.bg;
  const out: string[] = [
    `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}mm" height="${H}mm" viewBox="0 0 ${W} ${H}">`,
    `<defs>`,
    `<linearGradient id="${id("bg")}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${c0}"/><stop offset="0.45" stop-color="${c1}"/><stop offset="1" stop-color="${c2}"/></linearGradient>`,
    `<linearGradient id="${id("ig")}" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#FEDA75"/><stop offset="0.35" stop-color="#FA7E1E"/><stop offset="0.6" stop-color="#D62976"/><stop offset="1" stop-color="#4F5BD5"/></linearGradient>`,
    ...lines.flatMap((_, i) => {
      const b = base0 + lineH * i;
      return [
        `<clipPath id="${id(`hi${i}`)}"><rect x="0" y="${n(b - name * 0.8)}" width="${W}" height="${n(name * 0.4)}"/></clipPath>`,
        `<clipPath id="${id(`lo${i}`)}"><rect x="0" y="${n(b - name * 0.2)}" width="${W}" height="${n(name * 0.3)}"/></clipPath>`,
      ];
    }),
    `</defs>`,
    `<rect x="0" y="0" width="${W}" height="${H}" fill="url(#${id("bg")})"/>`,
    ...theme.draw(ctx),
  ];

  // Store name. Gold: stacked extrusion + banded face (svg2pdf has no filters).
  lines.forEach((line, i) => {
    const b = base0 + lineH * i;
    const t = (dx: number, dy: number, fill: string, extra = "") =>
      `<text x="${n(left + dx)}" y="${n(b + dy)}" font-family="BnBI" font-size="${n(name)}" fill="${fill}"${extra}>${esc(line)}</text>`;
    if (theme.name === "gold") {
      out.push(t(name * 0.05, name * 0.08, "#000000", ` fill-opacity="0.35"`));
      for (let k = 6; k >= 1; k--) out.push(t(k * name * 0.006, k * name * 0.009, k > 3 ? "#5C3500" : "#8A5600"));
      out.push(
        t(0, 0, "#EDAA14"),
        `<g clip-path="url(#${id(`hi${i}`)})">${t(0, 0, "#FFE680")}</g>`,
        `<g clip-path="url(#${id(`lo${i}`)})">${t(0, 0, "#C98306")}</g>`,
      );
    } else {
      out.push(t(name * 0.04, name * 0.06, NAVY, ` fill-opacity="0.55"`), t(0, 0, "#ffffff"));
    }
  });

  // Contacts.
  let cx = left;
  rows.forEach(([glyph, value], i) => {
    const cy = stack ? rows0 + icon * 1.35 * (i + 0.5) : rows0 + icon / 2;
    const x = stack ? left : cx;
    const s = icon / 24;
    out.push(
      `<circle cx="${n(x + icon / 2)}" cy="${n(cy)}" r="${n(icon * 0.5)}" fill="#ffffff"/>`,
      `<g transform="translate(${n(x + icon * 0.12)} ${n(cy - icon * 0.38)}) scale(${s * 0.76})">${glyph.replace("url(#ig)", `url(#${id("ig")})`)}</g>`,
      `<text x="${n(x + icon * 1.3)}" y="${n(cy + ctext * 0.36)}" font-family="BnSB" font-size="${n(ctext)}" fill="#ffffff">${esc(value)}</text>`,
    );
    cx += itemW(value, icon, ctext) + rowGap * scale;
  });

  // Phone in hand; its wrist runs off the bottom edge.
  out.push(
    `<image x="${n(phone.x)}" y="${n(phone.y)}" width="${n(phone.w)}" height="${n(phone.h)}" xlink:href="${handHref}" href="${handHref}" preserveAspectRatio="none"/>`,
  );

  // Sponsor copy, right-aligned to the phone, drawn over the hand's edge.
  const sh = tag * 0.05;
  const tagText = (y: number, text: string, family: Family, fill: string) => {
    const x = tagRight - textWidth(text, family, tag);
    return (
      `<text x="${n(x + sh)}" y="${n(y + sh * 1.4)}" font-family="${family}" font-size="${n(tag)}" fill="#000000" fill-opacity="0.3">${text}</text>` +
      `<text x="${n(x)}" y="${n(y)}" font-family="${family}" font-size="${n(tag)}" fill="${fill}">${text}</text>`
    );
  };
  const pillX = tagRight - pillW;
  out.push(
    `<g transform="rotate(-4 ${n(pillX + pillW / 2)} ${n(pillY + pillH / 2)})">`,
    `<rect x="${n(pillX + pill * 0.15)}" y="${n(pillY + pill * 0.2)}" width="${n(pillW)}" height="${n(pillH)}" rx="${n(pillH * 0.25)}" fill="#000000" fill-opacity="0.3"/>`,
    `<rect x="${n(pillX)}" y="${n(pillY)}" width="${n(pillW)}" height="${n(pillH)}" rx="${n(pillH * 0.25)}" fill="${theme.accent}"/>`,
    `<text x="${n(pillX + pill * 0.8)}" y="${n(pillY + pillH / 2 + pill * 0.36)}" font-family="BnBlack" font-size="${n(pill)}" fill="${NAVY}">${PILL}</text>`,
    `</g>`,
    tagText(t1, T1, "BnBI", "#ffffff"),
    tagText(t2, T2, "BnXBI", theme.accent),
  );

  out.push(`</svg>`);
  return out.join("");
}

// simple-icons (CC0), 24×24.
const ICON_WA = `<path fill="#25D366" d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>`;
const ICON_IG = `<path fill="url(#ig)" d="M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077"/>`;
const ICON_FB = `<path fill="#1877F2" d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036 26.805 26.805 0 0 0-.733-.009c-.707 0-1.259.096-1.675.309a1.686 1.686 0 0 0-.679.622c-.258.42-.374.995-.374 1.752v1.297h3.919l-.386 2.103-.287 1.564h-3.246v8.245C19.396 23.238 24 18.179 24 12.044c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.628 3.874 10.35 9.101 11.647Z"/>`;
