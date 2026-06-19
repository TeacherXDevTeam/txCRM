import { PocClient } from "@/components/deneme/poc-client";

// PoC sayfası — middleware'de public (login gerektirmez).
export const dynamic = "force-dynamic";

export default function DenemePage() {
  return <PocClient />;
}
