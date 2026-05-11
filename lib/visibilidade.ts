import type { Usuario, Veiculo } from "@/lib/mock/types";

/**
 * Regra de visibilidade de veículos:
 * - master: vê tudo
 * - gestor: vê todos os veículos da sua secretaria
 * - servidor / motorista (com superintendência): vê veículos da própria
 *   superintendência + frota geral da secretaria (superintendenciaId == null)
 * - servidor / motorista (sem superintendência): vê apenas frota geral
 *   da secretaria (não vê veículos atribuídos a superintendências)
 */
export function veiculoVisivelPara(v: Veiculo, u: Usuario): boolean {
  if (u.perfil === "master") return true;
  if (v.secretariaId !== u.secretariaId) return false;
  if (u.perfil === "gestor") return true;
  // servidor / motorista
  if (u.superintendenciaId === null) {
    return v.superintendenciaId === null;
  }
  return v.superintendenciaId === null || v.superintendenciaId === u.superintendenciaId;
}

export function filtrarVeiculosVisiveis(
  lista: Veiculo[],
  usuario: Usuario,
): Veiculo[] {
  return lista.filter((v) => veiculoVisivelPara(v, usuario));
}
