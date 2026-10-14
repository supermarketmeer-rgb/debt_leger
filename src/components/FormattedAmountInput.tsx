import React, { useRef, useLayoutEffect, useState, useEffect } from 'react';

// Normalize Eastern Arabic and Persian numerals to Western Arabic
export const normalizeDigits = (val: string): string => {
  return val
    .replace(/[٠۰]/g, '0')
    .replace(/[١۱]/g, '1')
    .replace(/[٢۲]/g, '2')
    .replace(/[٣۳]/g, '3')
    .replace(/[٤۴]/g, '4')
    .replace(/[٥۵]/g, '5')
    .replace(/[٦۶]/g, '6')
    .replace(/[٧۷]/g, '7')
    .replace(/[٨۸]/g, '8')
    .replace(/[٩۹]/g, '9')
    .replace(/[٫]/g, '.');
};

// Formats a raw number or string with thousands separators
export const formatAmountWithCommas = (val: number | string | null | undefined): string => {
  if (val === null || val === undefined || val === '') return '';

  const normalized = normalizeDigits(String(val)).replace(/,/g, '').trim();
  if (!normalized) return '';

  const isNegative = normalized.startsWith('-');
  const clean = isNegative ? normalized.slice(1) : normalized;

  const parts = clean.split('.');
  let intPart = parts[0];

  // Remove leading zeros unless it's just '0'
  if (intPart.length > 1 && intPart.startsWith('0')) {
    intPart = intPart.replace(/^0+/, '') || '0';
  }

  const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const decimalPart = parts.length > 1 ? parts[1] : null;

  return (isNegative ? '-' : '') + (decimalPart !== null ? `${formattedInt}.${decimalPart}` : formattedInt);
};

// Parse numeric value from formatted string
export const parseFormattedAmount = (val: string | number | null | undefined): number => {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  const normalized = normalizeDigits(val).replace(/,/g, '').trim();
  const num = parseFloat(normalized);
  return isNaN(num) ? 0 : num;
};

export interface FormattedAmountInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange'> {
  value: number | string;
  onChange: (numericValue: number, formattedString: string) => void;
  className?: string;
  placeholder?: string;
  allowDecimals?: boolean;
}

export const FormattedAmountInput: React.FC<FormattedAmountInputProps> = ({
  value,
  onChange,
  className = '',
  placeholder = '0.00',
  allowDecimals = true,
  disabled = false,
  required = false,
  autoFocus = false,
  ...props
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [displayValue, setDisplayValue] = useState<string>(() => formatAmountWithCommas(value));
  const cursorInfoRef = useRef<{ rawDigitsBeforeCursor: number } | null>(null);

  // Sync when value prop changes externally
  useEffect(() => {
    const formatted = formatAmountWithCommas(value);
    // Only update if parsed numeric values differ
    const currentNum = parseFormattedAmount(displayValue);
    const incomingNum = parseFormattedAmount(value);

    if (currentNum !== incomingNum || (displayValue === '' && formatted !== '')) {
      setDisplayValue(formatted);
    }
  }, [value]);

  // Restore cursor after formatting
  useLayoutEffect(() => {
    if (cursorInfoRef.current && inputRef.current) {
      const { rawDigitsBeforeCursor } = cursorInfoRef.current;
      const currentVal = inputRef.current.value;

      let digitsFound = 0;
      let newCursorPos = currentVal.length;

      for (let i = 0; i < currentVal.length; i++) {
        const char = currentVal[i];
        if ((char >= '0' && char <= '9') || char === '.') {
          digitsFound++;
        }
        if (digitsFound >= rawDigitsBeforeCursor) {
          newCursorPos = i + 1;
          break;
        }
      }

      inputRef.current.setSelectionRange(newCursorPos, newCursorPos);
      cursorInfoRef.current = null;
    }
  }, [displayValue]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && inputRef.current) {
      const { selectionStart, selectionEnd } = inputRef.current;
      if (selectionStart !== null && selectionStart === selectionEnd && selectionStart > 0) {
        // If backspacing right after a comma, delete the digit preceding the comma
        const charBeforeCursor = displayValue[selectionStart - 1];
        if (charBeforeCursor === ',') {
          e.preventDefault();
          const before = displayValue.slice(0, selectionStart - 2);
          const after = displayValue.slice(selectionStart);
          const raw = normalizeDigits(before + after).replace(/[^0-9.]/g, '');
          const formatted = formatAmountWithCommas(raw);

          // Calculate digits before cursor
          let digitsBefore = 0;
          for (let i = 0; i < selectionStart - 2; i++) {
            const ch = displayValue[i];
            if ((ch >= '0' && ch <= '9') || ch === '.') digitsBefore++;
          }
          cursorInfoRef.current = { rawDigitsBeforeCursor: digitsBefore };

          setDisplayValue(formatted);
          onChange(parseFormattedAmount(formatted), formatted);
        }
      }
    }
    props.onKeyDown?.(e);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const rawVal = normalizeDigits(input.value);
    const selectionStart = input.selectionStart ?? rawVal.length;

    // Count how many significant digits/dots are before cursor
    let rawDigitsBefore = 0;
    for (let i = 0; i < selectionStart; i++) {
      const ch = rawVal[i];
      if ((ch >= '0' && ch <= '9') || ch === '.') {
        rawDigitsBefore++;
      }
    }
    cursorInfoRef.current = { rawDigitsBeforeCursor: rawDigitsBefore };

    // Clean input to only digits and a single optional decimal dot
    let cleaned = '';
    let hasDot = false;

    for (const ch of rawVal) {
      if (ch >= '0' && ch <= '9') {
        cleaned += ch;
      } else if (ch === '.' && allowDecimals && !hasDot) {
        cleaned += ch;
        hasDot = true;
      }
    }

    if (cleaned === '') {
      setDisplayValue('');
      onChange(0, '');
      return;
    }

    // Preserve trailing decimal dot if the user just typed it (e.g. "100.")
    const isEndingWithDot = cleaned.endsWith('.');
    const formatted = formatAmountWithCommas(cleaned) + (isEndingWithDot && !cleaned.slice(0, -1).includes('.') ? '.' : '');

    setDisplayValue(formatted);
    const numeric = parseFormattedAmount(cleaned);
    onChange(numeric, formatted);
  };

  return (
    <input
      ref={inputRef}
      type="text"
      inputMode="decimal"
      value={displayValue}
      onChange={handleChange}
      onKeyDown={handleKeyDown}
      placeholder={placeholder}
      className={className}
      disabled={disabled}
      required={required}
      autoFocus={autoFocus}
      {...props}
    />
  );
};
