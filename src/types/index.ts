export type Role = 'admin' | 'user' | 'accountant';

export interface UserPermissions {
  // شاشات وصفحات النظام
  canAccessDashboard?: boolean;
  canAccessSales?: boolean;
  canAccessPurchases?: boolean;
  canAccessCustomers?: boolean;
  canAccessSuppliers?: boolean;
  canAccessJournal?: boolean;
  canViewReports?: boolean;
  canManageBackups?: boolean;
  canEditSettings?: boolean;

  // إجراءات إدارية
  canManageUsers?: boolean;
  canDeleteRecords?: boolean;
  canExportData?: boolean;
}

export interface User {
  id: string;
  username: string;
  fullName: string;
  role: Role;
  isActive: boolean;
  password?: string;
  permissions?: UserPermissions;
  createdAt: string;
  updatedAt?: string;
}

export type BalanceType = 'debit' | 'credit'; // عليه رصيد لنا (debit) | له رصيد عندنا (credit)

export interface Customer {
  id: string;
  uuid: string;
  tenantId: string;
  code: string; // e.g. CUST-001
  name: string;
  phone: string;
  address: string;
  notes: string;
  openingBalance: number;
  balanceType: BalanceType;
  currentBalance: number; // positive = owes us (مدين), negative = credit in his favor (دائن)
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  syncStatus: 'synced' | 'pending' | 'conflict';
  deviceId?: string;
}

export interface Supplier {
  id: string;
  uuid: string;
  tenantId: string;
  code: string; // e.g. SUP-001
  name: string;
  phone: string;
  address: string;
  notes: string;
  openingBalance: number;
  currentBalance: number; // positive = we owe him (دائن له علينا)
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  syncStatus: 'synced' | 'pending' | 'conflict';
  deviceId?: string;
}

export type TransactionType = 
  | 'sale'             // بيع آجل (يزيد دين الزبون)
  | 'customer_payment' // تسديد من زبون (ينقص دين الزبون)
  | 'purchase'         // شراء آجل (يزيد مستحق المورد)
  | 'supplier_payment' // تسديد لمورد (ينقص مستحق المورد)
  | 'opening_balance'; // رصيد افتتاحي

export type PaymentMethod = 'cash' | 'bank_transfer' | 'check' | 'other';

export interface Transaction {
  id: string;
  uuid: string;
  tenantId: string;
  accountType: 'customer' | 'supplier';
  accountId: string;
  accountName: string;
  accountCode: string;
  type: TransactionType;
  documentNo: string; // e.g. INV-2026-0001, RCP-2026-0001, PUR-2026-0001, PV-2026-0001
  date: string;
  amount: number;
  debit: number;      // مدين
  credit: number;     // دائن
  balanceAfter: number; // الرصيد بعد الحركة
  paymentMethod?: PaymentMethod;
  description: string;
  notes?: string;
  userId: string;
  userName: string;
  createdAt: string;
  updatedAt: string;
  syncStatus: 'synced' | 'pending' | 'conflict';
  deviceId?: string;
}

export interface AuditLog {
  id: string;
  tenantId: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  ipAddress: string;
  createdAt: string;
}

export interface StoreSettings {
  tenantId: string;
  storeName: string;
  appName: string;
  coverColor: string; // hex or preset name
  coverTexture: 'leather' | 'linen' | 'classic' | 'modern';
  logoText: string;
  logoUrl?: string; // Custom store logo image (DataURL or URL)
  currency: string;
  phone: string;
  address: string;
  dateFormat: string;
  allowCreditBalance: boolean;
  autoBackup: boolean;
  lastBackupDate?: string;
  overdueDaysThreshold?: number;

  // Cloud Server & Multi-tenant Sync Configuration
  cloudServerUrl?: string; // رابط السيرفر السحابي (مثل https://my-server.com/api/cloud-sync.php)
  cloudSyncToken?: string; // رمز التوكن السحابي (API Bearer Token)
  autoCloudSync?: boolean; // تشغيل المزامنة التلقائية اللحظية عند أي تغيير
  lastCloudSyncDate?: string; // تاريخ ووقت آخر مزامنة سحابية ناجحة
  cloudSyncStatus?: 'idle' | 'syncing' | 'synced' | 'error'; // حالة المزامنة اللحظية
  cloudSyncError?: string; // رسالة آخر خطأ في الاتصال السحابي إن وجد
}

export interface ClientLedger {
  id: string; // Tenant ID / Client ID (e.g. tenant-01, client-101)
  name: string; // اسم المتجر / صاحب سجل الديون
  code: string; // رمز السجل التعريفي (e.g. LEDGER-01)
  currency: string;
  phone?: string;
  ownerName?: string;
  notes?: string;
  coverColor?: string;
  createdAt: string;
}

export interface BackupRecord {
  id: string;
  filename: string;
  createdAt: string;
  size: string;
  recordsCount: number;
  dataJson?: string;
}

export interface SyncPayload {
  deviceId: string;
  lastSyncTimestamp: string;
  tenantId?: string;
  settings?: StoreSettings;
  customers: Customer[];
  suppliers: Supplier[];
  transactions: Transaction[];
  users?: User[];
}
