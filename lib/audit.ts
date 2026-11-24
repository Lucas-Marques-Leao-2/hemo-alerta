// Ações registradas na auditoria e seus rótulos no painel.
export const AUDIT_ACTION_LABEL = {
  "donor.create": "Cadastrou doador",
  "donor.update": "Editou doador",
  "donor.delete": "Excluiu doador",
  "donation.record": "Registrou doação",
  "donation.remove": "Removeu doação",
  "donation.undo": "Desfez registro de doação",
  "appointment.schedule": "Agendou doação",
  "appointment.reschedule": "Mudou agendamento",
  "appointment.status": "Alterou agendamento",
  "appointment.cancel": "Cancelou agendamento",
  "invitation.decline": "Respondeu que não pode agora",
  "donor.preference": "Alterou preferência de contato",
  "campaign.create": "Criou campanha",
  "campaign.update": "Editou campanha",
  "campaign.delete": "Excluiu campanha",
  "campaign.send": "Enviou campanha",
  "campaign.resend": "Reenviou falhas",
  "campaign.close": "Encerrou campanha",
  "settings.update": "Alterou configurações",
  "user.create": "Criou usuário",
  "report.export": "Exportou planilha",
} as const

export type AuditAction = keyof typeof AUDIT_ACTION_LABEL

export const AUDIT_ENTITY_LABEL = {
  donor: "Doador",
  donation: "Doação",
  appointment: "Agendamento",
  campaign: "Campanha",
  settings: "Configurações",
  user: "Usuário",
  report: "Planilha",
} as const

export type AuditEntity = keyof typeof AUDIT_ENTITY_LABEL

export const AUDIT_ENTITIES = Object.keys(AUDIT_ENTITY_LABEL) as AuditEntity[]

export const DONOR_LINK_ACTOR = "Doador (link do e-mail)"

export const AUDIT_PAGE_SIZE = 50
