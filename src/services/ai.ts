import { GoogleGenAI } from '@google/genai';
import { format } from 'date-fns';
import type { MealPlan, MealPlanDay, Student, BMIRecord, DashboardData, DashboardInsight } from '../types';
import { getBMICategory, calculateAge, getRecordBmi } from '../utils/bmi';
import { getValidRecordsForReport } from '../utils/report';
import {
  buildDietaryRestrictionPrompt,
  collectDietaryRestrictions,
  filterLifestyleTipsForRestrictions,
  sanitizeMealPlanDays,
} from '../utils/dietary-restrictions';

const GEMINI_MODEL = 'gemini-2.5-flash';

function getGeminiApiKey(): string | undefined {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key || key === 'MY_GEMINI_API_KEY' || key.includes('PLACEHOLDER')) return undefined;
  return key;
}

function getAIClient(): GoogleGenAI | null {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return null;
  return new GoogleGenAI({ apiKey });
}

function serializeForAI(value: unknown): unknown {
  if (value == null) return value;
  if (Array.isArray(value)) return value.map(serializeForAI);
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    if (typeof obj.toDate === 'function') {
      return (obj.toDate as () => Date)().toISOString();
    }
    if (typeof obj.seconds === 'number') {
      return new Date(obj.seconds * 1000).toISOString();
    }
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      out[k] = serializeForAI(v);
    }
    return out;
  }
  return value;
}

interface IndividualReportData {
  student: Student;
  history: BMIRecord[];
}

function buildIndividualReportFallback(data: IndividualReportData): string {
  const { student, history } = data;
  const validHistory = getValidRecordsForReport(history);
  const latest = validHistory[0];
  if (!latest) {
    return `${student.name} has no complete BMI evaluations on record yet. Schedule a screening with valid height and weight measurements.`;
  }

  const latestBmi = getRecordBmi(latest) ?? latest.bmi;
  const category = getBMICategory(latestBmi);
  const age = calculateAge(student.dob);
  const issues = latest.healthIssues?.length
    ? latest.healthIssues.join(', ')
    : 'none reported';

  let trend = '';
  if (validHistory.length >= 2) {
    const previous = validHistory[1];
    const previousBmi = getRecordBmi(previous) ?? previous.bmi;
    const delta = latestBmi - previousBmi;
    if (!Number.isFinite(delta)) {
      trend = '';
    } else if (Math.abs(delta) < 0.3) {
      trend = 'BMI has remained relatively stable since the previous valid evaluation.';
    } else if (delta < 0) {
      trend = `BMI decreased by ${Math.abs(delta).toFixed(1)} since the last check (${previousBmi.toFixed(1)} → ${latestBmi.toFixed(1)}), which is a positive trend if moving toward a healthier range.`;
    } else {
      trend = `BMI increased by ${delta.toFixed(1)} since the last check (${previousBmi.toFixed(1)} → ${latestBmi.toFixed(1)}). Monitor nutrition and activity closely.`;
    }
  }

  const advice =
    category.label === 'Underweight'
      ? 'Encourage nutrient-dense meals, regular snacks, and adequate sleep (10–12 hours). Consult school health staff if weight does not improve.'
      : category.label === 'Overweight' || category.label === 'Obese'
        ? 'Focus on balanced portions, daily physical activity (60 minutes), water instead of sugary drinks, and consistent follow-up evaluations.'
        : 'Maintain balanced meals, regular physical activity, and routine check-ups to sustain healthy growth.';

  const dateLabel = latest.timestamp?.toDate
    ? format(latest.timestamp.toDate(), 'MMMM d, yyyy')
    : 'the most recent visit';

  return [
    `${student.name} (age ${age || 'N/A'}, ${student.gender}) was last evaluated on ${dateLabel}.`,
    `Current measurements: ${latest.height} cm, ${latest.weight} kg, BMI ${latestBmi.toFixed(1)} (${category.label}).`,
    `Recorded health issues: ${issues}.`,
    trend,
    advice,
    validHistory.length > 1
      ? `${validHistory.length} valid evaluations are on file; continue tracking at regular intervals.`
      : 'Only one valid evaluation is on file; additional measurements will help track progress over time.',
  ].filter(Boolean).join(' ');
}

function buildGeneralReportFallback(data: DashboardData): string {
  const topCategory = data.healthStatusBreakdown.reduce(
    (best, item) => (item.value > (best?.value ?? 0) ? item : best),
    data.healthStatusBreakdown[0],
  );
  const insightLines = data.insights.slice(0, 3).map(i => `${i.title}: ${i.description}`);

  return [
    `This school monitors ${data.totalStudents} students with ${data.totalRecords} BMI evaluations in the selected period.`,
    `Average BMI is ${Number.isFinite(data.avgBMI) ? data.avgBMI.toFixed(1) : 'N/A'}. ${data.healthyCount} students (${data.healthyPercent}%) are in the healthy range; ${data.atRiskCount} (${data.atRiskPercent}%) are underweight, overweight, or obese.`,
    topCategory
      ? `The most common BMI category is ${topCategory.name} (${topCategory.value} students).`
      : '',
    data.evaluationsToday > 0
      ? `${data.evaluationsToday} evaluation(s) were recorded today.`
      : '',
    ...insightLines,
    'Recommend continuing regular screenings, promoting balanced nutrition and daily physical activity, and prioritizing follow-up for students outside the healthy BMI range.',
  ].filter(Boolean).join(' ');
}

export async function generateAIReport(data: unknown, type: 'general' | 'individual') {
  const client = getAIClient();
  const payload =
    type === 'individual' && data && typeof data === 'object' && 'student' in data && 'history' in data
      ? {
          student: (data as IndividualReportData).student,
          history: getValidRecordsForReport((data as IndividualReportData).history),
        }
      : data;
  const serialized = serializeForAI(payload);
  const prompt = type === 'general'
    ? `Analyze this school health data and provide a concise summary report (max 300 words). 
       Include: 
       1. Overall health status of the student population.
       2. Key trends (e.g., most common BMI category).
       3. Recommendations for school health programs.
       Data: ${JSON.stringify(serialized)}`
    : `Analyze this student's BMI history and provide a personalized health summary (max 200 words).
       Include:
       1. Current status and progress.
       2. Specific health advice for the student/parents.
       Student Data: ${JSON.stringify(serialized)}`;

  if (!client) {
    console.warn('GEMINI_API_KEY is missing or invalid — using rule-based report summary.');
    return type === 'general'
      ? buildGeneralReportFallback(data as DashboardData)
      : buildIndividualReportFallback(data as IndividualReportData);
  }

  try {
    const response = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
    });
    const text = response.text?.trim();
    if (text) return text;
  } catch (error) {
    console.error('AI Generation failed:', error);
  }

  return type === 'general'
    ? buildGeneralReportFallback(data as DashboardData)
    : buildIndividualReportFallback(data as IndividualReportData);
}

function parseJsonArray<T>(text: string): T[] | null {
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as T[];
  } catch {
    return null;
  }
}

function normalizeInsightType(value: string | undefined): DashboardInsight['type'] {
  if (value === 'alert' || value === 'success' || value === 'trend') return value;
  return 'trend';
}

function parseDashboardInsights(text: string): DashboardInsight[] | null {
  const parsed = parseJsonArray<{ type?: string; title?: string; description?: string }>(text);
  if (!parsed?.length) return null;

  const insights = parsed
    .slice(0, 3)
    .map((item) => ({
      type: normalizeInsightType(item.type),
      title: (item.title || '').trim() || 'Insight',
      description: (item.description || '').trim(),
    }))
    .filter((item) => item.description.length > 0);

  return insights.length > 0 ? insights : null;
}

function buildDashboardInsightsFallback(data: DashboardData): DashboardInsight[] {
  const insights: DashboardInsight[] = [];

  if (data.trendData.length >= 4) {
    const mid = Math.floor(data.trendData.length / 2);
    const firstHalf = data.trendData.slice(0, mid);
    const secondHalf = data.trendData.slice(mid);
    const avgFirst = firstHalf.reduce((s, d) => s + d.bmi, 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((s, d) => s + d.bmi, 0) / secondHalf.length;
    const trendIncreasing = avgSecond > avgFirst;
    const trendPercent =
      avgFirst > 0 ? Math.abs(Math.round(((avgSecond - avgFirst) / avgFirst) * 1000) / 10) : 0;

    insights.push({
      type: 'trend',
      title: trendIncreasing ? 'BMI trend is increasing' : 'BMI trend is stable or improving',
      description: trendIncreasing
        ? `Average BMI increased by ${trendPercent}% in the selected period.`
        : 'Average BMI decreased or held steady over the selected period.',
    });
  }

  insights.push({
    type: 'alert',
    title: `${data.atRiskCount} student${data.atRiskCount !== 1 ? 's' : ''} need monitoring`,
    description: 'Focus on nutrition and physical activity programs.',
  });

  insights.push({
    type: 'success',
    title: `${data.healthyPercent}% of students are healthy`,
    description: 'Keep promoting healthy lifestyle habits across all grades.',
  });

  return insights;
}

function buildDashboardInsightsSnapshot(data: DashboardData) {
  return {
    totalStudents: data.totalStudents,
    activeStudents: data.activeStudents,
    totalRecords: data.totalRecords,
    avgBMI: data.avgBMI,
    healthyCount: data.healthyCount,
    healthyPercent: data.healthyPercent,
    atRiskCount: data.atRiskCount,
    atRiskPercent: data.atRiskPercent,
    evaluationsToday: data.evaluationsToday,
    studentGrowthPercent: data.studentGrowthPercent,
    healthStatusBreakdown: data.healthStatusBreakdown,
    genderData: data.genderData,
    gradeData: data.gradeData,
    gradeBMIData: data.gradeBMIData,
    trendData: data.trendData,
  };
}

export async function generateDashboardInsights(
  data: DashboardData,
): Promise<{ insights: DashboardInsight[]; source: 'ai' | 'fallback' }> {
  const fallback = (): { insights: DashboardInsight[]; source: 'fallback' } => ({
    insights: data.insights?.length ? data.insights : buildDashboardInsightsFallback(data),
    source: 'fallback',
  });

  const client = getAIClient();
  if (!client) {
    console.warn('GEMINI_API_KEY is missing or invalid — using rule-based dashboard insights.');
    return fallback();
  }

  const snapshot = buildDashboardInsightsSnapshot(data);
  const prompt = `You are a school health analyst for a Filipino daycare BMI monitoring system.
Analyze this population health snapshot and return EXACTLY 3 actionable insights for administrators.

Return ONLY a JSON array of 3 objects with this shape:
[{"type":"trend"|"alert"|"success","title":"short headline","description":"1-2 sentences"}]

Rules:
- "trend" = patterns over time or average BMI movement
- "alert" = risks, at-risk students, or urgent follow-ups
- "success" = positive outcomes or healthy population highlights
- Use specific numbers from the data
- Practical for school staff and parents; warm professional tone
- Title max 12 words; description max 45 words
- No markdown, no extra text

Data: ${JSON.stringify(snapshot)}`;

  try {
    const response = await client.models.generateContent({
      model: GEMINI_MODEL,
      contents: prompt,
    });
    const parsed = parseDashboardInsights(response.text || '');
    if (parsed) return { insights: parsed, source: 'ai' };
  } catch (error) {
    console.error('Dashboard insights generation failed:', error);
  }

  return fallback();
}

export interface GenerateMealPlanInput {
  student: Student;
  latestBmi: number;
  category: string;
  allergies: string[];
  /** Latest evaluation health issues — merged with profile alerts when generating meals. */
  healthIssues?: string[];
  age: number;
  periodType: 'weekly' | 'monthly';
}

function normalizeBmiCategory(category: string): 'Underweight' | 'Healthy' | 'Overweight' | 'Obese' {
  const c = (category || '').toLowerCase();
  if (c.includes('under')) return 'Underweight';
  if (c.includes('obese')) return 'Obese';
  if (c.includes('over')) return 'Overweight';
  // Treat "normal" as healthy
  return 'Healthy';
}

function getLifestyleSuggestions(category: 'Underweight' | 'Healthy' | 'Overweight' | 'Obese'): string[] {
  switch (category) {
    case 'Underweight':
      return [
        'Sleep 10–12 hours tonight to support growth.',
        'Add 1 extra merienda (healthy snack) today.',
        'Drink milk or yogurt daily for extra calories and calcium.',
        'Include peanut-free (if allergic) healthy fats like avocado or olive oil.',
        'Do light outdoor play (20–30 minutes) to build appetite.',
      ];
    case 'Overweight':
      return [
        'Do at least 60 minutes of active play today (run, dance, jump).',
        'Drink water instead of juice or soft drinks.',
        'Limit screen time and take movement breaks every hour.',
        'Choose fruits for merienda instead of sugary snacks.',
        'Sleep 10–12 hours to help regulate appetite and energy.',
      ];
    case 'Obese':
      return [
        'Do at least 60 minutes of active play today (break it into 2–3 sessions).',
        'Drink water all day; avoid sugary drinks.',
        'Use smaller rice portions and add more vegetables.',
        'Take a short family walk after dinner.',
        'Sleep 10–12 hours and keep a consistent bedtime.',
      ];
    case 'Healthy':
    default:
      return [
        'Keep a consistent bedtime and sleep 10–12 hours.',
        'Play outside for at least 30–60 minutes today.',
        'Drink enough water (6–8 small glasses).',
        'Eat fruits and vegetables at least twice today.',
        'Limit sweets to special treats and keep portions child-sized.',
      ];
  }
}

export function getLifestyleSuggestionsForCategory(
  category: string,
  restrictions: string[] = [],
): string[] {
  const tips = getLifestyleSuggestions(normalizeBmiCategory(category));
  return filterLifestyleTipsForRestrictions(tips, restrictions);
}

function buildCategoryGuidance(
  normalized: ReturnType<typeof normalizeBmiCategory>,
  restrictions: string[],
): string {
  const noEgg = restrictions.some(r => /egg/i.test(r));
  const noDairy = restrictions.some(r => /dairy|milk/i.test(r));
  const noShellfish = restrictions.some(r => /shellfish|shrimp/i.test(r));

  if (normalized === 'Underweight') {
    const energyFoods = [
      !noEgg && 'lugaw with chicken and egg',
      'arroz caldo with chicken',
      !noDairy && 'champorado with gatas',
      'champorado with coconut milk',
      !noDairy && 'sopas with evaporated milk',
      'ginataang kalabasa',
      !noShellfish && 'ginataang hipon',
    ].filter(Boolean).join(', ');

    return `This child is UNDERWEIGHT. The meal plan should:
- Focus on calorie-dense, nutrient-rich Filipino dishes to help the child gain healthy weight.
- Include energy-boosting foods like: ${energyFoods || 'rice, chicken, and coconut-based dishes'}.
- Add extra rice portions where appropriate.
- Respect all health alerts — never include forbidden allergens.`;
  }

  if (normalized === 'Overweight' || normalized === 'Obese') {
    return `This child is ${normalized.toUpperCase()}. The meal plan should:
- Focus on balanced, portion-controlled Filipino dishes with more vegetables and lean protein.
- Prefer steamed/boiled dishes over fried (nilagang baka over crispy pata, pinakbet over fried lumpia).
- Use brown rice or reduce rice portions, increase vegetable sides.
- Reduce sugary merienda — use fresh fruits instead of kakanin or fried snacks.
- Respect all health alerts — never include forbidden allergens.`;
  }

  return `This child has a HEALTHY/NORMAL BMI. The meal plan should:
- Maintain balanced, nutritious Filipino dishes with proper portions.
- Include a good variety of proteins, vegetables, and carbohydrates.
- Respect all health alerts — never include forbidden allergens.`;
}

export async function generateMealPlan(input: GenerateMealPlanInput): Promise<MealPlanDay[]> {
  const dayCount = input.periodType === 'weekly' ? 5 : 20;
  const restrictions = collectDietaryRestrictions(input.student, input.healthIssues);
  const dietaryBlock = buildDietaryRestrictionPrompt(restrictions);

  const normalized = normalizeBmiCategory(input.category);
  const categoryGuidance = buildCategoryGuidance(normalized, restrictions);

  const prompt = `You are a Filipino child nutritionist creating a meal plan for PARENTS. Create a ${input.periodType} plan for a ${input.age}-year-old Filipino child named ${input.student.name}.
BMI: ${input.latestBmi} (${input.category}).

${dietaryBlock}

${categoryGuidance}

Return ONLY a JSON array of exactly ${dayCount} objects with this shape:
[{"dayLabel":"Monday","breakfast":"...","amSnack":"...","lunch":"...","pmSnack":"...","dinner":"..."}]

CRITICAL RULES:
- HEALTH ALERTS ARE THE TOP PRIORITY: if a dish contains any forbidden allergen, do not include it — pick another Filipino dish.
- ALL meals MUST be authentic Filipino dishes that a Filipino child would actually eat.
- breakfast, amSnack, lunch, and pmSnack are typically served at school/daycare; dinner is the main evening meal at HOME for parents to prepare.
- Every "dinner" MUST be a proper Filipino ulam with rice (not a light snack). pmSnack stays a light merienda; dinner is separate and heartier.
- Use real Filipino dish names (e.g., Lugaw, Champorado, Sinigang, Tinola, Adobo, Pinakbet, Nilagang baka, Inihaw na isda, Paksiw, Bistek, Tortang talong, Pancit, Ginataan).
- Every single day MUST have DIFFERENT meals — NO repetition of the same dish across days. Each breakfast, amSnack, lunch, pmSnack, and dinner must be unique across the entire plan.
- Portions should be child-appropriate.
- Do NOT include per-day lifestyle tips in the JSON — meals only.
- For monthly plans use labels like "Week 1 - Mon", "Week 1 - Tue", etc.
- No markdown, no explanation, only the JSON array`;

  const client = getAIClient();
  if (client) {
    try {
      const response = await client.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
      });
      const parsed = parseJsonArray<MealPlanDay>(response.text || '');
      if (parsed && parsed.length > 0) {
        const meals = parsed.map(d => ({
          dayLabel: d.dayLabel || 'Day',
          breakfast: d.breakfast || '',
          amSnack: d.amSnack || '',
          lunch: d.lunch || '',
          pmSnack: d.pmSnack || '',
          dinner: d.dinner || '',
        }));
        return sanitizeMealPlanDays(meals, restrictions);
      }
    } catch (error) {
      console.error('Meal plan generation failed:', error);
    }
  }

  const weeklyFallbackByCategory: Record<typeof normalized, MealPlanDay[]> = {
    Underweight: [
      { dayLabel: 'Monday', breakfast: 'Champorado with gatas at peanut butter', amSnack: 'Banana cue', lunch: 'Sinigang na baboy with extra rice', pmSnack: 'Palitaw', dinner: 'Inihaw na manok with rice and buttered corn' },
      { dayLabel: 'Tuesday', breakfast: 'Pandesal with egg and cheese', amSnack: 'Saging na saba with milk', lunch: 'Chicken Tinola with rice + extra malunggay', pmSnack: 'Biko', dinner: 'Beef bulalo soup with rice and kamote' },
      { dayLabel: 'Wednesday', breakfast: 'Arroz Caldo with egg', amSnack: 'Turon', lunch: 'Ginataang kalabasa with chicken and rice', pmSnack: 'Pan de coco', dinner: 'Pork menudo with rice' },
      { dayLabel: 'Thursday', breakfast: 'Lugaw with tokwa and egg', amSnack: 'Kamote cue', lunch: 'Adobong manok with rice', pmSnack: 'Leche flan (small portion)', dinner: 'Fried tilapia with rice and ensaladang talong' },
      { dayLabel: 'Friday', breakfast: 'Sopas with evaporated milk', amSnack: 'Pandesal with spreads', lunch: 'Nilagang baka with rice', pmSnack: 'Fruit salad with yogurt', dinner: 'Spaghetti with meat sauce and cheese' },
    ],
    Healthy: [
      { dayLabel: 'Monday', breakfast: 'Pandesal with cheese', amSnack: 'Banana', lunch: 'Chicken Tinola with rice', pmSnack: 'Turon', dinner: 'Sinigang na bangus with rice' },
      { dayLabel: 'Tuesday', breakfast: 'Lugaw with egg', amSnack: 'Saging na saba', lunch: 'Pinakbet with rice and fish', pmSnack: 'Biko (small portion)', dinner: 'Pork adobo with rice and steamed okra' },
      { dayLabel: 'Wednesday', breakfast: 'Arroz Caldo', amSnack: 'Fruit cup', lunch: 'Adobong manok with rice', pmSnack: 'Camote cue', dinner: 'Grilled chicken with rice and ginisang repolyo' },
      { dayLabel: 'Thursday', breakfast: 'Champorado with milk', amSnack: 'Mais con yelo (small)', lunch: 'Sinigang na isda with rice', pmSnack: 'Puto', dinner: 'Nilagang manok with rice and pechay' },
      { dayLabel: 'Friday', breakfast: 'Sopas', amSnack: 'Pandesal', lunch: 'Ginisang monggo with rice', pmSnack: 'Fresh mango slices', dinner: 'Inihaw na tilapia with rice and cucumber salad' },
    ],
    Overweight: [
      { dayLabel: 'Monday', breakfast: 'Oatmeal champorado (less sugar)', amSnack: 'Apple slices', lunch: 'Chicken Tinola (more veggies) with small rice', pmSnack: 'Saging na saba', dinner: 'Steamed fish with rice and pinakbet' },
      { dayLabel: 'Tuesday', breakfast: 'Pandesal with egg (no mayo)', amSnack: 'Papaya slices', lunch: 'Pinakbet with grilled fish and small rice', pmSnack: 'Watermelon', dinner: 'Tinolang manok (light) with small rice' },
      { dayLabel: 'Wednesday', breakfast: 'Lugaw with chicken (light)', amSnack: 'Banana', lunch: 'Sinigang na hipon with vegetables + small rice', pmSnack: 'Cucumber sticks', dinner: 'Ginisang sitaw with grilled tilapia and small rice' },
      { dayLabel: 'Thursday', breakfast: 'Arroz caldo (lean chicken)', amSnack: 'Orange slices', lunch: 'Nilagang baka (lean) with lots of gulay + small rice', pmSnack: 'Boiled corn', dinner: 'Paksiw na isda with rice and steamed kangkong' },
      { dayLabel: 'Friday', breakfast: 'Tortang talong (less oil)', amSnack: 'Pineapple slices', lunch: 'Ginisang monggo (less chicharon) + small rice', pmSnack: 'Yogurt (unsweetened)', dinner: 'Chicken afritada (light) with small rice' },
    ],
    Obese: [
      { dayLabel: 'Monday', breakfast: 'Lugaw with chicken (light)', amSnack: 'Banana', lunch: 'Chicken Tinola (more veggies) with small rice', pmSnack: 'Apple slices', dinner: 'Steamed bangus with rice and boiled vegetables' },
      { dayLabel: 'Tuesday', breakfast: 'Tortang talong (less oil)', amSnack: 'Papaya slices', lunch: 'Pinakbet with grilled fish and small rice', pmSnack: 'Watermelon', dinner: 'Sinigang na isda with extra gulay and small rice' },
      { dayLabel: 'Wednesday', breakfast: 'Oatmeal with fruit', amSnack: 'Orange slices', lunch: 'Sinigang na isda with vegetables + small rice', pmSnack: 'Boiled corn', dinner: 'Inihaw na tilapia with rice and fresh tomato salad' },
      { dayLabel: 'Thursday', breakfast: 'Arroz caldo (lean chicken)', amSnack: 'Pineapple slices', lunch: 'Nilagang baka (lean) with lots of gulay + small rice', pmSnack: 'Cucumber sticks', dinner: 'Ginisang monggo with malunggay and small rice' },
      { dayLabel: 'Friday', breakfast: 'Champorado (less sugar, small)', amSnack: 'Guava slices', lunch: 'Ginisang monggo (no chicharon) + small rice', pmSnack: 'Yogurt (unsweetened)', dinner: 'Tortang talong with small rice and side salad' },
    ],
  };

  const weeklyFallback = sanitizeMealPlanDays(
    weeklyFallbackByCategory[normalized],
    restrictions,
  );

  if (input.periodType === 'weekly') return weeklyFallback;

  // For monthly, cycle through varied days
  const monthlyLabels = Array.from({ length: 20 }, (_, i) => {
    const week = Math.floor(i / 5) + 1;
    const day = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][i % 5];
    return `Week ${week} - ${day}`;
  });
  return sanitizeMealPlanDays(
    monthlyLabels.map((label, i) => ({
      ...weeklyFallback[i % 5],
      dayLabel: label,
    })),
    restrictions,
  );
}

export interface GenerateMealPlanComparisonInput {
  student: Student;
  plan: MealPlan;
  previousBmi: number;
  currentBmi: number;
  previousCategory: string;
  currentCategory: string;
}

export async function generateMealPlanComparison(input: GenerateMealPlanComparisonInput): Promise<string> {
  const prompt = `You are a daycare health nutritionist. A student had a meal plan based on baseline BMI ${input.previousBmi} (${input.previousCategory}).
Current BMI is ${input.currentBmi} (${input.currentCategory}). Plan period: ${input.plan.startDate} to ${input.plan.endDate}.

Student: ${input.student.name}, age context in allergies: ${input.student.allergies?.join(', ') || 'none'}.

Write a concise progress narrative (max 150 words) covering:
1. Whether BMI/category improved, stayed same, or worsened
2. Specific meal plan adjustment recommendations for the next period
3. Encouraging tone for staff and parents`;

  const client = getAIClient();
  if (client) {
    try {
      const response = await client.models.generateContent({
        model: GEMINI_MODEL,
        contents: prompt,
      });
      const text = response.text?.trim();
      if (text) return text;
    } catch (error) {
      console.error('Meal plan comparison failed:', error);
    }
  }

  const delta = input.currentBmi - input.previousBmi;
  const direction = delta < 0 ? 'decreased' : delta > 0 ? 'increased' : 'remained stable';
  return `BMI ${direction} from ${input.previousBmi} to ${input.currentBmi}. Category: ${input.previousCategory} → ${input.currentCategory}. Review portions and activity levels; consider generating an updated meal plan aligned with the current BMI category.`;
}
