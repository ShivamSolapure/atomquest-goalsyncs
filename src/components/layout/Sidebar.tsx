import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, Target, ChevronLeft, ChevronRight,
  Settings, Award, TrendingUp, Users, FileText, BarChart2,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

interface NavItem {
  to: string;
  icon: React.ReactNode;
  label: string;
  roles?: string[];
}

const navItems: NavItem[] = [
  { to: '/dashboard', icon: <LayoutDashboard size={20} />, label: 'Dashboard' },
  { to: '/goals', icon: <Target size={20} />, label: 'My Goals' },
  { to: '/kpis', icon: <TrendingUp size={20} />, label: 'KPIs' },
  { to: '/reports', icon: <BarChart2 size={20} />, label: 'Reports' },
  { to: '/team', icon: <Users size={20} />, label: 'Team Goals', roles: ['manager', 'admin'] },
  { to: '/achievements', icon: <Award size={20} />, label: 'Achievements' },
  { to: '/admin', icon: <FileText size={20} />, label: 'Admin Panel', roles: ['admin'] },
  { to: '/settings', icon: <Settings size={20} />, label: 'Settings' },
];

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const { role } = useAuth();

  const visible = navItems.filter(item =>
    !item.roles || item.roles.includes(role ?? 'employee')
  );

  return (
    <aside
      className={`relative flex flex-col bg-[#0f1e3c] text-white transition-all duration-300 ease-in-out ${
        collapsed ? 'w-16' : 'w-60'
      } min-h-screen flex-shrink-0`}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10">
        <div className="flex-shrink-0 w-8 h-8 bg-teal-400 rounded-lg flex items-center justify-center">
          <Target size={16} className="text-[#0f1e3c]" />
        </div>
        {!collapsed && (
          <div className="overflow-hidden">
            <p className="text-sm font-bold tracking-tight leading-none text-white">AtomQuest</p>
            <p className="text-[11px] text-teal-400 font-medium tracking-widest uppercase mt-0.5">GoalSync</p>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-4 space-y-1 overflow-y-auto">
        {!collapsed && (
          <p className="text-[10px] font-semibold tracking-widest text-white/30 uppercase px-2 mb-3">
            Navigation
          </p>
        )}
        {visible.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
                isActive
                  ? 'bg-teal-500/20 text-teal-300 border border-teal-500/30'
                  : 'text-white/60 hover:text-white hover:bg-white/8'
              }`
            }
            title={collapsed ? item.label : undefined}
          >
            <span className="flex-shrink-0">{item.icon}</span>
            {!collapsed && <span className="truncate">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Role badge */}
      {!collapsed && role && (
        <div className="px-4 py-3 border-t border-white/10">
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider ${
            role === 'admin'
              ? 'bg-red-500/20 text-red-300'
              : role === 'manager'
              ? 'bg-amber-500/20 text-amber-300'
              : 'bg-teal-500/20 text-teal-300'
          }`}>
            {role}
          </span>
        </div>
      )}

      {/* Collapse toggle */}
      <button
        onClick={onToggle}
        className="absolute -right-3 top-20 w-6 h-6 bg-[#0f1e3c] border border-white/20 rounded-full flex items-center justify-center text-white/60 hover:text-white hover:border-teal-400 transition-colors z-10"
      >
        {collapsed ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
      </button>
    </aside>
  );
}
