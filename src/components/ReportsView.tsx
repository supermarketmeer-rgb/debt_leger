import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Calendar,
  Printer,
  FileSpreadsheet,
  Users,
  Building2,
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertCircle,
  FileText,
  Clock,
  AlertTriangle,
  Phone,
  MessageCircle,
  BookOpen,
  Search,
  CheckCircle2,
  CalendarClock,
  ArrowUpDown
} from 'lucide-react';
import { Customer, Supplier, Transaction, StoreSettings } from '../types';

interface ReportsViewProps {
  settings: StoreSettings;
  customers: Customer[];
  suppliers: Supplier[];
  transactions: Transaction[];
  onPrintPreview: (title: string, accountName: string, transactions: Transaction[], currentBalance: number) => void;
  onOpenCustomerLedger?: (customer: Customer) => void;
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

type ReportType =
  | 'customer_debts'
  | 'supplier_dues'
  | 'credit_sales'
  | 'credit_purchases'
  | 'customer_payments'
  | 'supplier_payments'
  | 'overdue_accounts'
  | 'user_activity';

export const ReportsView: React.FC<ReportsViewProps> = ({
  settings,
  customers,
  suppliers,
  transactions,
  onPrintPreview,
  onOpenCustomerLedger,
  onOpenExcelPreview,
}) => {
  const [activeReport, setActiveReport] = useState<ReportType>('customer_debts');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');

  // Overdue report settings & filters
  const [overdueDays, setOverdueDays] = useState<number>(30);
  const [overdueCalcMethod, setOverdueCalcMethod] = useState<'last_payment' | 'last_sale'>('last_payment');
  const [overdueSearch, setOverdueSearch] = useState<string>('');
  const [overdueSort, setOverdueSort] = useState<'days_desc' | 'balance_desc' | 'name_asc'>('days_desc');

  // WhatsApp reminder message generator
  const handleWhatsAppReminder = (customer: Customer, daysOverdue: number, lastPayDate: string | null) => {
    if (!customer.phone) {
      alert('لا يوجد رقم هاتف مسجل لهذا الزبون');
      return;
    }
    const cleanPhone = customer.phone.replace(/[^0-9]/g, '');
    const payInfo = lastPayDate ? `علماً أن آخر دفعة مسجلة كانت بتاريخ ${lastPayDate}.` : 'علماً بأنه لم يتم تسجيل أي دفعة تسديد سابقة.';
    const message = `السلام عليكم ورحمة الله،\nالأخ الفاضل / ${customer.name}\nنود تذكيركم بلطف بوجود رصيد مدين مستحق بذمتكم بمبلغ (${customer.currentBalance.toLocaleString()} ${settings.currency}) لدى ${settings.storeName}.\nمضى على استحقاق الرصيد ${daysOverdue} يوماً، ${payInfo}\nنرجو منكم التفضل بترتيب السداد في أقرب وقت ممكن.\nمع فائق الشكر والتقدير.`;
    const url = `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank');
  };

  // Calculate Overdue Customers List
  const overdueCustomerList = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return customers
      .filter((c) => (c.currentBalance || 0) > 0)
      .map((c) => {
        const custTx = transactions.filter(
          (t) => t.accountType === 'customer' && t.accountId === c.id
        );

        const payments = custTx
          .filter((t) => t.type === 'customer_payment' || t.credit > 0)
          .sort((a, b) => b.date.localeCompare(a.date));

        const sales = custTx
          .filter((t) => t.type === 'sale' || t.debit > 0)
          .sort((a, b) => b.date.localeCompare(a.date));

        const lastPayment = payments.length > 0 ? payments[0] : null;
        const lastSale = sales.length > 0 ? sales[0] : null;

        // Base date for overdue calculation
        let refDateStr = '';
        if (overdueCalcMethod === 'last_payment') {
          if (lastPayment) {
            refDateStr = lastPayment.date;
          } else if (lastSale) {
            refDateStr = lastSale.date;
          } else {
            refDateStr = c.createdAt ? c.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10);
          }
        } else {
          // 'last_sale'
          if (lastSale) {
            refDateStr = lastSale.date;
          } else if (lastPayment) {
            refDateStr = lastPayment.date;
          } else {
            refDateStr = c.createdAt ? c.createdAt.slice(0, 10) : new Date().toISOString().slice(0, 10);
          }
        }

        const refDate = new Date(refDateStr);
        refDate.setHours(0, 0, 0, 0);
        const diffMs = today.getTime() - refDate.getTime();
        const daysOverdue = Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));

        let severity: 'critical' | 'high' | 'medium' | 'low' = 'low';
        let severityLabel = 'تأخير اعتيادي';
        if (daysOverdue >= 90) {
          severity = 'critical';
          severityLabel = 'تأخير حرج (>90 يوم)';
        } else if (daysOverdue >= 60) {
          severity = 'high';
          severityLabel = 'تأخير مرتفع (60-90 يوم)';
        } else if (daysOverdue >= 30) {
          severity = 'medium';
          severityLabel = 'تأخير متوسط (30-60 يوم)';
        } else {
          severity = 'low';
          severityLabel = 'تأخير مبكر (<30 يوم)';
        }

        return {
          customer: c,
          currentBalance: c.currentBalance,
          lastPaymentDate: lastPayment ? lastPayment.date : null,
          lastPaymentAmount: lastPayment ? (lastPayment.amount || lastPayment.credit) : null,
          lastSaleDate: lastSale ? lastSale.date : null,
          lastSaleAmount: lastSale ? (lastSale.amount || lastSale.debit) : null,
          referenceDate: refDateStr,
          daysOverdue,
          severity,
          severityLabel,
        };
      })
      .filter((item) => item.daysOverdue >= overdueDays)
      .filter((item) => {
        if (!overdueSearch.trim()) return true;
        const q = overdueSearch.trim().toLowerCase();
        return (
          item.customer.name.toLowerCase().includes(q) ||
          item.customer.code.toLowerCase().includes(q) ||
          (item.customer.phone && item.customer.phone.includes(q))
        );
      })
      .sort((a, b) => {
        if (overdueSort === 'days_desc') return b.daysOverdue - a.daysOverdue;
        if (overdueSort === 'balance_desc') return b.currentBalance - a.currentBalance;
        return a.customer.name.localeCompare(b.customer.name, 'ar');
      });
  }, [customers, transactions, overdueDays, overdueCalcMethod, overdueSearch, overdueSort]);

  // Overdue statistics
  const overdueStats = useMemo(() => {
    const totalCount = overdueCustomerList.length;
    const totalOverdueDebt = overdueCustomerList.reduce((sum, item) => sum + item.currentBalance, 0);
    const maxDays = overdueCustomerList.length > 0 ? Math.max(...overdueCustomerList.map((i) => i.daysOverdue)) : 0;
    const avgDays = overdueCustomerList.length > 0
      ? Math.round(overdueCustomerList.reduce((sum, i) => sum + i.daysOverdue, 0) / overdueCustomerList.length)
      : 0;

    return { totalCount, totalOverdueDebt, maxDays, avgDays };
  }, [overdueCustomerList]);

  // Export Overdue to CSV
  const exportOverdueExcel = () => {
    exportExcel(
      `تقرير_الزبائن_المتأخرين_عن_السداد_اكثر_من_${overdueDays}_يوم`,
      ['كود الزبون', 'اسم الزبون', 'رقم الهاتف', 'العنوان', 'الدين المستحق', 'العملة', 'أيام التأخير', 'مستوى التأخير', 'تاريخ آخر تسديد', 'مبلغ آخر دفعة', 'تاريخ آخر فاتورة بيع'],
      overdueCustomerList.map((item) => [
        item.customer.code,
        item.customer.name,
        item.customer.phone || '—',
        item.customer.address || '—',
        item.currentBalance,
        settings.currency,
        item.daysOverdue,
        item.severityLabel,
        item.lastPaymentDate || 'لم يسدد بعد',
        item.lastPaymentAmount ? item.lastPaymentAmount : '—',
        item.lastSaleDate || '—',
      ])
    );
  };

  // Filter transactions by date
  const filteredTx = transactions.filter(t => {
    if (fromDate && t.date < fromDate) return false;
    if (toDate && t.date > toDate) return false;
    return true;
  });

  const exportExcel = (title: string, headers: string[], rows: (string | number)[][]) => {
    if (onOpenExcelPreview) {
      onOpenExcelPreview(title, headers, rows, {
        subtitle: settings.storeName,
        filename: title,
      });
      return;
    }
    const csvContent = '\uFEFF' + [headers, ...rows].map(e => e.map(val => `"${val}"`).join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `${title}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border-2 border-stone-300 p-4 rounded-xl shadow-xs text-stone-950">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 size={22} className="text-amber-800" />
            <h1 className="text-xl font-black text-stone-950 font-amiri tracking-wide">التقارير المالية والتحليلية</h1>
          </div>
          <p className="text-xs text-stone-900 font-bold mt-0.5">
            كشوفات دقيقة للديون، المبيعات الآجلة، المشتريات، حركة التحصيلات، وسجلات الأداء
          </p>
        </div>

        {/* Date Filter & Overdue Days Setting */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Overdue Threshold Setting (دائماً متاح وسريع) */}
          <div className="flex items-center gap-1.5 bg-amber-50 p-1.5 rounded-lg border-2 border-amber-300 text-xs shadow-xs">
            <Clock size={15} className="text-amber-800" />
            <div className="flex items-center gap-1">
              <span className="text-stone-950 font-black text-[11px]">أيام تأخير السداد:</span>
              <input
                type="number"
                min="1"
                max="999"
                value={overdueDays}
                onChange={(e) => setOverdueDays(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-14 bg-white border border-amber-400 px-1 py-0.5 rounded text-stone-950 font-black text-center font-mono text-xs focus:bg-white focus:outline-none focus:border-amber-600"
                title="تعيين عدد أيام التأخير لفلترة الزبائن المتأخرين بعد هذه الفترة"
              />
              <span className="text-stone-950 font-bold text-[11px]">يوم</span>
            </div>
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-2 bg-white/90 p-1.5 rounded-lg border-2 border-stone-300 text-xs shadow-xs">
            <Calendar size={15} className="text-amber-800" />
            <div className="flex items-center gap-1">
              <span className="text-stone-950 font-black text-[11px]">من:</span>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="bg-white border border-stone-400 px-2 py-0.5 rounded text-stone-950 font-bold text-xs"
              />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-stone-950 font-black text-[11px]">إلى:</span>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="bg-white border border-stone-400 px-2 py-0.5 rounded text-stone-950 font-bold text-xs"
              />
            </div>
            {(fromDate || toDate) && (
              <button
                onClick={() => { setFromDate(''); setToDate(''); }}
                className="text-red-700 hover:underline text-[11px] px-1 font-black cursor-pointer"
              >
                مسح
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Report Selector Pills */}
      <div className="flex flex-wrap gap-1.5 bg-stone-200/90 p-2 rounded-xl border border-stone-300 text-xs shadow-xs">
        <button
          onClick={() => setActiveReport('customer_debts')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer font-black ${
            activeReport === 'customer_debts'
              ? 'bg-red-800 text-white shadow-md ring-2 ring-red-600'
              : 'bg-white hover:bg-stone-100 text-stone-950 border border-stone-300 shadow-xs'
          }`}
        >
          <Users size={14} />
          <span>ديون الزبائن</span>
        </button>

        <button
          onClick={() => setActiveReport('supplier_dues')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer font-black ${
            activeReport === 'supplier_dues'
              ? 'bg-blue-800 text-white shadow-md ring-2 ring-blue-600'
              : 'bg-white hover:bg-stone-100 text-stone-950 border border-stone-300 shadow-xs'
          }`}
        >
          <Building2 size={14} />
          <span>مستحقات الموردين</span>
        </button>

        <button
          onClick={() => setActiveReport('credit_sales')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer font-black ${
            activeReport === 'credit_sales'
              ? 'bg-emerald-800 text-white shadow-md ring-2 ring-emerald-600'
              : 'bg-white hover:bg-stone-100 text-stone-950 border border-stone-300 shadow-xs'
          }`}
        >
          <TrendingUp size={14} />
          <span>المبيعات الآجلة</span>
        </button>

        <button
          onClick={() => setActiveReport('credit_purchases')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer font-black ${
            activeReport === 'credit_purchases'
              ? 'bg-blue-800 text-white shadow-md ring-2 ring-blue-600'
              : 'bg-white hover:bg-stone-100 text-stone-950 border border-stone-300 shadow-xs'
          }`}
        >
          <TrendingDown size={14} />
          <span>المشتريات الآجلة</span>
        </button>

        <button
          onClick={() => setActiveReport('customer_payments')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer font-black ${
            activeReport === 'customer_payments'
              ? 'bg-amber-800 text-white shadow-md ring-2 ring-amber-600'
              : 'bg-white hover:bg-stone-100 text-stone-950 border border-stone-300 shadow-xs'
          }`}
        >
          <DollarSign size={14} />
          <span>تسديدات الزبائن</span>
        </button>

        <button
          onClick={() => setActiveReport('supplier_payments')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer font-black ${
            activeReport === 'supplier_payments'
              ? 'bg-stone-900 text-white shadow-md ring-2 ring-stone-700'
              : 'bg-white hover:bg-stone-100 text-stone-950 border border-stone-300 shadow-xs'
          }`}
        >
          <DollarSign size={14} />
          <span>تسديدات الموردين</span>
        </button>

        <button
          onClick={() => setActiveReport('overdue_accounts')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer font-black ${
            activeReport === 'overdue_accounts'
              ? 'bg-red-800 text-white shadow-md ring-2 ring-red-600'
              : 'bg-white hover:bg-stone-100 text-stone-950 border border-stone-300 shadow-xs'
          }`}
        >
          <AlertCircle size={14} className={activeReport === 'overdue_accounts' ? 'text-amber-300' : 'text-red-700'} />
          <span>الزبائن المتأخرين عن السداد</span>
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-mono font-black ${
            activeReport === 'overdue_accounts' ? 'bg-white text-red-900' : 'bg-red-700 text-white'
          }`}>
            {overdueCustomerList.length}
          </span>
        </button>

        <button
          onClick={() => setActiveReport('user_activity')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all cursor-pointer font-black ${
            activeReport === 'user_activity'
              ? 'bg-purple-800 text-white shadow-md ring-2 ring-purple-600'
              : 'bg-white hover:bg-stone-100 text-stone-950 border border-stone-300 shadow-xs'
          }`}
        >
          <FileText size={14} />
          <span>نشاط المستخدمين</span>
        </button>
      </div>

      {/* REPORT CONTENT: 1. Customer Debts */}
      {activeReport === 'customer_debts' && (
        <div className="bg-white border-2 border-stone-300 shadow-sm rounded-xl p-5 space-y-4 text-stone-950">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-stone-950 font-amiri">
              تقرير تفصيلي بديون الزبائن المستحقة
            </h2>
            <button
              onClick={() => {
                const debtors = customers.filter(c => c.currentBalance > 0);
                exportExcel(
                  'تقرير_ديون_الزبائن',
                  ['رمز الزبون', 'الاسم', 'الهاتف', 'الدين المستحق', 'العملة'],
                  debtors.map(c => [c.code, c.name, c.phone, c.currentBalance, settings.currency])
                );
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-black text-white text-xs font-bold border border-stone-800 shadow-xs cursor-pointer"
            >
              <FileSpreadsheet size={14} className="text-emerald-400" />
              <span>تصدير Excel</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-stone-900 text-white font-black border-b-2 border-stone-900">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">كود الزبون</th>
                  <th className="p-3">اسم الزبون</th>
                  <th className="p-3">رقم الهاتف</th>
                  <th className="p-3">الرصيد الافتتاحي</th>
                  <th className="p-3 text-left">الدين الحالي المستحق</th>
                  <th className="p-3 text-left">النسبة من الإجمالي</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 text-stone-950 font-bold">
                {(() => {
                  const debtors = customers.filter(c => c.currentBalance > 0).sort((a, b) => b.currentBalance - a.currentBalance);
                  const total = debtors.reduce((acc, c) => acc + c.currentBalance, 0);

                  if (debtors.length === 0) {
                    return (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-stone-800 font-bold">
                          لا توجد ديون مستحقة على أي زبون
                        </td>
                      </tr>
                    );
                  }

                  return debtors.map((c, idx) => {
                    const pct = total > 0 ? ((c.currentBalance / total) * 100).toFixed(1) : '0';
                    return (
                      <tr key={c.id} className="hover:bg-amber-50/70 transition-colors">
                        <td className="p-3 text-stone-800 font-mono font-bold">{idx + 1}</td>
                        <td className="p-3 font-mono text-stone-950 font-black">{c.code}</td>
                        <td className="p-3 font-black text-stone-950 text-sm">{c.name}</td>
                        <td className="p-3 text-stone-950 font-mono font-bold" dir="ltr">{c.phone || '—'}</td>
                        <td className="p-3 font-mono text-stone-950 font-bold">{c.openingBalance.toLocaleString()}</td>
                        <td className="p-3 text-left font-mono font-black text-red-600 text-sm">
                          {c.currentBalance.toLocaleString()} {settings.currency}
                        </td>
                        <td className="p-3 text-left">
                          <div className="flex items-center justify-end gap-2">
                            <span className="font-mono text-xs text-stone-950 font-black">{pct}%</span>
                            <div className="w-16 h-2 bg-stone-200 rounded-full overflow-hidden">
                              <div className="h-full bg-red-600" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  });
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REPORT CONTENT: 2. Supplier Dues */}
      {activeReport === 'supplier_dues' && (
        <div className="bg-white border-2 border-stone-300 shadow-sm rounded-xl p-5 space-y-4 text-stone-950">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-stone-950 font-amiri">
              تقرير مستحقات الموردين والالتزامات القائمة
            </h2>
            <button
              onClick={() => {
                const dues = suppliers.filter(s => s.currentBalance > 0);
                exportExcel(
                  'تقرير_مستحقات_الموردين',
                  ['كود المورد', 'اسم المورد', 'الهاتف', 'المستحق له', 'العملة'],
                  dues.map(s => [s.code, s.name, s.phone, s.currentBalance, settings.currency])
                );
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-black text-white text-xs font-bold border border-stone-800 shadow-xs cursor-pointer"
            >
              <FileSpreadsheet size={14} className="text-emerald-400" />
              <span>تصدير Excel</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-stone-900 text-white font-black border-b-2 border-stone-900">
                <tr>
                  <th className="p-3">#</th>
                  <th className="p-3">كود المورد</th>
                  <th className="p-3">اسم المورد</th>
                  <th className="p-3">رقم الهاتف</th>
                  <th className="p-3">الرصيد الافتتاحي</th>
                  <th className="p-3 text-left">إجمالي المستحق له</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 text-stone-950 font-bold">
                {suppliers.filter(s => s.currentBalance > 0).map((s, idx) => (
                  <tr key={s.id} className="hover:bg-amber-50/70 transition-colors">
                    <td className="p-3 text-stone-800 font-mono font-bold">{idx + 1}</td>
                    <td className="p-3 font-mono text-stone-950 font-black">{s.code}</td>
                    <td className="p-3 font-black text-stone-950 text-sm">{s.name}</td>
                    <td className="p-3 text-stone-950 font-mono font-bold" dir="ltr">{s.phone || '—'}</td>
                    <td className="p-3 font-mono text-stone-950 font-bold">{s.openingBalance.toLocaleString()}</td>
                    <td className="p-3 text-left font-mono font-black text-blue-700 text-sm">
                      {s.currentBalance.toLocaleString()} {settings.currency}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REPORT CONTENT: 3. Credit Sales */}
      {activeReport === 'credit_sales' && (
        <div className="bg-white border-2 border-stone-300 shadow-sm rounded-xl p-5 space-y-4 text-stone-950">
          <h2 className="text-base font-black text-stone-950 font-amiri">
            تقرير المبيعات الآجلة للزبائن خلال الفترة
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-stone-900 text-white font-black border-b-2 border-stone-900">
                <tr>
                  <th className="p-3">التاريخ</th>
                  <th className="p-3">رقم الفاتورة</th>
                  <th className="p-3">اسم الزبون</th>
                  <th className="p-3">المبلغ</th>
                  <th className="p-3">البيان</th>
                  <th className="p-3">الموظف المسؤول</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 text-stone-950 font-bold">
                {filteredTx.filter(t => t.type === 'sale').map(t => (
                  <tr key={t.id} className="hover:bg-amber-50/70 transition-colors">
                    <td className="p-3 font-mono text-stone-900 font-bold">{t.date}</td>
                    <td className="p-3 font-mono text-amber-900 font-black">{t.documentNo}</td>
                    <td className="p-3 font-black text-stone-950 text-sm">{t.accountName}</td>
                    <td className="p-3 font-mono font-black text-red-600 text-sm">{t.amount.toLocaleString()} {settings.currency}</td>
                    <td className="p-3 text-stone-950 font-bold">{t.description}</td>
                    <td className="p-3 text-stone-900 font-bold">{t.userName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REPORT CONTENT: 4. Customer Payments (Collections) */}
      {activeReport === 'customer_payments' && (
        <div className="bg-white border-2 border-stone-300 shadow-sm rounded-xl p-5 space-y-4 text-stone-950">
          <h2 className="text-base font-black text-stone-950 font-amiri">
            تقرير تسديدات وتحصيلات الزبائن النقدية والمصرفية
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-stone-900 text-white font-black border-b-2 border-stone-900">
                <tr>
                  <th className="p-3">التاريخ</th>
                  <th className="p-3">رقم الوصل</th>
                  <th className="p-3">اسم الزبون</th>
                  <th className="p-3">المبلغ المسدد</th>
                  <th className="p-3">طريقة الدفع</th>
                  <th className="p-3">البيان</th>
                  <th className="p-3">المستلم</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 text-stone-950 font-bold">
                {filteredTx.filter(t => t.type === 'customer_payment').map(t => (
                  <tr key={t.id} className="hover:bg-amber-50/70 transition-colors">
                    <td className="p-3 font-mono text-stone-900 font-bold">{t.date}</td>
                    <td className="p-3 font-mono text-amber-900 font-black">{t.documentNo}</td>
                    <td className="p-3 font-black text-stone-950 text-sm">{t.accountName}</td>
                    <td className="p-3 font-mono font-black text-emerald-700 text-sm">{t.amount.toLocaleString()} {settings.currency}</td>
                    <td className="p-3 text-stone-950 font-bold">
                      {t.paymentMethod === 'cash' ? 'نقدي (كاش)' : t.paymentMethod === 'bank_transfer' ? 'تحويل بنكي' : 'شيك'}
                    </td>
                    <td className="p-3 text-stone-950 font-bold">{t.description}</td>
                    <td className="p-3 text-stone-900 font-bold">{t.userName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REPORT CONTENT: 5. Overdue Indebted Customers */}
      {activeReport === 'overdue_accounts' && (
        <div className="bg-white border-2 border-stone-300 shadow-sm rounded-xl p-4 sm:p-5 space-y-5 text-stone-950">
          {/* Header of Overdue Report */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b-2 border-stone-300">
            <div>
              <div className="flex items-center gap-2">
                <AlertTriangle size={22} className="text-red-700" />
                <h2 className="text-base sm:text-lg font-black text-stone-950 font-amiri">
                  تقرير الزبائن المدينين المتأخرين عن السداد
                </h2>
              </div>
              <p className="text-xs text-stone-800 font-bold mt-1">
                حصر كافة الزبائن الذين عليهم ذمم مدينة مستحقة وتجاوزت فترة تأخرهم عن السداد أكثر من{' '}
                <span className="font-mono text-red-700 font-black">{overdueDays}</span> يوماً للمتابعة والتحصيل الفوري
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={exportOverdueExcel}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-800 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs cursor-pointer"
                title="تصدير كشف الزبائن المتأخرين إلى ملف Excel"
              >
                <FileSpreadsheet size={14} className="text-emerald-200" />
                <span>تصدير Excel</span>
              </button>

              <button
                onClick={() => window.print()}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-black text-white text-xs font-bold shadow-xs cursor-pointer"
                title="طباعة التقرير"
              >
                <Printer size={14} className="text-stone-300" />
                <span>طباعة</span>
              </button>
            </div>
          </div>

          {/* Overdue Threshold & Control Bar */}
          <div className="bg-amber-50/70 border-2 border-amber-300 p-3 sm:p-4 rounded-xl space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Overdue Days Input & Presets */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 bg-white px-3 py-1.5 rounded-lg border-2 border-amber-400 shadow-xs">
                  <CalendarClock size={16} className="text-amber-800 shrink-0" />
                  <label htmlFor="overdue-days-input" className="text-xs font-black text-stone-950 whitespace-nowrap">
                    تعيين عدد أيام التأخير:
                  </label>
                  <input
                    id="overdue-days-input"
                    type="number"
                    min="1"
                    max="999"
                    value={overdueDays}
                    onChange={(e) => setOverdueDays(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-16 px-1.5 py-0.5 bg-amber-50/60 border border-amber-400 rounded text-center font-mono font-black text-sm text-red-900 focus:bg-white focus:outline-none focus:border-red-600"
                  />
                  <span className="text-xs font-black text-stone-950">يوم</span>
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-1 bg-white/80 p-1 rounded-lg border border-amber-300 text-xs font-bold">
                  {[15, 30, 45, 60, 90, 120].map((days) => (
                    <button
                      key={days}
                      onClick={() => setOverdueDays(days)}
                      className={`px-2 py-1 rounded-md transition-all cursor-pointer font-mono font-bold ${
                        overdueDays === days
                          ? 'bg-red-800 text-white font-black shadow-xs'
                          : 'bg-stone-100 hover:bg-amber-100 text-stone-800 hover:text-stone-950'
                      }`}
                    >
                      {days} يوم
                    </button>
                  ))}
                </div>
              </div>

              {/* Calculation Method Toggle */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-black text-stone-950 whitespace-nowrap">طريقة احتساب التأخير:</span>
                <select
                  value={overdueCalcMethod}
                  onChange={(e) => setOverdueCalcMethod(e.target.value as any)}
                  className="bg-white border-2 border-amber-300 px-2.5 py-1.5 rounded-lg text-xs font-bold text-stone-950 focus:outline-none focus:border-amber-600 cursor-pointer"
                >
                  <option value="last_payment">منذ تاريخ آخر تسديد (أو آخر فاتورة إذا لم يسدد)</option>
                  <option value="last_sale">منذ تاريخ آخر فاتورة مبيعات مسجلة</option>
                </select>
              </div>
            </div>

            {/* Quick Search & Sorting */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-2 border-t border-amber-200/80">
              <div className="relative flex-1 max-w-sm">
                <Search size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-500" />
                <input
                  type="text"
                  placeholder="بحث سريع باسم الزبون، الكود، أو رقم الهاتف..."
                  value={overdueSearch}
                  onChange={(e) => setOverdueSearch(e.target.value)}
                  className="w-full pl-3 pr-8 py-1 bg-white border border-stone-300 rounded-lg text-xs text-stone-900 placeholder:text-stone-500 font-bold focus:outline-none focus:border-amber-600"
                />
              </div>

              <div className="flex items-center gap-2 text-xs">
                <span className="text-stone-900 font-bold flex items-center gap-1">
                  <ArrowUpDown size={12} />
                  <span>ترتيب حسب:</span>
                </span>
                <select
                  value={overdueSort}
                  onChange={(e) => setOverdueSort(e.target.value as any)}
                  className="bg-white border border-stone-300 px-2 py-1 rounded-md text-xs font-bold text-stone-950 cursor-pointer"
                >
                  <option value="days_desc">الأطول مدة تأخير أولاً</option>
                  <option value="balance_desc">الأعلى مبلغ دين أولاً</option>
                  <option value="name_asc">الاسم أبجدياً</option>
                </select>
              </div>
            </div>
          </div>

          {/* Overdue Summary KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-red-50 border-2 border-red-200 p-3 rounded-xl shadow-xs">
              <span className="text-[11px] font-black text-red-950 block">الزبائن المتأخرين</span>
              <div className="text-xl sm:text-2xl font-black font-mono text-red-700 mt-0.5">
                {overdueStats.totalCount}
                <span className="text-xs font-bold text-stone-700 mr-1.5">زبون</span>
              </div>
              <span className="text-[10px] text-stone-600 font-bold block mt-0.5">
                تجاوزوا {overdueDays} يوماً
              </span>
            </div>

            <div className="bg-stone-50 border-2 border-stone-300 p-3 rounded-xl shadow-xs">
              <span className="text-[11px] font-black text-stone-950 block">إجمالي الديون المتأخرة</span>
              <div className="text-xl sm:text-2xl font-black font-mono text-stone-950 mt-0.5">
                {overdueStats.totalOverdueDebt.toLocaleString()}
                <span className="text-xs font-bold text-stone-700 mr-1.5">{settings.currency}</span>
              </div>
              <span className="text-[10px] text-stone-600 font-bold block mt-0.5">
                مطلوب تحصيلها
              </span>
            </div>

            <div className="bg-amber-50 border-2 border-amber-200 p-3 rounded-xl shadow-xs">
              <span className="text-[11px] font-black text-amber-950 block">أقصى فترة تأخير مسجلة</span>
              <div className="text-xl sm:text-2xl font-black font-mono text-amber-900 mt-0.5">
                {overdueStats.maxDays}
                <span className="text-xs font-bold text-stone-700 mr-1.5">يوم</span>
              </div>
              <span className="text-[10px] text-stone-600 font-bold block mt-0.5">
                أقدم استحقاق غير مسدد
              </span>
            </div>

            <div className="bg-blue-50 border-2 border-blue-200 p-3 rounded-xl shadow-xs">
              <span className="text-[11px] font-black text-blue-950 block">متوسط مدة التأخير</span>
              <div className="text-xl sm:text-2xl font-black font-mono text-blue-800 mt-0.5">
                {overdueStats.avgDays}
                <span className="text-xs font-bold text-stone-700 mr-1.5">يوم</span>
              </div>
              <span className="text-[10px] text-stone-600 font-bold block mt-0.5">
                معدل التأخير للمدينين
              </span>
            </div>
          </div>

          {/* Overdue Customers Table */}
          <div className="overflow-x-auto border border-stone-300 rounded-xl shadow-xs">
            <table className="w-full text-right text-xs">
              <thead className="bg-stone-900 text-white font-black border-b-2 border-stone-900">
                <tr>
                  <th className="p-3 w-10 text-center">#</th>
                  <th className="p-3 w-24">كود الزبون</th>
                  <th className="p-3">اسم الزبون</th>
                  <th className="p-3">رقم الهاتف</th>
                  <th className="p-3 text-left">الدين المستحق</th>
                  <th className="p-3">آخر تسديد</th>
                  <th className="p-3">آخر فاتورة</th>
                  <th className="p-3 text-center">أيام التأخير</th>
                  <th className="p-3 text-center">درجة التأخير</th>
                  <th className="p-3 text-center w-36">إجراءات المتابعة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 text-stone-950 font-bold">
                {overdueCustomerList.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-10 text-center bg-stone-50">
                      <div className="flex flex-col items-center justify-center gap-2 text-stone-700">
                        <CheckCircle2 size={32} className="text-emerald-600" />
                        <span className="text-sm font-black text-stone-950">
                          لا يوجد أي زبون مدين متأخر عن السداد لأكثر من {overdueDays} يوماً!
                        </span>
                        <span className="text-xs text-stone-600">
                          جميع الزبائن المدينين لديهم حركات سداد منتظمة خلال هذه الفترة المحددة، أو يمكنك تجربة خفض عدد أيام التأخير.
                        </span>
                      </div>
                    </td>
                  </tr>
                ) : (
                  overdueCustomerList.map((item, idx) => (
                    <tr key={item.customer.id} className="hover:bg-amber-50/70 transition-colors">
                      <td className="p-3 text-stone-700 font-mono text-center font-bold">{idx + 1}</td>
                      <td className="p-3 font-mono text-stone-950 font-black">{item.customer.code}</td>
                      <td className="p-3">
                        <span className="font-black text-stone-950 text-sm block">{item.customer.name}</span>
                        {item.customer.address && (
                          <span className="text-[10px] text-stone-500 truncate block">{item.customer.address}</span>
                        )}
                      </td>
                      <td className="p-3 font-mono" dir="ltr">
                        {item.customer.phone ? (
                          <a
                            href={`tel:${item.customer.phone}`}
                            className="text-stone-950 hover:text-blue-800 font-bold hover:underline flex items-center gap-1"
                            title="الاتصال بالزبون"
                          >
                            <Phone size={12} className="text-stone-500" />
                            <span>{item.customer.phone}</span>
                          </a>
                        ) : (
                          <span className="text-stone-400 italic">بدون هاتف</span>
                        )}
                      </td>
                      <td className="p-3 text-left font-mono font-black text-red-600 text-sm">
                        {item.currentBalance.toLocaleString()} {settings.currency}
                      </td>
                      <td className="p-3">
                        {item.lastPaymentDate ? (
                          <div>
                            <span className="font-mono text-stone-900 block font-bold">{item.lastPaymentDate}</span>
                            {item.lastPaymentAmount && (
                              <span className="text-[10px] font-mono text-emerald-800 block">
                                دفعة: {item.lastPaymentAmount.toLocaleString()} {settings.currency}
                              </span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-red-700 font-bold bg-red-100 px-2 py-0.5 rounded">
                            لم يسدد بعد
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-mono text-stone-800 font-bold">
                        {item.lastSaleDate || '—'}
                      </td>
                      <td className="p-3 text-center">
                        <span className="font-mono text-base font-black text-red-700">
                          {item.daysOverdue}
                        </span>
                        <span className="text-[10px] text-stone-600 block">يوم</span>
                      </td>
                      <td className="p-3 text-center">
                        <span
                          className={`inline-block text-[10px] px-2.5 py-1 rounded-full font-black ${
                            item.severity === 'critical'
                              ? 'bg-red-800 text-white'
                              : item.severity === 'high'
                              ? 'bg-amber-600 text-white'
                              : item.severity === 'medium'
                              ? 'bg-amber-100 text-amber-950 border border-amber-300'
                              : 'bg-stone-200 text-stone-900'
                          }`}
                        >
                          {item.severityLabel}
                        </span>
                      </td>
                      <td className="p-3">
                        <div className="flex items-center justify-center gap-1.5">
                          {onOpenCustomerLedger && (
                            <button
                              onClick={() => onOpenCustomerLedger(item.customer)}
                              className="p-1.5 rounded-lg bg-stone-100 hover:bg-stone-200 text-stone-900 border border-stone-300 shadow-xs cursor-pointer"
                              title="فتح دفتر كشف حساب الزبون"
                            >
                              <BookOpen size={14} />
                            </button>
                          )}

                          {item.customer.phone && (
                            <button
                              onClick={() => handleWhatsAppReminder(item.customer, item.daysOverdue, item.lastPaymentDate)}
                              className="p-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs cursor-pointer flex items-center gap-1 text-[11px] font-bold"
                              title="إرسال رسالة تذكير بالدين عبر واتساب"
                            >
                              <MessageCircle size={14} />
                              <span className="hidden sm:inline">تذكير</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REPORT CONTENT: 6. User Activity */}
      {activeReport === 'user_activity' && (
        <div className="bg-white border-2 border-stone-300 shadow-sm rounded-xl p-5 space-y-4 text-stone-950">
          <h2 className="text-base font-black text-stone-950 font-amiri">
            تقرير نشاط المستخدمين والمحاسبين
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {Array.from(new Set(transactions.map(t => t.userName))).map(user => {
              const userTx = transactions.filter(t => t.userName === user);
              const totalProcessed = userTx.reduce((acc, t) => acc + t.amount, 0);

              return (
                <div key={user} className="bg-stone-50 border-2 border-stone-300 p-4 rounded-xl space-y-2 shadow-xs">
                  <h3 className="font-black text-stone-950 text-base">{user}</h3>
                  <div className="text-xs text-stone-900 font-bold flex items-center justify-between">
                    <span>عدد العمليات المسجلة:</span>
                    <span className="font-mono text-stone-950 font-black">{userTx.length}</span>
                  </div>
                  <div className="text-xs text-stone-900 font-bold flex items-center justify-between">
                    <span>إجمالي المبالغ المعالجة:</span>
                    <span className="font-mono text-emerald-800 font-black">{totalProcessed.toLocaleString()} {settings.currency}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* REPORT CONTENT: 7. Credit Purchases */}
      {activeReport === 'credit_purchases' && (
        <div className="bg-white border-2 border-stone-300 shadow-sm rounded-xl p-5 space-y-4 text-stone-950">
          <h2 className="text-base font-black text-stone-950 font-amiri">
            تقرير المشتريات الآجلة من الموردين خلال الفترة
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-stone-900 text-white font-black border-b-2 border-stone-900">
                <tr>
                  <th className="p-3">التاريخ</th>
                  <th className="p-3">رقم الفاتورة</th>
                  <th className="p-3">اسم المورد</th>
                  <th className="p-3">مبلغ الشراء</th>
                  <th className="p-3">البيان</th>
                  <th className="p-3">المستخدم</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 text-stone-950 font-bold">
                {filteredTx.filter(t => t.type === 'purchase').map(t => (
                  <tr key={t.id} className="hover:bg-amber-50/70 transition-colors">
                    <td className="p-3 font-mono text-stone-900 font-bold">{t.date}</td>
                    <td className="p-3 font-mono text-blue-800 font-black">{t.documentNo}</td>
                    <td className="p-3 font-black text-stone-950 text-sm">{t.accountName}</td>
                    <td className="p-3 font-mono font-black text-blue-700 text-sm">{t.amount.toLocaleString()} {settings.currency}</td>
                    <td className="p-3 text-stone-950 font-bold">{t.description}</td>
                    <td className="p-3 text-stone-900 font-bold">{t.userName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* REPORT CONTENT: 8. Supplier Payments */}
      {activeReport === 'supplier_payments' && (
        <div className="bg-white border-2 border-stone-300 shadow-sm rounded-xl p-5 space-y-4 text-stone-950">
          <h2 className="text-base font-black text-stone-950 font-amiri">
            تقرير تسديدات وسندات صرف الموردين
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-stone-900 text-white font-black border-b-2 border-stone-900">
                <tr>
                  <th className="p-3">التاريخ</th>
                  <th className="p-3">رقم السند</th>
                  <th className="p-3">اسم المورد</th>
                  <th className="p-3">المبلغ المصروف</th>
                  <th className="p-3">طريقة الدفع</th>
                  <th className="p-3">البيان</th>
                  <th className="p-3">المستخدم</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 text-stone-950 font-bold">
                {filteredTx.filter(t => t.type === 'supplier_payment').map(t => (
                  <tr key={t.id} className="hover:bg-amber-50/70 transition-colors">
                    <td className="p-3 font-mono text-stone-900 font-bold">{t.date}</td>
                    <td className="p-3 font-mono text-amber-900 font-black">{t.documentNo}</td>
                    <td className="p-3 font-black text-stone-950 text-sm">{t.accountName}</td>
                    <td className="p-3 font-mono font-black text-emerald-700 text-sm">{t.amount.toLocaleString()} {settings.currency}</td>
                    <td className="p-3 text-stone-950 font-bold">{t.paymentMethod}</td>
                    <td className="p-3 text-stone-950 font-bold">{t.description}</td>
                    <td className="p-3 text-stone-900 font-bold">{t.userName}</td>
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
