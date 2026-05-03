import { useState, useMemo, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout, getMe } from '../store/authSlice';
import { NAV_GROUPS } from '../config/navConfig';
import { canSeeNavItem } from '../utils/rolePermissions';
import {
  LuLayoutDashboard, LuUsers, LuUserCog, LuTruck, LuFileText, LuShield,
  LuBanknote, LuSmartphone, LuClock, LuFuel, LuTriangleAlert, LuCircleAlert,
  LuClipboardList, LuBell, LuMessageSquare, LuSearch, LuBan, LuStar,
  LuGift, LuCalendarOff, LuDollarSign, LuWrench, LuChartColumnIncreasing, LuSettings,
  LuUserPlus, LuHistory, LuLogOut, LuMenu, LuX, LuChevronDown,
} from 'react-icons/lu';

const ICON_MAP = {
  dashboard: LuLayoutDashboard,
  users: LuUsers,
  supervisors: LuUserCog,
  vehicles: LuTruck,
  documents: LuFileText,
  licenses: LuShield,
  bank: LuBanknote,
  platform: LuSmartphone,
  shifts: LuClock,
  fuel: LuFuel,
  violations: LuTriangleAlert,
  incidents: LuCircleAlert,
  reports: LuClipboardList,
  notifications: LuBell,
  chat: LuMessageSquare,
  investigations: LuSearch,
  penalties: LuBan,
  ratings: LuStar,
  rewards: LuGift,
  leaves: LuCalendarOff,
  salary: LuDollarSign,
  maintenance: LuWrench,
  analytics: LuChartColumnIncreasing,
  settings: LuSettings,
  admins: LuUserPlus,
  audit: LuHistory,
};

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useSelector((state) => state.auth);

  useEffect(() => {
    if (isAuthenticated && !user) {
      dispatch(getMe());
    }
  }, [dispatch, isAuthenticated, user]);

  const menuGroups = useMemo(() => {
    const role = user?.role;
    return NAV_GROUPS.map((group) => ({
      ...group,
      items: group.items
        .filter((item) => canSeeNavItem(role, item.anyOf, { superAdminOnly: item.superAdminOnly }))
        .map((item) => ({
          ...item,
          icon: ICON_MAP[item.iconKey] || LuLayoutDashboard,
        })),
    })).filter((g) => g.items.length > 0);
  }, [user?.role]);

  const toggleGroup = (label) => {
    setCollapsedGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside
        style={{
          width: sidebarOpen ? 260 : 0,
          minWidth: sidebarOpen ? 260 : 0,
          background: 'var(--bg-sidebar)',
          color: 'white',
          transition: 'all 0.3s',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          position: 'sticky',
          top: 0,
          height: '100vh',
        }}
      >
        <div style={{ padding: '20px', borderBottom: '1px solid rgba(255,255,255,0.1)', textAlign: 'center' }}>
          <h1 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#F97316' }}>AAMS</h1>
          <p style={{ fontSize: '0.7rem', color: '#94A3B8', marginTop: 4 }}>نظام إدارة العمليات</p>
        </div>

        <nav style={{ flex: 1, overflowY: 'auto', padding: '12px 0' }}>
          {menuGroups.map((group) => (
            <div key={group.label} style={{ marginBottom: 4 }}>
              <button
                type="button"
                onClick={() => toggleGroup(group.label)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 16px', background: 'none', border: 'none', color: '#94A3B8',
                  fontSize: '0.7rem', fontWeight: 700, cursor: 'pointer', fontFamily: 'Almarai',
                }}
              >
                {group.label}
                <LuChevronDown size={12} style={{ transform: collapsedGroups[group.label] ? 'rotate(-90deg)' : 'none', transition: 'transform 0.2s' }} />
              </button>
              {!collapsedGroups[group.label] && group.items.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/'}
                  style={({ isActive }) => ({
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 20px', textDecoration: 'none', fontSize: '0.85rem',
                    color: isActive ? '#F97316' : '#CBD5E1',
                    background: isActive ? 'rgba(249,115,22,0.1)' : 'transparent',
                    borderRight: isActive ? '3px solid #F97316' : '3px solid transparent',
                    transition: 'all 0.2s',
                  })}
                >
                  <item.icon size={18} />
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: 700, marginBottom: 4 }}>{user?.fullNameAr || '...'}</div>
          <div style={{ fontSize: '0.7rem', color: '#94A3B8', marginBottom: 12 }}>{user?.role || ''}</div>
          <button type="button" onClick={handleLogout} className="btn btn-sm" style={{ width: '100%', background: 'rgba(239,68,68,0.15)', color: '#EF4444', justifyContent: 'center' }}>
            <LuLogOut size={14} /> تسجيل الخروج
          </button>
        </div>
      </aside>

      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <header style={{
          background: 'white', borderBottom: '1px solid var(--border)',
          padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          position: 'sticky', top: 0, zIndex: 100,
        }}>
          <button type="button" onClick={() => setSidebarOpen(!sidebarOpen)} className="btn-icon">
            {sidebarOpen ? <LuX size={18} /> : <LuMenu size={18} />}
          </button>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>مرحباً، {user?.fullNameAr || 'المدير'}</span>
          </div>
        </header>

        <main style={{ flex: 1, overflow: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
