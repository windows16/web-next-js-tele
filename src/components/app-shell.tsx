"use client";

import { LogOut, Package, ReceiptText, Users } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/button";

export type AppSection = "dashboard" | "clientes" | "productos" | "ventas";

const navigation: Array<{ id: AppSection; label: string; icon: typeof Users }> = [
  { id: "dashboard", label: "Resumen", icon: ReceiptText },
  { id: "clientes", label: "Clientes", icon: Users },
  { id: "productos", label: "Productos", icon: Package },
  { id: "ventas", label: "Ventas", icon: ReceiptText },
];

export function AppShell({
  activeSection,
  onSectionChange,
  children,
}: {
  activeSection: AppSection;
  onSectionChange: (section: AppSection) => void;
  children: ReactNode;
}) {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await logout();
      router.replace("/login");
      router.refresh();
    } finally {
      setIsLoggingOut(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-lg font-semibold tracking-tight">Gestión y auditoría</p>
            <p className="text-xs text-muted-foreground">Operación comercial</p>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground md:block">{user?.email}</span>
            <Button variant="outline" disabled={isLoggingOut} onClick={() => void handleLogout()}>
              <LogOut />
              Cerrar sesión
            </Button>
          </div>
        </div>
      </header>
      <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-8 lg:flex-row">
        <nav className="flex gap-2 overflow-x-auto lg:w-52 lg:flex-col">
          {navigation.map(({ id, label, icon: Icon }) => (
            <button
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                activeSection === id
                  ? "bg-slate-900 text-white"
                  : "text-slate-600 hover:bg-white hover:text-slate-900"
              }`}
              key={id}
              onClick={() => onSectionChange(id)}
              type="button"
            >
              <Icon className="size-4" />
              {label}
            </button>
          ))}
        </nav>
        <section className="min-w-0 flex-1">{children}</section>
      </div>
    </main>
  );
}
