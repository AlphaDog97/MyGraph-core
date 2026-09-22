import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MyGraph — Knowledge workspace",
  description: "Build, connect, and maintain your personal knowledge graph.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
