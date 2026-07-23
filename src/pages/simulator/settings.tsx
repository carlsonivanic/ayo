import { useRouter } from "next/router";
import { SimConfigPage } from "@/components/sim/SimConfigPage";

/**
 * Public simulator settings route. No auth, no Convex — edits persist to
 * localStorage on this device.
 */
export default function SimulatorSettingsPage() {
  const router = useRouter();
  return <SimConfigPage onBack={() => router.push("/simulator")} />;
}
