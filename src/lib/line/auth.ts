import { eq } from 'drizzle-orm';
import { getDb, users } from '@/db';

export interface VerifiedLineUser {
  lineUserId: string;
  displayName?: string;
}

export async function verifyLiffRequest(req: Request): Promise<VerifiedLineUser | null> {
  const authHeader = req.headers.get('authorization');
  const token = authHeader?.replace(/^Bearer\s+/i, '').trim();

  if (
    process.env.NODE_ENV !== 'production' &&
    process.env.DEV_MOCK_LINE_USER_ID &&
    (!token || token === 'dev-mock-token')
  ) {
    return {
      lineUserId: process.env.DEV_MOCK_LINE_USER_ID,
      displayName: 'Dev User',
    };
  }

  if (!token) return null;

  const channelId = process.env.LINE_LOGIN_CHANNEL_ID || '';
  const res = await fetch('https://api.line.me/oauth2/v2.1/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      id_token: token,
      client_id: channelId,
    }),
  });

  if (!res.ok) return null;
  const data = (await res.json()) as { sub?: string; name?: string };
  if (!data.sub) return null;

  return {
    lineUserId: data.sub,
    displayName: data.name,
  };
}

export async function getOrCreateUser(lineUserId: string, displayName?: string) {
  const db = getDb();
  const existing = await db
    .select()
    .from(users)
    .where(eq(users.lineUserId, lineUserId));

  if (existing.length > 0) {
    return existing[0];
  }

  const [created] = await db
    .insert(users)
    .values({
      lineUserId,
      displayName: displayName || 'LINE User',
    })
    .returning();

  return created;
}
