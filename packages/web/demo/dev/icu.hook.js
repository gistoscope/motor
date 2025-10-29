/**
 * Dev-only ICU hook for diagnostics.
 * ICU-06: Drag ladder (token → bracket content → whole expr) with hysteresis & preview.
 * Includes ICU-05 dblclick promote, ICU-04 brackets, ICU-03 baseline.
 * ICU-07 adds bracket hierarchy explorer.
 */
(function(){
  const play = document.getElementById('play');
  if (!play) return;

  const diagDoc = document;
  const badge = (ok, msg) => `<span class="badge ${ok===true?'ok':ok===false?'err':'warn'}">${msg}</span>`;
  const $ = (id) => diagDoc.getElementById(id);

  const OPEN = new Set(['(', '[', '{']);
  const CLOSE = new Set([')', ']', '}']);
  const MATCH = { ')': '(', ']': '[', '}': '{' };
  const MAX_BH_CLASS = 4;
  const BH_CLASSES = Array.from({ length: MAX_BH_CLASS }, (_, i) => `icu-bh-lvl${i + 1}`);

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

  const clear = (d, cls) => d.querySelectorAll('.' + cls).forEach((n) => n.classList.remove(cls));
  const addMany = (els, cls) => els.forEach((el) => el.classList.add(cls));

  const ensureBhPanel = (() => {
    let cache = null;
    return () => {
      if (cache) return cache;
      const panel = diagDoc.createElement('div');
      panel.id = 'icu_bh_panel';
      panel.style.margin = '12px 0 0';
      panel.style.padding = '8px 0 0';
      panel.style.borderTop = '1px solid #e5e7eb';

      const title = diagDoc.createElement('div');
      title.textContent = 'Bracket hierarchy';
      title.className = 'muted';
      title.style.fontWeight = '600';
      title.style.marginBottom = '4px';

      const ui = diagDoc.createElement('div');
      ui.id = 'icu_bh_ui';
      ui.className = 'muted';
      ui.textContent = 'Hover a token to inspect.';
      ui.style.display = 'flex';
      ui.style.flexWrap = 'wrap';
      ui.style.gap = '4px';

      panel.appendChild(title);
      panel.appendChild(ui);

      const grid = diagDoc.getElementById('grid');
      grid?.insertAdjacentElement('afterend', panel);

      cache = { panel, title, ui, handler: null };
      return cache;
    };
  })();

  function setBhButtonStyle(btn, active){
    btn.style.margin = '2px 8px 2px 0';
    btn.style.padding = '2px 10px';
    btn.style.borderRadius = '6px';
    btn.style.border = '1px solid ' + (active ? '#0ea5e9' : '#d1d5db');
    btn.style.background = active ? '#e0f2fe' : '#f3f4f6';
    btn.style.color = active ? '#0369a1' : '#111827';
    btn.style.cursor = 'pointer';
    btn.style.font = '600 12px/1.4 system-ui, sans-serif';
  }

  play.addEventListener('load', () => {
    const w = play.contentWindow;
    const d = w?.document;
    if (!w || !d) {
      $('icu_drag_status')?.innerHTML = badge(false, 'FAIL (iframe not ready)');
      $('icu_bh_status')?.innerHTML = badge(false, 'FAIL (iframe not ready)');
      return;
    }

    if (!w.__icu) {
      w.__icu = {
        hoverReady: false,
        clickReady: false,
        bracketsReady: false,
        dragReady: false,
        multiReady: false,
        selection: { regions: [], focusIndex: null },
      };
    }
    w.__icu.navReady ??= false;
    w.__icu.bhReady ??= false;
    w.__icu.bhSelectedLevel ??= null;
    w.__icu.bhLevelCount ??= 0;

    const root = d.querySelector('.katex .katex-html') || d.querySelector('.katex-html');
    if (!root) {
      $('icu_drag_status')?.innerHTML = badge(false, 'FAIL (no KaTeX root)');
      $('icu_bh_status')?.innerHTML = badge(false, 'FAIL (no KaTeX root)');
      return;
    }

    const toks = [...root.querySelectorAll('[id^="tok:"]')].filter((el) => el instanceof HTMLElement);
    const stack = { '(': [], '[': [], '{': [] };
    const pairById = new Map();
    const levelsByTok = new Map();

    const ensureLevels = (tokId) => {
      let arr = levelsByTok.get(tokId);
      if (!arr) {
        arr = [];
        levelsByTok.set(tokId, arr);
      }
      return arr;
    };

    for (let i = 0; i < toks.length; i++) {
      const el = toks[i];
      const ch = tokText(el)[0];
      if (OPEN.has(ch)) {
        stack[ch].push({ id: el.id, i });
      } else if (CLOSE.has(ch)) {
        const openCh = MATCH[ch];
        const rec = stack[openCh]?.pop?.();
        if (rec) {
          const span = i - rec.i;
          const contentSlice = toks.slice(rec.i, i + 1);
          const contentIds = contentSlice.map((node) => node.id);
          const displayText = contentSlice.map((node) => tokText(node)).join('');
          const pair = {
            openId: rec.id,
            closeId: el.id,
            openIndex: rec.i,
            closeIndex: i,
            level: stack[openCh].length,
            span,
            contentIds,
            displayText,
          };
          pairById.set(rec.id, pair);
          pairById.set(el.id, pair);
          for (let j = rec.i; j <= i; j++) {
            ensureLevels(toks[j].id).push(pair);
          }
        }
      }
    }

    for (const arr of levelsByTok.values()) {
      arr.sort((a, b) => a.span - b.span);
    }

    const smallestEnclosingPair = (tokId) => {
      const arr = levelsByTok.get(tokId);
      return arr && arr.length ? arr[0] : null;
    };

    const panel = ensureBhPanel();
    panel.ui.textContent = 'Hover a token to inspect.';
    panel.ui.classList.add('muted');
    if (panel.handler) {
      panel.ui.removeEventListener('click', panel.handler);
    }

    const bhState = { tokId: null, levels: [], tokenText: '', selectedIndex: null };

    const clearBhHighlights = () => {
      BH_CLASSES.forEach((cls) => clear(d, cls));
    };

    const updateBhButtonStyles = () => {
      const buttons = [...panel.ui.querySelectorAll('button[data-level-index]')];
      buttons.forEach((btn) => {
        const idxVal = Number.parseInt(btn.dataset.levelIndex || '', 10);
        setBhButtonStyle(btn, idxVal === bhState.selectedIndex);
      });
    };

    const formatDisplayText = (text) => {
      if (!text) return '';
      const compact = text.replace(/\s+/g, ' ');
      return compact.length > 28 ? compact.slice(0, 27) + '…' : compact;
    };

    const updateBhPanel = (tok) => {
      const tokId = tok?.id || null;
      if (bhState.tokId === tokId) return;

      bhState.tokId = tokId;
      bhState.tokenText = tok ? tokText(tok) : '';
      bhState.selectedIndex = null;

      clearBhHighlights();
      w.__icu.bhReady = false;
      w.__icu.bhSelectedLevel = null;

      if (!tokId) {
        bhState.levels = [];
        w.__icu.bhLevelCount = 0;
        panel.ui.textContent = 'Hover a token to inspect.';
        panel.ui.classList.add('muted');
        return;
      }

      const levels = [...(levelsByTok.get(tokId) ?? [])];
      levels.sort((a, b) => a.span - b.span);
      bhState.levels = levels;
      w.__icu.bhLevelCount = levels.length;

      if (!levels.length) {
        const label = bhState.tokenText || tokId;
        panel.ui.textContent = `No brackets for ${label}`;
        panel.ui.classList.add('muted');
        return;
      }

      panel.ui.innerHTML = '';
      panel.ui.classList.remove('muted');
      levels.forEach((pair, idxVal) => {
        const btn = diagDoc.createElement('button');
        btn.type = 'button';
        btn.dataset.levelIndex = String(idxVal);
        btn.textContent = `L${idxVal + 1}: ${formatDisplayText(pair.displayText)}`;
        setBhButtonStyle(btn, false);
        panel.ui.appendChild(btn);
      });
    };

    const applyBhLevel = (levelIndex) => {
      const pair = bhState.levels[levelIndex];
      if (!pair) return;
      clearBhHighlights();
      const className = BH_CLASSES[Math.min(levelIndex, MAX_BH_CLASS - 1)];
      const nodes = pair.contentIds.map((idVal) => d.getElementById(idVal)).filter(Boolean);
      addMany(nodes, className);
      bhState.selectedIndex = levelIndex;
      updateBhButtonStyles();
      w.__icu.bhReady = true;
      w.__icu.bhSelectedLevel = levelIndex;
      w.__icu.bhLevelCount = bhState.levels.length;
    };

    const handleBhClick = (ev) => {
      const target = ev.target;
      if (!(target instanceof HTMLButtonElement)) return;
      const levelIndex = Number.parseInt(target.dataset.levelIndex || '', 10);
      if (!Number.isFinite(levelIndex)) return;
      applyBhLevel(levelIndex);
      render();
    };

    panel.handler = handleBhClick;
    panel.ui.addEventListener('click', handleBhClick);

    function render(){
      const okBase = w.__icu.hoverReady && w.__icu.clickReady;
      $('icu_status')?.innerHTML = badge(okBase ? true : null, okBase ? 'OK (hover+click baseline)' : 'PENDING (move & click)');
      $('icu_brackets_status')?.innerHTML = badge(w.__icu.bracketsReady ? true : null, w.__icu.bracketsReady ? 'OK (pair highlighted)' : 'PENDING (click a bracket)');
      $('icu_nav_status')?.innerHTML = badge(w.__icu.navReady ? true : null, w.__icu.navReady ? 'OK (dblclick promote)' : 'PENDING (double-click a token)');
      $('icu_drag_status')?.innerHTML = badge(w.__icu.dragReady ? true : null, w.__icu.dragReady ? 'OK (ladder engaged)' : 'PENDING (drag from a token)');

      let bhMsg = 'PENDING (hover token)';
      if (bhState.tokId) {
        if (!bhState.levels.length) {
          const label = bhState.tokenText || bhState.tokId;
          bhMsg = `PENDING (no brackets for ${label})`;
        } else if (!w.__icu.bhReady) {
          bhMsg = 'PENDING (click a level)';
        } else {
          const total = w.__icu.bhLevelCount || bhState.levels.length || 1;
          const idxVal = (w.__icu.bhSelectedLevel ?? 0) + 1;
          bhMsg = `OK (L${idxVal}/${total})`;
        }
      }
      $('icu_bh_status')?.innerHTML = badge(w.__icu.bhReady ? true : null, bhMsg);
    }

    function onPointerMove(ev){
      const path = ev.composedPath?.() ?? [];
      const tok = path.find(isTok);
      updateBhPanel(tok && tok instanceof HTMLElement ? tok : null);
      updateBhButtonStyles();
      const leaf = pickVisibleLeaf(tok || path.find((n) => n instanceof HTMLElement));
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
      clear(d, 'icu-selected-alt1');
      clear(d, 'icu-preview');
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
      const p = smallestEnclosingPair(tok.id);
      clear(d, 'icu-selected-alt1');
      if (p) {
        for (let i = p.openIndex + 1; i < p.closeIndex; i++) toks[i].classList.add('icu-selected-alt1');
        w.__icu.navReady = true;
      } else {
        tok.classList.add('icu-selected-alt1');
        w.__icu.navReady = true;
      }
      render();
    }

    let dragCtx = null;
    const SNAP = 24;

    const buildLevels = (anchorTokId) => {
      const levels = [];
      levels.push([anchorTokId]);
      const p = smallestEnclosingPair(anchorTokId);
      if (p) levels.push(toks.slice(p.openIndex + 1, p.closeIndex).map((el) => el.id));
      levels.push(toks.map((el) => el.id));
      return levels;
    };

    function applyLevel(levelIndex){
      clear(d, 'icu-selected');
      clear(d, 'icu-preview');
      const ids = dragCtx.levels[levelIndex] || [];
      addMany(ids.map((idVal) => d.getElementById(idVal)).filter(Boolean), 'icu-selected');
      const next = dragCtx.levels[levelIndex + 1] || null;
      if (next) addMany(next.map((idVal) => d.getElementById(idVal)).filter(Boolean), 'icu-preview');
      $('icu_drag_status')?.innerHTML = badge(true, `OK (level ${levelIndex + 1}/${dragCtx.levels.length})`);
    }

    function onPointerDown(ev){
      const path = ev.composedPath?.() ?? [];
      const tok = path.find(isTok);
      if (!tok || !(tok instanceof HTMLElement)) return;

      const startX = ev.clientX;
      dragCtx = {
        anchorId: tok.id,
        levels: buildLevels(tok.id),
        current: 0,
        startX,
      };
      applyLevel(0);
      w.__icu.dragReady = true;
      render();

      d.addEventListener('pointermove', onPointerDrag, true);
      d.addEventListener('pointerup', onPointerUp, true);
      d.addEventListener('pointercancel', onPointerUp, true);
    }

    function onPointerDrag(ev){
      if (!dragCtx) return;
      const dist = Math.abs((ev.clientX || 0) - dragCtx.startX);
      const lvl = Math.min(Math.floor(dist / SNAP), dragCtx.levels.length - 1);
      if (lvl !== dragCtx.current) {
        dragCtx.current = lvl;
        applyLevel(lvl);
      }
    }

    function onPointerUp(){
      d.removeEventListener('pointermove', onPointerDrag, true);
      d.removeEventListener('pointerup', onPointerUp, true);
      d.removeEventListener('pointercancel', onPointerUp, true);
      clear(d, 'icu-preview');
      dragCtx = null;
      render();
    }

    function onKeydown(ev){
      if (ev.key === 'Escape') {
        clear(d, 'icu-selected');
        clear(d, 'icu-hovered');
        clear(d, 'icu-bracket');
        clear(d, 'icu-selected-alt1');
        clear(d, 'icu-preview');
        clearBhHighlights();
        bhState.selectedIndex = null;
        w.__icu.bhReady = false;
        w.__icu.bhSelectedLevel = null;
        updateBhButtonStyles();
        render();
      }
    }

    d.addEventListener('pointermove', onPointerMove, true);
    d.addEventListener('click', onClickCapture, true);
    d.addEventListener('dblclick', onDblClick, true);
    d.addEventListener('keydown', onKeydown, true);
    d.addEventListener('pointerdown', onPointerDown, true);

    render();
  });
})();
