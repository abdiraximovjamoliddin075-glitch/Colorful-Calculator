const gameArea = document.getElementById('game-area');
const scoreEl = document.getElementById('score');
const timeEl = document.getElementById('time');
const bestEl = document.getElementById('best');
const startBtn = document.getElementById('start-btn');
const messageEl = document.getElementById('message');

let score = 0;
let timeLeft = 30;
let best = Number(localStorage.getItem('neon-best') || 0);
let playing = false;
let spawnTimer = 0;
let animationFrame = null;
let targets = [];

bestEl.textContent = best;

function updateHud() {
  scoreEl.textContent = score;
  timeEl.textContent = timeLeft;
  bestEl.textContent = best;
}

function showMessage(text, visible = true) {
  messageEl.textContent = text;
  messageEl.classList.toggle('visible', visible);
}

function randomBetween(min, max) {
  return Math.random() * (max - min) + min;
}

function createTarget() {
  const target = document.createElement('button');
  target.type = 'button';
  target.className = 'target';

  const size = randomBetween(32, 72);
  const x = randomBetween(8, gameArea.clientWidth - size - 8);
  const y = -size;
  const colors = ['#6ee7ff', '#ff76c8', '#ffd166', '#6ef0b8', '#ff5d7a'];
  const color = colors[Math.floor(Math.random() * colors.length)];

  target.style.width = `${size}px`;
  target.style.height = `${size}px`;
  target.style.left = `${x}px`;
  target.style.top = `${y}px`;
  target.style.color = color;
  target.style.background = `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.8), ${color})`;

  const speed = randomBetween(1.8, 3.2);
  target.dataset.speed = speed;
  target.dataset.size = size;

  target.addEventListener('click', () => {
    if (!playing) return;
    score += 10;
    target.remove();
    updateHud();
    playTap();
  });

  gameArea.appendChild(target);
  targets.push(target);
}

function removeTarget(target) {
  targets = targets.filter(item => item !== target);
  target.remove();
}

function playTap() {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gain = audioContext.createGain();
  oscillator.type = 'triangle';
  oscillator.frequency.value = 660;
  gain.gain.value = 0.04;
  oscillator.connect(gain);
  gain.connect(audioContext.destination);
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 0.08);
}

function updateTargets() {
  const now = performance.now();
  for (let i = targets.length - 1; i >= 0; i--) {
    const target = targets[i];
    const speed = Number(target.dataset.speed || 2);
    const top = Number.parseFloat(target.style.top || '0');
    const size = Number(target.dataset.size || 40);
    const nextTop = top + speed;
    target.style.top = `${nextTop}px`;

    if (nextTop + size >= gameArea.clientHeight) {
      removeTarget(target);
      if (playing) {
        timeLeft = Math.max(0, timeLeft - 3);
        if (timeLeft <= 0) {
          endGame();
          return;
        }
      }
    }
  }

  if (playing) {
    spawnTimer -= 1;
    if (spawnTimer <= 0) {
      createTarget();
      spawnTimer = 30 + Math.floor(Math.random() * 18);
    }
  }
}

function loop() {
  if (!playing) return;

  updateTargets();
  animationFrame = requestAnimationFrame(loop);
}

function endGame() {
  playing = false;
  cancelAnimationFrame(animationFrame);
  best = Math.max(best, score);
  localStorage.setItem('neon-best', String(best));
  bestEl.textContent = best;
  showMessage(`GAME OVER\nSCORE: ${score}`, true);
  startBtn.textContent = 'PLAY AGAIN';
  for (const target of [...targets]) removeTarget(target);
}

function startGame() {
  score = 0;
  timeLeft = 30;
  playing = true;
  spawnTimer = 20;
  startBtn.textContent = 'PLAYING...';
  showMessage('', false);

  for (const target of [...targets]) removeTarget(target);
  updateHud();

  const countdown = setInterval(() => {
    if (!playing) {
      clearInterval(countdown);
      return;
    }

    timeLeft -= 1;
    updateHud();

    if (timeLeft <= 0) {
      clearInterval(countdown);
      endGame();
    }
  }, 1000);

  animationFrame = requestAnimationFrame(loop);
}

startBtn.addEventListener('click', () => {
  if (playing) return;
  startGame();
});

window.addEventListener('resize', () => {
  for (const target of [...targets]) {
    const x = Number.parseFloat(target.style.left || '0');
    const maxX = gameArea.clientWidth - Number(target.dataset.size || 40) - 8;
    if (x > maxX) target.style.left = `${maxX}px`;
  }
});

updateHud();
showMessage('START BOSISH UCHUN TUGMAGA Bosing', true);
