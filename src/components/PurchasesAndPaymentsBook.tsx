import React, { useState, useEffect } from 'react';
import {
  FileSpreadsheet,
  Printer,
  Calendar,
  Building2,
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
import { Supplier, Transaction, StoreSettings, TransactionType, PaymentMethod } from '../types';
import { storage } from '../services/storage';
import { DynamicSearchCombobox } from './DynamicSearchCombobox';
import { FormattedAmountInput } from './FormattedAmountInput';
import { TransactionEditModal } from './TransactionEditModal';

interface PurchasesAndPaymentsBookProps {
  settings: StoreSettings;
  suppliers: Supplier[];
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
    currentBalance: number,
    isSupplier?: boolean
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

export const PurchasesAndPaymentsBook: React.FC<PurchasesAndPaymentsBookProps> = ({
  settings,
  suppliers,
  transactions,
  onSaveTransaction,
  onUpdateTransaction,
  onDeleteTransaction,
  onPrintPreview,
  onOpenExcelPreview,
}) => {
  // Select supplier (default to first supplier if available)
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>(
    suppliers.length > 0 ? suppliers[0].id : ''
  );

  // Correction Modal State (Popup for Purchases and Supplier Payments)
  const [isCorrectionModalOpen, setIsCorrectionModalOpen] = useState<boolean>(false);
  const [modalActiveType, setModalActiveType] = useState<'sale' | 'payment'>('sale');
  const [initialEditTxId, setInitialEditTxId] = useState<string | undefined>(undefined);
  const [lastSavedPurTxId, setLastSavedPurTxId] = useState<string | null>(null);
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

  // Purchase form state
  const [purDocNo, setPurDocNo] = useState<string>('');
  const [purDate, setPurDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [purAmount, setPurAmount] = useState<string>('');
  const [purDesc, setPurDesc] = useState<string>('مشتريات بضاعة ومواد آجلة');
  const [purNotes, setPurNotes] = useState<string>('');
  const [purSuccessMessage, setPurSuccessMessage] = useState<string>('');

  // Payment form state
  const [payDocNo, setPayDocNo] = useState<string>('');
  const [payDate, setPayDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [payAmount, setPayAmount] = useState<string>('');
  const [payMethod, setPayMethod] = useState<PaymentMethod>('cash');
  const [payDesc, setPayDesc] = useState<string>('تسديد وصرف دفعة للمورد');
  const [payNotes, setPayNotes] = useState<string>('');
  const [paySuccessMessage, setPaySuccessMessage] = useState<string>('');

  const refreshDocNumbers = () => {
    setPurDocNo(storage.getNextDocNumber('purchase'));
    setPayDocNo(storage.getNextDocNumber('supplier_payment'));
  };

  useEffect(() => {
    refreshDocNumbers();
  }, [transactions]);

  // Selected supplier object
  const currentSupplier = suppliers.find((s) => s.id === selectedSupplierId) || suppliers[0] || null;

  // Filter supplier's transactions only (no customers, no sales)
  const supplierTx = transactions.filter(
    (t) => t.accountType === 'supplier' && (currentSupplier ? t.accountId === currentSupplier.id : false)
  );

  // Right page: Purchases only (دائن للمورد)
  const supplierPurchases = supplierTx.filter((t) => t.type === 'purchase' || t.credit > 0);

  // Left page: Supplier payments only (مدين للمورد)
  const supplierPayments = supplierTx.filter((t) => t.type === 'supplier_payment' || t.debit > 0);

  const totalPurchases = supplierPurchases.reduce((acc, t) => acc + (t.credit || t.amount), 0);
  const totalPayments = supplierPayments.reduce((acc, t) => acc + (t.debit || t.amount), 0);

  // Handle Save Purchase
  const handleSavePurchase = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSupplier) {
      alert('يرجى اختيار مورد أولاً');
      return;
    }
    const amt = parseFloat(String(purAmount).replace(/,/g, ''));
    if (!amt || amt <= 0) {
      alert('يرجى إدخال مبلغ شراء صحيح أكبر من الصفر');
      return;
    }

    const saved = onSaveTransaction({
      accountType: 'supplier',
      accountId: currentSupplier.id,
      type: 'purchase',
      documentNo: purDocNo || storage.getNextDocNumber('purchase'),
      date: purDate || new Date().toISOString().slice(0, 10),
      amount: amt,
      description: purDesc || 'مشتريات بضاعة ومواد آجلة',
      notes: purNotes,
    });

    if (saved && saved.id) {
      setLastSavedPurTxId(saved.id);
    }

    setPurAmount('');
    setPurNotes('');
    setPurSuccessMessage(`تم قيد فاتورة الشراء بمبلغ ${amt.toLocaleString()} ${settings.currency}!`);
    setTimeout(() => setPurSuccessMessage(''), 4500);
    refreshDocNumbers();
  };

  // Handle Save Payment to Supplier
  const handleSavePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSupplier) {
      alert('يرجى اختيار مورد أولاً');
      return;
    }
    const amt = parseFloat(String(payAmount).replace(/,/g, ''));
    if (!amt || amt <= 0) {
      alert('يرجى إدخال مبلغ تسديد صحيح أكبر من الصفر');
      return;
    }

    const saved = onSaveTransaction({
      accountType: 'supplier',
      accountId: currentSupplier.id,
      type: 'supplier_payment',
      documentNo: payDocNo || storage.getNextDocNumber('supplier_payment'),
      date: payDate || new Date().toISOString().slice(0, 10),
      amount: amt,
      paymentMethod: payMethod,
      description: payDesc || 'تسديد وصرف دفعة للمورد',
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
    setPaySuccessMessage(`تم تسجيل سند الصرف بمبلغ ${amt.toLocaleString()} ${settings.currency}!`);
    setTimeout(() => setPaySuccessMessage(''), 4500);
    refreshDocNumbers();
  };

  const handlePrint = () => {
    if (!currentSupplier) return;
    const title = `كشف حساب ودفتر الشراء والتسديد: ${currentSupplier.name}`;
    onPrintPreview(title, currentSupplier.name, supplierTx, currentSupplier.currentBalance, true);
  };

  const exportExcel = () => {
    if (!currentSupplier) return;
    const headers = [
      'التاريخ',
      'رقم المستند',
      'نوع الحركة',
      'البيان',
      `مشتريات (دائن - ${settings.currency})`,
      `تسديدات (مدين - ${settings.currency})`,
      'العملة'
    ];
    const rows = supplierTx.map((t) => [
      t.date,
      t.documentNo,
      t.type === 'purchase' ? 'شراء آجل' : 'تسديد مورد',
      t.description,
      t.credit > 0 ? t.credit : '',
      t.debit > 0 ? t.debit : '',
      settings.currency,
    ]);

    const docTitle = `كشف الشراء والتسديد: ${currentSupplier.name}`;
    const subtitle = `كود المورد: ${currentSupplier.code} | المستحق للمورد: ${currentSupplier.currentBalance.toLocaleString()} ${settings.currency}`;

    if (onOpenExcelPreview) {
      onOpenExcelPreview(docTitle, headers, rows, {
        subtitle,
        filename: `كشف_الشراء_والتسديد_${currentSupplier.name}`,
        summaryStats: [
          { label: 'إجمالي المشتريات الآجلة', value: `${totalPurchases.toLocaleString()} ${settings.currency}` },
          { label: 'إجمالي المدفوعات للمورد', value: `${totalPayments.toLocaleString()} ${settings.currency}` },
          { label: 'الرصيد المستحق للمورد', value: `${currentSupplier.currentBalance.toLocaleString()} ${settings.currency}` },
        ]
      });
      return;
    }

    const csvContent = '\uFEFF' + [headers, ...rows].map((e) => e.map((val) => `"${val}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `كشف_الشراء_والتسديد_${currentSupplier.name}_${new Date().toISOString().slice(0, 10)}.csv`;
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
          {/* Supplier Selection Integrated Inside Spread */}
          <div className="flex items-center gap-2 flex-1 min-w-[280px] max-w-full">
            <div className="w-8 h-8 rounded-lg bg-blue-800 text-blue-200 flex items-center justify-center font-bold shadow-xs shrink-0">
              <Building2 size={16} />
            </div>
            <DynamicSearchCombobox
              label="سجل المورد"
              items={suppliers}
              selectedId={selectedSupplierId}
              onSelect={(id) => {
                setSelectedSupplierId(id);
                setPurSuccessMessage('');
                setPaySuccessMessage('');
              }}
              currency={settings.currency}
              accountTypeLabel="المورد"
              accentColor="blue"
              placeholder="اكتب أول حرفين للبحث عن المورد (مثال: فر، با، دج)..."
            />
          </div>

          {/* Current Balance & Action Buttons Integrated */}
          <div className="flex items-center gap-2 shrink-0">
            <div className="bg-stone-900 text-stone-100 px-3 py-1 rounded-lg border border-blue-600/50 flex items-center gap-1.5 text-xs">
              <span className="text-blue-300 text-[11px]">المستحق:</span>
              <span
                className={`font-mono font-bold text-xs sm:text-sm ${
                  (currentSupplier?.currentBalance || 0) > 0
                    ? 'text-blue-300'
                    : (currentSupplier?.currentBalance || 0) === 0
                    ? 'text-emerald-400'
                    : 'text-amber-400'
                }`}
              >
                {currentSupplier ? currentSupplier.currentBalance.toLocaleString() : 0} {settings.currency}
              </span>
            </div>

            <button
              onClick={() => openCorrectionModal('sale')}
              className="p-1 px-2.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-950 border border-blue-300 text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs transition-colors"
              title="فتح نافذة مراجعة وتعديل فواتير وسندات المورد"
            >
              <Edit3 size={13} className="text-blue-800" />
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
              className="p-1 px-2.5 rounded-lg bg-blue-700 hover:bg-blue-600 text-white font-bold text-xs flex items-center gap-1 cursor-pointer shadow-xs"
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
          {/* RIGHT PAGE: الشراء الآجل (دائن للمورد) */}
          {/* ======================================================== */}
          <div className="p-2.5 sm:p-3.5 border-b lg:border-b-0 lg:border-l border-stone-300 flex flex-col justify-between min-w-0">
            <div className="min-w-0">
              {/* Right Page Header */}
              <div className="flex items-center justify-between pb-1.5 mb-2 border-b-2 border-blue-900/30">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shadow-xs shrink-0" />
                  <h3 className="font-bold text-xs sm:text-sm font-amiri text-blue-950 truncate">
                    الشراء الآجل (دائن للمورد)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => openCorrectionModal('sale')}
                  className="flex items-center gap-1 font-mono text-[10px] sm:text-[11px] font-bold bg-blue-100 hover:bg-blue-200 text-blue-900 px-2 py-0.5 rounded border border-blue-300 transition-all cursor-pointer shadow-xs hover:border-blue-400"
                  title="فتح نافذة فواتير المشتريات وتعديل أي خطأ في الإدخال"
                >
                  <Edit3 size={11} className="text-blue-700" />
                  <span>{supplierPurchases.length} فاتورة (تعديل)</span>
                </button>
              </div>

              {/* Success Notification for Purchase */}
              {purSuccessMessage && (
                <div className="mb-2 p-1.5 rounded-lg bg-emerald-100 border border-emerald-400 text-emerald-900 text-xs font-bold flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <CheckCircle2 size={14} className="text-emerald-700 shrink-0" />
                    <span className="truncate">{purSuccessMessage}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => openCorrectionModal('sale', lastSavedPurTxId || undefined)}
                    className="text-[11px] text-blue-900 hover:text-blue-950 underline font-bold shrink-0 cursor-pointer flex items-center gap-0.5"
                  >
                    <Edit3 size={11} />
                    <span>تعديل في حال الخطأ</span>
                  </button>
                </div>
              )}

              {/* Ready-to-enter Purchase Form */}
              <form
                onSubmit={handleSavePurchase}
                className="bg-white p-2.5 rounded-xl border border-blue-200 shadow-xs mb-3 text-xs space-y-2 min-w-0"
              >
                <div className="grid grid-cols-3 gap-1.5">
                  <div className="min-w-0">
                    <label className="block text-[10px] font-semibold text-stone-700 mb-0.5 truncate">
                      رقم الفاتورة *
                    </label>
                    <input
                      type="text"
                      value={purDocNo}
                      onChange={(e) => setPurDocNo(e.target.value)}
                      placeholder="PUR-..."
                      className="w-full px-2 py-1 bg-stone-50 border border-stone-300 rounded text-stone-900 font-mono font-bold text-xs focus:bg-white focus:outline-none focus:border-blue-600"
                      required
                    />
                  </div>

                  <div className="min-w-0">
                    <label className="block text-[10px] font-semibold text-stone-700 mb-0.5 truncate">
                      التاريخ *
                    </label>
                    <input
                      type="date"
                      value={purDate}
                      onChange={(e) => setPurDate(e.target.value)}
                      className="w-full px-1.5 py-1 bg-stone-50 border border-stone-300 rounded text-stone-900 font-mono text-[11px] focus:bg-white focus:outline-none focus:border-blue-600"
                      required
                    />
                  </div>

                  <div className="min-w-0">
                    <label className="block text-[10px] font-bold text-blue-900 mb-0.5 truncate">
                      المبلغ ({settings.currency}) *
                    </label>
                    <FormattedAmountInput
                      value={purAmount}
                      onChange={(_n, formatted) => setPurAmount(formatted)}
                      placeholder="0.00"
                      className="w-full px-2 py-1 bg-blue-50/50 border border-blue-300 rounded text-blue-950 font-mono font-black text-xs sm:text-sm focus:bg-white focus:outline-none focus:border-blue-600"
                      required
                    />
                  </div>
                </div>

                <div className="min-w-0">
                  <label className="block text-[10px] font-semibold text-stone-700 mb-0.5">
                    البيان وتفاصيل المواد *
                  </label>
                  <input
                    type="text"
                    value={purDesc}
                    onChange={(e) => setPurDesc(e.target.value)}
                    placeholder="مثال: شراء مواد أولية، بضاعة..."
                    className="w-full px-2 py-1 bg-stone-50 border border-stone-300 rounded text-stone-900 text-xs focus:bg-white focus:outline-none focus:border-blue-600"
                    required
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-2 px-3 rounded-lg bg-blue-800 hover:bg-blue-700 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Save size={14} />
                  <span>حفظ فاتورة الشراء الآجل</span>
                </button>
              </form>
            </div>

            {/* Right Page Total */}
            <div className="mt-4 pt-2 border-t border-blue-900/30 flex items-center justify-between text-xs font-bold text-blue-950 bg-blue-100/60 p-2.5 rounded-lg">
              <span>مجموع المشتريات الآجلة:</span>
              <span className="font-mono text-sm sm:text-base font-black text-blue-900">
                {totalPurchases.toLocaleString()} {settings.currency}
              </span>
            </div>
          </div>

          {/* ======================================================== */}
          {/* LEFT PAGE: تسديد المورد (مدين للمورد) */}
          {/* ======================================================== */}
          <div className="p-2.5 sm:p-4 flex flex-col justify-between min-w-0">
            <div className="min-w-0">
              {/* Left Page Header */}
              <div className="flex items-center justify-between pb-1.5 mb-2 border-b-2 border-stone-800/30">
                <div className="flex items-center gap-1.5 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full bg-stone-700 shadow-xs shrink-0" />
                  <h3 className="font-bold text-xs sm:text-sm font-amiri text-stone-950 truncate">
                    تسديد المورد (مدين للمورد)
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => openCorrectionModal('payment')}
                  className="flex items-center gap-1 font-mono text-[10px] sm:text-[11px] font-bold bg-stone-200 hover:bg-stone-300 text-stone-900 px-2 py-0.5 rounded border border-stone-300 transition-all cursor-pointer shadow-xs hover:border-stone-400"
                  title="فتح نافذة سندات الصرف للمورد وتعديل أي خطأ في الإدخال"
                >
                  <Edit3 size={11} className="text-stone-700" />
                  <span>{supplierPayments.length} سند (تعديل)</span>
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
                    className="text-[11px] text-stone-900 hover:text-black underline font-bold shrink-0 cursor-pointer flex items-center gap-0.5"
                  >
                    <Edit3 size={11} />
                    <span>تعديل في حال الخطأ</span>
                  </button>
                </div>
              )}

              {/* Ready-to-enter Payment Form */}
              <form
                onSubmit={handleSavePayment}
                className="bg-white p-3 rounded-xl border border-stone-300 shadow-xs mb-2 text-xs space-y-2.5 min-w-0"
              >
                <div className="grid grid-cols-3 gap-1.5">
                  <div className="min-w-0">
                    <label className="block text-[10px] font-semibold text-stone-700 mb-0.5 truncate">
                      رقم السند *
                    </label>
                    <input
                      type="text"
                      value={payDocNo}
                      onChange={(e) => setPayDocNo(e.target.value)}
                      placeholder="PAY-..."
                      className="w-full px-2 py-1 bg-stone-50 border border-stone-300 rounded text-stone-900 font-mono font-bold text-xs focus:bg-white focus:outline-none focus:border-stone-700"
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
                      className="w-full px-1.5 py-1 bg-stone-50 border border-stone-300 rounded text-stone-900 font-mono text-[11px] focus:bg-white focus:outline-none focus:border-stone-700"
                      required
                    />
                  </div>

                  <div className="min-w-0">
                    <label className="block text-[10px] font-bold text-stone-900 mb-0.5 truncate">
                      المبلغ ({settings.currency}) *
                    </label>
                    <FormattedAmountInput
                      value={payAmount}
                      onChange={(_n, formatted) => setPayAmount(formatted)}
                      placeholder="0.00"
                      className="w-full px-2 py-1 bg-stone-100/60 border border-stone-400 rounded text-stone-950 font-mono font-black text-xs sm:text-sm focus:bg-white focus:outline-none focus:border-stone-700"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  <div className="min-w-0">
                    <label className="block text-[10px] font-semibold text-stone-700 mb-0.5 truncate">
                      طريقة الصرف *
                    </label>
                    <select
                      value={payMethod}
                      onChange={(e) => setPayMethod(e.target.value as PaymentMethod)}
                      className="w-full px-1.5 py-1 bg-stone-50 border border-stone-300 rounded text-stone-900 text-xs focus:bg-white focus:outline-none focus:border-stone-700"
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
                      placeholder="مثال: تسديد دفعة نقدية من الفاتورة..."
                      className="w-full px-2 py-1 bg-stone-50 border border-stone-300 rounded text-stone-900 text-xs focus:bg-white focus:outline-none focus:border-stone-700"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2 px-3 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-100 font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <DollarSign size={14} />
                  <span>حفظ سند الصرف للمورد</span>
                </button>
              </form>
            </div>

            {/* Left Page Total */}
            <div className="mt-4 pt-2 border-t border-stone-400 flex items-center justify-between text-xs font-bold text-stone-950 bg-stone-200/80 p-2.5 rounded-lg">
              <span>مجموع المدفوعات للمورد:</span>
              <span className="font-mono text-sm sm:text-base font-black text-stone-950">
                {totalPayments.toLocaleString()} {settings.currency}
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Popup Window for Purchases and Supplier Payments correction */}
      <TransactionEditModal
        isOpen={isCorrectionModalOpen}
        onClose={() => setIsCorrectionModalOpen(false)}
        accountType="supplier"
        account={currentSupplier}
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
