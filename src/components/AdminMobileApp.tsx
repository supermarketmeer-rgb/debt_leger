import React, { useState, useMemo } from 'react';
import {
  Users,
  Building2,
  DollarSign,
  Search,
  PlusCircle,
  Phone,
  MessageCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Receipt,
  Share2,
  Calendar,
  Sparkles,
  BookOpen,
  LogOut,
  ChevronDown,
  CheckCircle2,
  Clock,
  Wallet,
  Settings,
  RefreshCw,
  SlidersHorizontal,
  FileText,
  BadgeAlert
} from 'lucide-react';
import { Customer, Supplier, Transaction, StoreSettings, User, PaymentMethod, TransactionType } from '../types';
import { playPaperTurnSound } from '../utils/sound';
import { FormattedAmountInput, formatAmountWithCommas } from './FormattedAmountInput';

interface AdminMobileAppProps {
  currentUser: User | null;
  settings: StoreSettings;
  customers: Customer[];
  suppliers: Supplier[];
  transactions: Transaction[];
  onRecordTransaction: (params: {
    accountType: 'customer' | 'supplier';
    accountId: string;
    type: TransactionType;
    documentNo?: string;
    date: string;
    amount: number;
    paymentMethod?: PaymentMethod;
    description: string;
    notes?: string;
  }) => void;
  onSwitchToBookView: () => void;
  onLogout: () => void;
  onRefreshData: () => void;
}

type MobileTab = 'home' | 'customers' | 'suppliers' | 'pay' | 'settings';

export const AdminMobileApp: React.FC<AdminMobileAppProps> = ({
  currentUser,
  settings,
  customers,
  suppliers,
  transactions,
  onRecordTransaction,
  onSwitchToBookView,
  onLogout,
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<MobileTab>('home');
  const [searchQuery, setSearchQuery] = useState('');
  const [customerFilter, setCustomerFilter] = useState<'all' | 'debtors' | 'settled'>('all');
  const [supplierFilter, setSupplierFilter] = useState<'all' | 'creditors' | 'settled'>('all');

  // Selected account for detailed ledger statement
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);

  // Quick Payment Modal/State
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [payTargetType, setPayTargetType] = useState<'customer' | 'supplier'>('customer');
  const [payAccountId, setPayAccountId] = useState<string>('');
  const [payAmount, setPayAmount] = useState<string>('');
  const [payMethod, setPayMethod] = useState<PaymentMethod>('cash');
  const [payDescription, setPayDescription] = useState<string>('تسديد نقدي');
  const [payNotes, setPayNotes] = useState<string>('');
  const [showSuccessToast, setShowSuccessToast] = useState<string | null>(null);

  // Financial calculations
  const totalCustomerDebts = useMemo(() => {
    return customers.reduce((sum, c) => sum + (c.currentBalance > 0 ? c.currentBalance : 0), 0);
  }, [customers]);

  const totalSupplierDebts = useMemo(() => {
    return suppliers.reduce((sum, s) => sum + (s.currentBalance > 0 ? s.currentBalance : 0), 0);
  }, [suppliers]);

  const netBalance = totalCustomerDebts - totalSupplierDebts;

  // Recent payments
  const recentPayments = useMemo(() => {
    return transactions
      .filter((t) => t.type === 'customer_payment' || t.type === 'supplier_payment')
      .slice(0, 10);
  }, [transactions]);

  // Filtered customers
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const matchSearch =
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone.includes(searchQuery);

      if (!matchSearch) return false;
      if (customerFilter === 'debtors') return c.currentBalance > 0;
      if (customerFilter === 'settled') return c.currentBalance === 0;
      return true;
    });
  }, [customers, searchQuery, customerFilter]);

  // Filtered suppliers
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      const matchSearch =
        s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
        s.phone.includes(searchQuery);

      if (!matchSearch) return false;
      if (supplierFilter === 'creditors') return s.currentBalance > 0;
      if (supplierFilter === 'settled') return s.currentBalance === 0;
      return true;
    });
  }, [suppliers, searchQuery, supplierFilter]);

  // Open payment for specific account
  const handleOpenPayForCustomer = (cust: Customer) => {
    setPayTargetType('customer');
    setPayAccountId(cust.id);
    setPayAmount(cust.currentBalance > 0 ? cust.currentBalance.toString() : '');
    setPayDescription(`تسديد من الزبون: ${cust.name}`);
    setIsPayModalOpen(true);
  };

  const handleOpenPayForSupplier = (supp: Supplier) => {
    setPayTargetType('supplier');
    setPayAccountId(supp.id);
    setPayAmount(supp.currentBalance > 0 ? supp.currentBalance.toString() : '');
    setPayDescription(`دفعة سداد للمورد: ${supp.name}`);
    setIsPayModalOpen(true);
  };

  // Submit Payment
  const handleConfirmPayment = (e: React.FormEvent) => {
    e.preventDefault();
    const parsedAmount = typeof payAmount === 'number' ? payAmount : parseFloat(String(payAmount).replace(/,/g, ''));
    if (!payAccountId || isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('يرجى تحديد الحساب وإدخال مبلغ تسديد صالح');
      return;
    }

    try {
      onRecordTransaction({
        accountType: payTargetType,
        accountId: payAccountId,
        type: payTargetType === 'customer' ? 'customer_payment' : 'supplier_payment',
        date: new Date().toISOString().split('T')[0],
        amount: parsedAmount,
        paymentMethod: payMethod,
        description: payDescription.trim() || (payTargetType === 'customer' ? 'تسديد زبون' : 'سداد مورد'),
        notes: payNotes.trim(),
      });

      playPaperTurnSound();
      setIsPayModalOpen(false);
      setPayAmount('');
      setPayNotes('');

      // Show toast
      const targetName =
        payTargetType === 'customer'
          ? customers.find((c) => c.id === payAccountId)?.name || 'الزبون'
          : suppliers.find((s) => s.id === payAccountId)?.name || 'المورد';
      setShowSuccessToast(`تم تسجيل التسديد بنجاح بمبلغ ${parsedAmount.toLocaleString()} ${settings.currency} لحساب ${targetName}`);
      setTimeout(() => setShowSuccessToast(null), 3500);

      // Refresh detailed account if open
      if (selectedCustomer && selectedCustomer.id === payAccountId) {
        const updated = customers.find((c) => c.id === payAccountId);
        if (updated) setSelectedCustomer(updated);
      }
      if (selectedSupplier && selectedSupplier.id === payAccountId) {
        const updated = suppliers.find((s) => s.id === payAccountId);
        if (updated) setSelectedSupplier(updated);
      }
    } catch (err: any) {
      alert(err.message || 'حدث خطأ أثناء حفظ التسديد');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex justify-center pb-24 select-none selection:bg-amber-500 selection:text-white" dir="rtl">
      {/* Container simulating a mobile phone viewport or full mobile view */}
      <div className="w-full max-w-md bg-slate-900 border-x border-slate-800/80 min-h-screen flex flex-col relative shadow-2xl">
        
        {/* Top Header */}
        <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 px-4 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg border border-amber-500/30 shrink-0 overflow-hidden bg-white/10"
              style={{ backgroundColor: settings.coverColor }}
            >
              {settings.logoUrl ? (
                <img
                  src={settings.logoUrl}
                  alt={settings.storeName}
                  className="w-full h-full object-contain p-0.5"
                />
              ) : (
                <BookOpen className="w-5 h-5 text-amber-300" />
              )}
            </div>
            <div>
              <h1 className="text-sm font-bold text-amber-100 leading-tight font-amiri line-clamp-1">
                {settings.storeName}
              </h1>
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                <span>تطبيق صاحب المتجر</span>
                <span className="text-amber-400/90 font-mono text-[10px]">({currentUser?.fullName || 'الآدمن'})</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={onSwitchToBookView}
              title="التبديل إلى دفتر السجلات المكتبي"
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs transition-colors cursor-pointer active:scale-95"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span className="text-[11px] font-medium hidden sm:inline">الدفتر المكتبي</span>
            </button>
            <button
              onClick={onLogout}
              title="تسجيل الخروج"
              className="p-2 rounded-xl bg-slate-800 hover:bg-rose-950/60 text-slate-400 hover:text-rose-300 border border-slate-700/80 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Success Toast */}
        {showSuccessToast && (
          <div className="fixed top-16 left-4 right-4 max-w-md mx-auto z-50 animate-bounce">
            <div className="bg-emerald-600/95 text-white p-3.5 rounded-2xl shadow-2xl border border-emerald-400/40 flex items-center gap-3 backdrop-blur-md">
              <CheckCircle2 className="w-5 h-5 text-emerald-100 shrink-0" />
              <p className="text-xs font-medium leading-relaxed">{showSuccessToast}</p>
            </div>
          </div>
        )}

        {/* Content Body based on Active View */}
        <main className="flex-1 p-4 overflow-y-auto">
          {/* VIEW: Customer Detailed Ledger */}
          {selectedCustomer ? (
            <div className="space-y-4">
              {/* Back Header */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <button
                  onClick={() => setSelectedCustomer(null)}
                  className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 py-1 px-2 rounded-lg bg-slate-800 border border-slate-700 cursor-pointer"
                >
                  <span>✕ إغلاق الكشف</span>
                </button>
                <span className="text-xs text-slate-400">كشف حساب زبون</span>
              </div>

              {/* Customer Profile Card */}
              <div className="bg-gradient-to-br from-slate-850 to-slate-800 border border-slate-750 rounded-2xl p-4 shadow-xl relative overflow-hidden">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-amber-300 border border-slate-700">
                      {selectedCustomer.code}
                    </span>
                    <h2 className="text-lg font-bold text-white mt-1.5 font-amiri">
                      {selectedCustomer.name}
                    </h2>
                  </div>
                  <div className="text-left">
                    <span className="text-[11px] text-slate-400 block">الرصيد الصافي المطلوب</span>
                    <span className={`text-xl font-bold font-mono ${selectedCustomer.currentBalance > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>
                      {selectedCustomer.currentBalance.toLocaleString()} {settings.currency}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-750">
                  {selectedCustomer.phone && (
                    <>
                      <a
                        href={`tel:${selectedCustomer.phone}`}
                        className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center gap-1.5 text-xs transition-colors"
                      >
                        <Phone className="w-3.5 h-3.5 text-emerald-400" />
                        <span>اتصال هاتف</span>
                      </a>
                      <a
                        href={`https://wa.me/${selectedCustomer.phone.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 py-2 px-3 rounded-xl bg-emerald-950/40 hover:bg-emerald-900/40 text-emerald-300 border border-emerald-800/60 flex items-center justify-center gap-1.5 text-xs transition-colors"
                      >
                        <MessageCircle className="w-3.5 h-3.5 text-emerald-400" />
                        <span>مراسلة واتساب</span>
                      </a>
                    </>
                  )}
                  <button
                    onClick={() => handleOpenPayForCustomer(selectedCustomer)}
                    className="flex-1 py-2 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold flex items-center justify-center gap-1.5 text-xs shadow-md transition-all active:scale-95 cursor-pointer"
                  >
                    <ArrowDownLeft className="w-4 h-4" />
                    <span>تسجيل تسديد</span>
                  </button>
                </div>
              </div>

              {/* Transactions List */}
              <div>
                <h3 className="text-xs font-semibold text-slate-400 mb-2.5 flex items-center justify-between">
                  <span>سجل الحركات والكشوفات ({transactions.filter((t) => t.accountId === selectedCustomer.id).length})</span>
                  <span className="text-[10px] text-slate-500">الأحدث أولاً</span>
                </h3>

                <div className="space-y-2">
                  {transactions
                    .filter((t) => t.accountId === selectedCustomer.id)
                    .map((tx) => (
                      <div
                        key={tx.id}
                        className="p-3 rounded-xl bg-slate-850/80 border border-slate-800 hover:border-slate-700 transition-colors flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                              tx.type === 'customer_payment'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                            }`}
                          >
                            {tx.type === 'customer_payment' ? (
                              <ArrowDownLeft className="w-4 h-4" />
                            ) : (
                              <ArrowUpRight className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-white block">
                              {tx.description || (tx.type === 'customer_payment' ? 'سند قبض / تسديد' : 'فاتورة بيع')}
                            </span>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                              <span>{tx.date}</span>
                              <span>•</span>
                              <span>{tx.documentNo}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-left shrink-0">
                          <span
                            className={`text-sm font-bold font-mono block ${
                              tx.type === 'customer_payment' ? 'text-emerald-400' : 'text-rose-400'
                            }`}
                          >
                            {tx.type === 'customer_payment' ? '-' : '+'}
                            {tx.amount.toLocaleString()} {settings.currency}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            الرصيد: {tx.balanceAfter.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  {transactions.filter((t) => t.accountId === selectedCustomer.id).length === 0 && (
                    <div className="text-center py-8 text-slate-500 text-xs">
                      لا توجد حركات مسجلة لهذا الزبون حالياً
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : selectedSupplier ? (
            /* VIEW: Supplier Detailed Ledger */
            <div className="space-y-4">
              {/* Back Header */}
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <button
                  onClick={() => setSelectedSupplier(null)}
                  className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 py-1 px-2 rounded-lg bg-slate-800 border border-slate-700 cursor-pointer"
                >
                  <span>✕ إغلاق الكشف</span>
                </button>
                <span className="text-xs text-slate-400">كشف حساب مورد</span>
              </div>

              {/* Supplier Profile Card */}
              <div className="bg-gradient-to-br from-slate-850 to-slate-800 border border-slate-750 rounded-2xl p-4 shadow-xl relative overflow-hidden">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-800 text-indigo-300 border border-slate-700">
                      {selectedSupplier.code}
                    </span>
                    <h2 className="text-lg font-bold text-white mt-1.5 font-amiri">
                      {selectedSupplier.name}
                    </h2>
                  </div>
                  <div className="text-left">
                    <span className="text-[11px] text-slate-400 block">المستحق له بذمتنا</span>
                    <span className="text-xl font-bold font-mono text-indigo-400">
                      {selectedSupplier.currentBalance.toLocaleString()} {settings.currency}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-slate-750">
                  {selectedSupplier.phone && (
                    <a
                      href={`tel:${selectedSupplier.phone}`}
                      className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center gap-1.5 text-xs transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5 text-indigo-400" />
                      <span>اتصال هاتف</span>
                    </a>
                  )}
                  <button
                    onClick={() => handleOpenPayForSupplier(selectedSupplier)}
                    className="flex-1 py-2 px-3 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-bold flex items-center justify-center gap-1.5 text-xs shadow-md transition-all active:scale-95 cursor-pointer"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                    <span>تسجيل سداد دفعة</span>
                  </button>
                </div>
              </div>

              {/* Transactions List */}
              <div>
                <h3 className="text-xs font-semibold text-slate-400 mb-2.5 flex items-center justify-between">
                  <span>حركات المورد والتوريدات ({transactions.filter((t) => t.accountId === selectedSupplier.id).length})</span>
                  <span className="text-[10px] text-slate-500">الأحدث أولاً</span>
                </h3>

                <div className="space-y-2">
                  {transactions
                    .filter((t) => t.accountId === selectedSupplier.id)
                    .map((tx) => (
                      <div
                        key={tx.id}
                        className="p-3 rounded-xl bg-slate-850/80 border border-slate-800 hover:border-slate-700 transition-colors flex items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                              tx.type === 'supplier_payment'
                                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'
                            }`}
                          >
                            {tx.type === 'supplier_payment' ? (
                              <ArrowDownLeft className="w-4 h-4" />
                            ) : (
                              <ArrowUpRight className="w-4 h-4" />
                            )}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-white block">
                              {tx.description || (tx.type === 'supplier_payment' ? 'سند دفع نقدية' : 'فاتورة توريد')}
                            </span>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono mt-0.5">
                              <span>{tx.date}</span>
                              <span>•</span>
                              <span>{tx.documentNo}</span>
                            </div>
                          </div>
                        </div>

                        <div className="text-left shrink-0">
                          <span
                            className={`text-sm font-bold font-mono block ${
                              tx.type === 'supplier_payment' ? 'text-emerald-400' : 'text-indigo-400'
                            }`}
                          >
                            {tx.type === 'supplier_payment' ? '-' : '+'}
                            {tx.amount.toLocaleString()} {settings.currency}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            الرصيد: {tx.balanceAfter.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          ) : activeTab === 'home' ? (
            /* VIEW: Home Dashboard */
            <div className="space-y-4">
              {/* Financial Summary Card */}
              <div className="bg-gradient-to-br from-slate-900 via-slate-850 to-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl relative overflow-hidden">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-amber-400" />
                    <span className="text-xs font-bold text-slate-300">المركز المالي لمتجرك</span>
                  </div>
                  <span className="text-[11px] font-mono px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700">
                    مباشر ومحدث
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  {/* Total Customer Debts */}
                  <div className="bg-slate-900/80 border border-amber-500/20 rounded-2xl p-3.5">
                    <div className="flex items-center gap-1.5 text-[11px] text-amber-300/90 mb-1">
                      <Users className="w-3.5 h-3.5" />
                      <span>ديون الزبائن (لنا)</span>
                    </div>
                    <span className="text-lg font-black font-mono text-amber-300 block">
                      {totalCustomerDebts.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-slate-500 block">{settings.currency}</span>
                  </div>

                  {/* Total Supplier Obligations */}
                  <div className="bg-slate-900/80 border border-indigo-500/20 rounded-2xl p-3.5">
                    <div className="flex items-center gap-1.5 text-[11px] text-indigo-300/90 mb-1">
                      <Building2 className="w-3.5 h-3.5" />
                      <span>مستحقات الموردين (علينا)</span>
                    </div>
                    <span className="text-lg font-black font-mono text-indigo-300 block">
                      {totalSupplierDebts.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-slate-500 block">{settings.currency}</span>
                  </div>
                </div>

                {/* Net Difference */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-xs text-slate-400">صافي الفرق لمتجرك:</span>
                  <span className={`text-sm font-bold font-mono ${netBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {netBalance >= 0 ? '+' : ''}{netBalance.toLocaleString()} {settings.currency}
                  </span>
                </div>
              </div>

              {/* Big Fast Action Buttons */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => {
                    setPayTargetType('customer');
                    setIsPayModalOpen(true);
                  }}
                  className="py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold flex flex-col items-center justify-center gap-1.5 shadow-lg shadow-emerald-950/50 transition-all active:scale-95 cursor-pointer border border-emerald-400/20"
                >
                  <ArrowDownLeft className="w-5 h-5 text-emerald-200" />
                  <span className="text-xs">تسديد من زبون</span>
                  <span className="text-[10px] text-emerald-200/80 font-normal">سند قبض فوري</span>
                </button>

                <button
                  onClick={() => {
                    setPayTargetType('supplier');
                    setIsPayModalOpen(true);
                  }}
                  className="py-3.5 px-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold flex flex-col items-center justify-center gap-1.5 shadow-lg shadow-indigo-950/50 transition-all active:scale-95 cursor-pointer border border-indigo-400/20"
                >
                  <ArrowUpRight className="w-5 h-5 text-indigo-200" />
                  <span className="text-xs">سداد لمورد</span>
                  <span className="text-[10px] text-indigo-200/80 font-normal">دفعة مورد فوري</span>
                </button>
              </div>

              {/* Recent Payments Section */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-400" />
                    <span>أحدث عمليات التسديد والتحصيل</span>
                  </h3>
                  <button
                    onClick={onRefreshData}
                    className="p-1 rounded-lg text-slate-400 hover:text-white"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="space-y-2">
                  {recentPayments.map((p) => (
                    <div
                      key={p.id}
                      className="p-3 rounded-2xl bg-slate-850/70 border border-slate-800 flex items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-2.5">
                        <div
                          className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                            p.type === 'customer_payment'
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-indigo-500/20 text-indigo-400'
                          }`}
                        >
                          <Receipt className="w-4 h-4" />
                        </div>
                        <div>
                          <span className="text-xs font-bold text-white block">
                            {p.accountName}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {p.type === 'customer_payment' ? 'تسديد زبون' : 'سداد مورد'} • {p.date}
                          </span>
                        </div>
                      </div>

                      <div className="text-left font-mono">
                        <span className="text-xs font-bold text-emerald-400 block">
                          {p.amount.toLocaleString()} {settings.currency}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {p.paymentMethod === 'cash' ? 'نقدي' : 'تحويل'}
                        </span>
                      </div>
                    </div>
                  ))}
                  {recentPayments.length === 0 && (
                    <div className="text-center py-6 text-slate-500 text-xs">
                      لم يتم تسجيل تسديدات مؤخراً
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : activeTab === 'customers' ? (
            /* VIEW: Customers List & Ledgers */
            <div className="space-y-3">
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="ابحث عن زبون (الاسم، الرمز، الهاتف)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-850 border border-slate-750 rounded-2xl py-2.5 pr-10 pl-4 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2 text-xs">
                <button
                  onClick={() => setCustomerFilter('all')}
                  className={`px-3 py-1.5 rounded-xl font-medium transition-colors cursor-pointer ${
                    customerFilter === 'all'
                      ? 'bg-amber-500 text-stone-950 font-bold'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  الكل ({customers.length})
                </button>
                <button
                  onClick={() => setCustomerFilter('debtors')}
                  className={`px-3 py-1.5 rounded-xl font-medium transition-colors cursor-pointer ${
                    customerFilter === 'debtors'
                      ? 'bg-amber-500 text-stone-950 font-bold'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  المدينون فقط ({customers.filter((c) => c.currentBalance > 0).length})
                </button>
                <button
                  onClick={() => setCustomerFilter('settled')}
                  className={`px-3 py-1.5 rounded-xl font-medium transition-colors cursor-pointer ${
                    customerFilter === 'settled'
                      ? 'bg-amber-500 text-stone-950 font-bold'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  الخالصون ({customers.filter((c) => c.currentBalance === 0).length})
                </button>
              </div>

              {/* Customer Cards List */}
              <div className="space-y-2 pt-1">
                {filteredCustomers.map((cust) => (
                  <div
                    key={cust.id}
                    className="p-3.5 rounded-2xl bg-slate-850 border border-slate-800 hover:border-slate-700 shadow-sm flex flex-col gap-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-amber-300">
                            {cust.code}
                          </span>
                          <h4 className="text-sm font-bold text-white font-amiri">
                            {cust.name}
                          </h4>
                        </div>
                        {cust.phone && (
                          <span className="text-[11px] text-slate-400 font-mono block mt-0.5">
                            {cust.phone}
                          </span>
                        )}
                      </div>

                      <div className="text-left font-mono">
                        <span className="text-[10px] text-slate-400 block">الرصيد المطلوب:</span>
                        <span
                          className={`text-sm font-bold ${
                            cust.currentBalance > 0 ? 'text-amber-400' : 'text-emerald-400'
                          }`}
                        >
                          {cust.currentBalance.toLocaleString()} {settings.currency}
                        </span>
                      </div>
                    </div>

                    {/* Quick Buttons for Customer */}
                    <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
                      <button
                        onClick={() => setSelectedCustomer(cust)}
                        className="flex-1 py-1.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5 text-amber-400" />
                        <span>كشف الحساب</span>
                      </button>
                      <button
                        onClick={() => handleOpenPayForCustomer(cust)}
                        className="flex-1 py-1.5 px-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <ArrowDownLeft className="w-3.5 h-3.5" />
                        <span>تسجيل تسديد</span>
                      </button>
                    </div>
                  </div>
                ))}

                {filteredCustomers.length === 0 && (
                  <div className="text-center py-12 text-slate-500 text-xs">
                    لا يوجد زبائن يطابقون خيارات البحث
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === 'suppliers' ? (
            /* VIEW: Suppliers List & Ledgers */
            <div className="space-y-3">
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="ابحث عن مورد (الشركة، الرمز، الهاتف)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-850 border border-slate-750 rounded-2xl py-2.5 pr-10 pl-4 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2 text-xs">
                <button
                  onClick={() => setSupplierFilter('all')}
                  className={`px-3 py-1.5 rounded-xl font-medium transition-colors cursor-pointer ${
                    supplierFilter === 'all'
                      ? 'bg-indigo-500 text-white font-bold'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  الكل ({suppliers.length})
                </button>
                <button
                  onClick={() => setSupplierFilter('creditors')}
                  className={`px-3 py-1.5 rounded-xl font-medium transition-colors cursor-pointer ${
                    supplierFilter === 'creditors'
                      ? 'bg-indigo-500 text-white font-bold'
                      : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  مستحق لهم علينا ({suppliers.filter((s) => s.currentBalance > 0).length})
                </button>
              </div>

              {/* Suppliers Cards List */}
              <div className="space-y-2 pt-1">
                {filteredSuppliers.map((supp) => (
                  <div
                    key={supp.id}
                    className="p-3.5 rounded-2xl bg-slate-850 border border-slate-800 hover:border-slate-700 shadow-sm flex flex-col gap-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-indigo-300">
                            {supp.code}
                          </span>
                          <h4 className="text-sm font-bold text-white font-amiri">
                            {supp.name}
                          </h4>
                        </div>
                        {supp.phone && (
                          <span className="text-[11px] text-slate-400 font-mono block mt-0.5">
                            {supp.phone}
                          </span>
                        )}
                      </div>

                      <div className="text-left font-mono">
                        <span className="text-[10px] text-slate-400 block">المستحق له:</span>
                        <span className="text-sm font-bold text-indigo-400">
                          {supp.currentBalance.toLocaleString()} {settings.currency}
                        </span>
                      </div>
                    </div>

                    {/* Quick Buttons for Supplier */}
                    <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
                      <button
                        onClick={() => setSelectedSupplier(supp)}
                        className="flex-1 py-1.5 px-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5 text-indigo-400" />
                        <span>كشف الحساب</span>
                      </button>
                      <button
                        onClick={() => handleOpenPayForSupplier(supp)}
                        className="flex-1 py-1.5 px-2 rounded-xl bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <ArrowUpRight className="w-3.5 h-3.5" />
                        <span>تسجيل سداد</span>
                      </button>
                    </div>
                  </div>
                ))}

                {filteredSuppliers.length === 0 && (
                  <div className="text-center py-12 text-slate-500 text-xs">
                    لا يوجد موردين يطابقون خيارات البحث
                  </div>
                )}
              </div>
            </div>
          ) : activeTab === 'settings' ? (
            /* VIEW: Settings & Profile */
            <div className="space-y-4">
              <div className="bg-slate-850 border border-slate-800 rounded-2xl p-4 shadow">
                <h3 className="text-xs font-bold text-white mb-2">بيانات وهوية المتجر</h3>
                <div className="space-y-1.5 text-xs text-slate-300">
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">اسم المتجر:</span>
                    <span className="font-semibold text-amber-200">{settings.storeName}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">العملة المعتمدة:</span>
                    <span>{settings.currency}</span>
                  </div>
                  <div className="flex justify-between py-1 border-b border-slate-800">
                    <span className="text-slate-400">هاتف المتجر:</span>
                    <span className="font-mono">{settings.phone}</span>
                  </div>
                  <div className="flex justify-between py-1">
                    <span className="text-slate-400">حد أيام التأخير:</span>
                    <span>{settings.overdueDaysThreshold || 30} يوماً</span>
                  </div>
                </div>
              </div>

              {/* Mode switch */}
              <div className="bg-slate-850 border border-slate-800 rounded-2xl p-4 shadow space-y-3">
                <h3 className="text-xs font-bold text-white">التبديل بين الواجهات</h3>
                <button
                  onClick={onSwitchToBookView}
                  className="w-full py-3 px-4 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>فتح دفتر السجلات ثلاثي الأبعاد المكتبي</span>
                </button>
                <p className="text-[11px] text-slate-400 leading-relaxed text-center">
                  يمكنك في أي لحظة العودة إلى طريقة العرض الدفترية مع طوي الصفحات الطبيعية على أجهزة الكمبيوتر والشاشات الكبيرة.
                </p>
              </div>

              {/* Logout button */}
              <button
                onClick={onLogout}
                className="w-full py-3 px-4 rounded-xl bg-rose-950/40 hover:bg-rose-900/40 text-rose-300 border border-rose-800/50 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <LogOut className="w-4 h-4" />
                <span>تسجيل الخروج من الحساب</span>
              </button>
            </div>
          ) : null}
        </main>

        {/* Modal: Friendly Mobile Payment Sheet */}
        {isPayModalOpen && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="w-full max-w-md bg-slate-900 border-t sm:border border-slate-800 rounded-t-3xl sm:rounded-3xl p-5 shadow-2xl max-h-[90vh] overflow-y-auto animate-in slide-in-from-bottom duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-4">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      payTargetType === 'customer'
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-indigo-500/20 text-indigo-400'
                    }`}
                  >
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">
                      {payTargetType === 'customer' ? 'تسديد من زبون (سند قبض)' : 'سداد لمورد (سند دفع)'}
                    </h3>
                    <span className="text-[10px] text-slate-400">سند مالي فوري يحدث الأرصدة تلقائياً</span>
                  </div>
                </div>

                <button
                  onClick={() => setIsPayModalOpen(false)}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleConfirmPayment} className="space-y-3.5">
                {/* Target Type Selector */}
                <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1 rounded-2xl border border-slate-800">
                  <button
                    type="button"
                    onClick={() => {
                      setPayTargetType('customer');
                      setPayAccountId('');
                      setPayAmount('');
                    }}
                    className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      payTargetType === 'customer'
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    تسديد زبون (قبض)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPayTargetType('supplier');
                      setPayAccountId('');
                      setPayAmount('');
                    }}
                    className={`py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      payTargetType === 'supplier'
                        ? 'bg-indigo-600 text-white shadow-md'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    سداد مورد (دفع)
                  </button>
                </div>

                {/* Account Selection */}
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1.5">
                    {payTargetType === 'customer' ? 'اختر الزبون:' : 'اختر المورد:'}
                  </label>
                  <select
                    value={payAccountId}
                    onChange={(e) => {
                      setPayAccountId(e.target.value);
                      if (payTargetType === 'customer') {
                        const target = customers.find((c) => c.id === e.target.value);
                        if (target && target.currentBalance > 0) {
                          setPayAmount(target.currentBalance.toString());
                        }
                      } else {
                        const target = suppliers.find((s) => s.id === e.target.value);
                        if (target && target.currentBalance > 0) {
                          setPayAmount(target.currentBalance.toString());
                        }
                      }
                    }}
                    required
                    className="w-full bg-slate-850 border border-slate-750 rounded-xl py-2.5 px-3 text-xs text-white focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="">-- اضغط للاختيار --</option>
                    {payTargetType === 'customer'
                      ? customers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} ({c.code}) - الرصيد: {c.currentBalance.toLocaleString()} {settings.currency}
                          </option>
                        ))
                      : suppliers.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.name} ({s.code}) - المستحق: {s.currentBalance.toLocaleString()} {settings.currency}
                          </option>
                        ))}
                  </select>
                </div>

                {/* Amount input */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs text-slate-300 font-medium">مبلغ التسديد ({settings.currency}):</label>
                    {payAccountId && (
                      <span className="text-[10px] text-amber-400 font-mono">
                        الرصيد الحالي:{' '}
                        {payTargetType === 'customer'
                          ? customers.find((c) => c.id === payAccountId)?.currentBalance.toLocaleString()
                          : suppliers.find((s) => s.id === payAccountId)?.currentBalance.toLocaleString()}{' '}
                        {settings.currency}
                      </span>
                    )}
                  </div>
                  <FormattedAmountInput
                    placeholder="0"
                    value={payAmount}
                    onChange={(_num, formatted) => setPayAmount(formatted)}
                    required
                    className="w-full bg-slate-850 border border-slate-750 rounded-xl py-3 px-4 text-base font-bold font-mono text-white text-center focus:outline-none focus:border-amber-500"
                  />

                  {/* Fast Amount Chips */}
                  {payAccountId && (
                    <div className="flex items-center gap-1.5 mt-2 flex-wrap text-[11px]">
                      <button
                        type="button"
                        onClick={() => {
                          const bal =
                            payTargetType === 'customer'
                              ? customers.find((c) => c.id === payAccountId)?.currentBalance || 0
                              : suppliers.find((s) => s.id === payAccountId)?.currentBalance || 0;
                          if (bal > 0) setPayAmount(formatAmountWithCommas(bal));
                        }}
                        className="py-1 px-2.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 cursor-pointer"
                      >
                        كامل الرصيد
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const bal =
                            payTargetType === 'customer'
                              ? customers.find((c) => c.id === payAccountId)?.currentBalance || 0
                              : suppliers.find((s) => s.id === payAccountId)?.currentBalance || 0;
                          if (bal > 0) setPayAmount(formatAmountWithCommas(Math.round(bal / 2)));
                        }}
                        className="py-1 px-2.5 rounded-lg bg-slate-800 text-slate-300 border border-slate-750 hover:bg-slate-700 cursor-pointer"
                      >
                        نصف الرصيد
                      </button>
                      <button
                        type="button"
                        onClick={() => setPayAmount('25,000')}
                        className="py-1 px-2 rounded-lg bg-slate-800 text-slate-350 border border-slate-750 hover:bg-slate-700 cursor-pointer font-mono"
                      >
                        25,000
                      </button>
                      <button
                        type="button"
                        onClick={() => setPayAmount('50,000')}
                        className="py-1 px-2 rounded-lg bg-slate-800 text-slate-350 border border-slate-750 hover:bg-slate-700 cursor-pointer font-mono"
                      >
                        50,000
                      </button>
                      <button
                        type="button"
                        onClick={() => setPayAmount('100,000')}
                        className="py-1 px-2 rounded-lg bg-slate-800 text-slate-350 border border-slate-750 hover:bg-slate-700 cursor-pointer font-mono"
                      >
                        100,000
                      </button>
                    </div>
                  )}
                </div>

                {/* Payment Method */}
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1.5">طريقة الدفع:</label>
                  <div className="grid grid-cols-4 gap-1.5 text-xs">
                    {[
                      { id: 'cash', label: 'نقداً 💵' },
                      { id: 'bank_transfer', label: 'زين كاش / مصرف 📱' },
                      { id: 'check', label: 'شيك 📄' },
                      { id: 'other', label: 'أخرى ⚡' },
                    ].map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setPayMethod(m.id as PaymentMethod)}
                        className={`py-2 px-1 rounded-xl text-center font-medium transition-all cursor-pointer ${
                          payMethod === m.id
                            ? 'bg-amber-500 text-stone-950 font-bold shadow'
                            : 'bg-slate-850 text-slate-400 border border-slate-750 hover:text-white'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1.5">ملاحظات أو رقم الحوالة (اختياري):</label>
                  <input
                    type="text"
                    placeholder="مثال: استلام يدوي، أو رقم إشعار الحوالة..."
                    value={payNotes}
                    onChange={(e) => setPayNotes(e.target.value)}
                    className="w-full bg-slate-850 border border-slate-750 rounded-xl py-2 px-3 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Submit button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm shadow-xl shadow-emerald-950/50 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-98"
                  >
                    <CheckCircle2 className="w-5 h-5 text-emerald-200" />
                    <span>تأكيد وتسجيل التسديد فوراً</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Bottom Navigation Bar */}
        <nav className="fixed bottom-0 left-0 right-0 max-w-md mx-auto z-40 bg-slate-900/95 backdrop-blur-lg border-t border-slate-800 px-3 py-2 flex items-center justify-around shadow-2xl">
          <button
            onClick={() => {
              setSelectedCustomer(null);
              setSelectedSupplier(null);
              setActiveTab('home');
            }}
            className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'home' && !selectedCustomer && !selectedSupplier
                ? 'text-amber-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Wallet className="w-5 h-5" />
            <span className="text-[10px] font-medium">الرئيسية</span>
          </button>

          <button
            onClick={() => {
              setSelectedCustomer(null);
              setSelectedSupplier(null);
              setActiveTab('customers');
            }}
            className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'customers' || selectedCustomer
                ? 'text-amber-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-5 h-5" />
            <span className="text-[10px] font-medium">الزبائن</span>
          </button>

          {/* Center Action Button (Quick Pay) */}
          <button
            onClick={() => {
              setPayTargetType('customer');
              setIsPayModalOpen(true);
            }}
            className="flex flex-col items-center justify-center -mt-5 w-12 h-12 rounded-full bg-gradient-to-tr from-amber-500 to-amber-400 text-stone-950 shadow-lg shadow-amber-500/30 cursor-pointer active:scale-90 transition-transform"
            title="تسديد سريع"
          >
            <PlusCircle className="w-6 h-6 stroke-[2.5]" />
          </button>

          <button
            onClick={() => {
              setSelectedCustomer(null);
              setSelectedSupplier(null);
              setActiveTab('suppliers');
            }}
            className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'suppliers' || selectedSupplier
                ? 'text-amber-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building2 className="w-5 h-5" />
            <span className="text-[10px] font-medium">الموردين</span>
          </button>

          <button
            onClick={() => {
              setSelectedCustomer(null);
              setSelectedSupplier(null);
              setActiveTab('settings');
            }}
            className={`flex flex-col items-center gap-1 py-1 px-2.5 rounded-xl transition-all cursor-pointer ${
              activeTab === 'settings'
                ? 'text-amber-400'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Settings className="w-5 h-5" />
            <span className="text-[10px] font-medium">المتجر</span>
          </button>
        </nav>
      </div>
    </div>
  );
};
