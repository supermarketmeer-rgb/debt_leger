import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Store,
  Palette,
  Users,
  Shield,
  Save,
  CheckCircle2,
  DollarSign,
  Phone,
  MapPin,
  UserPlus,
  Key,
  Lock,
  Eye,
  EyeOff,
  Edit,
  Trash2,
  X,
  AlertCircle,
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  UserX,
  FileText,
  Clock,
  Upload,
  Image as ImageIcon,
  BookOpen,
  Cloud,
  RefreshCw,
  Layers,
  Copy,
  Check,
  Zap,
  Globe,
  Radio,
  ExternalLink,
  PlusCircle,
  Server,
  Sparkles
} from 'lucide-react';
import { StoreSettings, User, Role, UserPermissions, ClientLedger } from '../types';
import { DEFAULT_ROLE_PERMISSIONS } from '../utils/permissions';
import { storage } from '../services/storage';

interface SettingsViewProps {
  settings: StoreSettings;
  users: User[];
  currentUser?: User | null;
  onUpdateSettings: (newSettings: Partial<StoreSettings>) => void;
  onAddUser: (user: Omit<User, 'id' | 'createdAt'>) => void;
  onUpdateUser: (id: string, updates: Partial<User>) => void;
  onDeleteUser: (id: string) => void;
  onRefreshAllData?: () => void;
}

const PRESET_COLORS = [
  { name: 'عودي ملكي فاخر', color: '#581c1c' },
  { name: 'جلد بني كلاسيكي', color: '#45220c' },
  { name: 'أخضر زمردي عتيق', color: '#133522' },
  { name: 'كحلي دفتري أنيق', color: '#16253d' },
  { name: 'أسود أبنوسي', color: '#1e1e1e' },
];

const getDefaultPermissions = (role: Role): UserPermissions => {
  return { ...(DEFAULT_ROLE_PERMISSIONS[role] || DEFAULT_ROLE_PERMISSIONS.user) };
};

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  users,
  currentUser,
  onUpdateSettings,
  onAddUser,
  onUpdateUser,
  onDeleteUser,
  onRefreshAllData,
}) => {
  const [activeSection, setActiveSection] = useState<'general' | 'cloud' | 'ledgers' | 'users'>('general');

  // General Store Settings State
  const [storeName, setStoreName] = useState(settings.storeName);
  const [appName, setAppName] = useState(settings.appName);
  const [currency, setCurrency] = useState(settings.currency);
  const [phone, setPhone] = useState(settings.phone);
  const [address, setAddress] = useState(settings.address);
  const [coverColor, setCoverColor] = useState(settings.coverColor);
  const [logoUrl, setLogoUrl] = useState<string>(settings.logoUrl || '');
  const [logoError, setLogoError] = useState<string>('');
  const [allowCreditBalance, setAllowCreditBalance] = useState(settings.allowCreditBalance);
  const [overdueDaysThreshold, setOverdueDaysThreshold] = useState<number>(settings.overdueDaysThreshold || 30);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Cloud Sync State
  const [cloudServerUrl, setCloudServerUrl] = useState(settings.cloudServerUrl || '');
  const [cloudSyncToken, setCloudSyncToken] = useState(settings.cloudSyncToken || '');
  const [autoCloudSync, setAutoCloudSync] = useState(settings.autoCloudSync !== false);
  const [tenantId, setTenantId] = useState(settings.tenantId || 'tenant-01');
  const [showToken, setShowToken] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string; latency?: number } | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const [isSyncingNow, setIsSyncingNow] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);
  const [cloudSavedSuccess, setCloudSavedSuccess] = useState(false);

  // Client Ledgers Platform State
  const [ledgers, setLedgers] = useState<ClientLedger[]>(storage.getClientLedgers());
  const [isCreatingLedger, setIsCreatingLedger] = useState(false);
  const [newLedgerName, setNewLedgerName] = useState('');
  const [newLedgerCode, setNewLedgerCode] = useState('');
  const [newLedgerCurrency, setNewLedgerCurrency] = useState('د.ع');
  const [newLedgerPhone, setNewLedgerPhone] = useState('');
  const [newLedgerOwner, setNewLedgerOwner] = useState('');
  const [newLedgerNotes, setNewLedgerNotes] = useState('');
  const [newLedgerColor, setNewLedgerColor] = useState('#581c1c');
  const [ledgerActionMessage, setLedgerActionMessage] = useState<string | null>(null);

  // Sync internal state with external settings prop changes
  useEffect(() => {
    setStoreName(settings.storeName || '');
    setAppName(settings.appName || '');
    setCurrency(settings.currency || 'د.ع');
    setPhone(settings.phone || '');
    setAddress(settings.address || '');
    setCoverColor(settings.coverColor || '#581c1c');
    setLogoUrl(settings.logoUrl || '');
    setAllowCreditBalance(settings.allowCreditBalance ?? true);
    setOverdueDaysThreshold(settings.overdueDaysThreshold || 30);
    setCloudServerUrl(settings.cloudServerUrl || '');
    setCloudSyncToken(settings.cloudSyncToken || '');
    setAutoCloudSync(settings.autoCloudSync !== false);
    setTenantId(settings.tenantId || 'tenant-01');
    setLedgers(storage.getClientLedgers());
  }, [settings]);

  // Handle Logo Upload via FileReader
  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLogoError('');

    if (!file.type.startsWith('image/')) {
      setLogoError('يرجى اختيار ملف صورة صالح (PNG, JPG, WebP, SVG)');
      return;
    }

    if (file.size > 2.5 * 1024 * 1024) {
      setLogoError('حجم الصورة كبير جداً، يرجى اختيار صورة أقل من 2.5 ميجابايت');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setLogoUrl(result);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveLogo = () => {
    setLogoUrl('');
    setLogoError('');
  };

  // New User State
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newFullName, setNewFullName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<Role>('user');
  const [newPermissions, setNewPermissions] = useState<UserPermissions>(getDefaultPermissions('user'));
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [addError, setAddError] = useState('');

  // Edit User State
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editUsername, setEditUsername] = useState('');
  const [editFullName, setEditFullName] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState<Role>('user');
  const [editIsActive, setEditIsActive] = useState<boolean>(true);
  const [editPermissions, setEditPermissions] = useState<UserPermissions>(getDefaultPermissions('user'));
  const [showEditPassword, setShowEditPassword] = useState(false);
  const [editError, setEditError] = useState('');
  const [userActionSuccess, setUserActionSuccess] = useState('');

  // Check if current user is admin / store owner
  const isCurrentAdmin = currentUser?.role === 'admin' || !currentUser;

  // Handle General Settings Save
  const handleSaveGeneral = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      storeName: storeName.trim(),
      appName: appName.trim(),
      currency: currency.trim(),
      phone: phone.trim(),
      address: address.trim(),
      coverColor,
      allowCreditBalance,
      overdueDaysThreshold: Number(overdueDaysThreshold) || 30,
      logoUrl: logoUrl,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 4000);
  };

  // Handle Cloud Settings Save
  const handleSaveCloudSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      cloudServerUrl: cloudServerUrl.trim(),
      cloudSyncToken: cloudSyncToken.trim(),
      autoCloudSync,
      tenantId: tenantId.trim() || 'tenant-01',
    });
    setCloudSavedSuccess(true);
    setTimeout(() => setCloudSavedSuccess(false), 4000);
  };

  // Test Cloud Connection
  const handleTestConnection = async () => {
    if (!cloudServerUrl.trim()) {
      setTestResult({ success: false, message: 'يرجى إدخال رابط السيرفر السحابي أولاً' });
      return;
    }
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await storage.testCloudConnection(cloudServerUrl, cloudSyncToken, tenantId);
      setTestResult(res);
    } catch (e: any) {
      setTestResult({ success: false, message: e.message || 'فشل الاتصال بالسيرفر' });
    } finally {
      setIsTesting(false);
    }
  };

  // Manual Trigger for Full Sync
  const handleManualSync = async () => {
    setIsSyncingNow(true);
    setSyncFeedback(null);
    try {
      const res = await storage.syncWithCloudNow();
      setSyncFeedback(res.message);
      if (onRefreshAllData) onRefreshAllData();
    } catch (e: any) {
      setSyncFeedback('فشل في المزامنة: ' + e.message);
    } finally {
      setIsSyncingNow(false);
      setTimeout(() => setSyncFeedback(null), 5000);
    }
  };

  // Generate secure random API Token
  const handleGenerateToken = () => {
    const randomChars = Array.from(crypto.getRandomValues(new Uint8Array(18)))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    const gen = `cld_sec_${randomChars}`;
    setCloudSyncToken(gen);
  };

  const handleCopyToken = () => {
    if (!cloudSyncToken) return;
    navigator.clipboard.writeText(cloudSyncToken);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  // Switch to another client ledger
  const handleSwitchLedger = (ledgerId: string) => {
    const res = storage.switchClientLedger(ledgerId);
    if (res.success) {
      setTenantId(ledgerId);
      setLedgers(storage.getClientLedgers());
      setLedgerActionMessage(res.message);
      setTimeout(() => setLedgerActionMessage(null), 3500);
      if (onRefreshAllData) onRefreshAllData();
    }
  };

  // Create new client ledger
  const handleCreateNewLedger = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLedgerName.trim()) return;

    const newLedger = storage.createClientLedger({
      name: newLedgerName.trim(),
      code: newLedgerCode.trim(),
      currency: newLedgerCurrency.trim(),
      phone: newLedgerPhone.trim(),
      ownerName: newLedgerOwner.trim(),
      notes: newLedgerNotes.trim(),
      coverColor: newLedgerColor,
      autoSwitch: true,
    });

    setLedgers(storage.getClientLedgers());
    setTenantId(newLedger.id);
    setIsCreatingLedger(false);
    setNewLedgerName('');
    setNewLedgerCode('');
    setNewLedgerPhone('');
    setNewLedgerOwner('');
    setNewLedgerNotes('');
    setLedgerActionMessage(`تم إنشاء سجل الكلاينت الجديد (${newLedger.name}) وفتحه كدفتر نشط!`);
    setTimeout(() => setLedgerActionMessage(null), 4000);
    if (onRefreshAllData) onRefreshAllData();
  };

  // Delete client ledger
  const handleDeleteLedger = (ledger: ClientLedger) => {
    if (confirm(`هل أنت متأكد من حذف سجل العميل "${ledger.name}" نهائياً من المنصة؟`)) {
      const res = storage.deleteClientLedger(ledger.id);
      if (res.success) {
        setLedgers(storage.getClientLedgers());
        setLedgerActionMessage(res.message);
        setTimeout(() => setLedgerActionMessage(null), 3500);
        if (onRefreshAllData) onRefreshAllData();
      } else {
        alert(res.message);
      }
    }
  };

  // Open Edit User Modal / Drawer
  const handleStartEdit = (user: User) => {
    setEditingUserId(user.id);
    setEditUsername(user.username);
    setEditFullName(user.fullName);
    setEditPassword(user.password || '');
    setEditRole(user.role);
    setEditIsActive(user.isActive);
    setEditPermissions(user.permissions || getDefaultPermissions(user.role));
    setShowEditPassword(false);
    setEditError('');
  };

  // Close Edit User Modal
  const handleCancelEdit = () => {
    setEditingUserId(null);
    setEditError('');
  };

  // Save User Edits (Username, Password, Role, Permissions)
  const handleSaveUserEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUserId) return;

    const trimmedUsername = editUsername.trim();
    const trimmedFullName = editFullName.trim();
    const trimmedPassword = editPassword.trim();

    if (!trimmedUsername) {
      setEditError('اسم المستخدم مطلوب ولا يمكن أن يكون فارغاً');
      return;
    }
    if (!trimmedFullName) {
      setEditError('الاسم الكامل مطلوب');
      return;
    }

    // Check if username is already taken by another user
    const usernameConflict = users.find(
      (u) => u.id !== editingUserId && u.username.toLowerCase() === trimmedUsername.toLowerCase()
    );
    if (usernameConflict) {
      setEditError(`اسم المستخدم (@${trimmedUsername}) مستخدم بالفعل لحساب آخر`);
      return;
    }

    // Protection: Prevent demoting the only admin
    if (editRole !== 'admin') {
      const targetUser = users.find((u) => u.id === editingUserId);
      const adminCount = users.filter((u) => u.role === 'admin' && u.isActive).length;
      if (targetUser?.role === 'admin' && adminCount <= 1) {
        setEditError('لا يمكن إزالة صلاحية المدير عن المسؤول الوحيد في النظام');
        return;
      }
    }

    onUpdateUser(editingUserId, {
      username: trimmedUsername,
      fullName: trimmedFullName,
      password: trimmedPassword || undefined,
      role: editRole,
      isActive: editIsActive,
      permissions: editPermissions,
    });

    setEditingUserId(null);
    setUserActionSuccess(`تم تحديث بيانات وصلاحيات المستخدم (${trimmedFullName}) بنجاح`);
    setTimeout(() => setUserActionSuccess(''), 3500);
  };

  // Create New User
  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUsername = newUsername.trim();
    const trimmedFullName = newFullName.trim();
    const trimmedPassword = newPassword.trim();

    if (!trimmedUsername || !trimmedFullName) {
      setAddError('يرجى ملء اسم المستخدم والاسم الكامل');
      return;
    }

    // Check duplicate username
    const exists = users.find((u) => u.username.toLowerCase() === trimmedUsername.toLowerCase());
    if (exists) {
      setAddError(`اسم المستخدم (@${trimmedUsername}) محجوز بالفعل`);
      return;
    }

    onAddUser({
      username: trimmedUsername,
      fullName: trimmedFullName,
      password: trimmedPassword || '123456',
      role: newRole,
      isActive: true,
      permissions: newPermissions,
    });

    setNewUsername('');
    setNewFullName('');
    setNewPassword('');
    setIsAddingUser(false);
    setAddError('');
    setUserActionSuccess(`تمت إضافة المستخدم الجديد (${trimmedFullName}) بنجاح`);
    setTimeout(() => setUserActionSuccess(''), 3500);
  };

  // Delete User with confirmation
  const handleDeleteUser = (user: User) => {
    if (currentUser && currentUser.id === user.id) {
      alert('لا يمكنك حذف حسابك الشخصي المسجل به حالياً');
      return;
    }
    const adminCount = users.filter((u) => u.role === 'admin' && u.isActive).length;
    if (user.role === 'admin' && adminCount <= 1) {
      alert('لا يمكن حذف المسؤول الوحيد للنظام');
      return;
    }
    if (confirm(`هل أنت متأكد من حذف المستخدم "${user.fullName}" (@${user.username}) نهائياً؟`)) {
      onDeleteUser(user.id);
      setUserActionSuccess(`تم حذف المستخدم (${user.fullName})`);
      setTimeout(() => setUserActionSuccess(''), 3500);
    }
  };

  // Helper for role switch in Add form
  const handleRoleChangeForNew = (r: Role) => {
    setNewRole(r);
    setNewPermissions(getDefaultPermissions(r));
  };

  // Helper for role switch in Edit form
  const handleRoleChangeForEdit = (r: Role) => {
    setEditRole(r);
    setEditPermissions(getDefaultPermissions(r));
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border-2 border-stone-300 p-4 rounded-xl shadow-xs text-stone-950">
        <div>
          <div className="flex items-center gap-2">
            <Sliders size={22} className="text-amber-800" />
            <h1 className="text-xl font-black text-stone-950 font-amiri">
              إعدادات المتجر وإدارة الصلاحيات
            </h1>
          </div>
          <p className="text-xs text-stone-900 font-bold mt-0.5">
            تخصيص هوية الدفتر، العملة، إدارة حسابات المستخدمين، كلمات المرور، وتعيين الصلاحيات
          </p>
        </div>

        {/* Section Tabs Switcher */}
        <div className="flex flex-wrap items-center gap-1.5 bg-stone-100 p-1.5 rounded-xl border border-stone-300 text-xs">
          <button
            onClick={() => setActiveSection('general')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all font-black cursor-pointer ${
              activeSection === 'general'
                ? 'bg-amber-600 text-stone-950 shadow-xs'
                : 'text-stone-700 hover:text-stone-950'
            }`}
          >
            <Store size={15} />
            <span>بيانات وهوية المتجر</span>
          </button>

          <button
            onClick={() => setActiveSection('cloud')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all font-black cursor-pointer ${
              activeSection === 'cloud'
                ? 'bg-amber-600 text-stone-950 shadow-xs'
                : 'text-stone-700 hover:text-stone-950'
            }`}
          >
            <Cloud size={15} />
            <span>الربط والمزامنة السحابية</span>
            {settings.cloudServerUrl && (
              <span className={`w-2 h-2 rounded-full ${settings.cloudSyncStatus === 'synced' ? 'bg-emerald-600' : settings.cloudSyncStatus === 'syncing' ? 'bg-blue-600 animate-ping' : settings.cloudSyncStatus === 'error' ? 'bg-red-600' : 'bg-stone-400'}`} />
            )}
          </button>

          <button
            onClick={() => setActiveSection('ledgers')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all font-black cursor-pointer ${
              activeSection === 'ledgers'
                ? 'bg-amber-600 text-stone-950 shadow-xs'
                : 'text-stone-700 hover:text-stone-950'
            }`}
          >
            <Layers size={15} />
            <span>منصة سجلات الكلاينت</span>
            <span className="bg-stone-900 text-amber-300 px-1.5 py-0.2 rounded-full font-mono text-[10px]">
              {ledgers.length}
            </span>
          </button>

          <button
            onClick={() => setActiveSection('users')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg transition-all font-black cursor-pointer ${
              activeSection === 'users'
                ? 'bg-amber-600 text-stone-950 shadow-xs'
                : 'text-stone-700 hover:text-stone-950'
            }`}
          >
            <Users size={15} />
            <span>المستخدمون والصلاحيات</span>
            <span className="bg-stone-900 text-amber-300 px-1.5 py-0.2 rounded-full font-mono text-[10px]">
              {users.length}
            </span>
          </button>
        </div>
      </div>

      {/* Global Success / Alert Feedback */}
      {savedSuccess && (
        <div className="p-3 rounded-xl bg-emerald-100 border-2 border-emerald-500 text-emerald-950 text-xs font-black flex items-center gap-2 shadow-xs">
          <CheckCircle2 size={18} className="text-emerald-700 shrink-0" />
          <span>تم حفظ إعدادات المتجر وهوية الدفتر بنجاح.</span>
        </div>
      )}

      {cloudSavedSuccess && (
        <div className="p-3 rounded-xl bg-emerald-100 border-2 border-emerald-500 text-emerald-950 text-xs font-black flex items-center gap-2 shadow-xs animate-fade-in">
          <CheckCircle2 size={18} className="text-emerald-700 shrink-0" />
          <span>تم حفظ إعدادات وتوكن السيرفر السحابي وتفعيل المزامنة التلقائية اللحظية بنجاح.</span>
        </div>
      )}

      {ledgerActionMessage && (
        <div className="p-3 rounded-xl bg-blue-100 border-2 border-blue-500 text-blue-950 text-xs font-black flex items-center gap-2 shadow-xs animate-fade-in">
          <Layers size={18} className="text-blue-700 shrink-0" />
          <span>{ledgerActionMessage}</span>
        </div>
      )}

      {userActionSuccess && (
        <div className="p-3 rounded-xl bg-emerald-100 border-2 border-emerald-500 text-emerald-950 text-xs font-black flex items-center gap-2 shadow-xs animate-fade-in">
          <CheckCircle2 size={18} className="text-emerald-700 shrink-0" />
          <span>{userActionSuccess}</span>
        </div>
      )}

      {/* SECTION 1: GENERAL STORE SETTINGS */}
      {activeSection === 'general' && (
        <div className="bg-white border-2 border-stone-300 rounded-xl p-5 space-y-5 text-stone-950 shadow-sm">
          <h2 className="text-base font-black text-stone-950 border-b-2 border-stone-200 pb-2 flex items-center gap-2">
            <Store size={18} className="text-amber-800" />
            <span>بيانات المتجر والخيارات المحاسبية والهوية البصرية</span>
          </h2>

          <form onSubmit={handleSaveGeneral} className="space-y-4 text-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-stone-950 block mb-1 font-black">اسم المتجر أو المؤسسة *</label>
                <input
                  type="text"
                  value={storeName}
                  onChange={(e) => setStoreName(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border-2 border-stone-300 rounded-lg text-stone-950 font-bold focus:bg-white focus:outline-none focus:border-amber-600"
                  required
                />
              </div>

              <div>
                <label className="text-stone-950 block mb-1 font-black">اسم التطبيق / العنوان بالدفتر *</label>
                <input
                  type="text"
                  value={appName}
                  onChange={(e) => setAppName(e.target.value)}
                  className="w-full px-3 py-2 bg-stone-50 border-2 border-stone-300 rounded-lg text-stone-950 font-bold focus:bg-white focus:outline-none focus:border-amber-600"
                  required
                />
              </div>
            </div>

            {/* Store Logo Upload & Visual Identity Card */}
            <div className="p-4 bg-gradient-to-br from-amber-50/60 via-stone-50 to-amber-100/30 border-2 border-amber-300 rounded-xl space-y-3 shadow-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                  <span className="font-black text-stone-950 text-sm flex items-center gap-2">
                    <ImageIcon size={18} className="text-amber-800" />
                    <span>شعار المتجر الرسمي (Store Logo)</span>
                  </span>
                  <p className="text-[11px] text-stone-700 font-medium mt-0.5">
                    ارفع صورة شعار متجرك ليعتمد ويظهر بدلاً من الأيقونة الافتراضية عبر كافة الشاشات (غلاف الدفتر، الترويسة، الإيصالات، وتطبيق الجوال).
                  </p>
                </div>

                {logoUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveLogo}
                    className="self-start sm:self-auto flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-red-100 hover:bg-red-200 text-red-800 border border-red-300 text-xs font-bold transition-colors cursor-pointer"
                    title="حذف الشعار واستعادة الشعار الافتراضي"
                  >
                    <Trash2 size={13} />
                    <span>حذف الشعار واستعادة الافتراضي</span>
                  </button>
                )}
              </div>

              <div className="flex flex-col sm:flex-row items-center gap-4 pt-1">
                {/* Logo Preview Frame */}
                <div className="relative group shrink-0">
                  <div className="w-24 h-24 rounded-2xl bg-white border-2 border-dashed border-stone-400 shadow-md flex items-center justify-center p-2 overflow-hidden transition-all group-hover:border-amber-600">
                    {logoUrl ? (
                      <img
                        src={logoUrl}
                        alt="شعار المتجر"
                        className="w-full h-full object-contain rounded-xl"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-stone-400">
                        <BookOpen size={30} className="text-amber-700/60 mb-1" />
                        <span className="text-[10px] font-bold text-stone-500 text-center leading-tight">الافتراضي</span>
                      </div>
                    )}
                  </div>
                  {logoUrl && (
                    <span className="absolute -top-2 -right-2 bg-emerald-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-full shadow-xs">
                      مُخصص ✓
                    </span>
                  )}
                </div>

                {/* Upload Action and Live Context Previews */}
                <div className="flex-1 w-full space-y-2.5">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <label className="flex items-center gap-2 px-4 py-2 bg-amber-800 hover:bg-amber-700 text-white rounded-xl font-black text-xs shadow-xs transition-colors cursor-pointer active:scale-95">
                      <Upload size={15} />
                      <span>{logoUrl ? 'تغيير صورة الشعار' : 'رفع صورة الشعار الآن'}</span>
                      <input
                        type="file"
                        accept="image/png,image/jpeg,image/webp,image/svg+xml"
                        onChange={handleLogoFileChange}
                        className="hidden"
                      />
                    </label>
                    <span className="text-[11px] text-stone-600 font-semibold">
                      الصيغ: PNG, JPG, WebP, SVG (حجم أقصى 2.5MB)
                    </span>
                  </div>

                  {logoError && (
                    <p className="text-xs text-red-600 font-bold flex items-center gap-1 bg-red-50 p-1.5 rounded border border-red-200">
                      <AlertCircle size={14} className="shrink-0" />
                      <span>{logoError}</span>
                    </p>
                  )}

                  {/* Contextual mini badges */}
                  <div className="p-2 bg-white/80 rounded-lg border border-stone-300 flex flex-wrap items-center gap-3 text-[11px] text-stone-700 font-semibold">
                    <span className="font-black text-stone-900">معاينة الشاشات:</span>
                    <div className="flex items-center gap-1">
                      <div className="w-5 h-5 rounded-full bg-amber-950 flex items-center justify-center overflow-hidden border border-amber-400">
                        {logoUrl ? <img src={logoUrl} className="w-full h-full object-cover" /> : <BookOpen size={10} className="text-amber-300" />}
                      </div>
                      <span>غلاف الدفتر</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-5 h-5 rounded bg-stone-900 flex items-center justify-center overflow-hidden border border-stone-600">
                        {logoUrl ? <img src={logoUrl} className="w-full h-full object-cover" /> : <BookOpen size={10} className="text-amber-300" />}
                      </div>
                      <span>الترويسة واليومية</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-5 h-5 rounded bg-white flex items-center justify-center overflow-hidden border border-stone-300">
                        {logoUrl ? <img src={logoUrl} className="w-full h-full object-contain" /> : <Store size={10} className="text-stone-700" />}
                      </div>
                      <span>وصولات الطباعة</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-stone-950 block mb-1 font-black">رمز العملة المعتمدة *</label>
                <input
                  type="text"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  placeholder="د.ع أو ر.س أو $"
                  className="w-full px-3 py-2 bg-stone-50 border-2 border-stone-300 rounded-lg text-stone-950 font-mono font-black focus:bg-white focus:outline-none focus:border-amber-600"
                  required
                />
              </div>

              <div>
                <label className="text-stone-950 block mb-1 font-black">رقم الهاتف الرسمي</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="0770XXXXXXX"
                  className="w-full px-3 py-2 bg-stone-50 border-2 border-stone-300 rounded-lg text-stone-950 font-bold focus:bg-white focus:outline-none focus:border-amber-600 text-left"
                  dir="ltr"
                />
              </div>

              <div>
                <label className="text-stone-950 block mb-1 font-black">العنوان الرئيسي للمتجر</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="المدينة - الشارع"
                  className="w-full px-3 py-2 bg-stone-50 border-2 border-stone-300 rounded-lg text-stone-950 font-bold focus:bg-white focus:outline-none focus:border-amber-600"
                />
              </div>
            </div>

            {/* Book Cover Color Customization */}
            <div className="p-4 bg-stone-50 border-2 border-stone-300 rounded-xl space-y-2.5">
              <span className="text-stone-950 font-black block flex items-center gap-1.5">
                <Palette size={16} className="text-amber-800" />
                <span>لون تجليد غلاف الدفتر (3D Leather Cover)</span>
              </span>
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {PRESET_COLORS.map((c) => (
                  <button
                    key={c.color}
                    type="button"
                    onClick={() => setCoverColor(c.color)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-bold transition-all cursor-pointer ${
                      coverColor === c.color
                        ? 'border-amber-600 bg-amber-100 text-stone-950 ring-2 ring-amber-500 shadow-xs'
                        : 'border-stone-300 bg-white text-stone-950 hover:bg-stone-100'
                    }`}
                  >
                    <span
                      className="w-4 h-4 rounded-full border border-stone-400 shadow-xs"
                      style={{ backgroundColor: c.color }}
                    />
                    <span>{c.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Accounting Policies */}
            <div className="p-4 bg-stone-50 border-2 border-stone-300 rounded-xl flex items-center justify-between text-stone-950">
              <div>
                <span className="font-black text-stone-950 block text-xs sm:text-sm">
                  السماح بالأرصدة الدائنة للزبائن
                </span>
                <span className="text-[11px] text-stone-700 font-bold">
                  إذا كان التسديد أكبر من الدين، يتم قبول تسجيل الفائض كرصيد لصالح الزبون
                </span>
              </div>
              <input
                type="checkbox"
                checked={allowCreditBalance}
                onChange={(e) => setAllowCreditBalance(e.target.checked)}
                className="w-5 h-5 accent-amber-600 cursor-pointer"
              />
            </div>

            {/* Overdue threshold */}
            <div className="p-4 bg-stone-50 border-2 border-stone-300 rounded-xl flex items-center justify-between text-stone-950">
              <div>
                <span className="font-black text-stone-950 block text-xs sm:text-sm flex items-center gap-1.5">
                  <Clock size={15} className="text-amber-800" />
                  <span>حد أيام التأخير للزبائن المدينين (بالأيام)</span>
                </span>
                <span className="text-[11px] text-stone-700 font-bold">
                  تحديد عدد الأيام المسموح بها قبل اعتبار الزبون متأخراً في تقارير الديون
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={overdueDaysThreshold}
                  onChange={(e) => setOverdueDaysThreshold(parseInt(e.target.value) || 30)}
                  className="w-20 px-3 py-1.5 bg-white border-2 border-stone-300 rounded-lg text-stone-950 font-bold font-mono text-center focus:border-amber-600 focus:outline-none"
                />
                <span className="text-xs font-bold text-stone-600">يوماً</span>
              </div>
            </div>

            <div className="pt-2 flex flex-wrap items-center gap-3">
              <button
                type="submit"
                className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-stone-950 font-black text-xs rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
              >
                <Save size={16} />
                <span>حفظ إعدادات المتجر</span>
              </button>

              {savedSuccess && (
                <div className="flex items-center gap-2 text-xs text-emerald-950 font-black bg-emerald-100 border-2 border-emerald-500 py-2 px-3.5 rounded-lg shadow-xs animate-fade-in">
                  <CheckCircle2 size={16} className="text-emerald-700" />
                  <span>تم حفظ الإعدادات وتحديث قاعدة بيانات XAMPP بنجاح</span>
                </div>
              )}
            </div>
          </form>
        </div>
      )}

      {/* SECTION 2: CLOUD SERVER INTEGRATION & REAL-TIME AUTO-SYNC */}
      {activeSection === 'cloud' && (
        <div className="space-y-6">
          {/* Cloud Status Banner */}
          <div className="bg-white border-2 border-stone-300 rounded-xl p-5 space-y-4 text-stone-950 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-stone-200 pb-3">
              <div className="flex items-center gap-2.5">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold shadow-xs ${
                  settings.cloudSyncStatus === 'synced'
                    ? 'bg-emerald-700'
                    : settings.cloudSyncStatus === 'syncing'
                    ? 'bg-blue-700'
                    : settings.cloudSyncStatus === 'error'
                    ? 'bg-red-700'
                    : 'bg-stone-700'
                }`}>
                  <Cloud size={22} className={settings.cloudSyncStatus === 'syncing' ? 'animate-bounce' : ''} />
                </div>
                <div>
                  <h2 className="text-base font-black text-stone-950 font-amiri flex items-center gap-2">
                    <span>حالة المزامنة السحابية اللحظية (Cloud Real-Time Sync)</span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                      settings.cloudSyncStatus === 'synced'
                        ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        : settings.cloudSyncStatus === 'syncing'
                        ? 'bg-blue-100 text-blue-900 border border-blue-300'
                        : settings.cloudSyncStatus === 'error'
                        ? 'bg-red-100 text-red-900 border border-red-300'
                        : 'bg-stone-200 text-stone-800'
                    }`}>
                      {settings.cloudSyncStatus === 'synced'
                        ? '✓ متصل ومتزامن سحابياً'
                        : settings.cloudSyncStatus === 'syncing'
                        ? '⏳ جاري المزامنة...'
                        : settings.cloudSyncStatus === 'error'
                        ? '⚠️ خطأ في الاتصال'
                        : 'وضع محلي (Offline)'}
                    </span>
                  </h2>
                  <p className="text-xs text-stone-800 font-bold mt-0.5">
                    مزامنة تلقائية في الخلفية عند كل عملية إضافة، تعديل، أو حذف، دون التأثير على سرعة العمل.
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTesting}
                  className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 border border-stone-300 text-stone-950 rounded-lg text-xs font-black flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw size={14} className={isTesting ? 'animate-spin text-amber-800' : 'text-stone-700'} />
                  <span>{isTesting ? 'جاري الفحص...' : 'فحص الاتصال (Ping)'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleManualSync}
                  disabled={isSyncingNow}
                  className="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-black flex items-center gap-1.5 transition-all shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <Zap size={14} className={isSyncingNow ? 'animate-spin' : ''} />
                  <span>{isSyncingNow ? 'جاري الرفع...' : 'مزامنة كاملة الآن'}</span>
                </button>
              </div>
            </div>

            {/* Test result display */}
            {testResult && (
              <div className={`p-3 rounded-lg border text-xs font-black flex items-center gap-2 ${
                testResult.success
                  ? 'bg-emerald-50 border-emerald-400 text-emerald-950'
                  : 'bg-red-50 border-red-400 text-red-950'
              }`}>
                {testResult.success ? <CheckCircle2 size={16} className="text-emerald-700 shrink-0" /> : <AlertCircle size={16} className="text-red-700 shrink-0" />}
                <span>{testResult.message}</span>
              </div>
            )}

            {syncFeedback && (
              <div className="p-3 rounded-lg border bg-blue-50 border-blue-400 text-blue-950 text-xs font-black flex items-center gap-2">
                <CheckCircle2 size={16} className="text-blue-700 shrink-0" />
                <span>{syncFeedback}</span>
              </div>
            )}

            {settings.cloudSyncError && (
              <div className="p-3 rounded-lg border bg-red-50 border-red-400 text-red-950 text-xs font-black flex items-center gap-2">
                <AlertCircle size={16} className="text-red-700 shrink-0" />
                <span>آخر خطأ مسجل: {settings.cloudSyncError}</span>
              </div>
            )}

            {/* Last sync info */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs">
              <div className="p-2.5 bg-stone-50 border border-stone-200 rounded-lg">
                <span className="text-[10px] text-stone-600 block font-bold">آخر مزامنة ناجحة:</span>
                <span className="font-mono font-bold text-stone-950 text-xs">
                  {settings.lastCloudSyncDate ? new Date(settings.lastCloudSyncDate).toLocaleString('ar-EG') : 'لم تتم بعد'}
                </span>
              </div>

              <div className="p-2.5 bg-stone-50 border border-stone-200 rounded-lg">
                <span className="text-[10px] text-stone-600 block font-bold">معرف السجل النشط (Tenant ID):</span>
                <span className="font-mono font-bold text-amber-900 text-xs">
                  {settings.tenantId || 'tenant-01'}
                </span>
              </div>

              <div className="p-2.5 bg-stone-50 border border-stone-200 rounded-lg">
                <span className="text-[10px] text-stone-600 block font-bold">المزامنة اللحظية التلقائية:</span>
                <span className={`font-bold text-xs ${settings.autoCloudSync !== false ? 'text-emerald-700' : 'text-stone-500'}`}>
                  {settings.autoCloudSync !== false ? '✓ مفعلة عند أي تعديل' : 'معطلة'}
                </span>
              </div>
            </div>
          </div>

          {/* Cloud Configuration Form */}
          <div className="bg-white border-2 border-stone-300 rounded-xl p-5 space-y-4 text-stone-950 shadow-sm">
            <h3 className="text-sm font-black text-stone-950 border-b border-stone-200 pb-2 flex items-center gap-2">
              <Server size={17} className="text-amber-800" />
              <span>بيانات الاتصال بالسيرفر السحابي (Cloud API Endpoint & Security Token)</span>
            </h3>

            <form onSubmit={handleSaveCloudSettings} className="space-y-4 text-xs">
              {/* Cloud Server URL */}
              <div>
                <label className="text-stone-950 block mb-1 font-black">
                  رابط السيرفر السحابي (Cloud Server API URL) *
                </label>
                <div className="relative">
                  <input
                    type="url"
                    placeholder="مثال: https://my-domain.com/smart-debt-ledger/api.php أو https://api.myserver.com/cloud-sync.php"
                    value={cloudServerUrl}
                    onChange={(e) => setCloudServerUrl(e.target.value)}
                    className="w-full pl-3 pr-9 py-2.5 bg-stone-50 border-2 border-stone-300 rounded-lg text-stone-950 font-mono text-xs focus:bg-white focus:outline-none focus:border-amber-600 text-left dir-ltr"
                    required
                  />
                  <Globe size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-500" />
                </div>
                <p className="text-[11px] text-stone-600 mt-1 font-bold">
                  هو رابط ملف الـ API على خادمك السحابي أو الاستضافة (يدعم HTTPS / cPanel / VPS / Localhost).
                </p>
              </div>

              {/* Cloud Token */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-stone-950 font-black">رمز التوكن السحابي (Cloud API Token / Bearer Token) *</label>
                  <button
                    type="button"
                    onClick={handleGenerateToken}
                    className="text-[11px] text-amber-800 hover:text-amber-900 font-black cursor-pointer flex items-center gap-1"
                  >
                    <Key size={12} />
                    <span>توليد توكن أمان جديد</span>
                  </button>
                </div>
                <div className="relative flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showToken ? 'text' : 'password'}
                      placeholder="أدخل التوكن السري السحابي أو اضغط توليد توكن"
                      value={cloudSyncToken}
                      onChange={(e) => setCloudSyncToken(e.target.value)}
                      className="w-full pl-20 pr-3 py-2.5 bg-stone-50 border-2 border-stone-300 rounded-lg text-stone-950 font-mono text-xs focus:bg-white focus:outline-none focus:border-amber-600"
                      required
                    />
                    <div className="absolute left-2.5 top-1/2 -translate-y-1/2 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setShowToken(!showToken)}
                        className="p-1 text-stone-600 hover:text-stone-950 cursor-pointer"
                        title={showToken ? 'إخفاء التوكن' : 'إظهار التوكن'}
                      >
                        {showToken ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                      <button
                        type="button"
                        onClick={handleCopyToken}
                        className="p-1 text-stone-600 hover:text-stone-950 cursor-pointer"
                        title="نسخ التوكن"
                      >
                        {copiedToken ? <Check size={15} className="text-emerald-700" /> : <Copy size={15} />}
                      </button>
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-stone-600 mt-1 font-bold">
                  يُستخدم هذا التوكن لتشفير وحماية الاتصال بين التطبيق المحلي وقاعدة البيانات السحابية لمنع الوصول غير المصرح به.
                </p>
              </div>

              {/* Tenant ID for Multi-Client Platform */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-stone-950 block mb-1 font-black">
                    معرف السجل / الكلاينت على السحابة (Tenant / Client ID) *
                  </label>
                  <input
                    type="text"
                    value={tenantId}
                    onChange={(e) => setTenantId(e.target.value)}
                    placeholder="مثال: tenant-01 أو client-alrafidain"
                    className="w-full px-3 py-2 bg-stone-50 border-2 border-stone-300 rounded-lg text-stone-950 font-mono font-bold text-xs focus:bg-white focus:outline-none focus:border-amber-600"
                    required
                  />
                  <p className="text-[10px] text-stone-600 mt-0.5">
                    يعزل بيانات هذا السجل تماماً في السحابة لمنع أي تداخل بين حسابات أصحاب السجلات.
                  </p>
                </div>

                {/* Auto Cloud Sync Switch */}
                <div className="flex flex-col justify-center">
                  <label className="flex items-center gap-2.5 cursor-pointer mt-2 bg-stone-50 p-2.5 rounded-lg border border-stone-200">
                    <input
                      type="checkbox"
                      checked={autoCloudSync}
                      onChange={(e) => setAutoCloudSync(e.target.checked)}
                      className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                    />
                    <div>
                      <span className="font-black text-stone-950 text-xs block">تفعيل المزامنة التلقائية اللحظية</span>
                      <span className="text-[10px] text-stone-600 block">رفع التغييرات فوراً إلى السحابة عند أي إضافة أو حذف أو تعديل</span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="pt-3 border-t border-stone-200 flex items-center justify-between">
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-amber-600 hover:bg-amber-500 text-stone-950 font-black text-xs rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer active:scale-95 transition-all"
                >
                  <Save size={16} />
                  <span>حفظ إعدادات الربط السحابي</span>
                </button>

                <span className="text-[11px] text-stone-600 font-bold">
                  بمجرد حفظ الرابط والتوكن، يبدأ التطبيق بالمزامنة الفورية تلقائياً
                </span>
              </div>
            </form>
          </div>

          {/* Cloud Architecture Guide */}
          <div className="p-4 bg-amber-50/70 border-2 border-amber-300 rounded-xl space-y-2 text-stone-950">
            <div className="flex items-center gap-2 font-black text-xs text-amber-950">
              <Sparkles size={16} className="text-amber-800" />
              <span>كيف يعمل نظام السحابة ومنصة الديون متعددة العملاء؟</span>
            </div>
            <p className="text-[11px] text-stone-800 font-bold leading-relaxed">
              1. عند رفع ملف الـ API على السيرفر السحابي (مثل cPanel أو استضافة سحابية)، يكفي وضع الرابط والتوكن في هذه الشاشة.
              <br />
              2. المزامنة تتم في الخلفية تلقائياً عند أي عملية تسجيل بيع، تسديد، أو تعديل أرصدة.
              <br />
              3. المنصة تتيح لك إدارة عدة سجلات كلاينت مختلفة مع عزل تام لكل سجل بفضل الـ (Tenant ID)، حيث لا يمكن لبيانات أي عميل أن تظهر لعميل آخر.
            </p>
          </div>
        </div>
      )}

      {/* SECTION 3: MULTI-CLIENT LEDGERS PLATFORM (عزل سجلات العملاء) */}
      {activeSection === 'ledgers' && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="bg-white border-2 border-stone-300 rounded-xl p-5 space-y-4 text-stone-950 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b-2 border-stone-200 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-800 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
                  <Layers size={22} />
                </div>
                <div>
                  <h2 className="text-base font-black text-stone-950 font-amiri">
                    منصة دفاتر الديون متعددة الكلاينت (Multi-Client Platform)
                  </h2>
                  <p className="text-xs text-stone-800 font-bold mt-0.5">
                    فتح وإدارة سجل ديون مستقل لكل عميل أو مؤسسة مع عزل كامل لمنع أي تداخل بين أصحاب السجلات.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsCreatingLedger(!isCreatingLedger)}
                className="px-4 py-2 bg-stone-900 hover:bg-black text-white rounded-lg text-xs font-black flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs self-start sm:self-auto shrink-0"
              >
                <PlusCircle size={15} className="text-amber-400" />
                <span>{isCreatingLedger ? 'إغلاق نموذج السجل' : '+ فتح سجل ديون لكلاينت جديد'}</span>
              </button>
            </div>

            {/* Currently Active Ledger Card */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-amber-50 to-stone-50 border-2 border-amber-400 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center text-white font-bold shadow-xs text-sm"
                  style={{ backgroundColor: settings.coverColor || '#581c1c' }}
                >
                  <BookOpen size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-black text-sm text-stone-950 font-amiri">{settings.storeName}</span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-700 text-white font-mono text-[10px] font-bold">
                      الدفتر النشط حالياً
                    </span>
                  </div>
                  <span className="text-[11px] text-stone-700 font-mono font-bold block mt-0.5">
                    معرف السجل: {settings.tenantId} | العملة: {settings.currency} | الهاتف: {settings.phone || 'غير مسجل'}
                  </span>
                </div>
              </div>

              <div className="text-left font-mono text-xs font-bold text-stone-800">
                <span>كافة العمليات الحالية معزولة ومحفوظة لهذا السجل فقط</span>
              </div>
            </div>
          </div>

          {/* CREATE NEW CLIENT LEDGER DRAWER */}
          {isCreatingLedger && (
            <div className="bg-white border-2 border-stone-800 rounded-xl p-5 shadow-lg space-y-4 animate-fade-in text-stone-950">
              <div className="flex items-center justify-between border-b-2 border-stone-200 pb-3">
                <div className="flex items-center gap-2">
                  <PlusCircle size={18} className="text-amber-800" />
                  <h3 className="font-bold text-sm text-stone-950 font-amiri">إنشاء وفتح سجل ديون لكلاينت جديد</h3>
                </div>
                <button
                  onClick={() => setIsCreatingLedger(false)}
                  className="p-1 rounded-lg text-stone-600 hover:bg-stone-100 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleCreateNewLedger} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-stone-950 font-black mb-1">اسم المؤسسة أو الكلاينت *</label>
                    <input
                      type="text"
                      placeholder="مثال: أسواق الأمانة المركزية"
                      value={newLedgerName}
                      onChange={(e) => setNewLedgerName(e.target.value)}
                      className="w-full px-3 py-2 bg-stone-50 border-2 border-stone-300 rounded-lg text-stone-950 font-bold focus:bg-white focus:outline-none focus:border-amber-600"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-stone-950 font-black mb-1">رمز السجل (كود المنصة)</label>
                    <input
                      type="text"
                      placeholder="مثال: LEDGER-03"
                      value={newLedgerCode}
                      onChange={(e) => setNewLedgerCode(e.target.value)}
                      className="w-full px-3 py-2 bg-stone-50 border-2 border-stone-300 rounded-lg text-stone-950 font-mono font-bold focus:bg-white focus:outline-none focus:border-amber-600"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-950 font-black mb-1">العملة الأساسية *</label>
                    <input
                      type="text"
                      placeholder="مثال: د.ع أو $ أو ر.س"
                      value={newLedgerCurrency}
                      onChange={(e) => setNewLedgerCurrency(e.target.value)}
                      className="w-full px-3 py-2 bg-stone-50 border-2 border-stone-300 rounded-lg text-stone-950 font-bold focus:bg-white focus:outline-none focus:border-amber-600"
                      required
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-stone-950 font-black mb-1">اسم المالك / المدير المسؤول</label>
                    <input
                      type="text"
                      placeholder="اسم صاحب السجل"
                      value={newLedgerOwner}
                      onChange={(e) => setNewLedgerOwner(e.target.value)}
                      className="w-full px-3 py-2 bg-stone-50 border-2 border-stone-300 rounded-lg text-stone-950 font-bold focus:bg-white focus:outline-none focus:border-amber-600"
                    />
                  </div>

                  <div>
                    <label className="block text-stone-950 font-black mb-1">رقم الهاتف للتواصل</label>
                    <input
                      type="text"
                      placeholder="0770..."
                      value={newLedgerPhone}
                      onChange={(e) => setNewLedgerPhone(e.target.value)}
                      className="w-full px-3 py-2 bg-stone-50 border-2 border-stone-300 rounded-lg text-stone-950 font-mono font-bold focus:bg-white focus:outline-none focus:border-amber-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-stone-950 font-black mb-1">لون غلاف الدفتر لهذا الكلاينت:</label>
                  <div className="flex flex-wrap items-center gap-2">
                    {PRESET_COLORS.map(p => (
                      <button
                        key={p.color}
                        type="button"
                        onClick={() => setNewLedgerColor(p.color)}
                        className={`w-8 h-8 rounded-lg border-2 transition-all cursor-pointer ${
                          newLedgerColor === p.color ? 'border-amber-600 scale-110 shadow-md ring-2 ring-amber-400' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: p.color }}
                        title={p.name}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-200">
                  <button
                    type="button"
                    onClick={() => setIsCreatingLedger(false)}
                    className="px-4 py-2 border border-stone-300 rounded-lg hover:bg-stone-100 font-bold text-stone-800 cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-amber-700 hover:bg-amber-800 text-white font-black rounded-lg cursor-pointer shadow-xs"
                  >
                    إنشاء السجل وفتحه فوراً
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* REGISTERED CLIENT LEDGERS TABLE */}
          <div className="bg-white border-2 border-stone-300 rounded-xl p-5 space-y-4 text-stone-950 shadow-sm">
            <h3 className="text-sm font-black text-stone-950 border-b border-stone-200 pb-2 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <BookOpen size={16} className="text-amber-800" />
                <span>سجلات الكلاينت المسجلة في المنصة ({ledgers.length})</span>
              </span>
              <span className="text-[11px] text-stone-600 font-bold">
                اضغط على "فتح سجل الديون" للتبديل الفوري بين العملاء دون تداخل
              </span>
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-stone-900 text-white font-black border-b-2 border-stone-900">
                  <tr>
                    <th className="p-3 w-12 text-center">الغلاف</th>
                    <th className="p-3">اسم المتجر / الكلاينت</th>
                    <th className="p-3 w-32 font-mono">معرف السجل</th>
                    <th className="p-3 w-24 text-center">العملة</th>
                    <th className="p-3 w-40">المالك والهاتف</th>
                    <th className="p-3 w-36 text-center">الحالة</th>
                    <th className="p-3 w-44 text-center">الإجراء</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 text-stone-950 font-bold">
                  {ledgers.map(l => {
                    const isActive = l.id === settings.tenantId;
                    return (
                      <tr key={l.id} className={`transition-colors ${isActive ? 'bg-amber-50/80 font-black' : 'hover:bg-stone-50'}`}>
                        <td className="p-3 text-center">
                          <div
                            className="w-6 h-6 rounded mx-auto border border-stone-400 shadow-2xs"
                            style={{ backgroundColor: l.coverColor || '#581c1c' }}
                          />
                        </td>
                        <td className="p-3">
                          <span className="text-stone-950 font-black text-sm block">{l.name}</span>
                          <span className="text-[11px] text-stone-600 font-mono">{l.code}</span>
                        </td>
                        <td className="p-3 font-mono text-[11px] text-amber-900 font-bold">{l.id}</td>
                        <td className="p-3 text-center font-bold text-stone-900">{l.currency}</td>
                        <td className="p-3 text-stone-800 text-[11px]">
                          <div>{l.ownerName || '—'}</div>
                          <div className="font-mono text-stone-600">{l.phone || ''}</div>
                        </td>
                        <td className="p-3 text-center">
                          {isActive ? (
                            <span className="px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-950 border border-emerald-400 font-black text-[11px]">
                              ● السجل المفتوح
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-stone-100 text-stone-700 font-bold text-[10px]">
                              غير نشط
                            </span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            {isActive ? (
                              <span className="text-xs text-emerald-800 font-black">قيد الاستعراض</span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSwitchLedger(l.id)}
                                className="px-3 py-1 bg-amber-700 hover:bg-amber-800 text-white rounded text-[11px] font-black cursor-pointer shadow-2xs transition-colors"
                              >
                                فتح سجل الديون
                              </button>
                            )}

                            {ledgers.length > 1 && (
                              <button
                                type="button"
                                onClick={() => handleDeleteLedger(l)}
                                className="p-1 hover:bg-red-100 text-stone-400 hover:text-red-700 rounded transition-colors cursor-pointer"
                                title="حذف السجل"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SECTION 4: USERS, PASSWORDS & PERMISSIONS (MANAGED BY ADMIN / STORE OWNER) */}
      {activeSection === 'users' && (
        <div className="space-y-5">
          {/* Admin Banner & Actions */}
          <div className="bg-amber-50/80 border-2 border-amber-300 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-800 text-white flex items-center justify-center font-bold shadow-xs shrink-0">
                <ShieldCheck size={22} />
              </div>
              <div>
                <h3 className="font-amiri font-black text-base text-stone-950 flex items-center gap-2">
                  <span>لوحة التحكم بالمستخدمين والصلاحيات</span>
                  {isCurrentAdmin && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-800 text-amber-100 font-bold">
                      مالك المتجر (الآدمن)
                    </span>
                  )}
                </h3>
                <p className="text-xs text-stone-800 font-bold mt-0.5">
                  بصفتك مالك المتجر، يمكنك تعديل أسماء المستخدمين، تغيير كلمات المرور، وتعيين الصلاحيات المالية والإدارية بدقة.
                </p>
              </div>
            </div>

            <button
              onClick={() => {
                setIsAddingUser(!isAddingUser);
                setEditingUserId(null);
                setAddError('');
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-stone-900 hover:bg-black text-white text-xs font-black shadow-xs cursor-pointer self-start sm:self-auto shrink-0"
            >
              <UserPlus size={15} className="text-amber-400" />
              <span>{isAddingUser ? 'إغلاق نموذج الإضافة' : '+ إضافة مستخدم جديد'}</span>
            </button>
          </div>

          {/* ADD USER FORM (Inline Drawer) */}
          {isAddingUser && (
            <div className="bg-white border-2 border-stone-800 rounded-xl p-5 shadow-lg space-y-4 animate-fade-in text-stone-950">
              <div className="flex items-center justify-between border-b-2 border-stone-200 pb-3">
                <div className="flex items-center gap-2">
                  <UserPlus size={18} className="text-amber-800" />
                  <h3 className="font-bold text-sm text-stone-950 font-amiri">إنشاء حساب مستخدم جديد</h3>
                </div>
                <button
                  onClick={() => setIsAddingUser(false)}
                  className="p-1 rounded-lg text-stone-600 hover:bg-stone-100 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {addError && (
                <div className="p-2.5 rounded-lg bg-red-100 border border-red-300 text-red-900 text-xs font-bold flex items-center gap-2">
                  <AlertCircle size={15} />
                  <span>{addError}</span>
                </div>
              )}

              <form onSubmit={handleCreateUser} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-stone-950 font-black mb-1">اسم المستخدم (Username) *</label>
                    <input
                      type="text"
                      placeholder="مثال: cashier_1"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      className="w-full px-3 py-2 bg-stone-50 border-2 border-stone-300 rounded-lg text-stone-950 font-mono font-bold focus:bg-white focus:outline-none focus:border-amber-600"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-stone-950 font-black mb-1">الاسم الكامل للمستخدم *</label>
                    <input
                      type="text"
                      placeholder="مثال: أحمد مصطفى"
                      value={newFullName}
                      onChange={(e) => setNewFullName(e.target.value)}
                      className="w-full px-3 py-2 bg-stone-50 border-2 border-stone-300 rounded-lg text-stone-950 font-bold focus:bg-white focus:outline-none focus:border-amber-600"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-stone-950 font-black mb-1">كلمة المرور (Password) *</label>
                    <div className="relative">
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        placeholder="كلمة المرور"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 bg-stone-50 border-2 border-stone-300 rounded-lg text-stone-950 font-mono font-bold focus:bg-white focus:outline-none focus:border-amber-600"
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-600 hover:text-stone-950 cursor-pointer"
                      >
                        {showNewPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Role Selection */}
                <div>
                  <label className="block text-stone-950 font-black mb-1.5">الدور الرئيسي للمستخدم:</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handleRoleChangeForNew('admin')}
                      className={`p-2.5 rounded-xl border-2 text-right transition-all cursor-pointer ${
                        newRole === 'admin'
                          ? 'border-amber-600 bg-amber-50 ring-2 ring-amber-500'
                          : 'border-stone-200 bg-stone-50 hover:bg-stone-100'
                      }`}
                    >
                      <span className="font-black text-amber-950 block text-xs">مدير عام (مالك المتجر)</span>
                      <span className="text-[10px] text-stone-600 block mt-0.5">صلاحيات كاملة وغير محدودة</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRoleChangeForNew('accountant')}
                      className={`p-2.5 rounded-xl border-2 text-right transition-all cursor-pointer ${
                        newRole === 'accountant'
                          ? 'border-blue-600 bg-blue-50 ring-2 ring-blue-500'
                          : 'border-stone-200 bg-stone-50 hover:bg-stone-100'
                      }`}
                    >
                      <span className="font-black text-blue-950 block text-xs">محاسب مالي</span>
                      <span className="text-[10px] text-stone-600 block mt-0.5">إدارة الحسابات، القيود، والتقارير</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRoleChangeForNew('user')}
                      className={`p-2.5 rounded-xl border-2 text-right transition-all cursor-pointer ${
                        newRole === 'user'
                          ? 'border-stone-600 bg-stone-100 ring-2 ring-stone-500'
                          : 'border-stone-200 bg-stone-50 hover:bg-stone-100'
                      }`}
                    >
                      <span className="font-black text-stone-950 block text-xs">أمين صندوق / مستخدم</span>
                      <span className="text-[10px] text-stone-600 block mt-0.5">تسجيل الفواتير وحركات القبض</span>
                    </button>
                  </div>
                </div>

                {/* Granular Screen & Action Permissions Checkboxes */}
                <div className="p-3.5 bg-stone-50 border border-stone-300 rounded-xl space-y-3">
                  <div>
                    <span className="font-black text-amber-950 block text-xs mb-2">
                      📖 صلاحيات ظهور شاشات وصفحات النظام (أزرار التنقل):
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newPermissions.canAccessDashboard !== false}
                          onChange={(e) => setNewPermissions({ ...newPermissions, canAccessDashboard: e.target.checked })}
                          className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                        />
                        <span className="text-[11px] font-bold text-stone-900">لوحة الدفتر الرئيسية</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newPermissions.canAccessSales === true}
                          onChange={(e) => setNewPermissions({ ...newPermissions, canAccessSales: e.target.checked })}
                          className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                        />
                        <span className="text-[11px] font-bold text-stone-900">سجل المبيعات وتسديد الزبائن</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newPermissions.canAccessPurchases === true}
                          onChange={(e) => setNewPermissions({ ...newPermissions, canAccessPurchases: e.target.checked })}
                          className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                        />
                        <span className="text-[11px] font-bold text-stone-900">سجل المشتريات وتسديد الموردين</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newPermissions.canAccessCustomers === true}
                          onChange={(e) => setNewPermissions({ ...newPermissions, canAccessCustomers: e.target.checked })}
                          className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                        />
                        <span className="text-[11px] font-bold text-stone-900">دليل الزبائن والديون</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newPermissions.canAccessSuppliers === true}
                          onChange={(e) => setNewPermissions({ ...newPermissions, canAccessSuppliers: e.target.checked })}
                          className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                        />
                        <span className="text-[11px] font-bold text-stone-900">دليل الموردين والمستحقات</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newPermissions.canAccessJournal === true}
                          onChange={(e) => setNewPermissions({ ...newPermissions, canAccessJournal: e.target.checked })}
                          className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                        />
                        <span className="text-[11px] font-bold text-stone-900">دفتر القيود واليومية العامة</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newPermissions.canViewReports === true}
                          onChange={(e) => setNewPermissions({ ...newPermissions, canViewReports: e.target.checked })}
                          className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                        />
                        <span className="text-[11px] font-bold text-stone-900">التقارير المالية والأرباح</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newPermissions.canManageBackups === true}
                          onChange={(e) => setNewPermissions({ ...newPermissions, canManageBackups: e.target.checked })}
                          className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                        />
                        <span className="text-[11px] font-bold text-stone-900">الرقابة والنسخ الاحتياطي</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newPermissions.canEditSettings === true}
                          onChange={(e) => setNewPermissions({ ...newPermissions, canEditSettings: e.target.checked })}
                          className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                        />
                        <span className="text-[11px] font-bold text-stone-900">شاشة إعدادات المتجر</span>
                      </label>
                    </div>
                  </div>

                  <div className="pt-2.5 border-t border-stone-200">
                    <span className="font-black text-amber-950 block text-xs mb-2">
                      ⚙️ صلاحيات الإجراءات والعمليات الإدارية:
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newPermissions.canManageUsers === true}
                          onChange={(e) => setNewPermissions({ ...newPermissions, canManageUsers: e.target.checked })}
                          className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                        />
                        <span className="text-[11px] font-bold text-stone-900">إدارة المستخدمين وكلمات المرور</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newPermissions.canDeleteRecords === true}
                          onChange={(e) => setNewPermissions({ ...newPermissions, canDeleteRecords: e.target.checked })}
                          className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                        />
                        <span className="text-[11px] font-bold text-stone-900">حذف السجلات والقيود</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newPermissions.canExportData === true}
                          onChange={(e) => setNewPermissions({ ...newPermissions, canExportData: e.target.checked })}
                          className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                        />
                        <span className="text-[11px] font-bold text-stone-900">تصدير البيانات (Excel/CSV)</span>
                      </label>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-200">
                  <button
                    type="button"
                    onClick={() => setIsAddingUser(false)}
                    className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg font-bold cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-stone-950 font-black rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Save size={14} />
                    <span>حفظ المستخدم الجديد</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* EDIT USER MODAL / CARD */}
          {editingUserId && (
            <div className="bg-amber-50/90 border-2 border-amber-600 rounded-xl p-5 shadow-xl space-y-4 animate-fade-in text-stone-950">
              <div className="flex items-center justify-between border-b-2 border-amber-300 pb-3">
                <div className="flex items-center gap-2">
                  <Edit size={18} className="text-amber-800" />
                  <h3 className="font-black text-sm text-stone-950 font-amiri">
                    تعديل بيانات المستخدم وكلمة المرور والصلاحيات
                  </h3>
                </div>
                <button
                  onClick={handleCancelEdit}
                  className="p-1 rounded-lg text-stone-700 hover:bg-amber-200 cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              {editError && (
                <div className="p-2.5 rounded-lg bg-red-100 border border-red-300 text-red-900 text-xs font-bold flex items-center gap-2">
                  <AlertCircle size={15} />
                  <span>{editError}</span>
                </div>
              )}

              <form onSubmit={handleSaveUserEdit} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-stone-950 font-black mb-1">اسم المستخدم (Username) *</label>
                    <input
                      type="text"
                      value={editUsername}
                      onChange={(e) => setEditUsername(e.target.value)}
                      className="w-full px-3 py-2 bg-white border-2 border-stone-300 rounded-lg text-stone-950 font-mono font-bold focus:outline-none focus:border-amber-600"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-stone-950 font-black mb-1">الاسم الكامل *</label>
                    <input
                      type="text"
                      value={editFullName}
                      onChange={(e) => setEditFullName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border-2 border-stone-300 rounded-lg text-stone-950 font-bold focus:outline-none focus:border-amber-600"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-stone-950 font-black mb-1">
                      كلمة المرور (الباسوورد الجديد)
                    </label>
                    <div className="relative">
                      <input
                        type={showEditPassword ? 'text' : 'password'}
                        value={editPassword}
                        onChange={(e) => setEditPassword(e.target.value)}
                        placeholder="أدخل كلمة مرور جديدة أو اتركها كما هي"
                        className="w-full pl-9 pr-3 py-2 bg-white border-2 border-stone-300 rounded-lg text-stone-950 font-mono font-bold focus:outline-none focus:border-amber-600"
                      />
                      <button
                        type="button"
                        onClick={() => setShowEditPassword(!showEditPassword)}
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 text-stone-600 hover:text-stone-950 cursor-pointer"
                        title={showEditPassword ? 'إخفاء كلمة المرور' : 'إظهار كلمة المرور'}
                      >
                        {showEditPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Role Selection by Admin */}
                <div>
                  <label className="block text-stone-950 font-black mb-1.5">تعيين الدور والصلاحية:</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handleRoleChangeForEdit('admin')}
                      className={`p-2.5 rounded-xl border-2 text-right transition-all cursor-pointer ${
                        editRole === 'admin'
                          ? 'border-amber-600 bg-white ring-2 ring-amber-500 font-bold'
                          : 'border-stone-300 bg-white/60 hover:bg-white'
                      }`}
                    >
                      <span className="font-black text-amber-950 block text-xs">مدير عام (مالك المتجر)</span>
                      <span className="text-[10px] text-stone-600 block mt-0.5">صلاحيات كاملة لجميع الأقسام</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRoleChangeForEdit('accountant')}
                      className={`p-2.5 rounded-xl border-2 text-right transition-all cursor-pointer ${
                        editRole === 'accountant'
                          ? 'border-blue-600 bg-white ring-2 ring-blue-500 font-bold'
                          : 'border-stone-300 bg-white/60 hover:bg-white'
                      }`}
                    >
                      <span className="font-black text-blue-950 block text-xs">محاسب مالي</span>
                      <span className="text-[10px] text-stone-600 block mt-0.5">إدارة الدفتر والقيود والتقارير</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRoleChangeForEdit('user')}
                      className={`p-2.5 rounded-xl border-2 text-right transition-all cursor-pointer ${
                        editRole === 'user'
                          ? 'border-stone-600 bg-white ring-2 ring-stone-500 font-bold'
                          : 'border-stone-300 bg-white/60 hover:bg-white'
                      }`}
                    >
                      <span className="font-black text-stone-950 block text-xs">أمين صندوق / مستخدم</span>
                      <span className="text-[10px] text-stone-600 block mt-0.5">تسجيل الفواتير والمقبوضات فقط</span>
                    </button>
                  </div>
                </div>

                {/* Granular Screen & Action Permissions Checkboxes */}
                <div className="p-3.5 bg-white border border-amber-300 rounded-xl space-y-3">
                  <div className="flex items-center justify-between pb-1 border-b border-amber-200">
                    <span className="font-black text-amber-950 block text-xs">
                      📖 صلاحيات ظهور شاشات وصفحات النظام (أزرار التنقل):
                    </span>
                    <button
                      type="button"
                      onClick={() => setEditPermissions(getDefaultPermissions(editRole))}
                      className="text-[11px] text-amber-900 font-bold hover:underline cursor-pointer"
                    >
                      استعادة الصلاحيات الافتراضية للدور
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editPermissions.canAccessDashboard !== false}
                        onChange={(e) => setEditPermissions({ ...editPermissions, canAccessDashboard: e.target.checked })}
                        className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                      />
                      <span className="text-[11px] font-bold text-stone-900">لوحة الدفتر الرئيسية</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editPermissions.canAccessSales === true}
                        onChange={(e) => setEditPermissions({ ...editPermissions, canAccessSales: e.target.checked })}
                        className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                      />
                      <span className="text-[11px] font-bold text-stone-900">سجل المبيعات وتسديد الزبائن</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editPermissions.canAccessPurchases === true}
                        onChange={(e) => setEditPermissions({ ...editPermissions, canAccessPurchases: e.target.checked })}
                        className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                      />
                      <span className="text-[11px] font-bold text-stone-900">سجل المشتريات وتسديد الموردين</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editPermissions.canAccessCustomers === true}
                        onChange={(e) => setEditPermissions({ ...editPermissions, canAccessCustomers: e.target.checked })}
                        className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                      />
                      <span className="text-[11px] font-bold text-stone-900">دليل الزبائن والديون</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editPermissions.canAccessSuppliers === true}
                        onChange={(e) => setEditPermissions({ ...editPermissions, canAccessSuppliers: e.target.checked })}
                        className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                      />
                      <span className="text-[11px] font-bold text-stone-900">دليل الموردين والمستحقات</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editPermissions.canAccessJournal === true}
                        onChange={(e) => setEditPermissions({ ...editPermissions, canAccessJournal: e.target.checked })}
                        className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                      />
                      <span className="text-[11px] font-bold text-stone-900">دفتر القيود واليومية العامة</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editPermissions.canViewReports === true}
                        onChange={(e) => setEditPermissions({ ...editPermissions, canViewReports: e.target.checked })}
                        className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                      />
                      <span className="text-[11px] font-bold text-stone-900">التقارير المالية والأرباح</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editPermissions.canManageBackups === true}
                        onChange={(e) => setEditPermissions({ ...editPermissions, canManageBackups: e.target.checked })}
                        className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                      />
                      <span className="text-[11px] font-bold text-stone-900">الرقابة والنسخ الاحتياطي</span>
                    </label>

                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editPermissions.canEditSettings === true}
                        onChange={(e) => setEditPermissions({ ...editPermissions, canEditSettings: e.target.checked })}
                        className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                      />
                      <span className="text-[11px] font-bold text-stone-900">شاشة إعدادات المتجر</span>
                    </label>
                  </div>

                  <div className="pt-2.5 border-t border-amber-200">
                    <span className="font-black text-amber-950 block text-xs mb-2">
                      ⚙️ صلاحيات الإجراءات والعمليات الإدارية:
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editPermissions.canManageUsers === true}
                          onChange={(e) => setEditPermissions({ ...editPermissions, canManageUsers: e.target.checked })}
                          className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                        />
                        <span className="text-[11px] font-bold text-stone-900">إدارة المستخدمين وكلمات المرور</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editPermissions.canDeleteRecords === true}
                          onChange={(e) => setEditPermissions({ ...editPermissions, canDeleteRecords: e.target.checked })}
                          className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                        />
                        <span className="text-[11px] font-bold text-stone-900">حذف السجلات والقيود</span>
                      </label>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={editPermissions.canExportData === true}
                          onChange={(e) => setEditPermissions({ ...editPermissions, canExportData: e.target.checked })}
                          className="w-4 h-4 accent-amber-600 rounded cursor-pointer"
                        />
                        <span className="text-[11px] font-bold text-stone-900">تصدير البيانات (Excel/CSV)</span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Account Active State Toggle */}
                <div className="flex items-center justify-between p-3 bg-white border border-amber-300 rounded-xl">
                  <div>
                    <span className="font-black text-stone-950 block text-xs">حالة الحساب</span>
                    <span className="text-[11px] text-stone-600 font-bold">
                      {editIsActive ? 'الحساب نشط ويستطيع تسجيل الدخول والعمل' : 'الحساب معطل وممنوع من تسجيل الدخول'}
                    </span>
                  </div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editIsActive}
                      onChange={(e) => setEditIsActive(e.target.checked)}
                      className="w-4 h-4 accent-amber-600 rounded"
                    />
                    <span className="font-bold text-xs">{editIsActive ? 'نشط' : 'معطل'}</span>
                  </label>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-amber-300">
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-4 py-2 bg-stone-200 hover:bg-stone-300 text-stone-800 rounded-lg font-bold cursor-pointer"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-stone-950 font-black rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
                  >
                    <Save size={14} />
                    <span>حفظ التعديلات وكلمة المرور</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* USERS TABLE & LIST */}
          <div className="bg-white border-2 border-stone-300 rounded-xl overflow-hidden shadow-sm text-stone-950">
            <div className="p-4 border-b-2 border-stone-200 flex items-center justify-between">
              <div>
                <h3 className="font-black text-sm text-stone-950 flex items-center gap-2">
                  <Users size={16} className="text-amber-800" />
                  <span>قائمة مستخدمي النظام المسجلين</span>
                </h3>
                <span className="text-xs text-stone-600 font-bold block mt-0.5">
                  إجمالي المستخدمين: {users.length} مستخدمين
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead className="bg-stone-900 text-white font-black border-b-2 border-stone-900">
                  <tr>
                    <th className="p-3 w-10 text-center">#</th>
                    <th className="p-3">اسم المستخدم (Username)</th>
                    <th className="p-3">الاسم الكامل</th>
                    <th className="p-3">الدور / الرتبة</th>
                    <th className="p-3">كلمة المرور (الباسوورد)</th>
                    <th className="p-3">الصلاحيات الممنوحة</th>
                    <th className="p-3 text-center">الحالة</th>
                    <th className="p-3 text-center w-28">الإجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-200 text-stone-950 font-bold">
                  {users.map((u, idx) => {
                    const isSelf = currentUser?.id === u.id;
                    const perms = u.permissions || getDefaultPermissions(u.role);
                    const grantedCount = Object.values(perms).filter(Boolean).length;

                    return (
                      <tr key={u.id} className="hover:bg-amber-50/70 transition-colors">
                        <td className="p-3 text-stone-600 font-mono text-center font-bold">{idx + 1}</td>
                        <td className="p-3">
                          <span className="font-mono font-black text-stone-950 block text-xs">@{u.username}</span>
                          {isSelf && (
                            <span className="text-[10px] text-amber-800 font-bold bg-amber-100 px-1.5 py-0.2 rounded mt-0.5 inline-block">
                              حسابك الحالي
                            </span>
                          )}
                        </td>
                        <td className="p-3 font-black text-stone-950 text-sm">
                          {u.fullName}
                        </td>
                        <td className="p-3">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-black ${
                              u.role === 'admin'
                                ? 'bg-amber-100 text-amber-950 border border-amber-300'
                                : u.role === 'accountant'
                                ? 'bg-blue-100 text-blue-950 border border-blue-300'
                                : 'bg-stone-100 text-stone-900 border border-stone-300'
                            }`}
                          >
                            <Shield size={12} />
                            <span>
                              {u.role === 'admin'
                                ? 'مدير عام (مالك)'
                                : u.role === 'accountant'
                                ? 'محاسب مالي'
                                : 'أمين صندوق'}
                            </span>
                          </span>
                        </td>
                        <td className="p-3 font-mono">
                          <div className="flex items-center gap-1.5">
                            <Key size={13} className="text-stone-500" />
                            <span className="text-stone-950 font-black tracking-widest text-xs">
                              {u.password ? '••••••••' : 'غير معينة'}
                            </span>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap items-center gap-1 max-w-xs">
                            <span className="text-[10px] font-mono font-black bg-stone-100 text-stone-800 px-2 py-0.5 rounded border border-stone-300">
                              {grantedCount} من 6 صلاحيات
                            </span>
                            {perms.canManageUsers && (
                              <span className="text-[9px] bg-amber-50 text-amber-900 px-1 py-0.5 rounded border border-amber-200">
                                إدارة مستخدمين
                              </span>
                            )}
                            {perms.canDeleteRecords && (
                              <span className="text-[9px] bg-red-50 text-red-900 px-1 py-0.5 rounded border border-red-200">
                                حذف سجلات
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-black ${
                              u.isActive ? 'bg-emerald-100 text-emerald-950' : 'bg-red-100 text-red-950'
                            }`}
                          >
                            {u.isActive ? <UserCheck size={11} /> : <UserX size={11} />}
                            <span>{u.isActive ? 'نشط' : 'معطل'}</span>
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleStartEdit(u)}
                              className="p-1.5 rounded-lg bg-stone-100 hover:bg-amber-100 text-stone-900 hover:text-amber-900 border border-stone-300 shadow-xs cursor-pointer transition-colors"
                              title="تعديل اسم المستخدم، كلمة المرور، والصلاحيات"
                            >
                              <Edit size={14} />
                            </button>

                            {!isSelf && (
                              <button
                                onClick={() => handleDeleteUser(u)}
                                className="p-1.5 rounded-lg bg-stone-100 hover:bg-red-100 text-stone-900 hover:text-red-700 border border-stone-300 shadow-xs cursor-pointer transition-colors"
                                title="حذف المستخدم"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
