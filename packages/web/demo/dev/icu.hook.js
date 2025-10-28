/**
 * Dev-only ICU hook for diagnostics.
 * ICU-05: Navigator (dblclick → promote to nearest bracket group).
 * Includes ICU-04 bracket pairing + ICU-03 baseline.
 */
(function(){
  const play = document.getElementById('play');
  if (!play) return;

  const badge = (ok, msg) => `<span class="badge ${ok===true?'ok':ok===false?'err':'warn'}">${msg}</span>`;
  const $ = (id) => document.getElementById(id);

  const OPEN = new Set(['(', '[', '{']);
  const CLOSE = new Set([')', ']', '}']);
  const MATCH = { ')': '(', ']': '[', '}': '{' };

  function pickVisibleLeaf(el){
    if (!el) return null;
    let node = el;
    while (node && node.firstElementChild) node = node.firstElementChild;
    while (node && node instanceof HTMLElement) {
      const r = node.getBoundingClientRect();
      if (r && r.width > 0 && r.height > 0) return node;
      node = node.parentElement;
    }
    return el;
  }
  const isTok = (n) => n && n.id && typeof n.id === 'string' && n.id.startsWith('tok:');
  const tokText = (tok) => {
    if (!tok || !(tok instanceof HTMLElement)) return '';
    const leaf = pickVisibleLeaf(tok);
    return (leaf?.textContent || tok.textContent || '').trim();
  };
  const clear = (d, cls) => d.querySelectorAll('.'+cls).forEach(n => n.classList.remove(cls));

  play.addEventListener('load', () => {
    const w = play.contentWindow;
    const d = w?.document;
    if (!w || !d) { $('icu_nav_status')?.innerHTML = badge(false, 'FAIL (iframe not ready)'); return; }

    if (!w.__icu) {
      w.__icu = { hoverReady:false, clickReady:false, bracketsReady:false, dragReady:false, multiReady:false, selection:{regions:[],focusIndex:null} };
    }
    w.__icu.navReady ??= false;

    const root = d.querySelector('.katex .katex-html') || d.querySelector('.katex-html');
    if (!root) { $('icu_nav_status')?.innerHTML = badge(false, 'FAIL (no KaTeX root)'); return; }

    // Build token list and pairs
    const toks = [...root.querySelectorAll('[id^="tok:"]')].filter(el => el instanceof HTMLElement);
    const idx = new Map(toks.map((el,i)=>[el.id, i]));
    const stack = { '(':[], '[':[], '{':[] };
    const pairs = [];
    const pairById = new Map();

    for (let i=0;i<toks.length;i++){
      const el = toks[i];
      const ch = tokText(el)[0];
      if (OPEN.has(ch)) {
        stack[ch].push({ id: el.id, i });
      } else if (CLOSE.has(ch)) {
        const openCh = MATCH[ch];
        const rec = stack[openCh]?.pop?.();
        if (rec) {
          const pair = { openId: rec.id, closeId: el.id, openIndex: rec.i, closeIndex: i, level: stack[openCh].length };
          pairs.push(pair);
          pairById.set(rec.id, pair); pairById.set(el.id, pair);
        }
      }
    }

    const smallestEnclosingPair = (tokId) => {
      const i = idx.get(tokId);
      if (i == null) return null;
      let best = null, bestSpan = Infinity;
      for (const p of pairs) {
        if (p.openIndex < i && i < p.closeIndex) {
          const span = p.closeIndex - p.openIndex;
          if (span < bestSpan) { best = p; bestSpan = span; }
        }
      }
      return best;
    };

    function render() {
      const okBase = (w.__icu.hoverReady && w.__icu.clickReady);
      $('icu_status')?.innerHTML = badge(okBase ? true : null, okBase ? 'OK (hover+click baseline)' : 'PENDING (move & click)');
      $('icu_brackets_status')?.innerHTML = badge(w.__icu.bracketsReady ? true : null, w.__icu.bracketsReady ? 'OK (pair highlighted)' : 'PENDING (click a bracket)');
      $('icu_nav_status')?.innerHTML = badge(w.__icu.navReady ? true : null, w.__icu.navReady ? 'OK (dblclick promote)' : 'PENDING (double-click a token)');
    }

    function onPointerMove(ev){
      const path = ev.composedPath?.() ?? [];
      const tok = path.find(isTok);
      const leaf = pickVisibleLeaf(tok || path.find(n => n instanceof HTMLElement));
      clear(d, 'icu-hovered');
      if (leaf && leaf instanceof HTMLElement) leaf.classList.add('icu-hovered');
      w.__icu.hoverReady = true;
      render();
    }

    function onClickCapture(ev){
      const path = ev.composedPath?.() ?? [];
      const tok = path.find(isTok);
      clear(d, 'icu-selected'); clear(d,'icu-bracket'); clear(d, 'icu-selected-alt1');
      if (tok && tok instanceof HTMLElement) {
        tok.classList.add('icu-selected');
        const ch = tokText(tok)[0];
        if (OPEN.has(ch) || CLOSE.has(ch)) {
          const pair = pairById.get(tok.id);
          if (pair) {
            d.getElementById(pair.openId)?.classList.add('icu-bracket');
            d.getElementById(pair.closeId)?.classList.add('icu-bracket');
            w.__icu.bracketsReady = true;
          }
        }
      }
      w.__icu.clickReady = true;
      render();
    }

    function onDblClick(ev){
      const path = ev.composedPath?.() ?? [];
      const tok = path.find(isTok);
      if (!tok || !(tok instanceof HTMLElement)) return;

      // Promote to smallest enclosing bracket content
      const p = smallestEnclosingPair(tok.id);
      clear(d, 'icu-selected-alt1');
      if (p) {
        for (let i = p.openIndex+1; i < p.closeIndex; i++) {
          toks[i].classList.add('icu-selected-alt1');
        }
        w.__icu.navReady = true;
      } else {
        // Fallback: promote current token only (no brackets context)
        tok.classList.add('icu-selected-alt1');
        w.__icu.navReady = true;
      }
      render();
    }

    function onKeydown(ev){
      if (ev.key === 'Escape') {
        clear(d, 'icu-selected'); clear(d,'icu-hovered'); clear(d,'icu-bracket'); clear(d, 'icu-selected-alt1');
        render();
      }
    }

    d.addEventListener('pointermove', onPointerMove, true);
    d.addEventListener('click', onClickCapture, true);
    d.addEventListener('dblclick', onDblClick, true);
    d.addEventListener('keydown', onKeydown, true);

    render();
  });
})();
