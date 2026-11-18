import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb, favoriteItems } from '@/db';
import { parseFoodInputWithAI, ParsedFoodSchema } from '@/lib/ai/parser';
import { getOrCreateUser } from '@/lib/line/auth';
import { replyLineMessage, verifyLineSignature } from '@/lib/line/client';
import {
  buildMainDishFlexMessage,
  buildSweetSnackFlexMessage,
} from '@/lib/line/flex-templates';
import {
  adjustMealPortion,
  createMealLogFromParsed,
  findPresetDishByText,
  getUserSweetQuotaStatus,
} from '@/lib/nutrition/meal-service';

interface LineWebhookEvent {
  type: string;
  replyToken?: string;
  source?: { userId?: string };
  message?: { type: string; text?: string };
  postback?: { data?: string };
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get('x-line-signature');

  if (!verifyLineSignature(rawBody, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const payload = JSON.parse(rawBody) as { events?: LineWebhookEvent[] };
  const events = payload.events ?? [];

  // LINE Console "Verify" button sends empty events array
  if (events.length === 0) {
    return NextResponse.json({ ok: true });
  }

  const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
  const liffUrl = liffId ? `https://liff.line.me/${liffId}` : undefined;

  for (const event of events) {
    const lineUserId = event.source?.userId;
    const replyToken = event.replyToken;
    if (!lineUserId || !replyToken) continue;

    const user = await getOrCreateUser(lineUserId);

    try {
      if (event.type === 'message' && event.message?.type === 'text' && event.message.text) {
        const text = event.message.text.trim();

        // Command: Check sweet drink quota
        if (text === 'เช็กโควต้าน้ำหวาน') {
          const quota = await getUserSweetQuotaStatus(user.id);
          await replyLineMessage(replyToken, [
            {
              type: 'text',
              text:
                `🧋 โควต้าน้ำหวานสัปดาห์นี้: ${quota.weeklySweetDrinkCount} / ${quota.weeklySweetDrinkQuota} แก้ว\n` +
                `🍩 แคลอรี่สายหวานวันนี้: ${quota.dailySweetSnackKcal} / ${quota.dailySweetSnackKcalQuota} kcal`,
            },
          ]);
          continue;
        }

        // Command: Show Quick Favorites
        if (text === 'เมนูโปรด') {
          const db = getDb();
          const favs = await db
            .select()
            .from(favoriteItems)
            .where(eq(favoriteItems.userId, user.id))
            .limit(8);

          if (favs.length === 0) {
            await replyLineMessage(replyToken, [
              {
                type: 'text',
                text: 'ยังไม่มีเมนูโปรดครับ สามารถเพิ่มได้ที่หน้า Dashboard (LIFF) หรือพิมพ์ชื่ออาหารส่งมาได้เลย!',
              },
            ]);
          } else {
            await replyLineMessage(replyToken, [
              {
                type: 'text',
                text: '⭐ แตะเลือกเมนูโปรดเพื่อบันทึกทันที:',
                quickReply: {
                  items: favs.map((f) => ({
                    type: 'action',
                    action: {
                      type: 'postback',
                      label: f.title.slice(0, 20),
                      data: `action=quick_log&favId=${f.id}`,
                    },
                  })),
                },
              },
            ]);
          }
          continue;
        }

        // Food / Sweet Drink / Snack Logging
        const preset = await findPresetDishByText(text);
        const parsed = preset ?? (await parseFoodInputWithAI(text));
        const saved = await createMealLogFromParsed({
          userId: user.id,
          parsed,
          rawInput: text,
        });

        if (saved.meal.entryType === 'MAIN_DISH') {
          await replyLineMessage(replyToken, [
            buildMainDishFlexMessage({
              mealId: saved.meal.id,
              title: saved.meal.title,
              totalKcal: saved.meal.totalKcal,
              portionMultiplier: saved.meal.portionMultiplier,
              ingredients: saved.ingredients,
              liffUrl,
            }),
          ]);
        } else {
          await replyLineMessage(replyToken, [
            buildSweetSnackFlexMessage({
              entryType: saved.meal.entryType,
              title: saved.meal.title,
              totalKcal: saved.meal.totalKcal,
              sugarGrams: saved.meal.sugarGrams,
              sweetnessLevel: saved.meal.sweetnessLevel,
              toppings: saved.meal.toppings ?? [],
              quota: saved.quota,
              liffUrl,
            }),
          ]);
        }
      } else if (event.type === 'postback' && event.postback?.data) {
        const params = new URLSearchParams(event.postback.data);
        const action = params.get('action');

        if (action === 'adjust_portion') {
          const mealId = params.get('mealId');
          const multiplier = Number(params.get('multiplier'));
          if (mealId && multiplier > 0) {
            const updated = await adjustMealPortion({
              mealId,
              userId: user.id,
              newMultiplier: multiplier,
            });
            if (updated) {
              await replyLineMessage(replyToken, [
                buildMainDishFlexMessage({
                  mealId: updated.meal.id,
                  title: updated.meal.title,
                  totalKcal: updated.meal.totalKcal,
                  portionMultiplier: updated.meal.portionMultiplier,
                  ingredients: updated.ingredients,
                  liffUrl,
                }),
              ]);
            }
          }
        } else if (action === 'quick_log') {
          const favId = params.get('favId');
          if (favId) {
            const db = getDb();
            const [fav] = await db
              .select()
              .from(favoriteItems)
              .where(eq(favoriteItems.id, favId));

            if (fav && fav.userId === user.id) {
              const parsed = ParsedFoodSchema.parse(fav.payload);
              const saved = await createMealLogFromParsed({
                userId: user.id,
                parsed,
                rawInput: fav.title,
              });

              if (saved.meal.entryType === 'MAIN_DISH') {
                await replyLineMessage(replyToken, [
                  buildMainDishFlexMessage({
                    mealId: saved.meal.id,
                    title: saved.meal.title,
                    totalKcal: saved.meal.totalKcal,
                    portionMultiplier: saved.meal.portionMultiplier,
                    ingredients: saved.ingredients,
                    liffUrl,
                  }),
                ]);
              } else {
                await replyLineMessage(replyToken, [
                  buildSweetSnackFlexMessage({
                    entryType: saved.meal.entryType,
                    title: saved.meal.title,
                    totalKcal: saved.meal.totalKcal,
                    sugarGrams: saved.meal.sugarGrams,
                    sweetnessLevel: saved.meal.sweetnessLevel,
                    toppings: saved.meal.toppings ?? [],
                    quota: saved.quota,
                    liffUrl,
                  }),
                ]);
              }
            }
          }
        }
      }
    } catch (err) {
      console.error('Webhook event error:', err);
      await replyLineMessage(replyToken, [
        {
          type: 'text',
          text: 'ขออภัยครับ ระบบไม่สามารถวิเคราะห์รายการนี้ได้ ลองพิมพ์ชื่อเมนูใหม่อีกครั้งนะครับ (เช่น "กะเพราไก่ ไข่ดาว" หรือ "ชาไทยหวานน้อย")',
        },
      ]);
    }
  }

  return NextResponse.json({ ok: true });
}
