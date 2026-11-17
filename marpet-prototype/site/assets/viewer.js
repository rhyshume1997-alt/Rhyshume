// Interactive conveyor: the Blender master model (GLB, meshopt-compressed) in Three.js.
// Built to be judged against the Cycles render from the same camera, so the scene copies
// blender/conveyor.py: camera presets, HDRI strength, light positions, material values.
// Blender is Z-up, glTF/Three is Y-up: (x, y, z) -> (x, z, -y).
import * as THREE from 'three';
import { GLTFLoader } from './vendor/loaders/GLTFLoader.js';
import { EXRLoader } from './vendor/loaders/EXRLoader.js';
import { MeshoptDecoder } from './vendor/libs/meshopt_decoder.module.js';
import { OrbitControls } from './vendor/controls/OrbitControls.js';
import { Reflector } from './vendor/objects/Reflector.js';
import { HorizontalBlurShader } from './vendor/shaders/HorizontalBlurShader.js';
import { VerticalBlurShader } from './vendor/shaders/VerticalBlurShader.js';

const B = (x, y, z) => new THREE.Vector3(x, z, -y);
const LEN = 2.2;
const VIEWS = {   // camera location, aim, lens in mm on a 36 mm sensor
  hero: [B(-1.45, -2.6, 1.38), B(0.95, -0.2, 0.56), 50],
  drive: [B(-0.62, -0.98, 1.0), B(0.13, -0.3, 0.8), 58],
  weld: [B(0.02, -0.92, 0.6), B(0.44, -0.28, 0.72), 85],
};
const T = [LEN / 2, -0.3, 0.8];
const LIGHTS = [  // location, target, size x, size y, watts, colour
  [[-1.4, -3.2, 2.9], T, 2.4, 1.6, 120, [1, 1, 1]],
  [[LEN / 2, -0.2, 3.4], [LEN / 2, -0.2, 0], 3.4, 1.2, 110, [1, 1, 1]],
  ...[-2.4, -0.8, 0.8, 2.4, 4.0].map((x) => [[x, -4.6, 1.5], [x * 0.5 + 0.5, 0, 0.9], 0.28, 2.8, 36, [1, 1, 1]]),
  [[LEN + 1.6, 2.6, 1.9], T, 1.6, 1.0, 120, [0.75, 0.84, 1.0]],
  [[-3.0, -1.4, 0.5], T, 1.4, 0.8, 14, [0.8, 0.86, 1.0]],
];
const CENTRE = B(LEN / 2, 0, 0.8);
const HDRI_STRENGTH = 0.2;
// assembly: group, offset in Blender axes, start and end as fractions of the sequence
const PLAN = [
  ['frame_near', [0, 0, 0.55], 0.00, 0.36], ['frame_far', [0, 0, 0.55], 0.08, 0.44], ['bed', [0, 0, 0.7], 0.16, 0.46],
  ['drum_a', [0, 0.9, 0], 0.30, 0.56], ['drum_b', [0, 0.9, 0], 0.34, 0.60], ['belt', [0, 0, 0.5], 0.40, 0.66],
  ['endplates_far', [0, 0.3, 0], 0.50, 0.72], ['endplates', [0, -0.3, 0], 0.50, 0.72], ['bearings', [0, -0.34, 0], 0.58, 0.80],
  ['takeup', [0, -0.22, 0], 0.64, 0.84], ['bolts', [0, -0.14, 0], 0.72, 0.90], ['logo', [0, -0.2, 0.05], 0.76, 0.92],
];
const ease = (t) => 1 - Math.pow(1 - Math.min(1, Math.max(0, t)), 3);   // decelerate into place, no bounce

// One texture for the whole side panel (2.2 m x 0.21 m), not a tile: grain, a few off-axis
// scratches and soft wipe marks. Green channel is roughness, as Three.js expects.
function panelTexture() {
  const W = 4096, H = 512, c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d'); g.fillStyle = 'rgb(196,196,196)'; g.fillRect(0, 0, W, H);
  for (let i = 0; i < 9; i++) {   // wipe marks
    const x = Math.random() * W, y = Math.random() * H, r = 120 + Math.random() * 260;
    const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, 'rgba(235,235,235,0.22)'); gr.addColorStop(1, 'rgba(235,235,235,0)');
    g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2);
  }
  for (let i = 0; i < 60000; i++) {   // grain along the length
    const v = Math.random() < 0.5 ? 255 : 120;
    g.strokeStyle = `rgba(${v},${v},${v},${0.04 + Math.random() * 0.14})`;
    const x = Math.random() * W, y = Math.random() * H;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + 40 + Math.random() * 500, y); g.stroke();
  }
  g.strokeStyle = 'rgba(255,255,255,0.35)';
  for (let i = 0; i < 26; i++) {   // scratches a few degrees off the grain
    const x = Math.random() * W, y = Math.random() * H, l = 60 + Math.random() * 260, a = (Math.random() - 0.5) * 0.5;
    g.lineWidth = 0.6; g.beginPath(); g.moveTo(x, y); g.lineTo(x + l * Math.cos(a), y + l * Math.sin(a)); g.stroke();
  }
  const t = new THREE.CanvasTexture(c); t.wrapS = THREE.RepeatWrapping; t.wrapT = THREE.ClampToEdgeWrapping; t.anisotropy = 16;
  t.repeat.set(1 / LEN, 1 / 0.21); t.offset.set(0, -0.74 / 0.21);   // panel UVs are in metres: u = x, v = z
  return t;
}
function beltTexture() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256; const g = c.getContext('2d');
  g.fillStyle = '#2d6fd0'; g.fillRect(0, 0, 256, 256);
  for (let i = 0; i < 5000; i++) { g.fillStyle = `rgba(${Math.random() < 0.5 ? '255,255,255' : '0,20,70'},${Math.random() * 0.06})`; g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2); }
  g.fillStyle = 'rgba(0,15,60,0.16)'; g.fillRect(0, 0, 3, 256);   // a faint lateral mark every 100 mm so belt travel is visible
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

let assets;
function load(model, hdri) {
  assets ??= Promise.all([new GLTFLoader().setMeshoptDecoder(MeshoptDecoder).loadAsync(model), new EXRLoader().loadAsync(hdri)]);
  return assets;
}

export function initViewer(root) {
  const canvas = root.querySelector('canvas');
  const interactive = root.hasAttribute('data-interactive');
  const mobile = matchMedia('(max-width: 760px), (pointer: coarse)').matches;
  const q = new URLSearchParams(location.search);
  const tier = q.get('tier') || (mobile ? 'mobile' : 'desktop');
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  const dprCap = tier === 'mobile' ? 1.5 : 2;
  renderer.setPixelRatio(Math.min(devicePixelRatio || 1, dprCap));
  renderer.toneMapping = THREE.AgXToneMapping; renderer.toneMappingExposure = 1.25;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap; renderer.shadowMap.autoUpdate = false;
  const scene = new THREE.Scene();
  scene.background = new THREE.Color().setRGB(0.004, 0.006, 0.014);
  const [pos, aim, lens] = VIEWS[root.dataset.view || 'hero'];
  const fov = (l) => THREE.MathUtils.radToDeg(2 * Math.atan((18 / l) * 0.625));
  const cam = new THREE.PerspectiveCamera(fov(lens), 1.6, 0.02, 80);
  cam.position.copy(pos); cam.lookAt(aim);

  // key lamp with a soft shadow map: shapes the model. Contact shadows below do the grounding.
  const key = new THREE.DirectionalLight(0xffffff, 0.35);
  key.position.copy(B(...LIGHTS[0][0])); key.target.position.copy(B(...LIGHTS[0][1])); key.castShadow = true;
  const sm = tier === 'mobile' ? 2048 : 4096; key.shadow.mapSize.set(sm, sm);
  Object.assign(key.shadow.camera, { left: -1.8, right: 1.8, top: 1.6, bottom: -1.6, near: 0.5, far: 12 });
  key.shadow.bias = -0.0004; key.shadow.normalBias = 0.004; key.shadow.radius = 5; key.shadow.blurSamples = 16;
  scene.add(key, key.target);

  // floor: dark mirror at low strength (desktop), so the legs and feet reflect as they do in Cycles
  let mirror = null;
  if (tier !== 'mobile') {
    mirror = new Reflector(new THREE.PlaneGeometry(40, 40), { textureWidth: 1024, textureHeight: 640, color: new THREE.Color().setRGB(0.085, 0.09, 0.105), clipBias: 0.001 });
    mirror.rotation.x = -Math.PI / 2; mirror.position.y = -0.001; scene.add(mirror);
  }
  // a matt floor over the mirror, lit by one overhead spot: the pool of light under the machine
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(40, 40), new THREE.MeshStandardMaterial({ color: new THREE.Color().setRGB(0.07, 0.082, 0.12), roughness: 0.7, metalness: 0, envMapIntensity: 0, transparent: tier !== 'mobile', opacity: tier !== 'mobile' ? 0.8 : 1, depthWrite: false }));
  const pool = new THREE.SpotLight(0xffffff, 60, 12, 0.5, 1, 2); pool.castShadow = true; pool.shadow.mapSize.set(sm / 2, sm / 2); pool.shadow.radius = 9; pool.shadow.blurSamples = 20; pool.shadow.bias = -0.0008; pool.shadow.normalBias = 0.012; pool.position.copy(B(LEN / 2, -0.5, 3.4)); pool.target.position.copy(B(LEN / 2, -0.3, 0)); scene.add(pool, pool.target);
  floor.rotation.x = -Math.PI / 2; floor.receiveShadow = true; scene.add(floor);

  // contact shadows: depth of the model seen from under the floor, blurred. Follows moving parts.
  const CS = { size: 4.2, depth: 0.35, res: tier === 'mobile' ? 256 : 512, blur: 2.6, darkness: 1.6 };
  const csGroup = new THREE.Group(); csGroup.position.set(LEN / 2, 0.002, 0); scene.add(csGroup);
  const rtA = new THREE.WebGLRenderTarget(CS.res, CS.res), rtB = new THREE.WebGLRenderTarget(CS.res, CS.res);
  rtA.texture.generateMipmaps = rtB.texture.generateMipmaps = false;
  const csPlaneGeo = new THREE.PlaneGeometry(CS.size, CS.size).rotateX(Math.PI / 2);
  const csPlane = new THREE.Mesh(csPlaneGeo, new THREE.MeshBasicMaterial({ map: rtA.texture, transparent: true, opacity: 0.85, depthWrite: false }));
  csPlane.scale.y = -1; csPlane.renderOrder = 1; csGroup.add(csPlane);
  const blurPlane = new THREE.Mesh(csPlaneGeo); blurPlane.visible = false; csGroup.add(blurPlane);
  const csCam = new THREE.OrthographicCamera(-CS.size / 2, CS.size / 2, CS.size / 2, -CS.size / 2, 0, CS.depth);
  csCam.rotation.x = Math.PI / 2; csGroup.add(csCam);
  const depthMat = new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.75, depthTest: false, depthWrite: false });
  const hBlur = new THREE.ShaderMaterial(HorizontalBlurShader), vBlur = new THREE.ShaderMaterial(VerticalBlurShader);
  hBlur.depthTest = vBlur.depthTest = false;
  function blurPass(amount) {
    blurPlane.visible = true;
    blurPlane.material = hBlur; hBlur.uniforms.tDiffuse.value = rtA.texture; hBlur.uniforms.h.value = amount / 256;
    renderer.setRenderTarget(rtB); renderer.render(blurPlane, csCam);
    blurPlane.material = vBlur; vBlur.uniforms.tDiffuse.value = rtB.texture; vBlur.uniforms.v.value = amount / 256;
    renderer.setRenderTarget(rtA); renderer.render(blurPlane, csCam);
    blurPlane.visible = false;
  }
  function contactShadows() {
    const bg = scene.background; scene.background = null; csPlane.visible = false; floor.visible = false; if (mirror) mirror.visible = false;
    scene.overrideMaterial = depthMat;
    const ca = renderer.getClearAlpha(); renderer.setClearAlpha(0);
    renderer.setRenderTarget(rtA); renderer.render(scene, csCam);
    scene.overrideMaterial = null;
    blurPass(CS.blur); blurPass(CS.blur * 0.4);
    renderer.setRenderTarget(null); renderer.setClearAlpha(ca);
    scene.background = bg; csPlane.visible = true; floor.visible = true; if (mirror) mirror.visible = true;
  }

  const parts = {}; let drums = [], beltTex = null, model = null;
  let dirty = true, shadowsDirty = true, running = false, assembly = 1, playing = 0;
  const stat = { frames: 0, t0: performance.now(), ms: [] };
  const hud = root.parentElement.querySelector('[data-hud]');

  function setAssembly(p) {
    assembly = p;
    for (const [name, off, a, b] of PLAN) {
      const o = parts[name]; if (!o) continue;
      const k = 1 - ease((p - a) / (b - a));
      o.position.copy(o.userData.home).addScaledVector(B(...off), k);
      o.visible = p >= a - 0.001;
    }
    dirty = shadowsDirty = true;
  }
  function play() { playing = performance.now(); setAssembly(0); }

  load(root.dataset.model, root.dataset.hdri).then(([gltf, exr]) => {
    // image-based light: the HDRI plus a card for every Blender area lamp
    exr.mapping = THREE.EquirectangularReflectionMapping;
    const env = new THREE.Scene(); env.background = exr; env.backgroundRotation.y = Math.PI;
    for (const [loc, tgt, sx, sy, watts, col] of LIGHTS) {
      const L = watts / (4 * Math.PI * sx * sy) / HDRI_STRENGTH;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(sx, sy), new THREE.MeshBasicMaterial({ color: new THREE.Color().setRGB(col[0] * L, col[1] * L, col[2] * L), side: THREE.DoubleSide }));
      m.position.copy(B(...loc)).sub(CENTRE); m.lookAt(B(...tgt).sub(CENTRE)); env.add(m);
    }
    const pm = new THREE.PMREMGenerator(renderer);
    scene.environment = pm.fromScene(env, 0, 0.1, 100).texture; scene.environmentIntensity = HDRI_STRENGTH;
    pm.dispose();

    // materials: the baked ambient occlusion arrives as vertex colour and multiplies the reflection
    const steel = (o) => new THREE.MeshPhysicalMaterial({ color: new THREE.Color().setRGB(0.60, 0.60, 0.61), metalness: 1, vertexColors: true, side: THREE.DoubleSide, ...o });
    const mats = {
      'Brushed sheet': steel({ roughness: 0.42, roughnessMap: panelTexture(), anisotropy: 0.55 }),
      'Brushed tube': steel({ roughness: 0.44, anisotropy: 0.55, anisotropyRotation: Math.PI / 2 }),
      Plate: steel({ roughness: 0.36 }),
    };
    beltTex = beltTexture();
    model = gltf.scene.clone(true);
    model.traverse((o) => {
      if (!o.isMesh) return;
      o.castShadow = true; o.receiveShadow = true;
      const n = o.material.name;
      if (mats[n]) { o.material = mats[n]; if (n === 'Brushed sheet') o.receiveShadow = false; } else {
        o.material = o.material.clone(); o.material.vertexColors = true;
        if (n === 'PU belt') { o.material.map = beltTex; o.material.color.set(0xffffff); o.material.roughness = 0.45; }
      }
    });
    for (const o of model.children) { parts[o.name] = o; o.userData.home = o.position.clone(); }
    drums = [parts.drum_a, parts.drum_b].filter(Boolean);
    scene.add(model);
    if (interactive && q.has('play') && !matchMedia('(prefers-reduced-motion: reduce)').matches) play(); else setAssembly(1);
    contactShadows(); renderer.shadowMap.needsUpdate = true; shadowsDirty = false;
    renderer.render(scene, cam);
    root.dataset.triangles = renderer.info.render.triangles; root.dataset.calls = renderer.info.render.calls; root.dataset.tier = tier;
    root.dataset.pixels = canvas.width + 'x' + canvas.height;
    root.classList.add('is-loaded'); dirty = true;
  }).catch((e) => { root.dataset.error = String(e && e.stack || e); });

  // interaction
  let controls = null;
  if (interactive) {
    controls = new OrbitControls(cam, canvas);
    controls.target.copy(aim); controls.enableDamping = true; controls.dampingFactor = 0.06; controls.enablePan = false;
    controls.minDistance = 0.9; controls.maxDistance = 6.5; controls.minPolarAngle = 0.25 * Math.PI; controls.maxPolarAngle = 0.495 * Math.PI;
    controls.addEventListener('change', () => { dirty = true; });
  }
  function flyTo(name) {
    const [p, a, l] = VIEWS[name]; const p0 = cam.position.clone(), a0 = controls ? controls.target.clone() : aim.clone(), f0 = cam.fov, f1 = fov(l), t0 = performance.now();
    const step = (now) => {
      const k = ease((now - t0) / 1100);
      cam.position.lerpVectors(p0, p, k); const t = a0.clone().lerp(a, k); cam.fov = f0 + (f1 - f0) * k; cam.updateProjectionMatrix();
      if (controls) controls.target.copy(t); cam.lookAt(t); dirty = true;
      if (k < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }
  const ui = (sel) => root.parentElement.querySelector(sel);
  const range = ui('[data-assembly]');
  ui('[data-play]')?.addEventListener('click', play);
  range?.addEventListener('input', () => { playing = 0; setAssembly(range.value / 1000); });
  ui('[data-run]')?.addEventListener('click', (e) => { running = !running; e.currentTarget.setAttribute('aria-pressed', String(running)); dirty = true; });
  root.parentElement.querySelectorAll('[data-goto]').forEach((b) => b.addEventListener('click', () => flyTo(b.dataset.goto)));
  root.viewer = { play, setAssembly, run: (v) => { running = v; dirty = true; }, spin: (v) => { if (controls) { controls.autoRotate = v; controls.autoRotateSpeed = 6; } } };

  const size = () => { const w = root.clientWidth, h = root.clientHeight; if (!w) return; renderer.setSize(w, h, false); cam.aspect = w / h; cam.updateProjectionMatrix(); dirty = true; };
  new ResizeObserver(size).observe(root); size();
  let visible = true; new IntersectionObserver((e) => { visible = e[0].isIntersecting; }).observe(root);
  let last = performance.now();
  (function loop(now) {
    requestAnimationFrame(loop);
    if (!visible || document.hidden || !model) { last = now; return; }
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (playing) {
      const p = Math.min(1, (now - playing) / 5200); setAssembly(p); if (range) range.value = Math.round(p * 1000); if (p >= 1) playing = 0;
    }
    if (running && assembly >= 1) {
      beltTex.offset.x -= dt * 2.4; drums.forEach((d) => { d.rotation.z += dt * 4.8; }); dirty = true;
    }
    if (controls) { controls.update(); if (controls.autoRotate) dirty = true; }
    if (!dirty) return; dirty = false;
    const t = performance.now();
    if (shadowsDirty) { contactShadows(); renderer.shadowMap.needsUpdate = true; shadowsDirty = false; }
    renderer.render(scene, cam);
    stat.ms.push(performance.now() - t); stat.frames++;
    if (now - stat.t0 > 1000) {
      const fps = Math.round(stat.frames * 1000 / (now - stat.t0)), avg = stat.ms.reduce((a, b) => a + b, 0) / stat.ms.length;
      root.dataset.fps = fps; root.dataset.cpuMs = avg.toFixed(1);
      if (hud) hud.textContent = `${fps} fps · ${avg.toFixed(1)} ms per frame on the CPU · ${Math.round(renderer.info.render.triangles / 1000)}k triangles · ${renderer.info.render.calls} draw calls · ${canvas.width}x${canvas.height} · ${tier} tier`;
      stat.frames = 0; stat.t0 = now; stat.ms = [];
    }
  })(performance.now());
}
