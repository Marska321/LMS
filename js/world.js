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
let carBodyMesh = null;
let carCabinMesh = null;
let sunLight = null;
let ambientLight = null;
let fillLight = null;
let activeFireworks = [];
let activeWorldBursts = [];
let milestoneDecor = {
  palms: [],
  fountain: null,
  banners: [],
};
let worldAssetsPromise = null;
let worldAssets = {
  texture: null,
  glbs: new Map(),
  failed: new Set(),
};
const CAMERA_FOLLOW_OFFSET = { x: -14, y: 18, z: 14 };
const CAMERA_TILT_X = -0.72;
const CAMERA_YAW_Y = -0.78;
const TREE_GRID_STEPS = [-18, -14, -10, -6, 6, 10, 14, 18];
const PALM_TREE_POSITIONS = [
  [-19, -5], [-17, 9], [18, -8], [16, 12]
];
const WORLD_COLORMAP_PATH = 'models/textures/colormap.png';
const BUILDING_MODEL_MAP = {
  'Mathematics': 'models/buildings/bldg_math.glb',
  'Natural Sciences': 'models/buildings/bldg_science.glb',
  'English HL': 'models/buildings/bldg_english.glb',
  'Social Sciences': 'models/buildings/bldg_social.glb',
  'Afrikaans FAL': 'models/buildings/bldg_afr.glb',
  'Life Skills': 'models/buildings/bldg_life.glb',
  'Maths Arcade': 'models/buildings/bldg_arcade.glb',
};
const TREE_MODEL_PATHS = [
  'models/nature/tree_round.glb',
  'models/nature/tree_oak.glb',
  'models/nature/tree_cone.glb',
  'models/nature/tree_suburb_small.glb',
  'models/nature/tree_suburb_large.glb',
];
const PALM_MODEL_PATH = 'models/nature/tree_palm.glb';
const CAR_MODEL_PATHS = [
  'models/car/vehicle_monster_truck.glb',
];
const PRELOAD_GLB_PATHS = [
  ...CAR_MODEL_PATHS,
  'models/car/wheel_large.glb',
  'models/buildings/bldg_afr.glb',
  'models/buildings/bldg_arcade.glb',
  'models/buildings/bldg_english.glb',
  'models/buildings/bldg_home.glb',
  'models/buildings/bldg_home_alt.glb',
  'models/buildings/bldg_life.glb',
  'models/buildings/bldg_math.glb',
  'models/buildings/bldg_science.glb',
  'models/buildings/bldg_social.glb',
  'models/buildings/detail_awning.glb',
  'models/buildings/detail_parasol.glb',
  'models/details/detail_driveway.glb',
  'models/details/detail_fence.glb',
  'models/details/detail_path.glb',
  'models/details/detail_planter.glb',
  'models/nature/bush.glb',
  'models/nature/bush_small.glb',
  'models/nature/campfire.glb',
  'models/nature/cliff.glb',
  'models/nature/cliff_large.glb',
  'models/nature/flower_purple.glb',
  'models/nature/flower_yellow.glb',
  'models/nature/grass.glb',
  'models/nature/rock_large.glb',
  'models/nature/rock_small.glb',
  'models/nature/sign.glb',
  'models/nature/tent.glb',
  'models/nature/tree_cone.glb',
  'models/nature/tree_fat.glb',
  'models/nature/tree_oak.glb',
  'models/nature/tree_palm.glb',
  'models/nature/tree_plateau.glb',
  'models/nature/tree_round.glb',
  'models/nature/tree_suburb_large.glb',
  'models/nature/tree_suburb_small.glb',
  'models/roads/road_bend.glb',
  'models/roads/road_corner.glb',
  'models/roads/road_crossing.glb',
  'models/roads/road_curve.glb',
  'models/roads/road_straight.glb',
];
const WORLD_SUBJECTS_ORDER = [
  'Mathematics','Natural Sciences','English HL','Social Sciences','Afrikaans FAL','Life Skills'
];
const BUILDING_POSITIONS = [
  {x:-11,z:-11},{x:11,z:-11},{x:11,z:11},{x:-11,z:11},{x:0,z:-16},{x:0,z:16}
];
const ARCADE_BUILDING_POSITION = { x: 16, z: 0 };

async function initWorld() {
  if (typeof THREE === 'undefined') return false;
  await preloadWorldAssets();

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

    createSceneLights();
    buildScene();
    buildCar();
    applyWeather();
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

function preloadTexture(path) {
  return new Promise(resolve => {
    const loader = new THREE.TextureLoader();
    loader.load(
      path,
      texture => {
        if ('colorSpace' in texture && THREE.SRGBColorSpace) texture.colorSpace = THREE.SRGBColorSpace;
        texture.flipY = false;
        resolve(texture);
      },
      undefined,
      () => resolve(null)
    );
  });
}

function preloadGLB(path) {
  return new Promise(resolve => {
    if (!THREE.GLTFLoader) {
      worldAssets.failed.add(path);
      resolve(null);
      return;
    }
    const loader = new THREE.GLTFLoader();
    loader.load(
      path,
      gltf => resolve(gltf),
      undefined,
      () => {
        worldAssets.failed.add(path);
        resolve(null);
      }
    );
  });
}

function preloadWorldAssets() {
  if (worldAssetsPromise) return worldAssetsPromise;

  worldAssetsPromise = (async () => {
    worldAssets.texture = await preloadTexture(WORLD_COLORMAP_PATH);
    const results = await Promise.all(PRELOAD_GLB_PATHS.map(async path => [path, await preloadGLB(path)]));
    results.forEach(([path, gltf]) => {
      if (gltf) worldAssets.glbs.set(path, gltf);
    });
    return worldAssets;
  })();

  return worldAssetsPromise;
}

function collectMeshes(root) {
  const meshes = [];
  root.traverse(obj => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
      meshes.push(obj);
    }
  });
  return meshes;
}

function fitModelToFootprint(root, footprint) {
  root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(root);
  const size = box.getSize(new THREE.Vector3());
  const center = box.getCenter(new THREE.Vector3());
  const scale = Math.min(
    footprint.width / Math.max(size.x, 0.01),
    footprint.depth / Math.max(size.z, 0.01),
    footprint.height / Math.max(size.y, 0.01)
  );
  root.scale.multiplyScalar(scale);
  root.updateMatrixWorld(true);
  const scaledBox = new THREE.Box3().setFromObject(root);
  const scaledCenter = scaledBox.getCenter(new THREE.Vector3());
  root.position.x -= scaledCenter.x;
  root.position.z -= scaledCenter.z;
  root.position.y -= scaledBox.min.y;
  return root;
}

function instantiateGLB(path, footprint, rotationY = 0) {
  const gltf = worldAssets.glbs.get(path);
  if (!gltf?.scene) return null;
  const root = gltf.scene.clone(true);
  root.rotation.y = rotationY;
  collectMeshes(root);
  fitModelToFootprint(root, footprint);
  return root;
}

function createSceneLights() {
  sunLight = new THREE.DirectionalLight(0xfff8e8, 2.35);
  sunLight.position.set(25, 35, 20);
  sunLight.castShadow = true;
  sunLight.shadow.mapSize.set(2048, 2048);
  sunLight.shadow.camera.left = sunLight.shadow.camera.bottom = -45;
  sunLight.shadow.camera.right = sunLight.shadow.camera.top = 45;
  sunLight.shadow.camera.far = 130;
  scene.add(sunLight);

  ambientLight = new THREE.AmbientLight(0xc8d8ff, 1.95);
  scene.add(ambientLight);

  fillLight = new THREE.DirectionalLight(0xffffff, 0.55);
  fillLight.position.set(-10, 5, -10);
  scene.add(fillLight);
}

function disposeMaterial(material) {
  if (!material) return;
  if (Array.isArray(material)) {
    material.forEach(disposeMaterial);
    return;
  }
  material.dispose?.();
}

function disposeSceneNode(node) {
  if (!node) return;
  node.traverse(obj => {
    if (obj.geometry) obj.geometry.dispose();
    if (obj.material) disposeMaterial(obj.material);
  });
}

function clearWorldDomEffects() {
  activeWorldBursts.forEach(burst => burst.el?.remove());
  activeWorldBursts = [];
}

function resetWorldForActiveChild() {
  if (!renderer || !camera) return false;

  activeFireworks.forEach(effect => {
    scene?.remove(effect.points);
    effect.points.geometry?.dispose();
    effect.points.material?.dispose();
  });
  activeFireworks = [];
  clearWorldDomEffects();

  if (scene) disposeSceneNode(scene);

  scene = new THREE.Scene();
  carGroup = null;
  nearBuilding = null;
  buildingMeshes = [];
  treeTops = [];
  cloudGroups = [];
  dustPuffs = [];
  worldStar = null;
  carBodyMesh = null;
  carCabinMesh = null;
  milestoneDecor = { palms: [], fountain: null, banners: [] };
  carVel = 0;
  carAngle = 0;
  camPos = new THREE.Vector3(0, 15, 15);
  camLookAt = new THREE.Vector3();

  createSceneLights();
  buildScene();
  buildCar();
  applyWeather();
  updateBuildingProgress();
  return true;
}

function buildScene() {
  treeTops = [];
  cloudGroups = [];
  dustPuffs = [];
  milestoneDecor = { palms: [], fountain: null, banners: [] };

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
  generateTreePoints().forEach(([tx, tz]) => makeTree(tx, tz));
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
  buildingMeshes.push(makeBuilding('Maths Arcade', {
    color: '#ff8c42',
    icon: '🎮',
    xp: 0,
    topics: [],
    isArcade: true,
  }, ARCADE_BUILDING_POSITION.x, ARCADE_BUILDING_POSITION.z, 0));

  buildTownCenter();
  applyMilestoneWorldState();
}

function getTreeModelPath(tx, tz) {
  const index = Math.abs(Math.round(tx + tz)) % TREE_MODEL_PATHS.length;
  return TREE_MODEL_PATHS[index];
}

function makeTree(tx, tz) {
  const asset = instantiateGLB(getTreeModelPath(tx, tz), { width: 2.1, depth: 2.1, height: 3.4 });
  if (asset) {
    asset.position.set(tx, 0, tz);
    scene.add(asset);
    treeTops.push({
      mesh: asset,
      baseX: asset.position.x,
      baseZ: asset.position.z,
      phase: Math.random() * Math.PI * 2,
      swayScale: 0.04,
    });
    return;
  }

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
    swayScale: 0.12,
  });
}

function makePalmTree(tx, tz) {
  const asset = instantiateGLB(PALM_MODEL_PATH, { width: 2.3, depth: 2.3, height: 4.7 });
  if (asset) {
    asset.position.set(tx, 0, tz);
    scene.add(asset);
    milestoneDecor.palms.push({ trunk: null, top: asset });
    return;
  }

  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.2, 2.9, 7),
    new THREE.MeshLambertMaterial({ color: 0x8b5e34 })
  );
  trunk.position.set(tx, 1.45, tz);
  trunk.castShadow = true;
  scene.add(trunk);

  const top = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const frond = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.05, 1.6),
      new THREE.MeshLambertMaterial({ color: 0x2e9f52 })
    );
    frond.position.set(0, 0, 0.6);
    frond.rotation.y = (Math.PI * 2 * i) / 5;
    frond.rotation.x = -0.55;
    top.add(frond);
  }
  top.position.set(tx, 3.05, tz);
  scene.add(top);
  milestoneDecor.palms.push({ trunk, top });
}

function buildTownCenter() {
  worldStar = null;
}

function generateTreePoints() {
  const points = [];
  const buildingBuffers = [
    ...BUILDING_POSITIONS.map(pos => ({ x: pos.x, z: pos.z, radius: 4.8 })),
    { x: ARCADE_BUILDING_POSITION.x, z: ARCADE_BUILDING_POSITION.z, radius: 4.8 },
  ];

  for (const tx of TREE_GRID_STEPS) {
    for (const tz of TREE_GRID_STEPS) {
      if (isRoadCorridor(tx, tz)) continue;
      if (isNearCenter(tx, tz)) continue;
      if (isInsideBuildingBuffer(tx, tz, buildingBuffers)) continue;
      points.push([tx + jitterFor(tx, tz, 0), tz + jitterFor(tx, tz, 1)]);
    }
  }

  return points;
}

function isRoadCorridor(x, z) {
  return Math.abs(x) < 4.6 || Math.abs(z) < 4.6;
}

function isNearCenter(x, z) {
  return Math.abs(x) < 7 && Math.abs(z) < 7;
}

function isInsideBuildingBuffer(x, z, buffers) {
  return buffers.some(buffer => {
    const dx = x - buffer.x;
    const dz = z - buffer.z;
    return Math.hypot(dx, dz) < buffer.radius;
  });
}

function jitterFor(x, z, axis) {
  const seed = Math.sin((x * 12.9898) + (z * 78.233) + axis * 19.19) * 43758.5453;
  const normalized = seed - Math.floor(seed);
  return (normalized - 0.5) * 1.1;
}

function makeClouds() {
  const cloudAnchors = [
    [-34, 24, -28], [-18, 22, 34], [22, 25, -34], [36, 23, 18], [0, 26, 42]
  ];
  cloudAnchors.forEach(([x, y, z], idx) => {
    const group = new THREE.Group();
    const puffGeo = new THREE.SphereGeometry(1.0, 10, 10);
    [[0, 0, 0], [1.6, 0.2, 0.4], [-1.6, 0.1, 0.2], [0.4, 0.5, -0.6]].forEach(([px, py, pz], i) => {
      const puff = new THREE.Mesh(
        puffGeo,
        new THREE.MeshLambertMaterial({
          color: 0xffffff,
          transparent: true,
          opacity: 0.9,
        })
      );
      puff.scale.setScalar(i === 0 ? 0.52 : 0.4 + Math.random() * 0.12);
      puff.position.set(px * 0.75, py * 0.6, pz * 0.75);
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

function applyWeather() {
  if (!scene) return;
  const child = typeof getChild === 'function' ? getChild() : null;
  const weather = child && typeof getWeatherState === 'function'
    ? getWeatherState(child.id)
    : { mode: 'sunny', streak: 0, daysSinceLastLog: 0 };

  const profiles = {
    sunny: {
      sky: 0x87ceeb,
      fogNear: 35,
      fogFar: 90,
      sun: 2.35,
      ambient: 1.95,
      fill: 0.55,
      cloudOpacity: 0.78,
    },
    'partly-cloudy': {
      sky: 0xa8c4d4,
      fogNear: 30,
      fogFar: 70,
      sun: 1.95,
      ambient: 1.62,
      fill: 0.42,
      cloudOpacity: 0.86,
    },
    overcast: {
      sky: 0x8899aa,
      fogNear: 24,
      fogFar: 55,
      sun: 1.55,
      ambient: 1.34,
      fill: 0.34,
      cloudOpacity: 0.92,
    },
    rainy: {
      sky: 0x667788,
      fogNear: 20,
      fogFar: 45,
      sun: 1.15,
      ambient: 1.08,
      fill: 0.24,
      cloudOpacity: 0.98,
    },
  };

  const profile = profiles[weather.mode] || profiles.sunny;
  scene.background = new THREE.Color(profile.sky);
  scene.fog = new THREE.Fog(profile.sky, profile.fogNear, profile.fogFar);
  if (sunLight) sunLight.intensity = profile.sun;
  if (ambientLight) ambientLight.intensity = profile.ambient;
  if (fillLight) fillLight.intensity = profile.fill;

  cloudGroups.forEach(cloud => {
    cloud.group.children.forEach(puff => {
      if (puff.material) puff.material.opacity = profile.cloudOpacity;
    });
  });
}

function refreshWeather() {
  applyWeather();
}

function getCurrentMilestones() {
  if (typeof getMilestoneUnlocks !== 'function' || !activeChildId) return [];
  return getMilestoneUnlocks(activeChildId);
}

function hasMilestone(threshold) {
  return getCurrentMilestones().includes(threshold);
}

function applyMilestoneWorldState() {
  const milestones = getCurrentMilestones();
  if (milestones.includes(100)) addPalmTrees();
  if (milestones.includes(250)) addFountain();
  updateBuildingRoofVariants(milestones.includes(500));
  updateBuildingBanners(milestones.includes(1000));
}

function refreshWorldMilestones() {
  if (!scene) return;
  applyMilestoneWorldState();
}

function addPalmTrees() {
  if (milestoneDecor.palms.length) return;
  PALM_TREE_POSITIONS.forEach(([x, z]) => makePalmTree(x, z));
}

function addFountain() {
  if (milestoneDecor.fountain) return;
  if (worldStar) {
    scene.remove(worldStar);
    if (worldStar.geometry) worldStar.geometry.dispose();
    if (worldStar.material) worldStar.material.dispose();
    worldStar = null;
  }

  const group = new THREE.Group();
  const basin = new THREE.Mesh(
    new THREE.TorusGeometry(1.1, 0.22, 12, 30),
    new THREE.MeshLambertMaterial({ color: 0x98a8bb })
  );
  basin.rotation.x = Math.PI / 2;
  basin.position.y = 0.42;
  group.add(basin);

  const column = new THREE.Mesh(
    new THREE.CylinderGeometry(0.18, 0.24, 1.3, 10),
    new THREE.MeshLambertMaterial({ color: 0xd8e1e8 })
  );
  column.position.y = 0.92;
  group.add(column);

  const water = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 10, 10),
    new THREE.MeshLambertMaterial({ color: 0x7fd3ff, emissive: 0x3aa0d8, emissiveIntensity: 0.35 })
  );
  water.position.y = 1.78;
  group.add(water);

  scene.add(group);
  milestoneDecor.fountain = { group, water };
}

function updateBuildingRoofVariants(enabled) {
  buildingMeshes.forEach(building => {
    const roofMeshes = building.userData.roofMeshes || [];
    if (!roofMeshes.length) return;
    const baseColor = new THREE.Color(building.userData.subData.color).lerp(new THREE.Color(0xffffff), 0.5);
    const variant = new THREE.Color(building.userData.subData.color).lerp(new THREE.Color(0xfff1c1), 0.72);
    roofMeshes.forEach(mesh => {
      const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
      materials.forEach(material => {
        if (material?.color) material.color.copy(enabled ? variant : baseColor);
      });
    });
  });
}

function ensureBanner(building) {
  if (building.userData.flag) return building.userData.flag;
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.04, 0.04, 1.8, 6),
    new THREE.MeshLambertMaterial({ color: 0xaaaaaa })
  );
  pole.position.set(1.7, 6, 0);
  building.add(pole);
  const flag = new THREE.Mesh(
    new THREE.PlaneGeometry(0.8, 0.5),
    new THREE.MeshLambertMaterial({ color: 0xffd700, side: THREE.DoubleSide })
  );
  flag.position.set(2.1, 6.6, 0);
  building.add(flag);
  building.userData.flag = flag;
  building.userData.flagPole = pole;
  return flag;
}

function updateBuildingBanners(enabled) {
  milestoneDecor.banners = [];
  buildingMeshes.forEach(building => {
    if (enabled) {
      const flag = ensureBanner(building);
      flag.scale.set(1.15, 1.15, 1.15);
      flag.material.color.set(0xffd44d);
      milestoneDecor.banners.push(flag);
      return;
    }

    if (building.userData.flag) {
      building.userData.flag.scale.set(1, 1, 1);
      building.userData.flag.material.color.set(0xffd700);
    }
  });
}

function triggerWorldCompletionEffect(effect) {
  if (!scene || !camera || !renderer) return false;
  const building = buildingMeshes.find(mesh => mesh.userData.subject === effect.subject);
  if (!building) return false;

  spawnFireworks(building.position.clone(), effect.amount || 10);
  spawnWorldXPBurst(building.position.clone(), effect.amount || 10);
  return true;
}

function spawnFireworks(position, amount) {
  if (!scene || !activeChildId) return;
  activeFireworks.forEach(effect => scene.remove(effect.points));
  activeFireworks = [];

  const particleCount = 36;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const velocities = [];
  const palette = [0xffd700, 0xff6b35, 0xff88aa, 0x52b788];

  for (let i = 0; i < particleCount; i++) {
    positions[i * 3] = position.x;
    positions[i * 3 + 1] = position.y + 5.1;
    positions[i * 3 + 2] = position.z;

    const color = new THREE.Color(palette[i % palette.length]);
    colors[i * 3] = color.r;
    colors[i * 3 + 1] = color.g;
    colors[i * 3 + 2] = color.b;

    const angle = (Math.PI * 2 * i) / particleCount;
    const outward = 0.07 + Math.random() * 0.08;
    velocities.push({
      x: Math.cos(angle) * outward,
      y: 0.08 + Math.random() * 0.06,
      z: Math.sin(angle) * outward,
    });
  }

  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

  const material = new THREE.PointsMaterial({
    size: 0.28,
    vertexColors: true,
    transparent: true,
    opacity: 1,
    depthWrite: false,
  });

  const points = new THREE.Points(geometry, material);
  scene.add(points);
  activeFireworks.push({ points, velocities, life: 1.2 });
}

function spawnWorldXPBurst(worldPosition, amount) {
  const host = document.getElementById('world-effects');
  if (!host || !camera || !renderer) return;
  const burst = document.createElement('div');
  burst.className = 'world-xp-burst';
  burst.textContent = '+' + amount + ' XP';
  host.appendChild(burst);
  activeWorldBursts.push({
    el: burst,
    position: worldPosition.clone().setY(worldPosition.y + 6),
    life: 1.2,
  });
}

function getBuildingModelPath(subjectName) {
  return BUILDING_MODEL_MAP[subjectName] || null;
}

function getTopMeshes(root, ratio = 0.58) {
  const box = new THREE.Box3().setFromObject(root);
  const cutoff = box.min.y + box.getSize(new THREE.Vector3()).y * ratio;
  const meshes = [];
  root.traverse(obj => {
    if (!obj.isMesh) return;
    const objBox = new THREE.Box3().setFromObject(obj);
    if (objBox.getCenter(new THREE.Vector3()).y >= cutoff) meshes.push(obj);
  });
  return meshes;
}

function setMeshEmissive(meshes, color, intensity) {
  meshes.forEach(mesh => {
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    materials.forEach(material => {
      if (!material || !('emissive' in material)) return;
      if (!material.userData.baseEmissive) {
        material.userData.baseEmissive = material.emissive.clone();
      }
      material.emissive.copy(color);
      material.emissiveIntensity = intensity;
    });
  });
}

function makeBuilding(name, sub, x, z, progPct) {
  const group = new THREE.Group();
  const col = new THREE.Color(sub.color);
  const lightCol = new THREE.Color(sub.color).lerp(new THREE.Color(0xffffff), 0.5);
  let flag = null;
  let pole = null;
  let primaryMeshes = [];
  let roofMeshes = [];

  const buildingAsset = instantiateGLB(getBuildingModelPath(name), { width: 4.2, depth: 4.2, height: 5.6 });
  let roof = null;

  if (buildingAsset) {
    group.add(buildingAsset);
    primaryMeshes = collectMeshes(buildingAsset);
    roofMeshes = getTopMeshes(buildingAsset);
  } else {
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(3.8, 3.2, 3.8),
      new THREE.MeshLambertMaterial({ color: col })
    );
    base.position.y = 1.6;
    base.castShadow = base.receiveShadow = true;
    group.add(base);

    roof = new THREE.Mesh(
      new THREE.CylinderGeometry(0, 2.8, 2, 4),
      new THREE.MeshLambertMaterial({ color: lightCol })
    );
    roof.position.y = 4.2;
    roof.rotation.y = Math.PI/4;
    roof.castShadow = true;
    group.add(roof);
    primaryMeshes = [base];
    roofMeshes = [roof];
  }

  if (!buildingAsset) {
    const door = new THREE.Mesh(
      new THREE.BoxGeometry(0.7, 1, 0.12),
      new THREE.MeshLambertMaterial({ color: 0xfff3e0 })
    );
    door.position.set(0, 0.5, 1.97);
    group.add(door);
  }

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

  if (!buildingAsset) {
    const winMat = new THREE.MeshLambertMaterial({ color: 0xaee1ff, transparent: true, opacity: 0.7 });
    [[-1, 1.8], [1, 1.8]].forEach(([wx, wy]) => {
      const win = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.55, 0.1), winMat);
      win.position.set(wx, wy, 1.97);
      group.add(win);
    });
  }

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
    pole = new THREE.Mesh(
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
  group.userData = {
    subject: name,
    subData: sub,
    progress: progPct,
    beacon,
    halo,
    sign,
    flag,
    flagPole: progPct >= 25 ? pole : null,
    progressFill: pBarFill,
    roof,
    primaryMeshes,
    roofMeshes,
  };
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
    case '🎮': {
      const left = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.03), new THREE.MeshLambertMaterial({ color: 0xffffff }));
      const right = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.1, 0.03), new THREE.MeshLambertMaterial({ color: 0xffffff }));
      const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.06, 0.03), new THREE.MeshLambertMaterial({ color: 0xffffff }));
      left.position.x = -0.11;
      right.position.x = 0.11;
      left.rotation.z = 0.18;
      right.rotation.z = -0.18;
      badge.add(left);
      badge.add(right);
      badge.add(bridge);
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
  const carColor = ch.carColor || ch.color;
  const bodyColor = new THREE.Color(carColor);
  const carAssetPath = CAR_MODEL_PATHS.find(path => worldAssets.glbs.has(path));
  const carAsset = carAssetPath ? instantiateGLB(carAssetPath, { width: 1.8, depth: 3.2, height: 1.8 }) : null;

  if (carAsset) {
    console.info('HomeSchool Hub world: using GLB car model', carAssetPath);
    carAsset.traverse(obj => {
      if (!obj.isMesh) return;
      const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
      materials.forEach(material => {
        if (material?.color) {
          material.color = material.color.clone().lerp(bodyColor, 0.45);
        }
      });
    });
    carGroup.add(carAsset);
    carGroup.position.set(0, 0, 3);
    scene.add(carGroup);
    return;
  }

  console.warn('HomeSchool Hub world: falling back to procedural car');

  // Body
  carBodyMesh = new THREE.Mesh(
    new THREE.BoxGeometry(1.1, 0.55, 2.1),
    new THREE.MeshLambertMaterial({ color: bodyColor })
  );
  carBodyMesh.position.y = 0.52;
  carBodyMesh.castShadow = true;
  carGroup.add(carBodyMesh);

  // Cabin
  carCabinMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.85, 0.42, 1.1),
    new THREE.MeshLambertMaterial({ color: new THREE.Color(carColor).lerp(new THREE.Color(0xffffff), 0.25) })
  );
  carCabinMesh.position.set(0, 0.97, -0.1);
  carCabinMesh.castShadow = true;
  carGroup.add(carCabinMesh);

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

function rebuildCar() {
  if (!scene) return;
  if (carGroup) scene.remove(carGroup);
  carGroup = null;
  carVel = 0;
  carAngle = 0;
  buildCar();
}

function bindInput() {
  if (worldInputBound) return;
  worldInputBound = true;
  document.addEventListener('keydown', e => {
    if (typeof isParentPinOpen === 'function' && isParentPinOpen()) {
      e.preventDefault();
      return;
    }
    keys[e.code] = true;
    if (e.code === 'Space' || e.code === 'Enter') {
      e.preventDefault();
      enterSubjectFromWorld();
    }
    if (e.code === 'Tab') {
      e.preventDefault();
      if (typeof promptParentAccess === 'function') {
        promptParentAccess({ type: 'screen', id: 'dash' });
      } else {
        showScreen('dash');
      }
    }
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
  updateMilestoneAnimations(time);
  updateFireworks();
  updateWorldBursts();

  // Camera follow
  const carPos = carGroup.position;
  const followOffset = new THREE.Vector3(
    CAMERA_FOLLOW_OFFSET.x,
    CAMERA_FOLLOW_OFFSET.y + Math.abs(carVel) * 2,
    CAMERA_FOLLOW_OFFSET.z
  );
  camPos.lerp(carPos.clone().add(followOffset), 0.055);
  camera.position.set(camPos.x, camPos.y + Math.sin(time * 7) * Math.min(Math.abs(carVel) * 3, 0.18), camPos.z);
  camera.rotation.order = 'YXZ';
  camera.rotation.x = CAMERA_TILT_X;
  camera.rotation.y = CAMERA_YAW_Y;
  camera.rotation.z = 0;

  // Proximity check
  let closest = null, closestDist = 6;
  for (const b of buildingMeshes) {
    const d = carPos.distanceTo(b.position);
    if (d < closestDist) { closest = b; closestDist = d; }
    // Glow near
    const glowMeshes = b.userData.primaryMeshes || [];
    if (d < 9) {
      setMeshEmissive(glowMeshes, new THREE.Color(0x111111), 0.1 + 0.08 * Math.sin(time * 2 + b.position.x));
    } else {
      setMeshEmissive(glowMeshes, new THREE.Color(0x000000), 0);
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
    if (b.userData.flag && hasMilestone(1000)) {
      b.userData.flag.rotation.y = Math.sin(time * 2 + b.position.x * 0.5) * 0.4;
      b.userData.flag.rotation.z = Math.sin(time * 3 + b.position.z * 0.3) * 0.08;
    } else if (b.userData.flag) {
      b.userData.flag.rotation.y = 0;
      b.userData.flag.rotation.z = 0;
    }
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
  ctx.fillStyle = getChild().carColor || getChild().color;
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
    const swayScale = tree.swayScale || 0.12;
    tree.mesh.position.x = tree.baseX + Math.sin(time * 1.8 + tree.phase) * swayScale;
    tree.mesh.position.z = tree.baseZ + Math.cos(time * 1.3 + tree.phase) * swayScale;
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

function updateMilestoneAnimations(time) {
  milestoneDecor.palms.forEach((palm, index) => {
    palm.top.rotation.y = Math.sin(time * 0.9 + index) * 0.18;
    palm.top.rotation.z = Math.sin(time * 1.2 + index * 0.4) * 0.08;
  });

  if (milestoneDecor.fountain?.water) {
    milestoneDecor.fountain.water.position.y = 1.78 + Math.sin(time * 3.2) * 0.12;
    milestoneDecor.fountain.water.scale.y = 0.9 + Math.sin(time * 2.4) * 0.08;
  }
}

function updateFireworks() {
  activeFireworks = activeFireworks.filter(effect => {
    effect.life -= 0.016;
    const positions = effect.points.geometry.attributes.position.array;

    for (let i = 0; i < effect.velocities.length; i++) {
      const velocity = effect.velocities[i];
      velocity.y -= 0.0026;
      positions[i * 3] += velocity.x;
      positions[i * 3 + 1] += velocity.y;
      positions[i * 3 + 2] += velocity.z;
    }

    effect.points.geometry.attributes.position.needsUpdate = true;
    effect.points.material.opacity = Math.max(effect.life / 1.2, 0);

    if (effect.life <= 0) {
      scene.remove(effect.points);
      effect.points.geometry.dispose();
      effect.points.material.dispose();
      return false;
    }
    return true;
  });
}

function updateWorldBursts() {
  if (!camera || !renderer) return;
  const host = document.getElementById('world-effects');
  if (!host) return;
  const rect = renderer.domElement.getBoundingClientRect();

  activeWorldBursts = activeWorldBursts.filter(burst => {
    burst.life -= 0.016;
    burst.position.y += 0.03;
    const projected = burst.position.clone().project(camera);
    const visible = projected.z < 1;

    if (visible) {
      const x = (projected.x * 0.5 + 0.5) * rect.width;
      const y = (-projected.y * 0.5 + 0.5) * rect.height;
      burst.el.style.left = x + 'px';
      burst.el.style.top = y + 'px';
      burst.el.style.display = 'block';
    } else {
      burst.el.style.display = 'none';
    }

    if (burst.life <= 0) {
      burst.el.remove();
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
  if (nearBuilding.userData.subData?.isArcade) {
    openArcade();
    return;
  }
  openSubject(nearBuilding.userData.subject);
}

