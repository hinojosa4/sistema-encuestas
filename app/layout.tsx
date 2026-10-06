// app/layout.tsx
import type { Metadata, Viewport } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Sistema de Análisis de Mercado - UMSS ARCUSUR",
  description: "Plataforma de recolección y análisis de datos de titulados y empleadores",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full">
      <body className="bg-slate-50 min-h-screen text-slate-800 flex flex-col font-sans overflow-x-hidden antialiased">
        <Navbar />
        <main className="flex-grow w-full max-w-full">
          {children}
        </main>
        <footer className="bg-white border-t border-slate-200 py-4 px-4 text-center text-xs text-slate-500">
          Facultad de Ciencias y Tecnología · Universidad Mayor de San Simón · Cochabamba, Bolivia
        </footer>
      </body>
    </html>
  );
}