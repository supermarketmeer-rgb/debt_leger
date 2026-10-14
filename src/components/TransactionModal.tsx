import React, { useState, useEffect } from 'react';
import {
  X,
  PlusCircle,
  DollarSign,
  Receipt,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  CreditCard,
  Building2,
  Users
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Customer, Supplier, TransactionType, PaymentMethod, StoreSettings } from '../types';
import { DynamicSearchCombobox } from './DynamicSearchCombobox';
import { FormattedAmountInput } from './FormattedAmountInput';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: TransactionType;
  defaultAccountId?: string;
  customers: Customer[];
  suppliers: Supplier[];
  settings: StoreSettings;
  nextDocNo: string;
  onSave: (params: {
    accountType: 'customer' | 'supplier';
    accountId: string;
    type: TransactionType;
    documentNo: string;
    date: string;
    amount: number;
    paymentMethod?: PaymentMethod;
    description: string;
    notes?: string;
  }) => void;
  onShowReceipt?: (transaction: any) => void;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  type,
  defaultAccountId,
  customers,
  suppliers,
  settings,
  nextDocNo,
  onSave,
  onShowReceipt,
}) => {
  const isCustomerType = type === 'sale' || type === 'customer_payment';
  const isSupplierType = type === 'purchase' || type === 'supplier_payment';
  const isPayment = type === 'customer_payment' || type === 'supplier_payment';

  const [accountId, setAccountId] = useState(defaultAccountId || '');
  const [documentNo, setDocumentNo] = useState(nextDocNo);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState<number | ''>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [warningMsg, setWarningMsg] = useState('');

  useEffect(() => {
    setDocumentNo(nextDocNo);
    if (defaultAccountId) {
      setAccountId(defaultAccountId);
    } else {
      if (isCustomerType && customers.length > 0) setAccountId(customers[0].id);
      if (isSupplierType && suppliers.length > 0) setAccountId(suppliers[0].id);
    }

    // Default description based on transaction type
    if (type === 'sale') setDescription('فاتورة مبيعات بضائع آجلة');
    else if (type === 'customer_payment') setDescription('تسديد دفعة نقدية من حساب الدين');
    else if (type === 'purchase') setDescription('فاتورة شراء وتوريد مواد بالآجل');
    else if (type === 'supplier_payment') setDescription('سند صرف وتسديد دفعة من مستحقات المورد');
  }, [type, defaultAccountId, nextDocNo, isOpen]);

  // Selected Account details & Debt Check
  const selectedCustomer = isCustomerType ? customers.find(c => c.id === accountId) : null;
  const selectedSupplier = isSupplierType ? suppliers.find(s => s.id === accountId) : null;

  // Warning when customer payment exceeds debt
  useEffect(() => {
    if (type === 'customer_payment' && selectedCustomer && typeof amount === 'number') {
      if (amount > selectedCustomer.currentBalance) {
        const excess = amount - selectedCustomer.currentBalance;
        setWarningMsg(
          `تنبيه: مبلغ التسديد (${amount.toLocaleString()} ${settings.currency}) أكبر من الدين المستحق (${selectedCustomer.currentBalance.toLocaleString()} ${settings.currency}). سيصبح رصيد الزبون دائناً بمقدار ${excess.toLocaleString()} ${settings.currency}.`
        );
      } else {
        setWarningMsg('');
      }
    } else {
      setWarningMsg('');
    }
  }, [amount, selectedCustomer, type]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!accountId) {
      setErrorMsg('يرجى اختيار الحساب');
      return;
    }
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      setErrorMsg('يرجى إدخال مبلغ صحيح أكبر من الصفر');
      return;
    }

    try {
      onSave({
        accountType: isCustomerType ? 'customer' : 'supplier',
        accountId,
        type,
        documentNo: documentNo.trim() || nextDocNo,
        date,
        amount: numAmount,
        paymentMethod: isPayment ? paymentMethod : undefined,
        description: description.trim() || 'قيد مالي',
        notes: notes.trim(),
      });

      if (isPayment) {
        // Trigger celebratory confetti for received payment
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 }
        });
      }

      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'حدث خطأ أثناء حفظ الحركة');
    }
  };

  const modalTitle =
    type === 'sale' ? 'إضافة بيع آجل (فاتورة مبيعات)' :
    type === 'customer_payment' ? 'تسجيل تسديد من زبون (وصل قبض)' :
    type === 'purchase' ? 'إضافة شراء آجل (فاتورة مشتريات)' : 'تسجيل تسديد لمورد (سند صرف)';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-lg bg-stone-850 border border-stone-750 rounded-2xl shadow-2xl p-6 relative text-right text-stone-100 my-8">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute left-4 top-4 text-stone-400 hover:text-stone-200 p-1.5 rounded-lg hover:bg-stone-800 transition-colors"
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div className="mb-5 pb-3 border-b border-stone-750">
          <div className="flex items-center gap-2">
            <div className={`p-2 rounded-lg ${
              type === 'sale' ? 'bg-emerald-950 text-emerald-400 border border-emerald-800' :
              type === 'customer_payment' ? 'bg-amber-950 text-amber-400 border border-amber-800' :
              type === 'purchase' ? 'bg-blue-950 text-blue-400 border border-blue-800' :
              'bg-stone-800 text-stone-300 border border-stone-700'
            }`}>
              {isPayment ? <DollarSign size={20} /> : <PlusCircle size={20} />}
            </div>
            <div>
              <h2 className="text-lg font-bold font-amiri text-stone-100">{modalTitle}</h2>
              <p className="text-xs text-stone-400">تحديث فوري لدفتر الحسابات وحساب الرصيد التراكمي آلياً</p>
            </div>
          </div>
        </div>

        {/* Error / Warning Alert */}
        {errorMsg && (
          <div className="p-3 mb-4 rounded-lg bg-red-950/80 border border-red-500/50 text-red-200 text-xs flex items-center gap-2">
            <AlertTriangle size={16} className="shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {warningMsg && (
          <div className="p-3 mb-4 rounded-lg bg-amber-950/80 border border-amber-500/50 text-amber-200 text-xs flex items-center gap-2">
            <AlertTriangle size={16} className="shrink-0 text-amber-400" />
            <span>{warningMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Account Picker */}
          <div>
            <DynamicSearchCombobox
              label={isCustomerType ? 'اختر الزبون' : 'اختر المورد'}
              items={isCustomerType ? customers : suppliers}
              selectedId={accountId}
              onSelect={(id) => setAccountId(id)}
              currency={settings.currency}
              accountTypeLabel={isCustomerType ? 'الزبون' : 'المورد'}
              accentColor={isCustomerType ? 'amber' : 'blue'}
              theme="dark"
              placeholder={isCustomerType ? 'ابحث باسم الزبون، الكود، أو الهاتف...' : 'ابحث باسم المورد، الكود، أو الهاتف...'}
            />
          </div>

          {/* Account Balance Snapshot */}
          {selectedCustomer && (
            <div className="p-2.5 rounded-lg bg-stone-900/80 border border-stone-750 flex items-center justify-between text-xs">
              <span className="text-stone-400">الرصيد الحالي للزبون:</span>
              <span className="font-mono font-bold text-red-400">
                {selectedCustomer.currentBalance.toLocaleString()} {settings.currency}
              </span>
            </div>
          )}

          {selectedSupplier && (
            <div className="p-2.5 rounded-lg bg-stone-900/80 border border-stone-750 flex items-center justify-between text-xs">
              <span className="text-stone-400">المستحق الحالي للمورد:</span>
              <span className="font-mono font-bold text-blue-400">
                {selectedSupplier.currentBalance.toLocaleString()} {settings.currency}
              </span>
            </div>
          )}

          {/* Amount & Date */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-stone-300 block mb-1">
                المبلغ ({settings.currency}) *
              </label>
              <FormattedAmountInput
                value={amount}
                onChange={(numericVal) => setAmount(numericVal || '')}
                placeholder="0.00"
                className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-amber-200 text-sm font-mono font-bold focus:outline-none focus:border-amber-500"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="text-xs font-medium text-stone-300 block mb-1">
                تاريخ الحركة *
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-100 text-xs focus:outline-none focus:border-amber-500"
                required
              />
            </div>
          </div>

          {/* Document Number & Payment Method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-stone-300 block mb-1">
                رقم المستند / الفاتورة
              </label>
              <input
                type="text"
                value={documentNo}
                onChange={(e) => setDocumentNo(e.target.value)}
                className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-amber-400 text-xs font-mono focus:outline-none focus:border-amber-500"
                required
              />
            </div>

            {isPayment ? (
              <div>
                <label className="text-xs font-medium text-stone-300 block mb-1">
                  طريقة التسديد
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-100 text-xs focus:outline-none focus:border-amber-500"
                >
                  <option value="cash">نقداً (كاش)</option>
                  <option value="bank_transfer">حوالة مصرفية / إلكترونية</option>
                  <option value="check">شيك بنكي</option>
                  <option value="other">أخرى</option>
                </select>
              </div>
            ) : (
              <div>
                <label className="text-xs font-medium text-stone-300 block mb-1">
                  النوع المحاسبي
                </label>
                <div className="px-3 py-2 bg-stone-800/60 border border-stone-700 rounded-lg text-stone-400 text-xs">
                  {type === 'sale' ? 'ذمم مدينة (زيادة دين)' : 'ذمم دائنة (زيادة مستحق)'}
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-medium text-stone-300 block mb-1">
              البيان / تفاصيل العملية *
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="مثال: فاتورة تجهيز مواد بناء رقم #105"
              className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-100 text-xs focus:outline-none focus:border-amber-500"
              required
            />
          </div>

          {/* Notes */}
          <div>
            <label className="text-xs font-medium text-stone-300 block mb-1">
              ملاحظات إضافية
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="أي ملاحظات حول السند أو التوصيل أو رقم الإشعار..."
              className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-100 text-xs focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Submit buttons */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-750">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-stone-800 hover:bg-stone-750 text-stone-300 text-xs cursor-pointer"
            >
              إلغاء
            </button>
            <button
              type="submit"
              className={`px-6 py-2 rounded-lg font-bold text-xs shadow-md transition-all cursor-pointer ${
                type === 'sale' ? 'bg-emerald-600 hover:bg-emerald-500 text-white' :
                type === 'customer_payment' ? 'bg-amber-600 hover:bg-amber-500 text-stone-950' :
                type === 'purchase' ? 'bg-blue-600 hover:bg-blue-500 text-white' :
                'bg-stone-600 hover:bg-stone-500 text-white'
              }`}
            >
              حفظ وتثبيت في الدفتر
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
