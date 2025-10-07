/**
 * Scroll element into view smoothly
 */
export function scrollToElement(element: Element, options: ScrollIntoViewOptions = {}): void {
  element.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
    inline: 'nearest',
    ...options
  });
}
