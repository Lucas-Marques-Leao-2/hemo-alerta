import { BLOOD_TYPE_LABEL, type BloodTypeKey } from "@/lib/blood-stock-constants"

// Template do e-mail de convocação. Usa tabelas e estilos inline porque a
// maioria dos clientes de e-mail (Gmail, Outlook) ignora CSS externo, flexbox
// e grid.
//
// Foco em uma única ação: o botão de agendar fica no topo, junto do nome e do
// tipo sanguíneo, visível sem rolar. Requisitos e locais de coleta ficam na
// página de agendamento, onde passam a ser úteis.

export type CampaignEmailInput = {
  donorName: string
  donorBloodType: BloodTypeKey
  subject: string
  title: string
  message: string
  // Link pessoal para o doador agendar a doação.
  scheduleUrl?: string | null
  // Doações já registradas do doador.
  donationCount?: number
}

export const OFFICIAL_DONATION_URL = "https://cidadao.saude.al.gov.br/transparencia/doacoes/"

const COLORS = {
  red: "#b91c1c",
  redDark: "#7f1d1d",
  redTint: "#fecaca",
  ink: "#18181b",
  muted: "#52525b",
  subtle: "#a1a1aa",
  line: "#e4e4e7",
  page: "#f4f4f5",
  white: "#ffffff",
}

const FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name
}

function paragraphs(message: string) {
  return message
    .trim()
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
}

export function renderCampaignEmail(input: CampaignEmailInput) {
  const name = escapeHtml(firstName(input.donorName))
  const bloodTypeLabel = BLOOD_TYPE_LABEL[input.donorBloodType]
  const bloodType = escapeHtml(bloodTypeLabel)
  const scheduleUrl = input.scheduleUrl ? escapeHtml(input.scheduleUrl) : null
  const donationCount = input.donationCount ?? 0

  const cta = scheduleUrl
    ? { url: scheduleUrl, label: "Agendar minha doação", hint: "Leva 1 minuto · sem cadastro" }
    : { url: OFFICIAL_DONATION_URL, label: "Ver locais de coleta", hint: "Horários no portal oficial" }

  const preheader = escapeHtml(
    scheduleUrl
      ? `Escolha o dia em 1 minuto. Sua doação pode ajudar até 4 pessoas.`
      : `O HEMOAL precisa de doadores ${bloodTypeLabel}. Sua doação pode ajudar até 4 pessoas.`,
  )

  const body = paragraphs(input.message)
    .map(
      (paragraph) =>
        `<p style="margin:0 0 14px;font-family:${FONT};font-size:16px;line-height:1.6;color:${COLORS.ink};">${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`,
    )
    .join("")

  // Reconhecimento para quem já doou: reforça a identidade de doador.
  const thanks =
    donationCount > 0
      ? `<p style="margin:4px 0 0;font-family:${FONT};font-size:14px;line-height:1.5;color:${COLORS.muted};">Obrigado pelas suas ${donationCount} ${donationCount === 1 ? "doação" : "doações"} até aqui. ❤</p>`
      : ""

  const decline = scheduleUrl
    ? `<p style="margin:20px 0 0;font-family:${FONT};font-size:14px;color:${COLORS.muted};">Não pode agora? <a href="${scheduleUrl}" target="_blank" style="color:${COLORS.red};font-weight:600;">Avise a gente</a>.</p>`
    : ""

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<meta name="supported-color-schemes" content="light">
<title>${escapeHtml(input.subject)}</title>
</head>
<body style="margin:0;padding:0;background:${COLORS.page};-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${preheader}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COLORS.page};">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;background:${COLORS.white};border:1px solid ${COLORS.line};border-radius:20px;">

<tr><td style="background:${COLORS.red};background-image:linear-gradient(135deg, ${COLORS.red} 0%, ${COLORS.redDark} 100%);padding:28px;border-radius:20px 20px 0 0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td valign="top" style="font-family:${FONT};">
<p style="margin:0 0 8px;font-size:12px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${COLORS.redTint};">${escapeHtml(input.title)}</p>
<h1 style="margin:0;font-size:24px;line-height:1.25;font-weight:700;color:${COLORS.white};">${name}, precisamos de doadores ${bloodType}.</h1>
</td>
<td valign="top" align="right" width="76" style="padding-left:12px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="right"><tr>
<td align="center" valign="middle" width="64" height="64" style="width:64px;height:64px;border-radius:32px;background:${COLORS.white};font-family:${FONT};font-size:22px;font-weight:800;color:${COLORS.red};text-align:center;">${bloodType}</td>
</tr></table>
</td>
</tr></table>

<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin-top:22px;"><tr>
<td align="center" bgcolor="${COLORS.white}" style="border-radius:999px;background:${COLORS.white};">
<a href="${cta.url}" target="_blank" style="display:inline-block;padding:14px 28px;font-family:${FONT};font-size:16px;font-weight:700;color:${COLORS.red};text-decoration:none;border-radius:999px;">${cta.label} →</a>
</td>
</tr></table>
<p style="margin:10px 0 0;font-family:${FONT};font-size:13px;color:${COLORS.redTint};">${cta.hint}</p>
</td></tr>

<tr><td style="padding:26px 28px 28px;">
${body}
${thanks}
${decline}
</td></tr>

</table>

<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
<tr><td style="padding:18px 12px 0;font-family:${FONT};font-size:12px;line-height:1.6;color:${COLORS.subtle};text-align:center;">
Você recebe este e-mail por ser doador cadastrado no Hemo Alerta (HEMOAL).
${
  scheduleUrl
    ? `<a href="${scheduleUrl}#preferencias" target="_blank" style="color:${COLORS.subtle};text-decoration:underline;">Não quero mais receber</a>`
    : "Para não receber mais, fale com a equipe do HEMOAL."
}
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`

  const text = [
    `${firstName(input.donorName)}, precisamos de doadores ${bloodTypeLabel}.`,
    "",
    scheduleUrl
      ? `Agende sua doação (leva 1 minuto, sem cadastro): ${input.scheduleUrl}`
      : `Locais e horários de coleta: ${OFFICIAL_DONATION_URL}`,
    "",
    paragraphs(input.message).join("\n\n"),
    ...(donationCount > 0
      ? ["", `Obrigado pelas suas ${donationCount} ${donationCount === 1 ? "doação" : "doações"} até aqui.`]
      : []),
    ...(input.scheduleUrl ? ["", `Não pode agora? Avise a gente: ${input.scheduleUrl}`] : []),
    "",
    "--",
    "Você recebe este e-mail por ser doador cadastrado no Hemo Alerta (HEMOAL).",
    input.scheduleUrl
      ? `Não quer mais receber? ${input.scheduleUrl}#preferencias`
      : "Para não receber mais, fale com a equipe do HEMOAL.",
  ].join("\n")

  return { subject: input.subject, html, text }
}
