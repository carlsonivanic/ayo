import { useMutation, useQuery } from "convex/react";
import { UserPlus } from "lucide-react";
import { useRouter } from "next/router";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Guard } from "@/components/Guard";
import { Button } from "@/components/ui/Button";
import { Card, Row, SectionTitle } from "@/components/ui/Card";
import { Empty, Loading, Pill, Sheet, useToast } from "@/components/ui/Feedback";
import { Field, Input, Select } from "@/components/ui/Form";
import { Tabs } from "@/components/ui/Tabs";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { date } from "@/lib/format";
import { errorMessage } from "@/lib/utils";

type Tab = "L1" | "L2" | "ADMIN";

export default function PenggunaPage() {
  return (
    <Guard role="ADMIN">
      <Body />
    </Guard>
  );
}

function Body() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("L1");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  const pending = useQuery(api.admin.users.pendingRegistrations);
  const users = useQuery(api.admin.users.list, { role: tab, search: search || undefined });
  const l2Options = useQuery(api.admin.users.l2Options);

  return (
    <AppShell
      title="Pengguna"
      action={
        <button
          onClick={() => setCreateOpen(true)}
          aria-label="Tambah pengguna"
          className="rounded p-2 text-ink-soft hover:bg-black/[0.04]"
        >
          <UserPlus className="h-5 w-5" />
        </button>
      }
    >
      {pending && pending.length > 0 && (
        <div className="mb-6">
          <SectionTitle>Menunggu persetujuan</SectionTitle>
          <Card>
            {pending.map((request) => (
              <ApprovalRow
                key={request.id}
                request={request}
                l2Options={l2Options ?? []}
              />
            ))}
          </Card>
        </div>
      )}

      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        options={[
          { value: "L1", label: "L1" },
          { value: "L2", label: "L2" },
          { value: "ADMIN", label: "Admin" },
        ]}
      />

      <Input
        placeholder="Cari nama, email, nomor"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="mb-4"
      />

      {!users ? (
        <Loading rows={5} />
      ) : users.length === 0 ? (
        <Empty title="Tidak ada pengguna." />
      ) : (
        <Card>
          {users.map((user) => (
            <Row
              key={user.id}
              label={user.name || user.email}
              sub={[
                user.email,
                user.assignedL2 ? `L2 ${user.assignedL2.name}` : null,
                user.tenureMonth ? `bulan ke-${user.tenureMonth}` : null,
              ]
                .filter(Boolean)
                .join(" · ")}
              valueSub={
                <Pill
                  tone={
                    user.status === "ACTIVE"
                      ? "good"
                      : user.status === "SUSPENDED"
                        ? "warn"
                        : "accent"
                  }
                >
                  {user.status}
                </Pill>
              }
              onClick={() => void router.push(`/admin/pengguna/${user.id}`)}
            />
          ))}
        </Card>
      )}

      <CreateUserSheet
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        l2Options={l2Options ?? []}
      />
    </AppShell>
  );
}

type L2Option = { id: Id<"users">; name: string };

function ApprovalRow({
  request,
  l2Options,
}: {
  request: {
    id: Id<"registrationRequests">;
    name: string;
    email: string;
    intendedRole: "L1" | "L2";
    createdAt: number;
  };
  l2Options: L2Option[];
}) {
  const approve = useMutation(api.admin.users.approveRegistration);
  const reject = useMutation(api.admin.users.rejectRegistration);
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [role, setRole] = useState<"L1" | "L2">(request.intendedRole);
  const [l2Id, setL2Id] = useState<string>("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <>
      <Row
        label={request.name}
        sub={`${request.email} · minta ${request.intendedRole} · ${date(request.createdAt)}`}
        value="Tinjau"
        onClick={() => setOpen(true)}
      />
      <Sheet open={open} onClose={() => setOpen(false)} title={request.name}>
        <div className="space-y-4">
          <Field label="Peran">
            <Select value={role} onChange={(e) => setRole(e.target.value as "L1" | "L2")}>
              <option value="L1">L1</option>
              <option value="L2">L2</option>
            </Select>
          </Field>
          {role === "L1" && (
            <Field label="Koordinator L2" hint="Opsional">
              <Select value={l2Id} onChange={(e) => setL2Id(e.target.value)}>
                <option value="">Belum ditentukan</option>
                {l2Options.map((l2) => (
                  <option key={l2.id} value={l2.id}>
                    {l2.name}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <Button
            block
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              try {
                await approve({
                  requestId: request.id,
                  role,
                  assignedL2Id: l2Id ? (l2Id as Id<"users">) : undefined,
                });
                toast("Pendaftaran disetujui");
                setOpen(false);
              } catch (err) {
                toast(errorMessage(err), "warn");
              } finally {
                setBusy(false);
              }
            }}
          >
            Setujui
          </Button>

          <div className="border-t border-line pt-4">
            <Field label="Alasan penolakan">
              <Input value={reason} onChange={(e) => setReason(e.target.value)} />
            </Field>
            <Button
              variant="quiet"
              block
              className="mt-3"
              disabled={busy || !reason.trim()}
              onClick={async () => {
                setBusy(true);
                try {
                  await reject({ requestId: request.id, reason });
                  toast("Pendaftaran ditolak");
                  setOpen(false);
                } catch (err) {
                  toast(errorMessage(err), "warn");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Tolak
            </Button>
          </div>
        </div>
      </Sheet>
    </>
  );
}

function CreateUserSheet({
  open,
  onClose,
  l2Options,
}: {
  open: boolean;
  onClose: () => void;
  l2Options: L2Option[];
}) {
  const createUser = useMutation(api.admin.users.createUser);
  const toast = useToast();
  const [form, setForm] = useState({
    name: "",
    email: "",
    mobile: "",
    role: "L1",
    assignedL2Id: "",
  });
  const [busy, setBusy] = useState(false);

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Tambah pengguna"
      footer={
        <Button
          block
          disabled={busy || !form.name || !form.email}
          onClick={async () => {
            setBusy(true);
            try {
              await createUser({
                name: form.name,
                email: form.email,
                mobile: form.mobile || undefined,
                role: form.role as "L1" | "L2" | "ADMIN",
                assignedL2Id: form.assignedL2Id
                  ? (form.assignedL2Id as Id<"users">)
                  : undefined,
              });
              toast("Pengguna dibuat");
              setForm({ name: "", email: "", mobile: "", role: "L1", assignedL2Id: "" });
              onClose();
            } catch (err) {
              toast(errorMessage(err), "warn");
            } finally {
              setBusy(false);
            }
          }}
        >
          Buat
        </Button>
      }
    >
      <div className="space-y-4">
        <Field label="Nama">
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="Email">
          <Input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </Field>
        <Field label="Nomor HP" hint="Opsional">
          <Input
            inputMode="tel"
            value={form.mobile}
            onChange={(e) => setForm({ ...form, mobile: e.target.value })}
          />
        </Field>
        <Field label="Peran">
          <Select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
            <option value="L1">L1</option>
            <option value="L2">L2</option>
            <option value="ADMIN">Admin</option>
          </Select>
        </Field>
        {form.role === "L1" && (
          <Field label="Koordinator L2" hint="Opsional">
            <Select
              value={form.assignedL2Id}
              onChange={(e) => setForm({ ...form, assignedL2Id: e.target.value })}
            >
              <option value="">Belum ditentukan</option>
              {l2Options.map((l2) => (
                <option key={l2.id} value={l2.id}>
                  {l2.name}
                </option>
              ))}
            </Select>
          </Field>
        )}
      </div>
    </Sheet>
  );
}
