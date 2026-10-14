import React, { useState, useRef } from 'react';
import {
  History,
  HardDriveDownload,
  Upload,
  RefreshCw,
  Search,
  Shield,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Lock,
  FolderOpen,
  FolderDown,
  Save,
  Download,
  Trash2,
  Info,
  RotateCcw,
  Sparkles,
  HardDrive
} from 'lucide-react';
import { AuditLog, BackupRecord, StoreSettings } from '../types';
import { storage } from '../services/storage';
import {
  saveBackupWithFilePicker,
  saveBackupToFolder,
  downloadBackupDirect,
  isFilePickerSupported,
  isDirectoryPickerSupported
} from '../utils/fileExport';

interface AuditBackupViewProps {
  settings: StoreSettings;
  auditLogs: AuditLog[];
  backups: BackupRecord[];
  onRefreshData: () => void;
}

export const AuditBackupView: React.FC<AuditBackupViewProps> = ({
  settings,
  auditLogs,
  backups,
  onRefreshData,
}) => {
  const [activeTab, setActiveTab] = useState<'audit' | 'backup'>('backup');
  const [searchLog, setSearchLog] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'info' | 'warning' } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredLogs = auditLogs.filter(log =>
    log.action.toLowerCase().includes(searchLog.toLowerCase()) ||
    log.userName.toLowerCase().includes(searchLog.toLowerCase()) ||
    log.details.toLowerCase().includes(searchLog.toLowerCase())
  );

  // 1. Create and Save with File Picker (User chooses folder/path in Save Dialog)
  const handleCreateAndPickPath = async () => {
    setIsProcessing(true);
    try {
      const record = storage.createBackup();
      onRefreshData();

      const result = await saveBackupWithFilePicker(record);
      if (result.success) {
        if (result.method === 'picker') {
          setStatusMessage({
            text: `تم حفظ النسخة الاحتياطية بنجاح في المسار الذي حددته (${result.destination || record.filename}) بحجم ${record.size}`,
            type: 'success',
          });
        } else {
          setStatusMessage({
            text: `تم إنشاء وتنزيل النسخة الاحتياطية (${record.filename}) بحجم ${record.size}`,
            type: 'success',
          });
        }
      } else if (result.canceled) {
        setStatusMessage({
          text: `تم إلغاء نافذة اختيار المسار، تم حفظ سجل النسخة الاحتياطية في النظام ويمكنك تنزيلها لاحقاً.`,
          type: 'info',
        });
      }
    } catch (e: any) {
      alert('حدث خطأ أثناء حفظ النسخة الاحتياطية: ' + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. Create and Save into a selected folder
  const handleCreateAndPickFolder = async () => {
    setIsProcessing(true);
    try {
      const record = storage.createBackup();
      onRefreshData();

      const result = await saveBackupToFolder(record);
      if (result.success) {
        setStatusMessage({
          text: `تم حفظ النسخة الاحتياطية بنجاح داخل ${result.destination}`,
          type: 'success',
        });
      } else if (result.canceled) {
        setStatusMessage({
          text: 'تم إلغاء اختيار المجلد.',
          type: 'info',
        });
      } else if (result.error) {
        alert(result.error);
      }
    } catch (e: any) {
      alert('حدث خطأ أثناء حفظ النسخة: ' + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // 3. Direct Download fallback
  const handleDirectDownload = (recordToDownload?: BackupRecord) => {
    try {
      const record = recordToDownload || storage.createBackup();
      if (!recordToDownload) {
        onRefreshData();
      }
      downloadBackupDirect(record);
      setStatusMessage({
        text: `تم تنزيل ملف النسخة الاحتياطية مباشرة: ${record.filename}`,
        type: 'success',
      });
    } catch (e: any) {
      alert('فشل في التنزيل: ' + e.message);
    }
  };

  // 4. Save existing backup with File Picker
  const handleSaveExistingWithPicker = async (record: BackupRecord) => {
    setIsProcessing(true);
    try {
      const result = await saveBackupWithFilePicker(record);
      if (result.success) {
        setStatusMessage({
          text: `تم حفظ النسخة (${result.destination || record.filename}) بنجاح في المسار المختار`,
          type: 'success',
        });
      } else if (result.canceled) {
        setStatusMessage({
          text: 'تم إلغاء نافذة اختيار المسار.',
          type: 'info',
        });
      }
    } catch (e: any) {
      alert('حدث خطأ: ' + e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  // 5. Restore from local JSON file
  const handleRestoreFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (confirm('تنبيه هام جداً:\nاستعادة هذه النسخة سيستبدل البيانات الحالية في النظام ببيانات النسخة الاحتياطية.\nهل تريد المتابعة وتأكيد الاستعادة؟')) {
        const result = storage.restoreBackup(content);
        if (result.success) {
          setStatusMessage({
            text: 'تمت استعادة بيانات النسخة الاحتياطية بنجاح وتحديث كافة الحسابات!',
            type: 'success',
          });
          onRefreshData();
        } else {
          alert(result.message);
        }
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // 6. Restore from an existing backup in table
  const handleRestoreExisting = (record: BackupRecord) => {
    if (!record.dataJson) {
      alert('بيانات هذه النسخة غير متوفرة للاستعادة المباشرة');
      return;
    }
    if (confirm(`تنبيه هام:\nهل أنت متأكد من استعادة النسخة بتاريخ (${new Date(record.createdAt).toLocaleString('ar-EG')})؟\nسيتم استبدال البيانات الحالية.`)) {
      const result = storage.restoreBackup(record.dataJson);
      if (result.success) {
        setStatusMessage({
          text: 'تمت استعادة النسخة الاحتياطية بنجاح!',
          type: 'success',
        });
        onRefreshData();
      } else {
        alert(result.message);
      }
    }
  };

  // 7. Delete backup from history
  const handleDeleteBackup = (id: string, filename: string) => {
    if (confirm(`هل أنت متأكد من حذف النسخة الاحتياطية (${filename}) من السجل؟`)) {
      storage.deleteBackup(id);
      setStatusMessage({
        text: `تم حذف النسخة (${filename}) من سجل النسخ.`,
        type: 'info',
      });
      onRefreshData();
    }
  };

  // 8. Reset to Demo
  const handleResetToDemo = () => {
    if (confirm('هل أنت متأكد من تصفير وتهيئة النظام؟ سيتم مسح كافة سجلات الحسابات والحركات وإعادة الدفتر لحالته النظيفة الأولى!')) {
      storage.resetToDemo();
      setStatusMessage({
        text: 'تم مسح كافة البيانات وتصفير النظام بنجاح.',
        type: 'success',
      });
      onRefreshData();
    }
  };

  const hasFileSystemSupport = isFilePickerSupported();

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/95 border-2 border-stone-300 p-4 rounded-xl shadow-xs text-stone-950">
        <div>
          <div className="flex items-center gap-2">
            <Shield size={22} className="text-amber-800" />
            <h1 className="text-xl font-black text-stone-950 font-amiri">
              الأمان والرقابة والنسخ الاحتياطي
            </h1>
          </div>
          <p className="text-xs text-stone-900 font-bold mt-0.5">
            تأمين النسخ الاحتياطية في المسار الذي تختاره وسجل التدقيق الرقابي للحركات المالية
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-1.5 bg-stone-200/90 p-1 rounded-lg border border-stone-300 text-xs shadow-xs">
          <button
            onClick={() => setActiveTab('backup')}
            className={`px-3 py-1.5 rounded-md transition-all cursor-pointer font-black ${
              activeTab === 'backup'
                ? 'bg-amber-800 text-white shadow-md ring-2 ring-amber-600'
                : 'bg-white hover:bg-stone-100 text-stone-950 border border-stone-300'
            }`}
          >
            النسخ الاحتياطي وتحديد المسار
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`px-3 py-1.5 rounded-md transition-all cursor-pointer font-black ${
              activeTab === 'audit'
                ? 'bg-amber-800 text-white shadow-md ring-2 ring-amber-600'
                : 'bg-white hover:bg-stone-100 text-stone-950 border border-stone-300'
            }`}
          >
            سجل العمليات (Audit Log)
          </button>
        </div>
      </div>

      {/* Status banner */}
      {statusMessage && (
        <div className={`p-3.5 rounded-lg border-2 text-xs font-black flex items-center justify-between shadow-xs transition-all ${
          statusMessage.type === 'success'
            ? 'bg-emerald-50 border-emerald-500 text-emerald-950'
            : statusMessage.type === 'info'
            ? 'bg-blue-50 border-blue-500 text-blue-950'
            : 'bg-amber-50 border-amber-500 text-amber-950'
        }`}>
          <div className="flex items-center gap-2.5">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 size={18} className="text-emerald-700 shrink-0" />
            ) : statusMessage.type === 'info' ? (
              <Info size={18} className="text-blue-700 shrink-0" />
            ) : (
              <AlertTriangle size={18} className="text-amber-700 shrink-0" />
            )}
            <span className="leading-relaxed">{statusMessage.text}</span>
          </div>
          <button
            onClick={() => setStatusMessage(null)}
            className="text-stone-700 hover:text-black hover:underline font-black cursor-pointer mr-3 shrink-0"
          >
            إغلاق
          </button>
        </div>
      )}

      {/* TAB 1: Backup & Restore */}
      {activeTab === 'backup' && (
        <div className="space-y-6">
          {/* Main Action Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Create Backup with Path Picker */}
            <div className="bg-white border-2 border-stone-300 rounded-xl p-5 space-y-4 text-stone-950 shadow-sm flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-stone-950 font-black text-base">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-800">
                    <Save size={18} />
                  </div>
                  <div>
                    <span>إنشاء نسخة احتياطية وحفظها في مسار مخصص</span>
                    <span className="text-[10px] block font-bold text-emerald-800 font-sans">
                      {hasFileSystemSupport ? 'فتح نافذة اختيار المسار والمجلد (Save As)' : 'تنزيل وحفظ آمن'}
                    </span>
                  </div>
                </div>

                <p className="text-xs text-stone-800 font-bold leading-relaxed">
                  يقوم بفتح نافذة مستكشف الملفات لاختيار المجلد أو القرص الذي تريده (مثل القرص D أو فلاشة USB أو مجلد المستندات) لحفظ ملف النسخة الاحتياطية مباشرة فيه.
                </p>

                <div className="p-2.5 bg-stone-50 border border-stone-200 rounded-lg text-[11px] text-stone-700 font-semibold space-y-1">
                  <div className="flex items-center gap-1.5 text-stone-900 font-bold">
                    <HardDrive size={13} className="text-amber-800 shrink-0" />
                    <span>مزايا اختيار المسار:</span>
                  </div>
                  <p>• إمكانية النسخ المباشر إلى فلاش ديسك خارجي لحماية البيانات من أعطال الجهاز.</p>
                  <p>• تسمية الملف أو تركه باسمه المولد تلقائياً مع الوقت والتاريخ.</p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2 border-t border-stone-200">
                <button
                  onClick={handleCreateAndPickPath}
                  disabled={isProcessing}
                  className="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 active:scale-[0.99] text-white font-black text-xs rounded-lg flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer disabled:opacity-50"
                >
                  <FolderOpen size={16} />
                  <span>فتح نافذة اختيار المسار وحفظ النسخة (Save As)</span>
                </button>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={handleCreateAndPickFolder}
                    disabled={isProcessing}
                    className="py-2 px-3 bg-stone-100 hover:bg-stone-200 border border-stone-300 text-stone-900 font-bold text-[11px] rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                    title="اختيار مجلد كامل وحفظ النسخة الاحتياطية بداخله"
                  >
                    <FolderDown size={14} className="text-amber-800" />
                    <span>اختيار مجلد مخصص</span>
                  </button>

                  <button
                    onClick={() => handleDirectDownload()}
                    disabled={isProcessing}
                    className="py-2 px-3 bg-stone-100 hover:bg-stone-200 border border-stone-300 text-stone-900 font-bold text-[11px] rounded-lg flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                    title="تنزيل مباشر إلى مجلد التنزيلات الافتراضي"
                  >
                    <Download size={14} className="text-blue-700" />
                    <span>تنزيل سريع مباشر</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Restore Backup Card */}
            <div className="bg-white border-2 border-stone-300 rounded-xl p-5 space-y-4 text-stone-950 shadow-sm flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-stone-950 font-black text-base">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 border border-blue-300 flex items-center justify-center text-blue-800">
                    <Upload size={18} />
                  </div>
                  <span>استعادة البيانات من نسخة احتياطية سابقة</span>
                </div>

                <p className="text-xs text-stone-800 font-bold leading-relaxed">
                  اختر ملف نسخة احتياطية (.json) محفوظاً على حاسوبك أو فلاشة USB لاستعادة كافة الزبائن والموردين والقيود المحاسبية.
                </p>

                <div className="p-2.5 bg-amber-50/70 border border-amber-300 rounded-lg text-[11px] text-amber-950 font-bold space-y-1">
                  <div className="flex items-center gap-1.5 text-amber-900 font-black">
                    <AlertTriangle size={13} className="shrink-0 text-amber-800" />
                    <span>تنبيه هام عند الاستعادة:</span>
                  </div>
                  <p>عملية الاستعادة تستبدل البيانات الحالية ببيانات الملف. يُنصح بحفظ نسخة احتياطية من الحالة الحالية قبل الاستعادة.</p>
                </div>
              </div>

              <div className="pt-2 border-t border-stone-200">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleRestoreFile}
                  accept=".json"
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2.5 px-4 bg-blue-700 hover:bg-blue-800 active:scale-[0.99] text-white font-black text-xs rounded-lg flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
                >
                  <Upload size={16} />
                  <span>تحديد ملف النسخة من الجهاز واستعادته</span>
                </button>
              </div>
            </div>

          </div>

          {/* Backup History Table */}
          <div className="bg-white border-2 border-stone-300 rounded-xl p-5 space-y-4 text-stone-950 shadow-sm">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-stone-200 pb-3">
              <div className="flex items-center gap-2">
                <HardDriveDownload size={18} className="text-amber-800" />
                <h2 className="text-base font-black text-stone-950 font-amiri">
                  سجل النسخ الاحتياطية السابقة في النظام ({backups.length})
                </h2>
              </div>
              <span className="text-[11px] text-stone-600 font-bold">
                يمكنك إعادة حفظ أي نسخة سابقة في مسار مخصص جديد أو استعادتها
              </span>
            </div>

            {backups.length === 0 ? (
              <div className="text-center py-8 bg-stone-50 rounded-lg border border-dashed border-stone-300 text-stone-600 font-bold text-xs space-y-2">
                <HardDrive size={32} className="mx-auto text-stone-400 opacity-60" />
                <p>لا توجد نسخ احتياطية مسجلة حتى الآن.</p>
                <p className="text-[11px] text-stone-500">اضغط على زر "فتح نافذة اختيار المسار وحفظ النسخة" لإنشاء أول نسخة.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-right text-xs">
                  <thead className="bg-stone-900 text-white font-black border-b-2 border-stone-900">
                    <tr>
                      <th className="p-3 w-44">التاريخ والوقت</th>
                      <th className="p-3">اسم ملف النسخة</th>
                      <th className="p-3 w-24 text-center">الحجم</th>
                      <th className="p-3 w-28 text-center">عدد السجلات</th>
                      <th className="p-3 w-64 text-center">الإجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-200 text-stone-950 font-bold">
                    {backups.map((bk) => (
                      <tr key={bk.id} className="hover:bg-amber-50/70 transition-colors">
                        <td className="p-3 font-mono text-stone-900 font-bold text-[11px]">
                          {new Date(bk.createdAt).toLocaleString('ar-EG')}
                        </td>
                        <td className="p-3 font-mono font-bold text-stone-900 text-xs dir-ltr text-right">
                          <span className="inline-block bg-stone-100 border border-stone-300 px-2 py-0.5 rounded text-[11px]">
                            {bk.filename}
                          </span>
                        </td>
                        <td className="p-3 text-center font-mono text-xs text-stone-800">
                          {bk.size}
                        </td>
                        <td className="p-3 text-center text-xs">
                          <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-900 font-black text-[11px]">
                            {bk.recordsCount} سجل
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-center gap-1.5">
                            {/* Save to custom path */}
                            <button
                              onClick={() => handleSaveExistingWithPicker(bk)}
                              className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                              title="حفظ في مسار تختاره عبر نافذة Save As"
                            >
                              <FolderOpen size={12} />
                              <span>حفظ بمسار...</span>
                            </button>

                            {/* Direct Download */}
                            <button
                              onClick={() => handleDirectDownload(bk)}
                              className="px-2 py-1 bg-stone-200 hover:bg-stone-300 text-stone-900 rounded text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                              title="تنزيل مباشر"
                            >
                              <Download size={12} />
                              <span>تنزيل</span>
                            </button>

                            {/* Restore */}
                            {bk.dataJson && (
                              <button
                                onClick={() => handleRestoreExisting(bk)}
                                className="px-2 py-1 bg-blue-100 hover:bg-blue-200 text-blue-900 border border-blue-300 rounded text-[11px] font-bold flex items-center gap-1 transition-colors cursor-pointer"
                                title="استعادة النظام من هذه النسخة"
                              >
                                <RotateCcw size={12} />
                                <span>استعادة</span>
                              </button>
                            )}

                            {/* Delete */}
                            <button
                              onClick={() => handleDeleteBackup(bk.id, bk.filename)}
                              className="p-1 hover:bg-red-100 text-stone-400 hover:text-red-700 rounded transition-colors cursor-pointer"
                              title="حذف من السجل"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Reset to Demo */}
          <div className="bg-amber-50/60 border-2 border-amber-300 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div>
              <span className="text-sm font-black text-stone-950 block">مسح كافة البيانات وإعادة تهيئة النظام</span>
              <span className="text-xs text-stone-900 font-bold">تصفير الدفتر وحذف جميع الزبائن والموردين والحركات للبدء بسجل نظيف تماماً</span>
            </div>
            <button
              onClick={handleResetToDemo}
              className="px-4 py-2 bg-stone-900 hover:bg-black text-white rounded-lg text-xs font-black transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs shrink-0"
            >
              <RefreshCw size={14} />
              <span>مسح وتصفير السجل</span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: Audit Log */}
      {activeTab === 'audit' && (
        <div className="bg-white border-2 border-stone-300 rounded-xl p-5 space-y-4 text-stone-950 shadow-sm">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-stone-950 text-base font-black">
              <History size={18} className="text-amber-800" />
              <span>سجل التدقيق الرقابي لجميع الحركات والتعديلات</span>
            </div>

            <div className="relative w-full sm:w-72">
              <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500" />
              <input
                type="text"
                placeholder="بحث في سجل الرقابة..."
                value={searchLog}
                onChange={(e) => setSearchLog(e.target.value)}
                className="w-full pl-3 pr-8 py-1.5 bg-white border border-stone-400 rounded-lg text-stone-950 font-bold text-xs focus:outline-none focus:border-amber-600"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead className="bg-stone-900 text-white font-black border-b-2 border-stone-900">
                <tr>
                  <th className="p-3 w-40">التاريخ والوقت</th>
                  <th className="p-3 w-36">المستخدم</th>
                  <th className="p-3 w-36">نوع العملية</th>
                  <th className="p-3">التفاصيل والبيانات</th>
                  <th className="p-3 w-28 text-left font-mono">عنوان IP</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-200 text-stone-950 font-bold">
                {filteredLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-stone-800 font-bold">
                      لا توجد سجلات مطابقة
                    </td>
                  </tr>
                ) : (
                  filteredLogs.map(log => (
                    <tr key={log.id} className="hover:bg-amber-50/70 transition-colors">
                      <td className="p-3 font-mono text-stone-900 font-bold text-[11px]">
                        {new Date(log.createdAt).toLocaleString('ar-EG')}
                      </td>
                      <td className="p-3 font-black text-stone-950 text-sm">{log.userName}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[11px] bg-stone-100 border border-stone-300 text-stone-950 font-bold">
                          {log.action}
                        </span>
                      </td>
                      <td className="p-3 text-stone-950 font-bold">{log.details}</td>
                      <td className="p-3 text-left font-mono text-stone-800 font-bold text-[11px]">{log.ipAddress}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-stone-900 font-bold pt-2 border-t border-stone-200">
            <Lock size={14} className="text-amber-800" />
            <span>سجل الرقابة محمي ضد الحذف والتعديل لضمان نزاهة الحسابات المالية.</span>
          </div>
        </div>
      )}
    </div>
  );
};
