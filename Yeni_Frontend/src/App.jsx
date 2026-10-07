import AppRouter from './routes/AppRouter';
import { AuthProvider } from './context/AuthContext.jsx';
import { ToastProvider } from './context/ToastContext.jsx';
import ToastContainer from './components/ToastContainer.jsx';
import AppErrorBoundary from './components/AppErrorBoundary.jsx';

function App() {
  return (
    // ToastProvider en dışta: AuthProvider içindeki hatalar da bildirim gösterebilsin.
    <AppErrorBoundary>
      <ToastProvider>
        <AuthProvider>
          <AppRouter />
          <ToastContainer />
        </AuthProvider>
      </ToastProvider>
    </AppErrorBoundary>
  );
}

export default App;
