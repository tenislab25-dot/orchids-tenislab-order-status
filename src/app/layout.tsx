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
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TENISLAB",
  },
    openGraph: {
      title: "TENISLAB | O Laboratório do seu Tênis",
      description: "Higienização, restauração e cuidado especializado para seus tênis.",
      url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
      siteName: "TENISLAB",
      locale: "pt_BR",
      type: "website",
    images: [
      {
        url: "https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/document-uploads/logo-1766879913032.PNG?width=1200&height=1200&resize=contain",
        width: 1200,
        height: 1200,
        alt: "TENISLAB",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "TENISLAB | O Laboratório do seu Tênis",
    description: "Higienização, restauração e cuidado especializado para seus tênis.",
    images: ["https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/document-uploads/logo-1766879913032.PNG?width=1200&height=1200&resize=contain"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#0f172a",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/icon.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body
        className={`${plusJakartaSans.variable} font-sans antialiased bg-white`}
      >
        <main className="min-h-screen">
          {children}
        </main>
        <Toaster />
      </body>
    </html>
  );
}
