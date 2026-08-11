import { useAction, useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Guard } from "@/components/Guard";
import { Button } from "@/components/ui/Button";
import { Card, Row, SectionTitle } from "@/components/ui/Card";
import { Empty, Loading, Pill, useToast } from "@/components/ui/Feedback";
import { Field, Input, Select, Textarea, Toggle } from "@/components/ui/Form";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { dateTime } from "@/lib/format";
import { errorMessage } from "@/lib/utils";

export default function PengumumanPage() {
  return (
    <Guard role="ADMIN">
      <AppShell title="Pengumuman">
        <Body />
      </AppShell>
    </Guard>
  );
}

function Body() {
  const list = useQuery(api.announcements.list);
  const discord = useQuery(api.announcements.discordSettings);
  const publish = useAction(api.announcements.publish);
  const testWebhook = useAction(api.announcements.testDiscordWebhook);
  const saveDiscord = useMutation(api.announcements.saveDiscordSettings);
  const remove = useMutation(api.announcements.deleteAnnouncement);
  const toast = useToast();

  const [form, setForm] = useState({
    title: "",
    message: "",
    audience: "ALL",
    sendToDiscord: false,
  });
  const [webhook, setWebhook] = useState<{ webhookUrl: string; inviteUrl: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const discordForm = webhook ?? {
    webhookUrl: discord?.webhookUrl ?? "",
    inviteUrl: discord?.inviteUrl ?? "",
  };

  return (
    <div className="space-y-6">
      <div>
        <SectionTitle>Buat pengumuman</SectionTitle>
        <Card className="space-y-4 p-4">
          <Field label="Judul">
            <Input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </Field>
          <Field label="Pesan">
            <Textarea
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
            />
          </Field>
          <Field label="Penerima">
            <Select
              value={form.audience}
              onChange={(e) => setForm({ ...form, audience: e.target.value })}
            >
              <option value="ALL">Semua</option>
              <option value="L1">L1 saja</option>
              <option value="L2">L2 saja</option>
            </Select>
          </Field>
          <Toggle
            label="Kirim juga ke Discord"
            checked={form.sendToDiscord}
            onChange={(sendToDiscord) => setForm({ ...form, sendToDiscord })}
          />
          <Button
            block
            disabled={busy || !form.title.trim() || !form.message.trim()}
            onClick={async () => {
              setBusy(true);
              try {
                const result = await publish({
                  title: form.title,
                  message: form.message,
                  audience: form.audience as "ALL" | "L1" | "L2",
                  sendToDiscord: form.sendToDiscord,
                });
                toast(
                  result.discord === "FAILED"
                    ? "Terbit di aplikasi. Discord gagal."
                    : "Pengumuman terbit",
                  result.discord === "FAILED" ? "warn" : "ink",
                );
                setForm({ title: "", message: "", audience: "ALL", sendToDiscord: false });
              } catch (err) {
                toast(errorMessage(err), "warn");
              } finally {
                setBusy(false);
              }
            }}
          >
            Terbitkan
          </Button>
        </Card>
      </div>

      <div>
        <SectionTitle>Discord</SectionTitle>
        <Card className="space-y-4 p-4">
          <Field label="Webhook URL">
            <Input
              value={discordForm.webhookUrl}
              onChange={(e) => setWebhook({ ...discordForm, webhookUrl: e.target.value })}
              placeholder="https://discord.com/api/webhooks/…"
            />
          </Field>
          <Field label="Tautan undangan server">
            <Input
              value={discordForm.inviteUrl}
              onChange={(e) => setWebhook({ ...discordForm, inviteUrl: e.target.value })}
              placeholder="https://discord.gg/…"
            />
          </Field>
          <div className="flex gap-2">
            <Button
              variant="ink"
              onClick={async () => {
                await saveDiscord({
                  webhookUrl: discordForm.webhookUrl || undefined,
                  inviteUrl: discordForm.inviteUrl || undefined,
                  enabled: !!discordForm.webhookUrl,
                });
                toast("Pengaturan disimpan");
              }}
            >
              Simpan
            </Button>
            <Button
              variant="quiet"
              onClick={async () => {
                const result = await testWebhook({});
                toast(result.ok ? "Webhook berhasil" : "Webhook gagal", result.ok ? "ink" : "warn");
              }}
            >
              Tes webhook
            </Button>
          </div>
          {discord?.lastTestOk !== null && discord?.lastTestOk !== undefined && (
            <Pill tone={discord.lastTestOk ? "good" : "warn"}>
              {discord.lastTestOk ? "Tes terakhir berhasil" : "Tes terakhir gagal"}
            </Pill>
          )}
        </Card>
      </div>

      <div>
        <SectionTitle>Terbit</SectionTitle>
        {!list ? (
          <Loading rows={3} />
        ) : list.length === 0 ? (
          <Empty title="Belum ada pengumuman." />
        ) : (
          <Card>
            {list.map((item) => (
              <Row
                key={item.id}
                label={item.title}
                sub={`${item.audience} · ${dateTime(item.createdAt)}${item.discordStatus === "FAILED" ? " · Discord gagal" : ""}`}
                value={
                  <button
                    onClick={() =>
                      void remove({ announcementId: item.id as Id<"announcements"> })
                    }
                    className="text-[13px] font-semibold text-ink-mute underline underline-offset-4"
                  >
                    Hapus
                  </button>
                }
              />
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}
