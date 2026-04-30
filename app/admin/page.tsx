import { AdminConsole } from "@/components/admin-console";
import { isApplePassEnabled, isGoogleWalletEnabled } from "@/lib/wallet-features";

export default function AdminPage() {
  return <AdminConsole applePassEnabled={isApplePassEnabled()} googleWalletEnabled={isGoogleWalletEnabled()} />;
}
