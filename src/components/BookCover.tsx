import React, { useState, useMemo } from 'react';
import { BookOpen, KeyRound, User as UserIcon, Store, Shield, Sparkles, Smartphone, Eye, EyeOff } from 'lucide-react';
import { StoreSettings } from '../types';
import { storage } from '../services/storage';

interface BookCoverProps {
  settings: StoreSettings;
  onLogin: (username: string, pass: string) => void;
  onOpenInstaller?: () => void;
  onOpenPhpSource?: () => void;
  onOpenMobileMode?: (username?: string, pass?: string) => void;
  onUpdateSettings: (s: Partial<StoreSettings>) => void;
  isOpening: boolean;
}

const PRESET_COLORS = [
  { name: 'عودي ملكي فاخر', color: '#581c1c' },
  { name: 'جلد بني كلاسيكي', color: '#45220c' },
  { name: 'أخضر زمردي عتيق', color: '#133522' },
  { name: 'كحلي دفتري أنيق', color: '#16253d' },
  { name: 'أسود أبنوسي', color: '#1e1e1e' },
];

export const BookCover: React.FC<BookCoverProps> = ({
  settings,
  onLogin,
  onOpenInstaller,
  onOpenPhpSource,
  onOpenMobileMode,
  onUpdateSettings,
  isOpening,
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isEditingStore, setIsEditingStore] = useState(false);
  const [storeNameInput, setStoreNameInput] = useState(settings.storeName);

  // التحقق مما إذا كان اسم المستخدم المدخل يخص صاحب المتجر (المدير)
  const isStoreOwner = useMemo(() => {
    const trimmed = username.trim().toLowerCase();
    if (!trimmed) return false;
    const users = storage.getUsers();
    const matched = users.find((u) => u.username.toLowerCase() === trimmed);
    return Boolean(matched && matched.role === 'admin');
  }, [username]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    if (!username.trim()) {
      setErrorMsg('يرجى إدخال اسم المستخدم');
      return;
    }
    if (!password) {
      setErrorMsg('يرجى إدخال كلمة المرور');
      return;
    }
    onLogin(username, password);
  };

  const handleMobileLogin = () => {
    setErrorMsg('');
    if (!isStoreOwner) {
      setErrorMsg('تطبيق الجوال مخصص لصاحب المتجر (المدير) فقط');
      return;
    }
    if (!username.trim()) {
      setErrorMsg('يرجى إدخال اسم المستخدم');
      return;
    }
    if (!password) {
      setErrorMsg('يرجى إدخال كلمة المرور');
      return;
    }
    if (onOpenMobileMode) {
      onOpenMobileMode(username, password);
    }
  };

  const handleQuickFill = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
  };

  const handleSaveStoreName = () => {
    if (storeNameInput.trim()) {
      onUpdateSettings({ storeName: storeNameInput.trim() });
    }
    setIsEditingStore(false);
  };

  return (
    <div className="h-screen h-[100dvh] bg-slate-100 flex items-center justify-center relative overflow-hidden perspective-2000 selection:bg-amber-500 selection:text-white">
      {/* Background Ambience: Clean Luxury White Studio Desk */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white via-slate-100 to-stone-200 pointer-events-none" />
      <div className="absolute inset-0 opacity-40 bg-[radial-gradient(#94a3b8_1.2px,transparent_1.2px)] [background-size:24px_24px] pointer-events-none" />

      {/* Main 3D Realistic Ledger Book - ارتفاع الغلاف بارتفاع البراوزر مع الحفاظ على العرض */}
      <div className="relative z-20 w-full max-w-[530px] h-screen h-[100dvh] flex flex-col transition-all duration-1000 ease-in-out">
        {/* Underlying revealed ledger page seen when cover flips open */}
        <div
          className={`absolute inset-0 rounded-none sm:rounded-2xl ledger-paper border-2 border-stone-300 p-8 shadow-2xl flex flex-col justify-center items-center text-center transition-opacity duration-500 pointer-events-none ${
            isOpening ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}
        >
          <span className="text-xs font-mono text-amber-900 font-bold mb-1">
            {settings.storeName}
          </span>
          <h3 className="text-2xl font-black font-amiri text-stone-900 mb-2">
            جاري فتح صفحات الدفتر...
          </h3>
          <div className="w-16 h-1 bg-amber-600 rounded-full animate-pulse" />
        </div>

        {/* The Front Hardcover that swings open */}
        <div
          className={`relative rounded-none sm:rounded-2xl shadow-[0_30px_90px_rgba(0,0,0,0.85)] border-4 border-amber-700/40 py-4 pl-4 pr-13 md:py-4.5 md:pl-4.5 md:pr-13.5 leather-pattern h-full flex flex-col justify-between transition-all duration-1000 transform-style-3d origin-right ${
            isOpening ? '[transform:rotateY(115deg)] scale-105 opacity-0' : 'hover:scale-[1.005]'
          }`}
          style={{ backgroundColor: settings.coverColor }}
        >
          {/* Book Spine (حافة تجليد الدفتر في RTL) */}
          <div className="absolute right-0 top-0 bottom-0 w-8 md:w-9 rounded-r-none sm:rounded-r-2xl bg-black/40 border-l border-amber-500/20 book-spine-shadow flex flex-col justify-around items-center py-6">
            <div className="w-1.5 h-16 rounded-full bg-amber-500/30" />
            <div className="w-1.5 h-16 rounded-full bg-amber-500/30" />
            <div className="w-1.5 h-16 rounded-full bg-amber-500/30" />
          </div>

          {/* Book Bookmark Ribbon (شريط العلامة المرجعية) */}
          <div className="absolute top-0 right-13 w-4 h-10 bg-amber-600 rounded-b shadow-lg border-b-4 border-amber-800" />

          {/* Golden Gilded Embossed Corners - الحدود الأربعة في الصورة الثانية */}
          <div className="absolute top-2.5 left-2.5 w-7 h-7 border-t-2 border-l-2 border-amber-400/80 rounded-tl pointer-events-none" />
          <div className="absolute top-2.5 right-11 w-7 h-7 border-t-2 border-r-2 border-amber-400/80 rounded-tr pointer-events-none" />
          <div className="absolute bottom-2.5 left-2.5 w-7 h-7 border-b-2 border-l-2 border-amber-400/80 rounded-bl pointer-events-none" />
          <div className="absolute bottom-2.5 right-11 w-7 h-7 border-b-2 border-r-2 border-amber-400/80 rounded-br pointer-events-none" />

          {/* Inner Golden Ornate Frame - النافذة داخل الحدود الأربعة بشكل متناسق */}
          <div className="border border-dashed border-amber-400/40 rounded-xl p-3 sm:px-4 sm:py-3.5 relative bg-black/25 backdrop-blur-[2px] h-full flex flex-col justify-between">
            {/* 1. Cover Color Selector: أعلى النافذة */}
            <div className="shrink-0 flex items-center justify-center">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 bg-black/60 rounded-full border border-amber-400/40 shadow-inner backdrop-blur-sm">
                <span className="text-amber-300 text-[11px] font-semibold">لون الغلاف:</span>
                <div className="flex items-center gap-1.5">
                  {PRESET_COLORS.map((c) => (
                    <button
                      key={c.color}
                      type="button"
                      title={c.name}
                      onClick={() => onUpdateSettings({ coverColor: c.color })}
                      className={`w-3.5 h-3.5 rounded-full border transition-all cursor-pointer ${
                        settings.coverColor === c.color
                          ? 'scale-125 border-amber-300 ring-2 ring-amber-400/50 shadow-md'
                          : 'border-stone-500 opacity-70 hover:opacity-100 hover:scale-110'
                      }`}
                      style={{ backgroundColor: c.color }}
                    />
                  ))}
                </div>
              </div>
            </div>

            {/* 2. الصورة المرفقة: بين "لون الغلاف" و"اسم المستخدم" بمسافات متساوية تماماً */}
            <div className="shrink-0 text-center flex flex-col items-center">
              <div className="inline-flex items-center justify-center w-18 h-18 md:w-20 md:h-20 rounded-full bg-gradient-to-br from-amber-500/25 via-black/50 to-amber-700/25 border-2 border-amber-400/80 shadow-lg mb-2 overflow-hidden p-1 shrink-0">
                {settings.logoUrl ? (
                  <img
                    src={settings.logoUrl}
                    alt={settings.storeName}
                    className="w-full h-full object-contain rounded-full"
                  />
                ) : (
                  <BookOpen size={34} className="text-amber-400 drop-shadow" />
                )}
              </div>

              {/* Store Name - Editable inline */}
              <div className="flex items-center justify-center gap-2 mb-0.5">
                {isEditingStore ? (
                  <div className="flex items-center gap-1.5 bg-black/70 p-1 rounded-lg border border-amber-500">
                    <input
                      type="text"
                      value={storeNameInput}
                      onChange={(e) => setStoreNameInput(e.target.value)}
                      className="bg-transparent text-amber-200 text-sm px-2 py-0.5 focus:outline-none text-center"
                      autoFocus
                    />
                    <button
                      onClick={handleSaveStoreName}
                      className="px-2 py-0.5 bg-amber-600 hover:bg-amber-500 text-white rounded text-xs"
                    >
                      حفظ
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => setIsEditingStore(true)}
                    className="cursor-pointer group flex items-center justify-center gap-1.5"
                    title="اضغط لتغيير اسم المؤسسة"
                  >
                    <h2 className="text-lg md:text-xl font-bold font-amiri gold-emboss tracking-wide leading-tight text-center">
                      {settings.storeName}
                    </h2>
                    <Store size={15} className="text-amber-400/60 group-hover:text-amber-300 transition-colors shrink-0" />
                  </div>
                )}
              </div>

              <div className="h-0.5 w-28 mx-auto bg-gradient-to-r from-transparent via-amber-400/60 to-transparent my-1" />

              <h1 className="text-xl md:text-2xl font-black text-amber-100 font-amiri tracking-wider leading-tight">
                {settings.appName}
              </h1>
              <p className="text-amber-200 font-bold text-[11px] mt-0.5">
                سجل حسابات الزبائن والموردين المالي المعتمد
              </p>
            </div>

            {/* 3. النموذج (المرفق): مرفوع للأعلى بمقدار سطر واحد فقط */}
            <div className="shrink-0 w-full -translate-y-3.5">
              <form onSubmit={handleSubmit} className="space-y-2">
                {errorMsg && (
                  <div className="p-1.5 rounded bg-red-950/90 border-2 border-red-500 text-red-100 text-xs text-center font-bold">
                    {errorMsg}
                  </div>
                )}

                <div className="space-y-0.5 text-right">
                  <label className="text-xs font-black text-amber-200 flex items-center gap-1.5">
                    <UserIcon size={13} className="text-amber-300" />
                    <span>اسم المستخدم</span>
                  </label>
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    placeholder="أدخل اسم المستخدم"
                    autoComplete="off"
                    style={{
                      backgroundColor: '#0c0a09',
                      color: '#ffffff',
                      boxShadow: '0 0 0 1000px #0c0a09 inset',
                      WebkitBoxShadow: '0 0 0 1000px #0c0a09 inset',
                    }}
                    className="dark-always-input w-full px-3 py-1.5 bg-[#0c0a09] border-2 border-amber-500/70 rounded-lg text-white font-bold placeholder-stone-500/60 placeholder:font-normal text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/50 text-right transition-all"
                    required
                  />
                </div>

                <div className="space-y-0.5 text-right">
                  <label className="text-xs font-black text-amber-200 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <KeyRound size={13} className="text-amber-300" />
                      <span>كلمة المرور</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-[11px] text-amber-300/80 hover:text-amber-200 flex items-center gap-1 font-bold cursor-pointer transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={12} /> : <Eye size={12} />}
                      <span>{showPassword ? 'إخفاء' : 'إظهار'}</span>
                    </button>
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="أدخل كلمة المرور"
                      autoComplete="new-password"
                      style={{
                        backgroundColor: '#0c0a09',
                        color: '#ffffff',
                        boxShadow: '0 0 0 1000px #0c0a09 inset',
                        WebkitBoxShadow: '0 0 0 1000px #0c0a09 inset',
                      }}
                      className="dark-always-input w-full pl-9 pr-3 py-1.5 bg-[#0c0a09] border-2 border-amber-500/70 rounded-lg text-white font-bold placeholder-stone-500/60 placeholder:font-normal text-sm focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/50 text-right transition-all"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-amber-300/70 hover:text-amber-200 cursor-pointer p-0.5 transition-colors focus:outline-none"
                      title={showPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </div>

                {/* Login Button */}
                <button
                  type="submit"
                  disabled={isOpening}
                  className="w-full py-2 px-4 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-500 hover:from-amber-400 hover:to-amber-300 text-stone-950 font-black rounded-lg shadow-md border-2 border-amber-300 flex items-center justify-center gap-2 text-sm transition-all transform active:scale-95 disabled:opacity-50 cursor-pointer"
                >
                  <Sparkles size={16} className="text-amber-950 animate-pulse" />
                  <span>{isOpening ? 'جاري فتح صفحات الدفتر...' : 'فتح الدفتر والحسابات'}</span>
                </button>

                {/* Mobile App Mode Launcher for Store Owner - فعال فقط عند الدخول كصاحب متجر */}
                {onOpenMobileMode && (
                  <button
                    type="button"
                    disabled={!isStoreOwner || isOpening}
                    onClick={handleMobileLogin}
                    title={
                      !isStoreOwner
                        ? 'فعال فقط عند الدخول بحساب صاحب المتجر (المدير)'
                        : 'دخول مباشر: تطبيق الجوال لصاحب المتجر'
                    }
                    className={`w-full py-1.5 px-3 font-bold rounded-lg border shadow flex items-center justify-center gap-1.5 text-xs transition-all ${
                      isStoreOwner && !isOpening
                        ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 hover:text-amber-200 border-amber-400/70 cursor-pointer active:scale-95 shadow-[0_0_15px_rgba(245,158,11,0.2)]'
                        : 'bg-stone-900/50 text-stone-500 border-stone-700/40 cursor-not-allowed opacity-50'
                    }`}
                  >
                    <Smartphone size={14} className={isStoreOwner ? 'text-amber-400 animate-pulse' : 'text-stone-600'} />
                    <span>دخول مباشر: تطبيق الجوال لصاحب المتجر 📱</span>
                    {!isStoreOwner && (
                      <span className="text-[10px] text-stone-400 font-normal mr-1">
                        (خاص بالمدير)
                      </span>
                    )}
                  </button>
                )}

                {/* Quick Login Helpers - مخفي مع الحفاظ عليه بالكود بناءً على طلب المستخدم */}
                <div className="hidden pt-2 border-t border-amber-500/30 text-center">
                  <span className="text-xs text-amber-200 font-bold block mb-2">
                    دخول سريع للتجربة المباشرة:
                  </span>
                  <div className="flex items-center justify-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleQuickFill('admin', 'admin123')}
                      className="px-2.5 py-1 text-xs rounded bg-black/60 hover:bg-black text-amber-100 font-black border border-amber-400/60 transition-colors cursor-pointer"
                    >
                      👑 المدير (admin)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickFill('accountant', 'user123')}
                      className="px-2.5 py-1 text-xs rounded bg-black/60 hover:bg-black text-amber-100 font-black border border-amber-400/60 transition-colors cursor-pointer"
                    >
                      📊 محاسب (accountant)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQuickFill('user', 'user123')}
                      className="px-2.5 py-1 text-xs rounded bg-black/60 hover:bg-black text-amber-100 font-black border border-amber-400/60 transition-colors cursor-pointer"
                    >
                      💼 أمين صندوق (user)
                    </button>
                  </div>
                </div>
              </form>
            </div>

            {/* 4. Bottom Security Badge: شارة الأمان في أسفل النافذة */}
            <div className="shrink-0 flex items-center justify-center gap-1.5 text-xs text-amber-200 font-bold py-1">
              <Shield size={13} className="text-emerald-400" />
              <span>نظام ديون أمين ومحمي بالكامل</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
