import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  // Safe fallback if Supabase environment variables are not loaded (e.g. during build/test)
  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next();
  }

  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session if expired - required for Server Components and middleware session checks.
  let user = null;
  try {
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    user = authUser;
  } catch (authError) {
    console.error('Middleware: auth verification error:', authError);
  }

  const pathname = request.nextUrl.pathname;

  const PROTECTED_PREFIXES = [
    '/words',
    '/chat',
    '/new',
    '/recents',
    '/profile',
    '/refresh',
  ];

  const isProtectedRoute = PROTECTED_PREFIXES.some(prefix => 
    pathname === prefix || pathname.startsWith(prefix + '/')
  );

  const isAuthRoute = pathname === '/auth';
  const isRootRoute = pathname === '/';

  // Anonymous users are treated as unauthenticated (guest mode removed)
  const isAnonymous = user?.is_anonymous === true;
  const isLoggedIn = user && !isAnonymous;

  if (isProtectedRoute) {
    if (!isLoggedIn) {
      const url = request.nextUrl.clone();
      url.pathname = '/auth';
      url.searchParams.set('redirect', pathname + request.nextUrl.search);
      return NextResponse.redirect(url);
    }
  }

  if (isRootRoute && isLoggedIn) {
    return NextResponse.redirect(new URL('/new', request.url));
  }

  if (isAuthRoute) {
    if (isLoggedIn) {
      const redirectParam = request.nextUrl.searchParams.get('redirect');
      // Only allow same-origin relative paths; reject absolute/protocol-relative
      // ('//evil.com') and backslash tricks ('/\evil') to prevent open redirect.
      const safeRedirect =
        redirectParam && /^\/[^/\\]/.test(redirectParam) ? redirectParam : '/new';
      return NextResponse.redirect(new URL(safeRedirect, request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - api routes (starts with /api)
     * - static files (_next/static, _next/image, favicon.ico)
     * - media files and assets (images, audio, fonts, etc.)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|css|js|json|woff|woff2|ttf|otf|mp3|wav|ogg)$).*)',
  ],
};
