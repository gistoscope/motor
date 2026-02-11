(function () {
  const PASS_CLASS = 'mv-p02-pass';
  const FAIL_CLASS = 'mv-p02-fail';

  const record = (store, listEl, name, passed, detail) => {
    store.push({ name, passed, detail });
    const item = document.createElement('li');
    item.className = passed ? PASS_CLASS : FAIL_CLASS;
    item.textContent = `${passed ? 'PASS' : 'FAIL'} · ${name}`;
    if (detail) {
      item.append(document.createTextNode(` (${detail})`));
    }
    listEl.append(item);
  };

  document.addEventListener('DOMContentLoaded', () => {
    const app = window.mvP02;
    if (!app) {
      console.error('mvP02 utilities are missing');
      return;
    }

    const summaryEl = document.getElementById('mv-p02-test-summary');
    const resultsList = document.getElementById('mv-p02-test-results');
    const gridEl = document.getElementById('mv-p02-test-grid');

    const results = [];

    app.expressions.forEach((expr, index) => {
      const card = document.createElement('article');
      card.className = 'mv-p02-test-card';

      const heading = document.createElement('h3');
      heading.textContent = `${index + 1}. ${expr.label}`;
      card.append(heading);

      const caption = document.createElement('p');
      caption.className = 'mv-p02-card-caption';
      caption.textContent = expr.text;
      card.append(caption);

      const mount = document.createElement('div');
      mount.className = 'mv-p02-test-expression';
      card.append(mount);

      gridEl.append(card);

      const renderResult = app.renderInto(mount, expr.text, {
        prefix: `${expr.id}-dev`
      });

      const pairName = `${expr.label} · pairCount>0`;
      record(results, resultsList, pairName, renderResult.pairs.length > 0, `pairCount=${renderResult.pairs.length}`);

      if (typeof expr.expectedPairs === 'number') {
        const exactName = `${expr.label} · expected pairCount`;
        record(
          results,
          resultsList,
          exactName,
          renderResult.pairs.length === expr.expectedPairs,
          `expected ${expr.expectedPairs}, got ${renderResult.pairs.length}`
        );
      }

      renderResult.tokens.forEach((token) => {
        if (token.kind !== 'open' && token.kind !== 'close') {
          return;
        }
        const el = renderResult.tokenElements.get(token.id);
        if (!el) {
          record(results, resultsList, `${expr.label} · token ${token.id}`, false, 'missing DOM element');
          return;
        }
        el.click();
        const highlighted = mount.querySelectorAll('.mv-p02-token.is-highlighted').length;
        record(
          results,
          resultsList,
          `${expr.label} · click ${token.char}@${token.index}`,
          highlighted === 2,
          `${highlighted} highlighted`
        );
      });

      renderResult.clearHighlights();
    });

    const passed = results.filter((result) => result.passed).length;
    summaryEl.textContent = `${passed} / ${results.length} checks passed`;
  });
})();
