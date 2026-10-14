import { User, Role, UserPermissions } from '../types';
import { ActiveTab } from '../components/Header';

export const DEFAULT_ROLE_PERMISSIONS: Record<Role, UserPermissions> = {
  admin: {
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
  accountant: {
    canAccessDashboard: true,
    canAccessSales: true,
    canAccessPurchases: true,
    canAccessCustomers: true,
    canAccessSuppliers: true,
    canAccessJournal: true,
    canViewReports: true,
    canManageBackups: false,
    canEditSettings: false,
    canManageUsers: false,
    canDeleteRecords: false,
    canExportData: true,
  },
  user: {
    canAccessDashboard: true,
    canAccessSales: true,
    canAccessPurchases: false,
    canAccessCustomers: true,
    canAccessSuppliers: false,
    canAccessJournal: false,
    canViewReports: false,
    canManageBackups: false,
    canEditSettings: false,
    canManageUsers: false,
    canDeleteRecords: false,
    canExportData: false,
  },
};

/**
 * Checks whether a specific user is authorized to access and view a given tab screen.
 */
export const canUserAccessTab = (tabId: ActiveTab, user: User | null | undefined): boolean => {
  // If no user object is present, fallback to allow (or default guest)
  if (!user) return true;

  // Admin / Store Owner has unconditional full access to all screens
  if (user.role === 'admin') return true;

  const perms: UserPermissions = {
    ...(DEFAULT_ROLE_PERMISSIONS[user.role] || DEFAULT_ROLE_PERMISSIONS.user),
    ...(user.permissions || {}),
  };

  switch (tabId) {
    case 'dashboard':
      return perms.canAccessDashboard === true;

    case 'sales_payments':
      return perms.canAccessSales === true;

    case 'purchases_payments':
      return perms.canAccessPurchases === true;

    case 'customers':
      return perms.canAccessCustomers === true;

    case 'suppliers':
      return perms.canAccessSuppliers === true;

    case 'journal':
      return perms.canAccessJournal === true;

    case 'reports':
      return perms.canViewReports === true;

    case 'audit_backup':
      return perms.canManageBackups === true;

    case 'settings':
      return perms.canEditSettings === true || perms.canManageUsers === true;

    case 'api_sync':
      return false;

    default:
      return true;
  }
};
