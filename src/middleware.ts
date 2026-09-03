import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  try {
    const { pathname } = request.nextUrl;
    const { user, supabaseResponse } = await updateSession(request);
    const isLoggedIn = Boolean(user);

    if (pathname.startsWith("/admin") && !isLoggedIn) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }

    if (pathname === "/login" && isLoggedIn) {
      return NextResponse.redirect(new URL("/admin/prehled", request.url));
    }

    if (pathname === "/admin" && isLoggedIn) {
      return NextResponse.redirect(new URL("/admin/prehled", request.url));
    }

    return supabaseResponse;
  } catch (error) {
    console.error("Middleware crashed:", error);
    const { pathname } = request.nextUrl;

    if (pathname.startsWith("/admin")) {
      const loginUrl = new URL("/login", request.url);
      loginUrl.searchParams.set("next", pathname);
      return NextResponse.redirect(loginUrl);
    }

    return NextResponse.next({ request });
  }
}

export const config = {
  matcher: ["/admin", "/admin/:path*", "/login"],
};
