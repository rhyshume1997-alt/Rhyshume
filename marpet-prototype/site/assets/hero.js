// Homepage hero: an illustrative stainless steel belt conveyor that assembles itself.
// Geometry is procedural and modelled on Marpet's belt conveyor photographs
// (side frames, square-tube legs with adjustable feet, blue modular belt, flange bearings).
// It is a concept model, not a specific delivered machine.
import * as THREE from 'three';

const L = 3.0;   // length, metres
const W = 0.66;  // width between side frames
const BELT_Y = 0.9;

function brushedTexture() {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#5a5a5a';
  g.fillRect(0, 0, c.width, c.height);
  for (let i = 0; i < 2600; i++) {
    const y = Math.random() * c.height;
    const x = Math.random() * c.width;
    const len = 120 + Math.random() * 700;
    const v = Math.random() < 0.5 ? 255 : 0;
    g.strokeStyle = `rgba(${v},${v},${v},${0.03 + Math.random() * 0.09})`;
    g.lineWidth = Math.random() < 0.85 ? 1 : 2;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + len, y); g.stroke();
    if (x + len > c.width) { g.beginPath(); g.moveTo(0, y); g.lineTo(x + len - c.width, y); g.stroke(); }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

function beltTexture() {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = '#2a78d6';
  g.fillRect(0, 0, c.width, c.height);
  // modular belt: hinge rows across the width, staggered link slots
  for (let row = 0; row < 2; row++) {
    const x0 = row * 64;
    g.fillStyle = 'rgba(0,20,60,0.45)';
    g.fillRect(x0, 0, 5, c.height);
    g.fillStyle = 'rgba(255,255,255,0.16)';
    g.fillRect(x0 + 5, 0, 3, c.height);
    g.fillStyle = 'rgba(0,20,60,0.28)';
    for (let y = (row % 2) * 16; y < c.height; y += 32) g.fillRect(x0 + 22, y + 4, 26, 8);
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

// A plain photo studio for the steel to reflect: grey cyclorama, navy floor, three softboxes.
export function studio() {
  const s = new THREE.Scene();
  const geo = new THREE.SphereGeometry(20, 32, 16);
  const col = [];
  const top = new THREE.Color(0xe9edf2), mid = new THREE.Color(0xb9c0ca), low = new THREE.Color(0x27304d), c = new THREE.Color();
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const t = pos.getY(i) / 20;
    if (t > 0) c.copy(mid).lerp(top, t); else c.copy(mid).lerp(low, Math.min(1, -t * 5));
    col.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  s.add(new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide })));
  const soft = (w, h, x, y, z, k) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(k, k, k * 1.03), side: THREE.DoubleSide }));
    m.position.set(x, y, z); m.lookAt(0, 0.8, 0); s.add(m);
  };
  soft(9, 5, 0, 9, 3, 9);      // overhead
  soft(5, 7, -9, 4, 6, 6);     // front left
  soft(4, 6, 10, 3, 2, 4);     // right
  soft(10, 2, 0, 2.5, -10, 2.5); // back strip
  soft(8, 4, 3, 2.2, 11, 3.5);   // behind camera, fills the faces we look at
  return s;
}

export function initHero(root, opts = {}) {
  const canvas = root.querySelector('canvas');
  const gsap = window.gsap;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  } catch (e) {
    return null;
  }
  const lowPower = (navigator.hardwareConcurrency || 4) <= 4 || matchMedia('(max-width: 760px)').matches;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, lowPower ? 1.5 : 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envRT = pmrem.fromScene(studio(), 0.02);
  scene.environment = envRT.texture;
  scene.environmentIntensity = 1.0;

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 60);

  // lighting: one soft key with shadows, a cool rim. Nothing glows.
  const key = new THREE.DirectionalLight(0xffffff, 2.2);
  key.position.set(-3, 5.5, 4);
  key.castShadow = true;
  key.shadow.mapSize.set(lowPower ? 1024 : 2048, lowPower ? 1024 : 2048);
  Object.assign(key.shadow.camera, { left: -3.2, right: 3.2, top: 3, bottom: -3, near: 0.5, far: 16 });
  key.shadow.bias = -0.0004;
  key.shadow.radius = 5;
  scene.add(key);
  const rim = new THREE.DirectionalLight(0x9db7ff, 0.9);
  rim.position.set(4, 2.5, -4);
  scene.add(rim);

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30), new THREE.ShadowMaterial({ opacity: 0.42 }));
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // materials
  const brushed = brushedTexture();
  const steel = new THREE.MeshStandardMaterial({ color: 0xdadde1, metalness: 1, roughness: 0.4, roughnessMap: brushed, bumpMap: brushed, bumpScale: 0.035 });
  const steelTube = new THREE.MeshStandardMaterial({ color: 0xcfd3d8, metalness: 1, roughness: 0.3 });
  const polished = new THREE.MeshStandardMaterial({ color: 0xe6e8ea, metalness: 1, roughness: 0.16 });
  const beltMap = beltTexture();
  const beltMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: beltMap, metalness: 0, roughness: 0.55 });
  const beltEnd = new THREE.MeshStandardMaterial({ color: 0x2a78d6, metalness: 0, roughness: 0.55 });
  const bearingMat = new THREE.MeshStandardMaterial({ color: 0xd9541e, metalness: 0.1, roughness: 0.5 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x2b3038, metalness: 0.6, roughness: 0.5 });
  const rubber = new THREE.MeshStandardMaterial({ color: 0x14161a, metalness: 0, roughness: 0.9 });

  const rig = new THREE.Group();
  scene.add(rig);
  const disposables = [brushed, beltMap, envRT];
  const mesh = (geo, mat, parent, x = 0, y = 0, z = 0) => {
    const m = new THREE.Mesh(geo, mat);
    m.position.set(x, y, z);
    m.castShadow = true; m.receiveShadow = true;
    parent.add(m);
    disposables.push(geo);
    return m;
  };
  const box = (w, h, d) => new THREE.BoxGeometry(w, h, d);

  // side frames: folded stainless sheet with top and bottom return lips
  function sideFrame(sign) {
    const g = new THREE.Group();
    const railGeo = box(L, 0.2, 0.012);
    railGeo.attributes.uv.array.forEach((v, i, a) => { if (i % 2 === 0) a[i] = v * 3; });
    mesh(railGeo, steel, g, 0, 0.86, 0);
    mesh(box(L, 0.012, 0.036), steel, g, 0, 0.966, -sign * 0.012);
    mesh(box(L, 0.012, 0.036), steel, g, 0, 0.754, -sign * 0.012);
    g.position.z = sign * (W / 2 + 0.006);
    rig.add(g);
    return g;
  }
  const nearRail = sideFrame(1);
  const farRail = sideFrame(-1);

  // leg frames: square tube, braces, threaded adjustable feet
  const legFrames = [-1.15, 0, 1.15].map((x) => {
    const g = new THREE.Group();
    for (const s of [1, -1]) {
      const z = s * (W / 2 - 0.03);
      mesh(box(0.04, 0.7, 0.04), steelTube, g, 0, 0.4, z);
      mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.07, 12), polished, g, 0, 0.035, z);
      mesh(new THREE.CylinderGeometry(0.036, 0.042, 0.014, 24), polished, g, 0, 0.007, z);
    }
    mesh(box(0.03, 0.03, W - 0.1), steelTube, g, 0, 0.22, 0);
    mesh(box(0.04, 0.04, W - 0.02), steelTube, g, 0, 0.735, 0);
    g.position.x = x;
    rig.add(g);
    return g;
  });

  const crossMembers = [-1.25, -0.62, 0, 0.62, 1.25].map((x) => mesh(box(0.03, 0.03, W), steelTube, rig, x, 0.8, 0));
  const bed = mesh(box(L - 0.36, 0.004, W - 0.05), steel, rig, 0, BELT_Y - 0.008, 0);

  // end rollers
  const RX = L / 2 - 0.09;
  const rollers = [-RX, RX].map((x) => {
    const r = mesh(new THREE.CylinderGeometry(0.055, 0.055, W - 0.03, 40), polished, rig, x, 0.84, 0);
    r.rotation.x = Math.PI / 2;
    return r;
  });
  // flange bearings, as on the photographed conveyors
  const bearings = [];
  for (const x of [-RX, RX]) for (const s of [1, -1]) {
    const g = new THREE.Group();
    const a = mesh(new THREE.CylinderGeometry(0.047, 0.047, 0.022, 32), bearingMat, g);
    a.rotation.x = Math.PI / 2;
    const b = mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.034, 20), darkMat, g);
    b.rotation.x = Math.PI / 2;
    g.position.set(x, 0.84, s * (W / 2 + 0.024));
    g.userData.sign = s;
    rig.add(g); bearings.push(g);
  }

  // belt: top run, return run, wraps
  const belt = new THREE.Group();
  const BW = W - 0.05, BL = 2 * RX;
  const runGeo = box(BL, 0.008, BW);
  runGeo.attributes.uv.array.forEach((v, i, a) => { if (i % 2 === 0) a[i] = v * (BL / 0.1); });
  mesh(runGeo, beltMat, belt, RX, 0.84 + 0.059, 0);
  mesh(runGeo, beltMat, belt, RX, 0.84 - 0.059, 0);
  for (const [x, rot] of [[0, Math.PI], [BL, 0]]) {
    const wrap = mesh(new THREE.CylinderGeometry(0.063, 0.063, BW, 32, 1, true, rot, Math.PI), beltEnd, belt, x, 0.84, 0);
    wrap.rotation.x = Math.PI / 2;
    wrap.material.side = THREE.DoubleSide;
  }
  belt.position.x = -RX;
  rig.add(belt);

  // drive: gearbox and motor on the far side
  const drive = new THREE.Group();
  mesh(box(0.13, 0.13, 0.12), darkMat, drive, 0, 0, -0.06);
  const motor = mesh(new THREE.CylinderGeometry(0.058, 0.058, 0.24, 28), darkMat, drive, 0, 0, -0.24);
  motor.rotation.x = Math.PI / 2;
  drive.position.set(RX, 0.84, -(W / 2 + 0.03));
  rig.add(drive);

  // control box with emergency stop on the middle leg
  const control = new THREE.Group();
  mesh(box(0.15, 0.2, 0.07), steel, control);
  const yel = mesh(new THREE.CylinderGeometry(0.034, 0.034, 0.006, 28), new THREE.MeshStandardMaterial({ color: 0xf2c200, roughness: 0.6 }), control, 0, 0.03, 0.038);
  yel.rotation.x = Math.PI / 2;
  const red = mesh(new THREE.CylinderGeometry(0.02, 0.024, 0.026, 24), new THREE.MeshStandardMaterial({ color: 0xc81e1e, roughness: 0.45 }), control, 0, 0.03, 0.054);
  red.rotation.x = Math.PI / 2;
  mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.012, 16), rubber, control, 0, -0.05, 0.04).rotation.x = Math.PI / 2;
  control.position.set(0.28, 0.56, W / 2 + 0.05);
  rig.add(control);

  // logo plate: Marpet's existing logo artwork on a plate bolted to the near side frame
  const PLATE_W = 0.5, PLATE_H = PLATE_W * (107 / 293);
  const plate = new THREE.Group();
  const logoTex = new THREE.TextureLoader().load(opts.logo || 'assets/img/logo.jpg', () => { needsRender = true; shadowDirty(); });
  logoTex.colorSpace = THREE.SRGBColorSpace;
  logoTex.anisotropy = renderer.capabilities.getMaxAnisotropy();
  disposables.push(logoTex);
  const face = new THREE.MeshStandardMaterial({ map: logoTex, metalness: 0.25, roughness: 0.36 });
  mesh(box(PLATE_W, PLATE_H, 0.005), [steel, steel, steel, steel, face, steel], plate);
  const bolts = [];
  for (const sx of [-1, 1]) for (const sy of [-1, 1]) {
    const b = mesh(new THREE.CylinderGeometry(0.0075, 0.0075, 0.006, 6), polished, plate, sx * (PLATE_W / 2 - 0.016), sy * (PLATE_H / 2 - 0.016), 0.005);
    b.rotation.x = Math.PI / 2;
    bolts.push(b);
  }
  const PLATE_POS = new THREE.Vector3(-0.42, 0.86, W / 2 + 0.016);
  plate.position.copy(PLATE_POS);
  rig.add(plate);

  // camera poses
  const wide = () => root.clientWidth >= 900;
  const cam = { px: 0, py: 0, pz: 0, tx: 0, ty: 0, tz: 0 };
  const POSE = {
    close: { px: -1.75, py: 1.14, pz: 1.75, tx: -0.55, ty: 0.86, tz: 0.33 },
    mid: { px: 2.6, py: 2.1, pz: 5.6, tx: 0.2, ty: 0.6, tz: 0 },
    plate: { px: -0.05, py: 1.0, pz: 1.75, tx: -0.42, ty: 0.86, tz: 0.33 },
    final: () => (wide()
      ? { px: 3.0, py: 1.7, pz: 4.7, tx: 0.0, ty: 0.56, tz: 0 }
      : { px: 3.6, py: 2.0, pz: 6.4, tx: 0, ty: 0.55, tz: 0 }),
  };
  Object.assign(cam, POSE.close);
  const par = { x: 0, y: 0, tx: 0, ty: 0 };
  const target = new THREE.Vector3();

  let shadowsDirty = true;
  function shadowDirty() { shadowsDirty = true; }
  renderer.shadowMap.autoUpdate = false;

  function resize() {
    const w = root.clientWidth, h = root.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // on wide screens the model sits right of centre so copy can sit left
    if (wide()) camera.setViewOffset(w, h, -w * 0.2, -h * 0.02, w, h);
    else camera.clearViewOffset();
    camera.updateProjectionMatrix();
    needsRender = true;
  }

  // callouts: HTML links pinned to points on the model
  const callouts = [...root.querySelectorAll('[data-anchor]')].map((el) => {
    const [x, y, z] = el.dataset.anchor.split(',').map(Number);
    return { el, p: new THREE.Vector3(x, y, z) };
  });
  const v = new THREE.Vector3();
  function placeCallouts() {
    const w = root.clientWidth, h = root.clientHeight;
    for (const c of callouts) {
      v.copy(c.p).project(camera);
      c.el.style.transform = `translate(${((v.x + 1) / 2) * w}px, ${((1 - v.y) / 2) * h}px)`;
    }
  }

  // assembly timeline
  let running = false, beltRunning = false, needsRender = true;
  const tl = gsap.timeline({ paused: true, onUpdate: () => { needsRender = true; shadowDirty(); } });
  const show = (o, t) => { o.visible = false; tl.set(o, { visible: true }, t); };
  rig.position.y = 0.03;

  // Stage 1: arrival. The near side frame travels in along its own length.
  tl.from(nearRail.position, { x: -4.2, duration: 1.5, ease: 'power3.out' }, 0);
  tl.to(cam, { px: -1.45, tx: -0.35, duration: 1.7, ease: 'sine.inOut' }, 0);
  // Stage 2: assembly.
  legFrames.forEach((g, i) => { show(g, 1.25 + i * 0.13); tl.from(g.position, { z: -3.4, duration: 0.95, ease: 'power3.out' }, 1.25 + i * 0.13); });
  tl.to(cam, { ...POSE.mid, duration: 2.5, ease: 'power2.inOut' }, 1.3);
  show(farRail, 2.0); tl.from(farRail.position, { z: -2.6, duration: 0.85, ease: 'power3.out' }, 2.0);
  crossMembers.forEach((m, i) => { show(m, 2.35 + i * 0.07); tl.from(m.position, { y: 2.3, duration: 0.55, ease: 'power2.in' }, 2.35 + i * 0.07); });
  show(bed, 2.75); tl.from(bed.position, { y: 2.2, duration: 0.55, ease: 'power2.in' }, 2.75);
  rollers.forEach((r, i) => { show(r, 2.9 + i * 0.12); tl.from(r.position, { z: 1.9, duration: 0.6, ease: 'power3.out' }, 2.9 + i * 0.12); });
  bearings.forEach((b, i) => { show(b, 3.35 + i * 0.05); tl.from(b.position, { z: b.position.z + b.userData.sign * 0.7, duration: 0.4, ease: 'power3.out' }, 3.35 + i * 0.05); });
  show(drive, 3.3); tl.from(drive.position, { z: -1.9, duration: 0.55, ease: 'power3.out' }, 3.3);
  show(control, 3.4); tl.from(control.position, { z: 1.5, duration: 0.55, ease: 'power3.out' }, 3.4);
  show(belt, 3.6); tl.from(belt.scale, { x: 0.001, duration: 0.9, ease: 'power2.inOut' }, 3.6);
  // Stage 3: the frame lowers onto its feet, then the logo plate is fixed.
  tl.to(rig.position, { y: 0, duration: 0.32, ease: 'power2.in' }, 4.45);
  tl.call(() => { beltRunning = true; }, null, 4.8);
  show(plate, 4.6);
  tl.from(plate.position, { z: PLATE_POS.z + 0.85, y: PLATE_POS.y + 0.22, duration: 0.95, ease: 'power3.inOut' }, 4.6);
  tl.from(plate.rotation, { x: -1.15, duration: 0.95, ease: 'power3.inOut' }, 4.6);
  tl.to(cam, { ...POSE.plate, duration: 1.15, ease: 'power2.inOut' }, 4.35);
  bolts.forEach((b, i) => { tl.from(b.scale, { x: 0.01, y: 0.01, z: 0.01, duration: 0.14, ease: 'power2.out' }, 5.55 + i * 0.08); tl.from(b.rotation, { y: -2.5, duration: 0.18 }, 5.55 + i * 0.08); });
  tl.to(key.position, { x: 2.5, duration: 2.2, ease: 'sine.inOut' }, 4.6);
  // Stage 4: pull back to the homepage composition.
  tl.to(cam, { ...POSE.final(), duration: 1.5, ease: 'power3.inOut' }, 6.0);
  tl.call(() => opts.onReveal && opts.onReveal(), null, 6.5);
  tl.call(() => { done = true; opts.onDone && opts.onDone(); }, null, 7.5);
  tl.to({}, { duration: 0.01 }, 7.5);

  let done = false;
  function finish() {
    tl.progress(1);
    Object.assign(cam, POSE.final());
    beltRunning = true; done = true;
    opts.onReveal && opts.onReveal();
    opts.onDone && opts.onDone();
    needsRender = true; shadowDirty();
  }

  let raf = 0, last = performance.now(), visible = true;
  function frame(now) {
    raf = requestAnimationFrame(frame);
    if (!visible || document.hidden) return;
    const dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (beltRunning && !opts.still) {
      beltMap.offset.x -= dt * 0.9;
      rollers.forEach((r) => { r.rotation.y += dt * 2.2; });
      needsRender = true;
    }
    if (done) {
      par.x += (par.tx - par.x) * 0.06; par.y += (par.ty - par.y) * 0.06;
      if (Math.abs(par.tx - par.x) > 0.0005 || Math.abs(par.ty - par.y) > 0.0005) needsRender = true;
    }
    if (!needsRender) return;
    needsRender = false;
    camera.position.set(cam.px + par.x * 0.5, cam.py + par.y * 0.22, cam.pz);
    target.set(cam.tx, cam.ty, cam.tz);
    camera.lookAt(target);
    if (shadowsDirty) { renderer.shadowMap.needsUpdate = true; shadowsDirty = false; }
    renderer.render(scene, camera);
    if (callouts.length) placeCallouts();
  }

  const ro = new ResizeObserver(() => { if (done) Object.assign(cam, POSE.final()); resize(); });
  ro.observe(root);
  const io = new IntersectionObserver((e) => { visible = e[0].isIntersecting; last = performance.now(); });
  io.observe(root);
  const onPointer = (e) => {
    if (!done || e.pointerType === 'touch') return;
    par.tx = (e.clientX / window.innerWidth - 0.5);
    par.ty = -(e.clientY / window.innerHeight - 0.5);
  };
  window.addEventListener('pointermove', onPointer, { passive: true });

  resize();
  raf = requestAnimationFrame(frame);

  return {
    play() { done = false; beltRunning = false; tl.restart(); running = true; },
    finish,
    seek(p) { tl.progress(p); tl.pause(); beltRunning = p > 0.64; if (p >= 1) finish(); needsRender = true; shadowDirty(); },
    get running() { return running && !done; },
    destroy() {
      cancelAnimationFrame(raf); tl.kill(); ro.disconnect(); io.disconnect();
      window.removeEventListener('pointermove', onPointer);
      disposables.forEach((d) => d.dispose && d.dispose());
      pmrem.dispose(); renderer.dispose();
    },
  };
}
