import React, { useState } from 'react';
import { X, Download, Copy, Check, FileCode, Database, Terminal, Server } from 'lucide-react';
import { PHP_FILES } from '../data/phpSourceCode';

interface PhpSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PhpSourceModal: React.FC<PhpSourceModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [selectedFile, setSelectedFile] = useState<keyof typeof PHP_FILES>('schemaSql');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const fileMeta: Record<keyof typeof PHP_FILES, { name: string; ext: string; desc: string }> = {
    schemaSql: { name: 'schema.sql', ext: 'sql', desc: 'مخطط قاعدة بيانات MySQL الكامل وجداول الحسابات والـ UUIDs' },
    configPhp: { name: 'config.php', ext: 'php', desc: 'ملف الاتصال عبر PDO و Prepared Statements وحماية CSRF' },
    apiPhp: { name: 'api.php', ext: 'php', desc: 'محرك REST API للويب وتطبيقات الديسكتوب والمزامنة السحابية' },
    installPhp: { name: 'install.php', ext: 'php', desc: 'معالج التثبيت البرمجي PHP على خادم الاستضافة' },
    desktopSyncGuide: { name: 'desktop_sync.md', ext: 'md', desc: 'دليل ربط وبرمجة تطبيق سطح المكتب ومزامنة SQLite' },
    cloudSyncPhp: { name: 'cloud_sync.php', ext: 'php', desc: 'محرك المزامنة السحابية اللحظية وعزل سجلات العملاء (Multi-Tenant)' },
  };

  const handleCopy = (content: string) => {
    navigator.clipboard.writeText(content);
    setCopiedKey(selectedFile);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleDownloadCurrent = () => {
    const meta = fileMeta[selectedFile];
    const content = PHP_FILES[selectedFile];
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = meta.name;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadAll = () => {
    // Download each file sequentially
    Object.entries(PHP_FILES).forEach(([key, content], i) => {
      setTimeout(() => {
        const meta = fileMeta[key as keyof typeof PHP_FILES];
        const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = meta.name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }, i * 300);
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto">
      <div className="w-full max-w-5xl bg-stone-900 border border-stone-750 rounded-2xl shadow-2xl p-6 relative text-right text-stone-100 my-8 flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-stone-800">
          <div>
            <h2 className="text-lg font-bold text-amber-200 font-amiri flex items-center gap-2">
              <Server size={18} className="text-emerald-400" />
              <span>حزمة ملفات PHP 8+ و MySQL الجاهزة للنشر والتشغيل</span>
            </h2>
            <p className="text-xs text-stone-400 mt-0.5">
              كود برمجـي نظيف، PDO Prepared Statements، حماية كاملة، وREST API جاهز لـ XAMPP والاستضافات السحابية
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleDownloadAll}
              className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 shadow transition-colors cursor-pointer"
            >
              <Download size={14} />
              <span>تنزيل جميع الملفات دفعة واحدة</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-stone-400 hover:text-stone-200 rounded-lg hover:bg-stone-800"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* File Tabs */}
        <div className="flex items-center gap-2 py-3 overflow-x-auto border-b border-stone-800 text-xs">
          {Object.entries(fileMeta).map(([k, meta]) => (
            <button
              key={k}
              onClick={() => setSelectedFile(k as any)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border transition-all cursor-pointer shrink-0 ${
                selectedFile === k
                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 font-bold'
                  : 'bg-stone-800 text-stone-400 border-stone-750 hover:bg-stone-750 hover:text-stone-200'
              }`}
            >
              <FileCode size={13} className="text-amber-400" />
              <span className="font-mono">{meta.name}</span>
            </button>
          ))}
        </div>

        {/* Active File Info Bar */}
        <div className="flex items-center justify-between py-2 text-xs text-stone-400">
          <span>{fileMeta[selectedFile].desc}</span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handleCopy(PHP_FILES[selectedFile])}
              className="flex items-center gap-1 px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded border border-stone-700 text-[11px] cursor-pointer"
            >
              {copiedKey === selectedFile ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
              <span>{copiedKey === selectedFile ? 'تم النسخ!' : 'نسخ الكود'}</span>
            </button>

            <button
              onClick={handleDownloadCurrent}
              className="flex items-center gap-1 px-2.5 py-1 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded border border-stone-700 text-[11px] cursor-pointer"
            >
              <Download size={12} className="text-emerald-400" />
              <span>تنزيل الملف</span>
            </button>
          </div>
        </div>

        {/* Code Content */}
        <div className="flex-1 overflow-auto bg-stone-950 p-4 rounded-xl border border-stone-800 font-mono text-xs text-stone-200" dir="ltr">
          <pre className="whitespace-pre overflow-x-auto leading-relaxed">
            {PHP_FILES[selectedFile]}
          </pre>
        </div>

        {/* Quick Instructions Footer */}
        <div className="pt-3 border-t border-stone-800 text-[11px] text-stone-500 flex items-center justify-between">
          <span>طريقة التشغيل على XAMPP: ضع الملفات في مجلد <code>htdocs/smart-ledger</code> وشغّل <code>http://localhost/smart-ledger/install.php</code></span>
          <span className="text-emerald-400">PHP 8.0+ • PDO MySQL • UTF8mb4</span>
        </div>
      </div>
    </div>
  );
};
