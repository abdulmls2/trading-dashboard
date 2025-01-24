import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import LogTrade from './pages/LogTrade';
import Performance from './pages/Performance';
import ChatAI from './pages/ChatAI';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/log-trade" element={<LogTrade />} />
        <Route path="/performance" element={<Performance />} />
        <Route path="/chat-ai" element={<ChatAI />} />
      </Routes>
    </Router>
  );
}

export default App;