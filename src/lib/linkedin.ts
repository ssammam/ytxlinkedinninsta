export async function postVideoToLinkedIn(
  accessToken: string,
  personUrn: string, // e.g. "urn:li:person:XXXX" or "urn:li:organization:XXXX"
  videoBuffer: Buffer,
  caption: string
) {
  // 1. Initialize Upload
  const initResponse = await fetch('https://api.linkedin.com/v2/assets?action=registerUpload', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0'
    },
    body: JSON.stringify({
      registerUploadRequest: {
        recipes: ['urn:li:digitalmediaRecipe:feedshare-video'],
        owner: personUrn,
        serviceRelationships: [{
          relationshipType: 'OWNER',
          identifier: 'urn:li:userGeneratedContent'
        }]
      }
    })
  });
  
  if (!initResponse.ok) {
    console.error('Failed to init LinkedIn upload', await initResponse.text());
    return false;
  }
  
  const initData = await initResponse.json();
  const uploadUrl = initData.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;
  const assetUrn = initData.value.asset;
  
  // 2. Upload Video Buffer
  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/octet-stream'
    },
    body: videoBuffer as any
  });
  
  if (!uploadResponse.ok) {
    console.error('Failed to upload video to LinkedIn', await uploadResponse.text());
    return false;
  }
  
  // 3. Create Post
  const postResponse = await fetch('https://api.linkedin.com/v2/ugcPosts', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      'X-Restli-Protocol-Version': '2.0.0'
    },
    body: JSON.stringify({
      author: personUrn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: {
            text: caption
          },
          shareMediaCategory: 'VIDEO',
          media: [{
            status: 'READY',
            media: assetUrn
          }]
        }
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
      }
    })
  });
  
  if (!postResponse.ok) {
    console.error('Failed to create LinkedIn post', await postResponse.text());
    return false;
  }
  
  return true;
}
