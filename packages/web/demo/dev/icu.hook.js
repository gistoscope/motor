/**
 * Dev-only ICU hook for diagnostics.
 * ICU-06: Drag ladder (token → bracket content → whole expr) with hysteresis & preview.
 * Includes ICU-05 dblclick promote, ICU-04 brackets, ICU-03 baseline.
 * ICU-07 adds bracket hierarchy explorer.
 * ICU-08 adds keyboard navigation (structure, siblings, tokens).
 * ICU-09 introduces SelectionState + __icuDebug inspector/simulator.
 */
(function () {
  const play = document.getElementById('play');
  if (!play) return;

  const diagDoc = document;
  const badge = (ok, msg) => `<span class="badge ${ok === true ? 'ok' : ok === false ? 'err' : 'warn'}">${msg}</span>`;
  const $ = (id) => diagDoc.getElementById(id);

  // SAFE helper: never assign with optional chaining on LHS
  const setHTML = (id, html) => {
    const el = diagDoc.getElementById(id);
    if (el) el.innerHTML = html;
  };

  const OPEN = new Set(['(', '[', '{']);
  const CLOSE = new Set([')', ']', '}']);
  const MATCH = { ')': '(', ']': '[', '}': '{' };
  const MAX_BH_CLASS = 4;
  const BH_CLASSES = Array.from({ length: MAX_BH_CLASS }, (_, i) => `icu-bh-lvl${i + 1}`);

  const SELECTION_CHANNELS = {
    primary: { className: 'icu-selected', role: 'primary', slot: 'a', label: 'Primary selection' },
    alt: { className: 'icu-selected-alt1', role: 'alternate', slot: 'b', label: 'Alternate selection' },
    bracket: { className: 'icu-bracket', role: 'bracket', slot: null, label: 'Bracket pair' },
    preview: { className: 'icu-preview', role: 'preview', slot: null, label: 'Preview (drag next level)' },
    focus: { className: 'icu-focus', role: 'focus', slot: null, label: 'Keyboard focus' },
  };
  const CHANNEL_ORDER = ['primary', 'alt', 'focus', 'bracket', 'preview'];

  function pickVisibleLeaf(el) {
    if (!el || el.nodeType !== Node.ELEMENT_NODE) return null;
    let node = el;
    while (node && node.firstElementChild) node = node.firstElementChild;
    while (node && node.nodeType === Node.ELEMENT_NODE) {
      const r = typeof node.getBoundingClientRect === 'function' ? node.getBoundingClientRect() : null;
      if (r && r.width > 0 && r.height > 0) return node;
      node = node.parentElement;
    }
    return el;
  }

  const isTok = (n) => n && n.id && typeof n.id === 'string' && n.id.startsWith('tok:');
  const tokText = (tok) => {
    if (!tok || tok.nodeType !== Node.ELEMENT_NODE) return '';
    const leaf = pickVisibleLeaf(tok);
    return (leaf?.textContent || tok.textContent || '').trim();
  };

  const SELECTED_CLASS = 'math-token--selected';

  const clear = (d, cls) =>
    d.querySelectorAll('.' + cls).forEach((n) => {
      n.classList.remove(cls);
      if (cls === 'icu-selected') {
        n.classList.remove(SELECTED_CLASS);
      }
    });

  const addMany = (els, cls) =>
    els.forEach((el) => {
      el.classList.add(cls);
      if (cls === 'icu-selected') {
        el.classList.add(SELECTED_CLASS);
      }
    });

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

  function setBhButtonStyle(btn, active) {
    btn.style.margin = '2px 8px 2px 0';
    btn.style.padding = '2px 10px';
    btn.style.borderRadius = '6px';
    btn.style.border = '1px solid ' + (active ? '#0ea5e9' : '#d1d5db');
    btn.style.background = active ? '#e0f2fe' : '#f3f4f6';
    btn.style.color = active ? '#0369a1' : '#111827';
    btn.style.cursor = 'pointer';
    btn.style.font = '600 12px/1.4 system-ui, sans-serif';
  }

  function installDebugAPI(w, ctx) {
    const state = ctx.debugState;
    const api = {
      state,
      inspect: {
        token(id) {
          if (!id) return null;
          const token = ctx.tokenNodeById.get(id);
          if (!token) return null;
          const text = tokText(token.el);
          const bracketLevels = (ctx.levelsByTok.get(id) ?? []).map((pair) => ({
            openId: pair.openId,
            closeId: pair.closeId,
            level: pair.level,
            span: pair.span,
          }));
          return {
            id,
            index: token.index,
            text,
            type: token.type,
            parentId: token.parent?.id ?? null,
            bracketLevels,
          };
        },
        selection(index) {
          const selection = state.selection;
          if (typeof index === 'number') return selection.regions[index] ?? null;
          return selection.regions.map((region) => ({
            channel: region.channel,
            slot: region.slot,
            count: region.tokenIds.length,
            sample: region.sample,
            role: region.role,
          }));
        },
      },
      simulate: {
        click(id) {
          if (!id) return false;
          const el = ctx.document.getElementById(id);
          if (!(el instanceof w.HTMLElement)) return false;
          ctx.handleClick(el, { simulated: true });
          return true;
        },
        dblclick(id) {
          if (!id) return false;
          const el = ctx.document.getElementById(id);
          if (!(el instanceof w.HTMLElement)) return false;
          ctx.handleDblClick(el, { simulated: true });
          return true;
        },
        drag(fromId, toId) {
          if (!fromId) return false;
          const levels = ctx.buildLevels(fromId);
          if (!levels.length) return false;
          let levelIndex = 0;
          if (toId) {
            const idx = levels.findIndex((ids) => ids.includes(toId));
            if (idx >= 0) levelIndex = idx;
            else levelIndex = levels.length - 1;
          }
          ctx.beginDrag(fromId, { simulated: true });
          ctx.applyDragLevel(levelIndex, { simulated: true });
          ctx.finishDrag({ simulated: true });
          return true;
        },
      },
    };
    w.__icuDebug = api;
    return api;
  }

  play.addEventListener('load', () => {
    const w = play.contentWindow;
    const d = w?.document;
    if (!w || !d) {
      setHTML('icu_drag_status', badge(false, 'FAIL (iframe not ready)'));
      setHTML('icu_bh_status', badge(false, 'FAIL (iframe not ready)'));
      setHTML('icu_kb_status', badge(false, 'FAIL (iframe not ready)'));
      setHTML('icu_sel_status', badge(false, 'FAIL (iframe not ready)'));
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
    w.__icu.kbReady ??= false;

    const root = d.querySelector('.katex .katex-html') || d.querySelector('.katex-html');
    if (!root) {
      setHTML('icu_drag_status', badge(false, 'FAIL (no KaTeX root)'));
      setHTML('icu_bh_status', badge(false, 'FAIL (no KaTeX root)'));
      setHTML('icu_kb_status', badge(false, 'FAIL (no KaTeX root)'));
      setHTML('icu_sel_status', badge(false, 'FAIL (no KaTeX root)'));
      return;
    }

    const toks = [...root.querySelectorAll('[id]')].filter((el) => el instanceof w.HTMLElement);
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

    const rootGroup = {
      type: 'group',
      id: 'group:root',
      parent: null,
      children: [],
      tokenIds: toks.map((el) => el.id),
      pair: null,
    };
    const groupStack = [rootGroup];
    const tokenNodes = [];
    const tokenNodeById = new Map();

    for (let i = 0; i < toks.length; i++) {
      const el = toks[i];
      const ch = tokText(el)[0];
      const topGroup = groupStack[groupStack.length - 1] || rootGroup;

      if (CLOSE.has(ch)) {
        const tokenNode = { type: 'token', id: el.id, index: i, el, parent: topGroup };
        tokenNodes.push(tokenNode);
        tokenNodeById.set(el.id, tokenNode);
        topGroup.children.push(tokenNode);
        const pair = pairById.get(el.id);
        if (pair && topGroup && topGroup.pair === pair) {
          groupStack.pop();
        }
        continue;
      }

      const tokenNode = { type: 'token', id: el.id, index: i, el, parent: topGroup };
      tokenNodes.push(tokenNode);
      tokenNodeById.set(el.id, tokenNode);
      topGroup.children.push(tokenNode);

      if (OPEN.has(ch)) {
        const pair = pairById.get(el.id);
        if (pair && pair.openId === el.id) {
          topGroup.children.pop();
          const groupNode = {
            type: 'group',
            id: `group:${pair.openId}:${pair.closeId}`,
            parent: topGroup,
            children: [tokenNode],
            tokenIds: [...pair.contentIds],
            pair,
          };
          tokenNode.parent = groupNode;
          topGroup.children.push(groupNode);
          groupStack.push(groupNode);
        }
      }
    }

    const navState = {
      focus: null,
      lastChildByParent: new Map(),
      statusMsg: 'PENDING (select a token & use keyboard)',
    };

    const describeNode = (node) => {
      if (!node) return '—';
      if (node.type === 'token') {
        const text = tokText(node.el);
        return text ? `token "${text}"` : `token ${node.id}`;
      }
      if (!node.pair) return 'whole expression';
      const text = formatDisplayText(node.pair.displayText);
      if (text) return `group "${text}"`;
      const openTok = d.getElementById(node.pair.openId);
      const openLabel = tokText(openTok);
      return openLabel ? `group starting ${openLabel}` : `group ${node.pair.openId}`;
    };

    const channelState = new Map();
    let selectionVersion = 0;
    const debugState = {
      selection: { regions: [], focusIndex: null, source: null, version: 0 },
      hoverTokenId: null,
      dragContext: null,
      perf: { lastSelectionMs: 0 },
    };

    const slotClassFor = (slot) => (slot ? `icu-region-${slot}` : null);

    const removeChannelClasses = (name) => {
      const cfg = SELECTION_CHANNELS[name];
      if (!cfg) return;
      const rec = channelState.get(name);
      if (!rec) return;
      const slotCls = slotClassFor(cfg.slot);
      rec.nodes?.forEach((node) => {
        if (!(node instanceof w.HTMLElement)) return;
        node.classList.remove(cfg.className);
        if (cfg.className === 'icu-selected') {
          node.classList.remove(SELECTED_CLASS);
        }
        if (slotCls) node.classList.remove(slotCls);
      });
    };

    const setChannel = (name, tokenIds, meta = {}) => {
      const cfg = SELECTION_CHANNELS[name];
      if (!cfg) return;
      removeChannelClasses(name);
      if (!tokenIds || !tokenIds.length) {
        channelState.delete(name);
        return;
      }
      const nodes = tokenIds
        .map((idVal) => d.getElementById(idVal))
        .filter((node) => node instanceof w.HTMLElement);
      const slotCls = slotClassFor(cfg.slot);
      nodes.forEach((node) => {
        node.classList.add(cfg.className);
        if (cfg.className === 'icu-selected') {
          node.classList.add(SELECTED_CLASS);
        }
        if (slotCls) node.classList.add(slotCls);
      });
      const nextIds = nodes.map((node) => node.id);
      channelState.set(name, { tokenIds: nextIds, meta, nodes });
    };

    const buildRegionSample = (ids) => {
      if (!ids || !ids.length) return '';
      const nodes = ids
        .map((idVal) => d.getElementById(idVal))
        .filter((node) => node instanceof w.HTMLElement);
      const joined = nodes.map((node) => tokText(node)).join(' ').replace(/\s+/g, ' ').trim();
      return joined.length > 48 ? `${joined.slice(0, 47)}…` : joined;
    };

    const commitSelection = (source, extra = {}) => {
      const start = performance.now();
      const regions = [];
      for (const name of CHANNEL_ORDER) {
        const cfg = SELECTION_CHANNELS[name];
        const rec = channelState.get(name);
        if (!cfg || !rec || !rec.tokenIds.length) continue;
        regions.push({
          channel: name,
          role: cfg.role,
          slot: cfg.slot,
          className: cfg.className,
          tokenIds: [...rec.tokenIds],
          sample: buildRegionSample(rec.tokenIds),
          label: cfg.label,
          meta: { ...rec.meta },
        });
      }
      const primaryIndex = regions.findIndex((region) => region.channel === 'primary');
      const focusIndex = primaryIndex >= 0 ? primaryIndex : regions.length ? 0 : null;
      selectionVersion += 1;
      debugState.selection = {
        version: selectionVersion,
        timestamp: Date.now(),
        source,
        focusIndex,
        regions,
        extra,
      };
      w.__icu.selection = debugState.selection;
      debugState.perf.lastSelectionMs = performance.now() - start;
    };

    const resetSelection = (source) => {
      for (const name of Object.keys(SELECTION_CHANNELS)) {
        setChannel(name, null);
      }
      commitSelection(source);
    };

    const debugCtx = {
      document: d,
      tokenNodeById,
      levelsByTok,
      debugState,
      handleClick: null,
      handleDblClick: null,
      buildLevels: (anchorId) => {
        const levels = [];
        if (!anchorId) return levels;
        levels.push([anchorId]);
        const p = smallestEnclosingPair(anchorId);
        if (p) levels.push(toks.slice(p.openIndex + 1, p.closeIndex).map((el) => el.id));
        levels.push(toks.map((el) => el.id));
        return levels;
      },
      beginDrag: null,
      applyDragLevel: null,
      finishDrag: null,
    };

    installDebugAPI(w, debugCtx);

    const updateSelectionStatus = () => {
      const regions = debugState.selection?.regions ?? [];
      const primary = regions.find((region) => region.channel === 'primary');
      const alt = regions.find((region) => region.channel === 'alt');
      const okRegion = primary || alt;
      let msg = 'PENDING (await selection)';
      if (okRegion) {
        const slotLabel = okRegion.slot ? okRegion.slot.toUpperCase() : okRegion.channel;
        msg = `OK (${slotLabel}: ${okRegion.tokenIds.length} ids)`;
      }
      setHTML('icu_sel_status', badge(okRegion ? true : null, msg));
    };

    const navMessage = (action, node) => `OK (${action} → ${describeNode(node)})`;

    function setFocus(node, opts = {}) {
      const { fromKeyboard = false, message, silentStatus = false, commitSource, extra } = opts;
      if (!node) {
        removeChannelClasses('focus');
        channelState.delete('focus');
        commitSelection(commitSource ?? (fromKeyboard ? 'keyboard:clear-focus' : 'focus:clear'), extra);
        if (message) navState.statusMsg = message;
        if (fromKeyboard) w.__icu.kbReady = false;
        return false;
      }
      navState.focus = node;
      if (node.parent) navState.lastChildByParent.set(node.parent, node);
      const ids = node.type === 'token' ? [node.id] : node.tokenIds;
      setChannel('focus', ids, { describe: describeNode(node) });
      commitSelection(commitSource ?? (fromKeyboard ? 'keyboard:focus' : 'focus:update'), extra);
      if (fromKeyboard) {
        w.__icu.kbReady = true;
        if (!silentStatus) navState.statusMsg = message || navState.statusMsg;
      } else if (message && !silentStatus) {
        navState.statusMsg = message;
      }
      return true;
    }

    function clearKeyboardFocus(message) {
      removeChannelClasses('focus');
      channelState.delete('focus');
      commitSelection('keyboard:clear-focus');
      navState.focus = null;
      navState.lastChildByParent.clear();
      if (message) navState.statusMsg = message;
      w.__icu.kbReady = false;
    }

    function focusTokenByIndex(index, action) {
      const node = tokenNodes[index];
      if (!node) return false;
      const msg = navMessage(action, node);
      const ok = setFocus(node, { fromKeyboard: true, message: msg });
      if (ok) render();
      return ok;
    }

    function moveToParent() {
      const focus = navState.focus;
      if (!focus || !focus.parent) return false;
      const parent = focus.parent;
      navState.lastChildByParent.set(parent, focus);
      const msg = navMessage('Ctrl+↑', parent);
      const ok = setFocus(parent, { fromKeyboard: true, message: msg });
      if (ok) render();
      return ok;
    }

    function moveToChild() {
      const focus = navState.focus;
      if (!focus || focus.type !== 'group') return false;
      const stored = navState.lastChildByParent.get(focus);
      const target = stored && focus.children.includes(stored) ? stored : focus.children[0];
      if (!target) return false;
      const msg = navMessage('Ctrl+↓', target);
      const ok = setFocus(target, { fromKeyboard: true, message: msg });
      if (ok) render();
      return ok;
    }

    function moveSibling(delta) {
      const focus = navState.focus;
      if (!focus || !focus.parent) return false;
      const siblings = focus.parent.children;
      const idxVal = siblings.indexOf(focus);
      if (idxVal < 0) return false;
      const next = siblings[idxVal + delta];
      if (!next) return false;
      const msg = navMessage(delta < 0 ? 'Ctrl+←' : 'Ctrl+→', next);
      const ok = setFocus(next, { fromKeyboard: true, message: msg });
      if (ok) render();
      return ok;
    }

    function moveTokenBy(delta) {
      if (!delta) return false;
      let baseIndex;
      const focus = navState.focus;
      if (!focus) {
        baseIndex = delta > 0 ? -1 : toks.length;
      } else if (focus.type === 'token') {
        baseIndex = focus.index;
      } else if (focus.type === 'group') {
        if (!focus.pair) {
          baseIndex = delta > 0 ? -1 : toks.length;
        } else {
          baseIndex = delta > 0 ? focus.pair.closeIndex : focus.pair.openIndex;
        }
      } else {
        baseIndex = delta > 0 ? -1 : toks.length;
      }
      const targetIndex = baseIndex + delta;
      if (targetIndex < 0 || targetIndex >= toks.length) return false;
      return focusTokenByIndex(targetIndex, delta > 0 ? 'Tab' : 'Shift+Tab');
    }

    const formatSelectionExtra = (region, opts = {}) => ({
      channel: region,
      ...opts,
    });

    const handleClick = (tok, opts = {}) => {
      const ch = tokText(tok)[0];
      setChannel('primary', [tok.id], { via: opts.simulated ? 'simulate' : 'pointer' });
      if (OPEN.has(ch) || CLOSE.has(ch)) {
        const pair = pairById.get(tok.id);
        if (pair) {
          setChannel('bracket', [pair.openId, pair.closeId], { via: 'pair', pair });
          w.__icu.bracketsReady = true;
        } else {
          setChannel('bracket', null);
        }
      } else {
        setChannel('bracket', null);
      }
      const extra = formatSelectionExtra('primary', { anchorId: tok.id });
      const tokenNode = tokenNodeById.get(tok.id);
      if (tokenNode) {
        const focused = setFocus(tokenNode, {
          silentStatus: true,
          commitSource: 'click',
          extra,
        });
        if (!focused) commitSelection('click', extra);
      } else {
        commitSelection('click', extra);
      }
      w.__icu.clickReady = true;
      render();
    };

    debugCtx.handleClick = handleClick;

    const handleDblClick = (tok, opts = {}) => {
      const p = smallestEnclosingPair(tok.id);
      if (p) {
        const inner = [];
        for (let i = p.openIndex + 1; i < p.closeIndex; i++) inner.push(toks[i].id);
        setChannel('alt', inner, { via: opts.simulated ? 'simulate' : 'pointer', anchorId: tok.id, pair: p });
      } else {
        setChannel('alt', [tok.id], { via: opts.simulated ? 'simulate' : 'pointer', anchorId: tok.id });
      }
      commitSelection('dblclick', formatSelectionExtra('alt', { anchorId: tok.id }));
      w.__icu.navReady = true;
      render();
    };

    debugCtx.handleDblClick = handleDblClick;

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

    debugCtx.buildLevels = buildLevels;

    const applyDragSelection = (levelIndex, opts = {}) => {
      if (!dragCtx) return;
      dragCtx.current = levelIndex;
      const ids = dragCtx.levels[levelIndex] || [];
      setChannel('primary', ids, { via: opts.simulated ? 'simulate' : 'pointer', anchorId: dragCtx.anchorId, levelIndex });
      const next = dragCtx.levels[levelIndex + 1] || [];
      setChannel('preview', next, { anchorId: dragCtx.anchorId, levelIndex: levelIndex + 1 });
      commitSelection('drag', formatSelectionExtra('primary', { anchorId: dragCtx.anchorId, levelIndex }));
      setHTML('icu_drag_status', badge(true, `OK (level ${levelIndex + 1}/${dragCtx.levels.length})`));
      debugState.dragContext = { anchorId: dragCtx.anchorId, levelCount: dragCtx.levels.length, current: levelIndex };
    };

    const beginDrag = (anchorId, opts = {}) => {
      dragCtx = {
        anchorId,
        levels: buildLevels(anchorId),
        current: 0,
        startX: null,
        simulated: opts.simulated || false,
      };
      debugState.dragContext = { anchorId, levelCount: dragCtx.levels.length, current: 0 };
      applyDragSelection(0, opts);
      w.__icu.dragReady = true;
      render();
    };

    const updateDrag = (clientX) => {
      if (!dragCtx) return;
      if (dragCtx.startX == null) return;
      const dist = Math.abs((clientX || 0) - dragCtx.startX);
      const lvl = Math.min(Math.floor(dist / SNAP), dragCtx.levels.length - 1);
      if (lvl !== dragCtx.current) {
        applyDragSelection(lvl);
        render();
      }
    };

    const finishDrag = (opts = {}) => {
      setChannel('preview', null);
      commitSelection('drag:end', formatSelectionExtra('primary', { anchorId: dragCtx?.anchorId ?? null }));
      dragCtx = null;
      debugState.dragContext = null;
      if (!opts.silent) render();
    };

    debugCtx.beginDrag = beginDrag;
    debugCtx.applyDragLevel = (levelIndex, opts = {}) => {
      if (!dragCtx) return false;
      applyDragSelection(levelIndex, opts);
      render();
      return true;
    };
    debugCtx.finishDrag = (opts = {}) => {
      finishDrag(opts);
      return true;
    };

    const render = () => {
      const okBase = w.__icu.hoverReady && w.__icu.clickReady;
      setHTML('icu_status', badge(okBase ? true : null, okBase ? 'OK (hover+click baseline)' : 'PENDING (move & click)'));
      setHTML('icu_brackets_status', badge(w.__icu.bracketsReady ? true : null, w.__icu.bracketsReady ? 'OK (pair highlighted)' : 'PENDING (click a bracket)'));
      setHTML('icu_nav_status', badge(w.__icu.navReady ? true : null, w.__icu.navReady ? 'OK (dblclick promote)' : 'PENDING (double-click a token)'));
      setHTML('icu_drag_status', badge(w.__icu.dragReady ? true : null, w.__icu.dragReady ? 'OK (ladder engaged)' : 'PENDING (drag from a token)'));

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
      setHTML('icu_bh_status', badge(w.__icu.bhReady ? true : null, bhMsg));
      setHTML('icu_kb_status', badge(w.__icu.kbReady ? true : null, navState.statusMsg || 'PENDING (keyboard idle)'));
      updateSelectionStatus();
    };

    const pickInteractiveNode = (path) => {
      const tokNode = path.find(isTok);
      if (tokNode && tokNode instanceof w.HTMLElement) return tokNode;
      const fallback = path.find((node) => node instanceof w.HTMLElement && node.id);
      return fallback && fallback instanceof w.HTMLElement ? fallback : null;
    };

    const onPointerMove = (ev) => {
      const path = ev.composedPath?.() ?? [];
      const tok = pickInteractiveNode(path);
      updateBhPanel(tok);
      updateBhButtonStyles();
      const leaf = pickVisibleLeaf(tok || path.find((n) => n instanceof w.HTMLElement));
      clear(d, 'icu-hovered');
      if (leaf && leaf instanceof w.HTMLElement) leaf.classList.add('icu-hovered');
      w.__icu.hoverReady = true;
      debugState.hoverTokenId = tok && tok instanceof w.HTMLElement ? tok.id : null;
      render();
    };

    const onClickCapture = (ev) => {
      const path = ev.composedPath?.() ?? [];
      const tok = pickInteractiveNode(path);
      if (tok && tok instanceof w.HTMLElement) {
        handleClick(tok);
      } else {
        setChannel('primary', null);
        setChannel('bracket', null);
        commitSelection('click:clear');
        render();
      }
    };

    const onDblClick = (ev) => {
      const path = ev.composedPath?.() ?? [];
      const tok = pickInteractiveNode(path);
      if (!tok || !(tok instanceof w.HTMLElement)) return;
      handleDblClick(tok);
    };

    const onPointerDown = (ev) => {
      const path = ev.composedPath?.() ?? [];
      const tok = pickInteractiveNode(path);
      if (!tok || !(tok instanceof w.HTMLElement)) return;

      const startX = ev.clientX;
      beginDrag(tok.id);
      dragCtx.startX = startX ?? null;
      d.addEventListener('pointermove', onPointerDrag, true);
      d.addEventListener('pointerup', onPointerUp, true);
      d.addEventListener('pointercancel', onPointerUp, true);
    };

    const onPointerDrag = (ev) => {
      if (!dragCtx) return;
      updateDrag(ev.clientX ?? 0);
    };

    const onPointerUp = () => {
      d.removeEventListener('pointermove', onPointerDrag, true);
      d.removeEventListener('pointerup', onPointerUp, true);
      d.removeEventListener('pointercancel', onPointerUp, true);
      if (!dragCtx) return;
      finishDrag();
    };

    const onKeydown = (ev) => {
      if (ev.key === 'Escape') {
        resetSelection('keyboard:escape');
        clear(d, 'icu-hovered');
        clear(d, 'icu-bracket');
        clearBhHighlights();
        bhState.selectedIndex = null;
        w.__icu.bhReady = false;
        w.__icu.bhSelectedLevel = null;
        updateBhButtonStyles();
        clearKeyboardFocus('PENDING (cleared)');
        render();
        return;
      }

      if (ev.key === 'Tab') {
        const handled = moveTokenBy(ev.shiftKey ? -1 : 1);
        if (handled) {
          ev.preventDefault();
          ev.stopPropagation();
        }
        return;
      }

      if (!ev.ctrlKey || ev.altKey || ev.metaKey) return;
      let handled = false;
      if (ev.key === 'ArrowUp') handled = moveToParent();
      else if (ev.key === 'ArrowDown') handled = moveToChild();
      else if (ev.key === 'ArrowLeft') handled = moveSibling(-1);
      else if (ev.key === 'ArrowRight') handled = moveSibling(1);
      if (handled) {
        ev.preventDefault();
        ev.stopPropagation();
      }
    };

    d.addEventListener('pointermove', onPointerMove, true);
    d.addEventListener('click', onClickCapture, true);
    d.addEventListener('dblclick', onDblClick, true);
    d.addEventListener('keydown', onKeydown, true);
    d.addEventListener('pointerdown', onPointerDown, true);

    // Legacy flag used by older diag rows; keep it for compatibility.
    w.__gvClickReady = true;

    render();
  });
})();
