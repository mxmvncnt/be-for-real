import { Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { CameraPage } from './pages/CameraPage'
import { HomePage } from './pages/HomePage'
import { SignupPage } from './pages/SignupPage'

export default function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<HomePage />} />
        <Route path="camera" element={<CameraPage />} />
        <Route path="signup" element={<SignupPage />} />
      </Route>
    </Routes>
  )
}
