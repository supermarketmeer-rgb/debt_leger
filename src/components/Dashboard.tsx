import React from 'react';
import {
  Users,
  Building2,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownLeft,
  PlusCircle,
  FileText,
  DollarSign,
  AlertTriangle,
  Receipt,
  CheckCircle2,
  Calendar
} from 'lucide-react';
import { Customer, Supplier, Transaction, StoreSettings, User } from '../types';
import { canUserAccessTab } from '../utils/permissions';

interface DashboardProps {
  currentUser?: User | null;
  settings: StoreSettings;
  customers: Customer[];
  suppliers: Supplier[];
  transactions: Transaction[];
  stats: {
    totalCustomerDebts: number;
    totalSupplierDues: number;
    totalCreditSales: number;
    totalCreditPurchases: number;
    totalCustomerPayments: number;
    totalSupplierPayments: number;
    customerCount: number;
    supplierCount: number;
    transactionsCount: number;
  };
  onOpenTransactionModal: (type: 'sale' | 'customer_payment' | 'purchase' | 'supplier_payment', accountId?: string) => void;
  onOpenCustomerLedger: (customer: Customer) => void;
  onOpenSupplierLedger: (supplier: Supplier) => void;
  onNavigateTab: (tab: any) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  currentUser,
  settings,
  customers,
  suppliers,
  transactions,
  stats,
  onOpenTransactionModal,
  onOpenCustomerLedger,
  onOpenSupplierLedger,
  onNavigateTab,
}) => {
  // Top 4 debtor customers
  const topDebtorCustomers = [...customers]
    .filter(c => c.currentBalance > 0)
    .sort((a, b) => b.currentBalance - a.currentBalance)
    .slice(0, 4);

  // Top 3 creditor suppliers
  const topCreditorSuppliers = [...suppliers]
    .filter(s => s.currentBalance > 0)
    .sort((a, b) => b.currentBalance - a.currentBalance)
    .slice(0, 3);

  // Recent 6 transactions
  const recentTransactions = transactions.slice(0, 6);

  const netBalance = stats.totalCustomerDebts - stats.totalSupplierDues;

  return (
    <div className="space-y-6">
      {/* Ledger Book Top Welcome Ribbon */}
      <div className="relative overflow-hidden rounded-xl bg-white border-2 border-stone-300 p-5 shadow-xs text-stone-950">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" />
              <h1 className="text-xl md:text-2xl font-black font-amiri text-stone-950">
                دفتر الحسابات والديون اليومي
              </h1>
            </div>
            <p className="text-xs text-stone-900 font-bold mt-1">
              متابعة دقيقة للأرصدة، المبيعات الآجلة، المشتريات، وحركة التسديدات
            </p>
          </div>

          {/* Book Direct Navigation Shortcuts */}
          <div className="flex flex-wrap items-center gap-2">
            {canUserAccessTab('sales_payments', currentUser) && (
              <button
                onClick={() => onNavigateTab('sales_payments')}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-red-800 hover:bg-red-700 text-white border-2 border-red-900 text-xs font-black shadow-sm transition-all cursor-pointer"
              >
                <Users size={15} className="text-red-200" />
                <span>📖 المبيعات وتسديد الزبائن</span>
              </button>
            )}

            {canUserAccessTab('purchases_payments', currentUser) && (
              <button
                onClick={() => onNavigateTab('purchases_payments')}
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-blue-800 hover:bg-blue-700 text-white border-2 border-blue-900 text-xs font-black shadow-sm transition-all cursor-pointer"
              >
                <Building2 size={15} className="text-blue-200" />
                <span>🏢 المشتريات وتسديد الموردين</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Primary KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Customer Debts (لنا في السوق) */}
        <div className="bg-white border-2 border-stone-300 rounded-xl p-4 shadow-sm hover:border-amber-600 transition-all text-stone-950">
          <div className="flex items-center justify-between text-stone-950 mb-2">
            <span className="text-xs font-black">إجمالي ديون الزبائن (لنا)</span>
            <div className="w-8 h-8 rounded-lg bg-red-100 border border-red-300 flex items-center justify-center text-red-700">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-red-600">
            {stats.totalCustomerDebts.toLocaleString()}
            <span className="text-xs font-bold text-stone-950 mr-1.5">{settings.currency}</span>
          </div>
          <div className="mt-2 pt-2 border-t border-stone-200 flex items-center justify-between text-xs font-bold text-stone-950">
            <span>عدد الزبائن: {stats.customerCount}</span>
            {canUserAccessTab('customers', currentUser) && (
              <button
                onClick={() => onNavigateTab('customers')}
                className="text-amber-800 font-black hover:underline cursor-pointer"
              >
                عرض الكشف ←
              </button>
            )}
          </div>
        </div>

        {/* Total Supplier Dues (علينا للموردين) */}
        <div className="bg-white border-2 border-stone-300 rounded-xl p-4 shadow-sm hover:border-amber-600 transition-all text-stone-950">
          <div className="flex items-center justify-between text-stone-950 mb-2">
            <span className="text-xs font-black">إجمالي مستحقات الموردين (علينا)</span>
            <div className="w-8 h-8 rounded-lg bg-blue-100 border border-blue-300 flex items-center justify-center text-blue-700">
              <Building2 size={16} />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-blue-700">
            {stats.totalSupplierDues.toLocaleString()}
            <span className="text-xs font-bold text-stone-950 mr-1.5">{settings.currency}</span>
          </div>
          <div className="mt-2 pt-2 border-t border-stone-200 flex items-center justify-between text-xs font-bold text-stone-950">
            <span>عدد الموردين: {stats.supplierCount}</span>
            {canUserAccessTab('suppliers', currentUser) && (
              <button
                onClick={() => onNavigateTab('suppliers')}
                className="text-amber-800 font-black hover:underline cursor-pointer"
              >
                عرض المستحقات ←
              </button>
            )}
          </div>
        </div>

        {/* Total Customer Payments Collected */}
        <div className="bg-white border-2 border-stone-300 rounded-xl p-4 shadow-sm hover:border-amber-600 transition-all text-stone-950">
          <div className="flex items-center justify-between text-stone-950 mb-2">
            <span className="text-xs font-black">إجمالي تسديدات الزبائن</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700">
              <ArrowDownLeft size={16} />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-emerald-700">
            {stats.totalCustomerPayments.toLocaleString()}
            <span className="text-xs font-bold text-stone-950 mr-1.5">{settings.currency}</span>
          </div>
          <div className="mt-2 pt-2 border-t border-stone-200 flex items-center justify-between text-xs font-bold text-stone-950">
            <span>المبيعات الآجلة:</span>
            <span className="text-stone-950 font-mono font-black">{stats.totalCreditSales.toLocaleString()}</span>
          </div>
        </div>

        {/* Net Market Balance */}
        <div className="bg-white border-2 border-stone-300 rounded-xl p-4 shadow-sm hover:border-amber-600 transition-all text-stone-950">
          <div className="flex items-center justify-between text-stone-950 mb-2">
            <span className="text-xs font-black">صافي الميزان (ديوننا - مستحقاتنا)</span>
            <div className="w-8 h-8 rounded-lg bg-amber-100 border border-amber-300 flex items-center justify-center text-amber-800">
              <FileText size={16} />
            </div>
          </div>
          <div className={`text-2xl font-black font-mono ${netBalance >= 0 ? 'text-amber-800' : 'text-red-600'}`}>
            {netBalance.toLocaleString()}
            <span className="text-xs font-bold text-stone-950 mr-1.5">{settings.currency}</span>
          </div>
          <div className="mt-2 pt-2 border-t border-stone-200 flex items-center justify-between text-xs font-bold text-stone-950">
            <span>الحالة: {netBalance >= 0 ? 'فائض لصالح المتجر' : 'عجز والتزامات قائمة'}</span>
            <span className="text-stone-950 font-mono font-black">{stats.transactionsCount} حركة</span>
          </div>
        </div>
      </div>

      {/* Middle Two-Column Grid: Debtor Customers & Supplier Dues */}
      <div className={`grid grid-cols-1 ${canUserAccessTab('suppliers', currentUser) ? 'lg:grid-cols-2' : 'grid-cols-1'} gap-6`}>
        {/* Top Debtor Customers */}
        {canUserAccessTab('customers', currentUser) && (
          <div className="bg-white border-2 border-stone-300 rounded-xl shadow-sm overflow-hidden text-stone-950">
            <div className="p-3.5 bg-stone-100 border-b-2 border-stone-300 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users size={16} className="text-amber-800" />
                <h2 className="text-sm font-black text-stone-950">أكبر ديون الزبائن المستحقة</h2>
              </div>
              <button
                onClick={() => onNavigateTab('customers')}
                className="text-xs text-amber-800 hover:underline font-black cursor-pointer"
              >
                جميع الزبائن ({customers.length}) ←
              </button>
            </div>

            <div className="divide-y divide-stone-200">
              {topDebtorCustomers.length === 0 ? (
                <div className="p-6 text-center text-stone-800 font-bold text-xs">لا توجد ديون مستحقة على الزبائن حالياً</div>
              ) : (
                topDebtorCustomers.map(cust => (
                  <div key={cust.id} className="p-3.5 hover:bg-amber-50/60 flex items-center justify-between gap-3 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-stone-950 text-sm">{cust.name}</span>
                        <span className="text-[11px] bg-stone-200 text-stone-950 font-black px-1.5 py-0.5 rounded font-mono">
                          {cust.code}
                        </span>
                      </div>
                      <span className="text-xs text-stone-950 font-bold font-mono block mt-0.5" dir="ltr">{cust.phone || 'بدون هاتف'}</span>
                    </div>

                    <div className="text-left">
                      <div className="text-base font-black font-mono text-red-600">
                        {cust.currentBalance.toLocaleString()} {settings.currency}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <button
                          onClick={() => onOpenCustomerLedger(cust)}
                          className="text-xs text-amber-800 font-black hover:underline cursor-pointer"
                        >
                          كشف الدفتر
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Top Creditor Suppliers */}
        {canUserAccessTab('suppliers', currentUser) && (
          <div className="bg-white border-2 border-stone-300 rounded-xl shadow-sm overflow-hidden text-stone-950">
            <div className="p-3.5 bg-stone-100 border-b-2 border-stone-300 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 size={16} className="text-blue-800" />
                <h2 className="text-sm font-black text-stone-950">أكبر مستحقات الموردين</h2>
              </div>
              <button
                onClick={() => onNavigateTab('suppliers')}
                className="text-xs text-amber-800 hover:underline font-black cursor-pointer"
              >
                جميع الموردين ({suppliers.length}) ←
              </button>
            </div>

            <div className="divide-y divide-stone-200">
              {topCreditorSuppliers.length === 0 ? (
                <div className="p-6 text-center text-stone-800 font-bold text-xs">لا توجد مستحقات مطلوبة للموردين</div>
              ) : (
                topCreditorSuppliers.map(supp => (
                  <div key={supp.id} className="p-3.5 hover:bg-amber-50/60 flex items-center justify-between gap-3 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-stone-950 text-sm">{supp.name}</span>
                        <span className="text-[11px] bg-stone-200 text-stone-950 font-black px-1.5 py-0.5 rounded font-mono">
                          {supp.code}
                        </span>
                      </div>
                      <span className="text-xs text-stone-950 font-bold font-mono block mt-0.5" dir="ltr">{supp.phone || 'بدون هاتف'}</span>
                    </div>

                    <div className="text-left">
                      <div className="text-base font-black font-mono text-blue-700">
                        {supp.currentBalance.toLocaleString()} {settings.currency}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <button
                          onClick={() => onOpenSupplierLedger(supp)}
                          className="text-xs text-amber-800 font-black hover:underline cursor-pointer"
                        >
                          كشف الحساب
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Recent Ledger Transactions Feed */}
      <div className="bg-white border-2 border-stone-300 rounded-xl shadow-sm overflow-hidden text-stone-950">
        <div className="p-3.5 bg-stone-100 border-b-2 border-stone-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Receipt size={16} className="text-emerald-800" />
            <h2 className="text-sm font-black text-stone-950">آخر القيود والحركات المسجلة في الدفتر</h2>
          </div>
          {canUserAccessTab('journal', currentUser) && (
            <button
              onClick={() => onNavigateTab('journal')}
              className="text-xs text-amber-800 hover:underline font-black cursor-pointer"
            >
              عرض دفتر الحركات العام الكامل ←
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-stone-900 text-white font-black border-b-2 border-stone-900">
              <tr>
                <th className="p-3">التاريخ</th>
                <th className="p-3">نوع الحركة</th>
                <th className="p-3">الحساب (زبون/مورد)</th>
                <th className="p-3">رقم المستند</th>
                <th className="p-3">المبلغ</th>
                <th className="p-3">البيان</th>
                <th className="p-3">المستخدم</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200 text-stone-950 font-bold">
              {recentTransactions.map(tx => {
                const typeLabel =
                  tx.type === 'sale' ? 'بيع آجل' :
                  tx.type === 'customer_payment' ? 'تسديد زبون' :
                  tx.type === 'purchase' ? 'شراء آجل' :
                  tx.type === 'supplier_payment' ? 'تسديد مورد' : 'رصيد افتتاحي';

                const badgeColor =
                  tx.type === 'sale' ? 'bg-red-100 text-red-900 border-red-300 font-black' :
                  tx.type === 'customer_payment' ? 'bg-emerald-100 text-emerald-900 border-emerald-300 font-black' :
                  tx.type === 'purchase' ? 'bg-blue-100 text-blue-900 border-blue-300 font-black' :
                  'bg-amber-100 text-amber-950 border-amber-300 font-black';

                return (
                  <tr key={tx.id} className="hover:bg-amber-50/70 transition-colors">
                    <td className="p-3 font-mono text-stone-900 font-bold">{tx.date}</td>
                    <td className="p-3">
                      <span className={`px-2 py-0.5 rounded text-[11px] border ${badgeColor}`}>
                        {typeLabel}
                      </span>
                    </td>
                    <td className="p-3 font-black text-stone-950 text-sm">
                      {tx.accountName}
                      <span className="text-xs text-stone-800 mr-1.5 font-mono font-bold">({tx.accountCode})</span>
                    </td>
                    <td className="p-3 font-mono text-amber-900 font-black">{tx.documentNo}</td>
                    <td className="p-3 font-mono font-black text-stone-950 text-sm">
                      {tx.amount.toLocaleString()} {settings.currency}
                    </td>
                    <td className="p-3 text-stone-950 font-bold max-w-xs truncate">{tx.description}</td>
                    <td className="p-3 text-stone-900 font-bold text-[11px]">{tx.userName}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
