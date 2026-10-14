"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuthStore } from "@/stores/auth.store";

export function AuthGuard({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const user = useAuthStore((state) => state.user);
  const isLoading = useAuthStore((state) => state.isLoading);
  const isHydrated = useAuthStore((state) => state.isHydrated);
  const isLoginPage = pathname === "/login";

  useEffect(() => {
    if (!isHydrated || isLoading) {
      return;
    }

    if (!user && !isLoginPage) {
      router.replace("/login");
    } else if (user && isLoginPage) {
      router.replace("/");
    }
  }, [isHydrated, isLoading, isLoginPage, router, user]);

  if (!isHydrated || isLoading || (!user && !isLoginPage) || (user && isLoginPage)) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-slate-100">
        <p className="text-sm text-slate-600">Verificando sesión...</p>
      </main>
    );
  }

  return children;
}
