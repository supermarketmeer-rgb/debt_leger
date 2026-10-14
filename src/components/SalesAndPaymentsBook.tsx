import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Printer,
  Calendar,
  Users,
  Search,
  Receipt,
  Save,
  CheckCircle2,
  DollarSign,
  Phone,
  MapPin,
  Sparkles,
  Edit3
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Customer, Transaction, StoreSettings, TransactionType, PaymentMethod } from '../types';
import { storage } from '../services/storage';
import { DynamicSearchCombobox } from './DynamicSearchCombobox';
import { FormattedAmountInput } from './FormattedAmountInput';
import { TransactionEditModal } from './TransactionEditModal';

interface SalesAndPaymentsBookProps {
  settings: StoreSettings;
  customers: Customer[];
  transactions: Transaction[];
  onSaveTransaction: (params: {
    accountType: 'customer' | 'supplier';
    accountId: string;
    type: TransactionType;
    documentNo: string;
    date: string;
    amount: number;
    paymentMethod?: PaymentMethod;
    description: string;
    notes?: string;
  }) => any;
  onUpdateTransaction?: (
    id: string,
    updates: {
      documentNo?: string;
      date?: string;
      amount?: number;
      description?: string;
      notes?: string;
      paymentMethod?: PaymentMethod;
    }
  ) => void;
  onDeleteTransaction?: (id: string) => void;
  onPrintPreview: (
    title: string,
    accountName: string,
    transactions: Transaction[],
    currentBalance: number
  ) => void;
  onOpenExcelPreview?: (
    title: string,
    headers: string[],
    rows: (string | number)[][],
    options?: {
      subtitle?: string;
      filename?: string;
      summaryStats?: { label: string; value: string | number }[];
    }
  ) => void;
}

export const SalesAndPaymentsBook: React.FC<SalesAndPaymentsBookProps> = ({
  settings,
  customers,
  transactions,
  onSaveTransaction,
  onUpdateTransaction,
  onDeleteTransaction,
  onPrintPreview,
  onOpenExcelPreview,
}) => {
  // Select customer (default to first customer if available)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(
    customers.length > 0 ? customers[0].id : ''
  );

  // Correction Modal State (Popup for Sales and Payments)
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState<boolean>(false);
  const [modalActiveType, setModalActiveType] = useState<'sale' | 'payment'>('sale');
  const [initialEditTxId, setInitialEditTxId] = useState<string | undefined>(undefined);
  const [lastSavedSaleTxId, setLastSavedSaleTxId] = useState<string | null>(null);
  const [lastSavedPayTxId, setLastSavedPayTxId] = useState<string | null>(null);

  const openCorrectionModal = (type: 'sale' | 'payment', txId?: string) => {
    setModalActiveType(type);
    setInitialEditTxId(txId);
    setIsCorrectionModalOpen(true);
  };

  const handleUpdate = (id: string, updates: any) => {
    if (onUpdateTransaction) {
      onUpdateTransaction(id, updates);
    } else {
      storage.updateTransaction(id, updates);
    }
  };

  const handleDelete = (id: string) => {
    if (onDeleteTransaction) {
      onDeleteTransaction(id);
    } else {
      storage.deleteTransaction(id);
    }
  };

  // Sale form state
  const [saleDocNo, setSaleDocNo] = useState<string>('');
  const [saleDate, setSaleDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [saleAmount, setSaleAmount] = useState<string>('');
  const [saleDesc, setSaleDesc] = useState<string>('مبيعات بضاعة آجلة');
  const [saleNotes, setSaleNotes] = useState<string>('');
  const [saleSuccessMessage, setSaleSuccessMessage] = useState<string>('');

  // Payment form state
  const [payDocNo, setPayDocNo] = useState<string>('');
  const [payDate, setPayDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [payAmount, setPayAmount] = useState<string>('');
  const [payMethod, setPayMethod] = useState<PaymentMethod>('cash');
  const [payDesc, setPayDesc] = useState<string>('تسديد دفعة من الحساب');
  const [payNotes, setPayNotes] = useState<string>('');
  const [paySuccessMessage, setPaySuccessMessage] = useState<string>('');

  // Initialize/refresh document numbers
  const refreshDocNumbers = () => {
    setSaleDocNo(storage.getNextDocNumber('sale'));
    setPayDocNo(storage.getNextDocNumber('customer_payment'));
  };

  useEffect(() => {
    refreshDocNumbers();
  }, [transactions]);

  // Selected customer object
  const currentCustomer = customers.find((c) => c.id === selectedCustomerId) || customers[0] || null;

  // Filter customer's transactions only (no suppliers, no purchases)
  const customerTx = transactions.filter(
    (t) => t.accountType === 'customer' && (currentCustomer ? t.accountId === currentCustomer.id : false)
  );

  // Right page: Sales only (مدين)
  const customerSales = customerTx.filter((t) => t.type === 'sale' || t.debit > 0);

  // Left page: Payments only (دائن)
  const customerPayments = customerTx.filter((t) => t.type === 'customer_payment' || t.credit > 0);

  const totalSales = customerSales.reduce((acc, t) => acc + (t.debit || t.amount), 0);
  const totalPayments = customerPayments.reduce((acc, t) => acc + (t.credit || t.amount), 0);

  // Handle Save Sale
  const handleSaveSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCustomer) {
      alert('يرجى اختيار زبون أولاً');
      return;
    }
    const amt = parseFloat(String(saleAmount).replace(/,/g, ''));
    if (!amt || amt <= 0) {
      alert('يرجى إدخال مبلغ بيع صحيح أكبر من الصفر');
      return;
    }

    const saved = onSaveTransaction({
      accountType: 'customer',
      accountId: currentCustomer.id,
      type: 'sale',
      documentNo: saleDocNo || storage.getNextDocNumber('sale'),
      date: saleDate || new Date().toISOString().slice(0, 10),
      amount: amt,
      description: saleDesc || 'مبيعات بضاعة آجلة',
      notes: saleNotes,
    });

    if (saved && saved.id) {
      setLastSavedSaleTxId(saved.id);
    }

    setSaleAmount('');
    setSaleNotes('');
    setSaleSuccessMessage(`تم حفظ فاتورة البيع بمبلغ ${amt.toLocaleString()} ${settings.currency}!`);
    setTimeout(() => setSaleSuccessMessage(''), 4500);
    refreshDocNumbers();
  };

  // Handle Save Payment
  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCustomer) {
      alert('يرجى اختيار زبون أولاً');
      return;
    }
    const amt = parseFloat(String(payAmount).replace(/,/g, ''));
    if (!amt || amt <= 0) {
      alert('يرجى إدخال مبلغ تسديد صحيح أكبر من الصفر');
      return;
    }

    const saved = onSaveTransaction({
      accountType: 'customer',
      accountId: currentCustomer.id,
      type: 'customer_payment',
      documentNo: payDocNo || storage.getNextDocNumber('customer_payment'),
      date: payDate || new Date().toISOString().slice(0, 10),
      amount: amt,
      paymentMethod: payMethod,
      description: payDesc || 'تسديد دفعة من الحساب',
      notes: payNotes,
    });

    if (saved && saved.id) {
      setLastSavedPayTxId(saved.id);
    }

    try {
      confetti({
        particleCount: 35,
        spread: 60,
        origin: { y: 0.7 },
      });
    } catch {}

    setPayAmount('');
    setPayNotes('');
    setPaySuccessMessage(`تم تسجيل سند التسديد بمبلغ ${amt.toLocaleString()} ${settings.currency}!`);
    setTimeout(() => setPaySuccessMessage(''), 4500);
    refreshDocNumbers();
  };

  const handlePrint = () => {
    if (!currentCustomer) return;
    const title = `كشف حساب ودفتر البيع والتسديد: ${currentCustomer.name}`;
    onPrintPreview(title, currentCustomer.name, customerTx, currentCustomer.currentBalance);
  };

  const exportExcel = () => {
    if (!currentCustomer) return;
    const headers = [
      'التاريخ',
      'رقم المستند',
      'نوع الحركة',
      'البيان',
      `مبيعات (مدين - ${settings.currency})`,
      `تسديدات (دائن - ${settings.currency})`,
      'العملة'
    ];
    const rows = customerTx.map((t) => [
      t.date,
      t.documentNo,
      t.type === 'sale' ? 'بيع آجل' : 'تسديد',
      t.description,
      t.debit > 0 ? t.debit : '',
      t.credit > 0 ? t.credit : '',
      settings.currency,
    ]);

    const docTitle = `كشف البيع والتسديد: ${currentCustomer.name}`;
    const subtitle = `كود الزبون: ${currentCustomer.code} | الرصيد الحالي: ${currentCustomer.currentBalance.toLocaleString()} ${settings.currency}`;

    if (onOpenExcelPreview) {
      onOpenExcelPreview(docTitle, headers, rows, {
        subtitle,
        filename: `كشف_البيع_والتسديد_${currentCustomer.name}`,
        summaryStats: [
          { label: 'إجمالي المبيعات الآجلة', value: `${totalSales.toLocaleString()} ${settings.currency}` },
          { label: 'إجمالي التسديدات المقبوضة', value: `${totalPayments.toLocaleString()} ${settings.currency}` },
          { label: 'صافي الرصيد المستحق', value: `${currentCustomer.currentBalance.toLocaleString()} ${settings.currency}` },
        ]
      });
      return;
    }

    const csvContent = '\uFEFF' + [headers, ...rows].map((e) => e.map((val) => `"${val}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `كشف_البيع_والتسديد_${currentCustomer.name}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full max-w-full overflow-hidden">
      {/* ======================================================== */}
      {/* THE INTEGRATED SPREAD (سجل الدفتر بدون أي نوافذ خارجية) */}
      {/* ======================================================== */}
      <div className="w-full rounded-2xl ledger-paper border-2 border-stone-400/80 p-2 sm:p-4 shadow-2xl text-stone-900 overflow-hidden">
        
        {/* Integrated Header Banner directly inside the ledger spread */}
        <div className="pb-3 mb-3 border-b-2 border-stone-400/70 flex flex-wrap items-center justify-between gap-2.5">
          {/* Customer Selection Integrated Inside Spread */}
          <div className="flex items-center gap-2 flex-1 min-w-[280px] max-w-full">
            <div className="w-8 h-8 rounded-lg bg-amber-800 text-amber-200 flex items-center justify-center font-bold shadow-xs shrink-0">
              <Users size={16} />
            </div>
            <DynamicSearchCombobox
              label="سجل الزبون"
              items={customers}
              selectedId={selectedCustomerId}
              onSelect={(id) => {
                setSelectedCustomerId(id);
                setSaleSuccessMessage('');
                setPaySuccessMessage('');
              }}
              currency={settings.currency}
              accountTypeLabel="الزبون"
              accentColor="amber"
              placeholder="اكتب أول حرفين للبحث عن الزبون (مثال: اح، مص، عا)..."
            />
          </div>

          {/* Current Balance & Action Buttons Integrated */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="bg-stone-900 text-stone-100 px-3 py-1 rounded-lg border border-amber-600/50 flex items-center gap-1.5 text-xs">
              <span className="text-amber-400 text-[11px]">الرصيد:</span>
              <span
                className={`font-mono font-bold text-xs sm:text-sm ${
                  (currentCustomer?.currentBalance || 0) > 0
                    ? 'text-red-400'
                    : (currentCustomer?.currentBalance || 0) === 0
                    ? 'text-emerald-400'
                    : 'text-blue-400'
                }`}
              >
                {currentCustomer ? currentCustomer.currentBalance.toLocaleString() : 0} {settings.currency}
              </span>
            </div>

            <button
              onClick={() => openCorrectionModal('sale')}
              className="p-1 px-2.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300 text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs transition-colors"
              title="فتح نافذة مراجعة وتعديل فواتير وسندات الزبون"
            >
              <Edit3 size={13} className="text-amber-800" />
              <span className="hidden sm:inline text-[11px]">تعديل القيود / الأخطاء</span>
            </button>

            <button
              onClick={exportExcel}
              className="p-1 px-2 rounded-lg bg-white hover:bg-stone-100 text-stone-700 border border-stone-300 text-xs font-semibold flex items-center gap-1 cursor-pointer shadow-xs"
              title="تصدير Excel"
            >
              <FileSpreadsheet size={13} className="text-emerald-600" />
              <span className="hidden sm:inline text-[11px]">Excel</span>
            </button>

            <button
              onClick={handlePrint}
              className="p-1 px-2.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs flex items-center gap-1 cursor-pointer shadow-xs"
              title="طباعة كشف الحساب"
            >
              <Printer size={13} />
              <span className="hidden sm:inline text-[11px]">طباعة</span>
            </button>
          </div>
        </div>

        {/* Facing Two Pages Grid - With min-w-0 to completely eliminate horizontal scrolling */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 relative border border-stone-400/80 rounded-xl overflow-hidden shadow-inner bg-[#faf8f1] w-full">
          {/* Central Gutter Crease Shadow */}
          <div className="hidden lg:block absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-8 book-spine-crease z-20 pointer-events-none" />

          {/* ======================================================== */}
          {/* RIGHT PAGE: البيع الآجل (مدين) */}
          {/* ======================================================== */}
          <div className="p-2.5 sm:p-3.5 border-b lg:border-b-0 lg:border-l border-stone-300 flex flex-col justify-between min-w-0">
            <div className="min-w-0">
              {/* Right Page Header */}
              <div className="flex items-center justify-between pb-1.5 mb-2 border-b-2 border-red-900/30">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-red-600 shadow-xs shrink-0" />
                  <h3 className="font-bold text-xs sm:text-sm font-amiri text-red-950 truncate">
                    البيع الآجل (مدين)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => openCorrectionModal('sale')}
                  className="flex items-center gap-1 font-mono text-[10px] sm:text-[11px] font-bold bg-red-100 hover:bg-red-200 text-red-900 px-2 py-0.5 rounded border border-red-300 transition-all cursor-pointer shadow-xs hover:border-red-400"
                  title="فتح نافذة فواتير المبيعات وتعديل أي خطأ في الإدخال"
                >
                  <Edit3 size={11} className="text-red-700" />
                  <span>{customerSales.length} فاتورة (تعديل)</span>
                </button>
              </div>

              {/* Success Notification for Sale */}
              {saleSuccessMessage && (
                <div className="mb-2 p-1.5 rounded-lg bg-emerald-100 border border-emerald-400 text-emerald-900 text-xs font-bold flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <CheckCircle2 size={14} className="text-emerald-700 shrink-0" />
                    <span className="truncate">{saleSuccessMessage}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => openCorrectionModal('sale', lastSavedSaleTxId || undefined)}
                    className="text-[11px] text-amber-900 hover:text-amber-950 underline font-bold shrink-0 cursor-pointer flex items-center gap-0.5"
                  >
                    <Edit3 size={11} />
                    <span>تعديل في حال الخطأ</span>
                  </button>
                </div>
              )}

              {/* Ready-to-enter Sale Form */}
              <form
                onSubmit={handleSaveSale}
                className="bg-white p-2.5 rounded-xl border border-red-200 shadow-xs mb-3 text-xs space-y-2 min-w-0"
              >
                <div className="grid grid-cols-3 gap-1.5">
                  <div className="min-w-0">
                    <label className="block text-[10px] font-semibold text-stone-700 mb-0.5 truncate">
                      رقم الفاتورة *
                    </label>
                    <input
                      type="text"
                      value={saleDocNo}
                      onChange={(e) => setSaleDocNo(e.target.value)}
                      placeholder="INV-..."
                      className="w-full px-2 py-1 bg-stone-50 border border-stone-300 rounded text-stone-900 font-mono font-bold text-xs focus:bg-white focus:outline-none focus:border-red-600"
                      required
                    />
                  </div>

                  <div className="min-w-0">
                    <label className="block text-[10px] font-semibold text-stone-700 mb-0.5 truncate">
                      التاريخ *
                    </label>
                    <input
                      type="date"
                      value={saleDate}
                      onChange={(e) => setSaleDate(e.target.value)}
                      className="w-full px-1.5 py-1 bg-stone-50 border border-stone-300 rounded text-stone-900 font-mono text-[11px] focus:bg-white focus:outline-none focus:border-red-600"
                      required
                    />
                  </div>

                  <div className="min-w-0">
                    <label className="block text-[10px] font-bold text-red-900 mb-0.5 truncate">
                      المبلغ ({settings.currency}) *
                    </label>
                    <FormattedAmountInput
                      value={saleAmount}
                      onChange={(_n, formatted) => setSaleAmount(formatted)}
                      placeholder="0.00"
                      className="w-full px-2 py-1 bg-red-50/50 border border-red-300 rounded text-red-950 font-mono font-black text-xs sm:text-sm focus:bg-white focus:outline-none focus:border-red-600"
                      required
                    />
                  </div>
                </div>

                <div className="min-w-0">
                  <label className="block text-[10px] font-semibold text-stone-700 mb-0.5">
                    البيان والتفاصيل *
                  </label>
                  <input
                    type="text"
                    value={saleDesc}
                    onChange={(e) => setSaleDesc(e.target.value)}
                    placeholder="مثال: بيع بضاعة آجلة..."
                    className="w-full px-2 py-1 bg-stone-50 border border-stone-300 rounded text-stone-900 text-xs focus:bg-white focus:outline-none focus:border-red-600"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2 px-3 rounded-lg bg-red-800 hover:bg-red-700 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Save size={14} />
                  <span>حفظ قيد البيع الآجل</span>
                </button>
              </form>
            </div>

            {/* Right Page Total */}
            <div className="mt-4 pt-2 border-t border-red-900/30 flex items-center justify-between text-xs font-bold text-red-950 bg-red-100/60 p-2.5 rounded-lg">
              <span>مجموع المبيعات الآجلة:</span>
              <span className="font-mono text-sm sm:text-base font-black text-red-900">
                {totalSales.toLocaleString()} {settings.currency}
              </span>
            </div>
          </div>

          {/* ======================================================== */}
          {/* LEFT PAGE: تسديد الزبون (دائن) */}
          {/* ======================================================== */}
          <div className="p-2.5 sm:p-4 flex flex-col justify-between min-w-0">
            <div className="min-w-0">
              {/* Left Page Header */}
              <div className="flex items-center justify-between pb-1.5 mb-2 border-b-2 border-emerald-900/30">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 shadow-xs shrink-0" />
                  <h3 className="font-bold text-xs sm:text-sm font-amiri text-emerald-950 truncate">
                    تسديد الزبون (دائن)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => openCorrectionModal('payment')}
                  className="flex items-center gap-1 font-mono text-[10px] sm:text-[11px] font-bold bg-emerald-100 hover:bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded border border-emerald-300 transition-all cursor-pointer shadow-xs hover:border-emerald-400"
                  title="فتح نافذة سندات التسديد وتعديل أي خطأ في الإدخال"
                >
                  <Edit3 size={11} className="text-emerald-700" />
                  <span>{customerPayments.length} وصل (تعديل)</span>
                </button>
              </div>

              {/* Success Notification for Payment */}
              {paySuccessMessage && (
                <div className="mb-2 p-1.5 rounded-lg bg-emerald-100 border border-emerald-400 text-emerald-900 text-xs font-bold flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <CheckCircle2 size={14} className="text-emerald-700 shrink-0" />
                    <span className="truncate">{paySuccessMessage}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => openCorrectionModal('payment', lastSavedPayTxId || undefined)}
                    className="text-[11px] text-emerald-900 hover:text-emerald-950 underline font-bold shrink-0 cursor-pointer flex items-center gap-0.5"
                  >
                    <Edit3 size={11} />
                    <span>تعديل في حال الخطأ</span>
                  </button>
                </div>
              )}

              {/* Ready-to-enter Payment Form */}
              <form
                onSubmit={handleSavePayment}
                className="bg-white p-3 rounded-xl border border-emerald-200 shadow-xs mb-2 text-xs space-y-2.5 min-w-0"
              >
                <div className="grid grid-cols-3 gap-1.5">
                  <div className="min-w-0">
                    <label className="block text-[10px] font-semibold text-stone-700 mb-0.5 truncate">
                      رقم الوصل *
                    </label>
                    <input
                      type="text"
                      value={payDocNo}
                      onChange={(e) => setPayDocNo(e.target.value)}
                      placeholder="RCP-..."
                      className="w-full px-2 py-1 bg-stone-50 border border-stone-300 rounded text-stone-900 font-mono font-bold text-xs focus:bg-white focus:outline-none focus:border-emerald-600"
                      required
                    />
                  </div>

                  <div className="min-w-0">
                    <label className="block text-[10px] font-semibold text-stone-700 mb-0.5 truncate">
                      التاريخ *
                    </label>
                    <input
                      type="date"
                      value={payDate}
                      onChange={(e) => setPayDate(e.target.value)}
                      className="w-full px-1.5 py-1 bg-stone-50 border border-stone-300 rounded text-stone-900 font-mono text-[11px] focus:bg-white focus:outline-none focus:border-emerald-600"
                      required
                    />
                  </div>

                  <div className="min-w-0">
                    <label className="block text-[10px] font-bold text-emerald-900 mb-0.5 truncate">
                      المبلغ ({settings.currency}) *
                    </label>
                    <FormattedAmountInput
                      value={payAmount}
                      onChange={(_n, formatted) => setPayAmount(formatted)}
                      placeholder="0.00"
                      className="w-full px-2 py-1 bg-emerald-50/50 border border-emerald-300 rounded text-emerald-950 font-mono font-black text-xs sm:text-sm focus:bg-white focus:outline-none focus:border-emerald-600"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  <div className="min-w-0">
                    <label className="block text-[10px] font-semibold text-stone-700 mb-0.5 truncate">
                      طريقة الدفع *
                    </label>
                    <select
                      value={payMethod}
                      onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                      className="w-full px-1.5 py-1 bg-stone-50 border border-stone-300 rounded text-stone-900 text-xs focus:bg-white focus:outline-none focus:border-emerald-600"
                    >
                      <option value="cash">نقدي</option>
                      <option value="bank_transfer">تحويل</option>
                      <option value="check">شيك</option>
                    </select>
                  </div>

                  <div className="col-span-2 min-w-0">
                    <label className="block text-[10px] font-semibold text-stone-700 mb-0.5 truncate">
                      البيان والتفاصيل *
                    </label>
                    <input
                      type="text"
                      value={payDesc}
                      onChange={(e) => setPayDesc(e.target.value)}
                      placeholder="مثال: تسديد دفعة من الحساب..."
                      className="w-full px-2 py-1 bg-stone-50 border border-stone-300 rounded text-stone-900 text-xs focus:bg-white focus:outline-none focus:border-emerald-600"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2 px-3 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <DollarSign size={14} />
                  <span>حفظ سند التسديد</span>
                </button>
              </form>
            </div>

            {/* Left Page Total */}
            <div className="mt-4 pt-2 border-t border-emerald-900/30 flex items-center justify-between text-xs font-bold text-emerald-950 bg-emerald-100/60 p-2.5 rounded-lg">
              <span>مجموع التسديدات المقبوضة:</span>
              <span className="font-mono text-sm sm:text-base font-black text-emerald-900">
                {totalPayments.toLocaleString()} {settings.currency}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Popup Window for Sales and Payments correction */}
      <TransactionEditModal
        isOpen={isCorrectionModalOpen}
        onClose={() => setIsCorrectionModalOpen(false)}
        accountType="customer"
        account={currentCustomer}
        activeType={modalActiveType}
        transactions={transactions}
        settings={settings}
        onUpdateTransaction={handleUpdate}
        onDeleteTransaction={handleDelete}
        initialEditTxId={initialEditTxId}
      />
    </div>
  );
};
