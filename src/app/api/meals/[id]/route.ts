import { NextResponse } from 'next/server';
import { and, eq } from 'drizzle-orm';
import { getDb, mealLogs } from '@/db';
import { getOrCreateUser, verifyLiffRequest } from '@/lib/line/auth';
import { adjustMealPortion } from '@/lib/nutrition/meal-service';

export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const verified = await verifyLiffRequest(req);
  if (!verified) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const user = await getOrCreateUser(verified.lineUserId, verified.displayName);
  const body = await req.json();

  if (typeof body.portionMultiplier === 'number' && body.portionMultiplier > 0) {
    const updated = await adjustMealPortion({
      mealId: id,
      userId: user.id,
      newMultiplier: body.portionMultiplier,
    });
    if (!updated) {
      return NextResponse.json({ error: 'Meal not found' }, { status: 404 });
    }
    return NextResponse.json(updated);
  }

  return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
}

export async function DELETE(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  const verified = await verifyLiffRequest(req);
  if (!verified) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await context.params;
  const user = await getOrCreateUser(verified.lineUserId, verified.displayName);
  const db = getDb();

  const deleted = await db
    .delete(mealLogs)
    .where(and(eq(mealLogs.id, id), eq(mealLogs.userId, user.id)))
    .returning();

  if (deleted.length === 0) {
    return NextResponse.json({ error: 'Meal not found' }, { status: 404 });
  }

  return NextResponse.json({ deleted: true, id });
}
