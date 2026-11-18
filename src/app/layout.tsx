import type { Metadata, Viewport } from 'next';
import './globals.css';
import { LiffProvider } from '@/components/LiffProvider';
import { BottomNav } from '@/components/BottomNav';

export const metadata: Metadata = {
  title: 'KinLog — Thai Food & Sweet Tracker',
  description: 'บันทึกอาหารหลักไทย แยกส่วนประกอบ คำนวณแคลอรี่ และคุมโควต้าน้ำหวานผ่าน LINE',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <body className="min-h-screen bg-slate-50 pb-20 text-slate-900 antialiased">
        <LiffProvider>
          <main className="mx-auto max-w-md px-4 pt-4">{children}</main>
          <BottomNav />
        </LiffProvider>
      </body>
    </html>
  );
}
