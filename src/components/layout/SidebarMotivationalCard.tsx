import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Heart } from 'lucide-react';

const ROTATING_MESSAGES = [
  { line1: 'Healthy kids,', line2: 'brighter future!' },
  { line1: 'Growing strong,', line2: 'every single day.' },
  { line1: 'Nutrition first,', line2: 'joyful learners.' },
  { line1: 'Small steps today,', line2: 'big wins tomorrow.' },
  { line1: 'Care today,', line2: 'thrive tomorrow.' },
] as const;

const ROTATE_MS = 3000;

export function SidebarMotivationalCard() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % ROTATING_MESSAGES.length);
    }, ROTATE_MS);
    return () => window.clearInterval(timer);
  }, []);

  const message = ROTATING_MESSAGES[index];

  return (
    <div className="[@media(max-height:720px)]:hidden p-5 rounded-[24px] bg-[#fffbeb] border border-[#fef3c7] shadow-sm">
      <div className="flex gap-3 items-start">
        <Heart className="w-5 h-5 text-[#f87171] fill-[#fecaca]/20 shrink-0 mt-0.5" />
        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
          <div className="relative h-[2.75rem] overflow-hidden">
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.45, ease: [0.4, 0, 0.2, 1] }}
                className="absolute inset-0 flex flex-col gap-0.5"
              >
                <p className="font-bold text-[#1e2a44] text-[13px] leading-tight">
                  {message.line1}
                </p>
                <p className="font-bold text-[#1e2a44] text-[13px] leading-tight">
                  {message.line2}
                </p>
              </motion.div>
            </AnimatePresence>
          </div>
          <p className="text-[11px] font-semibold text-[#6b7a99] mt-2">
            Track. Care. Grow.
          </p>
        </div>
      </div>
    </div>
  );
}
