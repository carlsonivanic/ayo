import { useAction, useQuery } from "convex/react";
import { Megaphone } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Guard } from "@/components/Guard";
import { Button } from "@/components/ui/Button";
import { TeamMemberRow } from "@/components/L1Performance";
import { Card, Stat } from "@/components/ui/Card";
import { Empty, Loading, Sheet, useToast } from "@/components/ui/Feedback";
import { Input, Textarea } from "@/components/ui/Form";
import { api } from "@/convex/_generated/api";
import { useMoney } from "@/lib/useMoney";
import { errorMessage } from "@/lib/utils";

export default function TimPage() {
  return (
    <Guard role="L2">
      <Body />
    </Guard>
  );
}

function Body() {
  const now = useMemo(() => Date.now(), []);
  const team = useQuery(api.performance.team, { now });
  const publish = useAction(api.announcements.publish);
  const fmt = useMoney();
  const toast = useToast();

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ title: "", message: "" });
  const [busy, setBusy] = useState(false);

  return (
    <AppShell
      title="Tim"
      action={
        <button
          onClick={() => setOpen(true)}
          aria-label="Buat pengumuman"
          className="rounded p-2 text-ink-soft hover:bg-black/[0.04]"
        >
          <Megaphone className="h-5 w-5" />
        </button>
      }
    >
      {!team ? (
        <Loading rows={5} />
      ) : team.members.length === 0 ? (
        <Empty title="Belum ada L1 di tim Anda." />
      ) : (
        <div className="space-y-5">
          <Card>
            <div className="grid grid-cols-2 divide-x divide-line border-b border-line">
              <Stat label="Pelanggan baru" value={team.totals.activations} sub={`sisa ${team.daysLeft} hari`} />
              <Stat label="Omzet bulan ini" value={fmt(team.totals.gross)} />
            </div>
            <div className="grid grid-cols-2 divide-x divide-line">
              <Stat
                label="Diam ≥7 hari"
                value={team.totals.idle}
                tone={team.totals.idle > 0 ? "warn" : "default"}
              />
              <Stat
                label="Berisiko COLD"
                value={team.totals.atRisk}
                tone={team.totals.atRisk > 0 ? "warn" : "default"}
              />
            </div>
          </Card>

          <Card>
            {team.members.map((m) => (
              <TeamMemberRow key={m.id} member={m} href={`/l2/tim/${m.id}`} />
            ))}
          </Card>
        </div>
      )}

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Pengumuman tim"
        footer={
          <Button
            block
            disabled={busy || !form.title || !form.message}
            onClick={async () => {
              setBusy(true);
              try {
                await publish({ ...form, audience: "L1", sendToDiscord: false });
                toast("Pengumuman terkirim");
                setForm({ title: "", message: "" });
                setOpen(false);
              } catch (err) {
                toast(errorMessage(err), "warn");
              } finally {
                setBusy(false);
              }
            }}
          >
            Kirim ke tim
          </Button>
        }
      >
        <div className="space-y-4">
          <Input
            placeholder="Judul"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
          <Textarea
            placeholder="Pesan"
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
          />
        </div>
      </Sheet>
    </AppShell>
  );
}
