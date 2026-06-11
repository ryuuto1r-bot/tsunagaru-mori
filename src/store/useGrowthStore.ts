import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Difficulty = "easy" | "medium" | "hard";
export type ThemeMode = "morning" | "forest" | "night";

export type Task = {
  id: string;
  title: string;
  notes: string;
  difficulty: Difficulty;
  completed: boolean;
  createdAt: string;
  completedAt?: string;
};

export type Settings = {
  theme: ThemeMode;
  compact: boolean;
  showCelebration: boolean;
};

type GrowthStore = {
  tasks: Task[];
  settings: Settings;
  addTask: (task: Pick<Task, "title" | "notes" | "difficulty">) => void;
  completeTask: (id: string) => void;
  deleteTask: (id: string) => void;
  resetAll: () => void;
  updateSettings: (settings: Partial<Settings>) => void;
};

export const difficultyPoints: Record<Difficulty, number> = {
  easy: 8,
  medium: 14,
  hard: 22,
};

const sampleTasks: Task[] = [
  {
    id: "sample-1",
    title: "朝に5分だけ片づける",
    notes: "始める摩擦を小さくする",
    difficulty: "easy",
    completed: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: "sample-2",
    title: "卒研メモを1つ更新する",
    notes: "",
    difficulty: "medium",
    completed: false,
    createdAt: new Date().toISOString(),
  },
];

export const useGrowthStore = create<GrowthStore>()(
  persist(
    (set) => ({
      tasks: sampleTasks,
      settings: {
        theme: "morning",
        compact: false,
        showCelebration: true,
      },
      addTask: (task) =>
        set((state) => ({
          tasks: [
            {
              id: crypto.randomUUID(),
              title: task.title.trim(),
              notes: task.notes.trim(),
              difficulty: task.difficulty,
              completed: false,
              createdAt: new Date().toISOString(),
            },
            ...state.tasks,
          ],
        })),
      completeTask: (id) =>
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id && !task.completed
              ? { ...task, completed: true, completedAt: new Date().toISOString() }
              : task,
          ),
        })),
      deleteTask: (id) => set((state) => ({ tasks: state.tasks.filter((task) => task.id !== id) })),
      resetAll: () => set({ tasks: [], settings: { theme: "morning", compact: false, showCelebration: true } }),
      updateSettings: (settings) => set((state) => ({ settings: { ...state.settings, ...settings } })),
    }),
    {
      name: "tsunagaru-mori-store",
      version: 1,
    },
  ),
);

export const stageThresholds = [0, 20, 55, 100, 170, 260] as const;

export const stages = [
  { id: "seed", label: "種", description: "土の中で準備中" },
  { id: "sprout", label: "芽", description: "小さな習慣が出てきた" },
  { id: "seedling", label: "苗木", description: "毎日の根が伸びている" },
  { id: "young", label: "若木", description: "集中の枝が広がり始めた" },
  { id: "elder", label: "大樹", description: "継続が見える形になった" },
  { id: "bloom", label: "花が咲いた木", description: "習慣が実りとして残っている" },
] as const;

export function growthPoints(tasks: Task[]) {
  return tasks.filter((task) => task.completed).reduce((sum, task) => sum + difficultyPoints[task.difficulty], 0);
}

export function currentStage(points: number) {
  let index = 0;
  stageThresholds.forEach((threshold, thresholdIndex) => {
    if (points >= threshold) index = thresholdIndex;
  });
  const next = stageThresholds[index + 1] ?? stageThresholds[stageThresholds.length - 1];
  const current = stageThresholds[index];
  const progress = index === stageThresholds.length - 1 ? 100 : ((points - current) / (next - current)) * 100;
  return { ...stages[index], index, progress: Math.max(0, Math.min(100, progress)), next };
}

function padDatePart(value: number) {
  return String(value).padStart(2, "0");
}

export function dateKey(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
}

export function todayCompleted(tasks: Task[]) {
  const today = dateKey(new Date());
  return tasks.filter((task) => task.completedAt && dateKey(task.completedAt) === today).length;
}

export function streakDays(tasks: Task[]) {
  const completedDays = new Set(tasks.filter((task) => task.completedAt).map((task) => dateKey(task.completedAt!)));
  let streak = 0;
  const cursor = new Date();
  cursor.setHours(12, 0, 0, 0);
  while (completedDays.has(dateKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function groupHistory(tasks: Task[]) {
  return tasks
    .filter((task) => task.completedAt)
    .sort((a, b) => Number(new Date(b.completedAt!)) - Number(new Date(a.completedAt!)))
    .reduce<Record<string, Task[]>>((groups, task) => {
      const key = dateKey(task.completedAt!);
      groups[key] = groups[key] ? [...groups[key], task] : [task];
      return groups;
    }, {});
}
