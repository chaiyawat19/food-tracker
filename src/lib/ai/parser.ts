import { GoogleGenAI, Type } from '@google/genai';
import { z } from 'zod';

export const CategorySlugSchema = z.enum([
  'pork',
  'chicken',
  'beef',
  'seafood',
  'egg',
  'veg',
  'carb',
  'other',
]);

export const ParsedIngredientSchema = z.object({
  ingredientName: z.string().min(1),
  categorySlug: CategorySlugSchema,
  grams: z.number().nonnegative(),
  kcal: z.number().nonnegative(),
});

export const ParsedFoodSchema = z.discriminatedUnion('entryType', [
  z.object({
    entryType: z.literal('MAIN_DISH'),
    title: z.string().min(1),
    portionMultiplier: z.number().positive().default(1),
    cookingKcal: z.number().nonnegative().default(80),
    totalKcal: z.number().nonnegative(),
    ingredients: z.array(ParsedIngredientSchema).min(1),
  }),
  z.object({
    entryType: z.literal('SWEET_DRINK'),
    title: z.string().min(1),
    portionMultiplier: z.number().positive().default(1),
    sweetnessLevel: z.number().min(0).max(100).default(100),
    toppings: z.array(z.string()).default([]),
    sugarGrams: z.number().nonnegative(),
    totalKcal: z.number().nonnegative(),
  }),
  z.object({
    entryType: z.literal('SNACK'),
    title: z.string().min(1),
    portionMultiplier: z.number().positive().default(1),
    snackCategory: z.string().default('ขนมทั่วไป'),
    sugarGrams: z.number().nonnegative(),
    totalKcal: z.number().nonnegative(),
  }),
]);

export type ParsedFood = z.infer<typeof ParsedFoodSchema>;

const SYSTEM_INSTRUCTION = `คุณคือผู้เชี่ยวชาญด้านโภชนาการอาหารไทย น้ำหวาน และขนมในประเทศไทย
หน้าที่ของคุณคือแปลงข้อความบันทึกการกินภาษาไทยเป็น JSON ตามโครงสร้างที่กำหนด:

1. จำแนกประเภท (entryType):
- "MAIN_DISH": อาหารคาว/อาหารจานเดียว/กับข้าว/ก๋วยเตี๋ยว/ส้มตำ
- "SWEET_DRINK": น้ำหวาน ชานม ชาไทย กาแฟเย็น โกโก้ น้ำอัดลม น้ำผลไม้ปั่น
- "SNACK": ขนมถุง เบเกอรี่ เค้ก ขนมปัง ขนมไทย ไอศกรีม ของหวาน

2. กฎสำคัญสำหรับ "MAIN_DISH":
- แยกเฉพาะ "ส่วนประกอบหลัก" เท่านั้น **ห้ามใส่เครื่องปรุง** (ไม่เอาน้ำปลา น้ำตาล ซอส น้ำมัน พริก กระเทียม)
- ใส่หมวดหมู่ (categorySlug) ให้ถูกต้อง: pork (หมู), chicken (ไก่), beef (เนื้อวัว), seafood (ทะเล), egg (ไข่), veg (ผัก), carb (ข้าว/เส้น), other (อื่นๆ)
- ประมาณน้ำหนักเป็นกรัม (grams) และแคลอรี่ (kcal) ของแต่ละส่วนประกอบตามจานมาตรฐานไทย
- ระบุ cookingKcal (แคลอรี่แฝงจากน้ำมัน/ซอสในการปรุง เช่น ผัด ~80, ต้ม ~30) และ totalKcal = ผลรวม kcal ส่วนประกอบ + cookingKcal
- ถ้าผู้ใช้พิมพ์ว่า "พิเศษ" ให้ portionMultiplier = 1.5, ถ้า "น้อย" ให้ 0.5, ปกติ = 1

3. กฎสำคัญสำหรับ "SWEET_DRINK":
- แปลงคำบอกความหวาน: "ไม่หวาน/0%" -> 0, "หวานน้อย" -> 25 หรือ 50, "หวานปกติ" -> 100
- แยก toppings เช่น ["ไข่มุก", "วิปครีม"]
- ประเมิน sugarGrams และ totalKcal ตามขนาดแก้วปกติในไทย (16-22 oz)`;

export async function parseFoodInputWithAI(rawText: string): Promise<ParsedFood> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not configured');
  }

  const ai = new GoogleGenAI({ apiKey });

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: `แปลงรายการอาหารนี้: "${rawText}"`,
    config: {
      systemInstruction: SYSTEM_INSTRUCTION,
      responseMimeType: 'application/json',
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          entryType: {
            type: Type.STRING,
            enum: ['MAIN_DISH', 'SWEET_DRINK', 'SNACK'],
          },
          title: { type: Type.STRING },
          portionMultiplier: { type: Type.NUMBER },
          cookingKcal: { type: Type.NUMBER },
          totalKcal: { type: Type.NUMBER },
          sugarGrams: { type: Type.NUMBER },
          sweetnessLevel: { type: Type.NUMBER },
          toppings: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
          },
          snackCategory: { type: Type.STRING },
          ingredients: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                ingredientName: { type: Type.STRING },
                categorySlug: {
                  type: Type.STRING,
                  enum: ['pork', 'chicken', 'beef', 'seafood', 'egg', 'veg', 'carb', 'other'],
                },
                grams: { type: Type.NUMBER },
                kcal: { type: Type.NUMBER },
              },
              required: ['ingredientName', 'categorySlug', 'grams', 'kcal'],
            },
          },
        },
        required: ['entryType', 'title', 'totalKcal'],
      },
    },
  });

  const text = response.text;
  if (!text) {
    throw new Error('Empty response from Gemini API');
  }

  const parsedJson = JSON.parse(text);
  return ParsedFoodSchema.parse(parsedJson);
}
