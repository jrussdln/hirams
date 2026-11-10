import usePreviewPricing from "./usePreviewPricing.js";
import PreviewPricingView from "./PreviewPricingView.jsx";

export default function PreviewPricing() {
  const state = usePreviewPricing();
  return <PreviewPricingView {...state} />;
}
