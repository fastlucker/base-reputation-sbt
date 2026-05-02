import "./globals.css";
import { Providers } from "./providers";

export const metadata = {
  title: "Base Reputation Score",
  description: "Anchor a serious Base activity score onchain."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
