export interface IngredientInput {
  ingredientName: string;
  categorySlug: string;
  grams: number;
  kcal: number;
}

export interface ScaledMealResult {
  totalKcal: number;
  sugarGrams: number;
  ingredients: IngredientInput[];
}

export function scaleMealByMultiplier(
  baseTotalKcal: number,
  baseSugarGrams: number,
  baseIngredients: IngredientInput[],
  newMultiplier: number,
  previousMultiplier = 1.0
): ScaledMealResult {
  const ratio = previousMultiplier > 0 ? newMultiplier / previousMultiplier : newMultiplier;

  return {
    totalKcal: Math.round(baseTotalKcal * ratio),
    sugarGrams: Math.round(baseSugarGrams * ratio * 10) / 10,
    ingredients: baseIngredients.map((ing) => ({
      ...ing,
      grams: Math.round(ing.grams * ratio),
      kcal: Math.round(ing.kcal * ratio),
    })),
  };
}

export interface QuotaStatus {
  weeklySweetDrinkCount: number;
  weeklySweetDrinkQuota: number;
  isDrinkQuotaExceeded: boolean;
  isDrinkQuotaReached: boolean;
  dailySweetSnackKcal: number;
  dailySweetSnackKcalQuota: number;
  isSweetSnackKcalExceeded: boolean;
}

export function evaluateSweetQuota(params: {
  weeklySweetDrinkCount: number;
  weeklySweetDrinkQuota: number;
  dailySweetSnackKcal: number;
  dailySweetSnackKcalQuota: number;
}): QuotaStatus {
  return {
    weeklySweetDrinkCount: params.weeklySweetDrinkCount,
    weeklySweetDrinkQuota: params.weeklySweetDrinkQuota,
    isDrinkQuotaExceeded: params.weeklySweetDrinkCount > params.weeklySweetDrinkQuota,
    isDrinkQuotaReached: params.weeklySweetDrinkCount >= params.weeklySweetDrinkQuota,
    dailySweetSnackKcal: Math.round(params.dailySweetSnackKcal),
    dailySweetSnackKcalQuota: params.dailySweetSnackKcalQuota,
    isSweetSnackKcalExceeded: params.dailySweetSnackKcal > params.dailySweetSnackKcalQuota,
  };
}
