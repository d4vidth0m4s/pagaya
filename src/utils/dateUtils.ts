/**
 * Date and calendar utilities with Colombian timezone (America/Bogota, UTC-5)
 * and robust parsing for comma-separated days with leap-year validations.
 */

export function getTodayColombia(): string {
  const now = new Date();
  // Using Intl to obtain Colombia current date
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
  return formatter.format(now); // returns "YYYY-MM-DD"
}

export function getCurrentPeriodColombia(): string {
  return getTodayColombia().substring(0, 7); // returns "YYYY-MM"
}

export function getDaysInMonth(year: number, month: number): number {
  // month: 1 - 12
  return new Date(year, month, 0).getDate();
}

export function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || (year % 400 === 0);
}

/**
 * Parses user input like "1,3,4" or "10-15" or "1, 3, 5-8" into an array of valid numbers
 * validated against the selected year and month.
 */
export function parseDaysInput(
  input: string,
  year: number,
  month: number
): { validDays: number[]; invalidParts: string[]; duplicates: number[] } {
  const maxDays = getDaysInMonth(year, month);
  const parts = input.split(',').map(s => s.trim()).filter(Boolean);
  const resultSet = new Set<number>();
  const duplicateList: number[] = [];
  const invalidParts: string[] = [];

  for (const part of parts) {
    if (part.includes('-')) {
      const [startStr, endStr] = part.split('-').map(s => s.trim());
      const start = parseInt(startStr, 10);
      const end = parseInt(endStr, 10);

      if (isNaN(start) || isNaN(end) || start > end || start < 1 || end > maxDays) {
        invalidParts.push(part);
      } else {
        for (let d = start; d <= end; d++) {
          if (resultSet.has(d)) {
            duplicateList.push(d);
          } else {
            resultSet.add(d);
          }
        }
      }
    } else {
      const day = parseInt(part, 10);
      if (isNaN(day) || day < 1 || day > maxDays) {
        invalidParts.push(part);
      } else {
        if (resultSet.has(day)) {
          duplicateList.push(day);
        } else {
          resultSet.add(day);
        }
      }
    }
  }

  const validDays = Array.from(resultSet).sort((a, b) => a - b);
  return { validDays, invalidParts, duplicates: duplicateList };
}

/**
 * Converts a list of valid days and a period (YYYY-MM) to full date strings (YYYY-MM-DD)
 */
export function buildFullDates(period: string, days: number[]): string[] {
  const [yearStr, monthStr] = period.split('-');
  const monthPadded = monthStr.padStart(2, '0');
  return days.map(d => `${yearStr}-${monthPadded}-${String(d).padStart(2, '0')}`);
}

/**
 * Formats a date string (YYYY-MM-DD) in Spanish human-readable format
 */
export function formatDateHuman(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  return new Intl.DateTimeFormat('es-CO', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(date);
}

export function formatMonthName(period: string): string {
  if (!period) return '';
  const [year, month] = period.split('-').map(Number);
  const date = new Date(year, month - 1, 1);
  const name = new Intl.DateTimeFormat('es-CO', { month: 'long', year: 'numeric' }).format(date);
  return name.charAt(0).toUpperCase() + name.slice(1);
}

export const MONTH_NAMES_ES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

export const DAY_NAMES_ES = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
