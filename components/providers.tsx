"use client"

import { MantineProvider, createTheme } from "@mantine/core"
import { Notifications } from "@mantine/notifications"

const theme = createTheme({
  primaryColor: "red",
  defaultRadius: "md",
})

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MantineProvider theme={theme} defaultColorScheme="auto">
      <Notifications position="bottom-right" limit={4} />
      {children}
    </MantineProvider>
  )
}
