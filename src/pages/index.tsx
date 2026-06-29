import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatIDR } from "@/lib/format";
import {
  Users,
  UserCheck,
  CalendarCheck,
  TrendingUp,
  Ticket,
  Clock,
} from "lucide-react";

function Kpi({
  label,
  value,
  icon: Icon,
  hint,
}: {
  label: string;
  value: string;
  icon: typeof Users;
  hint?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold">{value}</div>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

export default function OverviewPage() {
  const kpis = useQuery(api.overview.kpis);

  return (
    <Layout
      title="Ringkasan Sistem"
      subtitle="KPI real-time jaringan agen & langganan Sell More."
    >
      {kpis === undefined ? (
        <p className="text-sm text-muted-foreground">Memuat…</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Kpi
            label="Pelanggan aktif"
            value={kpis.activeSubscribers.toLocaleString("id-ID")}
            icon={UserCheck}
          />
          <Kpi
            label="Aktivasi hari ini"
            value={kpis.activationsToday.toLocaleString("id-ID")}
            icon={CalendarCheck}
            hint={`${kpis.activationsMTD.toLocaleString("id-ID")} bulan ini`}
          />
          <Kpi
            label="MRR (estimasi)"
            value={formatIDR(kpis.mrrIDR)}
            icon={TrendingUp}
          />
          <Kpi
            label="Agen aktif"
            value={kpis.activeAgents.toLocaleString("id-ID")}
            icon={Users}
            hint={`dari ${kpis.totalAgents} total agen`}
          />
          <Kpi
            label="Kode belum dipakai"
            value={kpis.unusedCodes.toLocaleString("id-ID")}
            icon={Ticket}
          />
          <Kpi
            label="Akan kedaluwarsa (7 hari)"
            value={kpis.expiringSoon.toLocaleString("id-ID")}
            icon={Clock}
          />
        </div>
      )}
    </Layout>
  );
}
