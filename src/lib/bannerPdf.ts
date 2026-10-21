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
export async function downloadBannerPdf(size: BannerSize, info: BannerInfo, filename: string) {
  // Loaded on demand: both libraries are browser-only and heavy.
  const [{ jsPDF }, { svg2pdf }] = await Promise.all([import("jspdf"), import("svg2pdf.js")]);

  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: [size.w, size.h] });
  await Promise.all(
    Object.entries(BANNER_FONTS).map(async ([family, file]) => {
      doc.addFileToVFS(`${file}.ttf`, await base64(`/banner/fonts/${file}.ttf`));
      doc.addFont(`${file}.ttf`, family, "normal");
    }),
  );

  // svg2pdf needs the raster inline, and the element attached to measure it.
  const hand = `data:image/png;base64,${await base64(HAND_SRC)}`;
  const svg = new DOMParser().parseFromString(buildBanner(size, info, hand), "image/svg+xml")
    .documentElement as unknown as SVGSVGElement;
  const host = document.createElement("div");
  host.style.cssText = "position:fixed;left:-99999px;top:0;width:0;height:0;overflow:hidden";
  host.appendChild(svg);
  document.body.appendChild(host);
  try {
    await svg2pdf(svg, doc, { x: 0, y: 0, width: size.w, height: size.h });
  } finally {
    host.remove();
  }
  doc.save(filename);
}
