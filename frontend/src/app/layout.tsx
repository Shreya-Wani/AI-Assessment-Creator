import './globals.css';
import { ThemeProvider } from '@/providers/ThemeProvider';
import BottomNav from '@/components/BottomNav';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider attribute="class" defaultTheme="light">
          {children}
          <BottomNav />
        </ThemeProvider>
      </body>
    </html>
  );
}
