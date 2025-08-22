import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Sidebar from './components/Sidebar';
import Resumes from './pages/Resumes';
import Experience from './pages/Experience';
import ProjectSheet from './pages/ProjectSheet';
import Projects from './pages/Projects';
import Personnel from './pages/Personnel';
import Proposals from './pages/Proposals';
import Login from './pages/Login';
import './App.css';

function AppContent() {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="app-loading">
        <div className="loading-spinner">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return (
    <div className="App">
      <Sidebar />
      <main className="content">
        <Routes>
          <Route path="/proposals" element={<Proposals />} />
          <Route path="/resumes" element={<Resumes />} />
          <Route path="/resumes/:resumeId" element={<Resumes />} />
          <Route path="/experience" element={<Experience />} />
          <Route path="/project-sheet" element={<ProjectSheet />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/personnel" element={<Personnel />} />
          <Route path="/" element={<Proposals />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </Router>
  );
}

export default App;