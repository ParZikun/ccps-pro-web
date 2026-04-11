'use client'

import { useState } from 'react'

import Image from 'next/image'
import { ExternalLink, TrendingDown, Shield, BarChart3, Clock, Zap, Star } from 'lucide-react'
import { getTierColor, formatUsd, formatSol, timeAgo, getConfidenceColor } from '@/lib/format'
import type { Deal } from '@/types'
import { Tier } from '@/types'
import { useWallet, useConnection } from '@solana/wallet-adapter-react'
import { VersionedTransaction, Transaction, PublicKey } from '@solana/web3.js'
import { getAssociatedTokenAddress, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID, createAssociatedTokenAccountInstruction, getAccount } from '@solana/spl-token'
import { toast } from 'sonner'

const HELIUS_SENDER_URL = process.env.NEXT_PUBLIC_HELIUS_SENDER_URL;

if (!HELIUS_SENDER_URL) {
    throw new Error('NEXT_PUBLIC_HELIUS_SENDER_URL is not configured');
}

interface DealCardProps {
  deal: Deal
  solPriceUSD?: number
  priority?: boolean
}

const tierIcons: Record<string, string> = {
  [Tier.GOLD]: '🏆',
  [Tier.SILVER]: '🥈',
  [Tier.BRONZE]: '🥉',
  [Tier.IRON]: '⚙️',
  [Tier.SUSPICIOUS]: '⚠️',
  [Tier.NONE]: 'ℹ️',
  'INFO': 'ℹ️',
  [Tier.AUTOBUY]: '🤖',
}

export default function DealCard({ deal, solPriceUSD, priority = false, onClick }: DealCardProps & { onClick?: () => void }) {
  const [isWatching, setIsWatching] = useState(false)
  const [isSniping, setIsSniping] = useState(false)
  const { publicKey, signTransaction } = useWallet()
  const { connection } = useConnection()

  const tierColor = getTierColor(deal.tier)
  const confColor = getConfidenceColor(deal.alt_confidence)

  const handleSnipe = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!publicKey) {
      toast.error('Please connect your wallet first');
      return;
    }

    setIsSniping(true);
    const loadingToast = toast.loading('Building transaction...');

    try {
      const mintPubkey = new PublicKey(deal.token_mint);
      const buyerPubkey = new PublicKey(publicKey.toBase58());
      const buyerNftATA = await getAssociatedTokenAddress(mintPubkey, buyerPubkey);

      let ataExists = false;
      try {
        await getAccount(connection, buyerNftATA);
        ataExists = true;
        console.log('[Snipe] NFT ATA already exists:', buyerNftATA.toBase58());
      } catch {
        console.log('[Snipe] Creating NFT ATA:', buyerNftATA.toBase58());
        toast.loading('Creating token account...', { id: loadingToast });

        const createATAIx = createAssociatedTokenAccountInstruction(
          buyerPubkey,
          buyerNftATA,
          buyerPubkey,
          mintPubkey,
          TOKEN_PROGRAM_ID,
          ASSOCIATED_TOKEN_PROGRAM_ID
        );

        const { blockhash: ataBlockhash, lastValidBlockHeight: ataLBH } = await connection.getLatestBlockhash('confirmed');
        const ataTx = new Transaction({
          recentBlockhash: ataBlockhash,
          feePayer: buyerPubkey,
        }).add(createATAIx);

        if (!signTransaction) throw new Error('Wallet does not support signing');
        const signedAtaTx = await signTransaction(ataTx);
        const ataSig = await connection.sendRawTransaction(signedAtaTx.serialize(), { skipPreflight: false });
        await connection.confirmTransaction({ signature: ataSig, blockhash: ataBlockhash, lastValidBlockHeight: ataLBH }, 'confirmed');
        console.log('[Snipe] ATA created:', ataSig);
      }

      toast.loading('Building buy transaction...', { id: loadingToast });
      const res = await fetch('/api/buy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buyer: publicKey.toBase58(),
          seller: deal.seller,
          tokenMint: deal.token_mint,
          price: deal.listing_price_sol
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Failed to fetch tx from ME');
      }

      const data = await res.json();
      const txSigned = data.txSigned;
      if (!txSigned) throw new Error('No transaction data returned from server');

      let txBuffer: Uint8Array;
      if (typeof txSigned === 'string') {
        txBuffer = Uint8Array.from(Buffer.from(txSigned, 'base64'));
      } else if (txSigned?.type === 'Buffer' && Array.isArray(txSigned.data)) {
        txBuffer = Uint8Array.from(txSigned.data);
      } else {
        throw new Error(`Unknown txSigned format: ${typeof txSigned}`);
      }
      
      const tx = VersionedTransaction.deserialize(txBuffer);
      console.log(`[Snipe] ME Transaction loaded: ${txBuffer.length} bytes`);

      toast.loading('Sign transaction in your wallet...', { id: loadingToast });

      if (!signTransaction) throw new Error('Wallet does not support signing');

      const signedTx = await signTransaction(tx);
      const rawTx = signedTx.serialize();
      const txBase64 = Buffer.from(rawTx).toString('base64');

      console.log(`[Snipe] Signed tx: ${rawTx.length} bytes`);

      toast.loading('Submitting via Helius Sender (Jito)...', { id: loadingToast });

      // Use Helius Sender endpoint - handles large txs AND routes to Jito automatically
      const senderResp = await fetch(HELIUS_SENDER_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: Date.now().toString(),
          method: 'sendTransaction',
          params: [
            txBase64,
            { encoding: 'base64', skipPreflight: true, maxRetries: 0 }
          ]
        }),
      });

      const senderResult = await senderResp.json();
      console.log('[Snipe] Helius Sender response:', JSON.stringify(senderResult));

      if (senderResult.error) {
        throw new Error(`Helius Sender error: ${senderResult.error.message || JSON.stringify(senderResult.error)}`);
      }

      const signature = senderResult.result?.signature || senderResult.result;
      console.log(`[Snipe] ✅ Transaction submitted! Sig: ${signature}`);
      toast.loading('Waiting for confirmation...', { id: loadingToast });

      // Wait for confirmation
      let confirmed = false;
      for (let attempt = 0; attempt < 20 && !confirmed; attempt++) {
        await new Promise(r => setTimeout(r, 500));
        try {
          const status = await connection.getSignatureStatus(signature);
          if (status?.value?.confirmationStatus === 'confirmed' || status?.value?.confirmationStatus === 'finalized') {
            confirmed = true;
          }
        } catch (err) {
          console.log(`[Snipe] Status check attempt ${attempt + 1}:`, err);
        }
      }

      if (confirmed) {
        toast.success(`🎉 Successfully sniped!`, { id: loadingToast });
        console.log(`[Snipe] ✅ Confirmed! Tx: https://solscan.io/tx/${signature}`);
      } else {
        toast.success(`⏳ Sent! Check: https://solscan.io/tx/${signature}`, { id: loadingToast });
      }

    } catch (err: any) {
      console.error('[Snipe] Error:', err);
      toast.error(err.message || 'Snipe failed', { id: loadingToast });
    } finally {
      setIsSniping(false);
    }
  }

  const discount = deal.alt_value && deal.alt_value > 0
    ? ((deal.alt_value - deal.listing_price_usd) / deal.alt_value * 100)
    : 0
  const profit = deal.alt_value
    ? (0.85 * deal.alt_value) - deal.listing_price_usd
    : 0

  const meLink = `https://magiceden.io/item-details/${deal.token_mint}`

  return (
    <div 
      className={`group relative bg-surface rounded-xl border border-white/5 overflow-hidden card-hover-lift card-shine-effect ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      {/* Image Container */}
      <div className="relative w-full h-48 bg-black/40 overflow-hidden">
        {/* Tier Badge inside Image Container (Fixes z-index bug) */}
        <div className={`absolute top-2 left-2 z-30 flex items-center gap-1.5 px-2.5 py-1 rounded text-[10px] tracking-wide font-bold bg-black/80 backdrop-blur-md border border-white/10 ${tierColor.text}`}>
          <span>{tierIcons[deal.tier] || tierIcons['INFO']}</span>
          <span>{deal.tier === 'NONE' ? 'INFO' : deal.tier}</span>
        </div>

        {/* Watchlist Toggle */}
        <button
          onClick={async (e) => {
            e.stopPropagation()
            e.preventDefault()
            const newState = !isWatching
            setIsWatching(newState)
            try {
              if (newState) {
                await fetch(`/api/watchlist/test-wallet-123`, {
                  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ mint: deal.token_mint })
                })
              } else {
                await fetch(`/api/watchlist/test-wallet-123/${deal.token_mint}`, { method: 'DELETE' })
              }
            } catch (err) {}
          }}
          className="absolute top-3 right-3 z-30 p-2 rounded-full bg-black/50 hover:bg-black/80 border border-white/10 transition-colors backdrop-blur-sm"
        >
          <Star className={`w-4 h-4 ${isWatching ? 'text-yellow-400 fill-yellow-400' : 'text-gray-400 hover:text-white'}`} />
        </button>

        <Image
          src={deal.img_url || 'https://placehold.co/400x560/13111a/333?text=No+Image'}
          alt={deal.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
          priority={priority}
          unoptimized={true}
          loading={priority ? 'eager' : 'lazy'}
        />
        {/* Gradient overlay at bottom */}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[#13111a] to-transparent pointer-events-none" />
      </div>

      {/* Content */}
      <div className="p-4 space-y-3">
        {/* Title + Grade */}
        <div>
          <h3 className="text-sm font-bold text-white truncate leading-tight group-hover:text-accent-gold transition-colors">
            {deal.name}
          </h3>
          <p className="text-[11px] text-gray-500 font-mono mt-0.5">
            {deal.grading_company} · {deal.grade} · #{deal.grading_id}
          </p>
        </div>

        {/* Deal Metrics */}
        <div className="flex flex-col gap-3">
          {/* Prices */}
          <div className="flex items-center justify-between border-b border-white/5 pb-2">
            <div>
              <p className="text-[9px] text-gray-500 uppercase tracking-wider font-semibold mb-0.5">Listed</p>
              <div className="flex items-baseline gap-1.5">
                <p className="text-sm font-bold text-white font-mono leading-none">{formatSol(deal.listing_price_sol)}</p>
                <p className="text-[10px] text-gray-500 font-mono leading-none">({formatUsd(deal.listing_price_usd)})</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[9px] text-gray-500 uppercase tracking-wider font-semibold mb-0.5">Alt Value <span className={`text-[8px] font-bold ml-1 px-1 py-0.5 rounded-sm bg-white/5 ${confColor.text}`}>{deal.alt_confidence ? `${deal.alt_confidence.toFixed(0)}%` : 'N/A'}</span></p>
              <p className="text-sm font-bold text-accent-gold font-mono leading-none">{formatUsd(deal.alt_value)}</p>
            </div>
          </div>

          {/* ROI */}
          <div className="flex items-center gap-2">
            <div className={`flex-[0.8] flex items-center justify-center gap-1.5 py-1.5 rounded bg-black/30 border border-white/5 text-xs font-bold ${
              discount >= 30 ? 'text-yellow-400' :
              discount >= 20 ? 'text-red-400' :
              discount >= 10 ? 'text-blue-400' :
              'text-gray-400'
            }`}>
              <TrendingDown className="w-3.5 h-3.5" />
              <span>{discount.toFixed(1)}% off</span>
            </div>
            <div className={`flex-[1.2] flex items-center justify-center gap-1.5 py-1.5 rounded bg-black/30 border border-white/5 text-xs font-bold ${
              profit > 20 ? 'text-green-400' :
              profit > 0 ? 'text-green-500/70' :
              'text-red-400'
            }`}>
              {profit > 0 ? '🟢' : '🔴'}
              <span>{formatUsd(Math.abs(profit))} Profit</span>
            </div>
          </div>
        </div>

        {/* Meta Row */}
        <div className="flex items-center justify-between pt-1">
          <span className="text-[10px] text-gray-600 font-mono">{timeAgo(deal.listing_timestamp)}</span>
          <div className="flex gap-2">
            <a href={`https://collectorcrypt.com/assets/solana/${deal.token_mint}`} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-gray-500 hover:text-white transition-colors" title="Collector Crypt">CC</a>
            <span className="text-gray-700 text-[10px]">·</span>
            <a href={deal.alt_assest_id ? `https://alt.xyz/itm/${deal.alt_assest_id}/research?grade=${deal.grading_company || 'PSA'}-${deal.grade_num || '10.0'}` : 'https://alt.xyz'} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-gray-500 hover:text-white transition-colors" title="Alt.xyz">ALT</a>
            <span className="text-gray-700 text-[10px]">·</span>
            <a href={meLink} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold text-gray-500 hover:text-accent-gold transition-colors" title="Magic Eden">ME</a>
          </div>
        </div>

        {/* Snipe Button */}
        <button
          disabled={isSniping || !deal.seller}
          onClick={handleSnipe}
          className="w-full py-2 rounded-lg bg-accent-gold/10 hover:bg-accent-gold/20 border border-accent-gold/30 text-accent-gold text-xs font-bold transition-colors flex items-center justify-center gap-2"
        >
          {isSniping ? (
            <div className="w-3.5 h-3.5 border-2 border-accent-gold border-t-transparent rounded-full animate-spin" />
          ) : (
            <Zap className="w-3.5 h-3.5" />
          )}
          {isSniping ? 'SNIPING...' : 'SNIPE NOW'}
        </button>
      </div>
    </div>
  )
}
