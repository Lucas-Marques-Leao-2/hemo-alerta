"use client"

import { MantineProvider, createTheme } from "@mantine/core"

const theme = createTheme({
  primaryColor: "red",
  defaultRadius: "md",
})

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MantineProvider theme={theme} defaultColorScheme="auto">
      {children}
    </MantineProvider>
  )
}
