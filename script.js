/**
 * Standard Calculator Engine with Calculation History & Recall
 * Seamless continuation of past calculations and full keyboard support
 */

document.addEventListener('DOMContentLoaded', () => {
    // DOM Cache
    const display = document.getElementById('calcDisplay');
    const historyDisplay = document.getElementById('calcHistory');
    const clearBtn = document.getElementById('clearBtn');
    const keypad = document.getElementById('calcKeypad');
    const historyToggleBtn = document.getElementById('historyToggleBtn');
    const historyBadge = document.getElementById('historyBadge');
    const historyOverlay = document.getElementById('historyOverlay');
    const closeHistoryBtn = document.getElementById('closeHistoryBtn');
    const clearAllHistoryBtn = document.getElementById('clearAllHistoryBtn');
    const historyScrollContainer = document.getElementById('historyScrollContainer');
    const toast = document.getElementById('toast');

    // Calculator State
    let currentInput = '0';
    let previousInput = null;
    let currentOperator = null;
    let shouldResetDisplay = false;
    let isCalculated = false;

    // History Storage
    let calcHistoryList = JSON.parse(localStorage.getItem('standard_calc_history') || '[]');

    // Operator mapping
    const operatorMap = {
        '+': '+',
        '-': '−',
        '−': '−',
        '*': '×',
        '×': '×',
        '/': '÷',
        '÷': '÷'
    };

    // Initialize
    updateHistoryBadge();
    renderHistoryCards();
    updateDisplay();

    // Event Listeners for History Drawer
    historyToggleBtn.addEventListener('click', toggleHistoryOverlay);
    closeHistoryBtn.addEventListener('click', closeHistoryOverlay);
    
    // Close overlay when clicking outside the panel
    historyOverlay.addEventListener('click', (e) => {
        if (e.target === historyOverlay) closeHistoryOverlay();
    });

    clearAllHistoryBtn.addEventListener('click', () => {
        if (calcHistoryList.length === 0) return;
        calcHistoryList = [];
        localStorage.removeItem('standard_calc_history');
        updateHistoryBadge();
        renderHistoryCards();
        showToast('History cleared');
    });

    /**
     * Display update & responsive text sizing
     */
    function updateDisplay() {
        display.value = currentInput;
        
        // Auto-scale font size for large numbers
        const len = currentInput.length;
        if (len > 12) {
            display.style.fontSize = '1.7rem';
        } else if (len > 8) {
            display.style.fontSize = '2.2rem';
        } else {
            display.style.fontSize = '2.75rem';
        }

        // Switch "AC" to "C" when active input exists
        if (currentInput !== '0' || previousInput !== null) {
            clearBtn.textContent = 'C';
        } else {
            clearBtn.textContent = 'AC';
        }
    }

    /**
     * Input digits
     */
    function inputDigit(digit) {
        clearActiveOperatorHighlight();
        if (shouldResetDisplay || currentInput === '0' || isCalculated) {
            currentInput = digit;
            shouldResetDisplay = false;
            isCalculated = false;
        } else {
            if (currentInput.length < 15) {
                currentInput += digit;
            }
        }
        updateDisplay();
    }

    /**
     * Input decimal
     */
    function inputDecimal() {
        clearActiveOperatorHighlight();
        if (shouldResetDisplay || isCalculated) {
            currentInput = '0.';
            shouldResetDisplay = false;
            isCalculated = false;
        } else if (!currentInput.includes('.')) {
            currentInput += '.';
        }
        updateDisplay();
    }

    /**
     * Handle arithmetic operator (+, −, ×, ÷)
     */
    function handleOperator(op) {
        const symbol = operatorMap[op] || op;

        // If an operator was already active and a second number entered, evaluate chain first
        if (currentOperator && !shouldResetDisplay) {
            calculate(false);
        }

        previousInput = currentInput;
        currentOperator = symbol;
        shouldResetDisplay = true;
        isCalculated = false;

        historyDisplay.textContent = `${previousInput} ${symbol}`;
        highlightOperator(symbol);
    }

    /**
     * Calculate equality (=)
     * @param {boolean} isExplicit - true when '=' button is pressed
     */
    function calculate(isExplicit = true) {
        if (!currentOperator || previousInput === null) return;

        const prev = parseFloat(previousInput);
        const curr = parseFloat(currentInput);
        let result = 0;

        switch (currentOperator) {
            case '+':
                result = prev + curr;
                break;
            case '−':
                result = prev - curr;
                break;
            case '×':
                result = prev * curr;
                break;
            case '÷':
                if (curr === 0) {
                    currentInput = 'Error';
                    previousInput = null;
                    currentOperator = null;
                    historyDisplay.textContent = 'Cannot divide by 0';
                    clearActiveOperatorHighlight();
                    updateDisplay();
                    return;
                }
                result = prev / curr;
                break;
            default:
                return;
        }

        // Float accuracy fix (e.g. 0.1 + 0.2 = 0.3)
        result = fixFloat(result);
        const formattedResult = formatNumber(result);

        const expressionText = `${previousInput} ${currentOperator} ${currentInput}`;
        historyDisplay.textContent = `${expressionText} =`;

        // Save to past calculations history
        if (isExplicit) {
            saveToHistory(expressionText, formattedResult, result);
        }

        currentInput = formattedResult;
        previousInput = null;
        currentOperator = null;
        shouldResetDisplay = true;
        isCalculated = true;

        clearActiveOperatorHighlight();
        updateDisplay();
    }

    /**
     * Percent operation (%)
     */
    function handlePercent() {
        if (currentInput === 'Error') return;
        const val = parseFloat(currentInput);
        if (isNaN(val)) return;
        currentInput = formatNumber(fixFloat(val / 100));
        updateDisplay();
    }

    /**
     * Toggle Sign (±)
     */
    function toggleSign() {
        if (currentInput === 'Error' || currentInput === '0') return;
        if (currentInput.startsWith('-')) {
            currentInput = currentInput.slice(1);
        } else {
            currentInput = '-' + currentInput;
        }
        updateDisplay();
    }

    /**
     * Backspace
     */
    function handleBackspace() {
        if (currentInput === 'Error' || shouldResetDisplay || isCalculated) {
            clearAll();
            return;
        }
        if (currentInput.length > 1) {
            currentInput = currentInput.slice(0, -1);
        } else {
            currentInput = '0';
        }
        updateDisplay();
    }

    /**
     * Clear All (AC)
     */
    function clearAll() {
        currentInput = '0';
        previousInput = null;
        currentOperator = null;
        shouldResetDisplay = false;
        isCalculated = false;
        historyDisplay.textContent = '';
        clearActiveOperatorHighlight();
        updateDisplay();
    }

    /**
     * Past Calculation History Management
     */
    function saveToHistory(expression, formattedResult, rawResult) {
        calcHistoryList.unshift({
            id: Date.now(),
            expression,
            result: formattedResult,
            rawResult,
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });

        if (calcHistoryList.length > 30) {
            calcHistoryList.pop();
        }

        localStorage.setItem('standard_calc_history', JSON.stringify(calcHistoryList));
        updateHistoryBadge();
        renderHistoryCards();
    }

    function updateHistoryBadge() {
        if (historyBadge) {
            historyBadge.textContent = calcHistoryList.length;
        }
    }

    function renderHistoryCards() {
        if (!historyScrollContainer) return;

        if (calcHistoryList.length === 0) {
            historyScrollContainer.innerHTML = `
                <div class="empty-history-state">
                    <p>No past calculations</p>
                    <small>Calculations will appear here</small>
                </div>
            `;
            return;
        }

        historyScrollContainer.innerHTML = '';
        calcHistoryList.forEach(item => {
            const card = document.createElement('div');
            card.className = 'history-card';
            card.setAttribute('tabindex', '0');
            card.setAttribute('role', 'button');
            card.setAttribute('title', 'Click to continue with this calculation');

            card.innerHTML = `
                <div class="history-calc-body">
                    <span class="history-expr-line">${item.expression}</span>
                    <span class="history-res-line">= ${item.result}</span>
                </div>
                <div class="history-action-pill">Continue ➔</div>
            `;

            // Click past calculation to load and continue
            card.addEventListener('click', () => {
                loadAndContinue(item);
            });

            historyScrollContainer.appendChild(card);
        });
    }

    /**
     * Load past calculation and continue
     */
    function loadAndContinue(item) {
        currentInput = item.result;
        previousInput = null;
        currentOperator = null;
        shouldResetDisplay = false;
        isCalculated = false; // Ready to continue directly with operators
        
        historyDisplay.textContent = `Ans: ${item.expression} =`;
        clearActiveOperatorHighlight();
        updateDisplay();
        closeHistoryOverlay();
        showToast(`Loaded ${item.result} — continue calculation`);
    }

    function toggleHistoryOverlay() {
        const isOpen = historyOverlay.classList.contains('active');
        if (isOpen) {
            closeHistoryOverlay();
        } else {
            historyOverlay.classList.add('active');
            historyOverlay.setAttribute('aria-hidden', 'false');
        }
    }

    function closeHistoryOverlay() {
        historyOverlay.classList.remove('active');
        historyOverlay.setAttribute('aria-hidden', 'true');
    }

    // Number formatting helper
    function fixFloat(num) {
        return Number(Math.round(Number(num + 'e+12')) + 'e-12');
    }

    function formatNumber(num) {
        if (!isFinite(num)) return 'Error';
        return parseFloat(num.toFixed(8)).toString();
    }

    function highlightOperator(symbol) {
        clearActiveOperatorHighlight();
        const btn = document.querySelector(`.btn-op[data-op="${symbol}"]`);
        if (btn) btn.classList.add('active-op');
    }

    function clearActiveOperatorHighlight() {
        document.querySelectorAll('.btn-op').forEach(btn => btn.classList.remove('active-op'));
    }

    // Toast notification
    let toastTimer;
    function showToast(msg) {
        if (!toast) return;
        toast.textContent = msg;
        toast.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => {
            toast.classList.remove('show');
        }, 2200);
    }

    // Keypad Click Event Delegation
    keypad.addEventListener('click', (e) => {
        const btn = e.target.closest('button');
        if (!btn) return;

        if (btn.dataset.num !== undefined) {
            inputDigit(btn.dataset.num);
        } else if (btn.dataset.action === 'decimal') {
            inputDecimal();
        } else if (btn.dataset.action === 'operator') {
            handleOperator(btn.dataset.op);
        } else if (btn.dataset.action === 'calculate') {
            calculate(true);
        } else if (btn.dataset.action === 'clear') {
            clearAll();
        } else if (btn.dataset.action === 'sign') {
            toggleSign();
        } else if (btn.dataset.action === 'percent') {
            handlePercent();
        } else if (btn.dataset.action === 'backspace') {
            handleBackspace();
        }
    });

    // Keyboard Support
    document.addEventListener('keydown', (e) => {
        // Close history with Escape if it's open
        if (e.key === 'Escape' && historyOverlay.classList.contains('active')) {
            closeHistoryOverlay();
            return;
        }

        let btnToAnimate = null;

        if (e.key >= '0' && e.key <= '9') {
            inputDigit(e.key);
            btnToAnimate = document.querySelector(`.btn-num[data-num="${e.key}"]`);
        } else if (e.key === '.') {
            inputDecimal();
            btnToAnimate = document.querySelector(`.btn[data-action="decimal"]`);
        } else if (e.key === '+' || e.key === '-' || e.key === '*' || e.key === '/') {
            const mappedOp = operatorMap[e.key];
            handleOperator(mappedOp);
            btnToAnimate = document.querySelector(`.btn-op[data-op="${mappedOp}"]`);
        } else if (e.key === 'Enter' || e.key === '=') {
            e.preventDefault();
            calculate(true);
            btnToAnimate = document.querySelector(`.btn-equals`);
        } else if (e.key === 'Backspace') {
            handleBackspace();
            btnToAnimate = document.querySelector(`.btn[data-action="backspace"]`);
        } else if (e.key === 'Escape') {
            clearAll();
            btnToAnimate = clearBtn;
        } else if (e.key === '%') {
            handlePercent();
            btnToAnimate = document.querySelector(`.btn[data-action="percent"]`);
        } else if (e.key.toLowerCase() === 'h') {
            toggleHistoryOverlay();
        }

        // Button press animation
        if (btnToAnimate) {
            btnToAnimate.classList.add('pressed');
            setTimeout(() => btnToAnimate.classList.remove('pressed'), 120);
        }
    });
});
