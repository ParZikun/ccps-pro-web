import { NextResponse } from 'next/server';
import { Keypair, VersionedTransaction } from '@solana/web3.js';

function loadKeypair(): Keypair {
  const raw = process.env.BUYER_WALLET_PRIVATE_KEY;
  if (!raw) throw new Error('BUYER_WALLET_PRIVATE_KEY not set');
  const arr = JSON.parse(raw);
  return Keypair.fromSecretKey(Uint8Array.from(arr));
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { seller, tokenMint, tokenATA, price } = body;

    const keypair = loadKeypair();
    const buyer = keypair.publicKey.toBase58();
    const apiKey = process.env.NEXT_PUBLIC_ME_API_KEY || '';
    const rpcUrl = process.env.NEXT_PUBLIC_RPC_URL || '';

    const results: any = { buyer, seller, tokenMint, price };

    // === Method 1: ME Frontend exact call (/batch with priority fees) ===
    try {
      console.log('[Test] Testing ME Frontend style API...');
      
      const instructions = [{
        type: 'buy_now',
        ins: {
          auctionHouseAddress: 'E8cU1WiRWjanGxmn96ewBgk9vPTcL6AEZ1t6F6fkgUWe',
          buyer,
          seller,
          tokenMint,
          tokenATA,
          price,
          sellerExpiry: -1,
          buyerCreatorRoyaltyPercent: 100,
        }
      }];
      
      const params = new URLSearchParams({
        q: JSON.stringify(instructions),
        prioFeeMicroLamports: '14067',
        maxPrioFeeLamports: '10000000',
      });

      const frontendUrl = `https://api-mainnet.magiceden.us/v2/instructions/batch?${params}`;
      console.log('[Test] Frontend URL:', frontendUrl.slice(0, 200) + '...');
      
      const resp = await fetch(frontendUrl, {
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Accept': 'application/json' }
      });
      
      const data = await resp.json();
      const firstResult = data[0];
      
      results.frontend = {
        keys: firstResult ? Object.keys(firstResult) : 'no result',
        hasV0: !!firstResult?.value?.v0,
        hasV0TxSigned: !!firstResult?.value?.v0?.txSigned,
        hasBlockhashData: !!firstResult?.value?.blockhashData,
        blockhash: firstResult?.value?.blockhashData?.blockhash || 'none',
        lastValidBlockHeight: firstResult?.value?.blockhashData?.lastValidBlockHeight || 'none',
      };

      // Check the signed tx size
      if (firstResult?.value?.v0?.txSigned) {
        const txBuffer = Buffer.from(firstResult.value.v0.txSigned.data);
        const beforeSize = txBuffer.length;
        
        // Try signing with our keypair
        try {
          const tx = VersionedTransaction.deserialize(txBuffer);
          tx.sign([keypair]);
          const afterSize = tx.serialize().length;
          
          results.frontend.signedWithOurKey = {
            beforeSignBytes: beforeSize,
            afterSignBytes: afterSize,
            error: null,
          };
          
          // Try to simulate
          const base64 = Buffer.from(tx.serialize()).toString('base64');
          const simResp = await fetch(rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0', id: '1', method: 'simulateTransaction',
              params: [base64, { encoding: 'base64' }],
            }),
          });
          const simResult = await simResp.json();
          results.frontend.simulation = simResult.result?.value?.err || 'success';
          results.frontend.simError = simResult.error?.message || null;
          
        } catch (signErr: any) {
          results.frontend.signedWithOurKey = {
            beforeSignBytes: beforeSize,
            error: signErr.message,
          };
        }
      }
      
      console.log('[Test] Frontend result:', JSON.stringify(results.frontend, null, 2));
    } catch (e: any) {
      results.frontend = { error: e.message };
      console.error('[Test] Frontend error:', e.message);
    }

    // === Method 2: REST API (our current way) ===
    let restData: any = null;
    try {
      console.log('[Test] Testing REST API (our current way)...');
      const params = new URLSearchParams({
        buyer, seller, tokenMint, tokenATA,
        price: price.toString(),
        sellerExpiry: '0',
        auctionHouseAddress: 'E8cU1WiRWjanGxmn96ewBgk9vPTcL6AEZ1t6F6fkgUWe',
      });

      const resp = await fetch(`https://api-mainnet.magiceden.dev/v2/instructions/buy_now?${params}`, {
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Accept': 'application/json' }
      });
      
      restData = await resp.json();
      
      results.rest = {
        keys: Object.keys(restData),
        hasV0: !!restData.v0,
        hasV0TxSigned: !!restData.v0?.txSigned,
        hasBlockhashData: !!restData.blockhashData,
        blockhash: restData.blockhashData?.blockhash || 'none',
      };

      if (restData.v0?.txSigned) {
        const txBuffer = Buffer.from(restData.v0.txSigned.data);
        const beforeSize = txBuffer.length;
        
        try {
          const tx = VersionedTransaction.deserialize(txBuffer);
          tx.sign([keypair]);
          const afterSize = tx.serialize().length;
          
          results.rest.signedWithOurKey = {
            beforeSignBytes: beforeSize,
            afterSignBytes: afterSize,
          };
          
          // Simulate
          const base64 = Buffer.from(tx.serialize()).toString('base64');
          const simResp = await fetch(rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              jsonrpc: '2.0', id: '1', method: 'simulateTransaction',
              params: [base64, { encoding: 'base64' }],
            }),
          });
          const simResult = await simResp.json();
          results.rest.simulation = simResult.result?.value?.err || 'success';
          results.rest.simError = simResult.error?.message || null;
          
        } catch (signErr: any) {
          results.rest.signedWithOurKey = {
            beforeSignBytes: beforeSize,
            error: signErr.message,
          };
        }
      }
      console.log('[Test] REST result:', JSON.stringify(results.rest, null, 2));
    } catch (e: any) {
      results.rest = { error: e.message };
      console.error('[Test] REST error:', e.message);
    }

    return NextResponse.json(results);

  } catch (e: any) {
    console.error('[Test API] Error:', e.message);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}