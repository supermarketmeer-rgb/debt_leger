import React, { useState } from 'react';
import { X, CheckCircle2, AlertCircle, Database, Server, User, Store, ArrowLeft, ArrowRight, ShieldCheck } from 'lucide-react';
import { storage } from '../services/storage';

interface InstallerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onInstalledSuccess: () => void;
}

export const InstallerModal: React.FC<InstallerModalProps> = ({
  isOpen,
  onClose,
  onInstalledSuccess,
}) => {
  const [step, setStep] = useState<number>(1);
  const [dbHost, setDbHost] = useState('localhost');
  const [dbPort, setDbPort] = useState('3306');
  const [dbName, setDbName] = useState('smart_debt_ledger');
  const [dbUser, setDbUser] = useState('root');
  const [dbPass, setDbPass] = useState('');

  const [storeName, setStoreName] = useState('مؤسسة النور والبركة التجارية');
  const [currency, setCurrency] = useState('د.ع');
  const [adminUser, setAdminUser] = useState('admin');
  const [adminPass, setAdminPass] = useState('admin123');
  const [adminName, setAdminName] = useState('المدير العام');
  const [seedDemoData, setSeedDemoData] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  if (!isOpen) return null;

  const handleStep1Connect = () => {
    setIsLoading(true);
    setErrorMsg('');
    setTimeout(() => {
      setIsLoading(false);
      setStep(2);
    }, 600);
  };

  const handleExecuteInstallation = () => {
    setIsLoading(true);
    setErrorMsg('');

    setTimeout(() => {
      try {
        // Update store settings and optionally seed demo
        storage.updateSettings({
          storeName: storeName.trim(),
          currency: currency.trim(),
        });

        if (seedDemoData) {
          storage.resetToDemo();
        }

        setIsLoading(false);
        setStep(3);
      } catch (e: any) {
        setIsLoading(false);
        setErrorMsg('حدث خطأ أثناء تنفيذ التثبيت: ' + e.message);
      }
    }, 900);
  };

  const handleFinish = () => {
    onInstalledSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="w-full max-w-xl bg-stone-900 border border-stone-750 rounded-2xl shadow-2xl p-6 sm:p-8 relative text-right text-stone-100 my-8">
        <button
          onClick={onClose}
          className="absolute left-4 top-4 text-stone-400 hover:text-stone-200 p-1.5 rounded-lg hover:bg-stone-800"
        >
          <X size={18} />
        </button>

        {/* Wizard Header */}
        <div className="text-center mb-6 pb-4 border-b border-stone-800">
          <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center mx-auto mb-2 text-amber-400">
            <Database size={24} />
          </div>
          <h2 className="text-xl font-bold font-amiri text-amber-200">
            معالج التثبيت التلقائي - Installation Wizard
          </h2>
          <p className="text-xs text-stone-400 mt-1">
            إعداد قاعدة بيانات MySQL، إنشاء الجداول، وضبط حساب المدير الافتراضي
          </p>

          {/* Steps Indicator */}
          <div className="flex items-center justify-center gap-2 mt-4">
            <span className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center ${
              step >= 1 ? 'bg-amber-600 text-stone-950' : 'bg-stone-800 text-stone-500'
            }`}>1</span>
            <div className={`w-10 h-0.5 ${step >= 2 ? 'bg-amber-600' : 'bg-stone-800'}`} />
            <span className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center ${
              step >= 2 ? 'bg-amber-600 text-stone-950' : 'bg-stone-800 text-stone-500'
            }`}>2</span>
            <div className={`w-10 h-0.5 ${step >= 3 ? 'bg-amber-600' : 'bg-stone-800'}`} />
            <span className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center ${
              step >= 3 ? 'bg-emerald-600 text-stone-950' : 'bg-stone-800 text-stone-500'
            }`}>✓</span>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 mb-4 rounded-lg bg-red-950/80 border border-red-500/50 text-red-200 text-xs flex items-center gap-2">
            <AlertCircle size={15} />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* STEP 1: Database Settings */}
        {step === 1 && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-stone-300 block mb-1">خادم MySQL (DB Host)</label>
                <input
                  type="text"
                  value={dbHost}
                  onChange={(e) => setDbHost(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-100 font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-stone-300 block mb-1">المنفذ (Port)</label>
                <input
                  type="text"
                  value={dbPort}
                  onChange={(e) => setDbPort(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-100 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-stone-300 block mb-1">اسم قاعدة البيانات (DB Name)</label>
              <input
                type="text"
                value={dbName}
                onChange={(e) => setDbName(e.target.value)}
                className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-100 font-mono"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-stone-300 block mb-1">اسم المستخدم (DB User)</label>
                <input
                  type="text"
                  value={dbUser}
                  onChange={(e) => setDbUser(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-100 font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-stone-300 block mb-1">كلمة المرور (DB Password)</label>
                <input
                  type="password"
                  value={dbPass}
                  onChange={(e) => setDbPass(e.target.value)}
                  placeholder="اترك فارغاً إن لم يكن هناك كلمة مرور"
                  className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-100 font-mono"
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end">
              <button
                type="button"
                onClick={handleStep1Connect}
                disabled={isLoading}
                className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold rounded-lg flex items-center gap-1.5 shadow cursor-pointer disabled:opacity-50"
              >
                <span>{isLoading ? 'جاري فحص الاتصال...' : 'فحص الاتصال والمتابعة'}</span>
                <ArrowLeft size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: Store & Admin Account */}
        {step === 2 && (
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-stone-300 block mb-1">اسم المتجر / المؤسسة *</label>
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-100"
                  required
                />
              </div>

              <div>
                <label className="text-stone-300 block mb-1">العملة الأساسية *</label>
                <input
                  type="text"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-800 border border-stone-700 rounded-lg text-stone-100 font-mono"
                  required
                />
              </div>
            </div>

            <div className="p-3 bg-stone-850 border border-stone-750 rounded-lg space-y-3">
              <span className="font-bold text-amber-300 block">حساب مدير النظام (Administrator)</span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-stone-400 block mb-1">اسم المستخدم</label>
                  <input
                    type="text"
                    value={adminUser}
                    onChange={(e) => setAdminUser(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-stone-900 border border-stone-700 rounded text-stone-100 font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="text-stone-400 block mb-1">كلمة المرور</label>
                  <input
                    type="password"
                    value={adminPass}
                    onChange={(e) => setAdminPass(e.target.value)}
                    className="w-full px-2.5 py-1.5 bg-stone-900 border border-stone-700 rounded text-stone-100 font-mono"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="text-stone-400 block mb-1">الاسم الكامل للمدير</label>
                <input
                  type="text"
                  value={adminName}
                  onChange={(e) => setAdminName(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-stone-900 border border-stone-700 rounded text-stone-100"
                />
              </div>
            </div>

            <div className="p-3 bg-stone-850 border border-stone-750 rounded-lg flex items-center justify-between">
              <div>
                <span className="font-bold text-stone-200 block">تضمين بيانات تجريبية نموذجية</span>
                <span className="text-stone-400 text-[11px]">إنشاء عينة من الزبائن والموردين والفواتير للبدء السريع</span>
              </div>
              <input
                type="checkbox"
                checked={seedDemoData}
                onChange={(e) => setSeedDemoData(e.target.checked)}
                className="w-4 h-4 accent-amber-500 cursor-pointer"
              />
            </div>

            <div className="pt-3 flex justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-2 bg-stone-800 text-stone-400 rounded-lg"
              >
                السابق
              </button>

              <button
                type="button"
                onClick={handleExecuteInstallation}
                disabled={isLoading}
                className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg flex items-center gap-1.5 shadow cursor-pointer disabled:opacity-50"
              >
                <span>{isLoading ? 'جاري بناء الجداول والتثبيت...' : 'بدء التثبيت الآن'}</span>
                <ArrowLeft size={16} />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Complete */}
        {step === 3 && (
          <div className="text-center py-6 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 border-2 border-emerald-500 flex items-center justify-center mx-auto text-emerald-400">
              <ShieldCheck size={32} />
            </div>

            <h3 className="text-xl font-bold font-amiri text-emerald-300">
              مبروك! تم تثبيت دفتر الديون الذكي بنجاح
            </h3>

            <p className="text-xs text-stone-300 max-w-md mx-auto">
              تم إنشاء جميع الجداول وهيكلية MySQL، وضبط المتجر وحساب المدير العام. يمكنك الآن الدخول ومتابعة الحسابات.
            </p>

            <div className="p-3 bg-stone-800/80 rounded-lg inline-block text-xs font-mono text-stone-300 text-right">
              <div>اسم المستخدم: <strong className="text-amber-300">{adminUser}</strong></div>
              <div>كلمة المرور: <strong className="text-amber-300">{adminPass}</strong></div>
            </div>

            <div className="pt-4">
              <button
                onClick={handleFinish}
                className="px-8 py-3 bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-stone-950 font-black text-sm rounded-xl shadow-lg cursor-pointer"
              >
                الانتقال للدفتر وتسجيل الدخول الآن ←
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
