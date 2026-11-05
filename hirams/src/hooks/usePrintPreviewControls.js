import { useState, useCallback } from "react";

/**
 * Hook to manage print preview controls that can be exposed to the page header.
 * Usage:
 *   const controls = usePrintPreviewControls();
 *   // Pass to PrintPreview
 *   <PrintPreview onControlsReady={controls.setControls}>
 *   // Use in header
 *   {controls.getHeaderButtons()}
 */
export function usePrintPreviewControls() {
  const [controls, setControls] = useState(null);

  const getHeaderButtons = useCallback(() => {
    if (!controls) return null;
    return {
      viewMode: controls.viewMode,
      setViewMode: controls.setViewMode,
      panelOpen: controls.panelOpen,
      setPanelOpen: controls.setPanelOpen,
      editingEnabled: controls.editingEnabled,
    };
  }, [controls]);

  return {
    setControls,
    getHeaderButtons,
    controls,
  };
}

export default usePrintPreviewControls;
