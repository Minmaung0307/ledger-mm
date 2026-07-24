import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SettingsProvider } from "@/lib/SettingsContext";

// ၁။ Font များကို သတ်မှတ်ခြင်း
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// ၂။ PWA နှင့် SEO အတွက် Metadata (အမှန်ကန်ဆုံး ပုံစံ)
export const metadata: Metadata = {
  title: "SimpleLedger US | Cloud Accounting",
  description: "Professional minimalist accounting for US Small Business",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SimpleLedger",
  },
  // Mobile ဖုန်းမှာ icon လှလှလေး ပေါ်ဖို့
  icons: {
    apple: "https://www.google.com/favicon.ico",
  }
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning={true}>
      <head>
        {/* PWA အတွက် လိုအပ်သော ထပ်ဆောင်း meta များ */}
        <meta name="theme-color" content="#10b981" />
        <link rel="apple-touch-icon" href="https://www.google.com/favicon.ico" />
      </head>
      <body 
        // ၃။ Font Variable များကို ဤနေရာတွင် အသေအချာ သုံးပေးရပါမည်
        // ဒါဆိုရင် အပေါ်က font တွေ အရောင်ပြန်တောက်လာပါလိမ့်မယ်
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
        suppressHydrationWarning={true}
      >
        <SettingsProvider>
          {children}
        </SettingsProvider>
      </body>
    </html>
  )
}