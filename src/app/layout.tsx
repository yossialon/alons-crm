import type { Metadata, Viewport } from 'next';
import { DM_Sans, DM_Mono } from 'next/font/google';
import MetaPixel from '@/components/MetaPixel';
import './globals.css';

const dmSans = DM_Sans({
  subsets:  ['latin'],
  variable: '--font-dm-sans',
  display:  'swap',
  weight:   ['300', '400', '500', '600', '700'],
});

const dmMono = DM_Mono({
  subsets:  ['latin'],
  variable: '--font-dm-mono',
  display:  'swap',
  weight:   ['300', '400', '500'],
});

export const metadata: Metadata = {
  title: "Alon's Kitchens — Lead Hub",
  description: "CRM & Lead Generation for Alon's Kitchens",
};

export const viewport: Viewport = {
  width:        'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)',  color: '#09090b' },
  ],
};

// Runs before React hydration — sets `dark` class with no flash.
const themeScript = `(function(){try{var t=localStorage.getItem('theme');if(t==='dark'||(t===null&&window.matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.classList.add('dark')}}catch{}})()`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${dmSans.variable} ${dmMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="font-sans antialiased">
        {children}
        {/*
         * MetaPixel renders the fbevents.js <Script> and watches for
         * pathname changes to fire PageView on client-side navigation.
         * Pixel ID comes from NEXT_PUBLIC_META_PIXEL_ID — no hardcoding here.
         */}
        <MetaPixel />
      </body>
    </html>
  );
}
