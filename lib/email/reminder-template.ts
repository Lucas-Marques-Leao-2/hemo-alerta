import { APPOINTMENT_PERIOD_LABEL, formatLongDate, type AppointmentPeriodKey } from "@/lib/donation"
import { OFFICIAL_DONATION_URL } from "@/lib/email/campaign-template"

type ReminderEmailInput = {
  donorName: string
  date: string
  period: AppointmentPeriodKey
  manageUrl: string | null
}

const FONT = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

// Lembrete enviado na véspera do agendamento.
export function renderReminderEmail({ donorName, date, period, manageUrl }: ReminderEmailInput) {
  const name = escapeHtml(donorName.trim().split(/\s+/)[0] ?? donorName)
  const when = `amanhã, ${formatLongDate(date)}, no período da ${APPOINTMENT_PERIOD_LABEL[period].toLowerCase()}`
  const subject = "Lembrete: sua doação de sangue é amanhã"
  const url = manageUrl ? escapeHtml(manageUrl) : null

  const html = `<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="color-scheme" content="light"><title>${subject}</title></head>
<body style="margin:0;padding:0;background:#f4f4f5;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f4f4f5;"><tr><td align="center" style="padding:32px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
<tr><td style="padding:0 4px 16px;font-family:${FONT};font-size:12px;font-weight:700;letter-spacing:3px;text-transform:uppercase;color:#b91c1c;">Hemo Alerta</td></tr>
<tr><td style="background:#ffffff;border:1px solid #e4e4e7;border-radius:20px;padding:32px;">
<p style="margin:0 0 8px;font-family:${FONT};font-size:13px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#b91c1c;">Até amanhã!</p>
<h1 style="margin:0 0 16px;font-family:${FONT};font-size:24px;line-height:1.3;color:#18181b;">${name}, sua doação está marcada para ${escapeHtml(when)}.</h1>
<p style="margin:0 0 20px;font-family:${FONT};font-size:16px;line-height:1.6;color:#3f3f46;">Obrigado por se comprometer. Algumas dicas para tudo correr bem:</p>
<ul style="margin:0 0 24px;padding-left:20px;font-family:${FONT};font-size:15px;line-height:1.7;color:#52525b;">
<li>Leve um documento oficial com foto.</li>
<li>Durma bem hoje e beba bastante água.</li>
<li>Não vá em jejum; evite comida gordurosa nas 3 horas antes.</li>
</ul>
${
  url
    ? `<table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr><td bgcolor="#b91c1c" style="border-radius:999px;background:#b91c1c;"><a href="${url}" target="_blank" style="display:inline-block;padding:13px 26px;font-family:${FONT};font-size:15px;font-weight:700;color:#ffffff;text-decoration:none;border-radius:999px;">Ver ou mudar meu agendamento</a></td></tr></table>`
    : ""
}
<p style="margin:20px 0 0;font-family:${FONT};font-size:13px;color:#71717a;">Locais e horários de coleta: <a href="${OFFICIAL_DONATION_URL}" target="_blank" style="color:#b91c1c;font-weight:600;">portal oficial de doações de Alagoas</a></p>
</td></tr>
<tr><td style="padding:20px 8px 0;font-family:${FONT};font-size:12px;line-height:1.6;color:#a1a1aa;text-align:center;">Você recebeu este lembrete porque agendou uma doação pelo Hemo Alerta.</td></tr>
</table></td></tr></table>
</body></html>`

  const text = [
    `${donorName.trim().split(/\s+/)[0]}, sua doação está marcada para ${when}.`,
    "",
    "Dicas: leve um documento oficial com foto, durma bem, beba água e não vá em jejum.",
    "",
    ...(manageUrl ? [`Ver ou mudar seu agendamento: ${manageUrl}`] : []),
    `Locais e horários de coleta: ${OFFICIAL_DONATION_URL}`,
  ].join("\n")

  return { subject, html, text }
}
