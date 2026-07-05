import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Layout } from "@/components/Layout";
import { Card, CardContent } from "@/components/ui/card";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { AgentStatusBadge } from "@/components/StatusBadge";
import {
  formatIDR,
  formatDate,
  relativeDays,
  LEVEL_LABEL,
  COMMISSION_TYPE_LABEL,
} from "@/lib/format";
import { Copy, Check, Loader2 } from "lucide-react";

const STATUSES = ["active", "probation", "dormant", "inactive", "suspended"] as const;

export default function AgentsPage() {
  const me = useQuery(api.admins.me);
  const canManage = me?.role === "ops_admin" || me?.role === "super_admin";

  const [regionId, setRegionId] = useState<string>("");
  const [level, setLevel] = useState<string>("");
  const [status, setStatus] = useState<string>("");
  const [detailId, setDetailId] = useState<Id<"agents"> | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const agents = useQuery(api.agents.listAgents, {
    regionId: regionId ? (regionId as Id<"regions">) : undefined,
    level: level ? Number(level) : undefined,
    status: status ? (status as (typeof STATUSES)[number]) : undefined,
  });
  const queue = useQuery(api.agents.approvalQueue);
  const approve = useMutation(api.agents.approveAgent);

  return (
    <Layout
      title="User Management"
      subtitle="Pantau agen lapangan: status, aktivasi, dan komisi."
      actions={
        canManage ? (
          <Button onClick={() => setAddOpen(true)}>+ Tambah Pengguna</Button>
        ) : undefined
      }
    >
      {/* Approval queue */}
      {queue && queue.length > 0 && (
        <Card className="mb-6 border-amber-200 bg-amber-50/50 dark:bg-amber-900/10">
          <CardContent className="pt-6">
            <div className="mb-3 text-sm font-medium">
              Menunggu persetujuan ({queue.length})
            </div>
            <div className="space-y-2">
              {queue.map((a) => (
                <div
                  key={a._id}
                  className="flex items-center justify-between gap-3 rounded-md border bg-background px-3 py-2"
                >
                  <div className="text-sm">
                    <span className="font-medium">{a.name}</span>
                    <span className="text-muted-foreground">
                      {" "}
                      · {a.phone} · {a.regionCode} · daftar{" "}
                      {relativeDays(a.enrolledAt)}
                    </span>
                  </div>
                  {canManage && (
                    <Button
                      size="sm"
                      onClick={() => approve({ agentId: a._id })}
                    >
                      Setujui
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {canManage && <PendingInvitesCard />}

      {/* Filters */}
      <div className="mb-4 grid gap-3 sm:grid-cols-3 lg:max-w-2xl">
        <RegionFilter value={regionId} onChange={setRegionId} />
        <Select value={level} onChange={(e) => setLevel(e.target.value)}>
          <option value="">Semua level</option>
          <option value="1">L1 · Agen</option>
          <option value="2">L2 · Koordinator</option>
          <option value="3">L3 · Regional</option>
        </Select>
        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Semua status</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <THead>
              <TR>
                <TH>Nama</TH>
                <TH>Level</TH>
                <TH>Wilayah</TH>
                <TH>Status</TH>
                <TH className="text-right">Aktivasi/kuartal</TH>
                <TH className="text-right">Merchant aktif</TH>
                <TH className="text-right">Komisi total</TH>
                <TH>Aktivitas</TH>
              </TR>
            </THead>
            <TBody>
              {agents?.map((a) => (
                <TR
                  key={a._id}
                  className="cursor-pointer"
                  onClick={() => setDetailId(a._id)}
                >
                  <TD className="font-medium">{a.name}</TD>
                  <TD className="text-muted-foreground">
                    {LEVEL_LABEL[a.level] ?? a.level}
                  </TD>
                  <TD>{a.regionCode}</TD>
                  <TD>
                    <AgentStatusBadge status={a.status} />
                  </TD>
                  <TD className="text-right tabular-nums">
                    {a.activationsThisQuarter}
                  </TD>
                  <TD className="text-right tabular-nums">{a.activeMerchants}</TD>
                  <TD className="text-right tabular-nums">
                    {formatIDR(a.commissionTotal)}
                  </TD>
                  <TD className="text-muted-foreground">
                    {relativeDays(a.lastActiveAt)}
                  </TD>
                </TR>
              ))}
              {agents && agents.length === 0 && (
                <TR>
                  <TD colSpan={8} className="py-8 text-center text-muted-foreground">
                    Tidak ada agen yang cocok dengan filter.
                  </TD>
                </TR>
              )}
            </TBody>
          </Table>
        </CardContent>
      </Card>

      {detailId && (
        <AgentDetailDialog
          agentId={detailId}
          canManage={canManage}
          onClose={() => setDetailId(null)}
        />
      )}

      {addOpen && <AddAgentDialog onClose={() => setAddOpen(false)} />}
    </Layout>
  );
}

function RegionFilter({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const regions = useQuery(api.regions.list);
  return (
    <Select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Semua wilayah</option>
      {regions?.map((r) => (
        <option key={r._id} value={r._id}>
          {r.name}
        </option>
      ))}
    </Select>
  );
}

function inviteLink(token: string): string {
  const origin =
    typeof window !== "undefined" ? window.location.origin : "";
  return `${origin}/undangan/${token}`;
}

function CopyLinkButton({ link }: { link: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => {
        navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 1200);
      }}
    >
      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      {copied ? "Tersalin" : "Salin tautan"}
    </Button>
  );
}

function PendingInvitesCard() {
  const invites = useQuery(api.agentInvites.listPending);
  const revoke = useMutation(api.agentInvites.revokeInvite);

  if (!invites || invites.length === 0) return null;

  async function onRevoke(id: Id<"agentInvites">, name: string) {
    if (!confirm(`Batalkan undangan untuk ${name}?`)) return;
    try {
      await revoke({ inviteId: id });
    } catch (e) {
      alert(e instanceof Error ? e.message : "Gagal membatalkan undangan.");
    }
  }

  return (
    <Card className="mb-6">
      <CardContent className="pt-6">
        <div className="mb-3 text-sm font-medium">
          Undangan menunggu aktivasi ({invites.length})
        </div>
        <div className="space-y-2">
          {invites.map((i) => (
            <div
              key={i._id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-md border bg-background px-3 py-2"
            >
              <div className="text-sm">
                <span className="font-medium">{i.name}</span>
                <span className="text-muted-foreground">
                  {" "}
                  · {i.email} · {LEVEL_LABEL[i.level] ?? i.level}
                  {i.expired ? " · kedaluwarsa" : ""}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {!i.expired && <CopyLinkButton link={inviteLink(i.token)} />}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onRevoke(i._id, i.name)}
                >
                  Batalkan
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function AddAgentDialog({ onClose }: { onClose: () => void }) {
  const regions = useQuery(api.regions.list);
  const createInvite = useMutation(api.agentInvites.createInvite);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [level, setLevel] = useState("1");
  const [regionId, setRegionId] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  async function submit() {
    setErr(null);
    if (name.trim().length < 2) return setErr("Nama wajib diisi.");
    if (!email.includes("@")) return setErr("Email tidak valid.");
    if (phone.trim().length < 6) return setErr("Nomor HP tidak valid.");
    if (!regionId) return setErr("Pilih wilayah.");
    setBusy(true);
    try {
      const res = await createInvite({
        name,
        email,
        phone,
        level: Number(level),
        regionId: regionId as Id<"regions">,
      });
      setToken(res.token);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal menyimpan.");
    } finally {
      setBusy(false);
    }
  }

  if (token) {
    const link = inviteLink(token);
    return (
      <Dialog open onOpenChange={(o) => !o && onClose()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Undangan dibuat</DialogTitle>
            <DialogDescription>
              Bagikan tautan ini ke {name}. Mereka akan memilih kata sandi
              sendiri dan akunnya langsung berstatus Aktif.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2 rounded-md border bg-muted/40 px-3 py-2">
              <span className="flex-1 truncate font-mono text-xs">{link}</span>
              <CopyLinkButton link={link} />
            </div>
            <div className="flex justify-end">
              <Button onClick={onClose}>Selesai</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Tambah Pengguna</DialogTitle>
          <DialogDescription>
            Buat tautan undangan — pengguna baru memilih kata sandinya sendiri
            saat membuka tautan, lalu langsung berstatus Aktif.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Nama</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nama lengkap"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@email.com"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Nomor HP</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="08xxxxxxxxxx"
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Level</Label>
              <Select value={level} onChange={(e) => setLevel(e.target.value)}>
                <option value="1">L1 · Agen</option>
                <option value="2">L2 · Koordinator</option>
                <option value="3">L3 · Regional</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Wilayah</Label>
              <Select
                value={regionId}
                onChange={(e) => setRegionId(e.target.value)}
              >
                <option value="">Pilih…</option>
                {regions?.map((r) => (
                  <option key={r._id} value={r._id}>
                    {r.name}
                  </option>
                ))}
              </Select>
            </div>
          </div>

          {err && <p className="text-sm text-destructive">{err}</p>}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onClose} disabled={busy}>
              Batal
            </Button>
            <Button onClick={submit} disabled={busy}>
              {busy && <Loader2 className="animate-spin" />}
              Buat undangan
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function AgentDetailDialog({
  agentId,
  canManage,
  onClose,
}: {
  agentId: Id<"agents">;
  canManage: boolean;
  onClose: () => void;
}) {
  const detail = useQuery(api.agents.agentDetail, { agentId });
  const override = useMutation(api.agents.overrideStatus);
  const [newStatus, setNewStatus] = useState("");
  const [reason, setReason] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submitOverride() {
    setErr(null);
    if (!newStatus) return setErr("Pilih status baru.");
    if (reason.trim().length < 3) return setErr("Alasan wajib diisi.");
    setBusy(true);
    try {
      await override({
        agentId,
        status: newStatus as (typeof STATUSES)[number],
        reason,
      });
      setNewStatus("");
      setReason("");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Gagal menyimpan.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{detail?.name ?? "Detail agen"}</DialogTitle>
          <DialogDescription>
            {detail
              ? `${LEVEL_LABEL[detail.level]} · ${detail.regionCode} · ${detail.phone}`
              : "Memuat…"}
          </DialogDescription>
        </DialogHeader>

        {detail && (
          <div className="space-y-5">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Metric label="Status" node={<AgentStatusBadge status={detail.status} />} />
              <Metric label="Merchant aktif" value={String(detail.activeMerchants)} />
              <Metric
                label="Aktivasi/kuartal"
                value={String(detail.activationsThisQuarter)}
              />
              <Metric label="Komisi total" value={formatIDR(detail.commissionTotal)} />
              <Metric label="Terdaftar" value={formatDate(detail.enrolledAt)} />
              <Metric
                label="Fee dibayar"
                value={detail.feePaidAt ? formatDate(detail.feePaidAt) : "Belum"}
              />
              <Metric label="Escrow" value={formatIDR(detail.escrowAmount)} />
              <Metric label="Referrer" value={detail.referrerName ?? "—"} />
            </div>

            <div>
              <div className="mb-2 text-sm font-medium">Ledger komisi terbaru</div>
              <div className="max-h-48 overflow-auto rounded-md border">
                <Table>
                  <TBody>
                    {detail.ledger.slice(0, 10).map((e) => (
                      <TR key={e._id}>
                        <TD>{COMMISSION_TYPE_LABEL[e.type] ?? e.type}</TD>
                        <TD>
                          <Badge
                            tone={e.status === "settled" ? "green" : "amber"}
                          >
                            {e.status}
                          </Badge>
                        </TD>
                        <TD className="text-right tabular-nums">
                          {formatIDR(e.amount)}
                        </TD>
                      </TR>
                    ))}
                    {detail.ledger.length === 0 && (
                      <TR>
                        <TD className="py-4 text-center text-muted-foreground">
                          Belum ada entri komisi.
                        </TD>
                      </TR>
                    )}
                  </TBody>
                </Table>
              </div>
            </div>

            {canManage && (
              <div className="rounded-md border p-3">
                <div className="mb-3 text-sm font-medium">Override status</div>
                <div className="grid gap-3 sm:grid-cols-[200px_1fr_auto] sm:items-end">
                  <div className="space-y-1.5">
                    <Label>Status baru</Label>
                    <Select
                      value={newStatus}
                      onChange={(e) => setNewStatus(e.target.value)}
                    >
                      <option value="">Pilih…</option>
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Alasan (wajib)</Label>
                    <Input
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      placeholder="Dicatat untuk audit"
                    />
                  </div>
                  <Button onClick={submitOverride} disabled={busy}>
                    Simpan
                  </Button>
                </div>
                {err && <p className="mt-2 text-sm text-destructive">{err}</p>}
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

function Metric({
  label,
  value,
  node,
}: {
  label: string;
  value?: string;
  node?: React.ReactNode;
}) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-medium">{node ?? value}</div>
    </div>
  );
}
