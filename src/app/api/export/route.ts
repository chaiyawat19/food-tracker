import { NextResponse } from 'next/server';
import { getOrCreateUser, verifyLiffRequest } from '@/lib/line/auth';
import { getRecentMealsWithIngredients } from '@/lib/nutrition/meal-service';

function escapeCsv(value: string | number | null | undefined): string {
  const str = value === null || value === undefined ? '' : String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export async function GET(req: Request) {
  const verified = await verifyLiffRequest(req);
  if (!verified) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const user = await getOrCreateUser(verified.lineUserId, verified.displayName);
  const url = new URL(req.url);
  const format = url.searchParams.get('format') || 'csv';

  const meals = await getRecentMealsWithIngredients(user.id, 1000);

  if (format === 'json') {
    return new NextResponse(JSON.stringify(meals, null, 2), {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': 'attachment; filename="food-tracker-export.json"',
      },
    });
  }

  const header = [
    'logged_at',
    'entry_type',
    'title',
    'portion_multiplier',
    'total_kcal',
    'sugar_grams',
    'sweetness_level',
    'toppings',
    'ingredients',
  ].join(',');

  const rows = meals.map((m) => {
    const ingStr = m.ingredients
      .map((i) => `${i.ingredientName}(${i.categoryName}:${Math.round(i.grams)}g)`)
      .join('; ');
    const toppingsStr = (m.toppings ?? []).join('; ');

    return [
      escapeCsv(new Date(m.loggedAt).toISOString()),
      escapeCsv(m.entryType),
      escapeCsv(m.title),
      escapeCsv(m.portionMultiplier),
      escapeCsv(Math.round(m.totalKcal)),
      escapeCsv(m.sugarGrams),
      escapeCsv(m.sweetnessLevel ?? ''),
      escapeCsv(toppingsStr),
      escapeCsv(ingStr),
    ].join(',');
  });

  // Add UTF-8 BOM so Thai characters open cleanly in Excel
  const csvContent = '\uFEFF' + [header, ...rows].join('\n');

  return new NextResponse(csvContent, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="food-tracker-export.csv"',
    },
  });
}
