import { Component, type ReactNode } from 'react'

export class ScreenBoundary extends Component<{ children: ReactNode; message: string; reloadLabel: string }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  render() {
    if (this.state.failed) return <div className="empty-state error-state" role="alert"><h2>{this.props.message}</h2>
      <button className="workbench-button" onClick={() => window.location.reload()}>{this.props.reloadLabel}</button></div>
    return this.props.children
  }
}
