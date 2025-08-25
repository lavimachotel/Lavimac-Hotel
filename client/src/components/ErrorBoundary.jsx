import React, { Component } from 'react';

/**
 * Default fallback UI when an error occurs
 */
const DefaultErrorFallback = ({ error }) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 p-4">
      <div className="bg-white dark:bg-gray-800 shadow-lg rounded-lg max-w-md w-full p-6 text-center">
        <div className="mb-4 text-red-500">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-16 w-16 mx-auto" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" 
            />
          </svg>
        </div>
        <h1 className="text-xl font-bold text-gray-800 dark:text-white mb-4">
          Something went wrong
        </h1>
        <p className="text-gray-600 dark:text-gray-300 mb-4">
          We're sorry, but an error occurred while rendering this page.
        </p>
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900 dark:bg-opacity-20 rounded-md mb-4 text-left overflow-auto max-h-40">
            <p className="text-sm font-mono text-red-600 dark:text-red-400">
              {error.toString()}
            </p>
          </div>
        )}
        <button
          onClick={() => window.location.reload()}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors"
        >
          Refresh the page
        </button>
      </div>
    </div>
  );
};

/**
 * Error Boundary component to catch JavaScript errors anywhere in the child
 * component tree, log those errors, and display a fallback UI.
 */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      error: null,
      errorInfo: null
    };
  }

  /**
   * Update state when an error occurs
   */
  static getDerivedStateFromError(error) {
    return { 
      hasError: true, 
      error 
    };
  }

  /**
   * Log error information when an error is caught
   */
  componentDidCatch(error, errorInfo) {
    console.error('Error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
    
    // Here you could send the error to an error reporting service
    // Example: errorReportingService.captureException(error, { extra: errorInfo });
  }

  /**
   * Reset the error state when the error boundary's children change
   */
  componentDidUpdate(prevProps) {
    if (this.props.children !== prevProps.children) {
      this.setState({ 
        hasError: false, 
        error: null, 
        errorInfo: null 
      });
    }
  }

  render() {
    if (this.state.hasError) {
      // Use custom fallback or default
      const FallbackComponent = this.props.fallback || DefaultErrorFallback;
      return <FallbackComponent error={this.state.error} errorInfo={this.state.errorInfo} />;
    }

    return this.props.children;
  }
}

export default ErrorBoundary; 