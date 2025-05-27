import React from 'react';

class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, errorInfo: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true };
    }

    componentDidCatch(error, errorInfo) {
        this.setState({ errorInfo: errorInfo });
        console.error("ErrorBoundary caught an error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="error-boundary-fallback">
                    <h2>죄송합니다, 화면을 표시하는 중 문제가 발생했습니다.</h2>
                    <p>새로고침하거나 잠시 후 다시 시도해 주세요.</p>
                    {/* 개발 모드에서는 오류 상세 정보 표시 가능 */}
                    {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
                        <details style={{ whiteSpace: 'pre-wrap' }}>
                            {this.state.errorInfo.componentStack}
                        </details>
                    )}
                </div>
            );
        }
        return this.props.children;
    }
}
export default ErrorBoundary;