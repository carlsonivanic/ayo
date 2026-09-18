import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { Copy, Eye, EyeOff, MessageCircle } from "lucide-react";
import { useRouter } from "next/router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Guard } from "@/components/Guard";
import { Card, Row } from "@/components/ui/Card";
import { Empty, Loading, Pill, useToast } from "@/components/ui/Feedback";
import { Tabs } from "@/components/ui/Tabs";
import { api } from "@/convex/_generated/api";
import { countdown, dateTime, money } from "@/lib/format";
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

const CODE_TONE = { UNUSED: "accent", USED: "good", EXPIRED: "neutral" } as const;

function Body() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("kode");

  useEffect(() => {
    const wanted = router.query.tab;
    if (wanted === "kode" || wanted === "tautan" || wanted === "kursi") setTab(wanted);
  }, [router.query.tab]);

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

/**
 * Every link the agent has sent, and where it got stuck.
 *
 * With buyer-side settlement the agent is no longer in the room when the money
 * moves, so this list is the only place they can see that a link was opened but
 * never paid — the difference between "chase the customer" and "wait".
 */
function LinkList({ links }: { links: Links | undefined }) {
  const toast = useToast();
  if (!links) return <Loading />;
  if (links.length === 0) return <Empty title="Belum ada tautan." />;

  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const urlOf = (link: Links[number]) =>
    `${origin}/${link.kind === "LIFETIME" ? "lifetime" : "bayar"}/${link.token}`;

  return (
    <div className="space-y-3">
      {links.map((link) => {
        const url = urlOf(link);
        const open = link.status === "SHARED";
        return (
          <Card key={link.id} className="overflow-hidden">
            <div className="flex items-start justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <div className="text-[15px] font-medium">{link.planName}</div>
                <div className="mt-0.5 text-[13px] text-ink-mute">
                  {link.status === "PAID"
                    ? `Dibayar ${dateTime(link.paidAt)}${
                        link.proofSource === "BUYER" ? " · bukti dari pembeli" : ""
                      }`
                    : open
                      ? `Berlaku ${countdown(link.expiresAt)}`
                      : dateTime(link.createdAt)}
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="num text-[15px] font-semibold">{money(link.qrisAmount)}</div>
                <div className="mt-1">
                  <Pill tone={statusTone(link)}>{statusLabel(link)}</Pill>
                </div>
              </div>
            </div>

            {/* Whether the buyer ever opened it is the whole point of this list. */}
            {open && (
              <div className="flex items-center gap-2 border-t border-line px-4 py-2 text-[13px] text-ink-mute">
                {link.firstViewedAt ? (
                  <>
                    <Eye className="h-3.5 w-3.5 shrink-0" />
                    Dibuka pembeli {dateTime(link.firstViewedAt)}
                  </>
                ) : (
                  <>
                    <EyeOff className="h-3.5 w-3.5 shrink-0" />
                    Belum dibuka pembeli
                  </>
                )}
              </div>
            )}

            {link.code && (
              <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-2.5">
                <span className="num truncate text-[15px] font-semibold tracking-[0.05em]">
                  {link.code}
                </span>
                <button
                  aria-label="Salin kode"
                  onClick={async () => {
                    if (await copy(link.code!)) toast("Kode disalin");
                  }}
                  className="rounded p-2 text-ink-mute hover:bg-black/[0.04]"
                >
                  <Copy className="h-4 w-4" />
                </button>
              </div>
            )}

            {open && (
              <div className="flex items-center justify-between gap-3 border-t border-line bg-black/[0.015] px-4 py-2">
                <button
                  onClick={async () => {
                    if (await copy(url)) toast("Tautan disalin");
                  }}
                  className="flex items-center gap-1.5 text-[13px] font-semibold text-ink-soft"
                >
                  <Copy className="h-3.5 w-3.5" />
                  Salin tautan
                </button>
                <a
                  href={whatsappUrl(
                    `Pembayaran SellMore ${link.planName} — ${money(link.qrisAmount)}\n${url}`,
                  )}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 text-[13px] font-semibold text-ink-soft"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  Kirim ulang
                </a>
              </div>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function statusLabel(link: Links[number]): string {
  if (link.status === "PAID") {
    if (link.verification === "PENDING") return "Cek bukti";
    if (link.verification === "REJECTED") return "Ditolak";
    return "Lunas";
  }
  if (link.status === "SHARED") return link.firstViewedAt ? "Dibuka" : "Terkirim";
  return link.status === "EXPIRED" ? "Kedaluwarsa" : "Gagal";
}

function statusTone(link: Links[number]): "accent" | "good" | "warn" | "neutral" | "ink" {
  if (link.status === "PAID") {
    if (link.verification === "PENDING") return "accent";
    if (link.verification === "REJECTED") return "warn";
    return "good";
  }
  if (link.status === "SHARED") return link.firstViewedAt ? "ink" : "neutral";
  return link.status === "FAILED" ? "warn" : "neutral";
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
