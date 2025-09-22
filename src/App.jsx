import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import EcoCycle from './EcoCycle';
import Impact from './Impact';
import Team from './Team';
import Resources from './Resources';
import HowToRecycle from './HowToRecycle'; // <-- import your new page
import './index.css';

const App = () => {
  return (
    <Router>
      <div className="min-h-screen bg-customBlack text-customWhite">
        <Navbar />
        <Routes>
          <Route path="/" element={<EcoCycle />} />
          <Route path="/impact" element={<Impact />} />
          <Route path="/team" element={<Team />} />
          <Route path="/resources" element={<Resources />} />
          <Route path="/how-to-recycle" element={<HowToRecycle />} /> {/* <-- new route */}
        </Routes>
        <Footer />
      </div>
    </Router>
  );
};

export default App;
