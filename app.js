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
  ballRadius: 4,
  ballStartX: 80,
  ballStartY: 170,
  goalY: 20,
  goalWidth: 60,
  goalHeight: 20,
  postWidth: 4,
  keeperWidth: 24,
  keeperHeight: 16,
  keeperY: 26,
  friction: 0.985,
  minVelocity: 0.1
};

// ===========================================
// STATE
// ===========================================

const state = {
  screen: 'select', // select | game | results
  selectedTeam: null,
  shotsRemaining: GAME_CONFIG.totalShots,
  goals: 0,
  saves: 0,
  misses: 0,

  // Game state
  ball: {
    x: GAME_CONFIG.ballStartX,
    y: GAME_CONFIG.ballStartY,
    vx: 0,
    vy: 0,
    isMoving: false
  },
  keeper: {
    x: GAME_CONFIG.canvasWidth / 2 - GAME_CONFIG.keeperWidth / 2,
    direction: 1,
    speed: 0.8
  },
  aim: 0,       // -45 to 45 degrees
  power: 70,    // 30 to 100
  shotResult: null,  // 'goal' | 'save' | 'miss' | null
  showingResult: false
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
  teamGrid: document.getElementById('team-grid'),
  btnStart: document.getElementById('btn-start'),
  gameFlag: document.getElementById('game-flag'),
  gameTeamName: document.getElementById('game-team-name'),
  shotsRemaining: document.getElementById('shots-remaining'),
  goalsScored: document.getElementById('goals-scored'),
  canvas: document.getElementById('game-canvas'),
  aimSlider: document.getElementById('aim-slider'),
  powerSlider: document.getElementById('power-slider'),
  powerValue: document.getElementById('power-value'),
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
  state.shotResult = null;
  state.showingResult = false;

  resetBall();
  resetKeeper();

  // Update game UI
  setFlagImage(elements.gameFlag, state.selectedTeam);
  elements.gameTeamName.textContent = state.selectedTeam.name;
  updateGameUI();

  // Reset controls
  elements.aimSlider.value = 0;
  elements.powerSlider.value = 70;
  state.aim = 0;
  state.power = 70;
  updatePowerDisplay();

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
    isMoving: false
  };
}

function resetKeeper() {
  state.keeper = {
    x: GAME_CONFIG.canvasWidth / 2 - GAME_CONFIG.keeperWidth / 2,
    direction: Math.random() > 0.5 ? 1 : -1,
    speed: 0.6 + Math.random() * 0.4
  };
}

function updateGameUI() {
  elements.shotsRemaining.textContent = state.shotsRemaining;
  elements.goalsScored.textContent = state.goals;
  elements.btnShoot.disabled = state.ball.isMoving || state.showingResult;
}

function updatePowerDisplay() {
  elements.powerValue.textContent = `${state.power}%`;
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
  const goalLeft = (GAME_CONFIG.canvasWidth - GAME_CONFIG.goalWidth) / 2 + GAME_CONFIG.postWidth;
  const goalRight = goalLeft + GAME_CONFIG.goalWidth - GAME_CONFIG.postWidth * 2 - GAME_CONFIG.keeperWidth;

  keeper.x += keeper.direction * keeper.speed;

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
      playSound('goal');
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
      break;
    case 'save':
      state.saves++;
      playSound('save');
      break;
    case 'miss':
      state.misses++;
      playSound('miss');
      break;
  }

  updateGameUI();

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

  drawField();
  drawGoal();
  drawKeeper();
  drawBall();
  drawAimIndicator();
  drawShotResult();
}

function drawField() {
  // Field stripes
  const stripeWidth = 20;
  ctx.fillStyle = COLORS.fieldLight;
  for (let x = 0; x < GAME_CONFIG.canvasWidth; x += stripeWidth * 2) {
    ctx.fillRect(x, 0, stripeWidth, GAME_CONFIG.canvasHeight);
  }

  // Penalty box
  const boxWidth = 100;
  const boxHeight = 60;
  const boxX = (GAME_CONFIG.canvasWidth - boxWidth) / 2;
  const boxY = GAME_CONFIG.goalY + GAME_CONFIG.goalHeight;

  ctx.strokeStyle = COLORS.line;
  ctx.lineWidth = 2;
  ctx.strokeRect(boxX, boxY, boxWidth, boxHeight);

  // Penalty spot
  ctx.fillStyle = COLORS.line;
  ctx.fillRect(GAME_CONFIG.ballStartX - 2, GAME_CONFIG.ballStartY - 2, 4, 4);

  // Center line hint
  ctx.fillStyle = COLORS.line;
  ctx.fillRect(0, GAME_CONFIG.canvasHeight - 2, GAME_CONFIG.canvasWidth, 2);
}

function drawGoal() {
  const goalLeft = (GAME_CONFIG.canvasWidth - GAME_CONFIG.goalWidth) / 2;
  const goalTop = GAME_CONFIG.goalY;

  // Goal net (back)
  ctx.fillStyle = COLORS.goalNet;
  ctx.fillRect(goalLeft, goalTop, GAME_CONFIG.goalWidth, GAME_CONFIG.goalHeight);

  // Net pattern
  ctx.strokeStyle = COLORS.bg;
  ctx.lineWidth = 1;
  for (let x = goalLeft; x < goalLeft + GAME_CONFIG.goalWidth; x += 6) {
    ctx.beginPath();
    ctx.moveTo(x, goalTop);
    ctx.lineTo(x, goalTop + GAME_CONFIG.goalHeight);
    ctx.stroke();
  }
  for (let y = goalTop; y < goalTop + GAME_CONFIG.goalHeight; y += 6) {
    ctx.beginPath();
    ctx.moveTo(goalLeft, y);
    ctx.lineTo(goalLeft + GAME_CONFIG.goalWidth, y);
    ctx.stroke();
  }

  // Goal frame
  ctx.fillStyle = COLORS.post;

  // Left post
  ctx.fillRect(goalLeft, goalTop, GAME_CONFIG.postWidth, GAME_CONFIG.goalHeight);
  // Right post
  ctx.fillRect(goalLeft + GAME_CONFIG.goalWidth - GAME_CONFIG.postWidth, goalTop,
               GAME_CONFIG.postWidth, GAME_CONFIG.goalHeight);
  // Crossbar
  ctx.fillRect(goalLeft, goalTop, GAME_CONFIG.goalWidth, 3);
}

function drawKeeper() {
  const keeper = state.keeper;

  // Body
  ctx.fillStyle = COLORS.keeper;
  ctx.fillRect(keeper.x, GAME_CONFIG.keeperY, GAME_CONFIG.keeperWidth, GAME_CONFIG.keeperHeight);

  // Details (head, arms)
  ctx.fillStyle = COLORS.keeperDetail;
  // Head
  ctx.fillRect(keeper.x + 9, GAME_CONFIG.keeperY - 6, 6, 6);
  // Arms
  ctx.fillRect(keeper.x - 2, GAME_CONFIG.keeperY + 4, 4, 4);
  ctx.fillRect(keeper.x + GAME_CONFIG.keeperWidth - 2, GAME_CONFIG.keeperY + 4, 4, 4);
}

function drawBall() {
  const ball = state.ball;

  // Shadow
  ctx.fillStyle = COLORS.ballShadow;
  ctx.globalAlpha = 0.3;
  ctx.beginPath();
  ctx.arc(ball.x + 2, ball.y + 2, GAME_CONFIG.ballRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;

  // Ball
  ctx.fillStyle = COLORS.ball;
  ctx.beginPath();
  ctx.arc(ball.x, ball.y, GAME_CONFIG.ballRadius, 0, Math.PI * 2);
  ctx.fill();

  // Ball pattern (simple)
  ctx.fillStyle = COLORS.ballShadow;
  ctx.fillRect(ball.x - 1, ball.y - 1, 2, 2);
}

function drawAimIndicator() {
  // Only show when ball is not moving
  if (state.ball.isMoving || state.showingResult) return;

  const ball = state.ball;
  const angleRad = (state.aim * Math.PI) / 180;
  const indicatorLength = 30 + (state.power / 100) * 30;

  const endX = ball.x + Math.sin(angleRad) * indicatorLength;
  const endY = ball.y - indicatorLength;

  // Dashed line
  ctx.strokeStyle = COLORS.line;
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(ball.x, ball.y - GAME_CONFIG.ballRadius);
  ctx.lineTo(endX, endY);
  ctx.stroke();
  ctx.setLineDash([]);

  // Arrow head
  ctx.fillStyle = COLORS.line;
  ctx.beginPath();
  ctx.moveTo(endX, endY - 4);
  ctx.lineTo(endX - 3, endY + 2);
  ctx.lineTo(endX + 3, endY + 2);
  ctx.fill();
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
  } else if (state.goals >= 4) {
    message = 'Excellent shooting!';
  } else if (state.goals >= 3) {
    message = 'Good performance!';
  } else if (state.goals >= 1) {
    message = 'Keep practicing!';
  } else {
    message = 'Better luck next time!';
  }
  elements.resultsMessage.textContent = message;

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
// INITIALIZATION
// ===========================================

function init() {
  setupCanvas();
  initTeamSelection();
  initEventListeners();

  // Initial render
  render();

  // Start the game loop for select screen (just renders)
  state.screen = 'game'; // Temporarily set to game to run initial render
  render();
  state.screen = 'select';
}

// Start the app
init();
