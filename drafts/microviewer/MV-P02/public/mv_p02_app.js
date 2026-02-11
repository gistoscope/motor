(function (global) {
  const OPENERS = "([{";
  const CLOSERS = ")]}";
  const MATCH = {
    ')': '(',
    ']': '[',
    '}': '{'
  };

  const expressions = [
    {
      id: 'expr1',
      label: 'Quadratic baseline',
      text: 'f(x) = (x^2 + 1)',
      expectedPairs: 1
    },
    {
      id: 'expr2',
      label: 'Matrix entry',
      text: '[A]_{ij} = (a_{ij} + b_{ij})',
      expectedPairs: 2
    },
    {
      id: 'expr3',
      label: 'Integral window',
      text: '∫_{0}^{1} (x^2 + 1) dx',
      expectedPairs: 3
    },
    {
      id: 'expr4',
      label: 'Roots over reals',
      text: '{ x ∈ ℝ | (x-1)(x+1) = 0 }',
      expectedPairs: 3
    },
    {
      id: 'expr5',
      label: 'Fraction composition',
      text: '\\frac{(a+b)}{[c+d]}',
      expectedPairs: 4
    },
    {
      id: 'expr6',
      label: 'Euler identity',
      text: '(e^{i\\pi} + 1) = 0',
      expectedPairs: 2
    },
    {
      id: 'expr7',
      label: 'Nested shells',
      text: '[ ( { [z] } ) ]',
      expectedPairs: 4
    },
    {
      id: 'expr8',
      label: 'Radical pair',
      text: '\\sqrt{(x^2 + y^2)}',
      expectedPairs: 2
    }
  ];

  function buildPairs(expression, prefix = 'mv-p02') {
    const t0 = performance.now();
    const tokens = [];
    const stack = [];
    const pairs = [];
    const pairMap = new Map();

    for (let index = 0; index < expression.length; index += 1) {
      const char = expression[index];
      const token = {
        id: `${prefix}-tok-${index}`,
        index,
        char,
        kind: 'text'
      };

      if (OPENERS.includes(char)) {
        token.kind = 'open';
        token.bracket = char;
        stack.push(token);
      } else if (CLOSERS.includes(char)) {
        token.kind = 'close';
        token.bracket = char;
        const expected = MATCH[char];
        let opener = null;
        for (let stackIndex = stack.length - 1; stackIndex >= 0; stackIndex -= 1) {
          if (stack[stackIndex].bracket === expected) {
            opener = stack.splice(stackIndex, 1)[0];
            break;
          }
        }
        if (opener) {
          pairs.push({ openId: opener.id, closeId: token.id });
          pairMap.set(opener.id, token.id);
          pairMap.set(token.id, opener.id);
        }
      }

      tokens.push(token);
    }

    const duration = performance.now() - t0;
    console.log(`[MV-P02] buildPairs(${expression.length}) took ${duration.toFixed(3)}ms`);

    return { tokens, pairs, pairMap, duration };
  }

  function renderInto(container, expression, options = {}) {
    const prefix = options.prefix || 'mv-p02';
    const { tokens, pairs, pairMap } = buildPairs(expression, prefix);

    container.textContent = '';
    const tokenElements = new Map();

    const clearHighlights = () => {
      container.querySelectorAll('.mv-p02-token.is-highlighted').forEach((el) => {
        el.classList.remove('is-highlighted');
      });
    };

    tokens.forEach((token) => {
      if (token.kind === 'open' || token.kind === 'close') {
        const span = document.createElement('span');
        span.className = 'mv-p02-token';
        span.dataset.tokenId = token.id;
        span.textContent = token.char;
        span.addEventListener('click', (event) => {
          if (options.stopClickPropagation) {
            event.stopPropagation();
          }
          clearHighlights();
          span.classList.add('is-highlighted');
          const partnerId = pairMap.get(token.id);
          if (partnerId && tokenElements.has(partnerId)) {
            tokenElements.get(partnerId).classList.add('is-highlighted');
          }
          if (typeof options.onTokenClick === 'function') {
            options.onTokenClick(token, partnerId, span, partnerId ? tokenElements.get(partnerId) : undefined);
          }
        });
        container.append(span);
        tokenElements.set(token.id, span);
      } else {
        container.append(document.createTextNode(token.char));
      }
    });

    return { tokens, pairs, pairMap, tokenElements, clearHighlights };
  }

  function runQuickSelfTest() {
    const results = expressions.map((expr) => {
      const { pairs } = buildPairs(expr.text, `${expr.id}-selftest`);
      return {
        exprId: expr.id,
        label: expr.label,
        expectedPairs: expr.expectedPairs,
        actualPairs: pairs.length,
        passed: pairs.length === expr.expectedPairs
      };
    });

    return {
      passed: results.every((result) => result.passed),
      results
    };
  }

  global.mvP02 = {
    expressions,
    buildPairs,
    renderInto,
    runQuickSelfTest
  };
})(window);
