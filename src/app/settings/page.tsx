'use client';

import React, { useEffect, useState } from 'react';
import { Save } from 'lucide-react';
import { useLiff } from '@/components/LiffProvider';

export default function SettingsPage() {
  const { ready, authFetch } = useLiff();
  const [dailyCalorieGoal, setDailyCalorieGoal] = useState(2000);
  const [weeklySweetDrinkQuota, setWeeklySweetDrinkQuota] = useState(3);
  const [dailySweetSnackKcalQuota, setDailySweetSnackKcalQuota] = useState(300);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!ready) return;
    authFetch('/api/settings')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.user) {
          setDailyCalorieGoal(json.user.dailyCalorieGoal);
          setWeeklySweetDrinkQuota(json.user.weeklySweetDrinkQuota);
          setDailySweetSnackKcalQuota(json.user.dailySweetSnackKcalQuota);
        }
      });
  }, [ready, authFetch]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setSavedMsg(null);
    try {
      const res = await authFetch('/api/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dailyCalorieGoal,
          weeklySweetDrinkQuota,
          dailySweetSnackKcalQuota,
        }),
      });
      if (res.ok) {
        setSavedMsg('บันทึกเป้าหมายเรียบร้อยแล้ว!');
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4 pb-4">
      <h1 className="text-xl font-bold text-slate-900">ตั้งค่าเป้าหมาย & โควต้า</h1>

      <form
        onSubmit={handleSubmit}
        className="space-y-4 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200/70"
      >
        <div>
          <label className="block text-sm font-medium text-slate-700">
            เป้าหมายแคลอรี่ต่อวัน (kcal)
          </label>
          <input
            type="number"
            min={500}
            max={6000}
            value={dailyCalorieGoal}
            onChange={(e) => setDailyCalorieGoal(Number(e.target.value))}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-emerald-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">
            โควต้าน้ำหวานต่อสัปดาห์ (แก้ว)
          </label>
          <input
            type="number"
            min={0}
            max={30}
            value={weeklySweetDrinkQuota}
            onChange={(e) => setWeeklySweetDrinkQuota(Number(e.target.value))}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-pink-500"
          />
          <p className="mt-1 text-xs text-slate-400">
            บอทจะแจ้งเตือนทันทีเมื่อคุณดื่มน้ำหวานครบหรือเกินโควต้านี้
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">
            โควต้าแคลอรี่สายหวาน+ขนมต่อวัน (kcal)
          </label>
          <input
            type="number"
            min={0}
            max={3000}
            value={dailySweetSnackKcalQuota}
            onChange={(e) => setDailySweetSnackKcalQuota(Number(e.target.value))}
            className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-pink-500"
          />
        </div>

        <button
          type="submit"
          disabled={saving}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-700 disabled:opacity-50"
        >
          <Save className="h-4 w-4" />
          {saving ? 'กำลังบันทึก...' : 'บันทึกการตั้งค่า'}
        </button>

        {savedMsg && <p className="text-center text-xs font-medium text-emerald-600">{savedMsg}</p>}
      </form>
    </div>
  );
}
