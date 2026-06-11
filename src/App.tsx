import { useState } from "react";
import type React from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  CalendarDays,
  CheckCircle2,
  Flame,
  History,
  Leaf,
  Plus,
  RotateCcw,
  Settings,
  SlidersHorizontal,
  Sprout,
  Trash2,
  TreePine,
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
import { Progress } from "@/components/ui/progress";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { TreeIllustration } from "@/components/TreeIllustration";
import {
  currentStage,
  difficultyPoints,
  groupHistory,
  growthPoints,
  monthForest,
  recentDailyGrowth,
  stages,
  streakDays,
  todayCompleted,
  type DayGrowth,
  type Difficulty,
  type Settings as StoreSettings,
  type Task,
  type ThemeMode,
  useGrowthStore,
} from "@/store/useGrowthStore";
import { cn } from "@/lib/utils";

const difficultyMeta: Record<Difficulty, { label: string; hint: string; className: string }> = {
  easy: { label: "軽め", hint: "+8", className: "bg-emerald-100 text-emerald-800" },
  medium: { label: "集中", hint: "+14", className: "bg-amber-100 text-amber-800" },
  hard: { label: "深い", hint: "+22", className: "bg-sky-100 text-sky-800" },
};

function App() {
  const { tasks, settings, addTask, completeTask, deleteTask, resetAll, updateSettings } = useGrowthStore();
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [celebrate, setCelebrate] = useState(false);

  const pendingTasks = tasks.filter((task) => !task.completed);
  const completedTasks = tasks.filter((task) => task.completed);
  const points = growthPoints(tasks);
  const stage = currentStage(points);
  const todayCount = todayCompleted(tasks);
  const streak = streakDays(tasks);
  const history = groupHistory(tasks);
  const forestDays = monthForest(tasks);
  const recentDays = recentDailyGrowth(tasks);

  const completionRate = tasks.length ? Math.round((completedTasks.length / tasks.length) * 100) : 0;
  const stageChanged = stage.progress >= 95 || stage.index === stages.length - 1;

  function submitTask() {
    if (!title.trim()) return;
    addTask({ title, notes, difficulty });
    setTitle("");
    setNotes("");
    setDifficulty("medium");
  }

  function finishTask(id: string) {
    completeTask(id);
    if (settings.showCelebration) {
      setCelebrate(true);
      window.setTimeout(() => setCelebrate(false), 950);
    }
  }

  return (
    <div className={cn("min-h-screen", themeClass(settings.theme))}>
      <main
        className={cn(
          "mx-auto grid min-h-screen w-full max-w-7xl lg:grid-cols-[1.15fr_0.85fr]",
          settings.compact ? "gap-3 p-2 sm:p-3 lg:p-4" : "gap-4 p-3 sm:p-4 lg:p-6",
        )}
      >
        <section className="grid min-w-0 gap-4">
          <Card className="overflow-hidden border-white/60 bg-card/92 shadow-soft backdrop-blur">
            <CardHeader className="pb-3">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <CardTitle className="flex items-center gap-2 text-xl sm:text-2xl">
                    <TreePine className="h-6 w-6 text-primary" />
                    つながる森
                  </CardTitle>
                  <CardDescription>今日の行動が木を育てるタスクアプリ</CardDescription>
                </div>
                <Sheet>
                  <SheetTrigger asChild>
                    <Button variant="outline" size="sm">
                      <SlidersHorizontal className="h-4 w-4" />
                      状況
                    </Button>
                  </SheetTrigger>
                  <SheetContent>
                    <SheetHeader>
                      <SheetTitle>今日の庭</SheetTitle>
                      <SheetDescription>完了するほど、木の幹と葉が濃くなります。</SheetDescription>
                    </SheetHeader>
                    <StatsGrid todayCount={todayCount} streak={streak} completionRate={completionRate} points={points} />
                  </SheetContent>
                </Sheet>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4">
              <TreePanel stage={stage} points={points} streak={streak} todayCount={todayCount} recentDays={recentDays} celebrate={celebrate} />
              <TaskComposer
                title={title}
                notes={notes}
                difficulty={difficulty}
                onTitle={setTitle}
                onNotes={setNotes}
                onDifficulty={setDifficulty}
                onSubmit={submitTask}
              />
            </CardContent>
          </Card>

          <Tabs defaultValue="today" className="min-w-0">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="today">今日</TabsTrigger>
              <TabsTrigger value="forest">森</TabsTrigger>
              <TabsTrigger value="tree">木</TabsTrigger>
              <TabsTrigger value="history">履歴</TabsTrigger>
              <TabsTrigger value="settings">設定</TabsTrigger>
            </TabsList>

            <TabsContent value="today">
              <TaskLists pending={pendingTasks} completed={completedTasks} onComplete={finishTask} onDelete={deleteTask} />
            </TabsContent>

            <TabsContent value="forest">
              <ForestView days={forestDays} recentDays={recentDays} />
            </TabsContent>

            <TabsContent value="tree">
              <Card className="shadow-soft">
                <CardHeader>
                  <CardTitle>木の成長</CardTitle>
                  <CardDescription>{stage.description}</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-[0.85fr_1fr]">
                  <TreeIllustration stage={stage} progress={stage.progress} celebrate={celebrate || stageChanged} />
                  <div className="grid gap-3">
                    {stages.map((item, index) => (
                      <div
                        key={item.id}
                        className={cn(
                          "flex items-center justify-between rounded-md border p-3",
                          index === stage.index ? "border-primary bg-primary/8" : "bg-card",
                        )}
                      >
                        <div>
                          <p className="font-bold">{item.label}</p>
                          <p className="text-xs text-muted-foreground">{item.description}</p>
                        </div>
                        {index <= stage.index ? <CheckCircle2 className="h-5 w-5 text-primary" /> : <Sprout className="h-5 w-5 text-muted-foreground" />}
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="history">
              <HistoryView history={history} />
            </TabsContent>

            <TabsContent value="settings">
              <SettingsView settings={settings} updateSettings={updateSettings} resetAll={resetAll} />
            </TabsContent>
          </Tabs>
        </section>

        <aside className="grid h-fit gap-4 lg:sticky lg:top-6">
          <Card className="border-white/70 bg-card/92 shadow-soft backdrop-blur">
            <CardHeader>
              <CardTitle>今日の成長</CardTitle>
              <CardDescription>小さく終わらせるほど、庭が続きます。</CardDescription>
            </CardHeader>
            <CardContent>
              <StatsGrid todayCount={todayCount} streak={streak} completionRate={completionRate} points={points} />
            </CardContent>
          </Card>
          <Card className="border-white/70 bg-card/92 shadow-soft backdrop-blur">
            <CardHeader>
              <CardTitle>未完了タスク</CardTitle>
              <CardDescription>{pendingTasks.length ? `${pendingTasks.length}件が土の上にあります` : "今日はもう静かな庭です"}</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              {pendingTasks.slice(0, 4).map((task) => (
                <TaskRow key={task.id} task={task} onComplete={finishTask} onDelete={deleteTask} compact />
              ))}
              {!pendingTasks.length && <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">完了済みです。木を眺める時間。</p>}
            </CardContent>
          </Card>
        </aside>
      </main>
    </div>
  );
}

function TreePanel({
  stage,
  points,
  streak,
  todayCount,
  recentDays,
  celebrate,
}: {
  stage: ReturnType<typeof currentStage>;
  points: number;
  streak: number;
  todayCount: number;
  recentDays: DayGrowth[];
  celebrate: boolean;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_280px]">
      <TreeIllustration stage={stage} progress={stage.progress} celebrate={celebrate} />
      <div className="grid content-center gap-3">
        <Badge variant="warm" className="w-fit">
          {stage.label}
        </Badge>
        <div>
          <p className="text-3xl font-black tracking-normal">{Math.round(stage.progress)}%</p>
          <p className="text-sm text-muted-foreground">次の成長までの進み具合</p>
        </div>
        <Progress value={stage.progress} />
        <div className="grid grid-cols-3 gap-2">
          <MiniStat icon={<Leaf className="h-4 w-4" />} label="成長" value={points} />
          <MiniStat icon={<CheckCircle2 className="h-4 w-4" />} label="今日" value={todayCount} />
          <MiniStat icon={<Flame className="h-4 w-4" />} label="連続" value={streak} />
        </div>
        <GrowthPulse days={recentDays} />
      </div>
    </div>
  );
}

function TaskComposer({
  title,
  notes,
  difficulty,
  onTitle,
  onNotes,
  onDifficulty,
  onSubmit,
}: {
  title: string;
  notes: string;
  difficulty: Difficulty;
  onTitle: (value: string) => void;
  onNotes: (value: string) => void;
  onDifficulty: (value: Difficulty) => void;
  onSubmit: () => void;
}) {
  return (
    <div className="grid gap-3 rounded-md border border-dashed bg-background/75 p-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <Input value={title} onChange={(event) => onTitle(event.target.value)} placeholder="今日育てたいタスク" onKeyDown={(event) => event.key === "Enter" && onSubmit()} />
        <Button onClick={onSubmit}>
          <Plus className="h-4 w-4" />
          追加
        </Button>
      </div>
      <Textarea value={notes} onChange={(event) => onNotes(event.target.value)} placeholder="メモ 任意" />
      <div className="flex flex-wrap gap-2">
        {(Object.keys(difficultyMeta) as Difficulty[]).map((key) => (
          <Button key={key} variant={difficulty === key ? "default" : "outline"} size="sm" onClick={() => onDifficulty(key)}>
            {difficultyMeta[key].label}
            <span className="text-xs opacity-80">{difficultyMeta[key].hint}</span>
          </Button>
        ))}
      </div>
    </div>
  );
}

function TaskLists({
  pending,
  completed,
  onComplete,
  onDelete,
}: {
  pending: Task[];
  completed: Task[];
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>未完了</CardTitle>
          <CardDescription>チェックすると木が育ちます。</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2">
          <AnimatePresence initial={false}>
            {pending.map((task) => (
              <TaskRow key={task.id} task={task} onComplete={onComplete} onDelete={onDelete} />
            ))}
          </AnimatePresence>
          {!pending.length && <EmptyState text="未完了タスクはありません" />}
        </CardContent>
      </Card>
      <Card className="shadow-soft">
        <CardHeader>
          <CardTitle>完了済み</CardTitle>
          <CardDescription>今日の積み重ねです。</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-2">
          {completed.slice(0, 8).map((task) => (
            <TaskRow key={task.id} task={task} onComplete={onComplete} onDelete={onDelete} compact />
          ))}
          {!completed.length && <EmptyState text="完了したタスクがここに残ります" />}
        </CardContent>
      </Card>
    </div>
  );
}

function TaskRow({
  task,
  onComplete,
  onDelete,
  compact = false,
}: {
  task: Task;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  compact?: boolean;
}) {
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className={cn(
        "grid grid-cols-[auto_1fr_auto] rounded-md border bg-card",
        compact ? "gap-2 p-2" : "gap-2 p-3",
      )}
    >
      <Checkbox
        aria-label={task.completed ? `${task.title}は完了済み` : `${task.title}を完了`}
        checked={task.completed}
        disabled={task.completed}
        onCheckedChange={() => !task.completed && onComplete(task.id)}
      />
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <p className={cn("truncate font-bold", task.completed && "text-muted-foreground line-through")}>{task.title}</p>
          <Badge className={difficultyMeta[task.difficulty].className}>{difficultyMeta[task.difficulty].label}</Badge>
        </div>
        {!compact && task.notes && <p className="mt-1 text-sm text-muted-foreground">{task.notes}</p>}
      </div>
      <Button variant="ghost" size="icon" aria-label={`${task.title}を削除`} onClick={() => onDelete(task.id)}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </motion.div>
  );
}

function StatsGrid({
  todayCount,
  streak,
  completionRate,
  points,
}: {
  todayCount: number;
  streak: number;
  completionRate: number;
  points: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <MiniStat icon={<CheckCircle2 className="h-4 w-4" />} label="今日" value={todayCount} />
      <MiniStat icon={<Flame className="h-4 w-4" />} label="連続日数" value={streak} />
      <MiniStat icon={<Sprout className="h-4 w-4" />} label="成長量" value={points} />
      <MiniStat icon={<CalendarDays className="h-4 w-4" />} label="完了率" value={`${completionRate}%`} />
    </div>
  );
}

function MiniStat({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-md border bg-background/75 p-3">
      <div className="mb-2 flex items-center gap-2 text-muted-foreground">
        {icon}
        <span className="text-xs font-bold">{label}</span>
      </div>
      <p className="text-2xl font-black">{value}</p>
    </div>
  );
}

function GrowthPulse({ days }: { days: DayGrowth[] }) {
  const maxPoints = Math.max(1, ...days.map((day) => day.points));

  return (
    <div className="grid gap-2 rounded-md border bg-background/70 p-3">
      <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
        <span>直近10日</span>
        <span>{days.reduce((sum, day) => sum + day.count, 0)}件</span>
      </div>
      <div className="flex h-14 items-end gap-1">
        {days.map((day) => (
          <div key={day.date} className="flex min-w-0 flex-1 flex-col items-center gap-1" title={`${day.date}: ${day.count}件`}>
            <motion.div
              className={cn(
                "w-full rounded-t-sm",
                day.points ? "bg-primary shadow-[0_0_12px_hsl(var(--primary)/0.22)]" : "bg-muted",
                day.isToday && "ring-2 ring-accent",
              )}
              initial={{ height: 4 }}
              animate={{ height: `${Math.max(4, (day.points / maxPoints) * 42)}px` }}
              transition={{ type: "spring", stiffness: 110, damping: 18 }}
            />
            <span className={cn("text-[10px] leading-none text-muted-foreground", day.isToday && "font-black text-foreground")}>{day.day}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ForestView({ days, recentDays }: { days: DayGrowth[]; recentDays: DayGrowth[] }) {
  const activeDays = days.filter((day) => day.count > 0).length;
  const monthPoints = days.reduce((sum, day) => sum + day.points, 0);
  const bestDay = days.reduce<DayGrowth | undefined>((best, day) => (!best || day.points > best.points ? day : best), undefined);

  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_320px]">
      <Card className="shadow-soft">
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <CardTitle className="flex items-center gap-2">
              <TreePine className="h-5 w-5 text-primary" />
              今月の森
            </CardTitle>
            <Badge variant="warm">{monthLabel(days)}</Badge>
          </div>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-3 gap-2">
            <MiniStat icon={<CalendarDays className="h-4 w-4" />} label="育った日" value={activeDays} />
            <MiniStat icon={<Leaf className="h-4 w-4" />} label="月の成長" value={monthPoints} />
            <MiniStat icon={<Flame className="h-4 w-4" />} label="最高" value={bestDay?.points ?? 0} />
          </div>
          <div className="grid grid-cols-7 gap-2">
            {days.map((day) => (
              <MiniDayTree key={day.date} day={day} />
            ))}
          </div>
        </CardContent>
      </Card>

      <Card className="shadow-soft">
        <CardHeader className="pb-3">
          <CardTitle>成長リズム</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          <GrowthPulse days={recentDays} />
          <div className="grid grid-cols-2 gap-2">
            {recentDays.slice(-4).map((day) => (
              <div key={day.date} className="rounded-md border bg-background/70 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-bold text-muted-foreground">{day.day}日</span>
                  <Badge variant={day.count ? "default" : "outline"}>{day.count}</Badge>
                </div>
                <MiniDayTree day={day} compact />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function MiniDayTree({ day, compact = false }: { day: DayGrowth; compact?: boolean }) {
  const stageIndex = day.points ? Math.max(1, day.stage.index) : 0;
  const trunkHeight = compact ? 18 + stageIndex * 4 : 20 + stageIndex * 6;
  const canopySize = compact ? 18 + stageIndex * 5 : 22 + stageIndex * 7;

  return (
    <div
      className={cn(
        "group grid min-w-0 place-items-center gap-1 rounded-md border bg-background/70 p-1.5",
        day.isToday && "border-primary bg-primary/8",
        day.isFuture && "opacity-40",
      )}
      title={`${day.date} ${day.count}件 ${day.points}成長`}
      aria-label={`${day.date} ${day.count}件 ${day.points}成長`}
    >
      <div className={cn("relative w-full", compact ? "h-14" : "h-16")}>
        <div className="absolute inset-x-2 bottom-1 h-2 rounded-[100%] bg-emerald-950/10 blur-[1px]" />
        {day.points ? (
          <>
            <motion.div
              className="absolute bottom-2 left-1/2 w-2 -translate-x-1/2 rounded-t-full bg-gradient-to-r from-amber-900 via-amber-700 to-stone-700"
              initial={{ height: 4 }}
              animate={{ height: trunkHeight }}
            />
            <motion.div
              className={cn(
                "absolute left-1/2 rounded-full shadow-[inset_0_6px_10px_rgba(255,255,255,0.22),0_6px_12px_rgba(22,101,52,0.18)]",
                day.stage.index >= 5 ? "bg-gradient-to-br from-orange-100 via-emerald-400 to-emerald-800" : "bg-gradient-to-br from-lime-200 via-emerald-500 to-emerald-800",
              )}
              style={{
                bottom: `${trunkHeight - 2}px`,
                width: `${canopySize}px`,
                height: `${canopySize * 0.82}px`,
                marginLeft: `${canopySize / -2}px`,
              }}
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
            />
          </>
        ) : (
          <div className="absolute bottom-2 left-1/2 h-3 w-4 -translate-x-1/2 rounded-[100%] bg-amber-900/70" />
        )}
      </div>
      {!compact && <span className={cn("text-[10px] font-bold leading-none text-muted-foreground", day.isToday && "text-foreground")}>{day.day}</span>}
    </div>
  );
}

function monthLabel(days: DayGrowth[]) {
  const firstDay = days[0]?.date;
  if (!firstDay) return "";
  const [, month] = firstDay.split("-");
  return `${Number(month)}月`;
}

function HistoryView({ history }: { history: Record<string, Task[]> }) {
  const days = Object.entries(history);
  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <History className="h-5 w-5" />
          履歴
        </CardTitle>
        <CardDescription>完了したタスクを日付ごとに見返せます。</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-3">
        {days.map(([day, tasks]) => (
          <div key={day} className="rounded-md border bg-background/70 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-bold">{day}</p>
              <Badge variant="outline">{tasks.length}件</Badge>
            </div>
            <div className="grid gap-2">
              {tasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between gap-3 text-sm">
                  <span>{task.title}</span>
                  <Badge className={difficultyMeta[task.difficulty].className}>{difficultyMeta[task.difficulty].hint}</Badge>
                </div>
              ))}
            </div>
          </div>
        ))}
        {!days.length && <EmptyState text="履歴はまだありません" />}
      </CardContent>
    </Card>
  );
}

function SettingsView({
  settings,
  updateSettings,
  resetAll,
}: {
  settings: StoreSettings;
  updateSettings: (settings: Partial<StoreSettings>) => void;
  resetAll: () => void;
}) {
  return (
    <Card className="shadow-soft">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          設定
        </CardTitle>
        <CardDescription>毎日使いやすい空気に調整できます。</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-5">
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
        <label className="flex items-center gap-3 rounded-md border p-3">
          <Checkbox checked={settings.showCelebration} onCheckedChange={(checked) => updateSettings({ showCelebration: Boolean(checked) })} />
          <span className="font-semibold">完了時の光演出を表示</span>
        </label>
        <label className="flex items-center gap-3 rounded-md border p-3">
          <Checkbox checked={settings.compact} onCheckedChange={(checked) => updateSettings({ compact: Boolean(checked) })} />
          <span className="font-semibold">表示を少しコンパクトにする</span>
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
                <Button variant="destructive" onClick={resetAll}>初期化</Button>
              </DialogClose>
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="rounded-md border border-dashed bg-background/70 p-4 text-center text-sm text-muted-foreground">{text}</p>;
}

function themeClass(theme: ThemeMode) {
  if (theme === "forest") return "theme-forest";
  if (theme === "night") return "theme-night";
  return "";
}

function themeLabel(theme: ThemeMode) {
  if (theme === "forest") return "森";
  if (theme === "night") return "夜";
  return "朝";
}

export default App;
