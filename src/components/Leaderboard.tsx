import { Trophy } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card } from "./ui/Card";

// National leaderboard for the current month. The count is verified sales, the
// same basis as the chart above it, so the two never disagree. Only a name, the
// L2's initials and a count — never another agent's money.

export type LeaderRow = {
  rank: number;
  name: string;
  l2: string | null;
  sold: number;
  isMe: boolean;
};

export type LeaderboardData = {
  period: string;
  totalAgents: number;
  top10: LeaderRow[];
  self: LeaderRow | null;
  selfInTop10: boolean;
};

export function Leaderboard({ data }: { data: LeaderboardData }) {
  const self = data.self;

  return (
    <Card>
      <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
        <div>
          <div className="eyebrow">Papan peringkat</div>
          <p className="mt-1 text-[15px] font-semibold">
            {self ? (
              <>
                Terjual bulan ini: <span className="num">{self.sold}</span> · Peringkat{" "}
                <span className="num">#{self.rank}</span> dari{" "}
                <span className="num">{data.totalAgents}</span>
              </>
            ) : (
              "Belum ada penjualan bulan ini"
            )}
          </p>
        </div>
        <Trophy className="mt-0.5 h-5 w-5 shrink-0 text-ink-faint" />
      </div>

      {data.top10.length === 0 ? (
        <div className="px-4 py-8 text-center text-[13px] text-ink-mute">
          Belum ada agen aktif bulan ini.
        </div>
      ) : (
        <ol>
          {data.top10.map((row, index) => (
            <Row key={`${row.rank}-${row.name}-${index}`} row={row} />
          ))}
          {!data.selfInTop10 && self && (
            <>
              <li className="border-b border-line bg-paper px-4 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-ink-faint">
                Peringkat kamu
              </li>
              <Row row={self} />
            </>
          )}
        </ol>
      )}
    </Card>
  );
}

function Row({ row }: { row: LeaderRow }) {
  return (
    <li
      className={cn(
        "flex items-center gap-3 border-b border-line px-4 py-2.5 last:border-0",
        row.isMe && "bg-accent-soft/60",
      )}
    >
      <span
        className={cn(
          "num w-7 shrink-0 text-[13px] font-semibold",
          row.rank === 1 ? "text-ink" : "text-ink-faint",
        )}
      >
        {row.rank}
      </span>
      <span className="min-w-0 flex-1 truncate text-[14px] font-medium">
        {row.name}
        {row.l2 && <span className="ml-1 text-[12px] text-ink-mute">({row.l2})</span>}
        {row.isMe && (
          <span className="ml-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-accent-ink">
            Kamu
          </span>
        )}
      </span>
      <span className="num shrink-0 text-[14px] font-semibold">{row.sold}</span>
    </li>
  );
}
