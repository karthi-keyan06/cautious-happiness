import { Routes, Route } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import Dashboard from './pages/Dashboard'
import Journal from './pages/Journal'
import Notes from './pages/Notes'
import Settings from './pages/Settings'
import Toast from './components/Toast'
import { ToastProvider } from './context/ToastContext'
import { useEffect } from 'react'
import { initGoogleAuth } from './services/googleCalendar'

export default function App() {
  useEffect(() => {
    const tryInit = () => {
      if (typeof google !== 'undefined') {
        initGoogleAuth();
      } else {
        setTimeout(tryInit, 500);
      }
    };
    tryInit();
  }, []);

  return (
    <ToastProvider>
      <div className="app-layout">
        <Sidebar />
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/journal" element={<Journal />} />
            <Route path="/notes" element={<Notes />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
      </div>
      <Toast />
    </ToastProvider>
  )
}
