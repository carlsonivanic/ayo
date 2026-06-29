import Link from "next/link";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AgentLayout } from "@/components/AgentLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatIDR } from "@/lib/format";
import { PlusCircle, Store } from "lucide-react";

export default function AppHomePage() {
  const me = useQuery(api.agentAuth.me);
  const data = useQuery(api.portal.dashboard.homeSummary, me ? {} : "skip");

  return (
    <AgentLayout>
      {data === undefined ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-muted" />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {data.status === "probation" && (
            <Card className="border-amber-300 bg-amber-50">
              <CardContent className="py-3 text-sm text-amber-800">
                Akun kamu masih <strong>probation</strong>. Komisi ditahan di
                escrow hingga disetujui admin — tapi kamu sudah bisa membuat
                kode.
              </CardContent>
            </Card>
          )}

          {/* Quarter progress */}
          <Card>
            <CardContent className="py-4">
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-xs text-muted-foreground">
                    Aktivasi kuartal ini
                  </div>
                  <div className="text-2xl font-semibold">
                    {data.quarterActivations}
                    <span className="text-base font-normal text-muted-foreground">
                      {" "}
                      / {data.minActivations} min
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-muted-foreground">Hari ini</div>
                  <div className="text-2xl font-semibold">
                    {data.todayActivations}
                  </div>
                </div>
              </div>
              <ProgressBar
                value={data.quarterActivations}
                target={data.minActivations}
              />
            </CardContent>
          </Card>

          {/* Money cards */}
          <div className="grid grid-cols-2 gap-3">
            <Stat
              label="Komisi bulan ini"
              value={formatIDR(data.commissionThisMonth)}
            />
            <Stat
              label="Proyeksi residual/bln"
              value={formatIDR(data.residualProjection)}
            />
            <Stat label="Merchant aktif" value={String(data.activeMerchants)} />
            <Stat label="Saldo escrow" value={formatIDR(data.escrowAmount)} />
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-2 gap-3">
            <Button asChild className="h-auto py-3">
              <Link href="/app/generate">
                <PlusCircle className="h-4 w-4" /> Buat Kode
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-auto py-3">
              <Link href="/app/merchants">
                <Store className="h-4 w-4" /> Merchant
              </Link>
            </Button>
          </div>
        </div>
      )}
    </AgentLayout>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card>
      <CardContent className="py-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="mt-1 text-lg font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}

function ProgressBar({ value, target }: { value: number; target: number }) {
  const pct = target > 0 ? Math.min(100, (value / target) * 100) : 0;
  const tone =
    pct >= 100 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
      <div
        className={`h-full rounded-full ${tone} transition-all`}
        style={{ width: `${pct}%` }}
      />
    </div>
  );
}
