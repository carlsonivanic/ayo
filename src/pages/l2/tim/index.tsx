import { useAction, useQuery } from "convex/react";
import { Megaphone } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Guard } from "@/components/Guard";
import { Button } from "@/components/ui/Button";
import { Card, Row } from "@/components/ui/Card";
import { Empty, Loading, Pill, Sheet, useToast } from "@/components/ui/Feedback";
import { Input, Textarea } from "@/components/ui/Form";
import { api } from "@/convex/_generated/api";
import { percent } from "@/lib/format";
import { useMoney } from "@/lib/useMoney";
import { errorMessage } from "@/lib/utils";

const STAGE_LABEL: Record<string, string> = {
  PROBATION: "Probation",
  ACTIVE_FEE: "Fee penuh",
  DECAY_1: "Decay 1",
  DECAY_2: "Decay 2",
  MATURE: "Matang",
};

export default function TimPage() {
  return (
    <Guard role="L2">
      <Body />
    </Guard>
  );
}

function Body() {
  const now = useMemo(() => Date.now(), []);
  const roster = useQuery(api.team.roster, { now });
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
      {!roster ? (
        <Loading rows={5} />
      ) : roster.length === 0 ? (
        <Empty title="Belum ada L1 di tim Anda." />
      ) : (
        <Card>
          {roster.map((member) => (
            <Row
              key={member.id}
              label={member.name}
              sub={`Bulan ke-${member.tenureMonth} · ${STAGE_LABEL[member.stage]} ${percent(member.effectivePercent)}`}
              value={fmt(member.myFee)}
              valueSub={
                <span className="flex items-center justify-end gap-1.5">
                  <span className="num text-ink-mute">{member.activationsThisMonth} baru</span>
                  {member.lastClosedWarmth && (
                    <Pill
                      tone={
                        member.lastClosedWarmth === "WARM"
                          ? "good"
                          : member.lastClosedWarmth === "COLD"
                            ? "warn"
                            : "accent"
                      }
                    >
                      {member.lastClosedWarmth}
                    </Pill>
                  )}
                </span>
              }
            />
          ))}
        </Card>
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
