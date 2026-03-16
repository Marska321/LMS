/* ═══════════════════════════════════════════════════════
   3-D WORLD
════════════════════════════════════════════════════════ */
let renderer, scene, camera, carGroup, clock;
let carVel = 0, carAngle = 0;
const keys = {};
let buildingMeshes = [];
let nearBuilding = null;
let camPos = null;
let camLookAt = null;
let worldInputBound = false;
let treeTops = [];
let cloudGroups = [];
let dustPuffs = [];
let worldStar = null;
const WORLD_SUBJECTS_ORDER = [
  'Mathematics','Natural Sciences','English HL','Social Sciences','Afrikaans FAL','Life Skills'
];
const BUILDING_POSITIONS = [
  {x:-11,z:-11},{x:11,z:-11},{x:11,z:11},{x:-11,z:11},{x:0,z:-16},{x:0,z:16}
];

function initWorld() {
  if (typeof THREE === 'undefined') return false;

  const canvas = document.getElementById('world-canvas');
  const W = canvas.clientWidth, H = canvas.clientHeight;
  if (!canvas || !W || !H) return false;

  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 35, 90);

    camera = new THREE.PerspectiveCamera(52, W/H, 0.1, 200);
    camera.position.set(0, 15, 15);
    clock = new THREE.Clock();
    camPos = new THREE.Vector3(0, 15, 15);
    camLookAt = new THREE.Vector3();

    // Lighting
    const sun = new THREE.DirectionalLight(0xfff8e8, 1.5);
    sun.position.set(25, 35, 20);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = sun.shadow.camera.bottom = -45;
    sun.shadow.camera.right = sun.shadow.camera.top = 45;
    sun.shadow.camera.far = 130;
    scene.add(sun);
    scene.add(new THREE.AmbientLight(0xc8d8ff, 0.75));
    const fill = new THREE.DirectionalLight(0xffffff, 0.3);
    fill.position.set(-10, 5, -10);
    scene.add(fill);

    buildScene();
    buildCar();
    bindInput();
    animate();
    window.addEventListener('resize', onResize);
    worldReady = true;
    return true;
  } catch (err) {
    console.error('World init failed', err);
    worldReady = false;
    renderer = null;
    scene = null;
    camera = null;
    carGroup = null;
    clock = null;
    camPos = null;
    camLookAt = null;
    return false;
  }
}

function buildScene() {
  treeTops = [];
  cloudGroups = [];
  dustPuffs = [];

  // Ground
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(110, 110),
    new THREE.MeshLambertMaterial({ color: 0x7ec850 })
  );
  ground.rotation.x = -Math.PI/2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Paths (cross)
  [[0,0,4,46],[0,0,46,4]].forEach(([x,z,w,l]) => {
    const road = new THREE.Mesh(
      new THREE.PlaneGeometry(w, l),
      new THREE.MeshLambertMaterial({ color: 0x666666 })
    );
    road.rotation.x = -Math.PI/2;
    road.position.set(x, 0.01, z);
    road.receiveShadow = true;
    scene.add(road);
  });

  // Road lines
  const lineMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
  for (let i = -7; i <= 7; i++) {
    if (Math.abs(i) < 1) continue;
    const d1 = new THREE.Mesh(new THREE.PlaneGeometry(0.18, 1.2), lineMat);
    d1.rotation.x = -Math.PI/2; d1.position.set(0, 0.02, i * 3);
    scene.add(d1);
    const d2 = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 0.18), lineMat);
    d2.rotation.x = -Math.PI/2; d2.position.set(i * 3, 0.02, 0);
    scene.add(d2);
  }

  // Trees
  const treePts = [
    [-6,6],[-8,2.5],[-6,-6],[-8,-2.5],[6,6],[8,2.5],[6,-6],[8,-2.5],
    [-13,0],[13,0],[0,-13],[0,13],[-10,10],[10,10],[-10,-10],[10,-10],
    [-16,5],[16,5],[-5,16],[5,-16]
  ];
  treePts.forEach(([tx,tz]) => makeTree(tx, tz));
  makeClouds();

  // Buildings
  const ch = getChild();
  const subjects = CAPS_CURRICULUM[ch.grade];
  buildingMeshes = [];
  WORLD_SUBJECTS_ORDER.forEach((name, i) => {
    const sub = subjects[name];
    if (!sub) return;
    const pos = BUILDING_POSITIONS[i];
    const prog = calcProgress(activeChildId, ch.grade, name);
    buildingMeshes.push(makeBuilding(name, sub, pos.x, pos.z, prog));
  });

  // Central fountain/star
  const base = new THREE.Mesh(
    new THREE.CylinderGeometry(1.2, 1.4, 0.3, 12),
    new THREE.MeshLambertMaterial({ color: 0xccbbaa })
  );
  base.position.set(0, 0.15, 0);
  base.castShadow = true;
  scene.add(base);
  worldStar = new THREE.Mesh(
    new THREE.SphereGeometry(0.35, 8, 8),
    new THREE.MeshLambertMaterial({ color: 0xffd700 })
  );
  worldStar.position.set(0, 0.7, 0);
  scene.add(worldStar);
}

function makeTree(tx, tz) {
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.18, 1.3, 7),
    new THREE.MeshLambertMaterial({ color: 0x7b4f2e })
  );
  trunk.position.set(tx, 0.65, tz);
  trunk.castShadow = true;
  scene.add(trunk);
  const colors = [0x2d8a40, 0x3a9b4d, 0x258030];
  const top = new THREE.Mesh(
    new THREE.SphereGeometry(0.85 + Math.random()*0.2, 7, 7),
    new THREE.MeshLambertMaterial({ color: colors[Math.floor(Math.random()*3)] })
  );
  top.position.set(tx, 1.95 + Math.random()*0.2, tz);
  top.castShadow = true;
  scene.add(top);
  treeTops.push({
    mesh: top,
    baseX: top.position.x,
    baseZ: top.position.z,
    phase: Math.random() * Math.PI * 2,
  });
}

function makeClouds() {
  const cloudAnchors = [
    [-22, 18, -18], [-8, 20, 10], [10, 17, -8], [24, 19, 16], [0, 22, 24]
  ];
  cloudAnchors.forEach(([x, y, z], idx) => {
    const group = new THREE.Group();
    const puffGeo = new THREE.SphereGeometry(1.8, 10, 10);
    [[0, 0, 0], [1.6, 0.2, 0.4], [-1.6, 0.1, 0.2], [0.4, 0.5, -0.6]].forEach(([px, py, pz], i) => {
      const puff = new THREE.Mesh(
        puffGeo,
        new THREE.MeshLambertMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.82,
        })
      );
      puff.scale.setScalar(i === 0 ? 1.15 : 0.9 + Math.random() * 0.2);
      puff.position.set(px, py, pz);
      group.add(puff);
    });
    group.position.set(x, y, z);
    scene.add(group);
    cloudGroups.push({
      group,
      baseY: y,
      drift: 0.3 + Math.random() * 0.25,
      bob: 0.12 + Math.random() * 0.08,
      phase: idx * 0.8 + Math.random(),
    });
  });
}

function makeBuilding(name, sub, x, z, progPct) {
  const group = new THREE.Group();
  const col = new THREE.Color(sub.color);
  const lightCol = new THREE.Color(sub.color).lerp(new THREE.Color(0xffffff), 0.5);
  let flag = null;

  // Base
  const base = new THREE.Mesh(
    new THREE.BoxGeometry(3.8, 3.2, 3.8),
    new THREE.MeshLambertMaterial({ color: col })
  );
  base.position.y = 1.6;
  base.castShadow = base.receiveShadow = true;
  group.add(base);

  // Roof
  const roof = new THREE.Mesh(
    new THREE.CylinderGeometry(0, 2.8, 2, 4),
    new THREE.MeshLambertMaterial({ color: lightCol })
  );
  roof.position.y = 4.2;
  roof.rotation.y = Math.PI/4;
  roof.castShadow = true;
  group.add(roof);

  // Door
  const door = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 1, 0.12),
    new THREE.MeshLambertMaterial({ color: 0xfff3e0 })
  );
  door.position.set(0, 0.5, 1.97);
  group.add(door);

  const sign = makeSubjectSign(sub);
  sign.position.set(0, 5.5, 2.15);
  group.add(sign);

  const beacon = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.18, 0.7, 10),
    new THREE.MeshLambertMaterial({
      color: 0xfff2b3,
      emissive: 0xffc94d,
      emissiveIntensity: 0.65,
      transparent: true,
      opacity: 0.9,
    })
  );
  beacon.position.set(0, 6.4, 0);
  group.add(beacon);

  const halo = new THREE.Mesh(
    new THREE.TorusGeometry(2.7, 0.08, 8, 48),
    new THREE.MeshLambertMaterial({
      color: lightCol,
      emissive: col,
      emissiveIntensity: 0.2,
      transparent: true,
      opacity: 0.8,
    })
  );
  halo.rotation.x = Math.PI / 2;
  halo.position.set(0, 0.12, 0);
  group.add(halo);

  // Windows
  const winMat = new THREE.MeshLambertMaterial({ color: 0xaee1ff, transparent: true, opacity: 0.7 });
  [[-1, 1.8], [1, 1.8]].forEach(([wx, wy]) => {
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.1), winMat);
    win.position.set(wx, wy, 1.97);
    group.add(win);
  });

  // Progress bar on front
  const pBarBg = new THREE.Mesh(
    new THREE.BoxGeometry(2.4, 0.22, 0.1),
    new THREE.MeshLambertMaterial({ color: 0x333333, transparent: true, opacity: 0.5 })
  );
  pBarBg.position.set(0, 2.8, 1.98);
  group.add(pBarBg);

  const pBarFill = new THREE.Mesh(
    new THREE.BoxGeometry(2.4 * (progPct/100 || 0.01), 0.22, 0.12),
    new THREE.MeshLambertMaterial({ color: 0xffd700 })
  );
  pBarFill.position.set(-1.2 + 1.2*(progPct/100), 2.8, 1.99);
  group.add(pBarFill);

  // Flag if >25%
  if (progPct >= 25) {
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.04, 1.8, 6),
      new THREE.MeshLambertMaterial({ color: 0xaaaaaa })
    );
    pole.position.set(1.7, 6, 0);
    group.add(pole);
    flag = new THREE.Mesh(
      new THREE.PlaneGeometry(0.8, 0.5),
      new THREE.MeshLambertMaterial({ color: 0xffd700, side: THREE.DoubleSide })
    );
    flag.position.set(2.1, 6.6, 0);
    group.add(flag);
  }

  group.position.set(x, 0, z);
  group.userData = { subject: name, subData: sub, progress: progPct, beacon, halo, sign, flag, progressFill: pBarFill };
  scene.add(group);
  return group;
}

function makeSubjectSign(sub) {
  const sign = new THREE.Group();
  const plate = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 0.95, 0.12),
    new THREE.MeshLambertMaterial({ color: 0xfffbf1 })
  );
  sign.add(plate);

  const icon = makeIconBadge(sub);
  icon.position.set(0, 0, 0.08);
  sign.add(icon);
  return sign;
}

function makeIconBadge(sub) {
  const color = new THREE.Color(sub.color);
  const badge = new THREE.Group();
  const bg = new THREE.Mesh(
    new THREE.CircleGeometry(0.28, 20),
    new THREE.MeshLambertMaterial({ color })
  );
  badge.add(bg);

  switch (sub.icon) {
    case '📐': {
      const tri = new THREE.Mesh(
        new THREE.RingGeometry(0.08, 0.22, 3),
        new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide })
      );
      tri.rotation.z = Math.PI / 6;
      badge.add(tri);
      break;
    }
    case '📚': {
      const b1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.24, 0.03), new THREE.MeshLambertMaterial({ color: 0xffffff }));
      const b2 = b1.clone();
      b1.position.x = -0.06;
      b2.position.x = 0.06;
      badge.add(b1);
      badge.add(b2);
      break;
    }
    case '🔬': {
      const stem = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.24, 0.03), new THREE.MeshLambertMaterial({ color: 0xffffff }));
      const arm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.05, 0.03), new THREE.MeshLambertMaterial({ color: 0xffffff }));
      stem.rotation.z = -0.45;
      arm.rotation.z = -0.55;
      stem.position.set(-0.02, 0.02, 0.02);
      arm.position.set(0.03, -0.03, 0.02);
      badge.add(stem);
      badge.add(arm);
      break;
    }
    case '🌍': {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(0.14, 0.025, 8, 28),
        new THREE.MeshLambertMaterial({ color: 0xffffff })
      );
      const meridian = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.24, 0.02), new THREE.MeshLambertMaterial({ color: 0xffffff }));
      badge.add(ring);
      badge.add(meridian);
      break;
    }
    case '🌿': {
      const leaf = new THREE.Mesh(
        new THREE.CircleGeometry(0.12, 16, 0, Math.PI),
        new THREE.MeshLambertMaterial({ color: 0xffffff, side: THREE.DoubleSide })
      );
      leaf.rotation.z = 1;
      const stem = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.18, 0.02), new THREE.MeshLambertMaterial({ color: 0xffffff }));
      stem.position.set(-0.02, -0.08, 0);
      badge.add(leaf);
      badge.add(stem);
      break;
    }
    default: {
      const star = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.14, 0),
        new THREE.MeshLambertMaterial({ color: 0xffffff })
      );
      star.scale.set(1, 0.45, 0.3);
      badge.add(star);
    }
  }

  return badge;
}

function buildCar() {
  carGroup = new THREE.Group();
  const ch = getChild();
  const bodyColor = new THREE.Color(ch.color);

  // Body
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 0.55, 2.1),
    new THREE.MeshLambertMaterial({ color: bodyColor })
  );
  body.position.y = 0.52;
  body.castShadow = true;
  carGroup.add(body);

  // Cabin
  const cabin = new THREE.Mesh(
    new THREE.BoxGeometry(0.85, 0.42, 1.1),
    new THREE.MeshLambertMaterial({ color: new THREE.Color(ch.color).lerp(new THREE.Color(0xffffff), 0.25) })
  );
  cabin.position.set(0, 0.97, -0.1);
  cabin.castShadow = true;
  carGroup.add(cabin);

  // Windshield
  const ws = new THREE.Mesh(
    new THREE.BoxGeometry(0.82, 0.37, 0.06),
    new THREE.MeshLambertMaterial({ color: 0xaaddff, transparent: true, opacity: 0.65 })
  );
  ws.position.set(0, 0.97, 0.48);
  carGroup.add(ws);

  // Wheels
  const wGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.2, 12);
  const wMat = new THREE.MeshLambertMaterial({ color: 0x1a1a1a });
  [[-0.6,0.24,-0.62],[0.6,0.24,-0.62],[-0.6,0.24,0.62],[0.6,0.24,0.62]].forEach(([wx,wy,wz]) => {
    const w = new THREE.Mesh(wGeo, wMat);
    w.rotation.z = Math.PI/2;
    w.position.set(wx,wy,wz);
    w.castShadow = true;
    carGroup.add(w);
    // Hub
    const hub = new THREE.Mesh(
      new THREE.CylinderGeometry(0.1, 0.1, 0.21, 8),
      new THREE.MeshLambertMaterial({ color: 0xcccccc })
    );
    hub.rotation.z = Math.PI/2;
    hub.position.set(wx,wy,wz);
    carGroup.add(hub);
  });

  // Headlights
  const hlMat = new THREE.MeshLambertMaterial({ color: 0xffffcc });
  [[-0.32, 0.52, 1.06],[0.32, 0.52, 1.06]].forEach(([hx,hy,hz]) => {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.13, 0.06), hlMat);
    hl.position.set(hx,hy,hz);
    carGroup.add(hl);
  });

  carGroup.position.set(0, 0, 3);
  scene.add(carGroup);
}

function bindInput() {
  if (worldInputBound) return;
  worldInputBound = true;
  document.addEventListener('keydown', e => {
    keys[e.code] = true;
    if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      enterSubjectFromWorld();
    }
    if (e.code === 'Tab') { e.preventDefault(); showScreen('dash'); }
    if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code)) e.preventDefault();
  });
  document.addEventListener('keyup', e => { keys[e.code] = false; });

  const dmap = {
    'd-up':'ArrowUp','d-down':'ArrowDown','d-left':'ArrowLeft','d-right':'ArrowRight'
  };
  Object.entries(dmap).forEach(([btnId, code]) => {
    const btn = document.getElementById(btnId);
    const set = v => () => { keys[code] = v; };
    btn.addEventListener('touchstart', set(true), { passive: true });
    btn.addEventListener('touchend', set(false), { passive: true });
    btn.addEventListener('mousedown', set(true));
    btn.addEventListener('mouseup', set(false));
    btn.addEventListener('mouseleave', set(false));
  });
}

function onResize() {
  if (!renderer) return;
  const canvas = document.getElementById('world-canvas');
  const W = canvas.clientWidth, H = canvas.clientHeight;
  renderer.setSize(W, H, false);
  camera.aspect = W / H;
  camera.updateProjectionMatrix();
}

const MAX_SPD = 0.13, ACCEL = 0.007, FRICTION = 0.91, TURN = 0.044;

function animate() {
  requestAnimationFrame(animate);
  if (!worldReady || !renderer || !scene || !camera || !carGroup || !camPos || !camLookAt) return;
  if (document.getElementById('screen-world').classList.contains('hidden')) return;
  const time = performance.now() * 0.001;

  const fwd = keys['ArrowUp']   || keys['KeyW'];
  const bwd = keys['ArrowDown'] || keys['KeyS'];
  const lft = keys['ArrowLeft'] || keys['KeyA'];
  const rgt = keys['ArrowRight']|| keys['KeyD'];

  if (fwd) carVel = Math.min(carVel + ACCEL, MAX_SPD);
  else if (bwd) carVel = Math.max(carVel - ACCEL, -MAX_SPD * 0.55);
  else carVel *= FRICTION;

  if (Math.abs(carVel) > 0.004) {
    const td = carVel > 0 ? 1 : -1;
    const spd = Math.min(Math.abs(carVel)/MAX_SPD + 0.3, 1);
    if (lft) carAngle += TURN * td * spd;
    if (rgt) carAngle -= TURN * td * spd;
  }

  let nx = carGroup.position.x + Math.sin(carAngle) * carVel;
  let nz = carGroup.position.z + Math.cos(carAngle) * carVel;
  nx = Math.max(-23, Math.min(23, nx));
  nz = Math.max(-23, Math.min(23, nz));

  let blocked = false;
  for (const b of buildingMeshes) {
    if (Math.abs(nx - b.position.x) < 2.5 && Math.abs(nz - b.position.z) < 2.5) {
      blocked = true; break;
    }
  }
  if (!blocked) { carGroup.position.x = nx; carGroup.position.z = nz; }
  else { carVel *= -0.35; }
  carGroup.rotation.y = carAngle;

  // Wheel spin
  const spinAmt = carVel * 0.5;
  carGroup.children.forEach((c, i) => {
    if (i >= 3 && i <= 6) c.rotation.x += spinAmt;
  });
  updateDust();
  updateClouds(time);
  updateTrees(time);

  // Camera follow
  const carPos = carGroup.position;
  const behind = new THREE.Vector3(
    Math.sin(carAngle) * -16,
    14 + Math.abs(carVel) * 5,
    Math.cos(carAngle) * -16
  );
  camPos.lerp(carPos.clone().add(behind), 0.055);
  camera.position.set(camPos.x, camPos.y + Math.sin(time * 7) * Math.min(Math.abs(carVel) * 3, 0.18), camPos.z);
  camLookAt.lerp(carPos.clone().add(new THREE.Vector3(0, 0.5, 0)), 0.08);
  camera.lookAt(camLookAt);
  camera.rotation.z = -carVel * 0.08;

  // Proximity check
  let closest = null, closestDist = 6;
  for (const b of buildingMeshes) {
    const d = carPos.distanceTo(b.position);
    if (d < closestDist) { closest = b; closestDist = d; }
    // Glow near
    if (d < 9) {
      b.children[0].material.emissive = b.children[0].material.emissive || new THREE.Color();
      b.children[0].material.emissive.set(0x111111);
      b.children[0].material.emissiveIntensity = 0.1 + 0.08 * Math.sin(time * 2 + b.position.x);
    } else {
      if (b.children[0].material.emissive) b.children[0].material.emissiveIntensity = 0;
    }
    if (b.userData.halo) {
      b.userData.halo.rotation.z = time * 0.45;
      b.userData.halo.material.emissiveIntensity = nearBuilding === b ? 0.55 : 0.2 + b.userData.progress / 250;
    }
    if (b.userData.beacon) {
      b.userData.beacon.position.y = 6.4 + Math.sin(time * 2.5 + b.position.x) * 0.16;
      b.userData.beacon.material.emissiveIntensity = nearBuilding === b ? 1 : 0.65;
    }
    if (b.userData.sign) b.userData.sign.lookAt(camera.position);
    if (b.userData.flag) b.userData.flag.rotation.y = Math.sin(time * 2 + b.position.x * 0.5) * 0.4;
  }

  // Central star spin
  if (worldStar) {
    worldStar.rotation.y += 0.02;
    worldStar.position.y = 0.7 + Math.sin(time * 2.2) * 0.08;
  }

  if (closest !== nearBuilding) {
    nearBuilding = closest;
    const bar = document.getElementById('approach-bar');
    const enterBtn = document.getElementById('world-enter-btn');
    if (closest) {
      document.getElementById('approach-name').textContent =
        closest.userData.subData.icon + ' ' + closest.userData.subject;
      bar.classList.remove('hidden');
      enterBtn.style.display = 'block';
      enterBtn.textContent = 'Enter ' + closest.userData.subData.icon;
    } else {
      bar.classList.add('hidden');
      enterBtn.style.display = 'none';
    }
  }

  drawMinimap();
  renderer.render(scene, camera);
}

function drawMinimap() {
  const mc = document.getElementById('minimap-canvas');
  const ctx = mc.getContext('2d');
  const W = mc.width, H = mc.height;
  const S = W / 50; // scale: 50 world units = full minimap
  const ox = W/2, oz = H/2;
  ctx.clearRect(0,0,W,H);
  ctx.fillStyle = '#1a3a28';
  ctx.fillRect(0,0,W,H);

  // Roads
  ctx.fillStyle = '#555';
  ctx.fillRect(ox-4*S/2, 0, 4*S, H);
  ctx.fillRect(0, oz-4*S/2, W, 4*S);

  // Buildings
  buildingMeshes.forEach(b => {
    const bx = ox + b.position.x * S;
    const bz = oz + b.position.z * S;
    ctx.fillStyle = b.userData.subData.color;
    ctx.fillRect(bx - 3*S/2, bz - 3*S/2, 3*S, 3*S);
  });

  // Car
  ctx.save();
  const cx = ox + carGroup.position.x * S;
  const cz = oz + carGroup.position.z * S;
  ctx.translate(cx, cz);
  ctx.rotate(-carAngle);
  ctx.fillStyle = getChild().color;
  ctx.fillRect(-S*0.6, -S*1, S*1.2, S*2);
  ctx.restore();
}

function updateClouds(time) {
  cloudGroups.forEach(cloud => {
    cloud.group.position.x += cloud.drift * 0.01;
    if (cloud.group.position.x > 32) cloud.group.position.x = -32;
    cloud.group.position.y = cloud.baseY + Math.sin(time * 0.7 + cloud.phase) * cloud.bob;
    cloud.group.rotation.y = Math.sin(time * 0.2 + cloud.phase) * 0.08;
  });
}

function updateTrees(time) {
  treeTops.forEach(tree => {
    tree.mesh.position.x = tree.baseX + Math.sin(time * 1.8 + tree.phase) * 0.12;
    tree.mesh.position.z = tree.baseZ + Math.cos(time * 1.3 + tree.phase) * 0.12;
    tree.mesh.rotation.z = Math.sin(time * 1.5 + tree.phase) * 0.08;
  });
}

function updateDust() {
  if (Math.abs(carVel) > 0.05 && dustPuffs.length < 18) spawnDustPuff();

  dustPuffs = dustPuffs.filter(puff => {
    puff.life -= 0.03;
    puff.mesh.position.x += puff.vx;
    puff.mesh.position.y += 0.015;
    puff.mesh.position.z += puff.vz;
    puff.mesh.scale.multiplyScalar(1.018);
    puff.mesh.material.opacity = Math.max(puff.life * 0.45, 0);
    if (puff.life <= 0) {
      scene.remove(puff.mesh);
      return false;
    }
    return true;
  });
}

function spawnDustPuff() {
  const dust = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 8, 8),
    new THREE.MeshLambertMaterial({
      color: 0xd9c7a7,
      transparent: true,
      opacity: 0.35,
    })
  );
  const spread = 0.28;
  dust.position.set(
    carGroup.position.x - Math.sin(carAngle) * 1.1 + (Math.random() - 0.5) * spread,
    0.18,
    carGroup.position.z - Math.cos(carAngle) * 1.1 + (Math.random() - 0.5) * spread
  );
  scene.add(dust);
  dustPuffs.push({
    mesh: dust,
    life: 1,
    vx: (Math.random() - 0.5) * 0.02 - Math.sin(carAngle) * carVel * 0.2,
    vz: (Math.random() - 0.5) * 0.02 - Math.cos(carAngle) * carVel * 0.2,
  });
}

function updateBuildingProgress() {
  if (!buildingMeshes.length) return;
  const ch = getChild();
  buildingMeshes.forEach(b => {
    const prog = calcProgress(activeChildId, ch.grade, b.userData.subject);
    b.userData.progress = prog;
    const fill = b.userData.progressFill;
    if (fill && fill.geometry) {
      const newW = Math.max(2.4 * (prog/100), 0.02);
      fill.geometry.dispose();
      fill.geometry = new THREE.BoxGeometry(newW, 0.22, 0.12);
      fill.position.x = -1.2 + newW/2;
    }
  });
}

function enterSubjectFromWorld() {
  if (!nearBuilding) return;
  openSubject(nearBuilding.userData.subject);
}

