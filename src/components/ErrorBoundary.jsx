import { Component } from 'react'

// Top-level safety net: catches render/runtime errors anywhere below it so a
// single thrown error shows a recoverable screen instead of a blank page.
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(error, info) {
    console.error('Uncaught error:', error, info)
  }

  handleReload = () => {
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <div className="hy-card error-boundary-card">
            <h2>Something went wrong</h2>
            <p>The app hit an unexpected error. Reloading usually fixes it.</p>
            <button className="add-btn" onClick={this.handleReload}>Reload</button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

export default ErrorBoundary
