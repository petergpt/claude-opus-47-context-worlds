// Stonehenge — solstice light scene
// Three.js r160 via importmap
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

// ────────────────────────────────────────────────────────────────────────────
// Deterministic Perlin noise + fbm helper. Used everywhere for stone shapes,
// terrain displacement, lichen/chalk masks, etc.
// ────────────────────────────────────────────────────────────────────────────
class Noise {
  constructor(seed = 1) {
    this.p = new Uint8Array(512);
    const perm = new Array(256);
    for (let i = 0; i < 256; i++) perm[i] = i;
    let s = seed | 0 || 1;
    for (let i = 255; i > 0; i--) {
      s = (s * 16807) % 2147483647;
      const j = Math.abs(s) % (i + 1);
      [perm[i], perm[j]] = [perm[j], perm[i]];
    }
    for (let i = 0; i < 512; i++) this.p[i] = perm[i & 255];
  }
  fade(t){return t*t*t*(t*(t*6-15)+10);}
  grad(h,x,y,z){
    h&=15;
    const u=h<8?x:y;
    const v=h<4?y:(h===12||h===14?x:z);
    return ((h&1)===0?u:-u)+((h&2)===0?v:-v);
  }
  perlin(x,y,z=0){
    const X=Math.floor(x)&255,Y=Math.floor(y)&255,Z=Math.floor(z)&255;
    x-=Math.floor(x);y-=Math.floor(y);z-=Math.floor(z);
    const u=this.fade(x),v=this.fade(y),w=this.fade(z);
    const p=this.p;
    const A=p[X]+Y,AA=p[A]+Z,AB=p[A+1]+Z;
    const B=p[X+1]+Y,BA=p[B]+Z,BB=p[B+1]+Z;
    const lerp=(a,b,t)=>a+t*(b-a);
    return lerp(
      lerp(
        lerp(this.grad(p[AA],x,y,z),this.grad(p[BA],x-1,y,z),u),
        lerp(this.grad(p[AB],x,y-1,z),this.grad(p[BB],x-1,y-1,z),u),v),
      lerp(
        lerp(this.grad(p[AA+1],x,y,z-1),this.grad(p[BA+1],x-1,y,z-1),u),
        lerp(this.grad(p[AB+1],x,y-1,z-1),this.grad(p[BB+1],x-1,y-1,z-1),u),v),
      w);
  }
  fbm(x,y,z=0,oct=4,gain=0.5,lac=2){
    let sum=0,amp=1,freq=1,max=0;
    for(let i=0;i<oct;i++){
      sum+=this.perlin(x*freq,y*freq,z*freq)*amp;
      max+=amp;amp*=gain;freq*=lac;
    }
    return sum/max;
  }
}
const noise = new Noise(7);

// ────────────────────────────────────────────────────────────────────────────
// Renderer / Scene / Camera
// ────────────────────────────────────────────────────────────────────────────
const canvas = document.getElementById('view');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.05;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFShadowMap; // crisp, near-hard contact

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0xb6c0c8, 0.0042);

const camera = new THREE.PerspectiveCamera(50, 1, 0.5, 2000);
const AVENUE_DIR = new THREE.Vector3(Math.sin(THREE.MathUtils.degToRad(49)), 0, -Math.cos(THREE.MathUtils.degToRad(49))).normalize();
const AVENUE_CAM = AVENUE_DIR.clone().multiplyScalar(58).setY(2.0);
camera.position.copy(AVENUE_CAM);
camera.lookAt(0, 2.5, 0);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.minDistance = 4;
controls.maxDistance = 220;
controls.maxPolarAngle = Math.PI / 2 - 0.02;
controls.target.set(0, 2.5, 0);

function resize() {
  const w = window.innerWidth, h = window.innerHeight;
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
resize();

// ────────────────────────────────────────────────────────────────────────────
// Sky — gradient dome with sun-aware tinting via shader
// ────────────────────────────────────────────────────────────────────────────
const skyUniforms = {
  sunDir: { value: new THREE.Vector3(0, 1, 0) },
  zenith: { value: new THREE.Color(0x4d7396) },
  horizon: { value: new THREE.Color(0xd6c8b2) },
  sunCol: { value: new THREE.Color(0xffd9a3) },
};
const skyGeo = new THREE.SphereGeometry(900, 32, 16);
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide,
  depthWrite: false,
  uniforms: skyUniforms,
  vertexShader: /* glsl */`
    varying vec3 vWorldDir;
    void main(){
      vec4 wp = modelMatrix * vec4(position, 1.0);
      vWorldDir = normalize(wp.xyz);
      gl_Position = projectionMatrix * viewMatrix * wp;
    }`,
  fragmentShader: /* glsl */`
    varying vec3 vWorldDir;
    uniform vec3 sunDir, zenith, horizon, sunCol;
    void main(){
      vec3 d = normalize(vWorldDir);
      float h = clamp(d.y, -0.1, 1.0);
      // bias horizon band
      float t = pow(1.0 - h, 1.6);
      vec3 sky = mix(zenith, horizon, t);
      // sun glow
      float sd = max(0.0, dot(d, normalize(sunDir)));
      float disk = smoothstep(0.998, 1.0, sd);
      float halo = pow(sd, 18.0) * 0.55;
      // warm horizon when sun is low
      float lowSun = smoothstep(0.0, 0.35, sunDir.y);
      vec3 warm = mix(vec3(1.0,0.62,0.38), sunCol, lowSun);
      sky += halo * warm + disk * vec3(1.6,1.35,1.05);
      // subtle ground shading below horizon
      sky *= smoothstep(-0.1, 0.05, d.y) * 0.9 + 0.15;
      gl_FragColor = vec4(sky, 1.0);
    }`,
});
scene.add(new THREE.Mesh(skyGeo, skyMat));

// ────────────────────────────────────────────────────────────────────────────
// Sun — directional light with high-res shadow map + soft ambient/hemi fill
// ────────────────────────────────────────────────────────────────────────────
const sun = new THREE.DirectionalLight(0xffeacc, 3.4);
sun.castShadow = true;
sun.shadow.mapSize.set(4096, 4096);
sun.shadow.camera.near = 5;
sun.shadow.camera.far = 220;
sun.shadow.camera.left = -90;
sun.shadow.camera.right = 90;
sun.shadow.camera.top = 90;
sun.shadow.camera.bottom = -90;
sun.shadow.bias = -0.0003;
sun.shadow.normalBias = 0.04;
scene.add(sun);
scene.add(sun.target);

const hemi = new THREE.HemisphereLight(0xa8c0d8, 0x6b5a44, 0.55);
scene.add(hemi);

const ambient = new THREE.AmbientLight(0xffffff, 0.08);
scene.add(ambient);

function setSun(azDeg, elDeg) {
  const az = THREE.MathUtils.degToRad(azDeg);
  const el = THREE.MathUtils.degToRad(Math.max(elDeg, -2));
  const r = 140;
  const dir = new THREE.Vector3(
    Math.sin(az) * Math.cos(el),
    Math.sin(el),
    -Math.cos(az) * Math.cos(el)
  );
  sun.position.copy(dir).multiplyScalar(r);
  sun.target.position.set(0, 0, 0);
  sun.target.updateMatrixWorld();

  // Sun intensity / color shifts with elevation
  const e = THREE.MathUtils.clamp(elDeg / 60, 0, 1);
  const warm = new THREE.Color(0xffb37a);
  const cool = new THREE.Color(0xfff1d6);
  const c = warm.clone().lerp(cool, Math.pow(e, 0.6));
  sun.color.copy(c);
  sun.intensity = 1.6 + 2.6 * e;

  hemi.intensity = 0.32 + 0.45 * e;
  ambient.intensity = 0.05 + 0.06 * e;
  renderer.toneMappingExposure = 0.95 + 0.15 * e;

  skyUniforms.sunDir.value.copy(dir);
  skyUniforms.horizon.value.setHSL(0.09, 0.35, THREE.MathUtils.lerp(0.55, 0.78, e));
  skyUniforms.zenith.value.setHSL(0.58, 0.38, THREE.MathUtils.lerp(0.36, 0.55, e));
  skyUniforms.sunCol.value.copy(c);

  scene.fog.color.setHSL(0.09, 0.18, THREE.MathUtils.lerp(0.62, 0.78, e));

  // Update compass overlay sun line
  const sunLine = document.getElementById('sun-line');
  if (sunLine) {
    const len = 92;
    const x = Math.sin(az) * len;
    const y = -Math.cos(az) * len;
    sunLine.setAttribute('x2', x.toFixed(1));
    sunLine.setAttribute('y2', y.toFixed(1));
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Procedural canvas textures — chalk ground & subtle stone normal
// ────────────────────────────────────────────────────────────────────────────
function makeChalkTextures() {
  const size = 1024;
  // Color map
  const cv = document.createElement('canvas'); cv.width = cv.height = size;
  const cx = cv.getContext('2d');
  cx.fillStyle = '#9a9082'; cx.fillRect(0, 0, size, size);
  // grass-tinted base patches
  for (let i = 0; i < 80; i++) {
    const x = Math.random() * size, y = Math.random() * size, r = 80 + Math.random() * 220;
    const g = cx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(146,150,108,${0.18 + Math.random() * 0.22})`);
    g.addColorStop(1, 'rgba(146,150,108,0)');
    cx.fillStyle = g; cx.fillRect(0, 0, size, size);
  }
  // chalk patches (lighter)
  for (let i = 0; i < 240; i++) {
    const x = Math.random() * size, y = Math.random() * size, r = 8 + Math.random() * 60;
    const g = cx.createRadialGradient(x, y, 0, x, y, r);
    const a = 0.25 + Math.random() * 0.45;
    g.addColorStop(0, `rgba(238,228,208,${a})`);
    g.addColorStop(1, 'rgba(238,228,208,0)');
    cx.fillStyle = g; cx.fillRect(0, 0, size, size);
  }
  // dark earth patches
  for (let i = 0; i < 160; i++) {
    const x = Math.random() * size, y = Math.random() * size, r = 10 + Math.random() * 80;
    const g = cx.createRadialGradient(x, y, 0, x, y, r);
    const a = 0.18 + Math.random() * 0.3;
    g.addColorStop(0, `rgba(72,60,46,${a})`);
    g.addColorStop(1, 'rgba(72,60,46,0)');
    cx.fillStyle = g; cx.fillRect(0, 0, size, size);
  }
  // fine speckle
  const data = cx.getImageData(0, 0, size, size);
  for (let i = 0; i < data.data.length; i += 4) {
    const n = (Math.random() - 0.5) * 28;
    data.data[i] = Math.max(0, Math.min(255, data.data[i] + n));
    data.data[i + 1] = Math.max(0, Math.min(255, data.data[i + 1] + n));
    data.data[i + 2] = Math.max(0, Math.min(255, data.data[i + 2] + n));
  }
  cx.putImageData(data, 0, 0);

  // Normal map derived from a height pass (procedural noise via the same canvas at lower freq)
  const nv = document.createElement('canvas'); nv.width = nv.height = size;
  const nctx = nv.getContext('2d');
  const himg = nctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size * 6, v = y / size * 6;
      const h = noise.fbm(u, v, 0, 5) * 0.5 + 0.5;
      const i = (y * size + x) * 4;
      const c = Math.floor(h * 255);
      himg.data[i] = c; himg.data[i + 1] = c; himg.data[i + 2] = c; himg.data[i + 3] = 255;
    }
  }
  nctx.putImageData(himg, 0, 0);
  // sobel to normal
  const sob = nctx.getImageData(0, 0, size, size);
  const out = nctx.createImageData(size, size);
  const sample = (x, y) => sob.data[((y & (size - 1)) * size + (x & (size - 1))) * 4] / 255;
  const strength = 2.5;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const tl = sample(x - 1, y - 1), t = sample(x, y - 1), tr = sample(x + 1, y - 1);
      const l = sample(x - 1, y), r = sample(x + 1, y);
      const bl = sample(x - 1, y + 1), b = sample(x, y + 1), br = sample(x + 1, y + 1);
      const dx = (tr + 2 * r + br) - (tl + 2 * l + bl);
      const dy = (bl + 2 * b + br) - (tl + 2 * t + tr);
      const nx = -dx * strength, ny = -dy * strength, nz = 1;
      const len = Math.hypot(nx, ny, nz);
      const i = (y * size + x) * 4;
      out.data[i] = Math.floor((nx / len * 0.5 + 0.5) * 255);
      out.data[i + 1] = Math.floor((ny / len * 0.5 + 0.5) * 255);
      out.data[i + 2] = Math.floor((nz / len * 0.5 + 0.5) * 255);
      out.data[i + 3] = 255;
    }
  }
  nctx.putImageData(out, 0, 0);

  // roughness map — chalk = high rough; darker patches = a bit lower
  const rv = document.createElement('canvas'); rv.width = rv.height = size;
  const rctx = rv.getContext('2d');
  const rimg = rctx.createImageData(size, size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = x / size * 8, v = y / size * 8;
      const n = noise.fbm(u + 23, v - 11, 0, 4) * 0.5 + 0.5;
      const r = Math.floor((0.78 + n * 0.18) * 255);
      const i = (y * size + x) * 4;
      rimg.data[i] = r; rimg.data[i + 1] = r; rimg.data[i + 2] = r; rimg.data[i + 3] = 255;
    }
  }
  rctx.putImageData(rimg, 0, 0);

  const colorTex = new THREE.CanvasTexture(cv);
  colorTex.wrapS = colorTex.wrapT = THREE.RepeatWrapping;
  colorTex.colorSpace = THREE.SRGBColorSpace;
  colorTex.anisotropy = 8;

  const normalTex = new THREE.CanvasTexture(nv);
  normalTex.wrapS = normalTex.wrapT = THREE.RepeatWrapping;
  normalTex.anisotropy = 8;

  const roughTex = new THREE.CanvasTexture(rv);
  roughTex.wrapS = roughTex.wrapT = THREE.RepeatWrapping;
  roughTex.anisotropy = 8;

  return { colorTex, normalTex, roughTex };
}

// ────────────────────────────────────────────────────────────────────────────
// Terrain — large displaced plane built with BufferGeometry
// ────────────────────────────────────────────────────────────────────────────
const TERRAIN_SIZE = 600;
const TERRAIN_SEG = 220;

function buildTerrain() {
  const geo = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, TERRAIN_SEG, TERRAIN_SEG);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const colA = new THREE.Color(0xa39a86); // earthy
  const colB = new THREE.Color(0xe5dcc6); // chalk
  const colC = new THREE.Color(0x7e7a4f); // grass-tinted
  const colD = new THREE.Color(0x4f4633); // dark earth
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    // gentle rolling height; flatten the inner plateau where the monument stands
    const dist = Math.hypot(x, z);
    const broad = noise.fbm(x * 0.005, z * 0.005, 0, 4) * 6;
    const fine = noise.fbm(x * 0.05, z * 0.05, 0, 3) * 0.35;
    const flatten = THREE.MathUtils.smoothstep(THREE.MathUtils.clamp(dist, 0, 80), 80, 22);
    const h = THREE.MathUtils.lerp(broad + fine, fine * 0.5, flatten);
    pos.setY(i, h);

    // vertex tint based on terrain noise
    const m1 = noise.fbm(x * 0.04 + 11, z * 0.04 - 7, 0, 4) * 0.5 + 0.5;
    const m2 = noise.fbm(x * 0.18 + 91, z * 0.18 + 5, 0, 3) * 0.5 + 0.5;
    let c = colA.clone().lerp(colC, THREE.MathUtils.smoothstep(0.3, 0.7, m1));
    c.lerp(colB, Math.max(0, m2 - 0.55) * 1.3);
    c.lerp(colD, Math.max(0, 0.32 - m1) * 1.2);
    // brighten near monument plateau
    c.lerp(colB, flatten * 0.18);
    colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();

  const { colorTex, normalTex, roughTex } = makeChalkTextures();
  colorTex.repeat.set(40, 40);
  normalTex.repeat.set(60, 60);
  roughTex.repeat.set(60, 60);

  const mat = new THREE.MeshStandardMaterial({
    map: colorTex,
    normalMap: normalTex,
    normalScale: new THREE.Vector2(1.2, 1.2),
    roughnessMap: roughTex,
    roughness: 0.96,
    metalness: 0,
    vertexColors: true,
    color: 0xffffff,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.receiveShadow = true;
  return mesh;
}
const terrain = buildTerrain();
scene.add(terrain);

// helper: terrain height at any (x,z) so we can place objects on the surface
function heightAt(x, z) {
  const dist = Math.hypot(x, z);
  const broad = noise.fbm(x * 0.005, z * 0.005, 0, 4) * 6;
  const fine = noise.fbm(x * 0.05, z * 0.05, 0, 3) * 0.35;
  const flatten = THREE.MathUtils.smoothstep(THREE.MathUtils.clamp(dist, 0, 80), 80, 22);
  return THREE.MathUtils.lerp(broad + fine, fine * 0.5, flatten);
}

// ────────────────────────────────────────────────────────────────────────────
// Stones — irregular blocks built from a subdivided box, displaced per-vertex
// with fbm noise. Per-vertex color carries lichen/moss/weathering variation.
// ────────────────────────────────────────────────────────────────────────────
function makeStoneGeometry(w, h, d, opts = {}) {
  const seed = opts.seed ?? Math.random() * 1000;
  const ns = new Noise(Math.floor(seed));
  const segW = opts.segW ?? 5, segH = opts.segH ?? 9, segD = opts.segD ?? 5;
  const taper = opts.taper ?? 0;        // narrow at top
  const lean = opts.lean ?? 0;          // slight tilt
  const rough = opts.rough ?? 0.18;     // displacement amplitude (fraction of size)
  const erode = opts.erode ?? 0.7;      // edge erosion strength

  const geo = new THREE.BoxGeometry(w, h, d, segW, segH, segD);
  const pos = geo.attributes.position;

  // Displace per-vertex with noise; compute UVs as planar after.
  for (let i = 0; i < pos.count; i++) {
    let x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    // taper top
    const ty = (y + h / 2) / h; // 0 bottom .. 1 top
    const taperK = 1 - ty * taper;
    x *= taperK; z *= taperK;
    // gentle lean along x
    x += ty * lean;
    // multi-octave displacement
    const f = 0.7;
    const nx = ns.fbm((x + 5) * f, y * f, z * f, 5);
    const ny = ns.fbm(x * f, (y + 5) * f, z * f, 5);
    const nz = ns.fbm(x * f, y * f, (z + 5) * f, 5);
    // erode corners more (where |x|,|y|,|z| approach extents)
    const ex = Math.abs(x) / (w / 2 + 0.001);
    const ey = Math.abs(y) / (h / 2 + 0.001);
    const ez = Math.abs(z) / (d / 2 + 0.001);
    const cornerK = Math.pow(Math.max(ex, ey, ez), 1.4);
    const ampX = w * rough * (0.6 + 0.6 * cornerK * erode);
    const ampY = h * rough * (0.5 + 0.4 * cornerK * erode);
    const ampZ = d * rough * (0.6 + 0.6 * cornerK * erode);
    x += nx * ampX;
    y += ny * ampY;
    z += nz * ampZ;
    pos.setXYZ(i, x, y, z);
  }
  geo.computeVertexNormals();

  // Per-vertex color: weathered sandstone base + lichen/moss patches biased upward
  const colors = new Float32Array(pos.count * 3);
  const baseWarm = new THREE.Color(0x9a8d75);   // warm sandstone
  const baseCool = new THREE.Color(0x7a7468);   // cooler grey patches
  const lichenG = new THREE.Color(0x6e7c40);    // greenish lichen
  const lichenY = new THREE.Color(0xd4a850);    // ochre crustose lichen
  const lichenW = new THREE.Color(0xcfc8a8);    // pale-green crust
  const moss = new THREE.Color(0x3f5230);
  const wet = new THREE.Color(0x2a2722);
  const norm = geo.attributes.normal;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const ny = norm.getY(i);
    const m1 = ns.fbm(x * 0.55 + 13, y * 0.55, z * 0.55, 5) * 0.5 + 0.5;
    const m2 = ns.fbm(x * 1.6 + 91, y * 1.6 - 3, z * 1.6 + 7, 4) * 0.5 + 0.5;
    const m3 = ns.fbm(x * 3.4 - 5, y * 3.4 + 21, z * 3.4, 3) * 0.5 + 0.5;
    const fine = ns.fbm(x * 8, y * 8, z * 8, 2) * 0.08;

    // base color mixes warm/cool patches across the stone
    const c = baseWarm.clone().lerp(baseCool, THREE.MathUtils.smoothstep(0.35, 0.7, m1));
    c.r += fine; c.g += fine * 0.85; c.b += fine * 0.65;

    // lichen — favored on up-facing & exposed surfaces. Three crust types based on m2/m3.
    const upBias = THREE.MathUtils.clamp(ny * 0.8 + 0.4, 0, 1);
    const lichenMask = THREE.MathUtils.smoothstep(0.48, 0.78, m2) * upBias;
    if (lichenMask > 0) {
      const t = m3;
      let k;
      if (t < 0.38) k = lichenG;
      else if (t < 0.66) k = lichenY;
      else k = lichenW;
      c.lerp(k, lichenMask * 0.85);
    }
    // small crust speckles on top
    const speck = Math.max(0, m3 - 0.78) * upBias * 1.5;
    if (speck > 0) c.lerp(lichenY, speck * 0.7);

    // moss in shaded crevices
    const mossAmt = THREE.MathUtils.smoothstep(0.48, 0.85, m1) * Math.max(0, -ny + 0.2) * 0.55;
    c.lerp(moss, mossAmt);

    // darken bottom (damp/shaded base)
    if (y < -0.4) c.lerp(wet, THREE.MathUtils.smoothstep(0, -1.4, y) * 0.55);

    colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  return geo;
}

const sarsenMat = new THREE.MeshStandardMaterial({
  vertexColors: true, color: 0xffffff,
  roughness: 0.94, metalness: 0,
  flatShading: false,
});
const bluestoneMat = new THREE.MeshStandardMaterial({
  vertexColors: true, color: 0x9aa3aa,
  roughness: 0.86, metalness: 0,
});

function makeSarsenStone(w, h, d, seed) {
  return new THREE.Mesh(
    makeStoneGeometry(w, h, d, {
      seed, taper: 0.06 + Math.random() * 0.05,
      lean: (Math.random() - 0.5) * 0.25,
      rough: 0.13 + Math.random() * 0.05, erode: 0.85,
      segW: 5, segH: 11, segD: 5,
    }),
    sarsenMat
  );
}
function makeLintel(w, h, d, seed) {
  return new THREE.Mesh(
    makeStoneGeometry(w, h, d, {
      seed, taper: 0, lean: 0,
      rough: 0.09, erode: 0.7,
      segW: 6, segH: 4, segD: 4,
    }),
    sarsenMat
  );
}
function makeBluestone(w, h, d, seed) {
  return new THREE.Mesh(
    makeStoneGeometry(w, h, d, {
      seed, taper: 0.18 + Math.random() * 0.1,
      lean: (Math.random() - 0.5) * 0.4,
      rough: 0.18 + Math.random() * 0.06, erode: 0.95,
      segW: 4, segH: 7, segD: 4,
    }),
    bluestoneMat
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Stonehenge layout — sarsen circle (30 uprights + continuous lintel ring),
// trilithon horseshoe (5 trilithons), bluestone circle, bluestone horseshoe,
// heel stone on the avenue.
// ────────────────────────────────────────────────────────────────────────────
const stonesGroup = new THREE.Group();
scene.add(stonesGroup);

const SARSEN_R = 16.4;       // outer sarsen circle radius (m)
const SARSEN_COUNT = 30;
const SARSEN_H = 4.1;
const SARSEN_W = 2.1;
const SARSEN_D = 1.1;
const LINTEL_H = 0.8;
const LINTEL_DEPTH = 1.05;

// Outer sarsen ring
for (let i = 0; i < SARSEN_COUNT; i++) {
  // Skip a couple stones in the ring for ruined look (matches partial state of monument)
  const ruined = (i === 8 || i === 9 || i === 21 || i === 22 || i === 14);
  const ang = (i / SARSEN_COUNT) * Math.PI * 2 + Math.PI; // start at south
  const x = Math.sin(ang) * SARSEN_R;
  const z = Math.cos(ang) * SARSEN_R;
  if (!ruined) {
    const s = makeSarsenStone(SARSEN_W, SARSEN_H, SARSEN_D, i * 7 + 13);
    s.position.set(x, SARSEN_H / 2 - 0.05 + heightAt(x, z), z);
    s.rotation.y = ang + (Math.random() - 0.5) * 0.08;
    s.castShadow = true; s.receiveShadow = true;
    stonesGroup.add(s);
  } else if (i === 9 || i === 22) {
    // fallen stone laying down
    const s = makeSarsenStone(SARSEN_W, SARSEN_H, SARSEN_D, i * 7 + 13);
    s.rotation.z = Math.PI / 2;
    s.rotation.y = ang;
    s.position.set(x + Math.sin(ang) * 0.5, SARSEN_W / 2 - 0.1 + heightAt(x, z), z + Math.cos(ang) * 0.5);
    s.castShadow = true; s.receiveShadow = true;
    stonesGroup.add(s);
  } else if (i === 8) {
    // broken stump
    const s = makeSarsenStone(SARSEN_W * 0.95, SARSEN_H * 0.4, SARSEN_D * 0.95, i * 7 + 13);
    s.position.set(x, SARSEN_H * 0.4 / 2 + heightAt(x, z), z);
    s.rotation.y = ang;
    s.castShadow = true; s.receiveShadow = true;
    stonesGroup.add(s);
  }
}
// Continuous lintel ring on top — segmented across each adjacent pair where both uprights present
function lintelPresent(i) {
  return !(i === 8 || i === 9 || i === 14 || i === 21 || i === 22);
}
for (let i = 0; i < SARSEN_COUNT; i++) {
  const j = (i + 1) % SARSEN_COUNT;
  if (!lintelPresent(i) || !lintelPresent(j)) continue;
  if (i === 13 || i === 23) continue; // a few missing lintels for ruined look
  const a1 = (i / SARSEN_COUNT) * Math.PI * 2 + Math.PI;
  const a2 = (j / SARSEN_COUNT) * Math.PI * 2 + Math.PI;
  const am = (a1 + a2) / 2;
  const chord = 2 * SARSEN_R * Math.sin(Math.PI / SARSEN_COUNT);
  const x = Math.sin(am) * SARSEN_R;
  const z = Math.cos(am) * SARSEN_R;
  const lintel = makeLintel(chord * 1.04, LINTEL_H, LINTEL_DEPTH, i * 31 + 5);
  lintel.position.set(x, SARSEN_H + LINTEL_H / 2 - 0.05 + heightAt(x, z), z);
  lintel.rotation.y = am;
  lintel.castShadow = true; lintel.receiveShadow = true;
  stonesGroup.add(lintel);
}

// Trilithon horseshoe — 5 trilithons opening NE (toward avenue)
// heights: outer pair 6.0, inner pair 6.5, central great trilithon 7.3
const trilithonSpecs = [
  { idx: -2, h: 6.0, w: 2.3, d: 1.3 },
  { idx: -1, h: 6.5, w: 2.4, d: 1.35 },
  { idx:  0, h: 7.3, w: 2.6, d: 1.5 },  // great trilithon
  { idx:  1, h: 6.5, w: 2.4, d: 1.35 },
  { idx:  2, h: 6.0, w: 2.3, d: 1.3 },
];
const HORSESHOE_R = 11.5;
// horseshoe opens to NE; aperture roughly +/-50° from SW center
const HORSESHOE_CENTER = Math.atan2(-AVENUE_DIR.x, -AVENUE_DIR.z); // SW heading
const TRILITHON_SPREAD = THREE.MathUtils.degToRad(30); // angular spacing between adjacent pairs

trilithonSpecs.forEach(spec => {
  const baseAng = HORSESHOE_CENTER + spec.idx * TRILITHON_SPREAD;
  // each trilithon is two uprights tangent to the horseshoe at baseAng
  const tangent = new THREE.Vector3(Math.cos(baseAng), 0, -Math.sin(baseAng));
  const radial = new THREE.Vector3(Math.sin(baseAng), 0, Math.cos(baseAng));
  const center = radial.clone().multiplyScalar(HORSESHOE_R);
  const halfGap = (spec.w + 0.4) / 2 + 0.55; // pillar half-thick + small gap
  for (let k = -1; k <= 1; k += 2) {
    const p = center.clone().add(tangent.clone().multiplyScalar(halfGap * k));
    const stone = makeSarsenStone(spec.w, spec.h, spec.d, spec.idx * 19 + k * 3 + 200);
    stone.position.set(p.x, spec.h / 2 - 0.1 + heightAt(p.x, p.z), p.z);
    // stone X (wide face) aligned with tangent so paired uprights face each other
    stone.rotation.y = baseAng;
    stone.castShadow = true; stone.receiveShadow = true;
    stonesGroup.add(stone);
  }
  // lintel — only on intact trilithons (great trilithon's lintel still stands; outers partly fallen)
  const lintelIntact = (spec.idx === 0 || spec.idx === -1 || spec.idx === 2);
  if (lintelIntact) {
    const c = center.clone();
    const lintel = makeLintel(halfGap * 2 + spec.w * 0.95, 1.0, spec.d * 1.05, spec.idx * 53 + 7);
    lintel.position.set(c.x, spec.h + 0.5 + heightAt(c.x, c.z), c.z);
    lintel.rotation.y = baseAng;
    lintel.castShadow = true; lintel.receiveShadow = true;
    stonesGroup.add(lintel);
  } else if (spec.idx === -2) {
    // Fallen lintel propped at base
    const c = center.clone().add(tangent.clone().multiplyScalar(0.5));
    const lintel = makeLintel(halfGap * 2 + spec.w * 0.9, 1.0, spec.d * 1.05, 999);
    lintel.position.set(c.x, 0.6 + heightAt(c.x, c.z), c.z);
    lintel.rotation.y = baseAng;
    lintel.rotation.z = 0.18;
    lintel.castShadow = true; lintel.receiveShadow = true;
    stonesGroup.add(lintel);
  }
});

// Bluestone circle — between sarsen ring and trilithons
const BLUE_CIRCLE_R = 13.6;
const BLUE_COUNT = 28;
for (let i = 0; i < BLUE_COUNT; i++) {
  if (Math.random() < 0.18) continue; // ruined gaps
  const ang = (i / BLUE_COUNT) * Math.PI * 2;
  const r = BLUE_CIRCLE_R + (Math.random() - 0.5) * 0.6;
  const x = Math.sin(ang) * r, z = Math.cos(ang) * r;
  const h = 1.7 + Math.random() * 0.9;
  const w = 0.6 + Math.random() * 0.35;
  const d = 0.45 + Math.random() * 0.3;
  const s = makeBluestone(w, h, d, i + 500);
  s.position.set(x, h / 2 - 0.05 + heightAt(x, z), z);
  s.rotation.y = ang + (Math.random() - 0.5) * 0.5;
  s.rotation.z = (Math.random() - 0.5) * 0.06;
  s.castShadow = true; s.receiveShadow = true;
  stonesGroup.add(s);
}

// Bluestone horseshoe inside trilithons — taller, smaller count
const BLUE_HS_R = 7.0;
for (let i = -3; i <= 3; i++) {
  const ang = HORSESHOE_CENTER + i * THREE.MathUtils.degToRad(20);
  const r = BLUE_HS_R + (Math.random() - 0.5) * 0.4;
  const x = Math.sin(ang) * r, z = Math.cos(ang) * r;
  const h = 2.0 + Math.random() * 0.7;
  const w = 0.7 + Math.random() * 0.25;
  const d = 0.55 + Math.random() * 0.2;
  const s = makeBluestone(w, h, d, i + 700);
  s.position.set(x, h / 2 - 0.05 + heightAt(x, z), z);
  s.rotation.y = ang + (Math.random() - 0.5) * 0.3;
  s.castShadow = true; s.receiveShadow = true;
  stonesGroup.add(s);
}

// Heel Stone — out on the avenue, NE
{
  const heelDist = 35;
  const p = AVENUE_DIR.clone().multiplyScalar(heelDist);
  const heel = makeSarsenStone(2.5, 4.7, 2.3, 1234);
  heel.position.set(p.x, 4.7 / 2 - 0.1 + heightAt(p.x, p.z), p.z);
  heel.rotation.y = -Math.atan2(AVENUE_DIR.x, AVENUE_DIR.z) + 0.1;
  heel.rotation.z = 0.04;
  heel.castShadow = true; heel.receiveShadow = true;
  stonesGroup.add(heel);
}

// Slaughter Stone — fallen near entrance
{
  const sP = AVENUE_DIR.clone().multiplyScalar(20);
  const slt = makeSarsenStone(3.4, 0.9, 1.6, 4321);
  slt.position.set(sP.x + 1.5, 0.45 + heightAt(sP.x, sP.z), sP.z + 1.5);
  slt.rotation.y = Math.PI / 4;
  slt.castShadow = true; slt.receiveShadow = true;
  stonesGroup.add(slt);
}

// Altar Stone — flat, inside horseshoe
{
  const altar = makeSarsenStone(4.2, 0.6, 1.0, 5678);
  altar.position.set(0, 0.3 + heightAt(0, 0), 0);
  altar.rotation.y = HORSESHOE_CENTER + Math.PI / 2;
  altar.castShadow = true; altar.receiveShadow = true;
  stonesGroup.add(altar);
}

// ────────────────────────────────────────────────────────────────────────────
// Distant barrows — soft mounds on the horizon
// ────────────────────────────────────────────────────────────────────────────
const barrowGroup = new THREE.Group();
scene.add(barrowGroup);
const barrowMat = new THREE.MeshStandardMaterial({
  color: 0x8c8a73, roughness: 0.96, metalness: 0,
});
function makeBarrow(radius, height, seed) {
  const ns = new Noise(seed);
  const geo = new THREE.SphereGeometry(radius, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2);
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const n = ns.fbm(x * 0.06, y * 0.06, z * 0.06, 4);
    const yk = Math.max(0, y / radius);
    pos.setXYZ(i,
      x + n * radius * 0.06,
      y * (height / radius) + n * 0.6 * yk,
      z + n * radius * 0.06);
  }
  geo.computeVertexNormals();
  const m = new THREE.Mesh(geo, barrowMat);
  m.castShadow = true; m.receiveShadow = true;
  return m;
}
const barrowPlacements = [
  [-160, -90, 16, 5], [-110, -180, 22, 6], [80, -190, 18, 5],
  [180, -120, 24, 7], [220, 30, 20, 6], [200, 130, 17, 5],
  [60, 220, 22, 6.5], [-120, 200, 18, 5.5], [-220, 80, 21, 6.5],
];
for (const [x, z, r, h] of barrowPlacements) {
  const b = makeBarrow(r, h, x | 0);
  b.position.set(x, heightAt(x, z), z);
  barrowGroup.add(b);
}

// ────────────────────────────────────────────────────────────────────────────
// Low fences — wooden posts + rails encircling the monument at a polite distance
// Built as instanced meshes for performance.
// ────────────────────────────────────────────────────────────────────────────
function buildFence() {
  const fenceR = 42;
  const segs = 96;
  const postGeo = new THREE.CylinderGeometry(0.06, 0.07, 1.0, 6);
  const railGeo = new THREE.BoxGeometry(1.0, 0.05, 0.05);
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x4a3826, roughness: 0.92, metalness: 0 });
  const posts = new THREE.InstancedMesh(postGeo, woodMat, segs);
  const railsTop = new THREE.InstancedMesh(railGeo, woodMat, segs);
  const railsMid = new THREE.InstancedMesh(railGeo, woodMat, segs);
  posts.castShadow = true; railsTop.castShadow = true; railsMid.castShadow = true;
  posts.receiveShadow = true; railsTop.receiveShadow = true; railsMid.receiveShadow = true;
  const m = new THREE.Object3D();
  for (let i = 0; i < segs; i++) {
    const a = (i / segs) * Math.PI * 2;
    const x = Math.sin(a) * fenceR, z = Math.cos(a) * fenceR;
    const y = heightAt(x, z);
    m.position.set(x, y + 0.5, z);
    m.rotation.set(0, 0, 0);
    m.scale.set(1, 1, 1);
    m.updateMatrix();
    posts.setMatrixAt(i, m.matrix);
    // rails between i and i+1
    const a2 = ((i + 1) / segs) * Math.PI * 2;
    const x2 = Math.sin(a2) * fenceR, z2 = Math.cos(a2) * fenceR;
    const y2 = heightAt(x2, z2);
    const mx = (x + x2) / 2, mz = (z + z2) / 2, my = (y + y2) / 2;
    const len = Math.hypot(x2 - x, z2 - z);
    const am = (a + a2) / 2;
    m.position.set(mx, my + 0.85, mz);
    // chord between (sin a, cos a) and (sin a2, cos a2) is tangent to circle at am
    m.rotation.set(0, am, 0);
    m.scale.set(len, 1, 1);
    m.updateMatrix();
    railsTop.setMatrixAt(i, m.matrix);
    m.position.set(mx, my + 0.45, mz);
    m.updateMatrix();
    railsMid.setMatrixAt(i, m.matrix);
  }
  posts.instanceMatrix.needsUpdate = true;
  railsTop.instanceMatrix.needsUpdate = true;
  railsMid.instanceMatrix.needsUpdate = true;
  // open a gap on the avenue side so the path "enters"
  // (cheap: hide a few instances that fall in the avenue corridor)
  const tmp = new THREE.Matrix4();
  for (let i = 0; i < segs; i++) {
    posts.getMatrixAt(i, tmp);
    const v = new THREE.Vector3().setFromMatrixPosition(tmp);
    const d = v.clone().normalize().dot(AVENUE_DIR);
    if (d > 0.94) {
      const z = new THREE.Matrix4().makeScale(0, 0, 0);
      posts.setMatrixAt(i, z);
      railsTop.setMatrixAt(i, z);
      railsMid.setMatrixAt(i, z);
    }
  }
  posts.instanceMatrix.needsUpdate = true;
  railsTop.instanceMatrix.needsUpdate = true;
  railsMid.instanceMatrix.needsUpdate = true;
  scene.add(posts, railsTop, railsMid);
}
buildFence();

// ────────────────────────────────────────────────────────────────────────────
// Grass — instanced blades with vertex-shader wind. Two LOD bands; density
// adapts to camera height each frame.
// ────────────────────────────────────────────────────────────────────────────
function makeBladeGeometry() {
  // 6-vertex tapered blade (3 segments)
  const g = new THREE.BufferGeometry();
  const verts = new Float32Array([
    -0.5, 0.0, 0,   0.5, 0.0, 0,
    -0.4, 0.33, 0,  0.4, 0.33, 0,
    -0.25, 0.66, 0, 0.25, 0.66, 0,
    0.0, 1.0, 0,    0.0, 1.0, 0,
  ]);
  const idx = [
    0, 1, 2, 1, 3, 2,
    2, 3, 4, 3, 5, 4,
    4, 5, 6, 5, 7, 6,
  ];
  const uv = new Float32Array([
    0, 0, 1, 0, 0, 0.33, 1, 0.33, 0, 0.66, 1, 0.66, 0, 1, 1, 1
  ]);
  g.setAttribute('position', new THREE.BufferAttribute(verts, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

const grassUniforms = {
  time: { value: 0 },
  wind: { value: 0.9 },
  windDir: { value: new THREE.Vector2(1, 0.3).normalize() },
  sunDir: { value: new THREE.Vector3(0, 1, 0) },
  sunCol: { value: new THREE.Color(0xfff1d6) },
  ambCol: { value: new THREE.Color(0x6c7a86) },
  baseCol: { value: new THREE.Color(0x6c7242) },
  tipCol: { value: new THREE.Color(0xd6c98a) },
};
const grassMat = new THREE.ShaderMaterial({
  uniforms: grassUniforms,
  side: THREE.DoubleSide,
  vertexShader: /* glsl */`
    uniform float time, wind;
    uniform vec2 windDir;
    varying float vH;
    varying vec3 vWorld;
    varying vec3 vNormal;
    void main(){
      vec3 transformed = position;
      // We'll use instanceMatrix to position+scale+rotate each blade.
      // Wind: bend the tip in windDir, scaled by height^2.
      float h = position.y;
      vH = h;
      // Per-instance phase offset using instance matrix translation
      vec4 worldPos0 = instanceMatrix * vec4(0.0,0.0,0.0,1.0);
      float phase = worldPos0.x * 0.32 + worldPos0.z * 0.27;
      float w1 = sin(time * 1.4 + phase) * 0.5 + 0.5;
      float w2 = sin(time * 3.1 + phase * 1.7) * 0.5;
      float bend = (w1 + 0.4 * w2) * wind * 0.45;
      vec3 bendVec = vec3(windDir.x, 0.0, windDir.y) * bend * h * h;
      // Slight side curl too
      transformed.x += bendVec.x;
      transformed.z += bendVec.z;
      vec4 worldPos = instanceMatrix * vec4(transformed, 1.0);
      vWorld = (modelMatrix * worldPos).xyz;
      vec3 n = normalize(mat3(instanceMatrix) * vec3(0.0, 0.0, 1.0));
      vNormal = normalize((modelMatrix * vec4(n, 0.0)).xyz);
      gl_Position = projectionMatrix * viewMatrix * modelMatrix * worldPos;
    }
  `,
  fragmentShader: /* glsl */`
    uniform vec3 sunDir, sunCol, ambCol, baseCol, tipCol;
    varying float vH;
    varying vec3 vWorld;
    varying vec3 vNormal;
    void main(){
      vec3 col = mix(baseCol, tipCol, smoothstep(0.0, 1.0, vH));
      // Cheap two-sided lighting using world-up bias rather than face normal
      vec3 n = normalize(vec3(vNormal.x, max(vNormal.y, 0.4), vNormal.z));
      float ndl = max(dot(n, normalize(sunDir)), 0.0);
      vec3 lit = col * (ambCol * 0.55 + sunCol * (0.6 + 0.6 * ndl));
      // Slight desaturation at distance via fog-ish alpha trick
      gl_FragColor = vec4(lit, 1.0);
    }
  `,
});

function buildGrass() {
  const blade = makeBladeGeometry();
  const NEAR_COUNT = 24000;
  const FAR_COUNT = 14000;
  const near = new THREE.InstancedMesh(blade, grassMat, NEAR_COUNT);
  const far = new THREE.InstancedMesh(blade, grassMat, FAR_COUNT);
  near.frustumCulled = false; far.frustumCulled = false;
  near.castShadow = false; far.castShadow = false;
  near.receiveShadow = false; far.receiveShadow = false;

  const dummy = new THREE.Object3D();

  // Near band — denser, around the monument outside the fenced perimeter
  let ni = 0, attempts = 0;
  while (ni < NEAR_COUNT && attempts < NEAR_COUNT * 6) {
    attempts++;
    const x = (Math.random() - 0.5) * 180;
    const z = (Math.random() - 0.5) * 180;
    const r = Math.hypot(x, z);
    // exclude inside the stone circle (let a bit grow up to perimeter)
    if (r < 18.5) continue;
    if (r > 90) continue;
    // light avenue trampling
    const av = AVENUE_DIR.x * x + AVENUE_DIR.z * z;
    const perp = Math.abs(-AVENUE_DIR.z * x + AVENUE_DIR.x * z);
    if (av > 0 && av < 50 && perp < 5 && Math.random() < 0.7) continue;

    const y = heightAt(x, z);
    const scale = 0.55 + Math.random() * 0.7;
    const height = 0.35 + Math.random() * 0.45;
    dummy.position.set(x, y, z);
    dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
    dummy.scale.set(0.06 * scale, height, 1);
    dummy.updateMatrix();
    near.setMatrixAt(ni++, dummy.matrix);
  }
  near.count = ni;
  near.instanceMatrix.needsUpdate = true;

  // Far band — sparser, broad
  let fi = 0; attempts = 0;
  while (fi < FAR_COUNT && attempts < FAR_COUNT * 6) {
    attempts++;
    const x = (Math.random() - 0.5) * 460;
    const z = (Math.random() - 0.5) * 460;
    const r = Math.hypot(x, z);
    if (r < 92 || r > 230) continue;
    const y = heightAt(x, z);
    const scale = 0.7 + Math.random() * 0.8;
    const height = 0.45 + Math.random() * 0.55;
    dummy.position.set(x, y, z);
    dummy.rotation.set(0, Math.random() * Math.PI * 2, 0);
    dummy.scale.set(0.08 * scale, height, 1);
    dummy.updateMatrix();
    far.setMatrixAt(fi++, dummy.matrix);
  }
  far.count = fi;
  far.instanceMatrix.needsUpdate = true;

  scene.add(near, far);
  return { near, far, NEAR_COUNT: ni, FAR_COUNT: fi };
}
const grass = buildGrass();

// ────────────────────────────────────────────────────────────────────────────
// Crowd — low-poly humanoid silhouettes built from merged primitives, instanced
// ────────────────────────────────────────────────────────────────────────────
function makeFigureGeometry() {
  // Build a simple humanoid: head + torso + 2 legs + 2 arms in T-pose (compact).
  // Merge into a single BufferGeometry so it can be instanced.
  const parts = [];
  const add = (geo, x, y, z, sx = 1, sy = 1, sz = 1, rz = 0) => {
    geo.scale(sx, sy, sz);
    if (rz) geo.rotateZ(rz);
    geo.translate(x, y, z);
    parts.push(geo);
  };
  // Torso
  add(new THREE.CylinderGeometry(0.18, 0.22, 0.6, 6), 0, 0.95, 0);
  // Head
  add(new THREE.SphereGeometry(0.13, 8, 6), 0, 1.38, 0);
  // Legs
  add(new THREE.CylinderGeometry(0.08, 0.07, 0.7, 6), -0.1, 0.35, 0);
  add(new THREE.CylinderGeometry(0.08, 0.07, 0.7, 6), 0.1, 0.35, 0);
  // Arms — slightly down
  add(new THREE.CylinderGeometry(0.06, 0.05, 0.55, 6), -0.28, 0.92, 0, 1, 1, 1, 0.35);
  add(new THREE.CylinderGeometry(0.06, 0.05, 0.55, 6), 0.28, 0.92, 0, 1, 1, 1, -0.35);
  // Backpack-ish hump (variation cue when scaled)
  add(new THREE.SphereGeometry(0.11, 6, 5), 0, 1.05, -0.18);

  // mergeBufferGeometries: simple inline merger
  let total = 0;
  for (const g of parts) {
    g.computeVertexNormals();
    total += g.attributes.position.count;
  }
  const pos = new Float32Array(total * 3);
  const norm = new Float32Array(total * 3);
  let off = 0;
  for (const g of parts) {
    const p = g.attributes.position.array;
    const n = g.attributes.normal.array;
    pos.set(p, off * 3);
    norm.set(n, off * 3);
    off += g.attributes.position.count;
  }
  // build flat indices using existing geometry indices by offsetting
  const indices = [];
  off = 0;
  for (const g of parts) {
    const idx = g.index ? g.index.array : null;
    if (idx) {
      for (let i = 0; i < idx.length; i++) indices.push(idx[i] + off);
    } else {
      for (let i = 0; i < g.attributes.position.count; i++) indices.push(i + off);
    }
    off += g.attributes.position.count;
  }
  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(norm, 3));
  merged.setIndex(indices);
  return merged;
}

const crowdGeo = makeFigureGeometry();
const crowdMat = new THREE.MeshStandardMaterial({
  color: 0xffffff, roughness: 0.85, metalness: 0,
});
// We want per-instance color variation; use InstancedMesh.setColorAt.
function buildCrowd() {
  const COUNT = 70;
  const m = new THREE.InstancedMesh(crowdGeo, crowdMat, COUNT);
  m.castShadow = true; m.receiveShadow = true;
  const dummy = new THREE.Object3D();
  const tmpColor = new THREE.Color();
  const palette = [
    [0.32, 0.35, 0.42], [0.45, 0.30, 0.28], [0.25, 0.30, 0.36],
    [0.55, 0.5, 0.45], [0.4, 0.42, 0.38], [0.7, 0.6, 0.5],
    [0.55, 0.25, 0.22], [0.28, 0.32, 0.28], [0.5, 0.45, 0.55],
  ];
  let placed = 0;
  while (placed < COUNT) {
    const a = Math.random() * Math.PI * 2;
    const r = 45 + Math.random() * 35;
    const x = Math.sin(a) * r, z = Math.cos(a) * r;
    if (Math.hypot(x, z) < 44) continue;
    const y = heightAt(x, z);
    const scale = 0.85 + Math.random() * 0.4;
    const slouch = (Math.random() - 0.5) * 0.06;
    dummy.position.set(x, y, z);
    dummy.rotation.set(0, Math.atan2(-x, -z) + (Math.random() - 0.5) * 1.5, slouch);
    dummy.scale.setScalar(scale);
    dummy.updateMatrix();
    m.setMatrixAt(placed, dummy.matrix);

    const c = palette[(Math.random() * palette.length) | 0];
    const j = (Math.random() - 0.5) * 0.06;
    tmpColor.setRGB(
      THREE.MathUtils.clamp(c[0] + j, 0, 1),
      THREE.MathUtils.clamp(c[1] + j, 0, 1),
      THREE.MathUtils.clamp(c[2] + j, 0, 1),
    );
    m.setColorAt(placed, tmpColor);
    placed++;
  }
  m.instanceMatrix.needsUpdate = true;
  if (m.instanceColor) m.instanceColor.needsUpdate = true;
  return m;
}
let crowdMesh = buildCrowd();
scene.add(crowdMesh);

// ────────────────────────────────────────────────────────────────────────────
// UI
// ────────────────────────────────────────────────────────────────────────────
const azEl = document.getElementById('az');
const elEl = document.getElementById('el');
const windEl = document.getElementById('wind');
const azV = document.getElementById('azv');
const elV = document.getElementById('elv');
const wV = document.getElementById('wv');
const crowdToggle = document.getElementById('crowd');
const compassToggle = document.getElementById('compass');
const compass = document.getElementById('compass-overlay');
const fpsEl = document.getElementById('fps');

function syncUI() {
  azV.textContent = (+azEl.value).toFixed(0);
  elV.textContent = (+elEl.value).toFixed(0);
  wV.textContent = (+windEl.value).toFixed(2);
  setSun(+azEl.value, +elEl.value);
  grassUniforms.wind.value = +windEl.value;
}
azEl.addEventListener('input', syncUI);
elEl.addEventListener('input', syncUI);
windEl.addEventListener('input', syncUI);
crowdToggle.addEventListener('change', () => { crowdMesh.visible = crowdToggle.checked; });
compassToggle.addEventListener('change', () => { compass.classList.toggle('on', compassToggle.checked); });

document.getElementById('solstice').addEventListener('click', () => {
  azEl.value = 49; elEl.value = 12; syncUI();
});
document.getElementById('reset').addEventListener('click', () => {
  camera.position.copy(AVENUE_CAM);
  controls.target.set(0, 2.5, 0);
  controls.update();
});

syncUI();
crowdMesh.visible = crowdToggle.checked;

// Optional URL hash override for screenshots / debugging.
// e.g. #az=120&el=40&cx=80&cy=14&cz=80&tx=0&ty=2&tz=0
{
  const params = Object.fromEntries(new URLSearchParams(location.hash.slice(1)));
  if (params.az) { azEl.value = params.az; }
  if (params.el) { elEl.value = params.el; }
  if (params.az || params.el) syncUI();
  if (params.cx || params.cy || params.cz) {
    camera.position.set(+params.cx || 0, +params.cy || 6, +params.cz || 0);
  }
  if (params.tx || params.ty || params.tz) {
    controls.target.set(+params.tx || 0, +params.ty || 2.5, +params.tz || 0);
    controls.update();
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Adaptive grass density based on camera height (≥55 FPS budget)
// ────────────────────────────────────────────────────────────────────────────
function updateGrassLOD() {
  const h = camera.position.y;
  // High camera → drop a portion of near + far blades to reduce overdraw
  const k = THREE.MathUtils.clamp(1 - (h - 6) / 60, 0.35, 1);
  grass.near.count = Math.floor(grass.NEAR_COUNT * k);
  // Far blades still useful at altitude — keep a baseline
  grass.far.count = Math.floor(grass.FAR_COUNT * (0.6 + 0.4 * k));
}

// ────────────────────────────────────────────────────────────────────────────
// Loop
// ────────────────────────────────────────────────────────────────────────────
let last = performance.now();
let fpsAccum = 0, fpsCount = 0, fpsTimer = 0;
const clock = new THREE.Clock();

function tick() {
  const t = performance.now();
  const dt = (t - last) / 1000;
  last = t;

  controls.update();
  grassUniforms.time.value += dt;
  grassUniforms.sunDir.value.copy(sun.position).normalize();
  grassUniforms.sunCol.value.copy(sun.color);

  // Move shadow camera with the user — keeps shadow map tight on visible area
  const cx = camera.position.x, cz = camera.position.z;
  sun.target.position.set(THREE.MathUtils.clamp(cx, -40, 40), 0, THREE.MathUtils.clamp(cz, -40, 40));
  sun.target.updateMatrixWorld();
  // re-place the directional light relative to the new target
  const dir = new THREE.Vector3().copy(sun.position).normalize();
  sun.position.copy(sun.target.position).addScaledVector(dir, 140);

  updateGrassLOD();

  renderer.render(scene, camera);

  // FPS sample
  fpsAccum += 1 / Math.max(dt, 1e-6); fpsCount++; fpsTimer += dt;
  if (fpsTimer >= 0.5) {
    fpsEl.textContent = (fpsAccum / fpsCount).toFixed(0) + ' fps';
    fpsAccum = 0; fpsCount = 0; fpsTimer = 0;
  }

  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
