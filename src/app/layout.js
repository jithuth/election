import './globals.css';
import Analytics from '../components/Analytics';

export const metadata = {
  title: 'Live Election News 24/7 | Multi-State Command Center',
  description: 'Watch multiple live state election news channels simultaneously in real-time. Join the discussion, view live counting updates, and stay ahead with our premium 4-channel live grid.',
  keywords: ['live election news', 'election results', '24/7 news', 'state news live', 'election command center', 'live news grid'],
  authors: [{ name: 'News Portal' }],
  openGraph: {
    title: 'Live Election News 24/7',
    description: 'Watch 4 live election news streams at the same time. Real-time community chat and live updates.',
    type: 'website',
  },
  robots: {
    index: true,
    follow: true,
  }
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* Google Fonts for premium modern typography */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet" />
        
        {/* Structured Data for News Portal SEO */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "NewsMediaOrganization",
              "name": "Live Election News 24/7",
              "url": "https://news-portal.com",
              "logo": "https://news-portal.com/logo.png",
              "sameAs": [
                "https://facebook.com/newportal",
                "https://twitter.com/newsportal"
              ],
              "description": "Premium multi-state live election monitoring command center."
            })
          }}
        />
      </head>
      <body>
        <Analytics />
        {children}
      </body>
    </html>
  );
}
