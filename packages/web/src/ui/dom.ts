export function getRequiredElement<ElementType extends HTMLElement>(
  root: ParentNode,
  selector: string,
  context: string,
): ElementType {
  const el = root.querySelector(selector);
  if (!el) {
    throw new Error(`Missing required element ${selector} in ${context}`);
  }
  return el as ElementType;
}
