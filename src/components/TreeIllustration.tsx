import { AnimatePresence, motion } from "motion/react";
import type { stages } from "@/store/useGrowthStore";

type TreeStage = (typeof stages)[number] & { index: number };

type TreeIllustrationProps = {
  stage: TreeStage;
  progress: number;
  celebrate: boolean;
};

export function TreeIllustration({ stage, progress, celebrate }: TreeIllustrationProps) {
  const index = stage.index;
  const showTrunk = index >= 2;
  const showBranches = index >= 3;
  const showBloom = index >= 5;
  const leafCount = [0, 4, 10, 18, 28, 36][index] ?? 8;
  const scale = 0.62 + index * 0.08 + progress / 1000;

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[390px] overflow-hidden rounded-lg bg-gradient-to-b from-sky-100 via-emerald-50 to-amber-50">
      <div className="absolute inset-x-8 bottom-10 h-8 rounded-[100%] bg-emerald-900/10 blur-sm" />
      <motion.svg
        viewBox="0 0 360 360"
        className="absolute inset-0 h-full w-full"
        initial={false}
        animate={{ scale }}
        transition={{ type: "spring", stiffness: 90, damping: 18 }}
      >
        <defs>
          <linearGradient id="trunk" x1="0" x2="1">
            <stop offset="0%" stopColor="#5d4037" />
            <stop offset="55%" stopColor="#8d6e63" />
            <stop offset="100%" stopColor="#4e342e" />
          </linearGradient>
          <radialGradient id="leaf" cx="45%" cy="35%">
            <stop offset="0%" stopColor="#bbf7d0" />
            <stop offset="60%" stopColor="#22c55e" />
            <stop offset="100%" stopColor="#166534" />
          </radialGradient>
          <radialGradient id="petal" cx="45%" cy="35%">
            <stop offset="0%" stopColor="#fff7ed" />
            <stop offset="70%" stopColor="#fb923c" />
            <stop offset="100%" stopColor="#f97316" />
          </radialGradient>
        </defs>

        <motion.ellipse cx="180" cy="308" rx="82" ry="18" fill="#365314" opacity="0.12" />

        {index === 0 && (
          <motion.g initial={{ y: 12, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
            <ellipse cx="180" cy="286" rx="22" ry="14" fill="#8d6e63" />
            <path d="M160 286 C170 272 188 272 200 286 C190 298 170 298 160 286Z" fill="#5d4037" opacity="0.6" />
          </motion.g>
        )}

        {index >= 1 && (
          <motion.path
            d="M180 292 C170 260 171 235 184 210"
            stroke="#2f7d32"
            strokeWidth={index === 1 ? 8 : 6}
            strokeLinecap="round"
            fill="none"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.7 }}
          />
        )}

        {showTrunk && (
          <motion.path
            d="M156 302 C162 250 165 205 175 160 C184 202 196 248 204 302Z"
            fill="url(#trunk)"
            initial={{ scaleY: 0.2, originY: "85%" }}
            animate={{ scaleY: 1 }}
            transition={{ duration: 0.8 }}
          />
        )}

        {showBranches && (
          <motion.g stroke="#6d4c41" strokeLinecap="round" fill="none" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <path d="M178 205 C145 186 130 158 108 128" strokeWidth="10" />
            <path d="M184 200 C217 178 234 148 258 116" strokeWidth="10" />
            <path d="M176 170 C152 150 141 125 126 96" strokeWidth="7" />
            <path d="M186 166 C209 144 218 116 232 86" strokeWidth="7" />
          </motion.g>
        )}

        {Array.from({ length: leafCount }).map((_, i) => {
          const angle = (i / leafCount) * Math.PI * 2;
          const cluster = i % 4;
          const cx = [126, 232, 180, 108][cluster] ?? 180;
          const cy = [118, 108, 78, 156][cluster] ?? 120;
          const x = cx + Math.cos(angle) * (18 + (i % 3) * 7);
          const y = cy + Math.sin(angle) * (14 + (i % 4) * 5);
          return (
            <motion.ellipse
              key={i}
              cx={x}
              cy={y}
              rx={8 + (i % 3)}
              ry={13 + (i % 4)}
              fill={showBloom && i % 6 === 0 ? "url(#petal)" : "url(#leaf)"}
              opacity="0.92"
              initial={{ scale: 0, rotate: -20 }}
              animate={{ scale: 1, rotate: (i % 2 ? 18 : -14) }}
              transition={{ delay: i * 0.015, duration: 0.35 }}
            />
          );
        })}
      </motion.svg>

      <AnimatePresence>
        {celebrate && (
          <motion.div
            className="pointer-events-none absolute inset-0"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {Array.from({ length: 12 }).map((_, i) => (
              <motion.span
                key={i}
                className="absolute h-2 w-2 rounded-full bg-amber-300 shadow-[0_0_18px_rgba(251,191,36,0.75)]"
                style={{ left: `${28 + (i * 37) % 46}%`, top: `${22 + (i * 19) % 44}%` }}
                initial={{ y: 12, scale: 0 }}
                animate={{ y: -24 - (i % 4) * 8, scale: [0, 1, 0] }}
                transition={{ duration: 0.9, delay: i * 0.03 }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
