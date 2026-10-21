import { BANNER_FONTS, BannerInfo, BannerSize, HAND_SRC, buildBanner } from "./banner";

async function base64(url: string): Promise<string> {
  const bytes = new Uint8Array(await (await fetch(url)).arrayBuffer());
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  }
  return btoa(bin);
}

/** Print-size PDF (1 page, real millimetres). Text and shapes stay vector. */
export async function makeBannerPdf(size: BannerSize, info: BannerInfo, theme: string): Promise<Blob> {
  // Loaded on demand: both libraries are browser-only and heavy.
  const [{ jsPDF }, { svg2pdf }] = await Promise.all([import("jspdf"), import("svg2pdf.js")]);

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: [size.w, size.h] });
  await Promise.all(
    Object.entries(BANNER_FONTS).map(async ([family, file]) => {
      doc.addFileToVFS(`${file}.ttf`, await base64(`/banner/fonts/${file}.ttf`));
      doc.addFont(`${file}.ttf`, family, "normal");
    }),
  );

  // svg2pdf drops the hand raster on mobile browsers, so the SVG is split around
  // it: shapes below via svg2pdf, the PNG via jsPDF's own addImage, then the
  // tag on top via svg2pdf again.
  const hand = await base64(HAND_SRC);
  const parse = () =>
    new DOMParser().parseFromString(buildBanner(size, info, theme), "image/svg+xml")
      .documentElement as unknown as SVGSVGElement;
  const below = parse();
  const above = parse();
  const img = below.querySelector("image")!;
  const at = (k: string) => Number(img.getAttribute(k));
  const box = { x: at("x"), y: at("y"), w: at("width"), h: at("height") };
  const kids = (svg: SVGSVGElement) => Array.from(svg.children);
  const cut = kids(below).indexOf(img);
  kids(below).slice(cut).forEach((el) => el.remove());
  kids(above)
    .slice(0, cut + 1)
    .forEach((el) => el.tagName !== "defs" && el.remove());

  // svg2pdf needs the element attached to measure it.
  const host = document.createElement("div");
  host.style.cssText = "position:fixed;left:-99999px;top:0;width:0;height:0;overflow:hidden";
  host.append(below, above);
  document.body.appendChild(host);
  try {
    await svg2pdf(below, doc, { x: 0, y: 0, width: size.w, height: size.h });
    doc.addImage(hand, "PNG", box.x, box.y, box.w, box.h);
    await svg2pdf(above, doc, { x: 0, y: 0, width: size.w, height: size.h });
  } finally {
    host.remove();
  }
  return doc.output("blob");
}

/** Phones (touch-first) can't download after a long async step; they save on a second tap. */
export const isPhone = () =>
  typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches;

/**
 * Must run straight from a tap: iOS/Android drop the gesture after await,
 * then open the PDF in a tab instead of saving it.
 */
export function saveBannerPdf(blob: Blob, filename: string) {
  const file = new File([blob], filename, { type: "application/pdf" });
  if (isPhone() && navigator.canShare?.({ files: [file] })) {
    // Share sheet has "Save to Files" / "Simpan" — the only real download path on iOS.
    navigator.share({ files: [file] }).catch(() => {});
    return;
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
}
