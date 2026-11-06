import React from "react";
import SystemUnderMaintenance from "../../../pages/utility/page/SystemUnderMaintenance";

/**
 * Catches failures raised while lazy-loading a route chunk — most commonly
 * after a deploy or file upload on the server where scripts return text/html (404/maintenance).
 */
class PageChunkErrorBoundary extends React.Component {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error) {
    console.error("[PageChunkErrorBoundary]", error);
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return <SystemUnderMaintenance />;
  }
}

export default PageChunkErrorBoundary;
