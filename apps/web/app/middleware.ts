import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // 静的アセットへのアクセスは常に許可
  if (
    request.nextUrl.pathname.startsWith('/_next/') ||
    request.nextUrl.pathname.match(/\.(js|css)$/)
  ) {
    return NextResponse.next();
  }

  // セッショントークンの確認
  const authToken = request.cookies.get('next-auth.session-token')?.value;

  // ログインページへのアクセスをチェック
  if (request.nextUrl.pathname === "/login") {
    // セッションが存在する場合はダッシュボードへリダイレクト
    if (authToken) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return NextResponse.next();
  }

  // 保護されたルートへのアクセスをチェック
  if (!authToken && request.nextUrl.pathname.startsWith("/dashboard")) {
    // ログインしていない場合はログインページへリダイレクト
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // 保護されたルートとログインページ
    '/dashboard/:path*',
    '/login',
    // 静的アセットとAPIルートを除外
    '/((?!api|_next/static|_next/image|assets|favicon.ico).*)',
  ],
};