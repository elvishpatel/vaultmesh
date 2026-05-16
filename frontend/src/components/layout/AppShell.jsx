import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function AppShell() {
  return (
    <div className="scanlines">
      <div className="noise-overlay" />
      <Sidebar />
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
