import type { ReactNode } from "react";

/** Converte **negrito** em <strong> (sem injeção de HTML). */
function comNegrito(linha: string): ReactNode[] {
  return linha.split(/(\*\*[^*]+\*\*)/g).map((parte, i) => {
    if (/^\*\*[^*]+\*\*$/.test(parte)) {
      return <strong key={i}>{parte.slice(2, -2)}</strong>;
    }
    return <span key={i}>{parte}</span>;
  });
}

/**
 * Renderiza a mensagem de um comunicado: quebras de linha viram parágrafos e
 * `**texto**` vira negrito. Nada de HTML cru — só texto e <strong>.
 */
export function TextoComunicado({
  texto,
  className,
}: {
  texto: string;
  className?: string;
}) {
  const linhas = texto.replace(/\r\n/g, "\n").split("\n");
  return (
    <div className={className}>
      {linhas.map((linha, i) =>
        linha.trim() === "" ? (
          <div key={i} className="h-2" />
        ) : (
          <p key={i} className="leading-relaxed">
            {comNegrito(linha)}
          </p>
        ),
      )}
    </div>
  );
}
