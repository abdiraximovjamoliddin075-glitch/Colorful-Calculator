const resultEl = document.querySelector('#result');
const expressionEl = document.querySelector('#expression');
const keys = document.querySelector('#keys');
const soundToggle = document.querySelector('#sound-toggle');
const soundIcon = document.querySelector('#sound-icon');
const soundLabel = document.querySelector('#sound-label');

let display = '0';
let storedValue = null;
let pendingOperator = null;
let waitingForInput = false;
let finishedCalculation = false;
let expressionMessage = '';
let soundEnabled = true;
let audioContext = null;

function render() {
  resultEl.textContent = display;
  expressionEl.textContent = expressionMessage || (pendingOperator && storedValue !== null
    ? `${formatNumber(storedValue)} ${pendingOperator}`
    : '\u00a0');
}

function formatNumber(number) {
  if (!Number.isFinite(number)) return 'Xato';
  return String(Number(number.toPrecision(11)));
}

// Browser audio starts only after a user action; no sound files or downloads are needed.
function playClickSound(kind = 'tap') {
  if (!soundEnabled) return;
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    audioContext ||= new AudioContextClass();
    if (audioContext.state === 'suspended') audioContext.resume();

    const now = audioContext.currentTime;
    const frequencies = kind === 'equals' ? [660, 880] : kind === 'operator' ? [520] : [620];
    frequencies.forEach((frequency, index) => {
      const oscillator = audioContext.createOscillator();
      const gain = audioContext.createGain();
      const start = now + index * 0.065;
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(frequency, start);
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(kind === 'equals' ? 0.075 : 0.045, start + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.13);
      oscillator.connect(gain);
      gain.connect(audioContext.destination);
      oscillator.start(start);
      oscillator.stop(start + 0.14);
    });
  } catch {
    // The calculator remains usable if audio is unavailable or blocked by the browser.
  }
}

function enterDigit(digit) {
  expressionMessage = '';
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

function enterDecimal() {
  expressionMessage = '';
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
  expressionMessage = '';
  const value = Number(display);
  if (pendingOperator && !waitingForInput) {
    const answer = calculate(storedValue, value, pendingOperator);
    display = formatNumber(answer);
    storedValue = Number.isFinite(answer) ? answer : null;
  } else if (storedValue === null || !waitingForInput) {
    storedValue = value;
  }
  pendingOperator = operator;
  waitingForInput = true;
  finishedCalculation = false;
  render();
}

function showAnswer() {
  if (!pendingOperator || storedValue === null || display === 'Xato') return;
  const left = storedValue;
  const operator = pendingOperator;
  const right = Number(display);
  const answer = calculate(left, right, operator);
  expressionMessage = `${formatNumber(left)} ${operator} ${formatNumber(right)} =`;
  display = formatNumber(answer);
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
  expressionMessage = '';
  render();
}

function deleteLast() {
  expressionMessage = '';
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
  expressionMessage = '';
  display = display.startsWith('-') ? display.slice(1) : `-${display}`;
  render();
}

function percent() {
  if (display === 'Xato') return;
  expressionMessage = '';
  display = formatNumber(Number(display) / 100);
  waitingForInput = false;
  finishedCalculation = false;
  render();
}

keys.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  button.classList.add('pressed');
  window.setTimeout(() => button.classList.remove('pressed'), 120);
  playClickSound(button.dataset.action === 'equals' ? 'equals' : button.dataset.op && button.dataset.op !== '%' ? 'operator' : 'tap');

  if (button.dataset.number !== undefined) enterDigit(button.dataset.number);
  else if (button.dataset.op === '%') percent();
  else if (button.dataset.op) chooseOperator(button.dataset.op);
  else {
    switch (button.dataset.action) {
      case 'clear': clearAll(); break;
      case 'delete': deleteLast(); break;
      case 'decimal': enterDecimal(); break;
      case 'sign': toggleSign(); break;
      case 'equals': showAnswer(); break;
    }
  }
});

soundToggle.addEventListener('click', () => {
  soundEnabled = !soundEnabled;
  soundToggle.setAttribute('aria-pressed', String(soundEnabled));
  soundToggle.setAttribute('aria-label', soundEnabled ? 'Tugma ovozini o‘chirish' : 'Tugma ovozini yoqish');
  soundIcon.textContent = soundEnabled ? '♪' : '♪̸';
  soundLabel.textContent = soundEnabled ? 'Ovoz yoqilgan' : 'Ovoz o‘chirilgan';
  if (soundEnabled) playClickSound('tap');
});

document.addEventListener('keydown', (event) => {
  if (/^[0-9]$/.test(event.key)) { playClickSound(); enterDigit(event.key); }
  else if (event.key === '.' || event.key === ',') { playClickSound(); enterDecimal(); }
  else if (event.key === 'Enter' || event.key === '=') { event.preventDefault(); playClickSound('equals'); showAnswer(); }
  else if (event.key === 'Backspace') { playClickSound(); deleteLast(); }
  else if (event.key === 'Escape') { playClickSound(); clearAll(); }
  else if (event.key === '+') { playClickSound('operator'); chooseOperator('+'); }
  else if (event.key === '-') { playClickSound('operator'); chooseOperator('−'); }
  else if (event.key === '*') { playClickSound('operator'); chooseOperator('×'); }
  else if (event.key === '/') { event.preventDefault(); playClickSound('operator'); chooseOperator('÷'); }
  else if (event.key === '%') { playClickSound(); percent(); }
});

render();
