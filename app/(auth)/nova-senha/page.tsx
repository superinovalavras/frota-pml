"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, KeyRound, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { definirNovaSenha } from "./actions";

export default function NovaSenhaPage() {
  const [nova, setNova] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [salvando, setSalvando] = useState(false);

  async function aoSalvar() {
    setErro(null);
    if (nova.length < 6) {
      setErro("A nova senha precisa ter ao menos 6 caracteres.");
      return;
    }
    if (nova !== confirmar) {
      setErro("A confirmação não bate com a nova senha.");
      return;
    }
    setSalvando(true);
    try {
      const r = await definirNovaSenha(nova);
      if (!r.ok) {
        setErro(r.erro);
        return;
      }
      setSucesso(true);
      // Navegação completa (não router.push): recarrega os providers do layout
      // raiz já com a sessão — mesmo motivo do login.
      setTimeout(() => window.location.assign("/agenda"), 1600);
    } catch {
      setErro("Falha ao salvar a senha. Tente novamente.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden flex items-center justify-center p-4">
      <div className="absolute inset-0 pml-gradient-soft" />
      <div
        aria-hidden
        className="absolute -top-40 -left-32 size-96 rounded-full bg-pml-blue opacity-15 blur-3xl"
      />

      <div className="relative w-full max-w-md">
        <Card className="overflow-hidden p-0 shadow-2xl ring-1 ring-foreground/5">
          <div className="h-1.5 pml-faixa" />

          {sucesso ? (
            <CardContent className="px-6 py-12 text-center space-y-3">
              <CheckCircle2 className="size-12 mx-auto text-primary" />
              <h1 className="text-xl font-bold">Senha alterada!</h1>
              <p className="text-sm text-muted-foreground">
                Entrando no sistema…
              </p>
            </CardContent>
          ) : (
            <>
              <CardContent className="px-6 pt-8 pb-2 text-center">
                <KeyRound className="size-10 mx-auto text-primary mb-2" />
                <h1 className="text-2xl font-black tracking-tight">
                  Criar senha nova
                </h1>
                <p className="text-sm text-muted-foreground mt-1.5">
                  Escolha uma senha de no mínimo 6 caracteres. Pode ser só
                  números, se preferir.
                </p>
              </CardContent>

              <div className="px-6 pt-4 pb-8 space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="ns-nova">Nova senha</Label>
                  <Input
                    id="ns-nova"
                    type="password"
                    autoComplete="new-password"
                    autoFocus
                    value={nova}
                    onChange={(e) => setNova(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="ns-conf">Confirmar nova senha</Label>
                  <Input
                    id="ns-conf"
                    type="password"
                    autoComplete="new-password"
                    value={confirmar}
                    onChange={(e) => setConfirmar(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && aoSalvar()}
                  />
                </div>

                {erro && (
                  <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-2.5 text-sm text-destructive">
                    <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                    <span>{erro}</span>
                  </div>
                )}

                <Button
                  className="w-full"
                  size="lg"
                  onClick={aoSalvar}
                  disabled={salvando}
                >
                  {salvando && <Loader2 className="size-4 animate-spin" />}
                  Salvar senha
                </Button>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
