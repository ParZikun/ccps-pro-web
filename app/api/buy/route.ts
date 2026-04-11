import { NextResponse } from 'next/server';
import { PublicKey } from '@solana/web3.js';

const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

/**
 * Derives the Associated Token Account (ATA) address for a given owner and mint.
 * This is a pure PDA derivation — no RPC needed.
 */
async function deriveATA(owner: string, mint: string): Promise<string> {
    const ownerPubkey = new PublicKey(owner);
    const mintPubkey = new PublicKey(mint);
    const [ata] = PublicKey.findProgramAddressSync(
        [ownerPubkey.toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), mintPubkey.toBuffer()],
        ASSOCIATED_TOKEN_PROGRAM_ID
    );
    return ata.toBase58();
}


export async function POST(request: Request) {
    try {
        const body = await request.json();
        let { buyer, seller, tokenMint, tokenATA, price } = body;

        if (!buyer || !seller || !tokenMint) {
            return NextResponse.json({ error: 'Missing required parameters: buyer, seller, tokenMint' }, { status: 400 });
        }

        const ME_API_KEY = process.env.NEXT_PUBLIC_ME_API_KEY || process.env.ME_API_KEY;

        // === Step 1: Fetch live listing data from ME ===
        let auctionHouseAddress: string | undefined;
        let sellerExpiry: number = 0;
        let splPriceStr: string | undefined;
        let resolvedTokenATA: string | undefined = tokenATA;

        try {
            const listingsUrl = `https://api-mainnet.magiceden.dev/v2/tokens/${tokenMint}/listings`;
            const listingsResp = await fetch(listingsUrl, {
                headers: ME_API_KEY ? { 'Authorization': `Bearer ${ME_API_KEY}` } : {}
            });
            
            const rawText = await listingsResp.text();
            console.log(`[Buy API] Listings API status: ${listingsResp.status}`);
            console.log(`[Buy API] Listings raw response: ${rawText.slice(0, 1000)}`);

            if (listingsResp.ok) {
                let listingsData: any;
                try { listingsData = JSON.parse(rawText); } catch { listingsData = null; }

                // ME API returns either a bare array [] or { listings: [] }
                const listings = Array.isArray(listingsData)
                    ? listingsData
                    : (listingsData?.listings ?? []);

                if (listings.length > 0) {
                    // Priority: match by seller, fallback to cheapest
                    const listing = listings.find((l: any) =>
                        l.seller === seller || l.tokenOwner === seller || l.pdaAddress === seller
                    ) || listings[0];

                    console.log(`[Buy API] Matched listing:`, JSON.stringify(listing, null, 2));

                    auctionHouseAddress = listing.auctionHouse;
                    sellerExpiry = listing.expiry < 0 ? 0 : (listing.expiry ?? 0);
                    resolvedTokenATA = listing.tokenAddress || resolvedTokenATA;

                    const splPriceObj = listing.priceInfo?.splPrice || listing.token?.priceInfo?.splPrice;

                    if (splPriceObj) {
                        // USDC listing: price MUST be in USDC units, not SOL
                        const usdcAmount = parseFloat(splPriceObj.rawAmount) / Math.pow(10, splPriceObj.decimals ?? 6);
                        price = usdcAmount;
                        splPriceStr = JSON.stringify(splPriceObj);
                        console.log(`[Buy API] ✅ USDC listing: ${usdcAmount} USDC | AH: ${auctionHouseAddress}`);
                    } else {
                        // SOL listing: use the exact price from ME listing
                        price = listing.price;
                        console.log(`[Buy API] ✅ SOL listing: ${price} SOL | AH: ${auctionHouseAddress}`);
                    }
                } else {
                    console.warn(`[Buy API] ⚠️ No active listings found for mint ${tokenMint}. Using caller-supplied price.`);
                    // Fall back to what the UI sent — at least try
                    auctionHouseAddress = undefined;
                }
            }
        } catch (e: any) {
            console.warn('[Buy API] Listings fetch error:', e.message);
        }

        if (!price) {
            return NextResponse.json({ error: 'Could not determine listing price — listing may have already sold' }, { status: 400 });
        }

        if (!resolvedTokenATA) {
            return NextResponse.json({ error: 'Could not find seller token account — listing may have already sold' }, { status: 400 });
        }

        // === Step 2: Derive buyer's NFT destination ATA address ===
        // We need to pass the buyer's ATA for the NFT mint to ME's transfer endpoint.
        // ATA address = findProgramAddress([buyer, TOKEN_PROGRAM_ID, mint], ATA_PROGRAM_ID)
        // We compute this server-side to avoid needing @solana/spl-token on the client.
        const buyerAtaAddress = await deriveATA(buyer, tokenMint);
        console.log(`[Buy API] Buyer NFT ATA: ${buyerAtaAddress}`);

        // === Step 3: Build ME buy_now_transfer_nft URL ===
        // We use buy_now_transfer_nft with createATA=false to SKIP ATA creation instruction.
        // The ATA is pre-created by the client. This saves ~35 bytes in tx size.
        const endpoint = 'https://api-mainnet.magiceden.dev/v2/instructions/buy_now_transfer_nft';

        const queryParams = new URLSearchParams({
            buyer,
            seller,
            auctionHouseAddress: auctionHouseAddress || 'E8cU1WiRWjanGxmn96ewBgk9vPTcL6AEZ1t6F6fkgUWe',
            tokenMint,
            tokenATA: resolvedTokenATA || '',
            price: price.toString(),
            destinationATA: buyerAtaAddress,
            destinationOwner: buyer,
            createATA: 'false',
            buyerCreatorRoyaltyPercent: '0',  // Skip royalty distribution instruction (~30-50 bytes saved!)
            priorityFee: '0',           // Try to omit SetComputeUnitPrice instruction (~16 bytes)
            useV0: 'true',
        });

        if (sellerExpiry !== undefined) queryParams.append('sellerExpiry', sellerExpiry.toString());
        if (splPriceStr) queryParams.append('splPrice', splPriceStr);

        const fullUrl = `${endpoint}?${queryParams.toString()}`;
        console.log(`[Buy API] Calling ME buy_now_transfer_nft: ${fullUrl}`);

        const response = await fetch(fullUrl, {
            method: 'GET',
            headers: {
                ...(ME_API_KEY ? { 'Authorization': `Bearer ${ME_API_KEY}` } : {}),
                'Accept': 'application/json'
            }
        });

        const responseText = await response.text();
        console.log(`[Buy API] ME buy_now status: ${response.status} | body: ${responseText.slice(0, 500)}`);

        if (!response.ok) {
            return NextResponse.json({ error: responseText }, { status: response.status });
        }

        let data: any;
        try { data = JSON.parse(responseText); } catch {
            return NextResponse.json({ error: 'Invalid JSON from ME' }, { status: 500 });
        }

        // ME returns 'txSigned' for legacy listings, 'tx' for newer/USDC listings
        const txData = data.txSigned || data.tx;
        if (!txData) {
            console.error('[Buy API] No transaction field in ME response:', JSON.stringify(data).slice(0, 300));
            return NextResponse.json({ error: 'ME returned OK but no tx/txSigned field.', raw: data }, { status: 500 });
        }

        console.log(`[Buy API] 🎉 Transaction received! Type: ${data.txSigned ? 'txSigned' : 'tx'}, bytes: ${txData?.data?.length}`);
        return NextResponse.json({ txSigned: txData, v0: data.v0 });

    } catch (e: any) {
        console.error('[Buy API] Internal Error:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
