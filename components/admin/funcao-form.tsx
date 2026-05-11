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
import { useFuncoes } from "@/lib/store/funcoes-context";
import { rotuloNivelAcesso } from "@/lib/formatters";
import type { Funcao, NivelAcesso } from "@/lib/mock/types";

interface Props {
  aberto: boolean;
  funcao: Funcao | null;
  onClose: () => void;
}

export function FuncaoForm({ aberto, funcao, onClose }: Props) {
  const { salvar, funcoesOrdenadas } = useFuncoes();
  const editando = funcao !== null;
  const sistema = !!funcao?.sistema;

  const [nome, setNome] = useState("");
  const [nivelAcesso, setNivelAcesso] = useState<NivelAcesso>("servidor");
  const [ehMotorista, setEhMotorista] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!aberto) return;
    if (funcao) {
      setNome(funcao.nome);
      setNivelAcesso(funcao.nivelAcesso);
      setEhMotorista(!!funcao.ehMotorista);
    } else {
      setNome("");
      setNivelAcesso("servidor");
      setEhMotorista(false);
    }
    setErro(null);
  }, [aberto, funcao]);

  function aoSalvar() {
    setErro(null);
    const nomeLimpo = nome.trim();
    if (!nomeLimpo) {
      setErro("Informe o nome da função.");
      return;
    }
    const conflitoNome = funcoesOrdenadas.find(
      (f) =>
        f.id !== funcao?.id &&
        f.nome.toLowerCase() === nomeLimpo.toLowerCase(),
    );
    if (conflitoNome) {
      setErro(`Já existe uma função chamada "${conflitoNome.nome}".`);
      return;
    }
    if (editando && funcao) {
      salvar({
        ...funcao,
        nome: nomeLimpo,
        nivelAcesso: funcao.sistema ? funcao.nivelAcesso : nivelAcesso,
        ehMotorista: funcao.sistema ? funcao.ehMotorista : ehMotorista,
      });
    } else {
      const ultima = funcoesOrdenadas[funcoesOrdenadas.length - 1];
      const proximaHierarquia = ultima ? ultima.hierarquia + 1 : 1;
      salvar({
        id: `f-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        nome: nomeLimpo,
        hierarquia: proximaHierarquia,
        nivelAcesso,
        ehMotorista,
      });
    }
    onClose();
  }

  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editando ? "Editar função" : "Nova função"}
          </DialogTitle>
          <DialogDescription>
            {sistema
              ? "Esta é uma função de sistema. Apenas o nome pode ser editado."
              : "Funções determinam a hierarquia (prioridade) e o nível de acesso técnico."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="ff-nome">Nome</Label>
            <Input
              id="ff-nome"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              placeholder="Ex.: Procurador Municipal"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label>Nível de acesso</Label>
            <Select
              value={nivelAcesso}
              onValueChange={(v) => setNivelAcesso(v as NivelAcesso)}
              disabled={sistema}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="master">
                  {rotuloNivelAcesso("master")}
                </SelectItem>
                <SelectItem value="gestor">
                  {rotuloNivelAcesso("gestor")}
                </SelectItem>
                <SelectItem value="servidor">
                  {rotuloNivelAcesso("servidor")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <label className="flex items-start gap-3 rounded-md border p-3 cursor-pointer hover:bg-muted/30 transition-colors">
            <input
              type="checkbox"
              checked={ehMotorista}
              onChange={(e) => setEhMotorista(e.target.checked)}
              disabled={sistema}
              className="mt-1 size-4 rounded border-input accent-primary"
            />
            <div className="flex-1">
              <p className="text-sm font-medium">Função de motorista</p>
              <p className="text-xs text-muted-foreground">
                Usuários com esta função aparecem automaticamente na lista de
                motoristas selecionáveis nas reservas de veículos.
              </p>
            </div>
          </label>
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
