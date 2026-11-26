import React from "react";
import getPreviewFormTemplate from "../../../utils/print/getPreviewFormTemplate.js";

/**
 * The blank company form faded behind the generated content. PrintPreview
 * renders it ONLY in the Print Preview view and ONLY while "Check Actual" is
 * toggled on — never in normal view, print, saved PDF, or copied image.
 */
export default function PreviewFormOverlay({ companyId, docType }) {
  const src = getPreviewFormTemplate(companyId, docType);
  if (!src) return null;

  return (
    <img
      src={src}
      alt=""
      aria-hidden="true"
      draggable={false}
      style={{
        display: "block",
        width: "100%",
        height: "100%",
        objectFit: "fill",
        opacity: 0.6,
        pointerEvents: "none",
        userSelect: "none",
      }}
    />
  );
}
