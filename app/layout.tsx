import type { Metadata } from 'next'
import './globals.css'
import Navbar from '@/components/layout/Navbar'
import Sidebar from '@/components/layout/Sidebar'
import { UIProvider } from '@/context/UIContext'
import { Toaster } from 'sonner'
import { SolanaProvider } from '@/components/ui/SolanaProvider'

export const metadata: Metadata = {
  title: 'CCPS Pro',
  description: 'Cards Cartel Pro Sniper — Advanced Analytics Dashboard',
}

export const viewport = {
  themeColor: '#0c0a15',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Toaster position="top-right" richColors closeButton />
        <SolanaProvider>
          <UIProvider>
            <div className="min-h-screen">
            <Navbar />
            <div className="flex pt-14">
              <Sidebar />
              {/* Main content — offset by sidebar width on lg+ */}
              <main className="flex-1 lg:ml-64 min-h-[calc(100vh-3.5rem)]">
                <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
                  {children}
                </div>
              </main>
            </div>
          </div>
          </UIProvider>
        </SolanaProvider>
      </body>
    </html>
  )
}
