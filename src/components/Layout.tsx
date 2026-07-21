import { ReactNode, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { useQuery } from "convex/react";
import { useAuthActions } from "@convex-dev/auth/react";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  LayoutDashboard,
  Users,
  Ticket,
  Wallet,
  SlidersHorizontal,
  LogOut,
  Loader2,
  Menu,
} from "lucide-react";

type Role = "super_admin" | "finance_admin" | "ops_admin";

const NAV: {
  href: string;
  label: string;
  icon: typeof Users;
  roles?: Role[];
}[] = [
  { href: "/", label: "Ringkasan", icon: LayoutDashboard },
  { href: "/agents", label: "User Management", icon: Users },
  { href: "/codes", label: "Kode Langganan", icon: Ticket },
  { href: "/reports", label: "Laporan", icon: Wallet },
  {
    href: "/settings",
    label: "Parameter",
    icon: SlidersHorizontal,
    roles: ["super_admin"],
  },
];

const ROLE_LABEL: Record<Role, string> = {
  super_admin: "Super Admin",
  finance_admin: "Finance Admin",
  ops_admin: "Ops Admin",
};

function Shell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { signOut } = useAuthActions();
  const me = useQuery(api.admins.me);
  const agentMe = useQuery(api.agentAuth.me);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Not an admin. A salesperson account belongs in the Agent Portal.
  if (me === null && agentMe) {
    if (typeof window !== "undefined") router.replace("/app");
    return null;
  }

  // Still resolving whether this user is an agent — avoid flashing the
  // "pending approval" screen at a salesperson.
  if (me === null && agentMe === undefined) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Authenticated but no admin profile and not an agent → access pending.
  if (me === null) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-semibold">Akses menunggu persetujuan</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Akun kamu sudah masuk, tetapi belum diberi peran admin. Hubungi
            super admin untuk diberikan akses, atau jalankan{" "}
            <code className="rounded bg-muted px-1">seed:grantAdmin</code>.
          </p>
          <Button variant="outline" className="mt-4" onClick={() => signOut()}>
            <LogOut /> Keluar
          </Button>
        </div>
      </div>
    );
  }

  const role = me?.role as Role | undefined;
  const nav = NAV.filter((n) => !n.roles || (role && n.roles.includes(role)));

  const brand = (
    <div className="flex h-14 items-center gap-2 border-b px-5">
      <Link
        href="/"
        aria-label="Beranda"
        className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground transition-opacity hover:opacity-90"
      >
        AYO
      </Link>
      <span className="text-sm font-semibold">Admin Console</span>
    </div>
  );

  const navLinks = (onNavigate?: () => void) => (
    <nav className="flex-1 space-y-1 p-3">
      {nav.map((item) => {
        const active =
          item.href === "/"
            ? router.pathname === "/"
            : router.pathname.startsWith(item.href);
        const Icon = item.icon;
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
            )}
          >
            <Icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );

  const footer = (
    <div className="border-t p-3">
      <div className="px-2 pb-1 text-xs text-muted-foreground">
        <div className="font-medium text-foreground">{me?.name}</div>
        {role ? ROLE_LABEL[role] : ""}
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-muted/30">
      <aside className="hidden w-60 shrink-0 flex-col border-r bg-background md:flex">
        {brand}
        {navLinks()}
        {footer}
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b bg-background px-4 md:hidden">
          <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Buka menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex w-64 flex-col p-0">
              <SheetTitle className="sr-only">Menu navigasi</SheetTitle>
              {brand}
              {navLinks(() => setMobileNavOpen(false))}
              {footer}
            </SheetContent>
          </Sheet>
          <div className="flex items-center gap-2">
            <Link
              href="/"
              aria-label="Beranda"
              className="flex h-7 w-7 items-center justify-center rounded-md bg-primary text-xs font-bold text-primary-foreground transition-opacity hover:opacity-90"
            >
              AYO
            </Link>
            <span className="text-sm font-semibold">Admin Console</span>
          </div>
        </header>

        <main className="flex-1 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}

export function Layout({
  children,
  title,
  subtitle,
  actions,
}: {
  children: ReactNode;
  title: string;
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
          <div className="mx-auto max-w-7xl px-6 py-6">
            <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
                {subtitle && (
                  <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
                )}
              </div>
              <div className="ml-auto flex items-center gap-2">
                {actions}
                <HeaderLogout />
              </div>
            </header>
            {children}
          </div>
        </Shell>
      </Authenticated>
    </>
  );
}

/** Top-right logout affordance for the admin content header. */
function HeaderLogout() {
  const { signOut } = useAuthActions();
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => signOut()}
      aria-label="Keluar"
      title="Keluar"
    >
      <LogOut className="h-5 w-5" />
    </Button>
  );
}

function RedirectToLogin({ router }: { router: ReturnType<typeof useRouter> }) {
  if (typeof window !== "undefined" && router.pathname !== "/login") {
    router.replace("/login");
  }
  return null;
}
