import { useQuery } from "convex/react";
import { useRouter } from "next/router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Guard } from "@/components/Guard";
import { Card, Row, SectionTitle, Stat } from "@/components/ui/Card";
import { Empty, Loading, Pill } from "@/components/ui/Feedback";
import { Tabs } from "@/components/ui/Tabs";
import { api } from "@/convex/_generated/api";
import { currentPeriod, date, periodLabel, shiftPeriod } from "@/lib/format";
import { useMoney } from "@/lib/useMoney";

type Tab = "penghasilan" | "payout" | "proyeksi";

export default function PenghasilanPage() {
  const router = useRouter();
  const initial = (router.query.tab as Tab) ?? "penghasilan";
  return (
    <Guard role="L1">
      <AppShell title="Penghasilan">
        <Body initial={initial} />
      </AppShell>
    </Guard>
  );
}

function Body({ initial }: { initial: Tab }) {
  const [tab, setTab] = useState<Tab>(initial);
  return (
    <>
      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        options={[
          { value: "penghasilan", label: "Penghasilan" },
          { value: "payout", label: "Payout" },
          { value: "proyeksi", label: "Proyeksi" },
        ]}
      />
      {tab === "penghasilan" && <Earnings />}
      {tab === "payout" && <Payouts />}
      {tab === "proyeksi" && <Projection />}
    </>
  );
}

const TYPE_LABEL: Record<string, string> = {
  NEW_SALES: "Penjualan baru",
  RECURRING: "Perpanjangan",
  RENEWAL_INCENTIVE: "Insentif 2%",
  JAMINAN: "Jaminan",
  ADJUSTMENT: "Penyesuaian",
};

function Earnings() {
  const now = useMemo(() => Date.now(), []);
  const [period, setPeriod] = useState(currentPeriod(now));
  const summary = useQuery(api.earnings.summary, { now });
  const lines = useQuery(api.earnings.recent, { period });
  const fmt = useMoney();

  if (!summary) return <Loading rows={4} />;

  const periods = [0, 1, 2, 3, 4, 5].map((i) => shiftPeriod(currentPeriod(now), -i));

  return (
    <div className="space-y-5">
      <Card>
        <div className="grid grid-cols-2 divide-x divide-line border-b border-line">
          <Stat
            label="Bulan ini"
            value={fmt(summary.thisMonth.gross)}
            sub={summary.thisMonth.jaminan > 0 ? `+ jaminan ${fmt(summary.thisMonth.jaminan)}` : undefined}
          />
          <Stat label="Bulan lalu" value={fmt(summary.lastMonth.gross)} />
        </div>
        <div className="grid grid-cols-2 divide-x divide-line">
          <Stat label="Tahun berjalan" value={fmt(summary.ytd.gross)} />
          <Stat label="Sejak awal" value={fmt(summary.allTime.total)} />
        </div>
      </Card>

      {summary.pending > 0 && (
        <Card className="flex items-center justify-between gap-3 border-accent bg-accent-soft px-4 py-3">
          <div>
            <p className="text-[14px] font-semibold text-accent-ink">Menunggu aktivasi</p>
            <p className="mt-0.5 text-[13px] text-accent-ink/70">
              Masuk payout setelah kode dipakai.
            </p>
          </div>
          <span className="num text-[17px] font-semibold text-accent-ink">
            {fmt(summary.pending)}
          </span>
        </Card>
      )}

      <div>
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
          Rincian
        </SectionTitle>
        {!lines ? (
          <Loading />
        ) : lines.length === 0 ? (
          <Empty title="Belum ada penghasilan di periode ini." />
        ) : (
          <Card>
            {lines.map((line) => (
              <Row
                key={line.id}
                label={TYPE_LABEL[line.type] ?? line.type}
                sub={[date(line.date), line.storeName, line.planName]
                  .filter(Boolean)
                  .join(" · ")}
                value={fmt(line.amount)}
                tone={line.status === "PENDING" ? "mute" : "good"}
                valueSub={
                  line.status === "PENDING" ? (
                    <Pill tone="accent">Pending</Pill>
                  ) : line.frozen ? (
                    <Pill tone="warn">Beku</Pill>
                  ) : undefined
                }
              />
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}

function Payouts() {
  const data = useQuery(api.payouts.mine);
  const fmt = useMoney();
  if (!data) return <Loading rows={4} />;

  return (
    <div className="space-y-5">
      <Card>
        <Row
          label="Held balance"
          sub="Tidak hangus. Capai 5+ pelanggan baru untuk merilis semua."
          value={fmt(data.heldBalance)}
          tone={data.heldBalance > 0 ? "warn" : "mute"}
        />
        {!data.profileCompleted && (
          <Row
            href="/profil"
            label="Rekening belum lengkap"
            sub="Payout tertahan sampai data rekening diisi."
            value="Isi"
            tone="warn"
          />
        )}
      </Card>

      {data.lines.length === 0 ? (
        <Empty title="Belum ada payout." />
      ) : (
        <div className="space-y-3">
          {data.lines.map((line) => (
            <Card key={line.id} className="overflow-hidden">
              <div className="flex items-center justify-between gap-3 px-4 py-3">
                <div>
                  <div className="text-[15px] font-semibold">{periodLabel(line.period)}</div>
                  <div className="mt-0.5 text-[13px] text-ink-mute">
                    {date(line.payoutDate)} · {line.frequency === "WEEKLY" ? "mingguan" : "bulanan"}
                  </div>
                </div>
                <div className="text-right">
                  <div className="num text-[18px] font-semibold">{fmt(line.payable)}</div>
                  <div className="mt-1">
                    <Pill
                      tone={
                        line.status === "PAID"
                          ? "good"
                          : line.status === "FAILED"
                            ? "warn"
                            : "accent"
                      }
                    >
                      {line.status === "PAID"
                        ? "Dibayar"
                        : line.status === "FAILED"
                          ? "Gagal"
                          : "Dijadwalkan"}
                    </Pill>
                  </div>
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-x-4 gap-y-1 border-t border-line bg-black/[0.015] px-4 py-3 text-[13px]">
                <Breakdown label="Gross" value={fmt(line.gross)} />
                <Breakdown label="Jaminan" value={fmt(line.jaminan)} />
                <Breakdown label="Held" value={`-${fmt(line.held)}`} />
                <Breakdown label="Held dirilis" value={fmt(line.releasedHeld)} />
                {line.adjustment !== 0 && (
                  <Breakdown label="Penyesuaian" value={fmt(line.adjustment)} />
                )}
              </dl>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Breakdown({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-ink-mute">{label}</dt>
      <dd className="num">{value}</dd>
    </div>
  );
}

function Projection() {
  const now = useMemo(() => Date.now(), []);
  const data = useQuery(api.earnings.projection, { now });
  const fmt = useMoney();
  if (!data) return <Loading rows={3} />;

  const max = Math.max(...data.next12, 1);

  return (
    <div className="space-y-5">
      <Card>
        <Stat
          label="Proyeksi perpanjangan"
          value={fmt(data.total)}
          sub={`${data.merchants} pelanggan aktif · tanpa penjualan baru`}
        />
      </Card>

      <div>
        <SectionTitle helper="Hanya perpanjangan pelanggan aktif, sampai masa 36 bulan berakhir.">
          12 bulan ke depan
        </SectionTitle>
        <Card className="p-4">
          <div className="flex h-24 items-end gap-1.5">
            {data.next12.map((value, index) => (
              <div key={index} className="flex flex-1 flex-col items-center gap-1.5">
                <div
                  className="w-full rounded-[2px] bg-ink"
                  style={{ height: `${Math.max((value / max) * 100, value > 0 ? 6 : 2)}%` }}
                />
                <span className="text-[10px] text-ink-faint">{index + 1}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card>
        {(["Y1", "Y2", "Y3"] as const).map((year) => (
          <Row key={year} label={year} value={fmt(data.byYear[year] ?? 0)} />
        ))}
      </Card>
    </div>
  );
}
