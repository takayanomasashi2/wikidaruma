import { auth } from "@/app/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const session = await auth();
  
  // ログインページへのアクセスをチェック
  if (request.nextUrl.pathname === "/login") {
    // 既にログインしている場合はダッシュボードへリダイレクト
    if (session) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // 保護されたルートへのアクセスをチェック
  if (!session && request.nextUrl.pathname.startsWith("/dashboard")) {
    // ログインしていない場合はログインページへリダイレクト
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};