import React, { useState, useEffect, useRef } from 'react';
import {
  BookOpen,
  Users,
  Building2,
  FileSpreadsheet,
  BarChart3,
  Search,
  PlusCircle,
  LogOut,
  FolderDown,
  RefreshCw,
  History,
  Sliders,
  DollarSign,
  Bookmark,
  Receipt,
  User as UserIcon,
  Volume2,
  VolumeX,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Smartphone
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { User, StoreSettings, TransactionType } from '../types';
import { ActiveTab } from './Header';
import { playPaperTurnSound } from '../utils/sound';
import { canUserAccessTab } from '../utils/permissions';

interface OpenBookLayoutProps {
  currentUser: User | null;
  users?: User[];
  onSwitchUser?: (user: User) => void;
  settings: StoreSettings;
  activeTab: ActiveTab;
  pageKey?: string;
  onSelectTab: (tab: ActiveTab) => void;
  onNavigateNext?: () => void;
  onNavigatePrev?: () => void;
  onOpenNewTransaction: (type?: TransactionType) => void;
  onCloseBook: () => void;
  onOpenPhpSource: () => void;
  onToggleMobileMode?: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  children: React.ReactNode;
}

interface TabItem {
  id: ActiveTab;
  label: string;
  icon: React.ReactNode;
  tagColor: string;
}

const TAB_RANK: Record<string, number> = {
  dashboard: 1,
  sales_payments: 2,
  purchases_payments: 3,
  customers: 4,
  suppliers: 5,
  journal: 6,
  reports: 7,
  api_sync: 8,
  audit_backup: 9,
  settings: 10,
};

const getRank = (key: string): number => {
  if (key.startsWith('customer-ledger') || key.startsWith('customer_ledger')) return 4.5;
  if (key.startsWith('supplier-ledger') || key.startsWith('supplier_ledger')) return 5.5;
  return TAB_RANK[key] || 1;
};

// 3D realistic page folding and unfolding variants (طوي صفحات السجلات الطبيعية)
const pageVariants = {
  initial: (dir: number) => ({
    transformOrigin: dir > 0 ? 'right center' : 'left center',
    rotateY: dir > 0 ? 32 : -32,
    opacity: 0,
    scale: 0.985,
    filter: 'brightness(0.92)',
  }),
  animate: {
    rotateY: 0,
    opacity: 1,
    scale: 1,
    filter: 'brightness(1)',
    transition: {
      duration: 0.3,
      ease: [0.16, 1, 0.3, 1] as const,
    },
  },
  exit: (dir: number) => ({
    transformOrigin: dir > 0 ? 'right center' : 'left center',
    rotateY: dir > 0 ? -42 : 42,
    opacity: 0,
    scale: 0.975,
    filter: 'brightness(0.86) drop-shadow(-15px 5px 25px rgba(0,0,0,0.35))',
    transition: {
      duration: 0.24,
      ease: [0.65, 0.05, 0.85, 0.25] as const,
    },
  }),
};

export const OpenBookLayout: React.FC<OpenBookLayoutProps> = ({
  currentUser,
  users,
  onSwitchUser,
  settings,
  activeTab,
  pageKey,
  onSelectTab,
  onNavigateNext,
  onNavigatePrev,
  onOpenNewTransaction,
  onCloseBook,
  onOpenPhpSource,
  onToggleMobileMode,
  searchQuery,
  onSearchChange,
  children,
}) => {
  const [isFlipping, setIsFlipping] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [direction, setDirection] = useState<number>(1);
  const currentKey = pageKey || activeTab;
  const prevKeyRef = useRef<string>(currentKey);

  const tabs: TabItem[] = [
    { id: 'dashboard', label: 'الرئيسية', icon: <BookOpen size={14} />, tagColor: 'bg-amber-700 text-amber-100 border-amber-600' },
    { id: 'sales_payments', label: 'المبيعات وتسديد الزبائن', icon: <Users size={14} />, tagColor: 'bg-red-800 text-red-100 border-red-700' },
    { id: 'purchases_payments', label: 'المشتريات وتسديد الموردين', icon: <Building2 size={14} />, tagColor: 'bg-blue-800 text-blue-100 border-blue-700' },
    { id: 'customers', label: 'دليل الزبائن', icon: <Users size={14} />, tagColor: 'bg-stone-750 text-stone-200 border-stone-600' },
    { id: 'suppliers', label: 'دليل الموردين', icon: <Building2 size={14} />, tagColor: 'bg-stone-750 text-stone-200 border-stone-600' },
    { id: 'journal', label: 'اليومية العامة', icon: <FileSpreadsheet size={14} />, tagColor: 'bg-stone-750 text-stone-200 border-stone-600' },
    { id: 'reports', label: 'التقارير المالية', icon: <BarChart3 size={14} />, tagColor: 'bg-emerald-800 text-emerald-100 border-emerald-700' },
    { id: 'api_sync', label: 'API & مزامنة', icon: <RefreshCw size={14} />, tagColor: 'bg-cyan-800 text-cyan-100 border-cyan-700' },
    { id: 'audit_backup', label: 'الرقابة والنسخ', icon: <History size={14} />, tagColor: 'bg-amber-900 text-amber-200 border-amber-800' },
    { id: 'settings', label: 'الإعدادات', icon: <Sliders size={14} />, tagColor: 'bg-stone-800 text-stone-300 border-stone-700' },
  ];

  // Filter tabs strictly according to permissions granted to the logged-in user
  const visibleTabs = tabs.filter((t) => t.id !== 'api_sync' && canUserAccessTab(t.id, currentUser));
  const activeTabIndex = visibleTabs.findIndex((t) => t.id === activeTab);
  const currentTab = visibleTabs[activeTabIndex] || visibleTabs[0] || tabs[0];

  // Trigger physical paper turn when active tab or pageKey changes
  useEffect(() => {
    if (prevKeyRef.current !== currentKey) {
      const prevRank = getRank(prevKeyRef.current);
      const nextRank = getRank(currentKey);
      const dir = nextRank >= prevRank ? 1 : -1;
      setDirection(dir);

      if (soundEnabled) {
        playPaperTurnSound();
      }
      setIsFlipping(true);
      const timer = setTimeout(() => {
        setIsFlipping(false);
      }, 520);
      prevKeyRef.current = currentKey;
      return () => clearTimeout(timer);
    }
  }, [currentKey, soundEnabled]);

  // Keyboard navigation for page turning
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }
      if (e.key === 'ArrowLeft') {
        if (onNavigateNext) onNavigateNext();
      } else if (e.key === 'ArrowRight') {
        if (onNavigatePrev) onNavigatePrev();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onNavigateNext, onNavigatePrev]);

  const handleTabClick = (tabId: ActiveTab) => {
    if (tabId === activeTab) return;
    const prevRank = getRank(currentKey);
    const nextRank = getRank(tabId);
    setDirection(nextRank >= prevRank ? 1 : -1);

    if (soundEnabled) {
      playPaperTurnSound();
    }
    setIsFlipping(true);
    onSelectTab(tabId);
    setTimeout(() => {
      setIsFlipping(false);
    }, 520);
  };

  return (
    <div className="w-screen h-screen max-w-[100vw] max-h-[100vh] bg-slate-100 p-1 sm:p-2 md:p-3 relative overflow-hidden flex flex-col selection:bg-amber-600 selection:text-white">
      {/* Ambient Studio White Desk Background */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-white via-slate-100 to-stone-200 pointer-events-none" />
      <div className="fixed inset-0 opacity-40 bg-[radial-gradient(#94a3b8_1.2px,transparent_1.2px)] [background-size:24px_24px] pointer-events-none" />

      {/* Outer Open Book Container - Full Screen Width & Full Height */}
      <div className="relative z-20 w-full h-full flex-1 flex flex-col min-h-0">
        {/* Book Physical Frame (Hardcover leather base spanning full width & height) */}
        <div
          className="relative w-full h-full flex-1 flex flex-col rounded-xl md:rounded-2xl p-2 sm:p-3 md:p-4 shadow-[0_20px_60px_rgba(0,0,0,0.95)] border-4 border-amber-800/50 leather-pattern min-h-0 overflow-hidden"
          style={{ backgroundColor: settings.coverColor }}
        >
          {/* Golden Gilded Embossed Corners on the Leather Outer Cover */}
          <div className="absolute top-2 left-2 w-8 h-8 border-t-2 border-l-2 border-amber-400/80 rounded-tl pointer-events-none z-30" />
          <div className="absolute top-2 right-2 w-8 h-8 border-t-2 border-r-2 border-amber-400/80 rounded-tr pointer-events-none z-30" />
          <div className="absolute bottom-2 left-2 w-8 h-8 border-b-2 border-l-2 border-amber-400/80 rounded-bl pointer-events-none z-30" />
          <div className="absolute bottom-2 right-2 w-8 h-8 border-b-2 border-r-2 border-amber-400/80 rounded-br pointer-events-none z-30" />

          {/* Central Silk Bookmark Ribbon Hanging from Top */}
          <div className="absolute top-0 right-1/2 translate-x-1/2 w-6 h-10 bg-gradient-to-b from-amber-600 to-amber-700 rounded-b-md shadow-xl border-x border-b border-amber-800 z-40 pointer-events-none flex items-end justify-center pb-0.5">
            <Bookmark size={13} className="text-amber-300" />
          </div>

          {/* Top Leather Toolstrip */}
          <div className="shrink-0 flex flex-wrap items-center justify-between gap-2 mb-2 px-1 text-xs text-amber-200">
            <div className="flex items-center gap-2">
              {settings.logoUrl ? (
                <img
                  src={settings.logoUrl}
                  alt={settings.storeName}
                  className="w-6 h-6 rounded-md object-contain bg-black/40 border border-amber-400/50 shadow-xs"
                />
              ) : (
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              )}
              <span className="font-amiri font-bold text-sm sm:text-base tracking-wide text-amber-300">
                {settings.storeName} — {settings.appName}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {/* Paper Turn Sound Toggle */}
              <button
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`p-1.5 px-2.5 rounded flex items-center gap-1.5 text-xs font-bold border transition-colors cursor-pointer ${
                  soundEnabled
                    ? 'bg-amber-950/80 text-amber-200 border-amber-600/70'
                    : 'bg-stone-900 text-stone-200 border-stone-600'
                }`}
                title={soundEnabled ? 'صوت تقليب الورق مفعل' : 'صوت تقليب الورق صامت'}
              >
                {soundEnabled ? <Volume2 size={13} className="text-amber-400" /> : <VolumeX size={13} className="text-stone-300" />}
                <span className="hidden sm:inline">{soundEnabled ? 'صوت الورق' : 'صامت'}</span>
              </button>

              {/* Mobile App View Button */}
              {onToggleMobileMode && (
                <button
                  onClick={onToggleMobileMode}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-amber-950/85 hover:bg-amber-900 text-amber-200 border border-amber-600/70 text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95"
                  title="التبديل إلى تطبيق الجوال لصاحب المتجر (الآدمن)"
                >
                  <Smartphone size={14} className="text-amber-400" />
                  <span className="hidden sm:inline">تطبيق الجوال</span>
                </button>
              )}

              {/* PHP Source Button - مخفي بناء على طلب المستخدم مع الحفاظ عليه بالكود */}
              <button
                onClick={onOpenPhpSource}
                className="hidden items-center gap-1.5 px-3 py-1.5 rounded bg-black/60 hover:bg-black/80 text-emerald-300 hover:text-emerald-200 border border-emerald-500/60 text-xs font-bold transition-colors cursor-pointer"
              >
                <FolderDown size={14} />
                <span>سورس PHP & MySQL</span>
              </button>

              {/* Close Book Button */}
              <button
                onClick={onCloseBook}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-red-950/90 hover:bg-red-900 text-red-100 border border-red-600/70 text-xs font-bold transition-colors cursor-pointer"
                title="إغلاق صفحات الدفتر وقفل الغلاف"
              >
                <LogOut size={14} />
                <span>إغلاق الدفتر</span>
              </button>
            </div>
          </div>

          {/* Book Index Tabs (فهارس الدفتر الملونة البارزة مثل دفاتر الحسابات الواقعية) */}
          <div className="shrink-0 flex items-center gap-1 sm:gap-1.5 overflow-x-auto pb-0.5 px-1 no-scrollbar">
            {visibleTabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabClick(tab.id)}
                  className={`flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 rounded-t-lg text-xs font-bold transition-all border-t-2 border-x shadow-md cursor-pointer shrink-0 ${
                    isActive
                      ? 'bg-[#fbf9f3] text-stone-950 font-black border-amber-600 translate-y-1 shadow-[0_-4px_12px_rgba(0,0,0,0.3)] ring-2 ring-amber-500/40'
                      : 'bg-stone-900/95 hover:bg-stone-850 text-white hover:text-amber-200 border-stone-600/90 font-extrabold shadow-sm'
                  }`}
                >
                  <span
                    className={`w-2.5 h-2.5 rounded-full transition-transform ${
                      isActive ? 'bg-amber-600 ring-2 ring-amber-400/70 scale-110' : 'bg-amber-400'
                    }`}
                  />
                  <span className={`tracking-wide ${isActive ? 'text-stone-950 font-black' : 'text-stone-100 font-extrabold'}`}>
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* THE REALISTIC OPEN PAPER SPREAD (صفحات الدفتر الورقية المفتوحة - كاملة الارتفاع والعرض) */}
          <div className="relative flex-1 flex flex-col rounded-xl ledger-paper border-2 border-stone-300/80 shadow-[inset_0_0_40px_rgba(0,0,0,0.12)] p-2.5 sm:p-4 md:p-5 text-stone-900 min-h-0 overflow-hidden book-edge-stack-left book-edge-stack-right">
            {/* Central Gutter Crease Shadow (طية وتجليد منتصف الدفتر) */}
            <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-8 book-spine-crease pointer-events-none hidden md:block z-10" />

            {/* Top Internal Ledger Header & Quick Toolbar */}
            <div className="shrink-0 relative z-20 pb-3 mb-3 border-b-2 border-stone-300 flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Store & Date Identity */}
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center shadow-md border-2 border-amber-600/60 shrink-0 overflow-hidden bg-white/10"
                  style={{ backgroundColor: settings.coverColor }}
                >
                  {settings.logoUrl ? (
                    <img
                      src={settings.logoUrl}
                      alt={settings.storeName}
                      className="w-full h-full object-contain p-0.5"
                    />
                  ) : (
                    <BookOpen size={20} className="text-amber-300" />
                  )}
                </div>
                <div>
                  <h1 className="text-lg sm:text-xl font-black font-amiri text-stone-900 leading-tight">
                    {settings.storeName}
                  </h1>
                  <div className="flex items-center gap-2 text-xs text-stone-800 font-mono mt-0.5">
                    <span className="font-semibold text-stone-900">{settings.appName}</span>
                    <span>•</span>
                    <span className="font-semibold text-stone-800">تاريخ اليوم: {new Date().toLocaleDateString('ar-EG')}</span>
                    <span>•</span>
                    <span className="font-bold text-amber-950">العملة: {settings.currency}</span>
                  </div>
                </div>
              </div>

              {/* User Info Badge & Fast User Switcher */}
              <div className="flex items-center gap-2 justify-end">
                {users && users.length > 1 && onSwitchUser ? (
                  <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-200/95 border border-stone-300 text-stone-900 text-xs font-semibold shadow-xs">
                    <UserIcon size={13} className="text-amber-800 shrink-0" />
                    <select
                      value={currentUser?.id || ''}
                      onChange={(e) => {
                        const selected = users.find((u) => u.id === e.target.value);
                        if (selected) onSwitchUser(selected);
                      }}
                      className="bg-transparent font-bold text-stone-950 text-xs focus:outline-none cursor-pointer pr-1"
                      title="تبديل المستخدم الحالي لاختبار الصلاحيات"
                    >
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.fullName} ({u.role === 'admin' ? 'مدير' : u.role === 'accountant' ? 'محاسب' : 'أمين صندوق'})
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-200/95 border border-stone-300 text-stone-800 text-xs font-semibold shadow-xs">
                    <UserIcon size={13} className="text-amber-800" />
                    <span>{currentUser?.fullName}</span>
                    <span className="text-[10px] bg-stone-300 text-stone-700 px-1.5 py-0.2 rounded font-mono">
                      {currentUser?.role === 'admin' ? 'مدير' : currentUser?.role === 'accountant' ? 'محاسب' : 'أمين صندوق'}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* 3D Physical Turning Page Leaf (ورقة تقليب ثلاثية الأبعاد تحاكي طوي دفاتر السجلات الطبيعية) */}
            {isFlipping && (
              <div className="absolute inset-0 z-40 pointer-events-none overflow-hidden [perspective:2600px]">
                {/* The turning physical leaf curving from the spine across the book based on direction */}
                <div
                  className={`absolute inset-y-0 ${
                    direction > 0
                      ? 'right-0 origin-right animate-leaf-flip'
                      : 'left-0 origin-left animate-leaf-flip-reverse'
                  } w-1/2 rounded-r-xl ledger-paper border-y-2 border-stone-400 shadow-2xl flex items-center justify-center bg-[#f7f3e6]`}
                >
                  {/* Spine Crease & Dynamic Shadow */}
                  <div
                    className={`absolute inset-y-0 ${
                      direction > 0 ? 'right-0' : 'left-0'
                    } w-10 bg-gradient-to-l from-black/25 via-black/10 to-transparent`}
                  />
                  <div className="absolute inset-0 bg-gradient-to-r from-black/15 via-white/20 to-black/5" />

                  {/* Watermark of the turning ledger leaf */}
                  <div className="opacity-20 text-stone-700 font-amiri font-bold text-sm sm:text-base select-none px-4 text-center">
                    📖 {settings.storeName} — طوي ورقة السجل
                  </div>
                </div>

                {/* Ambient shadow cast on the underlying sheet */}
                <div
                  className={`absolute inset-y-0 ${
                    direction > 0 ? 'left-0' : 'right-0'
                  } w-1/2 bg-gradient-to-r from-black/20 to-transparent transition-opacity duration-300`}
                />
              </div>
            )}

            {/* Inner Content Component with 3D Page Fold & Reveal Transition */}
            <div className="relative z-20 flex-1 overflow-hidden min-h-0 w-full flex flex-col [perspective:2400px]">
              <AnimatePresence mode="wait" custom={direction}>
                <motion.div
                  key={currentKey}
                  custom={direction}
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="flex-1 overflow-y-auto overflow-x-hidden pr-1 pl-1 min-h-0 w-full max-w-full"
                  style={{ transformStyle: 'preserve-3d' }}
                >
                  {/* Light Sheen Sweep as paper lands flat */}
                  {isFlipping && (
                    <div className="absolute inset-0 z-30 pointer-events-none overflow-hidden">
                      <div className="absolute inset-0 bg-gradient-to-l from-transparent via-white/35 to-transparent animate-sheen" />
                    </div>
                  )}
                  {children}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Bottom Physical Ledger Navigation Ribbon (طوي الصفحات والانتقال السلس) */}
            <div className="shrink-0 pt-2 mt-1.5 border-t border-stone-300 flex items-center justify-between text-xs text-stone-900">
              <button
                type="button"
                onClick={onNavigatePrev}
                disabled={activeTabIndex === 0 && !pageKey?.includes('ledger')}
                className={`flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                  activeTabIndex === 0 && !pageKey?.includes('ledger')
                    ? 'opacity-40 cursor-not-allowed bg-stone-100 text-stone-500 border-stone-200'
                    : 'bg-stone-100 hover:bg-stone-200 text-stone-900 border-stone-400 shadow-xs active:scale-95'
                }`}
                title="طوي الورقة والانتقال للصفحة السابقة"
              >
                <span>◀ الصفحة السابقة</span>
              </button>

              {/* Page Indicator & Section Name */}
              <div className="flex items-center gap-2 font-mono text-[11px] text-stone-900 font-bold bg-stone-200/90 px-2.5 sm:px-3.5 py-0.5 rounded-full border border-stone-400">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-pulse" />
                <span>
                  {pageKey?.includes('ledger')
                    ? 'كشف حساب فردي'
                    : `ورقة ${activeTabIndex + 1} من ${visibleTabs.length}`}
                </span>
                <span>•</span>
                <span className="font-amiri font-black text-stone-950 truncate max-w-[140px] sm:max-w-none text-xs">
                  {currentTab?.label}
                </span>
              </div>

              <button
                type="button"
                onClick={onNavigateNext}
                disabled={activeTabIndex === visibleTabs.length - 1}
                className={`flex items-center gap-1 px-2.5 sm:px-3 py-1 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                  activeTabIndex === visibleTabs.length - 1
                    ? 'opacity-40 cursor-not-allowed bg-stone-100 text-stone-500 border-stone-200'
                    : 'bg-amber-700 hover:bg-amber-600 text-amber-50 border-amber-800 shadow-xs active:scale-95'
                }`}
                title="طوي الورقة والانتقال للصفحة التالية"
              >
                <span>الصفحة التالية ▶</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
