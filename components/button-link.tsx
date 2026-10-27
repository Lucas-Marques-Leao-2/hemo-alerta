"use client"

import { Button, type ButtonProps } from "@mantine/core"
import Link from "next/link"

// Botão do Mantine renderizado como `next/link`. Server Components não podem
// passar `component={Link}` diretamente, então o vínculo fica neste wrapper.
export function ButtonLink({
  href,
  children,
  ...props
}: ButtonProps & { href: string; children: React.ReactNode }) {
  return (
    <Button component={Link} href={href} {...props}>
      {children}
    </Button>
  )
}
