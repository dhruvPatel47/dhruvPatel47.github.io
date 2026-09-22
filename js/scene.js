/* ============================================================
   3D scene — scroll drives a camera forward through depth.
   Each DOM section owns a set piece placed at its own scroll depth,
   so scrolling literally flies you into it.
   ============================================================ */
import * as THREE from 'three';

const ACID = 0xccff00;

/* Per-section mood. The renderer lerps between neighbours as you scroll,
   so the background changes continuously rather than snapping. */
const STATIONS = [
  { id: 'hero',    bg: 0x050505, fog: 0x050505, accent: 0xccff00 },
  { id: 'about',   bg: 0x04080a, fog: 0x04080a, accent: 0x7dffd4 },
  { id: 'work',    bg: 0x0a0604, fog: 0x0a0604, accent: 0xffb020 },
  { id: 'systems', bg: 0x03070d, fog: 0x03070d, accent: 0x38bdf8 },
  { id: 'shell',   bg: 0x050505, fog: 0x050505, accent: 0xccff00 },
  { id: 'stack',   bg: 0x08040c, fog: 0x08040c, accent: 0xc084fc },
  { id: 'contact', bg: 0x050505, fog: 0x050505, accent: 0xccff00 }
];

const TRACK = 900;          // world units travelled across the whole page
const clamp = (v, a, b) => Math.min(Math.max(v, a), b);
const lerp  = (a, b, t) => a + (b - a) * t;

export function initScene({ canvas, reduceMotion }) {
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' });
  } catch (e) {
    return null;                      // caller falls back to the flat design
  }
  if (!renderer.getContext()) return null;

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.6));
  renderer.setSize(window.innerWidth, window.innerHeight);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(STATIONS[0].bg);
  scene.fog = new THREE.Fog(STATIONS[0].fog, 40, 260);

  const camera = new THREE.PerspectiveCamera(62, window.innerWidth / window.innerHeight, 0.1, 400);
  camera.position.set(0, 0, 10);

  scene.add(new THREE.AmbientLight(0xffffff, 0.55));
  const key = new THREE.PointLight(ACID, 2.2, 220);
  key.position.set(0, 0, 20);
  scene.add(key);

  /* ---------- starfield: the depth cue that sells the movement ---------- */
  const starCount = window.innerWidth < 760 ? 900 : 2000;
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    starPos[i * 3]     = (Math.random() - 0.5) * 260;
    starPos[i * 3 + 1] = (Math.random() - 0.5) * 200;
    starPos[i * 3 + 2] = -Math.random() * (TRACK + 200) + 60;
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  const stars = new THREE.Points(starGeo, new THREE.PointsMaterial({
    color: ACID, size: 0.5, sizeAttenuation: true, transparent: true, opacity: 0.75
  }));
  scene.add(stars);

  /* ---------- tunnel rings: the "going inside" feeling ---------- */
  const ringGroup = new THREE.Group();
  const ringGeo = new THREE.TorusGeometry(16, 0.045, 3, 64);
  const ringMat = new THREE.MeshBasicMaterial({ color: ACID, transparent: true, opacity: 0.22 });
  const RING_GAP = 26;
  const ringCount = Math.ceil(TRACK / RING_GAP) + 4;
  for (let i = 0; i < ringCount; i++) {
    const m = new THREE.Mesh(ringGeo, ringMat);
    m.position.z = 20 - i * RING_GAP;
    m.rotation.z = i * 0.22;
    ringGroup.add(m);
  }
  scene.add(ringGroup);

  /* ---------- set pieces ---------- */
  const pieces = [];   // { group, z, spin }

  function addPiece(group, z, spin) {
    group.position.z = z;
    scene.add(group);
    pieces.push({ group, z, spin: spin || new THREE.Vector3(0.0015, 0.0022, 0) });
    return group;
  }

  const wire = (geo, color, opacity = 0.55) => new THREE.LineSegments(
    new THREE.WireframeGeometry(geo),
    new THREE.LineBasicMaterial({ color, transparent: true, opacity })
  );

  /* hero — a big wireframe solid with satellites orbiting it */
  function buildHero() {
    const g = new THREE.Group();
    g.add(wire(new THREE.IcosahedronGeometry(9, 1), ACID, 0.5));
    const inner = new THREE.Mesh(
      new THREE.IcosahedronGeometry(5.4, 0),
      new THREE.MeshStandardMaterial({ color: 0x0b0b0b, roughness: 0.4, metalness: 0.7,
                                       emissive: ACID, emissiveIntensity: 0.12 })
    );
    g.add(inner);
    for (let i = 0; i < 10; i++) {
      const c = new THREE.Mesh(
        new THREE.BoxGeometry(0.7, 0.7, 0.7),
        new THREE.MeshBasicMaterial({ color: ACID })
      );
      const a = (i / 10) * Math.PI * 2;
      c.position.set(Math.cos(a) * 15, Math.sin(a * 1.7) * 7, Math.sin(a) * 15);
      c.userData.a = a;
      g.add(c);
    }
    return g;
  }

  /* about — nested frames you pass straight through */
  function buildAbout() {
    const g = new THREE.Group();
    for (let i = 0; i < 7; i++) {
      const s = 26 - i * 2.6;
      const r = new THREE.LineSegments(
        new THREE.EdgesGeometry(new THREE.PlaneGeometry(s, s)),
        new THREE.LineBasicMaterial({ color: 0x7dffd4, transparent: true, opacity: 0.5 - i * 0.05 })
      );
      r.position.z = -i * 9;
      r.rotation.z = i * 0.16;
      g.add(r);
    }
    return g;
  }

  /* work — slabs drifting past on both sides */
  function buildWork() {
    const g = new THREE.Group();
    for (let i = 0; i < 10; i++) {
      const slab = wire(new THREE.BoxGeometry(11, 6.5, 0.4), 0xffb020, 0.48);
      slab.position.set((i % 2 ? 1 : -1) * (13 + Math.random() * 7),
                        (Math.random() - 0.5) * 22, -i * 11);
      slab.rotation.y = (i % 2 ? -1 : 1) * 0.42;
      g.add(slab);
    }
    return g;
  }

  /* systems — his EasyShop architecture as a real node graph in space */
  function buildSystems() {
    const g = new THREE.Group();
    const nodes = [
      [0, 0, 14], [-9, 3, 4], [-9, -7, 0], [2, 11, -4], [0, 1, -6],
      [11, 10, -14], [9, 0, -16], [7, -10, -18], [18, 6, -26],
      [18, -3, -28], [17, -11, -30]
    ];
    const links = [[0,1],[1,2],[1,4],[1,3],[3,4],[4,6],[6,8],[6,5],[6,9],[6,10],[6,7],[6,2],[0,5]];

    const sphereGeo = new THREE.SphereGeometry(1.15, 12, 10);
    const nodeMat = new THREE.MeshStandardMaterial({
      color: 0x0d0d0d, emissive: 0x38bdf8, emissiveIntensity: 0.5, roughness: 0.35, metalness: 0.6
    });
    nodes.forEach(([x, y, z]) => {
      const m = new THREE.Mesh(sphereGeo, nodeMat);
      m.position.set(x, y, z);
      g.add(m);

      const cage = wire(new THREE.BoxGeometry(3.4, 3.4, 3.4), 0x38bdf8, 0.28);
      cage.position.set(x, y, z);
      g.add(cage);
    });

    const pts = [];
    links.forEach(([a, b]) => {
      pts.push(new THREE.Vector3(...nodes[a]), new THREE.Vector3(...nodes[b]));
    });
    const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
    g.add(new THREE.LineSegments(lineGeo, new THREE.LineBasicMaterial({
      color: 0x38bdf8, transparent: true, opacity: 0.45
    })));

    // packets that crawl the links, same idea as the 2D blueprint
    const pk = new THREE.Group();
    links.forEach(([a, b], i) => {
      const dot = new THREE.Mesh(
        new THREE.SphereGeometry(0.28, 8, 6),
        new THREE.MeshBasicMaterial({ color: 0xaeeaff })
      );
      dot.userData = { a: new THREE.Vector3(...nodes[a]), b: new THREE.Vector3(...nodes[b]), t: i / links.length };
      pk.add(dot);
    });
    g.add(pk);
    g.userData.packets = pk;
    return g;
  }

  /* shell — a wall of cubes that ripples */
  function buildShell() {
    const g = new THREE.Group();
    const geo = new THREE.BoxGeometry(1.5, 1.5, 1.5);
    const mat = new THREE.MeshBasicMaterial({ color: ACID, wireframe: true, transparent: true, opacity: 0.4 });
    const N = 13;
    const mesh = new THREE.InstancedMesh(geo, mat, N * N);
    const d = new THREE.Object3D();
    let i = 0;
    for (let x = 0; x < N; x++) {
      for (let y = 0; y < N; y++) {
        d.position.set((x - N / 2) * 3.4, (y - N / 2) * 3.4, 0);
        d.updateMatrix();
        mesh.setMatrixAt(i++, d.matrix);
      }
    }
    g.add(mesh);
    g.userData.grid = { mesh, N, dummy: d };
    return g;
  }

  /* stack — a cloud of cubes on a sphere */
  function buildStack() {
    const g = new THREE.Group();
    const geo = new THREE.BoxGeometry(1, 1, 1);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x0d0d0d, emissive: 0xc084fc, emissiveIntensity: 0.45, roughness: 0.4, metalness: 0.5
    });
    const COUNT = 150;
    const mesh = new THREE.InstancedMesh(geo, mat, COUNT);
    const d = new THREE.Object3D();
    for (let i = 0; i < COUNT; i++) {
      // Fibonacci sphere — even spacing, no clustering at the poles.
      const phi = Math.acos(1 - 2 * (i + 0.5) / COUNT);
      const theta = Math.PI * (1 + Math.sqrt(5)) * i;
      const r = 17;
      d.position.set(r * Math.sin(phi) * Math.cos(theta), r * Math.cos(phi), r * Math.sin(phi) * Math.sin(theta));
      d.rotation.set(Math.random() * 3, Math.random() * 3, 0);
      const s = 0.6 + Math.random() * 1.5;
      d.scale.set(s, s, s);
      d.updateMatrix();
      mesh.setMatrixAt(i, d.matrix);
    }
    g.add(mesh);
    return g;
  }

  /* contact — a portal you end up inside */
  function buildContact() {
    const g = new THREE.Group();
    for (let i = 0; i < 4; i++) {
      const t = new THREE.Mesh(
        new THREE.TorusGeometry(11 + i * 3.5, 0.08, 3, 80),
        new THREE.MeshBasicMaterial({ color: ACID, transparent: true, opacity: 0.55 - i * 0.1 })
      );
      t.position.z = -i * 7;
      g.add(t);
    }
    return g;
  }

  const BUILDERS = {
    hero: buildHero, about: buildAbout, work: buildWork,
    systems: buildSystems, shell: buildShell, stack: buildStack, contact: buildContact
  };

  /* ---------- place each set piece at its section's scroll depth ---------- */
  let placed = [];
  function placePieces() {
    pieces.forEach(p => scene.remove(p.group));
    pieces.length = 0;
    placed = [];

    const docH = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    STATIONS.forEach(st => {
      const elm = document.getElementById(st.id);
      if (!elm) return;
      const centre = elm.offsetTop + elm.offsetHeight * 0.4;
      const prog = clamp(centre / docH, 0, 1);
      const z = 10 - prog * TRACK;
      const g = BUILDERS[st.id] ? BUILDERS[st.id]() : new THREE.Group();
      addPiece(g, z);
      placed.push({ st, prog, group: g });
    });
  }
  placePieces();

  /* ---------- scroll + pointer state ---------- */
  let progress = 0, targetProgress = 0;
  let mx = 0, my = 0, tmx = 0, tmy = 0;

  function onScroll() {
    const docH = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
    targetProgress = clamp((window.scrollY || window.pageYOffset) / docH, 0, 1);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if (!reduceMotion && window.matchMedia('(pointer:fine)').matches) {
    window.addEventListener('mousemove', e => {
      tmx = (e.clientX / window.innerWidth - 0.5) * 2;
      tmy = (e.clientY / window.innerHeight - 0.5) * 2;
    });
  }

  function onResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    placePieces();
  }
  let rt;
  window.addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(onResize, 180); });

  /* ---------- background blend between neighbouring stations ---------- */
  const cA = new THREE.Color(), cB = new THREE.Color();
  function updateMood(p) {
    if (placed.length < 2) return;
    let i = 0;
    while (i < placed.length - 2 && p > placed[i + 1].prog) i++;
    const a = placed[i], b = placed[i + 1] || a;
    const span = Math.max(0.0001, b.prog - a.prog);
    const t = clamp((p - a.prog) / span, 0, 1);

    cA.setHex(a.st.bg); cB.setHex(b.st.bg);
    scene.background.copy(cA).lerp(cB, t);
    scene.fog.color.copy(scene.background);

    cA.setHex(a.st.accent); cB.setHex(b.st.accent);
    key.color.copy(cA).lerp(cB, t);

    // Hand the blended accent to CSS so the DOM shifts with the scene.
    document.documentElement.style.setProperty('--scene-accent', '#' + key.color.getHexString());
  }

  /* ---------- render loop ---------- */
  let running = true, frame = 0;
  const clock = new THREE.Clock();

  function render() {
    if (!running) return;
    requestAnimationFrame(render);

    progress = lerp(progress, targetProgress, reduceMotion ? 1 : 0.075);
    mx = lerp(mx, tmx, 0.06);
    my = lerp(my, tmy, 0.06);
    const t = clock.getElapsedTime();

    camera.position.z = 10 - progress * TRACK;
    camera.position.x = mx * 3.2;
    camera.position.y = -my * 2.2;
    camera.rotation.y = -mx * 0.10;
    camera.rotation.x = my * 0.07;

    updateMood(progress);

    // Rings scroll with the camera so the tunnel never runs out.
    ringGroup.children.forEach((m, i) => {
      m.rotation.z += 0.0012 + i * 0.00002;
    });

    pieces.forEach(p => {
      p.group.rotation.x += p.spin.x;
      p.group.rotation.y += p.spin.y;

      const grid = p.group.userData.grid;
      if (grid) {
        const { mesh, N, dummy } = grid;
        let i = 0;
        for (let x = 0; x < N; x++) {
          for (let y = 0; y < N; y++) {
            dummy.position.set((x - N / 2) * 3.4, (y - N / 2) * 3.4,
                               Math.sin(x * 0.55 + y * 0.35 + t * 1.6) * 3.4);
            dummy.updateMatrix();
            mesh.setMatrixAt(i++, dummy.matrix);
          }
        }
        mesh.instanceMatrix.needsUpdate = true;
      }

      const pk = p.group.userData.packets;
      if (pk) {
        pk.children.forEach(dot => {
          dot.userData.t = (dot.userData.t + 0.0045) % 1;
          dot.position.lerpVectors(dot.userData.a, dot.userData.b, dot.userData.t);
        });
      }
    });

    stars.rotation.z += 0.0002;

    frame++;
    renderer.render(scene, camera);
  }

  if (reduceMotion) {
    // One frame, then stop: the scene is scenery, not information.
    progress = targetProgress;
    updateMood(progress);
    camera.position.z = 10 - progress * TRACK;
    renderer.render(scene, camera);
  } else {
    render();
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) { running = false; }
    else if (!running && !reduceMotion) { running = true; render(); }
  });

  return {
    relayout: onResize,
    dispose() { running = false; renderer.dispose(); }
  };
}
