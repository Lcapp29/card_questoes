import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext.jsx';
import Dashboard from './pages/Dashboard.jsx';
import StudySession from './pages/StudySession.jsx';
import Progress from './pages/Progress.jsx';
import Login from './pages/Login.jsx';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/estudo" element={<StudySession />} />
          <Route path="/study" element={<Navigate to="/estudo" replace />} />
          <Route path="/progresso" element={<Progress />} />
          <Route path="/login" element={<Login />} />
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
