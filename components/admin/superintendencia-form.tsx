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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useOrgaos } from "@/lib/store/orgaos-context";
import { useSuperintendencias } from "@/lib/store/superintendencias-context";
import type { Superintendencia } from "@/lib/mock/types";

interface Props {
  aberto: boolean;
  superintendencia: Superintendencia | null;
  /** Órgão pré-selecionado ao criar uma nova (a partir do grupo do órgão). */
  secretariaInicialId?: string;
  onClose: () => void;
}

export function SuperintendenciaForm({
  aberto,
  superintendencia,
  secretariaInicialId,
  onClose,
}: Props) {
  const { orgaos } = useOrgaos();
  const { salvar, superintendencias } = useSuperintendencias();
  const editando = superintendencia !== null;

  const [nome, setNome] = useState("");
  const [sigla, setSigla] = useState("");
  const [secretariaId, setSecretariaId] = useState("");
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!aberto) return;
    if (superintendencia) {
      setNome(superintendencia.nome);
      setSigla(superintendencia.sigla);
      setSecretariaId(superintendencia.secretariaId);
    } else {
      setNome("");
      setSigla("");
      setSecretariaId(secretariaInicialId ?? orgaos[0]?.id ?? "");
    }
    setErro(null);
  }, [aberto, superintendencia, secretariaInicialId, orgaos]);

  function aoSalvar() {
    setErro(null);
    const nomeLimpo = nome.trim();
    const siglaLimpa = sigla.trim().toUpperCase();
    if (!nomeLimpo) {
      setErro("Informe o nome da superintendência.");
      return;
    }
    if (!siglaLimpa) {
      setErro("Informe a sigla.");
      return;
    }
    if (!secretariaId) {
      setErro("Selecione o órgão ao qual ela pertence.");
      return;
    }
    // Sigla única dentro do mesmo órgão.
    const conflito = superintendencias.find(
      (s) =>
        s.id !== superintendencia?.id &&
        s.secretariaId === secretariaId &&
        s.sigla.toUpperCase() === siglaLimpa,
    );
    if (conflito) {
      setErro(`Já existe uma superintendência "${siglaLimpa}" neste órgão.`);
      return;
    }
    salvar({
      id:
        superintendencia?.id ??
        `sup-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      nome: nomeLimpo,
      sigla: siglaLimpa,
      secretariaId,
    });
    onClose();
  }

  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editando ? "Editar superintendência" : "Nova superintendência"}
          </DialogTitle>
          <DialogDescription>
            Subdivisão de um órgão da prefeitura.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>
              Órgão <span className="text-destructive">*</span>
            </Label>
            <Select value={secretariaId} onValueChange={setSecretariaId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecionar órgão..." />
              </SelectTrigger>
              <SelectContent>
                {orgaos.map((o) => (
                  <SelectItem key={o.id} value={o.id}>
                    {o.sigla} — {o.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="sf-nome">Nome</Label>
            <Input
              id="sf-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Superintendência de Trânsito"
              autoFocus
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sf-sigla">Sigla</Label>
            <Input
              id="sf-sigla"
              value={sigla}
              onChange={(e) => setSigla(e.target.value.toUpperCase())}
              placeholder="Ex.: SUTRAN"
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
