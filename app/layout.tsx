import type React from "react"
import "./globals.css"
import ClientLayout from "./client-layout"
import { ThemeProvider } from "@/lib/components/theme-provider"
import { AuthProvider } from "@/lib/contexts/AuthContext"
import { NotificationProvider } from "@/lib/components/notification"
import { Toaster } from "@/lib/components/ui/sonner"
import { icons } from "lucide-react"

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
    title: "Drafin - Turn Video into Knowledge",
    description: "Platform SaaS profesional untuk layanan teknologi informasi terkelola",
    generator: "v0.dev",
}
