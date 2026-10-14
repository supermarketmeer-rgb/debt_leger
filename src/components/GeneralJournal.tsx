import React, { useState } from 'react';
import {
  FileSpreadsheet,
  Search,
  Printer,
  Calendar,
  Filter,
  Users,
  Building2,
  DollarSign,
  PlusCircle,
  BookOpen,
  Columns,
  List
} from 'lucide-react';
import { Transaction, StoreSettings, Customer, Supplier } from '../types';

interface GeneralJournalProps {
  settings: StoreSettings;
  transactions: Transaction[];
  customers: Customer[];
  suppliers: Supplier[];
  onOpenCustomerLedger: (c: Customer) => void;
  onOpenSupplierLedger: (s: Supplier) => void;
  onPrintPreview: (title: string, accountName: string, transactions: Transaction[], currentBalance: number) => void;
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

export const GeneralJournal: React.FC<GeneralJournalProps> = ({
  settings,
  transactions,
  customers,
  suppliers,
  onOpenCustomerLedger,
  onOpenSupplierLedger,
  onPrintPreview,
  onOpenExcelPreview,
}) => {
  const [viewMode, setViewMode] = useState<'two_page' | 'table'>('two_page');
  const [search, setSearch] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [accountType, setAccountType] = useState<'all' | 'customer' | 'supplier'>('all');
  const [txType, setTxType] = useState<string>('all');
  const [selectedUser, setSelectedUser] = useState<string>('all');

  const uniqueUsers = Array.from(new Set(transactions.map(t => t.userName)));

  const filtered = transactions.filter(t => {
    if (search) {
      const q = search.toLowerCase();
      const match =
        t.accountName.toLowerCase().includes(q) ||
        t.accountCode.toLowerCase().includes(q) ||
        t.documentNo.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q);
      if (!match) return false;
    }
    if (fromDate && t.date < fromDate) return false;
    if (toDate && t.date > toDate) return false;
    if (accountType !== 'all' && t.accountType !== accountType) return false;
    if (txType !== 'all' && t.type !== txType) return false;
    if (selectedUser !== 'all' && t.userName !== selectedUser) return false;
    return true;
  });

  // Right Page: Debit movements (مدين: مبيعات آجلة للزبائن / تسديدات مصروفة للموردين)
  // Left Page: Credit movements (دائن: تسديدات مقبوضة من الزبائن / مشتريات آجلة من الموردين)
  const debitList = filtered.filter(t => t.debit > 0);
  const creditList = filtered.filter(t => t.credit > 0);

  const totalDebit = filtered.reduce((acc, t) => acc + t.debit, 0);
  const totalCredit = filtered.reduce((acc, t) => acc + t.credit, 0);

  const exportExcel = () => {
    const headers = [
      'التاريخ',
      'رقم المستند',
      'نوع الحساب',
      'اسم الحساب',
      'كود الحساب',
      'نوع الحركة',
      `المبلغ (${settings.currency})`,
      `مدين (${settings.currency})`,
      `دائن (${settings.currency})`,
      `الرصيد بعد الحركة (${settings.currency})`,
      'طريقة الدفع',
      'البيان',
      'المستخدم'
    ];
    const rows = filtered.map(t => [
      t.date,
      t.documentNo,
      t.accountType === 'customer' ? 'زبون' : 'مورد',
      t.accountName,
      t.accountCode,
      t.type === 'sale' ? 'بيع آجل' : t.type === 'customer_payment' ? 'تسديد زبون' : t.type === 'purchase' ? 'شراء آجل' : t.type === 'supplier_payment' ? 'تسديد مورد' : 'رصيد افتتاحي',
      t.amount,
      t.debit > 0 ? t.debit : '',
      t.credit > 0 ? t.credit : '',
      t.balanceAfter,
      t.paymentMethod === 'bank_transfer' ? 'تحويل' : t.paymentMethod === 'check' ? 'شيك' : 'نقدي',
      t.description,
      t.userName || 'النظام'
    ]);

    const docTitle = 'دفتر اليومية العامة وسجل الحركات المالية';
    const subtitle = `إجمالي الحركات: ${filtered.length} | إجمالي المدين: ${totalDebit.toLocaleString()} ${settings.currency} | إجمالي الدائن: ${totalCredit.toLocaleString()} ${settings.currency}`;

    if (onOpenExcelPreview) {
      onOpenExcelPreview(docTitle, headers, rows, {
        subtitle,
        filename: 'دفتر_الحركات_العام',
        summaryStats: [
          { label: 'عدد الحركات', value: filtered.length },
          { label: 'إجمالي المدين', value: `${totalDebit.toLocaleString()} ${settings.currency}` },
          { label: 'إجمالي الدائن', value: `${totalCredit.toLocaleString()} ${settings.currency}` },
        ]
      });
      return;
    }

    const csvContent = '\uFEFF' + [headers, ...rows].map(e => e.map(val => `"${val}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `دفتر_الحركات_العام_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    onPrintPreview('دفتر القيود والحركات العام', 'جميع الحسابات', filtered, totalDebit - totalCredit);
  };

  return (
    <div className="space-y-5">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border-2 border-stone-300 p-4 rounded-xl shadow-xs text-stone-950">
        <div>
          <div className="flex items-center gap-2">
            <FileSpreadsheet size={20} className="text-amber-800" />
            <h1 className="text-lg font-black text-stone-950 font-amiri">دفتر الحركات واليومية العامة</h1>
          </div>
          <p className="text-xs text-stone-900 font-bold mt-0.5">
            سجل شامل لجميع القيود المالية (مبيعات، مشتريات، وتسديدات الزبائن والموردين)
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* View Mode Toggle */}
          <div className="flex items-center bg-stone-100 p-1 rounded-lg border border-stone-300 text-xs">
            <button
              onClick={() => setViewMode('two_page')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                viewMode === 'two_page'
                  ? 'bg-amber-600 text-stone-950 font-black shadow-xs'
                  : 'text-stone-800 font-bold hover:text-stone-950'
              }`}
              title="عرض صفحتين متقابلتين: مدين ومقابله دائن"
            >
              <Columns size={14} />
              <span>صفحتان متقابلتان</span>
            </button>

            <button
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-amber-600 text-stone-950 font-black shadow-xs'
                  : 'text-stone-800 font-bold hover:text-stone-950'
              }`}
            >
              <List size={14} />
              <span>جدول متسلسل</span>
            </button>
          </div>

          <button
            onClick={exportExcel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-stone-100 text-stone-950 border border-stone-300 text-xs font-bold transition-colors cursor-pointer shadow-xs"
          >
            <FileSpreadsheet size={15} className="text-emerald-600" />
            <span>تصدير Excel</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-black text-xs shadow-xs transition-all cursor-pointer"
          >
            <Printer size={15} />
            <span>طباعة الدفتر</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white border-2 border-stone-300 p-4 rounded-xl shadow-xs text-stone-950 space-y-3 text-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
          <div className="md:col-span-2 relative">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500" />
            <input
              type="text"
              placeholder="بحث بالحساب، المستند، أو البيان..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-3 pr-8 py-1.5 bg-white border-2 border-stone-300 rounded-lg text-stone-950 font-bold focus:outline-none focus:border-amber-600"
            />
          </div>

          <div>
            <select
              value={accountType}
              onChange={(e) => setAccountType(e.target.value as any)}
              className="w-full px-2.5 py-1.5 bg-white border-2 border-stone-300 rounded-lg text-stone-950 font-bold focus:outline-none focus:border-amber-600"
            >
              <option value="all">جميع الحسابات (زبائن + موردين)</option>
              <option value="customer">الزبائن فقط</option>
              <option value="supplier">الموردون فقط</option>
            </select>
          </div>

          <div>
            <select
              value={txType}
              onChange={(e) => setTxType(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border-2 border-stone-300 rounded-lg text-stone-950 font-bold focus:outline-none focus:border-amber-600"
            >
              <option value="all">جميع أنواع العمليات</option>
              <option value="sale">مبيعات آجلة فقط</option>
              <option value="customer_payment">تسديدات زبائن فقط</option>
              <option value="purchase">مشتريات آجلة فقط</option>
              <option value="supplier_payment">تسديدات موردين فقط</option>
              <option value="opening_balance">أرصدة افتتاحية</option>
            </select>
          </div>

          <div>
            <select
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border-2 border-stone-300 rounded-lg text-stone-950 font-bold focus:outline-none focus:border-amber-600"
            >
              <option value="all">جميع المستخدمين</option>
              {uniqueUsers.map(u => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-stone-200">
          <div className="flex items-center gap-3">
            <span className="text-stone-950 font-black">الفترة:</span>
            <div className="flex items-center gap-1.5">
              <span className="text-stone-950 font-bold text-[11px]">من:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="px-2 py-1 bg-white border border-stone-400 rounded text-stone-950 text-xs font-bold focus:outline-none focus:border-amber-600"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-stone-950 font-bold text-[11px]">إلى:</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="px-2 py-1 bg-white border border-stone-400 rounded text-stone-950 text-xs font-bold focus:outline-none focus:border-amber-600"
              />
            </div>
          </div>

          <div className="flex items-center gap-4 text-xs font-mono">
            <div>
              <span className="text-stone-950 font-bold ml-1">إجمالي المدين:</span>
              <span className="font-black text-red-600">{totalDebit.toLocaleString()} {settings.currency}</span>
            </div>
            <div>
              <span className="text-stone-950 font-bold ml-1">إجمالي الدائن:</span>
              <span className="font-black text-emerald-700">{totalCredit.toLocaleString()} {settings.currency}</span>
            </div>
          </div>
        </div>
      </div>

      {/* TWO FACING PAGES VIEW IN GENERAL JOURNAL */}
      {viewMode === 'two_page' ? (
        <div className="relative rounded-2xl ledger-paper border-2 border-stone-400/60 p-4 sm:p-6 shadow-2xl text-stone-900 overflow-hidden">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 relative border border-stone-400/80 rounded-xl overflow-hidden shadow-inner">
            <div className="hidden lg:block absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-8 book-spine-crease z-20 pointer-events-none" />

            {/* RIGHT PAGE: DEBIT MOVEMENTS */}
            <div className="p-4 sm:p-5 bg-[#faf8f1] border-b lg:border-b-0 lg:border-l border-stone-300 flex flex-col justify-between min-h-[500px]">
              <div>
                <div className="flex items-center justify-between pb-3 mb-3 border-b-2 border-red-900/30">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-600 shadow" />
                    <div>
                      <h3 className="font-bold text-base font-amiri text-red-950 leading-tight">
                        القيود المدينة (مدين)
                      </h3>
                      <span className="text-[11px] text-stone-600 font-medium">
                        مبيعات الزبائن الآجلة + تسديدات الموردين المصروفة
                      </span>
                    </div>
                  </div>
                  <span className="font-mono text-xs font-bold bg-red-100 text-red-900 px-2 py-0.5 rounded">
                    {debitList.length} حركة
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="border-b border-stone-400/70 text-stone-900 bg-red-100/50 font-bold">
                        <th className="p-2 w-24">التاريخ</th>
                        <th className="p-2 w-28">المستند</th>
                        <th className="p-2">الحساب والبيان</th>
                        <th className="p-2 text-left w-24 text-red-900">المبلغ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-300">
                      {debitList.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-stone-500 italic">
                            لا توجد قيود مدينة
                          </td>
                        </tr>
                      ) : (
                        debitList.map(t => (
                          <tr key={t.id} className="hover:bg-red-50/60 transition-colors">
                            <td className="p-2 font-mono text-stone-700">{t.date}</td>
                            <td className="p-2 font-mono font-bold text-red-900">{t.documentNo}</td>
                            <td className="p-2">
                              <span className="font-bold text-stone-900 block">{t.accountName}</span>
                              <span className="text-[11px] text-stone-600 truncate block">{t.description}</span>
                            </td>
                            <td className="p-2 text-left font-mono font-bold text-red-700 text-sm">
                              {t.debit.toLocaleString()}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t-2 border-red-900/40 flex items-center justify-between text-xs font-bold text-red-950 bg-red-100/40 p-2.5 rounded-lg">
                <span>مجموع الجانب المدين:</span>
                <span className="font-mono text-base font-black text-red-900">
                  {totalDebit.toLocaleString()} {settings.currency}
                </span>
              </div>
            </div>

            {/* LEFT PAGE: CREDIT MOVEMENTS */}
            <div className="p-4 sm:p-5 bg-[#faf8f1] flex flex-col justify-between min-h-[500px]">
              <div>
                <div className="flex items-center justify-between pb-3 mb-3 border-b-2 border-emerald-900/30">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-600 shadow" />
                    <div>
                      <h3 className="font-bold text-base font-amiri text-emerald-950 leading-tight">
                        القيود الدائنة (دائن)
                      </h3>
                      <span className="text-[11px] text-stone-600 font-medium">
                        تسديدات الزبائن المقبوضة + مشتريات الموردين الآجلة
                      </span>
                    </div>
                  </div>
                  <span className="font-mono text-xs font-bold bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded">
                    {creditList.length} حركة
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="border-b border-stone-400/70 text-stone-900 bg-emerald-100/50 font-bold">
                        <th className="p-2 w-24">التاريخ</th>
                        <th className="p-2 w-28">المستند</th>
                        <th className="p-2">الحساب والبيان</th>
                        <th className="p-2 text-left w-24 text-emerald-900">المبلغ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-300">
                      {creditList.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-stone-500 italic">
                            لا توجد قيود دائنة
                          </td>
                        </tr>
                      ) : (
                        creditList.map(t => (
                          <tr key={t.id} className="hover:bg-emerald-50/60 transition-colors">
                            <td className="p-2 font-mono text-stone-700">{t.date}</td>
                            <td className="p-2 font-mono font-bold text-emerald-900">{t.documentNo}</td>
                            <td className="p-2">
                              <span className="font-bold text-stone-900 block">{t.accountName}</span>
                              <span className="text-[11px] text-stone-600 truncate block">{t.description}</span>
                            </td>
                            <td className="p-2 text-left font-mono font-bold text-emerald-700 text-sm">
                              {t.credit.toLocaleString()}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t-2 border-emerald-900/40 flex items-center justify-between text-xs font-bold text-emerald-950 bg-emerald-100/40 p-2.5 rounded-lg">
                <span>مجموع الجانب الدائن:</span>
                <span className="font-mono text-base font-black text-emerald-900">
                  {totalCredit.toLocaleString()} {settings.currency}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white border-2 border-stone-300 rounded-xl overflow-hidden shadow-sm text-stone-950">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-stone-900 text-white font-black border-b-2 border-stone-900">
                <tr>
                  <th className="p-3">التاريخ</th>
                  <th className="p-3">المستند</th>
                  <th className="p-3">نوع الحساب</th>
                  <th className="p-3">اسم الحساب</th>
                  <th className="p-3">نوع الحركة</th>
                  <th className="p-3 text-left">مدين</th>
                  <th className="p-3 text-left">دائن</th>
                  <th className="p-3 text-left">الرصيد بعد الحركة</th>
                  <th className="p-3">البيان</th>
                  <th className="p-3">المستخدم</th>
                  <th className="p-3 text-center">كشف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 text-stone-950 font-bold">
                {filtered.map(t => {
                  const isCust = t.accountType === 'customer';
                  const custObj = isCust ? customers.find(c => c.id === t.accountId) : null;
                  const suppObj = !isCust ? suppliers.find(s => s.id === t.accountId) : null;

                  return (
                    <tr key={t.id} className="hover:bg-amber-50/70 transition-colors">
                      <td className="p-3 font-mono text-stone-900 font-bold">{t.date}</td>
                      <td className="p-3 font-mono text-amber-900 font-black">{t.documentNo}</td>
                      <td className="p-3 font-black text-stone-950">{isCust ? 'زبون' : 'مورد'}</td>
                      <td className="p-3 font-black text-stone-950 text-sm">{t.accountName}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[11px] bg-stone-100 border border-stone-300 text-stone-950 font-bold">
                          {t.type}
                        </span>
                      </td>
                      <td className="p-3 text-left font-mono font-black text-red-600">
                        {t.debit > 0 ? t.debit.toLocaleString() : '—'}
                      </td>
                      <td className="p-3 text-left font-mono font-black text-emerald-700">
                        {t.credit > 0 ? t.credit.toLocaleString() : '—'}
                      </td>
                      <td className="p-3 text-left font-mono font-black text-stone-950">
                        {t.balanceAfter.toLocaleString()} {settings.currency}
                      </td>
                      <td className="p-3 text-stone-950 font-bold truncate max-w-xs">{t.description}</td>
                      <td className="p-3 text-stone-900 font-bold">{t.userName}</td>
                      <td className="p-3 text-center">
                        {isCust && custObj && (
                          <button
                            onClick={() => onOpenCustomerLedger(custObj)}
                            className="p-1 rounded hover:bg-stone-750 text-amber-400"
                          >
                            <BookOpen size={14} />
                          </button>
                        )}
                        {!isCust && suppObj && (
                          <button
                            onClick={() => onOpenSupplierLedger(suppObj)}
                            className="p-1 rounded hover:bg-stone-750 text-blue-400"
                          >
                            <BookOpen size={14} />
                          </button>
                        )}
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
  );
};
