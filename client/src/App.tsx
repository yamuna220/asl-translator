import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { Layout } from './components/Layout';

import { AuthProvider } from './context/AuthContext';
import { SessionProvider } from './context/SessionContext';
import { Dashboard } from './pages/Dashboard';
import { History } from './pages/History';
import { LiveTranslator } from './pages/LiveTranslator';

import { MockInterview } from './pages/MockInterview';
import { Settings } from './pages/Settings';



export default function App() {
  return (
    <AuthProvider>
      <SessionProvider>
        <BrowserRouter>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 3200,
              style: {
                background: '#1A1A28',
                color: '#fff',
                border: '1px solid rgba(108,99,255,0.35)',
              },
            }}
          />
          <Routes>
            <Route
              element={
                <Layout />
              }
            >
              <Route index element={<Dashboard />} />
              <Route path="live" element={<LiveTranslator />} />
              <Route path="mock" element={<MockInterview />} />
              <Route path="history" element={<History />} />
              <Route path="settings" element={<Settings />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </SessionProvider>
    </AuthProvider>
  );
}
