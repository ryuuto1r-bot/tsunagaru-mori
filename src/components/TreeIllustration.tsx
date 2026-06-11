import { useId } from "react";
import { AnimatePresence, motion } from "motion/react";
import type { stages } from "@/store/useGrowthStore";

type TreeStage = (typeof stages)[number] & { index: number };

type TreeIllustrationProps = {
  stage: TreeStage;
  progress: number;
  celebrate: boolean;
};

const canopyGroups = [
  { cx: 154, cy: 146, rx: 58, ry: 42 },
  { cx: 256, cy: 138, rx: 62, ry: 44 },
  { cx: 206, cy: 92, rx: 72, ry: 50 },
  { cx: 116, cy: 198, rx: 48, ry: 36 },
  { cx: 292, cy: 194, rx: 50, ry: 36 },
  { cx: 210, cy: 174, rx: 76, ry: 46 },
];

export function TreeIllustration({ stage, progress, celebrate }: TreeIllustrationProps) {
  const rawId = useId().replace(/:/g, "");
  const index = stage.index;
  const showTrunk = index >= 2;
  const showBranches = index >= 3;
  const showBloom = index >= 5;
  const leafCount = [0, 5, 14, 26, 42, 58][index] ?? 16;
  const sceneScale = 0.74 + index * 0.045 + progress / 1600;

  const ids = {
    sky: `${rawId}-sky`,
    soil: `${rawId}-soil`,
    trunk: `${rawId}-trunk`,
    trunkLight: `${rawId}-trunk-light`,
    bark: `${rawId}-bark`,
    leaf: `${rawId}-leaf`,
    deepLeaf: `${rawId}-deep-leaf`,
    petal: `${rawId}-petal`,
    leafShadow: `${rawId}-leaf-shadow`,
  };

  return (
    <div className="relative mx-auto aspect-square w-full max-w-[420px] overflow-hidden rounded-lg border border-white/60 bg-emerald-50 shadow-inner">
      <motion.svg
        viewBox="0 0 420 420"
        className="absolute inset-0 h-full w-full"
        initial={false}
        animate={{ scale: sceneScale }}
        transition={{ type: "spring", stiffness: 90, damping: 18 }}
      >
        <defs>
          <linearGradient id={ids.sky} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#dbeafe" />
            <stop offset="42%" stopColor="#ecfccb" />
            <stop offset="100%" stopColor="#fef3c7" />
          </linearGradient>
          <linearGradient id={ids.soil} x1="0" x2="1">
            <stop offset="0%" stopColor="#7c5a36" />
            <stop offset="48%" stopColor="#a57945" />
            <stop offset="100%" stopColor="#5f4128" />
          </linearGradient>
          <linearGradient id={ids.trunk} x1="0" x2="1">
            <stop offset="0%" stopColor="#3f261a" />
            <stop offset="34%" stopColor="#795238" />
            <stop offset="66%" stopColor="#9a6a43" />
            <stop offset="100%" stopColor="#3b2519" />
          </linearGradient>
          <linearGradient id={ids.trunkLight} x1="0" x2="1">
            <stop offset="0%" stopColor="#f5d3a5" stopOpacity="0" />
            <stop offset="50%" stopColor="#f5d3a5" stopOpacity="0.45" />
            <stop offset="100%" stopColor="#f5d3a5" stopOpacity="0" />
          </linearGradient>
          <radialGradient id={ids.leaf} cx="35%" cy="26%">
            <stop offset="0%" stopColor="#dcfce7" />
            <stop offset="52%" stopColor="#4ade80" />
            <stop offset="100%" stopColor="#166534" />
          </radialGradient>
          <radialGradient id={ids.deepLeaf} cx="35%" cy="30%">
            <stop offset="0%" stopColor="#86efac" />
            <stop offset="65%" stopColor="#15803d" />
            <stop offset="100%" stopColor="#14532d" />
          </radialGradient>
          <radialGradient id={ids.petal} cx="42%" cy="34%">
            <stop offset="0%" stopColor="#fff7ed" />
            <stop offset="58%" stopColor="#fdba74" />
            <stop offset="100%" stopColor="#fb7185" />
          </radialGradient>
          <filter id={ids.bark} x="-20%" y="-20%" width="140%" height="140%">
            <feTurbulence type="fractalNoise" baseFrequency="0.08 0.7" numOctaves="2" seed="8" result="noise" />
            <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.4" />
          </filter>
          <filter id={ids.leafShadow} x="-40%" y="-40%" width="180%" height="180%">
            <feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#14532d" floodOpacity="0.2" />
          </filter>
        </defs>

        <rect width="420" height="420" fill={`url(#${ids.sky})`} />
        <motion.circle cx="90" cy="70" r="52" fill="#fde68a" opacity="0.4" animate={{ opacity: [0.28, 0.48, 0.28] }} transition={{ duration: 5, repeat: Infinity }} />
        <path d="M0 336 C92 304 139 337 212 315 C292 290 342 314 420 286 L420 420 L0 420Z" fill="#bbf7d0" opacity="0.45" />
        <path d="M0 352 C86 326 146 348 220 332 C292 316 342 338 420 318 L420 420 L0 420Z" fill="#86efac" opacity="0.38" />
        <ellipse cx="210" cy="338" rx="136" ry="30" fill={`url(#${ids.soil})`} opacity="0.86" />
        <ellipse cx="210" cy="336" rx="118" ry="20" fill="#fef3c7" opacity="0.16" />
        <ellipse cx="210" cy="354" rx="94" ry="12" fill="#3f2b19" opacity="0.14" />

        {index === 0 && (
          <motion.g initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
            <ellipse cx="210" cy="316" rx="25" ry="15" fill="#8b5e34" />
            <path d="M187 316 C199 299 220 300 234 316 C222 330 199 331 187 316Z" fill="#4b2f1d" opacity="0.55" />
            <path d="M204 306 C212 311 219 311 226 306" stroke="#f5d3a5" strokeWidth="3" strokeLinecap="round" opacity="0.45" />
          </motion.g>
        )}

        {index >= 1 && !showTrunk && (
          <motion.g initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <motion.path
              d="M210 318 C199 283 202 246 218 214"
              stroke="#2f7d32"
              strokeWidth="9"
              strokeLinecap="round"
              fill="none"
              initial={{ pathLength: 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.8 }}
            />
            <ellipse cx="194" cy="252" rx="18" ry="30" fill={`url(#${ids.leaf})`} transform="rotate(-34 194 252)" />
            <ellipse cx="228" cy="236" rx="20" ry="32" fill={`url(#${ids.leaf})`} transform="rotate(31 228 236)" />
          </motion.g>
        )}

        {showTrunk && (
          <motion.g initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }}>
            <path d="M174 330 C184 274 187 221 196 154 C209 209 229 267 238 330Z" fill={`url(#${ids.trunk})`} filter={`url(#${ids.bark})`} />
            <path d="M204 166 C204 216 208 267 216 325" stroke={`url(#${ids.trunkLight})`} strokeWidth="10" strokeLinecap="round" opacity="0.68" />
            <path d="M187 324 C158 334 142 347 116 358" stroke="#5f4128" strokeWidth="8" strokeLinecap="round" fill="none" opacity="0.68" />
            <path d="M224 324 C250 337 272 346 306 352" stroke="#5f4128" strokeWidth="8" strokeLinecap="round" fill="none" opacity="0.68" />
            <path d="M207 326 C207 344 204 355 198 367" stroke="#4b2f1d" strokeWidth="6" strokeLinecap="round" fill="none" opacity="0.5" />
            {[0, 1, 2, 3, 4, 5].map((line) => (
              <path
                key={line}
                d={`M${194 + (line % 3) * 9} ${185 + line * 22} C${184 + line * 3} ${202 + line * 22} ${205 + line * 3} ${214 + line * 22} ${198 + line * 5} ${229 + line * 18}`}
                stroke="#2b1a12"
                strokeWidth="2"
                strokeLinecap="round"
                fill="none"
                opacity="0.2"
              />
            ))}
          </motion.g>
        )}

        {showBranches && (
          <motion.g stroke="#5f4128" strokeLinecap="round" fill="none" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.12 }}>
            <path d="M204 225 C162 205 136 174 102 132" strokeWidth="12" />
            <path d="M215 218 C256 193 282 157 318 111" strokeWidth="12" />
            <path d="M199 188 C167 164 150 134 130 92" strokeWidth="8" />
            <path d="M218 178 C245 150 256 117 274 78" strokeWidth="8" />
            <path d="M208 204 C206 171 204 132 210 84" strokeWidth="7" opacity="0.85" />
          </motion.g>
        )}

        {showTrunk &&
          canopyGroups.slice(0, Math.min(canopyGroups.length, 2 + index)).map((group, groupIndex) => (
            <motion.ellipse
              key={groupIndex}
              cx={group.cx}
              cy={group.cy}
              rx={group.rx}
              ry={group.ry}
              fill={groupIndex % 2 ? `url(#${ids.leaf})` : `url(#${ids.deepLeaf})`}
              opacity="0.34"
              filter={`url(#${ids.leafShadow})`}
              initial={{ scale: 0.55, opacity: 0 }}
              animate={{ scale: 1, opacity: 0.34 }}
              transition={{ delay: groupIndex * 0.05, duration: 0.45 }}
            />
          ))}

        {Array.from({ length: leafCount }).map((_, leafIndex) => {
          const group = canopyGroups[leafIndex % Math.min(canopyGroups.length, Math.max(1, 2 + index))];
          const angle = leafIndex * 2.399;
          const radiusX = group.rx * (0.22 + ((leafIndex * 17) % 62) / 100);
          const radiusY = group.ry * (0.2 + ((leafIndex * 11) % 58) / 100);
          const x = group.cx + Math.cos(angle) * radiusX;
          const y = group.cy + Math.sin(angle) * radiusY;
          const isPetal = showBloom && leafIndex % 7 === 0;

          return (
            <motion.ellipse
              key={leafIndex}
              cx={x}
              cy={y}
              rx={isPetal ? 8 : 9 + (leafIndex % 4)}
              ry={isPetal ? 12 : 14 + (leafIndex % 5)}
              fill={isPetal ? `url(#${ids.petal})` : leafIndex % 3 ? `url(#${ids.leaf})` : `url(#${ids.deepLeaf})`}
              opacity={isPetal ? 0.94 : 0.88}
              filter={`url(#${ids.leafShadow})`}
              initial={{ scale: 0, rotate: -24 }}
              animate={{ scale: 1, rotate: leafIndex % 2 ? 18 : -16 }}
              transition={{ delay: leafIndex * 0.012, duration: 0.36 }}
            />
          );
        })}
      </motion.svg>

      <AnimatePresence>
        {celebrate && (
          <motion.div className="pointer-events-none absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {Array.from({ length: 16 }).map((_, i) => (
              <motion.span
                key={i}
                className="absolute h-2 w-2 rounded-full bg-amber-300 shadow-sm"
                style={{ left: `${18 + (i * 41) % 64}%`, top: `${18 + (i * 23) % 52}%` }}
                initial={{ y: 16, scale: 0, opacity: 0 }}
                animate={{ y: -26 - (i % 5) * 7, scale: [0, 1, 0], opacity: [0, 1, 0] }}
                transition={{ duration: 0.95, delay: i * 0.025 }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
