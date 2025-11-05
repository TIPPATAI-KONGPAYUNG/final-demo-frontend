// src/App.jsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AdminPage from './pages/AdminPage';
import CategorySelection from './components/CategorySelection';
import CategoryLevels from './components/CategoryLevels';
import LevelGame from './components/LevelGame';
import AdminPanel from './components/AdminPanel';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<CategorySelection />} />
        <Route path="/admin" element={<AdminPage />} />
        <Route path="/adminpanel" element={<AdminPanel />} />
        <Route path="/mapselection" element={<CategorySelection />} />
        <Route path="/mapselect/:categoryId" element={<CategoryLevels />} />
        <Route path="/mapselection/:levelId" element={<LevelGame />} />
      </Routes>
    </Router>
  );
}

export default App;