import { Component } from 'react'

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught:', error, errorInfo)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-[50vh] grid place-items-center px-4">
          <div className="bg-white rounded-lg shadow-card p-8 max-w-md text-center">
            <span className="text-4xl mb-3 block">⚠️</span>
            <h2 className="text-base font-black text-secondary mb-2">Something went wrong</h2>
            <p className="text-xs text-gray-500 mb-4">
              An unexpected error occurred. Please try refreshing the page.
            </p>
            <button
              onClick={() => {
                this.setState({ hasError: false, error: null })
                window.location.reload()
              }}
              className="bg-primary text-white text-xs font-black rounded px-5 py-2.5 hover:bg-primary/90 transition-colors"
            >
              Reload Page
            </button>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}
