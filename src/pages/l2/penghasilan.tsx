import { useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Guard } from "@/components/Guard";
import { Card, Row, SectionTitle } from "@/components/ui/Card";
import { Empty, Loading, Pill } from "@/components/ui/Feedback";
import { api } from "@/convex/_generated/api";
import { currentPeriod, date, percent, periodLabel, shiftPeriod } from "@/lib/format";
import { useMoney } from "@/lib/useMoney";

export default function L2PenghasilanPage() {
  return (
    <Guard role="L2">
      <AppShell title="Penghasilan">
        <Body />
      </AppShell>
    </Guard>
  );
}

function Body() {
  const now = useMemo(() => Date.now(), []);
  const [period, setPeriod] = useState(shiftPeriod(currentPeriod(now), -1));
  const lines = useQuery(api.team.feeLines, { period });
  const payouts = useQuery(api.payouts.mine);
  const fmt = useMoney();

  const periods = [1, 2, 3, 4, 5, 6].map((i) => shiftPeriod(currentPeriod(now), -i));
  const total = lines?.reduce((sum, l) => sum + l.l2Fee, 0) ?? 0;

  return (
    <div className="space-y-5">
      <SectionTitle
        action={
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            className="rounded border border-line bg-surface px-2 py-1 text-[13px]"
          >
            {periods.map((p) => (
              <option key={p} value={p}>
                {periodLabel(p)}
              </option>
            ))}
          </select>
        }
      >
        Fee override
      </SectionTitle>

      {!lines ? (
        <Loading rows={4} />
      ) : lines.length === 0 ? (
        <Empty title="Belum ada fee di periode ini." />
      ) : (
        <Card>
          {lines.map((line) => (
            <Row
              key={line.id}
              label={line.l1Name}
              sub={`Bulan ke-${line.tenureMonth} · ${percent(line.effectiveFeePercent)} dari ${fmt(line.l1Gross)}`}
              value={fmt(line.l2Fee)}
              tone="good"
            />
          ))}
          <Row label="Total" value={fmt(total)} />
        </Card>
      )}

      <div>
        <SectionTitle>Payout</SectionTitle>
        {!payouts ? (
          <Loading rows={2} />
        ) : payouts.lines.length === 0 ? (
          <Empty title="Belum ada payout." />
        ) : (
          <Card>
            {payouts.lines.map((line) => (
              <Row
                key={line.id}
                label={periodLabel(line.period)}
                sub={date(line.payoutDate)}
                value={fmt(line.payable)}
                valueSub={
                  <Pill
                    tone={
                      line.status === "PAID" ? "good" : line.status === "FAILED" ? "warn" : "accent"
                    }
                  >
                    {line.status === "PAID"
                      ? "Dibayar"
                      : line.status === "FAILED"
                        ? "Gagal"
                        : "Dijadwalkan"}
                  </Pill>
                }
              />
            ))}
          </Card>
        )}
        {payouts && !payouts.profileCompleted && (
          <Card className="mt-3 border-accent bg-accent-soft p-4">
            <p className="text-[14px] font-medium text-accent-ink">
              Lengkapi rekening di Profil agar payout bisa dibayar.
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
