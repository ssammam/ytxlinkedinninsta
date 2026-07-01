export async function postVideoToLinkedIn(
  accessToken: string,
  personUrn: string,
  videoBuffer: any,
  caption: string
) {
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
  
  if (!initResponse.ok) return false;
  
  const initData = await initResponse.json();
  const uploadUrl = initData.value.uploadMechanism['com.linkedin.digitalmedia.uploading.MediaUploadHttpRequest'].uploadUrl;
  const assetUrn = initData.value.asset;
  
  const uploadResponse = await fetch(uploadUrl, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/octet-stream'
    },
    body: videoBuffer
  });
  
  if (!uploadResponse.ok) return false;
  
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
          shareCommentary: { text: caption },
          shareMediaCategory: 'VIDEO',
          media: [{ status: 'READY', media: assetUrn }]
        }
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC'
      }
    })
  });
  
  return postResponse.ok;
}

export async function getRecentLinkedInPosts(accessToken: string, authorUrn: string) {
  try {
    const res = await fetch(`https://api.linkedin.com/v2/ugcPosts?q=authors&authors=List(${encodeURIComponent(authorUrn)})&count=10`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0'
      }
    });
    const data = await res.json();
    return data.elements || [];
  } catch (err) {
    return [];
  }
}

export async function getLinkedInComments(accessToken: string, postUrn: string) {
  try {
    const res = await fetch(`https://api.linkedin.com/v2/socialActions/${encodeURIComponent(postUrn)}/comments`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Restli-Protocol-Version': '2.0.0'
      }
    });
    const data = await res.json();
    return data.elements || [];
  } catch (err) {
    return [];
  }
}

export async function replyToLinkedInComment(accessToken: string, postUrn: string, commentUrn: string, authorUrn: string, text: string) {
  try {
    const res = await fetch(`https://api.linkedin.com/v2/socialActions/${encodeURIComponent(postUrn)}/comments`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'X-Restli-Protocol-Version': '2.0.0'
      },
      body: JSON.stringify({
        actor: authorUrn,
        message: { text: text },
        parentComment: commentUrn
      })
    });
    return res.ok;
  } catch (err) {
    return false;
  }
}
