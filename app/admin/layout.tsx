import type { ReactNode } from "react";

import { Navbar } from "@/components/navbar";
import { Providers } from "@/components/providers";

export default function AdminLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <Providers>
      <Navbar />
      {children}
    </Providers>
  );
}
