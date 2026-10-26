// html-to-image reads every stylesheet on the page to embed web fonts,
// but cross-origin sheets (the Google Fonts <link> in index.html) throw
// a DOMException when their cssRules are read, which used to abort the
// whole PDF capture. This helper fetches those sheets manually instead,
// keeps only their @font-face rules, inlines the font files as data
// URLs (remote URLs won't load inside the SVG html-to-image rasterizes),
// and returns the CSS text for html-to-image's `fontEmbedCSS` option.
// The result is cached — fonts don't change mid-session.

let cached = null;

const fetchAsDataUrl = (url) =>
  fetch(url)
    .then((res) => {
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res.blob();
    })
    .then(
      (blob) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(reader.error);
          reader.readAsDataURL(blob);
        }),
    );

const sheetCssText = async (sheet) => {
  try {
    return Array.from(sheet.cssRules)
      .map((rule) => rule.cssText)
      .join("\n");
  } catch {
    // Cross-origin stylesheet — cssRules access is blocked, so fetch the
    // sheet's text directly (Google Fonts serves CORS headers).
    if (!sheet.href) return "";
    try {
      return await (await fetch(sheet.href)).text();
    } catch {
      return "";
    }
  }
};

export const getFontEmbedCSS = async () => {
  if (cached !== null) return cached;

  const sheets = Array.from(document.styleSheets);
  const cssParts = await Promise.all(
    sheets.map(async (sheet) => {
      const css = await sheetCssText(sheet);
      // Only @font-face rules are needed for embedding fonts.
      return (css.match(/@font-face\s*\{[^}]*\}/g) ?? []).join("\n");
    }),
  );
  let css = cssParts.filter(Boolean).join("\n");

  // Inline the font files: every url(...) inside the embedded CSS must
  // be a data URL or it won't render in the captured canvas.
  const urls = [
    ...new Set([...css.matchAll(/url\((['"]?)([^'")]+)\1\)/g)].map((m) => m[2])),
  ];
  await Promise.all(
    urls.map(async (url) => {
      try {
        const dataUrl = await fetchAsDataUrl(new URL(url, document.baseURI));
        css = css.split(url).join(dataUrl);
      } catch {
        // Drop fonts we can't fetch rather than failing the export.
        css = css.split(url).join("");
      }
    }),
  );

  cached = css;
  return css;
};
