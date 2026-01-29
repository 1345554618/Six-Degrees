<template>
  <div class="wrap">
    <div class="toolbar">
      <div class="title">Social Globe (Abstract)</div>

      <div class="row">
        <label>顯示深度</label>
        <input type="range" min="1" max="3" v-model="depth" />
        <span>{{ depth }} 度</span>
      </div>

      <div class="row">
        <button @click="regen">重新生成圖</button>
        <label class="chk">
          <input type="checkbox" v-model="autoRotate" />
          自動旋轉
        </label>
      </div>

      <div class="hint">
        操作：滑鼠拖曳旋轉、滾輪縮放、點節點高亮關係網
      </div>

      <div class="sel" v-if="selectedId">
        <div><b>選中：</b>{{ selectedId }}</div>
        <div><b>高亮：</b>{{ highlightedCount }} 個節點</div>
      </div>
    </div>

    <div class="stage" ref="mountRef"></div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import * as THREE from "three";
import { api } from "@/services/api";

/**
 * ====== 你可以把這兩個 type 直接當成未來後端回傳格式 ======
 */
type Node = { id: string; group?: number };
type Link = { source: string; target: string; weight?: number };

/**
 * ====== 可調參數 ======
 */
const NODE_COUNT = 240;     // 節點數（太大線會很多，先抓 200~400）
const AVG_DEGREE = 4;       // 平均每個點幾條邊（越大越密）
const RADIUS = 6.0;         // 球半徑
const POINT_SIZE = 0.075;   // 點大小

const mountRef = ref<HTMLDivElement | null>(null);

const depth = ref(2);            // 高亮深度（1~3）
const autoRotate = ref(true);

const selectedId = ref<string>("");
const highlightedCount = ref(0);

/**
 * ====== three 基本物件 ======
 */
let renderer: THREE.WebGLRenderer | null = null;
let scene: THREE.Scene | null = null;
let camera: THREE.PerspectiveCamera | null = null;
let raf = 0;

let groupRoot: THREE.Group | null = null;
let nodesMesh: THREE.InstancedMesh | null = null;
let linesGeom: THREE.BufferGeometry | null = null;
let linesMat: THREE.LineBasicMaterial | null = null;
let linesObj: THREE.LineSegments | null = null;

let raycaster: THREE.Raycaster | null = null;
let pointer = new THREE.Vector2();

/**
 * 控制旋轉（簡易版，不引入 OrbitControls）
 */
let isDragging = false;
let lastX = 0;
let lastY = 0;
let rotVelX = 0;
let rotVelY = 0;

/**
 * ====== 圖資料（mock）與索引結構 ======
 */
let graphNodes: Node[] = [];
let graphLinks: Link[] = [];

let idToIndex = new Map<string, number>();
let adjacency = new Map<string, Set<string>>(); // id -> neighbors
let nodePositions: THREE.Vector3[] = [];        // index -> position on sphere

/**
 * 顏色：正常 / 高亮 / 選中
 */
const COLOR_NORMAL = new THREE.Color(0x3bd6ff);
const COLOR_DIM = new THREE.Color(0x123a52);
const COLOR_HL = new THREE.Color(0x7CFFB2);
const COLOR_SEL = new THREE.Color(0xFFD36E);

function clamp(n: number, a: number, b: number) {
  return Math.max(a, Math.min(b, n));
}

/**
 * 在球面上均勻撒點（近似均勻）
 */
function randomPointOnSphere(radius: number) {
  const u = Math.random();
  const v = Math.random();
  const theta = 2 * Math.PI * u;
  const phi = Math.acos(2 * v - 1);
  const x = radius * Math.sin(phi) * Math.cos(theta);
  const y = radius * Math.cos(phi);
  const z = radius * Math.sin(phi) * Math.sin(theta);
  return new THREE.Vector3(x, y, z);
}

/**
 * 生成 mock 圖：節點 + 邊（控制平均度數）
 */
function generateMockGraph(nodeCount: number, avgDegree: number) {
  const nodes: Node[] = [];
  const links: Link[] = [];

  for (let i = 0; i < nodeCount; i++) {
    nodes.push({ id: `U${String(i).padStart(3, "0")}`, group: i % 6 });
  }

  // 用 set 避免重複邊
  const edgeSet = new Set<string>();
  const wantEdges = Math.floor((nodeCount * avgDegree) / 2);

  while (edgeSet.size < wantEdges) {
    const a = Math.floor(Math.random() * nodeCount);
    const b = Math.floor(Math.random() * nodeCount);
    if (a === b) continue;

    const s = nodes[a].id;
    const t = nodes[b].id;
    const key = s < t ? `${s}|${t}` : `${t}|${s}`;
    if (edgeSet.has(key)) continue;

    edgeSet.add(key);
    links.push({ source: s, target: t });
  }

  return { nodes, links };
}

/**
 * 建 adjacency（用於 BFS 高亮）
 */
function buildAdjacency(nodes: Node[], links: Link[]) {
  const adj = new Map<string, Set<string>>();
  for (const n of nodes) adj.set(n.id, new Set());

  for (const e of links) {
    adj.get(e.source)?.add(e.target);
    adj.get(e.target)?.add(e.source);
  }
  return adj;
}

/**
 * BFS 取得 depth 內的節點集合（含起點）
 */
function bfsWithin(startId: string, maxDepth: number) {
  const visited = new Set<string>();
  const q: Array<{ id: string; d: number }> = [{ id: startId, d: 0 }];
  visited.add(startId);

  while (q.length) {
    const cur = q.shift()!;
    if (cur.d === maxDepth) continue;

    const nb = adjacency.get(cur.id);
    if (!nb) continue;

    for (const nxt of nb) {
      if (visited.has(nxt)) continue;
      visited.add(nxt);
      q.push({ id: nxt, d: cur.d + 1 });
    }
  }
  return visited;
}

/**
 * ====== three：建立場景 ======
 */
function initThree() {
  if (!mountRef.value) return;

  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x071621);

  const w = mountRef.value.clientWidth;
  const h = mountRef.value.clientHeight;

  camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 200);
  camera.position.set(0, 0, 16);

  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  mountRef.value.appendChild(renderer.domElement);

  // 柔光
  const amb = new THREE.AmbientLight(0xffffff, 0.65);
  scene.add(amb);
  const dir = new THREE.DirectionalLight(0xffffff, 0.85);
  dir.position.set(8, 10, 6);
  scene.add(dir);

  groupRoot = new THREE.Group();
  scene.add(groupRoot);

  raycaster = new THREE.Raycaster();

  window.addEventListener("resize", onResize);
  renderer.domElement.addEventListener("pointerdown", onPointerDown);
  renderer.domElement.addEventListener("pointermove", onPointerMove);
  renderer.domElement.addEventListener("pointerup", onPointerUp);
  renderer.domElement.addEventListener("wheel", onWheel, { passive: true });
  renderer.domElement.addEventListener("click", onClick);

  console.log("[Graph] initThree ok", {
  hasScene: !!scene,
  hasCamera: !!camera,
  hasRenderer: !!renderer,
  size: renderer ? renderer.getSize(new THREE.Vector2()) : null,
});

}

function disposeThree() {
  if (!renderer || !scene) return;

  window.removeEventListener("resize", onResize);
  renderer.domElement.removeEventListener("pointerdown", onPointerDown);
  renderer.domElement.removeEventListener("pointermove", onPointerMove);
  renderer.domElement.removeEventListener("pointerup", onPointerUp);
  renderer.domElement.removeEventListener("wheel", onWheel);
  renderer.domElement.removeEventListener("click", onClick);

  cancelAnimationFrame(raf);

  // 釋放幾何/材質
  nodesMesh?.geometry.dispose();
  (nodesMesh?.material as THREE.Material | undefined)?.dispose();

  linesGeom?.dispose();
  linesMat?.dispose();

  renderer.dispose();
  renderer.domElement.remove();

  renderer = null;
  scene = null;
  camera = null;
  groupRoot = null;
  nodesMesh = null;
  linesGeom = null;
  linesMat = null;
  linesObj = null;
  raycaster = null;
}

/**
 * ====== 建立球面節點 + 線段 ======
 */
async function buildGraphFromMock() {

  if (!scene || !groupRoot) return;

  // 清空舊物件
  while (groupRoot.children.length) {
    const obj = groupRoot.children.pop()!;
    // @ts-ignore
    obj.geometry?.dispose?.();
    // @ts-ignore
    obj.material?.dispose?.();
  }

  // 1) 從 mock 拿圖

  const g = await api.graph.getGraph({ includePending: false });

  // 2) 轉成 Node/Link（球體渲染用）
  //    nodes 至少包含 me + edges 兩端出現的所有人

  const appear = new Set<string>();
  appear.add(g.me.id);
  for (const e of g.edges) {
    appear.add(e.a);
    appear.add(e.b);
  }


  const nodes: Node[] = Array.from(appear).map((id) => ({ id }));



  const links: Link[] = g.edges.map((e: any) => ({
    source: e.a,
    target: e.b,
    weight: 1,
  }));


  graphNodes = nodes;
  graphLinks = links;

  idToIndex = new Map();
  adjacency = buildAdjacency(graphNodes, graphLinks);

  nodePositions = [];
  for (let i = 0; i < graphNodes.length; i++) {
    idToIndex.set(graphNodes[i].id, i);
    nodePositions.push(randomPointOnSphere(RADIUS));
  }


  // ====== 以下保持你原本的 three 建立球 / 點 / 線（照你原本 buildGraph 後半段） ======
  const sphere = new THREE.Mesh(
    new THREE.SphereGeometry(RADIUS, 48, 48),
    new THREE.MeshBasicMaterial({
      color: 0x0b2a3f,
      transparent: true,
      opacity: 0.28,
      wireframe: true,
    })
  );
  groupRoot.add(sphere);

  const nodeGeo = new THREE.SphereGeometry(POINT_SIZE, 12, 12);
  const nodeMat = new THREE.MeshStandardMaterial({
    color: COLOR_NORMAL,
    emissive: new THREE.Color(0x0a2a3a),
    emissiveIntensity: 0.35,
    metalness: 0.1,
    roughness: 0.25,
  });

  nodesMesh = new THREE.InstancedMesh(nodeGeo, nodeMat, graphNodes.length);
  nodesMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  nodesMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(graphNodes.length * 3), 3);

  const m = new THREE.Matrix4();
  for (let i = 0; i < graphNodes.length; i++) {
    const p = nodePositions[i];
    m.makeTranslation(p.x, p.y, p.z);
    nodesMesh.setMatrixAt(i, m);
    nodesMesh.setColorAt(i, COLOR_NORMAL);
  }
  nodesMesh.instanceColor.needsUpdate = true;
  groupRoot.add(nodesMesh);

  linesGeom = new THREE.BufferGeometry();
  const positions = new Float32Array(graphLinks.length * 2 * 3);

  for (let i = 0; i < graphLinks.length; i++) {
    const a = idToIndex.get(graphLinks[i].source)!;
    const b = idToIndex.get(graphLinks[i].target)!;
    if (a == null || b == null) {
      console.warn("[Graph] missing node for link", graphLinks[i]);
      continue;
    }
    const pa = nodePositions[a];
    const pb = nodePositions[b];

    positions[i * 6 + 0] = pa.x;
    positions[i * 6 + 1] = pa.y;
    positions[i * 6 + 2] = pa.z;
    positions[i * 6 + 3] = pb.x;
    positions[i * 6 + 4] = pb.y;
    positions[i * 6 + 5] = pb.z;
  }

  linesGeom.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  linesMat = new THREE.LineBasicMaterial({
    color: 0x2aa7d6,
    transparent: true,
    opacity: 0.6,
  });
  linesObj = new THREE.LineSegments(linesGeom, linesMat);
  groupRoot.add(linesObj);
  selectedId.value = "";
  highlightedCount.value = 0;
  dimAll(false);
}


/**
 * 把所有點/線變暗或恢復
 */
function dimAll(dim: boolean) {
  if (!nodesMesh || !linesMat) return;
  for (let i = 0; i < graphNodes.length; i++) {
    nodesMesh.setColorAt(i, dim ? COLOR_DIM : COLOR_NORMAL);
  }
  nodesMesh.instanceColor!.needsUpdate = true;

  linesMat.opacity = dim ? 0.06 : 0.25;
}

/**
 * 高亮某個節點的 n 度範圍（節點 + 線）
 */
function highlightAround(centerId: string, maxDepth: number) {
  if (!nodesMesh || !linesMat || !linesGeom) return;

  // 取要亮的點集合
  const set = bfsWithin(centerId, maxDepth);
  highlightedCount.value = set.size;

  // 先全部變暗
  dimAll(true);

  // 亮點
  for (const id of set) {
    const idx = idToIndex.get(id);
    if (idx == null) continue;
    nodesMesh.setColorAt(idx, id === centerId ? COLOR_SEL : COLOR_HL);
  }
  nodesMesh.instanceColor!.needsUpdate = true;

  // 線透明度提高一些
  linesMat.opacity = 0.14;

  // （進階可做：只畫亮線。MVP 先不改 geometry，成本低且效果仍好）
}

/**
 * 點擊拾取 InstancedMesh 的 instanceId
 */
function pickNodeId(clientX: number, clientY: number) {
  if (!renderer || !camera || !nodesMesh || !raycaster || !mountRef.value) return "";

  const rect = renderer.domElement.getBoundingClientRect();
  pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -(((clientY - rect.top) / rect.height) * 2 - 1);

  raycaster.setFromCamera(pointer, camera);

  // InstancedMesh 的 intersect 會給 instanceId
  const hits = raycaster.intersectObject(nodesMesh, false);
  if (!hits.length) return "";

  const instId = (hits[0] as any).instanceId as number | undefined;
  if (instId == null) return "";

  return graphNodes[instId]?.id || "";
}

/**
 * ====== 互動：拖曳旋轉 / 滾輪縮放 / 點選高亮 ======
 */
function onPointerDown(e: PointerEvent) {
  isDragging = true;
  lastX = e.clientX;
  lastY = e.clientY;
}

function onPointerMove(e: PointerEvent) {
  if (!groupRoot) return;
  if (!isDragging) return;

  const dx = e.clientX - lastX;
  const dy = e.clientY - lastY;
  lastX = e.clientX;
  lastY = e.clientY;

  // 旋轉敏感度
  const s = 0.004;
  groupRoot.rotation.y += dx * s;
  groupRoot.rotation.x += dy * s;

  // 限制 x 旋轉避免翻太誇張
  groupRoot.rotation.x = clamp(groupRoot.rotation.x, -1.2, 1.2);

  // 慣性速度
  rotVelY = dx * s * 0.6;
  rotVelX = dy * s * 0.6;
}

function onPointerUp() {
  isDragging = false;
}

function onWheel(e: WheelEvent) {
  if (!camera) return;
  const delta = e.deltaY * 0.01;
  camera.position.z = clamp(camera.position.z + delta, 9, 30);
}

function onClick(e: MouseEvent) {
  // 如果剛剛在拖曳，不算點擊（避免拖曳鬆手觸發）
  if (Math.abs(rotVelX) + Math.abs(rotVelY) > 0.02) return;

  const id = pickNodeId(e.clientX, e.clientY);
  if (!id) {
    selectedId.value = "";
    highlightedCount.value = 0;
    dimAll(false);
    return;
  }

  selectedId.value = id;
  highlightAround(id, depth.value);
}

function onResize() {
  if (!renderer || !camera || !mountRef.value) return;
  const w = mountRef.value.clientWidth;
  const h = mountRef.value.clientHeight;
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  renderer.setSize(w, h);
}

/**
 * 動畫 loop
 */
function animate() {
  if (!renderer || !scene || !camera || !groupRoot) return;

  // 自動旋轉 + 慣性
  if (!isDragging) {
    if (autoRotate.value) groupRoot.rotation.y += 0.0022;
    groupRoot.rotation.y += rotVelY;
    groupRoot.rotation.x += rotVelX;

    rotVelY *= 0.92;
    rotVelX *= 0.92;
  }

  renderer.render(scene, camera);
  raf = requestAnimationFrame(animate);
}

/**
 * 重新生成（換一張圖）
 */
async function regen() {
  await buildGraphFromMock();
}
watch(depth, (d) => {
  if (selectedId.value) highlightAround(selectedId.value, d);
});

onMounted(async () => {
  initThree();
  await buildGraphFromMock();
  animate();
});

onBeforeUnmount(() => {
  disposeThree();
});
</script>

<style scoped>
.wrap {
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 12px;
  height: calc(100vh - 64px);
}

.toolbar {
  border: 1px solid rgba(255,255,255,0.08);
  background: rgba(10, 24, 36, 0.55);
  border-radius: 14px;
  padding: 14px;
  color: rgba(255,255,255,0.92);
}

.title {
  font-weight: 700;
  font-size: 16px;
  margin-bottom: 12px;
}

.row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 10px 0;
}

.row label {
  width: 70px;
  opacity: 0.85;
}

.row input[type="range"] {
  flex: 1;
}

button {
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.16);
  background: rgba(255,255,255,0.06);
  color: rgba(255,255,255,0.9);
  cursor: pointer;
}
button:hover { background: rgba(255,255,255,0.10); }

.chk {
  display: flex;
  align-items: center;
  gap: 8px;
  opacity: 0.9;
}

.hint {
  margin-top: 10px;
  opacity: 0.7;
  line-height: 1.4;
  font-size: 13px;
}

.sel {
  margin-top: 12px;
  padding: 10px;
  border-radius: 12px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(255,255,255,0.08);
  font-size: 13px;
  line-height: 1.6;
}

.stage {
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.08);
  background: #071621;
}
</style>
