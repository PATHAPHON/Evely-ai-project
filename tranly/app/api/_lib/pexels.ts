export function getProcessedQuery(query: string): string {
  const qLower = query.toLowerCase();
  if (
    !qLower.includes('white background') &&
    !qLower.includes('isolated') &&
    !qLower.includes('transparent')
  ) {
    return `${query} isolated on white background`;
  }
  return query;
}

export async function fetchPexelsImage(query: string): Promise<string | null> {
  const apiKey = process.env.PEXELS_API_KEY;
  if (!apiKey) {
    console.log('PEXELS_API_KEY is not set. Skipping Pexels search.');
    return null;
  }

  const processedQuery = getProcessedQuery(query);

  try {
    const response = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(processedQuery)}&per_page=1`,
      {
        headers: {
          Authorization: apiKey,
        },
      }
    );

    if (!response.ok) {
      console.error(`Pexels API error: [${response.status}]`);
      return null;
    }

    const data = await response.json();
    const photo = data?.photos?.[0];
    if (photo?.src?.large) {
      return photo.src.large;
    }
    if (photo?.src?.medium) {
      return photo.src.medium;
    }
    return null;
  } catch (error) {
    console.error('Failed to fetch from Pexels API:', error);
    return null;
  }
}
