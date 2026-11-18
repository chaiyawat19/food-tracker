import { describe, expect, it } from 'vitest';
import { evaluateSweetQuota, scaleMealByMultiplier } from '@/lib/nutrition/calculator';

describe('scaleMealByMultiplier', () => {
  it('scales calories, sugar, and ingredient grams from 1x to 1.5x', () => {
    const result = scaleMealByMultiplier(
      440,
      0,
      [
        { ingredientName: 'ไก่', categorySlug: 'chicken', grams: 100, kcal: 165 },
        { ingredientName: 'ข้าวสวย', categorySlug: 'carb', grams: 150, kcal: 195 },
      ],
      1.5,
      1.0
    );

    expect(result.totalKcal).toBe(660);
    expect(result.ingredients[0].grams).toBe(150);
    expect(result.ingredients[0].kcal).toBe(248);
    expect(result.ingredients[1].grams).toBe(225);
  });

  it('scales down from 1.5x back to 0.5x accurately', () => {
    const result = scaleMealByMultiplier(
      660,
      15,
      [{ ingredientName: 'หมูสับ', categorySlug: 'pork', grams: 150, kcal: 360 }],
      0.5,
      1.5
    );

    expect(result.totalKcal).toBe(220);
    expect(result.sugarGrams).toBe(5);
    expect(result.ingredients[0].grams).toBe(50);
    expect(result.ingredients[0].kcal).toBe(120);
  });
});

describe('evaluateSweetQuota', () => {
  it('flags reached and exceeded sweet drink quotas accurately', () => {
    const under = evaluateSweetQuota({
      weeklySweetDrinkCount: 2,
      weeklySweetDrinkQuota: 3,
      dailySweetSnackKcal: 200,
      dailySweetSnackKcalQuota: 300,
    });
    expect(under.isDrinkQuotaReached).toBe(false);
    expect(under.isDrinkQuotaExceeded).toBe(false);
    expect(under.isSweetSnackKcalExceeded).toBe(false);

    const exceeded = evaluateSweetQuota({
      weeklySweetDrinkCount: 4,
      weeklySweetDrinkQuota: 3,
      dailySweetSnackKcal: 450,
      dailySweetSnackKcalQuota: 300,
    });
    expect(exceeded.isDrinkQuotaReached).toBe(true);
    expect(exceeded.isDrinkQuotaExceeded).toBe(true);
    expect(exceeded.isSweetSnackKcalExceeded).toBe(true);
  });
});
