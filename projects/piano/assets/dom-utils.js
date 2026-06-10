// Small DOM/SVG helpers shared across feature modules.

// Walk up from an SVG element to the nearest ancestor whose class contains
// `className`, stopping at the <svg> root. Used by both the staff-highlight
// painting and the loop click<->step mapping.
export function findAncestorWithClass(el, className) {
  var node = el;
  while (node && node.tagName !== "svg") {
    var cls = node.getAttribute ? node.getAttribute("class") || "" : "";
    if (cls.indexOf(className) >= 0) return node;
    node = node.parentElement;
  }
  return null;
}
