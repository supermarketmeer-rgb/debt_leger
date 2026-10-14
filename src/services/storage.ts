import {
  Customer,
  Supplier,
  Transaction,
  User,
  StoreSettings,
  AuditLog,
  BackupRecord,
  SyncPayload,
  TransactionType,
  PaymentMethod,
  ClientLedger
} from '../types';
import {
  INITIAL_CUSTOMERS,
  INITIAL_SUPPLIERS,
  INITIAL_TRANSACTIONS,
  INITIAL_USERS,
  INITIAL_SETTINGS,
  INITIAL_AUDIT_LOGS,
  INITIAL_LEDGERS
} from '../data/demoData';
import { DEFAULT_ROLE_PERMISSIONS } from '../utils/permissions';

const STORAGE_KEYS = {
  USERS: 'smart_ledger_users',
  SETTINGS: 'smart_ledger_settings',
  CUSTOMERS: 'smart_ledger_customers',
  SUPPLIERS: 'smart_ledger_suppliers',
  TRANSACTIONS: 'smart_ledger_transactions',
  AUDIT_LOGS: 'smart_ledger_audit_logs',
  BACKUPS: 'smart_ledger_backups',
  CURRENT_USER: 'smart_ledger_current_user',
  BOOK_OPEN: 'smart_ledger_book_open',
  LEDGERS: 'smart_ledger_client_ledgers',
  DEVICE_ID: 'smart_ledger_device_id'
};

function generateUUID(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

class StorageService {
  private users: User[] = [];
  private settings: StoreSettings = INITIAL_SETTINGS;
  private customers: Customer[] = [];
  private suppliers: Supplier[] = [];
  private transactions: Transaction[] = [];
  private auditLogs: AuditLog[] = [];
  private backups: BackupRecord[] = [];
  private clientLedgers: ClientLedger[] = [];
  private currentUser: User | null = null;
  private isBookOpen: boolean = false;
  private cloudSyncTimer: any = null;
  private isSyncInProgress: boolean = false;

  constructor() {
    this.init();
  }

  private init() {
    try {
      // ⚠️ تنظيف البيانات القديمة من المتصفح عند بدء العمل بقاعدة بيانات فارغة ونظيفة
      const CLEAN_FLAG = 'smart_debt_ledger_cleaned_v2';
      if (!localStorage.getItem(CLEAN_FLAG)) {
        localStorage.removeItem(STORAGE_KEYS.CUSTOMERS);
        localStorage.removeItem(STORAGE_KEYS.SUPPLIERS);
        localStorage.removeItem(STORAGE_KEYS.TRANSACTIONS);
        localStorage.removeItem(STORAGE_KEYS.AUDIT_LOGS);
        localStorage.removeItem(STORAGE_KEYS.BACKUPS);
        localStorage.setItem(CLEAN_FLAG, '1');
      }

      const storedUsers = localStorage.getItem(STORAGE_KEYS.USERS);
      if (storedUsers) {
        const parsed: User[] = JSON.parse(storedUsers);
        this.users = parsed.map(u => ({
          ...u,
          password: u.password || (u.role === 'admin' ? 'admin123' : u.role === 'accountant' ? 'accountant123' : 'user123'),
          permissions: {
            ...(DEFAULT_ROLE_PERMISSIONS[u.role] || DEFAULT_ROLE_PERMISSIONS.user),
            ...(u.permissions || {}),
          }
        }));
      } else {
        this.users = [...INITIAL_USERS];
      }

      const storedSettings = localStorage.getItem(STORAGE_KEYS.SETTINGS);
      this.settings = storedSettings ? JSON.parse(storedSettings) : { ...INITIAL_SETTINGS };
      // Ensure defaults for cloud fields
      this.settings.cloudServerUrl = this.settings.cloudServerUrl || '';
      this.settings.cloudSyncToken = this.settings.cloudSyncToken || '';
      this.settings.autoCloudSync = this.settings.autoCloudSync !== false;
      this.settings.cloudSyncStatus = this.settings.cloudSyncStatus || 'idle';

      const storedCustomers = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
      this.customers = storedCustomers ? JSON.parse(storedCustomers) : [...INITIAL_CUSTOMERS];

      const storedSuppliers = localStorage.getItem(STORAGE_KEYS.SUPPLIERS);
      this.suppliers = storedSuppliers ? JSON.parse(storedSuppliers) : [...INITIAL_SUPPLIERS];

      const storedTransactions = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
      this.transactions = storedTransactions ? JSON.parse(storedTransactions) : [...INITIAL_TRANSACTIONS];

      const storedLogs = localStorage.getItem(STORAGE_KEYS.AUDIT_LOGS);
      this.auditLogs = storedLogs ? JSON.parse(storedLogs) : [...INITIAL_AUDIT_LOGS];

      const storedBackups = localStorage.getItem(STORAGE_KEYS.BACKUPS);
      this.backups = storedBackups ? JSON.parse(storedBackups) : [];

      const storedLedgers = localStorage.getItem(STORAGE_KEYS.LEDGERS);
      this.clientLedgers = storedLedgers ? JSON.parse(storedLedgers) : [...INITIAL_LEDGERS];

      const storedCurrentUser = localStorage.getItem(STORAGE_KEYS.CURRENT_USER);
      if (storedCurrentUser) {
        this.currentUser = JSON.parse(storedCurrentUser);
      } else {
        // Default admin for ease of use
        this.currentUser = this.users[0];
      }

      // Always require passing through the login cover on startup
      this.isBookOpen = false;
      try {
        localStorage.removeItem(STORAGE_KEYS.BOOK_OPEN);
      } catch {}

      // Always persist initial state if first run
      this.saveAll();
    } catch (e) {
      console.error('Error initializing storage, fallback to defaults:', e);
      this.users = [...INITIAL_USERS];
      this.settings = { ...INITIAL_SETTINGS };
      this.customers = [...INITIAL_CUSTOMERS];
      this.suppliers = [...INITIAL_SUPPLIERS];
      this.transactions = [...INITIAL_TRANSACTIONS];
      this.auditLogs = [...INITIAL_AUDIT_LOGS];
      this.clientLedgers = [...INITIAL_LEDGERS];
      this.currentUser = this.users[0];
    }
  }

  private saveAll() {
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(this.users));
    localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(this.settings));
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(this.customers));
    localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(this.suppliers));
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(this.transactions));
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(this.auditLogs));
    localStorage.setItem(STORAGE_KEYS.BACKUPS, JSON.stringify(this.backups));
    localStorage.setItem(STORAGE_KEYS.LEDGERS, JSON.stringify(this.clientLedgers));
    if (this.currentUser) {
      localStorage.setItem(STORAGE_KEYS.CURRENT_USER, JSON.stringify(this.currentUser));
    } else {
      localStorage.removeItem(STORAGE_KEYS.CURRENT_USER);
    }
    try {
      localStorage.removeItem(STORAGE_KEYS.BOOK_OPEN);
    } catch {}

    // Real-time automatic cloud synchronization on ANY mutation
    this.triggerAutoCloudSync();
  }

  // --- Auth & Session ---
  public getCurrentUser(): User | null {
    return this.currentUser;
  }

  public getUsers(): User[] {
    return [...this.users];
  }

  public login(username: string, pass: string): { success: boolean; user?: User; message?: string } {
    const user = this.users.find(u => u.username.toLowerCase() === username.trim().toLowerCase());
    if (!user) {
      return { success: false, message: 'اسم المستخدم أو كلمة المرور غير صحيحة' };
    }
    if (!user.isActive) {
      return { success: false, message: 'هذا الحساب معطل حالياً، راجع مسؤول النظام' };
    }

    if (user.password && user.password !== pass) {
      return { success: false, message: 'اسم المستخدم أو كلمة المرور غير صحيحة' };
    }

    this.currentUser = user;
    this.isBookOpen = true;
    this.saveAll();

    this.logAction('تسجيل دخول', `تسجيل دخول ناجح للمستخدم ${user.fullName} (${user.role})`);
    return { success: true, user };
  }

  public logout(): void {
    if (this.currentUser) {
      this.logAction('تسجيل خروج', `تسجيل خروج المستخدم ${this.currentUser.fullName}`);
    }
    this.isBookOpen = false;
    this.currentUser = null;
    this.saveAll();
  }

  public setBookOpen(isOpen: boolean) {
    this.isBookOpen = isOpen;
    try {
      if (!isOpen) {
        localStorage.removeItem(STORAGE_KEYS.BOOK_OPEN);
      }
    } catch {}
  }

  public getIsBookOpen(): boolean {
    return this.isBookOpen;
  }

  public addUser(user: Omit<User, 'id' | 'createdAt'>): User {
    const newUser: User = {
      ...user,
      id: `u-${Date.now()}`,
      password: user.password || '123456',
      permissions: {
        ...(DEFAULT_ROLE_PERMISSIONS[user.role] || DEFAULT_ROLE_PERMISSIONS.user),
        ...(user.permissions || {}),
      },
      createdAt: new Date().toISOString(),
    };
    this.users.push(newUser);
    this.logAction('إضافة مستخدم', `إضافة المستخدم الجديد ${newUser.fullName} بصلاحية ${newUser.role}`);
    this.saveAll();
    return newUser;
  }

  public switchUser(userId: string): User | null {
    const user = this.users.find(u => u.id === userId);
    if (!user) return null;
    this.currentUser = user;
    this.saveAll();
    this.logAction('تبديل مستخدم', `الانتقال إلى حساب المستخدم ${user.fullName} (${user.role})`);
    return user;
  }

  public updateUser(id: string, updates: Partial<User>): User | null {
    const index = this.users.findIndex(u => u.id === id);
    if (index === -1) return null;
    
    const oldUser = this.users[index];
    const updatedUser: User = {
      ...oldUser,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.users[index] = updatedUser;
    
    if (this.currentUser && this.currentUser.id === id) {
      this.currentUser = updatedUser;
    }
    
    this.logAction('تعديل مستخدم', `تعديل بيانات المستخدم ${updatedUser.fullName} (@${updatedUser.username})`);
    this.saveAll();
    this.syncUserToBackend(updatedUser);
    return updatedUser;
  }

  public async syncUserToBackend(u: User) {
    const urls = [
      'http://localhost/smart-debt-ledger/api.php?endpoint=users',
      '/api.php?endpoint=users',
    ];
    for (const url of urls) {
      try {
        const numericId = parseInt(u.id.replace(/\D/g, '')) || 1;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: numericId,
            username: u.username,
            full_name: u.fullName,
            password: u.password,
            role: u.role,
            is_active: u.isActive ? 1 : 0,
            permissions: u.permissions,
          }),
        });
        if (res.ok) break;
      } catch {}
    }
  }

  public deleteUser(id: string): { success: boolean; message?: string } {
    if (this.currentUser?.id === id) {
      return { success: false, message: 'لا يمكن حذف الحساب المسجل به حالياً' };
    }
    const adminCount = this.users.filter(u => u.role === 'admin' && u.isActive).length;
    const targetUser = this.users.find(u => u.id === id);
    if (!targetUser) {
      return { success: false, message: 'المستخدم غير موجود' };
    }
    if (targetUser.role === 'admin' && adminCount <= 1) {
      return { success: false, message: 'لا يمكن حذف المدير الوحيد في النظام' };
    }

    this.users = this.users.filter(u => u.id !== id);
    this.logAction('حذف مستخدم', `حذف المستخدم ${targetUser.fullName}`);
    this.saveAll();
    return { success: true };
  }

  // --- Settings ---
  public getSettings(): StoreSettings {
    return { ...this.settings };
  }

  public async syncSettingsToBackend(s: StoreSettings) {
    const urls = [
      'http://localhost/smart-debt-ledger/api.php?endpoint=settings',
      '/api.php?endpoint=settings',
    ];
    for (const url of urls) {
      try {
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            store_name: s.storeName,
            app_name: s.appName,
            currency: s.currency,
            phone: s.phone,
            address: s.address,
            cover_color: s.coverColor,
            logo_url: s.logoUrl,
            overdue_days_threshold: s.overdueDaysThreshold || 30,
          }),
        });
        if (res.ok) break;
      } catch {}
    }
  }

  public updateSettings(newSettings: Partial<StoreSettings>): StoreSettings {
    this.settings = { ...this.settings, ...newSettings };
    this.logAction('تعديل الإعدادات', `تم تحديث إعدادات المتجر والدفتر`);
    this.saveAll();
    this.syncSettingsToBackend(this.settings);
    return this.settings;
  }

  // --- Audit Logs ---
  public getAuditLogs(): AuditLog[] {
    return [...this.auditLogs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public logAction(action: string, details: string): void {
    const log: AuditLog = {
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      tenantId: this.settings.tenantId,
      userId: this.currentUser?.id || 'system',
      userName: this.currentUser?.fullName || 'النظام',
      action,
      details,
      ipAddress: '192.168.1.1',
      createdAt: new Date().toISOString(),
    };
    this.auditLogs.unshift(log);
    // Keep max 500 logs
    if (this.auditLogs.length > 500) {
      this.auditLogs = this.auditLogs.slice(0, 500);
    }
    localStorage.setItem(STORAGE_KEYS.AUDIT_LOGS, JSON.stringify(this.auditLogs));
  }

  // --- Customers ---
  public getCustomers(allTenants = false): Customer[] {
    if (allTenants) return [...this.customers];
    return this.customers.filter(c => !c.tenantId || c.tenantId === this.settings.tenantId);
  }

  public getCustomerById(id: string): Customer | undefined {
    return this.customers.find(c => c.id === id);
  }

  public getNextCustomerCode(): string {
    const list = this.getCustomers();
    const num = list.length + 1001;
    return `CUST-${num}`;
  }

  public addCustomer(data: {
    name: string;
    phone: string;
    address: string;
    notes: string;
    openingBalance: number;
    balanceType: 'debit' | 'credit';
  }): Customer {
    const code = this.getNextCustomerCode();
    const id = `c-${Date.now()}`;
    const uuid = generateUUID();
    const currentBalance = data.balanceType === 'debit' ? Number(data.openingBalance) : -Number(data.openingBalance);

    const newCustomer: Customer = {
      id,
      uuid,
      tenantId: this.settings.tenantId,
      code,
      name: data.name.trim(),
      phone: data.phone.trim(),
      address: data.address.trim(),
      notes: data.notes.trim(),
      openingBalance: Number(data.openingBalance),
      balanceType: data.balanceType,
      currentBalance,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      syncStatus: 'synced',
    };

    this.customers.push(newCustomer);

    // If opening balance > 0, register opening balance transaction
    if (newCustomer.openingBalance > 0) {
      this.addTransactionInternal({
        accountType: 'customer',
        accountId: newCustomer.id,
        accountName: newCustomer.name,
        accountCode: newCustomer.code,
        type: 'opening_balance',
        documentNo: `OPN-${newCustomer.code}`,
        date: new Date().toISOString().split('T')[0],
        amount: newCustomer.openingBalance,
        debit: data.balanceType === 'debit' ? newCustomer.openingBalance : 0,
        credit: data.balanceType === 'credit' ? newCustomer.openingBalance : 0,
        balanceAfter: currentBalance,
        description: 'رصيد افتتاحي مرحل عند إنشاء الحساب',
      });
    }

    this.logAction('إضافة زبون', `إضافة الزبون: ${newCustomer.name} برمز ${code}`);
    this.saveAll();
    return newCustomer;
  }

  public updateCustomer(id: string, updates: Partial<Customer>): Customer {
    const idx = this.customers.findIndex(c => c.id === id);
    if (idx === -1) throw new Error('الزبون غير موجود');

    this.customers[idx] = {
      ...this.customers[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.logAction('تعديل زبون', `تعديل بيانات الزبون: ${this.customers[idx].name}`);
    this.saveAll();
    return this.customers[idx];
  }

  public deleteCustomer(id: string): void {
    const cust = this.getCustomerById(id);
    if (!cust) return;

    // Check if customer has transactions other than opening balance
    const txCount = this.transactions.filter(t => t.accountId === id).length;
    if (txCount > 1) {
      throw new Error('لا يمكن حذف الزبون لوجود حركات مالية مسجلة في سجله. يمكنك تعديل حالته إلى غير نشط.');
    }

    this.customers = this.customers.filter(c => c.id !== id);
    this.transactions = this.transactions.filter(t => t.accountId !== id);
    this.logAction('حذف زبون', `حذف الزبون: ${cust.name} (${cust.code})`);
    this.saveAll();
  }

  // --- Suppliers ---
  public getSuppliers(allTenants = false): Supplier[] {
    if (allTenants) return [...this.suppliers];
    return this.suppliers.filter(s => !s.tenantId || s.tenantId === this.settings.tenantId);
  }

  public getSupplierById(id: string): Supplier | undefined {
    return this.suppliers.find(s => s.id === id);
  }

  public getNextSupplierCode(): string {
    const list = this.getSuppliers();
    const num = list.length + 2001;
    return `SUP-${num}`;
  }

  public addSupplier(data: {
    name: string;
    phone: string;
    address: string;
    notes: string;
    openingBalance: number;
  }): Supplier {
    const code = this.getNextSupplierCode();
    const id = `s-${Date.now()}`;
    const uuid = generateUUID();
    const currentBalance = Number(data.openingBalance);

    const newSupplier: Supplier = {
      id,
      uuid,
      tenantId: this.settings.tenantId,
      code,
      name: data.name.trim(),
      phone: data.phone.trim(),
      address: data.address.trim(),
      notes: data.notes.trim(),
      openingBalance: Number(data.openingBalance),
      currentBalance,
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      syncStatus: 'synced',
    };

    this.suppliers.push(newSupplier);

    // If opening balance > 0, register transaction (Supplier opening balance is Credit = له علينا)
    if (newSupplier.openingBalance > 0) {
      this.addTransactionInternal({
        accountType: 'supplier',
        accountId: newSupplier.id,
        accountName: newSupplier.name,
        accountCode: newSupplier.code,
        type: 'opening_balance',
        documentNo: `OPN-${newSupplier.code}`,
        date: new Date().toISOString().split('T')[0],
        amount: newSupplier.openingBalance,
        debit: 0,
        credit: newSupplier.openingBalance,
        balanceAfter: currentBalance,
        description: 'رصيد افتتاحي مستحق للمورد',
      });
    }

    this.logAction('إضافة مورد', `إضافة المورد: ${newSupplier.name} برمز ${code}`);
    this.saveAll();
    return newSupplier;
  }

  public updateSupplier(id: string, updates: Partial<Supplier>): Supplier {
    const idx = this.suppliers.findIndex(s => s.id === id);
    if (idx === -1) throw new Error('المورد غير موجود');

    this.suppliers[idx] = {
      ...this.suppliers[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };

    this.logAction('تعديل مورد', `تعديل بيانات المورد: ${this.suppliers[idx].name}`);
    this.saveAll();
    return this.suppliers[idx];
  }

  public deleteSupplier(id: string): void {
    const supp = this.getSupplierById(id);
    if (!supp) return;

    const txCount = this.transactions.filter(t => t.accountId === id).length;
    if (txCount > 1) {
      throw new Error('لا يمكن حذف المورد لوجود حركات مالية ومشتريات مسجلة. يمكنك تعطيل الحساب بدلاً من الحذف.');
    }

    this.suppliers = this.suppliers.filter(s => s.id !== id);
    this.transactions = this.transactions.filter(t => t.accountId !== id);
    this.logAction('حذف مورد', `حذف المورد: ${supp.name} (${supp.code})`);
    this.saveAll();
  }

  // --- Transactions & Ledger ---
  public getTransactions(allTenants = false): Transaction[] {
    const list = allTenants
      ? this.transactions
      : this.transactions.filter(t => !t.tenantId || t.tenantId === this.settings.tenantId);
    return [...list].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  public getTransactionsForAccount(accountId: string): Transaction[] {
    return this.transactions
      .filter(t => t.accountId === accountId)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.id.localeCompare(b.id));
  }

  public getNextDocNumber(type: TransactionType): string {
    const year = new Date().getFullYear();
    const count = this.transactions.filter(t => t.type === type).length + 1;
    const pad = String(count).padStart(4, '0');

    switch (type) {
      case 'sale':
        return `INV-${year}-${pad}`;
      case 'customer_payment':
        return `RCP-${year}-${pad}`;
      case 'purchase':
        return `PUR-${year}-${pad}`;
      case 'supplier_payment':
        return `PV-${year}-${pad}`;
      default:
        return `DOC-${year}-${pad}`;
    }
  }

  private addTransactionInternal(txData: Omit<Transaction, 'id' | 'uuid' | 'tenantId' | 'userId' | 'userName' | 'createdAt' | 'updatedAt' | 'syncStatus'>): Transaction {
    const newTx: Transaction = {
      ...txData,
      id: `tx-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      uuid: generateUUID(),
      tenantId: this.settings.tenantId,
      userId: this.currentUser?.id || 'u-1',
      userName: this.currentUser?.fullName || 'المدير العام',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      syncStatus: 'synced',
    };
    this.transactions.push(newTx);
    return newTx;
  }

  /**
   * Execute financial transaction with strict database accounting rules
   */
  public recordTransaction(params: {
    accountType: 'customer' | 'supplier';
    accountId: string;
    type: TransactionType;
    documentNo?: string;
    date: string;
    amount: number;
    paymentMethod?: PaymentMethod;
    description: string;
    notes?: string;
  }): { success: boolean; transaction: Transaction; newBalance: number } {
    const amount = Number(params.amount);
    if (isNaN(amount) || amount <= 0) {
      throw new Error('يرجى إدخال مبلغ صحيح أكبر من الصفر');
    }

    const docNo = params.documentNo?.trim() || this.getNextDocNumber(params.type);
    let debit = 0;
    let credit = 0;
    let newBalance = 0;
    let accountName = '';
    let accountCode = '';

    if (params.accountType === 'customer') {
      const customer = this.getCustomerById(params.accountId);
      if (!customer) throw new Error('الزبون غير موجود');
      accountName = customer.name;
      accountCode = customer.code;

      if (params.type === 'sale') {
        // البيع الآجل: مدين (Debit) -> يزيد الدين على الزبون
        debit = amount;
        credit = 0;
        newBalance = customer.currentBalance + amount;
      } else if (params.type === 'customer_payment') {
        // تسديد من زبون: دائن (Credit) -> ينقص الدين
        debit = 0;
        credit = amount;
        newBalance = customer.currentBalance - amount;

        // Check if payment exceeds debt
        if (newBalance < 0 && !this.settings.allowCreditBalance) {
          throw new Error(`مبلغ التسديد (${amount.toLocaleString()} ${this.settings.currency}) يتجاوز إجمالي الدين المستحق (${customer.currentBalance.toLocaleString()} ${this.settings.currency}) وإعدادات النظام لا تسمح بالأرصدة الدائنة.`);
        }
      } else {
        throw new Error('نوع الحركة غير صالح للزبائن');
      }

      // Update customer balance directly
      customer.currentBalance = newBalance;
      customer.updatedAt = new Date().toISOString();
    } else {
      // Supplier
      const supplier = this.getSupplierById(params.accountId);
      if (!supplier) throw new Error('المورد غير موجود');
      accountName = supplier.name;
      accountCode = supplier.code;

      if (params.type === 'purchase') {
        // شراء آجل: دائن (Credit) -> يزيد المستحق للمورد
        debit = 0;
        credit = amount;
        newBalance = supplier.currentBalance + amount;
      } else if (params.type === 'supplier_payment') {
        // تسديد للمورد: مدين (Debit) -> ينقص المستحق للمورد
        debit = amount;
        credit = 0;
        newBalance = supplier.currentBalance - amount;
      } else {
        throw new Error('نوع الحركة غير صالح للموردين');
      }

      // Update supplier balance directly
      supplier.currentBalance = newBalance;
      supplier.updatedAt = new Date().toISOString();
    }

    const tx = this.addTransactionInternal({
      accountType: params.accountType,
      accountId: params.accountId,
      accountName,
      accountCode,
      type: params.type,
      documentNo: docNo,
      date: params.date,
      amount,
      debit,
      credit,
      balanceAfter: newBalance,
      paymentMethod: params.paymentMethod || 'cash',
      description: params.description.trim(),
      notes: params.notes?.trim(),
    });

    const actionTitle = 
      params.type === 'sale' ? 'إضافة بيع آجل' :
      params.type === 'customer_payment' ? 'تسجيل تسديد زبون' :
      params.type === 'purchase' ? 'إضافة شراء آجل' : 'تسديد لمورد';

    this.logAction(actionTitle, `مبلغ ${amount.toLocaleString()} ${this.settings.currency} - مستند: ${docNo} - الحساب: ${accountName}`);
    this.saveAll();

    return { success: true, transaction: tx, newBalance };
  }

  public recalculateCustomerBalance(customerId: string): number {
    const customer = this.getCustomerById(customerId);
    if (!customer) return 0;

    const custTx = this.transactions
      .filter(t => t.accountId === customerId)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.id.localeCompare(b.id));

    const hasOpeningTx = custTx.some(t => t.type === 'opening_balance');
    let running = (!hasOpeningTx && customer.openingBalance > 0)
      ? (customer.balanceType === 'debit' ? customer.openingBalance : -customer.openingBalance)
      : 0;

    for (const tx of custTx) {
      running = running + (tx.debit || 0) - (tx.credit || 0);
      tx.balanceAfter = running;
    }

    customer.currentBalance = running;
    customer.updatedAt = new Date().toISOString();
    return running;
  }

  public recalculateSupplierBalance(supplierId: string): number {
    const supplier = this.getSupplierById(supplierId);
    if (!supplier) return 0;

    const suppTx = this.transactions
      .filter(t => t.accountId === supplierId)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime() || a.id.localeCompare(b.id));

    const hasOpeningTx = suppTx.some(t => t.type === 'opening_balance');
    let running = (!hasOpeningTx && supplier.openingBalance > 0) ? supplier.openingBalance : 0;

    for (const tx of suppTx) {
      running = running + (tx.credit || 0) - (tx.debit || 0);
      tx.balanceAfter = running;
    }

    supplier.currentBalance = running;
    supplier.updatedAt = new Date().toISOString();
    return running;
  }

  public updateTransaction(
    id: string,
    updates: {
      documentNo?: string;
      date?: string;
      amount?: number;
      description?: string;
      notes?: string;
      paymentMethod?: PaymentMethod;
    }
  ): { success: boolean; transaction: Transaction; newBalance: number } {
    const index = this.transactions.findIndex(t => t.id === id);
    if (index === -1) throw new Error('الحركة المالية غير موجودة');

    const oldTx = this.transactions[index];
    const oldAmount = oldTx.amount;
    const newAmount = updates.amount !== undefined ? Number(updates.amount) : oldTx.amount;

    if (isNaN(newAmount) || newAmount <= 0) {
      throw new Error('يرجى إدخال مبلغ صحيح أكبر من الصفر');
    }

    let debit = oldTx.debit;
    let credit = oldTx.credit;

    if (oldTx.type === 'sale') {
      debit = newAmount;
      credit = 0;
    } else if (oldTx.type === 'customer_payment') {
      debit = 0;
      credit = newAmount;
    } else if (oldTx.type === 'purchase') {
      debit = 0;
      credit = newAmount;
    } else if (oldTx.type === 'supplier_payment') {
      debit = newAmount;
      credit = 0;
    } else if (oldTx.type === 'opening_balance') {
      if (oldTx.debit > 0) debit = newAmount;
      if (oldTx.credit > 0) credit = newAmount;
    }

    const updatedTx: Transaction = {
      ...oldTx,
      documentNo: updates.documentNo?.trim() || oldTx.documentNo,
      date: updates.date || oldTx.date,
      amount: newAmount,
      debit,
      credit,
      description: updates.description?.trim() || oldTx.description,
      notes: updates.notes !== undefined ? updates.notes.trim() : oldTx.notes,
      paymentMethod: updates.paymentMethod || oldTx.paymentMethod,
      updatedAt: new Date().toISOString(),
    };

    this.transactions[index] = updatedTx;

    let newBalance = 0;
    if (updatedTx.accountType === 'customer') {
      newBalance = this.recalculateCustomerBalance(updatedTx.accountId);
    } else {
      newBalance = this.recalculateSupplierBalance(updatedTx.accountId);
    }

    this.logAction(
      'تعديل حركة مالية',
      `تعديل المستند ${updatedTx.documentNo} (${oldAmount.toLocaleString()} -> ${newAmount.toLocaleString()} ${this.settings.currency}) للحساب: ${updatedTx.accountName}`
    );
    this.saveAll();

    return { success: true, transaction: updatedTx, newBalance };
  }

  public deleteTransaction(id: string): { success: boolean; newBalance: number } {
    const tx = this.transactions.find(t => t.id === id);
    if (!tx) throw new Error('الحركة المالية غير موجودة');

    this.transactions = this.transactions.filter(t => t.id !== id);

    let newBalance = 0;
    if (tx.accountType === 'customer') {
      newBalance = this.recalculateCustomerBalance(tx.accountId);
    } else {
      newBalance = this.recalculateSupplierBalance(tx.accountId);
    }

    this.logAction(
      'حذف حركة مالية',
      `حذف المستند ${tx.documentNo} بمبلغ ${tx.amount.toLocaleString()} ${this.settings.currency} للحساب: ${tx.accountName}`
    );
    this.saveAll();

    return { success: true, newBalance };
  }

  // --- Statistics & KPI ---
  public getDashboardStats() {
    const totalCustomerDebts = this.customers.reduce((acc, c) => acc + (c.currentBalance > 0 ? c.currentBalance : 0), 0);
    const totalSupplierDues = this.suppliers.reduce((acc, s) => acc + (s.currentBalance > 0 ? s.currentBalance : 0), 0);
    
    const totalCreditSales = this.transactions
      .filter(t => t.type === 'sale')
      .reduce((acc, t) => acc + t.amount, 0);

    const totalCreditPurchases = this.transactions
      .filter(t => t.type === 'purchase')
      .reduce((acc, t) => acc + t.amount, 0);

    const totalCustomerPayments = this.transactions
      .filter(t => t.type === 'customer_payment')
      .reduce((acc, t) => acc + t.amount, 0);

    const totalSupplierPayments = this.transactions
      .filter(t => t.type === 'supplier_payment')
      .reduce((acc, t) => acc + t.amount, 0);

    return {
      totalCustomerDebts,
      totalSupplierDues,
      totalCreditSales,
      totalCreditPurchases,
      totalCustomerPayments,
      totalSupplierPayments,
      customerCount: this.customers.length,
      supplierCount: this.suppliers.length,
      transactionsCount: this.transactions.length,
    };
  }

  // --- Backup & Restore ---
  public createBackup(): BackupRecord {
    const data = {
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      tenantId: this.settings.tenantId,
      settings: this.settings,
      users: this.users,
      customers: this.customers,
      suppliers: this.suppliers,
      transactions: this.transactions,
      auditLogs: this.auditLogs,
    };

    const jsonStr = JSON.stringify(data, null, 2);
    const sizeKb = (new Blob([jsonStr]).size / 1024).toFixed(1) + ' KB';
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const filename = `backup-smart-ledger-${dateStr}.json`;

    const record: BackupRecord = {
      id: `bk-${Date.now()}`,
      filename,
      createdAt: new Date().toISOString(),
      size: sizeKb,
      recordsCount: this.customers.length + this.suppliers.length + this.transactions.length,
      dataJson: jsonStr,
    };

    this.backups.unshift(record);
    if (this.backups.length > 25) {
      this.backups = this.backups.slice(0, 25);
    }
    this.settings.lastBackupDate = record.createdAt;
    this.logAction('إنشاء نسخة احتياطية', `إنشاء نسخة: ${filename} بحجم ${sizeKb}`);
    this.saveAll();
    return record;
  }

  public getBackups(): BackupRecord[] {
    return [...this.backups];
  }

  public deleteBackup(id: string): void {
    const bk = this.backups.find(b => b.id === id);
    this.backups = this.backups.filter(b => b.id !== id);
    if (bk) {
      this.logAction('حذف نسخة احتياطية', `حذف سجل النسخة الاحتياطية: ${bk.filename}`);
    }
    this.saveAll();
  }

  public restoreBackup(jsonString: string): { success: boolean; message: string } {
    try {
      const data = JSON.parse(jsonString);
      if (!data.customers || !data.transactions) {
        throw new Error('ملف النسخة الاحتياطية غير صالح أو ناقص');
      }

      this.customers = data.customers || [];
      this.suppliers = data.suppliers || [];
      this.transactions = data.transactions || [];
      if (data.settings) this.settings = data.settings;
      if (data.users) this.users = data.users;

      this.logAction('استعادة نسخة احتياطية', `تمت استعادة البيانات بنجاح: ${this.customers.length} زبون و ${this.transactions.length} حركة`);
      this.saveAll();
      return { success: true, message: 'تمت استعادة النسخة الاحتياطية بنجاح' };
    } catch (e: any) {
      return { success: false, message: e.message || 'فشل في قراءة ملف النسخة الاحتياطية' };
    }
  }

  public resetToDemo(): void {
    this.customers = [];
    this.suppliers = [];
    this.transactions = [];
    this.users = [...INITIAL_USERS];
    this.settings = { ...INITIAL_SETTINGS };
    this.auditLogs = [];
    this.currentUser = this.users[0];
    this.isBookOpen = false;
    this.logAction('إعادة ضبط وتهيئة النظام', 'تم مسح كافة البيانات وتصفير النظام بحالة أولية جديدة فارغة');
    this.saveAll();
  }

  // --- Sync Simulator for Desktop ---
  public processDesktopSync(payload: SyncPayload) {
    let syncedIncoming = 0;

    // Process incoming client transactions if any
    for (const incomingTx of payload.transactions || []) {
      const exists = this.transactions.some(t => t.uuid === incomingTx.uuid);
      if (!exists) {
        this.transactions.push({
          ...incomingTx,
          syncStatus: 'synced',
          updatedAt: new Date().toISOString(),
        });
        syncedIncoming++;
      }
    }

    this.logAction('مزامنة مع تطبيق Desktop', `مزامنة جهاز (${payload.deviceId}) - تم استقبال ${syncedIncoming} حركة جديدة`);
    this.saveAll();

    return {
      success: true,
      serverTime: new Date().toISOString(),
      processedCount: syncedIncoming,
      serverCustomers: this.customers,
      serverSuppliers: this.suppliers,
      serverTransactions: this.transactions,
    };
  }

  // =========================================================
  // --- Platform Multi-Client Ledgers (عزل سجلات العملاء) ---
  // =========================================================
  public getClientLedgers(): ClientLedger[] {
    return [...this.clientLedgers];
  }

  public getActiveLedger(): ClientLedger {
    const found = this.clientLedgers.find(l => l.id === this.settings.tenantId);
    if (found) return found;

    return {
      id: this.settings.tenantId,
      name: this.settings.storeName,
      code: 'LEDGER-01',
      currency: this.settings.currency,
      phone: this.settings.phone,
      coverColor: this.settings.coverColor,
      createdAt: new Date().toISOString(),
    };
  }

  public switchClientLedger(ledgerId: string): { success: boolean; message: string; ledger?: ClientLedger } {
    const ledger = this.clientLedgers.find(l => l.id === ledgerId);
    if (!ledger) {
      return { success: false, message: 'سجل العميل المطلوب غير موجود' };
    }

    this.settings.tenantId = ledger.id;
    this.settings.storeName = ledger.name;
    if (ledger.currency) this.settings.currency = ledger.currency;
    if (ledger.coverColor) this.settings.coverColor = ledger.coverColor;
    if (ledger.phone) this.settings.phone = ledger.phone;

    this.logAction('فتح سجل ديون لكلاينت', `تم فتح سجل العميل: ${ledger.name} (${ledger.code}) كدفتر نشط`);
    this.saveAll();

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('smart_ledger_tenant_switched', { detail: ledger }));
    }

    return { success: true, message: `تم فتح سجل الديون الخاص بـ "${ledger.name}" بنجاح`, ledger };
  }

  public createClientLedger(data: {
    name: string;
    code?: string;
    currency?: string;
    phone?: string;
    ownerName?: string;
    notes?: string;
    coverColor?: string;
    autoSwitch?: boolean;
  }): ClientLedger {
    const code = data.code?.trim() || `LEDGER-${this.clientLedgers.length + 101}`;
    const id = `tenant-${Date.now().toString(36)}`;
    const newLedger: ClientLedger = {
      id,
      name: data.name.trim(),
      code,
      currency: data.currency?.trim() || 'د.ع',
      phone: data.phone?.trim() || '',
      ownerName: data.ownerName?.trim() || '',
      notes: data.notes?.trim() || '',
      coverColor: data.coverColor || '#581c1c',
      createdAt: new Date().toISOString(),
    };

    this.clientLedgers.push(newLedger);
    this.logAction('إنشاء سجل ديون جديد', `تم إنشاء سجل جديد للكلاينت: ${newLedger.name} (${newLedger.code})`);

    if (data.autoSwitch !== false) {
      this.settings.tenantId = newLedger.id;
      this.settings.storeName = newLedger.name;
      this.settings.currency = newLedger.currency;
      if (newLedger.coverColor) this.settings.coverColor = newLedger.coverColor;
      if (newLedger.phone) this.settings.phone = newLedger.phone;
    }

    this.saveAll();
    return newLedger;
  }

  public deleteClientLedger(id: string): { success: boolean; message: string } {
    if (this.clientLedgers.length <= 1) {
      return { success: false, message: 'لا يمكن حذف السجل الوحيد المتبقي في المنصة' };
    }

    const target = this.clientLedgers.find(l => l.id === id);
    if (!target) return { success: false, message: 'السجل غير موجود' };

    this.clientLedgers = this.clientLedgers.filter(l => l.id !== id);

    // If active ledger was deleted, switch to the first available ledger
    if (this.settings.tenantId === id) {
      const fallback = this.clientLedgers[0];
      this.settings.tenantId = fallback.id;
      this.settings.storeName = fallback.name;
      this.settings.currency = fallback.currency;
    }

    this.logAction('حذف سجل عميل', `تم حذف سجل الديون: ${target.name}`);
    this.saveAll();
    return { success: true, message: 'تم حذف سجل العميل بنجاح' };
  }

  // =========================================================
  // --- Cloud Server Real-Time Auto-Sync Engine (السحابة) ---
  // =========================================================
  public getDeviceId(): string {
    let devId = localStorage.getItem(STORAGE_KEYS.DEVICE_ID);
    if (!devId) {
      devId = `dev-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
      localStorage.setItem(STORAGE_KEYS.DEVICE_ID, devId);
    }
    return devId;
  }

  public triggerAutoCloudSync(): void {
    if (!this.settings.cloudServerUrl || !this.settings.cloudSyncToken || this.settings.autoCloudSync === false) {
      return;
    }

    if (this.cloudSyncTimer) {
      clearTimeout(this.cloudSyncTimer);
    }

    // Debounce to batch rapid typing or bulk additions
    this.cloudSyncTimer = setTimeout(() => {
      this.syncWithCloudNow().catch(err => {
        console.warn('Auto cloud sync notice:', err);
      });
    }, 700);
  }

  public async syncWithCloudNow(): Promise<{ success: boolean; message: string; details?: any }> {
    const url = this.settings.cloudServerUrl?.trim();
    const token = this.settings.cloudSyncToken?.trim();
    const tenantId = this.settings.tenantId || 'tenant-01';

    if (!url) {
      return { success: false, message: 'لم يتم تعيين رابط السيرفر السحابي في الإعدادات' };
    }

    if (this.isSyncInProgress) {
      return { success: false, message: 'المزامنة جارية بالفعل حالياً...' };
    }

    this.isSyncInProgress = true;
    this.settings.cloudSyncStatus = 'syncing';
    this.dispatchSyncEvent('syncing', 'جاري المزامنة التلقائية مع السحابة...');

    try {
      // Build tenant-isolated payload to prevent any data mixing
      const tenantCustomers = this.customers.filter(c => !c.tenantId || c.tenantId === tenantId);
      const tenantSuppliers = this.suppliers.filter(s => !s.tenantId || s.tenantId === tenantId);
      const tenantTransactions = this.transactions.filter(t => !t.tenantId || t.tenantId === tenantId);

      const payload = {
        action: 'sync',
        tenantId,
        token,
        deviceId: this.getDeviceId(),
        clientTimestamp: new Date().toISOString(),
        settings: {
          storeName: this.settings.storeName,
          currency: this.settings.currency,
          phone: this.settings.phone,
          address: this.settings.address,
        },
        customers: tenantCustomers,
        suppliers: tenantSuppliers,
        transactions: tenantTransactions,
      };

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Device-ID': this.getDeviceId(),
        'X-Tenant-ID': tenantId,
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`خطأ استجابة الخادم (${response.status} ${response.statusText})`);
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error || data.message || 'فشلت المزامنة من جهة الخادم');
      }

      // Merge incoming server records for this tenant if any
      let incomingCount = 0;
      const incomingTx = data.updates?.transactions || data.transactions;
      if (Array.isArray(incomingTx)) {
        for (const remoteTx of incomingTx) {
          const exists = this.transactions.some(t => t.uuid === remoteTx.uuid || (remoteTx.id && t.id === remoteTx.id));
          if (!exists) {
            this.transactions.push({
              ...remoteTx,
              tenantId,
              syncStatus: 'synced',
            });
            incomingCount++;
          }
        }
      }

      this.settings.cloudSyncStatus = 'synced';
      this.settings.lastCloudSyncDate = new Date().toISOString();
      this.settings.cloudSyncError = undefined;

      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(this.settings));
      if (incomingCount > 0) {
        localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(this.transactions));
      }

      const successMsg = `تمت المزامنة بنجاح مع السحابة للسجل (${this.settings.storeName}) - ${incomingCount} حركة جديدة`;
      this.dispatchSyncEvent('synced', successMsg);

      return {
        success: true,
        message: successMsg,
        details: data,
      };
    } catch (err: any) {
      const errorMsg = err.message || 'تعذر الاتصال بالسيرفر السحابي';
      this.settings.cloudSyncStatus = 'error';
      this.settings.cloudSyncError = errorMsg;
      localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(this.settings));

      this.dispatchSyncEvent('error', errorMsg);
      return { success: false, message: errorMsg };
    } finally {
      this.isSyncInProgress = false;
    }
  }

  public async testCloudConnection(
    url?: string,
    token?: string,
    tenantId?: string
  ): Promise<{ success: boolean; message: string; latency?: number; details?: any }> {
    const testUrl = (url || this.settings.cloudServerUrl)?.trim();
    const testToken = (token !== undefined ? token : this.settings.cloudSyncToken)?.trim();
    const testTenant = (tenantId || this.settings.tenantId || 'tenant-01').trim();

    if (!testUrl) {
      return { success: false, message: 'يرجى إدخال رابط السيرفر السحابي أولاً' };
    }

    const startTime = performance.now();
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-Tenant-ID': testTenant,
      };

      if (testToken) {
        headers['Authorization'] = `Bearer ${testToken}`;
      }

      const response = await fetch(testUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'ping',
          tenantId: testTenant,
          token: testToken,
          clientTimestamp: new Date().toISOString(),
        }),
      });

      const latency = Math.round(performance.now() - startTime);

      if (!response.ok) {
        return {
          success: false,
          latency,
          message: `فشل الاتصال: كود الخطأ ${response.status} (${response.statusText})`,
        };
      }

      const data = await response.json();
      if (data.success === false) {
        return {
          success: false,
          latency,
          message: data.error || data.message || 'رفض الخادم الاتصال',
        };
      }

      return {
        success: true,
        latency,
        message: `تم الاتصال بالسيرفر السحابي بنجاح! سرعة الاستجابة: ${latency} مللي ثانية (السجل: ${testTenant})`,
        details: data,
      };
    } catch (err: any) {
      const latency = Math.round(performance.now() - startTime);
      return {
        success: false,
        latency,
        message: `فشل الاتصال: ${err.message || 'تأكد من عنوان السيرفر ومن تفعيل CORS على الاستضافة'}`,
      };
    }
  }

  private dispatchSyncEvent(status: 'idle' | 'syncing' | 'synced' | 'error', message?: string) {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('smart_ledger_cloud_sync', {
          detail: {
            status,
            message,
            timestamp: new Date().toISOString(),
            tenantId: this.settings.tenantId,
          },
        })
      );
    }
  }
}

export const storage = new StorageService();
