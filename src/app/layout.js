import "./globals.css";
import { Kanit, Prompt, Orbitron, Lexend } from "next/font/google";

const kanit = Kanit({
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  subsets: ["thai", "latin"],
  variable: "--font-kanit",
  display: "swap",
});

const prompt = Prompt({
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  subsets: ["thai", "latin"],
  variable: "--font-prompt",
  display: "swap",
});

const orbitron = Orbitron({
  weight: ["400", "700", "900"],
  subsets: ["latin"],
  variable: "--font-orbitron",
  display: "swap",
});

const lexend = Lexend({
  weight: ["400", "500", "600", "700", "800", "900"],
  subsets: ["latin"],
  variable: "--font-lexend",
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
    <html lang="th" className={`${kanit.variable} ${prompt.variable} ${orbitron.variable} ${lexend.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Kanit:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,300;1,400;1,700;1,900&family=Lexend:wght@400;500;600;700;800;900&family=Prompt:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,300;1,400;1,700;1,900&family=Noto+Sans+Thai:wght@300;400;500;600;700;800;900&family=Orbitron:wght@400;700;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
