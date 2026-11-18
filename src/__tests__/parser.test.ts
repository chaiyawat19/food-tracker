import { describe, expect, it } from 'vitest';
import { ParsedFoodSchema } from '@/lib/ai/parser';

describe('ParsedFoodSchema', () => {
  it('validates a MAIN_DISH payload without seasonings', () => {
    const parsed = ParsedFoodSchema.parse({
      entryType: 'MAIN_DISH',
      title: 'กะเพราไก่',
      portionMultiplier: 1,
      cookingKcal: 80,
      totalKcal: 445,
      ingredients: [
        { ingredientName: 'ไก่', categorySlug: 'chicken', grams: 100, kcal: 165 },
        { ingredientName: 'ใบกะเพรา', categorySlug: 'veg', grams: 15, kcal: 5 },
        { ingredientName: 'ข้าวสวย', categorySlug: 'carb', grams: 150, kcal: 195 },
      ],
    });
    expect(parsed.entryType).toBe('MAIN_DISH');
    if (parsed.entryType === 'MAIN_DISH') {
      expect(parsed.ingredients).toHaveLength(3);
    }
  });

  it('validates a SWEET_DRINK payload with sweetness level and toppings', () => {
    const parsed = ParsedFoodSchema.parse({
      entryType: 'SWEET_DRINK',
      title: 'ชาไทย',
      sweetnessLevel: 50,
      toppings: ['ไข่มุก'],
      sugarGrams: 28,
      totalKcal: 320,
    });
    expect(parsed.entryType).toBe('SWEET_DRINK');
    if (parsed.entryType === 'SWEET_DRINK') {
      expect(parsed.sweetnessLevel).toBe(50);
      expect(parsed.toppings).toContain('ไข่มุก');
    }
  });
});
