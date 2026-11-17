/* ============================================================
   3D network map. The page scroll walks the camera through the
   incident; each stage changes which traffic flows and which hosts
   are hot. Visitor attacks from the red team console show up here.

   Budget: ~40 draw calls, unlit materials only, one instanced mesh
   for every packet, adaptive pixel ratio, nothing runs while the
   tab is hidden.
   ============================================================ */
import * as THREE from 'three';

const BG = 0x04060a, CYAN = 0x39f3bb, RED = 0xff3b4e, AMBER = 0xffb020, DIM = 0x1d5c4c, GREY = 0x3a434d;
const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = t => t * t * (3 - 2 * t);

const NODES = [
  { id: 'net',  label: 'INTERNET',     p: [-30, 0, 6] },
  { id: 'edge', label: 'EDGE / CDN',   p: [-17, 0, 0] },
  { id: 'sso',  label: 'SSO / IdP',    p: [-8, 0, 11] },
  { id: 'ws',   label: 'WIN11-WS01',   p: [-4, 0, -7] },
  { id: 'siem', label: 'WAZUH SIEM',   p: [8, 0, 4] },
  { id: 'ai',   label: 'AI TRIAGE',    p: [17, 0, 15] },
  { id: 'soar', label: 'SOAR',         p: [21, 0, 3] },
  { id: 'app',  label: 'LAMBDA · API', p: [15, 0, -15] },
  { id: 'db',   label: 'RDS MULTI-AZ', p: [25, 0, -19] }
];
const N = Object.fromEntries(NODES.map((n, i) => [n.id, i]));
const EDGES = [['net','edge'],['edge','sso'],['edge','ws'],['sso','ws'],['ws','siem'],['siem','ai'],
               ['siem','soar'],['soar','ai'],['ws','app'],['app','db'],['edge','app'],['sso','siem']];

/* Per stage: camera, node colours, traffic emitters [from, to, perSecond, colour, stopAt] and pulses. */
const C = (p, l) => ({ p: new THREE.Vector3(...p), l: new THREE.Vector3(...l) });
const STAGES = [
  { cam: C([-1, 34, 64], [-3, 0, -1]), shift: .44,
    col: { net: RED },
    flow: [['net','edge',2.2,RED],['edge','sso',.8,RED],['edge','ws',.6,RED]],
    pulse: [['net', 2.4, RED, 14]] },
  { cam: C([-46, 15, 24], [-14, 0, 2]),
    col: { net: RED, edge: AMBER },
    flow: [['net','edge',3,RED],['edge','sso',1.5,RED],['edge','ws',1.5,RED],['edge','app',1.2,RED,.55]],
    pulse: [['net', 1.3, RED, 30]] },
  { cam: C([-16, 11, 30], [-7, 0, 6]),
    col: { net: RED, edge: AMBER, sso: RED },
    flow: [['net','edge',3.5,RED],['edge','sso',4.5,RED,.82],['sso','siem',1.4,CYAN]],
    pulse: [['sso', 1.8, CYAN, 6]] },
  { cam: C([2, 13, 22], [1, 0, -1]),
    col: { net: GREY, ws: RED, siem: CYAN, ai: CYAN },
    flow: [['net','edge',1.6,RED,.45],['ws','siem',3.2,CYAN],['siem','ai',1.6,CYAN],['soar','ai',.6,CYAN]],
    pulse: [['siem', 1.6, CYAN, 7], ['edge', 2.6, CYAN, 4]] },
  { cam: C([30, 17, 10], [16, 0, -9]),
    col: { net: GREY, ws: AMBER, siem: CYAN, app: CYAN, db: CYAN, soar: CYAN },
    flow: [['ws','app',2.6,RED,.6],['siem','soar',1,CYAN],['ws','siem',1.4,CYAN],['app','db',.8,CYAN]],
    pulse: [['app', 2.2, CYAN, 6]], vpc: 1 },
  { cam: C([8, 36, 36], [5, 0, -1]),
    col: { net: GREY, ws: CYAN, siem: CYAN, ai: CYAN, soar: CYAN, app: CYAN, db: CYAN, sso: CYAN, edge: CYAN },
    flow: [['siem','ai',.7,CYAN],['siem','soar',.7,CYAN],['soar','ai',.5,CYAN],['ws','siem',.5,CYAN]],
    pulse: [['siem', 3.5, CYAN, 9]], vpc: .6 },
  { cam: C([0, 54, 44], [0, 0, -2]), shift: .16,
    col: { net: GREY, ws: CYAN, siem: CYAN, ai: CYAN, soar: CYAN, app: CYAN, db: CYAN, sso: CYAN, edge: CYAN },
    flow: [['edge','sso',.5,CYAN],['edge','ws',.5,CYAN],['ws','siem',.5,CYAN],['siem','soar',.4,CYAN],['app','db',.4,CYAN]],
    pulse: [], vpc: .5 }
];

/* What a visitor attack lights up: [target node, stopAt, defender pulse node]. */
const HITS = {
  scan: ['edge', 1, 'edge'], fail: ['sso', .85, 'sso'], brute: ['sso', .7, 'sso'], deflt: ['sso', .8, 'sso'],
  sqli: ['edge', .75, 'edge'], xss: ['edge', .75, 'edge'], trav: ['edge', .75, 'edge'], cmd: ['edge', .75, 'edge'],
  prompt: ['ai', .8, 'ai'], honey: ['edge', .9, 'edge']
};

function textSprite(text) {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 48;
  const g = c.getContext('2d');
  g.font = '500 22px "JetBrains Mono", Consolas, monospace';
  g.fillStyle = 'rgba(232,238,243,0.92)';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, 128, 25);
  const tex = new THREE.CanvasTexture(c);
  tex.minFilter = THREE.LinearFilter; tex.generateMipmaps = false;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, opacity: .85 }));
  s.scale.set(6.4, 1.2, 1);
  return s;
}

export function initNet({ canvas, reduceMotion }) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: 'high-performance' });
  } catch (e) { return null; }
  if (!renderer.getContext()) return null;

  const small = window.innerWidth < 760 || matchMedia('(pointer:coarse)').matches;
  const weak = (navigator.hardwareConcurrency || 4) <= 4;
  let dpr = Math.min(window.devicePixelRatio || 1, small ? 1.25 : 1.5);
  if (weak) dpr = Math.min(dpr, 1);
  renderer.setPixelRatio(dpr);
  renderer.setSize(window.innerWidth, window.innerHeight, false);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(BG);
  scene.fog = new THREE.Fog(BG, 38, 125);
  const camera = new THREE.PerspectiveCamera(small ? 62 : 52, window.innerWidth / window.innerHeight, 0.5, 220);

  /* ---------- floor grid ---------- */
  {
    const pts = [], S = 150, step = 5;
    for (let x = -S; x <= S; x += step) pts.push(x, 0, -S, x, 0, S);
    for (let z = -S; z <= S; z += step) pts.push(-S, 0, z, S, 0, z);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    const grid = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0x0f2a24, transparent: true, opacity: .55 }));
    grid.position.y = -0.02;
    scene.add(grid);
  }

  /* ---------- nodes ---------- */
  const nodeGeo = new THREE.OctahedronGeometry(1.15, 0);
  const ringGeo = new THREE.RingGeometry(2.1, 2.35, 40);
  const stemGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 2.6, 0)]);
  const pos = NODES.map(n => new THREE.Vector3(...n.p));
  const nodes = NODES.map((n, i) => {
    const color = new THREE.Color(DIM);
    const core = new THREE.Mesh(nodeGeo, new THREE.MeshBasicMaterial({ color, wireframe: true }));
    core.position.copy(pos[i]).setY(3.4);
    const ring = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color, transparent: true, opacity: .7, side: THREE.DoubleSide, depthWrite: false }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(pos[i]).setY(.02);
    const stem = new THREE.Line(stemGeo, new THREE.LineBasicMaterial({ color, transparent: true, opacity: .45 }));
    stem.position.copy(pos[i]);
    const label = textSprite(n.label);
    label.position.copy(pos[i]).setY(6.1);
    scene.add(core, ring, stem, label);
    return { core, ring, stem, color, target: new THREE.Color(DIM), phase: i * 0.7 };
  });
  // Packets travel at hub height so they read against the floor.
  const hub = pos.map(p => p.clone().setY(.6));

  /* ---------- edges ---------- */
  const edgeIdx = EDGES.map(([a, b]) => [N[a], N[b]]);
  {
    const pts = [];
    edgeIdx.forEach(([a, b]) => pts.push(hub[a].x, hub[a].y, hub[a].z, hub[b].x, hub[b].y, hub[b].z));
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    scene.add(new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0x1f6f5b, transparent: true, opacity: .55 })));
  }

  /* ---------- the VPC: a wireframe box that lights up when it holds ---------- */
  const vpcMat = new THREE.LineBasicMaterial({ color: CYAN, transparent: true, opacity: .12 });
  const vpc = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(22, 7, 13)), vpcMat);
  vpc.position.set(20, 3.5, -17);
  scene.add(vpc);
  const vpcLabel = textSprite('VPC 10.0.0.0/16');
  vpcLabel.position.set(11, 8.4, -23.5);
  vpcLabel.material.opacity = .5;
  scene.add(vpcLabel);

  /* ---------- packets: one instanced mesh ---------- */
  const MAX = small ? 90 : 160;
  const pkMesh = new THREE.InstancedMesh(new THREE.SphereGeometry(.3, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffffff }), MAX);
  pkMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  const tmpM = new THREE.Matrix4(), tmpV = new THREE.Vector3(), tmpC = new THREE.Color(), zeroM = new THREE.Matrix4().makeScale(0, 0, 0);
  const packets = Array.from({ length: MAX }, () => ({ on: false, a: 0, b: 0, t: 0, v: 1, stop: 1, col: 0 }));
  for (let i = 0; i < MAX; i++) { pkMesh.setMatrixAt(i, zeroM); pkMesh.setColorAt(i, tmpC.setHex(CYAN)); }
  pkMesh.frustumCulled = false;
  scene.add(pkMesh);
  let pkCursor = 0;

  function spawn(a, b, col, stop = 1) {
    for (let k = 0; k < MAX; k++) {
      const i = (pkCursor + k) % MAX;
      const p = packets[i];
      if (p.on) continue;
      pkCursor = (i + 1) % MAX;
      const len = hub[a].distanceTo(hub[b]);
      Object.assign(p, { on: true, a, b, t: 0, v: (small ? 11 : 13) / len, stop, col });
      pkMesh.setColorAt(i, tmpC.setHex(col));
      pkMesh.instanceColor.needsUpdate = true;
      return;
    }
  }

  /* ---------- pulses: a small pool of expanding rings ---------- */
  const pulseGeo = new THREE.RingGeometry(.92, 1, 48);
  const pulses = Array.from({ length: 10 }, () => {
    const m = new THREE.Mesh(pulseGeo, new THREE.MeshBasicMaterial({ color: CYAN, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false }));
    m.rotation.x = -Math.PI / 2; m.visible = false; scene.add(m);
    return { m, t: 1, r: 6 };
  });
  function pulse(at, col, r) {
    const p = pulses.find(q => q.t >= 1) || pulses[0];
    p.t = 0; p.r = r; p.m.visible = true;
    p.m.material.color.setHex(col);
    p.m.position.set(at.x, .05, at.z);
  }

  /* ---------- state ---------- */
  let stageF = window.__stageF || 0, curStage = -1;
  const camPos = new THREE.Vector3(), camLook = new THREE.Vector3(), wantPos = new THREE.Vector3(), wantLook = new THREE.Vector3();
  let mx = 0, my = 0, tmx = 0, tmy = 0;
  const flowAcc = [], pulseAcc = [];
  const rate = small ? .6 : 1;
  let dirty = true;

  // On wide screens the hero and closing text sit on the left, so those
  // stages shift the rendered map right (a view offset, not a camera move).
  let shift = 0, shiftSet = -1;
  function camAt(f, outP, outL) {
    const i = Math.floor(clamp(f, 0, STAGES.length - 1));
    const j = Math.min(i + 1, STAGES.length - 1);
    const t = smooth(clamp(f - i, 0, 1));
    outP.lerpVectors(STAGES[i].cam.p, STAGES[j].cam.p, t);
    outL.lerpVectors(STAGES[i].cam.l, STAGES[j].cam.l, t);
    return window.innerWidth > 900 ? lerp(STAGES[i].shift || 0, STAGES[j].shift || 0, t) : 0;
  }
  function applyShift(s) {
    const q = Math.round(s * 400) / 400;
    if (q === shiftSet) return;
    shiftSet = q;
    const w = window.innerWidth, h = window.innerHeight;
    if (q) camera.setViewOffset(w, h, -q * w, 0, w, h); else camera.clearViewOffset();
  }
  shift = camAt(stageF, camPos, camLook);
  applyShift(shift);

  function enterStage(s) {
    curStage = s;
    const st = STAGES[s];
    nodes.forEach((n, i) => n.target.setHex(st.col[NODES[i].id] ?? DIM));
    flowAcc.length = 0; pulseAcc.length = 0;
    st.flow.forEach(() => flowAcc.push(Math.random()));
    st.pulse.forEach(() => pulseAcc.push(0));
  }
  enterStage(Math.floor(stageF + .3));

  /* ---------- input ---------- */
  if (!reduceMotion && matchMedia('(pointer:fine)').matches) {
    window.addEventListener('mousemove', e => {
      tmx = e.clientX / window.innerWidth - .5;
      tmy = e.clientY / window.innerHeight - .5;
    }, { passive: true });
  }
  let rt;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => {
      camera.aspect = window.innerWidth / window.innerHeight;
      shiftSet = -1; applyShift(shift);
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight, false);
      dirty = true;
    }, 120);
  });

  /* ---------- frame ---------- */
  const clock = new THREE.Clock();
  let raf = 0, ema = 16, frames = 0, lastDrop = 0, cost = 0;

  function step(dt, t) {
    const s = Math.floor(stageF + .3);
    if (s !== curStage) enterStage(clamp(s, 0, STAGES.length - 1));
    const st = STAGES[curStage];

    // camera glides toward the scroll position
    const wantShift = camAt(stageF, wantPos, wantLook);
    const k = 1 - Math.pow(.0025, dt);           // frame-rate independent ease
    camPos.lerp(wantPos, k); camLook.lerp(wantLook, k);
    shift = lerp(shift, wantShift, k); applyShift(shift);
    mx = lerp(mx, tmx, k * .6); my = lerp(my, tmy, k * .6);
    camera.position.set(camPos.x + mx * 6, camPos.y - my * 3, camPos.z);
    camera.lookAt(camLook);

    // node colours ease toward the stage's state
    const ck = 1 - Math.pow(.02, dt);
    nodes.forEach(n => {
      n.color.lerp(n.target, ck);
      n.core.material.color.copy(n.color);
      n.ring.material.color.copy(n.color);
      n.stem.material.color.copy(n.color);
      n.core.rotation.y += dt * .6;
      n.core.position.y = 3.4 + Math.sin(t * 1.4 + n.phase) * .25;
    });
    vpcMat.opacity = lerp(vpcMat.opacity, st.vpc ? .18 + .5 * st.vpc * (.75 + .25 * Math.sin(t * 3)) : .12, ck);

    // traffic
    st.flow.forEach((f, i) => {
      flowAcc[i] += dt * f[2] * rate;
      while (flowAcc[i] >= 1) { flowAcc[i] -= 1; spawn(N[f[0]], N[f[1]], f[3], f[4] ?? 1); }
    });
    st.pulse.forEach((p, i) => {
      pulseAcc[i] += dt;
      if (pulseAcc[i] >= p[1]) { pulseAcc[i] = 0; pulse(pos[N[p[0]]], p[2], p[3]); }
    });

    for (let i = 0; i < MAX; i++) {
      const p = packets[i];
      if (!p.on) continue;
      p.t += p.v * dt;
      if (p.t >= p.stop) {
        p.on = false;
        pkMesh.setMatrixAt(i, zeroM);
        // A packet stopped short hit a control: show the block where it died.
        if (p.stop < 1 && Math.random() < .35) pulse(tmpV.lerpVectors(hub[p.a], hub[p.b], p.stop), CYAN, 2.4);
        continue;
      }
      tmpV.lerpVectors(hub[p.a], hub[p.b], p.t);
      tmpM.makeTranslation(tmpV.x, tmpV.y, tmpV.z);
      pkMesh.setMatrixAt(i, tmpM);
    }
    pkMesh.instanceMatrix.needsUpdate = true;

    pulses.forEach(p => {
      if (p.t >= 1) { p.m.visible = false; return; }
      p.t = Math.min(1, p.t + dt / 1.6);
      const s2 = .3 + p.r * p.t;
      p.m.scale.set(s2, s2, s2);
      p.m.material.opacity = (1 - p.t) * .8;
    });
  }

  function frame() {
    raf = requestAnimationFrame(frame);
    const dt = Math.min(clock.getDelta(), .05);
    const c0 = performance.now();
    step(dt, clock.elapsedTime);
    renderer.render(scene, camera);
    cost = cost * .95 + (performance.now() - c0) * .05;

    // Adaptive quality: if frames run long, drop the pixel ratio a notch.
    ema = ema * .95 + dt * 1000 * .05;
    frames++;
    if (frames > 90 && ema > 21 && dpr > .75 && clock.elapsedTime - lastDrop > 2.5) {
      dpr = Math.max(.75, dpr - .25);
      renderer.setPixelRatio(dpr);
      renderer.setSize(window.innerWidth, window.innerHeight, false);
      lastDrop = clock.elapsedTime; ema = 16;
    }
  }

  function still() {
    // Reduced motion: no traffic, just a camera that follows the story.
    if (!dirty) return;
    dirty = false;
    shift = camAt(stageF, camPos, camLook); applyShift(shift);
    enterStage(Math.floor(stageF + .3));
    nodes.forEach(n => { n.color.copy(n.target); n.core.material.color.copy(n.color); n.ring.material.color.copy(n.color); n.stem.material.color.copy(n.color); });
    camera.position.copy(camPos); camera.lookAt(camLook);
    renderer.render(scene, camera);
  }

  function start() { if (!raf && !reduceMotion) { clock.getDelta(); raf = requestAnimationFrame(frame); } }
  function stop() { cancelAnimationFrame(raf); raf = 0; }
  document.addEventListener('visibilitychange', () => (document.hidden ? stop() : start()));

  if (reduceMotion) still(); else start();
  if (reduceMotion) window.addEventListener('resize', () => setTimeout(still, 200));

  return {
    setStage(f) {
      stageF = f;
      if (reduceMotion) { dirty = true; requestAnimationFrame(still); }
    },
    hit(kind) {
      const h = HITS[kind];
      if (!h || reduceMotion) return;
      const to = N[h[0]];
      const from = to === N.edge ? N.net : N.edge;
      for (let i = 0; i < 5; i++) setTimeout(() => {
        spawn(N.net, N.edge, RED, to === N.edge ? h[1] : 1);
        if (to !== N.edge) setTimeout(() => spawn(from, to, RED, h[1]), 700);
      }, i * 110);
      setTimeout(() => { pulse(pos[N[h[2]]], CYAN, 7); pulse(pos[N.siem], CYAN, 9); }, 1500);
    },
    stats: () => ({ dpr, frameMs: +ema.toFixed(1), cpuMsPerFrame: +cost.toFixed(2) })
  };
}
