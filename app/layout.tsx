import "./globals.css";
import { Providers } from "./providers";

export const metadata = {
  title: "Base Reputation Score",
  description: "Onchain resume for Base users",
  other: {
    "base:app_id": "69f85d4869d7864e61d73afb"
  }
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
