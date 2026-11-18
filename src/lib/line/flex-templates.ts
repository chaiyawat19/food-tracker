import type { QuotaStatus } from '@/lib/nutrition/calculator';

export function buildMainDishFlexMessage(params: {
  mealId: string;
  title: string;
  totalKcal: number;
  portionMultiplier: number;
  ingredients: Array<{ ingredientName: string; grams: number; kcal: number }>;
  liffUrl?: string;
}) {
  const ingredientRows = params.ingredients.slice(0, 6).map((ing) => ({
    type: 'box',
    layout: 'horizontal',
    contents: [
      {
        type: 'text',
        text: `• ${ing.ingredientName}`,
        size: 'sm',
        color: '#334155',
        flex: 3,
      },
      {
        type: 'text',
        text: `${Math.round(ing.grams)}g (${Math.round(ing.kcal)} kcal)`,
        size: 'sm',
        color: '#64748b',
        align: 'end',
        flex: 2,
      },
    ],
  }));

  return {
    type: 'flex',
    altText: `บันทึกแล้ว: ${params.title} (${Math.round(params.totalKcal)} kcal)`,
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
          {
            type: 'text',
            text: '🍽️ บันทึกอาหารหลักแล้ว',
            weight: 'bold',
            size: 'xs',
            color: '#10b981',
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              {
                type: 'text',
                text: `${params.title} (${params.portionMultiplier}x)`,
                weight: 'bold',
                size: 'lg',
                wrap: true,
                flex: 3,
              },
              {
                type: 'text',
                text: `${Math.round(params.totalKcal)} kcal`,
                weight: 'bold',
                size: 'lg',
                color: '#ea580c',
                align: 'end',
                flex: 2,
              },
            ],
          },
          { type: 'separator' },
          {
            type: 'box',
            layout: 'vertical',
            spacing: 'xs',
            contents: ingredientRows,
          },
        ],
      },
      footer: {
        type: 'box',
        layout: 'horizontal',
        spacing: 'sm',
        contents: [
          {
            type: 'button',
            style: 'secondary',
            height: 'sm',
            action: {
              type: 'postback',
              label: 'น้อย 0.5x',
              data: `action=adjust_portion&mealId=${params.mealId}&multiplier=0.5`,
            },
          },
          {
            type: 'button',
            style: 'secondary',
            height: 'sm',
            action: {
              type: 'postback',
              label: 'พิเศษ 1.5x',
              data: `action=adjust_portion&mealId=${params.mealId}&multiplier=1.5`,
            },
          },
          ...(params.liffUrl
            ? [
                {
                  type: 'button',
                  style: 'primary',
                  color: '#10b981',
                  height: 'sm',
                  action: {
                    type: 'uri',
                    label: 'ดูสถิติ',
                    uri: params.liffUrl,
                  },
                },
              ]
            : []),
        ],
      },
    },
  };
}

export function buildSweetSnackFlexMessage(params: {
  entryType: 'SWEET_DRINK' | 'SNACK';
  title: string;
  totalKcal: number;
  sugarGrams: number;
  sweetnessLevel?: number | null;
  toppings?: string[];
  quota: QuotaStatus;
  liffUrl?: string;
}) {
  const isDrink = params.entryType === 'SWEET_DRINK';
  const badgeText = isDrink ? '🧋 บันทึกน้ำหวานแล้ว' : '🍩 บันทึกขนมแล้ว';
  const quotaAlertColor = params.quota.isDrinkQuotaExceeded
    ? '#ef4444'
    : params.quota.isDrinkQuotaReached
      ? '#f59e0b'
      : '#0ea5e9';

  const detailParts: string[] = [];
  if (isDrink && params.sweetnessLevel !== null && params.sweetnessLevel !== undefined) {
    detailParts.push(`หวาน ${params.sweetnessLevel}%`);
  }
  if (params.toppings && params.toppings.length > 0) {
    detailParts.push(`+${params.toppings.join(', ')}`);
  }

  return {
    type: 'flex',
    altText: `บันทึกแล้ว: ${params.title} (${Math.round(params.totalKcal)} kcal | น้ำตาล ${params.sugarGrams}g)`,
    contents: {
      type: 'bubble',
      body: {
        type: 'box',
        layout: 'vertical',
        spacing: 'md',
        contents: [
          {
            type: 'text',
            text: badgeText,
            weight: 'bold',
            size: 'xs',
            color: '#ec4899',
          },
          {
            type: 'box',
            layout: 'horizontal',
            contents: [
              {
                type: 'text',
                text: params.title,
                weight: 'bold',
                size: 'lg',
                wrap: true,
                flex: 3,
              },
              {
                type: 'text',
                text: `${Math.round(params.totalKcal)} kcal`,
                weight: 'bold',
                size: 'lg',
                color: '#ec4899',
                align: 'end',
                flex: 2,
              },
            ],
          },
          {
            type: 'text',
            text: `น้ำตาล ~${params.sugarGrams}g${detailParts.length ? ` • ${detailParts.join(' • ')}` : ''}`,
            size: 'sm',
            color: '#64748b',
            wrap: true,
          },
          { type: 'separator' },
          {
            type: 'box',
            layout: 'vertical',
            spacing: 'xs',
            contents: [
              {
                type: 'text',
                text: `โควต้าน้ำหวานสัปดาห์นี้: ${params.quota.weeklySweetDrinkCount} / ${params.quota.weeklySweetDrinkQuota} แก้ว ${
                  params.quota.isDrinkQuotaExceeded
                    ? '🚨 เกินโควต้า!'
                    : params.quota.isDrinkQuotaReached
                      ? '⚠️ ครบโควต้าแล้ว'
                      : '✅'
                }`,
                size: 'sm',
                weight: 'bold',
                color: quotaAlertColor,
                wrap: true,
              },
              {
                type: 'text',
                text: `แคลอรี่สายหวานวันนี้: ${params.quota.dailySweetSnackKcal} / ${params.quota.dailySweetSnackKcalQuota} kcal`,
                size: 'xs',
                color: params.quota.isSweetSnackKcalExceeded ? '#ef4444' : '#64748b',
              },
            ],
          },
        ],
      },
      ...(params.liffUrl
        ? {
            footer: {
              type: 'box',
              layout: 'horizontal',
              contents: [
                {
                  type: 'button',
                  style: 'primary',
                  color: '#ec4899',
                  height: 'sm',
                  action: {
                    type: 'uri',
                    label: 'ดูกราฟสายหวาน',
                    uri: params.liffUrl,
                  },
                },
              ],
            },
          }
        : {}),
    },
  };
}
