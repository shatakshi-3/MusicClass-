'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';

interface TopNavProps {
  onMenuToggle?: () => void;
}

export default function TopNav({ onMenuToggle }: TopNavProps) {
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    setLoggingOut(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/login');
    } catch {
      setLoggingOut(false);
    }
  };

  return (
    <header className="topnav">
      <div className="topnav-left">
        <button
          onClick={onMenuToggle}
          className="topnav-menu-btn"
          aria-label="Toggle menu"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
          </svg>
        </button>
        <h1 className="topnav-title">Admin Panel</h1>
      </div>
      <div className="topnav-right">
        <div className="topnav-user">
          <div className="topnav-avatar">A</div>
          <span className="topnav-email">Admin</span>
        </div>
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          className="topnav-logout-btn"
        >
          {loggingOut ? 'Logging out...' : 'Logout'}
        </button>
      </div>
    </header>
  );
}
