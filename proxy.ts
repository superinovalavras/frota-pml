import type { NextRequest } from "next/server";
import { atualizarSessao } from "@/lib/supabase/middleware";

// Next 16: o antigo `middleware.ts` virou `proxy.ts`.
export async function proxy(request: NextRequest) {
  return atualizarSessao(request);
}

export const config = {
  // Roda em todas as rotas, menos assets estáticos e imagens.
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
