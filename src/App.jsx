import { BrowserRouter, Routes, Route, NavLink, Navigate } from 'react-router-dom'
import { HomePage } from './pages/HomePage'
import { PackPage } from './pages/PackPage'
import { QuizPage } from './pages/QuizPage'
import { CardDexPage } from './pages/CardDexPage'
import { HoloDemoPage } from './pages/HoloDemoPage'
import './App.css'

export function App() {
  return (
    <BrowserRouter>
      <div className="app">
        <header className="app-header">
          <div className="header-inner">
            <div className="logo">
              <span className="logo-text">유희왕 시뮬레이터</span>
            </div>
            <nav className="app-nav">
              <NavLink to="/packs" className={({ isActive }) => `nav-tab${isActive ? ' active' : ''}`}>
                팩 오픈
              </NavLink>
              <NavLink to="/quiz" className={({ isActive }) => `nav-tab${isActive ? ' active' : ''}`}>
                카드 퀴즈
              </NavLink>
              <NavLink to="/cards" className={({ isActive }) => `nav-tab${isActive ? ' active' : ''}`}>
                카드 도감
              </NavLink>
              <NavLink to="/demo" className={({ isActive }) => `nav-tab${isActive ? ' active' : ''}`}>
                효과 갤러리
              </NavLink>
            </nav>
          </div>
        </header>
        <main className="app-main">
          <Routes>
            <Route path="/" element={<Navigate to="/packs" replace />} />
            <Route path="/packs" element={<HomePage />} />
            <Route path="/packs/:setCode" element={<PackPage />} />
            <Route path="/quiz" element={<QuizPage />} />
            <Route path="/cards" element={<CardDexPage />} />
            <Route path="/demo" element={<HoloDemoPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  )
}
