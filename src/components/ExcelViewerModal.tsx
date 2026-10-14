import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  Printer,
  Download,
  Search,
  Maximize2,
  Minimize2,
  FileSpreadsheet,
  Copy,
  Check,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Table as TableIcon,
  Filter,
  DollarSign,
  Layers
} from 'lucide-react';

export interface ExcelViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  filename?: string;
  headers: string[];
  rows: (string | number)[][];
  storeName?: string;
  logoUrl?: string;
  currency?: string;
  summaryStats?: { label: string; value: string | number }[];
}

// Convert index 0 -> A, 1 -> B, etc.
const getExcelColumnLabel = (index: number): string => {
  let label = '';
  let i = index;
  while (i >= 0) {
    label = String.fromCharCode(65 + (i % 26)) + label;
    i = Math.floor(i / 26) - 1;
  }
  return label;
};

export const ExcelViewerModal: React.FC<ExcelViewerModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  filename,
  headers,
  rows,
  storeName = 'مؤسسة الرافدين للتجارة العامة',
  logoUrl,
  currency = 'د.ع',
  summaryStats,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(true);
  const [copied, setCopied] = useState<boolean>(false);
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      setSearchQuery('');
      setZoomLevel(100);
      setSelectedCell({ row: 0, col: 0 });
    }
  }, [isOpen]);

  // Filtered rows by search query
  const filteredRows = useMemo(() => {
    if (!searchQuery.trim()) return rows;
    const q = searchQuery.toLowerCase().trim();
    return rows.filter((row) =>
      row.some((cell) => String(cell).toLowerCase().includes(q))
    );
  }, [rows, searchQuery]);

  // Calculate Column Totals for numeric columns
  const columnTotals = useMemo(() => {
    return headers.map((_, colIdx) => {
      let isNumeric = false;
      let sum = 0;
      let count = 0;

      for (const row of filteredRows) {
        const cell = row[colIdx];
        if (cell !== undefined && cell !== null && cell !== '') {
          const num = typeof cell === 'number' ? cell : parseFloat(String(cell).replace(/,/g, ''));
          if (!isNaN(num) && typeof num === 'number') {
            isNumeric = true;
            sum += num;
            count++;
          }
        }
      }

      return isNumeric && count > 0 ? { isNumeric: true, sum, count } : { isNumeric: false, sum: 0, count: 0 };
    });
  }, [headers, filteredRows]);

  // Active cell info for the fx formula bar
  const activeCellCoord = useMemo(() => {
    if (!selectedCell) return 'A1';
    const colName = getExcelColumnLabel(selectedCell.col);
    const rowName = selectedCell.row + 2; // +1 for 0-indexed, +1 for header
    return `${colName}${rowName}`;
  }, [selectedCell]);

  const activeCellValue = useMemo(() => {
    if (!selectedCell) return '';
    const row = filteredRows[selectedCell.row];
    if (!row) return '';
    return String(row[selectedCell.col] ?? '');
  }, [selectedCell, filteredRows]);

  // Execute Print
  const handlePrint = () => {
    window.print();
  };

  // Execute CSV / Excel download
  const handleDownloadExcel = () => {
    const csvContent =
      '\uFEFF' +
      [headers, ...rows]
        .map((row) => row.map((val) => `"${String(val ?? '').replace(/"/g, '""')}"`).join(','))
        .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    const safeTitle = (filename || title || 'كشف_اكسل').replace(/[\s/\\?%*:|"<>]/g, '_');
    link.download = `${safeTitle}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Copy data to clipboard
  const handleCopyClipboard = () => {
    const tsvContent = [headers, ...rows].map((row) => row.join('\t')).join('\n');
    navigator.clipboard.writeText(tsvContent).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    });
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-[100] flex flex-col bg-[#f3f2f1] text-[#242424] font-sans overflow-hidden select-none animate-fadeIn ${
        isFullscreen ? 'w-screen h-screen' : 'p-3 sm:p-6 bg-black/75 backdrop-blur-sm'
      }`}
      dir="rtl"
    >
      {/* Outer Container (Full Screen or Centered Window) */}
      <div
        className={`flex flex-col w-full h-full bg-[#f3f2f1] shadow-2xl overflow-hidden border border-[#d1d1d1] ${
          !isFullscreen ? 'rounded-2xl max-w-7xl mx-auto' : ''
        }`}
      >
        {/* ======================================================== */}
        {/* 1. TOP EXCEL TITLE BAR (شريط عنوان الإكسل الأصلي باللون الأخضر) */}
        {/* ======================================================== */}
        <div className="bg-[#107c41] text-white px-3 sm:px-4 py-2 flex items-center justify-between shadow-md shrink-0 border-b border-[#0b5c2f] no-print">
          {/* Right side: Excel Logo & Workbook Title */}
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded bg-white/15 border border-white/20 flex items-center justify-center shrink-0 shadow-inner overflow-hidden">
              {logoUrl ? (
                <img src={logoUrl} alt={storeName} className="w-full h-full object-contain p-0.5" />
              ) : (
                <FileSpreadsheet size={18} className="text-white" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-xs sm:text-sm truncate">
                  {title || 'مصنف Excel غير معنون'}
                </span>
                <span className="text-[10px] bg-white/20 px-1.5 py-0.2 rounded font-mono text-emerald-100 hidden sm:inline">
                  .xlsx
                </span>
                <span className="text-[11px] text-emerald-200 hidden md:inline">
                  — Microsoft Excel Formatted Table
                </span>
              </div>
            </div>
          </div>

          {/* Search Bar in Title Ribbon */}
          <div className="hidden lg:flex items-center bg-white/15 hover:bg-white/25 focus-within:bg-white focus-within:text-stone-900 focus-within:shadow-md px-2.5 py-1 rounded-md text-xs w-72 transition-all border border-white/20">
            <Search size={14} className="text-white/80 focus-within:text-stone-500 shrink-0 ml-1.5" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث في الجدول والخلايا..."
              className="bg-transparent text-xs w-full focus:outline-none placeholder-white/70 focus-within:placeholder-stone-400"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="text-white/70 hover:text-white">
                <X size={12} />
              </button>
            )}
          </div>

          {/* Top Actions: Print, Download, Fullscreen, Close */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Quick Print Button */}
            <button
              onClick={handlePrint}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-white/15 hover:bg-white/25 text-white text-xs font-semibold cursor-pointer transition-all border border-white/20 shadow-xs"
              title="طباعة الجدول منسقاً (Ctrl+P)"
            >
              <Printer size={14} />
              <span className="hidden sm:inline">طباعة</span>
            </button>

            {/* Quick Download Button */}
            <button
              onClick={handleDownloadExcel}
              className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#0b5c2f] hover:bg-[#074020] text-emerald-50 text-xs font-bold cursor-pointer transition-all border border-emerald-400/40 shadow-xs"
              title="تنزيل ملف Excel (.csv)"
            >
              <Download size={14} />
              <span className="hidden sm:inline">تنزيل Excel</span>
            </button>

            {/* Copy Table */}
            <button
              onClick={handleCopyClipboard}
              className="p-1 sm:px-2 rounded bg-white/10 hover:bg-white/20 text-white text-xs font-medium cursor-pointer transition-colors"
              title="نسخ بيانات الجدول للحافظة"
            >
              {copied ? <Check size={14} className="text-emerald-300" /> : <Copy size={14} />}
            </button>

            {/* Fullscreen Toggle */}
            <button
              onClick={() => setIsFullscreen(!isFullscreen)}
              className="p-1 rounded bg-white/10 hover:bg-white/20 text-white cursor-pointer transition-colors"
              title={isFullscreen ? 'تصغير النافذة' : 'ملء الشاشة'}
            >
              {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            </button>

            {/* Close Button */}
            <button
              onClick={onClose}
              className="p-1 px-2 rounded bg-red-600/80 hover:bg-red-600 text-white font-bold cursor-pointer transition-colors shadow-xs ml-0.5"
              title="إغلاق العرض (Esc)"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 2. EXCEL RIBBON TOOLBAR (شريط الأدوات والتنسيق) */}
        {/* ======================================================== */}
        <div className="bg-[#f3f2f1] border-b border-[#d1d1d1] px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0 no-print">
          {/* Quick Info & Meta */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 text-[#107c41] font-bold">
              <TableIcon size={14} />
              <span>جدول بيانات منسق</span>
            </div>

            <div className="h-4 w-[1px] bg-stone-300" />

            <div className="text-stone-600 text-[11px] hidden sm:flex items-center gap-1.5">
              <span>المؤسسة:</span>
              <span className="font-semibold text-stone-900">{storeName}</span>
            </div>

            {subtitle && (
              <>
                <div className="h-4 w-[1px] bg-stone-300 hidden sm:block" />
                <span className="text-stone-500 text-[11px] truncate max-w-xs">{subtitle}</span>
              </>
            )}
          </div>

          {/* Quick Tools: Zoom & Search for Mobile */}
          <div className="flex items-center gap-2">
            {/* Search Input for Mobile/Tablet */}
            <div className="lg:hidden flex items-center bg-white px-2 py-0.5 rounded border border-stone-300 text-xs">
              <Search size={12} className="text-stone-400 ml-1" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث..."
                className="bg-transparent w-24 focus:outline-none text-[11px]"
              />
            </div>

            {/* Zoom Controls */}
            <div className="flex items-center bg-white rounded border border-stone-300 px-1 py-0.5 shadow-xs">
              <button
                onClick={() => setZoomLevel((z) => Math.max(70, z - 10))}
                className="p-1 text-stone-600 hover:text-stone-900 cursor-pointer"
                title="تصغير"
              >
                <ZoomOut size={13} />
              </button>
              <span className="px-1.5 font-mono text-[11px] font-bold text-stone-700 min-w-[38px] text-center">
                {zoomLevel}%
              </span>
              <button
                onClick={() => setZoomLevel((z) => Math.min(150, z + 10))}
                className="p-1 text-stone-600 hover:text-stone-900 cursor-pointer"
                title="تكبير"
              >
                <ZoomIn size={13} />
              </button>
              {zoomLevel !== 100 && (
                <button
                  onClick={() => setZoomLevel(100)}
                  className="p-0.5 text-stone-400 hover:text-stone-700 text-[10px] ml-1"
                  title="إعادة ضبط 100%"
                >
                  <RotateCcw size={11} />
                </button>
              )}
            </div>

            {/* Formatted Table Badge */}
            <span className="px-2 py-0.5 rounded bg-[#107c41]/10 text-[#107c41] font-bold text-[11px] border border-[#107c41]/20 hidden sm:inline">
              Excel Table View
            </span>
          </div>
        </div>

        {/* ======================================================== */}
        {/* 3. EXCEL FORMULA BAR (شريط الصيغة fx وعنوان الخلية النشطة) */}
        {/* ======================================================== */}
        <div className="bg-white border-b border-[#e1dfdd] px-3 py-1 flex items-center gap-2 shrink-0 text-xs no-print">
          {/* Active Cell Name Box */}
          <div className="w-16 px-2 py-0.5 bg-[#f3f2f1] border border-[#d1d1d1] rounded font-mono font-bold text-center text-[#107c41] text-xs shadow-inner">
            {activeCellCoord}
          </div>

          {/* Formula Icon */}
          <div className="px-1 text-stone-400 font-serif italic font-bold text-sm">fx</div>

          {/* Value Display */}
          <div className="flex-1 px-2.5 py-0.5 bg-white border border-[#e1dfdd] rounded text-stone-900 text-xs font-mono truncate min-h-[24px] flex items-center">
            {activeCellValue || <span className="text-stone-400 italic font-sans">حدد أي خلية لعرض قيمتها...</span>}
          </div>

          <div className="text-[11px] text-stone-500 font-mono hidden sm:inline">
            الصفوف: {filteredRows.length} | الأعمدة: {headers.length}
          </div>
        </div>

        {/* ======================================================== */}
        {/* 4. MAIN SPREADSHEET GRID (جدول الإكسل الحقيقي المنسق) */}
        {/* ======================================================== */}
        <div
          className="flex-1 overflow-auto bg-[#ffffff] relative p-1 sm:p-3 print:p-0 print:overflow-visible"
          style={{ fontSize: `${(zoomLevel / 100) * 12}px` }}
        >
          {/* PRINT-ONLY HEADER */}
          <div className="hidden print:block mb-4 pb-3 border-b-2 border-stone-800 text-right">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                {logoUrl && (
                  <img
                    src={logoUrl}
                    alt={storeName}
                    className="w-12 h-12 object-contain rounded border border-stone-300 p-0.5 shrink-0"
                  />
                )}
                <div>
                  <h1 className="text-xl font-black">{storeName}</h1>
                  <p className="text-xs text-stone-600">دفتر الديون الذكي • كشف وتصدير جدول إلكتروني رسمي</p>
                </div>
              </div>
              <div className="text-left">
                <h2 className="text-base font-bold">{title}</h2>
                <p className="text-xs text-stone-600">تاريخ الطباعة: {new Date().toLocaleDateString('ar-IQ')}</p>
                <p className="text-xs font-mono">العملة: {currency}</p>
              </div>
            </div>
          </div>

          {/* Excel Spreadsheet Table */}
          <div className="w-max min-w-full inline-block align-middle border border-[#b4b4b4] rounded shadow-xs overflow-hidden print:w-full print:border-none print:shadow-none">
            <table className="w-auto min-w-full text-right border-collapse bg-white table-auto print:w-full">
              {/* Row 0: Excel Alphabet Column Headers (A, B, C, D...) */}
              <thead className="no-print">
                <tr className="bg-[#f3f2f1] text-[#605e5c] border-b border-[#d1d1d1] font-mono text-[10px] text-center select-none">
                  {/* Corner Gutter Cell */}
                  <th className="w-10 bg-[#e1dfdd] border-r border-[#d1d1d1] p-1 font-bold text-stone-500 whitespace-nowrap">◢</th>
                  {headers.map((_, colIdx) => (
                    <th
                      key={colIdx}
                      className="border-r border-[#d1d1d1] px-3 py-1 font-semibold hover:bg-[#e1dfdd] transition-colors whitespace-nowrap text-center"
                    >
                      {getExcelColumnLabel(colIdx)}
                    </th>
                  ))}
                </tr>
              </thead>

              {/* Row 1: Formatted Table Header (Corporate Excel Dark Green / Emerald) */}
              <thead>
                <tr className="bg-gradient-to-r from-[#107c41] to-[#0e6b37] text-white font-bold border-b-2 border-[#0b5c2f] shadow-xs">
                  {/* Row Number 1 */}
                  <th className="w-10 bg-[#0e6b37] text-white/80 border-r border-[#0b5c2f] p-2 text-center font-mono text-[10px] no-print whitespace-nowrap">
                    1
                  </th>
                  {headers.map((header, colIdx) => (
                    <th
                      key={colIdx}
                      className="px-4 py-2.5 sm:py-3 border-r border-white/20 text-xs sm:text-sm font-bold tracking-wide whitespace-nowrap text-center select-none excel-cell-nowrap"
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>

              {/* Table Body: Data Rows with Zebra striping & active cell indicator */}
              <tbody className="divide-y divide-[#e1dfdd]">
                {filteredRows.length === 0 ? (
                  <tr>
                    <td
                      colSpan={headers.length + 1}
                      className="p-12 text-center text-stone-500 italic bg-white"
                    >
                      {searchQuery ? 'لا توجد نتائج تطابق بحثك في هذا الجدول' : 'لا توجد بيانات متاحة في هذا الجدول'}
                    </td>
                  </tr>
                ) : (
                  filteredRows.map((row, rowIdx) => {
                    const isEven = rowIdx % 2 === 0;
                    const excelRowNumber = rowIdx + 2;

                    return (
                      <tr
                        key={rowIdx}
                        className={`transition-colors ${
                          isEven ? 'bg-[#ffffff]' : 'bg-[#f9fbf9]'
                        } hover:bg-[#e8f4ec]`}
                      >
                        {/* Excel Row Number Gutter */}
                        <td className="w-10 bg-[#f3f2f1] text-[#605e5c] border-r border-[#d1d1d1] p-1.5 text-center font-mono text-[11px] select-none no-print whitespace-nowrap">
                          {excelRowNumber}
                        </td>

                        {row.map((cell, colIdx) => {
                          const isSelected = selectedCell?.row === rowIdx && selectedCell?.col === colIdx;
                          const cellStr = String(cell ?? '');
                          const numVal = typeof cell === 'number' ? cell : parseFloat(cellStr.replace(/,/g, ''));
                          const isNumeric = !isNaN(numVal) && typeof numVal === 'number' && cellStr.trim() !== '' && !/^\d{4}-\d{2}-\d{2}$/.test(cellStr) && !cellStr.startsWith('INV-') && !cellStr.startsWith('RCP-') && !cellStr.startsWith('PUR-') && !cellStr.startsWith('PV-') && !cellStr.startsWith('CUST-') && !cellStr.startsWith('SUP-');

                          return (
                            <td
                              key={colIdx}
                              onClick={() => setSelectedCell({ row: rowIdx, col: colIdx })}
                              className={`px-4 py-2 sm:py-2.5 border-r border-[#e1dfdd] text-xs whitespace-nowrap excel-cell-nowrap transition-all relative cursor-cell ${
                                isSelected
                                  ? 'bg-[#d8edd9] ring-2 ring-[#107c41] ring-inset font-bold text-black z-10'
                                  : 'text-stone-800'
                              } ${isNumeric ? 'text-left font-mono font-bold' : 'text-right'}`}
                            >
                              {/* Display formatted numbers with thousand separators if numeric */}
                              {isNumeric ? (
                                <span className={numVal < 0 ? 'text-red-600' : ''}>
                                  {numVal.toLocaleString()}
                                </span>
                              ) : (
                                cellStr || '—'
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })
                )}
              </tbody>

              {/* Table Footer: Totals Row (صف الإجمالي بنمط المحاسبة المزدوج) */}
              <tfoot>
                <tr className="bg-[#eef6f0] font-black text-stone-900 border-t-2 border-[#107c41] border-b-4 border-double border-stone-800">
                  <td className="w-10 bg-[#dbece0] text-stone-700 border-r border-[#c2dfca] p-2 text-center font-mono text-[10px] no-print whitespace-nowrap">
                    Σ
                  </td>
                  {headers.map((_, colIdx) => {
                    const total = columnTotals[colIdx];
                    if (colIdx === 0) {
                      return (
                        <td key={colIdx} className="px-4 py-2.5 border-r border-[#c2dfca] text-xs font-bold text-[#107c41] whitespace-nowrap excel-cell-nowrap">
                          الإجمالي الكلي:
                        </td>
                      );
                    }
                    if (total.isNumeric && total.sum > 0) {
                      return (
                        <td
                          key={colIdx}
                          className="px-4 py-2.5 border-r border-[#c2dfca] text-left font-mono font-black text-xs sm:text-sm text-[#0f592f] whitespace-nowrap excel-cell-nowrap"
                        >
                          {total.sum.toLocaleString()} {currency}
                        </td>
                      );
                    }
                    return (
                      <td key={colIdx} className="px-4 py-2 border-r border-[#c2dfca] text-center text-stone-400 whitespace-nowrap excel-cell-nowrap">
                        —
                      </td>
                    );
                  })}
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Optional Summary Stats Badges */}
          {summaryStats && summaryStats.length > 0 && (
            <div className="mt-4 p-3 bg-[#f8faf8] rounded-xl border border-[#c2dfca] flex flex-wrap items-center gap-4 text-xs no-print">
              <span className="font-bold text-[#107c41]">ملخص إحصائي سريع:</span>
              {summaryStats.map((stat, i) => (
                <div key={i} className="flex items-center gap-1.5 bg-white px-3 py-1 rounded-lg border border-stone-200 shadow-xs">
                  <span className="text-stone-600">{stat.label}:</span>
                  <span className="font-mono font-bold text-stone-950">{stat.value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ======================================================== */}
        {/* 5. EXCEL BOTTOM SHEET TABS & STATUS BAR (أشرطة الحالة والأوراق) */}
        {/* ======================================================== */}
        <div className="bg-[#f3f2f1] border-t border-[#d1d1d1] px-3 py-1.5 flex flex-wrap items-center justify-between gap-2 text-xs shrink-0 select-none no-print">
          {/* Sheet Tabs */}
          <div className="flex items-center gap-1">
            <div className="bg-white border-t-2 border-t-[#107c41] border-x border-[#d1d1d1] px-3 py-1 rounded-t font-semibold text-xs text-[#107c41] shadow-xs flex items-center gap-1.5">
              <FileSpreadsheet size={13} />
              <span>ورقة 1 (البيانات المصدرة)</span>
            </div>
            <div className="text-stone-400 px-1.5 py-0.5 rounded hover:bg-stone-200 cursor-not-allowed" title="إضافة ورقة">
              +
            </div>
          </div>

          {/* Status Bar Stats */}
          <div className="flex items-center gap-3 text-stone-600 text-[11px] font-mono">
            <span className="bg-[#107c41]/10 text-[#107c41] px-2 py-0.5 rounded font-bold font-sans">
              جاهز (Ready)
            </span>

            <span>الصفوف: {filteredRows.length}</span>

            <span>الأعمدة: {headers.length}</span>

            {/* Sum indicator if selected column is numeric */}
            {selectedCell && columnTotals[selectedCell.col]?.isNumeric && (
              <span className="bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded font-bold">
                مجموع العمود ({getExcelColumnLabel(selectedCell.col)}):{' '}
                {columnTotals[selectedCell.col].sum.toLocaleString()} {currency}
              </span>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
