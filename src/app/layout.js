import "./globals.css";
import { Kanit, Orbitron } from "next/font/google";

const kanit = Kanit({
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  subsets: ["thai", "latin"],
  variable: "--font-kanit",
  display: "swap",
});

const orbitron = Orbitron({
  weight: ["400", "700", "900"],
  subsets: ["latin"],
  variable: "--font-orbitron",
  display: "swap",
});

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
    <html lang="th" className={`${kanit.variable} ${orbitron.variable}`}>
      <body>{children}</body>
    </html>
  );
}
