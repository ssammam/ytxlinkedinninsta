import { NextResponse } from 'next/server';
import { getYoutubeClient, getLatestComments, replyToYouTubeComment } from '@/lib/youtube';
import * as fs from 'fs';
import * as path from 'path';

// File-based DB to track replied comments
const DB_PATH = path.join(process.cwd(), 'processed_yt_comments.json');

function getProcessedComments(): string[] {
  if (fs.existsSync(DB_PATH)) {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  }
  return [];
}

function markCommentAsProcessed(id: string) {
  const processed = getProcessedComments();
  processed.push(id);
  fs.writeFileSync(DB_PATH, JSON.stringify(processed));
}

// Dummy fetch rates for the example
async function getRates() {
  return {
    goldRate24k: 7200,
    goldRate22k: 6600,
    goldRate18k: 5400,
    goldRate9k: 2700,
    silverRate: 85000
  };
}

export async function GET(request: Request) {
  try {
    if (!process.env.YOUTUBE_CLIENT_ID) {
      return NextResponse.json({ error: 'Missing YouTube credentials' }, { status: 400 });
    }

    const ytClient = await getYoutubeClient(
      process.env.YOUTUBE_ACCESS_TOKEN!,
      process.env.YOUTUBE_REFRESH_TOKEN!,
      process.env.YOUTUBE_CLIENT_ID!,
      process.env.YOUTUBE_CLIENT_SECRET!
    );

    const channelId = process.env.YOUTUBE_CHANNEL_ID!;
    const botChannelId = channelId; // to ignore our own replies

    const threads = await getLatestComments(ytClient, channelId);
    const processed = getProcessedComments();
    
    let processedCount = 0;

    for (const thread of threads) {
      const topLevelComment = thread.snippet.topLevelComment.snippet;
      const commentId = thread.id;
      
      if (processed.includes(commentId)) continue;
      
      const commenterId = topLevelComment.authorChannelId?.value;
      if (commenterId === botChannelId) {
        markCommentAsProcessed(commentId);
        continue;
      }

      const commentText = (topLevelComment.textOriginal || "").toLowerCase();
      const commenterName = topLevelComment.authorDisplayName || "there";
      let replyMsg = "";

      if (commentText.includes("location") || commentText.includes("where") || commentText.includes("address") || commentText.includes("place") || commentText.includes("landmark")) {
        replyMsg = `Namaste, ${commenterName}!\n\n📍Visit Our Store: \n312 Kuvempu Road, Mahakavi Kuvempu Rd, Kengeri, Bengaluru, Karnataka 560060\n\nContact: 9620741404\n\nGoogle Link:\nhttps://maps.app.goo.gl/D8uuSHdgHX1F6yBeA\n\nWe look forward to welcoming you! We are RH Jewellers Kengeri.`;
      } 
      else if (commentText.includes("making charges") || commentText.includes("making charge") || commentText.includes("mc") || commentText.includes("wastage") || commentText.includes("wasteage")) {
        replyMsg = `Namaste, ${commenterName}!\n\nWastage is 10%, but Making Charges are 0! We don't charge for making! Visit us to buy jewelry.\n\n📍Visit Our Store: \n312 Kuvempu Road, Mahakavi Kuvempu Rd, Kengeri, Bengaluru, Karnataka 560060\nGoogle Link:\nhttps://maps.app.goo.gl/D8uuSHdgHX1F6yBeA\n\nWe are RH Jewellers Kengeri.`;
      }
      else if (commentText.includes("rate") || commentText.includes("gold rate") || commentText.includes("18k") || commentText.includes("22k") || commentText.includes("24k") || commentText.includes("silver") || commentText.includes("daily price") || commentText.includes("today price") || commentText.includes("today's price") || commentText.includes("price") || /\bpp\b/.test(commentText)) {
        const rates = await getRates();
        const d = new Date();
        const dateSuffix = (d.getDate() % 10 === 1 && d.getDate() !== 11) ? 'st' : (d.getDate() % 10 === 2 && d.getDate() !== 12) ? 'nd' : (d.getDate() % 10 === 3 && d.getDate() !== 13) ? 'rd' : 'th';
        const dateStr = `${d.getDate()}${dateSuffix} ${d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}`;

        replyMsg = `Namaste, ${commenterName}!\n\nHere are our live rates as of ${dateStr}:\n`;
        if (rates.goldRate24k) replyMsg += `\n🔸 24K Gold: ₹${rates.goldRate24k.toLocaleString('en-IN')} per gram`;
        if (rates.goldRate22k) replyMsg += `\n🔸 22K Gold: ₹${rates.goldRate22k.toLocaleString('en-IN')} per gram`;
        if (rates.goldRate18k) replyMsg += `\n🔸 18K Gold: ₹${rates.goldRate18k.toLocaleString('en-IN')} per gram`;
        if (rates.goldRate9k) replyMsg += `\n🔸 9K Gold: ₹${rates.goldRate9k.toLocaleString('en-IN')} per gram`;
        if (rates.silverRate) replyMsg += `\n🔸 Silver: ₹${rates.silverRate.toLocaleString('en-IN')} per kg`;

        replyMsg += `\n\nIs there a specific jewelry design you are looking for? We are RH Jewellers Kengeri.`;
      }

      if (replyMsg) {
        await replyToYouTubeComment(ytClient, commentId, replyMsg);
        processedCount++;
      }
      
      markCommentAsProcessed(commentId);
    }

    return NextResponse.json({ success: true, processed: processedCount });
  } catch (error: any) {
    console.error('Error in YouTube comments cron:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
