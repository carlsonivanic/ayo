import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { Copy, MessageCircle } from "lucide-react";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Guard } from "@/components/Guard";
import { Card, Row } from "@/components/ui/Card";
import { Empty, Loading, Pill, useToast } from "@/components/ui/Feedback";
import { Tabs } from "@/components/ui/Tabs";
import { api } from "@/convex/_generated/api";
import { countdown, dateTime } from "@/lib/format";
import { useMoney } from "@/lib/useMoney";
import { copy, whatsappUrl } from "@/lib/utils";

type Tab = "kode" | "tautan" | "kursi";
type Codes = FunctionReturnType<typeof api.sell.myCodes>;
type Links = FunctionReturnType<typeof api.sell.myLinks>;
type Seats = FunctionReturnType<typeof api.sell.mySeats>;

export default function KodePage() {
  return (
    <Guard role="L1">
      <AppShell title="Kode">
        <Body />
      </AppShell>
    </Guard>
  );
}

const LINK_TONE = {
  SHARED: "accent",
  PAID: "good",
  FAILED: "warn",
  EXPIRED: "neutral",
} as const;

const CODE_TONE = { UNUSED: "accent", USED: "good", EXPIRED: "neutral" } as const;

function Body() {
  const [tab, setTab] = useState<Tab>("kode");
  const codes = useQuery(api.sell.myCodes, {});
  const links = useQuery(api.sell.myLinks, {});
  const seats = useQuery(api.sell.mySeats);

  return (
    <>
      <Tabs<Tab>
        value={tab}
        onChange={setTab}
        options={[
          { value: "kode", label: "Kode", count: codes?.filter((c) => c.status === "UNUSED").length },
          { value: "tautan", label: "Tautan", count: links?.filter((l) => l.status === "SHARED").length },
          { value: "kursi", label: "Kursi", count: seats?.filter((s) => s.status !== "ACTIVATED").length },
        ]}
      />
      {tab === "kode" && <CodeList codes={codes} />}
      {tab === "tautan" && <LinkList links={links} />}
      {tab === "kursi" && <SeatList seats={seats} />}
    </>
  );
}

function CodeList({ codes }: { codes: Codes | undefined }) {
  const toast = useToast();
  if (!codes) return <Loading />;
  if (codes.length === 0) return <Empty title="Belum ada kode. Kode terbit setelah pembayaran." />;

  return (
    <div className="space-y-3">
      {codes.map((code) => (
        <Card key={code.id} className="overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0">
              <div className="num truncate text-[17px] font-semibold tracking-[0.06em]">
                {code.code}
              </div>
              <div className="mt-1 text-[13px] text-ink-mute">
                {code.planName}
                {code.storeName ? ` · ${code.storeName}` : ""}
              </div>
            </div>
            <Pill tone={CODE_TONE[code.status]}>{code.status}</Pill>
          </div>
          <div className="flex items-center justify-between gap-3 border-t border-line bg-black/[0.015] px-4 py-2.5">
            <span className="text-[13px] text-ink-mute">
              {code.status === "UNUSED"
                ? `Kedaluwarsa ${countdown(code.expiresAt)}`
                : code.status === "USED"
                  ? `Dipakai ${dateTime(code.usedAt)}${code.redemptionType === "RENEWAL" ? " · perpanjangan" : ""}`
                  : `Kedaluwarsa ${dateTime(code.expiresAt)}`}
            </span>
            {code.status === "UNUSED" && (
              <div className="flex items-center gap-1">
                <button
                  aria-label="Salin kode"
                  onClick={async () => {
                    if (await copy(code.code)) toast("Kode disalin");
                  }}
                  className="rounded p-2 text-ink-mute hover:bg-black/[0.04]"
                >
                  <Copy className="h-4 w-4" />
                </button>
                <a
                  aria-label="Kirim lewat WhatsApp"
                  href={whatsappUrl(code.code)}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded p-2 text-ink-mute hover:bg-black/[0.04]"
                >
                  <MessageCircle className="h-4 w-4" />
                </a>
              </div>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}

function LinkList({ links }: { links: Links | undefined }) {
  const fmt = useMoney();
  const toast = useToast();
  if (!links) return <Loading />;
  if (links.length === 0) return <Empty title="Belum ada tautan." />;

  const origin = typeof window === "undefined" ? "" : window.location.origin;

  return (
    <Card>
      {links.map((link) => (
        <Row
          key={link.id}
          label={link.planName}
          sub={
            link.status === "SHARED"
              ? `Berlaku ${countdown(link.expiresAt)}`
              : link.status === "PAID"
                ? `Dibayar ${dateTime(link.paidAt)}`
                : dateTime(link.createdAt)
          }
          value={fmt(link.amount)}
          valueSub={<Pill tone={LINK_TONE[link.status]}>{link.status}</Pill>}
          onClick={
            link.status === "SHARED"
              ? async () => {
                  const url = `${origin}/${link.kind === "LIFETIME" ? "lifetime" : "bayar"}/${link.token}`;
                  if (await copy(url)) toast("Tautan disalin");
                }
              : undefined
          }
        />
      ))}
    </Card>
  );
}

function SeatList({ seats }: { seats: Seats | undefined }) {
  if (!seats) return <Loading />;
  if (seats.length === 0) return <Empty title="Belum ada kursi lifetime terjual." />;

  return (
    <Card>
      {seats.map((seat) => (
        <Row
          key={seat.id}
          label={`${seat.planName} · kursi ${seat.seatIndex}`}
          sub={seat.storeName ?? "Belum diaktifkan"}
          valueSub={
            <Pill tone={seat.status === "ACTIVATED" ? "good" : "accent"}>
              {seat.status === "ACTIVATED"
                ? "Aktif"
                : seat.status === "GIFT_LINK_ACTIVE"
                  ? "Tautan aktif"
                  : "Pool"}
            </Pill>
          }
        />
      ))}
    </Card>
  );
}
