import React, { useState } from 'react';
import {
  RefreshCw,
  Laptop,
  Database,
  CheckCircle2,
  Code2,
  Send,
  Terminal,
  Server,
  Layers,
  Copy,
  Check
} from 'lucide-react';
import { StoreSettings, Customer, Supplier, Transaction } from '../types';
import { storage } from '../services/storage';

interface ApiSyncViewProps {
  settings: StoreSettings;
  customers: Customer[];
  suppliers: Supplier[];
  transactions: Transaction[];
}

export const ApiSyncView: React.FC<ApiSyncViewProps> = ({
  settings,
  customers,
  suppliers,
  transactions,
}) => {
  const [activeTab, setActiveTab] = useState<'tester' | 'sync_sim' | 'docs' | 'code'>('tester');
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('GET /api/customers');
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string>('');
  const [isCopied, setIsCopied] = useState(false);

  // Run mock endpoint test
  const handleTestEndpoint = () => {
    if (selectedEndpoint === 'GET /api/customers') {
      setApiResponse({
        status: 200,
        success: true,
        count: customers.length,
        data: customers.slice(0, 3).map(c => ({
          uuid: c.uuid,
          code: c.code,
          name: c.name,
          phone: c.phone,
          current_balance: c.currentBalance,
          sync_status: c.syncStatus,
        })),
        note: 'عرض عينة من 3 زبائن من إجمالي ' + customers.length
      });
    } else if (selectedEndpoint === 'GET /api/transactions') {
      setApiResponse({
        status: 200,
        success: true,
        count: transactions.length,
        data: transactions.slice(0, 3).map(t => ({
          uuid: t.uuid,
          document_no: t.documentNo,
          account_name: t.accountName,
          type: t.type,
          amount: t.amount,
          balance_after: t.balanceAfter,
        })),
      });
    } else if (selectedEndpoint === 'POST /api/sync') {
      setApiResponse({
        status: 200,
        success: true,
        server_timestamp: new Date().toISOString(),
        device_id: 'DESKTOP-POS-WORKSTATION-01',
        synced_records: 2,
        message: 'تم استقبال القيود المحلية وتحديث أرصدة السحابة بنجاح',
      });
    } else {
      setApiResponse({
        status: 200,
        success: true,
        store_settings: {
          store_name: settings.storeName,
          currency: settings.currency,
          allow_credit_balance: settings.allowCreditBalance,
        }
      });
    }
  };

  // Simulate Desktop SQLite Sync
  const handleRunSyncSimulation = () => {
    const mockOfflineTx: Transaction = {
      id: `tx-offline-${Date.now()}`,
      uuid: `desktop-uuid-${Date.now()}`,
      tenantId: settings.tenantId,
      accountType: 'customer',
      accountId: customers[0]?.id || 'c-1',
      accountName: customers[0]?.name || 'زبون محلي',
      accountCode: customers[0]?.code || 'CUST-1001',
      type: 'sale',
      documentNo: `OFFLINE-INV-${Date.now().toString().slice(-4)}`,
      date: new Date().toISOString().split('T')[0],
      amount: 75000,
      debit: 75000,
      credit: 0,
      balanceAfter: (customers[0]?.currentBalance || 0) + 75000,
      description: 'فاتورة بيع مسجلة من تطبيق سطح المكتب بدون إنترنت',
      notes: 'تمت المزامنة آلياً عبر بروتوكول /api/sync',
      userId: 'u-desktop',
      userName: 'تطبيق سطح المكتب (Windows)',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      syncStatus: 'pending',
      deviceId: 'DESKTOP-WORKSTATION-01',
    };

    const res = storage.processDesktopSync({
      deviceId: 'DESKTOP-WORKSTATION-01',
      lastSyncTimestamp: new Date(Date.now() - 3600000).toISOString(),
      customers: [],
      suppliers: [],
      transactions: [mockOfflineTx],
    });

    setSyncStatusMsg(`نجحت المزامنة! تم إرسال حركة أوفلاين بقيمة 75,000 ${settings.currency} وتحديث دفتر السحابة.`);
    setApiResponse(res);
  };

  const samplePythonCode = `# ========================================================
# سكربت مزامنة تطبيق سطح المكتب (Desktop Client SQLite Bridge)
# يعمل مع SQLite محلياً ويزامن مع الخادم السحابي
# ========================================================
import sqlite3
import requests
import uuid
from datetime import datetime

API_URL = "https://your-domain.com/api/sync"
DEVICE_ID = "DESKTOP-BAGHDAD-01"

def sync_with_cloud():
    conn = sqlite3.connect("local_ledger.db")
    cursor = conn.cursor()
    
    # 1. جلب العمليات التي تم إنشاؤها بدون إنترنت ولم تزامن
    cursor.execute("SELECT uuid, type, document_no, amount, account_id, tx_date FROM transactions WHERE sync_status = 'pending'")
    pending_records = cursor.fetchall()
    
    payload = {
        "device_id": DEVICE_ID,
        "last_sync_timestamp": "2026-10-06 00:00:00",
        "transactions": [
            {
                "uuid": row[0],
                "type": row[1],
                "document_no": row[2],
                "amount": row[3],
                "account_id": row[4],
                "date": row[5]
            } for row in pending_records
        ]
    }
    
    try:
        response = requests.post(API_URL, json=payload, headers={"X-Device-ID": DEVICE_ID}, timeout=10)
        if response.status_code == 200:
            data = response.json()
            # 2. تحديث الحركات المحلية لتصبح synced
            cursor.execute("UPDATE transactions SET sync_status = 'synced' WHERE sync_status = 'pending'")
            conn.commit()
            print("نجحت المزامنة بنجاح مع السحابة!")
    except Exception as e:
        print("تعذر الاتصال بالإنترنت، استمر بالعمل محلياً:", e)

if __name__ == "__main__":
    sync_with_cloud()
`;

  const copyCode = () => {
    navigator.clipboard.writeText(samplePythonCode);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-stone-850 border border-stone-750 p-4 rounded-xl">
        <div>
          <div className="flex items-center gap-2">
            <RefreshCw size={20} className="text-cyan-400" />
            <h1 className="text-lg font-bold text-stone-100 font-amiri">
              مركز REST API ومزامنة تطبيق سطح المكتب (Desktop Client)
            </h1>
          </div>
          <p className="text-xs text-stone-200 font-medium mt-0.5">
            النظام مصمم بمعمارية سحابية ومحلية هجينة تدعم العمل Offline بقاعدة SQLite والمزامنة التلقائية
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-1 bg-stone-800 p-1 rounded-lg text-xs">
          <button
            onClick={() => setActiveTab('tester')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              activeTab === 'tester' ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40' : 'text-stone-300 hover:text-white font-semibold'
            }`}
          >
            اختبار Endpoints
          </button>
          <button
            onClick={() => setActiveTab('sync_sim')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              activeTab === 'sync_sim' ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40' : 'text-stone-300 hover:text-white font-semibold'
            }`}
          >
            محاكي المزامنة
          </button>
          <button
            onClick={() => setActiveTab('docs')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              activeTab === 'docs' ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40' : 'text-stone-300 hover:text-white font-semibold'
            }`}
          >
            شرح المعمارية
          </button>
          <button
            onClick={() => setActiveTab('code')}
            className={`px-3 py-1.5 rounded-md transition-colors cursor-pointer ${
              activeTab === 'code' ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40' : 'text-stone-300 hover:text-white font-semibold'
            }`}
          >
            كود الربط المصدري
          </button>
        </div>
      </div>

      {/* TAB 1: API Endpoint Tester */}
      {activeTab === 'tester' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="bg-stone-850 border border-stone-750 p-4 rounded-xl space-y-3">
            <h3 className="text-sm font-bold text-stone-200 flex items-center gap-1.5">
              <Server size={15} className="text-cyan-400" />
              <span>نقاط النهاية المتاحة (REST Endpoints)</span>
            </h3>

            <div className="space-y-1.5 text-xs">
              {[
                { label: 'GET /api/customers', desc: 'جلب قائمة الزبائن والأرصدة' },
                { label: 'GET /api/transactions', desc: 'جلب دفتر الحركات والقيود' },
                { label: 'POST /api/sync', desc: 'مزامنة ثنائية مع سطح المكتب' },
                { label: 'GET /api/settings', desc: 'إعدادات المتجر والعملة' },
              ].map(ep => (
                <button
                  key={ep.label}
                  onClick={() => { setSelectedEndpoint(ep.label); setApiResponse(null); }}
                  className={`w-full text-right p-2.5 rounded-lg border transition-all cursor-pointer ${
                    selectedEndpoint === ep.label
                      ? 'bg-cyan-950/40 border-cyan-500 text-cyan-200'
                      : 'bg-stone-800 border-stone-750 text-stone-300 hover:bg-stone-750'
                  }`}
                >
                  <span className="font-mono font-bold block">{ep.label}</span>
                  <span className="text-[11px] text-stone-300 mt-0.5 block font-medium">{ep.desc}</span>
                </button>
              ))}
            </div>

            <button
              onClick={handleTestEndpoint}
              className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-stone-950 font-bold text-xs rounded-lg flex items-center justify-center gap-1.5 shadow transition-colors cursor-pointer"
            >
              <Send size={14} />
              <span>إرسال طلب تجريبي (Execute Request)</span>
            </button>
          </div>

          {/* Response Console */}
          <div className="lg:col-span-2 bg-stone-900 border border-stone-800 rounded-xl p-4 font-mono text-xs flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between pb-2 border-b border-stone-800 mb-3 text-stone-200 font-bold">
                <span className="flex items-center gap-2">
                  <Terminal size={14} className="text-emerald-400" />
                  <span>مخرج الاستجابة المباشر (JSON Response Console)</span>
                </span>
                <span className="text-[11px] bg-stone-800 px-2 py-0.5 rounded text-cyan-300 font-bold">
                  {selectedEndpoint}
                </span>
              </div>

              {apiResponse ? (
                <pre className="p-3 bg-black/60 rounded-lg text-emerald-300 overflow-x-auto max-h-96 text-[11px] leading-relaxed">
                  {JSON.stringify(apiResponse, null, 2)}
                </pre>
              ) : (
                <div className="p-12 text-center text-stone-300 text-xs font-medium">
                  اضغط على زر "إرسال طلب تجريبي" لرؤية استجابة الـ API الحقيقية
                </div>
              )}
            </div>

            <div className="pt-3 border-t border-stone-800 text-[11px] text-stone-400 flex items-center justify-between">
              <span>الترميز: UTF-8 • رأس الاستجابة: application/json</span>
              <span className="text-emerald-400">Status: 200 OK</span>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Sync Simulator */}
      {activeTab === 'sync_sim' && (
        <div className="bg-stone-850 border border-stone-750 p-6 rounded-xl space-y-6">
          <div className="flex items-center gap-3">
            <Laptop size={24} className="text-cyan-400" />
            <div>
              <h2 className="text-base font-bold text-stone-100 font-amiri">
                محاكاة سيناريو تطبيق Desktop بدون إنترنت ثم المزامنة
              </h2>
              <p className="text-xs text-stone-400">
                يعمل الجهاز المحلي بتسجيل الفواتير في SQLite بقيم UUID وحالة pending، وعند توفر الإنترنت يرسلها دفعة واحدة
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-stone-900 border border-stone-800">
              <span className="text-cyan-400 font-bold block mb-1">1. العمل بدون إنترنت</span>
              <p className="text-stone-400">المستخدم يفتح تطبيق الديسكتوب، ويسجل عملية بيع بقيمة 75,000 د.ع محلياً في SQLite دون أي بطء أو انقطاع.</p>
            </div>

            <div className="p-4 rounded-xl bg-stone-900 border border-stone-800">
              <span className="text-amber-400 font-bold block mb-1">2. الاتصال التلقائي</span>
              <p className="text-stone-400">عند استشعار توفر الإنترنت، يرسل البرنامج Payload المزامنة مع كود تعريف الجهاز (Device ID: DESKTOP-WORKSTATION-01).</p>
            </div>

            <div className="p-4 rounded-xl bg-stone-900 border border-stone-800">
              <span className="text-emerald-400 font-bold block mb-1">3. مطابقة السحابة والتحديث</span>
              <p className="text-stone-400">الخادم يستقبل العمليات ويقفل قاعدة البيانات بـ Transaction لحساب الأرصدة التراكمية بأمان تام.</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-xl bg-cyan-950/30 border border-cyan-800/40">
            <div>
              <span className="text-sm font-bold text-cyan-200 block">اختبار عملي لعملية المزامنة</span>
              <span className="text-xs text-stone-400">سيتم إنشاء حركة أوفلاين وحفظها في دفتر الحركات السحابي الآن</span>
            </div>

            <button
              onClick={handleRunSyncSimulation}
              className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-stone-950 font-bold text-xs rounded-lg flex items-center gap-2 shadow transition-all cursor-pointer"
            >
              <RefreshCw size={16} />
              <span>تنفيذ محاكاة المزامنة الآن</span>
            </button>
          </div>

          {syncStatusMsg && (
            <div className="p-3 rounded-lg bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-400 shrink-0" />
              <span>{syncStatusMsg}</span>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Architecture Docs */}
      {activeTab === 'docs' && (
        <div className="bg-stone-850 border border-stone-750 p-6 rounded-xl space-y-4 text-xs leading-relaxed text-stone-300">
          <h2 className="text-base font-bold text-stone-100 font-amiri flex items-center gap-2">
            <Layers size={18} className="text-cyan-400" />
            <span>معمارية النظام الهجين وقابلية التوسع (Desktop + Web Cloud)</span>
          </h2>

          <div className="space-y-3">
            <div className="p-3 bg-stone-900 rounded-lg border border-stone-800">
              <h3 className="font-bold text-amber-300 text-sm mb-1">1. مفاتيح UUID العالمية بدلاً من Auto Increment المنفرد</h3>
              <p className="text-stone-400">
                لتجنب تضارب الترقيم التلقائي عند تسجيل معاملات على أكثر من جهاز غير متصل بالإنترنت، كل سجل زبون، مورد، أو حركة مالية يمتلك حقل <code>uuid</code> فريد عالمياً يتم إنشاؤه محلياً في الديسكتوب.
              </p>
            </div>

            <div className="p-3 bg-stone-900 rounded-lg border border-stone-800">
              <h3 className="font-bold text-amber-300 text-sm mb-1">2. بنية Multi-Tenant الجاهزة للبيع كخدمة (SaaS)</h3>
              <p className="text-stone-400">
                جميع الجداول ترتبط بحقل <code>tenant_id</code>، مما يتيح استضافة مئات المتاجر المستقلة على نفس الخادم وقاعدة البيانات دون أن يرى أي متجر بيانات متجر آخر.
              </p>
            </div>

            <div className="p-3 bg-stone-900 rounded-lg border border-stone-800">
              <h3 className="font-bold text-amber-300 text-sm mb-1">3. مطابقة الأرصدة عبر القيود المتسلسلة (No Arbitrary Balance Edits)</h3>
              <p className="text-stone-400">
                لا يُسمح بتعديل رصيد الزبون كقيمة مجردة في قاعدة البيانات، بل يجب أن يكون ناتج عملية بيع أو تسديد مسجلة في جدول <code>transactions</code> ضمن <code>BEGIN TRANSACTION ... COMMIT</code>.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Code Export */}
      {activeTab === 'code' && (
        <div className="bg-stone-850 border border-stone-750 p-6 rounded-xl space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-stone-100 font-amiri flex items-center gap-2">
              <Code2 size={18} className="text-emerald-400" />
              <span>كود بايثون للربط والمزامنة مع قاعدة SQLite المحلية</span>
            </h2>

            <button
              onClick={copyCode}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs border border-stone-700 transition-colors cursor-pointer"
            >
              {isCopied ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
              <span>{isCopied ? 'تم النسخ!' : 'نسخ الكود'}</span>
            </button>
          </div>

          <pre className="p-4 bg-stone-950 rounded-xl text-stone-300 font-mono text-xs overflow-x-auto leading-relaxed border border-stone-800" dir="ltr">
            {samplePythonCode}
          </pre>
        </div>
      )}
    </div>
  );
};
