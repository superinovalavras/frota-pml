"use client";

import { createContext, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { usePerfil } from "@/lib/perfil-context";
import { useBranding } from "@/lib/store/branding-context";
import { navItemsParaPerfil } from "@/lib/navigation";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";

interface SidebarMobileCtx {
  aberto: boolean;
  abrir: () => void;
  fechar: () => void;
}

const SidebarMobileContext = createContext<SidebarMobileCtx | null>(null);

export function SidebarMobileProvider({ children }: { children: ReactNode }) {
  const [aberto, setAberto] = useState(false);
  const value = useMemo<SidebarMobileCtx>(
    () => ({
      aberto,
      abrir: () => setAberto(true),
      fechar: () => setAberto(false),
    }),
    [aberto],
  );
  return (
    <SidebarMobileContext.Provider value={value}>
      {children}
    </SidebarMobileContext.Provider>
  );
}

export function useSidebarMobile(): SidebarMobileCtx {
  const ctx = useContext(SidebarMobileContext);
  if (!ctx) {
    // Fallback no-op para evitar crash se o provider faltar (ex.: rota auth).
    return { aberto: false, abrir: () => {}, fechar: () => {} };
  }
  return ctx;
}

export function Sidebar() {
  const { usuario } = usePerfil();
  const items = navItemsParaPerfil(usuario.perfil);
  const { aberto, fechar } = useSidebarMobile();

  return (
    <>
      <aside className="hidden md:flex md:flex-col md:w-64 border-r bg-sidebar text-sidebar-foreground">
        <ConteudoSidebar items={items} />
      </aside>

      <Sheet open={aberto} onOpenChange={(o) => !o && fechar()}>
        <SheetContent
          side="left"
          className="w-72 p-0 bg-sidebar text-sidebar-foreground"
        >
          <SheetHeader className="sr-only">
            <SheetTitle>Menu de navegação</SheetTitle>
          </SheetHeader>
          <div className="h-full flex flex-col" onClick={fechar}>
            <ConteudoSidebar items={items} />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}

function ConteudoSidebar({
  items,
}: {
  items: ReturnType<typeof navItemsParaPerfil>;
}) {
  const pathname = usePathname();
  const { logoUrl } = useBranding();
  return (
    <>
      <div className="px-5 pt-5 pb-3">
        <Link
          href="/agenda"
          className="flex items-center gap-3 group"
          aria-label="Ir para a Agenda"
        >
          <div
            className={cn(
              "size-12 flex items-center justify-center shadow-md ring-1 transition-transform group-hover:scale-105 shrink-0 overflow-hidden",
              // Logo personalizada: círculo sem padding — a imagem preenche
              // todo o espaço (a logo é recortada em moldura redonda).
              logoUrl
                ? "rounded-full bg-white ring-border"
                : "rounded-2xl p-1.5 bg-pml-blue ring-pml-blue/20",
            )}
          >
            {logoUrl ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={logoUrl}
                alt="Logo"
                className="w-full h-full object-cover"
              />
            ) : (
              <Image
                src="/marca/escudo-branco.png"
                alt="Prefeitura de Lavras"
                width={48}
                height={48}
                className="w-full h-full object-contain"
                priority
              />
            )}
          </div>
          <div className="flex flex-col leading-tight min-w-0">
            <span className="font-black text-base tracking-tight uppercase">
              FROTA PML
            </span>
            <span className="text-[11px] text-muted-foreground truncate">
              Prefeitura Municipal de Lavras
            </span>
          </div>
        </Link>
        <div className="mt-3 h-1 rounded-full pml-faixa" />
      </div>

      <nav className="flex-1 px-3 py-3 space-y-1 overflow-y-auto">
        {items.map((item) => {
          const ativo =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                ativo
                  ? "bg-primary/10 text-primary"
                  : "text-sidebar-foreground/75 hover:bg-foreground/[0.04] hover:text-sidebar-foreground",
              )}
            >
              {ativo && (
                <span
                  aria-hidden
                  className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-full bg-primary"
                />
              )}
              <Icon
                className={cn("size-4 shrink-0", ativo && "text-primary")}
              />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-4 py-3 border-t flex items-center justify-between text-[11px] text-muted-foreground">
        <span>FROTA PML · v1.0</span>
        <span className="inline-flex items-center gap-1.5">
          <span className="size-2 rounded-full bg-pml-blue" />
          <span className="size-2 rounded-full bg-pml-yellow" />
        </span>
      </div>
    </>
  );
}
