const blockTags = /<\/?(?:p|div|h[1-6]|blockquote|li|ul|ol)[^>]*>/gi;

export function richTextToPlainText(value: string) {
  if (!value) return "";
  if (typeof DOMParser !== "undefined") {
    const document = new DOMParser().parseFromString(value, "text/html");
    return (document.body.textContent || "").replace(/\s+/g, " ").trim();
  }

  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(blockTags, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/[ \t]+/g, " ")
    .replace(/\n\s*\n+/g, "\n")
    .trim();
}

export function richTextToSafeHtml(value: string) {
  if (!value) return "";
  const source = /<[^>]+>/.test(value) ? value : plainTextToHtml(value);
  if (typeof DOMParser === "undefined") return plainTextToHtml(richTextToPlainText(source));

  const document = new DOMParser().parseFromString(`<div>${source}</div>`, "text/html");
  const root = document.body.firstElementChild;
  if (!root) return "";
  sanitizeChildren(root);
  return root.innerHTML.trim();
}

export function plainTextToHtml(value: string) {
  return value
    .split(/\n{2,}/)
    .map((paragraph) => `<p>${escapeHtml(paragraph).replace(/\n/g, "<br>")}</p>`)
    .join("");
}

function sanitizeChildren(parent: Element) {
  Array.from(parent.children).forEach((child) => sanitizeElement(child));
}

function sanitizeElement(element: Element) {
  const tag = element.tagName.toLowerCase();
  const originalHref = element.getAttribute("href") || "";
  const originalStyle = (element as HTMLElement).style.cssText;
  const allowedTags = new Set(["p", "div", "br", "h2", "h3", "h4", "strong", "b", "em", "i", "u", "s", "strike", "sup", "sub", "a", "ul", "ol", "li", "blockquote", "span", "font"]);
  if (["script", "style", "iframe", "object", "embed", "form", "input", "button"].includes(tag)) {
    element.remove();
    return;
  }
  if (!allowedTags.has(tag)) {
    sanitizeChildren(element);
    element.replaceWith(...Array.from(element.childNodes));
    return;
  }

  Array.from(element.attributes).forEach((attribute) => element.removeAttribute(attribute.name));
  if (tag === "a") {
    const href = normalizePublicHref(originalHref);
    if (href) {
      element.setAttribute("href", href);
      element.setAttribute("target", "_blank");
      element.setAttribute("rel", "noopener noreferrer");
    }
  }
  const safeStyle = sanitizeStyle(originalStyle);
  if (safeStyle) element.setAttribute("style", safeStyle);
  sanitizeChildren(element);
}

function sanitizeStyle(value: string) {
  const allowed = new Set(["color", "background-color", "font-family", "font-size", "font-weight", "font-style", "text-decoration", "text-align", "line-height"]);
  return value
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .flatMap((part) => {
      const separator = part.indexOf(":");
      if (separator < 0) return [];
      const property = part.slice(0, separator).trim().toLowerCase();
      const styleValue = part.slice(separator + 1).trim();
      if (!allowed.has(property) || !styleValue || /url\s*\(|expression\s*\(|javascript:/i.test(styleValue)) return [];
      return [`${property}: ${styleValue}`];
    })
    .join("; ");
}

export function normalizePublicHref(value: string) {
  const href = value.trim();
  if (/^https?:\/\//i.test(href)) {
    try {
      return new URL(href).hostname ? href : "";
    } catch {
      return "";
    }
  }
  if (/^mailto:[^\s@]+@[^\s@]+\.[^\s@]+$/i.test(href)) return href;
  if (/^tel:\+?[\d\s()-]{5,}$/i.test(href)) return href;
  if (/^(\/(?!\/)|#)/.test(href)) return href;
  if (/^[\wа-яё-]+(?:\.[\wа-яё-]+)+(?:[/?#].*)?$/i.test(href)) return `https://${href}`;
  return "";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
