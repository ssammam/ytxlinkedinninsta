import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getTwitterClient, replyToTweet, sendDm, getMyUserId } from '@/lib/twitter';
import { getRates, getProduct, buildProductDmMessage } from '@/lib/sanityLogic';

// Twitter CRC (Challenge-Response Check)
export async function GET(request: Request) {
  const url = new URL(request.url);
  const crc_token = url.searchParams.get('crc_token');

  if (crc_token) {
    const consumerSecret = process.env.TWITTER_APP_SECRET || '';
    if (!consumerSecret) {
      return new NextResponse('Missing TWITTER_APP_SECRET', { status: 500 });
    }

    const hmac = crypto
      .createHmac('sha256', consumerSecret)
      .update(crc_token)
      .digest('base64');

    return NextResponse.json({
      response_token: `sha256=${hmac}`
    }, { status: 200 });
  }

  return new NextResponse('No crc_token provided', { status: 400 });
}

// Handle incoming X.com Webhook Events
export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('X Webhook received:', JSON.stringify(body, null, 2));

    const client = getTwitterClient();
    if (!client) {
      return NextResponse.json({ success: false }, { status: 200 });
    }
    const myId = await getMyUserId(client);

    // 1. Process Direct Messages
    if (body.direct_message_events) {
      for (const event of body.direct_message_events) {
        if (event.type === 'message_create') {
          const senderId = event.message_create.sender_id;
          if (senderId === myId) continue; // Ignore our own messages

          const text = event.message_create.message_data.text || "";
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
        }
      }
    }

    // 2. Process Mentions / Tweet replies
    if (body.tweet_create_events) {
      for (const tweet of body.tweet_create_events) {
        if (tweet.user.id_str === myId) continue; // Ignore our own tweets

        const text = (tweet.text || "").toLowerCase();
        let repliesCount = 0;

        if (text.includes("price") || text.includes("cost") || text.includes("pp") || text.includes("rate") || text.includes("how much")) {
          const dmText = `Namaste! You asked about a product on our page. Please share the specific link or SKU in this DM so we can fetch the exact live price for you! We are RH Jewellers Kengeri.`;
          const dmSuccess = await sendDm(client, tweet.user.id_str, dmText);

          if (dmSuccess) {
            await replyToTweet(client, tweet.id_str, `Thank you for your interest! Please check your DM for more details. Regards RH Jewellers, Kengeri.`);
          } else {
            await replyToTweet(client, tweet.id_str, `Thank you for your interest! We couldn't send you a DM. Please DM us the product link so we can give you the exact price. Regards RH Jewellers, Kengeri.`);
          }
        } else if (text.includes("location") || text.includes("where")) {
          const dmText = `Namaste! 📍Visit Our Store: 312 Kuvempu Road, Kengeri, Bengaluru. Contact: 9620741404. We look forward to welcoming you! RH Jewellers Kengeri.`;
          const dmSuccess = await sendDm(client, tweet.user.id_str, dmText);
          
          if (dmSuccess) {
             await replyToTweet(client, tweet.id_str, `Thank you for your interest! Please check your DM for our location. Regards RH Jewellers, Kengeri.`);
          }
        }
      }
    }

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error('X Webhook error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
