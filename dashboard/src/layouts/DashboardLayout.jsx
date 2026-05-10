import { useState, useMemo, useEffect, useCallback } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout, getMe } from '../store/authSlice';
import { NAV_GROUPS } from '../config/navConfig';
import { canSeeNavItem } from '../utils/rolePermissions';
import { apiService } from '../services/api';
import { resolveUploadUrl } from '../utils/apiOrigin';
import {
  LuLayoutDashboard, LuUsers, LuUserCog, LuTruck, LuFileText, LuShield,
  LuBanknote, LuSmartphone, LuClock, LuFuel, LuTriangleAlert, LuCircleAlert,
  LuClipboardList, LuBell, LuMessageSquare, LuSearch, LuBan, LuStar,
  LuGift, LuCalendarOff, LuDollarSign, LuWrench, LuChartColumnIncreasing, LuSettings,
  LuUserPlus, LuHistory, LuLogOut, LuMenu, LuX, LuChevronDown, LuTicket
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
  tickets: LuTicket,
};

export default function DashboardLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [collapsedGroups, setCollapsedGroups] = useState({});
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useSelector((state) => state.auth);

  const fetchRecentNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    setLoadingNotifs(true);
    try {
      const { data } = await apiService.get('/notifications/admin/all', { limit: 5 });
      setNotifications(data.data || []);
    } catch (err) {
      console.error('Failed to fetch notifications', err);
    } finally {
      setLoadingNotifs(false);
    }
  }, [isAuthenticated]);

  // 1. Initial Identity Fetch
  useEffect(() => {
    if (isAuthenticated && !user) {
      dispatch(getMe());
    }
  }, [dispatch, isAuthenticated, user]);

  // 2. Initial Notifications Fetch
  useEffect(() => {
    if (isAuthenticated) {
      fetchRecentNotifications();
    }
  }, [isAuthenticated, fetchRecentNotifications]);

  // 3. Periodic / Manual Refresh
  useEffect(() => {
    if (showNotifications) {
      fetchRecentNotifications();
    }
  }, [showNotifications, fetchRecentNotifications]);

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
    <div className="flex min-h-screen bg-bg-main font-alexandria overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`bg-white shadow-2xl border-l border-slate-100 flex flex-col sticky top-0 h-screen z-[100] transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${
          sidebarOpen ? 'w-[280px] min-w-[280px]' : 'w-0 min-w-0 opacity-0'
        }`}
      >
        {/* Brand Logo Section */}
        <div className="p-6 border-b border-slate-100 flex items-center gap-4">
          <div className="w-11 h-11 bg-primary-light rounded-2xl flex items-center justify-center p-2 shadow-sm">
            <img 
              src="/Frame 6 (1).png" 
              alt="Logo" 
              className="w-full h-full object-contain"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          </div>
          <div className="flex flex-col">
            <h1 className="text-2xl font-bold text-brand-primary leading-none tracking-tight">AAMS</h1>
            <span className="text-[0.7rem] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1">Logistic</span>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto py-6 px-3 custom-scrollbar">
          {menuGroups.map((group) => (
            <div key={group.label} className="mb-6">
              <button
                type="button"
                onClick={() => toggleGroup(group.label)}
                className="w-full flex items-center justify-between px-4 py-2 text-slate-400 text-[0.75rem] font-black uppercase tracking-widest hover:text-brand-primary transition-colors mb-2"
              >
                {group.label}
                <LuChevronDown 
                  size={14} 
                  className={`transition-transform duration-300 ${collapsedGroups[group.label] ? '-rotate-90' : ''}`} 
                />
              </button>
              
              <div className={`space-y-1.5 overflow-hidden transition-all duration-500 ${collapsedGroups[group.label] ? 'max-h-0 opacity-0' : 'max-h-[2000px] opacity-100'}`}>
                {group.items.map((item) => (
                  <NavLink
                    key={item.path}
                    to={item.path}
                    end={item.path === '/'}
                    className={({ isActive }) => `
                      flex items-center gap-3 px-4 py-2.5 rounded-2xl text-[0.9rem] font-bold transition-all duration-300 group
                      ${isActive 
                        ? 'bg-primary text-white shadow-orange' 
                        : 'text-slate-500 hover:bg-slate-50 hover:text-primary'
                      }
                    `}
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon size={20} className={`transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110 group-hover:rotate-3'}`} />
                        <span className="truncate">{item.label}</span>
                      </>
                    )}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* User Profile Section */}
        <div className="p-6 bg-slate-50/50 border-t border-slate-100 mt-auto">
          <div className="flex items-center gap-3 mb-5 group cursor-pointer">
            <div className="w-11 h-11 rounded-full bg-brand-light text-brand-primary flex items-center justify-center font-black text-lg border-2 border-white shadow-sm ring-1 ring-brand-primary/5 group-hover:ring-brand-primary/20 transition-all">
              {user?.fullNameAr?.charAt(0) || 'م'}
            </div>
            <div className="flex flex-col min-w-0">
              <div className="text-[0.95rem] font-black text-slate-800 truncate leading-tight">{user?.fullNameAr || '...'}</div>
              <div className="text-[0.7rem] font-bold text-slate-400 uppercase truncate mt-0.5 tracking-wider">{user?.role || ''}</div>
            </div>
          </div>
          <button 
            type="button" 
            onClick={handleLogout} 
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-white border border-red-100 text-red-500 rounded-2xl text-[0.85rem] font-black shadow-sm hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all duration-300"
          >
            <LuLogOut size={16} /> تسجيل الخروج
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        {/* Top Header */}
        <header className="bg-white/80 backdrop-blur-md border-b border-slate-100 px-8 py-5 flex items-center justify-between sticky top-0 z-[100] shadow-sm">
          <div className="flex items-center gap-8">
            <button 
              type="button" 
              onClick={() => setSidebarOpen(!sidebarOpen)} 
              className="w-11 h-11 rounded-2xl bg-slate-50 flex items-center justify-center text-slate-500 hover:bg-brand-light hover:text-brand-primary hover:shadow-sm transition-all duration-300"
            >
              {sidebarOpen ? <LuX size={20} /> : <LuMenu size={20} />}
            </button>
            {/* <div className="relative group hidden md:block">
              <LuSearch className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-primary transition-colors" size={18} />
              <input 
                type="text" 
                placeholder="ابحث عن سائق، مركبة، أو طلب..." 
                className="bg-slate-50 border-none rounded-2xl pr-12 pl-6 py-3 w-[380px] text-sm font-bold placeholder:text-slate-400 focus:ring-2 focus:ring-brand-light focus:bg-white transition-all shadow-inner"
              />
            </div> */}
          </div>
          
          <div className="flex items-center gap-5">
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className={`relative w-11 h-11 rounded-2xl flex items-center justify-center transition-all ${
                  showNotifications ? 'bg-brand-primary text-white shadow-orange' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                }`}
              >
                <LuBell size={20} />
                {!showNotifications && notifications.some(n => !n.isRead) && (
                  <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-brand-primary border-2 border-white rounded-full"></span>
                )}
              </button>

              {showNotifications && (
                <>
                  <div className="fixed inset-0 z-[105]" onClick={() => setShowNotifications(false)}></div>
                  <div className="absolute left-0 mt-3 w-[350px] bg-white rounded-[2rem] shadow-premium border border-slate-100 z-[110] overflow-hidden animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                      <h4 className="text-sm font-black text-slate-800">الإشعارات الأخيرة</h4>
                      <button 
                        onClick={() => { navigate('/notifications'); setShowNotifications(false); }}
                        className="text-[0.7rem] font-black text-brand-primary hover:underline"
                      >
                        عرض الكل
                      </button>
                    </div>
                    
                    <div className="max-h-[400px] overflow-y-auto custom-scrollbar">
                      {loadingNotifs ? (
                        <div className="p-12 text-center text-slate-400 font-bold text-xs flex flex-col items-center gap-3">
                          <LuBell className="animate-bounce opacity-20" size={32} />
                          جاري التحميل...
                        </div>
                      ) : notifications.length > 0 ? (
                        notifications.map((n) => (
                          <div 
                            key={n.id} 
                            onClick={() => { navigate('/notifications'); setShowNotifications(false); }}
                            className={`p-5 border-b border-slate-50 last:border-b-0 hover:bg-slate-50 transition-colors cursor-pointer text-right ${!n.isRead ? 'bg-brand-light/20' : ''}`}
                          >
                            <div className="flex items-start gap-3">
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${!n.isRead ? 'bg-brand-primary text-white' : 'bg-slate-100 text-slate-400'}`}>
                                <LuBell size={14} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-black text-slate-800 truncate mb-1">{n.title}</p>
                                <p className="text-[0.65rem] font-medium text-slate-500 line-clamp-2 leading-relaxed">{n.body}</p>
                                <span className="text-[0.6rem] font-bold text-slate-400 mt-2 block italic">
                                  {new Date(n.createdAt).toLocaleDateString('ar-SA')}
                                </span>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-12 text-center">
                          <LuBell size={48} className="mx-auto mb-4 text-slate-100" />
                          <p className="text-slate-400 font-bold italic text-xs">لا توجد إشعارات جديدة</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
            <div className="w-px h-6 bg-slate-200 mx-1"></div>
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end hidden sm:flex">
                <span className="text-[0.7rem] font-black text-slate-400 uppercase tracking-wider">مرحباً بك</span>
                <span className="text-sm font-black text-slate-800">{user?.fullNameAr || 'المدير'}</span>
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-100 border border-white shadow-sm flex items-center justify-center font-black text-slate-500 overflow-hidden">
                {user?.fullNameAr?.charAt(0) || 'م'}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto custom-scrollbar bg-bg-main/30 animate-in fade-in duration-700">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
