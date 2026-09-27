export const formatIncomeYuanToWan = (value?: number | null): string => {
  if (value === undefined || value === null || Number.isNaN(value)) return '-';
  const num: number = Number(value);
  if (num < 0) return '-';
  return (num / 10000).toFixed(2);
};

export const formatIncomeYuanWithUnit = (value?: number | null): string => {
  const formatted: string = formatIncomeYuanToWan(value);
  if (formatted === '-') return '-';
  return `¥${formatted}万`;
};

export const formatMonthCn = (monthStr: string): string => {
  if (!monthStr) return '';
  if (/^\d{4}-\d{2}$/.test(monthStr)) {
    const [y, m] = monthStr.split('-');
    return `${parseInt(y, 10)}年${parseInt(m, 10)}月`;
  }
  return monthStr;
};
