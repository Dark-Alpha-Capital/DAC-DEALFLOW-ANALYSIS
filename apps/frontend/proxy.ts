import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/auth/error";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: "/api/auth/error",
};
