import { SignJWT, jwtVerify } from 'jose';
import { JWT_SECRET, JWT_EXPIRATION } from './config';

const secret = new TextEncoder().encode(JWT_SECRET);

export interface JWTPayload {
  username: string;
  exp?: number;
  iat?: number;
}

export async function signJWT(payload: { username: string }): Promise<string> {
  const jwt = new SignJWT({ username: payload.username })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(JWT_EXPIRATION);

  return jwt.sign(secret);
}

export async function verifyJWT(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, secret);
    return {
      username: payload.username as string,
      exp: payload.exp,
      iat: payload.iat,
    };
  } catch {
    return null;
  }
}
