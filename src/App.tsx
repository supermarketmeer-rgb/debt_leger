import React, { useState, useEffect } from 'react';
import { storage } from './services/storage';
import { Customer, Supplier, Transaction, User, StoreSettings, TransactionType, PaymentMethod } from './types';
import { BookCover } from './components/BookCover';
import type { ActiveTab } from './components/Header';
import { Dashboard } from './components/Dashboard';
import { CustomersView } from './components/CustomersView';
import { CustomerLedger } from './components/CustomerLedger';
import { SuppliersView } from './components/SuppliersView';
import { SupplierLedger } from './components/SupplierLedger';
import { GeneralJournal } from './components/GeneralJournal';
import { ReportsView } from './components/ReportsView';
import { ApiSyncView } from './components/ApiSyncView';
import { AuditBackupView } from './components/AuditBackupView';
import { SettingsView } from './components/SettingsView';
import { TransactionModal } from './components/TransactionModal';
import { InstallerModal } from './components/InstallerModal';
import { PhpSourceModal } from './components/PhpSourceModal';
import { PrintReceiptModal } from './components/PrintReceiptModal';
import { ExcelViewerModal } from './components/ExcelViewerModal';
import { OpenBookLayout } from './components/OpenBookLayout';
import { SalesAndPaymentsBook } from './components/SalesAndPaymentsBook';
import { PurchasesAndPaymentsBook } from './components/PurchasesAndPaymentsBook';
import { AdminMobileApp } from './components/AdminMobileApp';
import { canUserAccessTab } from './utils/permissions';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(storage.getCurrentUser());
  const [settings, setSettings] = useState<StoreSettings>(storage.getSettings());
  const [isBookOpen, setIsBookOpen] = useState<boolean>(false);
  const [isOpeningAnim, setIsOpeningAnim] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [appMode, setAppMode] = useState<'book' | 'mobile'>(() => {
    try {
      if (typeof window !== 'undefined') {
        const urlParams = new URLSearchParams(window.location.search);
        if (urlParams.get('mode') === 'mobile' || window.location.hash.toLowerCase().includes('mobile')) {
          return 'mobile';
        }
        const saved = localStorage.getItem('smart_debt_ledger_mode');
        if (saved === 'mobile' || saved === 'book') return saved;
        return window.innerWidth < 768 ? 'mobile' : 'book';
      }
      return 'book';
    } catch {
      return 'book';
    }
  });

  const toggleAppMode = (mode: 'book' | 'mobile') => {
    setAppMode(mode);
    try {
      localStorage.setItem('smart_debt_ledger_mode', mode);
    } catch {}
  };

  // Core Data Lists
  const [customers, setCustomers] = useState<Customer[]>(storage.getCustomers());
  const [suppliers, setSuppliers] = useState<Supplier[]>(storage.getSuppliers());
  const [transactions, setTransactions] = useState<Transaction[]>(storage.getTransactions());
  const [auditLogs, setAuditLogs] = useState(storage.getAuditLogs());
  const [backups, setBackups] = useState(storage.getBackups());

  // Search
  const [searchQuery, setSearchQuery] = useState('');

  // Individual Ledger State
  const [activeCustomerForLedger, setActiveCustomerForLedger] = useState<Customer | null>(null);
  const [activeSupplierForLedger, setActiveSupplierForLedger] = useState<Supplier | null>(null);

  // Modals
  const [txModalState, setTxModalState] = useState<{
    isOpen: boolean;
    type: TransactionType;
    defaultAccountId?: string;
  }>({
    isOpen: false,
    type: 'sale',
  });

  const [isInstallerOpen, setIsInstallerOpen] = useState(false);
  const [isPhpSourceOpen, setIsPhpSourceOpen] = useState(false);
  const [printModalState, setPrintModalState] = useState<{
    isOpen: boolean;
    title: string;
    accountName: string;
    transactions: Transaction[];
    currentBalance: number;
    isSupplier?: boolean;
  }>({
    isOpen: false,
    title: '',
    accountName: '',
    transactions: [],
    currentBalance: 0,
  });

  // Excel Formatted Table Viewer Modal State
  const [excelModalState, setExcelModalState] = useState<{
    isOpen: boolean;
    title: string;
    subtitle?: string;
    filename?: string;
    headers: string[];
    rows: (string | number)[][];
    summaryStats?: { label: string; value: string | number }[];
  }>({
    isOpen: false,
    title: '',
    headers: [],
    rows: [],
  });

  // Automatically redirect to dashboard if the current active tab is unauthorized for the user
  useEffect(() => {
    if (!canUserAccessTab(activeTab, currentUser)) {
      setActiveTab('dashboard');
    }
  }, [activeTab, currentUser]);

  useEffect(() => {
    const handleTenantSwitch = () => {
      refreshAllData();
    };
    const handleCloudSync = (e: any) => {
      setSettings(storage.getSettings());
      if (e.detail?.status === 'synced') {
        setCustomers(storage.getCustomers());
        setSuppliers(storage.getSuppliers());
        setTransactions(storage.getTransactions());
      }
    };

    window.addEventListener('smart_ledger_tenant_switched', handleTenantSwitch);
    window.addEventListener('smart_ledger_cloud_sync', handleCloudSync);

    return () => {
      window.removeEventListener('smart_ledger_tenant_switched', handleTenantSwitch);
      window.removeEventListener('smart_ledger_cloud_sync', handleCloudSync);
    };
  }, []);

  const refreshAllData = () => {
    setCustomers(storage.getCustomers());
    setSuppliers(storage.getSuppliers());
    setTransactions(storage.getTransactions());
    setAuditLogs(storage.getAuditLogs());
    setBackups(storage.getBackups());
    setSettings(storage.getSettings());
    setCurrentUser(storage.getCurrentUser());
  };

  // Login handler with 3D opening animation
  const handleLogin = (username: string, pass: string, targetMode?: 'book' | 'mobile') => {
    const res = storage.login(username, pass);
    if (res.success && res.user) {
      setCurrentUser(res.user);
      if (targetMode) {
        toggleAppMode(targetMode);
      }
      setIsOpeningAnim(true);
      setTimeout(() => {
        setIsOpeningAnim(false);
        setIsBookOpen(true);
        refreshAllData();
      }, 750);
    } else {
      alert(res.message || 'بيانات الدخول غير صحيحة');
    }
  };

  const handleCloseBook = () => {
    storage.setBookOpen(false);
    setIsBookOpen(false);
  };

  // Transaction Handlers
  const handleSaveTransaction = (params: {
    accountType: 'customer' | 'supplier';
    accountId: string;
    type: TransactionType;
    documentNo: string;
    date: string;
    amount: number;
    paymentMethod?: PaymentMethod;
    description: string;
    notes?: string;
  }) => {
    const res = storage.recordTransaction(params);
    refreshAllData();
    return res?.transaction;
  };

  const handleUpdateTransaction = (
    id: string,
    updates: {
      documentNo?: string;
      date?: string;
      amount?: number;
      description?: string;
      notes?: string;
      paymentMethod?: PaymentMethod;
    }
  ) => {
    const res = storage.updateTransaction(id, updates);
    refreshAllData();
    return res;
  };

  const handleDeleteTransaction = (id: string) => {
    const res = storage.deleteTransaction(id);
    refreshAllData();
    return res;
  };

  // Customer Management Handlers
  const handleAddCustomer = (data: any) => {
    storage.addCustomer(data);
    refreshAllData();
  };

  const handleUpdateCustomer = (id: string, updates: any) => {
    storage.updateCustomer(id, updates);
    refreshAllData();
  };

  const handleDeleteCustomer = (id: string) => {
    storage.deleteCustomer(id);
    refreshAllData();
  };

  // Supplier Management Handlers
  const handleAddSupplier = (data: any) => {
    storage.addSupplier(data);
    refreshAllData();
  };

  const handleUpdateSupplier = (id: string, updates: any) => {
    storage.updateSupplier(id, updates);
    refreshAllData();
  };

  const handleDeleteSupplier = (id: string) => {
    storage.deleteSupplier(id);
    refreshAllData();
  };

  const handleOpenTransactionModal = (type: TransactionType = 'sale', accountId?: string) => {
    setTxModalState({
      isOpen: true,
      type,
      defaultAccountId: accountId,
    });
  };

  const handleOpenPrintPreview = (
    title: string,
    accountName: string,
    txs: Transaction[],
    balance: number,
    isSupplier: boolean = false
  ) => {
    setPrintModalState({
      isOpen: true,
      title,
      accountName,
      transactions: txs,
      currentBalance: balance,
      isSupplier,
    });
  };

  const handleOpenExcelPreview = (
    title: string,
    headers: string[],
    rows: (string | number)[][],
    options?: {
      subtitle?: string;
      filename?: string;
      summaryStats?: { label: string; value: string | number }[];
    }
  ) => {
    setExcelModalState({
      isOpen: true,
      title,
      headers,
      rows,
      subtitle: options?.subtitle,
      filename: options?.filename,
      summaryStats: options?.summaryStats,
    });
  };

  // If book is closed, render 3D Book Cover
  if (!isBookOpen) {
    return (
      <>
        <BookCover
          settings={settings}
          onLogin={(u, p) => handleLogin(u, p, 'book')}
          onOpenMobileMode={(u, p) => handleLogin(u || '', p || '', 'mobile')}
          onOpenInstaller={() => setIsInstallerOpen(true)}
          onOpenPhpSource={() => setIsPhpSourceOpen(true)}
          onUpdateSettings={(newS) => {
            const upd = storage.updateSettings(newS);
            setSettings(upd);
          }}
          isOpening={isOpeningAnim}
        />

        <InstallerModal
          isOpen={isInstallerOpen}
          onClose={() => setIsInstallerOpen(false)}
          onInstalledSuccess={() => {
            refreshAllData();
            setIsBookOpen(true);
          }}
        />

        <PhpSourceModal
          isOpen={isPhpSourceOpen}
          onClose={() => setIsPhpSourceOpen(false)}
        />
      </>
    );
  }

  // If in Mobile App mode for Store Owner (Admin)
  if (appMode === 'mobile') {
    return (
      <AdminMobileApp
        currentUser={currentUser}
        settings={settings}
        customers={customers}
        suppliers={suppliers}
        transactions={transactions}
        onRecordTransaction={(params) => {
          storage.recordTransaction(params);
          refreshAllData();
        }}
        onSwitchToBookView={() => toggleAppMode('book')}
        onLogout={handleCloseBook}
        onRefreshData={refreshAllData}
      />
    );
  }

  // Dashboard Stats
  const stats = storage.getDashboardStats();

  // Tabs sequence for physical page flipping navigation filtered by user permissions
  const TABS_SEQUENCE: ActiveTab[] = [
    'dashboard',
    'sales_payments',
    'purchases_payments',
    'customers',
    'suppliers',
    'journal',
    'reports',
    'api_sync',
    'audit_backup',
    'settings',
  ];

  const availableTabsSequence = TABS_SEQUENCE.filter(
    (tab) => tab !== 'api_sync' && canUserAccessTab(tab, currentUser)
  );

  const handleNavigateNext = () => {
    if (activeCustomerForLedger || activeSupplierForLedger) {
      setActiveCustomerForLedger(null);
      setActiveSupplierForLedger(null);
      return;
    }
    const currIdx = availableTabsSequence.indexOf(activeTab);
    if (currIdx < availableTabsSequence.length - 1) {
      setActiveTab(availableTabsSequence[currIdx + 1]);
    }
  };

  const handleNavigatePrev = () => {
    if (activeCustomerForLedger || activeSupplierForLedger) {
      setActiveCustomerForLedger(null);
      setActiveSupplierForLedger(null);
      return;
    }
    const currIdx = availableTabsSequence.indexOf(activeTab);
    if (currIdx > 0) {
      setActiveTab(availableTabsSequence[currIdx - 1]);
    }
  };

  const currentNavigationKey = activeCustomerForLedger
    ? `customer-ledger-${activeCustomerForLedger.id}`
    : activeSupplierForLedger
    ? `supplier-ledger-${activeSupplierForLedger.id}`
    : activeTab;

  return (
    <>
      <div className={printModalState.isOpen || excelModalState.isOpen ? 'print:hidden' : ''}>
        <OpenBookLayout
      currentUser={currentUser}
      users={storage.getUsers()}
      onSwitchUser={(user) => {
        storage.switchUser(user.id);
        setCurrentUser(user);
        refreshAllData();
      }}
      settings={settings}
      activeTab={activeTab}
      pageKey={currentNavigationKey}
      onSelectTab={(tab) => {
        setActiveTab(tab);
        setActiveCustomerForLedger(null);
        setActiveSupplierForLedger(null);
      }}
      onNavigateNext={handleNavigateNext}
      onNavigatePrev={handleNavigatePrev}
      onOpenNewTransaction={(type) => handleOpenTransactionModal(type || 'sale')}
      onCloseBook={handleCloseBook}
      onOpenPhpSource={() => setIsPhpSourceOpen(true)}
      onToggleMobileMode={() => toggleAppMode('mobile')}
      searchQuery={searchQuery}
      onSearchChange={setSearchQuery}
    >
      {/* VIEW 1: Individual Customer Ledger */}
      {activeCustomerForLedger ? (
        <CustomerLedger
          customer={activeCustomerForLedger}
          transactions={storage.getTransactionsForAccount(activeCustomerForLedger.id)}
          settings={settings}
          onBack={() => setActiveCustomerForLedger(null)}
          onOpenTransactionModal={(type, cid) => handleOpenTransactionModal(type, cid)}
          onPrintPreview={handleOpenPrintPreview}
          onOpenExcelPreview={handleOpenExcelPreview}
        />
      ) : activeSupplierForLedger ? (
        /* VIEW 2: Individual Supplier Ledger */
        <SupplierLedger
          supplier={activeSupplierForLedger}
          transactions={storage.getTransactionsForAccount(activeSupplierForLedger.id)}
          settings={settings}
          onBack={() => setActiveSupplierForLedger(null)}
          onOpenTransactionModal={(type, sid) => handleOpenTransactionModal(type, sid)}
          onPrintPreview={handleOpenPrintPreview}
          onOpenExcelPreview={handleOpenExcelPreview}
        />
      ) : activeTab === 'dashboard' ? (
        /* VIEW 3: Dashboard */
        <Dashboard
          currentUser={currentUser}
          settings={settings}
          customers={customers}
          suppliers={suppliers}
          transactions={transactions}
          stats={stats}
          onOpenTransactionModal={(type, accId) => handleOpenTransactionModal(type, accId)}
          onOpenCustomerLedger={(c) => setActiveCustomerForLedger(c)}
          onOpenSupplierLedger={(s) => setActiveSupplierForLedger(s)}
          onNavigateTab={(tab) => setActiveTab(tab)}
        />
      ) : activeTab === 'sales_payments' ? (
        /* VIEW 4: Sales and Payments Book */
        <SalesAndPaymentsBook
          settings={settings}
          customers={customers}
          transactions={transactions}
          onSaveTransaction={handleSaveTransaction}
          onUpdateTransaction={handleUpdateTransaction}
          onDeleteTransaction={handleDeleteTransaction}
          onPrintPreview={handleOpenPrintPreview}
          onOpenExcelPreview={handleOpenExcelPreview}
        />
      ) : activeTab === 'purchases_payments' ? (
        /* VIEW 5: Purchases and Payments Book */
        <PurchasesAndPaymentsBook
          settings={settings}
          suppliers={suppliers}
          transactions={transactions}
          onSaveTransaction={handleSaveTransaction}
          onUpdateTransaction={handleUpdateTransaction}
          onDeleteTransaction={handleDeleteTransaction}
          onPrintPreview={handleOpenPrintPreview}
          onOpenExcelPreview={handleOpenExcelPreview}
        />
      ) : activeTab === 'customers' ? (
        /* VIEW 4: Customers List */
        <CustomersView
          settings={settings}
          customers={customers}
          transactions={transactions}
          onOpenLedger={(c) => setActiveCustomerForLedger(c)}
          onAddCustomer={handleAddCustomer}
          onUpdateCustomer={handleUpdateCustomer}
          onDeleteCustomer={handleDeleteCustomer}
          onPrintPreview={handleOpenPrintPreview}
          onOpenExcelPreview={handleOpenExcelPreview}
        />
      ) : activeTab === 'suppliers' ? (
        /* VIEW 5: Suppliers List */
        <SuppliersView
          settings={settings}
          suppliers={suppliers}
          transactions={transactions}
          onOpenLedger={(s) => setActiveSupplierForLedger(s)}
          onAddSupplier={handleAddSupplier}
          onUpdateSupplier={handleUpdateSupplier}
          onDeleteSupplier={handleDeleteSupplier}
          onPrintPreview={handleOpenPrintPreview}
          onOpenExcelPreview={handleOpenExcelPreview}
        />
      ) : activeTab === 'journal' ? (
        /* VIEW 6: General Journal */
        <GeneralJournal
          settings={settings}
          transactions={transactions}
          customers={customers}
          suppliers={suppliers}
          onOpenCustomerLedger={(c) => setActiveCustomerForLedger(c)}
          onOpenSupplierLedger={(s) => setActiveSupplierForLedger(s)}
          onPrintPreview={handleOpenPrintPreview}
          onOpenExcelPreview={handleOpenExcelPreview}
        />
      ) : activeTab === 'reports' ? (
        /* VIEW 7: Reports */
        <ReportsView
          settings={settings}
          customers={customers}
          suppliers={suppliers}
          transactions={transactions}
          onPrintPreview={handleOpenPrintPreview}
          onOpenCustomerLedger={(c) => setActiveCustomerForLedger(c)}
          onOpenExcelPreview={handleOpenExcelPreview}
        />
      ) : activeTab === 'api_sync' ? (
        /* VIEW 8: API & Desktop Sync Hub */
        <ApiSyncView
          settings={settings}
          customers={customers}
          suppliers={suppliers}
          transactions={transactions}
        />
      ) : activeTab === 'audit_backup' ? (
        /* VIEW 9: Audit Logs & Backups */
        <AuditBackupView
          settings={settings}
          auditLogs={auditLogs}
          backups={backups}
          onRefreshData={refreshAllData}
        />
      ) : activeTab === 'settings' ? (
        /* VIEW 10: Store Settings */
        <SettingsView
          settings={settings}
          users={storage.getUsers()}
          currentUser={currentUser || storage.getCurrentUser()}
          onUpdateSettings={(newS) => {
            const updated = storage.updateSettings(newS);
            setSettings(updated);
            refreshAllData();
          }}
          onAddUser={(user) => {
            storage.addUser(user);
            refreshAllData();
          }}
          onUpdateUser={(id, updates) => {
            storage.updateUser(id, updates);
            refreshAllData();
          }}
          onDeleteUser={(id) => {
            const res = storage.deleteUser(id);
            if (!res.success && res.message) {
              alert(res.message);
            }
            refreshAllData();
          }}
          onRefreshAllData={refreshAllData}
        />
      ) : null}

      {/* Modals rendered inside */}
      <TransactionModal
        isOpen={txModalState.isOpen}
        onClose={() => setTxModalState({ ...txModalState, isOpen: false })}
        type={txModalState.type}
        defaultAccountId={txModalState.defaultAccountId}
        customers={customers}
        suppliers={suppliers}
        settings={settings}
        nextDocNo={storage.getNextDocNumber(txModalState.type)}
        onSave={handleSaveTransaction}
      />

      </OpenBookLayout>
      </div>

      <InstallerModal
        isOpen={isInstallerOpen}
        onClose={() => setIsInstallerOpen(false)}
        onInstalledSuccess={() => {
          refreshAllData();
          setIsBookOpen(true);
        }}
      />

      <PhpSourceModal
        isOpen={isPhpSourceOpen}
        onClose={() => setIsPhpSourceOpen(false)}
      />

      <PrintReceiptModal
        isOpen={printModalState.isOpen}
        onClose={() => setPrintModalState({ ...printModalState, isOpen: false })}
        title={printModalState.title}
        accountName={printModalState.accountName}
        transactions={printModalState.transactions}
        currentBalance={printModalState.currentBalance}
        settings={settings}
        isSupplier={printModalState.isSupplier}
      />

      {/* Full Screen Excel Formatted Table Viewer Modal */}
      <ExcelViewerModal
        isOpen={excelModalState.isOpen}
        onClose={() => setExcelModalState((prev) => ({ ...prev, isOpen: false }))}
        title={excelModalState.title}
        subtitle={excelModalState.subtitle}
        filename={excelModalState.filename}
        headers={excelModalState.headers}
        rows={excelModalState.rows}
        summaryStats={excelModalState.summaryStats}
        storeName={settings.storeName}
        logoUrl={settings.logoUrl}
        currency={settings.currency}
      />
    </>
  );
}
