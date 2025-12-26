import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta-sans",
});

export const metadata: Metadata = {
  title: "TENISLAB | O Laboratório do seu Tênis",
  description: "Higienização, restauração e cuidado especializado para seus tênis. Acompanhe seu pedido online.",
  metadataBase: new URL("https://www.tenislab.app.br"),
  openGraph: {
    title: "TENISLAB | O Laboratório do seu Tênis",
    description: "Higienização, restauração e cuidado especializado para seus tênis.",
    url: "https://www.tenislab.app.br",
    siteName: "TENISLAB",
    locale: "pt_BR",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
    return (
      <html lang="pt-BR" suppressHydrationWarning>
          <body
            className={`${plusJakartaSans.variable} font-sans antialiased bg-white`}
          >
          <main className="min-h-screen flex flex-col items-center justify-center p-4">
            {children}
          </main>
          <Toaster />
        </body>
    </html>
  );
}
