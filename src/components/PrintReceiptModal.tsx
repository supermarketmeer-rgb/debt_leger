import React, { useState } from 'react';
import { X, Printer, FileText, CheckCircle2, Store } from 'lucide-react';
import { Transaction, StoreSettings } from '../types';

interface PrintReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  accountName: string;
  transactions: Transaction[];
  currentBalance: number;
  settings: StoreSettings;
  isSupplier?: boolean;
}

export const PrintReceiptModal: React.FC<PrintReceiptModalProps> = ({
  isOpen,
  onClose,
  title,
  accountName,
  transactions,
  currentBalance,
  settings,
  isSupplier = false,
}) => {
  const [printMode, setPrintMode] = useState<'a4' | 'thermal'>('a4');

  if (!isOpen) return null;

  const handleExecutePrint = () => {
    window.print();
  };

  const totalDebit = transactions.reduce((acc, t) => acc + t.debit, 0);
  const totalCredit = transactions.reduce((acc, t) => acc + t.credit, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-4xl bg-stone-900 border border-stone-800 rounded-2xl shadow-2xl p-6 relative text-right text-stone-100 my-8">
        {/* Modal Controls - Hidden during print */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-800 mb-6 no-print">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-amber-200 font-amiri">
              معاينة الطباعة ({printMode === 'a4' ? 'نموذج A4 رسمي' : 'إيصال حراري 80mm'})
            </h2>
            <div className="flex items-center gap-1 bg-stone-800 p-1 rounded-lg text-xs">
              <button
                onClick={() => setPrintMode('a4')}
                className={`px-3 py-1 rounded transition-colors ${
                  printMode === 'a4' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-stone-400'
                }`}
              >
                تقرير A4
              </button>
              <button
                onClick={() => setPrintMode('thermal')}
                className={`px-3 py-1 rounded transition-colors ${
                  printMode === 'thermal' ? 'bg-amber-500/20 text-amber-300 font-bold' : 'text-stone-400'
                }`}
              >
                إيصال حراري (80mm)
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExecutePrint}
              className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs rounded-lg flex items-center gap-1.5 shadow cursor-pointer"
            >
              <Printer size={15} />
              <span>إرسال للطابعة الآن (Print)</span>
            </button>
            <button
              onClick={onClose}
              className="p-2 text-stone-400 hover:text-stone-200 rounded-lg hover:bg-stone-800"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* PRINTABLE AREA */}
        <div className="bg-white text-black p-8 rounded-xl shadow-inner print-page">
          {printMode === 'a4' ? (
            /* A4 Official Format */
            <div className="space-y-6">
              {/* Header */}
              <div className="border-b-2 border-black pb-4 flex justify-between items-start">
                <div className="flex items-start gap-3.5">
                  {settings.logoUrl ? (
                    <img
                      src={settings.logoUrl}
                      alt={settings.storeName}
                      className="w-16 h-16 object-contain rounded border border-stone-300 p-0.5 shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded border border-stone-300 flex items-center justify-center text-stone-600 bg-stone-50 shrink-0">
                      <Store size={22} />
                    </div>
                  )}
                  <div>
                    <h1 className="text-2xl font-black font-amiri">{settings.storeName}</h1>
                    <span className="text-xs text-stone-600 block">{settings.appName} • إدارة الحسابات والديون</span>
                    {settings.phone && <span className="text-xs text-stone-600 block">هاتف: {settings.phone}</span>}
                    {settings.address && <span className="text-xs text-stone-600 block">{settings.address}</span>}
                  </div>
                </div>
                <div className="text-left">
                  <h2 className="text-lg font-bold font-amiri">{title}</h2>
                  <span className="text-xs text-stone-600 block">تاريخ الإصدار: {new Date().toLocaleDateString('ar-EG')}</span>
                  <span className="text-xs font-mono font-bold block mt-1">العملة: {settings.currency}</span>
                </div>
              </div>

              {/* Account Box */}
              <div className="bg-stone-100 p-3 rounded border border-stone-300 flex justify-between items-center text-xs">
                <div>
                  <span className="font-bold">اسم الحساب: </span>
                  <span className="text-sm font-bold">{accountName}</span>
                </div>
                <div>
                  <span className="font-bold">الرصيد الختامي: </span>
                  <span className="text-sm font-mono font-bold text-red-700">
                    {currentBalance.toLocaleString()} {settings.currency}
                  </span>
                </div>
              </div>

              {/* Movements Table */}
              <table className="w-full text-right text-xs border border-black">
                <thead>
                  <tr className="bg-stone-200 border-b border-black font-bold">
                    <th className="p-2 border-l border-black">التاريخ</th>
                    <th className="p-2 border-l border-black">رقم المستند</th>
                    <th className="p-2 border-l border-black">البيان والتفاصيل</th>
                    <th className="p-2 border-l border-black text-left">مدين</th>
                    <th className="p-2 border-l border-black text-left">دائن</th>
                    <th className="p-2 text-left">الرصيد التراكمي</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx, i) => (
                    <tr key={tx.id} className="border-b border-stone-300">
                      <td className="p-2 border-l border-stone-300 font-mono">{tx.date}</td>
                      <td className="p-2 border-l border-stone-300 font-mono font-bold">{tx.documentNo}</td>
                      <td className="p-2 border-l border-stone-300">{tx.description}</td>
                      <td className="p-2 border-l border-stone-300 text-left font-mono">{tx.debit > 0 ? tx.debit.toLocaleString() : '—'}</td>
                      <td className="p-2 border-l border-stone-300 text-left font-mono">{tx.credit > 0 ? tx.credit.toLocaleString() : '—'}</td>
                      <td className="p-2 text-left font-mono font-bold">{tx.balanceAfter.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-stone-200 border-t-2 border-black font-bold">
                    <td colSpan={3} className="p-2 text-right border-l border-black">المجموع الكلي:</td>
                    <td className="p-2 text-left font-mono border-l border-black">{totalDebit.toLocaleString()}</td>
                    <td className="p-2 text-left font-mono border-l border-black">{totalCredit.toLocaleString()}</td>
                    <td className="p-2 text-left font-mono font-black">{currentBalance.toLocaleString()} {settings.currency}</td>
                  </tr>
                </tfoot>
              </table>

              {/* Signatures */}
              <div className="pt-10 flex justify-between items-center text-xs text-stone-700">
                <div className="text-center w-40">
                  <div className="border-b border-stone-400 pb-8 font-bold">توقيع العميل / المستلم</div>
                </div>
                <div className="text-center w-40">
                  <div className="border-b border-stone-400 pb-8 font-bold">توقيع وختم الإدارة</div>
                </div>
              </div>
            </div>
          ) : (
            /* 80mm Thermal Receipt */
            <div className="max-w-[320px] mx-auto text-center font-mono text-xs space-y-3 p-2">
              {settings.logoUrl && (
                <div className="flex justify-center mb-1">
                  <img
                    src={settings.logoUrl}
                    alt={settings.storeName}
                    className="h-10 object-contain mx-auto"
                  />
                </div>
              )}
              <h1 className="text-base font-black font-amiri">{settings.storeName}</h1>
              <p className="text-[11px] text-stone-600">{settings.appName}</p>
              <div className="border-b border-dashed border-black my-2" />

              <div className="text-right text-[11px] space-y-1">
                <div>الحساب: <strong>{accountName}</strong></div>
                <div>التاريخ: {new Date().toLocaleDateString('ar-EG')}</div>
              </div>

              <div className="border-b border-dashed border-black my-2" />

              <div className="space-y-1.5 text-right text-[11px]">
                {transactions.slice(0, 5).map(t => (
                  <div key={t.id} className="flex justify-between">
                    <span className="truncate max-w-[180px]">{t.description}</span>
                    <span className="font-bold">{t.amount.toLocaleString()}</span>
                  </div>
                ))}
              </div>

              <div className="border-b-2 border-black my-2" />

              <div className="flex justify-between font-bold text-sm">
                <span>الرصيد المستحق:</span>
                <span>{currentBalance.toLocaleString()} {settings.currency}</span>
              </div>

              <div className="border-b border-dashed border-black my-2" />
              <p className="text-[10px] text-stone-600">شكراً لتعاملكم معنا • يرجى الاحتفاظ بالوصل</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
