import type { Metadata } from "next";
import { Outfit, Geist_Mono } from "next/font/google";
import "./globals.css";
import { FuncoesProvider } from "@/lib/store/funcoes-context";
import { OrgaosProvider } from "@/lib/store/orgaos-context";
import { SuperintendenciasProvider } from "@/lib/store/superintendencias-context";
import { UsuariosProvider } from "@/lib/store/usuarios-context";
import { PerfilProvider } from "@/lib/perfil-context";
import { BrandingProvider } from "@/lib/store/branding-context";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "FROTA PML — Gestão de Veículos",
  description:
    "Sistema de gestão e agendamento de veículos da Prefeitura Municipal de Lavras",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      className={`${outfit.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        <BrandingProvider>
          <FuncoesProvider>
            <OrgaosProvider>
              <SuperintendenciasProvider>
                <UsuariosProvider>
                  <PerfilProvider>{children}</PerfilProvider>
                </UsuariosProvider>
              </SuperintendenciasProvider>
            </OrgaosProvider>
          </FuncoesProvider>
        </BrandingProvider>
      </body>
    </html>
  );
}
