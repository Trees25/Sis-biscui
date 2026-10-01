import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error:", error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          padding: '2rem',
          maxWidth: '800px',
          margin: '2rem auto',
          background: '#fff',
          borderRadius: '12px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
          color: '#333',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <h2 style={{ color: '#e74c3c', marginTop: 0 }}>⚠️ Ocurrió un error en la aplicación</h2>
          <p style={{ fontWeight: 600 }}>{this.state.error?.toString()}</p>
          <pre style={{
            background: '#f8f9fa',
            padding: '1rem',
            borderRadius: '8px',
            overflowX: 'auto',
            fontSize: '0.85rem',
            color: '#c0392b',
            border: '1px solid #e9ecef'
          }}>
            {this.state.error?.stack}
          </pre>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '0.6rem 1.2rem',
              background: '#3498db',
              color: '#fff',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 600
            }}
          >
            Recargar Página
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
