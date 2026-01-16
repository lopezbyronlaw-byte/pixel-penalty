/**
 * World Cup 2026: Pixel Penalty
 * A pixel-art penalty shootout mini-game
 */

// ===========================================
// CONSTANTS & CONFIG
// ===========================================

const COLORS = {
  bg: '#1a1c2c',
  field: '#38b764',
  fieldLight: '#4cc673',
  goal: '#f4f4f4',
  goalNet: '#8b9bb4',
  ball: '#f4f4f4',
  ballShadow: '#1a1c2c',
  keeper: '#e43b44',
  keeperDetail: '#1a1c2c',
  post: '#ffcd75',
  line: '#f4f4f4'
};

// Teams with simple 3-stripe flag patterns
const TEAMS = [
  { id: 'usa', name: 'USA', colors: ['#e43b44', '#f4f4f4', '#41a6f6'] },
  { id: 'mex', name: 'Mexico', colors: ['#38b764', '#f4f4f4', '#e43b44'] },
  { id: 'can', name: 'Canada', colors: ['#e43b44', '#f4f4f4', '#e43b44'] },
  { id: 'bra', name: 'Brazil', colors: ['#38b764', '#ffcd75', '#38b764'] },
  { id: 'arg', name: 'Argentina', colors: ['#41a6f6', '#f4f4f4', '#41a6f6'] },
  { id: 'ecu', name: 'Ecuador', colors: ['#ffcd75', '#41a6f6', '#e43b44'] },
  { id: 'ger', name: 'Germany', colors: ['#1a1c2c', '#e43b44', '#ffcd75'] },
  { id: 'fra', name: 'France', colors: ['#41a6f6', '#f4f4f4', '#e43b44'] },
  { id: 'esp', name: 'Spain', colors: ['#e43b44', '#ffcd75', '#e43b44'] },
  { id: 'eng', name: 'England', colors: ['#f4f4f4', '#e43b44', '#f4f4f4'] },
  { id: 'ita', name: 'Italy', colors: ['#38b764', '#f4f4f4', '#e43b44'] },
  { id: 'ned', name: 'Netherlands', colors: ['#e43b44', '#f4f4f4', '#41a6f6'] },
  { id: 'jpn', name: 'Japan', colors: ['#f4f4f4', '#e43b44', '#f4f4f4'] }
];

const GAME_CONFIG = {
  totalShots: 5,
  canvasWidth: 160,    // Low-res for pixel art, scaled up
  canvasHeight: 200,
  ballRadius: 5,
  ballStartX: 80,
  ballStartY: 170,
  goalY: 8,
  goalWidth: 150,      // Much bigger goal! (was 100, then 60 originally)
  goalHeight: 70,      // Much taller goal! (was 35, then 20 originally)
  postWidth: 2,
  keeperWidth: 5,      // 50% skinnier (was 10)
  keeperHeight: 20,    // Taller, more human proportions
  keeperY: 52,         // Adjusted for taller goal
  friction: 0.985,
  minVelocity: 0.1
};

// Difficulty settings (adjusted for MUCH bigger goal)
// Keeper is now skinnier and can't magically reach corner shots
const DIFFICULTY_LEVELS = {
  easy: {
    name: 'Easy',
    keeperSpeed: 0.4,
    keeperReactionTime: 1000,
    keeperDiveChance: 0.2,
    keeperReachMultiplier: 0.5    // Can't reach far corners
  },
  medium: {
    name: 'Medium',
    keeperSpeed: 0.7,
    keeperReactionTime: 700,
    keeperDiveChance: 0.4,
    keeperReachMultiplier: 0.7    // Limited reach
  },
  hard: {
    name: 'Hard',
    keeperSpeed: 1.0,
    keeperReactionTime: 450,
    keeperDiveChance: 0.6,
    keeperReachMultiplier: 0.9    // Still can't reach extreme corners
  }
};

// ===========================================
// STATE
// ===========================================

const state = {
  screen: 'select', // select | game | results
  selectedTeam: null,
  difficulty: 'medium',
  shotsRemaining: GAME_CONFIG.totalShots,
  goals: 0,
  saves: 0,
  misses: 0,
  streak: 0,
  maxStreak: 0,

  // Game state
  ball: {
    x: GAME_CONFIG.ballStartX,
    y: GAME_CONFIG.ballStartY,
    vx: 0,
    vy: 0,
    spin: 0, // -1 to 1 (left to right curve)
    isMoving: false
  },
  keeper: {
    x: GAME_CONFIG.canvasWidth / 2 - GAME_CONFIG.keeperWidth / 2,
    direction: 1,
    speed: 0.8,
    state: 'idle', // 'idle' | 'diving-left' | 'diving-right' | 'diving'
    diveProgress: 0,
    targetX: 0,
    reactionTimer: 0
  },
  aim: 0,       // -45 to 45 degrees
  power: 70,    // 30 to 100
  curve: 0,     // -100 to 100 (left to right)
  shotResult: null,  // 'goal' | 'save' | 'miss' | null
  showingResult: false,

  // Visual effects
  particles: [],
  crowdCheer: 0,

  // Statistics
  stats: {
    totalShots: 0,
    totalGoals: 0,
    totalSaves: 0,
    totalMisses: 0,
    bestStreak: 0,
    gamesPlayed: 0,
    perfectGames: 0
  }
};

// ===========================================
// AUDIO (Web Audio API)
// ===========================================

let audioCtx = null;

function initAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }
}

function playSound(type) {
  if (!audioCtx) return;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.connect(gain);
  gain.connect(audioCtx.destination);

  const now = audioCtx.currentTime;

  switch (type) {
    case 'kick':
      osc.frequency.setValueAtTime(150, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);
      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
      break;

    case 'goal':
      osc.type = 'square';
      osc.frequency.setValueAtTime(440, now);
      osc.frequency.setValueAtTime(554, now + 0.1);
      osc.frequency.setValueAtTime(659, now + 0.2);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.4);
      osc.start(now);
      osc.stop(now + 0.4);
      break;

    case 'save':
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(100, now + 0.15);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.15);
      osc.start(now);
      osc.stop(now + 0.15);
      break;

    case 'miss':
      osc.type = 'sine';
      osc.frequency.setValueAtTime(300, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.2);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);
      osc.start(now);
      osc.stop(now + 0.2);
      break;

    case 'select':
      osc.type = 'square';
      osc.frequency.setValueAtTime(880, now);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
      break;

    case 'dive':
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(200, now);
      osc.frequency.exponentialRampToValueAtTime(150, now + 0.1);
      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
      break;

    case 'crowd':
      osc.type = 'sine';
      osc.frequency.setValueAtTime(100, now);
      osc.frequency.setValueAtTime(150, now + 0.2);
      osc.frequency.setValueAtTime(200, now + 0.4);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.6);
      osc.start(now);
      osc.stop(now + 0.6);
      break;
  }
}

// ===========================================
// DOM ELEMENTS
// ===========================================

const elements = {
  screens: {
    select: document.getElementById('screen-select'),
    game: document.getElementById('screen-game'),
    results: document.getElementById('screen-results')
  },
  playerName: document.getElementById('player-name'),
  difficultyButtons: document.getElementById('difficulty-buttons'),
  teamGrid: document.getElementById('team-grid'),
  btnStart: document.getElementById('btn-start'),
  gameFlag: document.getElementById('game-flag'),
  gameTeamName: document.getElementById('game-team-name'),
  playerNameDisplay: document.getElementById('player-name-display'),
  shotsRemaining: document.getElementById('shots-remaining'),
  goalsScored: document.getElementById('goals-scored'),
  currentStreak: document.getElementById('current-streak'),
  canvas: document.getElementById('game-canvas'),
  aimSlider: document.getElementById('aim-slider'),
  powerSlider: document.getElementById('power-slider'),
  powerValue: document.getElementById('power-value'),
  curveSlider: document.getElementById('curve-slider'),
  curveValue: document.getElementById('curve-value'),
  btnShoot: document.getElementById('btn-shoot'),
  btnReset: document.getElementById('btn-reset'),
  resultsFlag: document.getElementById('results-flag'),
  resultsTeamName: document.getElementById('results-team-name'),
  resultsTitle: document.getElementById('results-title'),
  finalGoals: document.getElementById('final-goals'),
  breakdownGoals: document.getElementById('breakdown-goals'),
  breakdownSaves: document.getElementById('breakdown-saves'),
  breakdownMisses: document.getElementById('breakdown-misses'),
  resultsMessage: document.getElementById('results-message'),
  btnPlayAgain: document.getElementById('btn-play-again')
};

const ctx = elements.canvas.getContext('2d');

// ===========================================
// UTILITY FUNCTIONS
// ===========================================

function createPixelFlag(team, isLarge = false) {
  const canvas = document.createElement('canvas');
  const size = isLarge ? { w: 48, h: 32 } : { w: 24, h: 16 };
  canvas.width = size.w;
  canvas.height = size.h;
  const flagCtx = canvas.getContext('2d');

  // Draw 3 vertical stripes
  const stripeWidth = size.w / 3;
  team.colors.forEach((color, i) => {
    flagCtx.fillStyle = color;
    flagCtx.fillRect(i * stripeWidth, 0, stripeWidth, size.h);
  });

  // Add a subtle border
  flagCtx.strokeStyle = '#1a1c2c';
  flagCtx.lineWidth = 1;
  flagCtx.strokeRect(0, 0, size.w, size.h);

  return canvas.toDataURL();
}

function setFlagImage(element, team, isLarge = false) {
  element.style.backgroundImage = `url(${createPixelFlag(team, isLarge)})`;
  element.style.backgroundSize = 'cover';
  element.style.imageRendering = 'pixelated';
}

function switchScreen(screenName) {
  state.screen = screenName;
  Object.values(elements.screens).forEach(screen => {
    screen.classList.remove('active');
  });
  elements.screens[screenName].classList.add('active');
}

// ===========================================
// TEAM SELECTION
// ===========================================

function initTeamSelection() {
  elements.teamGrid.innerHTML = '';

  TEAMS.forEach(team => {
    const btn = document.createElement('button');
    btn.className = 'team-btn';
    btn.setAttribute('role', 'radio');
    btn.setAttribute('aria-checked', 'false');
    btn.setAttribute('aria-label', `Select ${team.name}`);
    btn.dataset.teamId = team.id;

    const flag = document.createElement('span');
    flag.className = 'pixel-flag';
    setFlagImage(flag, team);

    const name = document.createElement('span');
    name.className = 'team-name';
    name.textContent = team.name;

    btn.appendChild(flag);
    btn.appendChild(name);

    btn.addEventListener('click', () => selectTeam(team));
    elements.teamGrid.appendChild(btn);
  });
}

function selectTeam(team) {
  initAudio(); // Initialize audio on user interaction
  playSound('select');

  state.selectedTeam = team;

  // Update UI
  document.querySelectorAll('.team-btn').forEach(btn => {
    const isSelected = btn.dataset.teamId === team.id;
    btn.classList.toggle('selected', isSelected);
    btn.setAttribute('aria-checked', isSelected);
  });

  elements.btnStart.disabled = false;
  elements.btnStart.removeAttribute('aria-disabled');
  elements.btnStart.textContent = 'Start Game';
}

// ===========================================
// GAME INITIALIZATION
// ===========================================

function startGame() {
  // Reset game state
  state.shotsRemaining = GAME_CONFIG.totalShots;
  state.goals = 0;
  state.saves = 0;
  state.misses = 0;
  state.streak = 0;
  state.maxStreak = 0;
  state.shotResult = null;
  state.showingResult = false;
  state.particles = [];
  state.crowdCheer = 0;

  resetBall();
  resetKeeper();

  // Update game UI
  setFlagImage(elements.gameFlag, state.selectedTeam);
  elements.gameTeamName.textContent = state.selectedTeam.name;

  // Show player name if entered
  const playerName = elements.playerName.value.trim();
  if (playerName) {
    elements.playerNameDisplay.textContent = playerName;
    elements.playerNameDisplay.style.display = 'block';
  } else {
    elements.playerNameDisplay.style.display = 'none';
  }

  updateGameUI();

  // Reset controls
  elements.aimSlider.value = 0;
  elements.powerSlider.value = 70;
  elements.curveSlider.value = 0;
  state.aim = 0;
  state.power = 70;
  state.curve = 0;
  updatePowerDisplay();
  updateCurveDisplay();

  switchScreen('game');
  elements.canvas.focus();

  // Start game loop
  requestAnimationFrame(gameLoop);
}

function resetBall() {
  state.ball = {
    x: GAME_CONFIG.ballStartX,
    y: GAME_CONFIG.ballStartY,
    vx: 0,
    vy: 0,
    spin: 0,
    isMoving: false
  };
}

function resetKeeper() {
  state.keeper = {
    x: GAME_CONFIG.canvasWidth / 2 - GAME_CONFIG.keeperWidth / 2,
    direction: Math.random() > 0.5 ? 1 : -1,
    speed: 0.8,
    state: 'idle',
    diveProgress: 0,
    targetX: 0,
    reactionTimer: 0
  };
}

function updateGameUI() {
  elements.shotsRemaining.textContent = state.shotsRemaining;
  elements.goalsScored.textContent = state.goals;
  elements.currentStreak.textContent = state.streak;
  elements.btnShoot.disabled = state.ball.isMoving || state.showingResult;
}

function updatePowerDisplay() {
  elements.powerValue.textContent = `${state.power}%`;
}

function updateCurveDisplay() {
  elements.curveValue.textContent = state.curve;
}

// ===========================================
// GAME CONTROLS
// ===========================================

function shoot() {
  if (state.ball.isMoving || state.showingResult || state.shotsRemaining <= 0) return;

  initAudio();
  playSound('kick');

  // Calculate velocity based on aim and power
  const angleRad = (state.aim * Math.PI) / 180;
  const speed = (state.power / 100) * 5;

  state.ball.vx = Math.sin(angleRad) * speed;
  state.ball.vy = -speed; // Negative because Y increases downward
  state.ball.spin = (state.curve / 100) * 0.5; // Convert curve to spin
  state.ball.isMoving = true;

  updateGameUI();

  // Trigger haptics on mobile if supported
  if (navigator.vibrate) {
    navigator.vibrate(50);
  }
}

function resetShot() {
  if (state.showingResult) return;
  resetBall();
  state.curve = 0;
  elements.curveSlider.value = 0;
  updateCurveDisplay();
  updateGameUI();
}

// ===========================================
// GAME LOOP
// ===========================================

let lastTime = 0;

function gameLoop(timestamp) {
  if (state.screen !== 'game') return;

  const deltaTime = timestamp - lastTime;
  lastTime = timestamp;

  update(deltaTime);
  render();

  requestAnimationFrame(gameLoop);
}

function update(deltaTime) {
  // Update keeper (always moving unless showing result)
  if (!state.showingResult) {
    updateKeeper();
  }

  // Update ball if moving
  if (state.ball.isMoving) {
    updateBall();
    checkCollisions();
  }
}

function updateKeeper() {
  const keeper = state.keeper;
  const difficulty = DIFFICULTY_LEVELS[state.difficulty];
  const goalLeft = (GAME_CONFIG.canvasWidth - GAME_CONFIG.goalWidth) / 2 + GAME_CONFIG.postWidth;
  const goalRight = goalLeft + GAME_CONFIG.goalWidth - GAME_CONFIG.postWidth * 2 - GAME_CONFIG.keeperWidth;

  // Handle diving state
  if (keeper.state !== 'idle') {
    keeper.diveProgress += 0.08;

    if (keeper.diveProgress >= 1) {
      keeper.diveProgress = 1;
    }

    // Move towards target during dive - LIMITED REACH!
    // Keeper can't magically reach the entire goal from the opposite side
    const targetDelta = keeper.targetX - keeper.x;
    const maxDiveDistance = 35 * difficulty.keeperReachMultiplier; // Max distance he can dive
    const clampedDelta = Math.max(-maxDiveDistance, Math.min(maxDiveDistance, targetDelta));
    keeper.x += clampedDelta * 0.15;

    return;
  }

  // React to ball if it's moving
  if (state.ball.isMoving && keeper.reactionTimer <= 0) {
    const ball = state.ball;
    const ballSpeed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);

    // Predict where ball will be
    const timeToGoal = Math.abs((GAME_CONFIG.keeperY - ball.y) / ball.vy);
    const predictedX = ball.x + (ball.vx + ball.spin * 0.5) * timeToGoal;

    const keeperCenter = keeper.x + GAME_CONFIG.keeperWidth / 2;
    const distanceFromKeeper = Math.abs(predictedX - keeperCenter);

    // Decide whether to dive (only if ball is somewhat reachable)
    const maxReachDistance = 50 * difficulty.keeperReachMultiplier;
    const shouldDive = distanceFromKeeper > 8 &&
                      distanceFromKeeper < maxReachDistance &&
                      Math.random() < difficulty.keeperDiveChance &&
                      ball.y < GAME_CONFIG.canvasHeight / 2;

    if (shouldDive) {
      keeper.state = predictedX < keeperCenter ? 'diving-left' : 'diving-right';
      keeper.targetX = predictedX - GAME_CONFIG.keeperWidth / 2;
      keeper.diveProgress = 0;
      keeper.reactionTimer = difficulty.keeperReactionTime;
      playSound('dive');
    }
  } else if (keeper.reactionTimer > 0) {
    keeper.reactionTimer -= 16; // Approximate frame time
  }

  // Normal movement when idle
  keeper.x += keeper.direction * difficulty.keeperSpeed;

  // Bounce off goal posts
  if (keeper.x <= goalLeft) {
    keeper.x = goalLeft;
    keeper.direction = 1;
  } else if (keeper.x >= goalRight) {
    keeper.x = goalRight;
    keeper.direction = -1;
  }
}

function updateBall() {
  const ball = state.ball;

  // Apply velocity
  ball.x += ball.vx;
  ball.y += ball.vy;

  // Apply curve (spin effect)
  if (ball.spin !== 0 && ball.isMoving) {
    ball.vx += ball.spin * 0.08;
  }

  // Apply friction
  ball.vx *= GAME_CONFIG.friction;
  ball.vy *= GAME_CONFIG.friction;

  // Check if ball has stopped
  const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);
  if (speed < GAME_CONFIG.minVelocity && ball.y < GAME_CONFIG.ballStartY - 10) {
    ball.isMoving = false;
    handleShotResult('miss');
  }
}

// ===========================================
// COLLISION DETECTION
// ===========================================

function checkCollisions() {
  const ball = state.ball;
  const goalLeft = (GAME_CONFIG.canvasWidth - GAME_CONFIG.goalWidth) / 2;
  const goalRight = goalLeft + GAME_CONFIG.goalWidth;
  const goalTop = GAME_CONFIG.goalY;
  const goalBottom = goalTop + GAME_CONFIG.goalHeight;

  // Check if ball went out of bounds (miss)
  if (ball.x < 0 || ball.x > GAME_CONFIG.canvasWidth || ball.y < 0) {
    ball.isMoving = false;
    handleShotResult('miss');
    return;
  }

  // Check goal posts collision
  if (ball.y <= goalBottom && ball.y >= goalTop) {
    // Left post
    if (ball.x >= goalLeft && ball.x <= goalLeft + GAME_CONFIG.postWidth) {
      ball.vx = Math.abs(ball.vx) * 0.5;
      ball.x = goalLeft + GAME_CONFIG.postWidth + GAME_CONFIG.ballRadius;
      playSound('miss');
    }
    // Right post
    if (ball.x >= goalRight - GAME_CONFIG.postWidth && ball.x <= goalRight) {
      ball.vx = -Math.abs(ball.vx) * 0.5;
      ball.x = goalRight - GAME_CONFIG.postWidth - GAME_CONFIG.ballRadius;
      playSound('miss');
    }
  }

  // Check crossbar
  if (ball.y <= goalTop + 3 && ball.y >= goalTop - GAME_CONFIG.ballRadius) {
    if (ball.x > goalLeft && ball.x < goalRight) {
      ball.vy = Math.abs(ball.vy) * 0.5;
      ball.y = goalTop + GAME_CONFIG.ballRadius + 3;
      playSound('miss');
    }
  }

  // Check keeper collision
  const keeper = state.keeper;
  if (ball.y <= GAME_CONFIG.keeperY + GAME_CONFIG.keeperHeight &&
      ball.y >= GAME_CONFIG.keeperY &&
      ball.x >= keeper.x &&
      ball.x <= keeper.x + GAME_CONFIG.keeperWidth) {
    ball.isMoving = false;
    handleShotResult('save');
    return;
  }

  // Check goal scored (ball crosses goal line between posts)
  if (ball.y <= goalTop + 5) {
    if (ball.x > goalLeft + GAME_CONFIG.postWidth &&
        ball.x < goalRight - GAME_CONFIG.postWidth) {
      ball.isMoving = false;
      handleShotResult('goal');
      return;
    }
  }
}

// ===========================================
// SHOT RESULT HANDLING
// ===========================================

function handleShotResult(result) {
  state.shotResult = result;
  state.showingResult = true;
  state.shotsRemaining--;

  switch (result) {
    case 'goal':
      state.goals++;
      state.streak++;
      state.maxStreak = Math.max(state.maxStreak, state.streak);
      playSound('goal');
      playSound('crowd');
      state.crowdCheer = 3;
      createParticles(state.ball.x, state.ball.y, '#38b764', 20);
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      break;
    case 'save':
      state.saves++;
      state.streak = 0;
      playSound('save');
      createParticles(state.keeper.x + GAME_CONFIG.keeperWidth / 2, GAME_CONFIG.keeperY, '#e43b44', 10);
      break;
    case 'miss':
      state.misses++;
      state.streak = 0;
      playSound('miss');
      break;
  }

  updateGameUI();

  // Decay crowd cheer
  const cheerInterval = setInterval(() => {
    state.crowdCheer *= 0.9;
    if (state.crowdCheer < 0.1) {
      state.crowdCheer = 0;
      clearInterval(cheerInterval);
    }
  }, 100);

  // Show result briefly, then continue or end game
  setTimeout(() => {
    state.shotResult = null;
    state.showingResult = false;

    if (state.shotsRemaining <= 0) {
      showResults();
    } else {
      resetBall();
      resetKeeper();
      updateGameUI();
    }
  }, 1500);
}

// ===========================================
// RENDERING
// ===========================================

function render() {
  // Clear canvas
  ctx.fillStyle = COLORS.field;
  ctx.fillRect(0, 0, GAME_CONFIG.canvasWidth, GAME_CONFIG.canvasHeight);

  drawCrowd();
  drawField();
  drawGoal();
  drawKeeper();
  drawBall();
  drawParticles();
  drawAimIndicator();
  drawShotResult();
}

function drawField() {
  // Realistic grass pattern with varied stripes
  const stripeWidth = 15;
  for (let x = 0; x < GAME_CONFIG.canvasWidth; x += stripeWidth * 2) {
    ctx.fillStyle = COLORS.fieldLight;
    ctx.fillRect(x, 0, stripeWidth, GAME_CONFIG.canvasHeight);
    ctx.fillStyle = COLORS.field;
    ctx.fillRect(x + stripeWidth, 0, stripeWidth, GAME_CONFIG.canvasHeight);
  }

  // 18-yard box (larger penalty area)
  const boxWidth = 120;
  const boxHeight = 70;
  const boxX = (GAME_CONFIG.canvasWidth - boxWidth) / 2;
  const boxY = GAME_CONFIG.goalY + GAME_CONFIG.goalHeight;

  ctx.strokeStyle = COLORS.line;
  ctx.lineWidth = 2;
  ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

  // 6-yard box (goal area)
  const smallBoxWidth = 80;
  const smallBoxHeight = 35;
  const smallBoxX = (GAME_CONFIG.canvasWidth - smallBoxWidth) / 2;
  ctx.strokeRect(smallBoxX, boxY, smallBoxWidth, smallBoxHeight);

  // Penalty spot with arc
  ctx.fillStyle = COLORS.line;
  ctx.beginPath();
  ctx.arc(GAME_CONFIG.ballStartX, GAME_CONFIG.ballStartY, 2, 0, Math.PI * 2);
  ctx.fill();

  // Penalty arc
  ctx.strokeStyle = COLORS.line;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(GAME_CONFIG.ballStartX, GAME_CONFIG.ballStartY, 20, -Math.PI / 3, -Math.PI * 2 / 3, true);
  ctx.stroke();

  // Center line hint
  ctx.fillStyle = COLORS.line;
  ctx.fillRect(0, GAME_CONFIG.canvasHeight - 2, GAME_CONFIG.canvasWidth, 2);
}

function drawGoal() {
  const goalLeft = (GAME_CONFIG.canvasWidth - GAME_CONFIG.goalWidth) / 2;
  const goalTop = GAME_CONFIG.goalY;

  // 3D goal depth effect (back of goal)
  ctx.fillStyle = '#262b44';
  ctx.fillRect(goalLeft + 2, goalTop + 2, GAME_CONFIG.goalWidth - 4, GAME_CONFIG.goalHeight - 2);

  // Realistic net with finer mesh
  ctx.fillStyle = 'rgba(255, 255, 255, 0.15)';
  ctx.fillRect(goalLeft + 3, goalTop + 3, GAME_CONFIG.goalWidth - 6, GAME_CONFIG.goalHeight - 3);

  // Net pattern - finer grid
  ctx.strokeStyle = 'rgba(139, 155, 180, 0.6)';
  ctx.lineWidth = 1;
  for (let x = goalLeft + 3; x < goalLeft + GAME_CONFIG.goalWidth; x += 5) {
    ctx.beginPath();
    ctx.moveTo(x, goalTop + 3);
    ctx.lineTo(x, goalTop + GAME_CONFIG.goalHeight);
    ctx.stroke();
  }
  for (let y = goalTop + 3; y < goalTop + GAME_CONFIG.goalHeight; y += 5) {
    ctx.beginPath();
    ctx.moveTo(goalLeft + 3, y);
    ctx.lineTo(goalLeft + GAME_CONFIG.goalWidth - 3, y);
    ctx.stroke();
  }

  // Goal frame (posts and crossbar) with 3D effect
  ctx.fillStyle = COLORS.post;

  // Left post with highlight
  ctx.fillRect(goalLeft, goalTop, GAME_CONFIG.postWidth, GAME_CONFIG.goalHeight);
  ctx.fillStyle = '#ffe8a0';
  ctx.fillRect(goalLeft, goalTop, 1, GAME_CONFIG.goalHeight);

  // Right post with highlight
  ctx.fillStyle = COLORS.post;
  ctx.fillRect(goalLeft + GAME_CONFIG.goalWidth - GAME_CONFIG.postWidth, goalTop,
               GAME_CONFIG.postWidth, GAME_CONFIG.goalHeight);
  ctx.fillStyle = '#ffe8a0';
  ctx.fillRect(goalLeft + GAME_CONFIG.goalWidth - GAME_CONFIG.postWidth, goalTop,
               1, GAME_CONFIG.goalHeight);

  // Crossbar with highlight
  ctx.fillStyle = COLORS.post;
  ctx.fillRect(goalLeft, goalTop, GAME_CONFIG.goalWidth, 3);
  ctx.fillStyle = '#ffe8a0';
  ctx.fillRect(goalLeft, goalTop, GAME_CONFIG.goalWidth, 1);
}

function drawKeeper() {
  const keeper = state.keeper;
  const kw = GAME_CONFIG.keeperWidth; // Now 5 pixels - skinny!
  const kh = GAME_CONFIG.keeperHeight;
  const ky = GAME_CONFIG.keeperY;

  ctx.save();

  // Apply diving animation
  if (keeper.state !== 'idle') {
    const tilt = keeper.diveProgress * 0.6;

    if (keeper.state === 'diving-left') {
      ctx.translate(keeper.x + kw / 2, ky + kh / 2);
      ctx.rotate(-tilt);
      ctx.translate(-(keeper.x + kw / 2), -(ky + kh / 2));
    } else if (keeper.state === 'diving-right') {
      ctx.translate(keeper.x + kw / 2, ky + kh / 2);
      ctx.rotate(tilt);
      ctx.translate(-(keeper.x + kw / 2), -(ky + kh / 2));
    }
  }

  // Skinny goalkeeper (5 pixels wide)
  const centerX = keeper.x + kw / 2;

  // Head (skin tone)
  ctx.fillStyle = '#f4c4a0';
  ctx.beginPath();
  ctx.arc(centerX, ky - 2, 2.5, 0, Math.PI * 2);
  ctx.fill();

  // Jersey (goalkeeper color)
  ctx.fillStyle = '#38b764'; // Green keeper jersey
  // Skinny torso
  ctx.fillRect(keeper.x + 1, ky + 1, kw - 2, 7);

  // Arms - position depends on state
  const armExtension = keeper.state !== 'idle' ? keeper.diveProgress * 10 : 0;

  if (keeper.state === 'diving-left') {
    // Left arm extended far
    ctx.fillRect(keeper.x - 1 - armExtension, ky + 2, 2 + armExtension, 2);
    // Right arm
    ctx.fillRect(keeper.x + kw - 1, ky + 2, 2, 2);
    // Gloves
    ctx.fillStyle = '#ffcd75';
    ctx.fillRect(keeper.x - 2 - armExtension, ky + 1, 2, 3);
    ctx.fillRect(keeper.x + kw - 1, ky + 1, 2, 3);
  } else if (keeper.state === 'diving-right') {
    // Left arm
    ctx.fillRect(keeper.x - 1, ky + 2, 2, 2);
    // Right arm extended far
    ctx.fillRect(keeper.x + kw - 1, ky + 2, 2 + armExtension, 2);
    // Gloves
    ctx.fillStyle = '#ffcd75';
    ctx.fillRect(keeper.x - 1, ky + 1, 2, 3);
    ctx.fillRect(keeper.x + kw + armExtension - 1, ky + 1, 2, 3);
  } else {
    // Both arms raised
    ctx.fillRect(keeper.x - 1, ky + 1, 2, 4);
    ctx.fillRect(keeper.x + kw - 1, ky + 1, 2, 4);
    // Gloves
    ctx.fillStyle = '#ffcd75';
    ctx.fillRect(keeper.x - 1, ky, 2, 2);
    ctx.fillRect(keeper.x + kw - 1, ky, 2, 2);
  }

  ctx.fillStyle = '#38b764';

  // Shorts
  ctx.fillStyle = '#1a1c2c';
  ctx.fillRect(keeper.x + 1, ky + 8, kw - 2, 4);

  // Skinny legs
  ctx.fillStyle = '#f4c4a0';
  ctx.fillRect(keeper.x + 1, ky + 12, 1, 6);
  ctx.fillRect(keeper.x + kw - 2, ky + 12, 1, 6);

  // Shoes
  ctx.fillStyle = '#1a1c2c';
  ctx.fillRect(keeper.x + 1, ky + 18, 2, 2);
  ctx.fillRect(keeper.x + kw - 3, ky + 18, 2, 2);

  ctx.restore();
}

function drawBall() {
  const ball = state.ball;
  const r = GAME_CONFIG.ballRadius;

  // Shadow
  ctx.fillStyle = COLORS.ballShadow;
  ctx.globalAlpha = 0.4;
  ctx.beginPath();
  ctx.ellipse(ball.x + 1, ball.y + 3, r + 1, r * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Ball base (white)
  ctx.fillStyle = '#f4f4f4';
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, r, 0, Math.PI * 2);
  ctx.fill();

  // Classic soccer ball pattern (pentagons)
  ctx.fillStyle = '#1a1c2c';

  // Center pentagon
  ctx.beginPath();
  ctx.moveTo(ball.x, ball.y - 2);
  ctx.lineTo(ball.x + 2, ball.y - 1);
  ctx.lineTo(ball.x + 1, ball.y + 1);
  ctx.lineTo(ball.x - 1, ball.y + 1);
  ctx.lineTo(ball.x - 2, ball.y - 1);
  ctx.closePath();
  ctx.fill();

  // Side pentagons (partial)
  ctx.beginPath();
  ctx.moveTo(ball.x - 3, ball.y - 2);
  ctx.lineTo(ball.x - 2, ball.y - 3);
  ctx.lineTo(ball.x - 1, ball.y - 3);
  ctx.lineTo(ball.x - 1, ball.y - 1);
  ctx.fill();

  ctx.beginPath();
  ctx.moveTo(ball.x + 3, ball.y - 2);
  ctx.lineTo(ball.x + 2, ball.y - 3);
  ctx.lineTo(ball.x + 1, ball.y - 3);
  ctx.lineTo(ball.x + 1, ball.y - 1);
  ctx.fill();

  // Highlight for 3D effect
  ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
  ctx.beginPath();
  ctx.arc(ball.x - 1, ball.y - 1, 2, 0, Math.PI * 2);
  ctx.fill();

  // Spin indicator when moving
  if (ball.isMoving && Math.abs(ball.spin) > 0.1) {
    ctx.strokeStyle = ball.spin > 0 ? '#ffcd75' : '#41a6f6';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.6;
    ctx.beginPath();
    const spinArc = ball.spin * Math.PI;
    ctx.arc(ball.x, ball.y, r + 2, -Math.PI / 2 - spinArc, -Math.PI / 2 + spinArc);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

function drawCrowd() {
  // Stadium stands with crowd
  const standY = 2;
  const standHeight = 18;

  // Draw stadium structure
  ctx.fillStyle = '#262b44';
  ctx.fillRect(0, standY, GAME_CONFIG.canvasWidth, standHeight);

  // Animated crowd - looks like individual fans
  const cheer = state.crowdCheer;
  const time = Date.now() * 0.003;

  for (let x = 0; x < GAME_CONFIG.canvasWidth; x += 3) {
    // Varied crowd members
    const crowdColors = ['#41a6f6', '#e43b44', '#ffcd75', '#38b764', '#f4f4f4'];
    const colorIndex = Math.floor(x / 3) % crowdColors.length;

    // Bottom row - standing fans
    const variation = Math.sin(x * 0.5 + time) * cheer;
    const fanHeight = 6 + variation;
    ctx.fillStyle = crowdColors[colorIndex];
    ctx.fillRect(x, standY + standHeight - fanHeight - 2, 2, fanHeight);

    // Top row - seated fans
    ctx.fillStyle = crowdColors[(colorIndex + 2) % crowdColors.length];
    ctx.fillRect(x, standY + 4, 2, 4);
  }

  // Stadium roof/overhang
  ctx.fillStyle = '#1a1c2c';
  ctx.fillRect(0, standY, GAME_CONFIG.canvasWidth, 2);
}

function drawParticles() {
  state.particles.forEach((particle, index) => {
    ctx.fillStyle = particle.color;
    ctx.globalAlpha = particle.life;
    ctx.fillRect(particle.x - 1, particle.y - 1, 2, 2);
    ctx.globalAlpha = 1;

    // Update particle
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.vy += 0.1; // Gravity
    particle.life -= 0.02;

    if (particle.life <= 0) {
      state.particles.splice(index, 1);
    }
  });
}

function createParticles(x, y, color, count = 10) {
  for (let i = 0; i < count; i++) {
    state.particles.push({
      x: x,
      y: y,
      vx: (Math.random() - 0.5) * 3,
      vy: (Math.random() - 0.5) * 3 - 1,
      color: color,
      life: 1
    });
  }
}

function drawAimIndicator() {
  // Only show when ball is not moving
  if (state.ball.isMoving || state.showingResult) return;

  const ball = state.ball;
  const angleRad = (state.aim * Math.PI) / 180;
  const curveEffect = (state.curve / 100) * 20;
  const indicatorLength = 30 + (state.power / 100) * 30;

  const endX = ball.x + Math.sin(angleRad) * indicatorLength + curveEffect;
  const endY = ball.y - indicatorLength;

  // Curved line using quadratic curve
  ctx.strokeStyle = COLORS.line;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(ball.x, ball.y - GAME_CONFIG.ballRadius);

  const controlX = ball.x + Math.sin(angleRad) * indicatorLength / 2;
  const controlY = ball.y - indicatorLength / 2;
  ctx.quadraticCurveTo(controlX, controlY, endX, endY);

  ctx.stroke();
  ctx.setLineDash([]);

  // Arrow head
  ctx.fillStyle = COLORS.line;
  ctx.beginPath();
  ctx.moveTo(endX, endY - 4);
  ctx.lineTo(endX - 3, endY + 2);
  ctx.lineTo(endX + 3, endY + 2);
  ctx.fill();

  // Curve indicator
  if (Math.abs(state.curve) > 5) {
    ctx.fillStyle = state.curve > 0 ? '#ffcd75' : '#41a6f6';
    ctx.font = '6px "Courier New", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(state.curve > 0 ? 'R' : 'L', ball.x + curveEffect / 2, ball.y - 5);
  }
}

function drawShotResult() {
  if (!state.shotResult) return;

  let text = '';
  let color = COLORS.goal;

  switch (state.shotResult) {
    case 'goal':
      text = 'GOAL!';
      color = '#38b764';
      break;
    case 'save':
      text = 'SAVED!';
      color = '#e43b44';
      break;
    case 'miss':
      text = 'MISS!';
      color = '#8b9bb4';
      break;
  }

  // Semi-transparent background
  ctx.fillStyle = 'rgba(26, 28, 44, 0.7)';
  ctx.fillRect(0, 80, GAME_CONFIG.canvasWidth, 40);

  // Text
  ctx.fillStyle = color;
  ctx.font = '16px "Courier New", monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, GAME_CONFIG.canvasWidth / 2, 100);
}

// ===========================================
// RESULTS SCREEN
// ===========================================

function showResults() {
  // Update statistics
  updateStatsAfterGame();

  setFlagImage(elements.resultsFlag, state.selectedTeam, true);
  elements.resultsTeamName.textContent = state.selectedTeam.name;
  elements.finalGoals.textContent = state.goals;
  elements.breakdownGoals.textContent = state.goals;
  elements.breakdownSaves.textContent = state.saves;
  elements.breakdownMisses.textContent = state.misses;

  // Generate message based on performance
  let message = '';
  if (state.goals === 5) {
    message = 'Perfect! World Cup winner!';
    if (state.stats.perfectGames > 1) {
      message += ` (${state.stats.perfectGames} perfect games!)`;
    }
  } else if (state.goals >= 4) {
    message = 'Excellent shooting!';
  } else if (state.goals >= 3) {
    message = 'Good performance!';
  } else if (state.goals >= 1) {
    message = 'Keep practicing!';
  } else {
    message = 'Better luck next time!';
  }

  if (state.maxStreak > 1) {
    message += ` Best streak: ${state.maxStreak}`;
  }

  elements.resultsMessage.textContent = message;

  // Update stats display
  const statsEl = document.getElementById('career-stats');
  if (statsEl) {
    statsEl.textContent = `Career: ${state.stats.totalGoals}/${state.stats.totalShots} goals (${getAccuracy()}% accuracy)`;
  }

  // Celebrate if scored
  if (state.goals > 0) {
    document.querySelector('.score-display').classList.add('celebrating');
    setTimeout(() => {
      document.querySelector('.score-display').classList.remove('celebrating');
    }, 300);
  }

  switchScreen('results');
}

function playAgain() {
  switchScreen('select');
  state.selectedTeam = null;

  // Reset team selection UI
  document.querySelectorAll('.team-btn').forEach(btn => {
    btn.classList.remove('selected');
    btn.setAttribute('aria-checked', 'false');
  });

  elements.btnStart.disabled = true;
  elements.btnStart.setAttribute('aria-disabled', 'true');
  elements.btnStart.textContent = 'Select a Team';
}

// ===========================================
// EVENT LISTENERS
// ===========================================

function initEventListeners() {
  // Difficulty selection
  elements.difficultyButtons.querySelectorAll('.difficulty-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      elements.difficultyButtons.querySelectorAll('.difficulty-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.difficulty = btn.dataset.difficulty;
      playSound('select');
    });
  });

  // Start button
  elements.btnStart.addEventListener('click', startGame);

  // Aim slider
  elements.aimSlider.addEventListener('input', (e) => {
    state.aim = parseInt(e.target.value);
  });

  // Power slider
  elements.powerSlider.addEventListener('input', (e) => {
    state.power = parseInt(e.target.value);
    updatePowerDisplay();
  });

  // Curve slider
  elements.curveSlider.addEventListener('input', (e) => {
    state.curve = parseInt(e.target.value);
    updateCurveDisplay();
  });

  // Shoot button
  elements.btnShoot.addEventListener('click', shoot);

  // Reset button
  elements.btnReset.addEventListener('click', resetShot);

  // Play again button
  elements.btnPlayAgain.addEventListener('click', playAgain);

  // Keyboard controls
  document.addEventListener('keydown', handleKeyDown);

  // Touch support for canvas
  elements.canvas.addEventListener('touchstart', handleTouch, { passive: false });

  // Prevent context menu on long press
  elements.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
}

function handleKeyDown(e) {
  if (state.screen !== 'game') return;

  switch (e.key) {
    case 'ArrowLeft':
      e.preventDefault();
      state.aim = Math.max(-45, state.aim - 5);
      elements.aimSlider.value = state.aim;
      break;

    case 'ArrowRight':
      e.preventDefault();
      state.aim = Math.min(45, state.aim + 5);
      elements.aimSlider.value = state.aim;
      break;

    case 'ArrowUp':
      e.preventDefault();
      state.power = Math.min(100, state.power + 5);
      elements.powerSlider.value = state.power;
      updatePowerDisplay();
      break;

    case 'ArrowDown':
      e.preventDefault();
      state.power = Math.max(30, state.power - 5);
      elements.powerSlider.value = state.power;
      updatePowerDisplay();
      break;

    case 'a':
    case 'A':
      e.preventDefault();
      state.curve = Math.max(-100, state.curve - 10);
      elements.curveSlider.value = state.curve;
      updateCurveDisplay();
      break;

    case 'd':
    case 'D':
      e.preventDefault();
      state.curve = Math.min(100, state.curve + 10);
      elements.curveSlider.value = state.curve;
      updateCurveDisplay();
      break;

    case ' ':
    case 'Enter':
      e.preventDefault();
      shoot();
      break;

    case 'r':
    case 'R':
      e.preventDefault();
      resetShot();
      break;
  }
}

function handleTouch(e) {
  e.preventDefault();

  if (state.ball.isMoving || state.showingResult) return;

  const touch = e.touches[0];
  const rect = elements.canvas.getBoundingClientRect();
  const scaleX = GAME_CONFIG.canvasWidth / rect.width;
  const scaleY = GAME_CONFIG.canvasHeight / rect.height;

  const touchX = (touch.clientX - rect.left) * scaleX;
  const touchY = (touch.clientY - rect.top) * scaleY;

  // Calculate aim based on touch position relative to ball
  const dx = touchX - GAME_CONFIG.ballStartX;
  const dy = GAME_CONFIG.ballStartY - touchY;

  if (dy > 0) {
    const angle = Math.atan2(dx, dy) * (180 / Math.PI);
    state.aim = Math.max(-45, Math.min(45, angle));
    elements.aimSlider.value = state.aim;

    // Calculate power based on distance
    const distance = Math.sqrt(dx * dx + dy * dy);
    state.power = Math.max(30, Math.min(100, 30 + distance * 0.7));
    elements.powerSlider.value = state.power;
    updatePowerDisplay();
  }

  shoot();
}

// ===========================================
// CANVAS SETUP
// ===========================================

function setupCanvas() {
  // Set internal canvas resolution
  elements.canvas.width = GAME_CONFIG.canvasWidth;
  elements.canvas.height = GAME_CONFIG.canvasHeight;

  // Disable image smoothing for crisp pixels
  ctx.imageSmoothingEnabled = false;
}

// ===========================================
// STATISTICS & STORAGE
// ===========================================

function loadStats() {
  try {
    const saved = localStorage.getItem('pixelPenaltyStats');
    if (saved) {
      state.stats = { ...state.stats, ...JSON.parse(saved) };
    }
  } catch (e) {
    console.error('Failed to load stats:', e);
  }
}

function saveStats() {
  try {
    localStorage.setItem('pixelPenaltyStats', JSON.stringify(state.stats));
  } catch (e) {
    console.error('Failed to save stats:', e);
  }
}

function updateStatsAfterGame() {
  state.stats.totalShots += GAME_CONFIG.totalShots;
  state.stats.totalGoals += state.goals;
  state.stats.totalSaves += state.saves;
  state.stats.totalMisses += state.misses;
  state.stats.bestStreak = Math.max(state.stats.bestStreak, state.maxStreak);
  state.stats.gamesPlayed++;
  if (state.goals === GAME_CONFIG.totalShots) {
    state.stats.perfectGames++;
  }
  saveStats();
}

function getAccuracy() {
  if (state.stats.totalShots === 0) return 0;
  return Math.round((state.stats.totalGoals / state.stats.totalShots) * 100);
}

// ===========================================
// INITIALIZATION
// ===========================================

function init() {
  setupCanvas();
  initTeamSelection();
  initEventListeners();
  loadStats();

  // Initial render
  render();

  // Start the game loop for select screen (just renders)
  state.screen = 'game'; // Temporarily set to game to run initial render
  render();
  state.screen = 'select';
}

// Start the app
init();
