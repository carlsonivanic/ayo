import { useRouter } from "next/router";
import Link from "next/link";
import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { ArrowRight, Loader2, ShieldCheck, Briefcase } from "lucide-react";

function Choice({
  href,
  icon: Icon,
  title,
  description,
}: {
  href: string;
  icon: typeof ShieldCheck;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="group flex flex-col rounded-xl border bg-background p-6 text-left shadow-sm transition-all hover:border-primary hover:shadow-md"
    >
      <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="h-6 w-6" />
      </div>
      <h2 className="text-base font-semibold">{title}</h2>
      <p className="mt-1 flex-1 text-sm text-muted-foreground">{description}</p>
      <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
        Masuk
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

function Landing() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/30 p-6">
      <div className="w-full max-w-2xl">
        <div className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-lg font-bold text-primary-foreground">
            AYO
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Selamat datang di AYO
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Platform jaringan agen & langganan Sell More. Pilih cara kamu masuk.
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Choice
            href="/login"
            icon={ShieldCheck}
            title="Masuk sebagai Admin"
            description="Kelola jaringan agen, kode langganan, komisi, dan parameter sistem."
          />
          <Choice
            href="/app/login"
            icon={Briefcase}
            title="Masuk sebagai Salesperson"
            description="Buat kode, kelola merchant, dan pantau komisi kamu."
          />
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          Belum punya akun salesperson?{" "}
          <Link href="/daftar" className="font-medium text-primary underline">
            Daftar di sini
          </Link>
        </p>
      </div>
    </div>
  );
}

function FullScreenSpinner() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

/**
 * An already signed-in visitor doesn't need the chooser — send them to the
 * dashboard root, where RouteGuard routes them to the app they belong to.
 */
function RedirectSignedIn() {
  const router = useRouter();
  if (typeof window !== "undefined") router.replace("/");
  return <FullScreenSpinner />;
}

export default function WelcomePage() {
  return (
    <>
      <AuthLoading>
        <FullScreenSpinner />
      </AuthLoading>
      <Unauthenticated>
        <Landing />
      </Unauthenticated>
      <Authenticated>
        <RedirectSignedIn />
      </Authenticated>
    </>
  );
}
