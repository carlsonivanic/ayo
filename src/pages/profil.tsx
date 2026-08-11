import { useAuthActions } from "@convex-dev/auth/react";
import { useMutation, useQuery } from "convex/react";
import { MessageSquare } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Guard, useMe } from "@/components/Guard";
import { Button } from "@/components/ui/Button";
import { Card, Row, SectionTitle } from "@/components/ui/Card";
import { Loading, useToast } from "@/components/ui/Feedback";
import { Field, Input, Select } from "@/components/ui/Form";
import { api } from "@/convex/_generated/api";
import { errorMessage } from "@/lib/utils";

export default function ProfilPage() {
  return (
    <Guard>
      <AppShell title="Profil">
        <Body />
      </AppShell>
    </Guard>
  );
}

function Body() {
  const me = useMe();
  const profile = useQuery(api.users.getPayoutProfile);
  const discord = useQuery(api.announcements.discordSettings);
  const updateProfile = useMutation(api.users.updateProfile);
  const savePayout = useMutation(api.users.savePayoutProfile);
  const setFrequency = useMutation(api.users.setPayoutFrequency);
  const { signOut } = useAuthActions();
  const toast = useToast();

  const [identity, setIdentity] = useState({ name: "", mobile: "" });
  const [bank, setBank] = useState({ bankName: "", accountNumber: "", accountName: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (me) setIdentity({ name: me.name, mobile: me.mobile });
  }, [me]);
  useEffect(() => {
    if (profile) {
      setBank({
        bankName: profile.bankName,
        accountNumber: profile.accountNumber,
        accountName: profile.accountName,
      });
    }
  }, [profile]);

  if (!me) return <Loading rows={4} />;

  async function saveIdentity(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await updateProfile({ name: identity.name, mobile: identity.mobile || undefined });
      toast("Profil disimpan");
    } catch (err) {
      toast(errorMessage(err), "warn");
    } finally {
      setBusy(false);
    }
  }

  async function saveBank(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      await savePayout(bank);
      toast("Rekening disimpan");
    } catch (err) {
      toast(errorMessage(err), "warn");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <Row label={me.email} sub={me.role ?? ""} />
        {me.assignedL2 && <Row label="Koordinator" value={me.assignedL2.name} />}
        {me.role === "L1" && (
          <Row label="Bulan ke" value={me.tenureMonth || "—"} />
        )}
      </Card>

      <form onSubmit={saveIdentity}>
        <SectionTitle>Data diri</SectionTitle>
        <Card className="space-y-4 p-4">
          <Field label="Nama">
            <Input
              value={identity.name}
              onChange={(e) => setIdentity({ ...identity, name: e.target.value })}
              required
            />
          </Field>
          <Field label="Nomor HP" hint="Opsional">
            <Input
              inputMode="tel"
              value={identity.mobile}
              onChange={(e) => setIdentity({ ...identity, mobile: e.target.value })}
              placeholder="0811…"
            />
          </Field>
          <Button type="submit" variant="ink" disabled={busy}>
            Simpan
          </Button>
        </Card>
      </form>

      {me.role !== "ADMIN" && (
        <form onSubmit={saveBank}>
          <SectionTitle helper={profile?.completed ? undefined : "Wajib sebelum payout pertama."}>
            Rekening
          </SectionTitle>
          <Card className="space-y-4 p-4">
            <Field label="Nama bank">
              <Input
                value={bank.bankName}
                onChange={(e) => setBank({ ...bank, bankName: e.target.value })}
                required
              />
            </Field>
            <Field label="Nomor rekening">
              <Input
                inputMode="numeric"
                className="num"
                value={bank.accountNumber}
                onChange={(e) => setBank({ ...bank, accountNumber: e.target.value })}
                required
              />
            </Field>
            <Field label="Atas nama">
              <Input
                value={bank.accountName}
                onChange={(e) => setBank({ ...bank, accountName: e.target.value })}
                required
              />
            </Field>
            <Button type="submit" variant="ink" disabled={busy}>
              Simpan
            </Button>
          </Card>
        </form>
      )}

      {me.role === "L1" && (
        <div>
          <SectionTitle>Jadwal payout</SectionTitle>
          <Card className="p-4">
            <Field label="Frekuensi">
              <Select
                value={me.payoutFrequency}
                onChange={async (e) => {
                  await setFrequency({ frequency: e.target.value as "WEEKLY" | "MONTHLY" });
                  toast("Jadwal diperbarui");
                }}
              >
                <option value="WEEKLY">Mingguan — dibayar Rabu</option>
                <option value="MONTHLY">Bulanan — dibayar tanggal 5</option>
              </Select>
            </Field>
          </Card>
        </div>
      )}

      {discord?.inviteUrl && (
        <a href={discord.inviteUrl} target="_blank" rel="noreferrer">
          <Button variant="quiet" block>
            <MessageSquare className="h-[18px] w-[18px]" />
            Gabung Discord
          </Button>
        </a>
      )}

      <Button variant="ghost" block onClick={() => void signOut()}>
        Keluar
      </Button>
    </div>
  );
}
