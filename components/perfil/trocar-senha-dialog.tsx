"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, KeyRound, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trocarMinhaSenha } from "@/app/(dashboard)/perfil/actions";

interface Props {
  aberto: boolean;
  onClose: () => void;
}

export function TrocarSenhaDialog({ aberto, onClose }: Props) {
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [sucesso, setSucesso] = useState(false);
  const [processando, setProcessando] = useState(false);

  useEffect(() => {
    if (aberto) {
      setAtual("");
      setNova("");
      setConfirmar("");
      setErro(null);
      setSucesso(false);
      setProcessando(false);
    }
  }, [aberto]);

  async function aoSalvar() {
    setErro(null);
    if (!atual) {
      setErro("Informe a senha atual.");
      return;
    }
    if (nova.length < 6) {
      setErro("A nova senha precisa ter ao menos 6 caracteres.");
      return;
    }
    if (nova !== confirmar) {
      setErro("A confirmação não bate com a nova senha.");
      return;
    }
    setProcessando(true);
    try {
      const r = await trocarMinhaSenha(atual, nova);
      if (!r.ok) {
        setErro(r.erro);
        return;
      }
      setSucesso(true);
      setTimeout(onClose, 1600);
    } catch {
      setErro("Falha ao trocar a senha. Tente novamente.");
    } finally {
      setProcessando(false);
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="size-5" />
            Trocar senha
          </DialogTitle>
          <DialogDescription>
            Escolha uma senha pessoal de no mínimo 6 caracteres. Pode ser só
            números, se preferir.
          </DialogDescription>
        </DialogHeader>

        {sucesso ? (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <CheckCircle2 className="size-10 text-primary" />
            <p className="font-medium">Senha alterada com sucesso!</p>
            <p className="text-sm text-muted-foreground">
              Use a nova senha no próximo acesso.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="ts-atual">Senha atual</Label>
              <Input
                id="ts-atual"
                type="password"
                autoComplete="current-password"
                value={atual}
                onChange={(e) => setAtual(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ts-nova">Nova senha</Label>
              <Input
                id="ts-nova"
                type="password"
                autoComplete="new-password"
                value={nova}
                onChange={(e) => setNova(e.target.value)}
                placeholder="Mínimo 6 caracteres"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="ts-conf">Confirmar nova senha</Label>
              <Input
                id="ts-conf"
                type="password"
                autoComplete="new-password"
                value={confirmar}
                onChange={(e) => setConfirmar(e.target.value)}
              />
            </div>

            {erro && (
              <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-2.5 text-sm text-destructive">
                <AlertTriangle className="size-4 shrink-0 mt-0.5" />
                <span>{erro}</span>
              </div>
            )}
          </div>
        )}

        {!sucesso && (
          <DialogFooter>
            <Button variant="outline" onClick={onClose} disabled={processando}>
              Cancelar
            </Button>
            <Button onClick={aoSalvar} disabled={processando}>
              {processando && <Loader2 className="size-4 animate-spin" />}
              Trocar senha
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
