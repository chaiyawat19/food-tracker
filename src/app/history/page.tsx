'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useLiff } from '@/components/LiffProvider';

interface MealItem {
  id: string;
  entryType: 'MAIN_DISH' | 'SWEET_DRINK' | 'SNACK';
  title: string;
  portionMultiplier: number;
  totalKcal: number;
  sugarGrams: number;
  sweetnessLevel: number | null;
  toppings: string[] | null;
  loggedAt: string;
  ingredients: Array<{
    id: string;
    ingredientName: string;
    grams: number;
    kcal: number;
    categoryName: string;
    categoryColor: string;
  }>;
}

const FILTER_TABS = [
  { key: 'ALL', label: 'ทั้งหมด' },
  { key: 'MAIN_DISH', label: 'อาหารหลัก' },
  { key: 'SWEET_DRINK', label: 'น้ำหวาน' },
  { key: 'SNACK', label: 'ขนม' },
] as const;

export default function HistoryPage() {
  const { ready, authFetch } = useLiff();
  const [meals, setMeals] = useState<MealItem[]>([]);
  const [filter, setFilter] = useState<(typeof FILTER_TABS)[number]['key']>('ALL');
  const [loading, setLoading] = useState(true);

  const loadMeals = useCallback(async () => {
    try {
      const res = await authFetch('/api/meals');
      if (res.ok) {
        const json = await res.json();
        setMeals(json.meals ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    if (ready) loadMeals();
  }, [ready, loadMeals]);

  async function handlePortionChange(mealId: string, multiplier: number) {
    const res = await authFetch(`/api/meals/${mealId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ portionMultiplier: multiplier }),
    });
    if (res.ok) {
      await loadMeals();
    }
  }

  async function handleDelete(mealId: string) {
    const res = await authFetch(`/api/meals/${mealId}`, { method: 'DELETE' });
    if (res.ok) {
      setMeals((prev) => prev.filter((m) => m.id !== mealId));
    }
  }

  const filtered = filter === 'ALL' ? meals : meals.filter((m) => m.entryType === filter);

  return (
    <div className="space-y-4 pb-4">
      <h1 className="text-xl font-bold text-slate-900">ประวัติการกิน</h1>

      {/* Filter Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilter(tab.key)}
            className={`rounded-full px-3.5 py-1.5 text-xs font-medium whitespace-nowrap transition ${
              filter === tab.key
                ? 'bg-emerald-600 text-white'
                : 'bg-white text-slate-600 ring-1 ring-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-12 text-center text-sm text-slate-400">กำลังโหลด...</div>
      ) : filtered.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center text-sm text-slate-400 ring-1 ring-slate-200/70">
          ยังไม่มีรายการในหมวดนี้
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((meal) => (
            <article
              key={meal.id}
              className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                    {meal.entryType === 'MAIN_DISH'
                      ? '🍽️ อาหารหลัก'
                      : meal.entryType === 'SWEET_DRINK'
                        ? '🧋 น้ำหวาน'
                        : '🍩 ขนม'}{' '}
                    •{' '}
                    {new Date(meal.loggedAt).toLocaleString('th-TH', {
                      dateStyle: 'short',
                      timeStyle: 'short',
                    })}
                  </span>
                  <h2 className="text-base font-bold text-slate-900">{meal.title}</h2>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-orange-600">
                    {Math.round(meal.totalKcal)} kcal
                  </span>
                  <button
                    onClick={() => handleDelete(meal.id)}
                    aria-label="ลบรายการ"
                    className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Ingredients for Main Dish */}
              {meal.ingredients.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {meal.ingredients.map((ing) => (
                    <span
                      key={ing.id}
                      className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-700"
                    >
                      <span
                        className="h-2 w-2 rounded-full"
                        style={{ backgroundColor: ing.categoryColor }}
                      />
                      {ing.ingredientName} ({Math.round(ing.grams)}g)
                    </span>
                  ))}
                </div>
              )}

              {/* Sweet Drink / Snack Info */}
              {meal.entryType !== 'MAIN_DISH' && (
                <div className="mt-2 text-xs text-slate-500">
                  น้ำตาล ~{meal.sugarGrams}g
                  {meal.sweetnessLevel !== null ? ` • หวาน ${meal.sweetnessLevel}%` : ''}
                  {meal.toppings && meal.toppings.length > 0
                    ? ` • +${meal.toppings.join(', ')}`
                    : ''}
                </div>
              )}

              {/* Portion Multiplier Buttons */}
              <div className="mt-3 flex items-center gap-1.5 border-t border-slate-100 pt-2.5">
                <span className="mr-1 text-xs text-slate-400">ปริมาณ:</span>
                {[0.5, 1, 1.5].map((mult) => (
                  <button
                    key={mult}
                    onClick={() => handlePortionChange(meal.id, mult)}
                    className={`rounded-lg px-2.5 py-1 text-xs font-medium ${
                      meal.portionMultiplier === mult
                        ? 'bg-emerald-100 text-emerald-700'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {mult}x
                  </button>
                ))}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
