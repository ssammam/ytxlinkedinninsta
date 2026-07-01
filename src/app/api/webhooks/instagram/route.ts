import { NextResponse } from 'next/server';
import { downloadVideo } from '@/lib/instagram';
import { postVideoToTwitter } from '@/lib/twitter';
import { postVideoToLinkedIn } from '@/lib/linkedin';
import { getYoutubeClient, uploadVideoToYouTube } from '@/lib/youtube';

// Facebook/Instagram Webhook Verification
export async function GET(request: Request) {
  const url = new URL(request.url);
  
  const mode = url.searchParams.get('hub.mode');
  const token = url.searchParams.get('hub.verify_token');
  const challenge = url.searchParams.get('hub.challenge');

  const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN || 'my_secure_verify_token';

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    console.log('Webhook verified successfully!');
    return new NextResponse(challenge, { status: 200 });
  } else {
    return new NextResponse('Forbidden', { status: 403 });
  }
}

// Handle Incoming Webhook Events
export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('Received Webhook:', JSON.stringify(body, null, 2));

    // Acknowledge receipt immediately to avoid Meta retrying
    const response = NextResponse.json({ success: true }, { status: 200 });

    // Process the webhook asynchronously
    processWebhook(body).catch(console.error);

    return response;
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

async function processWebhook(body: any) {
  if (body.object === 'instagram') {
    for (const entry of body.entry) {
      for (const change of entry.changes) {
        // Look for new media (reels/posts)
        if (change.field === 'media') {
          const mediaId = change.value.id;
          
          // Fetch the full media details using the ID
          const igAccessToken = process.env.IG_ACCESS_TOKEN;
          if (!igAccessToken) return;

          const mediaRes = await fetch(`https://graph.instagram.com/v20.0/${mediaId}?fields=id,media_type,media_url,caption&access_token=${igAccessToken}`);
          const video = await mediaRes.json();

          if (video.media_type === 'VIDEO' || video.media_type === 'REELS') {
            console.log(`Processing new webhook video from Instagram: ${video.id}`);
            
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
            }

            // 2. Post to LinkedIn
            if (process.env.LINKEDIN_ACCESS_TOKEN) {
              await postVideoToLinkedIn(
                process.env.LINKEDIN_ACCESS_TOKEN,
                process.env.LINKEDIN_PERSON_URN!,
                videoBuffer,
                caption
              );
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
                caption.substring(0, 100),
                caption
              );
            }
          }
        }
      }
    }
  }
}
