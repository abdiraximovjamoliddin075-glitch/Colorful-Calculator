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
  expressionEl.textContent = expressionText || (pendingOperator && storedValue !== null
    ? `${formatNumber(storedValue)} ${pendingOperator}`
    : '\u00a0');
}

function formatNumber(number) {
  if (!Number.isFinite(number)) return 'Xato';
  return String(Number(number.toPrecision(11)));
}

function playTone(frequency, duration = 0.1, volume = 0.035) {
  if (!soundEnabled) return;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    audioContext ||= new AudioContextClass();
    if (audioContext.state === 'suspended') audioContext.resume();

    const oscillator = audioContext.createOscillator();
    const gain = audioContext.createGain();
    const now = audioContext.currentTime;
    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(audioContext.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.01);
  } catch {
    // Sound is optional; calculator functions still work if the browser blocks audio.
  }
}

function playClickSound(type = 'tap') {
  const tones = {
    tap: [440],
    operator: [523],
    equals: [659, 784, 988],
    clear: [392, 330]
  }[type] || [440];
  tones.forEach((frequency, index) => {
    window.setTimeout(() => playTone(frequency, 0.11, type === 'equals' ? 0.045 : 0.03), index * 55);
  });
}

function appendDigit(digit) {
  expressionText = '';
  if (display === 'Xato' || waitingForInput || finishedCalculation) {
    display = digit;
    waitingForInput = false;
    finishedCalculation = false;
  } else if (display === '0') {
    display = digit;
  } else if (display.replace('-', '').replace('.', '').length < 14) {
    display += digit;
  }
  render();
}

function appendDecimal() {
  expressionText = '';
  if (display === 'Xato' || waitingForInput || finishedCalculation) {
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
    default: return right;
  }
}

function chooseOperator(operator) {
  if (display === 'Xato') return;
  expressionText = '';
  const currentValue = Number(display);
  if (pendingOperator && !waitingForInput) {
    const answer = calculate(storedValue, currentValue, pendingOperator);
    display = formatNumber(answer);
    storedValue = Number.isFinite(answer) ? answer : null;
  } else if (storedValue === null || !waitingForInput) {
    storedValue = currentValue;
  }
  pendingOperator = operator;
  waitingForInput = true;
  finishedCalculation = false;
  render();
}

function showResult() {
  if (!pendingOperator || storedValue === null || display === 'Xato') return;
  const left = storedValue;
  const operator = pendingOperator;
  const right = Number(display);
  const answer = calculate(left, right, operator);
  expressionText = `${formatNumber(left)} ${operator} ${formatNumber(right)} =`;
  display = formatNumber(answer);
  storedValue = null;
  pendingOperator = null;
  waitingForInput = true;
  finishedCalculation = true;
  render();
}

function applyPercent() {
  if (display === 'Xato') return;
  expressionText = '';
  display = formatNumber(Number(display) / 100);
  waitingForInput = false;
  finishedCalculation = false;
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
  if (display === 'Xato' || waitingForInput || finishedCalculation) {
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
  if (display === '0' || display === 'Xato') return;
  expressionText = '';
  display = display.startsWith('-') ? display.slice(1) : `-${display}`;
  render();
}

function handleButton(button) {
  button.classList.add('pressed');
  window.setTimeout(() => button.classList.remove('pressed'), 120);

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
  playClickSound(action === 'equals' ? 'equals' : action === 'clear' ? 'clear' : 'tap');
  switch (action) {
    case 'clear': clearAll(); break;
    case 'delete': deleteLast(); break;
    case 'decimal': appendDecimal(); break;
    case 'percent': applyPercent(); break;
    case 'sign': toggleSign(); break;
    case 'equals': showResult(); break;
  }
}

keys.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (button) handleButton(button);
});

soundToggle.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  soundToggle.setAttribute('aria-pressed', String(soundEnabled));
  soundToggle.setAttribute('aria-label', soundEnabled ? 'Tugma ovozini o‘chirish' : 'Tugma ovozini yoqish');
  soundToggle.querySelector('.sound-text').textContent = soundEnabled ? 'OVOZ YOQ' : 'OVOZ O‘CHIQ';
  soundToggle.querySelector('.sound-icon').textContent = soundEnabled ? '♪' : '♪̸';
  if (soundEnabled) playClickSound('tap');
});

document.addEventListener('keydown', (event) => {
  if (/^[0-9]$/.test(event.key)) { playClickSound('tap'); appendDigit(event.key); }
  else if (event.key === '.' || event.key === ',') { playClickSound('tap'); appendDecimal(); }
  else if (event.key === 'Enter' || event.key === '=') { event.preventDefault(); playClickSound('equals'); showResult(); }
  else if (event.key === 'Backspace') { playClickSound('tap'); deleteLast(); }
  else if (event.key === 'Escape' || event.key === 'Delete') { playClickSound('clear'); clearAll(); }
  else if (event.key === '%') { playClickSound('tap'); applyPercent(); }
  else if (event.key === '+') { playClickSound('operator'); chooseOperator('+'); }
  else if (event.key === '-') { playClickSound('operator'); chooseOperator('−'); }
  else if (event.key === '*') { playClickSound('operator'); chooseOperator('×'); }
  else if (event.key === '/') { event.preventDefault(); playClickSound('operator'); chooseOperator('÷'); }
});

render();
