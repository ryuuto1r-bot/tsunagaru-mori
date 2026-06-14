import { useEffect, useRef } from "react";
import {
  ACESFilmicToneMapping,
  AmbientLight,
  BoxGeometry,
  BufferGeometry,
  CatmullRomCurve3,
  CircleGeometry,
  ConeGeometry,
  CylinderGeometry,
  DirectionalLight,
  DoubleSide,
  FogExp2,
  Group,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PCFShadowMap,
  PerspectiveCamera,
  Scene,
  SphereGeometry,
  SRGBColorSpace,
  TorusGeometry,
  Vector3,
  WebGLRenderer,
} from "three";
import type { Difficulty } from "@/store/useGrowthStore";
import { cn } from "@/lib/utils";

type ForestScope = "today" | "month" | "all";
type TimeTone = "morning" | "day" | "evening" | "night";
type WorldControl = "zoom-in" | "zoom-out" | "orbit-left" | "orbit-right" | "tilt-up" | "tilt-down" | "reset";

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
  targetYaw: number;
  targetPitch: number;
  targetDistance: number;
  velocityYaw: number;
  velocityPitch: number;
  pinchDistance: number | null;
};

type ForestWorldLayerProps = {
  control: WorldControl | null;
  controlNonce: number;
  mapNodes: ForestMapNode[];
  onMemoryMode: (enabled: boolean) => void;
  scope: ForestScope;
  timeTone: TimeTone;
};

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

const minDistance = 4.8;
const memoryDistance = 6.9;
const maxDistance = 34;
const minPitch = -0.14;
const maxPitch = 0.58;

export default function ForestWorldLayer({
  control,
  controlNonce,
  mapNodes,
  onMemoryMode,
  scope,
  timeTone,
}: ForestWorldLayerProps) {
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
    const scene = new Scene();
    scene.fog = new FogExp2(palette.fog, palette.fogDensity);

    const camera = new PerspectiveCamera(42, 1, 0.1, 120);
    const renderer = new WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.toneMapping = ACESFilmicToneMapping;
    renderer.toneMappingExposure = timeTone === "night" ? 1.18 : timeTone === "morning" ? 1.16 : 1.08;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = PCFShadowMap;
    renderer.domElement.className = "h-full w-full touch-none outline-none";
    renderer.domElement.tabIndex = 0;
    renderer.domElement.setAttribute("role", "application");
    renderer.domElement.setAttribute("aria-label", "ドラッグ、ホイール、矢印キーで動かせる森の3Dワールド");
    hostElement.appendChild(renderer.domElement);

    const world = new Group();
    scene.add(world);

    const ground = new Mesh(
      new CircleGeometry(34, 96),
      new MeshStandardMaterial({ color: palette.ground, roughness: 0.9, metalness: 0.02 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    world.add(ground);

    addGardenEnvironment(world, mapNodes, palette, scope);
    const ambientLight = new AmbientLight(palette.ambient, palette.ambientIntensity);
    scene.add(ambientLight);

    const sun = new DirectionalLight(palette.sun, palette.sunIntensity);
    sun.position.set(-10, 18, 12);
    sun.castShadow = true;
    sun.shadow.mapSize.width = 2048;
    sun.shadow.mapSize.height = 2048;
    scene.add(sun);

    const fill = new DirectionalLight(palette.fill, 0.38);
    fill.position.set(12, 7, -10);
    scene.add(fill);

    addWorldPaths(world, mapNodes, palette.path);
    mapNodes.forEach((node) => world.add(createWorldTree(node, scope)));
    addWorldSeeds(world, palette.seed);

    const initialView = defaultWorldView(scope);
    const drag: DragState = {
      dragging: false,
      lastX: 0,
      lastY: 0,
      yaw: initialView.yaw,
      pitch: initialView.pitch,
      distance: initialView.distance,
      targetYaw: initialView.yaw,
      targetPitch: initialView.pitch,
      targetDistance: initialView.distance,
      velocityYaw: 0,
      velocityPitch: 0,
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
      drag.yaw += (drag.targetYaw - drag.yaw) * 0.16;
      drag.pitch += (drag.targetPitch - drag.pitch) * 0.16;
      drag.distance += (drag.targetDistance - drag.distance) * 0.18;
      const target = scope === "today" ? new Vector3(0.55, 1.75, 0.25) : new Vector3(0, 2.6, 0);
      const height = 6.5 + drag.pitch * 9;
      camera.position.set(Math.sin(drag.yaw) * drag.distance, height, Math.cos(drag.yaw) * drag.distance);
      camera.lookAt(target);
      onMemoryModeRef.current(drag.distance < 8.3);
    }

    function resetView() {
      const view = defaultWorldView(scope);
      drag.targetYaw = view.yaw;
      drag.targetPitch = view.pitch;
      drag.targetDistance = view.distance;
      drag.velocityYaw = 0;
      drag.velocityPitch = 0;
      drag.pinchDistance = null;
    }

    let handledControlNonce = controlRef.current.nonce;
    function applyControlSignal() {
      const signal = controlRef.current;
      if (!signal.control || signal.nonce === handledControlNonce) return;
      handledControlNonce = signal.nonce;
      if (signal.control === "zoom-in") {
        drag.targetDistance = drag.targetDistance > 12 ? memoryDistance : clamp(drag.targetDistance - 4.2, minDistance, maxDistance);
      } else if (signal.control === "zoom-out") {
        drag.targetDistance = clamp(drag.targetDistance + 5.5, minDistance, maxDistance);
      } else if (signal.control === "orbit-left") {
        drag.targetYaw += 0.38;
      } else if (signal.control === "orbit-right") {
        drag.targetYaw -= 0.38;
      } else if (signal.control === "tilt-up") {
        drag.targetPitch = clamp(drag.targetPitch + 0.13, minPitch, maxPitch);
      } else if (signal.control === "tilt-down") {
        drag.targetPitch = clamp(drag.targetPitch - 0.13, minPitch, maxPitch);
      } else {
        resetView();
      }
    }

    function handlePointerDown(event: PointerEvent) {
      drag.dragging = true;
      drag.lastX = event.clientX;
      drag.lastY = event.clientY;
      drag.velocityYaw = 0;
      drag.velocityPitch = 0;
      renderer.domElement.focus({ preventScroll: true });
      renderer.domElement.setPointerCapture(event.pointerId);
    }

    function handlePointerMove(event: PointerEvent) {
      if (!drag.dragging) return;
      const dx = event.clientX - drag.lastX;
      const dy = event.clientY - drag.lastY;
      drag.lastX = event.clientX;
      drag.lastY = event.clientY;
      const yawDelta = -dx * 0.0049;
      const pitchDelta = dy * 0.0027;
      drag.targetYaw += yawDelta;
      drag.targetPitch = clamp(drag.targetPitch + pitchDelta, minPitch, maxPitch);
      drag.velocityYaw = yawDelta * 0.9;
      drag.velocityPitch = pitchDelta * 0.72;
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
      drag.targetDistance = clamp(drag.targetDistance + event.deltaY * 0.014, minDistance, maxDistance);
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
        drag.targetDistance = clamp(drag.targetDistance - (distance - drag.pinchDistance) * 0.04, minDistance, maxDistance);
      }
      drag.pinchDistance = distance;
    }

    function handleTouchEnd() {
      drag.pinchDistance = null;
    }

    function handleKeyDown(event: KeyboardEvent) {
      const key = event.key;
      if (key === "ArrowLeft") {
        event.preventDefault();
        drag.targetYaw += 0.24;
      } else if (key === "ArrowRight") {
        event.preventDefault();
        drag.targetYaw -= 0.24;
      } else if (key === "ArrowUp") {
        event.preventDefault();
        drag.targetPitch = clamp(drag.targetPitch + 0.08, minPitch, maxPitch);
      } else if (key === "ArrowDown") {
        event.preventDefault();
        drag.targetPitch = clamp(drag.targetPitch - 0.08, minPitch, maxPitch);
      } else if (key === "+" || key === "=") {
        event.preventDefault();
        drag.targetDistance = clamp(drag.targetDistance - 2.8, minDistance, maxDistance);
      } else if (key === "-" || key === "_") {
        event.preventDefault();
        drag.targetDistance = clamp(drag.targetDistance + 2.8, minDistance, maxDistance);
      } else if (key === "Escape" || key === "0") {
        event.preventDefault();
        resetView();
      }
    }

    let frameId = 0;
    const animationStart = window.performance.now();
    function animate() {
      const elapsed = (window.performance.now() - animationStart) / 1000;
      applyControlSignal();
      if (!drag.dragging) {
        drag.targetYaw += drag.velocityYaw;
        drag.targetPitch = clamp(drag.targetPitch + drag.velocityPitch, minPitch, maxPitch);
        drag.velocityYaw *= 0.9;
        drag.velocityPitch *= 0.82;
        if (Math.abs(drag.velocityYaw) < 0.00008) drag.velocityYaw = 0;
        if (Math.abs(drag.velocityPitch) < 0.00008) drag.velocityPitch = 0;
      }
      updateCamera();
      world.children.forEach((child: Object3D, index: number) => {
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
    renderer.domElement.addEventListener("lostpointercapture", handlePointerUp);
    renderer.domElement.addEventListener("wheel", handleWheel, { passive: false });
    renderer.domElement.addEventListener("touchmove", handleTouchMove, { passive: false });
    renderer.domElement.addEventListener("touchend", handleTouchEnd);
    renderer.domElement.addEventListener("keydown", handleKeyDown);

    return () => {
      onMemoryModeRef.current(false);
      window.cancelAnimationFrame(frameId);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener("pointerdown", handlePointerDown);
      renderer.domElement.removeEventListener("pointermove", handlePointerMove);
      renderer.domElement.removeEventListener("pointerup", handlePointerUp);
      renderer.domElement.removeEventListener("pointercancel", handlePointerUp);
      renderer.domElement.removeEventListener("lostpointercapture", handlePointerUp);
      renderer.domElement.removeEventListener("wheel", handleWheel);
      renderer.domElement.removeEventListener("touchmove", handleTouchMove);
      renderer.domElement.removeEventListener("touchend", handleTouchEnd);
      renderer.domElement.removeEventListener("keydown", handleKeyDown);
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

function addWorldPaths(world: Group, mapNodes: ForestMapNode[], color: number) {
  if (mapNodes.length < 2) return;
  const material = new LineBasicMaterial({ color, transparent: true, opacity: 0.46 });
  mapNodes.slice(1).forEach((node, index) => {
    const from = nodeToWorldPosition(mapNodes[index]);
    const to = nodeToWorldPosition(node);
    const curve = new CatmullRomCurve3([
      new Vector3(from.x, 0.04, from.z),
      new Vector3((from.x + to.x) / 2, 0.07, (from.z + to.z) / 2),
      new Vector3(to.x, 0.04, to.z),
    ]);
    const geometry = new BufferGeometry().setFromPoints(curve.getPoints(28));
    const line = new Line(geometry, material);
    world.add(line);
  });
}

function addGardenEnvironment(world: Group, mapNodes: ForestMapNode[], palette: ReturnType<typeof worldPalette>, scope: ForestScope) {
  const stoneMaterial = new MeshStandardMaterial({ color: 0xd6d0c0, roughness: 0.82, metalness: 0.02 });
  const warmStoneMaterial = new MeshStandardMaterial({ color: 0xb8ad93, roughness: 0.88 });
  const mossMaterial = new MeshStandardMaterial({ color: palette.ground, roughness: 0.98, metalness: 0.01 });
  const darkMossMaterial = new MeshStandardMaterial({ color: scope === "today" ? 0x5f7846 : 0x4a6541, roughness: 0.98 });
  const waterMaterial = new MeshStandardMaterial({
    color: timeAdjustedWaterColor(palette.fog),
    emissive: timeAdjustedWaterColor(palette.fog),
    emissiveIntensity: 0.04,
    metalness: 0.16,
    opacity: 0.46,
    roughness: 0.18,
    side: DoubleSide,
    transparent: true,
  });
  const waterRimMaterial = new MeshStandardMaterial({ color: 0xe6ddbe, opacity: 0.42, roughness: 0.64, transparent: true });
  const silhouetteMaterial = new MeshStandardMaterial({ color: scope === "today" ? 0x314934 : 0x263d30, opacity: 0.42, roughness: 0.96, transparent: true });
  const plantMaterials = [
    new MeshStandardMaterial({ color: 0x6f9657, roughness: 0.92 }),
    new MeshStandardMaterial({ color: 0x496d3d, roughness: 0.95 }),
    new MeshStandardMaterial({ color: 0x91ad72, roughness: 0.9 }),
  ];

  const innerGarden = new Mesh(new CylinderGeometry(scope === "today" ? 5.6 : 15.4, scope === "today" ? 6.8 : 18.2, 0.12, 112), mossMaterial);
  innerGarden.position.y = 0.018;
  innerGarden.receiveShadow = true;
  world.add(innerGarden);

  for (let index = 0; index < 18; index += 1) {
    const angle = index * 1.91;
    const radius = scope === "today" ? 2.4 + (index % 5) * 0.62 : 6.5 + (index % 7) * 1.18;
    const patch = new Mesh(new CircleGeometry(0.48 + (index % 4) * 0.1, 28), index % 3 === 0 ? darkMossMaterial : mossMaterial);
    patch.rotation.x = -Math.PI / 2;
    patch.rotation.z = angle * 0.4;
    patch.position.set(Math.cos(angle) * radius, 0.086 + (index % 2) * 0.004, Math.sin(angle) * radius * 0.72);
    patch.scale.set(1.65, 0.74, 1);
    patch.receiveShadow = true;
    world.add(patch);
  }

  addGardenWater(world, waterMaterial, waterRimMaterial, scope);
  addSteppingStones(world, mapNodes, stoneMaterial, warmStoneMaterial, scope);
  addGardenPlants(world, plantMaterials, scope);
  addDistantTreeLine(world, silhouetteMaterial, scope);
}

function addGardenWater(world: Group, waterMaterial: MeshStandardMaterial, waterRimMaterial: MeshStandardMaterial, scope: ForestScope) {
  const pond = new Mesh(new CircleGeometry(scope === "today" ? 0.82 : 1.45, 64), waterMaterial);
  pond.rotation.x = -Math.PI / 2;
  pond.position.set(scope === "today" ? 2.2 : -6.2, 0.105, scope === "today" ? 2.8 : 5.6);
  pond.scale.set(scope === "today" ? 1.6 : 1.9, scope === "today" ? 0.62 : 0.72, 1);
  pond.receiveShadow = true;
  world.add(pond);

  const pondRim = new Mesh(new TorusGeometry(scope === "today" ? 0.83 : 1.45, 0.025, 8, 72), waterRimMaterial);
  pondRim.rotation.x = Math.PI / 2;
  pondRim.position.copy(pond.position);
  pondRim.scale.copy(pond.scale);
  world.add(pondRim);

  for (let index = 0; index < 4; index += 1) {
    const ripple = new Mesh(
      new TorusGeometry((scope === "today" ? 0.3 : 0.5) + index * 0.16, 0.006, 6, 42),
      new MeshStandardMaterial({ color: 0xf3efd9, opacity: 0.22 - index * 0.035, roughness: 0.35, transparent: true }),
    );
    ripple.rotation.x = Math.PI / 2;
    ripple.position.set(pond.position.x - 0.15 + index * 0.08, pond.position.y + 0.012 + index * 0.003, pond.position.z + 0.02);
    ripple.scale.set(1.42, 0.58, 1);
    world.add(ripple);
  }
}

function addSteppingStones(
  world: Group,
  mapNodes: ForestMapNode[],
  stoneMaterial: MeshStandardMaterial,
  warmStoneMaterial: MeshStandardMaterial,
  scope: ForestScope,
) {
  const positions =
    scope === "today" || mapNodes.length < 2
      ? [
          { x: -1.8, z: 2.55 },
          { x: -0.92, z: 2.25 },
          { x: -0.08, z: 2.0 },
          { x: 0.82, z: 1.76 },
          { x: 1.65, z: 1.52 },
        ]
      : mapNodes.slice(1).flatMap((node, index) => {
          const from = nodeToWorldPosition(mapNodes[index]);
          const to = nodeToWorldPosition(node);
          return [0.33, 0.66].map((t) => ({ x: from.x + (to.x - from.x) * t, z: from.z + (to.z - from.z) * t }));
        });

  positions.slice(0, scope === "today" ? 5 : 18).forEach((position, index) => {
    const stone = new Mesh(new SphereGeometry(0.18 + (index % 3) * 0.025, 14, 8), index % 2 ? warmStoneMaterial : stoneMaterial);
    stone.position.set(position.x, 0.14, position.z);
    stone.scale.set(1.58, 0.26, 0.94);
    stone.rotation.y = index * 0.38;
    stone.castShadow = true;
    stone.receiveShadow = true;
    world.add(stone);
  });
}

function addGardenPlants(world: Group, materials: MeshStandardMaterial[], scope: ForestScope) {
  const count = scope === "today" ? 22 : 38;
  for (let index = 0; index < count; index += 1) {
    const angle = index * 2.399;
    const radius = scope === "today" ? 3.2 + (index % 5) * 0.52 : 10.5 + (index % 8) * 1.05;
    const plant = new Group();
    plant.position.set(Math.cos(angle) * radius, 0.12, Math.sin(angle) * radius);
    plant.rotation.y = -angle + Math.PI / 2;
    const bladeCount = 3 + (index % 3);
    for (let blade = 0; blade < bladeCount; blade += 1) {
      const leaf = new Mesh(new SphereGeometry(0.12 + blade * 0.012, 10, 8), materials[(index + blade) % materials.length]);
      leaf.position.set((blade - 1.5) * 0.08, 0.22 + blade * 0.045, 0.02 * blade);
      leaf.rotation.z = (blade - 1) * 0.42;
      leaf.rotation.x = 0.38;
      leaf.scale.set(0.45, 0.14, 1.35);
      leaf.castShadow = true;
      plant.add(leaf);
    }
    world.add(plant);
  }
}

function addDistantTreeLine(world: Group, material: MeshStandardMaterial, scope: ForestScope) {
  const count = scope === "today" ? 16 : 28;
  for (let index = 0; index < count; index += 1) {
    const angle = -Math.PI * 0.18 + (index / Math.max(1, count - 1)) * Math.PI * 1.36;
    const radius = scope === "today" ? 9.5 + (index % 3) * 0.8 : 22 + (index % 4) * 1.7;
    const tree = new Group();
    tree.position.set(Math.cos(angle) * radius, 0.02, Math.sin(angle) * radius - (scope === "today" ? 2.2 : 5.5));
    tree.rotation.y = angle;
    const height = scope === "today" ? 1.25 + (index % 4) * 0.18 : 2.0 + (index % 5) * 0.22;
    const trunk = new Mesh(new CylinderGeometry(0.035, 0.055, height * 0.65, 8), material);
    trunk.position.y = height * 0.28;
    tree.add(trunk);
    const crown = new Mesh(new ConeGeometry(0.32 + (index % 3) * 0.07, height, 12), material);
    crown.position.y = height * 0.78;
    crown.scale.set(1.05, 1, 0.72);
    tree.add(crown);
    world.add(tree);
  }
}

function addWorldSeeds(world: Group, color: number) {
  const material = new MeshStandardMaterial({ color, roughness: 0.85 });
  for (let index = 0; index < 24; index += 1) {
    const angle = index * 1.618;
    const radius = 6 + (index % 8) * 2.8;
    const seed = new Mesh(new SphereGeometry(0.045 + (index % 3) * 0.015, 8, 8), material);
    seed.position.set(Math.cos(angle) * radius, 0.08, Math.sin(angle) * radius);
    seed.castShadow = true;
    world.add(seed);
  }
}

function createWorldTree(node: ForestMapNode, scope: ForestScope) {
  const group = new Group();
  const position = nodeToWorldPosition(node);
  const growthLevel = treeGrowthLevel(node);
  const scale = node.featured ? 1.72 : Math.max(0.86, Math.min(1.42, 0.82 + node.count * 0.055 + node.todoCount * 0.045 + growthLevel * 0.07));
  group.position.set(position.x, 0, position.z);
  group.scale.setScalar(scope === "today" ? scale * 1.15 : scale);
  group.userData.floatTree = true;

  const trunkMaterial = new MeshStandardMaterial({ color: 0x5f3c2c, roughness: 0.96 });
  const barkMaterial = new MeshStandardMaterial({ color: 0x3f2b22, roughness: 0.96 });
  const branchMaterial = new MeshStandardMaterial({ color: 0x78523c, roughness: 0.9 });
  const rootMaterial = new MeshStandardMaterial({ color: 0x4a3329, roughness: 0.98 });
  const baseMaterial = new MeshStandardMaterial({ color: 0xf7f3e8, roughness: 0.86 });
  const rimMaterial = new MeshStandardMaterial({ color: 0xe1dbcb, roughness: 0.82 });
  const mossMaterial = new MeshStandardMaterial({ color: 0x57733f, roughness: 0.98 });
  const mossHighlightMaterial = new MeshStandardMaterial({ color: 0x8ead6f, roughness: 0.96 });
  const stoneMaterial = new MeshStandardMaterial({ color: 0xc8c1b2, roughness: 0.88 });
  const leafMaterials = [
    new MeshStandardMaterial({ color: 0x8fb36f, roughness: 0.88 }),
    new MeshStandardMaterial({ color: 0x6f9d5c, roughness: 0.9 }),
    new MeshStandardMaterial({ color: 0x456f3a, roughness: 0.92 }),
    new MeshStandardMaterial({ color: 0xaac992, roughness: 0.88 }),
  ];
  const leafHighlightMaterial = new MeshStandardMaterial({ color: 0xb6d09c, roughness: 0.82, transparent: true, opacity: 0.88 });

  const contactShadow = new Mesh(
    new CircleGeometry(1.85, 72),
    new MeshStandardMaterial({ color: 0x06100c, roughness: 1, transparent: true, opacity: node.featured ? 0.24 : 0.16 }),
  );
  contactShadow.rotation.x = -Math.PI / 2;
  contactShadow.position.y = 0.018;
  contactShadow.scale.set(1.18, 0.62, 1);
  group.add(contactShadow);

  if (node.featured) {
    const focusRing = new Mesh(
      new TorusGeometry(1.48, 0.025, 8, 96),
      new MeshStandardMaterial({ color: 0xe9dc9a, emissive: 0x6a5b1e, emissiveIntensity: 0.08, opacity: 0.74, roughness: 0.46, transparent: true }),
    );
    focusRing.rotation.x = Math.PI / 2;
    focusRing.position.y = 0.19;
    focusRing.scale.set(1.14, 0.72, 1);
    group.add(focusRing);
  }

  const base = new Mesh(new CylinderGeometry(1.12, 1.4, 0.12, 72), baseMaterial);
  base.position.y = 0.06;
  base.receiveShadow = true;
  group.add(base);

  const rim = new Mesh(new TorusGeometry(1.12, 0.065, 12, 72), rimMaterial);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.17;
  rim.castShadow = true;
  rim.receiveShadow = true;
  group.add(rim);

  const lowerRim = new Mesh(new TorusGeometry(1.35, 0.035, 10, 72), rimMaterial);
  lowerRim.rotation.x = Math.PI / 2;
  lowerRim.position.y = 0.08;
  lowerRim.castShadow = true;
  group.add(lowerRim);

  const moss = new Mesh(new CylinderGeometry(0.78, 0.98, 0.08, 56), mossMaterial);
  moss.position.y = 0.17;
  moss.receiveShadow = true;
  group.add(moss);

  for (let index = 0; index < 15; index += 1) {
    const angle = index * 2.17;
    const radius = 0.14 + (index % 6) * 0.105;
    const tuft = new Mesh(new SphereGeometry(0.055 + (index % 3) * 0.018, 10, 8), index % 3 === 0 ? mossHighlightMaterial : mossMaterial);
    tuft.position.set(Math.cos(angle) * radius, 0.23 + (index % 2) * 0.012, Math.sin(angle) * radius * 0.82);
    tuft.scale.set(1.42, 0.42, 1.04);
    tuft.castShadow = true;
    tuft.receiveShadow = true;
    group.add(tuft);
  }

  for (let index = 0; index < 5; index += 1) {
    const angle = index * 1.34 + 0.2;
    const stone = new Mesh(new SphereGeometry(0.055 + (index % 2) * 0.025, 10, 8), stoneMaterial);
    stone.position.set(Math.cos(angle) * (0.55 + index * 0.035), 0.2, Math.sin(angle) * (0.38 + index * 0.03));
    stone.scale.set(1.25, 0.42, 0.92);
    stone.receiveShadow = true;
    group.add(stone);
  }

  if (growthLevel <= 1 && node.count === 0) {
    const seedMaterial = new MeshStandardMaterial({ color: 0xa97b4b, roughness: 0.72, emissive: 0x241505, emissiveIntensity: 0.06 });
    const seed = new Mesh(new SphereGeometry(0.2, 18, 14), seedMaterial);
    seed.position.set(0.04, 0.33, 0.02);
    seed.scale.set(1.12, 0.72, 0.9);
    seed.castShadow = true;
    group.add(seed);

    const sproutStemMaterial = new MeshStandardMaterial({ color: 0x87aa5d, roughness: 0.82, emissive: 0x14240d, emissiveIntensity: 0.08 });
    const sproutStem = new Mesh(new CylinderGeometry(0.024, 0.04, 0.42, 10), sproutStemMaterial);
    sproutStem.position.set(0.02, 0.58, 0.02);
    sproutStem.rotation.z = -0.08;
    sproutStem.castShadow = true;
    group.add(sproutStem);

    if (node.todoCount > 0) {
      [
        { x: -0.2, y: 0.7, z: 0.04, rz: 0.72, ry: -0.28, color: 0xa5cf7e, sx: 1.64 },
        { x: 0.2, y: 0.72, z: 0.02, rz: -0.7, ry: 0.28, color: 0x77a85d, sx: 1.58 },
        { x: -0.08, y: 0.86, z: -0.02, rz: 0.34, ry: -0.12, color: 0xb8d897, sx: 1.3 },
        { x: 0.1, y: 0.9, z: 0.04, rz: -0.3, ry: 0.14, color: 0x8ebd68, sx: 1.28 },
      ].forEach((leaf) => {
        const mesh = new Mesh(new SphereGeometry(0.17, 18, 12), new MeshStandardMaterial({ color: leaf.color, roughness: 0.82, emissive: 0x10230a, emissiveIntensity: 0.05 }));
        mesh.position.set(leaf.x, leaf.y, leaf.z);
        mesh.rotation.z = leaf.rz;
        mesh.rotation.y = leaf.ry;
        mesh.scale.set(leaf.sx, 0.34, 0.86);
        mesh.castShadow = true;
        group.add(mesh);
      });

      const dew = new Mesh(new SphereGeometry(0.035, 10, 8), new MeshStandardMaterial({ color: 0xf7ffe7, roughness: 0.2, transparent: true, opacity: 0.78 }));
      dew.position.set(-0.16, 0.75, 0.17);
      group.add(dew);
    }

    return group;
  }

  const trunkHeight = 1.22 + Math.min(5, growthLevel) * 0.28 + Math.min(3, node.count) * 0.06;
  const trunk = new Mesh(new CylinderGeometry(0.115, 0.265, trunkHeight, 18), trunkMaterial);
  trunk.position.y = 0.18 + trunkHeight / 2;
  trunk.rotation.z = -0.045;
  trunk.castShadow = true;
  group.add(trunk);

  [
    { x: -0.22, z: 0.16, rz: 0.78, rx: -0.2, length: 0.66, base: 0.06, tip: 0.026 },
    { x: 0.2, z: -0.12, rz: -0.72, rx: 0.18, length: 0.62, base: 0.055, tip: 0.024 },
    { x: 0.02, z: 0.27, rz: 0.18, rx: -0.72, length: 0.54, base: 0.048, tip: 0.022 },
    { x: -0.04, z: -0.28, rz: -0.16, rx: 0.72, length: 0.52, base: 0.046, tip: 0.02 },
  ].forEach((root) => {
    const mesh = new Mesh(new CylinderGeometry(root.tip, root.base, root.length, 12), rootMaterial);
    mesh.position.set(root.x, 0.37, root.z);
    mesh.rotation.z = root.rz;
    mesh.rotation.x = root.rx;
    mesh.castShadow = true;
    group.add(mesh);
  });

  for (let index = 0; index < 5; index += 1) {
    const ridge = new Mesh(new BoxGeometry(0.012, trunkHeight * 0.58, 0.014), barkMaterial);
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
    const mesh = new Mesh(new CylinderGeometry(0.028, 0.082, branch.length, 12), branchMaterial);
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
      const mesh = new Mesh(new SphereGeometry(radius, 12, 10), leafMaterials[(index + particle) % leafMaterials.length]);
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
      const highlight = new Mesh(new SphereGeometry(leaf.size * 0.12, 12, 8), leafHighlightMaterial);
      highlight.position.set(leaf.x - leaf.size * 0.15, leaf.y + leaf.size * 0.18, leaf.z + leaf.size * 0.32);
      highlight.scale.set(1.8, 0.42, 0.72);
      group.add(highlight);
    }
  });

  node.fruits.slice(0, 12).forEach((fruit, index) => {
    const fruitPosition = fruitWorldPosition(index, trunkHeight);
    const radius = fruitRadius(fruit.difficulty);
    const mesh = new Mesh(
      new SphereGeometry(radius, 20, 16),
      new MeshStandardMaterial({
        color: fruitColor(fruit.difficulty),
        roughness: fruit.difficulty === "hard" ? 0.34 : fruit.difficulty === "medium" ? 0.58 : 0.72,
        metalness: fruit.difficulty === "hard" ? 0.2 : 0.03,
        emissive: fruit.difficulty === "hard" ? 0x5c3f08 : fruit.difficulty === "easy" ? 0x10230a : 0x241000,
        emissiveIntensity: fruit.difficulty === "hard" ? 0.14 : fruit.difficulty === "easy" ? 0.04 : 0.03,
      }),
    );
    mesh.position.set(fruitPosition.x, fruitPosition.y, fruitPosition.z);
    mesh.castShadow = true;
    group.add(mesh);

    const stem = new Mesh(new CylinderGeometry(0.012, 0.018, radius * 0.72, 8), branchMaterial);
    stem.position.set(fruitPosition.x, fruitPosition.y + radius * 0.92, fruitPosition.z);
    stem.rotation.z = 0.24;
    stem.castShadow = true;
    group.add(stem);

    const shine = new Mesh(new SphereGeometry(radius * 0.22, 10, 8), new MeshStandardMaterial({ color: 0xfff6d0, roughness: 0.45, transparent: true, opacity: 0.76 }));
    shine.position.set(fruitPosition.x - radius * 0.34, fruitPosition.y + radius * 0.28, fruitPosition.z + radius * 0.42);
    group.add(shine);

    if (fruit.difficulty === "hard") {
      const glow = new Mesh(
        new TorusGeometry(radius * 1.18, radius * 0.05, 8, 28),
        new MeshStandardMaterial({ color: 0xffe88a, roughness: 0.36, transparent: true, opacity: 0.54, emissive: 0x5c3f08, emissiveIntensity: 0.08 }),
      );
      glow.position.set(fruitPosition.x, fruitPosition.y, fruitPosition.z);
      glow.rotation.x = Math.PI / 2.4;
      group.add(glow);
    }
  });

  node.buds.slice(0, 8).forEach((bud, index) => {
    const budPosition = fruitWorldPosition(index + node.fruits.length, trunkHeight);
    const mesh = new Mesh(
      new SphereGeometry(fruitRadius(bud.difficulty) * 0.72, 14, 12),
      new MeshStandardMaterial({ color: 0xddebd4, roughness: 0.88 }),
    );
    mesh.position.set(budPosition.x, budPosition.y, budPosition.z);
    mesh.castShadow = true;
    group.add(mesh);
  });

  if (growthLevel >= 5 || node.count >= 8) {
    const flowerMaterials = [
      new MeshStandardMaterial({ color: 0xfff0e4, roughness: 0.78 }),
      new MeshStandardMaterial({ color: 0xf6d7ba, roughness: 0.78 }),
    ];
    for (let index = 0; index < 10; index += 1) {
      const flowerPosition = fruitWorldPosition(index + 2, trunkHeight + 0.12);
      const flower = new Mesh(new SphereGeometry(0.055, 12, 10), flowerMaterials[index % flowerMaterials.length]);
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
  return 0x8fb85f;
}

function timeAdjustedWaterColor(fogColor: number) {
  if (fogColor === 0x17211f) return 0x587a82;
  if (fogColor === 0xf1dfcb) return 0x9aa58d;
  return 0x91b7a2;
}

function defaultWorldView(scope: ForestScope) {
  return {
    yaw: scope === "today" ? 0.18 : -0.38,
    pitch: scope === "today" ? 0.12 : 0.18,
    distance: scope === "today" ? 13.5 : 25,
  };
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function disposeThreeScene(scene: Scene) {
  scene.traverse((object) => {
    const mesh = object as Mesh;
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

function treeGrowthLevel(node: ForestMapNode) {
  if (node.future) return 1;
  if (node.points >= 170 || node.count >= 8) return 5;
  if (node.points >= 100 || node.count >= 5) return 4;
  if (node.points >= 54 || node.count >= 3) return 3;
  if (node.points >= 18 || node.count >= 1) return 2;
  return node.todoCount > 0 ? 1 : 0;
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
      ambientIntensity: 0.36,
      fill: 0x95b5c8,
      fog: 0x17211f,
      fogDensity: 0.02,
      ground: 0x40553f,
      path: 0x93a393,
      seed: 0x8fa58c,
      sun: 0xb6d4ff,
      sunIntensity: 0.64,
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
