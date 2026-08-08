import type { Metadata } from 'next';
import { IBM_Plex_Mono, IBM_Plex_Sans_Arabic } from 'next/font/google';
import './globals.css';

const plexMono = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-mono',
  display: 'swap',
});

const plexSansArabic = IBM_Plex_Sans_Arabic({
  subsets: ['arabic'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-arabic',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'مرصد الموارد الطبية — سوريا',
  description: 'لوحة مراقبة حية للموارد الطبية وسيارات الإسعاف عبر محافظات الجمهورية العربية السورية',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl" className={`${plexMono.variable} ${plexSansArabic.variable}`}>
      <body>{children}</body>
    </html>
  );
}
