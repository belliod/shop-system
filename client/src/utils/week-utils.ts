export function getWeekNumber(date: Date): number {
  const tmp: Date = new Date(Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ));
  const dayNum: number = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  const yearStart: Date = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
  return Math.ceil(
    ((tmp.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
}

export function getWeekYear(date: Date): number {
  const tmp: Date = new Date(Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ));
  const dayNum: number = tmp.getUTCDay() || 7;
  tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
  return tmp.getUTCFullYear();
}

export function formatWeekKey(year: number, weekNum: number): string {
  return `${year}-W${String(weekNum).padStart(2, '0')}`;
}

export function getWeekOfMonth(date: Date): number {
  const firstDay: Date = new Date(date.getFullYear(), date.getMonth(), 1);
  const firstWeek: number = getWeekNumber(firstDay);
  const currentWeek: number = getWeekNumber(date);
  if (currentWeek < firstWeek) {
    const prevLastDay: Date = new Date(date.getFullYear(), date.getMonth(), 0);
    const prevLastWeek: number = getWeekNumber(prevLastDay);
    return currentWeek === prevLastWeek ? 1 : 1;
  }
  return currentWeek - firstWeek + 1;
}

export function getWeeksInMonth(year: number, month: number): Array<{
  weekNum: number;
  weekYear: number;
  weekKey: string;
  weekOfMonth: number;
}> {
  const result: Array<{
    weekNum: number;
    weekYear: number;
    weekKey: string;
    weekOfMonth: number;
  }> = [];
  const seen: Set<string> = new Set();

  const daysInMonth: number = new Date(year, month + 1, 0).getDate();
  let weekOfMonth = 0;
  let lastWeekNum = -1;

  for (let day = 1; day <= daysInMonth; day++) {
    const d: Date = new Date(year, month, day);
    const wNum: number = getWeekNumber(d);
    const wYear: number = getWeekYear(d);
    const key: string = formatWeekKey(wYear, wNum);

    if (!seen.has(key)) {
      seen.add(key);
      if (wNum !== lastWeekNum) {
        weekOfMonth += 1;
        lastWeekNum = wNum;
      }
      result.push({
        weekNum: wNum,
        weekYear: wYear,
        weekKey: key,
        weekOfMonth,
      });
    }
  }
  return result;
}

export function parseWeekKey(weekKey: string): {
  year: number;
  weekNum: number;
} {
  const [yearStr, weekStr] = weekKey.split('-W');
  return {
    year: parseInt(yearStr, 10),
    weekNum: parseInt(weekStr, 10),
  };
}
