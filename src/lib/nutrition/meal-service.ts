import { and, desc, eq, gte, sql } from 'drizzle-orm';
import {
  getDb,
  ingredientCategories,
  ingredients,
  mealLogIngredients,
  mealLogs,
  presetDishes,
  presetDishIngredients,
  users,
} from '@/db';
import type { ParsedFood } from '@/lib/ai/parser';
import { evaluateSweetQuota, scaleMealByMultiplier, type QuotaStatus } from './calculator';

export function getStartOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
}

export function getStartOfWeek(): Date {
  const now = new Date();
  const day = now.getDay(); // 0 = Sunday, 1 = Monday
  const diff = day === 0 ? 6 : day - 1; // Start week on Monday
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - diff, 0, 0, 0, 0);
  return start;
}

export async function getUserSweetQuotaStatus(userId: string): Promise<QuotaStatus> {
  const db = getDb();
  const [user] = await db.select().from(users).where(eq(users.id, userId));
  const weeklyQuota = user?.weeklySweetDrinkQuota ?? 3;
  const dailyKcalQuota = user?.dailySweetSnackKcalQuota ?? 300;

  const weekStart = getStartOfWeek();
  const todayStart = getStartOfToday();

  const [drinkCountRow] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(mealLogs)
    .where(
      and(
        eq(mealLogs.userId, userId),
        eq(mealLogs.entryType, 'SWEET_DRINK'),
        gte(mealLogs.loggedAt, weekStart)
      )
    );

  const [sweetKcalRow] = await db
    .select({ total: sql<number>`coalesce(sum(${mealLogs.totalKcal}), 0)::float` })
    .from(mealLogs)
    .where(
      and(
        eq(mealLogs.userId, userId),
        gte(mealLogs.loggedAt, todayStart),
        sql`${mealLogs.entryType} in ('SWEET_DRINK', 'SNACK')`
      )
    );

  return evaluateSweetQuota({
    weeklySweetDrinkCount: drinkCountRow?.count ?? 0,
    weeklySweetDrinkQuota: weeklyQuota,
    dailySweetSnackKcal: sweetKcalRow?.total ?? 0,
    dailySweetSnackKcalQuota: dailyKcalQuota,
  });
}

export async function findPresetDishByText(rawText: string): Promise<ParsedFood | null> {
  const db = getDb();
  const normalized = rawText.trim().toLowerCase();
  const allDishes = await db.select().from(presetDishes);

  const matched = allDishes.find((dish) => {
    if (dish.nameTh.toLowerCase() === normalized) return true;
    if (!dish.aliases) return false;
    return dish.aliases
      .split(',')
      .map((a) => a.trim().toLowerCase())
      .includes(normalized);
  });

  if (!matched) return null;

  const rows = await db
    .select({
      ingredientName: ingredients.nameTh,
      kcalPer100g: ingredients.kcalPer100g,
      defaultGrams: presetDishIngredients.defaultGrams,
      categorySlug: ingredientCategories.slug,
    })
    .from(presetDishIngredients)
    .innerJoin(ingredients, eq(presetDishIngredients.ingredientId, ingredients.id))
    .innerJoin(ingredientCategories, eq(ingredients.categoryId, ingredientCategories.id))
    .where(eq(presetDishIngredients.presetDishId, matched.id));

  return {
    entryType: 'MAIN_DISH',
    title: matched.nameTh,
    portionMultiplier: 1,
    cookingKcal: matched.baseCookingKcal,
    totalKcal: matched.defaultTotalKcal,
    ingredients: rows.map((r) => ({
      ingredientName: r.ingredientName,
      categorySlug: r.categorySlug as
        | 'pork'
        | 'chicken'
        | 'beef'
        | 'seafood'
        | 'egg'
        | 'veg'
        | 'carb'
        | 'other',
      grams: r.defaultGrams,
      kcal: Math.round((r.kcalPer100g * r.defaultGrams) / 100),
    })),
  };
}

export async function createMealLogFromParsed(params: {
  userId: string;
  parsed: ParsedFood;
  rawInput?: string;
}) {
  const db = getDb();
  const { userId, parsed, rawInput } = params;

  const [createdMeal] = await db
    .insert(mealLogs)
    .values({
      userId,
      entryType: parsed.entryType,
      title: parsed.title,
      rawInput: rawInput ?? parsed.title,
      portionMultiplier: parsed.portionMultiplier ?? 1,
      totalKcal: parsed.totalKcal,
      sugarGrams: parsed.entryType === 'MAIN_DISH' ? 0 : parsed.sugarGrams,
      sweetnessLevel: parsed.entryType === 'SWEET_DRINK' ? parsed.sweetnessLevel : null,
      toppings: parsed.entryType === 'SWEET_DRINK' ? parsed.toppings : [],
      snackCategory: parsed.entryType === 'SNACK' ? parsed.snackCategory : null,
    })
    .returning();

  const savedIngredients: Array<{ ingredientName: string; grams: number; kcal: number }> = [];

  if (parsed.entryType === 'MAIN_DISH') {
    const categories = await db.select().from(ingredientCategories);
    const catBySlug = new Map(categories.map((c) => [c.slug, c.id]));
    const fallbackCatId = catBySlug.get('other') ?? categories[0]?.id;

    const allIngredients = await db.select().from(ingredients);
    const ingByName = new Map(allIngredients.map((i) => [i.nameTh, i.id]));

    for (const ing of parsed.ingredients) {
      const categoryId = catBySlug.get(ing.categorySlug) ?? fallbackCatId;
      if (!categoryId) continue;

      await db.insert(mealLogIngredients).values({
        mealLogId: createdMeal.id,
        ingredientId: ingByName.get(ing.ingredientName) ?? null,
        categoryId,
        ingredientName: ing.ingredientName,
        grams: ing.grams,
        kcal: ing.kcal,
      });

      savedIngredients.push({
        ingredientName: ing.ingredientName,
        grams: ing.grams,
        kcal: ing.kcal,
      });
    }
  }

  const quota = await getUserSweetQuotaStatus(userId);
  return { meal: createdMeal, ingredients: savedIngredients, quota };
}

export async function adjustMealPortion(params: {
  mealId: string;
  userId: string;
  newMultiplier: number;
}) {
  const db = getDb();
  const [meal] = await db
    .select()
    .from(mealLogs)
    .where(and(eq(mealLogs.id, params.mealId), eq(mealLogs.userId, params.userId)));

  if (!meal) return null;

  const existingIngs = await db
    .select({
      id: mealLogIngredients.id,
      ingredientName: mealLogIngredients.ingredientName,
      categoryId: mealLogIngredients.categoryId,
      grams: mealLogIngredients.grams,
      kcal: mealLogIngredients.kcal,
    })
    .from(mealLogIngredients)
    .where(eq(mealLogIngredients.mealLogId, meal.id));

  const scaled = scaleMealByMultiplier(
    meal.totalKcal,
    meal.sugarGrams,
    existingIngs.map((i) => ({
      ingredientName: i.ingredientName,
      categorySlug: 'other',
      grams: i.grams,
      kcal: i.kcal,
    })),
    params.newMultiplier,
    meal.portionMultiplier
  );

  const [updatedMeal] = await db
    .update(mealLogs)
    .set({
      portionMultiplier: params.newMultiplier,
      totalKcal: scaled.totalKcal,
      sugarGrams: scaled.sugarGrams,
    })
    .where(eq(mealLogs.id, meal.id))
    .returning();

  for (let idx = 0; idx < existingIngs.length; idx++) {
    await db
      .update(mealLogIngredients)
      .set({
        grams: scaled.ingredients[idx].grams,
        kcal: scaled.ingredients[idx].kcal,
      })
      .where(eq(mealLogIngredients.id, existingIngs[idx].id));
  }

  return {
    meal: updatedMeal,
    ingredients: scaled.ingredients,
  };
}

export async function getRecentMealsWithIngredients(userId: string, limit = 30) {
  const db = getDb();
  const meals = await db
    .select()
    .from(mealLogs)
    .where(eq(mealLogs.userId, userId))
    .orderBy(desc(mealLogs.loggedAt))
    .limit(limit);

  if (meals.length === 0) return [];

  const result = [];
  for (const meal of meals) {
    const ings =
      meal.entryType === 'MAIN_DISH'
        ? await db
            .select({
              id: mealLogIngredients.id,
              ingredientName: mealLogIngredients.ingredientName,
              grams: mealLogIngredients.grams,
              kcal: mealLogIngredients.kcal,
              categoryName: ingredientCategories.nameTh,
              categoryColor: ingredientCategories.colorHex,
            })
            .from(mealLogIngredients)
            .innerJoin(
              ingredientCategories,
              eq(mealLogIngredients.categoryId, ingredientCategories.id)
            )
            .where(eq(mealLogIngredients.mealLogId, meal.id))
        : [];

    result.push({ ...meal, ingredients: ings });
  }
  return result;
}
