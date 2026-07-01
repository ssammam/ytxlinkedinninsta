import { TwitterApi } from 'twitter-api-v2';
import * as fs from 'fs';
import * as path from 'path';

export function getTwitterClient() {
  if (!process.env.TWITTER_APP_KEY || !process.env.TWITTER_APP_SECRET || !process.env.TWITTER_ACCESS_TOKEN || !process.env.TWITTER_ACCESS_SECRET) {
    return null;
  }
  return new TwitterApi({
    appKey: process.env.TWITTER_APP_KEY,
    appSecret: process.env.TWITTER_APP_SECRET,
    accessToken: process.env.TWITTER_ACCESS_TOKEN,
    accessSecret: process.env.TWITTER_ACCESS_SECRET,
  });
}

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

  const tempPath = path.join(process.cwd(), `temp-${Date.now()}.mp4`);
  
  try {
    fs.writeFileSync(tempPath, videoBuffer);
    const mediaId = await client.v1.uploadMedia(tempPath, { type: 'longmp4' });
    
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

export async function getRecentMentions(client: TwitterApi, userId: string) {
  try {
    const mentions = await client.v2.userMentionTimeline(userId, {
      max_results: 20,
      'tweet.fields': ['created_at', 'author_id', 'text']
    });
    return mentions.data.data || [];
  } catch (error) {
    console.error('Error fetching Twitter mentions:', error);
    return [];
  }
}

export async function replyToTweet(client: TwitterApi, tweetId: string, replyText: string) {
  try {
    const res = await client.v2.reply(replyText, tweetId);
    return res;
  } catch (error) {
    console.error('Error replying to tweet:', error);
    return null;
  }
}

export async function getMyUserId(client: TwitterApi) {
  const me = await client.v2.me();
  return me.data.id;
}
