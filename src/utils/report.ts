import type jsPDF from 'jspdf';
import type { BMIRecord } from '../types';
import { getRecordBmi } from './bmi';

const PDF_SIDE_MARGIN = 15;

export function getPdfTableLayout(doc: jsPDF) {
  const pageWidth = doc.internal.pageSize.getWidth();
  const tableWidth = pageWidth - PDF_SIDE_MARGIN * 2;
  return {
    margin: { left: PDF_SIDE_MARGIN, right: PDF_SIDE_MARGIN },
    tableWidth,
  };
}

/** Column width ratios for the 6-column meal plan table (must sum to 1). */
export function getMealPlanColumnStyles(tableWidth: number) {
  const ratios = [0.11, 0.17, 0.14, 0.18, 0.14, 0.26];
  return Object.fromEntries(ratios.map((ratio, index) => [index, { cellWidth: tableWidth * ratio }]));
}

export function sortRecordsNewestFirst(records: BMIRecord[]): BMIRecord[] {
  return [...records].sort(
    (a, b) => (b.timestamp?.toMillis?.() ?? 0) - (a.timestamp?.toMillis?.() ?? 0),
  );
}

/** Records with a resolvable BMI, newest first (for summaries, trends, meal plans). */
export function getValidRecordsForReport(records: BMIRecord[]): BMIRecord[] {
  return sortRecordsNewestFirst(records)
    .map((record) => {
      const bmi = getRecordBmi(record);
      if (bmi === null) return null;
      return { ...record, bmi };
    })
    .filter((record): record is BMIRecord => record !== null);
}

export function formatMeasurement(value: unknown, unit: string): string {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return '—';
  }
  const formatted = Number.isInteger(value) ? String(value) : value.toFixed(1);
  return `${formatted}${unit}`;
}

export function formatBmiForDisplay(bmi: unknown): string {
  const resolved =
    typeof bmi === 'number' && Number.isFinite(bmi) && bmi > 0 && bmi < 100
      ? bmi
      : null;
  if (resolved === null) return 'Invalid';
  return resolved.toFixed(1);
}

export function buildMealPlanPdfCaption(
  subtitle: string,
  allergies?: string[],
): string {
  const parts: string[] = [];
  const trimmed = subtitle.trim();
  if (trimmed) parts.push(trimmed);

  if (!trimmed.toLowerCase().includes('school meals')) {
    parts.push('School meals + dinner at home');
  }

  if (allergies?.length) {
    parts.push(`Avoid: ${allergies.join(', ')}`);
  }

  return parts.join(' · ');
}
