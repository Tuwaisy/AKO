import '../styles/globals.css'
import { Inter, Noto_Sans_Arabic } from 'next/font/google'
import { Providers } from './providers'
import { Toaster } from '@/components/ui/toaster'
import { cn } from '@/lib/utils'

const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
})

const notoSansArabic = Noto_Sans_Arabic({
  subsets: ['arabic'],
  display: 'swap',
  variable: '--font-arabic',
})

export const metadata = {
  title: {
    default: 'AKO Courses - Learning Management System',
    template: '%s | AKO Courses',
  },
  description: 'Advanced Learning Management System with role-based access, secure video streaming, and comprehensive course management.',
  keywords: ['LMS', 'Learning Management System', 'Education', 'Online Courses', 'AKO Courses'],
  authors: [{ name: 'AKO Courses' }],
  creator: 'AKO Courses',
  publisher: 'AKO Courses',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  metadataBase: new URL(process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3000'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    alternateLocale: 'ar_EG',
    url: process.env.NEXT_PUBLIC_WEB_URL || 'http://localhost:3000',
    title: 'AKO Courses - Learning Management System',
    description: 'Advanced Learning Management System with role-based access, secure video streaming, and comprehensive course management.',
    siteName: 'AKO Courses',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'AKO Courses',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AKO Courses - Learning Management System',
    description: 'Advanced Learning Management System with role-based access, secure video streaming, and comprehensive course management.',
    images: ['/og-image.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_VERIFICATION,
  },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: 'white' },
    { media: '(prefers-color-scheme: dark)', color: 'black' },
  ],
}

interface RootLayoutProps {
  children: React.ReactNode
  params: { locale?: string }
}

export default function RootLayout({ children, params }: RootLayoutProps) {
  const locale = params?.locale || 'en'
  const isRTL = locale === 'ar'

  return (
    <html 
      lang={locale} 
      dir={isRTL ? 'rtl' : 'ltr'}
      className={cn(
        inter.variable,
        notoSansArabic.variable,
        isRTL && 'font-arabic'
      )}
      suppressHydrationWarning
    >
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={cn(
        'min-h-screen bg-background font-sans antialiased',
        isRTL && 'font-arabic'
      )}>
        <Providers locale={locale}>
          {children}
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}
