import { useState } from "react";
import Link from "next/link";
import { ArrowRight, User, Users, Network, Building2, Settings } from "lucide-react";
import { LevelInfographic, type Level } from "@/components/sim/LevelInfographic";

/**
 * Public simulator landing page. NO auth gating (see RouteGuard PUBLIC_PATHS),
 * no Layout/AgentLayout chrome — a standalone recruitment tool. A recruiter
 * opens this on a phone with a prospect.
 *
 * Flow: chooser (4 level cards) → tap → that level's one-screen infographic →
 * "Kembali" returns to the chooser. No in-simulator level switching.
 */
const CARDS: {
  level: Level;
  label: string;
  sub: string;
  hook: string;
  gradient: string;
  icon: typeof User;
}[] = [
  {
    level: "l1",
    label: "L1 · Agen",
    sub: "Jualan langsung",
    hook: "Komisi residual mengalir tiap bulan dari setiap pelanggan.",
    gradient: "from-emerald-500 to-teal-600",
    icon: User,
  },
  {
    level: "l2",
    label: "L2 · Koordinator",
    sub: "Bangun tim",
    hook: "Override dari setiap penjualan agen di downline kamu.",
    gradient: "from-amber-500 to-orange-600",
    icon: Users,
  },
  {
    level: "l3",
    label: "L3 · Regional",
    sub: "Pimpin wilayah",
    hook: "Penghasilan dari seluruh koordinator di wilayahmu.",
    gradient: "from-violet-500 to-purple-600",
    icon: Network,
  },
  {
    level: "admin",
    label: "Admin · Platform",
    sub: "Lihat jaringan",
    hook: "Proyeksi pendapatan bersih seluruh platform AYO.",
    gradient: "from-blue-500 to-indigo-600",
    icon: Building2,
  },
];

export default function SimulatorPage() {
  const [level, setLevel] = useState<Level | null>(null);

  if (level) {
    return <LevelInfographic level={level} onBack={() => setLevel(null)} />;
  }

  return (
    <div className="flex min-h-[100dvh] flex-col bg-gradient-to-b from-background to-muted/40">
      {/* Top bar with settings link */}
      <div className="flex justify-end px-4 pt-4">
        <Link
          href="/simulator/settings"
          className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
        >
          <Settings className="h-3.5 w-3.5" /> Pengaturan
        </Link>
      </div>

      {/* Header */}
      <header className="px-5 pb-4 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground">
          AYO
        </div>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
          Simulator Penghasilan
        </h1>
        <p className="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
          Lihat potensi penghasilanmu di AYO. Pilih peran untuk mulai mensimulasikan.
        </p>
      </header>

      {/* 4 cards */}
      <main className="mx-auto grid w-full max-w-md flex-1 grid-cols-1 gap-3 px-5 pb-8 sm:grid-cols-2">
        {CARDS.map((c) => {
          const Icon = c.icon;
          return (
            <button
              key={c.level}
              onClick={() => setLevel(c.level)}
              className={`group relative overflow-hidden rounded-2xl bg-gradient-to-br ${c.gradient} p-5 text-left text-white shadow-lg transition-transform hover:scale-[1.02] active:scale-[0.99]`}
            >
              <div className="flex items-start justify-between">
                <Icon className="h-7 w-7 opacity-90" />
                <ArrowRight className="h-5 w-5 opacity-70 transition-transform group-hover:translate-x-0.5" />
              </div>
              <div className="mt-6">
                <div className="text-xs font-medium uppercase tracking-wide opacity-80">
                  {c.sub}
                </div>
                <div className="text-xl font-bold leading-tight">{c.label}</div>
                <p className="mt-1.5 text-xs leading-relaxed opacity-90">{c.hook}</p>
              </div>
            </button>
          );
        })}
      </main>

      <footer className="px-5 pb-6 text-center text-[11px] text-muted-foreground">
        Angka adalah estimasi berbasis rate komisi & asumsi churn. Bukan jaminan
        pendapatan.
      </footer>
    </div>
  );
}
