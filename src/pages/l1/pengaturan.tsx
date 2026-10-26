import { useQuery } from "convex/react";
import { Lock } from "lucide-react";
import { AppShell } from "@/components/AppShell";
import { Guard } from "@/components/Guard";
import { Card, Row, SectionTitle } from "@/components/ui/Card";
import { Loading, Pill } from "@/components/ui/Feedback";
import { api } from "@/convex/_generated/api";
import { money, percent } from "@/lib/format";

// Read-only view of the variables that decide what this agent earns. The L2
// scheme, QRIS and the purchase switches stay with the admin — an agent cannot
// change their own commission, and nothing here writes.

const DAYS = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
const UNIT: Record<string, string> = { month: "bulan", year: "tahun", once: "sekali" };
const TENURE: { key: "m1_3" | "m4_6" | "m7_9" | "m10_11" | "m12Plus"; label: string }[] = [
  { key: "m1_3", label: "Bulan 1–3" },
  { key: "m4_6", label: "Bulan 4–6" },
  { key: "m7_9", label: "Bulan 7–9" },
  { key: "m10_11", label: "Bulan 10–11" },
  { key: "m12Plus", label: "Bulan 12+" },
];

export default function PengaturanPage() {
  return (
    <Guard role="L1">
      <AppShell title="Pengaturan">
        <Body />
      </AppShell>
    </Guard>
  );
}

function Body() {
  const data = useQuery(api.settings.forL1, {});
  if (!data) return <Loading rows={5} />;

  return (
    <div className="space-y-5">
      <Card className="flex items-start gap-3 px-4 py-3">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-ink-mute" />
        <p className="text-[13px] leading-relaxed text-ink-mute">
          Halaman ini hanya untuk dibaca. Hubungi admin jika ada yang perlu diubah.
          Komisi yang sudah tercatat tidak berubah saat skema diubah.
        </p>
      </Card>

      <div>
        <SectionTitle helper="Persentase komisi berlaku untuk penjualan baru.">
          Paket & komisi
        </SectionTitle>
        <Card>
          {data.plans.map((plan) => {
            const unit = UNIT[plan.priceUnit] ?? plan.priceUnit;
            return (
              <Row
                key={plan.id}
                label={plan.name}
                sub={
                  plan.category === "LIFETIME"
                    ? `${money(plan.price, data.moneyDisplay)} sekali · ${plan.seatCount} kursi`
                    : `${money(plan.price, data.moneyDisplay)} /${unit}`
                }
                value={
                  plan.commissionType === "ONE_TIME"
                    ? percent(plan.oneTimePercent)
                    : `${percent(plan.y1Percent)} tahun 1`
                }
                valueSub={
                  plan.commissionType === "ONE_TIME"
                    ? "sekali bayar"
                    : `${percent(plan.y2Percent)} · ${percent(plan.y3Percent)} · ${percent(
                        plan.y4PlusPercent,
                      )} tahun 4+`
                }
              />
            );
          })}
        </Card>
      </div>

      <div>
        <SectionTitle helper="Target penjualan per bulan mengikuti masa kerja.">
          Target bulanan
        </SectionTitle>
        <Card>
          {TENURE.map((band) => (
            <Row
              key={band.key}
              label={band.label}
              value={`${data.l1Target[band.key]} pelanggan`}
            />
          ))}
        </Card>
      </div>

      <div>
        <SectionTitle>Jaminan income</SectionTitle>
        <Card>
          <Row
            label="Berlaku"
            sub="Dihitung dari penjualan baru tiap bulan."
            value={`${data.guarantee.months} bulan pertama`}
          />
          <Row label="Target" value={`${data.guarantee.target} penjualan`} />
          <Row
            label="Minimum aktivasi"
            value={`${data.guarantee.minActivations} pelanggan`}
          />
          <Row
            label="Top up maksimum"
            value={money(data.guarantee.topUp, data.moneyDisplay)}
          />
        </Card>
      </div>

      <div>
        <SectionTitle helper="Warmth menentukan berapa persen komisi yang dibayar dan berapa yang ditahan.">
          Kekuatan penjualan
        </SectionTitle>
        <Card>
          <Row label="Mulai dihitung" value={`bulan ke-${data.warmth.startAfterMonth}`} />
          <Row
            label="Hangat"
            sub={`≥ ${data.warmth.warmThreshold} penjualan baru`}
            value={`${data.warmth.warmPayout}% dibayar`}
            tone="good"
          />
          <Row
            label="Sejuk"
            sub={`${data.warmth.coolPayout}% dibayar · ${data.warmth.coolHeld}% ditahan`}
            value={`${data.warmth.coolPayout}%`}
            tone="warn"
          />
          <Row
            label="Dingin"
            sub={`${data.warmth.coldPayout}% dibayar · ${data.warmth.coldHeld}% ditahan`}
            value={`${data.warmth.coldPayout}%`}
            tone="warn"
          />
          <Row
            label="Rilis tahanan"
            sub="Capai jumlah penjualan baru ini untuk merilis semua yang ditahan."
            value={`${data.warmth.releaseThreshold} penjualan`}
          />
        </Card>
      </div>

      <div>
        <SectionTitle>Payout</SectionTitle>
        <Card>
          <Row
            label="Frekuensi saya"
            value={data.myFrequency === "WEEKLY" ? "Mingguan" : "Bulanan"}
          />
          <Row
            label="Hari payout"
            value={
              data.myFrequency === "WEEKLY"
                ? `Setiap ${DAYS[data.payout.weeklyPayDay] ?? "Rabu"}`
                : `Tanggal ${data.payout.monthlyPayDay}`
            }
          />
          <Row
            label="Insentif perpanjangan"
            sub="Dari nilai perpanjangan yang dibayar pelanggan."
            value={percent(data.renewalIncentivePercent)}
          />
          <Row
            label="Masa kepemilikan"
            sub="Komisi perpanjangan berhenti setelah masa ini."
            value={`${data.ownershipWindowMonths} bulan`}
          />
        </Card>
      </div>

      <div>
        <SectionTitle>Kode & tautan</SectionTitle>
        <Card>
          <Row label="Kode aktivasi berlaku" value={`${data.codeExpiryDays} hari`} />
          <Row
            label="Tautan pembayaran berlaku"
            value={`${data.paymentLinkExpiryHours} jam`}
          />
          <Row label="Tautan kursi berlaku" value={`${data.seatLinkExpiryDays} hari`} />
          <Row
            label="Tampilan uang"
            value={data.moneyDisplay === "ROUNDED" ? "Dibulatkan" : "Dua desimal"}
          />
        </Card>
      </div>

      <div className="flex items-center justify-center gap-2 pb-2 text-[12px] text-ink-faint">
        <Pill tone="neutral">Baca saja</Pill>
        <span>Diatur oleh admin AYO.</span>
      </div>
    </div>
  );
}
