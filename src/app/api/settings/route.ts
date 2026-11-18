import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb, users } from '@/db';
import { getOrCreateUser, verifyLiffRequest } from '@/lib/line/auth';

export async function GET(req: Request) {
  const verified = await verifyLiffRequest(req);
  if (!verified) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  const user = await getOrCreateUser(verified.lineUserId, verified.displayName);
  return NextResponse.json({ user });
}

export async function PATCH(req: Request) {
  const verified = await verifyLiffRequest(req);
  if (!verified) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await getOrCreateUser(verified.lineUserId, verified.displayName);
  const body = await req.json();
  const db = getDb();

  const [updated] = await db
    .update(users)
    .set({
      dailyCalorieGoal:
        typeof body.dailyCalorieGoal === 'number'
          ? Math.max(500, Math.round(body.dailyCalorieGoal))
          : user.dailyCalorieGoal,
      weeklySweetDrinkQuota:
        typeof body.weeklySweetDrinkQuota === 'number'
          ? Math.max(0, Math.round(body.weeklySweetDrinkQuota))
          : user.weeklySweetDrinkQuota,
      dailySweetSnackKcalQuota:
        typeof body.dailySweetSnackKcalQuota === 'number'
          ? Math.max(0, Math.round(body.dailySweetSnackKcalQuota))
          : user.dailySweetSnackKcalQuota,
    })
    .where(eq(users.id, user.id))
    .returning();

  return NextResponse.json({ user: updated });
}
