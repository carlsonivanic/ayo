import { Badge } from "@/components/ui/badge";
import { AGENT_STATUS, CODE_STATUS } from "@/lib/format";

export function AgentStatusBadge({ status }: { status: string }) {
  const s = AGENT_STATUS[status] ?? { label: status, tone: "slate" as const };
  return <Badge tone={s.tone}>{s.label}</Badge>;
}

export function CodeStatusBadge({ status }: { status: string }) {
  const s = CODE_STATUS[status] ?? { label: status, tone: "slate" as const };
  return <Badge tone={s.tone}>{s.label}</Badge>;
}
