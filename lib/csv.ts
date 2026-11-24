// CSV no formato que o Excel em português abre direto: separador ";",
// BOM UTF-8 e quebra de linha CRLF.

type Cell = string | number | boolean | null | undefined

function escapeCell(value: Cell) {
  if (value === null || value === undefined) return ""

  let text = String(value)
  // Evita injeção de fórmulas ao abrir a planilha.
  if (/^[=+\-@\t\r]/.test(text)) text = `'${text}`

  return /[";\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

export function toCsv(header: string[], rows: Cell[][]) {
  return `﻿${[header, ...rows].map((row) => row.map(escapeCell).join(";")).join("\r\n")}\r\n`
}
