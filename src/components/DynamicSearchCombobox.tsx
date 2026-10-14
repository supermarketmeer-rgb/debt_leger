import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, X, Phone, User, Building2 } from 'lucide-react';

export interface ComboboxItem {
  id: string;
  code: string;
  name: string;
  phone?: string;
  currentBalance: number;
}

interface DynamicSearchComboboxProps {
  label: string;
  items: ComboboxItem[];
  selectedId: string;
  onSelect: (id: string) => void;
  currency: string;
  placeholder?: string;
  accentColor?: 'amber' | 'blue';
  accountTypeLabel?: 'الزبون' | 'المورد';
  theme?: 'light' | 'dark';
}

function normalizeArabic(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\u064B-\u065F]/g, '') // remove harakat
    .trim();
}

export const DynamicSearchCombobox: React.FC<DynamicSearchComboboxProps> = ({
  label,
  items,
  selectedId,
  onSelect,
  currency,
  placeholder,
  accentColor = 'amber',
  accountTypeLabel = 'الزبون',
  theme = 'light',
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const selectedItem = items.find((item) => item.id === selectedId) || null;

  const normalizedQuery = useMemo(() => normalizeArabic(searchQuery), [searchQuery]);
  const hasMinChars = normalizedQuery.length >= 2;

  // Filter items in real time across normalized name, code, and phone
  const filteredItems = useMemo(() => {
    if (!normalizedQuery) {
      return items;
    }
    return items.filter((item) => {
      const normName = normalizeArabic(item.name);
      const normCode = normalizeArabic(item.code);
      const normPhone = item.phone ? normalizeArabic(item.phone) : '';
      return (
        normName.includes(normalizedQuery) ||
        normCode.includes(normalizedQuery) ||
        normPhone.includes(normalizedQuery)
      );
    });
  }, [items, normalizedQuery]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleOutsideClick = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setIsFocused(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, []);

  const handleSelectItem = (item: ComboboxItem) => {
    onSelect(item.id);
    setSearchQuery('');
    setIsOpen(false);
    setIsFocused(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setSearchQuery(val);
    const norm = normalizeArabic(val);
    // تظهر الأسماء فور كتابة أول حرفين أو أكثر
    if (norm.length >= 2) {
      setIsOpen(true);
    } else {
      // إذا أقل من حرفين، لا تظهر القائمة إلا إذا كان المستخدم ضغط زر التوسيع
      setIsOpen(false);
    }
  };

  const handleInputFocus = () => {
    setIsFocused(true);
    setIsOpen(true);
  };

  const handleClear = () => {
    setSearchQuery('');
    setIsOpen(true);
    inputRef.current?.focus();
  };

  const handleToggleDropdown = () => {
    if (isOpen) {
      setIsOpen(false);
    } else {
      setIsOpen(true);
      inputRef.current?.focus();
    }
  };

  const isAmber = accentColor === 'amber';
  const isDark = theme === 'dark';

  const borderFocusClass = isAmber ? 'focus:border-amber-600' : 'focus:border-blue-600';
  const ringFocusClass = isAmber ? 'focus:ring-amber-500/30' : 'focus:ring-blue-500/30';

  const inputBgClass = isDark
    ? 'bg-stone-800 border-stone-700 text-stone-100 placeholder-stone-500'
    : 'bg-white border-stone-400 text-stone-900 placeholder-stone-400';

  const dropdownBgClass = isDark
    ? 'bg-stone-850 border-stone-700 text-stone-100 shadow-[0_16px_40px_rgba(0,0,0,0.6)]'
    : 'bg-white border-stone-300 text-stone-900 shadow-[0_16px_40px_rgba(0,0,0,0.25)]';

  const activeBgClass = isDark
    ? (isAmber ? 'bg-amber-950/70 text-amber-200 border-amber-800/60' : 'bg-blue-950/70 text-blue-200 border-blue-800/60')
    : (isAmber ? 'bg-amber-100 text-amber-950' : 'bg-blue-100 text-blue-950');

  const hoverBgClass = isDark
    ? 'hover:bg-stone-800/90'
    : (isAmber ? 'hover:bg-amber-50/90' : 'hover:bg-blue-50/90');

  const badgeColor = isDark
    ? (isAmber ? 'bg-amber-950 text-amber-300 border-amber-800' : 'bg-blue-950 text-blue-300 border-blue-800')
    : (isAmber ? 'bg-amber-100 text-amber-900 border-amber-300' : 'bg-blue-100 text-blue-900 border-blue-300');

  // Display value when not actively typing search
  const displayValue = isFocused
    ? searchQuery
    : selectedItem
    ? selectedItem.id === 'all'
      ? selectedItem.name
      : `${selectedItem.name} (${selectedItem.code})`
    : '';

  return (
    <div ref={containerRef} className="relative flex-1 min-w-[280px] max-w-md">
      <div className="flex items-center gap-1.5">
        <span className={`text-[11px] font-black shrink-0 ${isDark ? 'text-stone-300' : 'text-stone-900'}`}>
          {label}:
        </span>

        {/* Dynamic Search Input / Combobox Trigger */}
        <div className="relative flex-1 min-w-0">
          <div className="relative flex items-center">
            <Search
              size={13}
              className={`absolute right-2.5 pointer-events-none transition-colors ${
                isOpen ? (isAmber ? 'text-amber-600' : 'text-blue-600') : 'text-stone-400'
              }`}
            />

            <input
              ref={inputRef}
              type="text"
              value={displayValue}
              onChange={handleInputChange}
              onFocus={handleInputFocus}
              placeholder={placeholder || `اكتب حرفين للبحث عن ${accountTypeLabel}...`}
              className={`w-full pr-8 pl-16 py-1.5 border rounded-lg font-bold text-xs shadow-xs focus:outline-none focus:ring-2 ${inputBgClass} ${borderFocusClass} ${ringFocusClass} transition-all truncate`}
            />

            {/* Clear button (when typing) & Dropdown expand toggle */}
            <div className="absolute left-2 flex items-center gap-1">
              {searchQuery && (
                <button
                  type="button"
                  onClick={handleClear}
                  className="p-0.5 text-stone-400 hover:text-stone-200 rounded-full hover:bg-stone-700/50 transition-colors cursor-pointer"
                  title="مسح البحث"
                >
                  <X size={12} />
                </button>
              )}

              <button
                type="button"
                onClick={handleToggleDropdown}
                className="p-0.5 text-stone-400 hover:text-stone-200 rounded transition-colors cursor-pointer"
                title={isOpen ? 'إغلاق القائمة' : 'عرض كافة الأسماء'}
              >
                <ChevronDown
                  size={14}
                  className={`transition-transform duration-200 ${isOpen ? 'rotate-180 text-amber-500' : ''}`}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Floating Dynamic Dropdown Menu: تظهر فور كتابة أول حرفين */}
      {isOpen && (
        <div className={`absolute top-full right-0 mt-1.5 w-full min-w-[320px] max-w-lg rounded-xl border-2 p-1.5 z-50 text-right animate-in fade-in slide-in-from-top-1 duration-150 ${dropdownBgClass}`}>
          {/* Header Info with Results Count & Search Guide */}
          <div className="px-2.5 py-1.5 mb-1 border-b border-stone-700/30 flex items-center justify-between text-[11px] text-stone-400">
            <span className="font-semibold flex items-center gap-1">
              <span>نتائج بحث {accountTypeLabel}:</span>
              <span className={`px-1.5 py-0.2 rounded font-mono font-bold text-[10px] ${badgeColor}`}>
                {filteredItems.length}
              </span>
            </span>
            {searchQuery ? (
              <span className="text-[10px] text-stone-400">
                البحث: "<strong>{searchQuery}</strong>"
              </span>
            ) : (
              <span className="text-[10px] text-stone-400">
                اكتب حرفين لتصفية الأسماء
              </span>
            )}
          </div>

          {/* List of Filtered Items */}
          <div className="max-h-60 overflow-y-auto divide-y divide-stone-750/30 no-scrollbar">
            {filteredItems.length === 0 ? (
              <div className="p-4 text-center text-xs text-stone-400">
                لا يوجد {accountTypeLabel} يطابق "<strong>{searchQuery}</strong>"
              </div>
            ) : (
              filteredItems.map((item) => {
                const isSelected = item.id === selectedId;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectItem(item)}
                    className={`w-full text-right p-2.5 rounded-lg flex items-center justify-between gap-2.5 transition-all cursor-pointer ${
                      isSelected ? activeBgClass : hoverBgClass
                    }`}
                  >
                    {/* Account Name, Code & Phone */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-xs truncate">
                          {item.name}
                        </span>
                        <span className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border ${badgeColor}`}>
                          {item.code}
                        </span>
                      </div>

                      {item.phone && (
                        <div className="flex items-center gap-1 text-[11px] text-stone-400 font-mono mt-0.5">
                          <Phone size={10} className="text-stone-400" />
                          <span dir="ltr">{item.phone}</span>
                        </div>
                      )}
                    </div>

                    {/* Balance & Selected Checkmark */}
                    <div className="flex items-center gap-2 shrink-0 text-left">
                      <div className="text-left font-mono">
                        <span className="text-[10px] text-stone-400 block leading-tight">الرصيد:</span>
                        <span
                          className={`font-bold text-xs ${
                            item.currentBalance > 0
                              ? (isAmber ? 'text-red-500' : 'text-blue-400')
                              : item.currentBalance === 0
                              ? 'text-emerald-400'
                              : 'text-amber-400'
                          }`}
                        >
                          {item.currentBalance.toLocaleString()} {currency}
                        </span>
                      </div>

                      {isSelected && (
                        <div className={`w-5 h-5 rounded-full flex items-center justify-center text-white ${
                          isAmber ? 'bg-amber-600' : 'bg-blue-600'
                        }`}>
                          <Check size={12} />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
