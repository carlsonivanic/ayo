import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "./card";

type IconType = React.ComponentType<{ className?: string }>;

/**
 * Reusable KPI card. Extracted from the inline definition in `src/pages/index.tsx`
 * so the overview and reports pages share one component.
 */
export function Kpi({
  label,
  value,
  icon: Icon,
  hint,
}: {
  label: string;
  value: string;
  icon: IconType;
  hint?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {label}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-semibold tabular-nums">{value}</div>
        {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}
