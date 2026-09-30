import { Component, type ReactNode } from "react";
import { AppIcon } from "./AppIcon";

export class PageErrorBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    if (!this.state.failed) return this.props.children;

    return (
      <main className="app-loading app-error">
        <div className="app-loading-content">
          <AppIcon className="app-loading-icon" />
          <div role="alert">
            <h1>页面暂时无法打开</h1>
            <p>可能是网络中断或页面刚刚更新，请重新加载。</p>
          </div>
          <div className="app-error-actions">
            <button onClick={() => window.location.reload()}>重新加载</button>
            <a href="./">返回首页</a>
          </div>
        </div>
      </main>
    );
  }
}
