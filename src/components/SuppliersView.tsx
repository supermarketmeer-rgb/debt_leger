import React, { useState, useMemo } from 'react';
import {
  Building2,
  PlusCircle,
  Search,
  BookOpen,
  DollarSign,
  Edit,
  Trash2,
  Phone,
  MapPin,
  FileSpreadsheet,
  Printer,
  AlertCircle,
  CheckCircle2,
  Calendar,
  X,
  Save,
  Eye
} from 'lucide-react';
import { Supplier, Transaction, StoreSettings } from '../types';
import { DynamicSearchCombobox, ComboboxItem } from './DynamicSearchCombobox';
import { FormattedAmountInput } from './FormattedAmountInput';

interface SuppliersViewProps {
  settings: StoreSettings;
  suppliers: Supplier[];
  transactions: Transaction[];
  onOpenLedger?: (supplier: Supplier) => void;
  onAddSupplier: (data: {
    name: string;
    phone: string;
    address: string;
    notes: string;
    openingBalance: number;
  }) => void;
  onUpdateSupplier: (id: string, updates: Partial<Supplier>) => void;
  onDeleteSupplier: (id: string) => void;
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

export const SuppliersView: React.FC<SuppliersViewProps> = ({
  settings,
  suppliers,
  transactions,
  onAddSupplier,
  onUpdateSupplier,
  onDeleteSupplier,
  onPrintPreview,
  onOpenExcelPreview,
}) => {
  // Selected Supplier for Left Page Statement - Default to 'all' (جميع الموردين)
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>('all');

  // Search and Filter for Right Page Supplier Table
  const [tableSearch, setTableSearch] = useState('');
  const [filterBalance, setFilterBalance] = useState<'all' | 'creditors' | 'zero'>('all');

  // Form State (Add / Edit inline directly in Right Page)
  const [isEditing, setIsEditing] = useState(false);
  const [editingSupplierId, setEditingSupplierId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [openingBalance, setOpeningBalance] = useState<number>(0);
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);

  // Statement Date Range Filter (Left Page)
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Total balance owed across all suppliers
  const totalAllSuppliersBalance = useMemo(() => {
    return suppliers.reduce((sum, s) => sum + (s.currentBalance || 0), 0);
  }, [suppliers]);

  // Combobox items including "جميع الموردين" as first item
  const comboboxItems: ComboboxItem[] = useMemo(() => {
    const allItem: ComboboxItem = {
      id: 'all',
      code: 'الكل',
      name: 'جميع الموردين (كشف الحساب العام)',
      currentBalance: totalAllSuppliersBalance,
    };
    return [allItem, ...suppliers];
  }, [suppliers, totalAllSuppliersBalance]);

  // Is "All Suppliers" currently selected
  const isAllSuppliers = selectedSupplierId === 'all';

  // Selected Supplier Object (null if 'all' is selected)
  const selectedSupplier = useMemo(() => {
    if (isAllSuppliers) return null;
    return suppliers.find((s) => s.id === selectedSupplierId) || null;
  }, [suppliers, selectedSupplierId, isAllSuppliers]);

  // Suppliers map for rapid lookup in unified statement
  const suppliersMap = useMemo(() => {
    const map = new Map<string, Supplier>();
    suppliers.forEach((s) => map.set(s.id, s));
    return map;
  }, [suppliers]);

  // Filtered Supplier Table (Right Page)
  const filteredSuppliers = useMemo(() => {
    return suppliers.filter((s) => {
      const q = tableSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        s.name.toLowerCase().includes(q) ||
        s.code.toLowerCase().includes(q) ||
        s.phone.includes(q) ||
        (s.address && s.address.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (filterBalance === 'creditors') return s.currentBalance > 0;
      if (filterBalance === 'zero') return s.currentBalance === 0;
      return true;
    });
  }, [suppliers, tableSearch, filterBalance]);

  // Transactions to display: If 'all' -> all supplier transactions, else selected supplier's transactions
  const statementTransactions = useMemo(() => {
    if (isAllSuppliers) {
      return transactions
        .filter((t) => t.accountType === 'supplier')
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.id.localeCompare(b.id));
    }
    if (!selectedSupplier) return [];
    return transactions
      .filter((t) => t.accountType === 'supplier' && t.accountId === selectedSupplier.id)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.id.localeCompare(b.id));
  }, [transactions, selectedSupplier, isAllSuppliers]);

  // Filtered by date range
  const filteredStatementTx = useMemo(() => {
    return statementTransactions.filter((t) => {
      if (fromDate && t.date < fromDate) return false;
      if (toDate && t.date > toDate) return false;
      return true;
    });
  }, [statementTransactions, fromDate, toDate]);

  // Running balance for each statement row (Supplier balance: Purchases increase credit, Payments decrease credit)
  const statementRows = useMemo(() => {
    let r = 0;
    return filteredStatementTx.map((tx) => {
      r = r + (tx.credit || 0) - (tx.debit || 0);
      const acc = suppliersMap.get(tx.accountId);
      return {
        ...tx,
        supplierName: acc?.name || 'مورد',
        supplierCode: acc?.code || '',
        runningBalance: r,
      };
    });
  }, [filteredStatementTx, suppliersMap]);

  const totalPurchases = useMemo(() => {
    return filteredStatementTx
      .filter((t) => t.type === 'purchase' || t.credit > 0)
      .reduce((sum, t) => sum + (t.credit || t.amount), 0);
  }, [filteredStatementTx]);

  const totalPayments = useMemo(() => {
    return filteredStatementTx
      .filter((t) => t.type === 'supplier_payment' || t.debit > 0)
      .reduce((sum, t) => sum + (t.debit || t.amount), 0);
  }, [filteredStatementTx]);

  // Edit action
  const handleStartEdit = (s: Supplier, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsEditing(true);
    setEditingSupplierId(s.id);
    setName(s.name);
    setPhone(s.phone || '');
    setAddress(s.address || '');
    setNotes(s.notes || '');
    setOpeningBalance(s.openingBalance || 0);
    setFormError('');
    setFormSuccess('');
    setShowForm(true);
  };

  // Reset Form
  const handleResetForm = () => {
    setIsEditing(false);
    setEditingSupplierId(null);
    setName('');
    setPhone('');
    setAddress('');
    setNotes('');
    setOpeningBalance(0);
    setFormError('');
    setFormSuccess('');
    setShowForm(false);
  };

  // Submit Add / Update
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('اسم المورد مطلوب');
      return;
    }

    try {
      if (isEditing && editingSupplierId) {
        onUpdateSupplier(editingSupplierId, {
          name: name.trim(),
          phone: phone.trim(),
          address: address.trim(),
          notes: notes.trim(),
        });
        setFormSuccess(`تم تحديث بيانات المورد "${name.trim()}" بنجاح`);
      } else {
        onAddSupplier({
          name: name.trim(),
          phone: phone.trim(),
          address: address.trim(),
          notes: notes.trim(),
          openingBalance: Number(openingBalance) || 0,
        });
        setFormSuccess(`تمت إضافة المورد "${name.trim()}" بنجاح`);
      }
      setTimeout(() => {
        handleResetForm();
      }, 1500);
    } catch (err: any) {
      setFormError(err.message || 'حدث خطأ أثناء الحفظ');
    }
  };

  // Delete Supplier
  const handleDelete = (s: Supplier, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`هل أنت متأكد من حذف المورد "${s.name}"؟ لا يمكن التراجع عن هذا الإجراء.`)) {
      onDeleteSupplier(s.id);
      if (selectedSupplierId === s.id) {
        setSelectedSupplierId('all');
      }
    }
  };

  // Print Statement
  const handlePrintStatement = () => {
    const title = isAllSuppliers
      ? 'كشف الحساب العام لجميع الموردين'
      : `كشف حساب المورد: ${selectedSupplier?.name} (${selectedSupplier?.code})`;
    const accountName = isAllSuppliers ? 'جميع الموردين' : selectedSupplier?.name || 'المورد';
    const balance = isAllSuppliers ? totalAllSuppliersBalance : selectedSupplier?.currentBalance || 0;

    onPrintPreview(
      title,
      accountName,
      filteredStatementTx,
      balance,
      true
    );
  };

  // Export Excel / CSV
  const handleExportStatement = () => {
    const headers = isAllSuppliers
      ? ['التاريخ', 'رقم المستند', 'كود المورد', 'اسم المورد', 'البيان', 'مشتريات/توريد (له)', 'تسديدات/صرف (مدفوع)', 'الرصيد المستحق', 'العملة']
      : ['التاريخ', 'رقم المستند', 'نوع الحركة', 'البيان', 'مشتريات/توريد (له)', 'تسديدات/صرف (مدفوع)', 'الرصيد المستحق', 'العملة'];

    const rows = statementRows.map((r) => {
      if (isAllSuppliers) {
        return [
          r.date,
          r.documentNo,
          r.supplierCode,
          r.supplierName,
          r.description,
          r.credit > 0 ? r.credit : '',
          r.debit > 0 ? r.debit : '',
          r.runningBalance,
          settings.currency,
        ];
      }
      return [
        r.date,
        r.documentNo,
        r.type === 'purchase' ? 'شراء آجل' : 'تسديد',
        r.description,
        r.credit > 0 ? r.credit : '',
        r.debit > 0 ? r.debit : '',
        r.runningBalance,
        settings.currency,
      ];
    });

    const docTitle = isAllSuppliers
      ? 'كشف حساب مستحقات الموردين العام'
      : `كشف حساب المورد: ${selectedSupplier?.name || ''}`;

    const subtitle = isAllSuppliers
      ? `إجمالي المستحقات للموردين: ${totalAllSuppliersBalance.toLocaleString()} ${settings.currency} • عدد الحركات: ${statementRows.length}`
      : `كود المورد: ${selectedSupplier?.code} • إجمالي المستحق: ${selectedSupplier?.currentBalance.toLocaleString()} ${settings.currency}`;

    if (onOpenExcelPreview) {
      onOpenExcelPreview(docTitle, headers, rows, {
        subtitle,
        filename: isAllSuppliers ? 'كشف_مستحقات_الموردين_العام' : `كشف_حساب_${selectedSupplier?.name}`,
        summaryStats: [
          { label: 'إجمالي المشتريات/التوريد', value: `${totalPurchases.toLocaleString()} ${settings.currency}` },
          { label: 'إجمالي المدفوعات/الصرف', value: `${totalPayments.toLocaleString()} ${settings.currency}` },
          { label: 'الرصيد المستحق', value: `${(totalPurchases - totalPayments).toLocaleString()} ${settings.currency}` }
        ]
      });
      return;
    }

    const csvContent = '\uFEFF' + [headers, ...rows].map((e) => e.map((val) => `"${val}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = isAllSuppliers
      ? `كشف_الحساب_العام_لجميع_الموردين_${new Date().toISOString().slice(0, 10)}.csv`
      : `كشف_حساب_مورد_${(selectedSupplier?.name || 'مورد').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full h-full flex flex-col min-h-0 overflow-hidden">
      {/* THE INTEGRATED TWO-PAGE SPREAD: Right Page = Supplier Directory & Management, Left Page = Supplier Ledger Statement */}
      <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 flex-1 min-h-0 overflow-hidden">
        {/* Central Gutter Crease Shadow (طية وتجليد منتصف الدفتر) */}
        <div className="hidden lg:block absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-8 book-spine-crease z-20 pointer-events-none" />

        {/* ======================================================== */}
        {/* RIGHT PAGE: إضافة وتعديل وحذف وجدول الموردين */}
        {/* ======================================================== */}
        <div className="flex flex-col h-full bg-[#fdfbf7] rounded-xl border-2 border-stone-300 shadow-sm p-3 min-h-0 overflow-hidden">
          {/* Right Page Header */}
          <div className="shrink-0 pb-2 mb-2 border-b-2 border-blue-900/30 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-blue-800 text-blue-200 flex items-center justify-center font-bold shadow-xs">
                <Building2 size={15} />
              </div>
              <div>
                <h2 className="font-amiri font-bold text-sm sm:text-base text-stone-900 leading-tight">
                  دليل وإدارة الموردين
                </h2>
                <span className="text-[10px] text-stone-500 font-mono">
                  إجمالي الموردين: {suppliers.length} • المستحق لهم: {suppliers.filter((s) => s.currentBalance > 0).length}
                </span>
              </div>
            </div>

            {/* Toggle Add / Cancel Button */}
            <button
              onClick={() => {
                if (showForm) {
                  handleResetForm();
                } else {
                  setShowForm(true);
                  setIsEditing(false);
                  setEditingSupplierId(null);
                }
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-xs ${
                showForm
                  ? 'bg-stone-200 hover:bg-stone-300 text-stone-800 border border-stone-400'
                  : 'bg-blue-700 hover:bg-blue-600 text-white border border-blue-800'
              }`}
            >
              {showForm ? (
                <>
                  <X size={13} />
                  <span>إخفاء النموذج</span>
                </>
              ) : (
                <>
                  <PlusCircle size={13} />
                  <span>+ إضافة مورد جديد</span>
                </>
              )}
            </button>
          </div>

          {/* Form: Add / Edit Supplier Form directly on Right Page */}
          {showForm && (
            <div className="shrink-0 bg-white p-2.5 mb-2.5 rounded-xl border border-blue-300 shadow-xs animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-blue-200 text-xs font-bold text-blue-950">
                <span className="flex items-center gap-1">
                  <Edit size={12} className="text-blue-700" />
                  <span>{isEditing ? `تعديل بيانات: ${name}` : 'بيانات المورد الجديد'}</span>
                </span>
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="text-stone-400 hover:text-stone-700"
                >
                  <X size={14} />
                </button>
              </div>

              {formError && (
                <div className="p-1.5 mb-2 rounded bg-red-100 border border-red-300 text-red-900 text-[11px] font-bold flex items-center gap-1">
                  <AlertCircle size={13} className="text-red-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {formSuccess && (
                <div className="p-1.5 mb-2 rounded bg-emerald-100 border border-emerald-300 text-emerald-900 text-[11px] font-bold flex items-center gap-1">
                  <CheckCircle2 size={13} className="text-emerald-600 shrink-0" />
                  <span>{formSuccess}</span>
                </div>
              )}

              <form onSubmit={handleSubmitForm} className="space-y-2 text-xs">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-stone-700 mb-0.5">
                      اسم المورد / الشركة *
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="مثال: شركة النور للتجهيزات..."
                      className="w-full px-2 py-1 bg-stone-50 border border-stone-300 rounded text-stone-900 text-xs focus:bg-white focus:outline-none focus:border-blue-600"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-stone-700 mb-0.5">
                      رقم الهاتف
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="07..."
                      dir="ltr"
                      className="w-full px-2 py-1 bg-stone-50 border border-stone-300 rounded text-stone-900 text-xs focus:bg-white focus:outline-none focus:border-blue-600 text-right"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-stone-700 mb-0.5">
                      العنوان والمقر
                    </label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="مثال: البصرة - العشار"
                      className="w-full px-2 py-1 bg-stone-50 border border-stone-300 rounded text-stone-900 text-xs focus:bg-white focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  {!isEditing ? (
                    <div>
                      <label className="block text-[10px] font-semibold text-stone-700 mb-0.5">
                        الرصيد الافتتاحي المستحق للمورد
                      </label>
                      <FormattedAmountInput
                        value={openingBalance}
                        onChange={(num) => setOpeningBalance(num)}
                        placeholder="0"
                        className="w-full px-1.5 py-1 bg-stone-50 border border-stone-300 rounded text-stone-900 text-xs font-mono font-bold focus:bg-white focus:outline-none focus:border-blue-600"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-[10px] font-semibold text-stone-700 mb-0.5">
                        ملاحظات
                      </label>
                      <input
                        type="text"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="ملاحظات الحساب..."
                        className="w-full px-2 py-1 bg-stone-50 border border-stone-300 rounded text-stone-900 text-xs focus:bg-white focus:outline-none focus:border-blue-600"
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={handleResetForm}
                    className="px-2.5 py-1 rounded bg-stone-200 hover:bg-stone-300 text-stone-700 text-xs font-semibold cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 rounded bg-blue-700 hover:bg-blue-600 text-white font-bold text-xs flex items-center gap-1 shadow-xs cursor-pointer"
                  >
                    <Save size={12} />
                    <span>{isEditing ? 'تحديث المورد' : 'حفظ المورد'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Table Search & Filter Bar */}
          <div className="shrink-0 flex items-center justify-between gap-1.5 pb-2 mb-2 border-b border-stone-200">
            <div className="relative flex-1 min-w-0">
              <Search size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 pointer-events-none" />
              <input
                type="text"
                placeholder="بحث في جدول الموردين..."
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                className="w-full pl-2 pr-7 py-1 bg-white border border-stone-300 rounded-lg text-stone-900 text-xs focus:outline-none focus:border-blue-600"
              />
              {tableSearch && (
                <button
                  onClick={() => setTableSearch('')}
                  className="absolute left-2 top-1/2 -translate-y-1/2 text-[10px] text-stone-400 hover:text-stone-700"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filter pills */}
            <div className="flex items-center gap-1 text-[10px] shrink-0">
              <button
                type="button"
                onClick={() => setFilterBalance('all')}
                className={`px-2 py-0.5 rounded font-bold cursor-pointer transition-colors ${
                  filterBalance === 'all'
                    ? 'bg-blue-800 text-blue-100'
                    : 'bg-stone-200/80 text-stone-700 hover:bg-stone-300'
                }`}
              >
                الكل ({suppliers.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterBalance('creditors')}
                className={`px-2 py-0.5 rounded font-bold cursor-pointer transition-colors ${
                  filterBalance === 'creditors'
                    ? 'bg-blue-900 text-blue-100'
                    : 'bg-stone-200/80 text-stone-700 hover:bg-stone-300'
                }`}
              >
                له مستحق ({suppliers.filter((s) => s.currentBalance > 0).length})
              </button>
            </div>
          </div>

          {/* THE SUPPLIER TABLE: Fills remaining height, scrolls internally, never exceeds current page bounds */}
          <div className="flex-1 min-h-0 overflow-y-auto rounded-lg border border-stone-300 bg-white shadow-inner">
            {filteredSuppliers.length === 0 ? (
              <div className="p-6 text-center text-xs text-stone-500">
                لا يوجد موردين مطابقين للبحث
              </div>
            ) : (
              <table className="w-full text-right text-xs border-collapse">
                <thead className="sticky top-0 bg-[#f4efe4] text-stone-800 border-b border-stone-300 z-10 text-[11px] font-bold">
                  <tr>
                    <th className="p-2 border-l border-stone-300 w-16">الكود</th>
                    <th className="p-2 border-l border-stone-300">الاسم والبيانات</th>
                    <th className="p-2 border-l border-stone-300 text-left">المستحق الحالي</th>
                    <th className="p-2 text-center w-20">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {filteredSuppliers.map((s) => {
                    const isSelected = selectedSupplierId === s.id;
                    return (
                      <tr
                        key={s.id}
                        onClick={() => setSelectedSupplierId(s.id)}
                        className={`transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-blue-100/90 font-semibold ring-1 ring-inset ring-blue-600/40'
                            : 'hover:bg-blue-50/60'
                        }`}
                      >
                        <td className="p-2 border-l border-stone-200 font-mono text-[11px] text-stone-600">
                          <span className="bg-stone-100 px-1 py-0.5 rounded border border-stone-300">
                            {s.code}
                          </span>
                        </td>
                        <td className="p-2 border-l border-stone-200">
                          <div className="font-bold text-stone-900 leading-tight">
                            {s.name}
                          </div>
                          {s.phone && (
                            <div className="text-[10px] text-stone-500 font-mono flex items-center gap-1 mt-0.5" dir="ltr">
                              <span>{s.phone}</span>
                              <Phone size={9} className="text-stone-400" />
                            </div>
                          )}
                        </td>
                        <td className="p-2 border-l border-stone-200 text-left font-mono">
                          <span
                            className={`font-black text-xs ${
                              s.currentBalance > 0
                                ? 'text-blue-800'
                                : s.currentBalance === 0
                                ? 'text-emerald-700'
                                : 'text-amber-700'
                            }`}
                          >
                            {s.currentBalance.toLocaleString()} {settings.currency}
                          </span>
                          <span className="block text-[9px] text-stone-400">
                            {s.currentBalance > 0 ? 'مستحق له' : s.currentBalance === 0 ? 'مصفى' : 'مدين'}
                          </span>
                        </td>
                        <td className="p-2 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            {/* View statement button */}
                            <button
                              type="button"
                              onClick={() => setSelectedSupplierId(s.id)}
                              className={`p-1 rounded transition-colors ${
                                isSelected
                                  ? 'bg-blue-800 text-white'
                                  : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                              }`}
                              title="عرض كشف الحساب"
                            >
                              <Eye size={12} />
                            </button>
                            {/* Edit button */}
                            <button
                              type="button"
                              onClick={(e) => handleStartEdit(s, e)}
                              className="p-1 rounded bg-stone-100 hover:bg-blue-100 text-stone-700 hover:text-blue-900 transition-colors"
                              title="تعديل بيانات المورد"
                            >
                              <Edit size={12} />
                            </button>
                            {/* Delete button */}
                            <button
                              type="button"
                              onClick={(e) => handleDelete(s, e)}
                              className="p-1 rounded bg-stone-100 hover:bg-red-100 text-stone-700 hover:text-red-900 transition-colors"
                              title="حذف المورد"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* ======================================================== */}
        {/* LEFT PAGE: كشف حساب الموردين وحقل البحث الديناميكي */}
        {/* ======================================================== */}
        <div className="flex flex-col h-full bg-[#fdfbf7] rounded-xl border-2 border-stone-300 shadow-sm p-3 min-h-0 overflow-hidden">
          {/* Left Page Header with Dynamic Search Combobox (يتضمن "جميع الموردين") */}
          <div className="shrink-0 pb-2 mb-2 border-b-2 border-blue-900/30 flex flex-wrap items-center justify-between gap-2">
            {/* Dynamic Search Combobox to pick supplier or "جميع الموردين" */}
            <div className="flex-1 min-w-[260px] max-w-full">
              <DynamicSearchCombobox
                label="كشف حساب الموردين"
                items={comboboxItems}
                selectedId={selectedSupplierId}
                onSelect={(id) => setSelectedSupplierId(id)}
                currency={settings.currency}
                accountTypeLabel="المورد"
                accentColor="blue"
                placeholder="ابحث أو اختر (جميع الموردين) أو اكتب حرفين..."
              />
            </div>

            {/* Statement Action Buttons (الطباعة وتصدير Excel فقط - تم حذف الأزرار غير المرتبطة بالموردين) */}
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={handleExportStatement}
                className="p-1 px-2.5 rounded bg-white hover:bg-stone-100 text-stone-700 border border-stone-300 text-xs font-semibold flex items-center gap-1 shadow-xs cursor-pointer"
                title="تصدير كشف الحساب إلى Excel"
              >
                <FileSpreadsheet size={13} className="text-emerald-600" />
                <span className="text-[11px]">تصدير Excel</span>
              </button>
              <button
                type="button"
                onClick={handlePrintStatement}
                className="p-1 px-3 rounded bg-blue-700 hover:bg-blue-600 text-white font-bold text-xs flex items-center gap-1 shadow-xs cursor-pointer"
                title="طباعة كشف الحساب الرسمي"
              >
                <Printer size={13} />
                <span className="text-[11px]">طباعة الكشف</span>
              </button>
            </div>
          </div>

          {/* Statement Summary Card */}
          <div className="shrink-0 bg-white p-2.5 mb-2 rounded-xl border border-stone-300 shadow-xs flex flex-wrap items-center justify-between gap-2 text-xs">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-amiri font-bold text-sm text-stone-900">
                  {isAllSuppliers ? 'كشف الحساب العام لجميع الموردين' : selectedSupplier?.name}
                </span>
                <span className="font-mono text-[10px] font-bold bg-blue-100 text-blue-900 px-1.5 py-0.2 rounded border border-blue-300">
                  {isAllSuppliers ? `العدد: ${suppliers.length} مورد` : selectedSupplier?.code}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-stone-500 mt-0.5 font-mono">
                {isAllSuppliers ? (
                  <span>كافة حركات الشراء والتوريد والصرف المسجلة بالدفتر</span>
                ) : (
                  <>
                    {selectedSupplier?.phone && <span>الهاتف: {selectedSupplier.phone}</span>}
                    {selectedSupplier?.address && <span>• {selectedSupplier.address}</span>}
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-[10px] text-stone-500 block">إجمالي المشتريات:</span>
                <span className="font-mono font-bold text-blue-700 text-xs">
                  {totalPurchases.toLocaleString()} {settings.currency}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-stone-500 block">إجمالي المسدد:</span>
                <span className="font-mono font-bold text-emerald-700 text-xs">
                  {totalPayments.toLocaleString()} {settings.currency}
                </span>
              </div>
              <div className="bg-stone-900 text-stone-100 px-3 py-1 rounded-lg border border-blue-500/50 text-right">
                <span className="text-[10px] text-blue-300 block">
                  {isAllSuppliers ? 'إجمالي مستحقات الموردين:' : 'الرصيد المستحق:'}
                </span>
                <span
                  className={`font-mono font-black text-xs sm:text-sm ${
                    (isAllSuppliers ? totalAllSuppliersBalance : selectedSupplier?.currentBalance || 0) > 0
                      ? 'text-blue-300'
                      : (isAllSuppliers ? totalAllSuppliersBalance : selectedSupplier?.currentBalance || 0) === 0
                      ? 'text-emerald-400'
                      : 'text-amber-400'
                  }`}
                >
                  {(isAllSuppliers ? totalAllSuppliersBalance : selectedSupplier?.currentBalance || 0).toLocaleString()} {settings.currency}
                </span>
              </div>
            </div>
          </div>

          {/* Date Filter Strip for Statement */}
          <div className="shrink-0 flex items-center justify-between gap-2 pb-1.5 mb-1.5 border-b border-stone-200 text-[11px] text-stone-600">
            <span className="font-bold flex items-center gap-1">
              <Calendar size={12} className="text-stone-500" />
              <span>
                {isAllSuppliers ? 'حركات جميع الموردين' : 'حركات المورد'} ({statementRows.length} حركة):
              </span>
            </span>
            <div className="flex items-center gap-1.5 text-[10px]">
              <span>من:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="px-1.5 py-0.5 bg-white border border-stone-300 rounded text-stone-800 text-[10px]"
              />
              <span>إلى:</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="px-1.5 py-0.5 bg-white border border-stone-300 rounded text-stone-800 text-[10px]"
              />
              {(fromDate || toDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setFromDate('');
                    setToDate('');
                  }}
                  className="text-stone-500 hover:text-stone-800 text-[10px] underline cursor-pointer"
                >
                  إعادة تعيين
                </button>
              )}
            </div>
          </div>

          {/* THE STATEMENT TABLE: Fills remaining height, scrolls internally, never exceeds current page bounds */}
          <div className="flex-1 min-h-0 overflow-y-auto rounded-lg border border-stone-300 bg-white shadow-inner">
            {statementRows.length === 0 ? (
              <div className="p-8 text-center text-xs text-stone-500">
                لا توجد حركات مالية مسجلة ضمن الفترة المحددة.
              </div>
            ) : (
              <table className="w-full text-right text-xs border-collapse">
                <thead className="sticky top-0 bg-[#f4efe4] text-stone-800 border-b border-stone-300 z-10 text-[11px] font-bold">
                  <tr>
                    <th className="p-2 border-l border-stone-300 w-20">التاريخ</th>
                    <th className="p-2 border-l border-stone-300 w-20">المستند</th>
                    {isAllSuppliers && (
                      <th className="p-2 border-l border-stone-300 w-28">المورد</th>
                    )}
                    <th className="p-2 border-l border-stone-300">البيان</th>
                    <th className="p-2 border-l border-stone-300 text-left text-blue-900 w-24">مشتريات (له)</th>
                    <th className="p-2 border-l border-stone-300 text-left text-emerald-900 w-24">تسديد/صرف (مدفوع)</th>
                    <th className="p-2 text-left w-24">الرصيد المستحق</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 font-mono text-[11px]">
                  {statementRows.map((tx) => (
                    <tr key={tx.id} className="hover:bg-blue-50/50 transition-colors">
                      <td className="p-2 border-l border-stone-200 text-stone-600 whitespace-nowrap">
                        {tx.date}
                      </td>
                      <td className="p-2 border-l border-stone-200 font-bold text-stone-800">
                        {tx.documentNo}
                      </td>
                      {isAllSuppliers && (
                        <td className="p-2 border-l border-stone-200 font-sans">
                          <span className="font-bold text-stone-900 block leading-tight truncate">
                            {tx.supplierName}
                          </span>
                          <span className="text-[9px] text-stone-400 font-mono">
                            {tx.supplierCode}
                          </span>
                        </td>
                      )}
                      <td className="p-2 border-l border-stone-200 font-sans text-stone-900">
                        <div>{tx.description}</div>
                        {tx.notes && <div className="text-[10px] text-stone-500">{tx.notes}</div>}
                      </td>
                      <td className="p-2 border-l border-stone-200 text-left font-bold text-blue-700">
                        {tx.credit > 0 ? tx.credit.toLocaleString() : '-'}
                      </td>
                      <td className="p-2 border-l border-stone-200 text-left font-bold text-emerald-700">
                        {tx.debit > 0 ? tx.debit.toLocaleString() : '-'}
                      </td>
                      <td className="p-2 text-left font-black text-stone-900">
                        {tx.runningBalance.toLocaleString()} {settings.currency}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
