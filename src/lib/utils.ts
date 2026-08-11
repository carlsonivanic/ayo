import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Share on WhatsApp — the only channel agents use with merchants (§4.1). */
export function whatsappUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export async function copy(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

export function downloadCsv(
  filename: string,
  columns: { key: string; label: string }[],
  rows: Record<string, unknown>[],
): void {
  const escape = (value: unknown) => {
    if (value === null || value === undefined) return "";
    const s = String(value);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [
    columns.map((c) => escape(c.label)).join(","),
    ...rows.map((row) => columns.map((c) => escape(row[c.key])).join(",")),
  ].join("\n");

  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function errorMessage(error: unknown): string {
  if (error && typeof error === "object" && "data" in error) {
    const data = (error as { data?: unknown }).data;
    if (data && typeof data === "object" && "message" in data) {
      return String((data as { message: unknown }).message);
    }
  }
  if (error instanceof Error) {
    const match = error.message.match(/"message"\s*:\s*"([^"]+)"/);
    if (match) return match[1];
    return error.message.split("\n")[0];
  }
  return "Terjadi kesalahan.";
}
