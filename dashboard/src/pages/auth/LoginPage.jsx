import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { loginAdmin, clearError } from '../../store/authSlice';
import { User, Lock, Eye, EyeOff, ShieldCheck, Activity, Users, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [identityNumber, setIdentityNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error } = useSelector((state) => state.auth);

  const handleSubmit = async (e) => {
    e.preventDefault();
    dispatch(clearError());
    const result = await dispatch(loginAdmin({ identityNumber, password }));
    if (result.meta.requestStatus === 'fulfilled') {
      navigate('/');
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-[#F4F7FE] text-slate-800 font-alexandria relative overflow-hidden select-none">
      
      {/* Decorative ambient background glows */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-primary/5 blur-[120px] pointer-events-none animate-pulse duration-[8s]" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] rounded-full bg-blue-600/5 blur-[160px] pointer-events-none" />

      {/* Right Side: Form (Full width on mobile, 42% on desktop) */}
      <div className="w-full lg:w-[42%] flex flex-col justify-between p-8 lg:p-12 z-10 bg-white/70 backdrop-blur-2xl border-l border-slate-200/50 shadow-2xl">
        
        {/* Top bar */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-xs text-slate-500 font-medium">الخادم متصل ونشط</span>
          </div>
          <span className="text-xs text-slate-400">v2.4.0</span>
        </div>

        {/* Center: Form Container */}
        <div className="max-w-md w-full mx-auto my-auto py-8">
          
          {/* Mobile Brand Header */}
          <div className="lg:hidden flex flex-col items-center mb-8">
            <div className="h-12 w-12 rounded-2xl bg-gradient-to-tr from-primary to-orange-500 flex items-center justify-center shadow-orange mb-3">
              <ShieldCheck className="h-6 w-6 text-white" />
            </div>
            <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700">AAMS</h1>
            <p className="text-xs text-slate-500 mt-1">نظام إدارة العمليات المتقدم</p>
          </div>

          <div className="mb-8 hidden lg:block text-right">
            <h2 className="text-3xl font-extrabold text-slate-900 mb-2 leading-snug">مرحباً بك مجدداً</h2>
            <p className="text-slate-500 text-sm">أدخل بيانات الاعتماد الخاصة بك للوصول إلى لوحة التحكم.</p>
          </div>

          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 text-red-900 text-sm flex items-start gap-3 animate-shake">
              <span className="h-5 w-5 rounded-full bg-red-500/10 flex items-center justify-center shrink-0 border border-red-500/20 text-red-500 font-bold">!</span>
              <div>
                <p className="font-semibold mb-0.5">فشل تسجيل الدخول</p>
                <p className="text-red-700/80 text-xs">{error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5 text-right">
            
            {/* Identity Input */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-600 mr-1 block">رقم الهوية</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="أدخل رقم الهوية المكون من 10 أرقام"
                  value={identityNumber}
                  onChange={(e) => setIdentityNumber(e.target.value)}
                  className="w-full pl-4 pr-11 py-3.5 bg-slate-50/50 border border-slate-200 rounded-xl font-alexandria text-sm text-slate-800 placeholder-slate-400 transition-all duration-300 focus:outline-none focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 text-right shadow-sm"
                  required
                  disabled={loading}
                />
                <User className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 transition-colors duration-300 peer-focus:text-primary" />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <div className="flex justify-between items-center px-1">
                <label className="text-xs font-semibold text-slate-600">كلمة المرور</label>
                <a href="#forgot" className="text-xs text-primary hover:underline transition-all">هل نسيت كلمة المرور؟</a>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="أدخل كلمة المرور الخاصة بك"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-11 py-3.5 bg-slate-50/50 border border-slate-200 rounded-xl font-alexandria text-sm text-slate-800 placeholder-slate-400 transition-all duration-300 focus:outline-none focus:bg-white focus:border-primary focus:ring-4 focus:ring-primary/10 text-right shadow-sm"
                  required
                  disabled={loading}
                />
                <Lock className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors focus:outline-none"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>

            {/* Remember Me */}
            <div className="flex items-center gap-2.5 pt-1">
              <input
                type="checkbox"
                id="remember"
                className="accent-primary h-4.5 w-4.5 rounded border-slate-300 bg-white text-primary focus:ring-0 focus:ring-offset-0 cursor-pointer"
              />
              <label htmlFor="remember" className="text-xs text-slate-500 select-none cursor-pointer">
                تذكرني على هذا الجهاز
              </label>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 py-4 bg-gradient-to-r from-orange-600 to-primary text-white font-bold rounded-xl shadow-orange hover:shadow-orange-lg hover:scale-[1.01] active:scale-[0.99] transition-all duration-200 flex items-center justify-center gap-2 text-sm disabled:opacity-70 disabled:hover:scale-100 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4.5 w-4.5 animate-spin" />
                  <span>جاري التحقق من البيانات...</span>
                </>
              ) : (
                <span>تسجيل الدخول</span>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center text-slate-400 text-xs border-t border-slate-100 pt-4">
          AAMS © 2026 - جميع الحقوق محفوظة لنظام إدارة العمليات المتقدم
        </div>
      </div>

      {/* Left Side: Visual Showcase (Hidden on screens smaller than lg) */}
      <div className="hidden lg:flex lg:w-[58%] flex-col justify-between p-16 z-10 relative bg-[#F8FAFC] border-r border-slate-200/50">
        
        {/* Dynamic mesh gradient backdrop overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(250,81,3,0.03),rgba(255,255,255,0))]" />
        
        {/* Brand header */}
        <div className="flex items-center gap-3.5 z-20">
          <div className="h-10 w-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-sm">
            <ShieldCheck className="h-5.5 w-5.5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 leading-none mb-1">AAMS</h2>
            <span className="text-[10px] text-primary font-semibold tracking-wider uppercase">Advanced Operations Management</span>
          </div>
        </div>

        {/* Main Pitch */}
        <div className="max-w-xl z-20 text-right space-y-6">
          <span className="px-3 py-1 text-xs font-semibold text-primary bg-primary/10 border border-primary/20 rounded-full inline-block">
            نظام متكامل لإدارة العمليات والمناديب والأسطول
          </span>
          <h1 className="text-2xl xl:text-3xl font-extrabold text-slate-900 leading-normal">
            الريادة في إدارة الشفتات وتتبع المركبات والمناديب
          </h1>
          <p className="text-slate-500 text-sm leading-relaxed">
            نظام متكامل يربط بين إدارة العمليات، المشرفين، والمناديب لتنسيق الشفتات وتتبع خطوط السير والعهد لحظة بلحظة.
          </p>

          {/* Glowing Glassmorphic Feature Cards */}
          <div className="grid grid-cols-2 gap-4 pt-6">
            
            <div className="p-5 rounded-2xl bg-white/60 backdrop-blur-md border border-slate-200/60 shadow-md shadow-slate-100/50 hover:bg-white transition-all duration-300 group">
              <div className="h-10 w-10 rounded-xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-600 mb-3 group-hover:scale-110 transition-transform">
                <Users className="h-5 w-5" />
              </div>
              <h3 className="text-slate-800 font-bold text-sm mb-1">تنسيق فوري للمشرفين</h3>
              <p className="text-slate-500 text-xs leading-relaxed">توزيع المهام ومتابعة حركة المركبات بلحظتها عبر الخريطة التفاعلية.</p>
            </div>

            <div className="p-5 rounded-2xl bg-white/60 backdrop-blur-md border border-slate-200/60 shadow-md shadow-slate-100/50 hover:bg-white transition-all duration-300 group">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 mb-3 group-hover:scale-110 transition-transform">
                <Activity className="h-5 w-5 animate-pulse" />
              </div>
              <h3 className="text-slate-800 font-bold text-sm mb-1">إحصائيات وتقارير ذكية</h3>
              <p className="text-slate-500 text-xs leading-relaxed">توليد تقارير الأداء اليومية ومعدلات استهلاك الوقود تلقائياً بدقة بالغة.</p>
            </div>

          </div>
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between text-slate-500 text-xs z-20">
          <span>نظام مشفر بالكامل ومحمي بطبقات أمان متعددة</span>
        </div>
      </div>
    </div>
  );
}

