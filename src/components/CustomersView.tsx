import React, { useState, useMemo } from 'react';
import {
  Users,
  UserPlus,
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
import { Customer, Transaction, StoreSettings } from '../types';
import { DynamicSearchCombobox, ComboboxItem } from './DynamicSearchCombobox';
import { FormattedAmountInput } from './FormattedAmountInput';

interface CustomersViewProps {
  settings: StoreSettings;
  customers: Customer[];
  transactions: Transaction[];
  onOpenLedger?: (customer: Customer) => void;
  onAddCustomer: (data: {
    name: string;
    phone: string;
    address: string;
    notes: string;
    openingBalance: number;
    balanceType: 'debit' | 'credit';
  }) => void;
  onUpdateCustomer: (id: string, updates: Partial<Customer>) => void;
  onDeleteCustomer: (id: string) => void;
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

export const CustomersView: React.FC<CustomersViewProps> = ({
  settings,
  customers,
  transactions,
  onAddCustomer,
  onUpdateCustomer,
  onDeleteCustomer,
  onPrintPreview,
  onOpenExcelPreview,
}) => {
  // Selected Customer for Left Page Statement - Default to 'all' (جميع الزبائن)
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('all');

  // Search and Filter for Right Page Customer Table
  const [tableSearch, setTableSearch] = useState('');
  const [filterBalance, setFilterBalance] = useState<'all' | 'debtors' | 'zero' | 'creditors'>('all');

  // Form State (Add / Edit inline directly in Right Page)
  const [isEditing, setIsEditing] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [notes, setNotes] = useState('');
  const [openingBalance, setOpeningBalance] = useState<number>(0);
  const [balanceType, setBalanceType] = useState<'debit' | 'credit'>('debit');
  const [formError, setFormError] = useState('');
  const [formSuccess, setFormSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);

  // Statement Date Range Filter (Left Page)
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Total debt across all customers
  const totalAllCustomersDebt = useMemo(() => {
    return customers.reduce((sum, c) => sum + (c.currentBalance || 0), 0);
  }, [customers]);

  // Combobox items including "جميع الزبائن" as first item
  const comboboxItems: ComboboxItem[] = useMemo(() => {
    const allItem: ComboboxItem = {
      id: 'all',
      code: 'الكل',
      name: 'جميع الزبائن (كشف الحساب العام)',
      currentBalance: totalAllCustomersDebt,
    };
    return [allItem, ...customers];
  }, [customers, totalAllCustomersDebt]);

  // Is "All Customers" currently selected
  const isAllCustomers = selectedCustomerId === 'all';

  // Selected Customer Object (null if 'all' is selected)
  const selectedCustomer = useMemo(() => {
    if (isAllCustomers) return null;
    return customers.find((c) => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId, isAllCustomers]);

  // Customer map for rapid lookup in unified statement
  const customersMap = useMemo(() => {
    const map = new Map<string, Customer>();
    customers.forEach((c) => map.set(c.id, c));
    return map;
  }, [customers]);

  // Filtered Customer Table (Right Page)
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const q = tableSearch.toLowerCase().trim();
      const matchesSearch =
        !q ||
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.phone.includes(q) ||
        (c.address && c.address.toLowerCase().includes(q));

      if (!matchesSearch) return false;

      if (filterBalance === 'debtors') return c.currentBalance > 0;
      if (filterBalance === 'zero') return c.currentBalance === 0;
      if (filterBalance === 'creditors') return c.currentBalance < 0;
      return true;
    });
  }, [customers, tableSearch, filterBalance]);

  // Transactions to display: If 'all' -> all customer transactions, else selected customer's transactions
  const statementTransactions = useMemo(() => {
    if (isAllCustomers) {
      return transactions
        .filter((t) => t.accountType === 'customer')
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.id.localeCompare(b.id));
    }
    if (!selectedCustomer) return [];
    return transactions
      .filter((t) => t.accountType === 'customer' && t.accountId === selectedCustomer.id)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.id.localeCompare(b.id));
  }, [transactions, selectedCustomer, isAllCustomers]);

  // Filtered by date range
  const filteredStatementTx = useMemo(() => {
    return statementTransactions.filter((t) => {
      if (fromDate && t.date < fromDate) return false;
      if (toDate && t.date > toDate) return false;
      return true;
    });
  }, [statementTransactions, fromDate, toDate]);

  // Running balance for each statement row
  const statementRows = useMemo(() => {
    let r = 0;
    return filteredStatementTx.map((tx) => {
      r = r + (tx.debit || 0) - (tx.credit || 0);
      const acc = customersMap.get(tx.accountId);
      return {
        ...tx,
        customerName: acc?.name || 'زبون',
        customerCode: acc?.code || '',
        runningBalance: r,
      };
    });
  }, [filteredStatementTx, customersMap]);

  const totalSales = useMemo(() => {
    return filteredStatementTx
      .filter((t) => t.type === 'sale' || t.debit > 0)
      .reduce((sum, t) => sum + (t.debit || t.amount), 0);
  }, [filteredStatementTx]);

  const totalPayments = useMemo(() => {
    return filteredStatementTx
      .filter((t) => t.type === 'customer_payment' || t.credit > 0)
      .reduce((sum, t) => sum + (t.credit || t.amount), 0);
  }, [filteredStatementTx]);

  // Edit action
  const handleStartEdit = (c: Customer, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsEditing(true);
    setEditingCustomerId(c.id);
    setName(c.name);
    setPhone(c.phone || '');
    setAddress(c.address || '');
    setNotes(c.notes || '');
    setOpeningBalance(c.openingBalance || 0);
    setBalanceType(c.balanceType || 'debit');
    setFormError('');
    setFormSuccess('');
    setShowForm(true);
  };

  // Reset Form
  const handleResetForm = () => {
    setIsEditing(false);
    setEditingCustomerId(null);
    setName('');
    setPhone('');
    setAddress('');
    setNotes('');
    setOpeningBalance(0);
    setBalanceType('debit');
    setFormError('');
    setFormSuccess('');
    setShowForm(false);
  };

  // Submit Add / Update
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('اسم الزبون مطلوب');
      return;
    }

    try {
      if (isEditing && editingCustomerId) {
        onUpdateCustomer(editingCustomerId, {
          name: name.trim(),
          phone: phone.trim(),
          address: address.trim(),
          notes: notes.trim(),
        });
        setFormSuccess(`تم تحديث بيانات الزبون "${name.trim()}" بنجاح`);
      } else {
        onAddCustomer({
          name: name.trim(),
          phone: phone.trim(),
          address: address.trim(),
          notes: notes.trim(),
          openingBalance: Number(openingBalance) || 0,
          balanceType,
        });
        setFormSuccess(`تمت إضافة الزبون "${name.trim()}" بنجاح`);
      }
      setTimeout(() => {
        handleResetForm();
      }, 1500);
    } catch (err: any) {
      setFormError(err.message || 'حدث خطأ أثناء الحفظ');
    }
  };

  // Delete Customer
  const handleDelete = (c: Customer, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`هل أنت متأكد من حذف الزبون "${c.name}"؟ لا يمكن التراجع عن هذا الإجراء.`)) {
      onDeleteCustomer(c.id);
      if (selectedCustomerId === c.id) {
        setSelectedCustomerId('all');
      }
    }
  };

  // Print Statement
  const handlePrintStatement = () => {
    const title = isAllCustomers
      ? 'كشف الحساب العام لجميع الزبائن'
      : `كشف حساب الزبون: ${selectedCustomer?.name} (${selectedCustomer?.code})`;
    const accountName = isAllCustomers ? 'جميع الزبائن' : selectedCustomer?.name || 'الزبون';
    const balance = isAllCustomers ? totalAllCustomersDebt : selectedCustomer?.currentBalance || 0;

    onPrintPreview(
      title,
      accountName,
      filteredStatementTx,
      balance,
      false
    );
  };

  // Export Excel / CSV
  const handleExportStatement = () => {
    const headers = isAllCustomers
      ? ['التاريخ', 'رقم المستند', 'كود الزبون', 'اسم الزبون', 'البيان', 'مبيعات (مدين)', 'تسديدات (دائن)', 'الرصيد التراكمي', 'العملة']
      : ['التاريخ', 'رقم المستند', 'نوع الحركة', 'البيان', 'مبيعات (مدين)', 'تسديدات (دائن)', 'الرصيد التراكمي', 'العملة'];

    const rows = statementRows.map((r) => {
      if (isAllCustomers) {
        return [
          r.date,
          r.documentNo,
          r.customerCode,
          r.customerName,
          r.description,
          r.debit > 0 ? r.debit : '',
          r.credit > 0 ? r.credit : '',
          r.runningBalance,
          settings.currency,
        ];
      }
      return [
        r.date,
        r.documentNo,
        r.type === 'sale' ? 'بيع آجل' : 'تسديد',
        r.description,
        r.debit > 0 ? r.debit : '',
        r.credit > 0 ? r.credit : '',
        r.runningBalance,
        settings.currency,
      ];
    });

    const docTitle = isAllCustomers
      ? 'كشف حساب الذمم المدينة العام لجميع الزبائن'
      : `كشف حساب الزبون: ${selectedCustomer?.name || ''}`;

    const subtitle = isAllCustomers
      ? `إجمالي الذمم المستحقة: ${totalAllCustomersDebt.toLocaleString()} ${settings.currency} • عدد الحركات: ${statementRows.length}`
      : `كود الحساب: ${selectedCustomer?.code} • صافي الرصيد المستحق: ${selectedCustomer?.currentBalance.toLocaleString()} ${settings.currency}`;

    if (onOpenExcelPreview) {
      onOpenExcelPreview(docTitle, headers, rows, {
        subtitle,
        filename: isAllCustomers ? 'كشف_ديون_الزبائن_العام' : `كشف_حساب_${selectedCustomer?.name}`,
        summaryStats: [
          { label: 'إجمالي المبيعات', value: `${totalSales.toLocaleString()} ${settings.currency}` },
          { label: 'إجمالي التحصيلات', value: `${totalPayments.toLocaleString()} ${settings.currency}` },
          { label: 'الرصيد الختامي', value: `${(totalSales - totalPayments).toLocaleString()} ${settings.currency}` }
        ]
      });
      return;
    }

    const csvContent = '\uFEFF' + [headers, ...rows].map((e) => e.map((val) => `"${val}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = isAllCustomers
      ? `كشف_الحساب_العام_لجميع_الزبائن_${new Date().toISOString().slice(0, 10)}.csv`
      : `كشف_حساب_${(selectedCustomer?.name || 'زبون').replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="w-full h-full flex flex-col min-h-0 overflow-hidden">
      {/* THE INTEGRATED TWO-PAGE SPREAD: Right Page = Customer Directory & Management, Left Page = Customer Ledger Statement */}
      <div className="relative grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 flex-1 min-h-0 overflow-hidden">
        {/* Central Gutter Crease Shadow (طية وتجليد منتصف الدفتر) */}
        <div className="hidden lg:block absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-8 book-spine-crease z-20 pointer-events-none" />

        {/* ======================================================== */}
        {/* RIGHT PAGE: إضافة وتعديل وحذف وجدول الزبائن */}
        {/* ======================================================== */}
        <div className="flex flex-col h-full bg-[#fdfbf7] rounded-xl border-2 border-stone-300 shadow-sm p-3 min-h-0 overflow-hidden">
          {/* Right Page Header */}
          <div className="shrink-0 pb-2 mb-2 border-b-2 border-amber-900/30 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-800 text-amber-200 flex items-center justify-center font-bold shadow-xs">
                <Users size={15} />
              </div>
              <div>
                <h2 className="font-amiri font-bold text-sm sm:text-base text-stone-900 leading-tight">
                  دليل وإدارة الزبائن
                </h2>
                <span className="text-[10px] text-stone-500 font-mono">
                  إجمالي الزبائن: {customers.length} • المسجلين بدين: {customers.filter((c) => c.currentBalance > 0).length}
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
                  setEditingCustomerId(null);
                }
              }}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-xs ${
                showForm
                  ? 'bg-stone-200 hover:bg-stone-300 text-stone-800 border border-stone-400'
                  : 'bg-amber-700 hover:bg-amber-600 text-white border border-amber-800'
              }`}
            >
              {showForm ? (
                <>
                  <X size={13} />
                  <span>إخفاء النموذج</span>
                </>
              ) : (
                <>
                  <UserPlus size={13} />
                  <span>+ إضافة زبون جديد</span>
                </>
              )}
            </button>
          </div>

          {/* Form: Add / Edit Customer Form directly on the Right Page */}
          {showForm && (
            <div className="shrink-0 bg-white p-2.5 mb-2.5 rounded-xl border border-amber-300 shadow-xs animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-1.5 mb-2 border-b border-amber-200 text-xs font-bold text-amber-950">
                <span className="flex items-center gap-1">
                  <Edit size={12} className="text-amber-700" />
                  <span>{isEditing ? `تعديل بيانات: ${name}` : 'بيانات الزبون الجديد'}</span>
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
                      اسم الزبون الكامل *
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="مثال: أحمد عبد الله..."
                      className="w-full px-2 py-1 bg-stone-50 border border-stone-300 rounded text-stone-900 text-xs focus:bg-white focus:outline-none focus:border-amber-600"
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
                      className="w-full px-2 py-1 bg-stone-50 border border-stone-300 rounded text-stone-900 text-xs focus:bg-white focus:outline-none focus:border-amber-600 text-right"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-stone-700 mb-0.5">
                      العنوان / المنطقة
                    </label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="مثال: بغداد - الكرادة"
                      className="w-full px-2 py-1 bg-stone-50 border border-stone-300 rounded text-stone-900 text-xs focus:bg-white focus:outline-none focus:border-amber-600"
                    />
                  </div>

                  {!isEditing && (
                    <div className="grid grid-cols-2 gap-1">
                      <div>
                        <label className="block text-[10px] font-semibold text-stone-700 mb-0.5 truncate">
                          رصيد افتتاحي
                        </label>
                        <FormattedAmountInput
                          value={openingBalance}
                          onChange={(num) => setOpeningBalance(num)}
                          placeholder="0"
                          className="w-full px-1.5 py-1 bg-stone-50 border border-stone-300 rounded text-stone-900 text-xs font-mono font-bold focus:bg-white focus:outline-none focus:border-amber-600"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-stone-700 mb-0.5 truncate">
                          النوع
                        </label>
                        <select
                          value={balanceType}
                          onChange={(e) => setBalanceType(e.target.value as 'debit' | 'credit')}
                          className="w-full px-1 py-1 bg-stone-50 border border-stone-300 rounded text-stone-900 text-[11px] focus:bg-white focus:outline-none focus:border-amber-600"
                        >
                          <option value="debit">مدين (عليه دين)</option>
                          <option value="credit">دائن (له رصيد)</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {isEditing && (
                    <div>
                      <label className="block text-[10px] font-semibold text-stone-700 mb-0.5">
                        ملاحظات
                      </label>
                      <input
                        type="text"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="ملاحظات الحساب..."
                        className="w-full px-2 py-1 bg-stone-50 border border-stone-300 rounded text-stone-900 text-xs focus:bg-white focus:outline-none focus:border-amber-600"
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
                    className="px-3 py-1 rounded bg-amber-700 hover:bg-amber-600 text-white font-bold text-xs flex items-center gap-1 shadow-xs cursor-pointer"
                  >
                    <Save size={12} />
                    <span>{isEditing ? 'تحديث الزبون' : 'حفظ الزبون'}</span>
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
                placeholder="بحث في جدول الزبائن..."
                value={tableSearch}
                onChange={(e) => setTableSearch(e.target.value)}
                className="w-full pl-2 pr-7 py-1 bg-white border border-stone-300 rounded-lg text-stone-900 text-xs focus:outline-none focus:border-amber-600"
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
                    ? 'bg-amber-800 text-amber-100'
                    : 'bg-stone-200/80 text-stone-700 hover:bg-stone-300'
                }`}
              >
                الكل ({customers.length})
              </button>
              <button
                type="button"
                onClick={() => setFilterBalance('debtors')}
                className={`px-2 py-0.5 rounded font-bold cursor-pointer transition-colors ${
                  filterBalance === 'debtors'
                    ? 'bg-red-800 text-red-100'
                    : 'bg-stone-200/80 text-stone-700 hover:bg-stone-300'
                }`}
              >
                عليه دين ({customers.filter((c) => c.currentBalance > 0).length})
              </button>
            </div>
          </div>

          {/* THE CUSTOMER TABLE: Fills remaining height, scrolls internally, never exceeds current page bounds */}
          <div className="flex-1 min-h-0 overflow-y-auto rounded-lg border border-stone-300 bg-white shadow-inner">
            {filteredCustomers.length === 0 ? (
              <div className="p-6 text-center text-xs text-stone-500">
                لا يوجد زبائن مطابقين للبحث
              </div>
            ) : (
              <table className="w-full text-right text-xs border-collapse">
                <thead className="sticky top-0 bg-[#f4efe4] text-stone-800 border-b border-stone-300 z-10 text-[11px] font-bold">
                  <tr>
                    <th className="p-2 border-l border-stone-300 w-16">الكود</th>
                    <th className="p-2 border-l border-stone-300">الاسم والبيانات</th>
                    <th className="p-2 border-l border-stone-300 text-left">الرصيد الحالي</th>
                    <th className="p-2 text-center w-20">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200">
                  {filteredCustomers.map((c) => {
                    const isSelected = selectedCustomerId === c.id;
                    return (
                      <tr
                        key={c.id}
                        onClick={() => setSelectedCustomerId(c.id)}
                        className={`transition-colors cursor-pointer ${
                          isSelected
                            ? 'bg-amber-100/90 font-semibold ring-1 ring-inset ring-amber-600/40'
                            : 'hover:bg-amber-50/60'
                        }`}
                      >
                        <td className="p-2 border-l border-stone-200 font-mono text-[11px] text-stone-600">
                          <span className="bg-stone-100 px-1 py-0.5 rounded border border-stone-300">
                            {c.code}
                          </span>
                        </td>
                        <td className="p-2 border-l border-stone-200">
                          <div className="font-bold text-stone-900 leading-tight">
                            {c.name}
                          </div>
                          {c.phone && (
                            <div className="text-[10px] text-stone-500 font-mono flex items-center gap-1 mt-0.5" dir="ltr">
                              <span>{c.phone}</span>
                              <Phone size={9} className="text-stone-400" />
                            </div>
                          )}
                        </td>
                        <td className="p-2 border-l border-stone-200 text-left font-mono">
                          <span
                            className={`font-black text-xs ${
                              c.currentBalance > 0
                                ? 'text-red-700'
                                : c.currentBalance === 0
                                ? 'text-emerald-700'
                                : 'text-blue-700'
                            }`}
                          >
                            {c.currentBalance.toLocaleString()} {settings.currency}
                          </span>
                          <span className="block text-[9px] text-stone-400">
                            {c.currentBalance > 0 ? 'مطلوب دين' : c.currentBalance === 0 ? 'مصفى' : 'له رصيد'}
                          </span>
                        </td>
                        <td className="p-2 text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-center gap-1">
                            {/* View statement button */}
                            <button
                              type="button"
                              onClick={() => setSelectedCustomerId(c.id)}
                              className={`p-1 rounded transition-colors ${
                                isSelected
                                  ? 'bg-amber-800 text-white'
                                  : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                              }`}
                              title="عرض كشف الحساب"
                            >
                              <Eye size={12} />
                            </button>
                            {/* Edit button */}
                            <button
                              type="button"
                              onClick={(e) => handleStartEdit(c, e)}
                              className="p-1 rounded bg-stone-100 hover:bg-amber-100 text-stone-700 hover:text-amber-900 transition-colors"
                              title="تعديل بيانات الزبون"
                            >
                              <Edit size={12} />
                            </button>
                            {/* Delete button */}
                            <button
                              type="button"
                              onClick={(e) => handleDelete(c, e)}
                              className="p-1 rounded bg-stone-100 hover:bg-red-100 text-stone-700 hover:text-red-900 transition-colors"
                              title="حذف الزبون"
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
        {/* LEFT PAGE: كشف حساب الزبائن وحقل البحث الديناميكي */}
        {/* ======================================================== */}
        <div className="flex flex-col h-full bg-[#fdfbf7] rounded-xl border-2 border-stone-300 shadow-sm p-3 min-h-0 overflow-hidden">
          {/* Left Page Header with Dynamic Search Combobox (يتضمن "جميع الزبائن") */}
          <div className="shrink-0 pb-2 mb-2 border-b-2 border-amber-900/30 flex flex-wrap items-center justify-between gap-2">
            {/* Dynamic Search Combobox to pick customer or "جميع الزبائن" */}
            <div className="flex-1 min-w-[260px] max-w-full">
              <DynamicSearchCombobox
                label="كشف حساب الزبائن"
                items={comboboxItems}
                selectedId={selectedCustomerId}
                onSelect={(id) => setSelectedCustomerId(id)}
                currency={settings.currency}
                accountTypeLabel="الزبون"
                accentColor="amber"
                placeholder="ابحث أو اختر (جميع الزبائن) أو اكتب حرفين..."
              />
            </div>

            {/* Statement Action Buttons (الطباعة وتصدير Excel فقط - تم حذف الأزرار غير المرتبطة بالزبائن) */}
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
                className="p-1 px-3 rounded bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs flex items-center gap-1 shadow-xs cursor-pointer"
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
                  {isAllCustomers ? 'كشف الحساب العام لجميع الزبائن' : selectedCustomer?.name}
                </span>
                <span className="font-mono text-[10px] font-bold bg-amber-100 text-amber-900 px-1.5 py-0.2 rounded border border-amber-300">
                  {isAllCustomers ? `العدد: ${customers.length} زبون` : selectedCustomer?.code}
                </span>
              </div>
              <div className="flex items-center gap-2 text-[10px] text-stone-500 mt-0.5 font-mono">
                {isAllCustomers ? (
                  <span>كافة حركات البيع الآجل والقبض المسجلة بالدفتر</span>
                ) : (
                  <>
                    {selectedCustomer?.phone && <span>الهاتف: {selectedCustomer.phone}</span>}
                    {selectedCustomer?.address && <span>• {selectedCustomer.address}</span>}
                  </>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="text-right">
                <span className="text-[10px] text-stone-500 block">إجمالي المبيعات:</span>
                <span className="font-mono font-bold text-red-700 text-xs">
                  {totalSales.toLocaleString()} {settings.currency}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-stone-500 block">إجمالي المقبوضات:</span>
                <span className="font-mono font-bold text-emerald-700 text-xs">
                  {totalPayments.toLocaleString()} {settings.currency}
                </span>
              </div>
              <div className="bg-stone-900 text-stone-100 px-3 py-1 rounded-lg border border-amber-500/50 text-right">
                <span className="text-[10px] text-amber-400 block">
                  {isAllCustomers ? 'إجمالي ديون الزبائن:' : 'الرصيد التراكمي:'}
                </span>
                <span
                  className={`font-mono font-black text-xs sm:text-sm ${
                    (isAllCustomers ? totalAllCustomersDebt : selectedCustomer?.currentBalance || 0) > 0
                      ? 'text-red-400'
                      : (isAllCustomers ? totalAllCustomersDebt : selectedCustomer?.currentBalance || 0) === 0
                      ? 'text-emerald-400'
                      : 'text-blue-400'
                  }`}
                >
                  {(isAllCustomers ? totalAllCustomersDebt : selectedCustomer?.currentBalance || 0).toLocaleString()} {settings.currency}
                </span>
              </div>
            </div>
          </div>

          {/* Date Filter Strip for Statement */}
          <div className="shrink-0 flex items-center justify-between gap-2 pb-1.5 mb-1.5 border-b border-stone-200 text-[11px] text-stone-600">
            <span className="font-bold flex items-center gap-1">
              <Calendar size={12} className="text-stone-500" />
              <span>
                {isAllCustomers ? 'حركات جميع الزبائن' : 'حركات الزبون'} ({statementRows.length} حركة):
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
                    {isAllCustomers && (
                      <th className="p-2 border-l border-stone-300 w-28">الزبون</th>
                    )}
                    <th className="p-2 border-l border-stone-300">البيان</th>
                    <th className="p-2 border-l border-stone-300 text-left text-red-900 w-24">مدين (بيع)</th>
                    <th className="p-2 border-l border-stone-300 text-left text-emerald-900 w-24">دائن (تسديد)</th>
                    <th className="p-2 text-left w-24">الرصيد التراكمي</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 font-mono text-[11px]">
                  {statementRows.map((tx) => (
                    <tr key={tx.id} className="hover:bg-amber-50/50 transition-colors">
                      <td className="p-2 border-l border-stone-200 text-stone-600 whitespace-nowrap">
                        {tx.date}
                      </td>
                      <td className="p-2 border-l border-stone-200 font-bold text-stone-800">
                        {tx.documentNo}
                      </td>
                      {isAllCustomers && (
                        <td className="p-2 border-l border-stone-200 font-sans">
                          <span className="font-bold text-stone-900 block leading-tight truncate">
                            {tx.customerName}
                          </span>
                          <span className="text-[9px] text-stone-400 font-mono">
                            {tx.customerCode}
                          </span>
                        </td>
                      )}
                      <td className="p-2 border-l border-stone-200 font-sans text-stone-900">
                        <div>{tx.description}</div>
                        {tx.notes && <div className="text-[10px] text-stone-500">{tx.notes}</div>}
                      </td>
                      <td className="p-2 border-l border-stone-200 text-left font-bold text-red-700">
                        {tx.debit > 0 ? tx.debit.toLocaleString() : '-'}
                      </td>
                      <td className="p-2 border-l border-stone-200 text-left font-bold text-emerald-700">
                        {tx.credit > 0 ? tx.credit.toLocaleString() : '-'}
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
