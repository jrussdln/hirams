/**
 * Blank company form templates used as preview-only alignment guides.
 *
 * Company-specific files live in src/assets/images and are named
 * `<companyId>-<docType>.<ext>`, e.g. `1-CSI.png` (Sales Invoice, company 1)
 * or `2-DR.png` (Delivery Receipt, company 2). Company-independent templates
 * (e.g. `CHEQUE.png`) are named just `<docType>.<ext>` and are used as a
 * fallback. The extension is intentionally not hard-coded, so swapping the
 * image format (jpg → png, etc.) needs no code change. Vite fingerprints the
 * imported URLs at build time, so the map is built with an eager glob rather
 * than string-concatenated at runtime.
 */
const TEMPLATES = import.meta.glob(
  "/src/assets/images/*.{png,jpg,jpeg,webp}",
  {
    eager: true,
    import: "default",
  },
);

const templatesByKey = new Map(
  Object.entries(TEMPLATES).map(([path, src]) => [
    path
      .split("/")
      .pop()
      .replace(/\.[^.]+$/, "")
      .toLowerCase(),
    src,
  ]),
);

/**
 * @param {string|number} companyId  the company on the transaction (omit for shared templates)
 * @param {string} docType           "CSI" / "DR" / "CHEQUE"
 * @returns {string|null} image URL, or null when there is no matching template
 */
export default function getPreviewFormTemplate(companyId, docType) {
  const typeKey = String(docType ?? "")
    .trim()
    .toLowerCase();
  if (!typeKey) return null;

  if (companyId !== null && companyId !== undefined && companyId !== "") {
    const key = `${String(companyId).trim()}-${typeKey}`;
    if (templatesByKey.has(key)) return templatesByKey.get(key);
  }

  // Shared, company-independent template — e.g. CHEQUE.png.
  return templatesByKey.get(typeKey) ?? null;
}
