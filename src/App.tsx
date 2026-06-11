import { useEffect, useMemo, useRef, useState } from "react";
import type React from "react";
import { AnimatePresence, motion } from "motion/react";
import * as THREE from "three";
import {
  Archive,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Download,
  Folder,
  History,
  Inbox,
  ListTodo,
  Plus,
  RotateCcw,
  Search,
  Settings,
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

  useEffect(() => {
    const timer = window.setInterval(() => setTimeTone(getTimeTone()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

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
    completeTask(id);
    if (settings.showCelebration) {
      setCelebrateId(id);
      window.setTimeout(() => setCelebrateId(null), 900);
    }
  }

  return (
    <div className={cn("min-h-screen text-[#263126] transition-colors duration-700", timeToneClass(timeTone), themeClass(settings.theme))}>
      <main className="mx-auto min-h-screen w-full max-w-[1480px] p-2 sm:p-4 lg:p-6">
        <section className="grid min-h-[calc(100vh-1rem)] overflow-hidden rounded-lg border border-white/80 bg-[#fbfaf5] shadow-[0_24px_80px_rgba(38,49,38,0.16)] lg:min-h-[calc(100vh-3rem)] lg:grid-cols-[280px_minmax(0,1fr)]">
          <AppSidebar
            activeProject={activeProject}
            completionRate={completionRate}
            groups={groups}
            onProject={setActiveProject}
            onExport={() => exportForest(tasks)}
            taskCount={tasks.length}
            todayCount={todayCount}
          />

          <div className="min-w-0 border-l border-[#e5e1d7] bg-[#fbfaf5]">
            <Tabs value={activeView} onValueChange={(value) => setActiveView(value as AppView)} className="flex min-h-full flex-col">
              <header className="flex min-h-16 flex-col gap-3 border-b border-[#e8e3d9] bg-[#fbfaf5]/92 px-3 py-3 backdrop-blur md:flex-row md:items-center md:justify-between lg:px-8">
                <TabsList className="grid h-auto w-full grid-cols-4 gap-1 rounded-none bg-transparent p-0 text-[#6d746c] md:flex md:w-auto md:justify-start md:gap-2">
                  {appTabs.map((tab) => (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className="gap-1 rounded-md border border-transparent px-2 py-2 text-xs data-[state=active]:border-[#d8d2c4] data-[state=active]:bg-[#f3f1e9] data-[state=active]:text-[#263126] data-[state=active]:shadow-none sm:text-sm md:gap-2 md:px-4"
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
                    <TopStatusPill todayCount={todayCount} completionRate={completionRate} timeTone={timeTone} />
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
                />
              </TabsContent>

              <TabsContent value="tasks" className="m-0 flex-1 outline-none">
                <TaskScreen
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
                  title={title}
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
    </div>
  );
}

function AppSidebar({
  activeProject,
  completionRate,
  groups,
  onExport,
  onProject,
  taskCount,
  todayCount,
}: {
  activeProject: string;
  completionRate: number;
  groups: ProjectGroup[];
  onExport: () => void;
  onProject: (project: string) => void;
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
    <aside className="hidden min-h-full bg-[#f4f3ed]/88 px-5 py-6 lg:block">
      <div className="mb-8 flex items-center gap-3">
        <TreePine className="h-7 w-7 fill-[#3f7b3b] text-[#3f7b3b]" />
        <h1 className="text-xl font-black">つながる森</h1>
      </div>

      <div className="grid gap-2">
        {mainItems.map((item, index) => (
          <button
            key={item.id}
            className={cn(
              "flex h-11 items-center justify-between rounded-md px-3 text-left text-sm font-semibold text-[#626a61] transition",
              index === 0 && "bg-[#e4e8dc] text-[#3f5f3b]",
              "hover:bg-[#e9ece2]",
            )}
            type="button"
          >
            <span className="flex items-center gap-3">
              {item.icon}
              {item.label}
            </span>
            <span className="tabular-nums">
              {item.value}
              {item.suffix}
            </span>
          </button>
        ))}
      </div>

      <div className="my-7 h-px bg-[#e1ddd2]" />

      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-bold text-[#6b7369]">プロジェクト</p>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-[#60715e]" onClick={() => onProject("all")}>
          <Plus className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid gap-1">
        <ProjectButton active={activeProject === "all"} count={taskCount} label="すべて" onClick={() => onProject("all")} />
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

      <Button variant="outline" className="mt-6 w-full justify-start border-[#ddd8cc] bg-[#fbfaf5]" onClick={onExport}>
        <Download className="h-4 w-4" />
        出力
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
  return (
    <button
      className={cn(
        "flex h-11 items-center justify-between rounded-md px-3 text-left text-sm font-semibold text-[#6b7369] transition hover:bg-[#e9ece2]",
        active && "bg-[#e4e8dc] text-[#3f5f3b]",
      )}
      onClick={onClick}
      type="button"
    >
      <span className="flex min-w-0 items-center gap-2">
        <ChevronRight className="h-4 w-4 text-[#a2a99e]" />
        <span className="truncate">{label}</span>
      </span>
      <span className="tabular-nums text-[#5b744f]">{done ?? count}</span>
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

function TopStatusPill({ completionRate, timeTone, todayCount }: { completionRate: number; timeTone: TimeTone; todayCount: number }) {
  return (
    <div className="flex w-full items-center justify-between gap-2 rounded-md border border-[#ded9cd] bg-[#fbfaf5] px-3 py-2 text-sm font-bold text-[#52624f] md:w-auto">
      <span className="flex items-center gap-2">
        <CheckCircle2 className="h-4 w-4 text-[#4e7d45]" />
        今日 {todayCount}
      </span>
      <span className="h-4 w-px bg-[#ded9cd]" />
      <span>{completionRate}%</span>
      <span className="hidden h-4 w-px bg-[#ded9cd] sm:block" />
      <span className="hidden text-xs text-[#71806d] sm:block">{timeToneLabel(timeTone)}</span>
    </div>
  );
}

function ForestScreen({
  celebrateId,
  groups,
  monthCompleted,
  onComplete,
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
  scope: ForestScope;
  stage: ReturnType<typeof currentStage>;
  streak: number;
  tasks: Task[];
  timeTone: TimeTone;
  todayCount: number;
}) {
  const mapNodes = useMemo(() => buildForestMapNodes({ groups, scope, tasks, todayCount }), [groups, scope, tasks, todayCount]);
  const links = useMemo(() => mapNodes.slice(1).map((node, index) => ({ from: mapNodes[index], to: node })), [mapNodes]);
  const [memoryMode, setMemoryMode] = useState(false);
  const memoryTasks = useMemo(
    () =>
      tasks
        .filter((task) => task.completedAt)
        .sort((a, b) => new Date(b.completedAt ?? b.createdAt).getTime() - new Date(a.completedAt ?? a.createdAt).getTime())
        .slice(0, 10),
    [tasks],
  );

  return (
    <div className="grid min-h-[calc(100vh-6.5rem)] lg:grid-rows-[minmax(0,1fr)_auto]">
      <section className={cn("relative min-h-[620px] overflow-hidden", forestSurfaceClass(timeTone))}>
        <ForestWorldLayer mapNodes={mapNodes} scope={scope} timeTone={timeTone} onMemoryMode={setMemoryMode} />
        <div className={cn("absolute inset-0 z-10 bg-[linear-gradient(to_right,rgba(104,120,104,0.12)_1px,transparent_1px),linear-gradient(to_bottom,rgba(104,120,104,0.12)_1px,transparent_1px)] bg-[size:72px_72px] transition-opacity duration-500", memoryMode && "opacity-0")} />
        <div className={cn("absolute inset-0 z-10 bg-[linear-gradient(180deg,rgba(255,255,255,0.58),rgba(245,246,238,0.12)_52%,rgba(235,230,217,0.24))] transition-opacity duration-500", memoryMode && "opacity-0")} />
        <div className={cn("absolute left-4 top-4 z-40 rounded-md border border-[#e0dacd] bg-[#fbfaf5]/86 px-4 py-3 shadow-sm backdrop-blur transition-opacity duration-500", memoryMode && "pointer-events-none opacity-0")}>
          <p className="text-base font-black text-[#2f3b2f]">{forestScopeTitle(scope)}</p>
          <p className="mt-1 text-xs font-semibold text-[#747a71]">{forestScopeDescription(scope)}</p>
        </div>
        <div className={cn("absolute bottom-4 left-4 z-40 rounded-md border border-white/60 bg-white/70 px-3 py-2 text-xs font-bold text-[#52624f] shadow-sm backdrop-blur transition-opacity duration-500", memoryMode && "opacity-0")}>
          ドラッグ / ホイールで木の中へ
        </div>

        <svg className={cn("absolute inset-0 z-20 h-full w-full transition-opacity duration-500", memoryMode && "opacity-0")} preserveAspectRatio="none" viewBox="0 0 100 100">
          {links.map((link) => (
            <path
              key={`${link.from.id}-${link.to.id}`}
              d={`M ${link.from.x} ${link.from.y} C ${(link.from.x + link.to.x) / 2} ${link.from.y + 8}, ${(link.from.x + link.to.x) / 2} ${link.to.y - 8}, ${link.to.x} ${link.to.y}`}
              fill="none"
              stroke="rgba(104,116,104,0.34)"
              strokeDasharray="1.2 1.4"
              strokeLinecap="round"
              strokeWidth="0.35"
            />
          ))}
        </svg>

        <div className={cn("transition-opacity duration-500", memoryMode && "pointer-events-none opacity-0")}>
          {mapNodes.map((node) => (
            <ForestNode
              key={node.id}
              celebrate={Boolean(celebrateId && (node.id === celebrateId || node.id.includes(celebrateId)))}
              node={node}
              onComplete={scope === "today" && node.id.startsWith("task:") ? () => onComplete(node.id.replace("task:", "")) : undefined}
            />
          ))}
        </div>

        <MemoryOverlay tasks={memoryTasks} visible={memoryMode} />
      </section>

      <footer className={cn("grid gap-3 border-t border-[#e8e3d9] bg-[#fbfaf5]/94 p-4 transition-opacity duration-500 md:grid-cols-3 lg:px-8", memoryMode && "opacity-45")}>
        <BottomMetric label="連続日数" value={`${streak}日`} />
        <BottomMetric label="今月のタスク完了" value={`${monthCompleted}件`} />
        <BottomMetric label="成長率" value={`${Math.round(stage.progress)}%`} />
      </footer>
    </div>
  );
}

function ForestWorldLayer({
  mapNodes,
  onMemoryMode,
  scope,
  timeTone,
}: {
  mapNodes: ForestMapNode[];
  onMemoryMode: (enabled: boolean) => void;
  scope: ForestScope;
  timeTone: TimeTone;
}) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const onMemoryModeRef = useRef(onMemoryMode);

  useEffect(() => {
    onMemoryModeRef.current = onMemoryMode;
  }, [onMemoryMode]);

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
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
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
      distance: scope === "today" ? 23 : 31,
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
      drag.distance = Math.max(5.8, Math.min(38, drag.distance + event.deltaY * 0.018));
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
        drag.distance = Math.max(5.8, Math.min(38, drag.distance - (distance - drag.pinchDistance) * 0.045));
      }
      drag.pinchDistance = distance;
    }

    function handleTouchEnd() {
      drag.pinchDistance = null;
    }

    let frameId = 0;
    const clock = new THREE.Clock();
    function animate() {
      const elapsed = clock.getElapsedTime();
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
            className="absolute left-1/2 top-1/2 w-[min(86vw,440px)] -translate-x-1/2 -translate-y-1/2 rounded-md border border-white/50 bg-white/64 px-5 py-4 text-center shadow-[0_24px_70px_rgba(20,31,25,0.18)] backdrop-blur-md"
            initial={{ y: 12, scale: 0.96, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
          >
            <p className="text-lg font-black text-[#263126]">木の中の記憶</p>
            <p className="mt-1 text-xs font-bold text-[#5d695c]">完了したtodoが浮かびます</p>
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

function ForestNode({ celebrate, node, onComplete }: { celebrate?: boolean; node: ForestMapNode; onComplete?: () => void }) {
  const maxSize = node.featured ? 178 : node.todoCount >= 5 ? 138 : node.todoCount >= 2 ? 118 : 96;
  const minSize = node.featured ? 126 : 76;
  const fluidSize = node.featured ? 17 : 10;
  const showSublabel = node.sublabel && node.sublabel !== node.label;
  const interactive = Boolean(onComplete);

  function handleKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (!interactive || (event.key !== "Enter" && event.key !== " ")) return;
    event.preventDefault();
    onComplete?.();
  }

  return (
    <motion.div
      className={cn(
        "absolute z-20 grid -translate-x-1/2 -translate-y-1/2 place-items-center text-center outline-none",
        interactive ? "cursor-pointer" : "cursor-default",
      )}
      style={{
        left: `${node.x}%`,
        top: `${node.y}%`,
        width: `clamp(${minSize}px, ${fluidSize}vw, ${maxSize}px)`,
        minHeight: `calc(clamp(${minSize}px, ${fluidSize}vw, ${maxSize}px) + 42px)`,
      }}
      onClick={onComplete}
      onKeyDown={handleKeyDown}
      whileHover={interactive ? { y: -2, scale: 1.015 } : undefined}
      aria-label={`${node.label} 完了${node.count}件 todo${node.todoCount}件`}
      role={interactive ? "button" : "group"}
      tabIndex={interactive ? 0 : undefined}
    >
      <TodoFruitTree celebrate={celebrate} node={node} />
      {showSublabel && <span className="mt-1 max-w-[160px] truncate text-xs font-bold text-[#626961] md:text-sm">{node.sublabel}</span>}
      <span className={cn("mt-1 max-w-[160px] truncate text-sm font-black text-[#3a473a] md:text-base", node.featured && "text-[#466d3d]")}>
        {node.label}
      </span>
    </motion.div>
  );
}

function TodoFruitTree({ celebrate, node }: { celebrate?: boolean; node: ForestMapNode }) {
  const [openFruitIndex, setOpenFruitIndex] = useState<number | null>(null);
  const fruits = node.fruits.slice(0, fruitPositions.length);
  const buds = node.buds.slice(0, 5);
  const empty = node.todoCount === 0;
  const mature = node.featured || node.points >= 40 || fruits.length >= 3;
  const openFruit = openFruitIndex === null ? undefined : fruits[openFruitIndex];

  return (
    <span className={cn("relative block aspect-square w-full", node.future && "opacity-45")}>
      <span className="absolute bottom-[4%] left-[15%] h-[16%] w-[70%] rounded-[100%] bg-[#8d887b]/15 blur-[1px]" />
      <span className="absolute bottom-[13%] left-[25%] h-[12%] w-[50%] rounded-[100%] border border-[#d8d0bf] bg-[#f5f2e9] shadow-[inset_0_2px_8px_rgba(255,255,255,0.8)]" />
      <span
        className={cn(
          "absolute bottom-[20%] left-1/2 w-[10%] -translate-x-1/2 rounded-t-full bg-gradient-to-r from-[#5e3f2e] via-[#8a654d] to-[#4b3326]",
          mature ? "h-[38%]" : "h-[28%]",
        )}
      />
      <span className="absolute bottom-[28%] left-[43%] h-[24%] w-[7%] -rotate-[28deg] rounded-full bg-[#6b4a38]" />
      <span className="absolute bottom-[30%] left-[51%] h-[26%] w-[7%] rotate-[31deg] rounded-full bg-[#6b4a38]" />

      <span className={cn("absolute left-[11%] top-[5%] h-[66%] w-[78%]", empty && "opacity-55")}>
        {leafClusters.slice(0, mature ? leafClusters.length : 3).map((leaf, index) => (
          <span
            key={index}
            className="absolute rounded-[48%] shadow-[inset_0_8px_14px_rgba(255,255,255,0.2),0_8px_18px_rgba(50,80,46,0.16)]"
            style={{
              left: `${leaf.left}%`,
              top: `${leaf.top}%`,
              width: `${leaf.width}%`,
              height: `${leaf.height}%`,
              background: leaf.color,
              transform: `rotate(${index % 2 ? 11 : -9}deg)`,
            }}
          />
        ))}
      </span>

      {fruits.map((fruit, index) => {
        const position = fruitPositions[index];
        return (
          <motion.button
            key={`fruit-${index}`}
            type="button"
            title={fruit.title}
            className={cn(
              "absolute grid place-items-center rounded-full border text-[9px] font-black text-white outline-none transition focus-visible:ring-2 focus-visible:ring-[#4e7d45]/35",
              fruitClassName(fruit.difficulty),
              openFruitIndex === index && "scale-110 ring-2 ring-[#4e7d45]/35",
            )}
            style={{ left: `${position.left}%`, top: `${position.top}%` }}
            onClick={(event) => {
              event.stopPropagation();
              setOpenFruitIndex(openFruitIndex === index ? null : index);
            }}
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: celebrate && index === fruits.length - 1 ? [0.7, 1.25, 1] : 1, opacity: 1 }}
            transition={{ delay: index * 0.03, type: "spring", stiffness: 170, damping: 14 }}
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
            className="absolute left-1/2 top-[88%] z-50 grid max-h-44 w-56 -translate-x-1/2 gap-2 overflow-auto rounded-md border border-[#ded8c8] bg-[#fffdf7]/96 p-3 text-left shadow-[0_14px_32px_rgba(38,49,38,0.16)] backdrop-blur"
            initial={{ opacity: 0, y: -4, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.96 }}
            onClick={(event) => event.stopPropagation()}
          >
            <span className="text-xs font-black text-[#2f3b2f]">実ったtodo</span>
            {node.fruits.map((fruit, index) => (
              <span key={`${fruit.title}-${index}`} className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-2 text-xs font-semibold text-[#566055]">
                <span className={cn("rounded-full border", miniFruitClassName(fruit.difficulty))} />
                <span className="truncate">{fruit.title}</span>
                <span className="text-[10px] font-black text-[#71806d]">{difficultyMeta[fruit.difficulty].label}</span>
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
  title,
}: {
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
  title: string;
}) {
  const children = childrenByParent(tasks);
  const rootTasks = tasks.filter((task) => !task.parentId || !tasks.some((candidate) => candidate.id === task.parentId));
  const todayNode = buildTodayOverviewNode(tasks);

  return (
    <div className="grid gap-5 p-4 lg:grid-cols-[minmax(0,1fr)_360px] lg:p-8">
      <section className="grid min-w-0 gap-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-black">今日のタスク</h2>
            <p className="text-sm font-medium text-[#747a71]">親タスクを幹にして、小todoが実になる</p>
          </div>
          <label className="relative block md:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b9288]" />
            <Input value={query} onChange={(event) => setQuery(event.target.value)} className="rounded-md border-[#ddd8cc] bg-white/70 pl-9" placeholder="探す" />
          </label>
        </div>

        <div className="grid gap-3">
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
                task={task}
              />
            ))}
          </AnimatePresence>
          {!rootTasks.length && <EmptyState text="タスクがまだありません" />}
        </div>
      </section>

      <aside className="grid h-fit gap-4">
        <Card className="border-[#e4dfd4] bg-white/70 shadow-none">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <CardTitle>今日の木</CardTitle>
                <CardDescription>{todayNode.count}/{todayNode.todoCount} 実った</CardDescription>
              </div>
              <Button variant="ghost" size="sm" className="text-[#4e7d45]" onClick={() => setActiveView("forest")}>
                森へ
              </Button>
            </div>
          </CardHeader>
          <CardContent className="grid place-items-center pb-5">
            <div className="w-48 max-w-full">
              <TodoFruitTree celebrate={false} node={todayNode} />
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#e4dfd4] bg-white/70 shadow-none">
          <CardHeader className="pb-3">
            <CardTitle>追加</CardTitle>
            <CardDescription>{selectedParentTitle ? `親: ${selectedParentTitle}` : "親タスクなし"}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3">
            <Input value={title} onChange={(event) => onTitle(event.target.value)} onKeyDown={(event) => event.key === "Enter" && onSubmit()} placeholder="タスク名" />
            <Textarea value={notes} onChange={(event) => onNotes(event.target.value)} placeholder="メモ" />
            <select
              className="h-10 rounded-md border border-[#ddd8cc] bg-white px-3 text-sm outline-none"
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
                <Button key={key} variant={difficulty === key ? "default" : "outline"} size="sm" onClick={() => onDifficulty(key)}>
                  {difficultyMeta[key].label}
                </Button>
              ))}
            </div>
            <Button onClick={onSubmit}>
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

function NestedTaskRow({
  childrenMap,
  depth,
  onComplete,
  onDelete,
  onParent,
  task,
}: {
  childrenMap: Map<string, Task[]>;
  depth: number;
  onComplete: (id: string) => void;
  onDelete: (id: string) => void;
  onParent: (id: string) => void;
  task: Task;
}) {
  const childTasks = childrenMap.get(task.id) ?? [];
  const childDone = childTasks.filter((child) => child.completed).length;

  return (
    <motion.div layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.98 }}>
      <div
        className={cn(
          "grid gap-2 rounded-md border border-[#e4dfd4] bg-white/70 p-3 shadow-sm",
          task.completed && "bg-[#f4f4ee] text-[#7a8177]",
        )}
        style={{ marginLeft: depth ? Math.min(depth * 22, 58) : 0 }}
      >
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-start gap-3">
          <Checkbox
            aria-label={task.completed ? `${task.title}は完了済み` : `${task.title}を完了`}
            checked={task.completed}
            disabled={task.completed}
            onCheckedChange={() => !task.completed && onComplete(task.id)}
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <p className={cn("truncate font-bold", task.completed && "line-through")}>{task.title}</p>
              <Badge className={difficultyMeta[task.difficulty].className}>{difficultyMeta[task.difficulty].label}</Badge>
              {!!childTasks.length && <Badge variant="outline">{childDone}/{childTasks.length}</Badge>}
            </div>
            {task.notes && <p className="mt-1 line-clamp-2 text-sm text-[#777f75]">{task.notes}</p>}
            {!!childTasks.length && (
              <div className="mt-3 flex items-center gap-2">
                <span className="h-8 w-1.5 rounded-full bg-gradient-to-b from-[#7b5944] via-[#5f4131] to-[#3f2d24]" />
                <div className="flex min-w-0 flex-wrap items-center gap-1.5">
                  {childTasks.slice(0, 10).map((child) => (
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
            )}
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onParent(task.id)} aria-label={`${task.title}に小タスクを追加`}>
              <Plus className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDelete(task.id)} aria-label={`${task.title}を削除`}>
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
          task={child}
        />
      ))}
    </motion.div>
  );
}

function HistoryScreen({ history }: { history: Record<string, Task[]> }) {
  const days = Object.entries(history);
  return (
    <div className="grid gap-4 p-4 lg:p-8">
      <div>
        <h2 className="text-2xl font-black">履歴</h2>
        <p className="text-sm font-medium text-[#747a71]">完了したタスク</p>
      </div>
      <div className="grid gap-3">
        {days.map(([day, tasks]) => (
          <Card key={day} className="border-[#e4dfd4] bg-white/72 shadow-none">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle>{day}</CardTitle>
              <Badge variant="outline">{tasks.length}件</Badge>
            </CardHeader>
            <CardContent className="grid gap-2">
              {tasks.map((task) => (
                <div key={task.id} className="flex items-center justify-between gap-3 rounded-md bg-[#f4f3ed] px-3 py-2 text-sm">
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
        <h2 className="text-2xl font-black">設定</h2>
        <p className="text-sm font-medium text-[#747a71]">表示と保存データ</p>
      </div>

      <Card className="border-[#e4dfd4] bg-white/72 shadow-none">
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
          <label className="flex items-center gap-3 rounded-md border border-[#e4dfd4] p-3">
            <Checkbox checked={settings.showCelebration} onCheckedChange={(checked) => updateSettings({ showCelebration: Boolean(checked) })} />
            <span className="font-semibold">完了時の光</span>
          </label>
          <label className="flex items-center gap-3 rounded-md border border-[#e4dfd4] p-3">
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
    <div className="rounded-md border border-[#e4dfd4] bg-white/70 p-4">
      <p className="text-xs font-bold text-[#747a71]">{label}</p>
      <p className="mt-1 text-2xl font-black tabular-nums">{value}</p>
    </div>
  );
}

function EmptyState({ text }: { text: string }) {
  return <p className="rounded-md border border-dashed border-[#ddd8cc] bg-white/55 p-5 text-center text-sm font-medium text-[#747a71]">{text}</p>;
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
      points: group.points || group.tasks.length * 8,
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
      points: day.points || todoCount * 8,
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
    points: points || source.length * 8,
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
  const scale = node.featured ? 1.55 : Math.max(0.72, Math.min(1.16, 0.72 + node.todoCount * 0.07));
  group.position.set(position.x, 0, position.z);
  group.scale.setScalar(scope === "today" ? scale * 1.12 : scale);
  group.userData.floatTree = true;

  const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x6a4a37, roughness: 0.92 });
  const branchMaterial = new THREE.MeshStandardMaterial({ color: 0x73513d, roughness: 0.86 });
  const baseMaterial = new THREE.MeshStandardMaterial({ color: 0xf3eee2, roughness: 0.88 });
  const leafMaterials = [
    new THREE.MeshStandardMaterial({ color: 0x7ca863, roughness: 0.82 }),
    new THREE.MeshStandardMaterial({ color: 0x57904c, roughness: 0.8 }),
    new THREE.MeshStandardMaterial({ color: 0x3f783f, roughness: 0.84 }),
  ];

  const base = new THREE.Mesh(new THREE.CylinderGeometry(1.15, 1.35, 0.12, 48), baseMaterial);
  base.position.y = 0.06;
  base.receiveShadow = true;
  group.add(base);

  const trunkHeight = node.points > 70 || node.count >= 4 ? 2.25 : node.count >= 2 ? 1.82 : 1.44;
  const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.34, trunkHeight, 12), trunkMaterial);
  trunk.position.y = 0.12 + trunkHeight / 2;
  trunk.castShadow = true;
  group.add(trunk);

  [
    { x: -0.36, y: trunkHeight * 0.72, z: 0.02, rz: 0.72 },
    { x: 0.38, y: trunkHeight * 0.78, z: -0.02, rz: -0.72 },
    { x: 0.08, y: trunkHeight * 0.88, z: -0.28, rz: -0.28 },
  ].forEach((branch) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.12, 0.9, 10), branchMaterial);
    mesh.position.set(branch.x, branch.y, branch.z);
    mesh.rotation.z = branch.rz;
    mesh.castShadow = true;
    group.add(mesh);
  });

  const leafCenters = [
    { x: -0.55, y: trunkHeight + 0.28, z: 0.02, size: 0.76 },
    { x: 0.14, y: trunkHeight + 0.55, z: 0.08, size: 0.88 },
    { x: 0.65, y: trunkHeight + 0.24, z: -0.06, size: 0.72 },
    { x: -0.04, y: trunkHeight + 0.08, z: 0.46, size: 0.7 },
    { x: 0.02, y: trunkHeight + 0.12, z: -0.48, size: 0.68 },
  ];
  leafCenters.slice(0, node.count >= 2 || node.featured ? leafCenters.length : 3).forEach((leaf, index) => {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(leaf.size, 20, 16), leafMaterials[index % leafMaterials.length]);
    mesh.position.set(leaf.x, leaf.y, leaf.z);
    mesh.scale.set(1.15, 0.72, 0.95);
    mesh.castShadow = true;
    group.add(mesh);
  });

  node.fruits.slice(0, 12).forEach((fruit, index) => {
    const fruitPosition = fruitWorldPosition(index, trunkHeight);
    const mesh = new THREE.Mesh(
      new THREE.SphereGeometry(fruitRadius(fruit.difficulty), 18, 16),
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

  return group;
}

function nodeToWorldPosition(node: ForestMapNode) {
  return {
    x: (node.x - 50) / 2.08,
    z: (node.y - 50) / 2.08,
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
  if (tone === "morning") return "bg-[#e8ece1]";
  if (tone === "day") return "bg-[#e5ece2]";
  if (tone === "evening") return "bg-[#eee6d8]";
  return "bg-[#17211f]";
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
      fogDensity: 0.028,
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
      fogDensity: 0.031,
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
      fogDensity: 0.04,
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
    fogDensity: 0.026,
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
  if (theme === "night") return "theme-night";
  return "";
}

function themeLabel(theme: ThemeMode) {
  if (theme === "forest") return "森";
  if (theme === "night") return "夜";
  return "朝";
}

export default App;
