"use client";

import { useMemo, useState } from "react";
import { Plus, Pencil, Trash2, Search, Car, Shield, IdCard } from "lucide-react";
import { temCnhValida } from "@/lib/agendamento-utils";
import { useConfirmacao } from "@/components/confirmacao-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUsuarios } from "@/lib/store/usuarios-context";
import { useFuncoes } from "@/lib/store/funcoes-context";
import { useOrgaos } from "@/lib/store/orgaos-context";
import { UsuarioForm } from "./usuario-form";
import { USUARIO_MASTER_ID } from "@/lib/mock/usuarios";
import type { Usuario } from "@/lib/mock/types";

export function UsuariosTab() {
  const { usuarios, remover } = useUsuarios();
  const { buscarPorId: buscarFuncao } = useFuncoes();
  const { buscarPorId: buscarOrgao } = useOrgaos();
  const { confirmar, avisar } = useConfirmacao();
  const [editando, setEditando] = useState<Usuario | null>(null);
  const [criando, setCriando] = useState(false);
  const [busca, setBusca] = useState("");

  const filtrados = useMemo(() => {
    const ordenados = usuarios.slice().sort((a, b) => {
      if (a.hierarquia !== b.hierarquia) return a.hierarquia - b.hierarquia;
      return a.nome.localeCompare(b.nome, "pt-BR");
    });
    const termo = busca.trim().toLowerCase();
    if (!termo) return ordenados;
    return ordenados.filter((u) =>
      [u.nome, u.cpf, u.masp, u.email, u.cargo].some((v) =>
        (v ?? "").toLowerCase().includes(termo),
      ),
    );
  }, [usuarios, busca]);

  async function tentarRemover(u: Usuario) {
    if (u.id === USUARIO_MASTER_ID) {
      await avisar({
        titulo: "Não é possível excluir",
        mensagem: "O usuário Master não pode ser removido.",
      });
      return;
    }
    const ok = await confirmar({
      titulo: `Excluir "${u.nome}"?`,
      mensagem:
        "O cadastro deste usuário será removido. Reservas em andamento que o referenciam ficarão sem solicitante/motorista.",
      destrutivo: true,
      rotuloOk: "Excluir",
    });
    if (ok) remover(u.id);
  }

  return (
    <div className="space-y-4">
      <div className="flex items-end justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold">Usuários</h2>
          <p className="text-sm text-muted-foreground">
            {usuarios.length} cadastrado{usuarios.length === 1 ? "" : "s"}.
            Quem tem função de motorista entra automaticamente no pool de
            motoristas.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="size-4 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder="Buscar por nome, CPF, MASP…"
              className="pl-8 w-[260px]"
            />
          </div>
          <Button onClick={() => setCriando(true)}>
            <Plus className="size-4" />
            Novo usuário
          </Button>
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        {filtrados.length === 0 ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            Nenhum usuário encontrado.
          </div>
        ) : (
          <ul className="divide-y">
            {filtrados.map((u) => {
              const funcao = buscarFuncao(u.funcaoId);
              const orgao = buscarOrgao(u.secretariaId);
              const iniciais = u.nome
                .split(" ")
                .filter(Boolean)
                .slice(0, 2)
                .map((n) => n[0])
                .join("")
                .toUpperCase();
              return (
                <li key={u.id} className="flex items-center gap-3 p-3">
                  <Avatar className="size-10">
                    {u.fotoUrl && (
                      <AvatarImage src={u.fotoUrl} alt={u.nome} />
                    )}
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-semibold">
                      {iniciais || "?"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium truncate">{u.nome}</span>
                      {funcao?.ehMaster && (
                        <Badge variant="secondary" className="gap-1">
                          <Shield className="size-3" /> Master
                        </Badge>
                      )}
                      {funcao?.ehMotorista && (
                        <Badge variant="secondary" className="gap-1">
                          <Car className="size-3" /> Motorista
                        </Badge>
                      )}
                      {u.cnhCategoria && (
                        <Badge
                          variant="outline"
                          className={
                            temCnhValida(u)
                              ? "gap-1 border-primary/40 bg-primary/5 text-primary"
                              : "gap-1 border-destructive/40 bg-destructive/5 text-destructive"
                          }
                          title={
                            temCnhValida(u)
                              ? "Habilitado a conduzir"
                              : "CNH vencida"
                          }
                        >
                          <IdCard className="size-3" />
                          Habilitado · {u.cnhCategoria}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {funcao?.nome ?? "—"}
                      {u.cargo ? ` · ${u.cargo}` : ""}
                      {orgao ? ` · ${orgao.sigla}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setEditando(u)}
                      aria-label="Editar"
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => tentarRemover(u)}
                      disabled={u.id === USUARIO_MASTER_ID}
                      aria-label="Excluir"
                      className="text-destructive hover:text-destructive disabled:text-muted-foreground"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <UsuarioForm
        aberto={criando || editando !== null}
        usuario={editando}
        onClose={() => {
          setCriando(false);
          setEditando(null);
        }}
      />
    </div>
  );
}
