const resultEl = document.getElementById('result');
const expressionEl = document.getElementById('expression');
const keys = document.getElementById('keys');
const soundToggle = document.getElementById('sound-toggle');

let display = '0';
let storedValue = null;
let pendingOperator = null;
let waitingForInput = false;
let finishedCalculation = false;
let expressionText = '';
let soundEnabled = true;
let audioContext = null;

function render() {
  resultEl.textContent = display;
  expressionEl.textContent = expressionText || (pendingOperator && storedValue !== null ? `${formatNumber(storedValue)} ${pendingOperator}` : '\u00a0');
}

function formatNumber(num) {
  if (!Number.isFinite(num)) return 'Error';
  return String(Number(num.toPrecision(11)));
}

function playTone(freq, duration, volume = 0.03, wave = 'sine') {
  if (!soundEnabled) return;
  try {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return;
    audioContext ??= new AudioCtor();
    if (audioContext.state === 'suspended') audioContext.resume();

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const now = audioContext.currentTime;

    oscillator.type = wave;
    oscillator.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + duration);
  } catch {
    // no-op if browser blocks audio
  }
}

function playClickSound(type = 'tap') {
  if (!soundEnabled) return;
  const map = {
    tap: [260, 420],
    operator: [420, 540],
    equals: [630, 840, 990],
    clear: [200, 160]
  };
  const tones = map[type] || map.tap;
  tones.forEach((freq, index) => {
    setTimeout(() => playTone(freq, 0.09, type === 'equals' ? 0.05 : 0.035), index * 40);
  });
}

function appendDigit(val) {
  expressionText = '';
  if (display === 'Error' || waitingForInput || finishedCalculation) {
    display = val;
    waitingForInput = false;
    finishedCalculation = false;
  } else if (display === '0') {
    display = val;
  } else if (display.replace('-', '').replace('.', '').length < 14) {
    display += val;
  }
  render();
}

function appendDecimal() {
  expressionText = '';
  if (display === 'Error' || waitingForInput || finishedCalculation) {
    display = '0.';
    waitingForInput = false;
    finishedCalculation = false;
  } else if (!display.includes('.')) {
    display += '.';
  }
  render();
}

function calculate(left, right, operator) {
  switch (operator) {
    case '+': return left + right;
    case '−': return left - right;
    case '×': return left * right;
    case '÷': return right === 0 ? NaN : left / right;
    case '%': return (left * right) / 100;
    default: return right;
  }
}

function chooseOperator(op) {
  if (display === 'Error') return;
  const current = Number(display);
  if (pendingOperator && !waitingForInput) {
    const result = calculate(storedValue, current, pendingOperator);
    display = formatNumber(result);
    storedValue = Number.isFinite(result) ? result : null;
  } else if (storedValue === null || !waitingForInput) {
    storedValue = current;
  }
  pendingOperator = op;
  waitingForInput = true;
  finishedCalculation = false;
  expressionText = '';
  render();
}

function showResult() {
  if (!pendingOperator || storedValue === null || display === 'Error') return;
  const left = storedValue;
  const op = pendingOperator;
  const right = Number(display);
  const result = calculate(left, right, op);

  expressionText = `${formatNumber(left)} ${op} ${formatNumber(right)} =`;
  display = formatNumber(result);
  storedValue = null;
  pendingOperator = null;
  waitingForInput = true;
  finishedCalculation = true;
  render();
}

function clearAll() {
  display = '0';
  storedValue = null;
  pendingOperator = null;
  waitingForInput = false;
  finishedCalculation = false;
  expressionText = '';
  render();
}

function deleteLast() {
  expressionText = '';
  if (display === 'Error' || waitingForInput || finishedCalculation) {
    display = '0';
    waitingForInput = false;
    finishedCalculation = false;
  } else {
    display = display.length > 1 ? display.slice(0, -1) : '0';
    if (display === '-') display = '0';
  }
  render();
}

function toggleSign() {
  if (display === '0' || display === 'Error') return;
  expressionText = '';
  display = display.startsWith('-') ? display.slice(1) : `-${display}`;
  render();
}

function handleButton(button) {
  button.classList.add('pressed');
  setTimeout(() => button.classList.remove('pressed'), 120);

  if (button.dataset.number !== undefined) {
    playClickSound('tap');
    appendDigit(button.dataset.number);
    return;
  }

  if (button.dataset.op) {
    playClickSound('operator');
    chooseOperator(button.dataset.op);
    return;
  }

  const action = button.dataset.action;
  const soundType = action === 'equals' ? 'equals' : action === 'clear' ? 'clear' : 'tap';
  playClickSound(soundType);

  switch (action) {
    case 'clear': clearAll(); break;
    case 'delete': deleteLast(); break;
    case 'decimal': appendDecimal(); break;
    case 'sign': toggleSign(); break;
    case 'equals': showResult(); break;
  }
}

keys.addEventListener('click', (event) => {
  const btn = event.target.closest('button');
  if (!btn) return;
  handleButton(btn);
});

soundToggle.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  soundToggle.setAttribute('aria-pressed', String(soundEnabled));
  soundToggle.querySelector('.sound-text').textContent = soundEnabled ? 'ON' : 'OFF';
  soundToggle.querySelector('.sound-icon').textContent = soundEnabled ? '♪' : '🔇';
  if (soundEnabled) playClickSound('tap');
});

document.addEventListener('keydown', (event) => {
  if (/^[0-9]$/.test(event.key)) { playClickSound('tap'); appendDigit(event.key); }
  else if (event.key === '.' || event.key === ',') { playClickSound('tap'); appendDecimal(); }
  else if (event.key === 'Enter' || event.key === '=') { event.preventDefault(); playClickSound('equals'); showResult(); }
  else if (event.key === 'Backspace') { playClickSound('tap'); deleteLast(); }
  else if (event.key === 'Escape') { playClickSound('clear'); clearAll(); }
  else if (event.key === '+') { playClickSound('operator'); chooseOperator('+'); }
  else if (event.key === '-') { playClickSound('operator'); chooseOperator('−'); }
  else if (event.key === '*') { playClickSound('operator'); chooseOperator('×'); }
  else if (event.key === '/') { event.preventDefault(); playClickSound('operator'); chooseOperator('÷'); }
  else if (event.key === '%') { playClickSound('operator'); chooseOperator('%'); }
});

render();
