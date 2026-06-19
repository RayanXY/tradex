import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Inventory from './pages/Inventory'
import Showcase from './pages/Showcase'
import ProtectedRoute from './components/ProtectedRoute'

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/inventory" element={
          <ProtectedRoute>
            <Inventory/>
          </ProtectedRoute>
        } />
        <Route path="/u/:phone" element={<Showcase />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
