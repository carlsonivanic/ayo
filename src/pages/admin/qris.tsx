import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Guard } from "@/components/Guard";
import { QrisCode } from "@/components/Qris";
import { Button } from "@/components/ui/Button";
import { Card, SectionTitle } from "@/components/ui/Card";
import { Loading, Pill, useToast } from "@/components/ui/Feedback";
import { Field, Input, Textarea, Toggle } from "@/components/ui/Form";
import { api } from "@/convex/_generated/api";
import { errorMessage } from "@/lib/utils";

// Settlement is manual: one static QRIS is stored here and every payment link
// gets its own amount injected into a copy of it.

export default function QrisPage() {
  return (
    <Guard role="ADMIN">
      <AppShell title="QRIS">
        <Body />
      </AppShell>
    </Guard>
  );
}

function Body() {
  const status = useQuery(api.admin.settings.qrisStatus, {});
  const save = useMutation(api.admin.settings.saveQris);
  const toast = useToast();

  const [payload, setPayload] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [uniqueEnabled, setUniqueEnabled] = useState(true);
  const [uniqueMax, setUniqueMax] = useState(999);
  const [instructions, setInstructions] = useState("");
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (status === undefined || loaded) return;
    if (status) {
      setPayload(status.staticPayload);
      setEnabled(status.enabled);
      setUniqueEnabled(status.uniqueAmountEnabled);
      setUniqueMax(status.uniqueAmountMax);
      setInstructions(status.instructions);
    }
    setLoaded(true);
  }, [status, loaded]);

  if (status === undefined) return <Loading rows={5} />;

  return (
    <div className="space-y-4">
      <Card className="space-y-4 p-4">
        <div className="flex items-center justify-between gap-3">
          <SectionTitle>Payload statis</SectionTitle>
          {status && (
            <Pill tone={status.enabled ? "good" : "neutral"}>
              {status.enabled ? "Aktif" : "Nonaktif"}
            </Pill>
          )}
        </div>

        <Field
          label="Isi QRIS statis"
          hint="Hasil decode QR merchant Anda — diawali 00020101. Disimpan sekali, dipakai untuk semua penjualan."
        >
          <Textarea
            value={payload}
            onChange={(e) => setPayload(e.target.value)}
            placeholder="00020101021126..."
            className="num text-[12px]"
          />
        </Field>

        {status?.merchantName && (
          <p className="text-[13px] text-ink-mute">Merchant: {status.merchantName}</p>
        )}

        <Toggle checked={enabled} onChange={setEnabled} label="Aktifkan pembayaran QRIS" />
        <Toggle
          checked={uniqueEnabled}
          onChange={setUniqueEnabled}
          label="Tambah kode unik pada nominal"
        />

        {uniqueEnabled && (
          <Field
            label="Batas kode unik"
            hint="Nominal ditambah acak 1 sampai angka ini, agar satu transfer cocok ke satu tautan."
          >
            <Input
              inputMode="numeric"
              value={uniqueMax}
              onChange={(e) => setUniqueMax(Number(e.target.value.replace(/\D/g, "")) || 0)}
            />
          </Field>
        )}

        <Field label="Instruksi untuk pembeli" hint="Muncul di halaman bayar. Opsional.">
          <Input
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="Transfer sesuai nominal, lalu tunjukkan bukti ke agen."
          />
        </Field>

        <Button
          block
          disabled={busy || payload.trim().length < 20}
          onClick={async () => {
            setBusy(true);
            try {
              const result = await save({
                staticPayload: payload,
                enabled,
                uniqueAmountEnabled: uniqueEnabled,
                uniqueAmountMax: uniqueMax,
                instructions: instructions.trim() || undefined,
              });
              toast(`Tersimpan — ${result.merchantName}`);
            } catch (err) {
              toast(errorMessage(err), "warn");
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Menyimpan…" : "Simpan"}
        </Button>
      </Card>

      {status?.samplePayload && (
        <Card className="p-4">
          <SectionTitle>Contoh QR — 10.000</SectionTitle>
          <div className="mt-4 flex justify-center">
            <QrisCode payload={status.samplePayload} size={200} />
          </div>
          <p className="mt-3 text-center text-[13px] text-ink-mute">
            Pindai untuk memastikan nominal terbaca 10.000 di aplikasi bank.
          </p>
        </Card>
      )}
    </div>
  );
}
