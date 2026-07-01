import { NextResponse } from 'next/server';
import { getRecentLinkedInPosts, getLinkedInComments, replyToLinkedInComment } from '@/lib/linkedin';
import * as fs from 'fs';
import * as path from 'path';

const DB_PATH = path.join(process.cwd(), 'processed_linkedin_comments.json');

function getProcessed(): string[] {
  if (fs.existsSync(DB_PATH)) {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  }
  return [];
}

function markProcessed(id: string) {
  const processed = getProcessed();
  processed.push(id);
  fs.writeFileSync(DB_PATH, JSON.stringify(processed));
}

// Simulated rate fetch
async function getRates() {
  return {
    goldRate24k: 7200,
    goldRate22k: 6600,
    goldRate18k: 5400,
    silverRate: 85000
  };
}

export async function GET(request: Request) {
  try {
    const accessToken = process.env.LINKEDIN_ACCESS_TOKEN;
    const authorUrn = process.env.LINKEDIN_PERSON_URN;
    if (!accessToken || !authorUrn) {
      return NextResponse.json({ error: 'Missing LinkedIn credentials' }, { status: 400 });
    }

    const posts = await getRecentLinkedInPosts(accessToken, authorUrn);
    const processed = getProcessed();
    let count = 0;

    for (const post of posts) {
      const postUrn = post.id;
      const comments = await getLinkedInComments(accessToken, postUrn);
      
      for (const comment of comments) {
        if (processed.includes(comment.id)) continue;
        if (comment.actor === authorUrn) {
          markProcessed(comment.id);
          continue;
        }

        const text = (comment.message?.text || "").toLowerCase();
        let replyMsg = "";

        if (text.includes("location") || text.includes("where") || text.includes("address")) {
          replyMsg = `Namaste! 📍Visit Our Store: 312 Kuvempu Road, Kengeri, Bengaluru. Contact: 9620741404. We look forward to welcoming you! RH Jewellers Kengeri.`;
        } 
        else if (text.includes("making charges") || text.includes("wastage")) {
          replyMsg = `Namaste! Wastage is 10%, but Making Charges are 0! Visit us to buy jewelry. RH Jewellers Kengeri.`;
        }
        else if (text.includes("rate") || text.includes("price") || text.includes("cost") || text.includes("22k")) {
          const rates = await getRates();
          replyMsg = `Namaste! Live rates today:\n🔸 24K: ₹${rates.goldRate24k}\n🔸 22K: ₹${rates.goldRate22k}\n🔸 18K: ₹${rates.goldRate18k}\n🔸 Silver: ₹${rates.silverRate}/kg\nRH Jewellers Kengeri.`;
        }

        if (replyMsg) {
          await replyToLinkedInComment(accessToken, postUrn, comment.id, authorUrn, replyMsg);
          count++;
        }
        
        markProcessed(comment.id);
      }
    }

    return NextResponse.json({ success: true, replied: count });
  } catch (error: any) {
    console.error('Error in LinkedIn cron:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
