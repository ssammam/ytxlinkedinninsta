import { NextResponse } from 'next/server';
import { getTwitterClient, getRecentMentions, replyToTweet, getMyUserId, sendDm, getRecentDms } from '@/lib/twitter';
import { getRates, getProduct, buildProductDmMessage } from '@/lib/sanityLogic';
import * as fs from 'fs';
import * as path from 'path';

const DB_PATH_MENTIONS = path.join(process.cwd(), 'processed_x_mentions.json');
const DB_PATH_DMS = path.join(process.cwd(), 'processed_x_dms.json');

function getProcessed(pathStr: string): string[] {
  if (fs.existsSync(pathStr)) {
    return JSON.parse(fs.readFileSync(pathStr, 'utf-8'));
  }
  return [];
}

function markProcessed(pathStr: string, id: string) {
  const processed = getProcessed(pathStr);
  processed.push(id);
  fs.writeFileSync(pathStr, JSON.stringify(processed));
}

export async function GET(request: Request) {
  try {
    const client = getTwitterClient();
    if (!client) {
      return NextResponse.json({ error: 'Missing Twitter credentials' }, { status: 400 });
    }

    const myId = await getMyUserId(client);
    
    // 1. Process Mentions
    const mentions = await getRecentMentions(client, myId);
    const processedMentions = getProcessed(DB_PATH_MENTIONS);
    let repliesCount = 0;

    for (const mention of mentions) {
      if (processedMentions.includes(mention.id)) continue;
      if (mention.author_id === myId) {
        markProcessed(DB_PATH_MENTIONS, mention.id);
        continue;
      }

      const text = (mention.text || "").toLowerCase();
      
      if (text.includes("test bot") || text.includes("price") || text.includes("cost") || text.includes("pp") || text.includes("rate") || text.includes("how much")) {
        // Send DM
        const rates = await getRates();
        const dmText = `Namaste! You asked about a product on our page. Please share the specific link or SKU in this DM so we can fetch the exact live price for you! We are RH Jewellers Kengeri.`;
        const dmSuccess = await sendDm(client, mention.author_id || '', dmText);

        // Reply to mention
        if (dmSuccess) {
          await replyToTweet(client, mention.id, `Thank you for your interest! Please check your DM for more details. Regards RH Jewellers, Kengeri.`);
        } else {
          await replyToTweet(client, mention.id, `Thank you for your interest! We couldn't send you a DM. Please DM us the product link so we can give you the exact price. Regards RH Jewellers, Kengeri.`);
        }
        repliesCount++;
      } else if (text.includes("location") || text.includes("where")) {
        const dmText = `Namaste! 📍Visit Our Store: 312 Kuvempu Road, Kengeri, Bengaluru. Contact: 9620741404. We look forward to welcoming you! RH Jewellers Kengeri.`;
        const dmSuccess = await sendDm(client, mention.author_id || '', dmText);
        
        if (dmSuccess) {
           await replyToTweet(client, mention.id, `Thank you for your interest! Please check your DM for our location. Regards RH Jewellers, Kengeri.`);
        }
        repliesCount++;
      }

      markProcessed(DB_PATH_MENTIONS, mention.id);
    }

    // 2. Process DMs
    const dms = await getRecentDms(client);
    const processedDms = getProcessed(DB_PATH_DMS);
    
    for (const dm of dms) {
      if (processedDms.includes(dm.id)) continue;
      
      const senderId = dm.message_create?.sender_id;
      if (!senderId || senderId === myId) {
        markProcessed(DB_PATH_DMS, dm.id);
        continue;
      }

      const text = dm.message_create?.message_data?.text || "";
      const textLower = text.toLowerCase();

      // Check if there's a link or possible SKU
      const urlMatch = text.match(/(?:instagram\.com\/(?:p|reel)\/|twitter\.com\/.*\/status\/)([a-zA-Z0-9_-]+)/);
      const possibleSkuMatch = text.match(/\b([A-Z0-9]{4,10})\b/);
      const mediaId = urlMatch ? urlMatch[1] : (possibleSkuMatch ? possibleSkuMatch[1] : null);

      if (mediaId || textLower.includes("price") || textLower.includes("cost")) {
        const product = mediaId ? await getProduct(mediaId) : null;
        const rates = await getRates();
        
        const replyMsg = buildProductDmMessage(product, rates, "there");
        await sendDm(client, senderId, replyMsg);
      }

      markProcessed(DB_PATH_DMS, dm.id);
    }

    return NextResponse.json({ success: true, processed_mentions: repliesCount });
  } catch (error: any) {
    console.error('Error in X cron:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
