import { FunctionReturnType } from "convex/server";
import { AgentName } from "@/components/CommissionOverride";
import { Card, Row, SectionTitle, Stat } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Feedback";
import { Ticks } from "@/components/ui/Ticks";
import { api } from "@/convex/_generated/api";
import { lastSale, periodLabel } from "@/lib/format";
import { useMoney } from "@/lib/useMoney";

export type L1PerformanceData = NonNullable<FunctionReturnType<typeof api.performance.member>>;
export type TeamMember = FunctionReturnType<typeof api.performance.team>["members"][number];

/** One L1's month: target, funnel, customers and trend. Shared by L2 and admin. */
export function L1Performance({ data }: { data: L1PerformanceData }) {
  const fmt = useMoney();
  return (
    <div className="space-y-5">
      <Card className="px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <p className="eyebrow">Bulan ke-{data.tenureMonth} · sisa {data.daysLeft} hari</p>
          <span className="num text-[13px] font-semibold">
            {data.activations}
            <span className="text-ink-faint">/{data.target}</span>
          </span>
        </div>
        <div className="mt-2.5">
          <Ticks
            value={data.activations}
            target={data.target}
            threshold={data.warmThreshold}
            tone={data.activations >= data.target ? "good" : "ink"}
            size="sm"
          />
        </div>
        <p className="mt-2 text-[13px] text-ink-mute">{lastSale(data.daysSinceLastSale)}</p>
      </Card>

      <Card>
        <div className="grid grid-cols-2 divide-x divide-line border-b border-line">
          <Stat label="Omzet bulan ini" value={fmt(data.gross)} />
          <Stat
            label="Held"
            value={fmt(data.heldBalance)}
            tone={data.heldBalance > 0 ? "warn" : "default"}
            sub={data.coldStreak > 0 ? `${data.coldStreak} bln di bawah target` : undefined}
          />
        </div>
      </Card>

      <div>
        <SectionTitle>Link bayar bulan ini</SectionTitle>
        <Card>
          <div className="grid grid-cols-3 divide-x divide-line border-b border-line">
            <Stat label="Dibuat" value={data.funnel.created} />
            <Stat label="Dibuka" value={data.funnel.opened} />
            <Stat label="Dibayar" value={data.funnel.paid} tone="good" />
          </div>
          <Row
            label="Belum dibuka"
            value={data.pendingLinks.unopened}
            tone={data.pendingLinks.unopened > 0 ? "warn" : "mute"}
          />
          <Row
            label="Dibuka, belum bayar"
            value={data.pendingLinks.openedUnpaid}
            tone={data.pendingLinks.openedUnpaid > 0 ? "warn" : "mute"}
          />
        </Card>
      </div>

      <div>
        <SectionTitle>Pelanggan</SectionTitle>
        <Card>
          <div className="grid grid-cols-2 divide-x divide-line border-b border-line">
            <Stat label="Aktif" value={data.customers.active} />
            <Stat
              label="Habis ≤30 hari"
              value={data.customers.expiring30}
              tone={data.customers.expiring30 > 0 ? "warn" : "default"}
            />
          </div>
          <div className="grid grid-cols-2 divide-x divide-line">
            <Stat label="Churn" value={data.customers.churned} />
            <Stat label="Lifetime" value={data.customers.lifetime} />
          </div>
        </Card>
      </div>

      <div>
        <SectionTitle>6 bulan terakhir</SectionTitle>
        <Card>
          {[...data.trend].reverse().map((t) => (
            <Row
              key={t.period}
              label={periodLabel(t.period)}
              sub={`${t.activations} pelanggan baru`}
              value={fmt(t.gross)}
              valueSub={
                t.warmth ? (
                  <Pill
                    tone={t.warmth === "WARM" ? "good" : t.warmth === "COLD" ? "warn" : "accent"}
                  >
                    {t.warmth}
                  </Pill>
                ) : undefined
              }
            />
          ))}
        </Card>
      </div>
    </div>
  );
}

/** One L1 in a team list. */
export function TeamMemberRow({
  member,
  href,
  special,
}: {
  member: TeamMember;
  href: string;
  special?: boolean;
}) {
  const fmt = useMoney();
  return (
    <Row
      href={href}
      label={<AgentName name={member.name} special={special} />}
      sub={`${member.activations}/${member.warmThreshold} baru · ${lastSale(member.daysSinceLastSale)}`}
      value={fmt(member.gross)}
      valueSub={
        member.activations >= member.warmThreshold ? (
          <Pill tone="good">WARM</Pill>
        ) : member.coldStreak >= 1 ? (
          <Pill tone="warn">Berisiko</Pill>
        ) : undefined
      }
    />
  );
}
