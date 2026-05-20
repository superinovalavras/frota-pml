"use client";

import { usePerfil } from "@/lib/perfil-context";
import { useUsuarios } from "@/lib/store/usuarios-context";
import { useFuncoes } from "@/lib/store/funcoes-context";
import { useOrgaos } from "@/lib/store/orgaos-context";
import { useSuperintendencias } from "@/lib/store/superintendencias-context";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function SeletorPerfil() {
  const { usuario, setUsuarioId } = usePerfil();
  const { usuarios } = useUsuarios();
  const { buscarPorId: buscarFuncao } = useFuncoes();
  const { orgaos } = useOrgaos();
  const { buscarPorId: buscarSuperintendencia } = useSuperintendencias();

  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className="hidden lg:inline text-xs text-muted-foreground shrink-0">
        Simular usuário:
      </span>
      <Select value={usuario.id} onValueChange={setUsuarioId}>
        <SelectTrigger className="h-9 w-full max-w-[320px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {usuarios.map((u) => {
            const sec = orgaos.find((s) => s.id === u.secretariaId);
            const sup = u.superintendenciaId
              ? buscarSuperintendencia(u.superintendenciaId)
              : null;
            const lotacao = sup ? sup.sigla : sec?.sigla ?? "—";
            const funcao = buscarFuncao(u.funcaoId);
            return (
              <SelectItem key={u.id} value={u.id}>
                <span className="flex flex-col items-start">
                  <span className="text-sm">
                    {u.nome}{" "}
                    <span className="text-muted-foreground">
                      · {funcao?.nome ?? "—"}
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {u.cargo || "Sem cargo"} — {lotacao}
                  </span>
                </span>
              </SelectItem>
            );
          })}
        </SelectContent>
      </Select>
    </div>
  );
}
