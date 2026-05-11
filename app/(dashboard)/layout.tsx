import { Sidebar, SidebarMobileProvider } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { VeiculosProvider } from "@/lib/store/veiculos-context";
import { AgendamentosProvider } from "@/lib/store/agendamentos-context";
import { ConfirmacaoProvider } from "@/components/confirmacao-provider";
import { GuardaRota } from "@/components/guarda-rota";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <VeiculosProvider>
      <AgendamentosProvider>
        <ConfirmacaoProvider>
          <SidebarMobileProvider>
            <div className="flex h-screen w-screen overflow-hidden">
              <Sidebar />
              <div className="flex-1 flex flex-col overflow-hidden">
                <Topbar />
                <main className="flex-1 overflow-auto">
                  <GuardaRota>{children}</GuardaRota>
                </main>
              </div>
            </div>
          </SidebarMobileProvider>
        </ConfirmacaoProvider>
      </AgendamentosProvider>
    </VeiculosProvider>
  );
}
