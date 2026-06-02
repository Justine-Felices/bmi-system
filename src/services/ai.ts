import { GoogleGenAI } from '@google/genai';
import type { MealPlan, MealPlanDay, Student } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function generateAIReport(data: unknown, type: 'general' | 'individual') {
  const prompt = type === 'general'
    ? `Analyze this school health data and provide a concise summary report (max 300 words). 
       Include: 
       1. Overall health status of the student population.
       2. Key trends (e.g., most common BMI category).
       3. Recommendations for school health programs.
       Data: ${JSON.stringify(data)}`
    : `Analyze this student's BMI history and provide a personalized health summary (max 200 words).
       Include:
       1. Current status and progress.
       2. Specific health advice for the student/parents.
       Student Data: ${JSON.stringify(data)}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text;
  } catch (error) {
    console.error('AI Generation failed:', error);
    return 'Unable to generate AI analysis at this time.';
  }
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

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
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

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
    });
    return response.text || 'Unable to generate comparison summary.';
  } catch (error) {
    console.error('Meal plan comparison failed:', error);
    const delta = input.currentBmi - input.previousBmi;
    const direction = delta < 0 ? 'decreased' : delta > 0 ? 'increased' : 'remained stable';
    return `BMI ${direction} from ${input.previousBmi} to ${input.currentBmi}. Category: ${input.previousCategory} → ${input.currentCategory}. Review portions and activity levels; consider generating an updated meal plan aligned with the current BMI category.`;
  }
}
