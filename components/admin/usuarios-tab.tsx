"use client";

import { useMemo, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  Car,
  Shield,
  IdCard,
  KeyRound,
} from "lucide-react";
import { temCnhValida } from "@/lib/agendamento-utils";
import { useConfirmacao } from "@/components/confirmacao-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useUsuarios } from "@/lib/store/usuarios-context";
import { useFuncoes } from "@/lib/store/funcoes-context";
import { useOrgaos } from "@/lib/store/orgaos-context";
import { usePerfil } from "@/lib/perfil-context";
import { UsuarioForm } from "./usuario-form";
import {
  definirMaster,
  resetarSenhaUsuario,
} from "@/app/(dashboard)/admin/actions";
import { USUARIO_MASTER_ID } from "@/lib/mock/usuarios";
import type { Usuario } from "@/lib/mock/types";

export function UsuariosTab() {
  const { usuarios, remover, recarregar } = useUsuarios();
  const { buscarPorId: buscarFuncao } = useFuncoes();
  const { buscarPorId: buscarOrgao } = useOrgaos();
  const { usuario: usuarioAtual } = usePerfil();
  const { confirmar, avisar } = useConfirmacao();
  const [editando, setEditando] = useState<Usuario | null>(null);
  const [criando, setCriando] = useState(false);
  const [busca, setBusca] = useState("");
  const [alterandoMasterId, setAlterandoMasterId] = useState<string | null>(
    null,
  );
  const [resetandoId, setResetandoId] = useState<string | null>(null);

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

  async function alternarMaster(u: Usuario, valor: boolean) {
    // Bloqueia o master logado de remover o próprio acesso (evita lockout).
    if (!valor && u.id === usuarioAtual.id) {
      await avisar({
        titulo: "Não permitido",
        mensagem: "Você não pode remover o seu próprio acesso Master.",
      });
      return;
    }
    const ok = await confirmar({
      titulo: valor
        ? `Tornar "${u.nome}" Master?`
        : `Remover acesso Master de "${u.nome}"?`,
      mensagem: valor
        ? "A pessoa passa a ter acesso total ao sistema (todos os órgãos, gestão de usuários, veículos e configurações). A função/cargo atual é mantida."
        : "A pessoa perde o acesso de Master e volta ao nível de acesso da função atual dela.",
      destrutivo: !valor,
      rotuloOk: valor ? "Tornar Master" : "Remover acesso",
    });
    if (!ok) return;

    setAlterandoMasterId(u.id);
    try {
      const r = await definirMaster(u.id, valor);
      if (!r.ok) {
        await avisar({ titulo: "Não foi possível", mensagem: r.erro });
        return;
      }
      await recarregar();
    } catch {
      await avisar({
        titulo: "Falha",
        mensagem: "Não foi possível alterar o acesso. Tente novamente.",
      });
    } finally {
      setAlterandoMasterId(null);
    }
  }

  /** Plano B do "Esqueci minha senha", para quem não abre o próprio e-mail. */
  async function resetarSenha(u: Usuario) {
    const ok = await confirmar({
      titulo: `Resetar a senha de "${u.nome}"?`,
      mensagem:
        "A senha atual para de funcionar na hora. Vamos gerar uma senha temporária para você entregar à pessoa — ela troca por uma senha própria no Perfil depois de entrar.",
      rotuloOk: "Resetar senha",
    });
    if (!ok) return;

    setResetandoId(u.id);
    try {
      const r = await resetarSenhaUsuario(u.id);
      if (!r.ok) {
        await avisar({ titulo: "Não foi possível", mensagem: r.erro });
        return;
      }
      await avisar({
        titulo: "Senha temporária gerada",
        mensagem: `Entregue esta senha a ${u.nome.split(" ")[0]}:\n\n${r.senhaTemporaria}\n\nAnote agora — ela não será exibida de novo. Oriente a pessoa a trocá-la no Perfil.`,
      });
    } catch {
      await avisar({
        titulo: "Falha",
        mensagem: "Não foi possível resetar a senha. Tente novamente.",
      });
    } finally {
      setResetandoId(null);
    }
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
                      {u.perfil === "master" && (
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
                  <div className="flex items-center gap-3">
                    <label
                      className="hidden sm:flex items-center gap-2 select-none"
                      title={
                        u.id === usuarioAtual.id
                          ? "Você não pode remover o próprio acesso Master"
                          : "Conceder/remover acesso Master"
                      }
                    >
                      <Shield
                        className={
                          u.perfil === "master"
                            ? "size-4 text-primary"
                            : "size-4 text-muted-foreground"
                        }
                      />
                      <span className="text-xs text-muted-foreground">
                        Master
                      </span>
                      <Switch
                        checked={u.perfil === "master"}
                        disabled={
                          alterandoMasterId === u.id ||
                          (u.perfil === "master" && u.id === usuarioAtual.id)
                        }
                        onCheckedChange={(v) => alternarMaster(u, v)}
                        aria-label={`Acesso Master de ${u.nome}`}
                      />
                    </label>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => resetarSenha(u)}
                      disabled={resetandoId === u.id || !u.email}
                      aria-label={`Resetar senha de ${u.nome}`}
                      title={
                        u.email
                          ? "Resetar senha (gera uma temporária)"
                          : "Sem e-mail cadastrado — não tem login"
                      }
                    >
                      <KeyRound className="size-4" />
                    </Button>
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
