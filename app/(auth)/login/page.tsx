import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export default function LoginPage() {
  return (
    <div className="relative min-h-screen overflow-hidden flex items-center justify-center p-4">
      {/* Atmosfera de fundo institucional */}
      <div className="absolute inset-0 pml-gradient-soft" />
      <div
        aria-hidden
        className="absolute -top-40 -left-32 size-96 rounded-full bg-pml-blue opacity-15 blur-3xl"
      />
      <div
        aria-hidden
        className="absolute -bottom-32 -right-20 size-80 rounded-full bg-pml-yellow opacity-25 blur-3xl"
      />

      <div className="relative w-full max-w-md">
        <Card className="overflow-hidden p-0 shadow-2xl ring-1 ring-foreground/5">
          {/* Faixa institucional */}
          <div className="h-1.5 pml-faixa" />

          {/* Bloco superior azul com logo institucional vertical completa */}
          <div className="bg-pml-blue text-white px-6 pt-8 pb-6 text-center relative">
            <Image
              src="/marca/pml-branca.png"
              alt="Governo de Lavras — Trabalho e amor por Lavras"
              width={280}
              height={340}
              className="mx-auto h-40 w-auto"
              priority
            />
          </div>

          <CardContent className="px-6 pt-6 pb-3 text-center">
            <h1 className="text-3xl font-black tracking-tight">FROTA PML</h1>
            <p className="text-sm text-muted-foreground mt-1.5">
              Sistema de Gestão da Frota Municipal
            </p>
          </CardContent>

          <div className="px-6 pb-8 space-y-4">
            <Button asChild className="w-full" size="lg">
              <Link href="/agenda">
                Entrar (modo demonstração)
                <ArrowRight className="size-4" />
              </Link>
            </Button>
            <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
              Login com Supabase Auth — Fase 2.
              <br />
              Use o seletor no topo para alternar entre perfis simulados.
            </p>
          </div>
        </Card>

        <p className="text-center text-[11px] text-muted-foreground/70 mt-6">
          v0.1.0 · Build de demonstração · Trabalho e amor por Lavras
        </p>
      </div>
    </div>
  );
}
