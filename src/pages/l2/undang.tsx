import { useMutation, useQuery } from "convex/react";
import { Copy, MessageCircle } from "lucide-react";
import { useMemo } from "react";
import { AppShell } from "@/components/AppShell";
import { Guard } from "@/components/Guard";
import { Button } from "@/components/ui/Button";
import { Card, Row, SectionTitle } from "@/components/ui/Card";
import { Empty, Loading, Pill, useToast } from "@/components/ui/Feedback";
import { TickCaption, Ticks } from "@/components/ui/Ticks";
import { api } from "@/convex/_generated/api";
import { date } from "@/lib/format";
import { copy, errorMessage, whatsappUrl } from "@/lib/utils";

export default function UndangPage() {
  return (
    <Guard role="L2">
      <AppShell title="Undang">
        <Body />
      </AppShell>
    </Guard>
  );
}

function Body() {
  const now = useMemo(() => Date.now(), []);
  const recruitment = useQuery(api.team.recruitment, { now });
  const invites = useQuery(api.registration.myInvites);
  const createInvite = useMutation(api.registration.createInvite);
  const revoke = useMutation(api.registration.revokeInvite);
  const toast = useToast();

  const origin = typeof window === "undefined" ? "" : window.location.origin;

  return (
    <div className="space-y-5">
      {recruitment && (
        <Card className="p-4">
          <p className="eyebrow">Target rekrutmen</p>
          <div className="mt-4">
            <Ticks
              value={recruitment.count}
              target={recruitment.target}
              tone={recruitment.count >= recruitment.target ? "good" : "ink"}
            />
            <TickCaption value={recruitment.count} target={recruitment.target} />
          </div>
        </Card>
      )}

      <Button
        block
        onClick={async () => {
          try {
            const { token } = await createInvite({});
            if (await copy(`${origin}/undangan/${token}`)) toast("Tautan undangan disalin");
          } catch (err) {
            toast(errorMessage(err), "warn");
          }
        }}
      >
        Buat tautan undangan
      </Button>

      <div>
        <SectionTitle>Undangan</SectionTitle>
        {!invites ? (
          <Loading />
        ) : invites.length === 0 ? (
          <Empty title="Belum ada undangan dibuat." />
        ) : (
          <Card>
            {invites.map((invite) => {
              const url = `${origin}/undangan/${invite.token}`;
              return (
                <Row
                  key={invite.id}
                  label={invite.usedBy ?? "Belum dipakai"}
                  sub={date(invite.createdAt)}
                  valueSub={
                    <span className="flex items-center gap-1.5">
                      <Pill tone={invite.status === "USED" ? "good" : invite.status === "ACTIVE" ? "accent" : "neutral"}>
                        {invite.status === "USED"
                          ? "Dipakai"
                          : invite.status === "ACTIVE"
                            ? "Aktif"
                            : "Dicabut"}
                      </Pill>
                    </span>
                  }
                  value={
                    invite.status === "ACTIVE" ? (
                      <span className="flex items-center gap-1">
                        <button
                          aria-label="Salin"
                          onClick={async () => {
                            if (await copy(url)) toast("Tautan disalin");
                          }}
                          className="rounded p-1.5 text-ink-mute hover:bg-black/[0.04]"
                        >
                          <Copy className="h-4 w-4" />
                        </button>
                        <a
                          aria-label="WhatsApp"
                          href={whatsappUrl(`Gabung jadi agen SellMore: ${url}`)}
                          target="_blank"
                          rel="noreferrer"
                          className="rounded p-1.5 text-ink-mute hover:bg-black/[0.04]"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </a>
                        <button
                          onClick={() => void revoke({ inviteId: invite.id })}
                          className="rounded px-2 py-1 text-[12px] font-semibold text-ink-mute hover:bg-black/[0.04]"
                        >
                          Cabut
                        </button>
                      </span>
                    ) : undefined
                  }
                />
              );
            })}
          </Card>
        )}
      </div>

      {recruitment && recruitment.invitees.length > 0 && (
        <div>
          <SectionTitle helper="Dihitung saat L1 disetujui dan aktif.">Direkrut</SectionTitle>
          <Card>
            {recruitment.invitees.map((invitee) => (
              <Row
                key={invitee.id}
                label={invitee.name}
                sub={invitee.approvedAt ? date(invitee.approvedAt) : "Menunggu"}
                valueSub={
                  <Pill tone={invitee.countedThisMonth ? "good" : "neutral"}>
                    {invitee.status}
                  </Pill>
                }
              />
            ))}
          </Card>
        </div>
      )}
    </div>
  );
}
