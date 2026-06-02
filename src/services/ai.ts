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

export async function generateMealPlan(input: GenerateMealPlanInput): Promise<MealPlanDay[]> {
  const dayCount = input.periodType === 'weekly' ? 5 : 20;
  const allergyNote = input.allergies.length
    ? `STRICTLY avoid: ${input.allergies.join(', ')}.`
    : 'No known allergies.';

  const portionGuidance = input.category === 'Underweight'
    ? 'Use calorie-dense, nutrient-rich portions appropriate for daycare.'
    : input.category === 'Overweight' || input.category === 'Obese'
      ? 'Use balanced, age-appropriate portions with emphasis on vegetables and lean protein.'
      : 'Use standard balanced daycare portions.';

  const prompt = `You are a daycare nutritionist. Create a ${input.periodType} meal plan for a ${input.age}-year-old child.
BMI: ${input.latestBmi} (${input.category}). ${allergyNote}
${portionGuidance}

Return ONLY a JSON array of exactly ${dayCount} objects with this shape:
[{"dayLabel":"Monday","breakfast":"...","amSnack":"...","lunch":"...","pmSnack":"..."}]

Rules:
- Daycare-appropriate Filipino/international meals suitable for young children
- Include breakfast, lunch; amSnack and pmSnack optional but preferred
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
      }));
    }
  } catch (error) {
    console.error('Meal plan generation failed:', error);
  }

  const fallbackDays = input.periodType === 'weekly'
    ? ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
    : Array.from({ length: 20 }, (_, i) => `Day ${i + 1}`);

  return fallbackDays.map(dayLabel => ({
    dayLabel,
    breakfast: 'Oatmeal with fruit',
    amSnack: 'Apple slices',
    lunch: 'Rice, grilled chicken, vegetables',
    pmSnack: 'Yogurt',
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
