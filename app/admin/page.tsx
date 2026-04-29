import { AdminConsole } from "@/components/admin-console";
import { isApplePassEnabled } from "@/lib/wallet-features";

export default function AdminPage() {
  return <AdminConsole applePassEnabled={isApplePassEnabled()} />;
}
