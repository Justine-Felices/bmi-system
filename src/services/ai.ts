import { GoogleGenAI } from '@google/genai';
import { format } from 'date-fns';
import type { MealPlan, MealPlanDay, Student, BMIRecord, DashboardData } from '../types';
import { getBMICategory, calculateAge } from '../utils/bmi';

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
  const sorted = [...history].sort((a, b) => {
    const ta = a.timestamp?.toDate?.()?.getTime() ?? 0;
    const tb = b.timestamp?.toDate?.()?.getTime() ?? 0;
    return tb - ta;
  });
  const latest = sorted[0];
  if (!latest) {
    return `${student.name} has no BMI evaluations on record yet. Schedule an initial screening to establish a baseline.`;
  }

  const category = getBMICategory(latest.bmi);
  const age = calculateAge(student.dob);
  const issues = latest.healthIssues?.length
    ? latest.healthIssues.join(', ')
    : 'none reported';

  let trend = '';
  if (sorted.length >= 2) {
    const previous = sorted[1];
    const delta = latest.bmi - previous.bmi;
    if (Math.abs(delta) < 0.3) trend = 'BMI has remained relatively stable since the previous evaluation.';
    else if (delta < 0) trend = `BMI decreased by ${Math.abs(delta).toFixed(1)} since the last check (${previous.bmi} → ${latest.bmi}), which is a positive trend if moving toward a healthier range.`;
    else trend = `BMI increased by ${delta.toFixed(1)} since the last check (${previous.bmi} → ${latest.bmi}). Monitor nutrition and activity closely.`;
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
    `Current measurements: ${latest.height} cm, ${latest.weight} kg, BMI ${latest.bmi} (${category.label}).`,
    `Recorded health issues: ${issues}.`,
    trend,
    advice,
    sorted.length > 1
      ? `${sorted.length} evaluations are on file; continue tracking at regular intervals.`
      : 'Only one evaluation is on file; additional measurements will help track progress over time.',
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
    `Average BMI is ${data.avgBMI.toFixed(1)}. ${data.healthyCount} students (${data.healthyPercent}%) are in the healthy range; ${data.atRiskCount} (${data.atRiskPercent}%) are underweight, overweight, or obese.`,
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
  const serialized = serializeForAI(data);
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

export interface GenerateMealPlanInput {
  student: Student;
  latestBmi: number;
  category: string;
  allergies: string[];
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

export function getLifestyleSuggestionsForCategory(category: string): string[] {
  return getLifestyleSuggestions(normalizeBmiCategory(category));
}

export async function generateMealPlan(input: GenerateMealPlanInput): Promise<MealPlanDay[]> {
  const dayCount = input.periodType === 'weekly' ? 5 : 20;
  const allergyNote = input.allergies.length
    ? `STRICTLY avoid: ${input.allergies.join(', ')}.`
    : 'No known allergies.';

  const normalized = normalizeBmiCategory(input.category);
  let categoryGuidance = '';
  if (normalized === 'Underweight') {
    categoryGuidance = `This child is UNDERWEIGHT. The meal plan should:
- Focus on calorie-dense, nutrient-rich Filipino dishes to help the child gain healthy weight.
- Include energy-boosting foods like lugaw with egg, champorado with gatas, arroz caldo, sopas with evaporated milk.
- Add extra rice portions, use dishes with coconut milk (ginataang kalabasa, ginataang hipon).
- Suggestions should focus on: eating more frequent meals, getting enough sleep (10-12 hours), drinking milk, and light physical play.`;
  } else if (normalized === 'Overweight' || normalized === 'Obese') {
    categoryGuidance = `This child is ${normalized.toUpperCase()}. The meal plan should:
- Focus on balanced, portion-controlled Filipino dishes with more vegetables and lean protein.
- Prefer steamed/boiled dishes over fried (nilagang baka over crispy pata, pinakbet over fried lumpia).
- Use brown rice or reduce rice portions, increase vegetable sides.
- Reduce sugary merienda — use fresh fruits instead of kakanin or fried snacks.
- Suggestions should focus on: more physical exercise (at least 60 min/day), outdoor play, drinking water instead of juice, limiting screen time, and getting 10-12 hours of sleep.`;
  } else {
    categoryGuidance = `This child has a HEALTHY/NORMAL BMI. The meal plan should:
- Maintain balanced, nutritious Filipino dishes with proper portions.
- Include a good variety of proteins, vegetables, and carbohydrates.
- Suggestions should focus on: maintaining active lifestyle, regular outdoor play, staying hydrated, and consistent sleep schedule (10-12 hours).`;
  }

  const prompt = `You are a Filipino daycare nutritionist. Create a ${input.periodType} meal plan for a ${input.age}-year-old Filipino child.
BMI: ${input.latestBmi} (${input.category}). ${allergyNote}

${categoryGuidance}

Return ONLY a JSON array of exactly ${dayCount} objects with this shape:
[{"dayLabel":"Monday","breakfast":"...","amSnack":"...","lunch":"...","pmSnack":"...","suggestion":"..."}]

CRITICAL RULES:
- ALL meals MUST be authentic Filipino dishes that a Filipino child would actually eat.
- Use real Filipino dish names (e.g., Lugaw, Champorado, Arroz Caldo, Pandesal with cheese, Tortang talong, Sinigang na baboy, Tinola, Adobo, Ginisang monggo, Pinakbet, Nilagang baka, Ginisang ampalaya, Bistek Tagalog, Pancit canton, Lumpiang gulay, Ginataang kalabasa, Turon, Banana cue, Kamote cue, Saging na saba with milk, Biko, Palitaw, Sopas).
- Every single day MUST have DIFFERENT meals — absolutely NO repetition of the same dish across days. Each breakfast, lunch, amSnack, and pmSnack must be unique across the entire plan.
- Include a mix of ulam, sabaw, gulay, merienda, and kakanin.
- Portions should be child-appropriate for daycare.
- The "suggestion" field MUST contain a short, actionable daily lifestyle tip for the child based on their BMI category (e.g., "Sleep at least 10 hours tonight", "Play outside for 30 minutes after school", "Drink 6 glasses of water today", "Do stretching exercises before bedtime", "Eat slowly and chew food well"). Each day's suggestion should be DIFFERENT.
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
        return parsed.map(d => ({
          dayLabel: d.dayLabel || 'Day',
          breakfast: d.breakfast || '',
          amSnack: d.amSnack || '',
          lunch: d.lunch || '',
          pmSnack: d.pmSnack || '',
          suggestion: d.suggestion || '',
        }));
      }
    } catch (error) {
      console.error('Meal plan generation failed:', error);
    }
  }

  // Fallback with BMI-aware suggestions
  const tips = getLifestyleSuggestions(normalized);

  const weeklyFallbackByCategory: Record<typeof normalized, MealPlanDay[]> = {
    Underweight: [
      { dayLabel: 'Monday', breakfast: 'Champorado with gatas at peanut butter', amSnack: 'Banana cue', lunch: 'Sinigang na baboy with extra rice', pmSnack: 'Palitaw', suggestion: tips[0] },
      { dayLabel: 'Tuesday', breakfast: 'Pandesal with egg and cheese', amSnack: 'Saging na saba with milk', lunch: 'Chicken Tinola with rice + extra malunggay', pmSnack: 'Biko', suggestion: tips[1] },
      { dayLabel: 'Wednesday', breakfast: 'Arroz Caldo with egg', amSnack: 'Turon', lunch: 'Ginataang kalabasa with chicken and rice', pmSnack: 'Pan de coco', suggestion: tips[2] },
      { dayLabel: 'Thursday', breakfast: 'Lugaw with tokwa and egg', amSnack: 'Kamote cue', lunch: 'Adobong manok with rice', pmSnack: 'Leche flan (small portion)', suggestion: tips[3] },
      { dayLabel: 'Friday', breakfast: 'Sopas with evaporated milk', amSnack: 'Pandesal with peanut-free spreads (if allergic)', lunch: 'Nilagang baka with rice', pmSnack: 'Fruit salad (with yogurt)', suggestion: tips[4] },
    ],
    Healthy: [
      { dayLabel: 'Monday', breakfast: 'Pandesal with cheese', amSnack: 'Banana', lunch: 'Chicken Tinola with rice', pmSnack: 'Turon', suggestion: tips[0] },
      { dayLabel: 'Tuesday', breakfast: 'Lugaw with egg', amSnack: 'Saging na saba', lunch: 'Pinakbet with rice and fish', pmSnack: 'Biko (small portion)', suggestion: tips[1] },
      { dayLabel: 'Wednesday', breakfast: 'Arroz Caldo', amSnack: 'Fruit cup', lunch: 'Adobong manok with rice', pmSnack: 'Camote cue', suggestion: tips[2] },
      { dayLabel: 'Thursday', breakfast: 'Champorado with milk', amSnack: 'Mais con yelo (small)', lunch: 'Sinigang na isda with rice', pmSnack: 'Puto', suggestion: tips[3] },
      { dayLabel: 'Friday', breakfast: 'Sopas', amSnack: 'Pandesal', lunch: 'Ginisang monggo with rice', pmSnack: 'Fresh mango slices', suggestion: tips[4] },
    ],
    Overweight: [
      { dayLabel: 'Monday', breakfast: 'Oatmeal champorado (less sugar)', amSnack: 'Apple slices', lunch: 'Chicken Tinola (more veggies) with small rice', pmSnack: 'Saging na saba', suggestion: tips[0] },
      { dayLabel: 'Tuesday', breakfast: 'Pandesal with egg (no mayo)', amSnack: 'Papaya slices', lunch: 'Pinakbet with grilled fish and small rice', pmSnack: 'Watermelon', suggestion: tips[1] },
      { dayLabel: 'Wednesday', breakfast: 'Lugaw with chicken (light)', amSnack: 'Banana', lunch: 'Sinigang na hipon with vegetables + small rice', pmSnack: 'Cucumber sticks with dip', suggestion: tips[2] },
      { dayLabel: 'Thursday', breakfast: 'Arroz caldo (lean chicken)', amSnack: 'Orange slices', lunch: 'Nilagang baka (lean) with lots of gulay + small rice', pmSnack: 'Boiled corn', suggestion: tips[3] },
      { dayLabel: 'Friday', breakfast: 'Tortang talong (less oil)', amSnack: 'Pineapple slices', lunch: 'Ginisang monggo (less chicharon) + small rice', pmSnack: 'Yogurt (unsweetened)', suggestion: tips[4] },
    ],
    Obese: [
      { dayLabel: 'Monday', breakfast: 'Lugaw with chicken (light)', amSnack: 'Banana', lunch: 'Chicken Tinola (more veggies) with small rice', pmSnack: 'Apple slices', suggestion: tips[0] },
      { dayLabel: 'Tuesday', breakfast: 'Tortang talong (less oil)', amSnack: 'Papaya slices', lunch: 'Pinakbet with grilled fish and small rice', pmSnack: 'Watermelon', suggestion: tips[1] },
      { dayLabel: 'Wednesday', breakfast: 'Oatmeal with fruit', amSnack: 'Orange slices', lunch: 'Sinigang na isda with vegetables + small rice', pmSnack: 'Boiled corn', suggestion: tips[2] },
      { dayLabel: 'Thursday', breakfast: 'Arroz caldo (lean chicken)', amSnack: 'Pineapple slices', lunch: 'Nilagang baka (lean) with lots of gulay + small rice', pmSnack: 'Cucumber sticks', suggestion: tips[3] },
      { dayLabel: 'Friday', breakfast: 'Champorado (less sugar, small)', amSnack: 'Guava slices', lunch: 'Ginisang monggo (no chicharon) + small rice', pmSnack: 'Yogurt (unsweetened)', suggestion: tips[4] },
    ],
  };

  const weeklyFallback = weeklyFallbackByCategory[normalized];

  if (input.periodType === 'weekly') return weeklyFallback;

  // For monthly, cycle through varied days
  const monthlyLabels = Array.from({ length: 20 }, (_, i) => {
    const week = Math.floor(i / 5) + 1;
    const day = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'][i % 5];
    return `Week ${week} - ${day}`;
  });
  return monthlyLabels.map((label, i) => ({
    ...weeklyFallback[i % 5],
    dayLabel: label,
  }));
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
