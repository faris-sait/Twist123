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
    <ClerkProvider
      appearance={{
        baseTheme: undefined,
        variables: {
          colorPrimary: '#ffd700',
          colorBackground: '#1a1a1a',
          colorInputBackground: '#2a2a2a',
          colorInputText: '#ffd700',
          colorText: '#ffffff',
          colorTextSecondary: '#d4d4d4',
          colorDanger: '#ef4444',
          borderRadius: '0.5rem',
        },
        elements: {
          rootBox: 'bg-[#1a1a1a]',
          card: 'bg-[#1a1a1a] shadow-2xl border border-yellow-500/20',
          headerTitle: 'text-white',
          headerSubtitle: 'text-gray-300',
          socialButtonsBlockButton: 'border border-yellow-500/30 hover:border-yellow-500/50 bg-[#2a2a2a] text-white',
          formFieldLabel: 'text-white',
          formFieldInput: 'bg-[#2a2a2a] border border-yellow-500/20 focus:border-yellow-500 text-white',
          formButtonPrimary: 'bg-yellow-500 hover:bg-yellow-600 text-black font-semibold shadow-lg',
          footerActionLink: 'text-yellow-500 hover:text-yellow-600',
          identityPreviewText: 'text-white',
          formFieldInputShowPasswordButton: 'text-yellow-500 hover:text-yellow-600',
          dividerLine: 'bg-yellow-500/20',
          dividerText: 'text-gray-300',
          optionsButton: 'border border-yellow-500/30 hover:border-yellow-500/50 bg-[#2a2a2a] text-white',
          alertText: 'text-sm text-white',
          menuButton: 'text-white hover:text-yellow-500',
          menuItem: 'text-white hover:bg-yellow-500/10',
          menuList: 'bg-[#1a1a1a] border border-yellow-500/20',
          userButtonPopoverCard: 'bg-[#1a1a1a] border border-yellow-500/20',
          userButtonPopoverActionButton: 'text-white hover:bg-yellow-500/10',
          userButtonPopoverActionButtonText: 'text-white',
          userButtonPopoverFooter: 'border-t border-yellow-500/20',
          modalClerkFooter: 'hidden',
          footer: 'hidden',
          footerPages: 'hidden',
        },
      }}
    >
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
