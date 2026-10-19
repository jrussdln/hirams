import React from "react";
import PreviewSIView from "./PreviewSIView.jsx";
import usePreviewSI from "./usePreviewSI.js";

export default function PreviewSIPage() {
  const data = usePreviewSI();
  return <PreviewSIView {...data} />;
}