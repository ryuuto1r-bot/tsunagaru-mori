import { create } from "zustand";
import { persist } from "zustand/middleware";

export type Difficulty = "easy" | "medium" | "hard";
export type ThemeMode = "morning" | "forest" | "night";

export type Task = {
  id: string;
  parentId?: string;
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
  addTask: (task: NewTaskInput) => void;
  completeTask: (id: string) => void;
  deleteTask: (id: string) => void;
  resetAll: () => void;
  updateSettings: (settings: Partial<Settings>) => void;
};

type NewTaskInput = Pick<Task, "title" | "notes" | "difficulty"> & { parentId?: string };

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
  {
    id: "sample-3",
    parentId: "sample-2",
    title: "参考資料を1つ読む",
    notes: "卒研メモの中に入る小タスク",
    difficulty: "easy",
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
              parentId: task.parentId,
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
      deleteTask: (id) =>
        set((state) => {
          const deleting = new Set([id]);
          let changed = true;
          while (changed) {
            changed = false;
            state.tasks.forEach((task) => {
              if (task.parentId && deleting.has(task.parentId) && !deleting.has(task.id)) {
                deleting.add(task.id);
                changed = true;
              }
            });
          }
          return { tasks: state.tasks.filter((task) => !deleting.has(task.id)) };
        }),
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

export type DayGrowth = {
  date: string;
  day: number;
  points: number;
  count: number;
  stage: ReturnType<typeof currentStage>;
  isToday: boolean;
  isFuture: boolean;
};

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

export function completedTasksForDate(tasks: Task[], key: string) {
  return tasks.filter((task) => task.completedAt && dateKey(task.completedAt) === key);
}

export function dailyGrowth(tasks: Task[], date: Date): DayGrowth {
  const key = dateKey(date);
  const completed = completedTasksForDate(tasks, key);
  const points = completed.reduce((sum, task) => sum + difficultyPoints[task.difficulty], 0);
  const today = dateKey(new Date());
  return {
    date: key,
    day: date.getDate(),
    points,
    count: completed.length,
    stage: currentStage(points),
    isToday: key === today,
    isFuture: key > today,
  };
}

export function monthForest(tasks: Task[], baseDate = new Date()) {
  const year = baseDate.getFullYear();
  const month = baseDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  return Array.from({ length: daysInMonth }, (_, index) => {
    const date = new Date(year, month, index + 1, 12, 0, 0, 0);
    return dailyGrowth(tasks, date);
  });
}

export function recentDailyGrowth(tasks: Task[], days = 10) {
  return Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setHours(12, 0, 0, 0);
    date.setDate(date.getDate() - (days - index - 1));
    return dailyGrowth(tasks, date);
  });
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
