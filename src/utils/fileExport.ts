import { BackupRecord } from '../types';

export interface SaveResult {
  success: boolean;
  canceled?: boolean;
  method?: 'picker' | 'directory' | 'download';
  destination?: string;
  error?: string;
}

/**
 * Checks if the modern File System Access API is supported in the current browser.
 */
export function isFilePickerSupported(): boolean {
  return typeof window !== 'undefined' && 'showSaveFilePicker' in window;
}

export function isDirectoryPickerSupported(): boolean {
  return typeof window !== 'undefined' && 'showDirectoryPicker' in window;
}

/**
 * Saves a backup record by opening the native OS "Save As" file dialog,
 * allowing the user to choose the folder, drive, and filename.
 */
export async function saveBackupWithFilePicker(record: BackupRecord): Promise<SaveResult> {
  const content = record.dataJson || '';

  if (isFilePickerSupported()) {
    try {
      const handle = await (window as any).showSaveFilePicker({
        suggestedName: record.filename,
        types: [
          {
            description: 'نسخة احتياطية لنظام الدفتر الذكي (*.json)',
            accept: {
              'application/json': ['.json'],
            },
          },
        ],
      });

      const writable = await handle.createWritable();
      await writable.write(content);
      await writable.close();

      return {
        success: true,
        method: 'picker',
        destination: handle.name || record.filename,
      };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return {
          success: false,
          canceled: true,
        };
      }
      console.warn('showSaveFilePicker error, falling back to download:', err);
    }
  }

  // Fallback for browsers that do not support showSaveFilePicker
  downloadBackupDirect(record);
  return {
    success: true,
    method: 'download',
    destination: record.filename,
  };
}

/**
 * Saves a backup record inside a user-chosen folder/directory.
 */
export async function saveBackupToFolder(record: BackupRecord): Promise<SaveResult> {
  const content = record.dataJson || '';

  if (isDirectoryPickerSupported()) {
    try {
      const dirHandle = await (window as any).showDirectoryPicker({
        mode: 'readwrite',
      });

      const fileHandle = await dirHandle.getFileHandle(record.filename, {
        create: true,
      });

      const writable = await fileHandle.createWritable();
      await writable.write(content);
      await writable.close();

      return {
        success: true,
        method: 'directory',
        destination: `مجلد [${dirHandle.name}] / ${record.filename}`,
      };
    } catch (err: any) {
      if (err.name === 'AbortError') {
        return {
          success: false,
          canceled: true,
        };
      }
      return {
        success: false,
        error: err.message || 'فشل في حفظ النسخة داخل المجلد المختار',
      };
    }
  }

  return saveBackupWithFilePicker(record);
}

/**
 * Standard browser download fallback.
 */
export function downloadBackupDirect(record: BackupRecord): void {
  const content = record.dataJson || '';
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = record.filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
