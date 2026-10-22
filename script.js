
const inputBox = document.getElementById('inputBox');
const buttons = document.querySelectorAll('button');

let currentInput = '';
let justCalculated = false;

// Display
function updateDisplay(value) {
    inputBox.value = value;
}

// Format result
function formatResult(value) {
    if (!Number.isFinite(value)) {
        throw new Error('Invalid calculation');
    }

    if (Object.is(value, -0)) value = 0;

    return Number(value.toPrecision(12)).toString();
}

// Add implicit multiplication:
// 2(3+4) -> 2*(3+4)
// (2+3)4 -> (2+3)*4
// 2π -> 2*π
function prepareExpression(expression) {
    return expression
        .replace(/×/g, '*')
        .replace(/÷/g, '/')
        .replace(/[−–]/g, '-')
        .replace(/π/g, 'pi')
        .replace(/√\(/g, 'sqrt(')
        .replace(/√(\d+(?:\.\d+)?)/g, 'sqrt($1)')
        .replace(/(\d|\)|pi)(?=\()/g, '$1*')
        .replace(/(\))(?=(\d|pi|sqrt))/g, '$1*')
        .replace(/(\d)(?=pi|sqrt)/g, '$1*');
}

// Tokenize mathematical expression
function tokenize(expression) {
    const tokens = [];
    let i = 0;

    while (i < expression.length) {
        const rest = expression.slice(i);

        if (/^\s/.test(rest)) {
            i++;
            continue;
        }

        const number = rest.match(/^(?:\d+\.?\d*|\.\d+)(?:e[+-]?\d+)?/i);

        if (number) {
            tokens.push({ type: 'number', value: Number(number[0]) });
            i += number[0].length;
            continue;
        }

        const identifier = rest.match(/^[a-zA-Z]+/);

        if (identifier) {
            const name = identifier[0].toLowerCase();

            if (name !== 'sqrt' && name !== 'pi') {
                throw new Error('Unknown function');
            }

            tokens.push({ type: 'name', value: name });
            i += identifier[0].length;
            continue;
        }

        const char = expression[i];

        if ('+-*/%^()'.includes(char)) {
            tokens.push({ type: char, value: char });
            i++;
            continue;
        }

        throw new Error('Invalid character');
    }

    return tokens;
}

// Parse expression using mathematical precedence
function calculate(expression) {
    try {
        if (!expression.trim()) return '';

        const prepared = prepareExpression(expression);
        const tokens = tokenize(prepared);
        let position = 0;

        function peek() {
            return tokens[position];
        }

        function match(type) {
            if (peek()?.type === type) {
                position++;
                return true;
            }

            return false;
        }

        function expect(type) {
            if (!match(type)) {
                throw new Error('Invalid expression');
            }
        }

        // Addition and subtraction
        function parseExpression() {
            let value = parseTerm();

            while (peek()?.type === '+' || peek()?.type === '-') {
                const operator = tokens[position++].type;
                const right = parseTerm();

                value = operator === '+'
                    ? value + right
                    : value - right;
            }

            return value;
        }

        // Multiplication, division and remainder
        function parseTerm() {
            let value = parseUnary();

            while (
                peek()?.type === '*' ||
                peek()?.type === '/' ||
                peek()?.type === '%'
            ) {
                const operator = tokens[position++].type;
                const right = parseUnary();

                if (operator === '*') {
                    value *= right;
                } else if (operator === '/') {
                    if (right === 0) throw new Error('Division by zero');
                    value /= right;
                } else {
                    if (right === 0) throw new Error('Division by zero');
                    value %= right;
                }
            }

            return value;
        }

        // Unary plus and minus
        function parseUnary() {
            if (match('+')) return parseUnary();
            if (match('-')) return -parseUnary();

            return parsePower();
        }

        // Exponents: right-associative
        function parsePower() {
            let value = parsePrimary();

            if (match('^')) {
                value = Math.pow(value, parseUnary());
            }

            return value;
        }

        // Numbers, brackets, pi and square root
        function parsePrimary() {
            if (match('number')) {
                return tokens[position - 1].value;
            }

            if (match('(')) {
                const value = parseExpression();
                expect(')');
                return value;
            }

            if (match('name')) {
                const name = tokens[position - 1].value;

                if (name === 'pi') return Math.PI;

                expect('(');
                const value = parseExpression();
                expect(')');

                if (value < 0) throw new Error('Invalid square root');

                return Math.sqrt(value);
            }

            throw new Error('Invalid expression');
        }

        const result = parseExpression();

        if (position !== tokens.length) {
            throw new Error('Invalid expression');
        }

        return formatResult(result);
    } catch (error) {
        return 'Error';
    }
}

// Button handling
function handleInput(text) {
    const operators = ['+', '-', '*', '/', '%', '^'];

    if (text === 'AC') {
        currentInput = '';
        justCalculated = false;
        updateDisplay('');
        return;
    }

    if (text === 'DEL') {
        if (justCalculated) {
            currentInput = '';
            justCalculated = false;
        } else {
            currentInput = currentInput.slice(0, -1);
        }

        updateDisplay(currentInput);
        return;
    }

    if (text === '=') {
        if (!currentInput.trim()) return;

        const result = calculate(currentInput);
        currentInput = result === 'Error' ? '' : result;
        justCalculated = true;
        updateDisplay(result);
        return;
    }

    if (text === '√') text = 'sqrt(';

    if (text === 'sqrt(') {
        if (justCalculated) currentInput = '';
        currentInput += text;
        justCalculated = false;
        updateDisplay(currentInput);
        return;
    }

    if (text === '(' || text === ')') {
        if (justCalculated && text === '(') currentInput = '';
        currentInput += text;
        justCalculated = false;
        updateDisplay(currentInput);
        return;
    }

    if (operators.includes(text)) {
        if (justCalculated) {
            justCalculated = false;

            if (text === '%') {
                currentInput += '%';
            } else if (text === '^') {
                currentInput += '^';
            } else {
                currentInput += text;
            }

            updateDisplay(currentInput);
            return;
        }

        if (!currentInput) {
            if (text === '-') currentInput = '-';
            updateDisplay(currentInput);
            return;
        }

        const last = currentInput.slice(-1);

        if (operators.includes(last)) {
            currentInput = currentInput.slice(0, -1) + text;
        } else {
            currentInput += text;
        }

        updateDisplay(currentInput);
        return;
    }

    if (text === '.') {
        if (justCalculated) currentInput = '';

        const lastNumber = currentInput.split(/[+\-*/%^()]/).pop();

        if (lastNumber.includes('.')) return;

        currentInput += lastNumber === '' ? '0.' : '.';
        justCalculated = false;
        updateDisplay(currentInput);
        return;
    }

    if (!/^\d+$/.test(text)) return;

    if (justCalculated) currentInput = '';

    currentInput += text;
    justCalculated = false;
    updateDisplay(currentInput);
}

// Click listeners
buttons.forEach((button) => {
    button.addEventListener('click', () => {
        handleInput(button.textContent.trim());
    });
});

// Keyboard support
window.addEventListener('keydown', (e) => {
    let key = e.key;

    if (key === 'Enter' || key === '=') key = '=';
    if (key === 'Escape') key = 'AC';
    if (key === 'Backspace') key = 'DEL';
    if (key === 'x' || key === 'X') key = '*';

    if (
        /^\d+$/.test(key) ||
        ['+', '-', '*', '/', '%', '^', '.', '(', ')', '=', 'AC', 'DEL'].includes(key)
    ) {
        e.preventDefault();
        handleInput(key);
    }
});
