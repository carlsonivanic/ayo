import { useMutation } from "convex/react";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Guard } from "@/components/Guard";
import { PeriodPicker } from "@/components/PeriodPicker";
import { Button } from "@/components/ui/Button";
import { Card, SectionTitle } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Feedback";
import { api } from "@/convex/_generated/api";
import { currentPeriod, periodLabel, shiftPeriod } from "@/lib/format";
import { errorMessage } from "@/lib/utils";

// §8.1 — the close runs automatically on the 8th. This page is for catching up
// or re-running a period after a correction.

export default function TutupBulanPage() {
  return (
    <Guard role="ADMIN">
      <AppShell title="Tutup bulan">
        <Body />
      </AppShell>
    </Guard>
  );
}

function Body() {
  const [period, setPeriod] = useState(shiftPeriod(currentPeriod(), -1));
  const runMonthEnd = useMutation(api.monthEnd.runMonthEnd);
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  return (
    <div className="space-y-5">
      <SectionTitle helper="Jalan otomatis tanggal 8 untuk bulan sebelumnya. Aman dijalankan ulang — periode yang sudah ditutup dilewati.">
        Jalankan manual
      </SectionTitle>

      <Card className="space-y-4 p-4">
        <div className="flex items-center justify-between gap-3">
          <span className="text-[15px] font-medium">Periode</span>
          <PeriodPicker value={period} onChange={setPeriod} />
        </div>
        <Button
          block
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const result = await runMonthEnd({ period });
              toast(`${result.processed} agen diproses untuk ${periodLabel(period)}`);
            } catch (err) {
              toast(errorMessage(err), "warn");
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Memproses…" : `Tutup ${periodLabel(period)}`}
        </Button>
      </Card>

      <Card className="p-4">
        <p className="eyebrow">Yang dihitung</p>
        <ul className="mt-3 space-y-2 text-[14px] text-ink-soft">
          <li>Gross dari komisi CONFIRMED — pending tidak dihitung.</li>
          <li>Jaminan untuk agen di 3 bulan pertama yang mencapai minimum aktivasi.</li>
          <li>Warmth, held, dan pelepasan held.</li>
          <li>Fee L2 sesuai tahap decay masing-masing L1.</li>
        </ul>
      </Card>
    </div>
  );
}
