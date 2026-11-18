import { NextResponse } from 'next/server';
import { and, asc, eq } from 'drizzle-orm';
import { favoriteItems, getDb } from '@/db';
import { getOrCreateUser, verifyLiffRequest } from '@/lib/line/auth';
import { ParsedFoodSchema } from '@/lib/ai/parser';

export async function GET(req: Request) {
  const verified = await verifyLiffRequest(req);
  if (!verified) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await getOrCreateUser(verified.lineUserId, verified.displayName);
  const db = getDb();

  const items = await db
    .select()
    .from(favoriteItems)
    .where(eq(favoriteItems.userId, user.id))
    .orderBy(asc(favoriteItems.sortOrder));

  return NextResponse.json({ favorites: items });
}

export async function POST(req: Request) {
  const verified = await verifyLiffRequest(req);
  if (!verified) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await getOrCreateUser(verified.lineUserId, verified.displayName);
  const body = await req.json();

  const parsed = ParsedFoodSchema.safeParse(body.payload);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid favorite payload' }, { status: 400 });
  }

  const db = getDb();
  const [created] = await db
    .insert(favoriteItems)
    .values({
      userId: user.id,
      entryType: parsed.data.entryType,
      title: body.title || parsed.data.title,
      payload: parsed.data,
    })
    .returning();

  return NextResponse.json({ favorite: created }, { status: 201 });
}

export async function DELETE(req: Request) {
  const verified = await verifyLiffRequest(req);
  if (!verified) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const url = new URL(req.url);
  const id = url.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Missing favorite id' }, { status: 400 });
  }

  const user = await getOrCreateUser(verified.lineUserId, verified.displayName);
  const db = getDb();

  await db
    .delete(favoriteItems)
    .where(and(eq(favoriteItems.id, id), eq(favoriteItems.userId, user.id)));

  return NextResponse.json({ deleted: true });
}
