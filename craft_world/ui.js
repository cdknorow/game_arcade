/* ============================================
   World Craft — UI Module
   Handles all menu screens, HUD, and overlays
   ============================================ */

// ============================================
// BLOCK COLORS — used for hotbar/palette previews
// (Must match the Developer's block definitions)
// ============================================
const BLOCK_COLORS = {
  dirt:         { top: '#8B6914', main: '#6B4F12', detail: '#5A4210' },
  stone:        { top: '#888',    main: '#777',    detail: '#666'    },
  sand:         { top: '#f0d87a', main: '#d4b85a', detail: '#c4a84a' },
  wood:         { top: '#a06030', main: '#8B5220', detail: '#6B4010' },
  leaves:       { top: '#3a9e3a', main: '#2d8a2d', detail: '#207020' },
  moon_rock:    { top: '#b0bec5', main: '#90a4ae', detail: '#78909c' },
  sun_brick:    { top: '#ffd54f', main: '#f5c542', detail: '#c49b30' },
  haunted_stone:{ top: '#7e57c2', main: '#5e35a1', detail: '#4a2890' },
  cobweb:       { top: '#e0e0e0', main: '#ccc',    detail: '#bbb'    },
  glass:        { top: '#b3e5fc', main: '#81d4fa', detail: '#4fc3f7' },
};

// ============================================
// CHARACTER DATA
// ============================================
const CHARACTERS = [
  {
    id: 'luna',
    name: 'Luna',
    perk: 'Jumps 10% higher',
    desc: 'Moon explorer',
    color: '#4fc3f7',
    bodyColor: '#e0e0e0',
    helmetColor: '#4fc3f7',
    visorColor: '#1565c0',
  },
  {
    id: 'sol',
    name: 'Sol',
    perk: 'Mines 20% faster',
    desc: 'Sun-powered',
    color: '#ffb74d',
    bodyColor: '#ff7043',
    helmetColor: '#ffb74d',
    visorColor: '#e65100',
  },
  {
    id: 'shade',
    name: 'Shade',
    perk: '-1 mob damage',
    desc: 'Shadow walker',
    color: '#7e57c2',
    bodyColor: '#333',
    helmetColor: '#7e57c2',
    visorColor: '#e040fb',
  },
  {
    id: 'chip',
    name: 'Chip',
    perk: 'Moves 10% faster',
    desc: 'Rocket boots',
    color: '#66bb6a',
    bodyColor: '#90a4ae',
    helmetColor: '#66bb6a',
    visorColor: '#00e676',
  },
];

// ============================================
// WORLD DATA
// ============================================
const WORLDS = [
  {
    id: 'tropical_moon',
    name: 'Tropical Moon',
    icon: '\u{1F334}\u{1F319}',
    desc: 'An alien moon with palm trees, craters, and rivers under a starry sky. Lower gravity!',
    available: true,
    themeColor: '#80deea',
  },
  {
    id: 'tropical_sun',
    name: 'Tropical Sun',
    icon: '\u{2600}\u{FE0F}\u{1F334}',
    desc: 'Bright beach paradise with dense jungle and golden temples.',
    available: false,
    themeColor: '#ffb74d',
  },
  {
    id: 'haunted_mansion',
    name: 'Haunted Mansion',
    icon: '\u{1F47B}\u{1F3DA}\u{FE0F}',
    desc: 'Spooky dark mansion with creaky floors, cobwebs, and ghosts.',
    available: false,
    themeColor: '#ce93d8',
  },
];

// ============================================
// UI STATE
// ============================================
const UIState = {
  currentScreen: null,
  selectedCharacter: null,
  selectedWorld: null,
  selectedMode: 'survival',
  hudVisible: false,
  pauseOpen: false,
};

// ============================================
// CALLBACKS — set by the game engine
// ============================================
const UICallbacks = {
  onPlay: null,            // title screen -> character select
  onCharacterSelect: null, // character chosen -> world select
  onWorldSelect: null,     // world chosen -> start game
  onResume: null,          // pause menu -> resume game
  onSwitchMode: null,      // pause menu -> switch creative/survival
  onQuitToMenu: null,      // pause menu -> back to title
  onRespawn: null,         // death screen -> respawn
};

// ============================================
// INITIALIZATION
// Build all the HTML structure for screens
// ============================================
function initUI() {
  const container = document.getElementById('game-container');
  if (!container) {
    console.error('UI: #game-container not found!');
    return;
  }

  // Build all screens
  container.insertAdjacentHTML('beforeend', buildTitleScreenHTML());
  container.insertAdjacentHTML('beforeend', buildCharacterScreenHTML());
  container.insertAdjacentHTML('beforeend', buildWorldScreenHTML());
  container.insertAdjacentHTML('beforeend', buildHUDHTML());
  container.insertAdjacentHTML('beforeend', buildPauseScreenHTML());
  container.insertAdjacentHTML('beforeend', buildDeathScreenHTML());
  container.insertAdjacentHTML('beforeend', buildPhysicsStatsHTML());
  container.insertAdjacentHTML('beforeend', '<div id="damage-flash" class="damage-flash"></div>');
  container.insertAdjacentHTML('beforeend', buildBlockPaletteHTML());

  // Bind events
  bindTitleEvents();
  bindCharacterEvents();
  bindWorldEvents();
  bindPauseEvents();
  bindDeathEvents();
  bindHotbarEvents();

  // Draw character sprites on small canvases
  drawAllCharacterSprites();

  console.log('UI initialized!');
}

// ============================================
// SCREEN MANAGEMENT
// ============================================
function showScreen(screenId) {
  // Hide all screens
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.remove('active', 'fade-in');
  });
  // Show the requested one
  if (screenId) {
    const screen = document.getElementById(screenId);
    if (screen) {
      screen.classList.add('active', 'fade-in');
      UIState.currentScreen = screenId;
    }
  } else {
    UIState.currentScreen = null;
  }
}

function hideAllScreens() {
  document.querySelectorAll('.screen').forEach(s => {
    s.classList.remove('active', 'fade-in');
  });
  UIState.currentScreen = null;
}

// ============================================
// TITLE SCREEN
// ============================================
function buildTitleScreenHTML() {
  return `
    <div id="title-screen" class="screen active">
      <div class="title-content">
        <h1 class="game-title">World<br>Craft</h1>
        <p class="game-subtitle">A 2D Sandbox Adventure</p>
        <button id="btn-play" class="btn btn-gold">Play</button>
      </div>
    </div>
  `;
}

function bindTitleEvents() {
  document.getElementById('btn-play').addEventListener('click', () => {
    if (UICallbacks.onPlay) UICallbacks.onPlay();
    showScreen('character-screen');
  });
}

function showTitleScreen() {
  showScreen('title-screen');
  hideHUD();
}

// ============================================
// CHARACTER SELECT SCREEN
// ============================================
function buildCharacterScreenHTML() {
  let cards = CHARACTERS.map((c, i) => `
    <div class="character-card" data-index="${i}" data-id="${c.id}">
      <canvas class="character-sprite" id="sprite-${c.id}" width="48" height="80"></canvas>
      <div class="character-name" style="color: ${c.color}">${c.name}</div>
      <div class="character-perk">${c.perk}</div>
    </div>
  `).join('');

  return `
    <div id="character-screen" class="screen">
      <h2 class="screen-heading">Choose Your Explorer</h2>
      <div class="character-grid">${cards}</div>
      <button id="btn-start-char" class="btn btn-gold" disabled>Select a Character</button>
    </div>
  `;
}

function bindCharacterEvents() {
  const cards = document.querySelectorAll('.character-card');
  const startBtn = document.getElementById('btn-start-char');

  cards.forEach(card => {
    card.addEventListener('click', () => {
      // Deselect all
      cards.forEach(c => c.classList.remove('selected'));
      // Select this one
      card.classList.add('selected');
      UIState.selectedCharacter = CHARACTERS[parseInt(card.dataset.index)];
      startBtn.disabled = false;
      startBtn.textContent = `Play as ${UIState.selectedCharacter.name}`;
    });
  });

  startBtn.addEventListener('click', () => {
    if (!UIState.selectedCharacter) return;
    if (UICallbacks.onCharacterSelect) UICallbacks.onCharacterSelect(UIState.selectedCharacter);
    showScreen('world-screen');
  });
}

function showCharacterSelect() {
  showScreen('character-screen');
}

// ============================================
// DRAW CHARACTER SPRITES (pixel art on canvas)
// ============================================
function drawAllCharacterSprites() {
  CHARACTERS.forEach(c => drawCharacterSprite(c));
}

function drawCharacterSprite(char) {
  const canvas = document.getElementById(`sprite-${char.id}`);
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const s = 4; // pixel scale

  ctx.imageSmoothingEnabled = false;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Simple pixel character: head (with helmet), body, legs
  // Head/helmet — 8x8 px area at scale
  ctx.fillStyle = char.helmetColor;
  ctx.fillRect(2*s, 0*s, 8*s, 8*s);

  // Visor / face
  ctx.fillStyle = char.visorColor;
  ctx.fillRect(3*s, 3*s, 6*s, 3*s);

  // Eyes
  ctx.fillStyle = '#fff';
  ctx.fillRect(4*s, 4*s, 1*s, 1*s);
  ctx.fillRect(7*s, 4*s, 1*s, 1*s);

  // Body
  ctx.fillStyle = char.bodyColor;
  ctx.fillRect(3*s, 8*s, 6*s, 6*s);

  // Arms
  ctx.fillStyle = char.bodyColor;
  ctx.fillRect(1*s, 9*s, 2*s, 4*s);
  ctx.fillRect(9*s, 9*s, 2*s, 4*s);

  // Legs
  ctx.fillStyle = char.id === 'chip' ? '#546e7a' : '#4a4a4a';
  ctx.fillRect(3*s, 14*s, 2*s, 5*s);
  ctx.fillRect(7*s, 14*s, 2*s, 5*s);

  // Chip gets an antenna
  if (char.id === 'chip') {
    ctx.fillStyle = '#66bb6a';
    ctx.fillRect(5*s, -2*s, 2*s, 2*s);
    ctx.fillStyle = '#00e676';
    ctx.fillRect(5.5*s, -3*s, 1*s, 1*s);
  }

  // Shade gets glowing eyes
  if (char.id === 'shade') {
    ctx.fillStyle = '#e040fb';
    ctx.fillRect(4*s, 4*s, 1*s, 1*s);
    ctx.fillRect(7*s, 4*s, 1*s, 1*s);
  }
}

// ============================================
// WORLD SELECT SCREEN
// ============================================
function buildWorldScreenHTML() {
  let cards = WORLDS.map((w, i) => {
    let disabledClass = w.available ? '' : 'disabled';
    let badge = w.available ? '' : '<div class="coming-soon-badge">Coming Soon</div>';
    return `
      <div class="world-card ${disabledClass}" data-index="${i}" data-id="${w.id}">
        <span class="world-icon">${w.icon}</span>
        <div class="world-name" style="color: ${w.themeColor}">${w.name}</div>
        <div class="world-desc">${w.desc}</div>
        ${badge}
      </div>
    `;
  }).join('');

  return `
    <div id="world-screen" class="screen">
      <h2 class="screen-heading">Choose Your World</h2>
      <div class="world-grid">${cards}</div>
      <div class="mode-select">
        <button class="mode-btn selected" data-mode="survival">Survival</button>
        <button class="mode-btn" data-mode="creative">Creative</button>
      </div>
      <button id="btn-start-world" class="btn btn-gold" disabled>Select a World</button>
    </div>
  `;
}

function bindWorldEvents() {
  const cards = document.querySelectorAll('.world-card');
  const startBtn = document.getElementById('btn-start-world');
  const modeBtns = document.querySelectorAll('.mode-btn');

  cards.forEach(card => {
    card.addEventListener('click', () => {
      const world = WORLDS[parseInt(card.dataset.index)];
      if (!world.available) return;

      cards.forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      UIState.selectedWorld = world;
      startBtn.disabled = false;
      startBtn.textContent = `Explore ${world.name}`;
    });
  });

  modeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      modeBtns.forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      UIState.selectedMode = btn.dataset.mode;
    });
  });

  startBtn.addEventListener('click', () => {
    if (!UIState.selectedWorld) return;
    if (UICallbacks.onWorldSelect) {
      UICallbacks.onWorldSelect(UIState.selectedWorld, UIState.selectedMode, UIState.selectedCharacter);
    }
    hideAllScreens();
    showHUD();
  });
}

function showWorldSelect() {
  showScreen('world-screen');
}

// ============================================
// GAME HUD
// ============================================
function buildHUDHTML() {
  // Hearts
  let hearts = '';
  for (let i = 0; i < 10; i++) {
    hearts += `
      <div class="heart-pixel full" data-index="${i}">
        <svg viewBox="0 0 24 24">
          <path class="heart-fill" d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5
            2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09
            C13.09 3.81 14.76 3 16.5 3
            19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        </svg>
      </div>
    `;
  }

  // Hotbar slots
  let hotbar = '';
  for (let i = 0; i < 8; i++) {
    hotbar += `
      <div class="hotbar-slot" data-slot="${i}">
        <span class="slot-number">${i + 1}</span>
        <div class="block-preview"></div>
        <span class="stack-count"></span>
      </div>
    `;
  }

  return `
    <div id="game-hud">
      <div class="hud-hearts">${hearts}</div>
      <div class="hud-indicators">
        <div class="hud-indicator survival" id="hud-mode">Survival</div>
        <div class="hud-indicator front-layer" id="hud-layer">Front Layer</div>
      </div>
      <div class="hud-hotbar">${hotbar}</div>
    </div>
  `;
}

function bindHotbarEvents() {
  document.querySelectorAll('.hotbar-slot').forEach(slot => {
    slot.addEventListener('click', () => {
      const index = parseInt(slot.dataset.slot);
      selectHotbarSlot(index);
    });
  });
}

function showHUD() {
  const hud = document.getElementById('game-hud');
  if (hud) hud.classList.add('active');
  UIState.hudVisible = true;
}

function hideHUD() {
  const hud = document.getElementById('game-hud');
  if (hud) hud.classList.remove('active');
  UIState.hudVisible = false;
}

// Update hearts display based on current health
function updateHearts(currentHealth, maxHealth = 10) {
  const hearts = document.querySelectorAll('.heart-pixel');
  hearts.forEach((heart, i) => {
    if (i < currentHealth) {
      heart.classList.add('full');
      heart.classList.remove('empty');
    } else {
      heart.classList.remove('full');
      heart.classList.add('empty');
    }
  });
}

// Flash hearts when taking damage
function flashDamage() {
  const flash = document.getElementById('damage-flash');
  if (flash) {
    flash.classList.remove('active');
    // Force reflow to restart animation
    void flash.offsetWidth;
    flash.classList.add('active');
    setTimeout(() => flash.classList.remove('active'), 300);
  }
}

// Select a hotbar slot (highlight it)
function selectHotbarSlot(index) {
  document.querySelectorAll('.hotbar-slot').forEach((slot, i) => {
    slot.classList.toggle('selected', i === index);
  });
}

// Update a hotbar slot's appearance
function updateHotbarSlot(index, blockType, count) {
  const slot = document.querySelectorAll('.hotbar-slot')[index];
  if (!slot) return;

  const preview = slot.querySelector('.block-preview');
  const countEl = slot.querySelector('.stack-count');

  if (blockType && BLOCK_COLORS[blockType]) {
    preview.style.backgroundColor = BLOCK_COLORS[blockType].main;
    preview.style.borderTop = `3px solid ${BLOCK_COLORS[blockType].top}`;
    preview.style.borderBottom = `3px solid ${BLOCK_COLORS[blockType].detail}`;
    countEl.textContent = count > 1 ? count : '';
  } else {
    preview.style.backgroundColor = 'transparent';
    preview.style.borderTop = 'none';
    preview.style.borderBottom = 'none';
    countEl.textContent = '';
  }
}

// Update mode indicator
function updateModeIndicator(mode) {
  const el = document.getElementById('hud-mode');
  if (!el) return;
  el.textContent = mode === 'creative' ? 'Creative' : 'Survival';
  el.className = `hud-indicator ${mode}`;
}

// Update layer indicator
function updateLayerIndicator(layer) {
  const el = document.getElementById('hud-layer');
  if (!el) return;
  el.textContent = layer === 'front' ? 'Front Layer' : 'Back Layer';
  el.className = `hud-indicator ${layer}-layer`;
}

// ============================================
// PAUSE MENU
// ============================================
function buildPauseScreenHTML() {
  return `
    <div id="pause-screen" class="screen">
      <div class="pause-menu">
        <h2 class="pause-title">Paused</h2>
        <div class="pause-buttons">
          <button id="btn-resume" class="btn">Resume</button>
          <button id="btn-switch-mode" class="btn btn-accent">Switch Mode</button>
          <button id="btn-quit-menu" class="btn btn-small">Quit to Menu</button>
        </div>
      </div>
    </div>
  `;
}

function bindPauseEvents() {
  document.getElementById('btn-resume').addEventListener('click', () => {
    hidePauseMenu();
    if (UICallbacks.onResume) UICallbacks.onResume();
  });

  document.getElementById('btn-switch-mode').addEventListener('click', () => {
    if (UICallbacks.onSwitchMode) UICallbacks.onSwitchMode();
  });

  document.getElementById('btn-quit-menu').addEventListener('click', () => {
    hidePauseMenu();
    hideHUD();
    if (UICallbacks.onQuitToMenu) UICallbacks.onQuitToMenu();
    showTitleScreen();
  });
}

function showPauseMenu() {
  showScreen('pause-screen');
  UIState.pauseOpen = true;
}

function hidePauseMenu() {
  const screen = document.getElementById('pause-screen');
  if (screen) screen.classList.remove('active', 'fade-in');
  UIState.pauseOpen = false;
  UIState.currentScreen = null;
}

function togglePauseMenu() {
  if (UIState.pauseOpen) {
    hidePauseMenu();
    if (UICallbacks.onResume) UICallbacks.onResume();
  } else {
    showPauseMenu();
  }
}

// ============================================
// DEATH SCREEN
// ============================================
function buildDeathScreenHTML() {
  return `
    <div id="death-screen" class="screen">
      <div class="death-content">
        <h2 class="death-title">You Were Defeated!</h2>
        <p class="death-message">Don't worry — every great explorer<br>gets knocked down sometimes!</p>
        <button id="btn-respawn" class="btn btn-gold">Try Again</button>
      </div>
    </div>
  `;
}

function bindDeathEvents() {
  document.getElementById('btn-respawn').addEventListener('click', () => {
    hideDeathScreen();
    if (UICallbacks.onRespawn) UICallbacks.onRespawn();
  });
}

function showDeathScreen() {
  showScreen('death-screen');
}

function hideDeathScreen() {
  const screen = document.getElementById('death-screen');
  if (screen) screen.classList.remove('active', 'fade-in');
  UIState.currentScreen = null;
}

// ============================================
// PHYSICS STATS OVERLAY (Science Fair!)
// ============================================
function buildPhysicsStatsHTML() {
  return `
    <div id="physics-stats">
      <div><span class="stat-label">Gravity: </span><span id="stat-gravity">0</span> px/f\u00B2</div>
      <div><span class="stat-label">Velocity X: </span><span id="stat-vx">0</span> px/f</div>
      <div><span class="stat-label">Velocity Y: </span><span id="stat-vy">0</span> px/f</div>
      <div><span class="stat-label">Position: </span>(<span id="stat-px">0</span>, <span id="stat-py">0</span>)</div>
      <div><span class="stat-label">FPS: </span><span id="stat-fps">0</span></div>
    </div>
  `;
}

function updatePhysicsStats(stats) {
  const setEl = (id, val) => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };
  if (stats.gravity !== undefined)  setEl('stat-gravity', stats.gravity.toFixed(3));
  if (stats.vx !== undefined)       setEl('stat-vx', stats.vx.toFixed(2));
  if (stats.vy !== undefined)       setEl('stat-vy', stats.vy.toFixed(2));
  if (stats.px !== undefined)       setEl('stat-px', Math.floor(stats.px));
  if (stats.py !== undefined)       setEl('stat-py', Math.floor(stats.py));
  if (stats.fps !== undefined)      setEl('stat-fps', Math.round(stats.fps));
}

function togglePhysicsStats() {
  const el = document.getElementById('physics-stats');
  if (el) el.classList.toggle('active');
}

function showPhysicsStats() {
  const el = document.getElementById('physics-stats');
  if (el) el.classList.add('active');
}

function hidePhysicsStats() {
  const el = document.getElementById('physics-stats');
  if (el) el.classList.remove('active');
}

// ============================================
// BLOCK PALETTE (Creative Mode)
// ============================================
function buildBlockPaletteHTML() {
  let blocks = Object.keys(BLOCK_COLORS).map(type => `
    <div class="palette-block" data-block="${type}"
         style="background: ${BLOCK_COLORS[type].main};
                border-top: 3px solid ${BLOCK_COLORS[type].top};
                border-bottom: 3px solid ${BLOCK_COLORS[type].detail};">
      <span class="block-name-tooltip">${type.replace('_', ' ')}</span>
    </div>
  `).join('');

  return `
    <div id="block-palette">${blocks}</div>
  `;
}

function showBlockPalette() {
  const el = document.getElementById('block-palette');
  if (el) el.classList.add('active');
}

function hideBlockPalette() {
  const el = document.getElementById('block-palette');
  if (el) el.classList.remove('active');
}

// ============================================
// PUBLIC API — export for game engine
// ============================================
// These are the functions the Developer's game
// engine will call to control the UI.
// ============================================
window.GameUI = {
  // Init
  init: initUI,

  // Screen navigation
  showTitleScreen,
  showCharacterSelect,
  showWorldSelect,
  hideAllScreens,

  // HUD
  showHUD,
  hideHUD,
  updateHearts,
  flashDamage,
  selectHotbarSlot,
  updateHotbarSlot,
  updateModeIndicator,
  updateLayerIndicator,

  // Pause
  showPauseMenu,
  hidePauseMenu,
  togglePauseMenu,

  // Death
  showDeathScreen,
  hideDeathScreen,

  // Physics stats
  updatePhysicsStats,
  togglePhysicsStats,
  showPhysicsStats,
  hidePhysicsStats,

  // Block palette (creative)
  showBlockPalette,
  hideBlockPalette,

  // State & callbacks (for game engine to set)
  state: UIState,
  callbacks: UICallbacks,

  // Data (for game engine to read)
  CHARACTERS,
  WORLDS,
  BLOCK_COLORS,
};
