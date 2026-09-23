import React from 'react'

/** Shows the failure instead of a blank page if anything throws at runtime. */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error) {
    return { error }
  }
  render() {
    if (!this.state.error) return this.props.children
    return (
      <div className="flex min-h-screen items-center justify-center bg-stone-950 p-6 text-center text-stone-100">
        <div className="max-w-md rounded-3xl bg-gold text-ink p-6 shadow-2xl">
          <p className="text-lg font-bold">The scorecard hit an error while rendering.</p>
          <p className="mt-2 text-sm text-stone-500">Reload the page. If it persists, this is the message to report:</p>
          <pre className="mt-3 overflow-x-auto rounded-xl bg-stone-950 p-3 text-left text-xs text-amber-300">{String(this.state.error?.message || this.state.error)}</pre>
          <button className="mt-4 rounded-2xl bg-gold text-ink px-5 py-2.5 text-sm font-bold" onClick={() => window.location.reload()}>
            Reload
          </button>
        </div>
      </div>
    )
  }
}
