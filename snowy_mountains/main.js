import * as THREE from "./vendor/three.module.js";

const canvas = document.querySelector("#scene");
const nameInput = document.querySelector("#mountainName");
const promptInput = document.querySelector("#mountainPrompt");
const buildButton = document.querySelector("#buildButton");
const eruptionButton = document.querySelector("#eruptionButton");
const currentName = document.querySelector("#currentName");
const hint = document.querySelector("#hint");
const debugPanel = document.querySelector("#debugPanel");
const debugControls = document.querySelector("#debugControls");
const debugAutoRebuild = document.querySelector("#debugAutoRebuild");
const debugRebuild = document.querySelector("#debugRebuild");
const debugReset = document.querySelector("#debugReset");
const startupParams = new URLSearchParams(window.location.search);
const isDebugMode = startupParams.get("debug") === "1" || startupParams.get("debug") === "true";

if (startupParams.has("name")) nameInput.value = startupParams.get("name").slice(0, nameInput.maxLength);
if (startupParams.has("description")) promptInput.value = startupParams.get("description").slice(0, promptInput.maxLength);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x9ed8f0);
scene.fog = new THREE.Fog(0x9ed8f0, 160, 720);

const camera = new THREE.PerspectiveCamera(68, 1, 0.1, 1100);
camera.position.set(0, 12, 42);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const sun = new THREE.DirectionalLight(0xfff3d5, 2.3);
sun.position.set(80, 100, 35);
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
sun.shadow.camera.near = 1;
sun.shadow.camera.far = 760;
sun.shadow.camera.left = -330;
sun.shadow.camera.right = 330;
sun.shadow.camera.top = 330;
sun.shadow.camera.bottom = -330;
scene.add(sun);
scene.add(new THREE.HemisphereLight(0xdff8ff, 0x485d6c, 1.7));

const terrainMaterials = createTerrainMaterials();
const rockMaterial = new THREE.MeshStandardMaterial({ color: 0x6f7f86, roughness: 0.9 });
const trunkMaterial = new THREE.MeshStandardMaterial({ color: 0x5b3a24, roughness: 0.9 });
const pineMaterial = new THREE.MeshStandardMaterial({ color: 0x1f7655, roughness: 0.85 });
const signMaterial = new THREE.MeshStandardMaterial({ color: 0xf2d18b, roughness: 0.75 });
const cloudPuffGeometry = new THREE.SphereGeometry(1, 16, 10);
const smokePuffGeometry = new THREE.SphereGeometry(1, 12, 8);
const cloudMaterial = new THREE.MeshStandardMaterial({
  color: 0xffffff,
  roughness: 0.72,
  transparent: true,
  opacity: 0.86,
  depthWrite: false,
});
const lavaMaterial = new THREE.PointsMaterial({
  size: 3.4,
  vertexColors: true,
  transparent: true,
  opacity: 0.96,
  depthWrite: false,
});
const smokeMaterial = new THREE.MeshStandardMaterial({
  color: 0x59636a,
  roughness: 0.92,
  transparent: true,
  opacity: 0.48,
  depthWrite: false,
});

let terrain;
let terrainData;
let mountainGroup = new THREE.Group();
let clouds = [];
let eruptions = [];
let playerHeight = 3.1;
let yaw = 0;
let pitch = 0.18;
let verticalVelocity = 0;
let isGrounded = true;
let activeSeed = "";
let activeMountainName = "";
let activeMountainDescription = "";
let debugOverrideSettings = null;
let debugBuildTimer = 0;

scene.add(mountainGroup);

const DEBUG_SETTING_CONTROLS = [
  { key: "seed", label: "Seed", min: 0, max: 4294967295, step: 1 },
  { key: "radius", label: "Radius", min: 80, max: 360, step: 1 },
  { key: "height", label: "Height", min: 24, max: 220, step: 1 },
  { key: "size", label: "World Size", min: 180, max: 860, step: 1 },
  { key: "segments", label: "Resolution", min: 80, max: 320, step: 1 },
  { key: "steepness", label: "Steepness", min: 0.8, max: 4.2, step: 0.01 },
  { key: "ridges", label: "Ridges", min: 0, max: 28, step: 1 },
  { key: "ridgeStrength", label: "Ridge Strength", min: 0, max: 48, step: 0.5 },
  { key: "roughness", label: "Roughness", min: 0, max: 34, step: 0.5 },
  { key: "detailRoughness", label: "Fine Roughness", min: 0, max: 20, step: 0.5 },
  { key: "treeCount", label: "Trees", min: 0, max: 260, step: 1 },
  { key: "rockCount", label: "Rocks", min: 0, max: 180, step: 1 },
  { key: "sparkleCount", label: "Sparkles", min: 0, max: 260, step: 1 },
  { key: "cloudCount", label: "Clouds", min: 0, max: 44, step: 1 },
  { key: "hasValley", label: "Valley", type: "checkbox" },
  { key: "valleyDepth", label: "Valley Depth", min: 0, max: 70, step: 0.5 },
  { key: "hasCaldera", label: "Caldera", type: "checkbox" },
  { key: "calderaRadius", label: "Caldera Radius", min: 5, max: 120, step: 0.5 },
  { key: "calderaRimWidth", label: "Rim Width", min: 2, max: 60, step: 0.5 },
  { key: "calderaDepth", label: "Caldera Depth", min: 0, max: 160, step: 0.5 },
  { key: "calderaRimHeight", label: "Rim Height", min: 0, max: 90, step: 0.5 },
];

function createTerrainMaterials() {
  const snowMap = createNoiseTexture({
    base: [238, 248, 252],
    fleck: [255, 255, 255],
    shadow: [188, 218, 226],
    density: 0.54,
    size: 256,
  });
  const iceMap = createNoiseTexture({
    base: [228, 246, 249],
    fleck: [246, 255, 255],
    shadow: [190, 224, 230],
    density: 0.46,
    size: 256,
  });
  const cliffMap = createStrataTexture();

  return {
    snow: new THREE.MeshStandardMaterial({
      map: snowMap,
      color: 0xffffff,
      roughness: 0.94,
      metalness: 0.01,
      vertexColors: true,
    }),
    ice: new THREE.MeshStandardMaterial({
      map: iceMap,
      color: 0xf2fbff,
      roughness: 0.48,
      metalness: 0.02,
      vertexColors: true,
    }),
    cliff: new THREE.MeshStandardMaterial({
      map: cliffMap,
      color: 0xbec7c9,
      roughness: 0.88,
      metalness: 0.02,
      vertexColors: true,
    }),
  };
}

function createNoiseTexture({ base, fleck, shadow, density, size }) {
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = size;
  textureCanvas.height = size;
  const context = textureCanvas.getContext("2d");
  const image = context.createImageData(size, size);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const index = (y * size + x) * 4;
      const wave = Math.sin(x * 0.12 + y * 0.04) * 0.5 + Math.sin((x - y) * 0.035) * 0.5;
      const speckle = Math.random();
      const mix = THREE.MathUtils.clamp(density + wave * 0.18 + (speckle - 0.5) * 0.18, 0, 1);
      const source = speckle > 0.965 ? fleck : mix > 0.42 ? base : shadow;
      image.data[index] = source[0] + (Math.random() - 0.5) * 16;
      image.data[index + 1] = source[1] + (Math.random() - 0.5) * 16;
      image.data[index + 2] = source[2] + (Math.random() - 0.5) * 16;
      image.data[index + 3] = 255;
    }
  }

  context.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(18, 18);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createStrataTexture() {
  const size = 256;
  const textureCanvas = document.createElement("canvas");
  textureCanvas.width = size;
  textureCanvas.height = size;
  const context = textureCanvas.getContext("2d");
  context.fillStyle = "#7b8789";
  context.fillRect(0, 0, size, size);

  for (let y = 0; y < size; y += 1) {
    const shade = 86 + Math.sin(y * 0.08) * 20 + Math.random() * 16;
    context.strokeStyle = `rgb(${shade}, ${shade + 10}, ${shade + 12})`;
    context.lineWidth = 1 + Math.random() * 2;
    context.beginPath();
    context.moveTo(0, y + Math.sin(y * 0.2) * 3);
    for (let x = 0; x <= size; x += 16) {
      context.lineTo(x, y + Math.sin(x * 0.06 + y * 0.18) * 5);
    }
    context.stroke();
  }

  const texture = new THREE.CanvasTexture(textureCanvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(10, 10);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

const keys = new Set();
const pointer = {
  dragging: false,
  x: 0,
  y: 0,
};

window.addEventListener("keydown", (event) => {
  keys.add(event.key.toLowerCase());
  if (event.code === "Space" && isGrounded) {
    verticalVelocity = 8.5;
    isGrounded = false;
  }
});
window.addEventListener("keyup", (event) => keys.delete(event.key.toLowerCase()));

canvas.addEventListener("pointerdown", (event) => {
  pointer.dragging = true;
  pointer.x = event.clientX;
  pointer.y = event.clientY;
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener("pointermove", (event) => {
  if (!pointer.dragging) return;
  yaw -= (event.clientX - pointer.x) * 0.006;
  pitch -= (event.clientY - pointer.y) * 0.004;
  pitch = THREE.MathUtils.clamp(pitch, -0.65, 0.72);
  pointer.x = event.clientX;
  pointer.y = event.clientY;
});
canvas.addEventListener("pointerup", () => {
  pointer.dragging = false;
});

buildButton.addEventListener("click", () => {
  buildMountain(nameInput.value.trim() || "Snowy Mountain", promptInput.value.trim());
});

eruptionButton.addEventListener("click", () => {
  triggerEruption();
});

debugRebuild.addEventListener("click", () => {
  buildMountain(nameInput.value.trim() || "Snowy Mountain", promptInput.value.trim());
});

debugReset.addEventListener("click", () => {
  debugOverrideSettings = null;
  buildMountain(nameInput.value.trim() || "Snowy Mountain", promptInput.value.trim());
});

function hashText(text) {
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function seededRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function valueNoise(x, z, seed) {
  const xi = Math.floor(x);
  const zi = Math.floor(z);
  const xf = x - xi;
  const zf = z - zi;
  const smoothX = xf * xf * (3 - 2 * xf);
  const smoothZ = zf * zf * (3 - 2 * zf);
  const sample = (sx, sz) => {
    const n = Math.imul(sx + seed * 374761, 668265263) ^ Math.imul(sz + seed * 144269, 2147483647);
    return (((n ^ (n >>> 13)) >>> 0) / 4294967295) * 2 - 1;
  };
  const a = THREE.MathUtils.lerp(sample(xi, zi), sample(xi + 1, zi), smoothX);
  const b = THREE.MathUtils.lerp(sample(xi, zi + 1), sample(xi + 1, zi + 1), smoothX);
  return THREE.MathUtils.lerp(a, b, smoothZ);
}

function terrainHeight(x, z, settings) {
  const distance = Math.sqrt(x * x + z * z);
  const radial = Math.max(0, 1 - distance / settings.radius);
  const peakOne = Math.pow(radial, settings.steepness) * settings.height;
  const ridgeAngle = Math.atan2(z, x) * settings.ridges;
  const ridges = (Math.sin(ridgeAngle + settings.seed * 0.01) * 0.5 + 0.5) * settings.ridgeStrength * radial;
  const rough =
    valueNoise(x * 0.018, z * 0.018, settings.seed) * settings.roughness * radial +
    valueNoise(x * 0.045, z * 0.045, settings.seed + 19) * settings.detailRoughness * radial;
  const valley = settings.hasValley ? Math.exp(-Math.pow((x + z * 0.2) / (settings.radius * 0.19), 2)) * settings.valleyDepth * radial : 0;
  const caldera = settings.hasCaldera ? calderaShape(distance, settings) : 0;
  return Math.max(0, peakOne + ridges + rough + caldera - valley);
}

function calderaShape(distance, settings) {
  const craterRadius = settings.calderaRadius;
  const rimWidth = settings.calderaRimWidth;
  const bowl = Math.exp(-Math.pow(distance / craterRadius, 4)) * settings.calderaDepth;
  const rim = Math.exp(-Math.pow((distance - craterRadius) / rimWidth, 2)) * settings.calderaRimHeight;
  return rim - bowl;
}

function parseSettings(name, description) {
  const text = `${name} ${description}`.toLowerCase();
  const seed = hashText(text);
  const tall = /tall|huge|giant|big|high|steep/.test(text);
  const gentle = /soft|gentle|easy|round|small|safe/.test(text);
  const spiky = /spiky|sharp|pointy|jagged|rocky/.test(text);
  const sparkly = /sparkle|sparkly|crystal|shiny|glitter/.test(text);
  const forest = /tree|forest|pine|green/.test(text);
  const valley = /valley|bowl|dip|cave|safe/.test(text);
  const caldera = /caldera|culdera|crater|volcano|volcanic/.test(text);
  const massive = /massive|enormous|towering|mega|gigantic/.test(text);
  const cloudy = /cloud|cloudy|mist|fog|storm|overcast/.test(text);
  const radius = massive ? 245 : tall ? 220 : gentle ? 180 : 205;
  const height = caldera ? (tall || massive ? 138 : 118) : tall ? 132 : gentle ? 78 : 106;

  return {
    seed,
    radius,
    height,
    size: radius * 2.35,
    segments: 260,
    roughness: massive || spiky ? 18 : 13,
    detailRoughness: spiky ? 9 : 6,
    steepness: caldera ? 1.55 : spiky ? 1.62 : gentle ? 2.65 : 2.05,
    ridges: spiky || caldera ? 15 : 10,
    ridgeStrength: spiky ? 31 : caldera ? 24 : gentle ? 13 : 19,
    sparkleCount: sparkly ? 150 : 60,
    treeCount: forest ? 150 : 82,
    rockCount: spiky || caldera || /rock/.test(text) ? 90 : 42,
    cloudCount: cloudy ? 28 : 16,
    hasValley: valley,
    valleyDepth: valley ? height * 0.22 : 0,
    hasCaldera: caldera,
    calderaRadius: radius * 0.24,
    calderaRimWidth: radius * 0.07,
    calderaDepth: height * 0.72,
    calderaRimHeight: height * 0.28,
  };
}

function applyDebugOverrides(settings) {
  if (!isDebugMode || !debugOverrideSettings) return settings;
  return {
    ...settings,
    ...debugOverrideSettings,
  };
}

function setupDebugPanel(settings) {
  if (!isDebugMode) return;

  debugPanel.hidden = false;
  debugControls.innerHTML = "";

  for (const control of DEBUG_SETTING_CONTROLS) {
    const row = document.createElement("label");
    row.className = "debug-control";

    const label = document.createElement("span");
    label.textContent = control.label;
    label.dataset.value = formatDebugDisplayValue(settings[control.key], control);

    const input = document.createElement("input");
    input.dataset.settingKey = control.key;
    input.type = control.type === "checkbox" ? "checkbox" : control.type === "number" ? "number" : "range";

    if (control.type !== "checkbox") {
      input.min = String(control.min);
      input.max = String(control.max);
      input.step = String(control.step);
      input.value = formatSettingValue(settings[control.key], control);
    } else {
      input.checked = Boolean(settings[control.key]);
    }

    const value = document.createElement("span");
    value.className = "debug-value";
    value.textContent = formatDebugDisplayValue(readDebugInputValue(input, control), control);

    input.addEventListener("input", () => {
      const displayValue = formatDebugDisplayValue(readDebugInputValue(input, control), control);
      label.dataset.value = displayValue;
      value.textContent = displayValue;
      debugOverrideSettings = readDebugSettings();
      if (debugAutoRebuild.checked) scheduleDebugBuild();
    });

    row.append(label, input, value);
    debugControls.append(row);
  }
}

function updateDebugPanel(settings) {
  if (!isDebugMode) return;
  if (!debugControls.children.length) {
    setupDebugPanel(settings);
    return;
  }

  for (const control of DEBUG_SETTING_CONTROLS) {
    const input = debugControls.querySelector(`[data-setting-key="${control.key}"]`);
    const label = input?.parentElement?.querySelector("span:first-child");
    const value = input?.parentElement?.querySelector(".debug-value");
    if (!input || !value) continue;

    if (control.type === "checkbox") {
      input.checked = Boolean(settings[control.key]);
      value.textContent = formatDebugDisplayValue(input.checked, control);
    } else {
      input.value = formatSettingValue(settings[control.key], control);
      value.textContent = formatDebugDisplayValue(Number(input.value), control);
    }
    if (label) label.dataset.value = value.textContent;
  }
}

function readDebugSettings() {
  const settings = {};
  for (const control of DEBUG_SETTING_CONTROLS) {
    const input = debugControls.querySelector(`[data-setting-key="${control.key}"]`);
    if (!input) continue;
    settings[control.key] = control.type === "checkbox" ? input.checked : Number(input.value);
  }
  return settings;
}

function formatSettingValue(value, control) {
  const numericValue = Number(value ?? 0);
  if (control.step >= 1) return String(Math.round(numericValue));
  return numericValue.toFixed(String(control.step).split(".")[1]?.length || 1);
}

function readDebugInputValue(input, control) {
  return control.type === "checkbox" ? input.checked : Number(input.value);
}

function formatDebugDisplayValue(value, control) {
  if (control.type === "checkbox") return value ? "on" : "off";
  return formatSettingValue(value, control);
}

function scheduleDebugBuild() {
  window.clearTimeout(debugBuildTimer);
  debugBuildTimer = window.setTimeout(() => {
    buildMountain(nameInput.value.trim() || "Snowy Mountain", promptInput.value.trim());
  }, 220);
}

function buildMountain(name, description) {
  activeSeed = `${name} ${description}`;
  const settings = applyDebugOverrides(parseSettings(name, description));
  buildMountainFromSettings(name, description, settings);
}

function buildMountainFromSettings(name, description, settings, resetPlayer = true) {
  const random = seededRandom(settings.seed);
  const previousCameraPosition = camera.position.clone();
  const previousYaw = yaw;
  const previousPitch = pitch;
  mountainGroup.clear();
  clouds = [];
  eruptions = [];

  activeMountainName = name;
  activeMountainDescription = description;
  terrainData = settings;
  const geometry = new THREE.PlaneGeometry(settings.size, settings.size, settings.segments, settings.segments);
  geometry.rotateX(-Math.PI / 2);

  const positions = geometry.attributes.position;
  const colors = [];
  for (let i = 0; i < positions.count; i += 1) {
    const x = positions.getX(i);
    const z = positions.getZ(i);
    const y = terrainHeight(x, z, settings);
    positions.setY(i, y);
    const snow = THREE.MathUtils.clamp(0.7 + y / settings.height * 0.35, 0, 1);
    const shade = 0.84 + valueNoise(x * 0.08, z * 0.08, settings.seed + 7) * 0.08;
    const color = new THREE.Color().setRGB(0.72 * shade + snow * 0.2, 0.86 * shade + snow * 0.1, 0.94 * shade + snow * 0.06);
    if (y < 5) color.lerp(new THREE.Color(0xd8edf2), 0.22);
    colors.push(color.r, color.g, color.b);
  }
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
  geometry.computeVertexNormals();

  terrain = createTerrainMeshes(geometry, settings);
  mountainGroup.add(terrain);

  addTrees(random, settings);
  addRocks(random, settings);
  addSparkles(random, settings);
  addClouds(random, settings);
  addNameSign(name);

  currentName.textContent = name;
  hint.textContent = `Exploring ${name}. WASD/arrows: walk. Drag: look.`;

  if (resetPlayer) {
    const spawnZ = settings.radius * 0.86;
    const spawnY = getGroundHeight(0, spawnZ) + playerHeight;
    camera.position.set(0, spawnY, spawnZ);
    yaw = 0;
    pitch = 0.22;
  } else {
    camera.position.copy(previousCameraPosition);
    camera.position.y = Math.max(camera.position.y, getGroundHeight(camera.position.x, camera.position.z) + playerHeight);
    yaw = previousYaw;
    pitch = previousPitch;
  }
  updateDebugPanel(settings);
}

function createTerrainMeshes(sourceGeometry, settings) {
  const terrainGroup = new THREE.Group();
  const split = {
    snow: createTerrainBucket(),
    ice: createTerrainBucket(),
    cliff: createTerrainBucket(),
  };

  const positions = sourceGeometry.attributes.position;
  const colors = sourceGeometry.attributes.color;
  const uvs = sourceGeometry.attributes.uv;
  const index = sourceGeometry.index;
  const triangleCount = index ? index.count / 3 : positions.count / 3;

  const a = new THREE.Vector3();
  const b = new THREE.Vector3();
  const c = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  const normal = new THREE.Vector3();

  for (let triangle = 0; triangle < triangleCount; triangle += 1) {
    const ia = index ? index.getX(triangle * 3) : triangle * 3;
    const ib = index ? index.getX(triangle * 3 + 1) : triangle * 3 + 1;
    const ic = index ? index.getX(triangle * 3 + 2) : triangle * 3 + 2;

    a.fromBufferAttribute(positions, ia);
    b.fromBufferAttribute(positions, ib);
    c.fromBufferAttribute(positions, ic);
    normal.crossVectors(ab.subVectors(b, a), ac.subVectors(c, a)).normalize();
    if (normal.y < 0) normal.multiplyScalar(-1);

    const averageHeight = (a.y + b.y + c.y) / 3;
    const averageDistance = (Math.hypot(a.x, a.z) + Math.hypot(b.x, b.z) + Math.hypot(c.x, c.z)) / 3;
    const materialKey = chooseTerrainMaterial(averageHeight, averageDistance, normal.y, settings);
    appendTerrainTriangle(split[materialKey], positions, colors, uvs, ia, ib, ic);
  }

  addTerrainMesh(terrainGroup, split.snow, terrainMaterials.snow);
  addTerrainMesh(terrainGroup, split.ice, terrainMaterials.ice);
  addTerrainMesh(terrainGroup, split.cliff, terrainMaterials.cliff);
  return terrainGroup;
}

function createTerrainBucket() {
  return {
    positions: [],
    colors: [],
    uvs: [],
  };
}

function chooseTerrainMaterial(height, distance, normalY, settings) {
  const isSteep = normalY < 0.69;
  const isExposedSummit = height > settings.height * 0.62 && normalY < 0.82;
  const isLowSmooth = height < 3.5 && normalY > 0.8;
  const isCalderaWall =
    settings.hasCaldera &&
    distance > settings.calderaRadius * 0.75 &&
    distance < settings.calderaRadius * 1.35;
  const isCalderaFloor = settings.hasCaldera && distance < settings.calderaRadius * 0.72 && normalY > 0.72;

  if (isSteep || isExposedSummit || isCalderaWall) return "cliff";
  if (isCalderaFloor || isLowSmooth || (settings.hasValley && height < settings.height * 0.22 && normalY > 0.7)) return "ice";
  return "snow";
}

function appendTerrainTriangle(bucket, positions, colors, uvs, ia, ib, ic) {
  for (const vertexIndex of [ia, ib, ic]) {
    bucket.positions.push(positions.getX(vertexIndex), positions.getY(vertexIndex), positions.getZ(vertexIndex));
    bucket.colors.push(colors.getX(vertexIndex), colors.getY(vertexIndex), colors.getZ(vertexIndex));
    bucket.uvs.push(uvs.getX(vertexIndex), uvs.getY(vertexIndex));
  }
}

function addTerrainMesh(group, bucket, material) {
  if (bucket.positions.length === 0) return;

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(bucket.positions, 3));
  geometry.setAttribute("color", new THREE.Float32BufferAttribute(bucket.colors, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(bucket.uvs, 2));
  geometry.computeVertexNormals();

  const mesh = new THREE.Mesh(geometry, material);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  group.add(mesh);
}

function addTrees(random, settings) {
  const trunkGeometry = new THREE.CylinderGeometry(0.38, 0.54, 3.2, 7);
  const leavesGeometry = new THREE.ConeGeometry(2.2, 6.2, 8);
  for (let i = 0; i < settings.treeCount; i += 1) {
    const angle = random() * Math.PI * 2;
    const distance = settings.radius * 0.18 + random() * settings.radius * 0.72;
    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;
    const y = terrainHeight(x, z, settings);
    if (y > settings.height * 0.62 || (settings.hasCaldera && distance < settings.calderaRadius * 1.35)) continue;

    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(trunkGeometry, trunkMaterial);
    trunk.position.y = 1.6;
    trunk.castShadow = true;
    const leaves = new THREE.Mesh(leavesGeometry, pineMaterial);
    leaves.position.y = 5.7;
    leaves.castShadow = true;
    tree.add(trunk, leaves);
    tree.position.set(x, y, z);
    tree.scale.setScalar(0.9 + random() * 0.9);
    mountainGroup.add(tree);
  }
}

function addRocks(random, settings) {
  const geometry = new THREE.DodecahedronGeometry(1, 0);
  for (let i = 0; i < settings.rockCount; i += 1) {
    const angle = random() * Math.PI * 2;
    const distance = settings.radius * 0.08 + random() * settings.radius * 0.84;
    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;
    const y = terrainHeight(x, z, settings);
    const rock = new THREE.Mesh(geometry, rockMaterial);
    rock.position.set(x, y + 1.0, z);
    rock.rotation.set(random() * Math.PI, random() * Math.PI, random() * Math.PI);
    rock.scale.set(1.0 + random() * 3.4, 0.65 + random() * 2.1, 1.0 + random() * 3.4);
    rock.castShadow = true;
    mountainGroup.add(rock);
  }
}

function addSparkles(random, settings) {
  const geometry = new THREE.BufferGeometry();
  const points = [];
  for (let i = 0; i < settings.sparkleCount; i += 1) {
    const angle = random() * Math.PI * 2;
    const distance = random() * settings.radius * 0.94;
    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;
    const y = terrainHeight(x, z, settings) + 0.35;
    points.push(x, y, z);
  }
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(points, 3));
  const material = new THREE.PointsMaterial({
    color: 0xfff5bd,
    size: 0.55,
    transparent: true,
    opacity: 0.9,
  });
  mountainGroup.add(new THREE.Points(geometry, material));
}

function addClouds(random, settings) {
  const cloudRange = settings.size * 0.78;
  const wrapRange = settings.size * 0.92;
  const minHeight = Math.max(42, settings.height * 0.42);
  const maxHeight = Math.max(minHeight + 48, settings.height * 1.24);

  for (let i = 0; i < settings.cloudCount; i += 1) {
    const cloud = new THREE.Group();
    const puffCount = 4 + Math.floor(random() * 5);
    const cloudWidth = 12 + random() * 18;
    const cloudDepth = 4.5 + random() * 8;
    const cloudHeight = 2.8 + random() * 4.2;

    for (let puff = 0; puff < puffCount; puff += 1) {
      const mesh = new THREE.Mesh(cloudPuffGeometry, cloudMaterial);
      const offset = puff / Math.max(1, puffCount - 1) - 0.5;
      mesh.position.set(
        offset * cloudWidth + (random() - 0.5) * 5.8,
        (random() - 0.5) * cloudHeight,
        (random() - 0.5) * cloudDepth
      );
      mesh.scale.set(
        4.8 + random() * 6.6,
        1.35 + random() * 1.55,
        2.6 + random() * 3.8
      );
      cloud.add(mesh);
    }

    const level = random();
    const y = THREE.MathUtils.lerp(minHeight, maxHeight, Math.pow(level, 0.82));
    const x = (random() - 0.5) * cloudRange;
    const z = (random() - 0.5) * cloudRange - settings.radius * 0.12;
    const scale = THREE.MathUtils.lerp(0.72, 1.45, level) * (0.86 + random() * 0.28);
    const direction = random() > 0.5 ? 1 : -1;

    cloud.position.set(x, y, z);
    cloud.rotation.y = (random() - 0.5) * 0.42;
    cloud.scale.setScalar(scale);
    cloud.userData.cloud = {
      baseY: y,
      baseZ: z,
      phase: random() * Math.PI * 2,
      speed: direction * (1.8 + random() * 3.4),
      bobSpeed: 0.16 + random() * 0.18,
      bobAmount: 0.45 + random() * 1.35,
      wrapRange,
    };

    clouds.push(cloud);
    mountainGroup.add(cloud);
  }
}

function updateClouds(delta, time) {
  for (const cloud of clouds) {
    const data = cloud.userData.cloud;
    cloud.position.x += data.speed * delta;
    cloud.position.y = data.baseY + Math.sin(time * data.bobSpeed + data.phase) * data.bobAmount;
    cloud.position.z = data.baseZ + Math.sin(time * 0.08 + data.phase) * 3.5;

    if (cloud.position.x > data.wrapRange) cloud.position.x = -data.wrapRange;
    if (cloud.position.x < -data.wrapRange) cloud.position.x = data.wrapRange;
  }
}

function triggerEruption() {
  if (!terrainData) return;
  const formedCaldera = ensureEruptionCaldera();

  const random = seededRandom(hashText(`${activeSeed} eruption ${Math.floor(performance.now())}`));
  const craterRadius = terrainData.hasCaldera ? terrainData.calderaRadius * 0.34 : terrainData.radius * 0.035;
  const origin = new THREE.Vector3(0, terrainHeight(0, 0, terrainData) + 2.4, 0);
  const particleCount = terrainData.hasCaldera ? 760 : 560;
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const velocities = [];
  const ages = new Float32Array(particleCount);
  const lifetimes = new Float32Array(particleCount);

  for (let i = 0; i < particleCount; i += 1) {
    const angle = random() * Math.PI * 2;
    const launchRadius = random() * craterRadius;
    const horizontalSpeed = 9 + random() * 44;
    const verticalSpeed = terrainData.height * 0.5 + 40 + random() * 58;
    const index = i * 3;
    positions[index] = origin.x + Math.cos(angle) * launchRadius;
    positions[index + 1] = origin.y;
    positions[index + 2] = origin.z + Math.sin(angle) * launchRadius;
    colors[index] = 1;
    colors[index + 1] = 0.22 + random() * 0.42;
    colors[index + 2] = 0.02;
    velocities.push(new THREE.Vector3(
      Math.cos(angle) * horizontalSpeed,
      verticalSpeed,
      Math.sin(angle) * horizontalSpeed
    ));
    lifetimes[i] = 2.7 + random() * 2.2;
  }

  const lavaGeometry = new THREE.BufferGeometry();
  lavaGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  lavaGeometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
  const lava = new THREE.Points(lavaGeometry, lavaMaterial.clone());

  const smoke = createEruptionSmoke(origin, random, terrainData);
  const light = new THREE.PointLight(0xff6a1e, 7.5, terrainData.radius * 1.24, 1.7);
  light.position.copy(origin).add(new THREE.Vector3(0, 18, 0));

  const group = new THREE.Group();
  group.add(lava, smoke, light);
  mountainGroup.add(group);

  eruptions.push({
    group,
    lava,
    light,
    smoke,
    velocities,
    ages,
    lifetimes,
    elapsed: 0,
    duration: 5.4,
  });

  hint.textContent = formedCaldera
    ? `${currentName.textContent} formed a caldera and erupted. WASD/arrows: walk. Drag: look.`
    : `${currentName.textContent} is erupting. WASD/arrows: walk. Drag: look.`;
}

function ensureEruptionCaldera() {
  if (!terrainData || terrainData.hasCaldera) return false;

  const calderaSettings = {
    ...terrainData,
    hasCaldera: true,
    calderaRadius: terrainData.radius * 0.24,
    calderaRimWidth: terrainData.radius * 0.07,
    calderaDepth: terrainData.height * 0.72,
    calderaRimHeight: terrainData.height * 0.28,
  };
  buildMountainFromSettings(activeMountainName, activeMountainDescription, calderaSettings, false);
  return true;
}

function createEruptionSmoke(origin, random, settings) {
  const group = new THREE.Group();
  const puffCount = 18;
  for (let i = 0; i < puffCount; i += 1) {
    const puff = new THREE.Mesh(smokePuffGeometry, smokeMaterial.clone());
    const angle = random() * Math.PI * 2;
    const radius = random() * (settings.hasCaldera ? settings.calderaRadius * 0.18 : settings.radius * 0.035);
    puff.position.set(
      origin.x + Math.cos(angle) * radius,
      origin.y + random() * 8,
      origin.z + Math.sin(angle) * radius
    );
    puff.scale.setScalar(3.2 + random() * 6.5);
    puff.userData.smoke = {
      age: -random() * 0.45,
      life: 2.7 + random() * 1.4,
      speed: 9 + random() * 11,
      driftX: (random() - 0.5) * 5.5,
      driftZ: (random() - 0.5) * 5.5,
      baseScale: puff.scale.x,
    };
    group.add(puff);
  }
  return group;
}

function updateEruptions(delta) {
  for (let i = eruptions.length - 1; i >= 0; i -= 1) {
    const eruption = eruptions[i];
    eruption.elapsed += delta;
    updateLavaParticles(eruption, delta);
    updateSmokePuffs(eruption.smoke, delta);
    eruption.light.intensity = Math.max(0, 4.2 * (1 - eruption.elapsed / eruption.duration));

    if (eruption.elapsed >= eruption.duration) {
      mountainGroup.remove(eruption.group);
      eruption.lava.geometry.dispose();
      eruption.lava.material.dispose();
      disposeSmoke(eruption.smoke);
      eruptions.splice(i, 1);
    }
  }
}

function updateLavaParticles(eruption, delta) {
  const positions = eruption.lava.geometry.attributes.position;
  const colors = eruption.lava.geometry.attributes.color;
  for (let i = 0; i < positions.count; i += 1) {
    eruption.ages[i] += delta;
    const lifeRatio = THREE.MathUtils.clamp(eruption.ages[i] / eruption.lifetimes[i], 0, 1);
    const velocity = eruption.velocities[i];
    velocity.y -= 42 * delta;
    positions.setXYZ(
      i,
      positions.getX(i) + velocity.x * delta,
      positions.getY(i) + velocity.y * delta,
      positions.getZ(i) + velocity.z * delta
    );
    colors.setXYZ(i, 1, THREE.MathUtils.lerp(0.62, 0.08, lifeRatio), THREE.MathUtils.lerp(0.04, 0, lifeRatio));
  }
  positions.needsUpdate = true;
  colors.needsUpdate = true;
  eruption.lava.material.opacity = Math.max(0.24, 1 - eruption.elapsed / eruption.duration);
}

function updateSmokePuffs(smoke, delta) {
  for (const puff of smoke.children) {
    const data = puff.userData.smoke;
    data.age += delta;
    if (data.age < 0) continue;

    const lifeRatio = THREE.MathUtils.clamp(data.age / data.life, 0, 1);
    puff.position.x += data.driftX * delta;
    puff.position.y += data.speed * delta;
    puff.position.z += data.driftZ * delta;
    puff.scale.setScalar(data.baseScale * (1 + lifeRatio * 1.25));
    puff.material.opacity = Math.max(0, 0.5 * (1 - lifeRatio));
  }
}

function disposeSmoke(smoke) {
  for (const puff of smoke.children) {
    puff.material.dispose();
  }
}

function addNameSign(name) {
  const group = new THREE.Group();
  const post = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.38, 6.2, 8), trunkMaterial);
  post.position.y = 3.1;
  const board = new THREE.Mesh(new THREE.BoxGeometry(13, 3.2, 0.55), signMaterial);
  board.position.y = 6.2;
  board.castShadow = true;
  post.castShadow = true;
  group.add(post, board);

  const signCanvas = document.createElement("canvas");
  signCanvas.width = 512;
  signCanvas.height = 160;
  const context = signCanvas.getContext("2d");
  context.fillStyle = "#f2d18b";
  context.fillRect(0, 0, signCanvas.width, signCanvas.height);
  context.fillStyle = "#453018";
  context.font = "700 42px system-ui, sans-serif";
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.fillText(name.slice(0, 24), 256, 80, 450);
  const texture = new THREE.CanvasTexture(signCanvas);
  const text = new THREE.Mesh(
    new THREE.PlaneGeometry(12, 2.45),
    new THREE.MeshBasicMaterial({ map: texture, transparent: true })
  );
  text.position.set(0, 6.25, 0.285);
  group.add(text);
  const signZ = terrainData.radius * 0.48;
  const signX = -terrainData.radius * 0.14;
  group.position.set(signX, getGroundHeight(signX, signZ), signZ);
  group.rotation.y = 0.18;
  mountainGroup.add(group);
}

function getGroundHeight(x, z) {
  if (!terrainData) return 0;
  return terrainHeight(x, z, terrainData);
}

function movePlayer(delta) {
  const forward = Number(keys.has("w") || keys.has("arrowup")) - Number(keys.has("s") || keys.has("arrowdown"));
  const side = Number(keys.has("d") || keys.has("arrowright")) - Number(keys.has("a") || keys.has("arrowleft"));
  const direction = new THREE.Vector3();
  const speed = keys.has("shift") ? 34 : 19;
  direction.x = Math.sin(yaw) * forward + Math.cos(yaw) * side;
  direction.z = -Math.cos(yaw) * forward + Math.sin(yaw) * side;
  if (direction.lengthSq() > 0) {
    direction.normalize().multiplyScalar(speed * delta);
    camera.position.x += direction.x;
    camera.position.z += direction.z;
  }

  const limit = terrainData ? terrainData.size * 0.48 : 96;
  camera.position.x = THREE.MathUtils.clamp(camera.position.x, -limit, limit);
  camera.position.z = THREE.MathUtils.clamp(camera.position.z, -limit, limit);

  verticalVelocity -= 22 * delta;
  camera.position.y += verticalVelocity * delta;
  const ground = getGroundHeight(camera.position.x, camera.position.z) + playerHeight;
  if (camera.position.y <= ground) {
    camera.position.y = ground;
    verticalVelocity = 0;
    isGrounded = true;
  }

  const look = new THREE.Vector3(
    Math.sin(yaw) * Math.cos(pitch),
    Math.sin(pitch),
    -Math.cos(yaw) * Math.cos(pitch)
  );
  camera.lookAt(camera.position.clone().add(look));
}

function resize() {
  const width = window.innerWidth;
  const height = window.innerHeight;
  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

let lastTime = performance.now();
function animate(time) {
  const delta = Math.min((time - lastTime) / 1000, 0.05);
  lastTime = time;
  movePlayer(delta);
  updateClouds(delta, time / 1000);
  updateEruptions(delta);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

window.addEventListener("resize", resize);
resize();
buildMountain(nameInput.value, promptInput.value);
requestAnimationFrame(animate);

window.snowyMountains = {
  build: buildMountain,
  currentSeed: () => activeSeed,
};
