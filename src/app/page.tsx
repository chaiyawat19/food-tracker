'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Coffee,
  Download,
  Flame,
  Plus,
  Send,
  Sparkles,
  Utensils,
  AlertTriangle,
} from 'lucide-react';
import { useLiff } from '@/components/LiffProvider';

interface AnalyticsData {
  user: {
    displayName: string | null;
    dailyCalorieGoal: number;
    weeklySweetDrinkQuota: number;
    dailySweetSnackKcalQuota: number;
  };
  today: {
    totalKcal: number;
    mainDishKcal: number;
    sweetDrinkKcal: number;
    snackKcal: number;
    sugarGrams: number;
  };
  weekly: {
    sugarGrams: number;
    categoryStats: Array<{
      categoryId: number;
      slug: string;
      nameTh: string;
      colorHex: string;
      totalGrams: number;
      totalKcal: number;
      mealCount: number;
    }>;
    topIngredients: Array<{
      ingredientName: string;
      categoryName: string;
      colorHex: string;
      totalGrams: number;
      count: number;
    }>;
  };
  topDishes: Array<{
    title: string;
    entryType: string;
    count: number;
    avgKcal: number;
  }>;
  quota: {
    weeklySweetDrinkCount: number;
    weeklySweetDrinkQuota: number;
    isDrinkQuotaExceeded: boolean;
    isDrinkQuotaReached: boolean;
    dailySweetSnackKcal: number;
    dailySweetSnackKcalQuota: number;
    isSweetSnackKcalExceeded: boolean;
  };
}

interface FavoriteItem {
  id: string;
  entryType: string;
  title: string;
  payload: Record<string, unknown>;
}

export default function DashboardPage() {
  const { ready, isMockMode, displayName, authFetch } = useLiff();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
  const [quickInput, setQuickInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    try {
      const [analyticsRes, favRes] = await Promise.all([
        authFetch('/api/analytics'),
        authFetch('/api/favorites'),
      ]);
      if (analyticsRes.ok) {
        setData(await analyticsRes.json());
      }
      if (favRes.ok) {
        const favJson = await favRes.json();
        setFavorites(favJson.favorites ?? []);
      }
    } catch (err) {
      console.error('Failed to load dashboard:', err);
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    if (ready) {
      loadDashboard();
    }
  }, [ready, loadDashboard]);

  async function handleQuickLog(e: React.FormEvent) {
    e.preventDefault();
    if (!quickInput.trim() || submitting) return;
    setSubmitting(true);
    setStatusMsg(null);
    try {
      const res = await authFetch('/api/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText: quickInput.trim() }),
      });
      if (res.ok) {
        const result = await res.json();
        setQuickInput('');
        setStatusMsg(`บันทึก "${result.meal.title}" (${Math.round(result.meal.totalKcal)} kcal) แล้ว`);
        await loadDashboard();
      } else {
        setStatusMsg('ไม่สามารถบันทึกได้ กรุณาลองใหม่');
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleQuickFavorite(fav: FavoriteItem) {
    if (submitting) return;
    setSubmitting(true);
    try {
      const res = await authFetch('/api/meals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fav.payload),
      });
      if (res.ok) {
        setStatusMsg(`บันทึกเมนูโปรด "${fav.title}" แล้ว`);
        await loadDashboard();
      }
    } finally {
      setSubmitting(false);
    }
  }

  async function handleExport(format: 'csv' | 'json') {
    const res = await authFetch(`/api/export?format=${format}`);
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `food-tracker-export.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!ready || loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center text-sm text-slate-500">กำลังโหลดข้อมูลโภชนาการ...</div>
      </div>
    );
  }

  const goal = data?.user.dailyCalorieGoal ?? 2000;
  const todayTotal = data?.today.totalKcal ?? 0;
  const pct = Math.min(100, Math.round((todayTotal / goal) * 100));

  const mainPct = todayTotal > 0 ? Math.round(((data?.today.mainDishKcal ?? 0) / todayTotal) * 100) : 0;
  const drinkPct =
    todayTotal > 0 ? Math.round(((data?.today.sweetDrinkKcal ?? 0) / todayTotal) * 100) : 0;
  const snackPct = todayTotal > 0 ? Math.max(0, 100 - mainPct - drinkPct) : 0;

  const maxCatGrams = Math.max(
    1,
    ...(data?.weekly.categoryStats.map((c) => c.totalGrams) ?? [1])
  );

  return (
    <div className="space-y-4 pb-4">
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">KinLog • สวัสดี, {displayName} 👋</h1>
          <p className="text-xs text-slate-500">
            บันทึกอาหารหลักไทย & สายหวาน {isMockMode ? '(Dev Mode)' : ''}
          </p>
        </div>
        <div className="flex gap-1.5">
          <button
            onClick={() => handleExport('csv')}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <Download className="h-3.5 w-3.5" />
            CSV
          </button>
          <button
            onClick={() => handleExport('json')}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:bg-slate-50"
          >
            JSON
          </button>
        </div>
      </header>

      {/* Quick Log Bar */}
      <form onSubmit={handleQuickLog} className="rounded-2xl bg-white p-3 shadow-sm ring-1 ring-slate-200/70">
        <label className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-slate-600">
          <Sparkles className="h-3.5 w-3.5 text-emerald-500" />
          บันทึกด่วน (AI แยกส่วนประกอบให้อัตโนมัติ)
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={quickInput}
            onChange={(e) => setQuickInput(e.target.value)}
            placeholder="เช่น กะเพราไก่ ไข่ดาว หรือ ชาไทยหวาน 50%"
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-emerald-500 focus:bg-white"
          />
          <button
            type="submit"
            disabled={submitting || !quickInput.trim()}
            className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-3.5 py-2 text-white transition hover:bg-emerald-700 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        {statusMsg && <p className="mt-2 text-xs font-medium text-emerald-600">{statusMsg}</p>}
      </form>

      {/* Quick Favorites */}
      {favorites.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            ⭐ เมนูโปรด (กดบันทึกใน 1 แตะ)
          </h2>
          <div className="flex flex-wrap gap-2">
            {favorites.map((fav) => (
              <button
                key={fav.id}
                onClick={() => handleQuickFavorite(fav)}
                className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm hover:border-emerald-300 hover:bg-emerald-50"
              >
                <Plus className="h-3 w-3 text-emerald-600" />
                {fav.title}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Today's Calories Card */}
      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
            <Flame className="h-4 w-4 text-orange-500" />
            แคลอรี่วันนี้
          </span>
          <span className="text-xs text-slate-500">เป้าหมาย {goal.toLocaleString()} kcal</span>
        </div>

        <div className="mt-2 flex items-baseline gap-2">
          <span className="text-3xl font-bold text-slate-900">{todayTotal.toLocaleString()}</span>
          <span className="text-sm text-slate-500">kcal ({pct}%)</span>
        </div>

        <div className="mt-2.5 h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
          <div
            className={`h-full rounded-full transition-all ${
              todayTotal > goal ? 'bg-rose-500' : 'bg-emerald-500'
            }`}
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Main vs Sweet vs Snack Split */}
        <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-center">
          <div>
            <div className="text-[11px] text-slate-500">อาหารหลัก ({mainPct}%)</div>
            <div className="text-sm font-bold text-emerald-600">
              {data?.today.mainDishKcal ?? 0} kcal
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-500">น้ำหวาน ({drinkPct}%)</div>
            <div className="text-sm font-bold text-pink-600">
              {data?.today.sweetDrinkKcal ?? 0} kcal
            </div>
          </div>
          <div>
            <div className="text-[11px] text-slate-500">ขนม ({snackPct}%)</div>
            <div className="text-sm font-bold text-amber-600">
              {data?.today.snackKcal ?? 0} kcal
            </div>
          </div>
        </div>
      </section>

      {/* Sweet Drink & Sugar Quota Card */}
      <section className="rounded-2xl bg-gradient-to-br from-pink-50 to-white p-4 shadow-sm ring-1 ring-pink-200/70">
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-sm font-semibold text-pink-900">
            <Coffee className="h-4 w-4 text-pink-600" />
            โควต้าน้ำหวาน & น้ำตาล
          </span>
          {data?.quota.isDrinkQuotaExceeded && (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
              <AlertTriangle className="h-3 w-3" /> เกินโควต้า!
            </span>
          )}
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white p-3 ring-1 ring-pink-100">
            <div className="text-xs text-slate-500">น้ำหวานสัปดาห์นี้</div>
            <div className="mt-1 text-xl font-bold text-pink-600">
              {data?.quota.weeklySweetDrinkCount ?? 0} / {data?.quota.weeklySweetDrinkQuota ?? 3}{' '}
              <span className="text-xs font-normal text-slate-500">แก้ว</span>
            </div>
          </div>
          <div className="rounded-xl bg-white p-3 ring-1 ring-pink-100">
            <div className="text-xs text-slate-500">น้ำตาลสะสมสัปดาห์นี้</div>
            <div className="mt-1 text-xl font-bold text-slate-800">
              {data?.weekly.sugarGrams ?? 0}{' '}
              <span className="text-xs font-normal text-slate-500">
                g ({Math.round((data?.weekly.sugarGrams ?? 0) / 4)} ช้อนชา)
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 2-Level Ingredient Breakdown */}
      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
        <h2 className="flex items-center gap-1.5 text-sm font-semibold text-slate-800">
          <Utensils className="h-4 w-4 text-emerald-600" />
          สถิติส่วนประกอบหลักสัปดาห์นี้ (ไม่รวมเครื่องปรุง)
        </h2>

        {!data?.weekly.categoryStats.length ? (
          <p className="mt-3 text-xs text-slate-400">
            ยังไม่มีข้อมูลส่วนประกอบสัปดาห์นี้ ลองพิมพ์ชื่ออาหารไทยเพื่อเริ่มบันทึกได้เลย
          </p>
        ) : (
          <div className="mt-3 space-y-2.5">
            {data.weekly.categoryStats.map((cat) => (
              <div key={cat.categoryId}>
                <div className="flex justify-between text-xs">
                  <span className="font-medium text-slate-700">
                    {cat.nameTh} ({cat.mealCount} มื้อ)
                  </span>
                  <span className="text-slate-500">
                    {Math.round(cat.totalGrams)}g • {Math.round(cat.totalKcal)} kcal
                  </span>
                </div>
                <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${Math.round((cat.totalGrams / maxCatGrams) * 100)}%`,
                      backgroundColor: cat.colorHex,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Top Specific Ingredients */}
        {data && data.weekly.topIngredients.length > 0 && (
          <div className="mt-4 border-t border-slate-100 pt-3">
            <div className="mb-2 text-xs font-semibold text-slate-500">วัตถุดิบย่อยที่กินบ่อยสุด</div>
            <div className="flex flex-wrap gap-1.5">
              {data.weekly.topIngredients.map((ing) => (
                <span
                  key={ing.ingredientName}
                  className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-700"
                >
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: ing.colorHex }}
                  />
                  {ing.ingredientName} ({ing.count}x • {Math.round(ing.totalGrams)}g)
                </span>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Top Dishes */}
      <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70">
        <h2 className="text-sm font-semibold text-slate-800">🏆 เมนูที่กินบ่อยสุด (30 วัน)</h2>
        {!data?.topDishes.length ? (
          <p className="mt-2 text-xs text-slate-400">ยังไม่มีข้อมูลการกิน</p>
        ) : (
          <ul className="mt-2 divide-y divide-slate-100">
            {data.topDishes.map((dish, idx) => (
              <li key={`${dish.title}-${idx}`} className="flex items-center justify-between py-2 text-sm">
                <span className="font-medium text-slate-700">
                  {idx + 1}. {dish.title}
                </span>
                <span className="text-xs text-slate-500">
                  {dish.count} ครั้ง • ~{dish.avgKcal} kcal
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
