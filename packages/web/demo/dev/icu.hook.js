/**
 * Dev-only ICU hook for diagnostics.
 * Attaches minimal listeners inside the iframe to flip __icu flags
 * without pulling code from /src. Safe and self-contained.
 */
(function(){
  const play = document.getElementById('play');
  if (!play) return;

  const badge = (ok, msg) => `<span class="badge ${ok===true?'ok':ok===false?'err':'warn'}">${msg}</span>`;
  const $ = (id) => document.getElementById(id);

  play.addEventListener('load', () => {
    const w = play.contentWindow;
    const d = w?.document;
    if (!w || !d) {
      $('icu_status').innerHTML = badge(false, 'FAIL (iframe not ready)');
      return;
    }
    if (!w.__icu) {
      w.__icu = { hoverReady:false, clickReady:false, bracketsReady:false, dragReady:false, multiReady:false, selection:{regions:[],focusIndex:null} };
    }

    // minimal hover+click taps for readiness lamps (no selection semantics here)
    const root = d.querySelector('.katex .katex-html') || d.querySelector('.katex-html');
    if (!root) {
      $('icu_status').innerHTML = badge(false, 'FAIL (no KaTeX root yet)');
      return;
    }

    const onPointerMove = () => { w.__icu.hoverReady = true; render(); };
    const onClickCapture = () => { w.__icu.clickReady = true; render(); };

    d.addEventListener('pointermove', onPointerMove, true);
    d.addEventListener('click', onClickCapture, true);

    function render(){
      const ok = (w.__icu.hoverReady && w.__icu.clickReady);
      $('icu_status').innerHTML = badge(ok ? true : null, ok ? 'READY (hover+click seen)' : 'PENDING (move & click needed)');
    }

    render();
  });
})();
