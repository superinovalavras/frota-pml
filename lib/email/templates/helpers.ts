/**
 * Utilitários compartilhados pelos templates de email.
 *
 * `layoutEmail` produz o esqueleto HTML (header escuro + container branco +
 * rodapé cinza) — cada template injeta apenas o miolo. Mantém visual
 * consistente sem repetir markup.
 */

export function escapar(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function primeiroNome(nome: string): string {
  return nome.trim().split(/\s+/)[0] ?? nome;
}

export function pad(n: number): string {
  return n.toString().padStart(2, "0");
}

/** "YYYY-MM-DD" → "DD/MM/YYYY". Aceita ISO completo (corta na primeira letra T). */
export function formatarData(iso: string): string {
  const apenasData = iso.slice(0, 10);
  const [y, m, d] = apenasData.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${pad(d)}/${pad(m)}/${y}`;
}

/** ISO timestamp → "DD/MM/YYYY HH:MM" no fuso local da máquina que renderiza
 *  (server roda em UTC; templates já recebem ISO no horário de Lavras vindo do mapper). */
export function formatarDataHora(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function saudacao(destinatarioNome: string): string {
  return destinatarioNome ? `Olá ${primeiroNome(destinatarioNome)},` : "Olá,";
}

interface LayoutOpts {
  /** Texto do cabeçalho escuro. */
  titulo: string;
  /** Markup HTML do corpo (vai dentro do container branco). */
  corpo: string;
  /** Cor de fundo do header em hex (padrão: cinza-900). */
  corHeader?: string;
}

/**
 * Envolve o conteúdo de um template no layout padrão de email.
 *
 * O layout segue boas práticas para HTML de email: tabelas em vez de divs
 * para máxima compatibilidade, estilos inline, largura fixa de 600px.
 */
export function layoutEmail({ titulo, corpo, corHeader = "#1f2937" }: LayoutOpts): string {
  return `<!doctype html>
<html lang="pt-BR">
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#111827">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f3f4f6;padding:24px 0">
    <tr><td align="center">
      <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background:#ffffff;border-radius:8px;overflow:hidden;max-width:600px;width:100%">
        <tr>
          <td style="padding:20px 24px;background:${corHeader};color:#ffffff">
            <h1 style="margin:0;font-size:18px;font-weight:600">FROTA PML — ${escapar(titulo)}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:24px">
${corpo}
          </td>
        </tr>
        <tr>
          <td style="padding:16px 24px;background:#f9fafb;color:#9ca3af;font-size:12px;text-align:center">
            Esta é uma notificação automática — não responda este email.
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

interface LinhaInfo {
  label: string;
  /** Pode conter HTML — caller cuida da fuga. */
  valor: string;
}

/** Tabela "label → valor" usada no miolo de quase todos os templates. */
export function tabelaInfo(linhas: LinhaInfo[]): string {
  const trs = linhas
    .map(
      (l) =>
        `<tr><td style="padding:2px 12px 2px 0;color:#6b7280">${escapar(l.label)}</td><td>${l.valor}</td></tr>`,
    )
    .join("");
  return `<table cellpadding="0" cellspacing="0" style="font-size:14px;line-height:1.5">${trs}</table>`;
}

export function secao(titulo: string, conteudoHtml: string): string {
  return `<h2 style="margin:24px 0 8px 0;font-size:14px;color:#374151;text-transform:uppercase;letter-spacing:0.04em">${escapar(titulo)}</h2>${conteudoHtml}`;
}
