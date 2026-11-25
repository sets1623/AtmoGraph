import "./globals.css";

export const metadata = {
  title: "AtmoGraph | Supply Chain Intelligence",
  description: "Supply Chain Ripple Effect Intelligence Platform"
};

export default function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
