"use client"

import { Button, Menu } from "@mantine/core"

type ExportItem = { label: string; description?: string; href: string }

// Baixa planilhas CSV. O arquivo vem da rota /api/export, que confere a
// permissão e registra a exportação na auditoria.
export function ExportMenu({ items }: { items: ExportItem[] }) {
  if (items.length === 1) {
    return (
      <Button component="a" href={items[0].href} download variant="default">
        {items[0].label}
      </Button>
    )
  }

  return (
    <Menu position="bottom-end" width={260}>
      <Menu.Target>
        <Button variant="default">Exportar CSV</Button>
      </Menu.Target>
      <Menu.Dropdown>
        {items.map((item) => (
          <Menu.Item key={item.href} component="a" href={item.href} download>
            <span className="block font-medium">{item.label}</span>
            {item.description && <span className="block text-xs text-zinc-500">{item.description}</span>}
          </Menu.Item>
        ))}
      </Menu.Dropdown>
    </Menu>
  )
}
