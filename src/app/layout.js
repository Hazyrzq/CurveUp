import './globals.css';
import { Plus_Jakarta_Sans } from 'next/font/google';

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-jakarta',
});

export const metadata = {
  title: 'CurveUp',
  description: 'Construction project monitoring with S-curve progress tracking.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${jakarta.variable} font-sans antialiased text-slate-900 bg-canvas`}>{children}</body>
    </html>
  );
}
