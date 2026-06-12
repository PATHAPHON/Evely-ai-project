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
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  const PROTECTED_PREFIXES = [
    '/home',
    '/words',
    '/scan',
    '/chat',
    '/profile',
    '/tutor',
    '/topik',
    '/backoffice',
  ];

  const isProtectedRoute = PROTECTED_PREFIXES.some(prefix => 
    pathname === prefix || pathname.startsWith(prefix + '/')
  );

  const isAuthRoute = pathname === '/auth';
  const isRootRoute = pathname === '/';

  if (isProtectedRoute) {
    if (!user) {
      // User is not logged in, redirect to login page with preserved target page
      const url = request.nextUrl.clone();
      url.pathname = '/auth';
      url.searchParams.set('redirect', pathname + request.nextUrl.search);
      return NextResponse.redirect(url);
    }
  }

  if (isRootRoute) {
    if (user) {
      return NextResponse.redirect(new URL('/chat', request.url));
    } else {
      return NextResponse.redirect(new URL('/auth?redirect=/chat', request.url));
    }
  }

  if (isAuthRoute) {
    if (user) {
      // User is already logged in, redirect to chat page or targeted redirect route
      const redirectParam = request.nextUrl.searchParams.get('redirect') || '/chat';
      return NextResponse.redirect(new URL(redirectParam, request.url));
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
