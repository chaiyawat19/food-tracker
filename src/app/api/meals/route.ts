import { NextResponse } from 'next/server';
import { getOrCreateUser, verifyLiffRequest } from '@/lib/line/auth';
import { parseFoodInputWithAI, ParsedFoodSchema } from '@/lib/ai/parser';
import {
  createMealLogFromParsed,
  findPresetDishByText,
  getRecentMealsWithIngredients,
} from '@/lib/nutrition/meal-service';

export async function GET(req: Request) {
  const verified = await verifyLiffRequest(req);
  if (!verified) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await getOrCreateUser(verified.lineUserId, verified.displayName);
  const meals = await getRecentMealsWithIngredients(user.id, 50);
  return NextResponse.json({ meals });
}

export async function POST(req: Request) {
  const verified = await verifyLiffRequest(req);
  if (!verified) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await getOrCreateUser(verified.lineUserId, verified.displayName);
  const body = await req.json();

  // Mode 1: Natural language text input (parsed via Preset or Gemini AI)
  if (typeof body.rawText === 'string' && body.rawText.trim().length > 0) {
    const rawText = body.rawText.trim();
    const preset = await findPresetDishByText(rawText);
    const parsed = preset ?? (await parseFoodInputWithAI(rawText));
    const result = await createMealLogFromParsed({
      userId: user.id,
      parsed,
      rawInput: rawText,
    });
    return NextResponse.json(result, { status: 201 });
  }

  // Mode 2: Structured payload (e.g., Quick Favorite or manual form)
  const parsedPayload = ParsedFoodSchema.safeParse(body);
  if (!parsedPayload.success) {
    return NextResponse.json(
      { error: 'Invalid meal payload', details: parsedPayload.error.flatten() },
      { status: 400 }
    );
  }

  const result = await createMealLogFromParsed({
    userId: user.id,
    parsed: parsedPayload.data,
    rawInput: body.rawInput,
  });
  return NextResponse.json(result, { status: 201 });
}
