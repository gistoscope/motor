/**
 * Dev-only ICU hook for diagnostics.
 * ICU-04: Bracket pairing (click any bracket → highlight its pair).
 * Also preserves ICU-03 baseline (hover/click).
 */
(function(){
  const play = document.getElementById('play');
  if (!play) return;

  const badge = (ok, msg) => `<span class="badge ${ok===true?'ok':ok===false?'err':'warn'}">${msg}</span>`;
  const $ = (id) => document.getElementById(id);

  const OPEN = new Set(['(', '[', '{']);
  const CLOSE = new Set([')', ']', '}']);
  const MATCH = { ')': '(', ']': '[', '}': '{' };
  const MATCH_OPEN_TO_CLOSE = { '(':')', '[':']', '{':'}' };

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
    if (!w || !d) { $('icu_brackets_status')?.innerHTML = badge(false, 'FAIL (iframe not ready)'); return; }

    if (!w.__icu) {
      w.__icu = { hoverReady:false, clickReady:false, bracketsReady:false, dragReady:false, multiReady:false, selection:{regions:[],focusIndex:null} };
    }

    const root = d.querySelector('.katex .katex-html') || d.querySelector('.katex-html');
    if (!root) { $('icu_brackets_status')?.innerHTML = badge(false, 'FAIL (no KaTeX root)'); return; }

    // Build token list and compute bracket pairs (indices in stream)
    const toks = [...root.querySelectorAll('[id^="tok:"]')].filter(el => el instanceof HTMLElement);
    const idx = new Map(toks.map((el,i)=>[el.id, i]));
    const stack = { '(':[], '[':[], '{':[] };
    const pairById = new Map(); // id -> {openId, closeId, openIndex, closeIndex, level}
    let levels = 0;

    for (let i=0;i<toks.length;i++){
      const el = toks[i];
      const t = tokText(el);
      const ch = t[0];
      if (OPEN.has(ch)) {
        stack[ch].push({ id: el.id, i, level: levels++ });
      } else if (CLOSE.has(ch)) {
        const openCh = MATCH[ch];
        const rec = stack[openCh]?.pop?.();
        if (rec) {
          const pair = { openId: rec.id, closeId: el.id, openIndex: rec.i, closeIndex: i, level: rec.level };
          pairById.set(rec.id, pair);
          pairById.set(el.id, pair);
        }
      }
    }

    function render() {
      const ok = w.__icu.bracketsReady === true;
      $('icu_brackets_status')?.innerHTML = badge(ok ? true : null, ok ? 'OK (pair highlighted)' : 'PENDING (click a bracket)');
      const okBase = (w.__icu.hoverReady && w.__icu.clickReady);
      $('icu_status')?.innerHTML = badge(okBase ? true : null, okBase ? 'OK (hover+click baseline)' : 'PENDING (move & click)');
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
      clear(d, 'icu-selected');
      clear(d, 'icu-bracket');
      if (tok && tok instanceof HTMLElement) {
        tok.classList.add('icu-selected');
        const t = tokText(tok)[0];
        if (OPEN.has(t) || CLOSE.has(t)) {
          const pair = pairById.get(tok.id);
          if (pair) {
            const openEl = d.getElementById(pair.openId);
            const closeEl = d.getElementById(pair.closeId);
            openEl?.classList.add('icu-bracket');
            closeEl?.classList.add('icu-bracket');
            w.__icu.bracketsReady = true;
          }
        }
      }
      w.__icu.clickReady = true;
      render();
    }

    function onKeydown(ev){
      if (ev.key === 'Escape') {
        clear(d, 'icu-selected'); clear(d,'icu-hovered'); clear(d,'icu-bracket');
        render();
      }
    }

    d.addEventListener('pointermove', onPointerMove, true);
    d.addEventListener('click', onClickCapture, true);
    d.addEventListener('keydown', onKeydown, true);

    render();
  });
})();
