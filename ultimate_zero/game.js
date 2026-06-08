const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const levelSelector = document.getElementById("levelSelector");
const levelList = document.getElementById("levelList");
const messagePanel = document.getElementById("messagePanel");
const messageTitle = document.getElementById("messageTitle");
const messageBody = document.getElementById("messageBody");
const retryButton = document.getElementById("retryButton");
const menuButton = document.getElementById("menuButton");
const attemptsEl = document.getElementById("attempts");
const progressEl = document.getElementById("progress");
const verifierStatusEl = document.getElementById("verifierStatus");
const difficultySlider = document.getElementById("difficultySlider");
const difficultyValue = document.getElementById("difficultyValue");
const statusText = document.getElementById("statusText");

const WORLD = {
  width: 1280,
  height: 720,
  ground: 575,
  speed: 420,
  gravity: 2050,
  jump: -760
};

const MIN_MARGIN_MS = Number(difficultySlider.min);
const MAX_MARGIN_MS = Number(difficultySlider.max);

const BLUEPRINT_SEEDS = [
  { kind: "introSpike" },
  { kind: "double" },
  { kind: "platform" },
  { kind: "saw" },
  { kind: "gate" },
  { kind: "block", width: 74, height: 78 },
  { kind: "platform" },
  { kind: "miniWave" },
  { kind: "ceilingTap" },
  { kind: "double" },
  { kind: "sawGate" },
  { kind: "block", width: 82, height: 90 },
  { kind: "finalMix" }
];

const CONTINUATIONS = {
  introSpike: [{ kind: "double" }, { kind: "miniWave" }],
  double: [{ kind: "double" }, { kind: "miniWave" }],
  saw: [{ kind: "sawGate" }, { kind: "saw" }],
  gate: [{ kind: "ceilingTap" }, { kind: "gate" }],
  block: [{ kind: "block", width: 76, height: 82 }, { kind: "gate" }],
  miniWave: [{ kind: "miniWave" }, { kind: "double" }],
  ceilingTap: [{ kind: "gate" }, { kind: "ceilingTap" }],
  sawGate: [{ kind: "saw" }, { kind: "sawGate" }],
  platform: [{ kind: "platform" }],
  finalMix: [{ kind: "double" }, { kind: "sawGate" }]
};

const LEVEL_NAMES = [
  "Pulse Corridor",
  "Neon Steps",
  "Sawtooth Sprint",
  "Pillar Garden",
  "Signal Drop",
  "Chrome Rise",
  "Hazard Relay",
  "Grid Runner",
  "Cyan Cascade",
  "Spike Clock",
  "Static Bridge",
  "Vault Circuit",
  "Echo Platforms",
  "Solar Teeth",
  "Binary Climb",
  "Rhythm Locks",
  "Greenline Rush",
  "Ion Gallery",
  "Gate Sequence",
  "Prism Run",
  "Machine Steps",
  "Glitch Pillars",
  "Sawline Drift",
  "Tower Signal",
  "Overdrive Path",
  "Frame Skip",
  "Zero Hour",
  "Hard Reset",
  "Final Voltage",
  "Ultimate Line"
];

const LEVEL_DEFINITIONS = LEVEL_NAMES.map((name, index) => {
  const levelNumber = index + 1;
  return {
    id: levelNumber,
    name,
    seed: 1807 + levelNumber * 977,
    extraSeeds: Math.floor(index / 4),
    platformChance: Math.min(0.46, 0.24 + (index % 6) * 0.035),
    pillarChance: Math.min(0.58, 0.24 + (index % 7) * 0.045),
    spacing: 1 + Math.min(0.2, index * 0.006),
    label: levelNumber.toString().padStart(2, "0")
  };
});

const player = {
  x: 235,
  y: WORLD.ground - 52,
  size: 52,
  vy: 0,
  rotation: 0,
  grounded: true
};

const state = {
  screen: "menu",
  level: null,
  levelDefinition: LEVEL_DEFINITIONS[0],
  levelIndex: 0,
  levelCache: new Map(),
  verification: null,
  timingMarginMs: Number(difficultySlider.value),
  cameraX: 0,
  attempts: 0,
  lastTime: 0,
  pulse: 0,
  completed: false
};

function marginPx() {
  return (WORLD.speed * state.timingMarginMs) / 1000;
}

function difficultyRatio() {
  const span = MAX_MARGIN_MS - MIN_MARGIN_MS;
  return 1 - (state.timingMarginMs - MIN_MARGIN_MS) / span;
}

function makeRng(seed) {
  let value = seed >>> 0;
  return () => {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function pick(list, rng) {
  return list[Math.floor(rng() * list.length)];
}

function makeBlueprintSequence(levelDefinition) {
  const rng = makeRng(levelDefinition.seed + state.timingMarginMs * 17);
  const sequence = [];
  const seeds = [...BLUEPRINT_SEEDS];
  const insertable = [
    { kind: "double" },
    { kind: "saw" },
    { kind: "gate" },
    { kind: "miniWave" },
    { kind: "ceilingTap" },
    { kind: "platform" },
    { kind: "block", width: 70, height: 76 }
  ];

  for (let i = 0; i < levelDefinition.extraSeeds; i += 1) {
    const insertAt = 2 + Math.floor(rng() * Math.max(1, seeds.length - 3));
    seeds.splice(insertAt, 0, { ...pick(insertable, rng) });
  }

  for (let seedIndex = 0; seedIndex < seeds.length; seedIndex += 1) {
    const seed = seeds[seedIndex];
    if (seed.kind !== "platform" && rng() < levelDefinition.platformChance * 0.22) {
      sequence.push({ kind: "platform" });
    }

    sequence.push({ ...seed });

    let current = seed.kind;
    let repeats = 0;
    while (shouldContinueChunk(seed.kind, repeats, rng, levelDefinition)) {
      const next = pick(CONTINUATIONS[current] ?? CONTINUATIONS.double, rng);
      sequence.push({ ...next });
      current = next.kind;
      repeats += 1;
    }
  }

  return sequence;
}

function shouldContinueChunk(kind, repeats, rng, levelDefinition) {
  if (kind === "platform") {
    if (repeats < 2) return true;
    const chance = Math.max(0.15, 0.75 - (repeats - 2) * 0.1);
    return repeats < 8 && rng() < chance;
  }

  return repeats < 3 && rng() < 0.42 + levelDefinition.extraSeeds * 0.025;
}

function makeSpike(x, w = 54, h = 64) {
  return { type: "spike", x, y: WORLD.ground, w, h };
}

function makeSaw(x, radius = 34) {
  return { type: "saw", x, y: WORLD.ground - radius * 2, w: radius * 2, h: radius * 2, r: radius };
}

function makeBlock(x, width, height, role = "block") {
  return { type: "block", role, x, y: WORLD.ground - height, w: width, h: height };
}

function makeCeilingBlock(x, width, y, height = 54) {
  return { type: "block", role: "ceiling", x, y, w: width, h: height };
}

function makePlatform(source, x, rng, levelDefinition) {
  const hard = difficultyRatio();
  const isPillar = rng() < levelDefinition.pillarChance;
  const width = isPillar ? 82 + rng() * 48 : 176 + rng() * 58 + (1 - hard) * 24;
  const climb = source.type === "ground" ? 58 + rng() * 28 : -34 + rng() * 78;
  const y = Math.max(430, Math.min(535, source.y - climb));
  return { type: isPillar ? "pillar" : "platform", x, y, w: width, h: isPillar ? WORLD.ground - y : 34 };
}

function makeChallenge(blueprint, x, surface, rng, levelDefinition) {
  const hard = difficultyRatio();
  const hazards = [];
  const platforms = [];
  const scenery = [];

  if (blueprint.kind === "introSpike") {
    hazards.push(makeSpike(x, 52, 62));
    scenery.push({ type: "gateLine", x: x - 90, h: 210 });
  }

  if (blueprint.kind === "double") {
    const gap = 12 + hard * 64;
    hazards.push(makeSpike(x), makeSpike(x + 54 + gap, 52, 60));
    scenery.push({ type: "pulse", x: x + 64, y: 320, r: 28 });
  }

  if (blueprint.kind === "saw") {
    const radius = 29 + hard * 9;
    hazards.push(makeSaw(x + 8, radius));
    scenery.push({ type: "gateLine", x: x + 108, h: 280 });
  }

  if (blueprint.kind === "gate") {
    hazards.push(makeSpike(x, 50, 58), makeCeilingBlock(x + 82, 118 + hard * 24, 348 - hard * 18, 46));
    scenery.push({ type: "pulse", x: x + 146, y: 270, r: 34 });
  }

  if (blueprint.kind === "block") {
    const width = Math.max(42, blueprint.width - 20 + hard * 22);
    const height = Math.max(54, blueprint.height - 22 + hard * 18);
    hazards.push(makeBlock(x, width, height));
    scenery.push({ type: "stepGlow", x: x - 34, w: width + 68 });
  }

  if (blueprint.kind === "miniWave") {
    const gap = 24 + hard * 26;
    hazards.push(makeSpike(x, 40, 48), makeSpike(x + 74 + gap, 44, 54), makeSpike(x + 148 + gap * 1.4, 38, 46));
    scenery.push({ type: "pulse", x: x + 120, y: 300, r: 25 }, { type: "pulse", x: x + 224, y: 250, r: 20 });
  }

  if (blueprint.kind === "ceilingTap") {
    hazards.push(makeSpike(x, 52, 62), makeCeilingBlock(x + 132, 140 + hard * 28, 324 - hard * 14, 52));
    scenery.push({ type: "gateLine", x: x + 124, h: 340 });
  }

  if (blueprint.kind === "sawGate") {
    const radius = 27 + hard * 7;
    hazards.push(makeSaw(x, radius), makeCeilingBlock(x + 86, 120 + hard * 18, 338 - hard * 12, 48));
    scenery.push({ type: "pulse", x: x + 110, y: 282, r: 30 });
  }

  if (blueprint.kind === "finalMix") {
    const gap = 22 + hard * 34;
    hazards.push(makeSpike(x, 48, 58), makeSaw(x + 82 + gap, 29 + hard * 7), makeSpike(x + 180 + gap, 44, 52));
    scenery.push({ type: "gateLine", x: x + 54, h: 260 }, { type: "pulse", x: x + 210, y: 270, r: 36 });
  }

  if (blueprint.kind === "platform") {
    const platform = makePlatform(surface, x, rng, levelDefinition);
    platforms.push(platform);
    scenery.push({ type: "platformGlow", platform });
  }

  const end = Math.max(...hazards.map((hazard) => hazard.x + hazard.w), ...platforms.map((platform) => platform.x + platform.w));
  return { x, end, hazards, platforms, scenery, sourceSurface: surface };
}

function makeLevel(levelDefinition) {
  const requiredPx = marginPx();
  const rng = makeRng(levelDefinition.seed * 3 + state.timingMarginMs * 31);
  const hazards = [];
  const platforms = [];
  const scenery = [];
  const challengeGroups = [];
  const platformRoutes = [];
  let surface = { type: "ground", x: -Infinity, end: Infinity, y: WORLD.ground };
  let x = 780;

  for (const blueprint of makeBlueprintSequence(levelDefinition)) {
    const group = makeChallenge(blueprint, x, surface, rng, levelDefinition);
    challengeGroups.push(group);
    hazards.push(...group.hazards);
    platforms.push(...group.platforms);
    scenery.push(...group.scenery);

    if (group.platforms.length > 0) {
      const platform = group.platforms[0];
      platformRoutes.push({ from: surface, to: platform, groupIndex: challengeGroups.length - 1 });
      surface = { type: "platform", x: platform.x, end: platform.x + platform.w, y: platform.y };
      x = platform.x + platform.w + 120 + requiredPx * 0.75;
    } else {
      x = group.end + (360 + requiredPx * 1.45 + (group.hazards.length > 2 ? 80 : 0)) * levelDefinition.spacing;
      if (surface.type === "platform" && x - surface.end > 520) {
        surface = { type: "ground", x: -Infinity, end: Infinity, y: WORLD.ground };
      }
    }
  }

  return {
    id: levelDefinition.id,
    name: levelDefinition.name,
    label: levelDefinition.label,
    length: x + 620,
    hazards,
    platforms,
    scenery,
    challengeGroups,
    platformRoutes
  };
}

function groupEnd(group) {
  return Math.max(...group.hazards.map((hazard) => hazard.x + hazard.w), ...group.platforms.map((platform) => platform.x + platform.w));
}

function syncPlatformShape(platform) {
  if (platform.type === "pillar") {
    platform.h = WORLD.ground - platform.y;
  }
}

function shiftGroupsAfter(level, groupIndex, shift) {
  for (let i = groupIndex + 1; i < level.challengeGroups.length; i += 1) {
    for (const hazard of level.challengeGroups[i].hazards) {
      hazard.x += shift;
    }
    for (const platform of level.challengeGroups[i].platforms) {
      platform.x += shift;
    }
    for (const item of level.challengeGroups[i].scenery) {
      if (typeof item.x === "number") item.x += shift;
    }
    level.challengeGroups[i].x += shift;
    level.challengeGroups[i].end += shift;
  }
}

function refreshLevelGeometry(level) {
  level.hazards = level.challengeGroups.flatMap((group) => group.hazards);
  level.platforms = level.challengeGroups.flatMap((group) => group.platforms);
  level.scenery = level.challengeGroups.flatMap((group) => group.scenery);
  level.platformRoutes = [];

  let surface = { type: "ground", x: -Infinity, end: Infinity, y: WORLD.ground };

  for (const group of level.challengeGroups) {
    group.end = groupEnd(group);

    if (group.platforms.length > 0) {
      const platform = group.platforms[0];
      syncPlatformShape(platform);
      level.platformRoutes.push({ from: surface, to: platform, groupIndex: level.challengeGroups.indexOf(group) });
      surface = { type: "platform", x: platform.x, end: platform.x + platform.w, y: platform.y };
    } else if (surface.type === "platform" && group.x - surface.end > 520) {
      surface = { type: "ground", x: -Infinity, end: Infinity, y: WORLD.ground };
    }
  }

  level.length = level.challengeGroups[level.challengeGroups.length - 1].end + 620;
}

function collidesWithHazards(playerBox, hazards) {
  for (const hazard of hazards) {
    if (hazard.type === "spike" && triangleHit(playerBox, hazard)) return true;
    if (hazard.type === "saw" && circleHit(playerBox, hazard)) return true;
    if (hazard.type === "block" && rectsOverlap(playerBox, hazard)) return true;
  }
  return false;
}

function simulateJump(level, group, startX) {
  const sim = {
    x: startX,
    y: WORLD.ground - player.size,
    vy: WORLD.jump,
    grounded: false
  };
  const dt = 1 / 180;
  const stopX = group.end + player.size + 80;
  const localHazards = level.hazards.filter((hazard) => hazard.x > startX - 40 && hazard.x < stopX + 80);

  for (let step = 0; step < 420; step += 1) {
    sim.x += WORLD.speed * dt;
    sim.vy += WORLD.gravity * dt;
    sim.y += sim.vy * dt;

    if (sim.y + player.size >= WORLD.ground) {
      sim.y = WORLD.ground - player.size;
      sim.vy = 0;
      sim.grounded = true;
    }

    const box = {
      x: sim.x + 8,
      y: sim.y + 8,
      w: player.size - 16,
      h: player.size - 16
    };

    if (collidesWithHazards(box, localHazards)) return null;
    if (sim.x > stopX && sim.grounded) return { landingX: sim.x };
  }

  return null;
}

function simulatePlatformReach(level, route, startX) {
  const sim = {
    x: startX,
    y: route.from.y - player.size,
    vy: WORLD.jump
  };
  const dt = 1 / 180;
  const target = route.to;
  const stopX = target.x + target.w + 80;
  const localHazards = level.hazards.filter((hazard) => hazard.x > startX - 40 && hazard.x < stopX + 80);

  for (let step = 0; step < 420; step += 1) {
    const previousBottom = sim.y + player.size;
    sim.x += WORLD.speed * dt;
    sim.vy += WORLD.gravity * dt;
    sim.y += sim.vy * dt;

    const box = {
      x: sim.x + 8,
      y: sim.y + 8,
      w: player.size - 16,
      h: player.size - 16
    };

    if (collidesWithHazards(box, localHazards)) return null;

    const withinX = sim.x + player.size > target.x && sim.x < target.x + target.w;
    const crossingTop = previousBottom <= target.y && sim.y + player.size >= target.y;
    if (withinX && crossingTop && sim.vy >= 0) {
      return { landingX: sim.x };
    }

    if (sim.x > stopX || sim.y > WORLD.ground + 160) return null;
  }

  return null;
}

function simulatePlatformExit(level, platform, nextPlatform, startX) {
  const sim = {
    x: startX,
    y: platform.y - player.size,
    vy: WORLD.jump
  };
  const dt = 1 / 180;
  const stopX = nextPlatform ? nextPlatform.x + nextPlatform.w + 80 : platform.x + platform.w + 720;
  const localHazards = level.hazards.filter((hazard) => hazard.x > startX - 40 && hazard.x < stopX + 80);

  for (let step = 0; step < 520; step += 1) {
    const previousBottom = sim.y + player.size;
    sim.x += WORLD.speed * dt;
    sim.vy += WORLD.gravity * dt;
    sim.y += sim.vy * dt;

    const box = {
      x: sim.x + 8,
      y: sim.y + 8,
      w: player.size - 16,
      h: player.size - 16
    };

    if (collidesWithHazards(box, localHazards)) return null;

    if (nextPlatform) {
      const withinX = sim.x + player.size > nextPlatform.x && sim.x < nextPlatform.x + nextPlatform.w;
      const crossingTop = previousBottom <= nextPlatform.y && sim.y + player.size >= nextPlatform.y;
      if (withinX && crossingTop && sim.vy >= 0) return { landingX: sim.x, target: "platform" };
    } else if (sim.y + player.size >= WORLD.ground) {
      return { landingX: sim.x, target: "ground" };
    }

    if (sim.x > stopX || sim.y > WORLD.ground + 160) return null;
  }

  return null;
}

function verifyPlatforms(level, requiredPx) {
  const reports = [];

  for (let i = 0; i < level.platformRoutes.length; i += 1) {
    const route = level.platformRoutes[i];
    const minSample = route.from.type === "ground" ? route.to.x - 620 : route.from.x;
    const maxSample = route.from.type === "ground" ? route.to.x - 8 : route.from.end - player.size;
    let firstStart = null;
    let lastStart = null;
    let earliestLanding = Infinity;

    for (let startX = minSample; startX <= maxSample; startX += 4) {
      const result = simulatePlatformReach(level, route, startX);
      if (!result) continue;

      firstStart = firstStart ?? startX;
      lastStart = startX;
      earliestLanding = Math.min(earliestLanding, result.landingX);
    }

    const windowPx = firstStart === null ? 0 : lastStart - firstStart;
    reports.push({
      index: i,
      ok: windowPx >= requiredPx,
      firstStart,
      lastStart,
      windowPx,
      earliestLanding,
      from: route.from.type
    });
  }

  const failed = reports.filter((report) => !report.ok);
  return {
    ok: failed.length === 0,
    reports,
    failed,
    tightestWindowPx: reports.length > 0 ? Math.min(...reports.map((report) => report.windowPx)) : Infinity
  };
}

function verifyPlatformExits(level, requiredPx) {
  const reports = [];

  for (let i = 0; i < level.platformRoutes.length; i += 1) {
    const platform = level.platformRoutes[i].to;
    const nextRoute = level.platformRoutes[i + 1];
    const nextPlatform = nextRoute && nextRoute.from.type === "platform" ? nextRoute.to : null;
    const minSample = Math.max(platform.x, platform.x + platform.w - player.size - requiredPx * 1.8);
    const maxSample = platform.x + platform.w - player.size;
    let firstStart = null;
    let lastStart = null;
    let earliestLanding = Infinity;

    for (let startX = minSample; startX <= maxSample; startX += 4) {
      const result = simulatePlatformExit(level, platform, nextPlatform, startX);
      if (!result) continue;

      firstStart = firstStart ?? startX;
      lastStart = startX;
      earliestLanding = Math.min(earliestLanding, result.landingX);
    }

    const windowPx = firstStart === null ? 0 : lastStart - firstStart;
    reports.push({
      index: i,
      ok: windowPx >= requiredPx,
      firstStart,
      lastStart,
      windowPx,
      earliestLanding,
      target: nextPlatform ? "platform" : "ground"
    });
  }

  const failed = reports.filter((report) => !report.ok);
  return {
    ok: failed.length === 0,
    reports,
    failed,
    tightestWindowPx: reports.length > 0 ? Math.min(...reports.map((report) => report.windowPx)) : Infinity
  };
}

function verifyLevel(level, requiredPx) {
  const reports = [];
  let previousLandingX = -Infinity;

  for (let i = 0; i < level.challengeGroups.length; i += 1) {
    const group = level.challengeGroups[i];
    if (group.hazards.length === 0) continue;

    const minSample = group.x - 620;
    const maxSample = group.x - 8;
    let firstStart = null;
    let lastStart = null;
    let earliestLanding = Infinity;

    for (let startX = minSample; startX <= maxSample; startX += 4) {
      const result = simulateJump(level, group, startX);
      if (!result) continue;

      firstStart = firstStart ?? startX;
      lastStart = startX;
      earliestLanding = Math.min(earliestLanding, result.landingX);
    }

    const windowPx = firstStart === null ? 0 : lastStart - firstStart;
    const hasEnoughWindow = windowPx >= requiredPx;
    const hasRecovery = previousLandingX <= lastStart - requiredPx * 0.4;
    const ok = hasEnoughWindow && hasRecovery;

    reports.push({
      index: i,
      ok,
      firstStart,
      lastStart,
      windowPx,
      earliestLanding,
      recoveryPx: lastStart - previousLandingX
    });

    previousLandingX = Math.max(previousLandingX, earliestLanding);
  }

  const failed = reports.filter((report) => !report.ok);
  const platformVerification = verifyPlatforms(level, requiredPx);
  const platformExitVerification = verifyPlatformExits(level, requiredPx);
  const tightestWindows = [
    ...reports.map((report) => report.windowPx),
    ...platformVerification.reports.map((report) => report.windowPx),
    ...platformExitVerification.reports.map((report) => report.windowPx)
  ];

  return {
    ok: failed.length === 0 && platformVerification.ok && platformExitVerification.ok,
    reports,
    failed,
    platformReports: platformVerification.reports,
    failedPlatforms: platformVerification.failed,
    platformExitReports: platformExitVerification.reports,
    failedPlatformExits: platformExitVerification.failed,
    tightestWindowPx: Math.min(...tightestWindows)
  };
}

function tuneLevelForMargin(levelDefinition) {
  const requiredPx = marginPx();
  let level = makeLevel(levelDefinition);

  for (let pass = 0; pass < 16; pass += 1) {
    const verification = verifyLevel(level, requiredPx);
    if (verification.ok) {
      return { level, verification, passes: pass + 1 };
    }

    for (const failure of verification.failed) {
      const group = level.challengeGroups[failure.index];
      const shift = Math.max(36, requiredPx - failure.windowPx + 24);
      shiftGroupsAfter(level, failure.index, shift);

      if (failure.windowPx < requiredPx && group.hazards.length > 1) {
        for (let i = 1; i < group.hazards.length; i += 1) {
          const hazard = group.hazards[i];
          if (hazard.role === "ceiling") {
            hazard.y -= 10;
            hazard.w = Math.max(70, hazard.w - 10);
          } else {
            hazard.x -= Math.min(16, requiredPx - failure.windowPx + 6);
          }
        }
        group.end = Math.max(...group.hazards.map((hazard) => hazard.x + hazard.w));
      }

      if (failure.windowPx < requiredPx && group.hazards.length === 1 && group.hazards[0].type === "block") {
        const block = group.hazards[0];
        const reduction = Math.min(12, requiredPx - failure.windowPx + 4);
        block.w = Math.max(34, block.w - reduction);
        block.h = Math.max(42, block.h - reduction);
        block.y = WORLD.ground - block.h;
        group.end = block.x + block.w;
      }
    }

    for (const failure of verification.failedPlatforms) {
      const route = level.platformRoutes[failure.index];
      route.to.w += 28;
      route.to.y = Math.min(535, route.to.y + 12);
      syncPlatformShape(route.to);
    }

    for (const failure of verification.failedPlatformExits) {
      const route = level.platformRoutes[failure.index];
      route.to.w += Math.max(30, requiredPx - failure.windowPx + 18);
      route.to.y = Math.min(535, route.to.y + 8);
      syncPlatformShape(route.to);
      if (failure.target === "platform") {
        const nextRoute = level.platformRoutes[failure.index + 1];
        nextRoute.to.x = Math.max(route.to.x + route.to.w + 70, nextRoute.to.x - 28);
        nextRoute.to.y = Math.min(535, nextRoute.to.y + 10);
        syncPlatformShape(nextRoute.to);
      } else {
        shiftGroupsAfter(level, route.groupIndex, Math.max(80, requiredPx - failure.windowPx + 80));
      }
    }

    refreshLevelGeometry(level);
  }

  return { level, verification: verifyLevel(level, requiredPx), passes: 16 };
}

function levelCacheKey(levelDefinition) {
  return `${levelDefinition.id}:${state.timingMarginMs}`;
}

function rebuildLevel(levelIndex = state.levelIndex) {
  state.levelIndex = levelIndex;
  state.levelDefinition = LEVEL_DEFINITIONS[levelIndex];
  const cacheKey = levelCacheKey(state.levelDefinition);
  const tuned = state.levelCache.get(cacheKey) ?? tuneLevelForMargin(state.levelDefinition);
  state.levelCache.set(cacheKey, tuned);
  state.level = tuned.level;
  state.verification = tuned.verification;

  const px = Math.round(marginPx());
  difficultyValue.textContent = `${state.timingMarginMs} ms / ${px} px`;
  const verdict = state.verification.ok ? "Verified" : "Needs tuning";
  verifierStatusEl.textContent = `${verdict} ${state.verification.reports.length} jumps / ${state.verification.platformReports.length} platforms / ${state.verification.platformExitReports.length} exits`;
  statusText.textContent = state.screen === "menu" ? `Selected ${state.level.label} ${state.level.name}` : state.level.name;
  updateLevelCards();
  resetPlayer();
  updateHud();
}

function renderLevelSelector() {
  levelList.innerHTML = "";

  for (const levelDefinition of LEVEL_DEFINITIONS) {
    const button = document.createElement("button");
    button.className = "level-card";
    button.type = "button";
    button.dataset.levelIndex = String(levelDefinition.id - 1);
    button.innerHTML = `
      <span class="level-number">${levelDefinition.label}</span>
      <span>
        <strong>${levelDefinition.name}</strong>
        <small>Seeded run with ${levelDefinition.extraSeeds + 13} base chunks, verified on play.</small>
      </span>
    `;
    levelList.appendChild(button);
  }

  updateLevelCards();
}

function updateLevelCards() {
  for (const card of levelList.querySelectorAll(".level-card")) {
    card.classList.toggle("selected", Number(card.dataset.levelIndex) === state.levelIndex);
  }
}

function resetPlayer() {
  player.x = 235;
  player.y = WORLD.ground - player.size;
  player.vy = 0;
  player.rotation = 0;
  player.grounded = true;
  state.cameraX = 0;
  state.completed = false;
}

function startLevel(levelIndex = state.levelIndex) {
  if (levelIndex !== state.levelIndex || !state.level) {
    rebuildLevel(levelIndex);
  }
  state.screen = "playing";
  state.attempts += 1;
  resetPlayer();
  levelSelector.classList.add("hidden");
  messagePanel.classList.add("hidden");
  statusText.textContent = state.level.name;
  updateHud();
}

function openMenu() {
  state.screen = "menu";
  levelSelector.classList.remove("hidden");
  messagePanel.classList.add("hidden");
  statusText.textContent = "Select a level";
  resetPlayer();
  updateHud();
}

function showMessage(title, body) {
  messageTitle.textContent = title;
  messageBody.textContent = body;
  messagePanel.classList.remove("hidden");
}

function failLevel() {
  if (state.screen !== "playing") return;
  state.screen = "failed";
  showMessage("Crashed", "Retry the rhythm and clear the corridor.");
}

function completeLevel() {
  if (state.screen !== "playing") return;
  state.screen = "complete";
  state.completed = true;
  showMessage("Level Complete", "Pulse Corridor cleared.");
}

function jump() {
  if (state.screen === "menu") {
    startLevel();
    return;
  }

  if (state.screen === "failed" || state.screen === "complete") {
    startLevel();
    return;
  }

  if (!player.grounded) return;
  player.vy = WORLD.jump;
  player.grounded = false;
}

function updateHud() {
  attemptsEl.textContent = `Attempts ${state.attempts}`;
  const progress = Math.min(100, Math.floor((state.cameraX / (state.level.length - WORLD.width)) * 100));
  progressEl.textContent = `${Math.max(0, progress)}%`;
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function triangleHit(playerBox, spike) {
  const inset = spike.w * 0.18;
  const tighterSpike = {
    x: spike.x + inset,
    y: spike.y - spike.h + 10,
    w: spike.w - inset * 2,
    h: spike.h - 10
  };
  return rectsOverlap(playerBox, tighterSpike);
}

function circleHit(playerBox, circle) {
  const cx = circle.x + circle.r;
  const cy = circle.y + circle.r;
  const closestX = Math.max(playerBox.x, Math.min(cx, playerBox.x + playerBox.w));
  const closestY = Math.max(playerBox.y, Math.min(cy, playerBox.y + playerBox.h));
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy < (circle.r - 6) * (circle.r - 6);
}

function landOnPlatforms(previousBottom) {
  player.grounded = false;

  if (player.y + player.size >= WORLD.ground) {
    player.y = WORLD.ground - player.size;
    player.vy = 0;
    player.grounded = true;
    return;
  }

  for (const platform of state.level.platforms) {
    const withinX = player.x + player.size > platform.x && player.x < platform.x + platform.w;
    const crossingTop = previousBottom <= platform.y && player.y + player.size >= platform.y;
    if (withinX && crossingTop && player.vy >= 0) {
      player.y = platform.y - player.size;
      player.vy = 0;
      player.grounded = true;
      return;
    }
  }
}

function update(dt) {
  if (state.screen !== "playing") return;

  const previousBottom = player.y + player.size;
  state.cameraX += WORLD.speed * dt;
  player.x += WORLD.speed * dt;
  player.vy += WORLD.gravity * dt;
  player.y += player.vy * dt;
  state.pulse += dt;

  landOnPlatforms(previousBottom);

  if (!player.grounded) {
    player.rotation += dt * 7.6;
  } else {
    player.rotation = Math.round(player.rotation / (Math.PI / 2)) * (Math.PI / 2);
  }

  const playerBox = {
    x: player.x + 8,
    y: player.y + 8,
    w: player.size - 16,
    h: player.size - 16
  };

  if (collidesWithHazards(playerBox, state.level.hazards)) {
    failLevel();
    return;
  }

  if (state.cameraX >= state.level.length - WORLD.width) {
    completeLevel();
  }

  updateHud();
}

function screenX(worldX) {
  return worldX - state.cameraX;
}

function drawBackground() {
  const sky = ctx.createLinearGradient(0, 0, 0, WORLD.height);
  sky.addColorStop(0, "#172225");
  sky.addColorStop(0.55, "#15191b");
  sky.addColorStop(1, "#101112");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WORLD.width, WORLD.height);

  ctx.save();
  ctx.globalAlpha = 0.3;
  for (let x = -((state.cameraX * 0.25) % 96); x < WORLD.width + 96; x += 96) {
    for (let y = 80; y < WORLD.ground; y += 96) {
      ctx.strokeStyle = "#2b363a";
      ctx.strokeRect(x, y, 96, 96);
    }
  }
  ctx.restore();

  ctx.fillStyle = "#20282b";
  ctx.fillRect(0, WORLD.ground, WORLD.width, WORLD.height - WORLD.ground);

  ctx.fillStyle = "#111516";
  for (let x = -((state.cameraX * 1.4) % 46); x < WORLD.width + 46; x += 46) {
    ctx.fillRect(x, WORLD.ground + 36, 24, 24);
  }

  ctx.strokeStyle = "#12c8d8";
  ctx.lineWidth = 5;
  ctx.beginPath();
  ctx.moveTo(0, WORLD.ground);
  ctx.lineTo(WORLD.width, WORLD.ground);
  ctx.stroke();
}

function drawPlatforms() {
  for (const platform of state.level.platforms) {
    const x = screenX(platform.x);
    if (x > WORLD.width || x + platform.w < 0) continue;

    if (platform.type === "pillar") {
      ctx.fillStyle = "#29343a";
      ctx.fillRect(x, platform.y, platform.w, WORLD.ground - platform.y);
      ctx.fillStyle = "rgba(18, 200, 216, 0.18)";
      for (let y = platform.y + 18; y < WORLD.ground - 18; y += 34) {
        ctx.fillRect(x + 10, y, platform.w - 20, 8);
      }
    } else {
      ctx.fillStyle = "#263035";
      ctx.fillRect(x, platform.y, platform.w, platform.h);
      ctx.fillStyle = "rgba(169, 232, 79, 0.22)";
      ctx.fillRect(x + 8, platform.y + 14, platform.w - 16, 8);
    }

    ctx.fillStyle = "#a9e84f";
    ctx.fillRect(x, platform.y, platform.w, 10);
    ctx.strokeStyle = "#15191b";
    ctx.lineWidth = 3;
    ctx.strokeRect(x, platform.y, platform.w, platform.type === "pillar" ? WORLD.ground - platform.y : platform.h);
  }
}

function drawScenery() {
  for (const item of state.level.scenery) {
    const itemX = item.platform ? item.platform.x : item.x;
    const x = screenX(itemX);
    if (x > WORLD.width + 100 || x < -160) continue;

    if (item.type === "gateLine") {
      ctx.save();
      ctx.globalAlpha = 0.55;
      ctx.strokeStyle = "#12c8d8";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(x, WORLD.ground - item.h);
      ctx.lineTo(x, WORLD.ground);
      ctx.stroke();
      ctx.fillStyle = "rgba(18, 200, 216, 0.18)";
      ctx.fillRect(x - 12, WORLD.ground - item.h, 24, item.h);
      ctx.restore();
    }

    if (item.type === "pulse") {
      const pulse = 1 + Math.sin(state.pulse * 7 + item.x * 0.01) * 0.08;
      ctx.save();
      ctx.globalAlpha = 0.72;
      ctx.strokeStyle = "#a9e84f";
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(x, item.y, item.r * pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = "rgba(169, 232, 79, 0.12)";
      ctx.beginPath();
      ctx.arc(x, item.y, item.r * 0.54, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    if (item.type === "stepGlow") {
      ctx.save();
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = "rgba(255, 210, 71, 0.18)";
      ctx.fillRect(x, WORLD.ground - 130, item.w, 130);
      ctx.restore();
    }

    if (item.type === "platformGlow") {
      const platform = item.platform;
      const glowX = screenX(platform.x);
      ctx.save();
      ctx.globalAlpha = 0.62;
      ctx.fillStyle = "rgba(169, 232, 79, 0.12)";
      ctx.fillRect(glowX - 12, platform.y - 18, platform.w + 24, WORLD.ground - platform.y + 18);
      ctx.strokeStyle = "rgba(169, 232, 79, 0.45)";
      ctx.lineWidth = 2;
      ctx.strokeRect(glowX - 12, platform.y - 18, platform.w + 24, WORLD.ground - platform.y + 18);
      ctx.restore();
    }
  }
}

function drawHazards() {
  for (const hazard of state.level.hazards) {
    const x = screenX(hazard.x);
    if (x > WORLD.width || x + hazard.w < 0) continue;

    if (hazard.type === "spike") {
      ctx.fillStyle = "#ff4d5e";
      ctx.beginPath();
      ctx.moveTo(x, hazard.y);
      ctx.lineTo(x + hazard.w / 2, hazard.y - hazard.h);
      ctx.lineTo(x + hazard.w, hazard.y);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#ffd247";
      ctx.lineWidth = 4;
      ctx.stroke();
    }

    if (hazard.type === "saw") {
      const cx = x + hazard.r;
      const cy = hazard.y + hazard.r;
      const teeth = 14;

      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(state.pulse * 5);
      ctx.fillStyle = "#ff4d5e";
      ctx.beginPath();
      for (let i = 0; i < teeth * 2; i += 1) {
        const radius = i % 2 === 0 ? hazard.r : hazard.r * 0.72;
        const angle = (i / (teeth * 2)) * Math.PI * 2;
        const px = Math.cos(angle) * radius;
        const py = Math.sin(angle) * radius;
        if (i === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#ffd247";
      ctx.beginPath();
      ctx.arc(0, 0, hazard.r * 0.38, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#15191b";
      ctx.lineWidth = 4;
      ctx.stroke();
      ctx.restore();
    }

    if (hazard.type === "block") {
      const isCeiling = hazard.role === "ceiling";
      ctx.fillStyle = isCeiling ? "#364146" : "#ff4d5e";
      ctx.fillRect(x, hazard.y, hazard.w, hazard.h);
      ctx.fillStyle = isCeiling ? "rgba(18, 200, 216, 0.85)" : "rgba(255, 210, 71, 0.9)";
      ctx.fillRect(x + 8, isCeiling ? hazard.y + hazard.h - 14 : hazard.y + 8, hazard.w - 16, 8);
      if (isCeiling) {
        ctx.fillStyle = "#ff4d5e";
        for (let toothX = x + 10; toothX < x + hazard.w - 8; toothX += 22) {
          ctx.beginPath();
          ctx.moveTo(toothX, hazard.y + hazard.h);
          ctx.lineTo(toothX + 10, hazard.y + hazard.h + 18);
          ctx.lineTo(toothX + 20, hazard.y + hazard.h);
          ctx.closePath();
          ctx.fill();
        }
      }
      ctx.strokeStyle = "#15191b";
      ctx.lineWidth = 4;
      ctx.strokeRect(x, hazard.y, hazard.w, hazard.h);
    }
  }
}

function drawPlayer() {
  const x = screenX(player.x) + player.size / 2;
  const y = player.y + player.size / 2;
  const pulse = Math.sin(state.pulse * 10) * 0.08;

  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(player.rotation);
  ctx.fillStyle = "#12c8d8";
  ctx.fillRect(-player.size / 2, -player.size / 2, player.size, player.size);
  ctx.fillStyle = "#071012";
  ctx.fillRect(-15, -13, 10, 10);
  ctx.fillRect(7, -13, 10, 10);
  ctx.fillStyle = "#a9e84f";
  ctx.fillRect(-16, 11, 32, 6 + pulse * 16);
  ctx.strokeStyle = "#f4f7f8";
  ctx.lineWidth = 4;
  ctx.strokeRect(-player.size / 2, -player.size / 2, player.size, player.size);
  ctx.restore();
}

function drawFinish() {
  const finishX = screenX(state.level.length - 220);
  if (finishX > WORLD.width || finishX < -80) return;

  ctx.fillStyle = "#ffd247";
  ctx.fillRect(finishX, 220, 12, WORLD.ground - 220);
  for (let y = 224; y < WORLD.ground - 24; y += 34) {
    ctx.fillStyle = y % 68 === 0 ? "#f4f7f8" : "#111315";
    ctx.fillRect(finishX + 12, y, 44, 34);
  }
}

function drawMenuPreview() {
  if (state.screen !== "menu") return;
  state.pulse += 0.012;
}

function render() {
  ctx.clearRect(0, 0, WORLD.width, WORLD.height);
  drawBackground();
  drawPlatforms();
  drawScenery();
  drawHazards();
  drawFinish();
  drawPlayer();
  drawMenuPreview();
}

function loop(timestamp) {
  const dt = Math.min(0.033, (timestamp - state.lastTime) / 1000 || 0);
  state.lastTime = timestamp;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

levelList.addEventListener("click", (event) => {
  const card = event.target.closest(".level-card");
  if (!card) return;
  startLevel(Number(card.dataset.levelIndex));
});
retryButton.addEventListener("click", () => startLevel());
menuButton.addEventListener("click", openMenu);
difficultySlider.addEventListener("input", () => {
  state.timingMarginMs = Number(difficultySlider.value);
  state.levelCache.clear();
  const wasPlaying = state.screen === "playing";
  rebuildLevel();
  if (wasPlaying) {
    state.screen = "playing";
    levelSelector.classList.add("hidden");
  }
});

canvas.addEventListener("pointerdown", jump);

window.addEventListener("keydown", (event) => {
  if (event.code === "Space" || event.code === "ArrowUp") {
    event.preventDefault();
    jump();
  }

  if (event.code === "KeyR") {
    startLevel();
  }

  if (event.code === "Escape") {
    openMenu();
  }
});

renderLevelSelector();
rebuildLevel();
requestAnimationFrame(loop);
