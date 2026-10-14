import React, { useState } from 'react';
import {
  ArrowRight,
  Printer,
  FileSpreadsheet,
  PlusCircle,
  DollarSign,
  Phone,
  MapPin,
  Building2,
  Columns,
  List,
  Receipt
} from 'lucide-react';
import { Supplier, Transaction, StoreSettings } from '../types';

interface SupplierLedgerProps {
  supplier: Supplier;
  transactions: Transaction[];
  settings: StoreSettings;
  onBack: () => void;
  onOpenTransactionModal: (type: 'purchase' | 'supplier_payment', supplierId: string) => void;
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

export const SupplierLedger: React.FC<SupplierLedgerProps> = ({
  supplier,
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

  // Sort chronologically
  const sortedTx = [...transactions].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.id.localeCompare(b.id)
  );

  const filteredTx = sortedTx.filter(t => {
    if (fromDate && t.date < fromDate) return false;
    if (toDate && t.date > toDate) return false;
    return true;
  });

  // Right Page: Credit Purchases (شراء آجل)
  // Left Page: Supplier Payments (تسديد وسندات صرف)
  const purchasesList = filteredTx.filter(t => t.type === 'purchase' || t.credit > 0);
  const paymentsList = filteredTx.filter(t => t.type === 'supplier_payment' || t.debit > 0);

  const totalPurchases = purchasesList.reduce((acc, t) => acc + (t.credit || t.amount), 0);
  const totalPayments = paymentsList.reduce((acc, t) => acc + (t.debit || t.amount), 0);

  // Sequential balance for unified view
  let running = 0;
  const ledgerRows = filteredTx.map(tx => {
    running = running + tx.credit - tx.debit;
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
      `مشتريات (دائن - ${settings.currency})`,
      `تسديدات (مدين - ${settings.currency})`,
      `المستحق المتبقي (${settings.currency})`
    ];
    const rows = ledgerRows.map(r => [
      r.date,
      r.documentNo,
      r.description,
      r.credit > 0 ? r.credit : '',
      r.debit > 0 ? r.debit : '',
      r.calculatedBalance
    ]);

    const docTitle = `دفتر حساب المورد: ${supplier.name}`;
    const subtitle = `كود المورد: ${supplier.code} • إجمالي المستحق للمورد: ${supplier.currentBalance.toLocaleString()} ${settings.currency}`;

    if (onOpenExcelPreview) {
      onOpenExcelPreview(docTitle, headers, rows, {
        subtitle,
        filename: `دفتر_مورد_${supplier.name}`,
        summaryStats: [
          { label: 'إجمالي المشتريات', value: `${totalPurchases.toLocaleString()} ${settings.currency}` },
          { label: 'إجمالي المدفوعات', value: `${totalPayments.toLocaleString()} ${settings.currency}` },
          { label: 'صافي المستحق للمورد', value: `${supplier.currentBalance.toLocaleString()} ${settings.currency}` },
        ]
      });
      return;
    }

    const csvContent = '\uFEFF' + [headers, ...rows].map(e => e.map(val => `"${val}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `دفتر_مورد_${supplier.name.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrint = () => {
    onPrintPreview('كشف حساب مورد رسمي (صفحتين متقابلتين)', supplier.name, filteredTx, supplier.currentBalance, true);
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
            <span>العودة لقائمة الموردين</span>
          </button>

          <div>
            <h1 className="text-lg font-black text-stone-950 font-amiri flex items-center gap-2">
              <Building2 size={18} className="text-blue-800" />
              <span>دفتر حساب المورد: {supplier.name}</span>
            </h1>
            <span className="text-xs text-stone-900 font-mono font-bold">كود المورد: {supplier.code}</span>
          </div>
        </div>

        {/* View Switcher & Export */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-stone-100 p-1 rounded-lg border border-stone-300 text-xs">
            <button
              onClick={() => setViewMode('two_page')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                viewMode === 'two_page'
                  ? 'bg-blue-700 text-white font-black shadow-xs'
                  : 'text-stone-800 font-bold hover:text-stone-950'
              }`}
              title="صفحة المشتريات ومقابلها صفحة التسديد"
            >
              <Columns size={14} />
              <span>صفحتان متقابلتان</span>
            </button>

            <button
              onClick={() => setViewMode('unified')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                viewMode === 'unified'
                  ? 'bg-blue-700 text-white font-black shadow-xs'
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
          {supplier.phone && (
            <span className="flex items-center gap-1">
              <Phone size={13} className="text-blue-800" />
              <span dir="ltr">{supplier.phone}</span>
            </span>
          )}
          {supplier.address && (
            <span className="flex items-center gap-1">
              <MapPin size={13} className="text-stone-700" />
              <span>{supplier.address}</span>
            </span>
          )}
          <span className="text-stone-400">
            الرصيد الافتتاحي المستحق: <strong className="text-stone-200 font-mono">{supplier.openingBalance.toLocaleString()} {settings.currency}</strong>
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

      {/* TWO FACING PAGES VIEW FOR SUPPLIER */}
      {viewMode === 'two_page' ? (
        <div className="relative rounded-2xl ledger-paper border-2 border-stone-400/60 p-4 sm:p-6 shadow-2xl text-stone-900 overflow-hidden">
          {/* Top Banner */}
          <div className="text-center pb-4 mb-4 border-b-2 border-stone-400/60 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <span className="text-xs font-mono font-bold text-blue-900 block">
                {settings.storeName} — دفتر الموردين ذو الصفحتين المتقابلتين
              </span>
              <h2 className="text-xl sm:text-2xl font-black font-amiri text-stone-950">
                حساب المورد: {supplier.name}
              </h2>
            </div>

            {/* Current Due Display */}
            <div className="bg-stone-900 text-stone-100 px-4 py-2 rounded-xl border border-blue-500/50 flex items-center gap-3">
              <span className="text-xs text-blue-400 font-bold">إجمالي المستحق للمورد:</span>
              <span className="text-xl font-black font-mono text-blue-400">
                {supplier.currentBalance.toLocaleString()} {settings.currency}
              </span>
              <span className="text-[10px] px-2 py-0.5 rounded bg-blue-950 text-blue-300 font-bold">
                {supplier.currentBalance > 0 ? 'مستحق السداد' : 'لا مستحقات'}
              </span>
            </div>
          </div>

          {/* Facing Two Pages Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 relative border border-stone-400/80 rounded-xl overflow-hidden shadow-inner">
            {/* CENTRAL GUTTER CREASE SHADOW */}
            <div className="hidden lg:block absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-8 book-spine-crease z-20 pointer-events-none" />

            {/* ======================================================== */}
            {/* RIGHT PAGE: المشتريات الآجلة (دائن - تزيد المستحق) */}
            {/* ======================================================== */}
            <div className="p-4 sm:p-5 bg-[#faf8f1] border-b lg:border-b-0 lg:border-l border-stone-300 flex flex-col justify-between min-h-[500px]">
              <div>
                {/* Right Page Header */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b-2 border-blue-900/30">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-blue-600 shadow" />
                    <div>
                      <h3 className="font-bold text-base font-amiri text-blue-950 leading-tight">
                        فواتير المشتريات الآجلة
                      </h3>
                      <span className="text-[11px] text-stone-600 font-medium">
                        الذمم الدائنة (زيادة المبالغ المستحقة للمورد)
                      </span>
                    </div>
                  </div>
                  <span className="font-mono text-xs font-bold bg-blue-100 text-blue-900 px-2.5 py-0.5 rounded">
                    {purchasesList.length} فاتورة
                  </span>
                </div>

                {/* Purchases Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="border-b border-stone-400/70 text-stone-900 bg-blue-100/50 font-bold">
                        <th className="p-2 w-24">التاريخ</th>
                        <th className="p-2 w-28">رقم الفاتورة</th>
                        <th className="p-2">البيان والتفاصيل</th>
                        <th className="p-2 text-left w-28 text-blue-900">المبلغ</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-300">
                      {purchasesList.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-stone-500 italic">
                            لا توجد فواتير مشتريات مسجلة
                          </td>
                        </tr>
                      ) : (
                        purchasesList.map((pur, i) => (
                          <tr key={pur.id} className="hover:bg-blue-50/60 transition-colors">
                            <td className="p-2 font-mono text-stone-700">{pur.date}</td>
                            <td className="p-2 font-mono font-bold text-blue-900">{pur.documentNo}</td>
                            <td className="p-2">
                              <span className="font-semibold text-stone-900">{pur.description}</span>
                              {pur.notes && <span className="block text-[10px] text-stone-500">{pur.notes}</span>}
                            </td>
                            <td className="p-2 text-left font-mono font-bold text-blue-700 text-sm">
                              {pur.amount.toLocaleString()} {settings.currency}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Right Page Footer Total */}
              <div className="mt-4 pt-3 border-t-2 border-blue-900/40 flex items-center justify-between text-xs font-bold text-blue-950 bg-blue-100/40 p-2.5 rounded-lg">
                <span>مجموع المشتريات الآجلة:</span>
                <span className="font-mono text-base font-black text-blue-900">
                  {totalPurchases.toLocaleString()} {settings.currency}
                </span>
              </div>
            </div>

            {/* ======================================================== */}
            {/* LEFT PAGE: تسديدات وسندات صرف المورد (مدين - تخفيض المستحق) */}
            {/* ======================================================== */}
            <div className="p-4 sm:p-5 bg-[#faf8f1] flex flex-col justify-between min-h-[500px]">
              <div>
                {/* Left Page Header */}
                <div className="flex items-center justify-between pb-3 mb-3 border-b-2 border-emerald-900/30">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-emerald-600 shadow" />
                    <div>
                      <h3 className="font-bold text-base font-amiri text-emerald-950 leading-tight">
                        سندات الصرف والتسديد
                      </h3>
                      <span className="text-[11px] text-stone-600 font-medium">
                        الذمم المدينة (المبالغ المصروفة والمسددة للمورد)
                      </span>
                    </div>
                  </div>
                  <span className="font-mono text-xs font-bold bg-emerald-100 text-emerald-900 px-2.5 py-0.5 rounded">
                    {paymentsList.length} سند
                  </span>
                </div>

                {/* Payments Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="border-b border-stone-400/70 text-stone-900 bg-emerald-100/50 font-bold">
                        <th className="p-2 w-24">التاريخ</th>
                        <th className="p-2 w-28">رقم السند</th>
                        <th className="p-2">البيان وطريقة الصرف</th>
                        <th className="p-2 text-left w-28 text-emerald-900">المبلغ المصروف</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-300">
                      {paymentsList.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="p-8 text-center text-stone-500 italic">
                            لا توجد تسديدات مسجلة للمورد حتى الآن
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
                                {pay.paymentMethod === 'cash' ? 'نقدي (كاش)' : pay.paymentMethod === 'bank_transfer' ? 'حوالة مصرفية' : 'شيك'}
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
                <span>مجموع التسديدات المصروفة:</span>
                <span className="font-mono text-base font-black text-emerald-900">
                  {totalPayments.toLocaleString()} {settings.currency}
                </span>
              </div>
            </div>
          </div>

          {/* Bottom Ledger Balance Reconciliation Banner */}
          <div className="mt-6 pt-4 border-t-2 border-stone-800 bg-blue-100/70 p-4 rounded-xl flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-xs text-stone-800">
              <span className="font-bold block text-sm font-amiri text-blue-950">
                معادلة ترصيد حساب المورد (الصفحتين المتقابلتين):
              </span>
              <span className="font-mono mt-0.5 block text-stone-700">
                المشتريات ({totalPurchases.toLocaleString()}) - المسدد له ({totalPayments.toLocaleString()}) = المستحق المتبقي
              </span>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-left font-mono">
                <span className="text-xs text-stone-600 block">المبلغ المتبقي للمورد:</span>
                <span className="text-2xl font-black text-blue-700">
                  {supplier.currentBalance.toLocaleString()} {settings.currency}
                </span>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* SINGLE UNIFIED SEQUENTIAL TABLE VIEW */
        <div className="ledger-paper border-2 border-stone-400/60 rounded-2xl p-6 shadow-2xl text-stone-900">
          <h3 className="text-lg font-bold font-amiri mb-4">الجدول المتسلسل الزمني لكافة مشتريات وتسديدات المورد</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b-2 border-stone-800 bg-blue-100/80 font-bold">
                  <th className="p-3">التاريخ</th>
                  <th className="p-3">رقم المستند</th>
                  <th className="p-3">البيان</th>
                  <th className="p-3 text-left text-blue-900">دائن (مشتريات)</th>
                  <th className="p-3 text-left text-emerald-900">مدين (تسديد)</th>
                  <th className="p-3 text-left font-black">المستحق</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-300">
                {ledgerRows.map(r => (
                  <tr key={r.id} className="hover:bg-blue-50">
                    <td className="p-3 font-mono">{r.date}</td>
                    <td className="p-3 font-mono font-bold text-blue-900">{r.documentNo}</td>
                    <td className="p-3">{r.description}</td>
                    <td className="p-3 text-left font-mono font-bold text-blue-700">{r.credit > 0 ? r.credit.toLocaleString() : '—'}</td>
                    <td className="p-3 text-left font-mono font-bold text-emerald-700">{r.debit > 0 ? r.debit.toLocaleString() : '—'}</td>
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
