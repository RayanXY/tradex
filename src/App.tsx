import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Showcase from './pages/Showcase'
import ProtectedRoute from './components/ProtectedRoute'
import Wishlist from './pages/Wishlist'
import Search from './pages/Search'

const App = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <Dashboard/>
          </ProtectedRoute>
        } />
        <Route path="/search" element={
          <ProtectedRoute>
            <Search />
          </ProtectedRoute>
        } />
        <Route path="/u/:phone" element={<Showcase />} />
        <Route path="/u/:phone/procuro" element={<Wishlist />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
