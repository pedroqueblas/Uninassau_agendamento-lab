import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Agendamento do Laboratório | UNISSAU",
  description:
    "Sistema de agendamento do laboratório de informática da UNISSAU.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <div className="min-h-screen">
          {children}
          <footer className="border-t border-blue-800 bg-blue-700 px-4 py-6 text-center text-sm text-white sm:px-6 lg:px-10">
            Desenvolvido por Pedro_Queblas
          </footer>
        </div>
      </body>
    </html>
  );
}
