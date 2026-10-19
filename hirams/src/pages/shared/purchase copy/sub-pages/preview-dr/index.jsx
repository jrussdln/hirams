import usePreviewDR from "./usePreviewDR.js";
import PreviewDRView from "./PreviewDRView.jsx";

export default function PreviewDR() {
  const state = usePreviewDR();
  return <PreviewDRView {...state} />;
}