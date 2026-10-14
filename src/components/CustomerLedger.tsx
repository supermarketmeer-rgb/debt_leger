import React, { useState } from 'react';
import {
  ArrowRight,
  Printer,
  FileSpreadsheet,
  PlusCircle,
  DollarSign,
  Phone,
  MapPin,
  BookOpen,
  Receipt,
  Columns,
  List,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { Customer, Transaction, StoreSettings } from '../types';

interface CustomerLedgerProps {
  customer: Customer;
  transactions: Transaction[];
  settings: StoreSettings;
  onBack: () => void;
  onOpenTransactionModal: (type: 'sale' | 'customer_payment', customerId: string) => void;
  onPrintPreview: (title: string, accountName: string, transactions: Transaction[], currentBalance: number, isSupplier?: boolean) => void;
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

export const CustomerLedger: React.FC<CustomerLedgerProps> = ({
  customer,
  transactions,
  settings,
  onBack,
  onOpenTransactionModal,
  onPrintPreview,
  onOpenExcelPreview,
}) => {
  const [viewMode, setViewMode] = useState<'two_page' | 'unified'>('two_page');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Chronological sort
  const sortedTx = [...transactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.id.localeCompare(b.id)
  );

  const filteredTx = sortedTx.filter(t => {
    if (fromDate && t.date < fromDate) return false;
    if (toDate && t.date > toDate) return false;
    return true;
  });

  // Split into Sales (Debit - Right Page) and Payments (Credit - Left Page)
  const salesList = filteredTx.filter(t => t.type === 'sale' || t.debit > 0);
  const paymentsList = filteredTx.filter(t => t.type === 'customer_payment' || t.credit > 0);

  const totalSales = salesList.reduce((acc, t) => acc + (t.debit || t.amount), 0);
  const totalPayments = paymentsList.reduce((acc, t) => acc + (t.credit || t.amount), 0);

  // Sequential balance for unified view
  let running = 0;
  const ledgerRows = filteredTx.map(tx => {
    running = running + tx.debit - tx.credit;
    return {
      ...tx,
      calculatedBalance: running,
    };
  });

  const exportCsv = () => {
    const headers = [
      'التاريخ',
      'رقم المستند',
      'البيان',
      `مبيعات (مدين - ${settings.currency})`,
      `تسديدات (دائن - ${settings.currency})`,
      `الرصيد التراكمي (${settings.currency})`
    ];
    const rows = ledgerRows.map(r => [
      r.date,
      r.documentNo,
      r.description,
      r.debit > 0 ? r.debit : '',
      r.credit > 0 ? r.credit : '',
      r.calculatedBalance
    ]);

    const docTitle = `دفتر حساب الزبون: ${customer.name}`;
    const subtitle = `كود الحساب: ${customer.code} • صافي الرصيد المستحق: ${customer.currentBalance.toLocaleString()} ${settings.currency}`;

    if (onOpenExcelPreview) {
      onOpenExcelPreview(docTitle, headers, rows, {
        subtitle,
        filename: `دفتر_حساب_${customer.name}`,
        summaryStats: [
          { label: 'إجمالي المبيعات', value: `${totalSales.toLocaleString()} ${settings.currency}` },
          { label: 'إجمالي التسديدات', value: `${totalPayments.toLocaleString()} ${settings.currency}` },
          { label: 'صافي الرصيد المستحق', value: `${customer.currentBalance.toLocaleString()} ${settings.currency}` },
        ]
      });
      return;
    }

    const csvContent = '\uFEFF' + [headers, ...rows].map(e => e.map(val => `"${val}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `دفتر_حساب_${customer.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    onPrintPreview('كشف حساب زبون رسمي (صفحتين متقابلتين)', customer.name, filteredTx, customer.currentBalance, false);
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border-2 border-stone-300 shadow-xs text-stone-950">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-950 border border-stone-300 transition-colors flex items-center gap-1.5 text-xs font-bold cursor-pointer"
          >
            <ArrowRight size={16} />
            <span>العودة لقائمة الزبائن</span>
          </button>

          <div>
            <h1 className="text-lg font-black text-stone-950 font-amiri flex items-center gap-2">
              <BookOpen size={18} className="text-amber-800" />
              <span>دفتر حساب الزبون: {customer.name}</span>
            </h1>
            <span className="text-xs text-stone-900 font-mono font-bold">كود الحساب: {customer.code}</span>
          </div>
        </div>

        {/* View Switcher: Two Facing Pages vs Single Unified Table */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-stone-100 p-1 rounded-lg border border-stone-300 text-xs">
            <button
              onClick={() => setViewMode('two_page')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                viewMode === 'two_page'
                  ? 'bg-amber-600 text-stone-950 font-black shadow-xs'
                  : 'text-stone-800 font-bold hover:text-stone-950'
              }`}
              title="صفحة المبيعات ومقابلها صفحة التسديد"
            >
              <Columns size={14} />
              <span>صفحتان متقابلتان</span>
            </button>

            <button
              onClick={() => setViewMode('unified')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                viewMode === 'unified'
                  ? 'bg-amber-600 text-stone-950 font-black shadow-xs'
                  : 'text-stone-800 font-bold hover:text-stone-950'
              }`}
            >
              <List size={14} />
              <span>جدول متسلسل</span>
            </button>
          </div>

          <button
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-stone-100 text-stone-950 border border-stone-300 text-xs font-bold transition-colors cursor-pointer shadow-xs"
          >
            <Printer size={14} className="text-amber-800" />
            <span>طباعة A4</span>
          </button>

          <button
            onClick={exportCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white hover:bg-stone-100 text-stone-950 border border-stone-300 text-xs font-bold transition-colors cursor-pointer shadow-xs"
          >
            <FileSpreadsheet size={14} className="text-emerald-700" />
            <span>تصدير Excel</span>
          </button>
        </div>
      </div>

      {/* Date Filter & Account Info Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-xl border-2 border-stone-300 shadow-xs text-xs text-stone-950">
        <div className="flex items-center gap-4 text-stone-950 font-bold">
          {customer.phone && (
            <span className="flex items-center gap-1">
              <Phone size={13} className="text-amber-800" />
              <span dir="ltr">{customer.phone}</span>
            </span>
          )}
          {customer.address && (
            <span className="flex items-center gap-1">
              <MapPin size={13} className="text-stone-700" />
              <span>{customer.address}</span>
            </span>
          )}
          <span className="text-stone-400">
            الرصيد الافتتاحي: <strong className="text-stone-200 font-mono">{customer.openingBalance.toLocaleString()} {settings.currency}</strong>
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-stone-400 text-[11px]">الفترة:</span>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="px-2 py-1 bg-stone-800 border border-stone-700 rounded text-stone-200 text-xs"
          />
          <span className="text-stone-500">إلى</span>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="px-2 py-1 bg-stone-800 border border-stone-700 rounded text-stone-200 text-xs"
          />
          {(fromDate || toDate) && (
            <button onClick={() => { setFromDate(''); setToDate(''); }} className="text-amber-400 hover:underline text-[11px]">
              مسح
            </button>
          )}
        </div>
      </div>

      {/* TWO FACING PAGES VIEW */}
      {viewMode === 'two_page' ? (
        <div className="relative rounded-2xl ledger-paper border-2 border-stone-400/60 p-4 sm:p-6 shadow-2xl text-stone-900 overflow-hidden">
          {/* Top Banner on the Spread */}
          <div className="text-center pb-4 mb-4 border-b-2 border-stone-400/60 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <span className="text-xs font-mono font-bold text-amber-900 block">
                {settings.storeName} — دفتر الحسابات ذو الصفحتين المتقابلتين
              </span>
              <h2 className="text-xl sm:text-2xl font-black font-amiri text-stone-950">
                حساب الزبون: {customer.name}
              </h2>
            </div>

            {/* Current Balance Display */}
            <div className="bg-stone-900 text-stone-100 px-4 py-2 rounded-xl border border-amber-600/50 flex items-center gap-3">
              <span className="text-xs text-amber-400 font-bold">صافي الرصيد المستحق:</span>
              <span className="text-xl font-black font-mono text-red-400">
                {customer.currentBalance.toLocaleString()} {settings.currency}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-red-950 text-red-300 font-bold">
                {customer.currentBalance > 0 ? 'مطلوب دين' : customer.currentBalance < 0 ? 'له رصيد' : 'مصفى'}
              </span>
            </div>
          </div>

          {/* Facing Two Pages Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 relative border border-stone-400/80 rounded-xl overflow-hidden shadow-inner">
            {/* CENTRAL GUTTER CREASE SHADOW (الفاصل بين الصفحتين مع درز التجليد) */}
            <div className="hidden lg:block absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-8 book-spine-crease z-20 pointer-events-none" />

            {/* ======================================================== */}
            {/* RIGHT PAGE: المبيعات الآجلة (مدين - عليه) */}
            {/* ======================================================== */}
            <div className="p-4 sm:p-5 bg-[#faf8f1] border-b lg:border-b-0 lg:border-l border-stone-300 flex flex-col justify-between min-h-[500px]">
              <div>
                {/* Right Page Header */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b-2 border-red-900/30">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-red-600 shadow" />
                    <div>
                      <h3 className="font-bold text-base font-amiri text-red-950 leading-tight">
                        فواتير المبيعات الآجلة
                      </h3>
                      <span className="text-[11px] text-stone-600 font-medium">
                        الذمم المدينة (زيادة الدين على الزبون)
                      </span>
                    </div>
                  </div>
                  <span className="font-mono text-xs font-bold bg-red-100 text-red-900 px-2.5 py-0.5 rounded">
                    {salesList.length} فاتورة
                  </span>
                </div>

                {/* Sales Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="border-b border-stone-400/70 text-stone-900 bg-red-100/50 font-bold">
                        <th className="p-2 w-24">التاريخ</th>
                        <th className="p-2 w-28">رقم الفاتورة</th>
                        <th className="p-2">البيان والتفاصيل</th>
                        <th className="p-2 text-left w-28 text-red-900">المبلغ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-300">
                      {salesList.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-stone-500 italic">
                            لا توجد فواتير مبيعات آجلة مسجلة
                          </td>
                        </tr>
                      ) : (
                        salesList.map((sale, i) => (
                          <tr key={sale.id} className="hover:bg-red-50/60 transition-colors">
                            <td className="p-2 font-mono text-stone-700">{sale.date}</td>
                            <td className="p-2 font-mono font-bold text-red-900">{sale.documentNo}</td>
                            <td className="p-2">
                              <span className="font-semibold text-stone-900">{sale.description}</span>
                              {sale.notes && <span className="block text-[10px] text-stone-500">{sale.notes}</span>}
                            </td>
                            <td className="p-2 text-left font-mono font-bold text-red-700 text-sm">
                              {sale.amount.toLocaleString()} {settings.currency}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right Page Footer Total */}
              <div className="mt-4 pt-3 border-t-2 border-red-900/40 flex items-center justify-between text-xs font-bold text-red-950 bg-red-100/40 p-2.5 rounded-lg">
                <span>مجموع المبيعات الآجلة:</span>
                <span className="font-mono text-base font-black text-red-900">
                  {totalSales.toLocaleString()} {settings.currency}
                </span>
              </div>
            </div>

            {/* ======================================================== */}
            {/* LEFT PAGE: التسديدات والقبض (دائن - له) */}
            {/* ======================================================== */}
            <div className="p-4 sm:p-5 bg-[#faf8f1] flex flex-col justify-between min-h-[500px]">
              <div>
                {/* Left Page Header */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b-2 border-emerald-900/30">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-600 shadow" />
                    <div>
                      <h3 className="font-bold text-base font-amiri text-emerald-950 leading-tight">
                        التسديدات والمقبوضات
                      </h3>
                      <span className="text-[11px] text-stone-600 font-medium">
                        الذمم الدائنة (تنقيص وتخفيض الدين المسدد)
                      </span>
                    </div>
                  </div>
                  <span className="font-mono text-xs font-bold bg-emerald-100 text-emerald-900 px-2.5 py-0.5 rounded">
                    {paymentsList.length} وصل
                  </span>
                </div>

                {/* Payments Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="border-b border-stone-400/70 text-stone-900 bg-emerald-100/50 font-bold">
                        <th className="p-2 w-24">التاريخ</th>
                        <th className="p-2 w-28">رقم الوصل</th>
                        <th className="p-2">البيان وطريقة الدفع</th>
                        <th className="p-2 text-left w-28 text-emerald-900">المبلغ المسدد</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-300">
                      {paymentsList.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-stone-500 italic">
                            لا توجد تسديدات مسجلة حتى الآن
                          </td>
                        </tr>
                      ) : (
                        paymentsList.map((pay, i) => (
                          <tr key={pay.id} className="hover:bg-emerald-50/60 transition-colors">
                            <td className="p-2 font-mono text-stone-700">{pay.date}</td>
                            <td className="p-2 font-mono font-bold text-emerald-900">{pay.documentNo}</td>
                            <td className="p-2">
                              <span className="font-semibold text-stone-900">{pay.description}</span>
                              <span className="block text-[10px] text-stone-500">
                                {pay.paymentMethod === 'cash' ? 'نقدي (كاش)' : pay.paymentMethod === 'bank_transfer' ? 'حوالة بنكية' : 'شيك'}
                              </span>
                            </td>
                            <td className="p-2 text-left font-mono font-bold text-emerald-700 text-sm">
                              {pay.amount.toLocaleString()} {settings.currency}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Left Page Footer Total */}
              <div className="mt-4 pt-3 border-t-2 border-emerald-900/40 flex items-center justify-between text-xs font-bold text-emerald-950 bg-emerald-100/40 p-2.5 rounded-lg">
                <span>مجموع التسديدات المقبوضة:</span>
                <span className="font-mono text-base font-black text-emerald-900">
                  {totalPayments.toLocaleString()} {settings.currency}
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Ledger Balance Reconciliation Banner */}
          <div className="mt-6 pt-4 border-t-2 border-stone-800 bg-amber-100/70 p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-xs text-stone-800">
              <span className="font-bold block text-sm font-amiri text-amber-950">
                معادلة ترصيد الدفتر (الصفحتين المتقابلتين):
              </span>
              <span className="font-mono mt-0.5 block text-stone-700">
                المبيعات ({totalSales.toLocaleString()}) - التسديدات ({totalPayments.toLocaleString()}) = الرصيد المستحق
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-left font-mono">
                <span className="text-xs text-stone-600 block">الرصيد المتبقي على الزبون:</span>
                <span className="text-2xl font-black text-red-700">
                  {customer.currentBalance.toLocaleString()} {settings.currency}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* SINGLE UNIFIED SEQUENTIAL TABLE VIEW */
        <div className="ledger-paper border-2 border-stone-400/60 rounded-2xl p-6 shadow-2xl text-stone-900">
          <h3 className="text-lg font-bold font-amiri mb-4">الجدول المتسلسل الزمني لكافة الحركات</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b-2 border-stone-800 bg-amber-100/80 font-bold">
                  <th className="p-3">التاريخ</th>
                  <th className="p-3">رقم المستند</th>
                  <th className="p-3">البيان</th>
                  <th className="p-3 text-left text-red-900">مدين (مبيعات)</th>
                  <th className="p-3 text-left text-emerald-900">دائن (تسديد)</th>
                  <th className="p-3 text-left font-black">الرصيد</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-300">
                {ledgerRows.map(r => (
                  <tr key={r.id} className="hover:bg-amber-50">
                    <td className="p-3 font-mono">{r.date}</td>
                    <td className="p-3 font-mono font-bold text-amber-900">{r.documentNo}</td>
                    <td className="p-3">{r.description}</td>
                    <td className="p-3 text-left font-mono font-bold text-red-700">{r.debit > 0 ? r.debit.toLocaleString() : '—'}</td>
                    <td className="p-3 text-left font-mono font-bold text-emerald-700">{r.credit > 0 ? r.credit.toLocaleString() : '—'}</td>
                    <td className="p-3 text-left font-mono font-bold text-stone-950 bg-stone-200/40">
                      {r.calculatedBalance.toLocaleString()} {settings.currency}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
