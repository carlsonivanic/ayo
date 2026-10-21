import { Download } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Guard } from "@/components/Guard";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Feedback";
import { Field, Input } from "@/components/ui/Form";
import { Tabs } from "@/components/ui/Tabs";
import { BANNER_FONTS, BANNER_SIZES, BannerInfo, buildBanner } from "@/lib/banner";
import { isPhone, makeBannerPdf, saveBannerPdf } from "@/lib/bannerPdf";

// Every role makes banners for their stores; nothing is stored.
export default function BannerPage() {
  return (
    <Guard>
      <AppShell title="Banner">
        <Body />
      </AppShell>
    </Guard>
  );
}

const FONT_CSS = Object.entries(BANNER_FONTS)
  .map(([family, file]) => `@font-face{font-family:${family};src:url(/banner/fonts/${file}.ttf)}`)
  .join("");

type SizeId = (typeof BANNER_SIZES)[number]["id"];

function Body() {
  const toast = useToast();
  const [sizeId, setSizeId] = useState<SizeId>("3x1");
  const [info, setInfo] = useState<BannerInfo>({
    storeName: "",
    whatsapp: "",
    instagram: "",
    facebook: "",
  });
  const [busy, setBusy] = useState(false);
  // Finished PDF for the current design, waiting for the phone's second tap.
  const [ready, setReady] = useState<{ svg: string; blob: Blob; name: string } | null>(null);

  const size = BANNER_SIZES.find((s) => s.id === sizeId)!;
  const svg = useMemo(() => buildBanner(size, info), [size, info]);
  const set = (key: keyof BannerInfo) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setInfo((prev) => ({ ...prev, [key]: e.target.value }));

  const pending = ready?.svg === svg ? ready : null;

  async function download() {
    if (pending) {
      saveBannerPdf(pending.blob, pending.name);
      return;
    }
    setBusy(true);
    try {
      const slug = info.storeName.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-") || "toko";
      const name = `banner-${slug}-${size.id}m.pdf`;
      const blob = await makeBannerPdf(size, info);
      if (isPhone()) setReady({ svg, blob, name });
      else saveBannerPdf(blob, name);
    } catch (err) {
      console.error(err);
      toast("Gagal membuat PDF");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <style>{FONT_CSS}</style>
      <Tabs<SizeId>
        value={sizeId}
        onChange={setSizeId}
        options={BANNER_SIZES.map((s) => ({ value: s.id, label: s.label }))}
      />

      <Card className="overflow-hidden">
        <div
          className="[&>svg]:block [&>svg]:h-auto [&>svg]:w-full"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </Card>

      <Card className="space-y-4 p-4">
        <Field label="Nama toko">
          <Input value={info.storeName} onChange={set("storeName")} placeholder="Nama Toko" />
        </Field>
        <Field label="WhatsApp">
          <Input
            value={info.whatsapp}
            onChange={set("whatsapp")}
            inputMode="tel"
            placeholder="Opsional"
          />
        </Field>
        <Field label="Instagram">
          <Input value={info.instagram} onChange={set("instagram")} placeholder="Opsional" />
        </Field>
        <Field label="Facebook">
          <Input value={info.facebook} onChange={set("facebook")} placeholder="Opsional" />
        </Field>
      </Card>

      <Button block onClick={download} disabled={busy}>
        <Download className="h-4 w-4" />
        {busy ? "Membuat PDF…" : pending ? "Simpan PDF" : `Unduh PDF ${size.label}`}
      </Button>
    </div>
  );
}
