import "./globals.css";

export const metadata = {
  title: "แฟนพันธุ์ Trial Run 2026",
  description: "การแข่งขันแฟนพันธุ์แท้ Trial Run 2026 - เกมทดสอบความรู้ 4 หมวด",
};

export default function RootLayout({ children }) {
  return (
    <html lang="th">
      <body>{children}</body>
    </html>
  );
}
