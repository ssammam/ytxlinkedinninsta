import { TwitterApi } from 'twitter-api-v2';
import * as fs from 'fs';
import * as path from 'path';

export async function postVideoToTwitter(
  appKey: string,
  appSecret: string,
  accessToken: string,
  accessSecret: string,
  videoBuffer: Buffer,
  caption: string
) {
  const client = new TwitterApi({
    appKey,
    appSecret,
    accessToken,
    accessSecret,
  });

  // Write buffer to a temp file because TwitterApi prefers a file path or stream for chunked uploads
  const tempPath = path.join(process.cwd(), `temp-${Date.now()}.mp4`);
  
  try {
    fs.writeFileSync(tempPath, videoBuffer);
    
    // Upload media
    const mediaId = await client.v1.uploadMedia(tempPath, { type: 'longmp4' });
    
    // Post tweet with media
    await client.v2.tweet({
      text: caption,
      media: { media_ids: [mediaId] }
    });
    
    return true;
  } catch (error) {
    console.error('Error posting to Twitter:', error);
    return false;
  } finally {
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
  }
}
