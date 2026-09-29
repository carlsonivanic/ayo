import { useQuery } from "convex/react";
import { FunctionReturnType } from "convex/server";
import { ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Guard } from "@/components/Guard";
import { AgentName } from "@/components/CommissionOverride";
import { TeamMemberRow } from "@/components/L1Performance";
import { Card, Row, SectionTitle, Stat } from "@/components/ui/Card";
import { Empty, Loading, Pill } from "@/components/ui/Feedback";
import { Input } from "@/components/ui/Form";
import { api } from "@/convex/_generated/api";
import { periodLabel } from "@/lib/format";
import { useMoney } from "@/lib/useMoney";
import { cn } from "@/lib/utils";

export default function AdminTimPage() {
  return (
    <Guard role="ADMIN">
      <Body />
    </Guard>
  );
}

type AdminMember = FunctionReturnType<
  typeof api.performance.topology
>["unassigned"]["members"][number];
type Totals = { activations: number; gross: number; idle: number; atRisk: number };

function Body() {
  const now = useMemo(() => Date.now(), []);
  const data = useQuery(api.performance.topology, { now });
  const fmt = useMoney();
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState<Set<string>>(new Set());

  const term = search.trim().toLowerCase();
  const matches = (name: string) => name.toLowerCase().includes(term);

  function toggle(id: string) {
    const next = new Set(open);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setOpen(next);
  }

  if (!data) {
    return (
      <AppShell title="Tim">
        <Loading rows={6} />
      </AppShell>
    );
  }

  const l1Count = data.teams.reduce((n, t) => n + t.members.length, 0) + data.unassigned.members.length;
  const groups = [
    ...data.teams.map((team) => ({
      id: team.id as string,
      name: team.name,
      href: `/admin/pengguna/${team.id}`,
      suspended: team.status === "SUSPENDED",
      special: team.specialCommission,
      fee: team.lastClosedFee,
      totals: team.totals,
      members: team.members,
    })),
    ...(data.unassigned.members.length > 0
      ? [
          {
            id: "none",
            name: "Tanpa L2",
            href: null,
            suspended: false,
            special: false,
            fee: null,
            totals: data.unassigned.totals,
            members: data.unassigned.members,
          },
        ]
      : []),
  ]
    .map((group) => ({
      ...group,
      shown: term && !matches(group.name) ? group.members.filter((m) => matches(m.name)) : group.members,
    }))
    .filter((group) => !term || matches(group.name) || group.shown.length > 0);

  return (
    <AppShell title="Tim">
      <div className="space-y-5">
        <div>
          <SectionTitle>{periodLabel(data.period)}</SectionTitle>
          <Card>
            <div className="grid grid-cols-2 divide-x divide-line border-b border-line">
              <Stat label="L2 / L1" value={`${data.teams.length} / ${l1Count}`} />
              <Stat label="Pelanggan baru" value={data.totals.activations} sub={`sisa ${data.daysLeft} hari`} />
            </div>
            <div className="grid grid-cols-3 divide-x divide-line">
              <Stat label="Omzet" value={fmt(data.totals.gross)} />
              <Stat
                label="Diam ≥7 hari"
                value={data.totals.idle}
                tone={data.totals.idle > 0 ? "warn" : "default"}
              />
              <Stat
                label="Berisiko"
                value={data.totals.atRisk}
                tone={data.totals.atRisk > 0 ? "warn" : "default"}
              />
            </div>
          </Card>
        </div>

        <Input
          placeholder="Cari L2 atau L1"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {groups.length === 0 ? (
          <Empty title={term ? "Tidak ditemukan." : "Belum ada agen."} />
        ) : (
          groups.map((group) => (
            <TeamCard
              key={group.id}
              name={group.name}
              href={group.href}
              suspended={group.suspended}
              special={group.special}
              fee={group.fee}
              feePeriod={data.lastClosed}
              totals={group.totals}
              size={group.members.length}
              members={group.shown}
              expanded={open.has(group.id) || (!!term && group.shown.length > 0)}
              onToggle={() => toggle(group.id)}
            />
          ))
        )}
      </div>
    </AppShell>
  );
}

function TeamCard({
  name,
  href,
  suspended,
  special,
  fee,
  feePeriod,
  totals,
  size,
  members,
  expanded,
  onToggle,
}: {
  name: string;
  href: string | null;
  suspended: boolean;
  special: boolean;
  fee: number | null;
  feePeriod: string;
  totals: Totals;
  size: number;
  members: AdminMember[];
  expanded: boolean;
  onToggle: () => void;
}) {
  const fmt = useMoney();
  const flags = [
    totals.idle > 0 ? `${totals.idle} diam` : null,
    totals.atRisk > 0 ? `${totals.atRisk} berisiko` : null,
  ].filter(Boolean);

  return (
    <Card>
      <Row
        onClick={onToggle}
        label={
          <span className="flex items-center gap-2">
            <ChevronDown
              className={cn("h-4 w-4 shrink-0 transition-transform", !expanded && "-rotate-90")}
            />
            <AgentName name={name} special={special} />
            {suspended && <Pill tone="warn">SUSPENDED</Pill>}
          </span>
        }
        sub={[`${size} L1`, `${totals.activations} baru`, ...flags].join(" · ")}
        value={fmt(totals.gross)}
        valueSub={fee !== null ? `fee ${periodLabel(feePeriod)} ${fmt(fee)}` : undefined}
      />
      {expanded && (
        <div className="border-t border-line bg-black/[0.015]">
          {members.length === 0 ? (
            <Row label="Belum ada L1" tone="mute" />
          ) : (
            members.map((m) => (
              <TeamMemberRow
                key={m.id}
                member={m}
                special={m.specialCommission}
                href={`/admin/pengguna/${m.id}`}
              />
            ))
          )}
          {href && <Row href={href} label="Profil L2" tone="mute" value="›" />}
        </div>
      )}
    </Card>
  );
}
