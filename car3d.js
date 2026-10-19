// 3D-модель Corolla E150 седан, процедурно по реальным размерам (мм). Без внешних моделей.
// Оси: x мм от переднего бампера назад, y мм влево (+) от центра, z мм от земли.
// В Three: X=(x-2270)/1000, Y=z/1000, Z=y/1000. Камера с +Z видит левый борт, перед смотрит в -X.
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';

// ---------- размеры ----------
const L = 4541, FA = 935, RA = 3535, ZA = 316, ARCH = 375, TRACK = 1525;
const V = (x, y, z) => new THREE.Vector3((x - 2270) / 1000, z / 1000, y / 1000);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const smooth = (a, b, v) => { const t = clamp((v - a) / (b - a), 0, 1); return t * t * (3 - 2 * t) };
const lerp = (a, b, t) => a + (b - a) * t;

// профиль сбоку (мм): верх и низ от самой передней точки до самой задней
const TOP = [[0, 500], [10, 600], [42, 690], [105, 762], [200, 805], [450, 852], [800, 905], [1100, 950], [1262, 978], [1600, 1185], [1880, 1372], [2060, 1442], [2400, 1470], [2760, 1462], [3060, 1426], [3260, 1384], [3520, 1236], [3760, 1118], [3905, 1086], [4160, 1090], [4385, 1101], [4448, 1097], [4496, 1066], [4526, 996], [4538, 900], [4541, 700]];
const BOT = [[0, 500], [4, 420], [22, 300], [70, 210], [330, 218], [569, 235], [1300, 236], [3170, 238], [4110, 248], [4458, 250], [4494, 298], [4520, 380], [4536, 520], [4541, 700]];
const BELT = [[1200, 984], [1300, 990], [2090, 1030], [3372, 1075], [3905, 1082], [4000, 1084]];
const DLO = [[1318, 993], [1640, 1190], [1925, 1370], [2080, 1414], [2400, 1436], [2760, 1426], [3060, 1392], [3255, 1342], [3330, 1200], [3372, 1078], [2700, 1052], [2090, 1030]];
const HEAD = [[18, 690], [8, 760], [60, 808], [200, 832], [450, 868], [735, 905], [640, 862], [470, 790], [280, 742], [90, 700]];
const TAIL = [[4176, 1040], [4380, 1052], [4500, 1030], [4528, 992], [4545, 900], [4545, 846], [4420, 846], [4290, 864], [4200, 930]];
const PANELS = [
  ['bumper_front', [[-200, -200], [-200, 690], [90, 700], [470, 790], [650, 600], [720, -200]]],
  ['fender_front', [[735, 905], [1295, 974], [1302, -200], [650, -200], [650, 600], [470, 790]]],
  ['door_front', [[1302, -200], [1296, 991], [2090, 1030], [2104, -200]]],
  ['door_rear', [[2104, -200], [2090, 1030], [3420, 1078], [3304, 611], [3100, 300], [3100, -200]]],
  ['quarter', [[3236, 1600], [3800, 1600], [3905, 1082], [4200, 1050], [4200, 790], [3822, 557], [3600, 400], [3304, 611], [3420, 1078], [3372, 1078]]],
  ['bumper_rear', [[3822, 557], [4200, 790], [4700, 800], [4700, -200], [3860, -200]]],
];
const SEAMS = [
  [[735, 905], [1000, 940], [1290, 974]], [[470, 790], [560, 700], [650, 600]], [[1300, 990], [1286, 760], [1290, 500], [1304, 262]],
  [[2090, 1030], [2096, 640], [2104, 262]], [[3420, 1078], [3400, 900], [3360, 760], [3304, 611]], [[3905, 1078], [4180, 1052], [4380, 1060], [4500, 1036]],
  [[4200, 790], [4000, 700], [3822, 557]], [[4540, 800], [4380, 790], [4200, 790]], [[1322, 372], [2100, 412], [3150, 470]],
];
const pip = (p, poly) => { let c = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, zi] = poly[i], [xj, zj] = poly[j]; if ((zi > p[1]) !== (zj > p[1]) && p[0] < (xj - xi) * (p[1] - zi) / (zj - zi) + xi) c = !c } return c };

function crSample(pts, seg) { // Catmull-Rom 2D
  const out = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[i + 1], p3 = pts[Math.min(pts.length - 1, i + 2)];
    for (let s = 0; s < seg; s++) {
      const t = s / seg, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map(k => .5 * (2 * p1[k] + (-p0[k] + p2[k]) * t + (2 * p0[k] - 5 * p1[k] + 4 * p2[k] - p3[k]) * t2 + (-p0[k] + 3 * p1[k] - 3 * p2[k] + p3[k]) * t3)));
    }
  }
  out.push(pts[pts.length - 1].slice()); return out;
}
function lookup(curve) { // x -> z для монотонной по x кривой
  const c = crSample(curve, 24);
  return x => { let lo = 0, hi = c.length - 1; if (x <= c[0][0]) return c[0][1]; if (x >= c[hi][0]) return c[hi][1];
    while (hi - lo > 1) { const m = (lo + hi) >> 1; c[m][0] <= x ? lo = m : hi = m }
    const a = c[lo], b = c[hi]; return a[1] + (b[1] - a[1]) * (x - a[0]) / Math.max(1e-6, b[0] - a[0]) };
}
const zTop = lookup(TOP), zBot0 = lookup(BOT), zBelt = lookup(BELT);
function zBot(x) {
  let z = zBot0(x);
  for (const cx of [FA, RA]) { const d = x - cx; if (Math.abs(d) < ARCH) z = Math.max(z, ZA + Math.sqrt(ARCH * ARCH - d * d)) }
  return z;
}
function halfW(x) { // в плане: суперэллипс на носу и корме, середина 880
  const se = (d, R, n) => d >= R ? 1 : Math.pow(Math.max(0, 1 - Math.pow((R - d) / R, n)), 1 / n);
  return 880 * Math.min(se(x, 430, 2.6), se(L - x, 400, 2.8)) * (x > 600 && x < 4000 ? 1 : 1 - .03 * smooth(0, 1, Math.abs(x - 2270) / 2270));
}
function zShoulder(x, zt, zb) {
  const hood = zt - Math.min(45, .15 * (zt - zb)), trunk = zt - Math.min(40, .15 * (zt - zb));
  let z = x < 1262 ? hood : x < 3905 ? Math.min(zBelt(x), zt - 6) : trunk;
  z = lerp(hood, z, smooth(1150, 1300, x)); z = lerp(z, trunk, smooth(3820, 3960, x));
  return clamp(z, zb + Math.min(30, (zt - zb) * .4), zt - 4);
}
const SEG = 8;
function safeNormals(g) { // вырожденные треугольники дают NaN-нормали, а bloom раздувает NaN в квадрат
  g.computeVertexNormals(); const n = g.attributes.normal.array;
  for (let i = 0; i < n.length; i += 3) if (!(Math.abs(n[i]) + Math.abs(n[i + 1]) + Math.abs(n[i + 2]) > 1e-6) || n[i] !== n[i] || n[i + 1] !== n[i + 1] || n[i + 2] !== n[i + 2]) { n[i] = 0; n[i + 1] = 1; n[i + 2] = 0 }
  g.attributes.normal.needsUpdate = true; return g;
}
const secCache = new Map();
function section(x) { // половина сечения: [[y,z]...] от низа по центру до верха по центру
  const key = Math.round(x * 4); if (secCache.has(key)) return secCache.get(key);
  const zt = zTop(x), zb = Math.min(zBot(x), zt), zs = zShoulder(x, zt, zb), W = halfW(x), h = zs - zb, gh = zt - zs;
  const Wc = W * (.955 - .21 * clamp(gh / 350, 0, 1));
  const c = [[0, zb], [.5 * W, zb], [.84 * W, zb + .04 * h], [.95 * W, zb + .17 * h], [W, zb + .55 * h], [.975 * W, zs - .03 * h],
    [.965 * W, zs + Math.min(14, .1 * gh)], [Wc, zs + .8 * gh], [.55 * Wc, zt - .03 * gh], [0, zt]];
  const s = { pts: crSample(c, SEG), zt, zb, zs, W, Wc }; secCache.set(key, s); return s;
}
function sideY(x, z) { // где поверхность на высоте z (мм)
  const p = section(x).pts;
  for (let j = 2; j < p.length; j++) if ((p[j - 1][1] - z) * (p[j][1] - z) <= 0 && p[j][1] !== p[j - 1][1]) { const t = (z - p[j - 1][1]) / (p[j][1] - p[j - 1][1]); return p[j - 1][0] + t * (p[j][0] - p[j - 1][0]) }
  return -1;
}
function surfX(y, z, front) { // точка поверхности спереди/сзади: где ширина на высоте z равна |y|
  let a = front ? 0 : 3700, b = front ? 1000 : L; y = Math.abs(y);
  const f = x => sideY(x, z) - y;
  for (let i = 0; i < 30; i++) { const m = (a + b) / 2; (f(m) < 0) === front ? a = m : b = m }
  return (a + b) / 2;
}

// ---------- сцена ----------
let RO, renderer, scene, camera, controls, composer, bloom, clock, stage, car, bodyMesh, bodyIds, bodyColors, idList = [];
const meshesById = new Map(), groups = new Map(), pickables = [], wheels = [], internals = [], xrayMats = [];
const M = {}; // материалы
const W = {};
const S = { domeOn: false, speed: 0, xray: false, sys: null, explode: 0, explodeTo: 0, drive: false, hover: null, sel: null, t: 0 };
let opts = {};

function mats() {
  M.paint = new THREE.MeshPhysicalMaterial({ color: 0x0b0c0f, metalness: .62, roughness: .3, clearcoat: 1, clearcoatRoughness: .14, vertexColors: true, envMapIntensity: 1.25 });
  M.glass = new THREE.MeshPhysicalMaterial({ color: 0x0c1018, metalness: .1, roughness: .1, transparent: true, opacity: .58, vertexColors: true, envMapIntensity: 1, clearcoat: 1 });
  M.trim = new THREE.MeshPhysicalMaterial({ color: 0x050506, metalness: .3, roughness: .18, clearcoat: 1, vertexColors: true });
  M.matte = new THREE.MeshStandardMaterial({ color: 0x0e0f12, roughness: .82, vertexColors: true });
  M.lamp = new THREE.MeshPhysicalMaterial({ color: 0xcfd6e4, metalness: .95, roughness: .12, vertexColors: true, emissive: 0x000000, envMapIntensity: 2.2 });
  M.tail = new THREE.MeshPhysicalMaterial({ color: 0x7a0c1a, metalness: .2, roughness: .15, clearcoat: 1, vertexColors: true, emissive: 0x2a0006 });
  M.fog = new THREE.MeshPhysicalMaterial({ color: 0xe8eef8, metalness: .9, roughness: .1, vertexColors: true });
  M.under = new THREE.MeshStandardMaterial({ color: 0x1b1c21, roughness: .9, vertexColors: true });
  M.plate = new THREE.MeshStandardMaterial({ color: 0xf4f4f0, roughness: .5, vertexColors: true });
  M.rubber = new THREE.MeshStandardMaterial({ color: 0x141416, roughness: .92 });
  M.rim = new THREE.MeshPhysicalMaterial({ color: 0x121317, metalness: .85, roughness: .28, clearcoat: .8 });
  M.chrome = new THREE.MeshPhysicalMaterial({ color: 0xe9ecf2, metalness: 1, roughness: .08 });
  M.disc = new THREE.MeshStandardMaterial({ color: 0x8b8f97, metalness: 1, roughness: .42 });
  M.hat = new THREE.MeshStandardMaterial({ color: 0x4b4e55, metalness: .8, roughness: .6 });
  M.caliper = new THREE.MeshStandardMaterial({ color: 0x2c2e34, metalness: .6, roughness: .5 });
  M.holo = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
    uniforms: { c: { value: new THREE.Color(0x3edbf7) }, t: { value: 0 } },
    vertexShader: `varying vec3 n; varying vec3 v; varying float h; void main(){ vec4 w = modelViewMatrix*vec4(position,1.); n = normalize(normalMatrix*normal); v = normalize(-w.xyz); h = position.y; gl_Position = projectionMatrix*w; }`,
    fragmentShader: `uniform vec3 c; uniform float t; varying vec3 n; varying vec3 v; varying float h; void main(){ float f = pow(1.-abs(dot(n,v)),2.4); float scan = smoothstep(.0,.02,abs(fract(h*6.-t*.6)-.5)-.47); gl_FragColor = vec4(c*(f*.9+.04+scan*.25), f*.75+.05+scan*.2); }` });
}
const ROLE = { paint: 0, glass: 1, trim: 2, matte: 3, lamp: 4, tail: 5, fog: 6, under: 7, plate: 8 };

// ---------- кузов ----------
function buildBody() {
  const NS = 320, half = section(1000).pts.length, ringN = half * 2 - 2;
  const xs = Array.from({ length: NS }, (_, i) => { const t = i / (NS - 1); return L * (.35 * (1 - Math.cos(Math.PI * t)) / 2 + .65 * t) });
  const pos = [], mm = [];
  for (const x of xs) {
    const p = section(x).pts;
    const ring = p.map(([y, z]) => [y, z]).concat(p.slice(1, -1).reverse().map(([y, z]) => [-y, z]));
    for (const [y, z] of ring) { const v = V(x, y, z); pos.push(v.x, v.y, v.z); mm.push(x, y, z) }
  }
  const tri = [[], [], [], [], [], [], [], [], []];
  const nrm = new THREE.Vector3(), a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const classify = (ia, ib, ic) => {
    const x = (mm[ia * 3] + mm[ib * 3] + mm[ic * 3]) / 3, y = (mm[ia * 3 + 1] + mm[ib * 3 + 1] + mm[ic * 3 + 1]) / 3, z = (mm[ia * 3 + 2] + mm[ib * 3 + 2] + mm[ic * 3 + 2]) / 3;
    a.fromArray(pos, ia * 3); b.fromArray(pos, ib * 3); c.fromArray(pos, ic * 3); nrm.subVectors(b, a).cross(c.clone().sub(a)).normalize();
    const ay = Math.abs(y), s = section(clamp(x, 0, L)), W = s.W;
    if (Math.abs(nrm.y) > .55 && nrm.y < 0 && z < 760) return ROLE.under;
    if (x < 135 && z > 640 && z < 772 && ay < 470) return ROLE.trim;
    if (x < 210 && z > 300 && z < 452 && ay < 640) return ROLE.matte;
    if (z < 268) return ROLE.matte;
    if (x > 1262 && x < 3905 && z > s.zs + 5) {
      if (ay < s.Wc * .97) { if (x > 1300 && x < 2050) return ROLE.glass; if (x > 3270 && x < 3880) return ROLE.glass; return ROLE.paint }
      if (pip([x, z], DLO)) { if ((x > 2052 && x < 2124) || (x > 2948 && x < 2984) || pip([x, z], [[1318, 993], [1520, 1003], [1440, 1072]])) return ROLE.trim; return ROLE.glass }
    }
    return ROLE.paint;
  };
  for (let i = 0; i < NS - 1; i++) for (let k = 0; k < ringN; k++) {
    const k2 = (k + 1) % ringN, A = i * ringN + k, B = i * ringN + k2, C = (i + 1) * ringN + k, D = (i + 1) * ringN + k2;
    const left = mm[A * 3 + 1] >= 0 && mm[B * 3 + 1] >= 0;
    const t1 = left ? [A, C, B] : [A, C, B], t2 = [B, C, D];
    tri[classify(...t1)].push(...t1); tri[classify(...t2)].push(...t2);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  const idx = []; let off = 0; tri.forEach((t, m) => { g.addGroup(off, t.length, m); for (const v of t) idx.push(v); off += t.length });
  g.setIndex(idx); safeNormals(g);
  // идентификаторы деталей кузова по вершинам
  const nv = pos.length / 3; bodyIds = new Uint8Array(nv); bodyColors = new Float32Array(nv * 3).fill(1);
  const role = new Uint8Array(nv); tri.forEach((t, m) => t.forEach(v => { if (m === ROLE.glass || m === ROLE.lamp || m === ROLE.tail || m === ROLE.fog) role[v] = m }));
  const idOf = n => { let i = idList.indexOf(n); if (i < 0) { idList.push(n); i = idList.length - 1 } return i };
  for (let v = 0; v < nv; v++) {
    const x = mm[v * 3], y = mm[v * 3 + 1], z = mm[v * 3 + 2], ay = Math.abs(y), s = section(clamp(x, 0, L));
    let id;
    if (role[v] === ROLE.glass) id = x < 2060 && ay < s.Wc ? 'windshield' : x > 3260 && ay < s.Wc ? 'rear_glass' : 'side_glass';
    else if (role[v] === ROLE.lamp) id = 'headlight'; else if (role[v] === ROLE.tail) id = 'tail_light'; else if (role[v] === ROLE.fog) id = 'fog_light';
    else if (z < 262 && ay < .9 * s.W) id = 'floor';
    else if (ay < .9 * s.W && z > s.zs - 2) id = x < 1262 ? 'hood' : x < 3905 ? (x > 2040 && x < 3280 ? 'roof' : 'quarter') : 'trunk_lid';
    else id = (PANELS.find(([, p]) => pip([x, z], p)) || ['quarter'])[0];
    if (x < 300 && ay < .9 * s.W && z < s.zs - 2) id = 'bumper_front';
    if (x > 4400 && ay < .9 * s.W && z < s.zs - 2 && role[v] !== ROLE.tail) id = 'bumper_rear';
    bodyIds[v] = idOf(id);
  }
  g.setAttribute('color', new THREE.BufferAttribute(bodyColors, 3));
  bodyMesh = new THREE.Mesh(g, [M.paint, M.glass, M.trim, M.matte, M.lamp, M.tail, M.fog, M.under, M.plate]);
  bodyMesh.userData.body = true; car.add(bodyMesh); pickables.push(bodyMesh);

  // швы, уплотнители, линии остекления
  const lineMat = M.seam = new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: .85 });
  const seamGroup = new THREE.Group(); seamGroup.name = 'seams';
  const addLine = (ptsXZ, side) => { const pts = crSample(ptsXZ, 10).map(([x, z]) => V(x, side * (sideY(x, z) + 1.5), z)); seamGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), lineMat)) };
  for (const side of [1, -1]) { SEAMS.forEach(s => addLine(s, side)); addLine(DLO.concat([DLO[0]]), side) }
  car.add(seamGroup);
  // арки: подкрылки
  for (const cx of [FA, RA]) for (const side of [1, -1]) {
    const lin = new THREE.Mesh(new THREE.CylinderGeometry(ARCH / 1000 - .004, ARCH / 1000 - .004, .27, 40, 1, true, Math.PI * .5 - 1.35, 2.7), new THREE.MeshStandardMaterial({ color: 0x08080a, roughness: .95, side: THREE.DoubleSide }));
    lin.rotation.x = Math.PI / 2; lin.position.copy(V(cx, side * 745, ZA)); car.add(lin);
    const wall = new THREE.Mesh(new THREE.CircleGeometry(ARCH / 1000, 40, 0, Math.PI), new THREE.MeshStandardMaterial({ color: 0x0a0a0c, roughness: 1, side: THREE.DoubleSide }));
    wall.position.copy(V(cx, side * 610, ZA)); car.add(wall);
  }
}

// ---------- навесное: зеркала, ручки, лючок, дворники, номера, решётка ----------
function part(id, sys, mesh) {
  mesh.userData.id = id; mesh.userData.sys = sys;
  if (!groups.has(id)) { const g = new THREE.Group(); g.userData.id = id; groups.set(id, g); car.add(g) }
  groups.get(id).add(mesh); pickables.push(mesh); (meshesById.get(id) || meshesById.set(id, []).get(id)).push(mesh);
  return mesh;
}
function plateTexture() {
  const c = document.createElement('canvas'); c.width = 520; c.height = 112; const x = c.getContext('2d');
  x.fillStyle = '#f5f5f2'; x.fillRect(0, 0, 520, 112); x.strokeStyle = '#111'; x.lineWidth = 6; x.strokeRect(5, 5, 510, 102);
  x.fillStyle = '#c8102e'; x.fillRect(16, 18, 40, 26); x.fillStyle = '#007c30'; x.fillRect(16, 44, 40, 14); x.fillStyle = '#111'; x.font = 'bold 22px Arial'; x.fillText('BY', 16, 92);
  x.font = 'bold 78px Arial'; x.fillText('0000 AA-7', 74, 86);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}
function accessories() {
  const paintSolid = new THREE.MeshPhysicalMaterial({ color: 0x0b0c0f, metalness: .62, roughness: .3, clearcoat: 1, clearcoatRoughness: .14 }); M.paintSolid = paintSolid;
  for (const side of [1, -1]) {
    // зеркало: профиль корпуса, выдавленный наружу
    const sh = new THREE.Shape(crSample([[1372, 1004], [1350, 1064], [1376, 1146], [1452, 1170], [1600, 1158], [1640, 1110], [1628, 1048], [1570, 1014], [1372, 1004]], 6).map(([x, z]) => new THREE.Vector2(x / 1000, z / 1000)));
    const mg = new THREE.ExtrudeGeometry(sh, { depth: .13, bevelEnabled: true, bevelThickness: .018, bevelSize: .016, bevelSegments: 5, curveSegments: 24 });
    const mir = new THREE.Mesh(mg, paintSolid); mir.rotation.y = 0;
    const y0 = sideY(1500, 1080) / 1000;
    mir.position.set(-2.27, 0, side > 0 ? y0 - .01 : -y0 + .01 - .13); part('mirror', 'body', mir);
    const glass = new THREE.Mesh(new THREE.PlaneGeometry(.2, .1), new THREE.MeshPhysicalMaterial({ color: 0x4a5266, metalness: 1, roughness: .18 }));
    glass.position.copy(V(1648, side * (sideY(1500, 1080) + 70), 1095)); glass.rotation.y = Math.PI / 2; part('mirror', 'body', glass);
    // ручки
    for (const [x, z] of [[1920, 889], [3232, 924]]) {
      const h = new THREE.Mesh(new RoundedBoxGeometry(.145, .028, .03, 3, .012), paintSolid);
      h.position.copy(V(x, side * (sideY(x, z) + 8), z)); part('door_handle', 'body', h);
    }
    // дворник (две щётки, только одна сторона геометрически, ставим с обеих по центру)
  }
  // лючок бака слева
  const fs = new THREE.Shape(); const r = .016, w = .19, hh = .15; fs.moveTo(r, 0); fs.lineTo(w - r, 0); fs.quadraticCurveTo(w, 0, w, r); fs.lineTo(w, hh - r); fs.quadraticCurveTo(w, hh, w - r, hh); fs.lineTo(r, hh); fs.quadraticCurveTo(0, hh, 0, hh - r); fs.lineTo(0, r); fs.quadraticCurveTo(0, 0, r, 0);
  const fd = new THREE.Mesh(new THREE.ExtrudeGeometry(fs, { depth: .004, bevelEnabled: false }), paintSolid);
  fd.position.copy(V(3596, sideY(3690, 937) - 1, 862)); part('fuel_door', 'body', fd);
  const fdl = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(fs.getPoints(8).map(p => new THREE.Vector3(p.x, p.y, .005))), M.seam); fdl.position.copy(fd.position); car.add(fdl);
  // дворники
  for (const [y0, len] of [[-560, .62], [40, .52]]) {
    const wp = new THREE.Mesh(new THREE.BoxGeometry(.016, .012, len), M.matte.clone()); wp.material.vertexColors = false;
    wp.position.copy(V(1335, y0 / 1 + len * 500, zTop(1335) + 10)); wp.rotation.y = -.12; part('wiper', 'body', wp);
  }
  // номера
  const pt = plateTexture();
  const pm = new THREE.MeshStandardMaterial({ map: pt, roughness: .45 });
  const pf = new THREE.Mesh(new THREE.PlaneGeometry(.52, .112), pm); pf.position.copy(V(surfX(0, 436, true) - 6, 0, 436)); pf.rotation.y = -Math.PI / 2; car.add(pf);
  const pr = new THREE.Mesh(new THREE.PlaneGeometry(.52, .112), pm); pr.position.copy(V(surfX(0, 616, false) + 6, 0, 616)); pr.rotation.y = Math.PI / 2; car.add(pr);
  // решётка: хромированные полосы
  // выхлопная насадка
  const tip = new THREE.Mesh(new THREE.CylinderGeometry(.03, .032, .16, 20, 1, true), new THREE.MeshStandardMaterial({ color: 0x9a9da4, metalness: 1, roughness: .3, side: THREE.DoubleSide }));
  tip.rotation.z = Math.PI / 2; tip.position.copy(V(4440, -430, 230)); part('muffler', 'fuel', tip);
}

// ---------- фары и фонари: гладкие накладки по контуру ----------
function resample(pts, n) {
  const c = crSample(pts, 16), d = [0]; for (let i = 1; i < c.length; i++) d.push(d[i - 1] + Math.hypot(c[i][0] - c[i - 1][0], c[i][1] - c[i - 1][1]));
  const out = []; for (let k = 0; k < n; k++) { const t = d[d.length - 1] * k / (n - 1); let i = 1; while (i < d.length - 1 && d[i] < t) i++; const u = (t - d[i - 1]) / Math.max(1e-6, d[i] - d[i - 1]); out.push([lerp(c[i - 1][0], c[i][0], u), lerp(c[i - 1][1], c[i][1], u)]) }
  return out;
}
function strip(id, sys, up, low, material, off = 3, rows = 10, n = 70) {
  const U = resample(up, n), D = resample(low, n);
  for (const side of [1, -1]) {
    const pos = [], idx = [], uv = [];
    for (let i = 0; i < n; i++) for (let j = 0; j <= rows; j++) { const x = clamp(lerp(U[i][0], D[i][0], j / rows), 0, L - 2), s0 = section(x), z = clamp(lerp(U[i][1], D[i][1], j / rows), s0.zb + 8, Math.min(s0.zt - 14, s0.zs - 6 - (rows - j) * 0)), v = V(x, side * (Math.max(0, sideY(x, z)) + off), z); pos.push(v.x, v.y, v.z); uv.push(i / (n - 1), j / rows) }
    for (let i = 0; i < n - 1; i++) for (let j = 0; j < rows; j++) { const a = i * (rows + 1) + j, b = a + rows + 1; side > 0 ? idx.push(a, b, a + 1, a + 1, b, b + 1) : idx.push(a, a + 1, b, a + 1, b + 1, b) }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); safeNormals(g);
    part(id, sys, new THREE.Mesh(g, material));
  }
}
function patchYZ(id, sys, up, low, material, front, off = 3, rows = 8, n = 50) {
  const U = resample(up, n), D = resample(low, n), dir = front ? -1 : 1;
  for (const side of [1, -1]) {
    const pos = [], idx = [];
    for (let i = 0; i < n; i++) for (let j = 0; j <= rows; j++) { const y = lerp(U[i][0], D[i][0], j / rows), z = lerp(U[i][1], D[i][1], j / rows), x = surfX(y, z, front) + dir * off, v = V(x, side * y, z); pos.push(v.x, v.y, v.z) }
    for (let i = 0; i < n - 1; i++) for (let j = 0; j < rows; j++) { const a = i * (rows + 1) + j, b = a + rows + 1; (side * dir > 0) ? idx.push(a, b, a + 1, a + 1, b, b + 1) : idx.push(a, a + 1, b, a + 1, b + 1, b) }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); safeNormals(g);
    const m = new THREE.Mesh(g, material); m.material.side = THREE.DoubleSide; part(id, sys, m);
  }
}
function ellipsePatch(id, sys, cx, cz, rx, rz, material, off = 3) {
  const up = [], low = []; for (let k = 0; k <= 24; k++) { const a = Math.PI * k / 24; up.push([cx - Math.cos(a) * rx, cz + Math.sin(a) * rz]); low.push([cx - Math.cos(a) * rx, cz - Math.sin(a) * rz]) }
  strip(id, sys, up, low, material, off, 8, 40);
}
function lamps() {
  M.lens = new THREE.MeshPhysicalMaterial({ color: 0x0d1018, metalness: .2, roughness: .02, transparent: true, opacity: .5, clearcoat: 1, envMapIntensity: 2.4, depthWrite: false });
  strip('headlight', 'light', [[18, 690], [8, 760], [60, 808], [200, 832], [450, 868], [735, 905]], [[18, 690], [90, 700], [280, 742], [470, 790], [640, 862], [735, 905]], M.lamp, 2.5);
  strip('headlight', 'light', [[18, 690], [8, 760], [60, 808], [200, 832], [450, 868], [735, 905]], [[18, 690], [90, 700], [280, 742], [470, 790], [640, 862], [735, 905]], M.lens, 7);
  ellipsePatch('headlight', 'light', 250, 786, 62, 46, new THREE.MeshStandardMaterial({ color: 0x1a1d24, metalness: 1, roughness: .2 }), 4);
  ellipsePatch('headlight', 'light', 430, 818, 48, 36, new THREE.MeshStandardMaterial({ color: 0x1a1d24, metalness: 1, roughness: .2 }), 4);
  M.amber = new THREE.MeshPhysicalMaterial({ color: 0xff9a2e, metalness: .3, roughness: .2, emissive: 0x3a1a00 });
  strip('headlight', 'light', [[22, 706], [16, 750], [70, 790]], [[22, 706], [70, 712], [120, 760]], M.amber, 5, 4, 20);
  strip('tail_light', 'light', [[4176, 1040], [4380, 1052], [4490, 1030], [4520, 992], [4530, 900], [4530, 846]], [[4176, 1040], [4200, 930], [4290, 864], [4420, 846], [4530, 846]], M.tail, 2.5);
  strip('tail_light', 'light', [[4300, 1010], [4420, 1020], [4500, 1000]], [[4300, 1010], [4330, 960], [4500, 950]], new THREE.MeshPhysicalMaterial({ color: 0xe9ecf2, metalness: .9, roughness: .15 }), 4, 4, 24);
  // перед: головные фары заходят на переднюю панель, решётка, нижний воздухозаборник, противотуманки
  patchYZ('headlight', 'light', [[690, 805], [560, 812], [430, 800]], [[690, 700], [560, 716], [430, 742]], M.lamp, true, 2.5);
  patchYZ('headlight', 'light', [[690, 805], [560, 812], [430, 800]], [[690, 700], [560, 716], [430, 742]], M.lens, true, 7);
  const grille = new THREE.MeshPhysicalMaterial({ color: 0x050507, metalness: .6, roughness: .35, clearcoat: 1, side: THREE.DoubleSide });
  patchYZ('bumper_front', 'body', [[420, 798], [210, 806], [0, 808]], [[420, 702], [210, 694], [0, 692]], grille, true, 3, 6, 30);
  patchYZ('bumper_front', 'body', [[420, 803], [210, 812], [0, 814]], [[420, 795], [210, 803], [0, 806]], M.chrome, true, 5, 2, 30);
  patchYZ('bumper_front', 'body', [[420, 706], [210, 698], [0, 696]], [[420, 700], [210, 692], [0, 690]], M.chrome, true, 5, 2, 30);
  for (const z of [728, 756, 782]) patchYZ('bumper_front', 'body', [[410, z + 4], [0, z + 4]], [[410, z - 4], [0, z - 4]], M.chrome, true, 4, 1, 16);
  patchYZ('bumper_front', 'body', [[600, 440], [300, 452], [0, 455]], [[600, 300], [300, 288], [0, 285]], M.matte.clone(), true, 3, 6, 30);
  M.fog.side = THREE.DoubleSide;
  for (const [cy, r] of [[640, 60]]) { const up = [], low = []; for (let k = 0; k <= 20; k++) { const a = Math.PI * k / 20; up.push([cy + Math.cos(a) * r, 470 + Math.sin(a) * r * .72]); low.push([cy + Math.cos(a) * r, 470 - Math.sin(a) * r * .72]) } patchYZ('fog_light', 'light', up, low, M.fog, true, 4, 6, 30) }
  // зад: фонари на крышке и крыльях, светоотражатели
  patchYZ('tail_light', 'light', [[700, 1000], [560, 1020], [440, 1018]], [[700, 860], [560, 868], [440, 900]], M.tail, false, 2.5);
  patchYZ('tail_light', 'light', [[440, 1012], [360, 1010], [300, 1006]], [[440, 920], [360, 930], [300, 940]], new THREE.MeshPhysicalMaterial({ color: 0xd7dbe4, metalness: .9, roughness: .12 }), false, 3, 4, 20);
  patchYZ('bumper_rear', 'body', [[640, 482], [520, 482]], [[640, 452], [520, 452]], M.tail, false, 3, 2, 12);
  patchYZ('bumper_rear', 'body', [[520, 290], [200, 280], [0, 278]], [[520, 250], [200, 246], [0, 246]], M.matte.clone(), false, 3, 3, 24);
  for (const m of meshesById.get('fog_light')) if (m.material.vertexColors) { m.material = m.material.clone(); m.material.vertexColors = false }
}

// ---------- колёса ----------
function sidewallTexture() {
  const c = document.createElement('canvas'); c.width = c.height = 1024; const x = c.getContext('2d');
  x.clearRect(0, 0, 1024, 1024); x.translate(512, 512); x.fillStyle = 'rgba(190,192,200,.55)'; x.font = 'bold 44px Arial'; x.textAlign = 'center';
  const txt = ['205/55 R16 91V', 'TUBELESS', 'RADIAL', 'M+S'];
  txt.forEach((s, k) => { x.save(); x.rotate(k * Math.PI / 2); [...s].forEach((ch, i) => { x.save(); x.rotate((i - s.length / 2) * .055); x.fillText(ch, 0, -452); x.restore() }); x.restore() });
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
function buildWheel(front) {
  const g = new THREE.Group(), spin = new THREE.Group(); g.add(spin);
  const prof = [[203, -96], [226, -104], [268, -107], [300, -101], [313, -84], [317, -52], [317, 52], [313, 84], [300, 101], [268, 107], [226, 104], [203, 96]].map(([r, w]) => new THREE.Vector2(r / 1000, w / 1000));
  const tyre = new THREE.Mesh(new THREE.LatheGeometry(prof, 120), M.rubber); tyre.rotation.x = Math.PI / 2; spin.add(tyre);
  for (const w of [-62, -22, 22, 62]) { const gr = new THREE.Mesh(new THREE.TorusGeometry(.3166, .0035, 6, 120), new THREE.MeshStandardMaterial({ color: 0x050506, roughness: 1 })); gr.position.z = w / 1000; spin.add(gr) }
  const sw = new THREE.Mesh(new THREE.RingGeometry(.214, .3, 96), new THREE.MeshStandardMaterial({ map: SWT, transparent: true, roughness: .9, depthWrite: false })); sw.position.z = .1075; spin.add(sw);
  // обод
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(.196, .196, .17, 64, 1, true), new THREE.MeshStandardMaterial({ color: 0x1a1b1f, metalness: .7, roughness: .5, side: THREE.DoubleSide })); barrel.rotation.x = Math.PI / 2; spin.add(barrel);
  const lip = new THREE.Mesh(new THREE.TorusGeometry(.2, .009, 12, 96), M.rim); lip.position.z = .085; spin.add(lip);
  const lip2 = new THREE.Mesh(new THREE.TorusGeometry(.205, .003, 6, 96), M.chrome); lip2.position.z = .092; spin.add(lip2);
  // пять спиц
  const sp = new THREE.Shape(); sp.moveTo(-.022, .07); sp.lineTo(-.036, .188); sp.quadraticCurveTo(0, .196, .036, .188); sp.lineTo(.022, .07); sp.quadraticCurveTo(0, .064, -.022, .07);
  const spg = new THREE.ExtrudeGeometry(sp, { depth: .024, bevelEnabled: true, bevelThickness: .006, bevelSize: .005, bevelSegments: 3 });
  for (let i = 0; i < 5; i++) { const s = new THREE.Mesh(spg, M.rim); const piv = new THREE.Group(); piv.rotation.z = i * Math.PI * 2 / 5; s.position.z = .05; s.rotation.x = -.14; piv.add(s); spin.add(piv) }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(.078, .082, .03, 48), M.rim); hub.rotation.x = Math.PI / 2; hub.position.z = .062; spin.add(hub);
  for (let i = 0; i < 5; i++) { const a = i * Math.PI * 2 / 5 + Math.PI / 2, n = new THREE.Mesh(new THREE.CylinderGeometry(.0105, .0105, .02, 6), M.chrome); n.rotation.x = Math.PI / 2; n.position.set(Math.cos(a) * .057, Math.sin(a) * .057, .08); spin.add(n) }
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(.03, .03, .012, 32), M.trim.clone()); cap.material.vertexColors = false; cap.rotation.x = Math.PI / 2; cap.position.z = .082; spin.add(cap);
  const capR = new THREE.Mesh(new THREE.TorusGeometry(.03, .0025, 6, 40), M.chrome); capR.position.z = .088; spin.add(capR);
  // диск и суппорт
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(front ? .1375 : .1295, front ? .1375 : .1295, front ? .022 : .01, 64), M.disc); disc.rotation.x = Math.PI / 2; disc.position.z = .005; spin.add(disc);
  const hat = new THREE.Mesh(new THREE.CylinderGeometry(.085, .085, .05, 48), M.hat); hat.rotation.x = Math.PI / 2; hat.position.z = .02; spin.add(hat);
  const cs = new THREE.Shape(); const r1 = .1, r2 = .158, a0 = -.42, a1 = .42; cs.absarc(0, 0, r2, a0, a1, false); cs.absarc(0, 0, r1, a1, a0, true);
  const cal = new THREE.Mesh(new THREE.ExtrudeGeometry(cs, { depth: .07, bevelEnabled: true, bevelSize: .008, bevelThickness: .008, bevelSegments: 3 }), M.caliper); cal.position.z = -.03;
  const calG = new THREE.Group(); calG.add(cal); g.add(calG); g.userData = { spin, calG };
  return g;
}
let SWT;
function buildWheels() {
  SWT = sidewallTexture();
  for (const [cx, front] of [[FA, true], [RA, false]]) for (const side of [1, -1]) {
    const w = buildWheel(front); w.position.copy(V(cx, side * TRACK / 2, ZA));
    if (side < 0) w.rotation.y = Math.PI;
    w.userData.calG.rotation.z = side > 0 ? (front ? .25 : .5) : Math.PI - (front ? .25 : .5);
    w.userData.side = side; car.add(w); wheels.push(w);
    w.traverse(o => { if (o.isMesh) { o.userData.id = o.material === M.rubber ? 'tyre' : (o.material === M.disc || o.material === M.caliper || o.material === M.hat) ? (front ? 'brake_front' : 'brake_rear') : 'wheel'; pickables.push(o); (meshesById.get(o.userData.id) || meshesById.set(o.userData.id, []).get(o.userData.id)).push(o) } });
  }
}

// ---------- внутренности (мм) ----------
const COL = { alu: [0xb9bdc5, .85, .35], iron: [0x666970, .75, .55], black: [0x1c1d21, .1, .6], rubber: [0x121214, 0, .9], steel: [0x9ca1a9, 1, .38], plastic: [0x2a2c31, 0, .55], fabric: [0x2b2d33, 0, .95], cream: [0xd8d4c6, 0, .45], copper: [0xb87333, 1, .35], exhaust: [0x8a8076, .9, .5], red: [0x7a1f24, .2, .5], blue: [0x2e4f9a, .2, .5] };
const matCache = {};
function mat(k) { if (!matCache[k]) { const [c, m, r] = COL[k]; matCache[k] = new THREE.MeshStandardMaterial({ color: c, metalness: m, roughness: r }) } return matCache[k] }
function add(id, sys, geo, k, pos, rot) {
  const m = new THREE.Mesh(geo, mat(k).clone()); m.position.copy(pos); if (rot) m.rotation.set(...rot);
  m.userData.baseColor = m.material.color.clone(); m.userData.sys = sys; internals.push(m); return part(id, sys, m);
}
const box = (id, sys, [x1, x2], [y1, y2], [z1, z2], k, r = 12) => add(id, sys, new RoundedBoxGeometry((x2 - x1) / 1000, (z2 - z1) / 1000, (y2 - y1) / 1000, 2, r / 1000), k, V((x1 + x2) / 2, (y1 + y2) / 2, (z1 + z2) / 2));
function cyl(id, sys, [x, y, z], r, len, axis, k, r2 = r) {
  const g = new THREE.CylinderGeometry(r2 / 1000, r / 1000, len / 1000, 28);
  return add(id, sys, g, k, V(x, y, z), axis === 'x' ? [0, 0, Math.PI / 2] : axis === 'y' ? [Math.PI / 2, 0, 0] : null);
}
function tube(id, sys, pts, r, k, closed = false) {
  const curve = new THREE.CatmullRomCurve3(pts.map(p => V(...p)), closed);
  return add(id, sys, new THREE.TubeGeometry(curve, Math.max(24, pts.length * 12), r / 1000, 12, closed), k, new THREE.Vector3());
}
function helix(id, sys, [x, y, z], R, h, turns, wr, k) {
  const pts = []; for (let i = 0; i <= turns * 24; i++) { const a = i / 24 * Math.PI * 2; pts.push([x + Math.cos(a) * R, y + Math.sin(a) * R, z + h * i / (turns * 24)]) }
  return tube(id, sys, pts, wr, k);
}
function buildInternals() {
  // охлаждение
  box('condenser', 'cool', [118, 136], [-640, 640], [330, 700], 'alu', 4);
  box('radiator', 'cool', [140, 172], [-660, 660], [320, 740], 'plastic', 6);
  for (let i = -620; i <= 620; i += 40) box('radiator', 'cool', [138, 142], [i, i + 4], [340, 720], 'alu', 1);
  cyl('fan', 'cool', [205, -150, 530], 190, 30, 'x', 'black');
  for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2; box('fan', 'cool', [214, 226], [-150 + Math.cos(a) * 95 - 30, -150 + Math.cos(a) * 95 + 30], [530 + Math.sin(a) * 95 - 70, 530 + Math.sin(a) * 95 + 70], 'black', 6) }
  box('coolant_tank', 'cool', [220, 330], [-700, -560], [600, 760], 'cream', 18);
  cyl('water_pump', 'cool', [470, -405, 560], 48, 40, 'y', 'alu');
  cyl('thermostat', 'cool', [640, 160, 610], 30, 50, 'y', 'alu');
  cyl('ac_compressor', 'cool', [400, -330, 380], 62, 150, 'y', 'alu');
  // двигатель 1ZR-FE: поперечно, цилиндры вдоль y
  box('engine_block', 'engine', [440, 800], [-380, 150], [330, 650], 'alu', 20);
  for (let i = 0; i < 4; i++) box('engine_block', 'engine', [452, 462], [-340 + i * 120, -260 + i * 120], [360, 620], 'iron', 4);
  box('oil_pan', 'engine', [460, 790], [-360, 130], [262, 332], 'iron', 16);
  box('valve_cover', 'engine', [440, 800], [-390, 160], [650, 740], 'alu', 24);
  box('valve_cover', 'engine', [470, 770], [-370, 140], [740, 780], 'black', 22);
  for (let i = 0; i < 4; i++) { cyl('ign_coil', 'elec', [620, -300 + i * 120, 790], 22, 60, 'z', 'black'); box('ign_coil', 'elec', [580, 660], [-320 + i * 120, -280 + i * 120], [810, 828], 'black', 6) }
  for (let i = 0; i < 4; i++) cyl('spark_plug', 'elec', [620, -300 + i * 120, 700], 9, 90, 'z', 'cream');
  tube('timing_chain', 'engine', [[600, -398, 400], [520, -398, 560], [510, -398, 740], [700, -398, 760], [720, -398, 560], [640, -398, 400]], 9, 'steel', true);
  cyl('vvti', 'engine', [530, -402, 740], 52, 26, 'y', 'steel'); cyl('vvti', 'engine', [700, -402, 740], 52, 26, 'y', 'steel');
  cyl('alternator', 'elec', [400, -390, 600], 66, 120, 'y', 'alu');
  tube('belt', 'engine', [[400, -455, 666], [470, -455, 610], [560, -455, 420], [440, -455, 320], [340, -455, 380], [334, -455, 600]], 7, 'rubber', true);
  cyl('oil_filter', 'engine', [420, -150, 420], 38, 80, 'x', 'blue');
  for (let i = 0; i < 4; i++) { tube('intake', 'engine', [[440, -300 + i * 120, 600], [330, -300 + i * 120, 660], [320, -300 + i * 120, 730], [380, -100, 780]], 24, 'black'); cyl('injector', 'fuel', [395, -300 + i * 120, 640], 9, 70, 'x', 'black') }
  cyl('throttle', 'engine', [380, 180, 760], 40, 70, 'y', 'alu');
  box('air_filter', 'engine', [600, 900], [250, 600], [680, 810], 'black', 30);
  tube('air_filter', 'engine', [[560, 400, 760], [470, 300, 790], [390, 220, 760]], 38, 'rubber');
  box('engine_mount', 'engine', [580, 660], [-560, -470], [580, 660], 'rubber', 8); box('engine_mount', 'engine', [660, 740], [540, 620], [560, 640], 'rubber', 8); cyl('engine_mount', 'engine', [900, 0, 300], 40, 60, 'x', 'rubber');
  // коробка MMT
  box('gearbox', 'trans', [520, 900], [170, 520], [280, 610], 'alu', 40);
  cyl('clutch', 'trans', [660, 180, 470], 125, 30, 'y', 'iron');
  cyl('clutch_actuator', 'trans', [620, 330, 650], 38, 150, 'y', 'black'); box('clutch_actuator', 'trans', [560, 680], [400, 470], [620, 690], 'black', 10);
  box('shift_actuator', 'trans', [720, 850], [280, 480], [620, 700], 'black', 14); cyl('shift_actuator', 'trans', [785, 230, 690], 34, 80, 'z', 'steel'); cyl('shift_actuator', 'trans', [785, 520, 690], 34, 80, 'z', 'steel');
  cyl('starter', 'elec', [860, 140, 430], 45, 180, 'y', 'iron');
  // приводы со ШРУСами
  tube('cv_joint', 'trans', [[870, 330, 320], [905, 520, 318], [935, 700, 316]], 14, 'steel');
  tube('cv_joint', 'trans', [[870, 170, 320], [900, -200, 318], [915, -480, 316], [935, -700, 316]], 14, 'steel');
  for (const y of [520, -480]) cyl('cv_joint', 'trans', [905, y, 318], 44, 90, 'y', 'rubber', 30);
  for (const y of [690, -690]) cyl('cv_joint', 'trans', [935, y, 316], 50, 70, 'y', 'rubber', 34);
  // электрика, тормоза в моторном
  box('battery', 'elec', [260, 520], [440, 640], [540, 760], 'black', 10); cyl('battery', 'elec', [300, 470, 775], 12, 22, 'z', 'copper'); cyl('battery', 'elec', [300, 610, 775], 12, 22, 'z', 'copper');
  box('fuse_box', 'elec', [880, 1040], [560, 700], [700, 800], 'black', 12);
  cyl('horn', 'elec', [130, 520, 440], 45, 22, 'x', 'black');
  cyl('brake_booster', 'brake', [1170, 360, 760], 118, 130, 'x', 'black'); cyl('brake_booster', 'brake', [1060, 360, 770], 28, 120, 'x', 'steel'); box('brake_booster', 'brake', [1020, 1100], [320, 400], [810, 880], 'cream', 10);
  box('abs', 'brake', [1020, 1130], [-460, -360], [600, 700], 'alu', 10);
  box('ecu', 'elec', [1500, 1640], [-520, -420], [620, 700], 'alu', 8);
  box('cabin_filter', 'cool', [1600, 1640], [-480, -240], [640, 700], 'cream', 4);
  // выпуск
  tube('catalyst', 'fuel', [[820, -250, 650], [900, -220, 560], [930, -120, 420], [950, -60, 300]], 48, 'exhaust');
  cyl('o2_sensor', 'elec', [880, -230, 640], 10, 60, 'x', 'steel');
  tube('exhaust_pipe', 'fuel', [[950, -60, 300], [1150, -40, 215], [2000, -40, 210], [3000, -60, 215], [3600, -240, 250], [3900, -330, 280]], 26, 'exhaust');
  add('resonator', 'fuel', new THREE.CapsuleGeometry(.06, .42, 8, 24), 'exhaust', V(2300, -40, 215), [0, 0, Math.PI / 2]);
  box('muffler', 'fuel', [3880, 4300], [-640, -150], [240, 430], 'exhaust', 60);
  // бак и топливо
  box('fuel_tank', 'fuel', [2700, 3320], [-620, 620], [230, 470], 'black', 60);
  cyl('fuel_pump', 'fuel', [3000, -250, 400], 55, 160, 'z', 'plastic');
  tube('fuel_pump', 'fuel', [[3000, -250, 480], [2600, -500, 300], [1200, -500, 330], [700, -400, 700], [395, -100, 680]], 5, 'steel');
  // подвеска и руль
  for (const s of [1, -1]) {
    cyl('strut_front', 'chassis', [950, s * 660, 560], 26, 520, 'z', 'black'); cyl('strut_front', 'chassis', [955, s * 655, 830], 10, 120, 'z', 'steel');
    helix('strut_front', 'chassis', [955, s * 655, 590], 75, 230, 5.5, 7, 'black'); cyl('strut_front', 'chassis', [960, s * 650, 870], 80, 22, 'z', 'rubber');
    tube('control_arm', 'chassis', [[780, s * 300, 270], [930, s * 700, 262], [1150, s * 300, 268]], 18, 'black');
    cyl('ball_joint', 'chassis', [930, s * 705, 270], 24, 30, 'z', 'steel');
    tube('stab_link', 'chassis', [[900, s * 620, 520], [880, s * 610, 380]], 8, 'steel');
    tube('tie_rod', 'chassis', [[1100, s * 440, 360], [1030, s * 700, 350]], 9, 'steel');
    cyl('hub_bearing', 'chassis', [935, s * 690, 316], 45, 40, 'y', 'steel');
    tube('rear_beam', 'chassis', [[3200, s * 620, 330], [3540, s * 700, 316]], 22, 'black');
    cyl('shock_rear', 'chassis', [3620, s * 610, 470], 24, 380, 'z', 'black');
    helix('shock_rear', 'chassis', [3430, s * 620, 330], 62, 190, 5, 7, 'black');
    cyl('hub_bearing', 'chassis', [3535, s * 690, 316], 42, 40, 'y', 'steel');
  }
  add('rear_beam', 'chassis', new THREE.CylinderGeometry(.03, .03, 1.24, 24), 'black', V(3330, 0, 340), [Math.PI / 2, 0, 0]);
  box('steering_rack', 'chassis', [1080, 1120], [-450, 450], [340, 380], 'alu', 18);
  tube('eps', 'chassis', [[1100, 350, 380], [1300, 370, 620], [1600, 370, 860], [1760, 370, 960]], 16, 'steel');
  box('eps', 'chassis', [1500, 1600], [300, 440], [760, 840], 'black', 10);
  box('floor', 'body', [700, 1250], [-520, 520], [236, 256], 'black', 6);
  // салон
  box('dashboard', 'interior', [1340, 1760], [-760, 760], [720, 1010], 'plastic', 50);
  add('steering_wheel', 'interior', new THREE.TorusGeometry(.19, .016, 12, 48), 'black', V(1790, 370, 980), [0, Math.PI / 2, .5]);
  cyl('steering_wheel', 'interior', [1790, 370, 980], 60, 70, 'x', 'black');
  for (const s of [1, -1]) {
    box('seat_front', 'interior', [2150, 2600], [s * 370 - 250, s * 370 + 250], [340, 480], 'fabric', 50);
    add('seat_front', 'interior', new RoundedBoxGeometry(.11, .64, .5, 3, .04), 'fabric', V(2650, s * 370, 800), [0, 0, -.22]);
    box('seat_front', 'interior', [2670, 2760], [s * 370 - 130, s * 370 + 130], [1100, 1260], 'fabric', 30);
  }
  box('seat_rear', 'interior', [2950, 3370], [-700, 700], [330, 470], 'fabric', 50);
  add('seat_rear', 'interior', new RoundedBoxGeometry(.11, .56, 1.38, 3, .04), 'fabric', V(3420, 0, 760), [0, 0, -.32]);
  box('shifter', 'trans', [1760, 2350], [-130, 130], [330, 560], 'plastic', 30); cyl('shifter', 'trans', [2020, 0, 640], 8, 160, 'z', 'steel'); cyl('shifter', 'trans', [2020, 0, 730], 26, 50, 'z', 'black');
  for (const y of [300, 420]) box('pedals', 'interior', [1480, 1520], [y - 40, y + 40], [330, 520], 'steel', 6);
  box('headliner', 'interior', [2120, 3150], [-560, 560], [1352, 1366], 'cream', 10);
  add('spare_wheel', 'chassis', new THREE.CylinderGeometry(.3, .3, .14, 40), 'rubber', V(4120, 0, 330));
  box('trunk', 'interior', [3950, 4400], [-650, 650], [420, 430], 'fabric', 4);
}

// ---------- миры: гараж и ночная дорога ----------
function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(...repeat) } return t;
}
function noise(x, w, h, base, amp, n = 9000) { x.fillStyle = base; x.fillRect(0, 0, w, h); for (let i = 0; i < n; i++) { const v = Math.random() * amp; x.fillStyle = `rgba(${v > amp / 2 ? '255,255,255' : '0,0,0'},${Math.random() * .06})`; x.fillRect(Math.random() * w, Math.random() * h, 1 + Math.random() * 2, 1 + Math.random() * 2) } }
function hexGrid(group, cx, cz, rings, size, mat, y) {
  const bar = new THREE.BoxGeometry(size * .98, .03, .045), pts = [];
  for (let q = -rings; q <= rings; q++) for (let r = -rings; r <= rings; r++) { if (Math.abs(q + r) > rings) continue; pts.push([cx + size * 1.5 * q, cz + size * Math.sqrt(3) * (r + q / 2)]) }
  const im = new THREE.InstancedMesh(bar, mat, pts.length * 6), m = new THREE.Matrix4(), qn = new THREE.Quaternion(), e = new THREE.Euler(); let k = 0;
  for (const [x, z] of pts) for (let i = 0; i < 6; i++) { const a = Math.PI / 3 * i, mx = x + Math.cos(a + Math.PI / 6) * size * .866, mz = z + Math.sin(a + Math.PI / 6) * size * .866; e.set(0, -(a + Math.PI / 6) - Math.PI / 2, 0); qn.setFromEuler(e); m.compose(new THREE.Vector3(mx, y, mz), qn, new THREE.Vector3(1, 1, 1)); im.setMatrixAt(k++, m) }
  group.add(im); return im;
}
function garage() {
  const g = new THREE.Group(); scene.add(g); W.garage = g;
  const W2 = 9.5, D2 = 7.5, H = 4.6;
  const floorTex = canvasTex(1024, 1024, (x, w, h) => { noise(x, w, h, '#45474f', 1, 26000); x.strokeStyle = 'rgba(255,255,255,.05)'; x.lineWidth = 3; for (let i = 0; i <= 4; i++) { x.beginPath(); x.moveTo(i * w / 4, 0); x.lineTo(i * w / 4, h); x.stroke(); x.beginPath(); x.moveTo(0, i * h / 4); x.lineTo(w, i * h / 4); x.stroke() } }, [5, 4]);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W2 * 2, D2 * 2), new THREE.MeshPhysicalMaterial({ map: floorTex, roughness: .45, metalness: .05, clearcoat: .35, clearcoatRoughness: .3 }));
  floor.rotation.x = -Math.PI / 2; g.add(floor); W.floor = floor;
  // поворотный круг под машиной с подсветкой
  const tt = new THREE.Mesh(new THREE.CylinderGeometry(3.15, 3.2, .035, 96), new THREE.MeshPhysicalMaterial({ color: 0x15161b, metalness: .85, roughness: .32, clearcoat: .5 })); tt.position.y = .017; g.add(tt);
  const ttRing = new THREE.Mesh(new THREE.TorusGeometry(3.18, .012, 8, 160), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x3edbf7).multiplyScalar(5) })); ttRing.rotation.x = Math.PI / 2; ttRing.position.y = .036; g.add(ttRing); W.ring = ttRing;
  // стены: графитовый бетон
  const wallTex = canvasTex(1024, 512, (x, w, h) => { noise(x, w, h, '#2c2e35', 1, 20000); x.fillStyle = 'rgba(0,0,0,.25)'; for (let i = 1; i < 6; i++) x.fillRect(i * w / 6, 0, 2, h); x.fillRect(0, h * .55, w, 2) }, [2, 1]);
  const wallMat = new THREE.MeshStandardMaterial({ map: wallTex, roughness: .92 });
  const wall = (w, h, p, ry) => { const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallMat); m.position.set(...p); m.rotation.y = ry; g.add(m); return m };
  wall(W2 * 2, H, [0, H / 2, -D2], 0); wall(W2 * 2, H, [0, H / 2, D2], Math.PI); wall(D2 * 2, H, [-W2, H / 2, 0], Math.PI / 2);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W2 * 2, D2 * 2), new THREE.MeshStandardMaterial({ color: 0x0c0c10, roughness: 1 })); ceil.rotation.x = Math.PI / 2; ceil.position.y = H; g.add(ceil);
  // секционные ворота справа
  const doorTex = canvasTex(512, 512, (x, w, h) => { const gr = x.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#3a3d45'); gr.addColorStop(1, '#2a2c32'); x.fillStyle = gr; x.fillRect(0, 0, w, h); for (let i = 0; i < 8; i++) { x.fillStyle = 'rgba(0,0,0,.45)'; x.fillRect(0, i * h / 8, w, 4); x.fillStyle = 'rgba(255,255,255,.06)'; x.fillRect(0, i * h / 8 + 5, w, 2) } });
  const door = new THREE.Mesh(new THREE.PlaneGeometry(D2 * 2, H), new THREE.MeshStandardMaterial({ map: doorTex, metalness: .6, roughness: .45 })); door.position.set(W2, H / 2, 0); door.rotation.y = -Math.PI / 2; g.add(door);
  // потолок: шестигранные LED-лампы, как в детейлинг-студии
  const led = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xf2f6ff).multiplyScalar(6) });
  hexGrid(g, 0, 0, 3, .62, led, H - .02);
  for (const z of [-D2 + .02, D2 - .02]) { const s = new THREE.Mesh(new THREE.BoxGeometry(W2 * 2 - 1, .05, .05), new THREE.MeshBasicMaterial({ color: new THREE.Color(0x3edbf7).multiplyScalar(2.5) })); s.position.set(0, 2.9, z); g.add(s) }
  // задняя стена: стеллаж с шинами, верстак, шкаф с инструментом, вывеска
  const shelf = mat('steel'), dark = new THREE.MeshStandardMaterial({ color: 0x2c3442, metalness: .5, roughness: .45 });
  for (const y of [.05, 1.1, 2.15]) { const b = new THREE.Mesh(new THREE.BoxGeometry(2.6, .04, .6), shelf); b.position.set(-6.2, y, -D2 + .35); g.add(b) }
  for (const x of [-7.5, -4.9]) { const p = new THREE.Mesh(new THREE.BoxGeometry(.05, 2.3, .05), shelf); p.position.set(x, 1.15, -D2 + .35); g.add(p) }
  for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) { const t = new THREE.Mesh(new THREE.TorusGeometry(.27, .1, 14, 40), M.rubber); t.position.set(-7.1 + i * .62, .38 + j * 1.05, -D2 + .36); g.add(t); const rim = new THREE.Mesh(new THREE.CylinderGeometry(.19, .19, .17, 24), M.rim); rim.rotation.x = Math.PI / 2; rim.position.copy(t.position); g.add(rim) }
  const bench = new THREE.Mesh(new RoundedBoxGeometry(3.2, .9, .75, 2, .03), dark); bench.position.set(-.8, .45, -D2 + .4); g.add(bench);
  const top = new THREE.Mesh(new THREE.BoxGeometry(3.3, .05, .8), new THREE.MeshStandardMaterial({ color: 0x6b5a45, roughness: .7 })); top.position.set(-.8, .92, -D2 + .4); g.add(top);
  for (let i = 0; i < 4; i++) { const d = new THREE.Mesh(new THREE.BoxGeometry(.7, .16, .02), mat('steel')); d.position.set(-1.9 + i * .74, .62, -D2 + .78); g.add(d) }
  const peg = canvasTex(512, 256, (x, w, h) => { x.fillStyle = '#23262d'; x.fillRect(0, 0, w, h); x.fillStyle = '#121318'; for (let i = 8; i < w; i += 16) for (let j = 8; j < h; j += 16) { x.beginPath(); x.arc(i, j, 2, 0, 7); x.fill() } x.strokeStyle = '#9aa0ab'; x.lineWidth = 6; x.lineCap = 'round'; for (let i = 0; i < 9; i++) { x.beginPath(); x.moveTo(40 + i * 50, 50); x.lineTo(40 + i * 50, 120 + (i % 3) * 30); x.stroke() } x.lineWidth = 10; x.beginPath(); x.arc(420, 190, 30, 0, 6.28); x.stroke() });
  const pb = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.6), new THREE.MeshStandardMaterial({ map: peg, roughness: .8 })); pb.position.set(-.8, 1.9, -D2 + .02); g.add(pb);
  const cab = new THREE.Mesh(new RoundedBoxGeometry(1.2, 1.4, .6, 2, .03), dark); cab.position.set(2.6, .7, -D2 + .35); g.add(cab);
  for (let i = 0; i < 6; i++) { const d = new THREE.Mesh(new THREE.BoxGeometry(1.05, .02, .01), mat('steel')); d.position.set(2.6, .2 + i * .22, -D2 + .66); g.add(d) }
  const sign = canvasTex(1024, 256, (x, w, h) => { x.clearRect(0, 0, w, h); x.font = '800 150px Unbounded, Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.shadowColor = '#3edbf7'; x.shadowBlur = 30; x.fillStyle = '#c9f6ff'; x.fillText('E150 LAB', w / 2, h / 2) });
  const sg = new THREE.Mesh(new THREE.PlaneGeometry(4.2, 1.05), new THREE.MeshBasicMaterial({ map: sign, transparent: true, color: new THREE.Color(2.4, 2.4, 2.4) })); sg.position.set(5.6, 3.1, -D2 + .03); g.add(sg);
  // контактная тень
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 2.6), new THREE.MeshBasicMaterial({ map: canvasTex(256, 128, (x) => { const gr = x.createRadialGradient(128, 64, 4, 128, 64, 128); gr.addColorStop(0, 'rgba(0,0,0,.9)'); gr.addColorStop(.6, 'rgba(0,0,0,.45)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, 256, 128) }), transparent: true, depthWrite: false }));
  sh.rotation.x = -Math.PI / 2; sh.position.y = .04; scene.add(sh); W.shadow = sh;
  // окружение для отражений: тот же потолок из шестигранников + полосы по стенам
  const env = new THREE.Scene(), envG = new THREE.Group(); env.add(envG);
  envG.add(new THREE.Mesh(new THREE.BoxGeometry(W2 * 2, H, D2 * 2), new THREE.MeshBasicMaterial({ color: 0x2a2c33, side: THREE.BackSide })));
  envG.children[0].position.y = H / 2;
  hexGrid(envG, 0, 0, 3, .62, new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1).multiplyScalar(3) }), H - .05);
  for (const z of [-D2 + .1, D2 - .1]) { const s = new THREE.Mesh(new THREE.BoxGeometry(W2 * 2, .25, .1), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1).multiplyScalar(1.6) })); s.position.set(0, 2.2, z); envG.add(s) }
  for (const x of [-W2 + .1, W2 - .1]) { const s = new THREE.Mesh(new THREE.BoxGeometry(.1, .25, D2 * 2), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, 1, 1).multiplyScalar(1.2) })); s.position.set(x, 2.2, 0); envG.add(s) }
  const fl = new THREE.Mesh(new THREE.PlaneGeometry(W2 * 2, D2 * 2), new THREE.MeshBasicMaterial({ color: 0x26282e })); fl.rotation.x = -Math.PI / 2; envG.add(fl);
  W.envGarage = new THREE.PMREMGenerator(renderer).fromScene(env, .02).texture;
}
function road() {
  const g = new THREE.Group(); g.visible = false; scene.add(g); W.road = g;
  const sky = new THREE.Mesh(new THREE.SphereGeometry(300, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false,
    vertexShader: `varying vec3 p; void main(){ p = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `varying vec3 p; void main(){ float h = p.y; vec3 c = mix(vec3(.10,.07,.16), vec3(.01,.012,.03), smoothstep(-.02,.5,h)); c += vec3(.45,.22,.12)*pow(max(0.,1.-abs(h*7.)),3.)*.5; gl_FragColor = vec4(c,1.); }` }));
  g.add(sky);
  const N = 2500, sg = new THREE.BufferGeometry(), sp = new Float32Array(N * 3);
  for (let i = 0; i < N; i++) { const v = new THREE.Vector3().randomDirection(); v.y = Math.abs(v.y) * .9 + .06; v.normalize().multiplyScalar(250); sp.set([v.x, v.y, v.z], i * 3) }
  sg.setAttribute('position', new THREE.BufferAttribute(sp, 3));
  g.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xdfe6ff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: .8 })));
  const asphalt = canvasTex(1024, 512, (x, w, h) => { noise(x, w, h, '#26272b', 1, 40000); x.fillStyle = '#e8e8e2'; x.fillRect(0, 26, w, 10); x.fillRect(0, h - 36, w, 10); x.fillStyle = '#f2f2ea'; for (let i = 0; i < 2; i++) x.fillRect(i * w / 2 + 40, h / 2 - 6, w / 4, 12) }, [60, 1]);
  const rd = new THREE.Mesh(new THREE.PlaneGeometry(600, 8.4), new THREE.MeshStandardMaterial({ map: asphalt, roughness: .85, metalness: 0 })); rd.rotation.x = -Math.PI / 2; rd.position.set(0, .002, 1.9); g.add(rd); W.asphalt = asphalt;
  const grass = canvasTex(512, 512, (x, w, h) => noise(x, w, h, '#0d1410', 1, 30000), [80, 20]);
  const gr = new THREE.Mesh(new THREE.PlaneGeometry(600, 160), new THREE.MeshStandardMaterial({ map: grass, roughness: 1 })); gr.rotation.x = -Math.PI / 2; gr.position.y = -.01; g.add(gr); W.grass = grass;
  // фонари и деревья едут навстречу (инстансы, переносятся по кругу)
  W.props = [];
  const poleG = new THREE.CylinderGeometry(.06, .09, 7, 8), armG = new THREE.BoxGeometry(1.6, .08, .08), headG = new THREE.BoxGeometry(.5, .08, .22);
  const lampMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(1, .78, .45).multiplyScalar(6) });
  for (let i = 0; i < 14; i++) { const lp = new THREE.Group(), z = i % 2 ? -3.2 : 7.2, s = i % 2 ? 1 : -1; const pole = new THREE.Mesh(poleG, mat('steel')); pole.position.y = 3.5; lp.add(pole); const arm = new THREE.Mesh(armG, mat('steel')); arm.position.set(0, 6.95, s * .75); arm.rotation.y = Math.PI / 2; lp.add(arm); const hd = new THREE.Mesh(headG, lampMat); hd.position.set(0, 6.9, s * 1.45); lp.add(hd); lp.position.set(-120 + i * 18, 0, z); g.add(lp); W.props.push(lp) }
  const trunkG = new THREE.CylinderGeometry(.12, .16, 1.6, 6), crownG = new THREE.ConeGeometry(1.4, 4.2, 7), tMat = new THREE.MeshStandardMaterial({ color: 0x2a1e16, roughness: 1 }), cMat = new THREE.MeshStandardMaterial({ color: 0x0f2418, roughness: .95 });
  for (let i = 0; i < 70; i++) { const t = new THREE.Group(); const tr = new THREE.Mesh(trunkG, tMat); tr.position.y = .8; t.add(tr); const cr = new THREE.Mesh(crownG, cMat); cr.position.y = 3.2; t.add(cr); const sc = .7 + Math.random() * .9; t.scale.setScalar(sc); const side = Math.random() < .5 ? -1 : 1; t.position.set(-130 + Math.random() * 260, 0, 1.9 + side * (10 + Math.random() * 40)); g.add(t); W.props.push(t) }
  // тёплый свет от фонарей двигается вместе с ближайшими
  W.streetL = [new THREE.PointLight(0xffc27a, 40, 26, 1.6), new THREE.PointLight(0xffc27a, 40, 26, 1.6)]; W.streetL.forEach(l => { l.position.set(0, 6.6, 0); g.add(l) });
  const env = new THREE.Scene();
  env.add(new THREE.Mesh(new THREE.SphereGeometry(30, 16, 8), new THREE.MeshBasicMaterial({ color: 0x07080e, side: THREE.BackSide })));
  for (let i = 0; i < 6; i++) { const s = new THREE.Mesh(new THREE.BoxGeometry(.6, .12, .3), new THREE.MeshBasicMaterial({ color: new THREE.Color(1, .75, .45).multiplyScalar(4) })); s.position.set(-15 + i * 6, 7, i % 2 ? -3 : 7); env.add(s) }
  W.envRoad = new THREE.PMREMGenerator(renderer).fromScene(env, .02).texture;
}
function setWorld(k) {
  W.k = k; W.garage.visible = k === 'garage'; W.road.visible = k === 'road';
  scene.environment = k === 'road' ? W.envRoad : W.envGarage; scene.environmentIntensity = k === 'road' ? .7 : 1.1;
  W.key.intensity = k === 'road' ? .3 : 2.2; W.fill.intensity = k === 'road' ? .15 : 1.1; W.top.intensity = k === 'road' ? 0 : 1.2; W.hemi.intensity = k === 'road' ? .35 : 1.2; W.hemi.color.set(k === 'road' ? 0x445577 : 0xdfe4ff);
  controls.maxDistance = k === 'road' ? 22 : 8.5;
}
// свет из фар и фонарей: настоящие прожекторы
function carLights() {
  S.heads = [];
  for (const s of [1, -1]) {
    const sp = new THREE.SpotLight(0xf1f5ff, 0, 70, .42, .55, 1.4); sp.position.copy(V(120, s * 600, 760));
    sp.target.position.copy(V(-14000, s * 900, -900)); car.add(sp); car.add(sp.target); S.heads.push(sp);
  }
  S.tailL = new THREE.PointLight(0xff2a3a, 0, 3.5, 2); S.tailL.position.copy(V(4600, 0, 900)); car.add(S.tailL);
  S.dome = new THREE.PointLight(0xffe2b8, 0, 2.6, 2); S.dome.position.copy(V(2250, 0, 1330)); car.add(S.dome);
  S.beams = [];
  for (const s of [1, -1]) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(1.4, 7, 40, 1, true), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { o: { value: 0 } },
      vertexShader: `varying float v; void main(){ v = uv.y; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
      fragmentShader: `uniform float o; varying float v; void main(){ gl_FragColor = vec4(vec3(.85,.92,1.)*o, pow(v,3.)*.16*o); }` }));
    cone.rotation.z = -Math.PI / 2 - .06; cone.position.copy(V(120 - 3500, s * 640, 600)); car.add(cone); S.beams.push(cone);
  }
}

// ---------- салон изнутри ----------
function dialTex(kind) {
  return canvasTex(1024, 384, (x, w, h) => {
    x.fillStyle = '#05060a'; x.fillRect(0, 0, w, h);
    const dial = (cx, cy, r, max, step, label, unit) => {
      x.strokeStyle = 'rgba(120,200,255,.35)'; x.lineWidth = 4; x.beginPath(); x.arc(cx, cy, r, Math.PI * .75, Math.PI * 2.25); x.stroke();
      x.fillStyle = '#e8f4ff'; x.font = '600 28px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle';
      for (let v = 0; v <= max; v += step) { const a = Math.PI * .75 + (v / max) * Math.PI * 1.5; x.strokeStyle = '#d6ecff'; x.lineWidth = 3; x.beginPath(); x.moveTo(cx + Math.cos(a) * (r - 6), cy + Math.sin(a) * (r - 6)); x.lineTo(cx + Math.cos(a) * (r - 24), cy + Math.sin(a) * (r - 24)); x.stroke(); x.fillText(label(v), cx + Math.cos(a) * (r - 50), cy + Math.sin(a) * (r - 50)) }
      x.fillStyle = '#7fd4ff'; x.font = '600 22px Arial'; x.fillText(unit, cx, cy + r * .45);
      x.strokeStyle = '#ff9f43'; x.lineWidth = 6; const a = Math.PI * .95; x.beginPath(); x.moveTo(cx, cy); x.lineTo(cx + Math.cos(a) * (r - 30), cy + Math.sin(a) * (r - 30)); x.stroke();
      x.fillStyle = '#1b1e26'; x.beginPath(); x.arc(cx, cy, 16, 0, 7); x.fill();
    };
    dial(250, 200, 165, 7, 1, v => v, 'x1000 RPM'); dial(774, 200, 165, 220, 20, v => v, 'km/h');
    x.fillStyle = '#9fe9fb'; x.font = '800 70px Arial'; x.textAlign = 'center'; x.fillText('E', 512, 170); x.font = '600 24px Arial'; x.fillStyle = '#e8f4ff'; x.fillText('MMT', 512, 220); x.fillText('ODO 184 520', 512, 330);
  });
}
function stackTex() {
  return canvasTex(512, 768, (x, w, h) => {
    x.fillStyle = '#121318'; x.fillRect(0, 0, w, h);
    x.fillStyle = '#0a1a24'; x.fillRect(40, 40, w - 80, 200); x.fillStyle = '#7fe0ff'; x.font = '600 34px Arial'; x.textAlign = 'center'; x.fillText('FM 101.2', w / 2, 120); x.font = '22px Arial'; x.fillText('CD   AUX   ♫', w / 2, 180);
    x.fillStyle = '#2a2d35'; for (let i = 0; i < 6; i++) { x.beginPath(); x.roundRect(52 + (i % 3) * 140, 270 + Math.floor(i / 3) * 70, 120, 50, 12); x.fill() }
    x.fillStyle = '#c9cdd6'; x.font = '20px Arial'; for (let i = 0; i < 6; i++) x.fillText(String(i + 1), 112 + (i % 3) * 140, 302 + Math.floor(i / 3) * 70);
    for (const [cx, lab] of [[120, 'TEMP'], [256, 'FAN'], [392, 'MODE']]) { x.fillStyle = '#23262e'; x.beginPath(); x.arc(cx, 560, 58, 0, 7); x.fill(); x.strokeStyle = '#8fa2c8'; x.lineWidth = 4; x.beginPath(); x.arc(cx, 560, 44, 0, 7); x.stroke(); x.fillStyle = '#c9cdd6'; x.fillText(lab, cx, 650) }
    x.fillStyle = '#ff9f43'; x.fillRect(120 - 2, 512, 4, 30);
  });
}
function selTex() { return canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#16171c'; x.fillRect(0, 0, w, h); x.fillStyle = '#e8f4ff'; x.font = '800 40px Arial'; x.textAlign = 'center'; [['R', 70, 60], ['N', 70, 128], ['E', 70, 196], ['M', 186, 128], ['+', 186, 70], ['-', 186, 190]].forEach(([s, a, b]) => x.fillText(s, a, b + 14)); x.strokeStyle = '#555c6a'; x.lineWidth = 8; x.beginPath(); x.moveTo(128, 50); x.lineTo(128, 210); x.moveTo(128, 128); x.lineTo(186, 128); x.stroke() }) }
function interior() {
  // внутренняя обшивка: тот же кузов изнутри, тёмная ткань и пластик
  const trimIn = new THREE.MeshStandardMaterial({ color: 0x23252b, roughness: .9, side: THREE.BackSide });
  const glassIn = new THREE.MeshPhysicalMaterial({ color: 0x0c1018, roughness: .05, transparent: true, opacity: .18, side: THREE.BackSide, depthWrite: false });
  const inner = new THREE.Mesh(bodyMesh.geometry, [trimIn, glassIn, trimIn, trimIn, trimIn, trimIn, trimIn, trimIn, trimIn]); car.add(inner); S.innerShell = inner;
  const plastic = new THREE.MeshStandardMaterial({ color: 0x1c1d22, roughness: .7 }), soft = new THREE.MeshStandardMaterial({ color: 0x2a2c33, roughness: .95 }), alu = mat('alu');
  const P = (id, sys, m) => { part(id, sys, m); internals.push(m); m.userData.baseColor = m.material.color?.clone(); return m };
  // приборная панель (козырёк + щиток)
  const hood = new THREE.Mesh(new RoundedBoxGeometry(.16, .03, .46, 3, .012), plastic.clone()); hood.position.copy(V(1700, 370, 1105)); hood.rotation.z = -.12; P('cluster', 'elec', hood);
  const face = new THREE.Mesh(new THREE.PlaneGeometry(.4, .15), new THREE.MeshBasicMaterial({ map: dialTex(), color: new THREE.Color(1.3, 1.3, 1.3) })); face.position.copy(V(1735, 370, 1020)); face.rotation.y = Math.PI / 2; face.rotation.x = 0; face.rotateX(-.25); P('cluster', 'elec', face);
  // центральная консоль: магнитола и климат
  const stack = new THREE.Mesh(new THREE.PlaneGeometry(.26, .39), new THREE.MeshStandardMaterial({ map: stackTex(), roughness: .5, emissive: 0xffffff, emissiveIntensity: .25, emissiveMap: null }));
  stack.position.copy(V(1700, 0, 860)); stack.rotation.y = Math.PI / 2; stack.rotateX(-.35); P('head_unit', 'elec', stack);
  const climate = new THREE.Mesh(new RoundedBoxGeometry(.06, .1, .28, 2, .02), plastic.clone()); climate.position.copy(V(1745, 0, 690)); P('climate', 'cool', climate);
  for (const y of [-560, -110, 110, 560]) { const v = new THREE.Mesh(new RoundedBoxGeometry(.02, .07, y === -110 || y === 110 ? .09 : .16, 2, .015), new THREE.MeshStandardMaterial({ color: 0x0b0c0f, roughness: .6 })); v.position.copy(V(1736, y, 960)); P('dashboard', 'interior', v); for (let k = 0; k < 4; k++) { const sl = new THREE.Mesh(new THREE.BoxGeometry(.004, .004, y === -110 || y === 110 ? .085 : .15), alu); sl.position.copy(V(1727, y, 940 + k * 14)); car.add(sl) } }
  const glove = new THREE.Mesh(new RoundedBoxGeometry(.03, .16, .42, 2, .02), soft.clone()); glove.position.copy(V(1740, -380, 800)); P('dashboard', 'interior', glove);
  // руль: обод, спицы, подушка, подрулевые рычаги
  const wheelG = new THREE.Group(); wheelG.position.copy(V(1840, 370, 990)); wheelG.rotation.z = -.42; car.add(wheelG);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(.185, .018, 14, 64), soft.clone()); rim.rotation.y = Math.PI / 2; wheelG.add(rim);
  const hub = new THREE.Mesh(new RoundedBoxGeometry(.05, .11, .14, 3, .03), plastic.clone()); wheelG.add(hub);
  for (const a of [Math.PI / 2, -Math.PI / 2, Math.PI]) { const sp = new THREE.Mesh(new THREE.BoxGeometry(.02, .03, .16), plastic); sp.position.set(0, Math.sin(a) * .09, Math.cos(a) * .09); sp.rotation.x = -a; wheelG.add(sp) }
  wheelG.children.forEach(m => { m.userData.id = 'steering_wheel'; m.userData.sys = 'interior'; pickables.push(m); (meshesById.get('steering_wheel') || meshesById.set('steering_wheel', []).get('steering_wheel')).push(m) });
  for (const s of [1, -1]) { const st = new THREE.Mesh(new THREE.BoxGeometry(.13, .012, .016), plastic); st.position.copy(V(1790, 370 + s * 140, 1000)); P('steering_wheel', 'interior', st) }
  // селектор MMT с табличкой и ручник
  const plate = new THREE.Mesh(new THREE.PlaneGeometry(.12, .12), new THREE.MeshStandardMaterial({ map: selTex(), roughness: .5 })); plate.rotation.x = -Math.PI / 2; plate.position.copy(V(2030, 0, 565)); P('shifter', 'trans', plate);
  const hb = new THREE.Mesh(new RoundedBoxGeometry(.3, .05, .05, 2, .02), plastic.clone()); hb.position.copy(V(2350, 0, 560)); hb.rotation.z = -.25; P('handbrake', 'brake', hb);
  // двери изнутри, зеркало, козырьки, плафон
  for (const s of [1, -1]) for (const [x1, x2] of [[1380, 2060], [2120, 3150]]) {
    const y = s * (sideY((x1 + x2) / 2, 800) - 45);
    const card = new THREE.Mesh(new RoundedBoxGeometry((x2 - x1) / 1000, .5, .05, 2, .02), soft.clone()); card.position.copy(V((x1 + x2) / 2, y, 760)); P('door_card', 'interior', card);
    const arm = new THREE.Mesh(new RoundedBoxGeometry((x2 - x1) / 1000 * .55, .05, .09, 2, .02), plastic.clone()); arm.position.copy(V((x1 + x2) / 2 + 60, y - s * 40, 690)); P('door_card', 'interior', arm);
  }
  const rm = new THREE.Mesh(new RoundedBoxGeometry(.03, .07, .24, 2, .015), plastic.clone()); rm.position.copy(V(1990, 0, 1320)); P('rear_mirror', 'body', rm);
  for (const s of [1, -1]) { const v = new THREE.Mesh(new RoundedBoxGeometry(.16, .015, .36, 2, .006), soft.clone()); v.position.copy(V(2010, s * 330, 1360)); v.rotation.z = .25; P('headliner', 'interior', v) }
  const dome = new THREE.Mesh(new RoundedBoxGeometry(.14, .02, .1, 2, .008), new THREE.MeshStandardMaterial({ color: 0xe8e3d6, emissive: 0xffe2b8, emissiveIntensity: 0 })); dome.position.copy(V(2250, 0, 1352)); P('dome_light', 'light', dome); S.domeMesh = dome;
  const carpet = new THREE.Mesh(new THREE.BoxGeometry(2.1, .02, 1.5), new THREE.MeshStandardMaterial({ color: 0x15161a, roughness: 1 })); carpet.position.copy(V(2350, 0, 300)); P('floor', 'body', carpet);
}

// ---------- размерные линии ----------
function labelSprite(text) {
  const t = canvasTex(512, 128, (x, w, h) => { x.fillStyle = 'rgba(10,12,24,.82)'; x.beginPath(); x.roundRect(4, 14, w - 8, h - 28, 40); x.fill(); x.strokeStyle = '#3edbf7'; x.lineWidth = 4; x.stroke(); x.fillStyle = '#e9fbff'; x.font = '700 56px Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, w / 2, h / 2 + 2) });
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, depthTest: false, transparent: true })); s.scale.set(.9, .225, 1); s.renderOrder = 10; return s;
}
function buildDims(labels) {
  if (S.dims) { car.remove(S.dims) }
  const g = new THREE.Group(), m = new THREE.LineBasicMaterial({ color: 0x3edbf7, depthTest: false, transparent: true });
  const line = (a, b, label, lp) => { const pts = [V(...a), V(...b)]; const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), m); l.renderOrder = 9; g.add(l);
    const dir = pts[1].clone().sub(pts[0]).normalize(), n = Math.abs(dir.y) > .5 ? new THREE.Vector3(.06, 0, 0) : new THREE.Vector3(0, .06, 0);
    for (const p of pts) { const t = new THREE.Line(new THREE.BufferGeometry().setFromPoints([p.clone().add(n), p.clone().sub(n)]), m); t.renderOrder = 9; g.add(t) }
    const s = labelSprite(label); s.position.copy(lp ? V(...lp) : pts[0].clone().lerp(pts[1], .5)); g.add(s) };
  line([0, 1250, 0], [L, 1250, 0], labels.length, [3000, 1250, 170]);
  line([FA, 1100, 30], [RA, 1100, 30], labels.wheelbase, [1700, 1100, 120]);
  line([L + 120, 1100, 0], [L + 120, 1100, 1470], labels.height, [L + 120, 1100, 760]);
  line([-120, 880, 0], [-120, -880, 0], labels.width, [-120, 0, 140]);
  line([-260, 1015, 1080], [-260, -1015, 1080], labels.mirrors, [-260, 0, 1230]);
  line([FA, 1050, 0], [FA, 1050, 150], labels.clearance, [FA - 450, 1050, 120]);
  car.add(g); S.dims = g; g.visible = false;
}

// ---------- свет сцены ----------
function lights() {
  W.key = new THREE.DirectionalLight(0xffffff, 2.2); W.key.position.set(-3, 6, 4); scene.add(W.key);
  W.fill = new THREE.DirectionalLight(0xdfe6ff, 1.1); W.fill.position.set(4, 3, 5); scene.add(W.fill);
  W.top = new THREE.DirectionalLight(0xffffff, 1.2); W.top.position.set(0, 8, 0); scene.add(W.top);
  const rim1 = new THREE.DirectionalLight(0xc9d2ff, .35); rim1.position.set(5, 3, -5); scene.add(rim1);
  const rim2 = new THREE.DirectionalLight(0x3edbf7, .4); rim2.position.set(-6, 1.5, -3); scene.add(rim2);
  W.hemi = new THREE.HemisphereLight(0xdfe4ff, 0x3a3a44, 1.2); scene.add(W.hemi);
}

// ---------- взаимодействие ----------
const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(); let moved = true, ptr = null, downAt = null;
function pick() {
  ray.setFromCamera(ndc, camera);
  const list = S.xray ? pickables.filter(m => m !== bodyMesh && !m.userData.bodyAcc) : pickables;
  const hits = ray.intersectObjects(list.filter(m => m.visible && (!S.sys || m === bodyMesh || m.userData.sys === S.sys || !m.userData.sys)), false);
  for (const h of hits) {
    if (h.object === bodyMesh) { const id = idList[bodyIds[h.face.a]]; if (S.sys && sysOf(id) !== S.sys) continue; return id }
    if (S.sys && h.object.userData.sys && h.object.userData.sys !== S.sys) continue;
    return h.object.userData.id;
  }
  return null;
}
const sysOf = id => opts.sysOf ? opts.sysOf(id) : null;
function highlight(id, on, strong) {
  if (!id) return;
  const ix = idList.indexOf(id);
  if (ix >= 0) { const k = on ? (strong ? 1.9 : 1.4) : 1; for (let v = 0; v < bodyIds.length; v++) if (bodyIds[v] === ix) bodyColors.set([k, k * .96, k * 1.08], v * 3); bodyMesh.geometry.attributes.color.needsUpdate = true }
  (meshesById.get(id) || []).forEach(m => { if (!m.material.emissive) return; if (!m.userData.e0) m.userData.e0 = m.material.emissive.clone(); m.material = m.userData.ownMat || (m.userData.ownMat = m.material.clone()); m.material.emissive.copy(on ? new THREE.Color(strong ? 0x6a4cff : 0x3a2c88) : m.userData.e0) });
}
function setHover(id, e) {
  if (id === S.hover) { if (id) opts.onHover?.(id, e); return }
  if (S.hover && S.hover !== S.sel) highlight(S.hover, false);
  S.hover = id; if (id && id !== S.sel) highlight(id, true);
  stage.style.cursor = id ? 'pointer' : 'grab'; opts.onHover?.(id, e);
}
function idBox(id) {
  const b = new THREE.Box3(), ix = idList.indexOf(id), camSide = Math.sign(camera.position.z) || 1, p = bodyMesh.geometry.attributes.position;
  if (ix >= 0) { let any = false; const v = new THREE.Vector3(); for (let i = 0; i < bodyIds.length; i++) if (bodyIds[i] === ix) { v.fromBufferAttribute(p, i); if (Math.sign(v.z) === camSide || Math.abs(v.z) < .3) { b.expandByPoint(v); any = true } } if (!any) for (let i = 0; i < bodyIds.length; i++) if (bodyIds[i] === ix) b.expandByPoint(v.fromBufferAttribute(p, i)) }
  (meshesById.get(id) || []).forEach(m => b.expandByObject(m));
  return b;
}
let fly = null;
function flyTo(target, pos, ms = 1100) { fly = { t0: performance.now(), ms, ft: controls.target.clone(), fp: camera.position.clone(), tt: target, tp: pos } }
function focus(id) {
  if (S.sel) highlight(S.sel, false); S.sel = id; if (!id) return; highlight(id, true, true);
  const b = idBox(id); if (b.isEmpty()) return;
  const c = b.getCenter(new THREE.Vector3()), size = b.getSize(new THREE.Vector3()).length();
  const dir = camera.position.clone().sub(controls.target).normalize();
  if (c.z !== 0 && Math.abs(c.z) > .3 && Math.sign(dir.z) !== Math.sign(c.z)) dir.z *= -1;
  flyTo(c, c.clone().add(dir.multiplyScalar(Math.max(.9, size * 2.4))));
}
const VIEWS = { q: [-4.6, 1.5, 4.9], side: [0, .9, 7.4], front: [-7, 1, 0.01], rear: [7, 1.1, 0.01], top: [0.01, 8.5, 0.6], bottom: [0.6, -4.4, 3.2] };
function view(k) { const p = VIEWS[k]; if (!p) return; if (S.sel) { highlight(S.sel, false); S.sel = null } flyTo(new THREE.Vector3(0, k === 'bottom' ? .25 : .55, 0), new THREE.Vector3(...p)) }

function setXray(on) {
  S.xray = on;
  bodyMesh.material = on ? Array(9).fill(M.holo) : [M.paint, M.glass, M.trim, M.matte, M.lamp, M.tail, M.fog, M.under, M.plate];
  M.seam.color.set(on ? 0x3edbf7 : 0x000000); M.seam.opacity = on ? .7 : .85;
  car.traverse(o => { if (o.userData.id && !internals.includes(o) && o !== bodyMesh && o.isMesh && groups.has(o.userData.id) && ['mirror', 'door_handle', 'fuel_door', 'wiper', 'bumper_front'].includes(o.userData.id)) o.visible = !on });
  applySys();
}
function applySys() {
  for (const m of internals) {
    const c = opts.sysColor?.(m.userData.sys) || 0xffffff, dim = S.sys && m.userData.sys !== S.sys;
    if (!m.material.emissive) continue;
    const mm = m.userData.ownMat || (m.userData.ownMat = m.material.clone()); m.material = mm;
    mm.transparent = !!dim; mm.opacity = dim ? .07 : 1; mm.depthWrite = !dim;
    if (!m.userData.e0) m.userData.e0 = mm.emissive.clone();
    m.userData.e0 = new THREE.Color(S.xray && !dim ? c : 0x000000).multiplyScalar(S.xray ? .32 : 0);
    if (m.userData.id !== S.sel && m.userData.id !== S.hover) mm.emissive.copy(m.userData.e0);
  }
  for (const w of wheels) w.traverse(o => { if (o.isMesh) { o.material.transparent = !!S.sys && S.sys !== 'chassis' && S.sys !== 'brake'; o.material.opacity = o.material.transparent ? .12 : 1 } });
}
function setSystem(sys) { S.sys = sys || null; if (S.sys && !S.xray && S.sys !== 'body' && S.sys !== 'light') setXray(true); applySys(); opts.onState?.(state()) }
const state = () => ({ xray: S.xray, sys: S.sys, explode: S.explodeTo > 0, drive: S.drive, dome: S.domeOn });

// ---------- цикл ----------
function resize() { const r = stage.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return; renderer.setSize(r.width, r.height, false); camera.aspect = r.width / r.height; camera.fov = S.inside ? (camera.aspect < 1 ? 85 : 68) : camera.aspect < 1.2 ? Math.min(70, 30 * 1.2 / camera.aspect * .85) : 30; camera.updateProjectionMatrix(); composer.setSize(r.width, r.height) }
function loop() {
  requestAnimationFrame(loop); if (document.hidden || !stage.offsetParent || renderer.domElement.width < 2) return;
  const dt = Math.min(.05, clock.getDelta()); S.t += dt;
  if (fly) { const u = Math.min(1, (performance.now() - fly.t0) / fly.ms), e = 1 - Math.pow(1 - u, 4); controls.target.lerpVectors(fly.ft, fly.tt, e); camera.position.lerpVectors(fly.fp, fly.tp, e); if (u >= 1) fly = null }
  controls.update();
  M.holo.uniforms.t.value = S.t;
  const below = camera.position.y < .03; W.shadow.visible = !below && W.k === 'garage'; W.floor.visible = !below; W.ring.material.color.setScalar(4 + Math.sin(S.t * 1.6) * 1.2).multiply(new THREE.Color(0x3edbf7));
  W.garage.children.forEach(o => { if (o.geometry?.type === 'CylinderGeometry' && o.position.y < .05) o.visible = !below });
  // дорога едет навстречу
  S.speed = lerp(S.speed, W.k === 'road' && S.drive ? 16 : 0, .02);
  if (W.k === 'road') {
    const dx = S.speed * dt; W.asphalt.offset.x -= dx / 10; W.grass.offset.x -= dx / 7.5;
    for (const pr of W.props) { pr.position.x += dx; if (pr.position.x > 130) pr.position.x -= 260 }
    const lamps = W.props.slice(0, 14).sort((a, b) => Math.abs(a.position.x) - Math.abs(b.position.x));
    W.streetL.forEach((l, i) => { const lp = lamps[i]; l.position.set(lp.position.x, 6.6, lp.position.z + (lp.position.z < 0 ? 1.4 : -1.4)) });
  }
  // разлёт
  S.explode = lerp(S.explode, S.explodeTo, .08);
  for (const [id, g] of groups) { if (!g.userData.dir) { const b = new THREE.Box3().setFromObject(g), c = b.getCenter(new THREE.Vector3()); g.userData.dir = new THREE.Vector3(c.x * .55, .25 + c.y * .9, c.z * 1.6) } g.position.copy(g.userData.dir).multiplyScalar(S.explode) }
  const spinRate = W.k === 'road' ? S.speed / .316 : (S.drive ? 6 : 0);
  for (const w of wheels) { w.userData.spin.rotation.z -= w.userData.side * dt * spinRate; w.position.z = Math.sign(w.position.z) * (TRACK / 2000 + S.explode * .5) }
  // режим «завести»
  const on = S.drive ? 1 : 0; S.beams.forEach(b => b.material.uniforms.o.value = lerp(b.material.uniforms.o.value, on * (W.k === 'road' ? 1 : .5), .06));
  S.heads.forEach(h => h.intensity = lerp(h.intensity, on * (W.k === 'road' ? 320 : 140), .08)); S.tailL.intensity = lerp(S.tailL.intensity, on * 3, .08);
  M.lamp.emissive.setScalar(lerp(M.lamp.emissive.r, on * 1.1, .08)); M.tail.emissive.setRGB(lerp(M.tail.emissive.r, .16 + on * 3.2, .08), 0, 0);
  S.dome.intensity = lerp(S.dome.intensity, S.domeOn ? 1.6 : 0, .1); if (S.domeMesh) S.domeMesh.material.emissiveIntensity = S.domeOn ? 2.5 : 0;
  car.position.y = S.drive ? Math.sin(S.t * 90) * .0012 + (W.k === 'road' ? Math.sin(S.t * 2.3) * .004 : 0) : 0;
  if (moved && ptr && !fly) { moved = false; const id = pick(); setHover(id, ptr) }
  composer.render();
}

export function init(container, o = {}) {
  opts = o; stage = container; clock = new THREE.Clock();
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio)); renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  container.appendChild(renderer.domElement);
  scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(30, 1, .05, 600);
  camera.position.set(-7.5, 3.4, 6.5);
  controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true; controls.dampingFactor = .06; controls.minDistance = .35; controls.maxDistance = 16; controls.target.set(0, .55, 0); controls.zoomSpeed = 1.1; controls.screenSpacePanning = true;
  mats(); lights();
  car = new THREE.Group(); scene.add(car);
  garage(); road(); carLights(); setWorld('garage');
  buildBody(); lamps(); accessories(); buildWheels(); buildInternals(); interior(); buildDims(o.dims || {});
  composer = new EffectComposer(renderer); composer.addPass(new RenderPass(scene, camera));
  // одиночные пересвеченные пиксели (зеркальные блики, NaN) bloom превращает в квадрат: ограничиваем яркость
  composer.addPass(new ShaderPass({ uniforms: { tDiffuse: { value: null } }, vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform sampler2D tDiffuse; varying vec2 vUv; void main(){ vec4 c = texture2D(tDiffuse, vUv); if (any(isnan(c)) || any(isinf(c))) c = vec4(0.,0.,0.,1.); gl_FragColor = vec4(min(c.rgb, vec3(5.)), c.a); }` }));
  bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), .5, .45, 3.2); composer.addPass(bloom); composer.addPass(new OutputPass());
  RO = new ResizeObserver(resize); RO.observe(container); resize();
  const el = renderer.domElement;
  el.addEventListener('pointermove', e => { const r = el.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1); ptr = e; moved = true });
  el.addEventListener('pointerleave', () => { ptr = null; setHover(null) });
  el.addEventListener('pointerdown', e => { downAt = [e.clientX, e.clientY]; fly = null });
  el.addEventListener('pointerup', e => {
    if (!downAt || Math.hypot(e.clientX - downAt[0], e.clientY - downAt[1]) > 6) return;
    const r = el.getBoundingClientRect(); ndc.set((e.clientX - r.left) / r.width * 2 - 1, -(e.clientY - r.top) / r.height * 2 + 1);
    const id = pick(); if (id) { focus(id); opts.onPick?.(id) } else opts.onPick?.(null);
  });
  loop();
  flyTo(new THREE.Vector3(0, .55, 0), new THREE.Vector3(...VIEWS.q), matchMedia('(prefers-reduced-motion: reduce)').matches ? 1 : 3200);
  return api;
}
const EYE = { driver: [2440, 370, 1140], passenger: [2440, -370, 1140], rear: [3260, 380, 1100] };
function seat(k) { const e = V(...(EYE[k] || EYE.driver)); flyTo(e, e.clone().add(new THREE.Vector3(.06, 0, 0)), 900) }
function controlsFor(inside) {
  controls.minDistance = inside ? .02 : .35; controls.maxDistance = inside ? .9 : 16; controls.enablePan = !inside; controls.rotateSpeed = inside ? -.45 : 1;
  camera.near = inside ? .01 : .05; S.inside = inside; resize(); S.innerShell.visible = true;
}
function clearFlow() { (S.flow || []).forEach(id => highlight(id, false)); S.flow = [] }
function flow(ids) { clearFlow(); if (!ids?.length) return; if (!S.xray) setXray(true); S.flow = ids; ids.forEach(id => highlight(id, true, true)) }
function preset(name) {
  if (S.sel) { highlight(S.sel, false); S.sel = null } clearFlow(); S.dims.visible = false; S.explodeTo = 0; S.domeOn = false;
  const o0 = new THREE.Vector3(0, .55, 0);
  controlsFor(name === 'salon');
  if (name === 'drive') { setWorld('road'); setXray(false); S.sys = null; applySys(); S.drive = true; flyTo(new THREE.Vector3(-.4, .6, 0), new THREE.Vector3(5.6, 1.7, 4.4), 1600) }
  else { setWorld('garage'); S.drive = false }
  if (name === 'engine') { setXray(true); S.sys = 'engine'; applySys(); const c = V(620, 0, 600); flyTo(c, c.clone().add(new THREE.Vector3(-1.5, 1.1, 2.1))) }
  if (name === 'mmt') { setXray(true); S.sys = 'trans'; applySys(); const c = V(720, 250, 480); flyTo(c, c.clone().add(new THREE.Vector3(-1.2, .9, 1.9))) }
  if (name === 'salon') { setXray(false); S.sys = null; applySys(); S.domeOn = true; seat('driver') }
  if (name === 'size') { setXray(false); S.sys = null; applySys(); S.dims.visible = true; flyTo(o0, new THREE.Vector3(-5.2, 3.4, 6.6)) }
  if (name === 'car') { setXray(false); S.sys = null; applySys(); flyTo(o0, new THREE.Vector3(...VIEWS.q)) }
  opts.onState?.(state());
}
function mount(el) { if (!el || stage === el) return; el.appendChild(renderer.domElement); stage = el; RO.disconnect(); RO.observe(el); resize() }
export const api = {
  mount, preset, seat, flow, clearFlow, camTo: (p, t) => flyTo(new THREE.Vector3(...t), new THREE.Vector3(...p)), dims: l => buildDims(l), dome: v => { S.domeOn = v }, world: setWorld,
  focus, view, setXray: v => { setXray(v); opts.onState?.(state()) }, setSystem,
  explode: v => { S.explodeTo = v ? 1 : 0; if (v && !S.xray) setXray(true); opts.onState?.(state()) },
  drive: v => { S.drive = v; opts.onState?.(state()) }, state,
  setPaint: hex => { M.paint.color.set(hex); M.paintSolid?.color.set(hex) },
  ids: () => new Set([...idList, ...meshesById.keys()]),
  zoom: k => { const d = camera.position.clone().sub(controls.target); camera.position.copy(controls.target).add(d.multiplyScalar(k)) },
  clear: () => { if (S.sel) highlight(S.sel, false); S.sel = null },
};
