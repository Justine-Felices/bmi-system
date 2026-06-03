import { useEffect, useState } from 'react';

import type { MealPlanDay } from '../../types';

import { Input } from '../ui/Input';

import { MEAL_PLAN_PAGE_SIZE, Pagination } from '../ui/Pagination';



interface MealPlanEditorProps {

  meals: MealPlanDay[];

  onChange: (meals: MealPlanDay[]) => void;

  notes: string;

  onNotesChange: (notes: string) => void;

}



function updateMeal(meals: MealPlanDay[], index: number, field: keyof MealPlanDay, value: string) {

  return meals.map((m, i) => (i === index ? { ...m, [field]: value } : m));

}



export function MealPlanEditor({ meals, onChange, notes, onNotesChange }: MealPlanEditorProps) {

  const [page, setPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(meals.length / MEAL_PLAN_PAGE_SIZE));

  const currentPage = Math.min(page, totalPages);

  const start = (currentPage - 1) * MEAL_PLAN_PAGE_SIZE;

  const visibleMeals = meals.slice(start, start + MEAL_PLAN_PAGE_SIZE);



  useEffect(() => {

    setPage(1);

  }, [meals.length]);



  if (meals.length === 0) return null;



  return (

    <div className="space-y-4">

      <div className="rounded-2xl border border-border overflow-hidden">

        <div className="overflow-x-auto">

          <table className="w-full text-sm min-w-[800px]">

            <thead>

              <tr className="bg-surface text-left">

                <th className="p-3 text-[10px] font-bold text-text-muted uppercase">Day</th>

                <th className="p-3 text-[10px] font-bold text-text-muted uppercase">Breakfast</th>

                <th className="p-3 text-[10px] font-bold text-text-muted uppercase">AM Snack</th>

                <th className="p-3 text-[10px] font-bold text-text-muted uppercase">Lunch</th>

                <th className="p-3 text-[10px] font-bold text-text-muted uppercase">PM Snack</th>

                <th className="p-3 text-[10px] font-bold text-text-muted uppercase">Dinner</th>

                <th className="p-3 text-[10px] font-bold text-text-muted uppercase">Suggestion</th>

              </tr>

            </thead>

            <tbody>

              {visibleMeals.map((day, i) => {

                const mealIndex = start + i;

                const fields = ['breakfast', 'amSnack', 'lunch', 'pmSnack', 'dinner', 'suggestion'] as const;

                return (

                  <tr key={`${day.dayLabel}-${mealIndex}`} className="border-t border-border">

                    <td className="p-2 font-semibold text-text whitespace-nowrap">{day.dayLabel}</td>

                    {fields.map(field => (

                      <td key={field} className="p-2">

                        <Input

                          value={day[field] || ''}

                          onChange={e => onChange(updateMeal(meals, mealIndex, field, e.target.value))}

                          className="h-9 text-xs"

                          placeholder={
                            field === 'suggestion'
                              ? 'e.g., Sleep 10 hrs'
                              : field === 'amSnack' || field === 'pmSnack'
                                ? 'Optional'
                                : 'Required'
                          }

                        />

                      </td>

                    ))}

                  </tr>

                );

              })}

            </tbody>

          </table>

        </div>

        <Pagination

          currentPage={currentPage}

          totalPages={totalPages}

          totalCount={meals.length}

          pageSize={MEAL_PLAN_PAGE_SIZE}

          onPageChange={setPage}

          itemLabel="days"

        />

      </div>



      <div>

        <label className="text-[10px] font-bold text-text-muted uppercase tracking-wider ml-1">Staff Notes</label>

        <textarea

          value={notes}

          onChange={e => onNotesChange(e.target.value)}

          rows={3}

          className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30"

          placeholder="Optional notes for this meal plan..."

        />

      </div>

    </div>

  );

}


