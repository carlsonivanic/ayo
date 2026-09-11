// Static → dynamic QRIS conversion (EMVCo TLV + CRC16-CCITT).
//
// Ported from github.com/verssache/qris-dinamis, trimmed to the three things
// this app needs: parse a stored static payload, inject a transaction amount,
// and re-checksum. No dependencies, so it runs inside a Convex mutation.
//
// Tag 01 = point of initiation ("11" static, "12" dynamic), tag 54 = amount,
// tag 63 = CRC. Amount is whole rupiah; QRIS carries no currency exponent here.

export type TLV = { tag: string; length: number; value: string };

/** CRC16-CCITT, polynomial 0x1021, init 0xFFFF — the QRIS tag 63 checksum. */
export function calculateCRC16(input: string): string {
  let crc = 0xffff;
  for (let i = 0; i < input.length; i++) {
    crc ^= input.charCodeAt(i) << 8;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 0x8000 ? ((crc << 1) ^ 0x1021) & 0xffff : (crc << 1) & 0xffff;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, "0");
}

/** Flat top-level TLV parse. Nested sub-tags stay packed inside their value. */
export function parseTLV(data: string): TLV[] {
  const elements: TLV[] = [];
  let pos = 0;
  while (pos + 4 <= data.length) {
    const tag = data.substring(pos, pos + 2);
    const length = parseInt(data.substring(pos + 2, pos + 4), 10);
    if (isNaN(length) || pos + 4 + length > data.length) break;
    elements.push({ tag, length, value: data.substring(pos + 4, pos + 4 + length) });
    pos += 4 + length;
  }
  return elements;
}

function buildTLV(elements: TLV[]): string {
  return elements
    .map((el) => `${el.tag}${el.value.length.toString().padStart(2, "0")}${el.value}`)
    .join("");
}

export type QrisSummary = {
  merchantName: string;
  merchantCity: string;
  method: "static" | "dynamic";
  currency: string;
  amount: string | null;
};

/** Merchant identity, shown to an admin so they can confirm the pasted payload. */
export function summarizeQRIS(payload: string): QrisSummary {
  const elements = parseTLV(payload);
  const tag = (id: string) => elements.find((el) => el.tag === id)?.value;
  return {
    merchantName: tag("59") ?? "",
    merchantCity: tag("60") ?? "",
    method: tag("01") === "12" ? "dynamic" : "static",
    currency: tag("53") ?? "360",
    amount: tag("54") ?? null,
  };
}

export type QrisValidation = { valid: true } | { valid: false; error: string };

/**
 * Structural check plus CRC verification. A payload that fails here would
 * produce a QR no bank app will accept, so it is rejected at paste time
 * rather than at the counter.
 */
export function validateQRIS(payload: string): QrisValidation {
  const trimmed = payload.trim();
  if (trimmed.length < 20) return { valid: false, error: "Payload QRIS terlalu pendek." };
  if (!/^[\x20-\x7e]+$/.test(trimmed)) {
    return { valid: false, error: "Payload QRIS memuat karakter tidak valid." };
  }

  const elements = parseTLV(trimmed);
  if (elements.length === 0) return { valid: false, error: "Struktur TLV tidak terbaca." };

  const crcIndex = trimmed.lastIndexOf("6304");
  if (crcIndex === -1 || crcIndex + 8 !== trimmed.length) {
    return { valid: false, error: "Checksum (tag 63) tidak ditemukan di akhir payload." };
  }
  const expected = calculateCRC16(trimmed.substring(0, crcIndex + 4));
  if (expected !== trimmed.substring(crcIndex + 4).toUpperCase()) {
    return { valid: false, error: `Checksum tidak cocok — seharusnya ${expected}.` };
  }

  const tags = new Set(elements.map((el) => el.tag));
  for (const required of ["00", "53", "58", "59"]) {
    if (!tags.has(required)) {
      return { valid: false, error: `Tag wajib ${required} tidak ada.` };
    }
  }
  return { valid: true };
}

/**
 * Inject `amount` into a static payload and re-checksum.
 *
 * Tag 54 goes before tag 58 (country code), which is where every issuer emits
 * it. Managed tags are dropped first so converting an already-dynamic payload
 * replaces the old amount instead of duplicating it.
 */
export function convertQRIS(payload: string, amount: number): string {
  if (!Number.isInteger(amount) || amount <= 0) {
    throw new Error("Nominal QRIS harus bilangan bulat positif.");
  }

  const managed = new Set(["54", "55", "56", "57", "63"]);
  const result: TLV[] = [];
  let amountInserted = false;

  for (const el of parseTLV(payload.trim())) {
    if (managed.has(el.tag)) continue;
    if (el.tag === "01") {
      result.push({ tag: "01", length: 2, value: "12" });
      continue;
    }
    if (el.tag === "58" && !amountInserted) {
      const value = String(amount);
      result.push({ tag: "54", length: value.length, value });
      amountInserted = true;
    }
    result.push(el);
  }

  if (!amountInserted) {
    // No country-code tag to anchor against — append before the checksum.
    const value = String(amount);
    result.push({ tag: "54", length: value.length, value });
  }

  const body = `${buildTLV(result)}6304`;
  return body + calculateCRC16(body);
}
