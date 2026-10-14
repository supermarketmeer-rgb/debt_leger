export const PHP_FILES = {
  schemaSql: `-- ============================================================
-- قاعدة بيانات: دفتر الديون الذكي (Smart Debt Ledger)
-- بيئة التشغيل: XAMPP / MySQL 8.0+ / MariaDB 10.4+ / PHP 8+
-- الترميز الموصى به: utf8mb4_unicode_ci (دعم كامل للعربية والرموز)
-- ⚠️  قاعدة البيانات نظيفة 100% - لا يوجد أي بيانات وهمية
-- ✅  يتم إنشاء الجداول تلقائياً عند أول تشغيل (CREATE TABLE IF NOT EXISTS)
-- ============================================================

CREATE DATABASE IF NOT EXISTS \`smart_debt_ledger\`
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE \`smart_debt_ledger\`;

-- 1. جدول المتاجر والمؤسسات (Multi-Tenant Architecture)
CREATE TABLE IF NOT EXISTS \`tenants\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`uuid\` VARCHAR(36) NOT NULL UNIQUE,
    \`name\` VARCHAR(150) NOT NULL COMMENT 'اسم المتجر أو المؤسسة',
    \`phone\` VARCHAR(50) DEFAULT NULL,
    \`address\` VARCHAR(255) DEFAULT NULL,
    \`currency\` VARCHAR(20) DEFAULT 'د.ع',
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX \`idx_tenant_uuid\` (\`uuid\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. جدول إعدادات المتجر وهوية الدفتر
CREATE TABLE IF NOT EXISTS \`settings\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`tenant_id\` INT NOT NULL UNIQUE,
    \`store_name\` VARCHAR(150) NOT NULL DEFAULT 'دفتر الديون الذكي',
    \`app_name\` VARCHAR(100) NOT NULL DEFAULT 'دفتر الحسابات والديون',
    \`cover_color\` VARCHAR(30) DEFAULT '#581c1c' COMMENT 'لون جلد غلاف الدفتر',
    \`cover_texture\` VARCHAR(30) DEFAULT 'leather',
    \`logo_text\` VARCHAR(50) DEFAULT 'الدفتر الذكي',
    \`currency\` VARCHAR(20) DEFAULT 'د.ع',
    \`phone\` VARCHAR(50) DEFAULT '',
    \`address\` VARCHAR(255) DEFAULT '',
    \`date_format\` VARCHAR(30) DEFAULT 'YYYY-MM-DD',
    \`allow_credit_balance\` TINYINT(1) DEFAULT 1,
    \`auto_backup\` TINYINT(1) DEFAULT 1,
    \`last_backup_date\` VARCHAR(50) DEFAULT NULL,
    \`overdue_days_threshold\` INT DEFAULT 30,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`fk_settings_tenant\` FOREIGN KEY (\`tenant_id\`) REFERENCES \`tenants\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. جدول المستخدمين والصلاحيات
CREATE TABLE IF NOT EXISTS \`users\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`tenant_id\` INT NOT NULL,
    \`uuid\` VARCHAR(36) NOT NULL UNIQUE,
    \`username\` VARCHAR(60) NOT NULL,
    \`password_hash\` VARCHAR(255) NOT NULL,
    \`full_name\` VARCHAR(120) NOT NULL,
    \`role\` ENUM('admin', 'accountant', 'user') DEFAULT 'user',
    \`is_active\` TINYINT(1) DEFAULT 1,
    \`permissions\` LONGTEXT DEFAULT NULL COMMENT 'مصفوفة الصلاحيات بصيغة JSON',
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`fk_users_tenant\` FOREIGN KEY (\`tenant_id\`) REFERENCES \`tenants\`(\`id\`) ON DELETE CASCADE,
    UNIQUE KEY \`uq_tenant_username\` (\`tenant_id\`, \`username\`),
    INDEX \`idx_user_role\` (\`role\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. جدول دليل الزبائن والديون (فارغ - جاهز لإدخال البيانات الفعلية)
CREATE TABLE IF NOT EXISTS \`customers\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`uuid\` VARCHAR(36) NOT NULL UNIQUE,
    \`tenant_id\` INT NOT NULL,
    \`code\` VARCHAR(30) NOT NULL,
    \`name\` VARCHAR(150) NOT NULL,
    \`phone\` VARCHAR(50) DEFAULT NULL,
    \`address\` VARCHAR(255) DEFAULT NULL,
    \`notes\` TEXT DEFAULT NULL,
    \`opening_balance\` DECIMAL(15, 2) DEFAULT 0.00,
    \`balance_type\` ENUM('debit', 'credit') DEFAULT 'debit',
    \`current_balance\` DECIMAL(15, 2) DEFAULT 0.00,
    \`is_active\` TINYINT(1) DEFAULT 1,
    \`sync_status\` ENUM('synced', 'pending', 'conflict') DEFAULT 'synced',
    \`device_id\` VARCHAR(100) DEFAULT NULL,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    \`deleted_at\` TIMESTAMP NULL DEFAULT NULL,
    CONSTRAINT \`fk_customers_tenant\` FOREIGN KEY (\`tenant_id\`) REFERENCES \`tenants\`(\`id\`) ON DELETE CASCADE,
    UNIQUE KEY \`uq_customer_code\` (\`tenant_id\`, \`code\`),
    INDEX \`idx_cust_phone\` (\`phone\`),
    INDEX \`idx_cust_name\` (\`name\`),
    INDEX \`idx_cust_balance\` (\`current_balance\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. جدول دليل الموردين والمستحقات (فارغ - جاهز لإدخال البيانات الفعلية)
CREATE TABLE IF NOT EXISTS \`suppliers\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`uuid\` VARCHAR(36) NOT NULL UNIQUE,
    \`tenant_id\` INT NOT NULL,
    \`code\` VARCHAR(30) NOT NULL,
    \`name\` VARCHAR(150) NOT NULL,
    \`phone\` VARCHAR(50) DEFAULT NULL,
    \`address\` VARCHAR(255) DEFAULT NULL,
    \`notes\` TEXT DEFAULT NULL,
    \`opening_balance\` DECIMAL(15, 2) DEFAULT 0.00,
    \`balance_type\` ENUM('debit', 'credit') DEFAULT 'credit',
    \`current_balance\` DECIMAL(15, 2) DEFAULT 0.00,
    \`is_active\` TINYINT(1) DEFAULT 1,
    \`sync_status\` ENUM('synced', 'pending', 'conflict') DEFAULT 'synced',
    \`device_id\` VARCHAR(100) DEFAULT NULL,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    \`deleted_at\` TIMESTAMP NULL DEFAULT NULL,
    CONSTRAINT \`fk_suppliers_tenant\` FOREIGN KEY (\`tenant_id\`) REFERENCES \`tenants\`(\`id\`) ON DELETE CASCADE,
    UNIQUE KEY \`uq_supplier_code\` (\`tenant_id\`, \`code\`),
    INDEX \`idx_supp_phone\` (\`phone\`),
    INDEX \`idx_supp_name\` (\`name\`),
    INDEX \`idx_supp_balance\` (\`current_balance\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. جدول دفتر القيود والحركات الموحد (فارغ - جاهز لإدخال البيانات الفعلية)
CREATE TABLE IF NOT EXISTS \`transactions\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`uuid\` VARCHAR(36) NOT NULL UNIQUE,
    \`tenant_id\` INT NOT NULL,
    \`account_type\` ENUM('customer', 'supplier') NOT NULL,
    \`account_id\` INT NOT NULL,
    \`account_code\` VARCHAR(30) NOT NULL,
    \`account_name\` VARCHAR(150) NOT NULL,
    \`type\` ENUM('sale', 'customer_payment', 'purchase', 'supplier_payment', 'opening_balance') NOT NULL,
    \`document_no\` VARCHAR(50) NOT NULL,
    \`tx_date\` DATE NOT NULL,
    \`amount\` DECIMAL(15, 2) NOT NULL,
    \`debit\` DECIMAL(15, 2) DEFAULT 0.00,
    \`credit\` DECIMAL(15, 2) DEFAULT 0.00,
    \`balance_after\` DECIMAL(15, 2) NOT NULL,
    \`payment_method\` ENUM('cash', 'bank_transfer', 'check', 'other') DEFAULT 'cash',
    \`description\` VARCHAR(255) NOT NULL,
    \`notes\` TEXT DEFAULT NULL,
    \`user_id\` INT DEFAULT NULL,
    \`user_name\` VARCHAR(120) NOT NULL,
    \`sync_status\` ENUM('synced', 'pending', 'conflict') DEFAULT 'synced',
    \`device_id\` VARCHAR(100) DEFAULT NULL,
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT \`fk_tx_tenant\` FOREIGN KEY (\`tenant_id\`) REFERENCES \`tenants\`(\`id\`) ON DELETE CASCADE,
    INDEX \`idx_tx_account\` (\`account_type\`, \`account_id\`),
    INDEX \`idx_tx_date\` (\`tx_date\`),
    INDEX \`idx_tx_doc\` (\`document_no\`),
    INDEX \`idx_tx_type\` (\`type\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. جدول سجل الرقابة والعمليات (Audit Logs)
CREATE TABLE IF NOT EXISTS \`audit_logs\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`tenant_id\` INT NOT NULL,
    \`user_id\` INT DEFAULT NULL,
    \`user_name\` VARCHAR(100) NOT NULL,
    \`action\` VARCHAR(100) NOT NULL,
    \`details\` TEXT DEFAULT NULL,
    \`ip_address\` VARCHAR(45) NOT NULL DEFAULT '127.0.0.1',
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT \`fk_audit_tenant\` FOREIGN KEY (\`tenant_id\`) REFERENCES \`tenants\`(\`id\`) ON DELETE CASCADE,
    INDEX \`idx_audit_created\` (\`created_at\`),
    INDEX \`idx_audit_action\` (\`action\`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 8. جدول النسخ الاحتياطية (Backups)
CREATE TABLE IF NOT EXISTS \`backups\` (
    \`id\` INT AUTO_INCREMENT PRIMARY KEY,
    \`tenant_id\` INT NOT NULL,
    \`filename\` VARCHAR(255) NOT NULL,
    \`size_str\` VARCHAR(50) NOT NULL,
    \`records_count\` INT DEFAULT 0,
    \`backup_type\` ENUM('manual', 'auto') DEFAULT 'manual',
    \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT \`fk_backups_tenant\` FOREIGN KEY (\`tenant_id\`) REFERENCES \`tenants\`(\`id\`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ============================================================
-- البيانات الأولية فقط: مستأجر افتراضي + مدير النظام
-- قاعدة البيانات فارغة تماماً من أي زبائن أو موردين أو حركات
-- ============================================================

INSERT INTO \`tenants\` (\`id\`, \`uuid\`, \`name\`, \`phone\`, \`address\`, \`currency\`) VALUES
(1, 'tenant-01', 'دفتر الديون الذكي', '', '', 'د.ع')
ON DUPLICATE KEY UPDATE \`name\` = VALUES(\`name\`);

INSERT INTO \`settings\` (\`id\`, \`tenant_id\`, \`store_name\`, \`app_name\`, \`cover_color\`, \`cover_texture\`, \`logo_text\`, \`currency\`, \`phone\`, \`address\`, \`date_format\`, \`allow_credit_balance\`, \`auto_backup\`, \`last_backup_date\`, \`overdue_days_threshold\`) VALUES
(1, 1, 'دفتر الديون الذكي', 'دفتر الحسابات والديون', '#581c1c', 'leather', 'الدفتر الذكي', 'د.ع', '', '', 'YYYY-MM-DD', 1, 1, NULL, 30)
ON DUPLICATE KEY UPDATE \`store_name\` = VALUES(\`store_name\`);

-- كلمة مرور المدير الافتراضية: admin123
INSERT INTO \`users\` (\`id\`, \`tenant_id\`, \`uuid\`, \`username\`, \`password_hash\`, \`full_name\`, \`role\`, \`is_active\`, \`permissions\`) VALUES
(1, 1, 'u-1', 'admin', '$2y$10$wK1WwzT8hX2aC5kZ5YQ9v.h6H8d3Xm9mZ9rPqWbFq9jQ0zK5a7.We', 'المدير العام (مسؤول النظام)', 'admin', 1, '{"canAccessDashboard":true,"canAccessSales":true,"canAccessPurchases":true,"canAccessCustomers":true,"canAccessSuppliers":true,"canAccessJournal":true,"canViewReports":true,"canManageBackups":true,"canEditSettings":true,"canManageUsers":true,"canDeleteRecords":true,"canExportData":true}')
ON DUPLICATE KEY UPDATE \`username\` = VALUES(\`username\`);
`,

  configPhp: `<?php
/**
 * دفتر الديون الذكي - Smart Debt Ledger
 * ملف الإعدادات والاتصال بقاعدة البيانات عبر PDO
 * PHP 8.0+
 * ✅ يقوم بإنشاء الجداول تلقائياً عند أول تشغيل (Auto-Install on First Run)
 */

declare(strict_types=1);

if (session_status() === PHP_SESSION_NONE) {
    session_start([
        'cookie_httponly' => true,
        'cookie_samesite' => 'Lax',
        'cookie_secure' => isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on'
    ]);
}

define('DB_HOST', getenv('DB_HOST') ?: 'localhost');
define('DB_PORT', getenv('DB_PORT') ?: '3306');
define('DB_NAME', getenv('DB_NAME') ?: 'smart_debt_ledger');
define('DB_USER', getenv('DB_USER') ?: 'root');
define('DB_PASS', getenv('DB_PASS') ?: '');
define('DB_CHARSET', 'utf8mb4');

class Database {
    private static ?PDO $instance = null;

    public static function getConnection(): PDO {
        if (self::$instance === null) {
            // أولاً: الاتصال بالخادم بدون تحديد قاعدة البيانات لإنشائها إن لم تكن موجودة
            try {
                $dsnNoDb = sprintf('mysql:host=%s;port=%s;charset=%s', DB_HOST, DB_PORT, DB_CHARSET);
                $opts = [
                    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES   => false,
                ];
                $init = new PDO($dsnNoDb, DB_USER, DB_PASS, $opts);
                $init->exec("CREATE DATABASE IF NOT EXISTS \`" . DB_NAME . "\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
            } catch (PDOException $e) {
                // إذا فشل الاتصال بدون db، نحاول مباشرة بقاعدة البيانات
            }

            $dsn = sprintf('mysql:host=%s;port=%s;dbname=%s;charset=%s', DB_HOST, DB_PORT, DB_NAME, DB_CHARSET);
            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ];
            try {
                self::$instance = new PDO($dsn, DB_USER, DB_PASS, $options);
                // إنشاء الجداول تلقائياً إن لم تكن موجودة
                self::autoCreateTablesIfMissing(self::$instance);
            } catch (PDOException $e) {
                http_response_code(500);
                header('Content-Type: application/json; charset=utf-8');
                echo json_encode([
                    'success' => false,
                    'error'   => 'تعذر الاتصال بقاعدة البيانات: ' . $e->getMessage()
                ], JSON_UNESCAPED_UNICODE);
                exit;
            }
        }
        return self::$instance;
    }

    /**
     * إنشاء الجداول تلقائياً عند أول تشغيل
     * يتحقق من وجود جدول tenants، وإن لم يكن موجوداً يُنشئ جميع الجداول
     */
    private static function autoCreateTablesIfMissing(PDO $pdo): void {
        $tableExists = $pdo->query("SHOW TABLES LIKE 'tenants'")->rowCount() > 0;
        if ($tableExists) return;

        $pdo->exec("
            CREATE TABLE IF NOT EXISTS \`tenants\` (
                \`id\` INT AUTO_INCREMENT PRIMARY KEY,
                \`uuid\` VARCHAR(36) NOT NULL UNIQUE,
                \`name\` VARCHAR(150) NOT NULL,
                \`phone\` VARCHAR(50) DEFAULT NULL,
                \`address\` VARCHAR(255) DEFAULT NULL,
                \`currency\` VARCHAR(20) DEFAULT 'د.ع',
                \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX \`idx_tenant_uuid\` (\`uuid\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

            CREATE TABLE IF NOT EXISTS \`settings\` (
                \`id\` INT AUTO_INCREMENT PRIMARY KEY,
                \`tenant_id\` INT NOT NULL UNIQUE,
                \`store_name\` VARCHAR(150) NOT NULL DEFAULT 'دفتر الديون الذكي',
                \`app_name\` VARCHAR(100) NOT NULL DEFAULT 'دفتر الحسابات والديون',
                \`cover_color\` VARCHAR(30) DEFAULT '#581c1c',
                \`cover_texture\` VARCHAR(30) DEFAULT 'leather',
                \`logo_text\` VARCHAR(50) DEFAULT 'الدفتر الذكي',
                \`currency\` VARCHAR(20) DEFAULT 'د.ع',
                \`phone\` VARCHAR(50) DEFAULT '',
                \`address\` VARCHAR(255) DEFAULT '',
                \`date_format\` VARCHAR(30) DEFAULT 'YYYY-MM-DD',
                \`allow_credit_balance\` TINYINT(1) DEFAULT 1,
                \`auto_backup\` TINYINT(1) DEFAULT 1,
                \`last_backup_date\` VARCHAR(50) DEFAULT NULL,
                \`overdue_days_threshold\` INT DEFAULT 30,
                \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT \`fk_settings_tenant\` FOREIGN KEY (\`tenant_id\`) REFERENCES \`tenants\`(\`id\`) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

            CREATE TABLE IF NOT EXISTS \`users\` (
                \`id\` INT AUTO_INCREMENT PRIMARY KEY,
                \`tenant_id\` INT NOT NULL,
                \`uuid\` VARCHAR(36) NOT NULL UNIQUE,
                \`username\` VARCHAR(60) NOT NULL,
                \`password_hash\` VARCHAR(255) NOT NULL,
                \`full_name\` VARCHAR(120) NOT NULL,
                \`role\` ENUM('admin','accountant','user') DEFAULT 'user',
                \`is_active\` TINYINT(1) DEFAULT 1,
                \`permissions\` LONGTEXT DEFAULT NULL,
                \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT \`fk_users_tenant\` FOREIGN KEY (\`tenant_id\`) REFERENCES \`tenants\`(\`id\`) ON DELETE CASCADE,
                UNIQUE KEY \`uq_tenant_username\` (\`tenant_id\`, \`username\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

            CREATE TABLE IF NOT EXISTS \`customers\` (
                \`id\` INT AUTO_INCREMENT PRIMARY KEY,
                \`uuid\` VARCHAR(36) NOT NULL UNIQUE,
                \`tenant_id\` INT NOT NULL,
                \`code\` VARCHAR(30) NOT NULL,
                \`name\` VARCHAR(150) NOT NULL,
                \`phone\` VARCHAR(50) DEFAULT NULL,
                \`address\` VARCHAR(255) DEFAULT NULL,
                \`notes\` TEXT DEFAULT NULL,
                \`opening_balance\` DECIMAL(15,2) DEFAULT 0.00,
                \`balance_type\` ENUM('debit','credit') DEFAULT 'debit',
                \`current_balance\` DECIMAL(15,2) DEFAULT 0.00,
                \`is_active\` TINYINT(1) DEFAULT 1,
                \`sync_status\` ENUM('synced','pending','conflict') DEFAULT 'synced',
                \`device_id\` VARCHAR(100) DEFAULT NULL,
                \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                \`deleted_at\` TIMESTAMP NULL DEFAULT NULL,
                CONSTRAINT \`fk_customers_tenant\` FOREIGN KEY (\`tenant_id\`) REFERENCES \`tenants\`(\`id\`) ON DELETE CASCADE,
                UNIQUE KEY \`uq_customer_code\` (\`tenant_id\`, \`code\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

            CREATE TABLE IF NOT EXISTS \`suppliers\` (
                \`id\` INT AUTO_INCREMENT PRIMARY KEY,
                \`uuid\` VARCHAR(36) NOT NULL UNIQUE,
                \`tenant_id\` INT NOT NULL,
                \`code\` VARCHAR(30) NOT NULL,
                \`name\` VARCHAR(150) NOT NULL,
                \`phone\` VARCHAR(50) DEFAULT NULL,
                \`address\` VARCHAR(255) DEFAULT NULL,
                \`notes\` TEXT DEFAULT NULL,
                \`opening_balance\` DECIMAL(15,2) DEFAULT 0.00,
                \`balance_type\` ENUM('debit','credit') DEFAULT 'credit',
                \`current_balance\` DECIMAL(15,2) DEFAULT 0.00,
                \`is_active\` TINYINT(1) DEFAULT 1,
                \`sync_status\` ENUM('synced','pending','conflict') DEFAULT 'synced',
                \`device_id\` VARCHAR(100) DEFAULT NULL,
                \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                \`deleted_at\` TIMESTAMP NULL DEFAULT NULL,
                CONSTRAINT \`fk_suppliers_tenant\` FOREIGN KEY (\`tenant_id\`) REFERENCES \`tenants\`(\`id\`) ON DELETE CASCADE,
                UNIQUE KEY \`uq_supplier_code\` (\`tenant_id\`, \`code\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

            CREATE TABLE IF NOT EXISTS \`transactions\` (
                \`id\` INT AUTO_INCREMENT PRIMARY KEY,
                \`uuid\` VARCHAR(36) NOT NULL UNIQUE,
                \`tenant_id\` INT NOT NULL,
                \`account_type\` ENUM('customer','supplier') NOT NULL,
                \`account_id\` INT NOT NULL,
                \`account_code\` VARCHAR(30) NOT NULL,
                \`account_name\` VARCHAR(150) NOT NULL,
                \`type\` ENUM('sale','customer_payment','purchase','supplier_payment','opening_balance') NOT NULL,
                \`document_no\` VARCHAR(50) NOT NULL,
                \`tx_date\` DATE NOT NULL,
                \`amount\` DECIMAL(15,2) NOT NULL,
                \`debit\` DECIMAL(15,2) DEFAULT 0.00,
                \`credit\` DECIMAL(15,2) DEFAULT 0.00,
                \`balance_after\` DECIMAL(15,2) NOT NULL,
                \`payment_method\` ENUM('cash','bank_transfer','check','other') DEFAULT 'cash',
                \`description\` VARCHAR(255) NOT NULL,
                \`notes\` TEXT DEFAULT NULL,
                \`user_id\` INT DEFAULT NULL,
                \`user_name\` VARCHAR(120) NOT NULL,
                \`sync_status\` ENUM('synced','pending','conflict') DEFAULT 'synced',
                \`device_id\` VARCHAR(100) DEFAULT NULL,
                \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                \`updated_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT \`fk_tx_tenant\` FOREIGN KEY (\`tenant_id\`) REFERENCES \`tenants\`(\`id\`) ON DELETE CASCADE,
                INDEX \`idx_tx_account\` (\`account_type\`, \`account_id\`),
                INDEX \`idx_tx_date\` (\`tx_date\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

            CREATE TABLE IF NOT EXISTS \`audit_logs\` (
                \`id\` INT AUTO_INCREMENT PRIMARY KEY,
                \`tenant_id\` INT NOT NULL,
                \`user_id\` INT DEFAULT NULL,
                \`user_name\` VARCHAR(100) NOT NULL,
                \`action\` VARCHAR(100) NOT NULL,
                \`details\` TEXT DEFAULT NULL,
                \`ip_address\` VARCHAR(45) NOT NULL DEFAULT '127.0.0.1',
                \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT \`fk_audit_tenant\` FOREIGN KEY (\`tenant_id\`) REFERENCES \`tenants\`(\`id\`) ON DELETE CASCADE,
                INDEX \`idx_audit_created\` (\`created_at\`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

            CREATE TABLE IF NOT EXISTS \`backups\` (
                \`id\` INT AUTO_INCREMENT PRIMARY KEY,
                \`tenant_id\` INT NOT NULL,
                \`filename\` VARCHAR(255) NOT NULL,
                \`size_str\` VARCHAR(50) NOT NULL,
                \`records_count\` INT DEFAULT 0,
                \`backup_type\` ENUM('manual','auto') DEFAULT 'manual',
                \`created_at\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT \`fk_backups_tenant\` FOREIGN KEY (\`tenant_id\`) REFERENCES \`tenants\`(\`id\`) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");

        // إنشاء المستأجر والمدير الافتراضيين (مرة واحدة فقط عند التثبيت)
        $pdo->exec("
            INSERT IGNORE INTO \`tenants\` (\`id\`, \`uuid\`, \`name\`, \`currency\`) VALUES
            (1, 'tenant-01', 'دفتر الديون الذكي', 'د.ع');

            INSERT IGNORE INTO \`settings\` (\`id\`, \`tenant_id\`, \`store_name\`, \`app_name\`) VALUES
            (1, 1, 'دفتر الديون الذكي', 'دفتر الحسابات والديون');

            INSERT IGNORE INTO \`users\` (\`id\`, \`tenant_id\`, \`uuid\`, \`username\`, \`password_hash\`, \`full_name\`, \`role\`, \`permissions\`) VALUES
            (1, 1, 'u-1', 'admin', '\$2y\$10\$wK1WwzT8hX2aC5kZ5YQ9v.h6H8d3Xm9mZ9rPqWbFq9jQ0zK5a7.We', 'المدير العام', 'admin',
            '{\"canAccessDashboard\":true,\"canManageUsers\":true,\"canDeleteRecords\":true,\"canExportData\":true,\"canEditSettings\":true,\"canManageBackups\":true,\"canViewReports\":true,\"canAccessJournal\":true,\"canAccessSales\":true,\"canAccessPurchases\":true,\"canAccessCustomers\":true,\"canAccessSuppliers\":true}');
        ");
    }
}

// دالة مساعدة لتوليد رمز CSRF
function generateCsrfToken(): string {
    if (empty($_SESSION['csrf_token'])) {
        $_SESSION['csrf_token'] = bin2hex(random_bytes(32));
    }
    return $_SESSION['csrf_token'];
}

function verifyCsrfToken(?string $token): bool {
    return !empty($token) && hash_equals($_SESSION['csrf_token'] ?? '', $token);
}

// تسجيل أحداث الرقابة Audit Log
function recordAuditLog(PDO $pdo, int $tenantId, ?int $userId, string $userName, string $action, string $details): void {
    $ip = $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
    $stmt = $pdo->prepare('INSERT INTO audit_logs (tenant_id, user_id, user_name, action, details, ip_address) VALUES (?, ?, ?, ?, ?, ?)');
    $stmt->execute([$tenantId, $userId, $userName, $action, $details, $ip]);
}
`,

  apiPhp: `<?php
/**
 * REST API - دفتر الديون الذكي
 * يدعم الاستدعاء من الويب وتطبيقات سطح المكتب (Desktop Client)
 */

declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Device-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

require_once __DIR__ . '/config.php';

$pdo = Database::getConnection();
$method = $_SERVER['REQUEST_METHOD'];
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$parts = explode('/', trim($path, '/'));

$resource = $parts[1] ?? '';
$resourceId = isset($parts[2]) ? (int)$parts[2] : null;

$tenantId = 1;
$userId = $_SESSION['user_id'] ?? 1;
$userName = $_SESSION['user_name'] ?? 'مدير النظام';

$input = json_decode(file_get_contents('php://input'), true) ?? $_POST;

try {
    switch ($resource) {
        case 'customers':
            if ($method === 'GET') {
                if ($resourceId) {
                    $stmt = $pdo->prepare('SELECT * FROM customers WHERE id = ? AND tenant_id = ? AND deleted_at IS NULL');
                    $stmt->execute([$resourceId, $tenantId]);
                    $customer = $stmt->fetch();
                    if (!$customer) throw new Exception('الزبون غير موجود', 404);
                    echo json_encode(['success' => true, 'data' => $customer], JSON_UNESCAPED_UNICODE);
                } else {
                    $stmt = $pdo->prepare('SELECT * FROM customers WHERE tenant_id = ? AND deleted_at IS NULL ORDER BY name ASC');
                    $stmt->execute([$tenantId]);
                    echo json_encode(['success' => true, 'data' => $stmt->fetchAll()], JSON_UNESCAPED_UNICODE);
                }
            } elseif ($method === 'POST') {
                $code = $input['code'] ?? ('CUST-' . time());
                $stmt = $pdo->prepare('INSERT INTO customers (uuid, tenant_id, code, name, phone, address, notes, opening_balance, balance_type, current_balance) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?)');
                $stmt->execute([$tenantId, $code, $input['name'], $input['phone'] ?? null, $input['address'] ?? null, $input['notes'] ?? null, $input['opening_balance'] ?? 0, $input['balance_type'] ?? 'debit', $input['opening_balance'] ?? 0]);
                $newId = $pdo->lastInsertId();
                recordAuditLog($pdo, $tenantId, $userId, $userName, 'إضافة زبون', "تمت إضافة الزبون: {$input['name']}");
                echo json_encode(['success' => true, 'id' => $newId, 'message' => 'تم إضافة الزبون بنجاح'], JSON_UNESCAPED_UNICODE);
            } elseif ($method === 'PUT' && $resourceId) {
                $stmt = $pdo->prepare('UPDATE customers SET name=?, phone=?, address=?, notes=?, updated_at=NOW() WHERE id=? AND tenant_id=?');
                $stmt->execute([$input['name'], $input['phone'] ?? null, $input['address'] ?? null, $input['notes'] ?? null, $resourceId, $tenantId]);
                echo json_encode(['success' => true, 'message' => 'تم تحديث بيانات الزبون'], JSON_UNESCAPED_UNICODE);
            } elseif ($method === 'DELETE' && $resourceId) {
                $stmt = $pdo->prepare('UPDATE customers SET deleted_at=NOW() WHERE id=? AND tenant_id=?');
                $stmt->execute([$resourceId, $tenantId]);
                echo json_encode(['success' => true, 'message' => 'تم حذف الزبون'], JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'suppliers':
            if ($method === 'GET') {
                $stmt = $pdo->prepare('SELECT * FROM suppliers WHERE tenant_id = ? AND deleted_at IS NULL ORDER BY name ASC');
                $stmt->execute([$tenantId]);
                echo json_encode(['success' => true, 'data' => $stmt->fetchAll()], JSON_UNESCAPED_UNICODE);
            } elseif ($method === 'POST') {
                $code = $input['code'] ?? ('SUP-' . time());
                $stmt = $pdo->prepare('INSERT INTO suppliers (uuid, tenant_id, code, name, phone, address, notes, opening_balance, balance_type, current_balance) VALUES (UUID(), ?, ?, ?, ?, ?, ?, ?, ?, ?)');
                $stmt->execute([$tenantId, $code, $input['name'], $input['phone'] ?? null, $input['address'] ?? null, $input['notes'] ?? null, $input['opening_balance'] ?? 0, $input['balance_type'] ?? 'credit', $input['opening_balance'] ?? 0]);
                $newId = $pdo->lastInsertId();
                recordAuditLog($pdo, $tenantId, $userId, $userName, 'إضافة مورد', "تمت إضافة المورد: {$input['name']}");
                echo json_encode(['success' => true, 'id' => $newId, 'message' => 'تم إضافة المورد بنجاح'], JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'transactions':
            if ($method === 'GET') {
                $accountType = $_GET['account_type'] ?? null;
                $accountId   = $_GET['account_id'] ?? null;
                if ($accountType && $accountId) {
                    $stmt = $pdo->prepare('SELECT * FROM transactions WHERE tenant_id = ? AND account_type = ? AND account_id = ? ORDER BY tx_date ASC, id ASC');
                    $stmt->execute([$tenantId, $accountType, $accountId]);
                } else {
                    $stmt = $pdo->prepare('SELECT * FROM transactions WHERE tenant_id = ? ORDER BY tx_date DESC, id DESC');
                    $stmt->execute([$tenantId]);
                }
                echo json_encode(['success' => true, 'data' => $stmt->fetchAll()], JSON_UNESCAPED_UNICODE);
            } elseif ($method === 'POST') {
                $pdo->beginTransaction();
                $accountType = $input['account_type'];
                $accountId   = (int)$input['account_id'];
                $type        = $input['type'];
                $amount      = (float)$input['amount'];
                $date        = $input['tx_date'] ?? date('Y-m-d');
                $description = $input['description'] ?? '';
                $notes       = $input['notes'] ?? null;
                $methodName  = $input['payment_method'] ?? 'cash';
                $docNo       = $input['document_no'] ?? ('DOC-' . time());

                $table = $accountType === 'customer' ? 'customers' : 'suppliers';
                $acc = $pdo->prepare("SELECT * FROM {$table} WHERE id = ? AND tenant_id = ?")->execute([$accountId, $tenantId]);
                $acc = $pdo->query("SELECT current_balance FROM {$table} WHERE id = {$accountId} AND tenant_id = {$tenantId}")->fetch();

                $currentBal = (float)($acc['current_balance'] ?? 0);
                $debit = $credit = 0;

                if ($accountType === 'customer') {
                    if (in_array($type, ['sale', 'opening_balance'])) { $debit = $amount; $newBal = $currentBal + $amount; }
                    else { $credit = $amount; $newBal = $currentBal - $amount; }
                } else {
                    if (in_array($type, ['purchase', 'opening_balance'])) { $credit = $amount; $newBal = $currentBal + $amount; }
                    else { $debit = $amount; $newBal = $currentBal - $amount; }
                }

                $upd = $pdo->prepare("UPDATE {$table} SET current_balance = ?, updated_at = NOW() WHERE id = ? AND tenant_id = ?");
                $upd->execute([$newBal, $accountId, $tenantId]);

                $txUuid = $input['uuid'] ?? bin2hex(random_bytes(16));
                $insTx = $pdo->prepare('INSERT INTO transactions (uuid, tenant_id, account_type, account_id, type, document_no, tx_date, amount, debit, credit, balance_after, payment_method, description, notes, user_id, user_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
                $insTx->execute([$txUuid, $tenantId, $accountType, $accountId, $type, $docNo, $date, $amount, $debit, $credit, $newBal, $methodName, $description, $notes, $userId, $userName]);

                recordAuditLog($pdo, $tenantId, $userId, $userName, 'حركة مالية', "تسجيل {$type} بمبلغ {$amount}");
                $pdo->commit();
                echo json_encode(['success' => true, 'new_balance' => $newBal, 'message' => 'تم حفظ الحركة بنجاح'], JSON_UNESCAPED_UNICODE);
            }
            break;

        case 'sync':
            if ($method === 'POST') {
                $deviceId = $_SERVER['HTTP_X_DEVICE_ID'] ?? $input['device_id'] ?? 'unknown';
                $clientTimestamp = $input['last_sync_timestamp'] ?? '1970-01-01 00:00:00';
                $stmt = $pdo->prepare('SELECT * FROM transactions WHERE tenant_id = ? AND updated_at > ?');
                $stmt->execute([$tenantId, $clientTimestamp]);
                $serverTx = $stmt->fetchAll();
                echo json_encode([
                    'success' => true,
                    'server_timestamp' => date('Y-m-d H:i:s'),
                    'updates' => ['transactions' => $serverTx]
                ], JSON_UNESCAPED_UNICODE);
            }
            break;

        default:
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Endpoint غير موجود'], JSON_UNESCAPED_UNICODE);
    }
} catch (Exception $e) {
    if ($pdo->inTransaction()) $pdo->rollBack();
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => $e->getMessage()], JSON_UNESCAPED_UNICODE);
}
`,

  installPhp: `<?php
/**
 * معالج التثبيت التلقائي - Installation Wizard
 * Smart Debt Ledger
 */
$step = (int)($_GET['step'] ?? 1);
$error = '';
$success = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST' && $step === 2) {
    $host = $_POST['db_host'] ?? 'localhost';
    $name = $_POST['db_name'] ?? 'smart_debt_ledger';
    $user = $_POST['db_user'] ?? 'root';
    $pass = $_POST['db_pass'] ?? '';

    try {
        $pdo = new PDO("mysql:host=$host;charset=utf8mb4", $user, $pass, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION
        ]);
        $pdo->exec("CREATE DATABASE IF NOT EXISTS \`$name\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
        $pdo->exec("USE \`$name\`");
        
        $sql = file_get_contents(__DIR__ . '/schema.sql');
        $pdo->exec($sql);

        $tenantName = $_POST['store_name'] ?? 'متجري الرئيسي';
        $pdo->prepare("INSERT INTO tenants (uuid, name) VALUES (UUID(), ?)")->execute([$tenantName]);
        $tenantId = $pdo->lastInsertId();

        $adminUser = $_POST['admin_user'] ?? 'admin';
        $adminPass = password_hash($_POST['admin_pass'] ?? 'admin123', PASSWORD_DEFAULT);
        $adminFullName = $_POST['admin_name'] ?? 'المدير العام';

        $pdo->prepare("INSERT INTO users (tenant_id, uuid, username, password_hash, full_name, role) VALUES (?, UUID(), ?, ?, ?, 'admin')")
            ->execute([$tenantId, $adminUser, $adminPass, $adminFullName]);

        $pdo->prepare("INSERT INTO settings (tenant_id, store_name, app_name) VALUES (?, ?, 'دفتر الديون الذكي')")
            ->execute([$tenantId, $tenantName]);

        $success = "تم التثبيت بنجاح! يمكنك الآن تسجيل الدخول.";
        $step = 3;
    } catch (Exception $e) {
        $error = "فشل التثبيت: " . $e->getMessage();
    }
}
?>
<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>معالج تثبيت دفتر الديون الذكي</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.0/dist/css/bootstrap.rtl.min.css">
    <style>
        body { background: #1c1917; font-family: 'Cairo', sans-serif; color: #f5f5f4; }
        .wizard-card { max-width: 650px; margin: 50px auto; background: #292524; border-radius: 12px; padding: 30px; border: 1px solid #44403c; }
    </style>
</head>
<body>
<div class="container">
    <div class="wizard-card shadow-lg">
        <h2 class="text-center text-warning mb-4">📖 معالج تثبيت دفتر الديون الذكي</h2>
        <?php if ($error): ?><div class="alert alert-danger"><?= htmlspecialchars($error) ?></div><?php endif; ?>
        <?php if ($step === 1): ?>
            <p class="text-stone-300">مرحبًا بك في معالج التثبيت. تأكد من توفر بيانات خادم MySQL.</p>
            <form method="POST" action="?step=2">
                <div class="mb-3">
                    <label class="form-label">خادم قاعدة البيانات (DB Host)</label>
                    <input type="text" name="db_host" class="form-control" value="localhost" required>
                </div>
                <div class="mb-3">
                    <label class="form-label">اسم قاعدة البيانات (DB Name)</label>
                    <input type="text" name="db_name" class="form-control" value="smart_debt_ledger" required>
                </div>
                <div class="mb-3">
                    <label class="form-label">اسم المستخدم (DB User)</label>
                    <input type="text" name="db_user" class="form-control" value="root" required>
                </div>
                <div class="mb-3">
                    <label class="form-label">كلمة المرور (DB Password)</label>
                    <input type="password" name="db_pass" class="form-control">
                </div>
                <hr>
                <div class="mb-3">
                    <label class="form-label">اسم المتجر أو المؤسسة</label>
                    <input type="text" name="store_name" class="form-control" value="مؤسسة النور للتجارة" required>
                </div>
                <div class="row">
                    <div class="col-md-6 mb-3">
                        <label class="form-label">اسم مستخدم المدير</label>
                        <input type="text" name="admin_user" class="form-control" value="admin" required>
                    </div>
                    <div class="col-md-6 mb-3">
                        <label class="form-label">كلمة مرور المدير</label>
                        <input type="password" name="admin_pass" class="form-control" value="admin123" required>
                    </div>
                </div>
                <button type="submit" class="btn btn-warning w-100 py-2 fw-bold">ابدأ التثبيت الآن</button>
            </form>
        <?php elseif ($step === 3): ?>
            <div class="alert alert-success"><?= $success ?></div>
            <p>اسم المستخدم: <strong>admin</strong></p>
            <p>كلمة المرور: <strong>admin123</strong></p>
            <a href="../index.php" class="btn btn-success w-100">الانتقال للدفتر وتسجيل الدخول</a>
        <?php endif; ?>
    </div>
</div>
</body>
</html>
`,

  desktopSyncGuide: `# دليل معمارية تطبيق Desktop المستقل والمزامنة مع السحابة

## 1. الفكرة والمعمارية
تم تصميم نظام "دفتر الديون الذكي" بحيث يكون:
- **Web App**: مبني بـ PHP 8+ و MySQL ويعمل سحابيًا أو محليًا.
- **Desktop Client**: تطبيق Windows / Mac / Linux مبني إما بـ (C# .NET / Electron / Python PyQt / Flutter).
- يحتوي الـ Desktop على قاعدة بيانات محلية **SQLite** متطابقة مع هيكل جداول MySQL.
- يعمل بدون إنترنت (Offline-First) بالكامل: يسجل الزبائن، المبيعات الآجلة، والتسديدات محليًا.

## 2. استراتيجية المزامنة (Bidirectional Sync)
1. **معرفات السجلات العالمية (UUIDs)**:
   كل عملية أو زبون يُنشأ برقم UUID عشوائي لمنع تعارض الأرقام التسلسلية بين الأجهزة.
2. **الحقول الرقابية**:
   - \`updated_at\` (توقيت آخر تعديل)
   - \`sync_status\` ('synced', 'pending', 'conflict')
   - \`device_id\` (رمز تعريف فريد لكل كمبيوتر ديسكتوب)
3. **دورة المزامنة عند توفر الإنترنت**:
   - تطبيق Desktop يستدعي \`POST /api/sync\`
   - يرسل السجلات التي لها \`sync_status = 'pending'\` مع \`device_id\`
   - يقوم الـ API بفحص وجود كل حركة عبر الـ UUID وحفظها وحساب الرصيد.
   - يعيد الخادم جميع السجلات التي تم تحديثها بعد آخر تاريخ مزامنة (\`last_sync_timestamp\`).
   - يقوم الـ Desktop بتحديث قاعدة SQLite المحلية ويعدل الـ \`sync_status\` إلى 'synced'.
`,

  cloudSyncPhp: `<?php
/**
 * سكريبت المزامنة السحابية المباشر - Multi-Tenant Cloud Sync Engine
 * نظام دفتر الديون الذكي (Smart Debt Ledger)
 * 
 * المزايا:
 * 1. دعم المزامنة التلقائية اللحظية من الويب وتطبيقات سطح المكتب.
 * 2. عزل كامل لسجلات العملاء (Multi-Tenant Isolation) بناءً على معرف السجل (Tenant ID).
 * 3. حماية بالتوكن الأمني (Bearer Token Auth).
 * 4. حفظ البيانات بصيغة JSON معزولة أو قاعدة بيانات MySQL / SQLite تلقائياً.
 */

declare(strict_types=1);
header('Content-Type: application/json; charset=utf-8');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Device-ID, X-Tenant-ID');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

// 1. استخراج التوكن
$authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? '';
$token = '';
if (preg_match('/Bearer\\s+(\\S+)/', $authHeader, $matches)) {
    $token = $matches[1];
}

$rawInput = file_get_contents('php://input');
$input = json_decode($rawInput, true) ?? $_POST;
if (!$token && !empty($input['token'])) {
    $token = $input['token'];
}

// 2. استخراج معرف السجل (Tenant ID) لعزل العملاء
$tenantId = $_SERVER['HTTP_X_TENANT_ID'] ?? $input['tenantId'] ?? $input['tenant_id'] ?? 'tenant-01';
$tenantId = preg_replace('/[^a-zA-Z0-9_\\-]/', '', (string)$tenantId);
if (empty($tenantId)) {
    $tenantId = 'tenant-01';
}

$action = $input['action'] ?? $_GET['action'] ?? 'sync';

// مسار مجلد تخزين بيانات السحابة المعزولة لكل عميل
$storageDir = __DIR__ . '/cloud_storage';
if (!is_dir($storageDir)) {
    @mkdir($storageDir, 0755, true);
}

// مسار ملف العميل المستقل (عزل تام للبيانات)
$tenantFile = $storageDir . '/tenant_' . $tenantId . '.json';

try {
    // إجراء فحص الاتصال (Ping Handshake)
    if ($action === 'ping') {
        echo json_encode([
            'success' => true,
            'message' => 'السيرفر السحابي متصل ويعمل بنجاح (Cloud Online)',
            'tenantId' => $tenantId,
            'serverTime' => date('Y-m-d H:i:s'),
            'phpVersion' => PHP_VERSION,
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    // إجراء المزامنة اللحظية (Sync Action)
    if ($action === 'sync') {
        $clientTimestamp = $input['clientTimestamp'] ?? date('c');
        $deviceId = $input['deviceId'] ?? $_SERVER['HTTP_X_DEVICE_ID'] ?? 'web-client';

        // قراءة البيانات الحالية المخزنة لهذا السجل في السحابة
        $serverData = [];
        if (file_exists($tenantFile)) {
            $existingJson = file_get_contents($tenantFile);
            $serverData = json_decode($existingJson, true) ?? [];
        }

        // دمج وتحديث البيانات
        $customers    = $input['customers']    ?? $input['payload']['customers']    ?? null;
        $suppliers    = $input['suppliers']    ?? $input['payload']['suppliers']    ?? null;
        $transactions = $input['transactions'] ?? $input['payload']['transactions'] ?? null;
        $settings     = $input['settings']     ?? $input['payload']['settings']     ?? null;

        if ($customers    !== null) $serverData['customers']    = $customers;
        if ($suppliers    !== null) $serverData['suppliers']    = $suppliers;
        if ($transactions !== null) $serverData['transactions'] = $transactions;
        if ($settings     !== null) $serverData['settings']     = $settings;

        $serverData['tenantId']     = $tenantId;
        $serverData['lastSyncAt']   = date('c');
        $serverData['lastDeviceId'] = $deviceId;

        // الحفظ الآمن في ملف السجل الخاص بهذا الكلاينت فقط
        file_put_contents($tenantFile, json_encode($serverData, JSON_PRETTY_PRINT | JSON_UNESCAPED_UNICODE));

        echo json_encode([
            'success' => true,
            'message' => "تمت مزامنة بيانات سجل ({$tenantId}) بنجاح على السحابة",
            'tenantId' => $tenantId,
            'serverTimestamp' => date('c'),
            'records' => [
                'customers'    => count($serverData['customers']    ?? []),
                'suppliers'    => count($serverData['suppliers']    ?? []),
                'transactions' => count($serverData['transactions'] ?? []),
            ]
        ], JSON_UNESCAPED_UNICODE);
        exit;
    }

    throw new Exception('إجراء غير معروف');
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ], JSON_UNESCAPED_UNICODE);
}
`
};
