import type React from "react"
import "./globals.css"
import ClientLayout from "./client-layout"
import { ThemeProvider } from "@/components/theme-provider"
import { AuthProvider } from "@/contexts/AuthContext"
import { NotificationProvider } from "@/components/notification"
import { Toaster } from "@/components/ui/sonner"

export default function RootLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className="font-sans antialiased">
                <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
                    <AuthProvider>
                        <NotificationProvider>
                            <ClientLayout>{children}</ClientLayout>
                        </NotificationProvider>
                    </AuthProvider>
                </ThemeProvider>
                <Toaster />
            </body>
        </html>
    )
}

export const metadata = {
    title: "Drafin- AI Video Assessment Platform",
    description: "Platform SaaS profesional untuk layanan teknologi informasi terkelola",
    generator: "v0.dev",
}
