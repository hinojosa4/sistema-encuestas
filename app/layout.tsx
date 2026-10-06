// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Sistema de Análisis de Mercado - UMSS ARCUSUR",
  description: "Plataforma de recolección y análisis de datos de titulados y empleadores",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="bg-slate-50 min-h-screen text-slate-800 flex flex-col font-sans">
        <Navbar />
        <main className="flex-grow">
          {children}
        </main>
        <footer className="bg-white border-t border-slate-200 py-4 text-center text-xs text-slate-500">
          Facultad de Ciencias y Tecnología · Universidad Mayor de San Simón · Cochabamba, Bolivia
        </footer>
      </body>
    </html>
  );
}