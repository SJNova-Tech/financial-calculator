/**
 * Financial Calculator - Time Value of Money
 * Implements standard TVM calculations with proper compounding
 */

(function() {
  'use strict';

  // ===== STATE =====
  const state = {
    // TVM variables (null = not set)
    N: null,
    IY: null,
    PV: null,
    PMT: null,
    FV: null,
    
    // Settings
    CY: 12,  // Compounding periods per year
    PY: 12,  // Payment periods per year
    BGN: false, // true = beginning of period, false = end
    
    // Entry state
    entry: '0',
    isNewEntry: true,
    selectedVar: null,
    
    // Memory
    memory: 0,
    lastComputed: null,
    lastComputedVar: null,
    
    // Clear state (for double-press C/CE)
    lastClearTime: 0,
    
    // RCL mode
    rclMode: false,
    
    // Arithmetic
    operator: null,
    operand: null,
    
    // Mode: 'tvm', 'cf', or 'amort'
    mode: 'tvm',
    
    // Cash flow state
    cashFlows: [0],  // CF0, CF1, CF2, etc.
    cfIndex: 0,      // Currently selected cash flow
    cfDiscountRate: null,  // I/Y for NPV calculation
    
    // Amortization state
    amortP1: 1,      // Start period
    amortP2: 1,      // End period
    amortResults: null,  // Calculated results
  };

  // ===== DOM ELEMENTS =====
  const elements = {
    displayN: document.getElementById('display-N'),
    displayIY: document.getElementById('display-IY'),
    displayPV: document.getElementById('display-PV'),
    displayPMT: document.getElementById('display-PMT'),
    displayFV: document.getElementById('display-FV'),
    displayCY: document.getElementById('display-CY'),
    displayPY: document.getElementById('display-PY'),
    displayBGN: document.getElementById('display-BGN'),
    entryValue: document.getElementById('entry-value'),
    entryLabel: document.getElementById('entry-label'),
    messageArea: document.getElementById('message-area'),
    tvmRows: document.querySelectorAll('.tvm-row'),
    
    // Mode panels
    tvmPanel: document.getElementById('tvm-panel'),
    cfPanel: document.getElementById('cf-panel'),
    amortPanel: document.getElementById('amort-panel'),
    
    // Cash flow elements
    cfList: document.getElementById('cf-list'),
    cfCount: document.getElementById('cf-count'),
    cfIndex: document.getElementById('cf-index'),
    
    // Amortization elements
    amortRange: document.getElementById('amort-range'),
    amortPrincipal: document.getElementById('amort-principal'),
    amortInterest: document.getElementById('amort-interest'),
    amortBalance: document.getElementById('amort-balance'),
  };

  // ===== UTILITY FUNCTIONS =====
  
  function formatNumber(num, maxDecimals = 6) {
    if (num === null || num === undefined) return '—';
    if (!isFinite(num)) return 'ERROR';
    
    // Handle very small numbers
    if (Math.abs(num) < 1e-10 && num !== 0) {
      return num.toExponential(4);
    }
    
    // Handle very large numbers
    if (Math.abs(num) >= 1e12) {
      return num.toExponential(4);
    }
    
    // Regular formatting
    const rounded = parseFloat(num.toFixed(maxDecimals));
    return rounded.toLocaleString('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: maxDecimals,
    });
  }

  function showMessage(msg, type = 'info') {
    elements.messageArea.textContent = msg;
    elements.messageArea.className = 'message-area ' + type;
    
    // Clear message after delay
    setTimeout(() => {
      if (elements.messageArea.textContent === msg) {
        elements.messageArea.textContent = '';
        elements.messageArea.className = 'message-area';
      }
    }, 3000);
  }

  function clearMessage() {
    elements.messageArea.textContent = '';
    elements.messageArea.className = 'message-area';
  }

  // ===== DISPLAY UPDATE =====
  
  function updateDisplay() {
    // Update TVM values
    elements.displayN.textContent = formatNumber(state.N);
    elements.displayIY.textContent = state.IY !== null ? formatNumber(state.IY) + '%' : '—';
    elements.displayPV.textContent = formatNumber(state.PV);
    elements.displayPMT.textContent = formatNumber(state.PMT);
    elements.displayFV.textContent = formatNumber(state.FV);
    
    // Highlight computed value
    ['N', 'IY', 'PV', 'PMT', 'FV'].forEach(v => {
      const el = elements['display' + v.replace('/', '')];
      if (v === state.lastComputedVar) {
        el.classList.add('computed');
      } else {
        el.classList.remove('computed');
      }
    });
    
    // Update settings
    elements.displayCY.textContent = state.CY;
    elements.displayPY.textContent = state.PY;
    elements.displayBGN.textContent = state.BGN ? 'BGN' : 'END';
    
    // Update entry display
    elements.entryValue.textContent = state.entry;
    
    // Update selected row highlight
    elements.tvmRows.forEach(row => {
      if (row.dataset.var === state.selectedVar) {
        row.classList.add('selected');
      } else {
        row.classList.remove('selected');
      }
    });
    
    // Update entry label
    if (state.rclMode) {
      elements.entryLabel.textContent = 'RCL';
    } else if (state.mode === 'cf') {
      elements.entryLabel.textContent = `CF${state.cfIndex} =`;
    } else if (state.mode === 'amort') {
      elements.entryLabel.textContent = `P${state.amortP1}-${state.amortP2}`;
    } else if (state.selectedVar) {
      const labels = {
        N: 'N =',
        IY: 'I/Y =',
        PV: 'PV =',
        PMT: 'PMT =',
        FV: 'FV =',
        CY: 'C/Y =',
        PY: 'P/Y ='
      };
      elements.entryLabel.textContent = labels[state.selectedVar] || '';
    } else {
      elements.entryLabel.textContent = '';
    }
  }

  // ===== ENTRY HANDLING =====
  
  function appendDigit(digit) {
    clearMessage();
    state.rclMode = false;
    
    if (state.isNewEntry) {
      state.entry = digit === '.' ? '0.' : digit;
      state.isNewEntry = false;
    } else {
      // Prevent multiple decimals
      if (digit === '.' && state.entry.includes('.')) return;
      // Limit length
      if (state.entry.replace(/[^0-9]/g, '').length >= 12) return;
      state.entry += digit;
    }
    
    updateDisplay();
  }

  function negateEntry() {
    if (state.entry === '0') return;
    
    if (state.entry.startsWith('-')) {
      state.entry = state.entry.substring(1);
    } else {
      state.entry = '-' + state.entry;
    }
    
    updateDisplay();
  }

  function deleteLastChar() {
    if (state.entry.length <= 1 || (state.entry.length === 2 && state.entry.startsWith('-'))) {
      state.entry = '0';
      state.isNewEntry = true;
    } else {
      state.entry = state.entry.slice(0, -1);
    }
    updateDisplay();
  }

  function getEntryValue() {
    return parseFloat(state.entry) || 0;
  }

  // ===== VARIABLE STORAGE =====
  
  function storeVariable(varName) {
    clearMessage();
    state.rclMode = false;
    
    const value = getEntryValue();
    
    if (['N', 'IY', 'PV', 'PMT', 'FV'].includes(varName)) {
      state[varName] = value;
      state.selectedVar = varName;
      // Clear computed highlight when manually setting
      if (state.lastComputedVar === varName) {
        state.lastComputedVar = null;
      }
    } else if (varName === 'CY') {
      if (value > 0 && value <= 365) {
        state.CY = Math.round(value);
      } else {
        showMessage('C/Y must be 1-365', 'error');
        return;
      }
    } else if (varName === 'PY') {
      if (value > 0 && value <= 365) {
        state.PY = Math.round(value);
      } else {
        showMessage('P/Y must be 1-365', 'error');
        return;
      }
    }
    
    state.entry = formatNumber(value).replace(/,/g, '');
    state.isNewEntry = true;
    updateDisplay();
  }

  function selectVariable(varName) {
    state.selectedVar = varName;
    
    // Show current value in entry
    const value = state[varName];
    if (value !== null) {
      state.entry = String(value);
    } else {
      state.entry = '0';
    }
    state.isNewEntry = true;
    
    updateDisplay();
  }

  // ===== TVM MATH =====
  
  /**
   * Calculate effective periodic interest rate
   * Converts nominal annual rate to rate per payment period
   */
  function getPeriodicRate(nominalRate, cy, py) {
    // nominalRate is in percent (e.g., 6 for 6%)
    const r = nominalRate / 100;
    
    // Effective periodic rate
    // i_period = (1 + r/CY)^(CY/PY) - 1
    if (cy === py) {
      return r / py;
    }
    return Math.pow(1 + r / cy, cy / py) - 1;
  }

  /**
   * TVM equation: PV + PMT * factor + FV * (1+i)^(-N) = 0
   * Where factor = [(1+i)^N - 1] / i  (adjusted for BGN mode)
   */
  
  function annuityFactor(i, n, isBegin) {
    if (Math.abs(i) < 1e-10) {
      // Zero interest rate
      return n;
    }
    
    const factor = (Math.pow(1 + i, n) - 1) / i;
    return isBegin ? factor * (1 + i) : factor;
  }

  function presentValueFactor(i, n) {
    return Math.pow(1 + i, -n);
  }

  /**
   * Solve for FV
   * FV = -PV * (1+i)^N - PMT * annuityFactor
   */
  function solveFV(n, i, pv, pmt, isBegin) {
    const pvf = Math.pow(1 + i, n);
    const af = annuityFactor(i, n, isBegin);
    return -(pv * pvf + pmt * af);
  }

  /**
   * Solve for PV
   * From: PV * (1+i)^N + PMT * AF + FV = 0
   * PV = -(PMT * AF + FV) / (1+i)^N
   */
  function solvePV(n, i, pmt, fv, isBegin) {
    const fvf = Math.pow(1 + i, n);  // Future value factor (1+i)^N
    const af = annuityFactor(i, n, isBegin);
    return -(pmt * af + fv) / fvf;
  }

  /**
   * Solve for PMT
   * From: PV * (1+i)^N + PMT * AF + FV = 0
   * PMT = -(PV * (1+i)^N + FV) / AF
   */
  function solvePMT(n, i, pv, fv, isBegin) {
    const fvf = Math.pow(1 + i, n);  // Future value factor (1+i)^N
    const af = annuityFactor(i, n, isBegin);
    
    if (Math.abs(af) < 1e-15) {
      return NaN;
    }
    
    return -(pv * fvf + fv) / af;
  }

  /**
   * Solve for N using logarithm when possible
   */
  function solveN(i, pv, pmt, fv, isBegin) {
    if (Math.abs(i) < 1e-10) {
      // Zero interest: N = -(PV + FV) / PMT
      if (Math.abs(pmt) < 1e-15) return NaN;
      return -(pv + fv) / pmt;
    }
    
    const pmtAdj = isBegin ? pmt * (1 + i) : pmt;
    
    // From: PV + PMT*[(1+i)^N - 1]/i + FV*(1+i)^(-N) = 0
    // This requires numeric solving in general case
    
    // Special case: PMT = 0
    if (Math.abs(pmt) < 1e-15) {
      // PV * (1+i)^N + FV = 0
      // (1+i)^N = -FV/PV
      if (Math.abs(pv) < 1e-15) return NaN;
      const ratio = -fv / pv;
      if (ratio <= 0) return NaN;
      return Math.log(ratio) / Math.log(1 + i);
    }
    
    // General case: numeric solution
    return solveNNumeric(i, pv, pmt, fv, isBegin);
  }

  function solveNNumeric(i, pv, pmt, fv, isBegin) {
    // Use bisection with reasonable bounds
    // TVM equation: PV * (1+i)^N + PMT * AF + FV = 0
    const f = (n) => {
      if (n <= 0) return pv + fv; // Not valid
      const fvf = Math.pow(1 + i, n);
      return pv * fvf + pmt * annuityFactor(i, n, isBegin) + fv;
    };
    
    // Find bounds
    let lo = 0.01, hi = 1000;
    const fLo = f(lo), fHi = f(hi);
    
    // Check if solution exists
    if (fLo * fHi > 0) {
      // Try to find better bounds
      for (let test = 1; test <= 10000; test *= 10) {
        if (f(test) * fLo < 0) {
          hi = test;
          break;
        }
      }
    }
    
    // Bisection
    for (let iter = 0; iter < 100; iter++) {
      const mid = (lo + hi) / 2;
      const fMid = f(mid);
      
      if (Math.abs(fMid) < 1e-10) return mid;
      
      if (f(lo) * fMid < 0) {
        hi = mid;
      } else {
        lo = mid;
      }
    }
    
    return (lo + hi) / 2;
  }

  /**
   * Solve for I/Y using Newton-Raphson with bisection fallback
   */
  function solveIY(n, pv, pmt, fv, isBegin, cy, py) {
    // We need to find the nominal annual rate
    // TVM equation: PV * (1+i)^N + PMT * AF + FV = 0
    // where i = periodic rate, which relates to nominal rate
    
    // Objective function in terms of periodic rate i
    const f = (i) => {
      const fvf = Math.pow(1 + i, n);
      const af = annuityFactor(i, n, isBegin);
      return pv * fvf + pmt * af + fv;
    };
    
    // Derivative for Newton-Raphson
    // d/di of [PV * (1+i)^N + PMT * AF + FV]
    const df = (i) => {
      if (Math.abs(i) < 1e-10) {
        // Derivative at i≈0: approximate
        return pv * n + pmt * n * (n + 1) / 2;
      }
      
      const onePlusI = 1 + i;
      const onePlusIN = Math.pow(onePlusI, n);
      
      // d/di of (1+i)^N = N * (1+i)^(N-1)
      const dFvf = n * Math.pow(onePlusI, n - 1);
      
      // d/di of annuity factor AF = [(1+i)^N - 1] / i
      const af = (onePlusIN - 1) / i;
      const dAf = (n * Math.pow(onePlusI, n - 1) * i - (onePlusIN - 1)) / (i * i);
      const dAfBgn = isBegin ? (dAf * onePlusI + af) : dAf;
      
      return pv * dFvf + pmt * dAfBgn;
    };
    
    // Try Newton-Raphson first
    let i = 0.05; // Initial guess: 5% periodic
    let bestI = i;
    let bestF = Math.abs(f(i));
    
    for (let iter = 0; iter < 50; iter++) {
      const fVal = f(i);
      
      if (Math.abs(fVal) < 1e-10) {
        bestI = i;
        break;
      }
      
      if (Math.abs(fVal) < bestF) {
        bestF = Math.abs(fVal);
        bestI = i;
      }
      
      const dfVal = df(i);
      if (Math.abs(dfVal) < 1e-15) break;
      
      let newI = i - fVal / dfVal;
      
      // Keep rate in reasonable bounds
      if (newI <= -0.99) newI = i / 2;
      if (newI > 10) newI = (i + 10) / 2;
      
      if (Math.abs(newI - i) < 1e-12) {
        bestI = newI;
        break;
      }
      
      i = newI;
    }
    
    // If Newton didn't converge well, try bisection
    if (Math.abs(f(bestI)) > 1e-6) {
      bestI = bisectionSolveI(f, -0.99, 2, 100);
    }
    
    // Convert periodic rate back to nominal annual rate
    // i_period = (1 + r/CY)^(CY/PY) - 1
    // Solve for r: r = CY * [(1 + i_period)^(PY/CY) - 1]
    let nominalRate;
    if (cy === py) {
      nominalRate = bestI * py;
    } else {
      nominalRate = cy * (Math.pow(1 + bestI, py / cy) - 1);
    }
    
    return nominalRate * 100; // Return as percentage
  }

  function bisectionSolveI(f, lo, hi, maxIter) {
    let fLo = f(lo), fHi = f(hi);
    
    // Adjust bounds if needed
    if (fLo * fHi > 0) {
      // Try to find a sign change
      for (let test of [-0.5, 0, 0.01, 0.1, 0.5, 1, 1.5]) {
        if (test > lo && test < hi && f(test) * fLo < 0) {
          hi = test;
          fHi = f(hi);
          break;
        } else if (test > lo && test < hi && f(test) * fHi < 0) {
          lo = test;
          fLo = f(lo);
          break;
        }
      }
    }
    
    for (let iter = 0; iter < maxIter; iter++) {
      const mid = (lo + hi) / 2;
      const fMid = f(mid);
      
      if (Math.abs(fMid) < 1e-10) return mid;
      
      if (fLo * fMid < 0) {
        hi = mid;
        fHi = fMid;
      } else {
        lo = mid;
        fLo = fMid;
      }
    }
    
    return (lo + hi) / 2;
  }

  // ===== CPT (COMPUTE) =====
  
  function compute() {
    clearMessage();
    state.rclMode = false;
    
    // Find which variable is blank
    const tvmVars = ['N', 'IY', 'PV', 'PMT', 'FV'];
    const blankVars = tvmVars.filter(v => state[v] === null);
    
    if (blankVars.length === 0) {
      showMessage('All values set - clear one to compute', 'info');
      return;
    }
    
    if (blankVars.length > 1) {
      showMessage('SET MORE VALUES', 'error');
      return;
    }
    
    const solveFor = blankVars[0];
    
    // Get values
    const n = state.N;
    const iy = state.IY;
    const pv = state.PV;
    const pmt = state.PMT;
    const fv = state.FV;
    const cy = state.CY;
    const py = state.PY;
    const isBegin = state.BGN;
    
    let result;
    
    try {
      switch (solveFor) {
        case 'FV': {
          const i = getPeriodicRate(iy, cy, py);
          result = solveFV(n, i, pv, pmt, isBegin);
          break;
        }
        case 'PV': {
          const i = getPeriodicRate(iy, cy, py);
          result = solvePV(n, i, pmt, fv, isBegin);
          break;
        }
        case 'PMT': {
          const i = getPeriodicRate(iy, cy, py);
          result = solvePMT(n, i, pv, fv, isBegin);
          break;
        }
        case 'N': {
          const i = getPeriodicRate(iy, cy, py);
          result = solveN(i, pv, pmt, fv, isBegin);
          break;
        }
        case 'IY': {
          result = solveIY(n, pv, pmt, fv, isBegin, cy, py);
          break;
        }
      }
      
      if (!isFinite(result) || isNaN(result)) {
        showMessage('No solution found', 'error');
        return;
      }
      
      // Store result
      state[solveFor] = result;
      state.lastComputed = result;
      state.lastComputedVar = solveFor;
      state.entry = formatNumber(result).replace(/,/g, '');
      state.selectedVar = solveFor;
      state.isNewEntry = true;
      
      showMessage(`${solveFor === 'IY' ? 'I/Y' : solveFor} = ${formatNumber(result)}`, 'success');
      updateDisplay();
      
    } catch (e) {
      console.error('Compute error:', e);
      showMessage('Calculation error', 'error');
    }
  }

  // ===== CLEAR FUNCTIONS =====
  
  function clearEntry() {
    const now = Date.now();
    
    if (now - state.lastClearTime < 500) {
      // Double press: clear all TVM registers
      clearTVM();
      showMessage('TVM cleared', 'info');
    } else {
      // Single press: clear entry only
      state.entry = '0';
      state.isNewEntry = true;
      state.operator = null;
      state.operand = null;
    }
    
    state.lastClearTime = now;
    updateDisplay();
  }

  function clearTVM() {
    state.N = null;
    state.IY = null;
    state.PV = null;
    state.PMT = null;
    state.FV = null;
    state.lastComputedVar = null;
    state.selectedVar = null;
  }

  function reset() {
    state.N = null;
    state.IY = null;
    state.PV = null;
    state.PMT = null;
    state.FV = null;
    state.CY = 12;
    state.PY = 12;
    state.BGN = false;
    state.entry = '0';
    state.isNewEntry = true;
    state.selectedVar = null;
    state.memory = 0;
    state.lastComputed = null;
    state.lastComputedVar = null;
    state.operator = null;
    state.operand = null;
    state.rclMode = false;
    
    // Reset CF and AMORT state
    state.cashFlows = [0];
    state.cfIndex = 0;
    state.cfDiscountRate = null;
    state.amortP1 = 1;
    state.amortP2 = 1;
    state.amortResults = null;
    
    // Return to TVM mode
    setMode('tvm');
    
    showMessage('Calculator reset', 'info');
    updateDisplay();
  }

  // ===== RCL (RECALL) =====
  
  function toggleRCL() {
    state.rclMode = !state.rclMode;
    
    if (state.rclMode) {
      showMessage('RCL: Press variable key to recall', 'info');
    } else {
      clearMessage();
    }
    
    updateDisplay();
  }

  function recallVariable(varName) {
    const value = state[varName];
    
    if (value !== null) {
      state.entry = String(value);
      state.isNewEntry = true;
      showMessage(`Recalled ${varName === 'IY' ? 'I/Y' : varName}`, 'success');
    } else {
      showMessage(`${varName === 'IY' ? 'I/Y' : varName} not set`, 'error');
    }
    
    state.rclMode = false;
    updateDisplay();
  }

  // ===== ARROW NAVIGATION =====
  
  function navigateUp() {
    const vars = ['N', 'IY', 'PV', 'PMT', 'FV'];
    const currentIdx = vars.indexOf(state.selectedVar);
    
    if (currentIdx > 0) {
      selectVariable(vars[currentIdx - 1]);
    } else {
      selectVariable(vars[vars.length - 1]);
    }
  }

  function navigateDown() {
    const vars = ['N', 'IY', 'PV', 'PMT', 'FV'];
    const currentIdx = vars.indexOf(state.selectedVar);
    
    if (currentIdx < vars.length - 1 && currentIdx >= 0) {
      selectVariable(vars[currentIdx + 1]);
    } else {
      selectVariable(vars[0]);
    }
  }

  // ===== BASIC ARITHMETIC =====
  
  function setOperator(op) {
    state.operand = getEntryValue();
    state.operator = op;
    state.isNewEntry = true;
  }

  function calculate() {
    if (state.operator === null || state.operand === null) return;
    
    const b = getEntryValue();
    const a = state.operand;
    let result;
    
    switch (state.operator) {
      case 'add': result = a + b; break;
      case 'subtract': result = a - b; break;
      case 'multiply': result = a * b; break;
      case 'divide': 
        if (b === 0) {
          showMessage('Cannot divide by zero', 'error');
          return;
        }
        result = a / b; 
        break;
      default: return;
    }
    
    state.entry = String(result);
    state.operator = null;
    state.operand = null;
    state.isNewEntry = true;
    
    updateDisplay();
  }

  // ===== BGN TOGGLE =====
  
  function toggleBGN() {
    state.BGN = !state.BGN;
    showMessage(state.BGN ? 'Begin mode' : 'End mode', 'info');
    updateDisplay();
  }

  // ===== xP/Y (Set P/Y = C/Y) =====
  
  function setXPY() {
    state.PY = state.CY;
    showMessage(`P/Y set to ${state.PY}`, 'info');
    updateDisplay();
  }

  // ===== MODE SWITCHING =====
  
  function setMode(newMode) {
    state.mode = newMode;
    
    // Get all mode-specific elements
    const tvmTable = document.querySelector('.tvm-table');
    const settingsPanel = document.querySelector('.settings-panel');
    
    // Hide all panels' children
    if (tvmTable) tvmTable.style.display = 'none';
    if (settingsPanel) settingsPanel.style.display = 'none';
    if (elements.cfPanel) elements.cfPanel.style.display = 'none';
    if (elements.amortPanel) elements.amortPanel.style.display = 'none';
    
    // Show the active panel's children
    switch (newMode) {
      case 'tvm':
        if (tvmTable) tvmTable.style.display = '';
        if (settingsPanel) settingsPanel.style.display = '';
        break;
      case 'cf':
        if (elements.cfPanel) {
          elements.cfPanel.style.display = 'flex';
        }
        updateCFDisplay();
        break;
      case 'amort':
        if (elements.amortPanel) {
          elements.amortPanel.style.display = 'flex';
        }
        updateAmortDisplay();
        break;
    }
    
    updateDisplay();
  }

  // ===== CASH FLOW FUNCTIONS =====
  
  function enterCFMode() {
    if (state.mode === 'cf') {
      // Already in CF mode, go back to TVM
      setMode('tvm');
      showMessage('Exited Cash Flow mode', 'info');
    } else {
      setMode('cf');
      state.cfIndex = 0;
      showMessage('Cash Flow mode - Enter CF0', 'info');
    }
  }
  
  function updateCFDisplay() {
    if (!elements.cfList) return;
    
    // Rebuild CF list
    elements.cfList.innerHTML = '';
    
    for (let i = 0; i < state.cashFlows.length; i++) {
      const row = document.createElement('div');
      row.className = 'cf-row' + (i === state.cfIndex ? ' selected' : '');
      row.dataset.cfIdx = i;
      
      const label = document.createElement('span');
      label.className = 'cf-label';
      label.textContent = 'CF' + i;
      
      const value = document.createElement('span');
      value.className = 'cf-value';
      value.textContent = formatNumber(state.cashFlows[i]);
      
      row.appendChild(label);
      row.appendChild(value);
      elements.cfList.appendChild(row);
    }
    
    // Update count
    if (elements.cfCount) {
      elements.cfCount.textContent = state.cashFlows.length + ' entries';
    }
    
    // Update index display
    if (elements.cfIndex) {
      elements.cfIndex.textContent = 'CF' + state.cfIndex;
    }
  }
  
  function navigateCF(direction) {
    if (state.mode !== 'cf') return;
    
    if (direction === 'up' && state.cfIndex > 0) {
      state.cfIndex--;
    } else if (direction === 'down') {
      if (state.cfIndex < state.cashFlows.length - 1) {
        state.cfIndex++;
      } else {
        // Add new cash flow entry
        state.cashFlows.push(0);
        state.cfIndex = state.cashFlows.length - 1;
      }
    }
    
    state.entry = String(state.cashFlows[state.cfIndex]);
    state.isNewEntry = true;
    updateCFDisplay();
    updateDisplay();
  }
  
  function storeCashFlow() {
    if (state.mode !== 'cf') return;
    
    const value = getEntryValue();
    state.cashFlows[state.cfIndex] = value;
    
    showMessage(`CF${state.cfIndex} = ${formatNumber(value)}`, 'success');
    state.isNewEntry = true;
    updateCFDisplay();
  }
  
  function deleteCashFlow() {
    if (state.mode !== 'cf') return;
    
    if (state.cashFlows.length <= 1) {
      // Can't delete CF0, just reset it
      state.cashFlows[0] = 0;
      showMessage('CF0 reset to 0', 'info');
    } else if (state.cfIndex > 0) {
      state.cashFlows.splice(state.cfIndex, 1);
      if (state.cfIndex >= state.cashFlows.length) {
        state.cfIndex = state.cashFlows.length - 1;
      }
      showMessage('Cash flow deleted', 'info');
    } else {
      showMessage('Cannot delete CF0', 'error');
    }
    
    state.entry = String(state.cashFlows[state.cfIndex]);
    state.isNewEntry = true;
    updateCFDisplay();
    updateDisplay();
  }

  // ===== NPV CALCULATION =====
  
  function calculateNPV() {
    if (state.cashFlows.length < 2) {
      showMessage('Enter at least 2 cash flows', 'error');
      return;
    }
    
    // Get discount rate - use I/Y if set, otherwise prompt
    let rate = state.IY;
    if (rate === null) {
      // If currently entering a number, use that as the rate
      if (!state.isNewEntry && state.entry !== '0') {
        rate = getEntryValue();
        state.IY = rate;
      } else {
        showMessage('Set I/Y first (discount rate)', 'error');
        return;
      }
    }
    
    // Convert annual rate to periodic rate (using P/Y)
    const periodicRate = rate / 100 / state.PY;
    
    // Calculate NPV: CF0 + CF1/(1+r) + CF2/(1+r)^2 + ...
    let npv = 0;
    for (let t = 0; t < state.cashFlows.length; t++) {
      npv += state.cashFlows[t] / Math.pow(1 + periodicRate, t);
    }
    
    state.lastComputed = npv;
    state.entry = formatNumber(npv).replace(/,/g, '');
    state.isNewEntry = true;
    
    showMessage(`NPV = ${formatNumber(npv)}`, 'success');
    
    // Switch to TVM mode to show result
    setMode('tvm');
    updateDisplay();
  }

  // ===== IRR CALCULATION =====
  
  function calculateIRR() {
    if (state.cashFlows.length < 2) {
      showMessage('Enter at least 2 cash flows', 'error');
      return;
    }
    
    // Check that we have at least one sign change
    let hasPositive = false, hasNegative = false;
    for (const cf of state.cashFlows) {
      if (cf > 0) hasPositive = true;
      if (cf < 0) hasNegative = true;
    }
    
    if (!hasPositive || !hasNegative) {
      showMessage('Need both positive and negative cash flows', 'error');
      return;
    }
    
    // Newton-Raphson to find IRR
    // NPV(r) = sum of CF[t] / (1+r)^t = 0
    
    const npvFunc = (r) => {
      let npv = 0;
      for (let t = 0; t < state.cashFlows.length; t++) {
        npv += state.cashFlows[t] / Math.pow(1 + r, t);
      }
      return npv;
    };
    
    const npvDerivative = (r) => {
      let deriv = 0;
      for (let t = 1; t < state.cashFlows.length; t++) {
        deriv -= t * state.cashFlows[t] / Math.pow(1 + r, t + 1);
      }
      return deriv;
    };
    
    // Initial guess
    let r = 0.1;
    let bestR = r;
    let bestNPV = Math.abs(npvFunc(r));
    
    // Newton-Raphson iterations
    for (let iter = 0; iter < 100; iter++) {
      const npv = npvFunc(r);
      
      if (Math.abs(npv) < 1e-10) {
        bestR = r;
        break;
      }
      
      if (Math.abs(npv) < bestNPV) {
        bestNPV = Math.abs(npv);
        bestR = r;
      }
      
      const deriv = npvDerivative(r);
      if (Math.abs(deriv) < 1e-15) break;
      
      let newR = r - npv / deriv;
      
      // Keep in reasonable bounds
      if (newR <= -0.99) newR = (r - 0.99) / 2;
      if (newR > 10) newR = (r + 10) / 2;
      
      if (Math.abs(newR - r) < 1e-10) {
        bestR = newR;
        break;
      }
      
      r = newR;
    }
    
    // Fallback to bisection if Newton didn't converge well
    if (Math.abs(npvFunc(bestR)) > 1e-6) {
      bestR = bisectionIRR(npvFunc, -0.99, 2, 100);
    }
    
    // Convert to annual percentage rate (* P/Y)
    const irrAnnual = bestR * state.PY * 100;
    
    state.IY = irrAnnual;
    state.lastComputed = irrAnnual;
    state.entry = formatNumber(irrAnnual).replace(/,/g, '');
    state.isNewEntry = true;
    
    showMessage(`IRR = ${formatNumber(irrAnnual)}%`, 'success');
    
    // Switch to TVM mode to show result
    setMode('tvm');
    updateDisplay();
  }
  
  function bisectionIRR(f, lo, hi, maxIter) {
    let fLo = f(lo), fHi = f(hi);
    
    // Adjust bounds if needed
    if (fLo * fHi > 0) {
      for (const test of [-0.5, 0, 0.01, 0.1, 0.5, 1]) {
        if (f(test) * fLo < 0) {
          hi = test;
          fHi = f(hi);
          break;
        } else if (f(test) * fHi < 0) {
          lo = test;
          fLo = f(lo);
          break;
        }
      }
    }
    
    for (let iter = 0; iter < maxIter; iter++) {
      const mid = (lo + hi) / 2;
      const fMid = f(mid);
      
      if (Math.abs(fMid) < 1e-10) return mid;
      
      if (fLo * fMid < 0) {
        hi = mid;
        fHi = fMid;
      } else {
        lo = mid;
        fLo = fMid;
      }
    }
    
    return (lo + hi) / 2;
  }

  // ===== AMORTIZATION FUNCTIONS =====
  
  function enterAmortMode() {
    // Check if TVM values are set for amortization
    if (state.N === null || state.IY === null || state.PV === null || state.PMT === null) {
      showMessage('Set N, I/Y, PV, PMT first', 'error');
      return;
    }
    
    if (state.mode === 'amort') {
      // Already in AMORT mode, go back to TVM
      setMode('tvm');
      showMessage('Exited Amortization mode', 'info');
    } else {
      // Calculate first, then switch mode to update display correctly
      state.amortP1 = 1;
      state.amortP2 = 1;
      calculateAmort();
      setMode('amort');
      showMessage('Amortization mode - Use ▲▼ to change period', 'info');
    }
  }
  
  function updateAmortDisplay() {
    if (!elements.amortRange) return;
    
    elements.amortRange.textContent = `P${state.amortP1} - P${state.amortP2}`;
    
    if (state.amortResults) {
      elements.amortPrincipal.textContent = formatNumber(state.amortResults.principal);
      elements.amortPrincipal.className = 'amort-value' + (state.amortResults.principal >= 0 ? ' positive' : ' negative');
      
      elements.amortInterest.textContent = formatNumber(state.amortResults.interest);
      elements.amortInterest.className = 'amort-value negative';
      
      elements.amortBalance.textContent = formatNumber(state.amortResults.balance);
      elements.amortBalance.className = 'amort-value';
    } else {
      elements.amortPrincipal.textContent = '—';
      elements.amortInterest.textContent = '—';
      elements.amortBalance.textContent = '—';
    }
  }
  
  function navigateAmort(direction) {
    if (state.mode !== 'amort') return;
    
    const maxN = Math.floor(state.N);
    
    if (direction === 'up') {
      // Move to previous period or range
      if (state.amortP1 > 1) {
        state.amortP1--;
        state.amortP2 = state.amortP1;
      }
    } else if (direction === 'down') {
      // Move to next period or range
      if (state.amortP2 < maxN) {
        state.amortP1 = state.amortP2 + 1;
        state.amortP2 = state.amortP1;
      }
    }
    
    calculateAmort();
    updateAmortDisplay();
  }
  
  function calculateAmort() {
    if (state.N === null || state.IY === null || state.PV === null || state.PMT === null) {
      state.amortResults = null;
      return;
    }
    
    const n = state.N;
    const pv = state.PV;
    const pmt = state.PMT;
    const i = getPeriodicRate(state.IY, state.CY, state.PY);
    const isBegin = state.BGN;
    
    // Calculate amortization for periods P1 to P2
    let balance = pv;
    let totalPrincipal = 0;
    let totalInterest = 0;
    
    for (let period = 1; period <= state.amortP2; period++) {
      let interestPayment, principalPayment;
      
      if (isBegin) {
        // Beginning of period: payment first, then interest
        principalPayment = -pmt;
        balance += principalPayment;
        interestPayment = balance * i;
        balance += interestPayment;
      } else {
        // End of period: interest first, then payment
        interestPayment = balance * i;
        principalPayment = -pmt - interestPayment;
        balance += interestPayment + pmt;
      }
      
      // Accumulate for the requested range
      if (period >= state.amortP1) {
        totalPrincipal += principalPayment;
        totalInterest += interestPayment;
      }
    }
    
    state.amortResults = {
      principal: totalPrincipal,
      interest: totalInterest,
      balance: balance
    };
    
    state.entry = formatNumber(state.amortResults.balance).replace(/,/g, '');
    state.isNewEntry = true;
  }
  
  function setAmortPeriod() {
    if (state.mode !== 'amort') return;
    
    const value = Math.floor(getEntryValue());
    const maxN = Math.floor(state.N);
    
    if (value >= 1 && value <= maxN) {
      state.amortP1 = value;
      state.amortP2 = value;
      calculateAmort();
      updateAmortDisplay();
      showMessage(`Period set to P${value}`, 'info');
    } else {
      showMessage(`Period must be 1 to ${maxN}`, 'error');
    }
    
    state.isNewEntry = true;
  }

  // ===== EVENT HANDLERS =====
  
  function handleKeyClick(e) {
    const button = e.target.closest('.key');
    if (!button) return;
    
    // Visual feedback
    button.classList.add('flash');
    setTimeout(() => button.classList.remove('flash'), 150);
    
    // Handle digit keys
    if (button.dataset.digit !== undefined) {
      appendDigit(button.dataset.digit);
      return;
    }
    
    // Handle TVM variable keys
    if (button.dataset.var) {
      const varName = button.dataset.var;
      
      if (state.rclMode) {
        recallVariable(varName);
      } else if (state.isNewEntry && state.entry === '0') {
        // Just select the variable
        selectVariable(varName);
      } else {
        // Store entry value
        storeVariable(varName);
      }
      return;
    }
    
    // Handle operator keys
    if (button.dataset.op) {
      setOperator(button.dataset.op);
      return;
    }
    
    // Handle action keys
    const action = button.dataset.action;
    if (!action) return;
    
    switch (action) {
      case 'decimal':
        appendDigit('.');
        break;
      case 'negate':
        negateEntry();
        break;
      case 'DEL':
        if (state.mode === 'cf') {
          deleteCashFlow();
        } else {
          deleteLastChar();
        }
        break;
      case 'CCE':
        clearEntry();
        break;
      case 'RESET':
        reset();
        break;
      case 'CPT':
        compute();
        break;
      case 'RCL':
        toggleRCL();
        break;
      case 'ENTER':
        if (state.mode === 'cf') {
          storeCashFlow();
        } else if (state.mode === 'amort') {
          setAmortPeriod();
        } else if (state.selectedVar) {
          storeVariable(state.selectedVar);
        }
        break;
      case 'UP':
        if (state.mode === 'cf') {
          navigateCF('up');
        } else if (state.mode === 'amort') {
          navigateAmort('up');
        } else {
          navigateUp();
        }
        break;
      case 'DOWN':
        if (state.mode === 'cf') {
          navigateCF('down');
        } else if (state.mode === 'amort') {
          navigateAmort('down');
        } else {
          navigateDown();
        }
        break;
      case 'BGN':
        toggleBGN();
        break;
      case 'xPY':
        setXPY();
        break;
      case 'equals':
        calculate();
        break;
      case 'CF':
        enterCFMode();
        break;
      case 'NPV':
        calculateNPV();
        break;
      case 'IRR':
        calculateIRR();
        break;
      case 'AMORT':
        enterAmortMode();
        break;
      case 'INS':
        // Insert a new cash flow when in CF mode
        if (state.mode === 'cf') {
          state.cashFlows.splice(state.cfIndex + 1, 0, 0);
          state.cfIndex++;
          state.entry = '0';
          state.isNewEntry = true;
          updateCFDisplay();
          showMessage('Cash flow inserted', 'info');
        }
        break;
    }
  }

  // ===== KEYBOARD SUPPORT =====
  
  function handleKeyboard(e) {
    // Digits
    if (/^[0-9]$/.test(e.key)) {
      appendDigit(e.key);
      return;
    }
    
    // Decimal
    if (e.key === '.') {
      appendDigit('.');
      return;
    }
    
    // Backspace
    if (e.key === 'Backspace') {
      e.preventDefault();
      deleteLastChar();
      return;
    }
    
    // Enter
    if (e.key === 'Enter') {
      e.preventDefault();
      if (state.mode === 'cf') {
        storeCashFlow();
      } else if (state.mode === 'amort') {
        setAmortPeriod();
      } else if (state.selectedVar) {
        storeVariable(state.selectedVar);
      }
      return;
    }
    
    // Escape - clear or exit mode
    if (e.key === 'Escape') {
      if (state.mode !== 'tvm') {
        setMode('tvm');
        showMessage('Returned to TVM mode', 'info');
      } else {
        clearEntry();
      }
      return;
    }
    
    // Operators
    if (e.key === '+') setOperator('add');
    if (e.key === '-') setOperator('subtract');
    if (e.key === '*') setOperator('multiply');
    if (e.key === '/') {
      e.preventDefault();
      setOperator('divide');
    }
    if (e.key === '=') calculate();
    
    // Arrow keys
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (state.mode === 'cf') {
        navigateCF('up');
      } else if (state.mode === 'amort') {
        navigateAmort('up');
      } else {
        navigateUp();
      }
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (state.mode === 'cf') {
        navigateCF('down');
      } else if (state.mode === 'amort') {
        navigateAmort('down');
      } else {
        navigateDown();
      }
    }
    
    // Quick keys for TVM (with Ctrl)
    if (e.ctrlKey || e.metaKey) {
      const key = e.key.toLowerCase();
      if (key === 'n') { e.preventDefault(); selectVariable('N'); }
      if (key === 'i') { e.preventDefault(); selectVariable('IY'); }
      if (key === 'p') { e.preventDefault(); selectVariable('PV'); }
      if (key === 'm') { e.preventDefault(); selectVariable('PMT'); }
      if (key === 'f') { e.preventDefault(); selectVariable('FV'); }
      if (key === 'c') {
        // Don't prevent default copy behavior if text is selected
        if (!window.getSelection().toString()) {
          e.preventDefault();
          compute();
        }
      }
    }
  }

  // ===== TVM ROW CLICK HANDLER =====
  
  function handleTVMRowClick(e) {
    const row = e.target.closest('.tvm-row');
    if (!row) return;
    
    const varName = row.dataset.var;
    if (varName) {
      selectVariable(varName);
    }
  }

  // ===== INITIALIZATION =====
  
  function init() {
    // Re-initialize DOM elements in case they weren't available at script parse time
    elements.tvmPanel = document.getElementById('tvm-panel');
    elements.cfPanel = document.getElementById('cf-panel');
    elements.amortPanel = document.getElementById('amort-panel');
    elements.cfList = document.getElementById('cf-list');
    elements.cfCount = document.getElementById('cf-count');
    elements.cfIndex = document.getElementById('cf-index');
    elements.amortRange = document.getElementById('amort-range');
    elements.amortPrincipal = document.getElementById('amort-principal');
    elements.amortInterest = document.getElementById('amort-interest');
    elements.amortBalance = document.getElementById('amort-balance');
    
    // Attach event listeners
    document.querySelector('.keypad').addEventListener('click', handleKeyClick);
    const tvmTable = document.querySelector('.tvm-table');
    if (tvmTable) {
      tvmTable.addEventListener('click', handleTVMRowClick);
    }
    document.addEventListener('keydown', handleKeyboard);
    
    // Initialize mode to TVM
    setMode('tvm');
    
    // Initial display update
    updateDisplay();
    
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('sw.js')
        .then(reg => console.log('Service worker registered'))
        .catch(err => console.log('Service worker registration failed:', err));
    }
    
    console.log('Financial Calculator initialized');
  }

  // Start the app
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
