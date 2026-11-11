const canvas = document.querySelector('#race-canvas');
const ctx = canvas.getContext('2d');
const track = document.querySelector('.track-wrap');
const scoreNode = document.querySelector('#score');
const speedNode = document.querySelector('#speed');
const bestNode = document.querySelector('#best');
const overlay = document.querySelector('#overlay');
const overlayIcon = document.querySelector('#overlay-icon');
const overlayTitle = document.querySelector('#overlay-title');
const overlayText = document.querySelector('#overlay-text');
const startButton = document.querySelector('#start-button');
const badge = document.querySelector('#race-badge');
const soundButton = document.querySelector('#sound-button');
const soundLabel = document.querySelector('#sound-label');
const leftButton = document.querySelector('#left-button');
const rightButton = document.querySelector('#right-button');
const BEST_KEY = 'neon-racer-best-v1';
const SOUND_KEY = 'neon-racer-sound-v1';
const laneCount = 3;
const cars = [
  { body: '#ff5d79', glass: '#ffd1df', stripe: '#fff2f5' },
  { body: '#57dcff', glass: '#d8f8ff', stripe: '#eaffff' },
  { body: '#ffd166', glass: '#fff4cc', stripe: '#fffdf0' },
  { body: '#ae83ff', glass: '#eee3ff', stripe: '#ffffff' },
  { body: '#59e0a4', glass: '#d7ffec', stripe: '#f1fff8' },
  { body: '#ff914d', glass: '#ffe2cf', stripe: '#fff8f1' }
];
let width = 0;
let height = 0;
let dpr = 1;
let running = false;
let lastFrame = 0;
let elapsed = 0;
let score = 0;
let best = readNumber(BEST_KEY);
let playerLane = 1;
let playerX = 0;
let roadOffset = 0;
let spawnClock = 0;
let rivals = [];
let soundOn = readStorage(SOUND_KEY, 'on') === 'on';
let audioContext = null;
let animationId = 0;

function readStorage(key, fallback = '0') {
  try { return localStorage.getItem(key) ?? fallback; } catch { return fallback; }
}
function readNumber(key) {
  const value = Number(readStorage(key, '0'));
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}
function save(key, value) {
  try { localStorage.setItem(key, String(value)); } catch { /* Local storage is optional. */ }
}
function resizeCanvas() {
  const rect = track.getBoundingClientRect();
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  width = rect.width;
  height = rect.height;
  canvas.width = Math.round(width * dpr);
  canvas.height = Math.round(height * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  playerX = laneCenter(playerLane);
  draw();
}
function roadBounds() { return { left: width * 0.13, right: width * 0.87 }; }
function laneWidth() { const road = roadBounds(); return (road.right - road.left) / laneCount; }
function laneCenter(lane) { const road = roadBounds(); return road.left + laneWidth() * (lane + 0.5); }
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }

function roundedRect(x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, radius);
}
function drawCar(x, y, w, h, paint, isPlayer = false) {
  ctx.save();
  ctx.translate(x, y);
  // soft neon shadow
  ctx.shadowColor = paint.body;
  ctx.shadowBlur = isPlayer ? 17 : 9;
  ctx.fillStyle = paint.body;
  roundedRect(-w / 2, -h / 2, w, h, w * 0.25);
  ctx.fill();
  ctx.shadowBlur = 0;
  // windshield and rear window
  ctx.fillStyle = paint.glass;
  roundedRect(-w * .30, -h * .29, w * .60, h * .25, w * .13);
  ctx.fill();
  ctx.fillStyle = 'rgba(20,25,48,.78)';
  roundedRect(-w * .30, h * .08, w * .60, h * .22, w * .1);
  ctx.fill();
  // center racing stripe
  ctx.fillStyle = paint.stripe;
  ctx.globalAlpha = .78;
  ctx.fillRect(-w * .045, -h * .42, w * .09, h * .84);
  ctx.globalAlpha = 1;
  // headlights / tail lights
  ctx.fillStyle = isPlayer ? '#f5ffff' : '#ffbdc9';
  ctx.fillRect(-w * .32, -h * .44, w * .18, h * .055);
  ctx.fillRect(w * .14, -h * .44, w * .18, h * .055);
  ctx.fillStyle = '#171827';
  ctx.fillRect(-w * .56, -h * .28, w * .13, h * .22);
  ctx.fillRect(w * .43, -h * .28, w * .13, h * .22);
  ctx.fillRect(-w * .56, h * .1, w * .13, h * .22);
  ctx.fillRect(w * .43, h * .1, w * .13, h * .22);
  ctx.restore();
}

function draw() {
  if (!width || !height) return;
  ctx.clearRect(0, 0, width, height);
  // roadside
  ctx.fillStyle = '#15231f';
  ctx.fillRect(0, 0, width, height);
  const road = roadBounds();
  ctx.fillStyle = '#292a38';
  ctx.fillRect(road.left, 0, road.right - road.left, height);
  // road edge strips
  ctx.fillStyle = '#f2e7bf';
  ctx.fillRect(road.left - 4, 0, 4, height);
  ctx.fillRect(road.right, 0, 4, height);
  // animated edge rumble strips
  const stripeH = 24;
  for (let y = -stripeH + (roadOffset % (stripeH * 2)); y < height; y += stripeH * 2) {
    ctx.fillStyle = '#ed5571';
    ctx.fillRect(road.left - 8, y, 4, stripeH);
    ctx.fillRect(road.right + 4, y, 4, stripeH);
  }
  // lane markings
  ctx.setLineDash([22, 21]);
  ctx.lineDashOffset = -roadOffset;
  ctx.strokeStyle = 'rgba(245,245,255,.56)';
  ctx.lineWidth = 2;
  for (let lane = 1; lane < laneCount; lane++) {
    const x = road.left + laneWidth() * lane;
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, height); ctx.stroke();
  }
  ctx.setLineDash([]);
  // trees / roadside lamps for motion
  for (let y = -10 + (roadOffset % 92); y < height + 30; y += 92) {
    for (const side of [-1, 1]) {
      const x = side < 0 ? road.left - 24 : road.right + 24;
      ctx.fillStyle = y % 184 < 90 ? '#48c88b' : '#30a873';
      ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#baf7dd'; ctx.globalAlpha = .45;
      ctx.beginPath(); ctx.arc(x - side * 3, y - 3, 2, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1;
    }
  }
  const carW = Math.min(42, laneWidth() * .52);
  const carH = carW * 1.65;
  for (const rival of rivals) drawCar(laneCenter(rival.lane), rival.y, carW, carH, rival.paint, false);
  drawCar(playerX, height * .79, carW * 1.04, carH * 1.04, { body: '#9472ff', glass: '#d9faff', stripe: '#ffffff' }, true);
}

function updateHud() {
  document.querySelector('#score').textContent = String(Math.floor(score));
  document.querySelector('#speed').textContent = String(Math.floor(currentSpeed() * 1.15));
  bestNode.textContent = String(best);
}
function currentSpeed() { return 170 + Math.min(elapsed * 5, 270); }
function movePlayer(direction) {
  if (!running) return;
  playerLane = clamp(playerLane + direction, 0, laneCount - 1);
  playTone(280, .035, .012);
}
function spawnRival() {
  const available = [0, 1, 2].filter(lane => !rivals.some(rival => rival.lane === lane && rival.y < 115));
  if (!available.length) return;
  const lane = available[Math.floor(Math.random() * available.length)];
  const paint = cars[Math.floor(Math.random() * cars.length)];
  const levelSpeed = Math.min(elapsed * 1.5, 100);
  rivals.push({ lane, y: -50, paint, speed: 175 + Math.random() * 95 + levelSpeed, passed: false });
}
function collision(rival) {
  const nearPlayer = Math.abs(rival.y - height * .79) < height * .115;
  return nearPlayer && rival.lane === playerLane;
}
function crash() {
  if (!running) return;
  running = false;
  cancelAnimationFrame(animationId);
  track.classList.remove('shake');
  // Restart animation so the shake plays on every collision.
  void track.offsetWidth;
  track.classList.add('shake');
  if (navigator.vibrate) {
    try { navigator.vibrate([100, 45, 180]); } catch { /* Vibration is not supported on every device. */ }
  }
  playCrashSound();
  badge.textContent = 'TO‘QNASHUV!';
  if (Math.floor(score) > best) {
    best = Math.floor(score);
    save(BEST_KEY, best);
  }
  updateHud();
  overlayIcon.textContent = '💥';
  overlayTitle.textContent = 'Poyga tugadi!';
  overlayText.textContent = `Siz ${Math.floor(score)} ochko to‘pladingiz. Raqiblarni quvib o‘tib, rekordingizni yangilang!`;
  startButton.innerHTML = 'QAYTA BOSHLASH <span>→</span>';
  overlay.classList.remove('hidden');
}
function gameFrame(timestamp) {
  if (!running) return;
  const dt = Math.min((timestamp - (lastFrame || timestamp)) / 1000, .04);
  lastFrame = timestamp;
  elapsed += dt;
  roadOffset = (roadOffset + currentSpeed() * dt) % 46;
  playerX += (laneCenter(playerLane) - playerX) * Math.min(1, dt * 13);
  spawnClock -= dt;
  if (spawnClock <= 0) {
    spawnRival();
    spawnClock = Math.max(.43, .95 - elapsed * .008) + Math.random() * .25;
  }
  const carH = Math.min(42, laneWidth() * .52) * 1.65;
  for (let index = rivals.length - 1; index >= 0; index--) {
    const rival = rivals[index];
    rival.y += Math.max(100, currentSpeed() - rival.speed) * dt;
    if (collision(rival)) { crash(); return; }
    if (!rival.passed && rival.y > height * .79 + carH) {
      rival.passed = true;
      score += 100;
      playTone(720, .09, .025);
    }
    if (rival.y > height + carH) rivals.splice(index, 1);
  }
  updateHud();
  draw();
  animationId = requestAnimationFrame(gameFrame);
}
function startGame() {
  cancelAnimationFrame(animationId);
  score = 0; elapsed = 0; playerLane = 1; playerX = laneCenter(playerLane);
  roadOffset = 0; spawnClock = .35; rivals = []; lastFrame = 0; running = true;
  badge.textContent = 'POYGA BOSHLANDI';
  overlay.classList.add('hidden');
  playTone(540, .12, .035);
  updateHud(); draw();
  animationId = requestAnimationFrame(gameFrame);
}
function playTone(frequency, duration = .08, volume = .025, type = 'sine') {
  if (!soundOn) return;
  try {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return;
    audioContext ||= new AudioCtor();
    if (audioContext.state === 'suspended') audioContext.resume();
    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const now = audioContext.currentTime;
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + .012);
    gain.gain.exponentialRampToValueAtTime(.0001, now + duration);
    oscillator.connect(gain); gain.connect(audioContext.destination);
    oscillator.start(now); oscillator.stop(now + duration + .01);
  } catch { /* Sound is optional. */ }
}
function playCrashSound() {
  playTone(115, .28, .07, 'sawtooth');
  window.setTimeout(() => playTone(78, .3, .06, 'triangle'), 90);
}
function bindDriveButton(button, direction) {
  button.addEventListener('pointerdown', event => { event.preventDefault(); button.classList.add('pressed'); movePlayer(direction); });
  for (const eventName of ['pointerup', 'pointercancel', 'pointerleave']) button.addEventListener(eventName, () => button.classList.remove('pressed'));
  button.addEventListener('click', event => event.preventDefault());
}
bindDriveButton(leftButton, -1);
bindDriveButton(rightButton, 1);
startButton.addEventListener('click', startGame);
soundButton.addEventListener('click', () => {
  soundOn = !soundOn;
  save(SOUND_KEY, soundOn ? 'on' : 'off');
  soundButton.setAttribute('aria-pressed', String(soundOn));
  soundButton.setAttribute('aria-label', `Ovoz ${soundOn ? 'yoqilgan' : 'o‘chirilgan'}, ${soundOn ? 'o‘chirish' : 'yoqish'} uchun bosing`);
  soundLabel.textContent = soundOn ? 'OVOZ YOQ' : 'OVOZ O‘CHIQ';
  soundButton.firstChild.textContent = soundOn ? '♪ ' : '♪̸ ';
  if (soundOn) playTone(660);
});
document.addEventListener('keydown', event => {
  if (['ArrowLeft', 'ArrowRight', 'Space'].includes(event.code)) event.preventDefault();
  if (event.repeat) return;
  if (event.code === 'ArrowLeft' || event.code === 'KeyA') movePlayer(-1);
  if (event.code === 'ArrowRight' || event.code === 'KeyD') movePlayer(1);
  if ((event.code === 'Enter' || event.code === 'Space') && !running) startGame();
});
window.addEventListener('resize', resizeCanvas);
soundButton.setAttribute('aria-pressed', String(soundOn));
soundLabel.textContent = soundOn ? 'OVOZ YOQ' : 'OVOZ O‘CHIQ';
soundButton.firstChild.textContent = soundOn ? '♪ ' : '♪̸ ';
bestNode.textContent = String(best);
resizeCanvas();
