import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Edit3,
  Trash2,
  Save,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  FileText,
  DollarSign,
  Receipt,
  Search,
  RotateCcw,
  UserCheck,
  CreditCard,
  Building2,
  Users
} from 'lucide-react';
import { Customer, Supplier, Transaction, StoreSettings, TransactionType, PaymentMethod } from '../types';
import { FormattedAmountInput } from './FormattedAmountInput';

interface TransactionEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  accountType: 'customer' | 'supplier';
  account: Customer | Supplier | null;
  activeType: 'sale' | 'payment';
  transactions: Transaction[];
  settings: StoreSettings;
  onUpdateTransaction: (
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
  onDeleteTransaction: (id: string) => void;
  initialEditTxId?: string;
}

export const TransactionEditModal: React.FC<TransactionEditModalProps> = ({
  isOpen,
  onClose,
  accountType,
  account,
  activeType: initialActiveType,
  transactions,
  settings,
  onUpdateTransaction,
  onDeleteTransaction,
  initialEditTxId,
}) => {
  const [tabType, setTabType] = useState<'sale' | 'payment'>(initialActiveType);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingTxId, setEditingTxId] = useState<string | null>(null);
  const [deletingTxId, setDeletingTxId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Edit form state
  const [editDocNo, setEditDocNo] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editAmount, setEditAmount] = useState<string>('');
  const [editMethod, setEditMethod] = useState<PaymentMethod>('cash');
  const [editDesc, setEditDesc] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Keep tab in sync with prop when opening
  useEffect(() => {
    if (isOpen) {
      setTabType(initialActiveType);
      setSearchQuery('');
      setFeedbackMessage(null);
      setDeletingTxId(null);
      if (initialEditTxId) {
        startEditingById(initialEditTxId);
      } else {
        setEditingTxId(null);
      }
    }
  }, [isOpen, initialActiveType, initialEditTxId]);

  // Filter transactions for this account
  const accountTransactions = useMemo(() => {
    if (!account) return [];
    return transactions.filter((t) => t.accountType === accountType && t.accountId === account.id);
  }, [transactions, account, accountType]);

  // Group into sales/purchases vs payments
  const salesOrPurchases = useMemo(() => {
    return accountTransactions.filter((t) => {
      if (accountType === 'customer') {
        return t.type === 'sale' || (t.type === 'opening_balance' && t.debit > 0);
      } else {
        return t.type === 'purchase' || (t.type === 'opening_balance' && t.credit > 0);
      }
    });
  }, [accountTransactions, accountType]);

  const payments = useMemo(() => {
    return accountTransactions.filter((t) => {
      if (accountType === 'customer') {
        return t.type === 'customer_payment' || (t.type === 'opening_balance' && t.credit > 0);
      } else {
        return t.type === 'supplier_payment' || (t.type === 'opening_balance' && t.debit > 0);
      }
    });
  }, [accountTransactions, accountType]);

  // Current list based on active tab
  const currentList = tabType === 'sale' ? salesOrPurchases : payments;

  // Filter by search query
  const filteredList = useMemo(() => {
    if (!searchQuery.trim()) return currentList;
    const q = searchQuery.toLowerCase().trim();
    return currentList.filter(
      (t) =>
        t.documentNo.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.date.includes(q) ||
        String(t.amount).includes(q) ||
        (t.notes && t.notes.toLowerCase().includes(q))
    );
  }, [currentList, searchQuery]);

  const startEditingById = (txId: string) => {
    const tx = accountTransactions.find((t) => t.id === txId);
    if (!tx) return;
    setEditingTxId(tx.id);
    setEditDocNo(tx.documentNo);
    setEditDate(tx.date);
    setEditAmount(String(tx.amount));
    setEditMethod(tx.paymentMethod || 'cash');
    setEditDesc(tx.description);
    setEditNotes(tx.notes || '');
    setDeletingTxId(null);
    setFeedbackMessage(null);
  };

  const handleStartEdit = (tx: Transaction) => {
    startEditingById(tx.id);
  };

  const handleCancelEdit = () => {
    setEditingTxId(null);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTxId) return;

    const amt = parseFloat(String(editAmount).replace(/,/g, ''));
    if (isNaN(amt) || amt <= 0) {
      setFeedbackMessage({ type: 'error', text: 'يرجى إدخال مبلغ صحيح أكبر من الصفر' });
      return;
    }

    try {
      onUpdateTransaction(editingTxId, {
        documentNo: editDocNo,
        date: editDate,
        amount: amt,
        description: editDesc,
        notes: editNotes,
        paymentMethod: tabType === 'payment' ? editMethod : undefined,
      });

      setFeedbackMessage({
        type: 'success',
        text: `تم حفظ التعديل بنجاح للمستند (${editDocNo}) وتحديث الرصيد التراكمي!`,
      });
      setEditingTxId(null);

      setTimeout(() => {
        setFeedbackMessage(null);
      }, 4000);
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err.message || 'حدث خطأ أثناء حفظ التعديل',
      });
    }
  };

  const handleConfirmDelete = (txId: string) => {
    try {
      onDeleteTransaction(txId);
      setDeletingTxId(null);
      setEditingTxId(null);
      setFeedbackMessage({
        type: 'success',
        text: 'تم حذف القيد الخاطئ وإعادة احتساب رصيد الحساب بنجاح!',
      });
      setTimeout(() => {
        setFeedbackMessage(null);
      }, 4000);
    } catch (err: any) {
      setFeedbackMessage({
        type: 'error',
        text: err.message || 'حدث خطأ أثناء حذف القيد',
      });
    }
  };

  if (!isOpen || !account) return null;

  const isCustomer = accountType === 'customer';
  const salesTabTitle = isCustomer ? 'فواتير البيع الآجل (مدين)' : 'فواتير الشراء الآجل (دائن)';
  const paymentsTabTitle = isCustomer ? 'سندات تسديد الزبون (دائن)' : 'سندات الصرف للمورد (مدين)';

  const totalSalesAmount = salesOrPurchases.reduce((acc, t) => acc + t.amount, 0);
  const totalPaymentsAmount = payments.reduce((acc, t) => acc + t.amount, 0);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-stone-950/80 backdrop-blur-md overflow-y-auto animate-fadeIn"
      dir="rtl"
    >
      <div className="relative w-full max-w-4xl bg-[#faf8f1] rounded-2xl shadow-2xl border-2 border-stone-500/60 overflow-hidden flex flex-col max-h-[92vh] text-stone-900">
        
        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 bg-stone-900 text-stone-100 flex items-center justify-between border-b-2 border-amber-600/60 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-600/30 border border-amber-500/40 text-amber-300 flex items-center justify-center shadow-inner">
              {tabType === 'sale' ? <Receipt size={22} /> : <DollarSign size={22} />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-amber-950/80 text-amber-300 border border-amber-700/50">
                  {isCustomer ? 'سجل الزبون' : 'سجل المورد'}
                </span>
                <span className="text-xs text-stone-400 font-mono">#{account.code}</span>
              </div>
              <h2 className="text-base sm:text-lg font-bold font-amiri text-stone-100 leading-tight">
                {isCustomer
                  ? tabType === 'sale'
                    ? `نافذة فواتير المبيعات وتعديل الأخطاء — ${account.name}`
                    : `نافذة سندات التسديد وتعديل الأخطاء — ${account.name}`
                  : tabType === 'sale'
                  ? `نافذة فواتير المشتريات وتعديل الأخطاء — ${account.name}`
                  : `نافذة سندات الصرف للمورد وتعديل الأخطاء — ${account.name}`}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex flex-col items-end px-3 py-1 bg-stone-800/90 rounded-lg border border-stone-700">
              <span className="text-[10px] text-stone-400">الرصيد الحالي المستحق:</span>
              <span
                className={`text-xs font-mono font-bold ${
                  account.currentBalance > 0
                    ? 'text-red-400'
                    : account.currentBalance === 0
                    ? 'text-emerald-400'
                    : 'text-blue-400'
                }`}
              >
                {account.currentBalance.toLocaleString()} {settings.currency}
              </span>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white transition-colors cursor-pointer"
              title="إغلاق النافذة"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Global Feedback Banner */}
        {feedbackMessage && (
          <div
            className={`px-4 py-2.5 text-xs font-bold flex items-center justify-between border-b ${
              feedbackMessage.type === 'success'
                ? 'bg-emerald-100 border-emerald-300 text-emerald-900'
                : 'bg-red-100 border-red-300 text-red-900'
            }`}
          >
            <div className="flex items-center gap-2">
              {feedbackMessage.type === 'success' ? (
                <CheckCircle2 size={16} className="text-emerald-700 shrink-0" />
              ) : (
                <AlertTriangle size={16} className="text-red-700 shrink-0" />
              )}
              <span>{feedbackMessage.text}</span>
            </div>
            <button
              onClick={() => setFeedbackMessage(null)}
              className="text-stone-500 hover:text-stone-800 cursor-pointer text-xs"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {/* Navigation Tabs & Search Controls */}
        <div className="p-3 bg-stone-200/80 border-b border-stone-300/80 flex flex-wrap items-center justify-between gap-2 shrink-0">
          {/* Tab Switcher */}
          <div className="flex items-center bg-stone-300/80 p-1 rounded-xl gap-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setTabType('sale');
                setEditingTxId(null);
                setDeletingTxId(null);
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                tabType === 'sale'
                  ? 'bg-red-800 text-white shadow-xs'
                  : 'text-stone-700 hover:text-stone-950 hover:bg-stone-200'
              }`}
            >
              <FileText size={14} />
              <span>{salesTabTitle}</span>
              <span
                className={`font-mono text-[11px] px-1.5 py-0.2 rounded-md ${
                  tabType === 'sale' ? 'bg-red-950 text-red-200' : 'bg-stone-400/50 text-stone-800'
                }`}
              >
                {salesOrPurchases.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setTabType('payment');
                setEditingTxId(null);
                setDeletingTxId(null);
              }}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg transition-all cursor-pointer ${
                tabType === 'payment'
                  ? 'bg-emerald-800 text-white shadow-xs'
                  : 'text-stone-700 hover:text-stone-950 hover:bg-stone-200'
              }`}
            >
              <DollarSign size={14} />
              <span>{paymentsTabTitle}</span>
              <span
                className={`font-mono text-[11px] px-1.5 py-0.2 rounded-md ${
                  tabType === 'payment' ? 'bg-emerald-950 text-emerald-200' : 'bg-stone-400/50 text-stone-800'
                }`}
              >
                {payments.length}
              </span>
            </button>
          </div>

          {/* Search Box */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث برقم الفاتورة، التاريخ، أو البيان..."
              className="w-full pr-8 pl-3 py-1.5 bg-white border border-stone-300 rounded-lg text-xs text-stone-900 placeholder-stone-400 focus:outline-none focus:border-amber-600 focus:ring-1 focus:ring-amber-500"
            />
          </div>
        </div>

        {/* Modal Scrollable Body */}
        <div className="p-3 sm:p-5 overflow-y-auto flex-1 ledger-paper">
          
          {/* Active Inline Edit Form */}
          {editingTxId && (
            <div className="mb-4 bg-white p-3.5 sm:p-4 rounded-xl border-2 border-amber-500 shadow-md animate-fadeIn">
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-stone-200">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-amber-100 text-amber-900">
                    <Edit3 size={15} />
                  </div>
                  <h3 className="font-bold text-xs sm:text-sm text-stone-900">
                    تعديل بيانات القيد: <span className="font-mono text-amber-800">{editDocNo}</span>
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="text-stone-500 hover:text-stone-800 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <RotateCcw size={13} />
                  <span>إلغاء التعديل</span>
                </button>
              </div>

              <form onSubmit={handleSaveEdit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                      رقم المستند / الفاتورة *
                    </label>
                    <input
                      type="text"
                      value={editDocNo}
                      onChange={(e) => setEditDocNo(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-300 rounded-lg text-xs font-mono font-bold text-stone-900 focus:bg-white focus:outline-none focus:border-amber-600"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                      التاريخ *
                    </label>
                    <input
                      type="date"
                      value={editDate}
                      onChange={(e) => setEditDate(e.target.value)}
                      className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-300 rounded-lg text-xs font-mono text-stone-900 focus:bg-white focus:outline-none focus:border-amber-600"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-amber-950 mb-1">
                      المبلغ الصحيح ({settings.currency}) *
                    </label>
                    <FormattedAmountInput
                      value={editAmount}
                      onChange={(_n, formatted) => setEditAmount(formatted)}
                      placeholder="0.00"
                      className="w-full px-2.5 py-1.5 bg-amber-50/50 border border-amber-400 rounded-lg text-xs sm:text-sm font-mono font-black text-amber-950 focus:bg-white focus:outline-none focus:border-amber-600"
                      required
                    />
                  </div>
                </div>

                {tabType === 'payment' && (
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                      طريقة الدفع *
                    </label>
                    <div className="flex items-center gap-3">
                      {(['cash', 'bank_transfer', 'check'] as PaymentMethod[]).map((m) => (
                        <label
                          key={m}
                          className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border cursor-pointer ${
                            editMethod === m
                              ? 'bg-emerald-100 border-emerald-500 text-emerald-950 font-bold'
                              : 'bg-stone-50 border-stone-300 text-stone-700'
                          }`}
                        >
                          <input
                            type="radio"
                            name="editPaymentMethod"
                            value={m}
                            checked={editMethod === m}
                            onChange={() => setEditMethod(m)}
                            className="sr-only"
                          />
                          <span>
                            {m === 'cash' ? '💵 نقدي كاش' : m === 'bank_transfer' ? '🏦 تحويل بنكي' : '🧾 شيك مصرفي'}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                      البيان والتفاصيل *
                    </label>
                    <input
                      type="text"
                      value={editDesc}
                      onChange={(e) => setEditDesc(e.target.value)}
                      placeholder="بيان الفاتورة أو سبب القيد..."
                      className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-300 rounded-lg text-xs text-stone-900 focus:bg-white focus:outline-none focus:border-amber-600"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-stone-700 mb-1">
                      ملاحظات إضافية
                    </label>
                    <input
                      type="text"
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      placeholder="أي ملاحظات تصحيحية..."
                      className="w-full px-2.5 py-1.5 bg-stone-50 border border-stone-300 rounded-lg text-xs text-stone-900 focus:bg-white focus:outline-none focus:border-amber-600"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-end gap-2 border-t border-stone-200">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-3 py-1.5 rounded-lg border border-stone-300 hover:bg-stone-100 text-stone-700 text-xs font-semibold cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
                  >
                    <Save size={14} />
                    <span>حفظ التعديل وتصحيح الرصيد</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Delete Confirmation Card */}
          {deletingTxId && (
            <div className="mb-4 bg-red-50 p-3.5 rounded-xl border-2 border-red-300 text-red-950 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fadeIn">
              <div className="flex items-center gap-2">
                <AlertTriangle size={18} className="text-red-700 shrink-0" />
                <div>
                  <span className="font-bold text-xs block">
                    هل أنت متأكد من حذف هذا القيد المسجل بالخطأ؟
                  </span>
                  <span className="text-[11px] text-red-800">
                    سيتم إزالة القيد نهائياً وإعادة احتساب رصيد الزبون تلقائياً دون أي خلل محاسبي.
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                <button
                  type="button"
                  onClick={() => setDeletingTxId(null)}
                  className="px-2.5 py-1 rounded-lg border border-stone-300 bg-white hover:bg-stone-100 text-stone-700 text-xs font-semibold cursor-pointer"
                >
                  تراجع
                </button>
                <button
                  type="button"
                  onClick={() => handleConfirmDelete(deletingTxId)}
                  className="px-3 py-1 rounded-lg bg-red-700 hover:bg-red-800 text-white text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer"
                >
                  <Trash2 size={13} />
                  <span>تأكيد الحذف</span>
                </button>
              </div>
            </div>
          )}

          {/* Records Table */}
          {filteredList.length === 0 ? (
            <div className="p-8 text-center bg-white/70 rounded-xl border border-stone-300">
              <FileText size={36} className="mx-auto text-stone-400 mb-2" />
              <h4 className="font-bold text-stone-700 text-sm mb-1">
                لا توجد قيود مسجلة تطابق البحث
              </h4>
              <p className="text-stone-500 text-xs">
                {searchQuery
                  ? 'جرب البحث بكلمات أخرى أو مسح حقل البحث'
                  : 'لم يتم تسجيل أي مستندات من هذا النوع في حساب العميل بعد.'}
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-stone-300 shadow-xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead>
                    <tr className="border-b border-stone-300 bg-stone-100 font-bold text-stone-800">
                      <th className="p-2.5 w-28">رقم المستند</th>
                      <th className="p-2.5 w-24">التاريخ</th>
                      <th className="p-2.5 text-left w-32">المبلغ ({settings.currency})</th>
                      {tabType === 'payment' && <th className="p-2.5 w-24">طريقة الدفع</th>}
                      <th className="p-2.5">البيان والتفاصيل</th>
                      <th className="p-2.5 w-28">المستخدم</th>
                      <th className="p-2.5 text-center w-24">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200">
                    {filteredList.map((tx) => {
                      const isCurrentEditing = editingTxId === tx.id;
                      const isOpening = tx.type === 'opening_balance';

                      return (
                        <tr
                          key={tx.id}
                          className={`transition-colors ${
                            isCurrentEditing
                              ? 'bg-amber-100/70 font-semibold'
                              : 'hover:bg-amber-50/50'
                          }`}
                        >
                          {/* Document Number */}
                          <td className="p-2.5 font-mono font-bold">
                            <span
                              className={`inline-block px-1.5 py-0.5 rounded text-[11px] ${
                                tabType === 'sale'
                                  ? 'bg-red-100 text-red-950 border border-red-200'
                                  : 'bg-emerald-100 text-emerald-950 border border-emerald-200'
                              }`}
                            >
                              {tx.documentNo}
                            </span>
                            {isOpening && (
                              <span className="block text-[9px] text-stone-500 font-sans">
                                (رصيد افتتاحي)
                              </span>
                            )}
                          </td>

                          {/* Date */}
                          <td className="p-2.5 font-mono text-stone-700 text-[11px]">{tx.date}</td>

                          {/* Amount */}
                          <td
                            className={`p-2.5 text-left font-mono font-black text-xs sm:text-sm ${
                              tabType === 'sale' ? 'text-red-700' : 'text-emerald-700'
                            }`}
                          >
                            {tx.amount.toLocaleString()}
                          </td>

                          {/* Payment Method */}
                          {tabType === 'payment' && (
                            <td className="p-2.5 text-stone-700 text-[11px]">
                              {tx.paymentMethod === 'bank_transfer'
                                ? 'تحويل بنكي'
                                : tx.paymentMethod === 'check'
                                ? 'شيك'
                                : 'نقدي'}
                            </td>
                          )}

                          {/* Description & Notes */}
                          <td className="p-2.5">
                            <div className="font-semibold text-stone-900">{tx.description}</div>
                            {tx.notes && (
                              <div className="text-[10px] text-stone-500 italic mt-0.5">{tx.notes}</div>
                            )}
                          </td>

                          {/* User */}
                          <td className="p-2.5 text-stone-600 text-[11px]">
                            <span className="truncate block max-w-[100px]">{tx.userName || 'النظام'}</span>
                          </td>

                          {/* Actions */}
                          <td className="p-2.5 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleStartEdit(tx)}
                                className="p-1 rounded bg-stone-100 hover:bg-amber-100 text-stone-700 hover:text-amber-900 border border-stone-300 hover:border-amber-400 transition-colors cursor-pointer"
                                title="تعديل هذا القيد في حال حدوث خطأ"
                              >
                                <Edit3 size={13} />
                              </button>

                              {!isOpening && (
                                <button
                                  type="button"
                                  onClick={() => setDeletingTxId(tx.id)}
                                  className="p-1 rounded bg-stone-100 hover:bg-red-100 text-stone-700 hover:text-red-900 border border-stone-300 hover:border-red-400 transition-colors cursor-pointer"
                                  title="حذف هذا القيد الخاطئ"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 sm:p-4 bg-stone-100 border-t border-stone-300 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-4 text-xs font-bold">
            <div className="flex items-center gap-1.5">
              <span className="text-stone-600">
                {tabType === 'sale' ? 'مجموع فواتير البيع:' : 'مجموع التسديدات:'}
              </span>
              <span
                className={`font-mono text-sm font-black ${
                  tabType === 'sale' ? 'text-red-800' : 'text-emerald-800'
                }`}
              >
                {(tabType === 'sale' ? totalSalesAmount : totalPaymentsAmount).toLocaleString()}{' '}
                {settings.currency}
              </span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-stone-600">الرصيد الصافي للزبون:</span>
              <span
                className={`font-mono text-sm font-black ${
                  account.currentBalance > 0
                    ? 'text-red-700'
                    : account.currentBalance === 0
                    ? 'text-emerald-700'
                    : 'text-blue-700'
                }`}
              >
                {account.currentBalance.toLocaleString()} {settings.currency}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-stone-900 hover:bg-stone-800 text-stone-100 rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            إغلاق النافذة
          </button>
        </div>

      </div>
    </div>
  );
};
