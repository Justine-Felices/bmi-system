import type { MealPlanDay, Student } from '../types';

/** Maps health alert labels to ingredient/dish terms that must not appear in meals. */
const RESTRICTION_TERMS: Record<string, string[]> = {
  eggs: ['egg', 'eggs', 'itlog', 'tortang', 'torta', 'omelet', 'omelette', 'scrambled egg', 'boiled egg'],
  egg: ['egg', 'eggs', 'itlog', 'tortang', 'torta', 'omelet', 'omelette'],
  dairy: ['milk', 'gatas', 'cheese', 'keso', 'yogurt', 'dairy', 'leche flan', 'evaporated milk', 'condensed milk', 'butter', 'cream', 'sopas', 'champorado with gatas', 'champorado with milk'],
  peanuts: ['peanut', 'peanuts', 'mani', 'peanut butter'],
  peanut: ['peanut', 'peanuts', 'mani', 'peanut butter'],
  shellfish: ['shellfish', 'shrimp', 'hipon', 'prawn', 'crab', 'alimango', 'ulang', 'lobster'],
  wheat: ['wheat', 'pandesal', 'bread', 'pancit', 'spaghetti', 'noodles', 'pasta', 'flour', 'lumpia wrapper'],
  soy: ['soy', 'tofu', 'tokwa', 'soya', 'taho'],
  fish: ['fish', 'isda', 'tilapia', 'bangus', 'galunggong', 'dilis'],
  seafood: ['seafood', 'fish', 'isda', 'shrimp', 'hipon', 'shellfish', 'crab', 'bangus', 'tilapia'],
  pork: ['pork', 'baboy', 'menudo', 'lechon', 'longganisa', 'tocino'],
  chicken: ['chicken', 'manok', 'tinola', 'afritada'],
  gluten: ['wheat', 'pandesal', 'bread', 'pancit', 'spaghetti', 'noodles', 'pasta', 'flour'],
};

const MEAL_FIELDS = ['breakfast', 'amSnack', 'lunch', 'pmSnack', 'dinner'] as const;

const SAFE_MEALS: Record<(typeof MEAL_FIELDS)[number], string[]> = {
  breakfast: [
    'Garlic rice with grilled fish',
    'Rice porridge with chicken (no egg)',
    'Steamed rice with sautéed vegetables',
    'Banana and rice cakes (suman)',
    'Champorado (coconut milk only)',
  ],
  amSnack: [
    'Fresh banana',
    'Papaya slices',
    'Boiled camote',
    'Fresh mango slices',
    'Cucumber sticks',
  ],
  lunch: [
    'Chicken tinola with rice and malunggay',
    'Sinigang na isda with rice',
    'Pinakbet with rice and grilled fish',
    'Nilagang manok with rice and pechay',
    'Ginisang monggo with rice',
  ],
  pmSnack: [
    'Fresh fruit cup',
    'Boiled corn',
    'Saging na saba (steamed)',
    'Saging na saba',
    'Watermelon slices',
  ],
  dinner: [
    'Inihaw na tilapia with rice and vegetables',
    'Steamed bangus with rice and kangkong',
    'Ginisang sitaw with rice',
    'Adobong manok with rice',
    'Nilagang baka with rice and gulay',
  ],
};

function normalizeRestrictionKey(label: string): string {
  return label.trim().toLowerCase().replace(/\s+/g, ' ');
}

/** Collect unique health alerts from student profile (and optional evaluation notes). */
export function collectDietaryRestrictions(
  student: Student,
  healthIssues?: string[],
): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  const add = (label: string) => {
    const key = normalizeRestrictionKey(label);
    if (!key || seen.has(key)) return;
    seen.add(key);
    out.push(label.trim());
  };

  for (const a of student.allergies ?? []) add(a);
  for (const h of healthIssues ?? []) add(h);

  return out;
}

function termsForRestriction(label: string): string[] {
  const key = normalizeRestrictionKey(label);
  if (RESTRICTION_TERMS[key]) return RESTRICTION_TERMS[key];

  // Custom alert: treat the label itself as a forbidden substring
  return [key];
}

export function getForbiddenTerms(restrictions: string[]): string[] {
  const terms = new Set<string>();
  for (const r of restrictions) {
    for (const t of termsForRestriction(r)) {
      terms.add(t.toLowerCase());
    }
  }
  return [...terms];
}

export function textViolatesRestrictions(text: string, restrictions: string[]): boolean {
  if (!text?.trim() || restrictions.length === 0) return false;
  const lower = text.toLowerCase();
  const forbidden = getForbiddenTerms(restrictions);
  return forbidden.some(term => lower.includes(term));
}

function pickSafeMeal(field: (typeof MEAL_FIELDS)[number], restrictions: string[], dayIndex: number): string {
  const options = SAFE_MEALS[field].filter(m => !textViolatesRestrictions(m, restrictions));
  if (options.length === 0) return 'Steamed rice with vegetables and grilled fish';
  return options[dayIndex % options.length];
}

/** Replace any meal slot that contains a forbidden ingredient. */
export function sanitizeMealPlanDays(
  meals: MealPlanDay[],
  restrictions: string[],
): MealPlanDay[] {
  if (restrictions.length === 0) return meals;

  return meals.map((day, dayIndex) => {
    const next = { ...day };
    for (const field of MEAL_FIELDS) {
      const value = next[field];
      if (value && textViolatesRestrictions(value, restrictions)) {
        next[field] = pickSafeMeal(field, restrictions, dayIndex);
      }
    }
    return next;
  });
}

export function buildDietaryRestrictionPrompt(restrictions: string[]): string {
  if (restrictions.length === 0) {
    return 'No known health alerts or allergies on file.';
  }

  const forbidden = getForbiddenTerms(restrictions);
  return `STUDENT HEALTH ALERTS / ALLERGIES (MANDATORY — ZERO TOLERANCE):
The child must NEVER be served any food containing these alerts: ${restrictions.join(', ')}.
Forbidden ingredients and related dishes include (non-exhaustive): ${forbidden.join(', ')}.
- Do NOT use eggs, egg noodles, torta/tortang, or itlog if Eggs/Egg allergy is listed.
- Do NOT use milk, cheese, yogurt, gatas, leche flan, or milk-based soups if Dairy allergy is listed.
- Do NOT use peanuts, peanut butter, or mani if Peanuts allergy is listed.
- Do NOT use shrimp, hipon, crab, or shellfish if Shellfish allergy is listed.
- Do NOT use pandesal, bread, pancit, or spaghetti if Wheat/Gluten allergy is listed.
- Check EVERY breakfast, amSnack, lunch, pmSnack, and dinner field before finalizing.
- If unsure whether a Filipino dish contains an allergen, choose a different safe dish.`;
}

export function filterLifestyleTipsForRestrictions(tips: string[], restrictions: string[]): string[] {
  return tips
    .filter(tip => !textViolatesRestrictions(tip, restrictions))
    .map(tip => {
      if (restrictions.some(r => normalizeRestrictionKey(r).includes('dairy'))) {
        return tip.replace(/milk|yogurt/gi, 'water');
      }
      return tip;
    });
}
