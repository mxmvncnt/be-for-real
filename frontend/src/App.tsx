import { Route, Routes, Navigate } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { CameraPage } from './pages/CameraPage'
import { HomePage } from './pages/HomePage'
import { RewindsPage } from './pages/RewindsPage'
import { SignupPage } from './pages/SignupPage'
import RequireAuth from './lib/RequireAuth'

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route path="signup" element={<SignupPage />} />

        <Route element={<RequireAuth />}>
          <Route path="camera" element={<CameraPage />} />
          <Route path="rewinds" element={<RewindsPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
