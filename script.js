const area = document.querySelector('#game-area');
const targetsLayer = document.querySelector('#targets');
const effectsLayer = document.querySelector('#effects');
const scoreNode = document.querySelector('#score');
const timeNode = document.querySelector('#time');
const bestNode = document.querySelector('#best');
const progressNode = document.querySelector('#time-progress');
const overlay = document.querySelector('#overlay');
const overlayIcon = document.querySelector('#overlay-icon');
const overlayTitle = document.querySelector('#overlay-title');
const overlayText = document.querySelector('#overlay-text');
const startButton = document.querySelector('#start-button');
const soundButton = document.querySelector('#sound-button');
const soundLabel = document.querySelector('#sound-label');
const soundIcon = document.querySelector('#sound-icon');

const ROUND_SECONDS = 30;
const BEST_KEY = 'neon-catch-best-v2';
const SOUND_KEY = 'neon-catch-sound';
const colors = ['#67e8ff', '#ff76c8', '#ffd166', '#6ef0b8', '#ff6685', '#a88bff'];
let score = 0;
let timeLeft = ROUND_SECONDS;
let best = readStorage(BEST_KEY, 0);
let playing = false;
let paused = false;
let previousFrame = 0;
let elapsed = 0;
let nextSpawn = 0.4;
let targets = [];
let audioContext = null;
let soundEnabled = readStorage(SOUND_KEY, 'on') !== 'off';
let pauseButton;

function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : value;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  try { localStorage.setItem(key, String(value)); } catch { /* Storage is optional. */ }
}

function updateHud() {
  scoreNode.textContent = String(score);
  timeNode.textContent = String(Math.ceil(timeLeft));
  bestNode.textContent = String(best);
  progressNode.style.width = `${Math.max(0, (timeLeft / ROUND_SECONDS) * 100)}%`;
}

function setOverlay(icon, title, text, buttonText) {
  overlayIcon.textContent = icon;
  overlayTitle.textContent = title;
  overlayText.textContent = text;
  startButton.innerHTML = `${buttonText} <span aria-hidden="true">→</span>`;
  overlay.classList.remove('hidden');
}

function clearTargets() {
  targets.forEach((target) => target.element.remove());
  targets = [];
}

function getLevel() {
  return Math.floor(score / 50) + 1;
}

function spawnTarget() {
  const rect = area.getBoundingClientRect();
  const size = Math.round(38 + Math.random() * 22);
  const target = document.createElement('button');
  const color = colors[Math.floor(Math.random() * colors.length)];
  target.type = 'button';
  target.className = 'target';
  target.setAttribute('aria-label', 'Nishonni ushla: 10 ochko');
  target.style.width = `${size}px`;
  target.style.height = `${size}px`;
  target.style.left = `${Math.max(4, Math.random() * (rect.width - size - 8))}px`;
  target.style.top = `${-size}px`;
  target.style.color = color;
  target.style.background = `radial-gradient(circle at 30% 25%, #fff, ${color} 45%, ${color} 100%)`;

  const speed = 80 + getLevel() * 13 + Math.random() * 30;
  const item = { element: target, y: -size, size, speed, color };
  target.addEventListener('click', () => catchTarget(item));
  targetsLayer.appendChild(target);
  targets.push(item);
}

function catchTarget(item) {
  if (!playing || paused || !targets.includes(item)) return;
  const box = item.element.getBoundingClientRect();
  const areaBox = area.getBoundingClientRect();
  showPoints(box.left - areaBox.left + box.width / 2, box.top - areaBox.top, '+10');
  item.element.remove();
  targets = targets.filter((target) => target !== item);
  score += 10;
  updateHud();
  playSound('catch');
}

function showPoints(x, y, text) {
  const point = document.createElement('span');
  point.className = 'float-score';
  point.textContent = text;
  point.style.left = `${x}px`;
  point.style.top = `${y}px`;
  effectsLayer.appendChild(point);
  point.addEventListener('animationend', () => point.remove(), { once: true });
}

function playSound(type) {
  if (!soundEnabled) return;
  try {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return;
    audioContext ||= new AudioCtor();
    if (audioContext.state === 'suspended') audioContext.resume();
    const notes = type === 'catch' ? [660, 880] : type === 'start' ? [523, 784] : [392];
    notes.forEach((note, index) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const startAt = audioContext.currentTime + index * 0.045;
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(note, startAt);
      gain.gain.setValueAtTime(0.0001, startAt);
      gain.gain.exponentialRampToValueAtTime(0.035, startAt + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.11);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(startAt);
      oscillator.stop(startAt + 0.12);
    });
  } catch { /* The game works without audio. */ }
}

function addPauseControl() {
  if (pauseButton) return;
  const controls = document.createElement('div');
  controls.className = 'play-controls';
  pauseButton = document.createElement('button');
  pauseButton.type = 'button';
  pauseButton.className = 'pause-button';
  pauseButton.textContent = 'Ⅱ PAUZA';
  pauseButton.setAttribute('aria-label', 'O‘yinni pauza qilish');
  pauseButton.addEventListener('click', () => paused ? resumeGame() : pauseGame());
  controls.appendChild(pauseButton);
  area.appendChild(controls);
}

function removePauseControl() {
  area.querySelector('.play-controls')?.remove();
  pauseButton = null;
}

function startGame() {
  clearTargets();
  effectsLayer.replaceChildren();
  score = 0;
  timeLeft = ROUND_SECONDS;
  elapsed = 0;
  nextSpawn = 0.25;
  playing = true;
  paused = false;
  previousFrame = 0;
  addPauseControl();
  updateHud();
  overlay.classList.add('hidden');
  playSound('start');
  animationFrame = requestAnimationFrame(gameFrame);
}

let animationFrame = null;
function gameFrame(timestamp) {
  if (!playing || paused) return;
  if (!previousFrame) previousFrame = timestamp;
  const delta = Math.min((timestamp - previousFrame) / 1000, 0.05);
  previousFrame = timestamp;
  elapsed += delta;
  timeLeft = Math.max(0, ROUND_SECONDS - elapsed);
  nextSpawn -= delta;

  if (nextSpawn <= 0) {
    spawnTarget();
    nextSpawn = Math.max(0.34, 0.82 - getLevel() * 0.035) + Math.random() * 0.18;
  }

  const bottom = area.clientHeight;
  for (let index = targets.length - 1; index >= 0; index -= 1) {
    const item = targets[index];
    item.y += item.speed * delta;
    item.element.style.top = `${item.y}px`;
    if (item.y + item.size >= bottom) {
      item.element.remove();
      targets.splice(index, 1);
      elapsed = Math.min(ROUND_SECONDS, elapsed + 2);
      timeLeft = Math.max(0, ROUND_SECONDS - elapsed);
      showPoints(parseFloat(item.element.style.left) || 0, bottom - 25, '−2s');
    }
  }

  updateHud();
  if (timeLeft <= 0) {
    endGame();
    return;
  }
  animationFrame = requestAnimationFrame(gameFrame);
}

function pauseGame() {
  if (!playing || paused) return;
  paused = true;
  cancelAnimationFrame(animationFrame);
  pauseButton.textContent = '▶ DAVOM';
  pauseButton.setAttribute('aria-label', 'O‘yinni davom ettirish');
  setOverlay('⏸️', 'Pauza', `Hozirgi ochko: ${score}. Davom etishga tayyormisiz?`, 'DAVOM ETISH');
}

function resumeGame() {
  if (!playing || !paused) return;
  paused = false;
  previousFrame = 0;
  pauseButton.textContent = 'Ⅱ PAUZA';
  pauseButton.setAttribute('aria-label', 'O‘yinni pauza qilish');
  overlay.classList.add('hidden');
  animationFrame = requestAnimationFrame(gameFrame);
}

function endGame() {
  playing = false;
  paused = false;
  cancelAnimationFrame(animationFrame);
  clearTargets();
  removePauseControl();
  const newRecord = score > best;
  if (newRecord) {
    best = score;
    writeStorage(BEST_KEY, best);
  }
  updateHud();
  setOverlay(newRecord ? '🏆' : '✨', newRecord ? 'Yangi rekord!' : 'O‘yin tugadi!', `Natijangiz: ${score} ochko${newRecord ? ' — ajoyib!' : '. Yana urinib ko‘ring!'}`, 'QAYTA O‘YNASH');
}

startButton.addEventListener('click', () => {
  if (playing && paused) resumeGame();
  else startGame();
});

soundButton.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  writeStorage(SOUND_KEY, soundEnabled ? 'on' : 'off');
  soundButton.setAttribute('aria-pressed', String(soundEnabled));
  soundButton.setAttribute('aria-label', `Ovoz ${soundEnabled ? 'yoqilgan' : 'o‘chirilgan'}. ${soundEnabled ? 'O‘chirish' : 'Yoqish'} uchun bosing`);
  soundLabel.textContent = soundEnabled ? 'OVOZ YOQ' : 'OVOZ O‘CHIQ';
  soundIcon.textContent = soundEnabled ? '♪' : '♪̸';
  if (soundEnabled) playSound('start');
});

document.addEventListener('keydown', (event) => {
  if (event.code === 'Space' && !event.repeat) {
    event.preventDefault();
    if (!playing) startGame();
    else if (paused) resumeGame();
    else pauseGame();
  }
  if (event.key === 'Escape' && playing && !paused) pauseGame();
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && playing && !paused) pauseGame();
});

soundButton.setAttribute('aria-pressed', String(soundEnabled));
soundButton.setAttribute('aria-label', `Ovoz ${soundEnabled ? 'yoqilgan' : 'o‘chirilgan'}. ${soundEnabled ? 'O‘chirish' : 'Yoqish'} uchun bosing`);
soundLabel.textContent = soundEnabled ? 'OVOZ YOQ' : 'OVOZ O‘CHIQ';
soundIcon.textContent = soundEnabled ? '♪' : '♪̸';
bestNode.textContent = String(best);
updateHud();
