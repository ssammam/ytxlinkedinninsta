import { NextResponse } from 'next/server';
import { getLatestInstagramVideos, downloadVideo } from '@/lib/instagram';
import { postVideoToTwitter } from '@/lib/twitter';
import { postVideoToLinkedIn } from '@/lib/linkedin';
import { getYoutubeClient, uploadVideoToYouTube } from '@/lib/youtube';
import * as fs from 'fs';
import * as path from 'path';

// Simple file-based database to store processed media IDs
const DB_PATH = path.join(process.cwd(), 'processed_media.json');

function getProcessedMedia(): string[] {
  if (fs.existsSync(DB_PATH)) {
    return JSON.parse(fs.readFileSync(DB_PATH, 'utf-8'));
  }
  return [];
}

function markMediaAsProcessed(id: string) {
  const processed = getProcessedMedia();
  processed.push(id);
  fs.writeFileSync(DB_PATH, JSON.stringify(processed));
}

export async function GET(request: Request) {
  try {
    // Note: Provide these through process.env in production
    const igAccessToken = process.env.IG_ACCESS_TOKEN || '';
    const igAccountId = process.env.IG_ACCOUNT_ID || '';
    
    if (!igAccessToken || !igAccountId) {
      return NextResponse.json({ error: 'Missing IG credentials' }, { status: 400 });
    }

    const videos = await getLatestInstagramVideos(igAccessToken, igAccountId);
    const processed = getProcessedMedia();
    
    for (const video of videos) {
      if (processed.includes(video.id)) {
        continue;
      }
      
      console.log(`Processing new video from Instagram: ${video.id}`);
      
      const videoBuffer = await downloadVideo(video.media_url);
      if (!videoBuffer) continue;

      const caption = video.caption || 'Check out our latest video!';

      // 1. Post to Twitter (X)
      if (process.env.TWITTER_APP_KEY) {
        await postVideoToTwitter(
          process.env.TWITTER_APP_KEY,
          process.env.TWITTER_APP_SECRET!,
          process.env.TWITTER_ACCESS_TOKEN!,
          process.env.TWITTER_ACCESS_SECRET!,
          videoBuffer,
          caption
        );
        console.log(`Posted ${video.id} to Twitter`);
      }

      // 2. Post to LinkedIn
      if (process.env.LINKEDIN_ACCESS_TOKEN) {
        await postVideoToLinkedIn(
          process.env.LINKEDIN_ACCESS_TOKEN,
          process.env.LINKEDIN_PERSON_URN!,
          videoBuffer,
          caption
        );
        console.log(`Posted ${video.id} to LinkedIn`);
      }

      // 3. Post to YouTube
      if (process.env.YOUTUBE_CLIENT_ID) {
        const ytClient = await getYoutubeClient(
          process.env.YOUTUBE_ACCESS_TOKEN!,
          process.env.YOUTUBE_REFRESH_TOKEN!,
          process.env.YOUTUBE_CLIENT_ID!,
          process.env.YOUTUBE_CLIENT_SECRET!
        );
        
        await uploadVideoToYouTube(
          ytClient,
          videoBuffer,
          caption.substring(0, 100), // title
          caption // description
        );
        console.log(`Posted ${video.id} to YouTube`);
      }

      markMediaAsProcessed(video.id);
    }

    return NextResponse.json({ success: true, processed: videos.length });
  } catch (error: any) {
    console.error('Error in sync cron:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
