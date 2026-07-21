import { useState } from "react";
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Layout } from "@/components/Layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { formatDate, formatParamLabel } from "@/lib/format";
import { Loader2, Pencil, Trash2, KeyRound } from "lucide-react";

type Role = "super_admin" | "finance_admin" | "ops_admin";

type Admin = {
  _id: Id<"adminProfiles">;
  name: string;
  role: Role;
  email: string;
  createdAt: number;
};

type Param = { key: string; value: string; effectiveAt: number; note?: string };

// Groups parameters by business relevance (mirrors convex/seed.ts's PARAMS
// sections) instead of the flat alphabetical list the backend returns. Any
// key not listed here (e.g. a new parameter added later) still shows up,
// bucketed into "Lainnya" so nothing silently disappears from the screen.
const PARAM_GROUPS: { label: string; keys: string[] }[] = [
  {
    label: "Harga",
    keys: [
      "price_daily",
      "price_weekly",
      "price_monthly",
      "price_annual",
      "price_lifetime_solo",
      "price_lifetime_duo",
    ],
  },
  {
    label: "L1 — Pendaftaran, Status & Komisi",
    keys: [
      "l1_probation_months",
      "l1_commitment_fee",
      "l1_fee_waiver_extra_activations",
      "l1_escrow_forfeiture_days",
      "l1_active_min_activations",
      "l1_dormant_min_activations",
      "l1_dormant_warning_week",
      "l1_dormant_residual_pct",
      "l1_inactive_residual_pct",
      "l1_lifetime_conversion_cap_pct",
      "l1_ownership_transfer_quarters",
      "finder_fee_amount",
      "l1_monthly_commission_y1_pct",
      "l1_monthly_commission_y2_pct",
      "l1_monthly_commission_y3_pct",
      "l1_annual_commission_y1_pct",
      "l1_annual_commission_y2_pct",
      "l1_lifetime_solo_commission",
      "l1_lifetime_duo_commission",
    ],
  },
  {
    label: "L2 — Gerbang, KPI, Roster & Insentif",
    keys: [
      "l2_promo_min_months_l1",
      "l2_promo_min_activations",
      "l2_promo_min_recruits",
      "l2_kpi_period",
      "l2_kpi_health_pct",
      "l2_kpi_dev_min",
      "l2_roster_soft_cap",
      "l2_roster_warning_threshold",
      "l2_suspended_denominator_quarters",
      "l2_multiplier_active",
      "l2_multiplier_coasting",
      "l2_multiplier_developing",
      "l2_multiplier_dormant",
      "l2_multiplier_suspended",
      "l2_override_rate",
      "l2_bonus_area_threshold",
      "l2_bonus_area_amount",
      "l2_bonus_growth_pct",
      "l2_bonus_growth_amount",
      "l2_promo_bonus_per_l1_promoted",
    ],
  },
  {
    label: "L3 — Gerbang, KPI, Roster & Insentif",
    keys: [
      "l3_promo_min_months_l2",
      "l3_promo_min_l2s_built",
      "l3_promo_min_active_merchants",
      "l3_kpi_period",
      "l3_kpi_health_pct",
      "l3_kpi_dev_min",
      "l3_roster_soft_cap",
      "l3_roster_warning_threshold",
      "l3_multiplier_active",
      "l3_multiplier_coasting",
      "l3_multiplier_developing",
      "l3_multiplier_dormant",
      "l3_multiplier_suspended",
      "l3_override_rate",
      "l3_bonus_region_threshold",
      "l3_bonus_region_amount",
      "l3_bonus_annual_threshold",
      "l3_bonus_annual_amount",
      "l3_bonus_growth_pct",
      "l3_bonus_growth_amount",
      "l3_promo_bonus_per_l2_promoted",
    ],
  },
  {
    label: "Tenure & Graduasi",
    keys: [
      "l1_l2_tenure_years",
      "l1_l2_graduation_warning_months",
      "l2_l3_graduation_warning_months",
      "tenure_clock_applies_to_existing",
    ],
  },
  {
    label: "Payout Bersama",
    keys: [
      "payout_minimum_threshold",
      "pph21_threshold",
      "payout_dispute_window_days",
    ],
  },
  {
    label: "Platform & Siklus Kode",
    keys: ["code_unused_expiry_days", "lifetime_duo_window_hours", "grace_period_days"],
  },
  {
    label: "Durasi Langganan",
    keys: ["duration_weekly_days", "duration_monthly_days", "duration_annual_days"],
  },
];

/** Bucket the flat, alphabetically-sorted param list into PARAM_GROUPS sections. */
function groupParams(params: Param[]): { label: string; rows: Param[] }[] {
  const byKey = new Map(params.map((p) => [p.key, p]));
  const used = new Set<string>();
  const groups: { label: string; rows: Param[] }[] = [];

  for (const g of PARAM_GROUPS) {
    const rows = g.keys
      .map((k) => byKey.get(k))
      .filter((p): p is Param => !!p);
    for (const p of rows) used.add(p.key);
    if (rows.length > 0) groups.push({ label: g.label, rows });
  }

  const rest = params
    .filter((p) => !used.has(p.key))
    .sort((a, b) => a.key.localeCompare(b.key));
  if (rest.length > 0) groups.push({ label: "Lainnya", rows: rest });

  return groups;
}

const ROLE_LABEL: Record<Role, string> = {
  super_admin: "Super Admin",
  finance_admin: "Finance Admin",
  ops_admin: "Ops Admin",
};

function AdminUsersCard() {
  const admins = useQuery(api.admins.list);
  const me = useQuery(api.admins.me);
  const invite = useAction(api.admins.invite);
  const remove = useMutation(api.admins.remove);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("ops_admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Admin | null>(null);
  const [resetting, setResetting] = useState<Admin | null>(null);

  async function onInvite(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(null);
    if (password.length < 8) {
      setError("Kata sandi awal minimal 8 karakter.");
      return;
    }
    setBusy(true);
    try {
      await invite({ name, email, role, password });
      setOk(`Admin ${email} dibuat. Bagikan kata sandi awalnya secara aman.`);
      setName("");
      setEmail("");
      setPassword("");
      setRole("ops_admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membuat admin.");
    } finally {
      setBusy(false);
    }
  }

  async function onRemove(id: Id<"adminProfiles">, name: string) {
    if (
      !confirm(
        `Hapus admin ${name}? Akunnya dihapus permanen dan tidak bisa login lagi.`,
      )
    )
      return;
    try {
      await remove({ adminProfileId: id });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Gagal menghapus admin.");
    }
  }

  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle>Pengguna Admin Console</CardTitle>
        <p className="text-sm text-muted-foreground">
          Pendaftaran mandiri dimatikan — super admin yang membuatkan akun di
          sini dengan kata sandi awal, lalu membagikannya ke admin baru.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <form
          onSubmit={onInvite}
          className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5 lg:items-end"
        >
          <div className="space-y-1.5">
            <Label htmlFor="adm-name">Nama</Label>
            <Input
              id="adm-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="adm-email">Email</Label>
            <Input
              id="adm-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="adm-role">Peran</Label>
            <Select
              id="adm-role"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
            >
              <option value="ops_admin">Ops Admin</option>
              <option value="finance_admin">Finance Admin</option>
              <option value="super_admin">Super Admin</option>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="adm-pass">Kata sandi awal (≥8)</Label>
            <Input
              id="adm-pass"
              type="text"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <Button type="submit" disabled={busy}>
            {busy && <Loader2 className="animate-spin" />}
            Buat admin
          </Button>
        </form>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {ok && <p className="text-sm text-emerald-600">{ok}</p>}

        <Table>
          <THead>
            <TR>
              <TH>Nama</TH>
              <TH>Email</TH>
              <TH>Peran</TH>
              <TH>Dibuat</TH>
              <TH className="w-32" />
            </TR>
          </THead>
          <TBody>
            {admins?.map((a) => {
              const self = me?._id === a._id;
              return (
                <TR key={a._id}>
                  <TD className="font-medium">{a.name}</TD>
                  <TD className="text-muted-foreground">{a.email}</TD>
                  <TD>{ROLE_LABEL[a.role as Role]}</TD>
                  <TD className="text-muted-foreground">{formatDate(a.createdAt)}</TD>
                  <TD>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditing(a as Admin)}
                        aria-label={`Edit ${a.name}`}
                        title="Edit"
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setResetting(a as Admin)}
                        aria-label={`Reset kata sandi ${a.name}`}
                        title="Reset kata sandi"
                      >
                        <KeyRound className="h-4 w-4" />
                      </Button>
                      {!self && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => onRemove(a._id, a.name)}
                          aria-label="Hapus admin"
                          title="Hapus"
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      )}
                    </div>
                  </TD>
                </TR>
              );
            })}
            {admins && admins.length === 0 && (
              <TR>
                <TD colSpan={5} className="py-8 text-center text-muted-foreground">
                  Belum ada admin.
                </TD>
              </TR>
            )}
          </TBody>
        </Table>
      </CardContent>

      {editing && (
        <EditAdminDialog admin={editing} onClose={() => setEditing(null)} />
      )}
      {resetting && (
        <ResetPasswordDialog admin={resetting} onClose={() => setResetting(null)} />
      )}
    </Card>
  );
}

/**
 * Edit an admin's name and role. A super admin may edit their own name but the
 * role field is disabled on their own row (backend rejects self role-change).
 */
function EditAdminDialog({
  admin,
  onClose,
}: {
  admin: Admin;
  onClose: () => void;
}) {
  const update = useMutation(api.admins.update);
  const me = useQuery(api.admins.me);
  const [name, setName] = useState(admin.name);
  const [role, setRole] = useState<Role>(admin.role);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const self = me?._id === admin._id;

  async function submit() {
    setErr(null);
    if (name.trim().length < 2) {
      setErr("Nama minimal 2 karakter.");
      return;
    }
    setBusy(true);
    try {
      await update({ adminProfileId: admin._id, name, role });
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal menyimpan.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit admin</DialogTitle>
          <DialogDescription>{admin.email}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="edit-name">Nama</Label>
            <Input
              id="edit-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-role">Peran</Label>
            <Select
              id="edit-role"
              value={role}
              disabled={self}
              onChange={(e) => setRole(e.target.value as Role)}
            >
              <option value="ops_admin">Ops Admin</option>
              <option value="finance_admin">Finance Admin</option>
              <option value="super_admin">Super Admin</option>
            </Select>
            {self && (
              <p className="text-xs text-muted-foreground">
                Peran tidak bisa diubah untuk akun sendiri.
              </p>
            )}
          </div>
          {err && <p className="text-sm text-destructive">{err}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={busy}>
              Batal
            </Button>
            <Button onClick={submit} disabled={busy}>
              {busy && <Loader2 className="animate-spin" />}
              Simpan
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Reset an admin's password. The admin sets a new password directly and shares
 * it out of band (same model as the initial password on `invite`). The backend
 * invalidates all of the target's sessions, so they must sign in again.
 */
function ResetPasswordDialog({
  admin,
  onClose,
}: {
  admin: Admin;
  onClose: () => void;
}) {
  const resetPassword = useAction(api.admins.resetPassword);
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setErr(null);
    if (password.length < 8) {
      setErr("Kata sandi minimal 8 karakter.");
      return;
    }
    setBusy(true);
    try {
      await resetPassword({ email: admin.email, password });
      onClose();
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal mengatur ulang sandi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reset kata sandi</DialogTitle>
          <DialogDescription>
            {admin.name} ({admin.email}) akan keluar dari semua perangkat dan
            wajib masuk lagi dengan kata sandi baru.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="reset-pass">Kata sandi baru (≥8)</Label>
            <Input
              id="reset-pass"
              type="text"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimal 8 karakter"
            />
          </div>
          {err && <p className="text-sm text-destructive">{err}</p>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={busy}>
              Batal
            </Button>
            <Button onClick={submit} disabled={busy}>
              {busy && <Loader2 className="animate-spin" />}
              Reset kata sandi
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/** Convert a ms timestamp to the value a <input type="datetime-local"> wants. */
function toDatetimeLocal(ms: number): string {
  const d = new Date(ms);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}

function ParamRow({
  param,
  canEdit,
}: {
  param: { key: string; value: string; effectiveAt: number; note?: string };
  canEdit: boolean;
}) {
  const setParam = useMutation(api.params.setParam);
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(param.value);
  const [when, setWhen] = useState("");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function startEdit() {
    setValue(param.value);
    setWhen(toDatetimeLocal(Date.now()));
    setNote("");
    setError(null);
    setEditing(true);
  }

  async function onSave() {
    setError(null);
    const ms = when ? new Date(when).getTime() : Date.now();
    if (Number.isNaN(ms)) {
      setError("Tanggal tidak valid.");
      return;
    }
    setBusy(true);
    try {
      await setParam({
        key: param.key,
        value,
        effectiveAt: ms,
        note: note || undefined,
      });
      setEditing(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan.");
    } finally {
      setBusy(false);
    }
  }

  if (!editing) {
    return (
      <TR>
        <TD>
          <div className="font-medium">{formatParamLabel(param.key)}</div>
          <div className="font-mono text-xs text-muted-foreground">
            {param.key}
          </div>
        </TD>
        <TD className="font-medium">{param.value}</TD>
        <TD className="text-muted-foreground">
          {param.effectiveAt === 0 ? "default" : formatDate(param.effectiveAt)}
        </TD>
        <TD className="w-10">
          {canEdit && (
            <Button
              variant="ghost"
              size="sm"
              onClick={startEdit}
              aria-label={`Edit ${param.key}`}
            >
              <Pencil className="h-4 w-4" />
            </Button>
          )}
        </TD>
      </TR>
    );
  }

  return (
    <TR>
      <TD className="align-top">
        <div className="font-medium">{formatParamLabel(param.key)}</div>
        <div className="font-mono text-xs text-muted-foreground">
          {param.key}
        </div>
      </TD>
      <TD colSpan={2}>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor={`val-${param.key}`}>Nilai baru</Label>
            <Input
              id={`val-${param.key}`}
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor={`eff-${param.key}`}>Berlaku sejak</Label>
            <Input
              id={`eff-${param.key}`}
              type="datetime-local"
              value={when}
              onChange={(e) => setWhen(e.target.value)}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor={`note-${param.key}`}>Catatan (opsional)</Label>
            <Input
              id={`note-${param.key}`}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Alasan perubahan…"
            />
          </div>
        </div>
        {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
      </TD>
      <TD className="align-top">
        <div className="flex flex-col gap-2">
          <Button size="sm" onClick={onSave} disabled={busy}>
            {busy && <Loader2 className="animate-spin" />}
            Simpan
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditing(false)}
            disabled={busy}
          >
            Batal
          </Button>
        </div>
      </TD>
    </TR>
  );
}

export default function SettingsPage() {
  const params = useQuery(api.params.listEffective);
  const me = useQuery(api.admins.me);
  const [q, setQ] = useState("");

  const canEdit =
    me?.role === "super_admin" || me?.role === "finance_admin";

  const needle = q.toLowerCase();
  const filtered = params?.filter(
    (p) =>
      p.key.toLowerCase().includes(needle) ||
      formatParamLabel(p.key).toLowerCase().includes(needle),
  );
  const groups = filtered ? groupParams(filtered) : [];

  return (
    <Layout
      title="Parameter Sistem"
      subtitle="Semua nilai bisnis hidup di registry ini. Menyimpan perubahan menambah versi baru (riwayat lama tetap utuh) dan bisa dijadwalkan ke depan."
    >
      <AdminUsersCard />

      <div className="mb-4 max-w-sm">
        <Input
          placeholder="Cari parameter… (mis. Grace Period)"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div className="space-y-6">
        {groups.map((g) => (
          <Card key={g.label}>
            <CardHeader>
              <CardTitle className="text-base">{g.label}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <THead>
                  <TR>
                    <TH>Parameter</TH>
                    <TH>Nilai</TH>
                    <TH>Berlaku sejak</TH>
                    <TH className="w-10" />
                  </TR>
                </THead>
                <TBody>
                  {g.rows.map((p) => (
                    <ParamRow key={p.key} param={p} canEdit={canEdit} />
                  ))}
                </TBody>
              </Table>
            </CardContent>
          </Card>
        ))}
        {filtered && filtered.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              Tidak ada parameter cocok.
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
