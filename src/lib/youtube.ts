import { google } from 'googleapis';
import { Readable } from 'stream';

export async function getYoutubeClient(accessToken: string, refreshToken: string, clientId: string, clientSecret: string) {
  const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
  oauth2Client.setCredentials({
    access_token: accessToken,
    refresh_token: refreshToken
  });
  return google.youtube({ version: 'v3', auth: oauth2Client });
}

export async function uploadVideoToYouTube(
  youtubeClient: any,
  videoBuffer: Buffer,
  title: string,
  description: string
) {
  try {
    const stream = new Readable();
    stream.push(videoBuffer);
    stream.push(null);

    const res = await youtubeClient.videos.insert({
      part: ['snippet', 'status'],
      requestBody: {
        snippet: {
          title,
          description,
          tags: ['shorts', 'jewelry', 'rhjewellers'],
          categoryId: '22', // People & Blogs
        },
        status: {
          privacyStatus: 'public',
        },
      },
      media: {
        body: stream,
      },
    });
    
    return res.data;
  } catch (error) {
    console.error('Error uploading to YouTube:', error);
    return null;
  }
}

export async function replyToYouTubeComment(youtubeClient: any, commentId: string, replyText: string) {
  try {
    const res = await youtubeClient.comments.insert({
      part: ['snippet'],
      requestBody: {
        snippet: {
          parentId: commentId,
          textOriginal: replyText
        }
      }
    });
    console.log(`Replied to YouTube comment ${commentId}`);
    return res.data;
  } catch (error) {
    console.error(`Error replying to YouTube comment ${commentId}:`, error);
    return null;
  }
}

export async function getLatestComments(youtubeClient: any, channelId: string) {
  try {
    const res = await youtubeClient.commentThreads.list({
      part: ['snippet', 'replies'],
      allThreadsRelatedToChannelId: channelId,
      maxResults: 50,
      order: 'time'
    });
    return res.data.items || [];
  } catch (error) {
    console.error('Error fetching YouTube comments:', error);
    return [];
  }
}
