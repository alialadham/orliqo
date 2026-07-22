export function deterministicInterval(min: number, max: number, seed: string): number { const span = max - min + 1; let hash = 0; for (const character of seed) hash = (hash * 31 + character.charCodeAt(0)) >>> 0; return min + (hash % span); }
export function scheduleMessages(input: { startAt: Date; count: number; days: number[]; windowStart: string; windowEnd: string; minInterval: number; maxInterval: number; dailyLimit: number; seed: string }): Date[] {
  const results: Date[] = []; const cursor = new Date(input.startAt); let daily = 0; let dayKey = "";
  while (results.length < input.count) {
    const key = cursor.toISOString().slice(0, 10); if (key !== dayKey) { dayKey = key; daily = 0; }
    const [startHour, startMinute] = input.windowStart.split(":").map(Number); const [endHour, endMinute] = input.windowEnd.split(":").map(Number);
    const minutes = cursor.getUTCHours() * 60 + cursor.getUTCMinutes(); const windowStart = startHour! * 60 + startMinute!; const windowEnd = endHour! * 60 + endMinute!;
    if (!input.days.includes(cursor.getUTCDay()) || minutes < windowStart || minutes >= windowEnd || daily >= input.dailyLimit) { cursor.setUTCDate(cursor.getUTCDate() + (minutes >= windowEnd || daily >= input.dailyLimit ? 1 : 0)); cursor.setUTCHours(startHour!, startMinute!, 0, 0); if (!input.days.includes(cursor.getUTCDay())) cursor.setUTCDate(cursor.getUTCDate() + 1); continue; }
    results.push(new Date(cursor)); daily += 1; cursor.setUTCMinutes(cursor.getUTCMinutes() + deterministicInterval(input.minInterval, input.maxInterval, `${input.seed}:${results.length}`));
  }
  return results;
}
