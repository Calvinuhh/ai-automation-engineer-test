import { NextResponse } from "next/server";
import { db } from "@/lib/db/client";
import { users } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import { verifyPassword } from "@/lib/auth/hash";
import { signJWT } from "@/lib/auth/jwt";
import { COOKIE_NAME } from "@/lib/auth/config";
import { withLogging } from "@/lib/with-logging";

async function loginHandler(request: Request) {
  const body = await request.json();
  const { username, password } = body;

  if (!username || !password) {
    return NextResponse.json(
      { error: "Username and password required" },
      { status: 400 },
    );
  }

  const user = await db
    .select()
    .from(users)
    .where(eq(users.username, username))
    .limit(1);

  if (user.length === 0) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const validPassword = await verifyPassword(password, user[0].passwordHash);

  if (!validPassword) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = await signJWT({ username: user[0].username });

  const response = NextResponse.json({ success: true });
  response.cookies.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 86400,
    path: "/",
  });

  return response;
}

export const POST = withLogging(loginHandler, "/api/auth/login");
