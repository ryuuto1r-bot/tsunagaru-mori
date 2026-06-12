import { useEffect, useMemo, useRef, useState } from "react";
import type React from "react";
import { AnimatePresence, motion } from "motion/react";
import * as THREE from "three";
import {
  Archive,
  CalendarCheck,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock3,
  Download,
  Flame,
  Folder,
  Gem,
  History,
  Inbox,
  ListTodo,
  Plus,
  RotateCcw,
  Search,
  Settings,
  Sparkles,
  Sprout,
  Target,
  Trash2,
  TreePine,
  Trophy,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  currentStage,
  dailyGrowth,
  dateKey,
  difficultyPoints,
  groupHistory,
  growthPoints,
  monthForest,
  streakDays,
  todayCompleted,
  type Difficulty,
  type Settings as StoreSettings,
  type Task,
  type ThemeMode,
  useGrowthStore,
} from "@/store/useGrowthStore";
import { cn } from "@/lib/utils";

type AppView = "tasks" | "forest" | "history" | "settings";
type ForestScope = "today" | "month" | "all";
type TimeTone = "morning" | "day" | "evening" | "night";
type WorldControl = "zoom-in" | "zoom-out" | "reset";

type ProjectGroup = {
  name: string;
  tasks: Task[];
  done: number;
  points: number;
};

type FruitTodo = {
  title: string;
  difficulty: Difficulty;
  completed?: boolean;
};

type RewardToast = {
  id: string;
  title: string;
  difficulty: Difficulty;
  points: number;
  stageLabel: string;
  leveledUp: boolean;
};

type ForestMapNode = {
  id: string;
  label: string;
  sublabel: string;
  count: number;
  points: number;
  todoCount: number;
  fruits: FruitTodo[];
  buds: FruitTodo[];
  x: number;
  y: number;
  featured?: boolean;
  future?: boolean;
};

type DragState = {
  dragging: boolean;
  lastX: number;
  lastY: number;
  yaw: number;
  pitch: number;
  distance: number;
  pinchDistance: number | null;
};

const difficultyMeta: Record<Difficulty, { label: string; hint: string; className: string }> = {
  easy: { label: "軽め", hint: "+8", className: "bg-emerald-100 text-emerald-800" },
  medium: { label: "集中", hint: "+14", className: "bg-amber-100 text-amber-800" },
  hard: { label: "深い", hint: "+22", className: "bg-sky-100 text-sky-800" },
};

const appTabs: { value: AppView; label: string; icon: React.ReactNode }[] = [
  { value: "tasks", label: "タスク", icon: <ListTodo className="h-4 w-4" /> },
  { value: "forest", label: "森ビュー", icon: <TreePine className="h-4 w-4" /> },
  { value: "history", label: "履歴", icon: <History className="h-4 w-4" /> },
  { value: "settings", label: "設定", icon: <Settings className="h-4 w-4" /> },
];

const timelinePositions = [
  { x: 22, y: 28 },
  { x: 43, y: 27 },
  { x: 62, y: 25 },
  { x: 23, y: 54 },
  { x: 53, y: 51, featured: true },
  { x: 78, y: 54 },
  { x: 34, y: 77 },
  { x: 58, y: 78 },
  { x: 82, y: 79 },
] as const;

const fruitPositions = [
  { left: 48, top: 19 },
  { left: 31, top: 33 },
  { left: 63, top: 36 },
  { left: 42, top: 45 },
  { left: 55, top: 50 },
  { left: 24, top: 53 },
  { left: 72, top: 56 },
  { left: 49, top: 64 },
  { left: 35, top: 68 },
] as const;

const leafClusters = [
  { left: 30, top: 26, width: 42, height: 34, color: "rgba(124, 168, 99, 0.9)" },
  { left: 47, top: 18, width: 45, height: 36, color: "rgba(88, 143, 76, 0.9)" },
  { left: 55, top: 36, width: 39, height: 34, color: "rgba(65, 119, 62, 0.88)" },
  { left: 19, top: 43, width: 38, height: 31, color: "rgba(103, 155, 89, 0.86)" },
  { left: 40, top: 42, width: 45, height: 38, color: "rgba(74, 136, 66, 0.86)" },
] as const;

const bonsaiLeafParticles = [
  { cx: 49, cy: 70, rx: 12, ry: 8, rotate: -22, color: "#6f9c5e", opacity: 0.93 },
  { cx: 57, cy: 61, rx: 12, ry: 8, rotate: -10, color: "#86b06f", opacity: 0.96 },
  { cx: 68, cy: 55, rx: 13, ry: 9, rotate: 12, color: "#78a764", opacity: 0.98 },
  { cx: 81, cy: 51, rx: 13, ry: 9, rotate: -6, color: "#9cc287", opacity: 0.96 },
  { cx: 94, cy: 56, rx: 12, ry: 8, rotate: 20, color: "#6f9e5c", opacity: 0.96 },
  { cx: 106, cy: 65, rx: 12, ry: 8, rotate: 24, color: "#5c8c50", opacity: 0.94 },
  { cx: 39, cy: 81, rx: 11, ry: 7, rotate: -20, color: "#5f8f51", opacity: 0.9 },
  { cx: 52, cy: 80, rx: 13, ry: 8, rotate: 10, color: "#82ac6a", opacity: 0.94 },
  { cx: 66, cy: 76, rx: 12, ry: 8, rotate: -14, color: "#7ba667", opacity: 0.96 },
  { cx: 80, cy: 73, rx: 13, ry: 8, rotate: 8, color: "#6e9f5c", opacity: 0.97 },
  { cx: 94, cy: 77, rx: 12, ry: 8, rotate: -18, color: "#8ab573", opacity: 0.95 },
  { cx: 108, cy: 80, rx: 11, ry: 7, rotate: 17, color: "#527f48", opacity: 0.91 },
  { cx: 59, cy: 43, rx: 9, ry: 6, rotate: -18, color: "#a8ca95", opacity: 0.86 },
  { cx: 72, cy: 38, rx: 10, ry: 6, rotate: 8, color: "#b6d6a2", opacity: 0.82 },
  { cx: 86, cy: 39, rx: 10, ry: 6, rotate: -10, color: "#98bd82", opacity: 0.84 },
  { cx: 101, cy: 45, rx: 9, ry: 6, rotate: 20, color: "#87ad72", opacity: 0.86 },
  { cx: 44, cy: 94, rx: 10, ry: 6, rotate: 18, color: "#7ca662", opacity: 0.9 },
  { cx: 58, cy: 94, rx: 11, ry: 7, rotate: -14, color: "#659556", opacity: 0.92 },
  { cx: 73, cy: 91, rx: 12, ry: 7, rotate: 9, color: "#93ba7b", opacity: 0.94 },
  { cx: 88, cy: 91, rx: 12, ry: 7, rotate: -9, color: "#78a462", opacity: 0.93 },
  { cx: 102, cy: 94, rx: 10, ry: 6, rotate: 16, color: "#5b8b50", opacity: 0.9 },
  { cx: 116, cy: 92, rx: 8, ry: 5, rotate: -12, color: "#8ab573", opacity: 0.84 },
  { cx: 31, cy: 71, rx: 8, ry: 5, rotate: 8, color: "#83ad6c", opacity: 0.78 },
  { cx: 119, cy: 70, rx: 8, ry: 5, rotate: -8, color: "#759f61", opacity: 0.78 },
  { cx: 65, cy: 64, rx: 8, ry: 5, rotate: 22, color: "#c4dfb6", opacity: 0.64 },
  { cx: 84, cy: 61, rx: 8, ry: 5, rotate: -18, color: "#d3e8c7", opacity: 0.58 },
  { cx: 95, cy: 69, rx: 7, ry: 4, rotate: 18, color: "#bdd8aa", opacity: 0.6 },
  { cx: 73, cy: 82, rx: 7, ry: 4, rotate: -14, color: "#b2d09c", opacity: 0.58 },
] as const;

function App() {
  const { tasks, settings, addTask, completeTask, deleteTask, resetAll, updateSettings } = useGrowthStore();
  const [timeTone, setTimeTone] = useState<TimeTone>(() => getTimeTone());
  const [activeView, setActiveView] = useState<AppView>("tasks");
  const [activeProject, setActiveProject] = useState("all");
  const [forestScope, setForestScope] = useState<ForestScope>("today");
  const [query, setQuery] = useState("");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [parentId, setParentId] = useState("");
  const [celebrateId, setCelebrateId] = useState<string | null>(null);
  const [rewardToast, setRewardToast] = useState<RewardToast | null>(null);
  const [forestMemoryMode, setForestMemoryMode] = useState(false);
  const knownCompletedTaskIdsRef = useRef<Set<string> | null>(null);
  const previousPointsRef = useRef(0);

  const groups = useMemo(() => groupTasksByProject(tasks), [tasks]);
  const scopedTasks = useMemo(
    () => filterTasks(tasks, activeProject, query),
    [activeProject, query, tasks],
  );
  const pendingTasks = scopedTasks.filter((task) => !task.completed);
  const completedTasks = scopedTasks.filter((task) => task.completed);
  const points = growthPoints(tasks);
  const stage = currentStage(points);
  const todayCount = todayCompleted(tasks);
  const streak = streakDays(tasks);
  const history = groupHistory(tasks);
  const forestDays = monthForest(tasks);
  const completionRate = tasks.length ? Math.round((tasks.filter((task) => task.completed).length / tasks.length) * 100) : 0;
  const monthCompleted = forestDays.reduce((sum, day) => sum + day.count, 0);
  const selectedParentTitle = tasks.find((task) => task.id === parentId)?.title;
  const forestImmersive = activeView === "forest" && forestMemoryMode;

  useEffect(() => {
    const timer = window.setInterval(() => setTimeTone(getTimeTone()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const completedIds = new Set(tasks.filter((task) => task.completed).map((task) => task.id));
    if (!knownCompletedTaskIdsRef.current) {
      knownCompletedTaskIdsRef.current = completedIds;
      previousPointsRef.current = points;
      return;
    }

    const newlyCompletedTask = tasks.find((task) => task.completed && !knownCompletedTaskIdsRef.current?.has(task.id));
    if (newlyCompletedTask) {
      const beforeStage = currentStage(previousPointsRef.current);
      const afterStage = currentStage(points);
      const reward: RewardToast = {
        id: `${newlyCompletedTask.id}-${Date.now()}`,
        title: newlyCompletedTask.title,
        difficulty: newlyCompletedTask.difficulty,
        points: difficultyPoints[newlyCompletedTask.difficulty],
        stageLabel: afterStage.label,
        leveledUp: afterStage.index > beforeStage.index,
      };
      setRewardToast(reward);
      window.setTimeout(() => setRewardToast((current) => (current?.id === reward.id ? null : current)), 2400);
    }

    knownCompletedTaskIdsRef.current = completedIds;
    previousPointsRef.current = points;
  }, [points, tasks]);

  function submitTask() {
    if (!title.trim()) return;
    addTask({ title, notes, difficulty, parentId: parentId || undefined });
    setTitle("");
    setNotes("");
    setDifficulty("medium");
    setParentId("");
    setActiveView("tasks");
  }

  function finishTask(id: string) {
    const completingTask = tasks.find((task) => task.id === id);
    if (!completingTask || completingTask.completed) return;
    completeTask(id);
    if (settings.showCelebration) {
      setCelebrateId(id);
      window.setTimeout(() => setCelebrateId(null), 900);
    }
  }

  return (
    <div
      className={cn(
        "min-h-screen overflow-x-hidden text-[#263126] transition-colors duration-700 dark:text-[#eef4e8]",
        timeToneClass(timeTone),
        themeClass(settings.theme),
      )}
    >
      <main className={cn("mx-auto min-h-screen w-full max-w-[1540px] p-2 transition-all duration-500 sm:p-4 lg:p-5", forestImmersive && "max-w-none p-0 sm:p-0 lg:p-0")}>
        <section
          className={cn(
            "grid min-h-[calc(100vh-1rem)] overflow-hidden rounded-lg border border-white/75 bg-[#fbfaf5]/95 shadow-[0_28px_90px_rgba(31,47,34,0.18)] ring-1 ring-[#1f2d1e]/5 backdrop-blur transition-all duration-500 dark:border-white/10 dark:bg-[#101715]/94 dark:shadow-[0_28px_90px_rgba(0,0,0,0.42)] lg:min-h-[calc(100vh-2.5rem)]",
            forestImmersive ? "min-h-screen rounded-none border-transparent shadow-none ring-0 lg:min-h-screen lg:grid-cols-[minmax(0,1fr)]" : "lg:grid-cols-[292px_minmax(0,1fr)]",
          )}
        >
          {!forestImmersive && (
            <AppSidebar
              activeProject={activeProject}
              completionRate={completionRate}
              groups={groups}
              onProject={setActiveProject}
              onExport={() => exportForest(tasks)}
              points={points}
              stage={stage}
              streak={streak}
              taskCount={tasks.length}
              todayCount={todayCount}
            />
          )}

          <div className={cn("min-w-0 bg-[linear-gradient(180deg,#fbfaf5_0%,#f7f6ef_100%)] transition-all duration-500 dark:bg-[linear-gradient(180deg,#121c19_0%,#0d1413_100%)]", !forestImmersive && "border-l border-[#e5e1d7] dark:border-white/10")}>
            <Tabs value={activeView} onValueChange={(value) => setActiveView(value as AppView)} className="flex min-h-full flex-col">
              <header className={cn("flex min-h-16 flex-col gap-3 border-b border-[#e8e3d9] bg-[#fffdf7]/78 px-3 py-3 shadow-[0_1px_0_rgba(255,255,255,0.7)_inset] backdrop-blur transition-all duration-500 dark:border-white/10 dark:bg-[#101715]/76 md:flex-row md:items-center md:justify-between lg:px-8", forestImmersive && "pointer-events-none max-h-0 min-h-0 overflow-hidden border-b-0 px-0 py-0 opacity-0")}>
                <TabsList className="grid h-auto w-full grid-cols-4 gap-1 rounded-md border border-[#e4dfd4] bg-[#f4f3ed]/82 p-1 text-[#6d746c] shadow-inner dark:border-white/10 dark:bg-white/[0.06] dark:text-[#b9c7b4] md:flex md:w-auto md:justify-start md:gap-1.5">
                  {appTabs.map((tab) => (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className="gap-1 rounded-md border border-transparent px-2 py-2 text-xs font-black data-[state=active]:border-[#d8d2c4] data-[state=active]:bg-[#fffdf7] data-[state=active]:text-[#2f4530] data-[state=active]:shadow-[0_8px_18px_rgba(38,49,38,0.08)] dark:data-[state=active]:border-white/10 dark:data-[state=active]:bg-white/[0.12] dark:data-[state=active]:text-[#f0f6e9] sm:text-sm md:gap-2 md:px-4"
                    >
                      {tab.icon}
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
                <div className="flex items-center gap-2">
                  {activeView === "forest" ? (
                    <ScopeToggle scope={forestScope} onScope={setForestScope} />
                  ) : (
                    <TopStatusPill completionRate={completionRate} stage={stage} streak={streak} timeTone={timeTone} todayCount={todayCount} />
                  )}
                </div>
              </header>

              <TabsContent value="forest" className="m-0 flex-1 outline-none">
                <ForestScreen
                  celebrateId={celebrateId}
                  groups={groups}
                  monthCompleted={monthCompleted}
                  onComplete={finishTask}
                  scope={forestScope}
                  stage={stage}
                  streak={streak}
                  tasks={tasks}
                  timeTone={timeTone}
                  todayCount={todayCount}
                  onMemoryModeChange={setForestMemoryMode}
                />
              </TabsContent>

              <TabsContent value="tasks" className="m-0 flex-1 outline-none">
                <TaskScreen
                  compact={settings.compact}
                  completedTasks={completedTasks}
                  difficulty={difficulty}
                  notes={notes}
                  onComplete={finishTask}
                  onDelete={deleteTask}
                  onDifficulty={setDifficulty}
                  onNotes={setNotes}
                  onParent={setParentId}
                  onSubmit={submitTask}
                  onTitle={setTitle}
                  parentId={parentId}
                  pendingTasks={pendingTasks}
                  query={query}
                  selectedParentTitle={selectedParentTitle}
                  setActiveView={setActiveView}
                  setQuery={setQuery}
                  tasks={tasks}
                  timeTone={timeTone}
                  title={title}
                  treeCelebrate={Boolean(celebrateId)}
                />
              </TabsContent>

              <TabsContent value="history" className="m-0 flex-1 outline-none">
                <HistoryScreen history={history} />
              </TabsContent>

              <TabsContent value="settings" className="m-0 flex-1 outline-none">
                <SettingsScreen resetAll={resetAll} settings={settings} updateSettings={updateSettings} />
              </TabsContent>
            </Tabs>
          </div>
        </section>
      </main>
      <GameRewardOverlay reward={rewardToast} />
    </div>
  );
}

function AppSidebar({
  activeProject,
  completionRate,
  groups,
  onExport,
  onProject,
  points,
  stage,
  streak,
  taskCount,
  todayCount,
}: {
  activeProject: string;
  completionRate: number;
  groups: ProjectGroup[];
  onExport: () => void;
  onProject: (project: string) => void;
  points: number;
  stage: ReturnType<typeof currentStage>;
  streak: number;
  taskCount: number;
  todayCount: number;
}) {
  const mainItems = [
    { id: "today", label: "今日のタスク", value: todayCount, icon: <ClipboardList className="h-4 w-4" /> },
    { id: "inbox", label: "インボックス", value: taskCount, icon: <Inbox className="h-4 w-4" /> },
    { id: "projects", label: "プロジェクト", value: groups.length, icon: <Folder className="h-4 w-4" /> },
    { id: "someday", label: "いつかやる", value: Math.max(0, taskCount - todayCount), icon: <Archive className="h-4 w-4" /> },
    { id: "done", label: "完了済み", value: completionRate, suffix: "%", icon: <CheckCircle2 className="h-4 w-4" /> },
  ];

  return (
    <aside className="hidden min-h-full bg-[linear-gradient(180deg,rgba(244,243,237,0.94),rgba(238,240,231,0.9))] px-4 py-5 dark:bg-[linear-gradient(180deg,rgba(16,23,21,0.98),rgba(10,16,15,0.94))] lg:block">
      <div className="rounded-md border border-white/80 bg-[#fffdf7]/72 p-4 shadow-[0_14px_34px_rgba(38,49,38,0.08)] dark:border-white/10 dark:bg-white/[0.06] dark:shadow-[0_14px_40px_rgba(0,0,0,0.25)]">
        <div className="flex items-center gap-3">
          <span className="grid h-11 w-11 place-items-center rounded-md bg-[#e2eadb] text-[#3f7b3b] shadow-inner dark:bg-[#1f3b2a] dark:text-[#86d184]">
            <TreePine className="h-7 w-7 fill-[#3f7b3b] text-[#3f7b3b]" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-black tracking-normal">つながる森</h1>
            <p className="text-xs font-bold text-[#6f786c] dark:text-[#a3b29d]">todoが実になる庭</p>
          </div>
        </div>
        <div className="mt-4 overflow-hidden rounded-md border border-[#eadfca] bg-[linear-gradient(135deg,#fff9e7,#edf5df)] p-3 shadow-inner dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(46,58,35,0.65),rgba(22,39,29,0.72))]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-[#8b7a4f] dark:text-[#d9c47a]">Forest Level</p>
              <p className="mt-0.5 text-xl font-black text-[#2d422d] dark:text-[#eef5e8]">Lv.{stage.index + 1}</p>
            </div>
            <div className="grid h-12 w-12 place-items-center rounded-full border border-[#ffedaf] bg-[radial-gradient(circle_at_35%_25%,#fff8bf,#dcae37_60%,#93631d)] text-white shadow-[0_12px_28px_rgba(169,116,22,0.24)]">
              <Trophy className="h-6 w-6" />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between gap-3 text-xs font-black text-[#687365] dark:text-[#a8b8a2]">
            <span>{stage.label}</span>
            <span>{points} XP</span>
          </div>
          <div className="mt-2 h-2 overflow-hidden rounded-full bg-[#dfd6bd] shadow-inner dark:bg-white/10">
            <motion.div
              className="h-full rounded-full bg-gradient-to-r from-[#7fa86c] via-[#d0a53b] to-[#fff0a3]"
              initial={false}
              animate={{ width: `${stage.progress}%` }}
              transition={{ type: "spring", stiffness: 120, damping: 22 }}
            />
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <div className="rounded-md bg-white/58 px-2 py-1.5 text-center text-xs font-black text-[#596653] dark:bg-white/[0.055] dark:text-[#dce9d5]">
              <Flame className="mx-auto mb-0.5 h-3.5 w-3.5 text-[#d1792a]" />
              {streak}日
            </div>
            <div className="rounded-md bg-white/58 px-2 py-1.5 text-center text-xs font-black text-[#596653] dark:bg-white/[0.055] dark:text-[#dce9d5]">
              <Gem className="mx-auto mb-0.5 h-3.5 w-3.5 text-[#d0a53b]" />
              {Math.round(stage.progress)}%
            </div>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-2 text-center">
          <div className="rounded-md border border-[#e4dfd4] bg-white/58 px-3 py-2 dark:border-white/10 dark:bg-white/[0.06]">
            <p className="text-[10px] font-black text-[#7b8278] dark:text-[#9aac94]">今日</p>
            <p className="text-lg font-black tabular-nums text-[#3f5f3b] dark:text-[#a7df9e]">{todayCount}</p>
          </div>
          <div className="rounded-md border border-[#e4dfd4] bg-white/58 px-3 py-2 dark:border-white/10 dark:bg-white/[0.06]">
            <p className="text-[10px] font-black text-[#7b8278] dark:text-[#9aac94]">完了率</p>
            <p className="text-lg font-black tabular-nums text-[#3f5f3b] dark:text-[#a7df9e]">{completionRate}%</p>
          </div>
        </div>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-[#e4dfd4] dark:bg-white/10">
          <div className="h-full rounded-full bg-gradient-to-r from-[#88a871] via-[#4e7d45] to-[#d1a63b]" style={{ width: `${completionRate}%` }} />
        </div>
      </div>

      <div className="mt-5 grid gap-2">
        {mainItems.map((item, index) => (
          <button
            key={item.id}
            className={cn(
              "group flex h-12 items-center justify-between rounded-md border border-transparent px-3 text-left text-sm font-bold text-[#626a61] transition dark:text-[#b8c5b4]",
              index === 0 ? "border-[#d7dece] bg-[#e9eee1] text-[#3f5f3b] shadow-sm dark:border-white/10 dark:bg-white/[0.08] dark:text-[#dff3d7]" : "hover:border-[#e2decf] hover:bg-[#fbfaf5]/70 dark:hover:border-white/10 dark:hover:bg-white/[0.06]",
            )}
            type="button"
          >
            <span className="flex min-w-0 items-center gap-3">
              <span className={cn("grid h-8 w-8 place-items-center rounded-md bg-white/62 text-[#7a8375] dark:bg-white/[0.08] dark:text-[#9fb79c]", index === 0 && "bg-white text-[#3f7b3b] dark:bg-[#203d2a] dark:text-[#a7df9e]")}>
                {item.icon}
              </span>
              <span className="truncate">{item.label}</span>
            </span>
            <span className="rounded-full bg-white/64 px-2 py-0.5 text-xs font-black tabular-nums text-[#536050] dark:bg-white/[0.08] dark:text-[#d9e8d3]">
              {item.value}
              {item.suffix}
            </span>
          </button>
        ))}
      </div>

      <div className="my-6 h-px bg-[#e1ddd2]" />

      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-black uppercase tracking-[0.14em] text-[#7b8278] dark:text-[#9aac94]">プロジェクト</p>
        <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md text-[#60715e] hover:bg-[#e9ece2]" onClick={() => onProject("all")}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-1.5">
        <ProjectButton active={activeProject === "all"} count={taskCount} done={todayCount} label="すべて" onClick={() => onProject("all")} />
        {groups.map((group) => (
          <ProjectButton
            key={group.name}
            active={activeProject === group.name}
            count={group.tasks.length}
            done={group.done}
            label={group.name}
            onClick={() => onProject(group.name)}
          />
        ))}
      </div>

      <Button variant="outline" className="mt-6 w-full justify-start rounded-md border-[#ddd8cc] bg-[#fffdf7]/70 font-bold text-[#52624f] shadow-sm hover:bg-white dark:border-white/10 dark:bg-white/[0.06] dark:text-[#dce9d5] dark:hover:bg-white/[0.1]" onClick={onExport}>
        <Download className="h-4 w-4" />
        森データを出力
      </Button>
    </aside>
  );
}

function ProjectButton({
  active,
  count,
  done,
  label,
  onClick,
}: {
  active?: boolean;
  count: number;
  done?: number;
  label: string;
  onClick: () => void;
}) {
  const progress = count ? Math.round(((done ?? 0) / count) * 100) : 0;
  return (
    <button
      className={cn(
        "grid gap-2 rounded-md border border-transparent px-3 py-2.5 text-left text-sm font-bold text-[#6b7369] transition hover:border-[#e2decf] hover:bg-[#fbfaf5]/70 dark:text-[#b7c4b2] dark:hover:border-white/10 dark:hover:bg-white/[0.06]",
        active && "border-[#d7dece] bg-[#e4e8dc] text-[#3f5f3b] shadow-sm dark:border-white/10 dark:bg-white/[0.08] dark:text-[#dcf2d7]",
      )}
      onClick={onClick}
      type="button"
    >
      <span className="flex min-w-0 items-center justify-between gap-3">
        <span className="flex min-w-0 items-center gap-2">
          <ChevronRight className={cn("h-4 w-4 text-[#a2a99e] transition dark:text-[#758474]", active && "rotate-90 text-[#4e7d45] dark:text-[#a7df9e]")} />
          <span className="truncate">{label}</span>
        </span>
        <span className="rounded-full bg-white/64 px-2 py-0.5 text-[11px] font-black tabular-nums text-[#5b744f] dark:bg-white/[0.08] dark:text-[#d9e8d3]">{done ?? count}</span>
      </span>
      <span className="h-1.5 overflow-hidden rounded-full bg-[#e5e0d3] dark:bg-white/10">
        <span className="block h-full rounded-full bg-gradient-to-r from-[#8daa77] to-[#4e7d45]" style={{ width: `${Math.max(progress, active ? 8 : 0)}%` }} />
      </span>
    </button>
  );
}

function ScopeToggle({ scope, onScope }: { scope: ForestScope; onScope: (scope: ForestScope) => void }) {
  return (
    <div className="grid w-full grid-cols-3 rounded-md border border-[#ded9cd] bg-[#fbfaf5] p-1 md:flex md:w-auto">
      {(["today", "month", "all"] as ForestScope[]).map((item) => (
        <button
          key={item}
          type="button"
          className={cn(
            "h-9 rounded-md px-4 text-sm font-bold transition",
            scope === item ? "bg-[#4e7d45] text-white shadow-sm" : "text-[#61705e] hover:bg-[#eef0e7]",
          )}
          onClick={() => onScope(item)}
        >
          {scopeLabel(item)}
        </button>
      ))}
    </div>
  );
}

function TopStatusPill({
  completionRate,
  stage,
  streak,
  timeTone,
  todayCount,
}: {
  completionRate: number;
  stage: ReturnType<typeof currentStage>;
  streak: number;
  timeTone: TimeTone;
  todayCount: number;
}) {
  return (
    <div className="flex w-full flex-wrap items-center justify-between gap-2 rounded-md border border-[#ded9cd] bg-[#fffdf7]/86 px-3 py-2 text-sm font-black text-[#52624f] shadow-[0_10px_26px_rgba(39,55,37,0.08)] backdrop-blur dark:border-white/10 dark:bg-white/[0.07] dark:text-[#dce9d5] md:w-auto">
      <span className="flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-[#4e7d45]" />
        今日 {todayCount}件
      </span>
      <span className="h-4 w-px bg-[#ded9cd]" />
      <span className="flex items-center gap-1">
        <Trophy className="h-3.5 w-3.5 text-[#c99225]" />
        Lv.{stage.index + 1}
      </span>
      <span className="hidden h-4 w-px bg-[#ded9cd] sm:block" />
      <span className="hidden items-center gap-1 sm:flex">
        <Flame className="h-3.5 w-3.5 text-[#d1792a]" />
        {streak}日
      </span>
      <span className="h-4 w-px bg-[#ded9cd]" />
      <span>{completionRate}%</span>
      <span className="hidden h-4 w-px bg-[#ded9cd] sm:block" />
      <span className="hidden items-center gap-1 text-xs text-[#71806d] sm:flex">
        <Clock3 className="h-3.5 w-3.5" />
        {timeToneLabel(timeTone)}
      </span>
    </div>
  );
}

function GameRewardOverlay({ reward }: { reward: RewardToast | null }) {
  const burst = [
    { x: -148, y: -42, size: 8, delay: 0.02 },
    { x: -112, y: 38, size: 11, delay: 0.08 },
    { x: -64, y: -86, size: 9, delay: 0.04 },
    { x: 8, y: -118, size: 12, delay: 0.1 },
    { x: 72, y: -82, size: 9, delay: 0.06 },
    { x: 122, y: 22, size: 11, delay: 0.12 },
    { x: 156, y: -34, size: 8, delay: 0.03 },
    { x: -24, y: 92, size: 10, delay: 0.14 },
  ];

  return (
    <AnimatePresence>
      {reward && (
        <motion.div
          className="pointer-events-none fixed inset-0 z-[120] grid place-items-center px-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,239,173,0.22),transparent_42%)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: [0, 1, 0] }}
            transition={{ duration: 1.3, ease: "easeOut" }}
          />
          <div className="relative">
            {burst.map((particle, index) => (
              <motion.span
                key={index}
                className={cn(
                  "absolute left-1/2 top-1/2 rounded-full border shadow-[0_10px_22px_rgba(130,91,26,0.18)]",
                  reward.difficulty === "hard" ? "border-[#fff0a8] bg-[#e7b842]" : reward.difficulty === "medium" ? "border-[#f6d49a] bg-[#d8893d]" : "border-[#cfe2b8] bg-[#78a462]",
                )}
                style={{ height: particle.size, width: particle.size }}
                initial={{ x: 0, y: 0, opacity: 0, scale: 0.35 }}
                animate={{ x: particle.x, y: particle.y, opacity: [0, 1, 0], rotate: 180, scale: [0.35, 1, 0.72] }}
                transition={{ delay: particle.delay, duration: 1.15, ease: "easeOut" }}
              />
            ))}

            <motion.div
              className="relative w-[min(92vw,380px)] overflow-hidden rounded-lg border border-[#f3ddb1] bg-[#fffdf7]/94 p-5 text-center shadow-[0_34px_110px_rgba(54,46,26,0.26)] ring-1 ring-white/80 backdrop-blur-xl dark:border-[#6d5b34] dark:bg-[#12201a]/94 dark:ring-white/10"
              initial={{ y: 26, scale: 0.86, opacity: 0 }}
              animate={{ y: 0, scale: 1, opacity: 1 }}
              exit={{ y: -12, scale: 0.94, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
            >
              <div className="pointer-events-none absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#73a86a] via-[#f5d36b] to-[#a6c786]" />
              <motion.div
                className="mx-auto grid h-16 w-16 place-items-center rounded-full border border-[#ffedaf] bg-[radial-gradient(circle_at_35%_25%,#fff8bf,#e8b941_58%,#9c6a18)] text-white shadow-[0_16px_42px_rgba(168,116,25,0.32)]"
                animate={{ rotate: reward.leveledUp ? [0, -8, 8, 0] : [0, 4, -4, 0], scale: reward.leveledUp ? [1, 1.16, 1] : [1, 1.08, 1] }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              >
                {reward.leveledUp ? <Trophy className="h-8 w-8" /> : <Gem className="h-8 w-8" />}
              </motion.div>
              <p className="mt-3 text-xs font-black uppercase tracking-[0.18em] text-[#8d6c2c] dark:text-[#f0d47b]">
                {reward.leveledUp ? "Tree Evolution" : "Task Complete"}
              </p>
              <h2 className="mt-1 truncate text-xl font-black text-[#263126] dark:text-[#f4f8ee]">{reward.title}</h2>
              <div className="mt-4 grid grid-cols-3 gap-2">
                <RewardMetric label="XP" value={`+${reward.points}`} />
                <RewardMetric label="実" value={difficultyMeta[reward.difficulty].label} />
                <RewardMetric label="段階" value={reward.stageLabel} />
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function RewardMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[#eadfca] bg-white/66 px-2 py-2 shadow-inner dark:border-white/10 dark:bg-white/[0.055]">
      <p className="text-[10px] font-black text-[#7b8278] dark:text-[#9fb19a]">{label}</p>
      <p className="mt-0.5 truncate text-sm font-black text-[#31503a] dark:text-[#e8f5df]">{value}</p>
    </div>
  );
}

function ForestScreen({
  celebrateId,
  groups,
  monthCompleted,
  onComplete,
  onMemoryModeChange,
  scope,
  stage,
  streak,
  tasks,
  timeTone,
  todayCount,
}: {
  celebrateId: string | null;
  groups: ProjectGroup[];
  monthCompleted: number;
  onComplete: (id: string) => void;
  onMemoryModeChange?: (enabled: boolean) => void;
  scope: ForestScope;
  stage: ReturnType<typeof currentStage>;
  streak: number;
  tasks: Task[];
  timeTone: TimeTone;
  todayCount: number;
}) {
  const mapNodes = useMemo(() => buildForestMapNodes({ groups, scope, tasks, todayCount }), [groups, scope, tasks, todayCount]);
  const [memoryMode, setMemoryMode] = useState(false);
  const [worldControl, setWorldControl] = useState<WorldControl | null>(null);
  const [worldControlNonce, setWorldControlNonce] = useState(0);
  const memoryTasks = useMemo(
    () =>
      tasks
        .filter((task) => task.completedAt)
        .sort((a, b) => new Date(b.completedAt ?? b.createdAt).getTime() - new Date(a.completedAt ?? a.createdAt).getTime())
        .slice(0, 10),
    [tasks],
  );

  useEffect(() => {
    onMemoryModeChange?.(memoryMode);
    return () => onMemoryModeChange?.(false);
  }, [memoryMode, onMemoryModeChange]);

  function sendWorldControl(control: WorldControl) {
    setWorldControl(control);
    setWorldControlNonce((nonce) => nonce + 1);
  }

  return (
    <div className={cn("grid min-h-[calc(100vh-6.5rem)] lg:grid-rows-[minmax(0,1fr)_auto]", memoryMode && "min-h-screen lg:grid-rows-[minmax(0,1fr)]")}>
      <section className={cn("relative min-h-[620px] touch-none overflow-hidden select-none", forestSurfaceClass(timeTone), memoryMode && "min-h-screen")}>
        <ForestWorldLayer
          control={worldControl}
          controlNonce={worldControlNonce}
          mapNodes={mapNodes}
          scope={scope}
          timeTone={timeTone}
          onMemoryMode={setMemoryMode}
        />
        <div className={cn("pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(to_right,rgba(104,120,104,0.09)_1px,transparent_1px),linear-gradient(to_bottom,rgba(104,120,104,0.09)_1px,transparent_1px)] bg-[size:72px_72px] transition-opacity duration-500", memoryMode && "opacity-0")} />
        <div className={cn("pointer-events-none absolute inset-0 z-10 bg-[linear-gradient(180deg,rgba(255,255,255,0.2),rgba(245,246,238,0.04)_52%,rgba(225,219,203,0.12))] transition-opacity duration-500", memoryMode && "opacity-0")} />
        <div className={cn("pointer-events-none absolute left-4 top-4 z-40 rounded-md border border-[#e0dacd] bg-[#fbfaf5]/86 px-4 py-3 shadow-sm backdrop-blur transition-opacity duration-500", memoryMode && "opacity-0")}>
          <p className="text-base font-black text-[#2f3b2f]">{forestScopeTitle(scope)}</p>
          <p className="mt-1 text-xs font-semibold text-[#747a71]">{forestScopeDescription(scope)}</p>
        </div>
        <div className={cn("pointer-events-none absolute bottom-4 left-4 z-40 hidden rounded-md border border-white/60 bg-white/70 px-3 py-2 text-xs font-bold text-[#52624f] shadow-sm backdrop-blur transition-opacity duration-500 sm:block", memoryMode && "opacity-0")}>
          ドラッグ / ホイール / ＋で木の中へ
        </div>
        <div className={cn("absolute bottom-4 right-4 z-[60] flex items-center gap-1 rounded-md border border-white/65 bg-white/74 p-1.5 text-[#4c5f4a] shadow-sm backdrop-blur transition-all duration-500", memoryMode && "border-white/20 bg-[#12251b]/62 text-white opacity-85")}>
          <Button
            aria-label="木の中へ近づく"
            className="h-9 w-9 rounded-md"
            size="icon"
            title="木の中へ近づく"
            variant="ghost"
            onClick={() => sendWorldControl("zoom-in")}
          >
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button
            aria-label="木から離れる"
            className="h-9 w-9 rounded-md"
            size="icon"
            title="木から離れる"
            variant="ghost"
            onClick={() => sendWorldControl("zoom-out")}
          >
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button
            aria-label="森の表示を戻す"
            className="h-9 w-9 rounded-md"
            size="icon"
            title="森の表示を戻す"
            variant="ghost"
            onClick={() => sendWorldControl("reset")}
          >
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        <ForestNodeTray celebrateId={celebrateId} mapNodes={mapNodes} memoryMode={memoryMode} onComplete={onComplete} scope={scope} />

        <MemoryOverlay tasks={memoryTasks} visible={memoryMode} />
      </section>

      <footer className={cn("grid gap-3 border-t border-[#e8e3d9] bg-[#fbfaf5]/94 p-4 transition-all duration-500 md:grid-cols-3 lg:px-8", memoryMode && "pointer-events-none max-h-0 overflow-hidden border-t-0 p-0 opacity-0")}>
        <BottomMetric label="連続日数" value={`${streak}日`} />
        <BottomMetric label="今月のタスク完了" value={`${monthCompleted}件`} />
        <BottomMetric label="成長率" value={`${Math.round(stage.progress)}%`} />
      </footer>
    </div>
  );
}

function ForestWorldLayer({
  control,
  controlNonce,
  mapNodes,
  onMemoryMode,
  scope,
  timeTone,
}: {
  control: WorldControl | null;
  controlNonce: number;
  mapNodes: ForestMapNode[];
  onMemoryMode: (enabled: boolean) => void;
  scope: ForestScope;
  timeTone: TimeTone;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const onMemoryModeRef = useRef(onMemoryMode);
  const controlRef = useRef<{ control: WorldControl | null; nonce: number }>({ control: null, nonce: 0 });

  useEffect(() => {
    onMemoryModeRef.current = onMemoryMode;
  }, [onMemoryMode]);

  useEffect(() => {
    controlRef.current = { control, nonce: controlNonce };
  }, [control, controlNonce]);

  useEffect(() => {
    const currentHost = hostRef.current;
    if (!currentHost) return undefined;
    const hostElement: HTMLDivElement = currentHost;

    const palette = worldPalette(timeTone);
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(palette.fog, palette.fogDensity);

    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 120);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = timeTone === "night" ? 1.18 : 1.08;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    renderer.domElement.className = "h-full w-full touch-none";
    hostElement.appendChild(renderer.domElement);

    const world = new THREE.Group();
    scene.add(world);

    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(34, 96),
      new THREE.MeshStandardMaterial({ color: palette.ground, roughness: 0.9, metalness: 0.02 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    world.add(ground);

    const ambientLight = new THREE.AmbientLight(palette.ambient, palette.ambientIntensity);
    scene.add(ambientLight);

    const sun = new THREE.DirectionalLight(palette.sun, palette.sunIntensity);
    sun.position.set(-10, 18, 12);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 1024;
    sun.shadow.mapSize.height = 1024;
    scene.add(sun);

    const fill = new THREE.DirectionalLight(palette.fill, 0.38);
    fill.position.set(12, 7, -10);
    scene.add(fill);

    addWorldPaths(world, mapNodes, palette.path);
    mapNodes.forEach((node) => world.add(createWorldTree(node, scope)));
    addWorldSeeds(world, palette.seed);

    const drag: DragState = {
      dragging: false,
      lastX: 0,
      lastY: 0,
      yaw: scope === "today" ? 0.18 : -0.38,
      pitch: 0.18,
      distance: scope === "today" ? 19 : 25,
      pinchDistance: null,
    };

    function resize() {
      const rect = hostElement.getBoundingClientRect();
      const width = Math.max(1, rect.width);
      const height = Math.max(1, rect.height);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    }

    function updateCamera() {
      const target = scope === "today" ? new THREE.Vector3(0.8, 2.9, 0.4) : new THREE.Vector3(0, 2.6, 0);
      const height = 6.5 + drag.pitch * 9;
      camera.position.set(Math.sin(drag.yaw) * drag.distance, height, Math.cos(drag.yaw) * drag.distance);
      camera.lookAt(target);
      onMemoryModeRef.current(drag.distance < 9.2);
    }

    function resetView() {
      drag.yaw = scope === "today" ? 0.18 : -0.38;
      drag.pitch = 0.18;
      drag.distance = scope === "today" ? 19 : 25;
      drag.pinchDistance = null;
    }

    let handledControlNonce = controlRef.current.nonce;
    function applyControlSignal() {
      const signal = controlRef.current;
      if (!signal.control || signal.nonce === handledControlNonce) return;
      handledControlNonce = signal.nonce;
      if (signal.control === "zoom-in") {
        drag.distance = Math.max(5.8, drag.distance - 8.8);
      } else if (signal.control === "zoom-out") {
        drag.distance = Math.min(34, drag.distance + 8.8);
      } else {
        resetView();
      }
    }

    function handlePointerDown(event: PointerEvent) {
      drag.dragging = true;
      drag.lastX = event.clientX;
      drag.lastY = event.clientY;
      renderer.domElement.setPointerCapture(event.pointerId);
    }

    function handlePointerMove(event: PointerEvent) {
      if (!drag.dragging) return;
      const dx = event.clientX - drag.lastX;
      const dy = event.clientY - drag.lastY;
      drag.lastX = event.clientX;
      drag.lastY = event.clientY;
      drag.yaw -= dx * 0.006;
      drag.pitch = Math.max(-0.08, Math.min(0.58, drag.pitch + dy * 0.003));
    }

    function handlePointerUp(event: PointerEvent) {
      drag.dragging = false;
      drag.pinchDistance = null;
      if (renderer.domElement.hasPointerCapture(event.pointerId)) {
        renderer.domElement.releasePointerCapture(event.pointerId);
      }
    }

    function handleWheel(event: WheelEvent) {
      event.preventDefault();
      drag.distance = Math.max(5.8, Math.min(34, drag.distance + event.deltaY * 0.018));
    }

    function getTouchDistance(event: TouchEvent) {
      const [a, b] = Array.from(event.touches);
      if (!a || !b) return null;
      return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
    }

    function handleTouchMove(event: TouchEvent) {
      if (event.touches.length !== 2) return;
      event.preventDefault();
      const distance = getTouchDistance(event);
      if (!distance) return;
      if (drag.pinchDistance !== null) {
        drag.distance = Math.max(5.8, Math.min(34, drag.distance - (distance - drag.pinchDistance) * 0.045));
      }
      drag.pinchDistance = distance;
    }

    function handleTouchEnd() {
      drag.pinchDistance = null;
    }

    let frameId = 0;
    const animationStart = window.performance.now();
    function animate() {
      const elapsed = (window.performance.now() - animationStart) / 1000;
      applyControlSignal();
      world.rotation.y += (drag.yaw - world.rotation.y) * 0.08;
      updateCamera();
      world.children.forEach((child: THREE.Object3D, index: number) => {
        if (!child.userData.floatTree) return;
        child.position.y = Math.sin(elapsed * 0.9 + index) * 0.04;
      });
      renderer.render(scene, camera);
      frameId = window.requestAnimationFrame(animate);
    }

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(hostElement);
    resize();
    animate();

    renderer.domElement.addEventListener("pointerdown", handlePointerDown);
    renderer.domElement.addEventListener("pointermove", handlePointerMove);
    renderer.domElement.addEventListener("pointerup", handlePointerUp);
    renderer.domElement.addEventListener("pointercancel", handlePointerUp);
    renderer.domElement.addEventListener("wheel", handleWheel, { passive: false });
    renderer.domElement.addEventListener("touchmove", handleTouchMove, { passive: false });
    renderer.domElement.addEventListener("touchend", handleTouchEnd);

    return () => {
      onMemoryModeRef.current(false);
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
      renderer.domElement.removeEventListener("pointermove", handlePointerMove);
      renderer.domElement.removeEventListener("pointerup", handlePointerUp);
      renderer.domElement.removeEventListener("pointercancel", handlePointerUp);
      renderer.domElement.removeEventListener("wheel", handleWheel);
      renderer.domElement.removeEventListener("touchmove", handleTouchMove);
      renderer.domElement.removeEventListener("touchend", handleTouchEnd);
      disposeThreeScene(scene);
      renderer.dispose();
      renderer.domElement.remove();
    };
  }, [mapNodes, scope, timeTone]);

  return (
    <div
      ref={hostRef}
      className={cn(
        "absolute inset-0 z-0 cursor-grab overflow-hidden active:cursor-grabbing",
        worldGradientClass(timeTone),
      )}
      aria-label="ドラッグとズームができる森の3Dワールド"
    />
  );
}

function MemoryOverlay({ tasks, visible }: { tasks: Task[]; visible: boolean }) {
  const memoryPositions = [
    { left: 18, top: 24 },
    { left: 62, top: 19 },
    { left: 42, top: 34 },
    { left: 74, top: 45 },
    { left: 25, top: 56 },
    { left: 51, top: 63 },
    { left: 67, top: 72 },
    { left: 35, top: 78 },
    { left: 81, top: 27 },
    { left: 12, top: 70 },
  ] as const;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="pointer-events-none absolute inset-0 z-50 overflow-hidden bg-[#1e2d26]/18 backdrop-blur-[1px]"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute left-1/2 top-1/2 w-[min(86vw,440px)] -translate-x-1/2 -translate-y-1/2 rounded-md border border-white/62 bg-[#fffdf7]/82 px-5 py-4 text-center shadow-[0_24px_70px_rgba(20,31,25,0.2)] backdrop-blur-lg"
            initial={{ y: 12, scale: 0.96, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
          >
            <p className="text-lg font-black text-[#213021]">木の中の記憶</p>
            <p className="mt-1 text-xs font-bold text-[#526150]">完了したtodoが浮かびます</p>
          </motion.div>

          {(tasks.length ? tasks : []).map((task, index) => {
            const position = memoryPositions[index % memoryPositions.length];
            return (
              <motion.div
                key={task.id}
                className="absolute max-w-[230px] rounded-full border border-white/62 bg-[#fffdf7]/72 px-4 py-2 text-xs font-black text-[#31503a] shadow-[0_12px_36px_rgba(34,49,37,0.14)] backdrop-blur-md"
                style={{ left: `${position.left}%`, top: `${position.top}%` }}
                initial={{ opacity: 0, y: 18, scale: 0.86 }}
                animate={{ opacity: 1, y: [0, -12, 0], scale: 1 }}
                transition={{ delay: index * 0.08, y: { duration: 3.6 + (index % 3), repeat: Infinity, ease: "easeInOut" } }}
              >
                <span className="mr-2 inline-block align-middle">
                  <span className={cn("inline-block rounded-full border align-middle", miniFruitClassName(task.difficulty))} />
                </span>
                <span className="align-middle">{shortTitle(task.title, 18)}</span>
                {task.completedAt && <span className="ml-2 align-middle text-[10px] text-[#6c7868]">{formatMonthDay(new Date(task.completedAt))}</span>}
              </motion.div>
            );
          })}

          {!tasks.length && (
            <motion.p
              className="absolute left-1/2 top-[62%] -translate-x-1/2 text-sm font-bold text-white"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              まだ実った記憶はありません
            </motion.p>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function ForestNodeTray({
  celebrateId,
  mapNodes,
  memoryMode,
  onComplete,
  scope,
}: {
  celebrateId: string | null;
  mapNodes: ForestMapNode[];
  memoryMode: boolean;
  onComplete: (id: string) => void;
  scope: ForestScope;
}) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute bottom-[4.75rem] left-4 right-4 z-40 flex justify-center transition-opacity duration-500",
        memoryMode && "opacity-0",
      )}
    >
      <div
        className={cn(
          "pointer-events-auto max-w-[min(100%,920px)] rounded-md border border-white/62 bg-[#fffdf7]/54 px-2 py-1.5 shadow-[0_14px_36px_rgba(38,49,38,0.1)] backdrop-blur-md dark:border-white/10 dark:bg-[#13201c]/66",
          scope === "today" && "max-w-[280px]",
        )}
      >
        <div className="flex flex-wrap items-end justify-center gap-1.5">
          {mapNodes.map((node) => (
            <motion.span
              key={node.id}
              className="relative"
              initial={false}
              animate={{
                y: celebrateId && (node.id === celebrateId || node.id.includes(celebrateId)) ? [0, -5, 0] : 0,
                scale: celebrateId && (node.id === celebrateId || node.id.includes(celebrateId)) ? [1, 1.04, 1] : 1,
              }}
              transition={{ duration: 0.55, ease: "easeOut" }}
            >
              <ForestNodeMarker
                compact
                node={node}
                popoverSide="top"
                onComplete={scope === "today" && node.id.startsWith("task:") ? () => onComplete(node.id.replace("task:", "")) : undefined}
              />
            </motion.span>
          ))}
        </div>
      </div>
    </div>
  );
}

function ForestNodeMarker({
  compact = false,
  node,
  onComplete,
  popoverSide = "bottom",
}: {
  compact?: boolean;
  node: ForestMapNode;
  onComplete?: () => void;
  popoverSide?: "bottom" | "top";
}) {
  const [open, setOpen] = useState(false);
  const showSublabel = node.sublabel && node.sublabel !== node.label;
  const fruits = node.fruits.slice(0, 5);
  const buds = node.buds.slice(0, Math.max(0, 5 - fruits.length));
  const hasFruits = node.fruits.length > 0;
  const popover = (
    <AnimatePresence>
      {open && (
        <motion.span
          className={cn(
            "absolute left-1/2 z-50 grid max-h-44 w-60 -translate-x-1/2 gap-2 overflow-auto rounded-md border border-[#ded8c8] bg-[#fffdf7]/96 p-3 text-left shadow-[0_14px_32px_rgba(38,49,38,0.16)] backdrop-blur dark:border-white/10 dark:bg-[#13201c]/96",
            popoverSide === "top" ? "bottom-[calc(100%+8px)]" : "top-[calc(100%+8px)]",
          )}
          initial={{ opacity: 0, y: -4, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -4, scale: 0.96 }}
          onClick={(event) => event.stopPropagation()}
        >
          <span className="text-xs font-black text-[#2f3b2f] dark:text-[#e8f5df]">実ったtodo</span>
          {node.fruits.map((fruit, index) => (
            <span key={`${fruit.title}-${index}`} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 text-xs font-semibold text-[#566055] dark:text-[#c6d5bf]">
              <span className={cn("rounded-full border", miniFruitClassName(fruit.difficulty))} />
              <span className="truncate">{fruit.title}</span>
              <span className="text-[10px] font-black text-[#71806d] dark:text-[#9fb19a]">{difficultyMeta[fruit.difficulty].label}</span>
            </span>
          ))}
        </motion.span>
      )}
    </AnimatePresence>
  );

  if (compact || !node.featured) {
    return (
      <span
        className={cn(
          "pointer-events-auto relative inline-flex items-center gap-1 rounded-full border border-white/74 bg-[#fffdf7]/82 px-1 py-1 text-left shadow-[0_8px_22px_rgba(38,49,38,0.1)] backdrop-blur-md dark:border-white/10 dark:bg-[#13201c]/82",
          node.future && "opacity-60",
        )}
      >
        <button
          type="button"
          className={cn(
            "relative grid h-8 min-w-8 place-items-center rounded-full border border-white/80 bg-[#fffdf7]/86 px-2 text-xs font-black tabular-nums text-[#4d7048] outline-none transition focus-visible:ring-2 focus-visible:ring-[#4e7d45]/35 dark:border-white/10 dark:bg-white/[0.08] dark:text-[#c9edbd]",
            hasFruits ? "hover:bg-white" : "cursor-default",
          )}
          disabled={!hasFruits}
          title={hasFruits ? "実ったtodoを見る" : "まだ実っていません"}
          aria-label={hasFruits ? `${node.label}の完了todoを見る` : `${node.label}はまだ実っていません`}
          onClick={(event) => {
            event.stopPropagation();
            if (hasFruits) setOpen((value) => !value);
          }}
        >
          {node.count}
          {fruits.length > 0 && (
            <span className="absolute -right-1 -top-1 flex gap-0.5">
              {fruits.slice(0, 3).map((fruit, index) => (
                <span key={`compact-fruit-${index}`} className={cn("rounded-full border", miniFruitClassName(fruit.difficulty))} />
              ))}
            </span>
          )}
        </button>
        <span className="max-w-20 truncate pr-1 text-[11px] font-black text-[#52624f] dark:text-[#dbe9d5]">
          {shortTitle(node.label, compact ? 6 : 8)}
        </span>
        {popover}
      </span>
    );
  }

  return (
    <span
      className={cn(
        "pointer-events-auto relative inline-flex max-w-full items-center gap-2 rounded-full border border-white/72 bg-[#fffdf7]/82 px-2.5 py-2 text-left shadow-[0_14px_34px_rgba(38,49,38,0.12)] backdrop-blur-md dark:border-white/10 dark:bg-[#13201c]/78",
        node.featured && "border-[#d5dfcc] bg-[#fffdf7]/90 shadow-[0_18px_44px_rgba(38,49,38,0.15)]",
        node.future && "opacity-60",
      )}
    >
      <span className="grid h-7 min-w-7 place-items-center rounded-full bg-[#6f8d65] px-2 text-xs font-black tabular-nums text-white shadow-sm">
        {node.count}
      </span>

      <button
        type="button"
        className={cn(
          "flex h-8 min-w-12 items-center justify-center gap-1 rounded-full border border-[#dcd5c7] bg-white/58 px-2 outline-none transition focus-visible:ring-2 focus-visible:ring-[#4e7d45]/35 dark:border-white/10 dark:bg-white/[0.06]",
          hasFruits ? "hover:bg-white" : "cursor-default",
        )}
        disabled={!hasFruits}
        title={hasFruits ? "実ったtodoを見る" : "まだ実っていません"}
        aria-label={hasFruits ? `${node.label}の完了todoを見る` : `${node.label}はまだ実っていません`}
        onClick={(event) => {
          event.stopPropagation();
          if (hasFruits) setOpen((value) => !value);
        }}
      >
        {fruits.length || buds.length ? (
          <>
            {fruits.map((fruit, index) => (
              <span key={`fruit-dot-${index}`} className={cn("rounded-full border", miniFruitClassName(fruit.difficulty))} />
            ))}
            {buds.map((bud, index) => (
              <span key={`bud-dot-${index}`} className={cn("rounded-full border shadow-[0_1px_4px_rgba(75,96,67,0.14)]", miniBudClassName(bud.difficulty))} />
            ))}
          </>
        ) : (
          <Sprout className="h-4 w-4 text-[#7f986f]" />
        )}
      </button>

      <span className="grid min-w-0 flex-1">
        <span className={cn("truncate text-sm font-black leading-tight text-[#354336] dark:text-[#eff8e8]", node.featured && "text-[#416c3a] dark:text-[#b8edaa]")}>
          {node.label}
        </span>
        {showSublabel && <span className="truncate text-[10px] font-bold leading-tight text-[#71806d] dark:text-[#a6b89e]">{node.sublabel}</span>}
      </span>

      {onComplete && (
        <button
          type="button"
          className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-[#4f7f47] text-white shadow-[0_8px_18px_rgba(50,83,44,0.2)] outline-none transition hover:bg-[#3f713b] focus-visible:ring-2 focus-visible:ring-[#4e7d45]/35"
          title={`${node.label}を完了`}
          aria-label={`${node.label}を完了`}
          onClick={(event) => {
            event.stopPropagation();
            onComplete();
          }}
        >
          <CheckCircle2 className="h-4 w-4" />
        </button>
      )}

      {popover}
    </span>
  );
}

function TodoFruitTree({ celebrate, node }: { celebrate?: boolean; node: ForestMapNode }) {
  const [openFruitIndex, setOpenFruitIndex] = useState<number | null>(null);
  const fruits = node.fruits.slice(0, fruitPositions.length);
  const buds = node.buds.slice(0, 5);
  const empty = node.todoCount === 0;
  const growthLevel = treeGrowthLevel(node);
  const mature = growthLevel >= 3;
  const seedOnly = growthLevel <= 1 && node.count === 0;
  const canopyScale = 0.76 + growthLevel * 0.035 + Math.min(fruits.length, 5) * 0.012;
  const trunkHeight = 42 + growthLevel * 6;
  const particleLeafCount = seedOnly ? 0 : Math.min(bonsaiLeafParticles.length, 10 + growthLevel * 4 + fruits.length);
  const openFruit = openFruitIndex === null ? undefined : fruits[openFruitIndex];
  const treeSvgId = `tree-${node.id.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
  const celebrationLeaves = [
    { left: 22, top: 40, x: -34, y: -42, rotate: -34, delay: 0.02 },
    { left: 35, top: 25, x: -22, y: -62, rotate: 22, delay: 0.05 },
    { left: 51, top: 18, x: 0, y: -70, rotate: -12, delay: 0.08 },
    { left: 66, top: 27, x: 24, y: -58, rotate: 38, delay: 0.04 },
    { left: 78, top: 43, x: 36, y: -36, rotate: 18, delay: 0.1 },
    { left: 30, top: 62, x: -42, y: 12, rotate: 44, delay: 0.12 },
    { left: 72, top: 66, x: 42, y: 16, rotate: -28, delay: 0.14 },
  ];

  return (
    <span className={cn("pointer-events-none relative block aspect-square w-full", node.future && "opacity-45")}>
      <AnimatePresence>
        {celebrate && (
          <motion.span
            className="absolute left-1/2 top-1/2 z-20 h-28 w-28 -translate-x-1/2 -translate-y-1/2 rounded-full border border-[#ffe9a3]/60"
            initial={{ opacity: 0.82, scale: 0.36 }}
            animate={{ opacity: 0, scale: 2.1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {celebrate &&
          celebrationLeaves.map((leaf, index) => (
            <motion.span
              key={index}
              className="absolute z-30 h-3 w-5 rounded-[999px_0_999px_0] bg-gradient-to-br from-[#d4e8ad] via-[#8fbd73] to-[#4f8348] shadow-[0_6px_14px_rgba(70,103,53,0.22)]"
              style={{ left: `${leaf.left}%`, top: `${leaf.top}%`, rotate: `${leaf.rotate}deg` }}
              initial={{ opacity: 0, scale: 0.35, x: 0, y: 0 }}
              animate={{ opacity: [0, 1, 0], scale: [0.35, 1, 0.72], x: leaf.x, y: leaf.y, rotate: leaf.rotate + 80 }}
              exit={{ opacity: 0 }}
              transition={{ delay: leaf.delay, duration: 1.05, ease: "easeOut" }}
            />
          ))}
      </AnimatePresence>
      <motion.svg
        aria-hidden="true"
        className="absolute inset-0 h-full w-full overflow-visible drop-shadow-[0_14px_18px_rgba(47,75,42,0.14)]"
        viewBox="0 0 160 160"
        initial={false}
        animate={{ scale: celebrate ? [1, 1.035, 1] : 1 }}
        transition={{ duration: 0.7, ease: "easeOut" }}
      >
        <defs>
          <linearGradient id={`trunk-${treeSvgId}`} x1="55" x2="105" y1="128" y2="58" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#4f3426" />
            <stop offset="0.48" stopColor="#8a654d" />
            <stop offset="1" stopColor="#5e3f2e" />
          </linearGradient>
          <radialGradient id={`leaf-${treeSvgId}`} cx="42%" cy="22%" r="76%">
            <stop offset="0" stopColor="#b7d8a5" />
            <stop offset="0.48" stopColor="#6fa45b" />
            <stop offset="1" stopColor="#3f783f" />
          </radialGradient>
          <radialGradient id={`base-${treeSvgId}`} cx="45%" cy="20%" r="68%">
            <stop offset="0" stopColor="#fffef7" />
            <stop offset="1" stopColor="#ded8c8" />
          </radialGradient>
          <filter id={`soft-shadow-${treeSvgId}`} x="-20%" y="-20%" width="140%" height="150%">
            <feDropShadow dx="0" dy="7" floodColor="#2f4a2d" floodOpacity="0.18" stdDeviation="5" />
          </filter>
        </defs>

        <ellipse cx="80" cy="143" rx="52" ry="8" fill="#5f6658" opacity="0.14" />
        <ellipse cx="80" cy="133" rx="39" ry="10" fill={`url(#base-${treeSvgId})`} stroke="#d5cdba" strokeWidth="1.2" />
        <ellipse cx="80" cy="128" rx="27" ry="7" fill="#557044" opacity="0.82" />
        <ellipse cx="80" cy="126" rx="19" ry="4.6" fill="#27351f" opacity="0.18" />
        {[58, 68, 92, 103].map((cx, index) => (
          <ellipse key={`moss-${index}`} cx={cx} cy={128 + (index % 2)} rx={3.2} ry={1.8} fill="#d8d3c4" opacity="0.82" />
        ))}

        {seedOnly ? (
          <motion.g initial={{ opacity: 0, y: 5, scale: 0.94 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ delay: 0.15, duration: 0.5 }}>
            <ellipse cx="80" cy="121" rx="8.5" ry="6.5" fill="#9a6a42" />
            <path d="M80 118 C78 110, 79 104, 84 98" fill="none" stroke="#5d7f45" strokeLinecap="round" strokeWidth="4" />
            {!empty && (
              <>
                <path d="M82 105 C73 99, 66 98, 60 102 C66 111, 76 112, 82 105Z" fill="#80a968" opacity="0.94" />
                <path d="M85 101 C94 93, 103 92, 110 96 C104 107, 94 109, 85 101Z" fill="#5f944f" opacity="0.94" />
              </>
            )}
          </motion.g>
        ) : (
          <>
            <motion.path
              d={`M78 130 C75 ${118 - growthLevel * 2}, 77 ${96 - growthLevel * 3}, 80 ${130 - trunkHeight} C84 ${91 - growthLevel * 2}, 86 ${82 - growthLevel * 2}, 86 ${78 - growthLevel * 3}`}
              fill="none"
              stroke={`url(#trunk-${treeSvgId})`}
              strokeLinecap="round"
              strokeWidth={mature ? 11 : 8}
              initial={{ pathLength: 0.18, opacity: 0.72 }}
              animate={{ pathLength: 1, opacity: 1 }}
              transition={{ duration: 0.85, ease: "easeOut" }}
            />
            <path d="M75 127 C66 124, 62 122, 55 119" fill="none" stroke="#644633" strokeLinecap="round" strokeWidth="3.2" opacity="0.72" />
            <path d="M84 127 C93 124, 99 122, 106 118" fill="none" stroke="#6b4c36" strokeLinecap="round" strokeWidth="3.2" opacity="0.72" />
            <motion.path
              d="M81 94 C66 86, 56 78, 48 68"
              fill="none"
              stroke="#6b4a38"
              strokeLinecap="round"
              strokeWidth={mature ? 4.6 : 3.2}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: growthLevel >= 2 ? 1 : 0.35 }}
              transition={{ delay: 0.2, duration: 0.6, ease: "easeOut" }}
            />
            <motion.path
              d="M84 89 C99 80, 111 74, 120 63"
              fill="none"
              stroke="#73513d"
              strokeLinecap="round"
              strokeWidth={mature ? 4.6 : 3.2}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: growthLevel >= 2 ? 1 : 0.45 }}
              transition={{ delay: 0.25, duration: 0.66, ease: "easeOut" }}
            />
            <motion.path
              d="M83 79 C79 66, 82 56, 88 45"
              fill="none"
              stroke="#7a5742"
              strokeLinecap="round"
              strokeWidth={growthLevel >= 4 ? 4 : 2.8}
              initial={{ pathLength: 0 }}
              animate={{ pathLength: growthLevel >= 3 ? 1 : 0.25 }}
              transition={{ delay: 0.32, duration: 0.68, ease: "easeOut" }}
            />

            <motion.g
              style={{ transformBox: "fill-box", transformOrigin: "center" }}
              initial={{ opacity: 0.45, scale: 0.78 }}
              animate={{
                opacity: 1,
                rotate: mature ? [0, -0.8, 0.6, 0] : 0,
                scale: canopyScale,
              }}
              transition={{
                opacity: { duration: 0.38 },
                rotate: { duration: 5.4, ease: "easeInOut", repeat: Infinity },
                scale: { duration: 0.55, ease: "easeOut" },
              }}
              filter={`url(#soft-shadow-${treeSvgId})`}
            >
              {bonsaiLeafParticles.slice(0, particleLeafCount).map((leaf, index) => (
                <motion.ellipse
                  key={index}
                  cx={leaf.cx}
                  cy={leaf.cy}
                  fill={leaf.color}
                  initial={{ opacity: 0, scale: 0.42 }}
                  animate={{ opacity: leaf.opacity, scale: 1 }}
                  rx={leaf.rx}
                  ry={leaf.ry}
                  style={{ transformBox: "fill-box", transformOrigin: "center", rotate: `${leaf.rotate}deg` }}
                  transition={{ delay: 0.08 + index * 0.018, type: "spring", stiffness: 150, damping: 16 }}
                />
              ))}
            </motion.g>
          </>
        )}
      </motion.svg>

      {fruits.map((fruit, index) => {
        const position = fruitPositions[index];
        return (
          <motion.button
            key={`fruit-${index}`}
            type="button"
            title={fruit.title}
            className={cn(
              "pointer-events-auto absolute grid place-items-center rounded-full border text-[9px] font-black text-white outline-none transition focus-visible:ring-2 focus-visible:ring-[#4e7d45]/35",
              fruitClassName(fruit.difficulty),
              openFruitIndex === index && "scale-110 ring-2 ring-[#4e7d45]/35",
            )}
            style={{ left: `${position.left}%`, top: `${position.top}%` }}
            onClick={(event) => {
              event.stopPropagation();
              setOpenFruitIndex(openFruitIndex === index ? null : index);
            }}
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: celebrate && index === fruits.length - 1 ? [0.45, 1.38, 1] : 1, opacity: 1, y: celebrate && index === fruits.length - 1 ? [0, -5, 0] : 0 }}
            transition={{ delay: index * 0.03, type: "spring", stiffness: 170, damping: 14 }}
            whileHover={{ scale: 1.13 }}
            aria-label={`${fruit.title} の完了内容を表示`}
          >
            <span className="h-[34%] w-[34%] rounded-full bg-white/34 shadow-[inset_0_1px_2px_rgba(255,255,255,0.65)]" />
          </motion.button>
        );
      })}

      {buds.map((bud, index) => {
        const position = fruitPositions[fruitPositions.length - 1 - index];
        return (
          <span
            key={`bud-${index}`}
            title={bud.title}
            className={cn(
              "absolute rounded-full border border-[#8da383] bg-[#e8f0df] shadow-[0_2px_6px_rgba(67,92,62,0.12)]",
              budClassName(bud.difficulty),
            )}
            style={{ left: `${position.left}%`, top: `${position.top}%` }}
          />
        );
      })}

      <span className="absolute bottom-[12%] right-[4%] grid h-7 min-w-7 place-items-center rounded-full bg-[#6f8d65] px-2 text-xs font-black text-white shadow-sm md:h-8 md:min-w-8 md:text-sm">
        {node.count}
      </span>
      <AnimatePresence>
        {openFruit && (
          <motion.span
            className="pointer-events-auto absolute left-1/2 top-[88%] z-50 grid max-h-44 w-56 -translate-x-1/2 gap-2 overflow-auto rounded-md border border-[#ded8c8] bg-[#fffdf7]/96 p-3 text-left shadow-[0_14px_32px_rgba(38,49,38,0.16)] backdrop-blur dark:border-white/10 dark:bg-[#13201c]/96"
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            onClick={(event) => event.stopPropagation()}
          >
            <span className="text-xs font-black text-[#2f3b2f] dark:text-[#e8f5df]">実ったtodo</span>
            {node.fruits.map((fruit, index) => (
              <span key={`${fruit.title}-${index}`} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 text-xs font-semibold text-[#566055] dark:text-[#c6d5bf]">
                <span className={cn("rounded-full border", miniFruitClassName(fruit.difficulty))} />
                <span className="truncate">{fruit.title}</span>
                <span className="text-[10px] font-black text-[#71806d] dark:text-[#9fb19a]">{difficultyMeta[fruit.difficulty].label}</span>
              </span>
            ))}
          </motion.span>
        )}
      </AnimatePresence>
      {celebrate && <span className="absolute inset-4 rounded-full bg-amber-200/45 blur-md" />}
    </span>
  );
}

function BottomMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-[#e4dfd4] bg-white/60 px-5 py-4 text-center">
      <p className="text-xs font-bold text-[#767d73]">{label}</p>
      <p className="mt-1 text-2xl font-black tabular-nums text-[#445341]">{value}</p>
    </div>
  );
}

function TaskScreen({
  compact,
  completedTasks,
  difficulty,
  notes,
  onComplete,
  onDelete,
  onDifficulty,
  onNotes,
  onParent,
  onSubmit,
  onTitle,
  parentId,
  pendingTasks,
  query,
  selectedParentTitle,
  setActiveView,
  setQuery,
  tasks,
  timeTone,
  title,
  treeCelebrate,
}: {
  compact: boolean;
  completedTasks: Task[];
  difficulty: Difficulty;
  notes: string;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onDifficulty: (difficulty: Difficulty) => void;
  onNotes: (notes: string) => void;
  onParent: (parentId: string) => void;
  onSubmit: () => void;
  onTitle: (title: string) => void;
  parentId: string;
  pendingTasks: Task[];
  query: string;
  selectedParentTitle?: string;
  setActiveView: (view: AppView) => void;
  setQuery: (query: string) => void;
  tasks: Task[];
  timeTone: TimeTone;
  title: string;
  treeCelebrate: boolean;
}) {
  const displayTasks = [...pendingTasks, ...completedTasks];
  const displayTaskIds = new Set(displayTasks.map((task) => task.id));
  const children = childrenByParent(displayTasks);
  const rootTasks = displayTasks.filter((task) => !task.parentId || !displayTaskIds.has(task.parentId));
  const todayNode = buildTodayOverviewNode(tasks);
  const todayProgress = todayNode.todoCount ? Math.round((todayNode.count / todayNode.todoCount) * 100) : 0;
  const parentCount = displayTasks.filter((task) => (children.get(task.id) ?? []).length > 0).length;

  return (
    <div className={cn("grid gap-5 p-3 sm:p-4 lg:grid-cols-[minmax(0,1fr)_390px] lg:p-6 xl:p-8", compact && "gap-3 p-2 sm:p-3 lg:grid-cols-[minmax(0,1fr)_340px] lg:p-4 xl:p-5")}>
      <section className={cn("grid min-w-0 content-start gap-4", compact && "gap-3")}>
        <TaskOverviewBand
          compact={compact}
          completedCount={completedTasks.length}
          onForest={() => setActiveView("forest")}
          parentCount={parentCount}
          pendingCount={pendingTasks.length}
          progress={todayProgress}
          timeTone={timeTone}
          todayNode={todayNode}
        />

        <div className={cn("grid gap-3 rounded-md border border-[#e5dfd2] bg-[#fffdf8]/72 p-3 shadow-[0_14px_36px_rgba(38,49,38,0.06)] backdrop-blur dark:border-white/10 dark:bg-white/[0.05] md:grid-cols-[minmax(0,1fr)_auto] md:items-center", compact && "gap-2 p-2.5")}>
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b9288]" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="h-11 rounded-md border-[#ddd8cc] bg-white/78 pl-9 font-semibold shadow-inner placeholder:text-[#9ca398] dark:border-white/10 dark:bg-white/[0.08] dark:text-[#edf5e9] dark:placeholder:text-[#83927e]"
              placeholder="タスクやメモを探す"
            />
          </label>
          <div className="flex flex-wrap items-center gap-2">
            <TaskPill label="未完了" value={pendingTasks.length} />
            <TaskPill label="実" value={todayNode.count} />
            <TaskPill label="親" value={parentCount} />
          </div>
        </div>

        <div className={cn("rounded-md border border-[#e4dfd4] bg-[#fffdf8]/66 p-2 shadow-[0_18px_48px_rgba(38,49,38,0.07)] backdrop-blur dark:border-white/10 dark:bg-white/[0.045] dark:shadow-[0_18px_48px_rgba(0,0,0,0.25)]", compact && "p-1.5")}>
          <div className={cn("flex flex-col gap-2 px-2 pb-3 pt-1 sm:flex-row sm:items-end sm:justify-between", compact && "pb-2")}>
            <div>
              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-[#82907d] dark:text-[#93a88e]">Task Tree</p>
              <h2 className={cn("text-xl font-black text-[#263126] dark:text-[#eef4e8]", compact && "text-lg")}>今日やること</h2>
            </div>
            <Badge variant="outline" className="w-fit border-[#d9d3c5] bg-white/70 font-black text-[#536050] dark:border-white/10 dark:bg-white/[0.06] dark:text-[#d9e8d3]">
              {rootTasks.length}本の幹
            </Badge>
          </div>
          <div className={cn("grid gap-2.5", compact && "gap-1.5")}>
            <AnimatePresence initial={false}>
              {rootTasks.map((task) => (
                <NestedTaskRow
                  key={task.id}
                  childrenMap={children}
                  depth={0}
                  onComplete={onComplete}
                  onDelete={onDelete}
                  onParent={(id) => {
                    onParent(id);
                    setActiveView("tasks");
                  }}
                  compact={compact}
                  task={task}
                />
              ))}
            </AnimatePresence>
            {!rootTasks.length && <EmptyState text="タスクがまだありません" />}
          </div>
        </div>
      </section>

      <aside className={cn("grid h-fit gap-4", compact && "gap-3")}>
        <TodayTreeCard
          celebrate={treeCelebrate}
          compact={compact}
          node={todayNode}
          progress={todayProgress}
          onForest={() => setActiveView("forest")}
        />

        <Card className="border-[#ded8c8] bg-[#fffdf7]/86 shadow-[0_18px_48px_rgba(38,49,38,0.08)] backdrop-blur dark:border-white/10 dark:bg-white/[0.055] dark:shadow-[0_18px_48px_rgba(0,0,0,0.25)]">
          <CardHeader className={cn("pb-3", compact && "p-4 pb-2")}>
            <CardTitle className="flex items-center gap-2">
              <Sprout className="h-4 w-4 text-[#4e7d45]" />
              todoを植える
            </CardTitle>
            <CardDescription className="dark:text-[#a8b8a2]">{selectedParentTitle ? `親: ${selectedParentTitle}` : "親タスクなし"}</CardDescription>
          </CardHeader>
          <CardContent className={cn("grid gap-3", compact && "gap-2 p-4 pt-0")}>
            <Input
              value={title}
              onChange={(event) => onTitle(event.target.value)}
              onKeyDown={(event) => event.key === "Enter" && onSubmit()}
              className="h-11 rounded-md border-[#ddd8cc] bg-white/80 font-semibold dark:border-white/10 dark:bg-white/[0.08] dark:text-[#edf5e9] dark:placeholder:text-[#83927e]"
              placeholder="タスク名"
            />
            <Textarea value={notes} onChange={(event) => onNotes(event.target.value)} className="min-h-20 rounded-md border-[#ddd8cc] bg-white/80 font-medium dark:border-white/10 dark:bg-white/[0.08] dark:text-[#edf5e9] dark:placeholder:text-[#83927e]" placeholder="メモ" />
            <select
              className="h-11 rounded-md border border-[#ddd8cc] bg-white/80 px-3 text-sm font-semibold outline-none dark:border-white/10 dark:bg-[#17221f] dark:text-[#edf5e9]"
              value={parentId}
              onChange={(event) => onParent(event.target.value)}
            >
              <option value="">親タスクなし</option>
              {tasks.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.title}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(difficultyMeta) as Difficulty[]).map((key) => (
                <button
                  key={key}
                  type="button"
                  className={cn(
                    "grid gap-1 rounded-md border px-2 py-2 text-center text-xs font-black transition",
                    difficulty === key
                      ? "border-[#4e7d45] bg-[#e6ecdf] text-[#334a31] shadow-[0_8px_18px_rgba(78,125,69,0.12)] dark:border-[#8ccf83] dark:bg-[#1d3a28] dark:text-[#e9f6e2]"
                      : "border-[#ddd8cc] bg-white/64 text-[#6a7467] hover:bg-white dark:border-white/10 dark:bg-white/[0.06] dark:text-[#c2d0bc] dark:hover:bg-white/[0.1]",
                  )}
                  onClick={() => onDifficulty(key)}
                >
                  <span className={cn("mx-auto rounded-full border", miniFruitClassName(key))} />
                  <span>{difficultyMeta[key].label}</span>
                  <span className="text-[10px] text-[#7b8278] dark:text-[#9fb19a]">{difficultyMeta[key].hint}</span>
                </button>
              ))}
            </div>
            <Button className="h-11 rounded-md bg-[#3f7b3b] font-black text-white shadow-[0_12px_28px_rgba(63,123,59,0.24)] hover:bg-[#356b32]" onClick={onSubmit}>
              <Plus className="h-4 w-4" />
              植える
            </Button>
          </CardContent>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          <MiniMetric label="未完了" value={pendingTasks.length} />
          <MiniMetric label="完了済み" value={completedTasks.length} />
        </div>
      </aside>
    </div>
  );
}

function TaskOverviewBand({
  compact,
  completedCount,
  onForest,
  parentCount,
  pendingCount,
  progress,
  timeTone,
  todayNode,
}: {
  compact: boolean;
  completedCount: number;
  onForest: () => void;
  parentCount: number;
  pendingCount: number;
  progress: number;
  timeTone: TimeTone;
  todayNode: ForestMapNode;
}) {
  return (
    <section className={cn("relative overflow-hidden rounded-md border border-[#ded8c8] bg-[linear-gradient(135deg,#fffdf7_0%,#f2f4ea_52%,#e8efe2_100%)] p-4 shadow-[0_18px_48px_rgba(38,49,38,0.08)] backdrop-blur dark:border-white/10 dark:bg-[linear-gradient(135deg,rgba(27,39,34,0.92),rgba(15,24,21,0.96))] dark:shadow-[0_18px_54px_rgba(0,0,0,0.28)]", compact && "p-3")}>
      <div className="pointer-events-none absolute -right-20 -top-24 h-56 w-56 rounded-full bg-[#dbe8cd]/72 blur-3xl dark:bg-[#2f6841]/34" />
      <div className="pointer-events-none absolute bottom-0 left-0 h-20 w-full bg-[linear-gradient(90deg,rgba(112,141,94,0.08),transparent)]" />
      <div className="relative grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-start">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="rounded-full bg-[#e3eadb] px-3 py-1 text-[#3f5f3b] shadow-none dark:bg-[#243a2a] dark:text-[#bde8b3]">
              <Target className="mr-1 h-3.5 w-3.5" />
              今日のフォーカス
            </Badge>
            <span className="flex items-center gap-1 text-xs font-black text-[#71806d] dark:text-[#a8b8a2]">
              <Clock3 className="h-3.5 w-3.5" />
              {timeToneLabel(timeTone)}
            </span>
          </div>
          <h2 className={cn("mt-3 text-2xl font-black tracking-normal text-[#263126] dark:text-[#eef4e8] sm:text-3xl", compact && "mt-2 text-xl sm:text-2xl")}>今日やることを実にする</h2>
          <p className={cn("mt-1 max-w-2xl text-sm font-semibold text-[#6f786c] dark:text-[#b2c0ac]", compact && "text-xs")}>
            親todoは幹、小todoは実。完了すると木に内容が残ります。
          </p>
        </div>
        <Button className={cn("h-11 rounded-md bg-[#3f7b3b] px-4 font-black text-white shadow-[0_12px_28px_rgba(63,123,59,0.24)] hover:bg-[#356b32]", compact && "h-9 px-3 text-sm")} onClick={onForest}>
          <TreePine className="h-4 w-4" />
          森を見る
        </Button>
      </div>

      <div className={cn("relative mt-5 grid grid-cols-2 gap-3 md:grid-cols-4", compact && "mt-3 gap-2")}>
        <OverviewStat compact={compact} icon={<ListTodo className="h-4 w-4" />} label="未完了" value={pendingCount} />
        <OverviewStat compact={compact} icon={<CheckCircle2 className="h-4 w-4" />} label="完了済み" value={completedCount} />
        <OverviewStat compact={compact} icon={<CalendarCheck className="h-4 w-4" />} label="今日の実" value={`${todayNode.count}/${todayNode.todoCount}`} />
        <OverviewStat compact={compact} icon={<Sparkles className="h-4 w-4" />} label="親タスク" value={parentCount} />
      </div>

      <div className={cn("relative mt-4", compact && "mt-3")}>
        <div className="mb-2 flex items-center justify-between text-xs font-black text-[#6d746c] dark:text-[#a8b8a2]">
          <span>今日の成長ゲージ</span>
          <span>{progress}%</span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-[#e2dece] shadow-inner dark:bg-white/10">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-[#8faf77] via-[#4e7d45] to-[#d1a63b]"
            initial={false}
            animate={{ width: `${progress}%` }}
            transition={{ type: "spring", stiffness: 120, damping: 20 }}
          />
        </div>
      </div>
    </section>
  );
}

function TodayTreeCard({
  celebrate,
  compact,
  node,
  onForest,
  progress,
}: {
  celebrate: boolean;
  compact: boolean;
  node: ForestMapNode;
  onForest: () => void;
  progress: number;
}) {
  const growthLevel = treeGrowthLevel(node);
  const stageLabel = todayTreeStageLabel(growthLevel, node.count, node.todoCount);
  const fruits = node.fruits.slice(0, 4);
  const buds = node.buds.slice(0, 3);
  const progressStyle = {
    background: `conic-gradient(#4e7d45 ${progress * 3.6}deg, rgba(226, 222, 206, 0.92) 0deg)`,
  };

  return (
    <Card className={cn("overflow-hidden border-[#d8d1c2] bg-[#fffdf7]/90 shadow-[0_22px_60px_rgba(38,49,38,0.12)] backdrop-blur transition-shadow duration-500 dark:border-white/10 dark:bg-[#121c18]/84 dark:shadow-[0_22px_60px_rgba(0,0,0,0.32)]", celebrate && "shadow-[0_26px_80px_rgba(181,133,39,0.24)]")}>
      <CardHeader className={cn("relative overflow-hidden border-b border-[#e6dfd0]/90 bg-[linear-gradient(135deg,#fffaf0_0%,#eef5e8_58%,#e2ecda_100%)] pb-3 dark:border-white/10 dark:bg-[linear-gradient(135deg,#18251f_0%,#13231b_58%,#0e1714_100%)]", compact && "p-4 pb-2")}>
        <div className="pointer-events-none absolute -right-12 -top-16 h-36 w-36 rounded-full bg-[#d8e8c6]/85 blur-2xl dark:bg-[#4f8b55]/28" />
        <div className="relative flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="flex items-center gap-2 text-[#263126] dark:text-[#eef4e8]">
              <span className={cn("grid h-9 w-9 place-items-center rounded-md bg-[#e3eadb] text-[#4e7d45] shadow-inner dark:bg-[#203326] dark:text-[#a7df9e]", compact && "h-8 w-8")}>
                <TreePine className="h-5 w-5 fill-current" />
              </span>
              <span className="grid min-w-0">
                <span className="text-base font-black leading-tight">今日の木</span>
                <span className="text-[11px] font-black text-[#74806f] dark:text-[#9fb19a]">{node.count}/{node.todoCount} 実った</span>
              </span>
            </CardTitle>
            <div className={cn("mt-2 flex flex-wrap items-center gap-1.5 font-semibold dark:text-[#a8b8a2]", compact && "mt-1.5")}>
              <Badge className="rounded-full bg-[#426f3d] px-2.5 py-0.5 text-white shadow-none">{stageLabel}</Badge>
              {!compact && <span className="text-xs text-[#6d7869] dark:text-[#a8b8a2]">完了したtodoだけ育つ</span>}
            </div>
          </div>
          <Button variant="outline" size="sm" className={cn("h-9 shrink-0 rounded-md border-[#d3cabb] bg-white/76 font-black text-[#4e7d45] shadow-sm hover:bg-white dark:border-white/10 dark:bg-white/[0.08] dark:text-[#a7df9e]", compact && "h-8 px-2.5")} onClick={onForest}>
            森へ
          </Button>
        </div>
      </CardHeader>

      <CardContent className={cn("grid gap-3 p-3", compact && "gap-2 p-2.5")}>
        <div className={cn("relative min-h-[292px] overflow-hidden rounded-md border border-[#ddd6c8] bg-[linear-gradient(180deg,#fbf7eb_0%,#eef4e7_58%,#dfe8d4_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.82)] dark:border-white/10 dark:bg-[linear-gradient(180deg,#182620_0%,#132019_58%,#0d1714_100%)]", compact && "min-h-[224px]")}>
          <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(96,113,91,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(96,113,91,0.08)_1px,transparent_1px)] bg-[size:44px_44px]" />
          <div className="pointer-events-none absolute left-1/2 top-4 h-28 w-28 -translate-x-1/2 rounded-full bg-[#fff1b8]/64 blur-2xl dark:bg-[#7bb26c]/20" />
          <div className="pointer-events-none absolute bottom-0 left-0 h-24 w-full rounded-t-[50%] bg-[linear-gradient(180deg,rgba(181,194,156,0.35),rgba(126,145,98,0.52))] dark:bg-[linear-gradient(180deg,rgba(49,76,55,0.4),rgba(25,44,32,0.62))]" />
          <AnimatePresence>
            {celebrate && (
              <motion.div
                className="pointer-events-none absolute inset-0 z-10 bg-[radial-gradient(circle_at_50%_42%,rgba(255,232,145,0.58),rgba(255,232,145,0.16)_26%,transparent_60%)]"
                initial={{ opacity: 0, scale: 0.86 }}
                animate={{ opacity: [0, 1, 0], scale: [0.86, 1.1, 1.22] }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.9, ease: "easeOut" }}
              />
            )}
          </AnimatePresence>

          <div className={cn("absolute right-3 top-3 grid h-16 w-16 place-items-center rounded-full bg-white/78 p-1 shadow-[0_12px_28px_rgba(53,74,48,0.12)] dark:bg-[#13201c]/82", compact && "right-2 top-2 h-12 w-12")} style={progressStyle}>
            <div className="grid h-full w-full place-items-center rounded-full bg-[#fffdf7] text-center dark:bg-[#12201a]">
              <span className={cn("text-sm font-black tabular-nums text-[#31503a] dark:text-[#dff2d9]", compact && "text-xs")}>{progress}%</span>
            </div>
          </div>

          <motion.div
            className={cn("relative z-10 mx-auto mt-4 w-[min(84%,292px)]", compact && "mt-2 w-[min(74%,228px)]")}
            initial={false}
            animate={{ y: node.count ? [0, -2, 0] : 0 }}
            transition={{ duration: 3.6, ease: "easeInOut", repeat: node.count ? Infinity : 0 }}
          >
            <TodoFruitTree celebrate={celebrate} node={node} />
          </motion.div>
        </div>

        <div className={cn("grid grid-cols-3 gap-2", compact && "gap-1.5")}>
          <TreeTinyStat label="段階" value={stageLabel} />
          <TreeTinyStat label="芽" value={node.buds.length} />
          <TreeTinyStat label="実" value={node.fruits.length} />
        </div>

        <div className={cn("grid gap-2 rounded-md border border-[#e2dbcd] bg-white/58 p-2.5 dark:border-white/10 dark:bg-white/[0.045]", compact && "gap-1.5 p-2")}>
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs font-black text-[#536050] dark:text-[#d9e8d3]">実の意味</p>
            <div className="flex items-center gap-2 text-[10px] font-black text-[#687365] dark:text-[#a8b8a2]">
              {(Object.keys(difficultyMeta) as Difficulty[]).map((key) => (
                <span key={key} className="inline-flex items-center gap-1">
                  <span className={cn("rounded-full border", miniFruitClassName(key))} />
                  {difficultyMeta[key].label}
                </span>
              ))}
            </div>
          </div>

          <div className="grid gap-1.5">
            {fruits.length > 0 ? (
              fruits.map((fruit, index) => (
                <div key={`${fruit.title}-${index}`} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-md bg-[#f7f3ea]/82 px-2 py-1.5 text-xs font-bold text-[#546052] dark:bg-white/[0.055] dark:text-[#cbd9c4]">
                  <span className={cn("rounded-full border", miniFruitClassName(fruit.difficulty))} />
                  <span className="truncate">{fruit.title}</span>
                  <span className="text-[10px] font-black text-[#74806f] dark:text-[#9fb19a]">{difficultyMeta[fruit.difficulty].label}</span>
                </div>
              ))
            ) : (
              buds.map((bud, index) => (
                <div key={`${bud.title}-${index}`} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 rounded-md bg-[#f7f3ea]/72 px-2 py-1.5 text-xs font-bold text-[#65715f] dark:bg-white/[0.045] dark:text-[#b7c7b1]">
                  <span className={cn("rounded-full border shadow-[0_1px_4px_rgba(75,96,67,0.14)]", miniBudClassName(bud.difficulty))} />
                  <span className="truncate">{bud.title}</span>
                  <span className="text-[10px] font-black text-[#7b8576] dark:text-[#9fb19a]">芽</span>
                </div>
              ))
            )}
            {!fruits.length && !buds.length && (
              <div className="rounded-md bg-[#f7f3ea]/72 px-2 py-2 text-center text-xs font-bold text-[#74806f] dark:bg-white/[0.045] dark:text-[#9fb19a]">
                todoを植えると芽が出ます
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function OverviewStat({ compact = false, icon, label, value }: { compact?: boolean; icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className={cn("rounded-md border border-white/80 bg-white/62 px-3 py-3 shadow-[0_10px_24px_rgba(38,49,38,0.06)] dark:border-white/10 dark:bg-white/[0.055]", compact && "px-2.5 py-2")}>
      <div className="flex items-center gap-2 text-[#6b7567] dark:text-[#b2c0ac]">
        <span className={cn("grid h-8 w-8 place-items-center rounded-md bg-[#eef3e8] text-[#4e7d45] dark:bg-[#203326] dark:text-[#a7df9e]", compact && "h-7 w-7")}>{icon}</span>
        <span className="text-xs font-black">{label}</span>
      </div>
      <p className={cn("mt-2 text-xl font-black tabular-nums text-[#2f3b2f] dark:text-[#eef4e8] sm:text-2xl", compact && "mt-1 text-lg sm:text-xl")}>{value}</p>
    </div>
  );
}

function TaskPill({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <span className="inline-flex h-9 items-center gap-2 rounded-full border border-[#ded8c8] bg-white/74 px-3 text-xs font-black text-[#536050] dark:border-white/10 dark:bg-white/[0.06]">
      <span className="text-[#7b8278] dark:text-[#9fb19a]">{label}</span>
      <span className="tabular-nums text-[#31503a] dark:text-[#dff2d9]">{value}</span>
    </span>
  );
}

function TreeTinyStat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border border-[#e5dfd2] bg-white/64 px-2 py-2 text-center dark:border-white/10 dark:bg-white/[0.06]">
      <p className="text-[10px] font-black text-[#7b8278] dark:text-[#9fb19a]">{label}</p>
      <p className="mt-0.5 text-base font-black tabular-nums text-[#334a31] dark:text-[#e8f5df]">{value}</p>
    </div>
  );
}

function NestedTaskRow({
  childrenMap,
  compact = false,
  depth,
  onComplete,
  onDelete,
  onParent,
  task,
}: {
  childrenMap: Map<string, Task[]>;
  compact?: boolean;
  depth: number;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onParent: (id: string) => void;
  task: Task;
}) {
  const childTasks = childrenMap.get(task.id) ?? [];
  const childDone = childTasks.filter((child) => child.completed).length;
  const childProgress = childTasks.length ? Math.round((childDone / childTasks.length) * 100) : task.completed ? 100 : 0;

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }}>
      <div
        className={cn(
          "group relative grid gap-2 overflow-hidden rounded-md border border-[#e4dfd4] bg-white/78 p-3.5 shadow-[0_10px_26px_rgba(38,49,38,0.06)] transition hover:-translate-y-0.5 hover:border-[#d3dbc8] hover:bg-white hover:shadow-[0_16px_34px_rgba(38,49,38,0.1)] dark:border-white/10 dark:bg-white/[0.055] dark:shadow-[0_10px_30px_rgba(0,0,0,0.18)] dark:hover:bg-white/[0.08]",
          task.completed && "border-[#e1ded2] bg-[#f2f3eb]/82 text-[#7a8177] hover:bg-[#f5f5ef] dark:border-white/10 dark:bg-white/[0.035] dark:text-[#83927e] dark:hover:bg-white/[0.055]",
          compact && "gap-1.5 p-2.5 shadow-[0_8px_18px_rgba(38,49,38,0.05)]",
        )}
        style={{ marginLeft: depth ? Math.min(depth * (compact ? 16 : 22), compact ? 42 : 58) : 0 }}
      >
        <span className={cn("absolute inset-y-0 left-0 w-1 bg-[#8caf77]", task.completed && "bg-[#c7cbbd]", task.difficulty === "hard" && "bg-[#d1a63b]")} />
        <div className={cn("grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3", compact && "gap-2")}>
          <span className={cn("grid h-9 w-9 place-items-center rounded-md border border-[#ddd8cc] bg-[#fffdf7] shadow-inner dark:border-white/10 dark:bg-white/[0.08]", compact && "h-8 w-8")}>
            <Checkbox
              aria-label={task.completed ? `${task.title}は完了済み` : `${task.title}を完了`}
              checked={task.completed}
              disabled={task.completed}
              onCheckedChange={() => !task.completed && onComplete(task.id)}
            />
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className={cn("min-w-0 max-w-full truncate text-base font-black text-[#263126] dark:text-[#eef4e8]", task.completed && "text-[#7a8177] line-through dark:text-[#83927e]", compact && "text-sm")}>{task.title}</p>
              <DifficultyBadge difficulty={task.difficulty} />
              {!!childTasks.length && (
                <Badge variant="outline" className="rounded-full border-[#d9d3c5] bg-[#fffdf7]/74 text-[#536050] dark:border-white/10 dark:bg-white/[0.06] dark:text-[#d9e8d3]">
                  {childDone}/{childTasks.length}
                </Badge>
              )}
            </div>
            {task.notes && <p className={cn("mt-1 line-clamp-2 text-sm text-[#777f75] dark:text-[#a8b8a2]", compact && "line-clamp-1 text-xs")}>{task.notes}</p>}
            {!!childTasks.length && (
              <div className={cn("mt-3 rounded-md border border-[#ebe5d7] bg-[#f8f7ef]/80 p-2.5 dark:border-white/10 dark:bg-white/[0.045]", compact && "mt-2 p-2")}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <span className={cn("h-9 w-1.5 rounded-full bg-gradient-to-b from-[#7b5944] via-[#5f4131] to-[#3f2d24]", compact && "h-7")} />
                    <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                      {childTasks.slice(0, 12).map((child) => (
                        <span
                          key={child.id}
                          title={child.title}
                          className={cn(
                            "rounded-full border",
                            child.completed ? miniFruitClassName(child.difficulty) : miniBudClassName(child.difficulty),
                          )}
                        />
                      ))}
                    </div>
                  </div>
                  <span className="shrink-0 text-xs font-black tabular-nums text-[#657160] dark:text-[#a8b8a2]">{childProgress}%</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#e1ddcf] dark:bg-white/10">
                  <div className="h-full rounded-full bg-gradient-to-r from-[#8faf77] to-[#d1a63b]" style={{ width: `${childProgress}%` }} />
                </div>
              </div>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className={cn("h-8 w-8 rounded-md text-[#60715e] hover:bg-[#e9eee1] dark:text-[#a7c7a0] dark:hover:bg-white/[0.08]", compact && "h-7 w-7")} onClick={() => onParent(task.id)} aria-label={`${task.title}に小タスクを追加`}>
              <Plus className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className={cn("h-8 w-8 rounded-md text-[#a15d55] hover:bg-[#f3e3df] dark:text-[#e08d83] dark:hover:bg-white/[0.08]", compact && "h-7 w-7")} onClick={() => onDelete(task.id)} aria-label={`${task.title}を削除`}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      {childTasks.map((child) => (
        <NestedTaskRow
          key={child.id}
          childrenMap={childrenMap}
          depth={depth + 1}
          onComplete={onComplete}
          onDelete={onDelete}
          onParent={onParent}
          compact={compact}
          task={child}
        />
      ))}
    </motion.div>
  );
}

function DifficultyBadge({ difficulty }: { difficulty: Difficulty }) {
  return (
    <Badge className={cn("rounded-full border px-2.5 py-1 shadow-none", difficultyBadgeClassName(difficulty))}>
      <span className={cn("mr-1.5 rounded-full border", miniFruitClassName(difficulty))} />
      {difficultyMeta[difficulty].label}
    </Badge>
  );
}

function HistoryScreen({ history }: { history: Record<string, Task[]> }) {
  const days = Object.entries(history);
  return (
    <div className="grid gap-4 p-4 lg:p-8">
      <div>
        <h2 className="text-2xl font-black dark:text-[#eef4e8]">履歴</h2>
        <p className="text-sm font-medium text-[#747a71] dark:text-[#a8b8a2]">完了したタスク</p>
      </div>
      <div className="grid gap-3">
        {days.map(([day, tasks]) => (
          <Card key={day} className="border-[#e4dfd4] bg-white/72 shadow-none dark:border-white/10 dark:bg-white/[0.055]">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>{day}</CardTitle>
              <Badge variant="outline">{tasks.length}件</Badge>
            </CardHeader>
            <CardContent className="grid gap-2">
              {tasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between gap-3 rounded-md bg-[#f4f3ed] px-3 py-2 text-sm dark:bg-white/[0.06]">
                  <span className="truncate font-semibold">{task.title}</span>
                  <Badge className={difficultyMeta[task.difficulty].className}>{difficultyMeta[task.difficulty].hint}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
        {!days.length && <EmptyState text="履歴はまだありません" />}
      </div>
    </div>
  );
}

function SettingsScreen({
  resetAll,
  settings,
  updateSettings,
}: {
  resetAll: () => void;
  settings: StoreSettings;
  updateSettings: (settings: Partial<StoreSettings>) => void;
}) {
  return (
    <div className="grid max-w-3xl gap-5 p-4 lg:p-8">
      <div>
        <h2 className="text-2xl font-black dark:text-[#eef4e8]">設定</h2>
        <p className="text-sm font-medium text-[#747a71] dark:text-[#a8b8a2]">表示と保存データ</p>
      </div>

      <Card className="border-[#e4dfd4] bg-white/72 shadow-none dark:border-white/10 dark:bg-white/[0.055]">
        <CardContent className="grid gap-5 p-5">
          <div className="grid gap-2">
            <p className="text-sm font-bold">テーマ</p>
            <div className="flex flex-wrap gap-2">
              {(["morning", "forest", "night"] as ThemeMode[]).map((theme) => (
                <Button key={theme} variant={settings.theme === theme ? "default" : "outline"} size="sm" onClick={() => updateSettings({ theme })}>
                  {themeLabel(theme)}
                </Button>
              ))}
            </div>
          </div>
          <label className="flex items-center gap-3 rounded-md border border-[#e4dfd4] p-3 dark:border-white/10 dark:bg-white/[0.035]">
            <Checkbox checked={settings.showCelebration} onCheckedChange={(checked) => updateSettings({ showCelebration: Boolean(checked) })} />
            <span className="font-semibold">完了時の光</span>
          </label>
          <label className="flex items-center gap-3 rounded-md border border-[#e4dfd4] p-3 dark:border-white/10 dark:bg-white/[0.035]">
            <Checkbox checked={settings.compact} onCheckedChange={(checked) => updateSettings({ compact: Boolean(checked) })} />
            <span className="font-semibold">コンパクト</span>
          </label>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="destructive" className="w-fit">
                <RotateCcw className="h-4 w-4" />
                初期化
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>すべて初期化しますか？</DialogTitle>
                <DialogDescription>タスクと履歴が消え、localStorageも空の状態に戻ります。</DialogDescription>
              </DialogHeader>
              <div className="flex justify-end gap-2">
                <DialogClose asChild>
                  <Button variant="outline">キャンセル</Button>
                </DialogClose>
                <DialogClose asChild>
                  <Button variant="destructive" onClick={resetAll}>
                    初期化
                  </Button>
                </DialogClose>
              </div>
            </DialogContent>
          </Dialog>
        </CardContent>
      </Card>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border border-[#e4dfd4] bg-[#fffdf7]/76 p-4 shadow-[0_12px_28px_rgba(38,49,38,0.06)] dark:border-white/10 dark:bg-white/[0.055]">
      <p className="text-xs font-black text-[#747a71] dark:text-[#a8b8a2]">{label}</p>
      <p className="mt-1 text-2xl font-black tabular-nums text-[#2f3b2f] dark:text-[#eef4e8]">{value}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="grid place-items-center rounded-md border border-dashed border-[#d9d3c5] bg-[#fffdf7]/58 p-8 text-center dark:border-white/10 dark:bg-white/[0.04]">
      <Sprout className="mb-2 h-6 w-6 text-[#8aa17e]" />
      <p className="text-sm font-bold text-[#747a71] dark:text-[#a8b8a2]">{text}</p>
    </div>
  );
}

function buildForestMapNodes({
  groups,
  scope,
  tasks,
  todayCount: _todayCount,
}: {
  groups: ProjectGroup[];
  scope: ForestScope;
  tasks: Task[];
  todayCount: number;
}): ForestMapNode[] {
  if (scope === "all") {
    const source = groups.length ? groups : [{ name: "つながる森", tasks, done: tasks.filter((task) => task.completed).length, points: growthPoints(tasks) }];
    return source.slice(0, timelinePositions.length).map((group, index) => ({
      id: `group:${group.name}`,
      label: group.name,
      sublabel: `${group.done}/${group.tasks.length}`,
      count: group.done,
      points: group.points,
      todoCount: group.tasks.length,
      fruits: toFruitTodos(group.tasks.filter((task) => task.completed)),
      buds: toFruitTodos(group.tasks.filter((task) => !task.completed)),
      ...timelinePositions[index],
    }));
  }

  if (scope === "today") {
    return [buildTodayOverviewNode(tasks)];
  }

  const offsets = [-4, -3, -2, -1, 0, 1, 2, 3, 4];
  const today = new Date();
  today.setHours(12, 0, 0, 0);

  return offsets.map((offset, index) => {
    const cursor = new Date(today);
    cursor.setDate(today.getDate() + offset);
    const day = dailyGrowth(tasks, cursor);
    const isToday = offset === 0;
    const tasksForDay = tasks.filter((task) => {
      const createdKey = dateKey(task.createdAt);
      const completedKey = task.completedAt ? dateKey(task.completedAt) : "";
      return createdKey === day.date || completedKey === day.date;
    });
    const completedForDay = tasks.filter((task) => task.completedAt && dateKey(task.completedAt) === day.date);
    const todoCount = day.isFuture ? 0 : tasksForDay.length;
    return {
      id: `day:${day.date}`,
      label: isToday ? "今日" : formatMonthDay(cursor),
      sublabel: isToday ? "今日" : formatMonthDay(cursor),
      count: completedForDay.length,
      points: day.points,
      todoCount,
      fruits: toFruitTodos(completedForDay),
      buds: toFruitTodos(tasksForDay.filter((task) => !task.completed)),
      future: day.isFuture,
      ...timelinePositions[index],
      featured: isToday,
    };
  });
}

function buildTodayOverviewNode(tasks: Task[]): ForestMapNode {
  const today = dateKey(new Date());
  const todaysTasks = tasks.filter((task) => dateKey(task.createdAt) === today || (task.completedAt && dateKey(task.completedAt) === today));
  const source = todaysTasks.length ? todaysTasks : tasks.filter((task) => !task.completed).slice(0, 8);
  const completed = source.filter((task) => task.completed && task.completedAt && dateKey(task.completedAt) === today);
  const buds = source.filter((task) => !task.completed);
  const points = completed.reduce((sum, task) => sum + difficultyPoints[task.difficulty], 0);

  return {
    id: "today-tree",
    label: "今日",
    sublabel: "1本の木",
    count: completed.length,
    points,
    todoCount: source.length,
    fruits: toFruitTodos(completed),
    buds: toFruitTodos(buds),
    x: 53,
    y: 52,
    featured: true,
  };
}

function toFruitTodos(tasks: Task[]): FruitTodo[] {
  return tasks.map((task) => ({
    title: task.title,
    difficulty: task.difficulty,
    completed: task.completed,
  }));
}

function addWorldPaths(world: THREE.Group, mapNodes: ForestMapNode[], color: number) {
  if (mapNodes.length < 2) return;
  const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.34 });
  mapNodes.slice(1).forEach((node, index) => {
    const from = nodeToWorldPosition(mapNodes[index]);
    const to = nodeToWorldPosition(node);
    const curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(from.x, 0.04, from.z),
      new THREE.Vector3((from.x + to.x) / 2, 0.07, (from.z + to.z) / 2),
      new THREE.Vector3(to.x, 0.04, to.z),
    ]);
    const geometry = new THREE.BufferGeometry().setFromPoints(curve.getPoints(28));
    const line = new THREE.Line(geometry, material);
    world.add(line);
  });
}

function addWorldSeeds(world: THREE.Group, color: number) {
  const material = new THREE.MeshStandardMaterial({ color, roughness: 0.85 });
  for (let index = 0; index < 24; index += 1) {
    const angle = index * 1.618;
    const radius = 6 + (index % 8) * 2.8;
    const seed = new THREE.Mesh(new THREE.SphereGeometry(0.045 + (index % 3) * 0.015, 8, 8), material);
    seed.position.set(Math.cos(angle) * radius, 0.08, Math.sin(angle) * radius);
    seed.castShadow = true;
    world.add(seed);
  }
}

function createWorldTree(node: ForestMapNode, scope: ForestScope) {
  const group = new THREE.Group();
  const position = nodeToWorldPosition(node);
  const growthLevel = treeGrowthLevel(node);
  const scale = node.featured ? 1.72 : Math.max(0.86, Math.min(1.42, 0.82 + node.count * 0.055 + node.todoCount * 0.045 + growthLevel * 0.07));
  group.position.set(position.x, 0, position.z);
  group.scale.setScalar(scope === "today" ? scale * 1.15 : scale);
  group.userData.floatTree = true;

  const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x5f3c2c, roughness: 0.96 });
  const barkMaterial = new THREE.MeshStandardMaterial({ color: 0x3f2b22, roughness: 0.96 });
  const branchMaterial = new THREE.MeshStandardMaterial({ color: 0x78523c, roughness: 0.9 });
  const baseMaterial = new THREE.MeshStandardMaterial({ color: 0xf7f3e8, roughness: 0.86 });
  const rimMaterial = new THREE.MeshStandardMaterial({ color: 0xe1dbcb, roughness: 0.82 });
  const mossMaterial = new THREE.MeshStandardMaterial({ color: 0x57733f, roughness: 0.98 });
  const mossHighlightMaterial = new THREE.MeshStandardMaterial({ color: 0x8ead6f, roughness: 0.96 });
  const stoneMaterial = new THREE.MeshStandardMaterial({ color: 0xc8c1b2, roughness: 0.88 });
  const leafMaterials = [
    new THREE.MeshStandardMaterial({ color: 0x8fb36f, roughness: 0.88 }),
    new THREE.MeshStandardMaterial({ color: 0x6f9d5c, roughness: 0.9 }),
    new THREE.MeshStandardMaterial({ color: 0x456f3a, roughness: 0.92 }),
    new THREE.MeshStandardMaterial({ color: 0xaac992, roughness: 0.88 }),
  ];
  const leafHighlightMaterial = new THREE.MeshStandardMaterial({ color: 0xb6d09c, roughness: 0.82, transparent: true, opacity: 0.88 });

  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.12, 1.4, 0.12, 72), baseMaterial);
  base.position.y = 0.06;
  base.receiveShadow = true;
  group.add(base);

  const rim = new THREE.Mesh(new THREE.TorusGeometry(1.12, 0.065, 12, 72), rimMaterial);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.17;
  rim.castShadow = true;
  rim.receiveShadow = true;
  group.add(rim);

  const moss = new THREE.Mesh(new THREE.CylinderGeometry(0.78, 0.98, 0.08, 56), mossMaterial);
  moss.position.y = 0.17;
  moss.receiveShadow = true;
  group.add(moss);

  for (let index = 0; index < 10; index += 1) {
    const angle = index * 2.17;
    const radius = 0.16 + (index % 5) * 0.12;
    const tuft = new THREE.Mesh(new THREE.SphereGeometry(0.055 + (index % 3) * 0.018, 10, 8), index % 3 === 0 ? mossHighlightMaterial : mossMaterial);
    tuft.position.set(Math.cos(angle) * radius, 0.23 + (index % 2) * 0.012, Math.sin(angle) * radius * 0.82);
    tuft.scale.set(1.42, 0.42, 1.04);
    tuft.castShadow = true;
    tuft.receiveShadow = true;
    group.add(tuft);
  }

  for (let index = 0; index < 5; index += 1) {
    const angle = index * 1.34 + 0.2;
    const stone = new THREE.Mesh(new THREE.SphereGeometry(0.055 + (index % 2) * 0.025, 10, 8), stoneMaterial);
    stone.position.set(Math.cos(angle) * (0.55 + index * 0.035), 0.2, Math.sin(angle) * (0.38 + index * 0.03));
    stone.scale.set(1.25, 0.42, 0.92);
    stone.receiveShadow = true;
    group.add(stone);
  }

  if (growthLevel <= 1 && node.count === 0) {
    const seedMaterial = new THREE.MeshStandardMaterial({ color: 0x8f6c45, roughness: 0.72 });
    const seed = new THREE.Mesh(new THREE.SphereGeometry(0.2, 18, 14), seedMaterial);
    seed.position.set(0.04, 0.33, 0.02);
    seed.scale.set(1.12, 0.72, 0.9);
    seed.castShadow = true;
    group.add(seed);

    if (node.todoCount > 0) {
      [
        { x: -0.12, rz: 0.78, color: 0x88ad70 },
        { x: 0.14, rz: -0.72, color: 0x5f944f },
      ].forEach((leaf) => {
        const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.18, 16, 12), new THREE.MeshStandardMaterial({ color: leaf.color, roughness: 0.84 }));
        mesh.position.set(leaf.x, 0.54, 0.02);
        mesh.rotation.z = leaf.rz;
        mesh.scale.set(1.35, 0.34, 0.82);
        mesh.castShadow = true;
        group.add(mesh);
      });
    }

    return group;
  }

  const trunkHeight = 1.22 + Math.min(5, growthLevel) * 0.28 + Math.min(3, node.count) * 0.06;
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.115, 0.265, trunkHeight, 18), trunkMaterial);
  trunk.position.y = 0.18 + trunkHeight / 2;
  trunk.rotation.z = -0.045;
  trunk.castShadow = true;
  group.add(trunk);

  for (let index = 0; index < 5; index += 1) {
    const ridge = new THREE.Mesh(new THREE.BoxGeometry(0.012, trunkHeight * 0.58, 0.014), barkMaterial);
    const angle = index * 1.2;
    ridge.position.set(Math.cos(angle) * 0.13, 0.38 + trunkHeight * 0.34, Math.sin(angle) * 0.09);
    ridge.rotation.y = angle;
    ridge.rotation.z = -0.045;
    ridge.castShadow = true;
    group.add(ridge);
  }

  [
    { x: -0.38, y: trunkHeight * 0.72, z: 0.04, rz: 0.88, rx: 0.08, length: 0.9 },
    { x: 0.4, y: trunkHeight * 0.78, z: -0.03, rz: -0.86, rx: -0.06, length: 0.86 },
    { x: 0.08, y: trunkHeight * 0.92, z: -0.26, rz: -0.32, rx: 0.22, length: 0.76 },
    { x: -0.12, y: trunkHeight * 0.86, z: 0.28, rz: 0.34, rx: -0.22, length: 0.7 },
  ].forEach((branch) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.082, branch.length, 12), branchMaterial);
    mesh.position.set(branch.x, branch.y, branch.z);
    mesh.rotation.z = branch.rz;
    mesh.rotation.x = branch.rx;
    mesh.castShadow = true;
    group.add(mesh);
  });

  const leafCenters = [
    { x: -0.6, y: trunkHeight + 0.28, z: 0.02, size: 0.7, sx: 1.22, sy: 0.68, sz: 0.9 },
    { x: 0.0, y: trunkHeight + 0.58, z: 0.06, size: 0.82, sx: 1.18, sy: 0.72, sz: 0.94 },
    { x: 0.62, y: trunkHeight + 0.28, z: -0.06, size: 0.68, sx: 1.16, sy: 0.7, sz: 0.9 },
    { x: -0.18, y: trunkHeight + 0.08, z: 0.43, size: 0.62, sx: 1.28, sy: 0.62, sz: 0.82 },
    { x: 0.18, y: trunkHeight + 0.12, z: -0.42, size: 0.62, sx: 1.24, sy: 0.64, sz: 0.86 },
    { x: -0.4, y: trunkHeight + 0.62, z: -0.16, size: 0.5, sx: 1.1, sy: 0.66, sz: 0.8 },
    { x: 0.43, y: trunkHeight + 0.64, z: 0.14, size: 0.48, sx: 1.08, sy: 0.62, sz: 0.78 },
    { x: 0.02, y: trunkHeight + 0.34, z: 0.54, size: 0.46, sx: 1.18, sy: 0.58, sz: 0.72 },
  ];
  const visibleLeafCount = Math.min(leafCenters.length, Math.max(3, growthLevel + 3 + (node.featured ? 1 : 0)));
  leafCenters.slice(0, visibleLeafCount).forEach((leaf, index) => {
    const particleCount = node.featured ? 13 : 9;
    for (let particle = 0; particle < particleCount; particle += 1) {
      const seed = Math.sin((index + 1) * 19.13 + (particle + 2) * 7.91) * 43758.5453;
      const seedB = Math.sin((index + 4) * 13.73 + (particle + 6) * 5.31) * 24634.6345;
      const seedC = Math.sin((index + 7) * 9.17 + (particle + 3) * 11.11) * 9731.113;
      const rx = seed - Math.floor(seed);
      const ry = seedB - Math.floor(seedB);
      const rz = seedC - Math.floor(seedC);
      const radius = leaf.size * (0.16 + (particle % 4) * 0.018);
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 12, 10), leafMaterials[(index + particle) % leafMaterials.length]);
      mesh.position.set(
        leaf.x + (rx - 0.5) * leaf.size * leaf.sx * 1.25,
        leaf.y + (ry - 0.5) * leaf.size * leaf.sy * 0.78,
        leaf.z + (rz - 0.5) * leaf.size * leaf.sz * 1.08,
      );
      mesh.scale.set(1.42, 0.62 + (particle % 3) * 0.08, 1.02);
      mesh.rotation.y = index * 0.38 + particle * 0.16;
      mesh.rotation.z = (particle % 2 ? -1 : 1) * (0.18 + rx * 0.2);
      mesh.castShadow = true;
      group.add(mesh);
    }

    if (index < 4) {
      const highlight = new THREE.Mesh(new THREE.SphereGeometry(leaf.size * 0.12, 12, 8), leafHighlightMaterial);
      highlight.position.set(leaf.x - leaf.size * 0.15, leaf.y + leaf.size * 0.18, leaf.z + leaf.size * 0.32);
      highlight.scale.set(1.8, 0.42, 0.72);
      group.add(highlight);
    }
  });

  node.fruits.slice(0, 12).forEach((fruit, index) => {
    const fruitPosition = fruitWorldPosition(index, trunkHeight);
    const radius = fruitRadius(fruit.difficulty);
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(radius, 20, 16),
      new THREE.MeshStandardMaterial({
        color: fruitColor(fruit.difficulty),
        roughness: fruit.difficulty === "hard" ? 0.42 : 0.68,
        metalness: fruit.difficulty === "hard" ? 0.18 : 0.02,
        emissive: fruit.difficulty === "hard" ? 0x5c3f08 : 0x000000,
        emissiveIntensity: fruit.difficulty === "hard" ? 0.12 : 0,
      }),
    );
    mesh.position.set(fruitPosition.x, fruitPosition.y, fruitPosition.z);
    mesh.castShadow = true;
    group.add(mesh);

    const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.018, radius * 0.72, 8), branchMaterial);
    stem.position.set(fruitPosition.x, fruitPosition.y + radius * 0.92, fruitPosition.z);
    stem.rotation.z = 0.24;
    stem.castShadow = true;
    group.add(stem);

    const shine = new THREE.Mesh(new THREE.SphereGeometry(radius * 0.22, 10, 8), new THREE.MeshStandardMaterial({ color: 0xfff6d0, roughness: 0.45, transparent: true, opacity: 0.76 }));
    shine.position.set(fruitPosition.x - radius * 0.34, fruitPosition.y + radius * 0.28, fruitPosition.z + radius * 0.42);
    group.add(shine);
  });

  node.buds.slice(0, 8).forEach((bud, index) => {
    const budPosition = fruitWorldPosition(index + node.fruits.length, trunkHeight);
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(fruitRadius(bud.difficulty) * 0.72, 14, 12),
      new THREE.MeshStandardMaterial({ color: 0xddebd4, roughness: 0.88 }),
    );
    mesh.position.set(budPosition.x, budPosition.y, budPosition.z);
    mesh.castShadow = true;
    group.add(mesh);
  });

  if (growthLevel >= 5 || node.count >= 8) {
    const flowerMaterials = [
      new THREE.MeshStandardMaterial({ color: 0xfff0e4, roughness: 0.78 }),
      new THREE.MeshStandardMaterial({ color: 0xf6d7ba, roughness: 0.78 }),
    ];
    for (let index = 0; index < 10; index += 1) {
      const flowerPosition = fruitWorldPosition(index + 2, trunkHeight + 0.12);
      const flower = new THREE.Mesh(new THREE.SphereGeometry(0.055, 12, 10), flowerMaterials[index % flowerMaterials.length]);
      flower.position.set(flowerPosition.x * 1.12, flowerPosition.y + 0.18, flowerPosition.z * 1.14);
      flower.scale.set(1.4, 0.62, 1);
      flower.castShadow = true;
      group.add(flower);
    }
  }

  return group;
}

function nodeToWorldPosition(node: ForestMapNode) {
  return {
    x: (node.x - 50) / 2.65,
    z: (node.y - 50) / 2.65,
  };
}

function fruitWorldPosition(index: number, trunkHeight: number) {
  const source = fruitPositions[index % fruitPositions.length];
  const layer = Math.floor(index / fruitPositions.length);
  return {
    x: (source.left - 50) * 0.024,
    y: trunkHeight + 0.2 + (68 - source.top) * 0.018 - layer * 0.08,
    z: ((index % 2 ? 1 : -1) * 0.24) + (source.top - 45) * 0.008,
  };
}

function fruitRadius(difficulty: Difficulty) {
  if (difficulty === "hard") return 0.18;
  if (difficulty === "medium") return 0.135;
  return 0.095;
}

function fruitColor(difficulty: Difficulty) {
  if (difficulty === "hard") return 0xf3c544;
  if (difficulty === "medium") return 0xd8893d;
  return 0xc97939;
}

function disposeThreeScene(scene: THREE.Scene) {
  scene.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (mesh.geometry) {
      mesh.geometry.dispose();
    }
    const material = mesh.material;
    if (Array.isArray(material)) {
      material.forEach((item) => item.dispose());
    } else if (material) {
      material.dispose();
    }
  });
}

function groupTasksByProject(tasks: Task[]): ProjectGroup[] {
  const map = new Map<string, ProjectGroup>();
  tasks.forEach((task) => {
    const name = deriveTaskGroup(task);
    const current = map.get(name) ?? { name, tasks: [], done: 0, points: 0 };
    current.tasks.push(task);
    if (task.completed) {
      current.done += 1;
      current.points += difficultyPoints[task.difficulty];
    }
    map.set(name, current);
  });
  return Array.from(map.values()).sort((a, b) => b.points - a.points || b.tasks.length - a.tasks.length);
}

function filterTasks(tasks: Task[], activeProject: string, query: string) {
  const q = query.trim().toLowerCase();
  return tasks.filter((task) => {
    const matchesProject = activeProject === "all" || deriveTaskGroup(task) === activeProject;
    const matchesQuery = !q || `${task.title} ${task.notes}`.toLowerCase().includes(q);
    return matchesProject && matchesQuery;
  });
}

function childrenByParent(tasks: Task[]) {
  const map = new Map<string, Task[]>();
  tasks.forEach((task) => {
    if (!task.parentId) return;
    map.set(task.parentId, [...(map.get(task.parentId) ?? []), task]);
  });
  return map;
}

function deriveTaskGroup(task: Task) {
  const text = `${task.title} ${task.notes}`.toLowerCase();
  if (/朝|morning|routine|ルーティン|ストレッチ/.test(text)) return "朝のルーティン";
  if (/英語|english|単語|word/.test(text)) return "学習";
  if (/読書|本|book|読む/.test(text)) return "学習";
  if (/勉強|学習|数学|卒研|study/.test(text)) return "学習";
  if (/仕事|work|打合せ|会議|資料/.test(text)) return "仕事";
  if (/健康|運動|筋トレ|散歩/.test(text)) return "健康";
  if (/買い|買物|買い物|shop|家事/.test(text)) return "家事";
  if (/趣味|遊び|music|絵|写真/.test(text)) return "趣味";
  if (/新規|project|プロジェクト|作る|開発/.test(text)) return "仕事";
  return task.difficulty === "hard" ? "仕事" : "家事";
}

function shortTitle(title: string, max = 8) {
  return title.length > max ? `${title.slice(0, max - 1)}...` : title;
}

function formatMonthDay(date: Date) {
  return `${date.getMonth() + 1}/${date.getDate()}`;
}

function scopeLabel(scope: ForestScope) {
  if (scope === "month") return "今月";
  if (scope === "all") return "すべて";
  return "今日";
}

function getTimeTone(): TimeTone {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 10) return "morning";
  if (hour >= 10 && hour < 17) return "day";
  if (hour >= 17 && hour < 20) return "evening";
  return "night";
}

function timeToneLabel(tone: TimeTone) {
  if (tone === "morning") return "朝の光";
  if (tone === "day") return "昼の庭";
  if (tone === "evening") return "夕方";
  return "夜の森";
}

function timeToneClass(tone: TimeTone) {
  if (tone === "morning") return "bg-[radial-gradient(circle_at_18%_8%,rgba(255,245,208,0.9),transparent_28%),linear-gradient(135deg,#edf2e7_0%,#f7f3ea_48%,#e0e9d9_100%)]";
  if (tone === "day") return "bg-[radial-gradient(circle_at_78%_10%,rgba(255,255,255,0.82),transparent_30%),linear-gradient(135deg,#e6eee3_0%,#f5f4ea_54%,#dde8d8_100%)]";
  if (tone === "evening") return "bg-[radial-gradient(circle_at_20%_10%,rgba(255,198,122,0.58),transparent_30%),linear-gradient(135deg,#efe2d2_0%,#f7f0e5_52%,#dce2d0_100%)]";
  return "bg-[radial-gradient(circle_at_72%_12%,rgba(132,174,211,0.2),transparent_34%),linear-gradient(135deg,#17211f_0%,#22302b_52%,#111b1b_100%)]";
}

function forestSurfaceClass(tone: TimeTone) {
  if (tone === "morning") return "bg-[#fbfaf5]";
  if (tone === "day") return "bg-[#f7faf1]";
  if (tone === "evening") return "bg-[#fbf4ea]";
  return "bg-[#1c2824]";
}

function worldGradientClass(tone: TimeTone) {
  if (tone === "morning") return "bg-[radial-gradient(circle_at_42%_20%,rgba(255,245,210,0.9),transparent_30%),linear-gradient(180deg,#ecf4df_0%,#f7f2e5_60%,#dfe8d5_100%)]";
  if (tone === "day") return "bg-[radial-gradient(circle_at_48%_18%,rgba(255,255,255,0.72),transparent_28%),linear-gradient(180deg,#e8f2e7_0%,#f8f8ee_58%,#dfe9d7_100%)]";
  if (tone === "evening") return "bg-[radial-gradient(circle_at_36%_22%,rgba(255,198,122,0.55),transparent_30%),linear-gradient(180deg,#f0dfcf_0%,#fbf2e7_58%,#d8dfcc_100%)]";
  return "bg-[radial-gradient(circle_at_58%_18%,rgba(147,197,253,0.18),transparent_30%),linear-gradient(180deg,#101b1f_0%,#1d2c27_58%,#17221f_100%)]";
}

function worldPalette(tone: TimeTone) {
  if (tone === "morning") {
    return {
      ambient: 0xfff7df,
      ambientIntensity: 0.68,
      fill: 0xb7d7b3,
      fog: 0xe9f3dd,
      fogDensity: 0.014,
      ground: 0xc7daba,
      path: 0x8a9882,
      seed: 0x9aa681,
      sun: 0xffe2a4,
      sunIntensity: 1.02,
    };
  }
  if (tone === "evening") {
    return {
      ambient: 0xffd7ad,
      ambientIntensity: 0.5,
      fill: 0xb2c0a4,
      fog: 0xf1dfcb,
      fogDensity: 0.015,
      ground: 0xc9d1ac,
      path: 0x9f8f74,
      seed: 0xa39472,
      sun: 0xffb36b,
      sunIntensity: 0.86,
    };
  }
  if (tone === "night") {
    return {
      ambient: 0x8fb4d9,
      ambientIntensity: 0.26,
      fill: 0x95b5c8,
      fog: 0x17211f,
      fogDensity: 0.024,
      ground: 0x314333,
      path: 0x93a393,
      seed: 0x8fa58c,
      sun: 0xb6d4ff,
      sunIntensity: 0.46,
    };
  }
  return {
    ambient: 0xffffff,
    ambientIntensity: 0.56,
    fill: 0xc5dcb8,
    fog: 0xe8f2e7,
    fogDensity: 0.013,
    ground: 0xc2d6b4,
    path: 0x87947f,
    seed: 0x96a37d,
    sun: 0xfff5e6,
    sunIntensity: 0.9,
  };
}

function forestScopeTitle(scope: ForestScope) {
  if (scope === "month") return "今月の森";
  if (scope === "all") return "プロジェクトの森";
  return "今日の木";
}

function forestScopeDescription(scope: ForestScope) {
  if (scope === "month") return "日ごとの木を俯瞰";
  if (scope === "all") return "仕事や学習ごとの成長";
  return "今日やったことが実る";
}

function fruitClassName(difficulty: Difficulty) {
  if (difficulty === "hard") {
    return "h-[19%] min-h-5 w-[19%] min-w-5 border-[#ffec9a] bg-gradient-to-br from-[#fff5a6] via-[#e3b43e] to-[#9f6d18] shadow-[0_0_0_3px_rgba(255,236,154,0.34),0_9px_16px_rgba(149,105,23,0.28)]";
  }
  if (difficulty === "medium") {
    return "h-[14%] min-h-4 w-[14%] min-w-4 border-[#f4d7a0] bg-gradient-to-br from-[#f7c86d] via-[#d8893d] to-[#955f2d] shadow-[0_5px_11px_rgba(133,82,35,0.24)]";
  }
  return "h-[10%] min-h-3 w-[10%] min-w-3 border-[#e5b17b] bg-gradient-to-br from-[#f0bb78] via-[#cd8240] to-[#87582f] shadow-[0_3px_8px_rgba(133,82,35,0.2)]";
}

function budClassName(difficulty: Difficulty) {
  if (difficulty === "hard") return "h-[15%] min-h-4 w-[15%] min-w-4 bg-[#edf2d9]";
  if (difficulty === "medium") return "h-[12%] min-h-3.5 w-[12%] min-w-3.5 bg-[#e8f0df]";
  return "h-[9%] min-h-3 w-[9%] min-w-3 bg-[#eef5e7]";
}

function miniFruitClassName(difficulty: Difficulty) {
  if (difficulty === "hard") return "h-4 w-4 border-[#ffec9a] bg-gradient-to-br from-[#fff5a6] via-[#e3b43e] to-[#9f6d18]";
  if (difficulty === "medium") return "h-3 w-3 border-[#f4d7a0] bg-gradient-to-br from-[#f7c86d] via-[#d8893d] to-[#955f2d]";
  return "h-2.5 w-2.5 border-[#e5b17b] bg-gradient-to-br from-[#f0bb78] via-[#cd8240] to-[#87582f]";
}

function miniBudClassName(difficulty: Difficulty) {
  if (difficulty === "hard") return "h-4 w-4 border-[#aab99d] bg-[#edf2d9]";
  if (difficulty === "medium") return "h-3 w-3 border-[#9bad91] bg-[#e8f0df]";
  return "h-2.5 w-2.5 border-[#9bad91] bg-[#eef5e7]";
}

function treeGrowthLevel(node: ForestMapNode) {
  if (node.future) return 1;
  if (node.points >= 170 || node.count >= 8) return 5;
  if (node.points >= 100 || node.count >= 5) return 4;
  if (node.points >= 55 || node.count >= 3) return 3;
  if (node.points >= 20 || node.count >= 1) return 2;
  return node.todoCount > 0 ? 1 : 0;
}

function todayTreeStageLabel(level: number, fruits: number, todos: number) {
  if (todos === 0) return "空き地";
  if (fruits >= 8 || level >= 5) return "花の木";
  if (level >= 4) return "大樹";
  if (level >= 3) return "若木";
  if (level >= 2) return "苗木";
  if (level >= 1) return "芽";
  return "種";
}

function difficultyBadgeClassName(difficulty: Difficulty) {
  if (difficulty === "hard") return "border-[#ead68a] bg-[#fff5c6] text-[#725313] dark:border-[#d8bd52]/70 dark:bg-[#3a3218] dark:text-[#ffe89a]";
  if (difficulty === "medium") return "border-[#edcf9b] bg-[#fff0da] text-[#7a5128] dark:border-[#b8793f]/60 dark:bg-[#332818] dark:text-[#ffc477]";
  return "border-[#d7c9b9] bg-[#f3efe7] text-[#5f684f] dark:border-white/10 dark:bg-white/[0.06] dark:text-[#cbd9c4]";
}

function exportForest(tasks: Task[]) {
  const payload = JSON.stringify({ exportedAt: new Date().toISOString(), tasks }, null, 2);
  const blob = new Blob([payload], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `tsunagaru-mori-${dateKey(new Date())}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function themeClass(theme: ThemeMode) {
  if (theme === "forest") return "theme-forest";
  if (theme === "night") return "theme-night dark bg-[radial-gradient(circle_at_72%_12%,rgba(91,139,108,0.2),transparent_32%),linear-gradient(135deg,#0b1211_0%,#14201d_52%,#08100f_100%)] text-[#eef4e8]";
  return "";
}

function themeLabel(theme: ThemeMode) {
  if (theme === "forest") return "森";
  if (theme === "night") return "夜";
  return "朝";
}

export default App;
