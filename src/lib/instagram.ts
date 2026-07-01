export async function getLatestInstagramVideos(accessToken: string, instagramAccountId: string) {
  try {
    const response = await fetch(`https://graph.instagram.com/v20.0/${instagramAccountId}/media?fields=id,media_type,media_url,caption,timestamp,permalink&access_token=${accessToken}`);
    const data = await response.json();
    
    if (data.error) {
      console.error("Instagram API Error:", data.error);
      return [];
    }

    // Filter for videos (REELS or VIDEO)
    return data.data.filter((item: any) => item.media_type === "VIDEO" || item.media_type === "REELS");
  } catch (error) {
    console.error("Failed to fetch Instagram videos:", error);
    return [];
  }
}

export async function downloadVideo(url: string): Promise<Buffer | null> {
  try {
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch (error) {
    console.error("Failed to download video:", error);
    return null;
  }
}
