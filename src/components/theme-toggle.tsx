"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { Moon, Sun } from "lucide-react"

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  
  // useEffect only runs on the client, so we can safely show the UI
  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    // Render placeholder to avoid layout shift
    return (
      <button className="flex items-center justify-center p-2 rounded-lg bg-[#252525] text-[#f7eee3] transition-colors duration-200">
        <div className="h-4 w-4" />
      </button>
    )
  }

  return (
    <button
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      className="flex items-center justify-start gap-2 rounded-lg p-2  hover:bg-[#323232] text-[#f7eee3] transition-colors duration-200"
      title={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
    >
      {theme === "dark" ? (
        <Sun className="h-4 w-4" />
      ) : (
        <Moon className="h-4 w-4" />
      )}
      <span className="sr-only md:not-sr-only md:inline-block">
        {theme === "dark" ? "Light Mode" : "Dark Mode"}
      </span>
    </button>
  )
}
