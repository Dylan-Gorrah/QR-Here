import { Routes, Route, Navigate } from 'react-router-dom'
import NameScreen from './pages/NameScreen'
import CameraCube from './pages/CameraCube'
import CheckIn from './pages/CheckIn'
import Done from './pages/Done'
import AdminLogin from './pages/AdminLogin'
import Board from './pages/Board'
import { supabaseReady } from './lib/supabase'

export default function App() {
  return (
    <>
      {!supabaseReady && (
        <div className="fixed bottom-3 left-1/2 -translate-x-1/2 z-50 rounded-full bg-amber-50 border border-amber-200 px-4 py-1.5 text-xs font-medium text-amber-700">
          Supabase not connected — add keys to .env.local
        </div>
      )}
      <Routes>
        <Route path="/" element={<NameScreen />} />
        <Route path="/scan" element={<CameraCube />} />
        <Route path="/in" element={<CheckIn />} />
        <Route path="/done" element={<Done />} />
        <Route path="/admin" element={<AdminLogin />} />
        <Route path="/board/:id" element={<Board />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  )
}
