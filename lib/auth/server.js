import {  createAuthServer } from '@neondatabase/auth/next/server';

export const auth = createAuthServer({
  baseUrl: process.env.NEON_AUTH_BASE_URL,
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET,
  },
});
