import "./globals.css";

export const metadata = {
  title: "FIST DATA",
  description: "Fast and affordable Nigerian mobile data.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
