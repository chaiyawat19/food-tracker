import { eq } from 'drizzle-orm';
import {
  getDb,
  ingredientCategories,
  ingredients,
  presetDishes,
  presetDishIngredients,
} from './index';

const CATEGORIES = [
  { slug: 'pork', nameTh: 'หมู', colorHex: '#f43f5e', sortOrder: 1 },
  { slug: 'chicken', nameTh: 'ไก่', colorHex: '#f59e0b', sortOrder: 2 },
  { slug: 'beef', nameTh: 'เนื้อวัว', colorHex: '#991b1b', sortOrder: 3 },
  { slug: 'seafood', nameTh: 'ทะเล', colorHex: '#0ea5e9', sortOrder: 4 },
  { slug: 'egg', nameTh: 'ไข่', colorHex: '#eab308', sortOrder: 5 },
  { slug: 'veg', nameTh: 'ผัก', colorHex: '#22c55e', sortOrder: 6 },
  { slug: 'carb', nameTh: 'ข้าว/เส้น', colorHex: '#a855f7', sortOrder: 7 },
  { slug: 'other', nameTh: 'อื่นๆ', colorHex: '#64748b', sortOrder: 8 },
] as const;

const INGREDIENTS: Array<{ categorySlug: string; nameTh: string; kcalPer100g: number }> = [
  // หมู
  { categorySlug: 'pork', nameTh: 'หมูสับ', kcalPer100g: 240 },
  { categorySlug: 'pork', nameTh: 'หมูชิ้น', kcalPer100g: 195 },
  { categorySlug: 'pork', nameTh: 'หมูกรอบ', kcalPer100g: 420 },
  { categorySlug: 'pork', nameTh: 'หมูแดง', kcalPer100g: 215 },
  { categorySlug: 'pork', nameTh: 'หมูยอ', kcalPer100g: 230 },
  // ไก่
  { categorySlug: 'chicken', nameTh: 'ไก่', kcalPer100g: 165 },
  { categorySlug: 'chicken', nameTh: 'อกไก่', kcalPer100g: 120 },
  { categorySlug: 'chicken', nameTh: 'ไก่ต้ม', kcalPer100g: 165 },
  { categorySlug: 'chicken', nameTh: 'ไก่ทอด', kcalPer100g: 280 },
  // เนื้อวัว
  { categorySlug: 'beef', nameTh: 'เนื้อวัว', kcalPer100g: 210 },
  { categorySlug: 'beef', nameTh: 'เนื้อตุ๋น', kcalPer100g: 230 },
  // ทะเล
  { categorySlug: 'seafood', nameTh: 'กุ้ง', kcalPer100g: 99 },
  { categorySlug: 'seafood', nameTh: 'ปลาหมึก', kcalPer100g: 92 },
  { categorySlug: 'seafood', nameTh: 'เนื้อปลา', kcalPer100g: 115 },
  { categorySlug: 'seafood', nameTh: 'ปู', kcalPer100g: 97 },
  // ไข่
  { categorySlug: 'egg', nameTh: 'ไข่ดาว', kcalPer100g: 210 },
  { categorySlug: 'egg', nameTh: 'ไข่เจียว', kcalPer100g: 250 },
  { categorySlug: 'egg', nameTh: 'ไข่ต้ม', kcalPer100g: 155 },
  { categorySlug: 'egg', nameTh: 'ไข่เยี่ยวม้า', kcalPer100g: 170 },
  // ผัก
  { categorySlug: 'veg', nameTh: 'ใบกะเพรา', kcalPer100g: 30 },
  { categorySlug: 'veg', nameTh: 'คะน้า', kcalPer100g: 26 },
  { categorySlug: 'veg', nameTh: 'ผักบุ้ง', kcalPer100g: 20 },
  { categorySlug: 'veg', nameTh: 'ถั่วงอก', kcalPer100g: 30 },
  { categorySlug: 'veg', nameTh: 'มะละกอ', kcalPer100g: 43 },
  { categorySlug: 'veg', nameTh: 'มะเขือเทศ', kcalPer100g: 18 },
  { categorySlug: 'veg', nameTh: 'เห็ด', kcalPer100g: 28 },
  { categorySlug: 'veg', nameTh: 'แตงกวา', kcalPer100g: 15 },
  // ข้าว/เส้น
  { categorySlug: 'carb', nameTh: 'ข้าวสวย', kcalPer100g: 130 },
  { categorySlug: 'carb', nameTh: 'ข้าวมัน', kcalPer100g: 180 },
  { categorySlug: 'carb', nameTh: 'ข้าวเหนียว', kcalPer100g: 170 },
  { categorySlug: 'carb', nameTh: 'เส้นเล็ก', kcalPer100g: 150 },
  { categorySlug: 'carb', nameTh: 'เส้นใหญ่', kcalPer100g: 160 },
  { categorySlug: 'carb', nameTh: 'บะหมี่', kcalPer100g: 175 },
  { categorySlug: 'carb', nameTh: 'วุ้นเส้น', kcalPer100g: 110 },
  // อื่นๆ
  { categorySlug: 'other', nameTh: 'เต้าหู้', kcalPer100g: 80 },
  { categorySlug: 'other', nameTh: 'ลูกชิ้นหมู', kcalPer100g: 190 },
];

const PRESET_DISHES: Array<{
  nameTh: string;
  aliases: string;
  baseCookingKcal: number;
  items: Array<{ ingredientName: string; grams: number }>;
}> = [
  {
    nameTh: 'กะเพราไก่',
    aliases: 'ผัดกะเพราไก่,ข้าวกระเพราไก่,ข้าวกะเพราไก่,กระเพราไก่',
    baseCookingKcal: 80,
    items: [
      { ingredientName: 'ไก่', grams: 100 },
      { ingredientName: 'ใบกะเพรา', grams: 15 },
      { ingredientName: 'ข้าวสวย', grams: 150 },
    ],
  },
  {
    nameTh: 'กะเพราหมูสับ',
    aliases: 'ผัดกะเพราหมูสับ,ข้าวกระเพราหมูสับ,ข้าวกะเพราหมูสับ,กระเพราหมูสับ',
    baseCookingKcal: 85,
    items: [
      { ingredientName: 'หมูสับ', grams: 100 },
      { ingredientName: 'ใบกะเพรา', grams: 15 },
      { ingredientName: 'ข้าวสวย', grams: 150 },
    ],
  },
  {
    nameTh: 'กะเพราหมูกรอบ',
    aliases: 'ผัดกะเพราหมูกรอบ,ข้าวกะเพราหมูกรอบ,กระเพราหมูกรอบ',
    baseCookingKcal: 90,
    items: [
      { ingredientName: 'หมูกรอบ', grams: 100 },
      { ingredientName: 'ใบกะเพรา', grams: 15 },
      { ingredientName: 'ข้าวสวย', grams: 150 },
    ],
  },
  {
    nameTh: 'ข้าวผัดหมู',
    aliases: 'ข้าวผัดหมูชิ้น',
    baseCookingKcal: 110,
    items: [
      { ingredientName: 'หมูชิ้น', grams: 80 },
      { ingredientName: 'ไข่เจียว', grams: 40 },
      { ingredientName: 'คะน้า', grams: 30 },
      { ingredientName: 'ข้าวสวย', grams: 180 },
    ],
  },
  {
    nameTh: 'ข้าวผัดกุ้ง',
    aliases: 'ข้าวผัดทะเล',
    baseCookingKcal: 110,
    items: [
      { ingredientName: 'กุ้ง', grams: 80 },
      { ingredientName: 'ไข่เจียว', grams: 40 },
      { ingredientName: 'ข้าวสวย', grams: 180 },
    ],
  },
  {
    nameTh: 'ข้าวมันไก่',
    aliases: 'ข้าวมันไก่ต้ม',
    baseCookingKcal: 40,
    items: [
      { ingredientName: 'ไก่ต้ม', grams: 110 },
      { ingredientName: 'แตงกวา', grams: 25 },
      { ingredientName: 'ข้าวมัน', grams: 170 },
    ],
  },
  {
    nameTh: 'ข้าวมันไก่ทอด',
    aliases: 'ข้าวมันไก่กรอบ',
    baseCookingKcal: 50,
    items: [
      { ingredientName: 'ไก่ทอด', grams: 110 },
      { ingredientName: 'แตงกวา', grams: 25 },
      { ingredientName: 'ข้าวมัน', grams: 170 },
    ],
  },
  {
    nameTh: 'ผัดซีอิ๊วหมู',
    aliases: 'เส้นใหญ่ผัดซีอิ๊วหมู,ผัดซีอิ้วหมู',
    baseCookingKcal: 110,
    items: [
      { ingredientName: 'หมูชิ้น', grams: 80 },
      { ingredientName: 'คะน้า', grams: 60 },
      { ingredientName: 'ไข่เจียว', grams: 45 },
      { ingredientName: 'เส้นใหญ่', grams: 180 },
    ],
  },
  {
    nameTh: 'ผัดไทยกุ้งสด',
    aliases: 'ผัดไทกุ้งสด,ผัดไทยกุ้ง',
    baseCookingKcal: 120,
    items: [
      { ingredientName: 'กุ้ง', grams: 80 },
      { ingredientName: 'เต้าหู้', grams: 30 },
      { ingredientName: 'ถั่วงอก', grams: 50 },
      { ingredientName: 'ไข่เจียว', grams: 45 },
      { ingredientName: 'เส้นเล็ก', grams: 160 },
    ],
  },
  {
    nameTh: 'ก๋วยเตี๋ยวต้มยำหมู',
    aliases: 'ก๋วยเตี๋ยวต้มยำ,เส้นเล็กต้มยำหมู',
    baseCookingKcal: 50,
    items: [
      { ingredientName: 'หมูสับ', grams: 50 },
      { ingredientName: 'หมูชิ้น', grams: 40 },
      { ingredientName: 'ลูกชิ้นหมู', grams: 40 },
      { ingredientName: 'ถั่วงอก', grams: 40 },
      { ingredientName: 'เส้นเล็ก', grams: 140 },
    ],
  },
  {
    nameTh: 'บะหมี่หมูแดง',
    aliases: 'บะหมี่แห้งหมูแดง,บะหมี่น้ำหมูแดง',
    baseCookingKcal: 40,
    items: [
      { ingredientName: 'หมูแดง', grams: 80 },
      { ingredientName: 'คะน้า', grams: 40 },
      { ingredientName: 'บะหมี่', grams: 140 },
    ],
  },
  {
    nameTh: 'คะน้าหมูกรอบ',
    aliases: 'ผัดคะน้าหมูกรอบ,ข้าวคะน้าหมูกรอบ',
    baseCookingKcal: 90,
    items: [
      { ingredientName: 'หมูกรอบ', grams: 90 },
      { ingredientName: 'คะน้า', grams: 80 },
      { ingredientName: 'ข้าวสวย', grams: 150 },
    ],
  },
  {
    nameTh: 'ต้มยำกุ้ง',
    aliases: 'ต้มยำกุ้งน้ำข้น,ต้มยำกุ้งน้ำใส',
    baseCookingKcal: 70,
    items: [
      { ingredientName: 'กุ้ง', grams: 120 },
      { ingredientName: 'เห็ด', grams: 80 },
      { ingredientName: 'มะเขือเทศ', grams: 40 },
    ],
  },
  {
    nameTh: 'ส้มตำไทย',
    aliases: 'ส้มตำ',
    baseCookingKcal: 45,
    items: [
      { ingredientName: 'มะละกอ', grams: 150 },
      { ingredientName: 'มะเขือเทศ', grams: 50 },
      { ingredientName: 'กุ้ง', grams: 20 },
    ],
  },
  {
    nameTh: 'ข้าวไข่เจียวหมูสับ',
    aliases: 'ไข่เจียวหมูสับ',
    baseCookingKcal: 90,
    items: [
      { ingredientName: 'ไข่เจียว', grams: 100 },
      { ingredientName: 'หมูสับ', grams: 50 },
      { ingredientName: 'ข้าวสวย', grams: 150 },
    ],
  },
];

export async function seedDatabase() {
  const db = getDb();

  // 1. Upsert categories
  const categoryMap = new Map<string, number>();
  for (const cat of CATEGORIES) {
    const existing = await db
      .select()
      .from(ingredientCategories)
      .where(eq(ingredientCategories.slug, cat.slug));

    if (existing.length > 0) {
      categoryMap.set(cat.slug, existing[0].id);
    } else {
      const [inserted] = await db.insert(ingredientCategories).values(cat).returning();
      categoryMap.set(cat.slug, inserted.id);
    }
  }

  // 2. Upsert ingredients
  const ingredientMap = new Map<string, { id: number; kcalPer100g: number }>();
  for (const ing of INGREDIENTS) {
    const categoryId = categoryMap.get(ing.categorySlug);
    if (!categoryId) continue;

    const existing = await db
      .select()
      .from(ingredients)
      .where(eq(ingredients.nameTh, ing.nameTh));

    if (existing.length > 0) {
      ingredientMap.set(ing.nameTh, {
        id: existing[0].id,
        kcalPer100g: existing[0].kcalPer100g,
      });
    } else {
      const [inserted] = await db
        .insert(ingredients)
        .values({
          categoryId,
          nameTh: ing.nameTh,
          kcalPer100g: ing.kcalPer100g,
          isDefault: true,
        })
        .returning();
      ingredientMap.set(ing.nameTh, {
        id: inserted.id,
        kcalPer100g: inserted.kcalPer100g,
      });
    }
  }

  // 3. Upsert preset dishes & ingredients
  for (const dish of PRESET_DISHES) {
    const existing = await db
      .select()
      .from(presetDishes)
      .where(eq(presetDishes.nameTh, dish.nameTh));

    if (existing.length > 0) continue;

    const ingredientKcal = dish.items.reduce((sum, item) => {
      const info = ingredientMap.get(item.ingredientName);
      if (!info) return sum;
      return sum + (info.kcalPer100g * item.grams) / 100;
    }, 0);

    const defaultTotalKcal = Math.round(ingredientKcal + dish.baseCookingKcal);

    const [insertedDish] = await db
      .insert(presetDishes)
      .values({
        nameTh: dish.nameTh,
        aliases: dish.aliases,
        baseCookingKcal: dish.baseCookingKcal,
        defaultTotalKcal,
      })
      .returning();

    for (const item of dish.items) {
      const info = ingredientMap.get(item.ingredientName);
      if (!info) continue;
      await db.insert(presetDishIngredients).values({
        presetDishId: insertedDish.id,
        ingredientId: info.id,
        defaultGrams: item.grams,
      });
    }
  }

  console.log('Seeded Thai food categories, ingredients, and preset dishes successfully.');
}

if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Seed failed:', err);
      process.exit(1);
    });
}
