import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get('url');
  if (!url) {
    return new NextResponse('Missing url parameter', { status: 400 });
  }

  try {
    const res = await fetch(url);
    if (!res.ok) {
      return new NextResponse('Failed to fetch image', { status: res.status });
    }

    const blob = await res.blob();
    const contentType = res.headers.get('Content-Type') || 'image/png';

    const headers = new Headers();
    headers.set('Content-Type', contentType);
    headers.set('Cache-Control', 'public, max-age=86400, s-maxage=86400');

    return new NextResponse(blob, { status: 200, headers });
  } catch (err) {
    console.error('Image proxy failed:', err);
    return new NextResponse('Internal server error', { status: 500 });
  }
}
