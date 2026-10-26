import { MessageCircle } from "lucide-react";
import { Button } from "./ui/Button";
import { Sheet, useToast } from "./ui/Feedback";
import { date } from "@/lib/format";
import { copy, whatsappUrl } from "@/lib/utils";
import type { CustomerRow } from "./CustomerTable";

// A "calon" is a payment link the agent has already named but nobody has paid
// yet. Nothing is stored in the customer table for them, so the sheet is the
// only place to re-send the link or read the phone number back.
export function CalonSheet({
  row,
  onClose,
}: {
  row: CustomerRow | null;
  onClose: () => void;
}) {
  const toast = useToast();
  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const payUrl = row?.token ? `${origin}/bayar/${row.token}` : "";

  const message = row
    ? `Pembayaran SellMore ${row.planName}:\n${payUrl}\n\n` +
      `Scan QRIS dan unggah bukti transfer di tautan ini, kode aktivasi langsung muncul.` +
      (row.expiresAt ? `\nBerlaku sampai ${date(row.expiresAt)}.` : "")
    : "";

  return (
    <Sheet
      open={row !== null}
      onClose={onClose}
      title="Calon pelanggan"
      footer={
        row && (
          <a href={whatsappUrl(message, row.phone)} target="_blank" rel="noreferrer">
            <Button block>
              <MessageCircle className="h-[18px] w-[18px]" />
              Kirim ulang lewat WhatsApp
            </Button>
          </a>
        )
      }
    >
      {row && (
        <div className="space-y-4">
          <div>
            <div className="eyebrow">Nama</div>
            <p className="mt-1 text-[17px] font-semibold">{row.name}</p>
          </div>
          <dl className="divide-y divide-line rounded border border-line">
            <div className="flex items-center justify-between gap-3 px-3 py-2.5">
              <dt className="text-[13px] text-ink-mute">WhatsApp</dt>
              <dd className="num text-[13px] font-medium">{row.phone ?? "—"}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 px-3 py-2.5">
              <dt className="text-[13px] text-ink-mute">Paket</dt>
              <dd className="text-[13px] font-medium">{row.planName}</dd>
            </div>
            <div className="flex items-center justify-between gap-3 px-3 py-2.5">
              <dt className="text-[13px] text-ink-mute">Berlaku sampai</dt>
              <dd className="num text-[13px] font-medium">{date(row.expiresAt)}</dd>
            </div>
          </dl>
          <div>
            <div className="eyebrow mb-1.5">Tautan pembayaran</div>
            <button
              type="button"
              onClick={async () => {
                if (await copy(payUrl)) toast("Tautan disalin");
              }}
              className="flex w-full items-center gap-3 rounded border border-line px-3 py-2.5 text-left"
            >
              <span className="num min-w-0 flex-1 truncate text-[13px]">{payUrl}</span>
              <span className="shrink-0 text-[12px] font-semibold text-ink-soft">Salin</span>
            </button>
          </div>
          <p className="text-[13px] text-ink-mute">
            Tautan ini belum dibayar. Pelanggan masuk daftar setelah pembayaran
            terverifikasi.
          </p>
        </div>
      )}
    </Sheet>
  );
}
