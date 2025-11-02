import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "@/contexts/Providers";

export const metadata: Metadata = {
  title: "Docuvi - Sistema de Gestión Documental",
  description: "Sistema de control y gestión de documentos para contratistas y proveedores",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="antialiased">
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
