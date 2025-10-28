(function(){
  const play = document.getElementById('play');
  if (!play) return;

  const badge = (ok, msg) => `<span class="badge ${ok===true?'ok':ok===false?'err':'warn'}">${msg}</span>`;
  const $ = (id) => document.getElementById(id);

  function pickVisibleLeaf(el){
    // Prefer deepest span with size; fallback to element itself
    if (!el) return null;
    let node = el;
    // descend to leafs with content
    while (node && node.firstElementChild) node = node.firstElementChild;
    // climb until visible box
    while (node && node instanceof HTMLElement) {
      const r = node.getBoundingClientRect();
      if (r && r.width > 0 && r.height > 0) return node;
      node = node.parentElement;
    }
    return el;
  }

  function clearClasses(d, cls){
    d.querySelectorAll('.'+cls).forEach(n => n.classList.remove(cls));
  }

  play.addEventListener('load', () => {
    const w = play.contentWindow;
    const d = w?.document;
    if (!w || !d) {
      const row = document.getElementById('icu_row');
      if (row) row.innerHTML = badge(false, 'FAIL (iframe not ready)');
      return;
    }
    if (!w.__icu) {
      w.__icu = { hoverReady:false, clickReady:false, bracketsReady:false, dragReady:false, multiReady:false, selection:{regions:[],focusIndex:null} };
    }

    const root = d.querySelector('.katex .katex-html') || d.querySelector('.katex-html');
    if (!root) { $('icu_status').innerHTML = badge(false, 'FAIL (no KaTeX root)'); return; }

    const onPointerMove = (ev) => {
      const path = ev.composedPath?.() ?? [];
      const tok = path.find(n => n && n.id && typeof n.id === 'string' && n.id.startsWith('tok:'));
      const leaf = pickVisibleLeaf(tok||path.find(n => n instanceof HTMLElement));
      clearClasses(d, 'icu-hovered');
      if (leaf && leaf instanceof HTMLElement) leaf.classList.add('icu-hovered');
      w.__icu.hoverReady = true;
      render();
    };

    const onClickCapture = (ev) => {
      const path = ev.composedPath?.() ?? [];
      const tok = path.find(n => n && n.id && typeof n.id === 'string' && n.id.startsWith('tok:'));
      const leaf = pickVisibleLeaf(tok||path.find(n => n instanceof HTMLElement));

      clearClasses(d, 'icu-selected');
      if (tok && tok instanceof HTMLElement) tok.classList.add('icu-selected');
      if (leaf && leaf instanceof HTMLElement) leaf.classList.add('icu-selected');

      w.__icu.clickReady = true;
      render();
    };

    const onKeydown = (ev) => {
      if (ev.key === 'Escape') {
        clearClasses(d, 'icu-selected');
        clearClasses(d, 'icu-hovered');
        render();
      }
    };

    d.addEventListener('pointermove', onPointerMove, true);
    d.addEventListener('click', onClickCapture, true);
    d.addEventListener('keydown', onKeydown, true);

    function render(){
      const ok = (w.__icu.hoverReady && w.__icu.clickReady);
      $('icu_status').innerHTML = badge(ok ? true : null, ok ? 'OK (hover+click baseline)' : 'PENDING (move & click)');
    }

    render();
  });
})();
