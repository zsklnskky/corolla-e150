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
let renderer, scene, camera, controls, composer, bloom, clock, stage, car, bodyMesh, bodyIds, bodyColors, idList = [];
const meshesById = new Map(), groups = new Map(), pickables = [], wheels = [], internals = [], xrayMats = [];
const M = {}; // материалы
const S = { xray: false, sys: null, explode: 0, explodeTo: 0, drive: false, hover: null, sel: null, t: 0 };
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
    for (let i = 0; i < n; i++) for (let j = 0; j <= rows; j++) { const x = clamp(lerp(U[i][0], D[i][0], j / rows), 0, L - 2), s0 = section(x), z = clamp(lerp(U[i][1], D[i][1], j / rows), s0.zb + 8, s0.zt - 14), v = V(x, side * (Math.max(0, sideY(x, z)) + off), z); pos.push(v.x, v.y, v.z); uv.push(i / (n - 1), j / rows) }
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

// ---------- космос и платформа ----------
function space() {
  const sky = new THREE.Mesh(new THREE.SphereGeometry(220, 48, 32), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms: { t: { value: 0 } },
    vertexShader: `varying vec3 p; void main(){ p = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `uniform float t; varying vec3 p;
      float h(vec3 q){ return fract(sin(dot(q,vec3(12.9898,78.233,37.719)))*43758.5453); }
      float n(vec3 q){ vec3 i=floor(q), f=fract(q); f=f*f*(3.-2.*f); return mix(mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y),mix(mix(h(i+vec3(0,0,1)),h(i+vec3(1,0,1)),f.x),mix(h(i+vec3(0,1,1)),h(i+vec3(1,1,1)),f.x),f.y),f.z); }
      float fbm(vec3 q){ float s=0., a=.5; for(int i=0;i<5;i++){ s+=a*n(q); q*=2.03; a*=.5; } return s; }
      void main(){ vec3 q = p*2.2 + vec3(t*.004,0.,0.); float a = fbm(q), b = fbm(q*1.7+4.);
        vec3 c = vec3(.012,.01,.035);
        c += vec3(.35,.12,.55)*pow(a,3.)*1.1 + vec3(.05,.35,.5)*pow(b,4.)*1.2 + vec3(.6,.15,.35)*pow(a*b,3.)*.9;
        c *= .55 + .45*smoothstep(-.2,.6,p.y);
        gl_FragColor = vec4(c,1.); }` }));
  scene.add(sky); S.sky = sky;
  const N = 4200, g = new THREE.BufferGeometry(), p = new Float32Array(N * 3), col = new Float32Array(N * 3), sz = new Float32Array(N);
  const tint = [new THREE.Color(0xffffff), new THREE.Color(0xb9d4ff), new THREE.Color(0xffc6ec), new THREE.Color(0xc9b8ff)];
  for (let i = 0; i < N; i++) { const v = new THREE.Vector3().randomDirection().multiplyScalar(60 + Math.random() * 120); p.set([v.x, Math.abs(v.y) * .9 + v.y * .1, v.z], i * 3); tint[i % 4].toArray(col, i * 3); sz[i] = Math.random() ** 3 * 3 + .6 }
  g.setAttribute('position', new THREE.BufferAttribute(p, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3)); g.setAttribute('s', new THREE.BufferAttribute(sz, 1));
  const stars = new THREE.Points(g, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, vertexColors: true, uniforms: { t: { value: 0 } },
    vertexShader: `attribute float s; varying vec3 vc; varying float tw; uniform float t; void main(){ vc = color; tw = .55+.45*sin(t*1.7+position.x*3.1+position.z); vec4 mv = modelViewMatrix*vec4(position,1.); gl_PointSize = s*tw*(300./-mv.z); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `varying vec3 vc; varying float tw; void main(){ float d = length(gl_PointCoord-.5); gl_FragColor = vec4(vc*1.6, smoothstep(.5,0.,d)*tw); }` }));
  scene.add(stars); S.stars = stars;
  // платформа
  const plat = new THREE.Group(); scene.add(plat); S.plat = plat;
  const disc = new THREE.Mesh(new THREE.CircleGeometry(4.6, 96), new THREE.MeshStandardMaterial({ color: 0x07060e, metalness: .75, roughness: .5, transparent: true, opacity: .92 }));
  disc.rotation.x = -Math.PI / 2; plat.add(disc); S.disc = disc;
  const ring = (r, w, c, op, th = Math.PI * 2, st = 0) => { const m = new THREE.Mesh(new THREE.RingGeometry(r, r + w, 160, 1, st, th), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(3.4), transparent: true, opacity: op, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide })); m.rotation.x = -Math.PI / 2; m.position.y = .003; plat.add(m); return m };
  S.rings = [ring(4.55, .03, 0x7b5cff, .9), ring(3.4, .012, 0x3edbf7, .7, Math.PI * 1.4), ring(3.9, .02, 0xff7ac6, .55, Math.PI * .6, 1), ring(2.95, .006, 0xffffff, .35), ring(4.2, .008, 0x3edbf7, .5, Math.PI * .3, 3)];
  const tick = new THREE.BufferGeometry(), tp = [];
  for (let i = 0; i < 144; i++) { const a = i / 144 * Math.PI * 2, r1 = 4.3, r2 = i % 12 ? 4.4 : 4.5; tp.push(Math.cos(a) * r1, .004, Math.sin(a) * r1, Math.cos(a) * r2, .004, Math.sin(a) * r2) }
  tick.setAttribute('position', new THREE.Float32BufferAttribute(tp, 3));
  plat.add(new THREE.LineSegments(tick, new THREE.LineBasicMaterial({ color: 0x9fb4ff, transparent: true, opacity: .5 })));
  // контактная тень
  const c = document.createElement('canvas'); c.width = 256; c.height = 128; const x = c.getContext('2d');
  const gr = x.createRadialGradient(128, 64, 4, 128, 64, 128); gr.addColorStop(0, 'rgba(0,0,0,.85)'); gr.addColorStop(.55, 'rgba(0,0,0,.45)'); gr.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = gr; x.fillRect(0, 0, 256, 128);
  const sh = new THREE.Mesh(new THREE.PlaneGeometry(5.6, 2.6), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthWrite: false }));
  sh.rotation.x = -Math.PI / 2; sh.position.y = .006; plat.add(sh); S.shadow = sh;
  // пылинки
  const dn = 600, dg = new THREE.BufferGeometry(), dp = new Float32Array(dn * 3);
  for (let i = 0; i < dn; i++) { const a = Math.random() * 6.28, r = 1 + Math.random() * 5; dp.set([Math.cos(a) * r, Math.random() * 3, Math.sin(a) * r], i * 3) }
  dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
  S.dust = new THREE.Points(dg, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
    vertexShader: `varying float f; void main(){ vec4 mv = modelViewMatrix*vec4(position,1.); float d = -mv.z; f = smoothstep(1.2,3.,d)*(1.-smoothstep(9.,14.,d)); gl_PointSize = 2.2*(6./d); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `varying float f; void main(){ float r = length(gl_PointCoord-.5); gl_FragColor = vec4(vec3(.72,.66,1.), smoothstep(.5,.0,r)*.55*f); }` })); scene.add(S.dust);
  // световые конусы фар
  S.beams = [];
  for (const s of [1, -1]) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(1.1, 6, 40, 1, true), new THREE.ShaderMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, uniforms: { o: { value: 0 } },
      vertexShader: `varying float v; void main(){ v = uv.y; gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
      fragmentShader: `uniform float o; varying float v; void main(){ gl_FragColor = vec4(vec3(.85,.92,1.)*o, pow(v,2.5)*.22*o); }` }));
    cone.rotation.z = -Math.PI / 2; cone.position.copy(V(-2950, s * 640, 640)); car.add(cone); S.beams.push(cone);
  }
}

// ---------- свет ----------
function lights() {
  // своё окружение-автостудия: тёмный купол и длинные софтбоксы -> на лаке полосы бликов, а не квадрат
  const pm = new THREE.PMREMGenerator(renderer), env = new THREE.Scene();
  env.add(new THREE.Mesh(new THREE.SphereGeometry(30, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide,
    vertexShader: `varying vec3 p; void main(){ p = normalize(position); gl_Position = projectionMatrix*modelViewMatrix*vec4(position,1.); }`,
    fragmentShader: `varying vec3 p; void main(){ vec3 c = mix(vec3(.02,.018,.04), vec3(.16,.14,.3), smoothstep(-.1,.9,p.y)); c += vec3(.25,.12,.4)*pow(max(0.,1.-abs(p.y)),6.)*.6; gl_FragColor = vec4(c,1.); }` })));
  const strip = (c, i, p, s) => { const m = new THREE.Mesh(new THREE.BoxGeometry(...s), new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(i) })); m.position.set(...p); env.add(m) };
  for (const z of [-1.6, 0, 1.6]) strip(0xffffff, 2.6, [0, 8, z], [16, .1, .35]);
  strip(0x9a7bff, .9, [0, 2.2, 9], [18, .6, .1]); strip(0x3edbf7, 1.1, [0, 2.6, -9], [18, .5, .1]);
  strip(0xffffff, 1.2, [-10, 3, 0], [.1, 3, 8]); strip(0xff7ac6, .8, [10, 2, 0], [.1, 2, 8]);
  scene.environment = pm.fromScene(env, .02).texture; scene.environmentIntensity = 1.35;
  const key = new THREE.DirectionalLight(0xffffff, 1.7); key.position.set(-3, 6, 4); scene.add(key);
  const rim1 = new THREE.DirectionalLight(0x8a6bff, .9); rim1.position.set(5, 2, -5); scene.add(rim1);
  const rim2 = new THREE.DirectionalLight(0x3edbf7, .7); rim2.position.set(-6, 1.5, -3); scene.add(rim2);
  scene.add(new THREE.HemisphereLight(0x9aa6ff, 0x120f22, .9));
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
    const mm = m.userData.ownMat || (m.userData.ownMat = m.material.clone()); m.material = mm;
    mm.transparent = !!dim; mm.opacity = dim ? .07 : 1; mm.depthWrite = !dim;
    if (!m.userData.e0) m.userData.e0 = mm.emissive.clone();
    m.userData.e0 = new THREE.Color(S.xray && !dim ? c : 0x000000).multiplyScalar(S.xray ? .32 : 0);
    if (m.userData.id !== S.sel && m.userData.id !== S.hover) mm.emissive.copy(m.userData.e0);
  }
  for (const w of wheels) w.traverse(o => { if (o.isMesh) { o.material.transparent = !!S.sys && S.sys !== 'chassis' && S.sys !== 'brake'; o.material.opacity = o.material.transparent ? .12 : 1 } });
}
function setSystem(sys) { S.sys = sys || null; if (S.sys && !S.xray && S.sys !== 'body' && S.sys !== 'light') setXray(true); applySys(); opts.onState?.(state()) }
const state = () => ({ xray: S.xray, sys: S.sys, explode: S.explodeTo > 0, drive: S.drive });

// ---------- цикл ----------
function resize() { const r = stage.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return; renderer.setSize(r.width, r.height, false); camera.aspect = r.width / r.height; camera.fov = camera.aspect < 1.2 ? Math.min(70, 30 * 1.2 / camera.aspect * .85) : 30; camera.updateProjectionMatrix(); composer.setSize(r.width, r.height) }
function loop() {
  requestAnimationFrame(loop); if (document.hidden || !stage.offsetParent || renderer.domElement.width < 2) return;
  const dt = Math.min(.05, clock.getDelta()); S.t += dt;
  if (fly) { const u = Math.min(1, (performance.now() - fly.t0) / fly.ms), e = 1 - Math.pow(1 - u, 4); controls.target.lerpVectors(fly.ft, fly.tt, e); camera.position.lerpVectors(fly.fp, fly.tp, e); if (u >= 1) fly = null }
  controls.update();
  M.holo.uniforms.t.value = S.t; S.sky.material.uniforms.t.value = S.t; S.stars.material.uniforms.t.value = S.t;
  S.rings.forEach((r, i) => r.rotation.z += dt * (i % 2 ? -.06 : .04) * (S.drive ? 6 : 1));
  S.dust.rotation.y += dt * .02; S.stars.rotation.y += dt * .002;
  const below = camera.position.y < .05; S.disc.material.opacity = lerp(S.disc.material.opacity, below ? .08 : .92, .1); S.shadow.visible = !below;
  // разлёт
  S.explode = lerp(S.explode, S.explodeTo, .08);
  for (const [id, g] of groups) { if (!g.userData.dir) { const b = new THREE.Box3().setFromObject(g), c = b.getCenter(new THREE.Vector3()); g.userData.dir = new THREE.Vector3(c.x * .55, .25 + c.y * .9, c.z * 1.6) } g.position.copy(g.userData.dir).multiplyScalar(S.explode) }
  for (const w of wheels) { w.userData.spin.rotation.z -= w.userData.side * dt * (S.drive ? 14 : 0); w.position.z = Math.sign(w.position.z) * (TRACK / 2000 + S.explode * .5) }
  // режим «завести»
  const on = S.drive ? 1 : 0; S.beams.forEach(b => b.material.uniforms.o.value = lerp(b.material.uniforms.o.value, on, .06));
  M.lamp.emissive.setScalar(lerp(M.lamp.emissive.r, on * 1.6, .08)); M.tail.emissive.setRGB(lerp(M.tail.emissive.r, .16 + on * 1.4, .08), 0, 0);
  if (S.drive) car.position.y = Math.sin(S.t * 90) * .0012;
  if (moved && ptr && !fly) { moved = false; const id = pick(); setHover(id, ptr) }
  composer.render();
}

export function init(container, o = {}) {
  opts = o; stage = container; clock = new THREE.Clock();
  renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio)); renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.05;
  container.appendChild(renderer.domElement);
  scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(30, 1, .05, 600);
  camera.position.set(-16, 7, 18);
  controls = new OrbitControls(camera, renderer.domElement); controls.enableDamping = true; controls.dampingFactor = .06; controls.minDistance = .35; controls.maxDistance = 16; controls.target.set(0, .55, 0); controls.zoomSpeed = 1.1; controls.screenSpacePanning = true;
  mats(); lights();
  car = new THREE.Group(); scene.add(car); space();
  buildBody(); lamps(); accessories(); buildWheels(); buildInternals();
  composer = new EffectComposer(renderer); composer.addPass(new RenderPass(scene, camera));
  bloom = new UnrealBloomPass(new THREE.Vector2(512, 512), .5, .45, 2.2); composer.addPass(bloom); composer.addPass(new OutputPass());
  new ResizeObserver(resize).observe(container); resize();
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
export const api = {
  focus, view, setXray: v => { setXray(v); opts.onState?.(state()) }, setSystem,
  explode: v => { S.explodeTo = v ? 1 : 0; if (v && !S.xray) setXray(true); opts.onState?.(state()) },
  drive: v => { S.drive = v; opts.onState?.(state()) }, state,
  setPaint: hex => { M.paint.color.set(hex); M.paintSolid?.color.set(hex) },
  ids: () => new Set([...idList, ...meshesById.keys()]),
  zoom: k => { const d = camera.position.clone().sub(controls.target); camera.position.copy(controls.target).add(d.multiplyScalar(k)) },
  clear: () => { if (S.sel) highlight(S.sel, false); S.sel = null },
};
