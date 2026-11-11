const resultEl = document.querySelector('#result');
const expressionEl = document.querySelector('#expression');
const keys = document.querySelector('#keys');

let display = '0';
let storedValue = null;
let pendingOperator = null;
let waitingForInput = false;
let finishedCalculation = false;

function render() {
  resultEl.textContent = display;
  expressionEl.textContent = pendingOperator && storedValue !== null
    ? `${formatNumber(storedValue)} ${pendingOperator}`
    : '\u00a0';
}

function formatNumber(number) {
  if (!Number.isFinite(number)) return 'Xato';
  return String(Number(number.toPrecision(11)));
}

function enterDigit(digit) {
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
    case '%': return left * right / 100;
    default: return right;
  }
}

function chooseOperator(operator) {
  if (display === 'Xato') return;
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
  expressionEl.textContent = `${formatNumber(left)} ${operator} ${formatNumber(right)} =`;
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
  render();
}

function deleteLast() {
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
  display = display.startsWith('-') ? display.slice(1) : `-${display}`;
  render();
}

function percent() {
  if (display === 'Xato') return;
  display = formatNumber(Number(display) / 100);
  waitingForInput = false;
  finishedCalculation = false;
  render();
}

keys.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;

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

document.addEventListener('keydown', (event) => {
  if (/^[0-9]$/.test(event.key)) enterDigit(event.key);
  else if (event.key === '.' || event.key === ',') enterDecimal();
  else if (event.key === 'Enter' || event.key === '=') { event.preventDefault(); showAnswer(); }
  else if (event.key === 'Backspace') deleteLast();
  else if (event.key === 'Escape') clearAll();
  else if (event.key === '+') chooseOperator('+');
  else if (event.key === '-') chooseOperator('−');
  else if (event.key === '*') chooseOperator('×');
  else if (event.key === '/') { event.preventDefault(); chooseOperator('÷'); }
  else if (event.key === '%') percent();
});

render();
