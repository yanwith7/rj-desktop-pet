const PET_INDEX = 'pets/index.json';
const SETTINGS_KEY = 'rj-desktop-pet-settings-v3';
const DEFAULT_PET_WIDTH = 126;
const HEALTH_DECAY_MS = 3 * 60 * 1000;
const ACTION_HEALTH_COST = 2;
const MAX_BUBBLE_LINES = 7;
const MAX_BUBBLE_LINE_LENGTH = 14;
const HEAD_BOTTOM = 132;
const HEAD_PIVOT_Y = 122;

const canvas = document.querySelector('#pet-canvas');
const ctx = canvas.getContext('2d');
const menu = document.querySelector('#pet-menu');
const stage = document.querySelector('#pet-stage');
const shell = document.querySelector('#pet-shell');
const bubble = document.querySelector('#status-bubble');
const bubbleText = document.querySelector('#bubble-text');
const bubbleEditor = document.querySelector('#bubble-editor');
const bubbleInput = document.querySelector('#bubble-input');
const bubbleCount = document.querySelector('#bubble-count');
const healthWrap = document.querySelector('#health-wrap');
const healthFill = document.querySelector('#health-fill');
const sizeRange = document.querySelector('#size-range');
const healthToggle = document.querySelector('#health-toggle');
const bubbleToggle = document.querySelector('#bubble-toggle');
const autoStartToggle = document.querySelector('#autostart-toggle');

const defaults = {
  petWidth: DEFAULT_PET_WIDTH,
  bubbleVisible: true,
  bubbleText: '主人，今天也请加油吧！',
  healthVisible: true,
  health: 100,
  lastHealthAt: Date.now()
};

let settings = loadSettings();
let pet;
let spriteSheet;
let frame = 0;
let lastFrameAt = 0;
let menuTimer;
let movementTimer;
let pettingUntil = 0;
let pettingStartedAt = 0;
let yahouUntil = 0;
let yahouStartedAt = 0;
let pointer = null;
let activeState = 'idle';
let menuOpen = false;
let editorOpen = false;
let regularShellSize = { width: 286, height: 220 };
const yahouAudio = new Audio('../assets/audio/yahou.m4a');
yahouAudio.preload = 'auto';
yahouAudio.volume = 0.9;

function loadSettings() {
  try {
    const saved = { ...defaults, ...JSON.parse(localStorage.getItem(SETTINGS_KEY)) };
    // Correct the previous preview's missing backslash while preserving every
    // intentionally customised bubble message.
    if (saved.bubbleText === '主人加油 ^_^') saved.bubbleText = defaults.bubbleText;
    return saved;
  } catch (_) {
    return { ...defaults };
  }
}

function persistSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function normalizeBubbleText(value) {
  const lines = [];
  const sourceLines = String(value ?? '').replace(/\r\n/g, '\n').split('\n');
  for (const sourceLine of sourceLines) {
    const characters = Array.from(sourceLine);
    if (characters.length === 0) {
      lines.push('');
    } else {
      for (let start = 0; start < characters.length; start += MAX_BUBBLE_LINE_LENGTH) {
        lines.push(characters.slice(start, start + MAX_BUBBLE_LINE_LENGTH).join(''));
      }
    }
    if (lines.length >= MAX_BUBBLE_LINES) break;
  }
  return lines.slice(0, MAX_BUBBLE_LINES).join('\n');
}

function bubbleMetrics(text) {
  const sourceLines = normalizeBubbleText(text).split('\n');
  const compact = sourceLines.length <= 2;
  if (compact) {
    return {
      compact: true,
      width: 232,
      height: 106 + sourceLines.length * 18
    };
  }
  // A fixed, compact width makes longer messages grow downward instead of
  // drifting farther to the right. It still leaves all four safe margins.
  return { compact: false, width: 286, height: 111 + sourceLines.length * 18 };
}

async function loadJson(relativePath) {
  const response = await fetch(relativePath);
  if (!response.ok) throw new Error(`无法读取宠物配置：${relativePath}`);
  return response.json();
}

async function loadPet() {
  const index = await loadJson(PET_INDEX);
  const entry = index.pets.find((item) => item.id === index.defaultPet) || index.pets[0];
  pet = await loadJson(entry.config);
  spriteSheet = new Image();
  spriteSheet.src = `../${pet.spriteSheet}`;
  await new Promise((resolve, reject) => {
    spriteSheet.onload = resolve;
    spriteSheet.onerror = reject;
  });
  canvas.width = pet.cellWidth;
  canvas.height = pet.cellHeight;
  applyHealthDecay();
  applyPreferences();
  initializeAutoStart();
}

async function initializeAutoStart() {
  try {
    autoStartToggle.checked = await window.desktopPet.getAutoStart();
  } catch (_) {
    autoStartToggle.checked = false;
  }
}

function applyLayout() {
  if (!pet) return;
  settings.petWidth = clamp(Number(settings.petWidth) || DEFAULT_PET_WIDTH, 72, 300);
  const petHeight = Math.round(settings.petWidth * pet.cellHeight / pet.cellWidth);
  const bubbleSize = bubbleMetrics(settings.bubbleText || defaults.bubbleText);
  // Both short and long messages share this anchor, so added text grows to
  // the right/downward without visually moving away from RJ.
  const bubbleLeft = Math.max(46, Math.round(settings.petWidth - 19));
  const stageTop = Math.max(64, bubbleSize.height - 60);
  const shellWidth = Math.max(settings.petWidth + 24, bubbleLeft + bubbleSize.width + 8);
  const shellHeight = Math.max(stageTop + petHeight + 20, bubbleSize.height + 10, 202);
  regularShellSize = { width: shellWidth, height: shellHeight };
  document.documentElement.style.setProperty('--pet-width', `${settings.petWidth}px`);
  document.documentElement.style.setProperty('--pet-height', `${petHeight}px`);
  document.documentElement.style.setProperty('--stage-top', `${stageTop}px`);
  document.documentElement.style.setProperty('--bubble-left', `${bubbleLeft}px`);
  document.documentElement.style.setProperty('--bubble-width', `${bubbleSize.width}px`);
  document.documentElement.style.setProperty('--bubble-height', `${bubbleSize.height}px`);
  bubble.classList.toggle('is-compact', bubbleSize.compact);
  sizeRange.value = String(settings.petWidth);
  syncShellSize();
  persistSettings();
}

function syncShellSize() {
  const shellWidth = menuOpen
    ? Math.max(regularShellSize.width, 352)
    : editorOpen ? Math.max(regularShellSize.width, 300) : regularShellSize.width;
  const shellHeight = menuOpen
    ? Math.max(regularShellSize.height, 310)
    : editorOpen ? Math.max(regularShellSize.height, 250) : regularShellSize.height;
  document.documentElement.style.setProperty('--shell-width', `${shellWidth}px`);
  document.documentElement.style.setProperty('--shell-height', `${shellHeight}px`);
  shell.style.width = `${shellWidth}px`;
  shell.style.height = `${shellHeight}px`;
  window.desktopPet.resizeWindow(shellWidth, shellHeight);
}

function applyPreferences() {
  settings.bubbleText = normalizeBubbleText(settings.bubbleText || defaults.bubbleText) || defaults.bubbleText;
  bubbleText.textContent = settings.bubbleText;
  bubble.setAttribute('aria-label', `${settings.bubbleText}，双击修改`);
  bubble.classList.toggle('is-hidden', !settings.bubbleVisible);
  healthWrap.classList.toggle('is-hidden', !settings.healthVisible);
  bubbleToggle.checked = settings.bubbleVisible;
  healthToggle.checked = settings.healthVisible;
  updateHealthUI();
  applyLayout();
}

function updateHealthUI() {
  const health = clamp(Math.round(Number(settings.health) || 0), 0, 100);
  settings.health = health;
  healthFill.style.width = `${health}%`;
  healthWrap.title = `RJ 活力：${health}/100`;
}

function applyHealthDecay() {
  const now = Date.now();
  const last = Number(settings.lastHealthAt) || now;
  const elapsedSteps = Math.floor((now - last) / HEALTH_DECAY_MS);
  if (elapsedSteps > 0) {
    settings.health = clamp((Number(settings.health) || 100) - elapsedSteps, 0, 100);
    settings.lastHealthAt = last + elapsedSteps * HEALTH_DECAY_MS;
    persistSettings();
    updateHealthUI();
  }
}

function changeHealth(amount) {
  applyHealthDecay();
  settings.health = clamp((Number(settings.health) || 0) + amount, 0, 100);
  settings.lastHealthAt = Date.now();
  persistSettings();
  updateHealthUI();
}

function clearSpecialMotion() {
  canvas.classList.remove('is-spinning');
  pettingUntil = 0;
  yahouUntil = 0;
}

function setState(nextState, { costHealth = true } = {}) {
  if (!pet) return;
  if (nextState === 'spinning') {
    activeState = 'idle';
    frame = 0;
    lastFrameAt = 0;
    pettingUntil = 0;
    canvas.classList.add('is-spinning');
  } else {
    if (!pet.states[nextState]) return;
    clearSpecialMotion();
    activeState = nextState;
    frame = 0;
    lastFrameAt = 0;
  }
  if (costHealth) changeHealth(-ACTION_HEALTH_COST);
  hideMenu();
}

function petHead() {
  clearSpecialMotion();
  activeState = 'idle';
  frame = 0;
  lastFrameAt = 0;
  pettingStartedAt = Date.now();
  pettingUntil = pettingStartedAt + 2200;
  changeHealth(10);
}

function clipFacePanel() {
  ctx.beginPath();
  ctx.roundRect(21, 67, 150, 76, 31);
  ctx.clip();
}

function drawBlush() {
  ctx.save();
  clipFacePanel();
  for (const x of [47, 145]) {
    const glow = ctx.createRadialGradient(x, 124, 2, x, 124, 33);
    glow.addColorStop(0, 'rgba(255, 133, 188, 0.84)');
    glow.addColorStop(0.48, 'rgba(255, 117, 181, 0.44)');
    glow.addColorStop(1, 'rgba(255, 117, 181, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x - 36, 91, 72, 58);
    ctx.strokeStyle = 'rgba(255, 210, 230, 0.96)';
    ctx.lineWidth = 4.2;
    ctx.lineCap = 'round';
    for (let i = -1; i <= 1; i += 1) {
      ctx.beginPath();
      ctx.moveTo(x - 7 + i * 7, 119);
      ctx.lineTo(x - 3 + i * 7, 128);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function drawFaceExpression(expression) {
  const eyeCenters = [63, 129];
  ctx.save();
  clipFacePanel();
  // Cover the normal mint eyes with the same near-black face-panel tone.
  // This preserves RJ's plush face while letting each interaction read clearly.
  ctx.fillStyle = '#101114';
  for (const centerX of eyeCenters) ctx.fillRect(centerX - 18, 80, 36, 38);
  ctx.strokeStyle = '#a9e1d4';
  ctx.fillStyle = '#a9e1d4';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  if (expression === 'excited') {
    for (const centerX of eyeCenters) {
      ctx.beginPath();
      ctx.moveTo(centerX - 11, 105);
      ctx.lineTo(centerX, 92);
      ctx.lineTo(centerX + 11, 105);
      ctx.stroke();
    }
  } else if (expression === 'dizzy') {
    for (const centerX of eyeCenters) {
      ctx.beginPath();
      ctx.arc(centerX, 99, 10, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillRect(centerX - 2, 91, 4, 16);
      ctx.fillRect(centerX - 8, 97, 16, 4);
      ctx.fillStyle = '#101114';
      ctx.fillRect(centerX - 2, 97, 4, 4);
      ctx.fillStyle = '#a9e1d4';
    }
  } else if (expression === 'shy') {
    ctx.beginPath();
    ctx.moveTo(52, 89);
    ctx.lineTo(66, 99);
    ctx.lineTo(52, 109);
    ctx.moveTo(140, 89);
    ctx.lineTo(126, 99);
    ctx.lineTo(140, 109);
    ctx.stroke();
  }
  ctx.restore();
}

function drawPettedFrame(sourceX) {
  const elapsed = Date.now() - pettingStartedAt;
  const wobble = Math.sin(elapsed / 85) * 0.052;
  const nod = 5 + Math.sin(elapsed / 165) * 1.4;
  ctx.drawImage(
    spriteSheet,
    sourceX,
    activeStateRow() * pet.cellHeight + HEAD_BOTTOM,
    pet.cellWidth,
    pet.cellHeight - HEAD_BOTTOM,
    0,
    HEAD_BOTTOM,
    pet.cellWidth,
    pet.cellHeight - HEAD_BOTTOM
  );
  ctx.save();
  ctx.translate(pet.cellWidth / 2, HEAD_PIVOT_Y);
  ctx.translate(0, nod);
  ctx.rotate(wobble);
  ctx.translate(-pet.cellWidth / 2, -HEAD_PIVOT_Y);
  ctx.drawImage(
    spriteSheet,
    sourceX,
    activeStateRow() * pet.cellHeight,
    pet.cellWidth,
    HEAD_BOTTOM,
    0,
    0,
    pet.cellWidth,
    HEAD_BOTTOM
  );
  drawBlush();
  drawFaceExpression('shy');
  ctx.restore();
}

function activeStateRow() {
  return pet.states[activeState].row;
}

function drawPixelConfetti(elapsed) {
  const bob = Math.sin(elapsed / 130) * 4;
  const pieces = [
    [8, 26, '#ff79b4', 0], [31, 8, '#ffc550', 1], [58, 31, '#b58be4', 2],
    [133, 13, '#ff79b4', 3], [159, 31, '#62c7c6', 4], [179, 8, '#ffc550', 5]
  ];
  ctx.save();
  for (const [x, y, color, index] of pieces) {
    const flutter = Math.sin(elapsed / 115 + index * 1.7) * 7;
    ctx.fillStyle = color;
    ctx.fillRect(x + flutter, y + bob, 7, 12);
    ctx.fillStyle = '#fff5fb';
    ctx.fillRect(x + flutter + 1, y + bob + 1, 3, 3);
    ctx.fillStyle = color;
    ctx.fillRect(x + flutter + 6, y + bob + 9, 8, 5);
    ctx.fillRect(x + flutter + 11, y + bob + 13, 5, 8);
  }
  ctx.restore();
}

function drawYahouFrame(sourceX) {
  const elapsed = Date.now() - yahouStartedAt;
  const bounce = Math.abs(Math.sin(elapsed / 118)) * -9;
  const wiggle = Math.sin(elapsed / 86) * 0.105;
  const stretch = 1 + Math.abs(Math.sin(elapsed / 118)) * 0.055;
  ctx.save();
  ctx.translate(pet.cellWidth / 2, pet.cellHeight / 2 + bounce);
  ctx.rotate(wiggle);
  ctx.scale(1 / stretch, stretch);
  ctx.translate(-pet.cellWidth / 2, -pet.cellHeight / 2);
  ctx.drawImage(spriteSheet, sourceX, activeStateRow() * pet.cellHeight, pet.cellWidth, pet.cellHeight, 0, 0, pet.cellWidth, pet.cellHeight);
  drawFaceExpression('excited');
  ctx.restore();
  drawPixelConfetti(elapsed);
}

function draw(timestamp) {
  try {
    if (!pet || !spriteSheet.complete) {
      requestAnimationFrame(draw);
      return;
    }
    applyHealthDecay();
    if (yahouUntil && Date.now() >= yahouUntil) {
      yahouUntil = 0;
      activeState = 'idle';
      frame = 0;
      lastFrameAt = 0;
    }
    const state = pet.states[activeState];
    const frameDuration = 1000 / state.fps;
    if (!lastFrameAt) lastFrameAt = timestamp;
    if (timestamp - lastFrameAt >= frameDuration) {
      const steps = Math.floor((timestamp - lastFrameAt) / frameDuration);
      frame += steps;
      lastFrameAt = timestamp;
      if (frame >= state.frames) {
        if (state.loop) frame %= state.frames;
        else {
          frame = state.frames - 1;
          activeState = 'idle';
        }
      }
    }
    const sourceX = frame * pet.cellWidth;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (Date.now() < yahouUntil) {
      drawYahouFrame(sourceX);
    } else if (Date.now() < pettingUntil) {
      drawPettedFrame(sourceX);
    } else {
      ctx.drawImage(
        spriteSheet,
        sourceX,
        state.row * pet.cellHeight,
        pet.cellWidth,
        pet.cellHeight,
        0,
        0,
        pet.cellWidth,
        pet.cellHeight
      );
      if (canvas.classList.contains('is-spinning')) drawFaceExpression('dizzy');
    }
    requestAnimationFrame(draw);
  } catch (error) {
    console.error('RJ canvas render failed:', error);
    document.body.innerHTML = `<pre style="padding:16px;color:#8b2436;background:#fff">宠物渲染失败：${error.message}</pre>`;
  }
}

function showMenu() {
  menuOpen = true;
  syncShellSize();
  menu.classList.remove('hidden');
  clearTimeout(menuTimer);
  menuTimer = setTimeout(hideMenu, 11000);
}

function hideMenu() {
  menu.classList.add('hidden');
  clearTimeout(menuTimer);
  if (menuOpen) {
    menuOpen = false;
    syncShellSize();
  }
}

function showBubbleEditor() {
  hideMenu();
  bubbleInput.value = settings.bubbleText;
  updateBubbleCounter();
  editorOpen = true;
  syncShellSize();
  bubbleEditor.classList.remove('is-hidden');
  window.setTimeout(() => bubbleInput.focus(), 0);
}

function hideBubbleEditor() {
  bubbleEditor.classList.add('is-hidden');
  if (editorOpen) {
    editorOpen = false;
    syncShellSize();
  }
}

function updateBubbleCounter() {
  const normalized = normalizeBubbleText(bubbleInput.value);
  if (bubbleInput.value !== normalized) bubbleInput.value = normalized;
  const characters = Array.from(normalized.replace(/\n/g, '')).length;
  const lines = normalized ? normalized.split('\n').length : 1;
  bubbleCount.textContent = `${characters}/98 · ${lines}/7行`;
}

function saveBubbleText() {
  settings.bubbleText = normalizeBubbleText(bubbleInput.value).trim() || defaults.bubbleText;
  persistSettings();
  hideBubbleEditor();
  applyPreferences();
}

function moveRight() {
  setState('running-right');
  changeHealth(-1);
  let steps = 0;
  clearInterval(movementTimer);
  movementTimer = setInterval(() => {
    window.desktopPet.moveWindow(6, 0);
    if (++steps >= 28) {
      clearInterval(movementTimer);
      setState('idle', { costHealth: false });
    }
  }, 55);
}

function moveLeft() {
  setState('running-left');
  changeHealth(-1);
  let steps = 0;
  clearInterval(movementTimer);
  movementTimer = setInterval(() => {
    window.desktopPet.moveWindow(-6, 0);
    if (++steps >= 28) {
      clearInterval(movementTimer);
      setState('idle', { costHealth: false });
    }
  }, 55);
}

function playYahou() {
  clearSpecialMotion();
  // The running row contains alternating poses for both hands and both feet.
  // We keep the window in place and turn it into a four-limb cheer instead.
  activeState = pet.states.running ? 'running' : 'waving';
  frame = 0;
  lastFrameAt = 0;
  yahouStartedAt = Date.now();
  yahouUntil = yahouStartedAt + 4000;
  changeHealth(-3);
  yahouAudio.pause();
  yahouAudio.currentTime = 0;
  yahouAudio.play().catch((error) => console.warn('呀吼音频播放失败：', error));
  hideMenu();
}

function isHeadPoint(event) {
  const rect = canvas.getBoundingClientRect();
  const x = event.clientX - rect.left;
  const y = event.clientY - rect.top;
  return x >= rect.width * 0.12 && x <= rect.width * 0.88 && y >= 0 && y <= rect.height * 0.55;
}

function handlePetTap(event) {
  const rect = canvas.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) return;
  if (isHeadPoint(event)) petHead();
  else setState('waving');
}

stage.addEventListener('pointerdown', (event) => {
  if (event.button !== 0) return;
  pointer = {
    id: event.pointerId,
    startX: event.screenX,
    startY: event.screenY,
    lastX: event.screenX,
    lastY: event.screenY,
    dragging: false
  };
  stage.setPointerCapture(event.pointerId);
});

stage.addEventListener('pointermove', (event) => {
  if (!pointer || pointer.id !== event.pointerId) return;
  const dx = event.screenX - pointer.lastX;
  const dy = event.screenY - pointer.lastY;
  if (Math.abs(event.screenX - pointer.startX) + Math.abs(event.screenY - pointer.startY) > 3) pointer.dragging = true;
  if (pointer.dragging && (dx || dy)) window.desktopPet.moveWindow(dx, dy);
  pointer.lastX = event.screenX;
  pointer.lastY = event.screenY;
});

stage.addEventListener('pointerup', (event) => {
  if (!pointer || pointer.id !== event.pointerId) return;
  const wasDragging = pointer.dragging;
  pointer = null;
  if (!wasDragging) handlePetTap(event);
});

stage.addEventListener('contextmenu', (event) => {
  event.preventDefault();
  showMenu();
});

bubble.addEventListener('dblclick', (event) => {
  event.preventDefault();
  event.stopPropagation();
  showBubbleEditor();
});

document.querySelectorAll('[data-state]').forEach((button) => {
  button.addEventListener('click', () => setState(button.dataset.state));
});
document.querySelector('#close-menu').addEventListener('click', hideMenu);
document.querySelector('#walk-right').addEventListener('click', moveRight);
document.querySelector('#walk-left').addEventListener('click', moveLeft);
document.querySelector('#yahou-sound').addEventListener('click', playYahou);
document.querySelector('#reset-size').addEventListener('click', () => {
  settings.petWidth = DEFAULT_PET_WIDTH;
  applyLayout();
});
sizeRange.addEventListener('input', (event) => {
  settings.petWidth = Number(event.target.value);
  applyLayout();
});
document.querySelector('#hide-pet').addEventListener('click', () => window.desktopPet.hide());
document.querySelector('#quit-pet').addEventListener('click', () => window.desktopPet.quit());
function bindEditorButton(element, handler) {
  // Electron's transparent windows can occasionally lose the synthetic click
  // after a drag-region pointer sequence. Handle pointer release as well as
  // normal clicks and keyboard activation so these controls always respond.
  element.addEventListener('pointerup', (event) => {
    event.preventDefault();
    event.stopPropagation();
    handler();
  });
  element.addEventListener('click', handler);
  element.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      handler();
    }
  });
}

bindEditorButton(document.querySelector('#bubble-save'), saveBubbleText);
bindEditorButton(document.querySelector('#bubble-cancel'), hideBubbleEditor);
bubbleInput.addEventListener('input', updateBubbleCounter);
healthToggle.addEventListener('change', (event) => {
  settings.healthVisible = event.target.checked;
  persistSettings();
  applyPreferences();
});
bubbleToggle.addEventListener('change', (event) => {
  settings.bubbleVisible = event.target.checked;
  persistSettings();
  applyPreferences();
});
autoStartToggle.addEventListener('change', async (event) => {
  const enabled = await window.desktopPet.setAutoStart(event.target.checked);
  autoStartToggle.checked = enabled;
});

loadPet()
  .then(() => requestAnimationFrame(draw))
  .catch((error) => {
    document.body.innerHTML = `<pre style="padding:16px;color:#8b2436">${error.message}</pre>`;
    console.error(error);
  });
