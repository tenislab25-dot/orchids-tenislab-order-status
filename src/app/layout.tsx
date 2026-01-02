import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { OfflineIndicator } from "@/components/OfflineIndicator";
import { InstallPrompt } from "@/components/InstallPrompt";
import Script from "next/script";

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta-sans",
});

export const metadata: Metadata = {
  title: "TENISLAB | O Laboratório do seu Tênis",
  description: "Higienização, restauração e cuidado especializado para seus tênis. Acompanhe seu pedido online.",
  metadataBase: new URL("https://www.tenislab.app.br"),
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TENISLAB",
  },
    openGraph: {
      title: "TENISLAB | O Laboratório do seu Tênis",
      description: "Higienização, restauração e cuidado especializado para seus tênis.",
      url: "https://www.tenislab.app.br",
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
  maximumScale: 1,
  userScalable: false,
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
        <link rel="apple-touch-icon" href="https://slelguoygbfzlpylpxfs.supabase.co/storage/v1/render/image/public/document-uploads/logo-1766879913032.PNG?width=180&height=180&resize=contain" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
      </head>
      <body
        className={`${plusJakartaSans.variable} font-sans antialiased bg-white`}
      >
        <main className="min-h-screen">
          {children}
        </main>
        <OfflineIndicator />
        <InstallPrompt />
        <Toaster />
        <Script id="sw-register" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              window.addEventListener('load', () => {
                navigator.serviceWorker.register('/sw.js')
                  .then((registration) => {
                    console.log('SW registered:', registration);
                  })
                  .catch((error) => {
                    console.log('SW registration failed:', error);
                  });
              });
            }
          `}
        </Script>
      </body>
    </html>
  );
}
