// Subscription code generation — format SM-XXXX-XXXX-XXXXX.
// Excludes ambiguous characters (0/O, 1/I) to ease manual entry on the POS.
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomBlock(len: number): string {
  let out = "";
  const bytes = new Uint8Array(len);
  crypto.getRandomValues(bytes);
  for (let i = 0; i < len; i++) {
    out += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return out;
}

/** Generate one candidate code in SM-XXXX-XXXX-XXXXX form. */
export function generateCodeString(): string {
  return `SM-${randomBlock(4)}-${randomBlock(4)}-${randomBlock(5)}`;
}
