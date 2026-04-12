import { NextResponse } from 'next/server';
import { PublicKey, VersionedTransaction, Keypair } from '@solana/web3.js';

// ── Helius Sender tip accounts (any one of these is valid) ────────────────────
const HELIUS_TIP_ACCOUNTS = [
  '4ACfpUFoaSD9bfPdeu6DBt89gB6ENTeHBXCAi87NhDEE',
  'D2L6yPZ2FmmmTKPgzaMKdhu6EWZcTpLy1Vhx8uvZe7NZ',
  '9bnz4RShgq1hAnLnZbP8kbgBg1kEmcJBYQq3gQbmnSta',
  '5VY91ws6B2hMmBFRsXkoAAdsPHBJwRfBht4DXox3xkwn',
  '2nyhqdwKcJZR2vcqCyrYsaPVdAnFoJjiksCXJ7hfEYgD',
  '2q5pghRs6arqVjRvT5gfgWfWcHWmw1ZuCzphgd5KfWGJ',
];
const JITO_TIP_LAMPORTS = 200_000; // 0.0002 SOL minimum required by Helius Sender

const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

function isValidPublicKey(key: string): boolean {
  try { new PublicKey(key); return key.length >= 32 && key.length <= 44; }
  catch { return false; }
}

function deriveATA(owner: string, mint: string): string {
  const [ata] = PublicKey.findProgramAddressSync(
    [new PublicKey(owner).toBuffer(), TOKEN_PROGRAM_ID.toBuffer(), new PublicKey(mint).toBuffer()],
    ASSOCIATED_TOKEN_PROGRAM_ID
  );
  return ata.toBase58();
}

function loadKeypair(): Keypair {
  const raw = process.env.BUYER_WALLET_PRIVATE_KEY;
  if (!raw) throw new Error('BUYER_WALLET_PRIVATE_KEY not set');
  // Expected format: JSON array of bytes e.g. [28,233,170,...]
  const arr = JSON.parse(raw);
  return Keypair.fromSecretKey(Uint8Array.from(arr));
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    let { buyer, seller, tokenMint, tokenATA, price } = body;

    // Load signer keypair — stays server-side, never exposed to browser
    let keypair: Keypair;
    try { keypair = loadKeypair(); }
    catch (e: any) { return NextResponse.json({ error: `Key error: ${e.message}` }, { status: 500 }); }

    // Always use the sniper keypair's public key as buyer.
    // We override whatever the frontend sends so ME builds the tx for the wallet we control.
    buyer = keypair.publicKey.toBase58();
    console.log(`[Buy API] Sniper wallet (buyer): ${buyer}`);

    if (!buyer || !seller || !tokenMint)
      return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
    
    // Now validate all keys (buyer is now a valid pubkey from our keypair)
    if (!isValidPublicKey(buyer) || !isValidPublicKey(seller) || !isValidPublicKey(tokenMint))
      return NextResponse.json({ error: 'Invalid address format' }, { status: 400 });

    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL!;
    const ME_API_KEY = process.env.NEXT_PUBLIC_ME_API_KEY;

    // ── Step 1: Fetch live listing from ME ────────────────────────────────────
    let auctionHouseAddress: string | undefined;
    let splPriceStr: string | undefined;
    let resolvedTokenATA: string | undefined = tokenATA;

    try {
      // Use timestamp cache-buster to avoid stale price data from ME
      const listingsUrl = `https://api-mainnet.magiceden.dev/v2/tokens/${tokenMint}/listings?t=${Date.now()}`;
      const listingsResp = await fetch(listingsUrl, {
        headers: { 'Authorization': `Bearer ${ME_API_KEY}`, 'Accept': 'application/json' }
      });
      if (listingsResp.ok) {
        const listings = await listingsResp.json();
        const arr = Array.isArray(listings) ? listings : (listings?.listings ?? []);
        console.log(`[Buy API] Listings for ${tokenMint}: ${arr.length} found`);
        if (arr.length > 0) {
          const listing = arr.find((l: any) => l.seller === seller || l.tokenOwner === seller) || arr[0];
          auctionHouseAddress = listing.auctionHouse;
          resolvedTokenATA = listing.tokenAddress || resolvedTokenATA;
          const splPriceObj = listing.priceInfo?.splPrice || listing.token?.priceInfo?.splPrice;
          if (splPriceObj) {
            price = parseFloat(splPriceObj.rawAmount) / Math.pow(10, splPriceObj.decimals ?? 6);
            splPriceStr = JSON.stringify(splPriceObj);
            console.log(`[Buy API] USDC listing — splPrice: ${splPriceStr}`);
          } else {
            price = listing.price;
            console.log(`[Buy API] SOL listing — Latest Price: ${price} SOL`);
          }
        }
      }
    } catch (e: any) { console.warn('[Buy API] Listings fetch error:', e.message); }

    if (!price) return NextResponse.json({ error: 'Could not determine price' }, { status: 400 });
    if (!resolvedTokenATA) return NextResponse.json({ error: 'Could not find seller token account' }, { status: 400 });

    // ── Steps 2 & 3 & 4: Fetch → Sign → Simulate (Retry Loop) ────────────────
    let txBase64 = '';
    let lastError = '';
    const MAX_ATTEMPTS = 3;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      console.log(`[Buy API] Attempt ${attempt}/${MAX_ATTEMPTS}...`);
      
      try {
        const buyIns: any = {
          type: 'buy_now',
          ins: {
            auctionHouseAddress: auctionHouseAddress || 'E8cU1WiRWjanGxmn96ewBgk9vPTcL6AEZ1t6F6fkgUWe',
            buyer,
            seller,
            tokenMint,
            tokenATA: resolvedTokenATA!,
            price: price,
            sellerExpiry: -1,
            buyerCreatorRoyaltyPercent: 100
          }
        };

        // If USDC listing, add splPrice to the instruction
        if (splPriceStr) {
          buyIns.ins.splPrice = JSON.parse(splPriceStr);
          console.log(`[Buy API] Adding splPrice to instruction: ${splPriceStr}`);
        }

        const q = JSON.stringify([buyIns]);
        const batchParams = new URLSearchParams({
          q: q,
          prioFeeMicroLamports: '50000', // ~50k microLamports priority fee
          maxPrioFeeLamports: '1000000' // Cap at 0.001 SOL
        });

        const batchUrl = `https://api-mainnet.magiceden.us/v2/instructions/batch?${batchParams}`;
        const meResp = await fetch(batchUrl, {
          headers: { 'Authorization': `Bearer ${ME_API_KEY}`, 'Accept': 'application/json' }
        });
        if (!meResp.ok) throw new Error(`ME Batch API: ${meResp.status}`);
        
        const batchData = await meResp.json();
        const data = batchData[0]?.value; // Batch returns an array of results with { status, value }
        if (!data) throw new Error('No value data from ME Batch API');

        // Look for the best available transaction data (v0 is preferred)
        const txSource = data.v0?.txSigned || data.txSigned || data.v0?.tx || data.tx;
        if (!txSource || !txSource.data) {
          console.error('[Buy API] ME Response structure:', JSON.stringify(data).slice(0, 500));
          throw new Error('No transaction data found in ME response');
        }

        const tx = VersionedTransaction.deserialize(Buffer.from(txSource.data));
        tx.sign([keypair]);
        txBase64 = Buffer.from(tx.serialize()).toString('base64');
        const blockhash = tx.message.recentBlockhash;

        // Simulate — Diagnostic mode: replaceRecentBlockhash allows us to see if 
        // the logic is valid even if the blockhash is stale.
        const simResp = await fetch(rpcUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0', id: '1', method: 'simulateTransaction',
            params: [txBase64, { encoding: 'base64', replaceRecentBlockhash: true }],
          }),
        });
        const simResult = await simResp.json();
        const simErr = simResult.error || simResult.result?.value?.err;

        if (!simErr) {
          console.log(`[Buy API] Simulation logic VALID ✅ (ME Blockhash: ${blockhash})`);
          break; // SUCCESS - exit loop
        }

        lastError = simResult.error?.message || JSON.stringify(simErr);
        const simLogs = simResult.result?.value?.logs?.join('\n') || 'No logs';
        console.warn(`[Buy API] Attempt ${attempt} simulation FAILED: ${lastError}\nLogs: ${simLogs.slice(0, 500)}`);

        if (lastError.includes('BlockhashNotFound') && attempt < MAX_ATTEMPTS) {
          console.log('[Buy API] Blockhash stale, waiting 1s to refresh ME state...');
          await new Promise(r => setTimeout(r, 1000));
          continue;
        }

        // Check for specific errors and provide friendly messages
        let userMessage = lastError;
        if (lastError.includes('insufficient lamports') || lastError.includes('InsufficientFunds')) {
          userMessage = '💸 Load up bro! You are missing out!\n\nGO BIG OR GO HOME!\n#GOTTA_CATCH_EM_ALL\n\nTime to snipe it up! 🔥';
        } else if (lastError.includes('TokenBalance')) {
          userMessage = '❌ Token balance error - may need to wrap SOL or have insufficient token balance';
        } else if (lastError.includes('Invalid')) {
          userMessage = '❌ Invalid transaction - listing may have changed or expired';
        }

        return NextResponse.json({ 
          error: userMessage, 
          rawError: lastError,
          logs: simResult.result?.value?.logs?.join('\n')?.slice(0, 500) 
        }, { status: 400 });
      } catch (e: any) {
        lastError = e.message;
        if (attempt === MAX_ATTEMPTS) throw e;
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    if (!txBase64) return NextResponse.json({ error: `Failed after ${MAX_ATTEMPTS} attempts: ${lastError}` }, { status: 502 });

    // ── Step 5: Submit via multiple paths for maximum reliability ────────────
    console.log('[Buy API] Firing transaction via multi-path submission...');
    const senderUrl = process.env.NEXT_PUBLIC_HELIUS_SENDER_URL || 'https://sender.helius-rpc.com/fast';
    
    // Fire to both regular RPC and Fast Sender simultaneously
    const [fastResult, regResult] = await Promise.all([
      fetch(senderUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0', id: Date.now().toString(), method: 'sendTransaction',
          params: [txBase64, { encoding: 'base64', skipPreflight: true }],
        }),
      }).then(r => r.json()).catch(e => ({ error: { message: e.message } })),
      fetch(rpcUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          jsonrpc: '2.0', id: Date.now().toString(), method: 'sendTransaction',
          params: [txBase64, { encoding: 'base64', skipPreflight: true, maxRetries: 5 }],
        }),
      }).then(r => r.json()).catch(e => ({ error: { message: e.message } }))
    ]);

    const signature = fastResult.result || regResult.result;

    if (!signature) {
      const fastErr = fastResult.error?.message || JSON.stringify(fastResult.error);
      const regErr = regResult.error?.message || JSON.stringify(regResult.error);
      console.error(`[Buy API] SUBMISSION FAILED.\nFast: ${fastErr}\nRegular: ${regErr}`);
      return NextResponse.json({ error: `Submission failed. Fast: ${fastErr}, Reg: ${regErr}` }, { status: 502 });
    }

    console.log(`[Buy API] ✅ Submitted: ${signature}`);
    return NextResponse.json({ signature });

  } catch (e: any) {
    console.error('[Buy API] Error:', e.message, e.stack?.slice(0, 500));
    return NextResponse.json({ error: e.message || 'Internal server error' }, { status: 500 });
  }
}
