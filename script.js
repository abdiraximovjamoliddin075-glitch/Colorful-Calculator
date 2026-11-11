const resultEl = document.getElementById('result');
const expressionEl = document.getElementById('expression');
const buttons = document.getElementById('buttons');
const soundToggle = document.getElementById('sound-toggle');

let display = '0';
let storedValue = null;
let pendingOperator = null;
let waitingForInput = false;
let expressionText = '';
let soundEnabled = true;
let audioContext = null;

function render() {
  resultEl.textContent = display;
  expressionEl.textContent = expressionText || (pendingOperator && storedValue !== null
    ? `${formatNumber(storedValue)} ${pendingOperator}`
    : '\u00a0');
}

function formatNumber(value) {
  if (!Number.isFinite(value)) return 'Xato';
  return String(Number(value.toPrecision(11)));
}

function playTone(freq, duration = 0.1, volume = 0.035) {
  if (!soundEnabled) return;
  try {
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return;
    audioContext ||= new AudioCtor();
    if (audioContext.state === 'suspended') audioContext.resume();

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const now = audioContext.currentTime;

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
  } catch {
    // Audio is optional
  }
}

function playSound(type = 'tap') {
  if (!soundEnabled) return;
  const tones = {
    tap: [420],
    operator: [540],
    equals: [660, 820, 980],
    clear: [350, 280]
  };

  (tones[type] || tones.tap).forEach((freq, index) => {
    setTimeout(() => playTone(freq, type === 'equals' ? 0.12 : 0.09, type === 'equals' ? 0.05 : 0.03), index * 50);
  });
}

function appendDigit(digit) {
  expressionText = '';
  if (display === 'Xato' || waitingForInput) {
    display = digit;
    waitingForInput = false;
  } else if (display === '0') {
    display = digit;
  } else if (display.replace('-', '').replace('.', '').length < 14) {
    display += digit;
  }
  render();
}

function appendDecimal() {
  expressionText = '';
  if (display === 'Xato' || waitingForInput) {
    display = '0.';
    waitingForInput = false;
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
    default: return right;
  }
}

function chooseOperator(operator) {
  if (display === 'Xato') return;
  expressionText = '';
  const current = Number(display);

  if (pendingOperator && !waitingForInput) {
    const result = calculate(storedValue, current, pendingOperator);
    display = formatNumber(result);
    storedValue = Number.isFinite(result) ? result : null;
  } else if (storedValue === null || !waitingForInput) {
    storedValue = current;
  }

  pendingOperator = operator;
  waitingForInput = true;
  render();
}

function evaluate() {
  if (!pendingOperator || storedValue === null || display === 'Xato') return;
  const left = storedValue;
  const operator = pendingOperator;
  const right = Number(display);
  const total = calculate(left, right, operator);

  expressionText = `${formatNumber(left)} ${operator} ${formatNumber(right)} =`;
  display = formatNumber(total);
  storedValue = null;
  pendingOperator = null;
  waitingForInput = true;
  render();
}

function toggleSign() {
  if (display === '0' || display === 'Xato') return;
  expressionText = '';
  display = display.startsWith('-') ? display.slice(1) : `-${display}`;
  render();
}

function applyPercent() {
  if (display === 'Xato') return;
  expressionText = '';
  display = formatNumber(Number(display) / 100);
  render();
}

function clearAll() {
  display = '0';
  storedValue = null;
  pendingOperator = null;
  waitingForInput = false;
  expressionText = '';
  render();
}

function deleteLast() {
  expressionText = '';
  if (display === 'Xato' || waitingForInput) {
    display = '0';
    waitingForInput = false;
  } else {
    display = display.length > 1 ? display.slice(0, -1) : '0';
  }
  render();
}

buttons.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;

  button.classList.add('pressed');
  setTimeout(() => button.classList.remove('pressed'), 120);

  if (button.dataset.number !== undefined) {
    playSound('tap');
    appendDigit(button.dataset.number);
    return;
  }

  if (button.dataset.op) {
    playSound('operator');
    chooseOperator(button.dataset.op);
    return;
  }

  const action = button.dataset.action;
  playSound(action === 'equals' ? 'equals' : action === 'clear' ? 'clear' : 'tap');

  switch (action) {
    case 'clear': clearAll(); break;
    case 'delete': deleteLast(); break;
    case 'decimal': appendDecimal(); break;
    case 'sign': toggleSign(); break;
    case 'percent': applyPercent(); break;
    case 'equals': evaluate(); break;
  }
});

soundToggle.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  soundToggle.setAttribute('aria-pressed', String(soundEnabled));
  soundToggle.querySelector('.sound-label').textContent = soundEnabled ? 'ON' : 'OFF';
  soundToggle.querySelector('.sound-icon').textContent = soundEnabled ? '♪' : '🔇';
  if (soundEnabled) playSound('tap');
});

document.addEventListener('keydown', (event) => {
  if (/^[0-9]$/.test(event.key)) { playSound('tap'); appendDigit(event.key); }
  else if (event.key === '.' || event.key === ',') { playSound('tap'); appendDecimal(); }
  else if (event.key === 'Enter' || event.key === '=') { event.preventDefault(); playSound('equals'); evaluate(); }
  else if (event.key === 'Backspace') { playSound('tap'); deleteLast(); }
  else if (event.key === 'Escape') { playSound('clear'); clearAll(); }
  else if (event.key === '%') { playSound('tap'); applyPercent(); }
  else if (event.key === '+') { playSound('operator'); chooseOperator('+'); }
  else if (event.key === '-') { playSound('operator'); chooseOperator('−'); }
  else if (event.key === '*') { playSound('operator'); chooseOperator('×'); }
  else if (event.key === '/') { event.preventDefault(); playSound('operator'); chooseOperator('÷'); }
});

render();
