'use client'

import { useMemo, ReactNode, createElement } from 'react'
import { ConnectionProvider as BaseConnectionProvider, WalletProvider as BaseWalletProvider } from '@solana/wallet-adapter-react'
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui'
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom'
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare'

import '@solana/wallet-adapter-react-ui/styles.css'

const ConnectionProvider = BaseConnectionProvider as React.ComponentType<{ endpoint: string; children?: ReactNode }>
const WalletProvider = BaseWalletProvider as React.ComponentType<{ wallets: any[]; autoConnect: boolean; children?: ReactNode }>
const WalletModalProviderC = WalletModalProvider as React.ComponentType<{ children?: ReactNode }>

export function SolanaProvider({ children }: { children: ReactNode }) {
  const endpoint = process.env.NEXT_PUBLIC_RPC_URL || 'https://api.mainnet-beta.solana.com'

  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  )

  return createElement(
    ConnectionProvider,
    { endpoint },
    createElement(
      WalletProvider,
      { wallets, autoConnect: true },
      createElement(WalletModalProviderC, {}, children)
    )
  )
}
