import { createAccessControl } from "better-auth/plugins/access"
import { adminAc, defaultStatements } from "better-auth/plugins/admin/access"

// Recursos e ações controlados no painel administrativo. `user` e `session`
// vêm do plugin admin do Better Auth; `donor` é o cadastro de doadores e
// `campaign` as campanhas de convocação (`configure` altera as regras de
// intervalo entre convocações), `donation` o histórico de doações realizadas e
// `appointment` os agendamentos feitos pelos doadores ou pela equipe e
// `audit` o registro de auditoria. `report.export` gera planilhas CSV com dados
// pessoais (doadores, doações e agendamentos).
export const statement = {
  ...defaultStatements,
  donor: ["create", "list", "update", "delete"],
  campaign: ["create", "list", "update", "delete", "send", "configure"],
  donation: ["create", "list", "delete"],
  appointment: ["create", "list", "update"],
  audit: ["list"],
  report: ["export"],
} as const

export const ac = createAccessControl(statement)

// Gestor do HEMOAL: controle total, incluindo a criação de novos usuários.
export const admin = ac.newRole({
  ...adminAc.statements,
  donor: ["create", "list", "update", "delete"],
  campaign: ["create", "list", "update", "delete", "send", "configure"],
  donation: ["create", "list", "delete"],
  appointment: ["create", "list", "update"],
  audit: ["list"],
  report: ["export"],
})

// Profissional do HEMOAL ou de unidade subordinada: opera o cadastro de
// doadores, as campanhas, as doações e os agendamentos, mas não gerencia
// usuários, não exclui registros (exceto desfazer a própria doação recém
// registrada) e não altera as regras de convocação.
export const staff = ac.newRole({
  donor: ["create", "list", "update"],
  campaign: ["create", "list", "update", "send"],
  donation: ["create", "list"],
  appointment: ["create", "list", "update"],
})

export const roles = { admin, staff }

export type Role = keyof typeof roles

export const DEFAULT_ROLE: Role = "staff"

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Gestor",
  staff: "Profissional",
}

export function isRole(value: unknown): value is Role {
  return typeof value === "string" && value in roles
}
