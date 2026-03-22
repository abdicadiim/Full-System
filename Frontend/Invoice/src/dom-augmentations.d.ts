export {};

declare global {
  interface EventTarget {
    style: CSSStyleDeclaration;
    closest(selectors: string): Element | null;
  }
}
