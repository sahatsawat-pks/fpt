import "./globals.css";

export const metadata = {
  title: "แฟนพันธุ์แท้แห่งปี 2026 | Fanpantae 2026",
  description: "การแข่งขันแฟนพันธุ์แท้แห่งปี 2026 - ระบบแข่งขัน ตารางคะแนน และจำลองการจับสลาก",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/favicon.png", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/favicon.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
