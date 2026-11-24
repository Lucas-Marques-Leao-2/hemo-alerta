import { addDays } from "@/lib/donation"

type CalendarEvent = {
  date: string
  title: string
  details: string
  uid: string
}

const compact = (date: string) => date.replaceAll("-", "")

function escapeIcs(value: string) {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\n/g, "\\n")
}

// Evento de dia inteiro: o horário exato depende do funcionamento do hemocentro.
export function buildIcs({ date, title, details, uid }: CalendarEvent) {
  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Hemo Alerta//Agendamento de doação//PT-BR",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${uid}@hemoalerta`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${compact(date)}`,
    `DTEND;VALUE=DATE:${compact(addDays(date, 1))}`,
    `SUMMARY:${escapeIcs(title)}`,
    `DESCRIPTION:${escapeIcs(details)}`,
    "BEGIN:VALARM",
    "TRIGGER:-PT15H",
    "ACTION:DISPLAY",
    `DESCRIPTION:${escapeIcs(title)}`,
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n")
}

export function googleCalendarUrl({ date, title, details }: Omit<CalendarEvent, "uid">) {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${compact(date)}/${compact(addDays(date, 1))}`,
    details,
  })

  return `https://calendar.google.com/calendar/render?${params}`
}
