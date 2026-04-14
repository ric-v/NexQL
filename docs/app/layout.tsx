import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PgStudio",
  description: "PostgreSQL management for VS Code",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
