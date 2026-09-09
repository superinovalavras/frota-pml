import type { Usuario, Veiculo } from "@/lib/mock/types";

/**
 * Regra de visibilidade de veículos:
 * - master: vê tudo
 * - secretaria DONA (`secretariaId`):
 *   - gestor: vê todos os veículos da sua secretaria
 *   - servidor / motorista (com superintendência): vê veículos da própria
 *     superintendência + frota geral da secretaria (superintendenciaId == null)
 *   - servidor / motorista (sem superintendência): vê apenas frota geral
 * - secretaria COMPARTILHADA (`secretariasVisiveis`): TODA a secretaria alvo
 *   vê e pode reservar o veículo (sem sub-filtro por superintendência).
 */
export function veiculoVisivelPara(v: Veiculo, u: Usuario): boolean {
  if (u.perfil === "master") return true;

  // Dona: regra por perfil/superintendência.
  if (v.secretariaId === u.secretariaId) {
    if (u.perfil === "gestor") return true;
    if (u.superintendenciaId === null) return v.superintendenciaId === null;
    return (
      v.superintendenciaId === null ||
      v.superintendenciaId === u.superintendenciaId
    );
  }

  // Compartilhada: qualquer um da secretaria listada enxerga.
  return v.secretariasVisiveis?.includes(u.secretariaId) ?? false;
}

export function filtrarVeiculosVisiveis(
  lista: Veiculo[],
  usuario: Usuario,
): Veiculo[] {
  return lista.filter((v) => veiculoVisivelPara(v, usuario));
}
