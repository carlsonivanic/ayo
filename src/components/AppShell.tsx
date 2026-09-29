import { useQuery } from "convex/react";
import {
  Banknote,
  Bell,
  BookMarked,
  CalendarClock,
  ChevronLeft,
  CircleUserRound,
  CreditCard,
  FileBarChart,
  Home,
  Map,
  Megaphone,
  Network,
  MoreHorizontal,
  Receipt,
  Send,
  Settings2,
  QrCode,
  ShieldCheck,
  Store,
  Tags,
  Ticket,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/router";
import { ReactNode, useState } from "react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { Sheet } from "./ui/Feedback";

type Item = { href: string; label: string; icon: typeof Home };

const NAV: Record<string, { primary: Item[]; more: Item[] }> = {
  L1: {
    primary: [
      { href: "/l1", label: "Beranda", icon: Home },
      { href: "/l1/jual", label: "Jual", icon: Send },
      { href: "/l1/kode", label: "Kode", icon: Ticket },
      { href: "/l1/pelanggan", label: "Pelanggan", icon: Store },
      { href: "/l1/penghasilan", label: "Penghasilan", icon: Wallet },
    ],
    more: [],
  },
  L2: {
    primary: [
      { href: "/l2", label: "Beranda", icon: Home },
      { href: "/l2/tim", label: "Tim", icon: Users },
      { href: "/l2/undang", label: "Undang", icon: UserPlus },
      { href: "/l2/pelanggan", label: "Pelanggan", icon: Store },
      { href: "/l2/penghasilan", label: "Penghasilan", icon: Wallet },
    ],
    more: [],
  },
  ADMIN: {
    primary: [
      { href: "/admin", label: "Beranda", icon: Home },
      { href: "/admin/pengguna", label: "Pengguna", icon: Users },
      { href: "/admin/komisi", label: "Komisi", icon: Receipt },
      { href: "/admin/payout", label: "Payout", icon: Banknote },
    ],
    more: [
      { href: "/admin/tim", label: "Tim", icon: Network },
      { href: "/admin/merchant", label: "Merchant", icon: Store },
      { href: "/admin/laporan", label: "Laporan", icon: FileBarChart },
      { href: "/admin/harga", label: "Harga", icon: Tags },
      { href: "/admin/skema", label: "Skema", icon: Settings2 },
      { href: "/admin/pembayaran", label: "Pembayaran", icon: CreditCard },
      { href: "/admin/qris", label: "QRIS", icon: QrCode },
      { href: "/admin/tutup-bulan", label: "Tutup bulan", icon: CalendarClock },
      { href: "/admin/pengumuman", label: "Pengumuman", icon: Megaphone },
      { href: "/admin/peta", label: "Peta", icon: Map },
      { href: "/admin/audit", label: "Audit", icon: ShieldCheck },
    ],
  },
};

export function AppShell({
  title,
  back,
  action,
  children,
}: {
  title: string;
  back?: string;
  action?: ReactNode;
  children: ReactNode;
}) {
  const router = useRouter();
  const me = useQuery(api.users.me);
  const unread = useQuery(api.notifications.unreadCount);
  const [moreOpen, setMoreOpen] = useState(false);

  const nav = me?.role ? NAV[me.role] : undefined;
  const matches = (href: string) =>
    href === router.pathname || (href !== "/" && router.pathname.startsWith(`${href}/`));
  // Section roots ("/admin", "/l1") prefix every sibling, so the most specific
  // match wins — otherwise Beranda stays lit on every page.
  const isActive = (href: string) =>
    matches(href) &&
    !(nav ? [...nav.primary, ...nav.more] : []).some(
      (i) => i.href.length > href.length && matches(i.href),
    );

  return (
    <div className="min-h-[100dvh] bg-paper">
      {/* Desktop rail. Phones get the bottom bar instead. */}
      {nav && (
        <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col border-r border-line bg-surface px-3 py-5 lg:flex">
          <Link href="/" className="mb-6 flex items-center gap-2 px-2">
            <Wordmark />
          </Link>
          <nav className="flex flex-1 flex-col gap-0.5">
            {[...nav.primary, ...nav.more].map((item) => (
              <RailLink key={item.href} item={item} active={isActive(item.href)} />
            ))}
          </nav>
          <Link
            href="/profil"
            className="mt-2 flex items-center gap-2 rounded px-3 py-2 text-[14px] text-ink-soft hover:bg-black/[0.04]"
          >
            <BookMarked className="h-4 w-4" />
            Profil
          </Link>
        </aside>
      )}

      <div className={cn(nav && "lg:pl-56")}>
        <header className="sticky top-0 z-20 border-b border-line bg-paper/90 backdrop-blur">
          <div className="mx-auto flex h-14 max-w-3xl items-center gap-2 px-4">
            {back ? (
              <Link
                href={back}
                aria-label="Kembali"
                className="-ml-2 rounded p-2 text-ink-soft hover:bg-black/[0.04]"
              >
                <ChevronLeft className="h-5 w-5" />
              </Link>
            ) : (
              <span className="lg:hidden">
                <Wordmark compact />
              </span>
            )}
            <h1 className="flex-1 truncate text-[17px] font-semibold tracking-[-0.01em]">
              {back ? title : <span className="sr-only lg:not-sr-only">{title}</span>}
            </h1>
            {action}
            <Link
              href="/notifikasi"
              aria-label="Notifikasi"
              className="relative rounded p-2 text-ink-soft hover:bg-black/[0.04]"
            >
              <Bell className="h-5 w-5" />
              {!!unread && unread > 0 && (
                <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-accent ring-2 ring-paper" />
              )}
            </Link>
            {/* Phones have no rail, and roles without a "Lainnya" sheet would
                otherwise have no route to /profil — and so no way to sign out. */}
            {nav && (
              <Link
                href="/profil"
                aria-label="Profil"
                className="rounded p-2 text-ink-soft hover:bg-black/[0.04] lg:hidden"
              >
                <CircleUserRound className="h-5 w-5" />
              </Link>
            )}
          </div>
          {!back && (
            <div className="mx-auto max-w-3xl px-4 pb-3 lg:hidden">
              <h1 className="text-[22px] font-semibold tracking-[-0.02em]">{title}</h1>
            </div>
          )}
        </header>

        <main className="mx-auto max-w-3xl px-4 pb-28 pt-4 lg:pb-12">{children}</main>
      </div>

      {nav && (
        <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-3xl">
            {nav.primary.map((item) => (
              <TabLink key={item.href} item={item} active={isActive(item.href)} />
            ))}
            {nav.more.length > 0 && (
              <button
                onClick={() => setMoreOpen(true)}
                className="flex flex-1 flex-col items-center gap-1 py-2.5 text-ink-mute"
              >
                <MoreHorizontal className="h-[22px] w-[22px]" />
                <span className="text-[11px] font-medium">Lainnya</span>
              </button>
            )}
          </div>
        </nav>
      )}

      <Sheet open={moreOpen} onClose={() => setMoreOpen(false)} title="Lainnya">
        <div className="-mx-4">
          {nav?.more.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMoreOpen(false)}
              className="flex items-center gap-3 border-b border-line px-4 py-3 text-[15px] last:border-0"
            >
              <item.icon className="h-5 w-5 text-ink-mute" />
              {item.label}
            </Link>
          ))}
          <Link
            href="/profil"
            onClick={() => setMoreOpen(false)}
            className="flex items-center gap-3 px-4 py-3 text-[15px]"
          >
            <BookMarked className="h-5 w-5 text-ink-mute" />
            Profil
          </Link>
        </div>
      </Sheet>
    </div>
  );
}

function RailLink({ item, active }: { item: Item; active: boolean }) {
  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-2.5 rounded px-3 py-2 text-[14px] font-medium",
        active ? "bg-ink text-white" : "text-ink-soft hover:bg-black/[0.04]",
      )}
    >
      <item.icon className="h-4 w-4" />
      {item.label}
    </Link>
  );
}

function TabLink({ item, active }: { item: Item; active: boolean }) {
  return (
    <Link
      href={item.href}
      className={cn(
        "flex flex-1 flex-col items-center gap-1 py-2.5",
        active ? "text-ink" : "text-ink-mute",
      )}
    >
      <item.icon className={cn("h-[22px] w-[22px]", active && "stroke-[2.2]")} />
      <span className="text-[11px] font-medium">{item.label}</span>
    </Link>
  );
}

export function Wordmark({ compact }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-baseline gap-1.5">
      <span className="text-[19px] font-bold tracking-[-0.04em] text-ink">AYO</span>
      {!compact && <span className="h-1.5 w-1.5 translate-y-[-2px] rounded-full bg-accent" />}
    </span>
  );
}
