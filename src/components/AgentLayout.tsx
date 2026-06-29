import { ReactNode } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { AgentStatusBadge } from "@/components/StatusBadge";
import { Button } from "@/components/ui/button";
import { LEVEL_LABEL } from "@/lib/format";
import {
  Home,
  PlusCircle,
  History,
  Store,
  Wallet,
  Bell,
  LogOut,
  Loader2,
} from "lucide-react";

const TABS: { href: string; label: string; icon: typeof Home }[] = [
  { href: "/app", label: "Beranda", icon: Home },
  { href: "/app/generate", label: "Buat Kode", icon: PlusCircle },
  { href: "/app/codes", label: "Riwayat", icon: History },
  { href: "/app/merchants", label: "Merchant", icon: Store },
  { href: "/app/earnings", label: "Komisi", icon: Wallet },
];

function Shell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { signOut } = useAuthActions();
  const me = useQuery(api.agentAuth.me);
  // Only fetch agent-scoped data once we've confirmed the user IS an agent —
  // otherwise the query's requireAgent guard throws for admins / loading users.
  const notif = useQuery(
    api.portal.notifications.myNotifications,
    me ? {} : "skip",
  );

  // Authenticated but not an agent (e.g. an admin account) → send to admin app.
  if (me === null) {
    if (typeof window !== "undefined") router.replace("/");
    return null;
  }

  if (me === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const unread = notif?.unreadCount ?? 0;

  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col bg-muted/20">
      {/* Top bar */}
      <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground">
            AYO
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold">{me.name}</div>
            <div className="text-[11px] text-muted-foreground">
              {LEVEL_LABEL[me.level] ?? `L${me.level}`} · {me.regionCode}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <AgentStatusBadge status={me.status} />
          <Link
            href="/app/notifications"
            className="relative rounded-md p-2 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
            aria-label="Notifikasi"
          >
            <Bell className="h-5 w-5" />
            {unread > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-medium text-destructive-foreground">
                {unread > 9 ? "9+" : unread}
              </span>
            )}
          </Link>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => signOut()}
            aria-label="Keluar"
          >
            <LogOut className="h-5 w-5" />
          </Button>
        </div>
      </header>

      {/* Content */}
      <main className="flex-1 px-4 py-4 pb-24">{children}</main>

      {/* Bottom tab bar */}
      <nav className="fixed inset-x-0 bottom-0 z-10 mx-auto flex max-w-md justify-around border-t bg-background">
        {TABS.map((t) => {
          const active =
            t.href === "/app"
              ? router.pathname === "/app"
              : router.pathname.startsWith(t.href);
          const Icon = t.icon;
          return (
            <Link
              key={t.href}
              href={t.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium transition-colors",
                active
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <Icon className="h-5 w-5" />
              {t.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function AgentLayout({
  children,
  title,
  subtitle,
  actions,
}: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  const router = useRouter();
  return (
    <>
      <AuthLoading>
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </AuthLoading>
      <Unauthenticated>
        <RedirectToLogin router={router} />
      </Unauthenticated>
      <Authenticated>
        <Shell>
          {(title || actions) && (
            <header className="mb-4 flex items-end justify-between gap-3">
              <div>
                {title && (
                  <h1 className="text-xl font-semibold tracking-tight">
                    {title}
                  </h1>
                )}
                {subtitle && (
                  <p className="mt-0.5 text-sm text-muted-foreground">
                    {subtitle}
                  </p>
                )}
              </div>
              {actions}
            </header>
          )}
          {children}
        </Shell>
      </Authenticated>
    </>
  );
}

function RedirectToLogin({ router }: { router: ReturnType<typeof useRouter> }) {
  if (typeof window !== "undefined" && router.pathname !== "/app/login") {
    router.replace("/app/login");
  }
  return null;
}
