export function applyAnchorsToKatex(
  root: HTMLElement,
  idProvider: (el: HTMLElement, index: number) => string,
) {
  const sels = '.mord,.mbin,.mopen,.mclose,.mrel,.mop';
  let i = 0;
  root.querySelectorAll<HTMLElement>(sels).forEach((el) => {
    const id = idProvider(el, i++);
    if (!id) {
      return;
    }
    el.setAttribute('data-token-id', id);
    el.setAttribute('data-kind', 'token');
    el.setAttribute('data-id', id);
    el.id = `gv:V1:${id}`;
  });
}
