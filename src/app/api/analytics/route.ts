import { NextResponse } from 'next/server';
import { and, desc, eq, gte, sql } from 'drizzle-orm';
import {
  getDb,
  ingredientCategories,
  mealLogIngredients,
  mealLogs,
} from '@/db';
import { getOrCreateUser, verifyLiffRequest } from '@/lib/line/auth';
import {
  getStartOfToday,
  getStartOfWeek,
  getUserSweetQuotaStatus,
} from '@/lib/nutrition/meal-service';

export async function GET(req: Request) {
  const verified = await verifyLiffRequest(req);
  if (!verified) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await getOrCreateUser(verified.lineUserId, verified.displayName);
  const db = getDb();

  const todayStart = getStartOfToday();
  const weekStart = getStartOfWeek();

  // 1. Today's calories breakdown by entryType
  const todayByType = await db
    .select({
      entryType: mealLogs.entryType,
      totalKcal: sql<number>`coalesce(sum(${mealLogs.totalKcal}), 0)::float`,
      totalSugar: sql<number>`coalesce(sum(${mealLogs.sugarGrams}), 0)::float`,
      count: sql<number>`count(*)::int`,
    })
    .from(mealLogs)
    .where(and(eq(mealLogs.userId, user.id), gte(mealLogs.loggedAt, todayStart)))
    .groupBy(mealLogs.entryType);

  let todayMainKcal = 0;
  let todaySweetDrinkKcal = 0;
  let todaySnackKcal = 0;
  let todaySugarGrams = 0;

  for (const row of todayByType) {
    todaySugarGrams += row.totalSugar;
    if (row.entryType === 'MAIN_DISH') todayMainKcal = row.totalKcal;
    if (row.entryType === 'SWEET_DRINK') todaySweetDrinkKcal = row.totalKcal;
    if (row.entryType === 'SNACK') todaySnackKcal = row.totalKcal;
  }

  const todayTotalKcal = Math.round(todayMainKcal + todaySweetDrinkKcal + todaySnackKcal);

  // 2. Weekly ingredient category breakdown (e.g., หมู vs ไก่ vs ผัก)
  const categoryStats = await db
    .select({
      categoryId: ingredientCategories.id,
      slug: ingredientCategories.slug,
      nameTh: ingredientCategories.nameTh,
      colorHex: ingredientCategories.colorHex,
      totalGrams: sql<number>`coalesce(sum(${mealLogIngredients.grams}), 0)::float`,
      totalKcal: sql<number>`coalesce(sum(${mealLogIngredients.kcal}), 0)::float`,
      mealCount: sql<number>`count(distinct ${mealLogIngredients.mealLogId})::int`,
    })
    .from(mealLogIngredients)
    .innerJoin(mealLogs, eq(mealLogIngredients.mealLogId, mealLogs.id))
    .innerJoin(ingredientCategories, eq(mealLogIngredients.categoryId, ingredientCategories.id))
    .where(and(eq(mealLogs.userId, user.id), gte(mealLogs.loggedAt, weekStart)))
    .groupBy(
      ingredientCategories.id,
      ingredientCategories.slug,
      ingredientCategories.nameTh,
      ingredientCategories.colorHex
    )
    .orderBy(desc(sql`sum(${mealLogIngredients.grams})`));

  // 3. Top specific ingredients this week (e.g., หมูสับ, หมูกรอบ, อกไก่)
  const topIngredients = await db
    .select({
      ingredientName: mealLogIngredients.ingredientName,
      categoryName: ingredientCategories.nameTh,
      colorHex: ingredientCategories.colorHex,
      totalGrams: sql<number>`coalesce(sum(${mealLogIngredients.grams}), 0)::float`,
      count: sql<number>`count(*)::int`,
    })
    .from(mealLogIngredients)
    .innerJoin(mealLogs, eq(mealLogIngredients.mealLogId, mealLogs.id))
    .innerJoin(ingredientCategories, eq(mealLogIngredients.categoryId, ingredientCategories.id))
    .where(and(eq(mealLogs.userId, user.id), gte(mealLogs.loggedAt, weekStart)))
    .groupBy(
      mealLogIngredients.ingredientName,
      ingredientCategories.nameTh,
      ingredientCategories.colorHex
    )
    .orderBy(desc(sql`count(*)`))
    .limit(8);

  // 4. Top dishes overall (last 30 days)
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  const topDishes = await db
    .select({
      title: mealLogs.title,
      entryType: mealLogs.entryType,
      count: sql<number>`count(*)::int`,
      avgKcal: sql<number>`round(avg(${mealLogs.totalKcal}))::int`,
    })
    .from(mealLogs)
    .where(and(eq(mealLogs.userId, user.id), gte(mealLogs.loggedAt, thirtyDaysAgo)))
    .groupBy(mealLogs.title, mealLogs.entryType)
    .orderBy(desc(sql`count(*)`))
    .limit(6);

  // 5. Sweet drink & snack quota status
  const quota = await getUserSweetQuotaStatus(user.id);

  // 6. Weekly sugar total
  const [weeklySugarRow] = await db
    .select({
      totalSugar: sql<number>`coalesce(sum(${mealLogs.sugarGrams}), 0)::float`,
    })
    .from(mealLogs)
    .where(and(eq(mealLogs.userId, user.id), gte(mealLogs.loggedAt, weekStart)));

  return NextResponse.json({
    user: {
      displayName: user.displayName,
      dailyCalorieGoal: user.dailyCalorieGoal,
      weeklySweetDrinkQuota: user.weeklySweetDrinkQuota,
      dailySweetSnackKcalQuota: user.dailySweetSnackKcalQuota,
    },
    today: {
      totalKcal: todayTotalKcal,
      mainDishKcal: Math.round(todayMainKcal),
      sweetDrinkKcal: Math.round(todaySweetDrinkKcal),
      snackKcal: Math.round(todaySnackKcal),
      sugarGrams: Math.round(todaySugarGrams * 10) / 10,
    },
    weekly: {
      sugarGrams: Math.round((weeklySugarRow?.totalSugar ?? 0) * 10) / 10,
      categoryStats,
      topIngredients,
    },
    topDishes,
    quota,
  });
}
