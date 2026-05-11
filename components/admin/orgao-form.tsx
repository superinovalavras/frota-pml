"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
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
import { useOrgaos } from "@/lib/store/orgaos-context";
import type { Secretaria } from "@/lib/mock/types";

interface Props {
  aberto: boolean;
  orgao: Secretaria | null;
  onClose: () => void;
}

export function OrgaoForm({ aberto, orgao, onClose }: Props) {
  const { salvar, orgaos } = useOrgaos();
  const editando = orgao !== null;

  const [nome, setNome] = useState("");
  const [sigla, setSigla] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!aberto) return;
    if (orgao) {
      setNome(orgao.nome);
      setSigla(orgao.sigla);
    } else {
      setNome("");
      setSigla("");
    }
    setErro(null);
  }, [aberto, orgao]);

  function aoSalvar() {
    setErro(null);
    const nomeLimpo = nome.trim();
    const siglaLimpa = sigla.trim().toUpperCase();
    if (!nomeLimpo) {
      setErro("Informe o nome do órgão.");
      return;
    }
    if (!siglaLimpa) {
      setErro("Informe a sigla.");
      return;
    }
    const conflitoSigla = orgaos.find(
      (o) => o.id !== orgao?.id && o.sigla.toUpperCase() === siglaLimpa,
    );
    if (conflitoSigla) {
      setErro(`Já existe um órgão com a sigla "${siglaLimpa}".`);
      return;
    }
    salvar({
      id:
        orgao?.id ??
        `org-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      nome: nomeLimpo,
      sigla: siglaLimpa,
    });
    onClose();
  }

  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editando ? "Editar órgão" : "Novo órgão"}
          </DialogTitle>
          <DialogDescription>
            Secretaria, gabinete ou outra lotação da prefeitura.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="of-nome">Nome</Label>
            <Input
              id="of-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Secretaria de Educação"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="of-sigla">Sigla</Label>
            <Input
              id="of-sigla"
              value={sigla}
              onChange={(e) => setSigla(e.target.value.toUpperCase())}
              placeholder="Ex.: SEDUC"
              maxLength={12}
              className="uppercase"
            />
          </div>
        </div>

        {erro && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
            <AlertTriangle className="size-4 text-destructive shrink-0 mt-0.5" />
            <p className="text-destructive">{erro}</p>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={aoSalvar}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
