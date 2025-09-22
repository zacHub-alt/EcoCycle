import { Link, useLocation } from 'react-router-dom';
import { useState } from 'react';
import { Bars3Icon, XMarkIcon } from '@heroicons/react/24/outline'; // Heroicons v2

export default function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Impact', path: '/impact' },
    { name: 'Team', path: '/team' },
    { name: 'Resources', path: '/resources' },
    { name: 'How to Recycle', path: '/how-to-recycle' }, // <-- Added link
  ];

  return (
    <nav className="sticky top-0 bg-[#0B0B0B] bg-[url('/linen-texture.png')] bg-repeat shadow-lg z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#228B22] flex items-center space-x-2">
          <span>♻️</span>
          <span>EcoCycle</span>
        </h1>

        {/* Desktop Menu */}
        <div className="hidden md:flex space-x-6">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              to={link.path}
              className={`text-lg font-medium transition-colors ${
                location.pathname === link.path
                  ? 'text-[#A3C586] border-b-2 border-[#A3C586] pb-1'
                  : 'text-[#CFCFCF] hover:text-[#9ACD32]'
              }`}
            >
              {link.name}
            </Link>
          ))}
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden">
          <button
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
            className="text-[#CFCFCF] hover:text-[#9ACD32] focus:outline-none focus:ring-2 focus:ring-[#228B22] rounded"
          >
            {menuOpen ? <XMarkIcon className="h-6 w-6" /> : <Bars3Icon className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {menuOpen && (
        <div className="md:hidden bg-[#0B0B0B] bg-[url('/linen-texture.png')] bg-repeat px-4 pb-4 space-y-2">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              to={link.path}
              onClick={() => setMenuOpen(false)}
              className={`block text-lg font-medium transition-colors ${
                location.pathname === link.path
                  ? 'text-[#A3C586] border-l-4 border-[#A3C586] pl-2'
                  : 'text-[#CFCFCF] hover:text-[#9ACD32]'
              }`}
            >
              {link.name}
            </Link>
          ))}
        </div>
      )}
    </nav>
  );
}
