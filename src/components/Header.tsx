import React from 'react';
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
  Smartphone,
  Cloud,
  Layers
} from 'lucide-react';
import { User, StoreSettings } from '../types';
import { canUserAccessTab } from '../utils/permissions';

export type ActiveTab =
  | 'dashboard'
  | 'sales_payments'
  | 'purchases_payments'
  | 'customers'
  | 'suppliers'
  | 'journal'
  | 'reports'
  | 'api_sync'
  | 'audit_backup'
  | 'settings';

interface HeaderProps {
  currentUser: User | null;
  settings: StoreSettings;
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  onOpenNewTransaction: (type?: 'sale' | 'customer_payment' | 'purchase' | 'supplier_payment') => void;
  onCloseBook: () => void;
  onOpenPhpSource: () => void;
  onToggleMobileMode?: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  settings,
  activeTab,
  onSelectTab,
  onOpenNewTransaction,
  onCloseBook,
  onOpenPhpSource,
  onToggleMobileMode,
  searchQuery,
  onSearchChange,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-stone-900 border-b border-stone-800 text-stone-100 shadow-md">
      {/* Top Bar: Store branding, Search & User profile */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-3">
          {/* Brand & Store Name */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onSelectTab('dashboard')}
              className="flex items-center gap-2.5 text-right hover:opacity-90 transition-opacity"
            >
              <div
                className="w-10 h-10 rounded-lg flex items-center justify-center shadow border border-amber-500/40 overflow-hidden bg-white/10"
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
              <div className="hidden sm:block">
                <span className="text-sm font-bold text-amber-200 block leading-tight font-amiri">
                  {settings.storeName}
                </span>
                <span className="text-[11px] text-stone-400 block font-cairo">
                  {settings.appName}
                </span>
              </div>
            </button>

            {/* Active Client Ledger Badge (Multi-Client Platform) */}
            <button
              onClick={() => onSelectTab('settings')}
              title={`السجل النشط: ${settings.storeName} (${settings.tenantId}) - اضغط لتبديل السجل أو إدارة الكلاينت`}
              className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-800/80 hover:bg-stone-700/80 border border-stone-700/80 text-amber-200 text-xs font-bold transition-all cursor-pointer shadow-2xs"
            >
              <Layers size={13} className="text-amber-400 shrink-0" />
              <span className="truncate max-w-[140px]">{settings.storeName}</span>
              <span className="text-[10px] font-mono px-1 py-0.2 rounded bg-stone-900 text-stone-300">
                {settings.tenantId || 'tenant-01'}
              </span>
            </button>
          </div>

          {/* Quick Search Input */}
          <div className="flex-1 max-w-md mx-2">
            <div className="relative">
              <Search
                size={16}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none"
              />
              <input
                type="text"
                placeholder="بحث سريع (زبون، مورد، رقم هاتف، فاتورة #)..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full pl-3 pr-9 py-1.5 text-xs bg-stone-800/90 hover:bg-stone-800 focus:bg-stone-800 border border-stone-700 focus:border-amber-500 rounded-lg text-stone-200 placeholder-stone-500 focus:outline-none transition-all"
              />
              {searchQuery && (
                <button
                  onClick={() => onSearchChange('')}
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-stone-400 hover:text-stone-200"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Right Action buttons */}
          <div className="flex items-center gap-2">
            {/* Cloud Sync Status Indicator */}
            <button
              onClick={() => onSelectTab('settings')}
              title={
                settings.cloudServerUrl
                  ? `المزامنة السحابية: ${settings.cloudSyncStatus === 'synced' ? 'متصل ومتزامن' : settings.cloudSyncStatus === 'syncing' ? 'جاري المزامنة...' : settings.cloudSyncStatus === 'error' ? 'خطأ في الاتصال' : 'في الانتظار'}`
                  : 'إعدادات السحابة والمزامنة التلقائية'
              }
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-xs font-bold cursor-pointer transition-all ${
                settings.cloudSyncStatus === 'synced'
                  ? 'bg-emerald-950/60 border-emerald-500/50 text-emerald-300'
                  : settings.cloudSyncStatus === 'syncing'
                  ? 'bg-blue-950/60 border-blue-500/50 text-blue-300 animate-pulse'
                  : settings.cloudSyncStatus === 'error'
                  ? 'bg-red-950/60 border-red-500/50 text-red-300'
                  : 'bg-stone-800/80 border-stone-700 text-stone-400 hover:text-stone-200'
              }`}
            >
              <Cloud size={14} className={settings.cloudSyncStatus === 'syncing' ? 'animate-spin' : ''} />
              <span className="hidden md:inline text-[11px]">
                {settings.cloudSyncStatus === 'synced' ? 'سحابي متزامن' : settings.cloudSyncStatus === 'syncing' ? 'مزامنة...' : settings.cloudSyncStatus === 'error' ? 'خطأ سحابي' : 'السحابة'}
              </span>
            </button>
            {/* PHP Source Code modal button */}
            <button
              onClick={onOpenPhpSource}
              title="عرض وتنزيل سورس كود PHP و MySQL"
              className="hidden p-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 border border-stone-700 text-xs items-center gap-1 cursor-pointer"
            >
              <FolderDown size={16} className="text-emerald-400" />
              <span className="hidden lg:inline text-[11px]">سورس PHP</span>
            </button>

            {/* Mobile App View Button */}
            {onToggleMobileMode && (
              <button
                onClick={onToggleMobileMode}
                title="التبديل إلى تطبيق الجوال لصاحب المتجر (الآدمن)"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 text-xs font-semibold cursor-pointer transition-all active:scale-95 shadow-sm"
              >
                <Smartphone size={15} className="text-amber-400" />
                <span className="text-[11px]">تطبيق الجوال</span>
              </button>
            )}

            {/* User Badge */}
            <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-lg bg-stone-800/70 border border-stone-700/70 text-right">
              <div className="text-right">
                <span className="text-xs font-semibold text-stone-200 block leading-none">
                  {currentUser?.fullName}
                </span>
                <span className="text-[10px] text-amber-400 font-mono">
                  {currentUser?.role === 'admin' ? '👑 مدير النظام' : currentUser?.role === 'accountant' ? '📊 محاسب' : '💼 مستخدم'}
                </span>
              </div>
            </div>

            {/* Close Book Button */}
            <button
              onClick={onCloseBook}
              title="إغلاق الدفتر والعودة للغلاف"
              className="p-2 rounded-lg bg-stone-800 hover:bg-red-950/70 hover:text-red-300 text-stone-400 border border-stone-700 transition-colors"
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs Bar */}
      <nav className="bg-stone-950/70 border-t border-stone-800/80 px-4 sm:px-6 overflow-x-auto">
        <div className="max-w-7xl mx-auto flex items-center gap-1 sm:gap-2 py-1.5 min-w-max">
          {canUserAccessTab('dashboard', currentUser) && (
            <button
              onClick={() => onSelectTab('dashboard')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'dashboard'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/50'
              }`}
            >
              <BookOpen size={14} />
              <span>لوحة الدفتر</span>
            </button>
          )}

          {canUserAccessTab('sales_payments', currentUser) && (
            <button
              onClick={() => onSelectTab('sales_payments')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'sales_payments'
                  ? 'bg-red-500/20 text-red-300 border border-red-500/40 shadow-sm'
                  : 'text-stone-200 hover:text-white font-semibold hover:bg-stone-800'
              }`}
            >
              <Users size={14} />
              <span>المبيعات وتسديد الزبائن</span>
            </button>
          )}

          {canUserAccessTab('purchases_payments', currentUser) && (
            <button
              onClick={() => onSelectTab('purchases_payments')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'purchases_payments'
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm'
                  : 'text-stone-200 hover:text-white font-semibold hover:bg-stone-800'
              }`}
            >
              <Building2 size={14} />
              <span>المشتريات وتسديد الموردين</span>
            </button>
          )}

          {canUserAccessTab('customers', currentUser) && (
            <button
              onClick={() => onSelectTab('customers')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'customers'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-stone-200 hover:text-white font-semibold hover:bg-stone-800'
              }`}
            >
              <Users size={14} />
              <span>الزبائن والديون</span>
            </button>
          )}

          {canUserAccessTab('suppliers', currentUser) && (
            <button
              onClick={() => onSelectTab('suppliers')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'suppliers'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-stone-200 hover:text-white font-semibold hover:bg-stone-800'
              }`}
            >
              <Building2 size={14} />
              <span>الموردون والمستحقات</span>
            </button>
          )}

          {canUserAccessTab('journal', currentUser) && (
            <button
              onClick={() => onSelectTab('journal')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'journal'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-stone-200 hover:text-white font-semibold hover:bg-stone-800'
              }`}
            >
              <FileSpreadsheet size={14} />
              <span>دفتر الحركات العام</span>
            </button>
          )}

          {canUserAccessTab('reports', currentUser) && (
            <button
              onClick={() => onSelectTab('reports')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'reports'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-stone-200 hover:text-white font-semibold hover:bg-stone-800'
              }`}
            >
              <BarChart3 size={14} />
              <span>التقارير المالية</span>
            </button>
          )}

          {canUserAccessTab('api_sync', currentUser) && (
            <button
              onClick={() => onSelectTab('api_sync')}
              className={`hidden items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'api_sync'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'text-stone-200 hover:text-white font-semibold hover:bg-stone-800'
              }`}
            >
              <RefreshCw size={14} />
              <span>API & مزامنة Desktop</span>
            </button>
          )}

          {canUserAccessTab('audit_backup', currentUser) && (
            <button
              onClick={() => onSelectTab('audit_backup')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'audit_backup'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-stone-200 hover:text-white font-semibold hover:bg-stone-800'
              }`}
            >
              <History size={14} />
              <span>الرقابة والنسخ الاحتياطي</span>
            </button>
          )}

          {canUserAccessTab('settings', currentUser) && (
            <button
              onClick={() => onSelectTab('settings')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                  : 'text-stone-200 hover:text-white font-semibold hover:bg-stone-800'
              }`}
            >
              <Sliders size={14} />
              <span>إعدادات المتجر</span>
            </button>
          )}
        </div>
      </nav>
    </header>
  );
};
