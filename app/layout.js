import { ClerkProvider } from '@clerk/nextjs';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'TWIST - Social Media Platform',
  description: 'A modern social media platform built with Next.js, Clerk, and Supabase',
};

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <html lang="en" className="dark">
        <body className={inter.className}>
          {/* Animated Background */}
          <div className="animated-bg">
            <div className="orb orb-1"></div>
            <div className="orb orb-2"></div>
          </div>
          {children}
        </body>
      </html>
    </ClerkProvider>
  );
}
