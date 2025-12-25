import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta-sans",
});

export const metadata: Metadata = {
  title: "TENISLAB | Consulta de Pedido",
  description: "Consulte o status da sua ordem de serviço na TENISLAB.",
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
    <html lang="pt-BR">
      <body
        className={`${plusJakartaSans.variable} font-sans antialiased bg-white`}
      >
        <main className="min-h-screen flex flex-col items-center justify-center p-4">
          <div className="w-full max-w-md mx-auto">
            {children}
          </div>
        </main>
        <Toaster />
      </body>
    </html>
  );
}
