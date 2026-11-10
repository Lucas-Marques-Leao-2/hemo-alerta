import { BLOOD_TYPE_LABEL, type BloodTypeKey } from "@/lib/blood-stock-constants"

// Template do e-mail de convocação. Usa tabelas e estilos inline porque a
// maioria dos clientes de e-mail (Gmail, Outlook) ignora CSS externo, flexbox
// e grid.

export type CampaignEmailInput = {
  donorName: string
  donorBloodType: BloodTypeKey
  lastDonationAt: Date | null
  subject: string
  title: string
  message: string
  campaignBloodTypes: BloodTypeKey[]
  appUrl: string
}

export const OFFICIAL_DONATION_URL = "https://cidadao.saude.al.gov.br/transparencia/doacoes/"

const COLORS = {
  red: "#b91c1c",
  redDark: "#7f1d1d",
  redSoft: "#fef2f2",
  redBorder: "#fecaca",
  ink: "#18181b",
  muted: "#52525b",
  subtle: "#a1a1aa",
  line: "#e4e4e7",
  page: "#f4f4f5",
  white: "#ffffff",
}

const FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"

const REQUIREMENTS = [
  "Leve um documento oficial com foto.",
  "Tenha entre 16 e 69 anos (menores de 18 precisam de autorização dos responsáveis).",
  "Pese mais de 50 kg e esteja bem de saúde.",
  "Durma bem na noite anterior e não vá em jejum — evite apenas alimentos gordurosos nas 3 horas antes.",
]

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

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "long", timeZone: "UTC" }).format(value)
}

function paragraphs(message: string) {
  return message
    .trim()
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
}

function bloodTypePills(bloodTypes: BloodTypeKey[], highlight: BloodTypeKey) {
  return bloodTypes
    .map((bloodType) => {
      const active = bloodType === highlight
      return `<span style="display:inline-block;margin:0 6px 6px 0;padding:6px 12px;border-radius:999px;font-family:${FONT};font-size:14px;font-weight:700;line-height:1;${
        active
          ? `background:${COLORS.red};color:${COLORS.white};border:1px solid ${COLORS.red};`
          : `background:${COLORS.white};color:${COLORS.red};border:1px solid ${COLORS.redBorder};`
      }">${escapeHtml(BLOOD_TYPE_LABEL[bloodType])}</span>`
    })
    .join("")
}

export function renderCampaignEmail(input: CampaignEmailInput) {
  const name = escapeHtml(firstName(input.donorName))
  const bloodType = escapeHtml(BLOOD_TYPE_LABEL[input.donorBloodType])
  const appUrl = escapeHtml(input.appUrl)
  const preheader = escapeHtml(
    `${firstName(input.donorName)}, o HEMOAL precisa de doadores ${BLOOD_TYPE_LABEL[input.donorBloodType]}.`,
  )
  const body = paragraphs(input.message)
    .map(
      (paragraph) =>
        `<p style="margin:0 0 16px;font-family:${FONT};font-size:16px;line-height:1.65;color:${COLORS.ink};">${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`,
    )
    .join("")
  const lastDonation = input.lastDonationAt
    ? `Sua última doação registrada foi em <strong>${formatDate(input.lastDonationAt)}</strong>. Obrigado por continuar com a gente!`
    : "Não temos registro da sua última doação. Se já doou nos últimos meses, confirme no local se já pode doar novamente."

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
<tr><td align="center" style="padding:32px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;">

<tr><td style="padding:0 4px 16px;font-family:${FONT};font-size:12px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:${COLORS.red};">
Hemo Alerta
</td></tr>

<tr><td style="background:${COLORS.white};border:1px solid ${COLORS.line};border-radius:20px;overflow:hidden;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">

<tr><td style="background:${COLORS.red};background-image:linear-gradient(135deg, ${COLORS.red} 0%, ${COLORS.redDark} 100%);padding:36px 32px;border-radius:20px 20px 0 0;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
<td valign="middle" style="font-family:${FONT};color:${COLORS.white};">
<p style="margin:0 0 8px;font-size:13px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:#fecaca;">Convocação para doação</p>
<h1 style="margin:0;font-size:26px;line-height:1.25;font-weight:700;color:${COLORS.white};">${name}, o seu sangue pode salvar vidas hoje.</h1>
</td>
<td valign="middle" align="right" width="96" style="padding-left:16px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="right"><tr>
<td align="center" valign="middle" width="84" height="84" style="width:84px;height:84px;border-radius:42px;background:${COLORS.white};font-family:${FONT};text-align:center;">
<div style="font-size:28px;font-weight:800;line-height:1;color:${COLORS.red};">${bloodType}</div>
<div style="margin-top:4px;font-size:10px;font-weight:600;letter-spacing:1px;text-transform:uppercase;color:${COLORS.muted};">seu tipo</div>
</td>
</tr></table>
</td>
</tr></table>
</td></tr>

<tr><td style="padding:32px 32px 8px;">
<h2 style="margin:0 0 16px;font-family:${FONT};font-size:20px;line-height:1.3;color:${COLORS.ink};">${escapeHtml(input.title)}</h2>
${body}
</td></tr>

<tr><td style="padding:0 32px 8px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${COLORS.redSoft};border:1px solid ${COLORS.redBorder};border-radius:14px;">
<tr><td style="padding:20px;">
<p style="margin:0 0 12px;font-family:${FONT};font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:${COLORS.red};">Tipos sanguíneos em necessidade</p>
<div>${bloodTypePills(input.campaignBloodTypes, input.donorBloodType)}</div>
<p style="margin:8px 0 0;font-family:${FONT};font-size:14px;line-height:1.55;color:${COLORS.muted};">${lastDonation}</p>
</td></tr>
</table>
</td></tr>

<tr><td align="center" style="padding:24px 32px 8px;">
<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
<td align="center" bgcolor="${COLORS.red}" style="border-radius:999px;background:${COLORS.red};">
<a href="${appUrl}" target="_blank" style="display:inline-block;padding:15px 30px;font-family:${FONT};font-size:16px;font-weight:700;color:${COLORS.white};text-decoration:none;border-radius:999px;">Ver o estoque de sangue agora</a>
</td>
</tr></table>
<p style="margin:12px 0 0;font-family:${FONT};font-size:13px;color:${COLORS.muted};">
Locais e horários de coleta: <a href="${OFFICIAL_DONATION_URL}" target="_blank" style="color:${COLORS.red};font-weight:600;">portal oficial de doações de Alagoas</a>
</p>
</td></tr>

<tr><td style="padding:24px 32px 32px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-top:1px solid ${COLORS.line};">
<tr><td style="padding-top:24px;">
<p style="margin:0 0 12px;font-family:${FONT};font-size:15px;font-weight:700;color:${COLORS.ink};">Antes de ir doar</p>
${REQUIREMENTS.map(
  (item) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:8px;"><tr>
<td valign="top" width="22" style="font-family:${FONT};font-size:15px;line-height:1.5;color:${COLORS.red};font-weight:700;">✓</td>
<td valign="top" style="font-family:${FONT};font-size:14px;line-height:1.5;color:${COLORS.muted};">${escapeHtml(item)}</td>
</tr></table>`,
).join("")}
</td></tr>
</table>
</td></tr>

</table>
</td></tr>

<tr><td style="padding:24px 8px 0;font-family:${FONT};font-size:12px;line-height:1.6;color:${COLORS.subtle};text-align:center;">
Você recebeu este e-mail porque está cadastrado como doador no Hemo Alerta, iniciativa de acompanhamento do estoque de sangue do HEMOAL.<br>
Se não quiser mais receber convocações, fale com a equipe do HEMOAL para atualizar seu cadastro.
</td></tr>

</table>
</td></tr>
</table>
</body>
</html>`

  const text = [
    `${firstName(input.donorName)}, o seu sangue pode salvar vidas hoje.`,
    "",
    input.title,
    "",
    paragraphs(input.message).join("\n\n"),
    "",
    `Seu tipo sanguíneo: ${BLOOD_TYPE_LABEL[input.donorBloodType]}`,
    `Tipos em necessidade: ${input.campaignBloodTypes.map((type) => BLOOD_TYPE_LABEL[type]).join(", ")}`,
    input.lastDonationAt
      ? `Sua última doação registrada: ${formatDate(input.lastDonationAt)}.`
      : "Não temos registro da sua última doação.",
    "",
    `Veja o estoque de sangue atual: ${input.appUrl}`,
    `Locais e horários de coleta: ${OFFICIAL_DONATION_URL}`,
    "",
    "Antes de ir doar:",
    ...REQUIREMENTS.map((item) => `- ${item}`),
    "",
    "--",
    "Você recebeu este e-mail porque está cadastrado como doador no Hemo Alerta.",
    "Se não quiser mais receber convocações, fale com a equipe do HEMOAL para atualizar seu cadastro.",
  ].join("\n")

  return { subject: input.subject, html, text }
}
