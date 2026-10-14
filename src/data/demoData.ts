import { Customer, Supplier, Transaction, User, StoreSettings, AuditLog, ClientLedger } from '../types';

export const INITIAL_USERS: User[] = [
  {
    id: 'u-1',
    username: 'admin',
    fullName: 'المدير العام (مسؤول النظام)',
    role: 'admin',
    isActive: true,
    password: 'admin123',
    permissions: {
      canAccessDashboard: true,
      canAccessSales: true,
      canAccessPurchases: true,
      canAccessCustomers: true,
      canAccessSuppliers: true,
      canAccessJournal: true,
      canViewReports: true,
      canManageBackups: true,
      canEditSettings: true,
      canManageUsers: true,
      canDeleteRecords: true,
      canExportData: true,
    },
    createdAt: new Date().toISOString(),
  },
];

export const INITIAL_SETTINGS: StoreSettings = {
  tenantId: 'tenant-01',
  storeName: 'دفتر الديون الذكي',
  appName: 'دفتر الحسابات والديون',
  coverColor: '#581c1c', // Royal Dark Crimson Leather
  coverTexture: 'leather',
  logoText: 'الدفتر الذكي',
  logoUrl: '',
  currency: 'د.ع',
  phone: '',
  address: '',
  dateFormat: 'YYYY-MM-DD',
  allowCreditBalance: true,
  autoBackup: true,
  lastBackupDate: '',
  overdueDaysThreshold: 30,
  cloudServerUrl: '',
  cloudSyncToken: '',
  autoCloudSync: true,
  cloudSyncStatus: 'idle',
};

export const INITIAL_LEDGERS: ClientLedger[] = [
  {
    id: 'tenant-01',
    name: 'دفتر الديون الرئيسي',
    code: 'LEDGER-01',
    currency: 'د.ع',
    ownerName: 'المدير العام',
    phone: '',
    notes: 'السجل الرئيسي للمنصة',
    coverColor: '#581c1c',
    createdAt: new Date().toISOString(),
  },
];

// Clean empty database collections for fresh deployment
export const INITIAL_CUSTOMERS: Customer[] = [];
export const INITIAL_SUPPLIERS: Supplier[] = [];
export const INITIAL_TRANSACTIONS: Transaction[] = [];
export const INITIAL_AUDIT_LOGS: AuditLog[] = [];
