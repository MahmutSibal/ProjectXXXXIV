import { Component } from 'react';

import StatusScreen from './StatusScreens.jsx';

export default class AppErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error) {
    console.error('Beklenmeyen arayüz hatası:', error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <StatusScreen
          variant="error"
          onRetry={() => window.location.reload()}
          retryLabel="Sayfayı Yenile"
          showHome
        />
      );
    }

    return this.props.children;
  }
}
