<?php
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
                $init->exec("CREATE DATABASE IF NOT EXISTS `" . DB_NAME . "` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
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
            CREATE TABLE IF NOT EXISTS `tenants` (
                `id` INT AUTO_INCREMENT PRIMARY KEY,
                `uuid` VARCHAR(36) NOT NULL UNIQUE,
                `name` VARCHAR(150) NOT NULL,
                `phone` VARCHAR(50) DEFAULT NULL,
                `address` VARCHAR(255) DEFAULT NULL,
                `currency` VARCHAR(20) DEFAULT 'د.ع',
                `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                INDEX `idx_tenant_uuid` (`uuid`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

            CREATE TABLE IF NOT EXISTS `settings` (
                `id` INT AUTO_INCREMENT PRIMARY KEY,
                `tenant_id` INT NOT NULL UNIQUE,
                `store_name` VARCHAR(150) NOT NULL DEFAULT 'دفتر الديون الذكي',
                `app_name` VARCHAR(100) NOT NULL DEFAULT 'دفتر الحسابات والديون',
                `cover_color` VARCHAR(30) DEFAULT '#581c1c',
                `cover_texture` VARCHAR(30) DEFAULT 'leather',
                `logo_text` VARCHAR(50) DEFAULT 'الدفتر الذكي',
                `currency` VARCHAR(20) DEFAULT 'د.ع',
                `phone` VARCHAR(50) DEFAULT '',
                `address` VARCHAR(255) DEFAULT '',
                `date_format` VARCHAR(30) DEFAULT 'YYYY-MM-DD',
                `allow_credit_balance` TINYINT(1) DEFAULT 1,
                `auto_backup` TINYINT(1) DEFAULT 1,
                `last_backup_date` VARCHAR(50) DEFAULT NULL,
                `overdue_days_threshold` INT DEFAULT 30,
                `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT `fk_settings_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

            CREATE TABLE IF NOT EXISTS `users` (
                `id` INT AUTO_INCREMENT PRIMARY KEY,
                `tenant_id` INT NOT NULL,
                `uuid` VARCHAR(36) NOT NULL UNIQUE,
                `username` VARCHAR(60) NOT NULL,
                `password_hash` VARCHAR(255) NOT NULL,
                `full_name` VARCHAR(120) NOT NULL,
                `role` ENUM('admin','accountant','user') DEFAULT 'user',
                `is_active` TINYINT(1) DEFAULT 1,
                `permissions` LONGTEXT DEFAULT NULL,
                `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT `fk_users_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE,
                UNIQUE KEY `uq_tenant_username` (`tenant_id`, `username`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

            CREATE TABLE IF NOT EXISTS `customers` (
                `id` INT AUTO_INCREMENT PRIMARY KEY,
                `uuid` VARCHAR(36) NOT NULL UNIQUE,
                `tenant_id` INT NOT NULL,
                `code` VARCHAR(30) NOT NULL,
                `name` VARCHAR(150) NOT NULL,
                `phone` VARCHAR(50) DEFAULT NULL,
                `address` VARCHAR(255) DEFAULT NULL,
                `notes` TEXT DEFAULT NULL,
                `opening_balance` DECIMAL(15,2) DEFAULT 0.00,
                `balance_type` ENUM('debit','credit') DEFAULT 'debit',
                `current_balance` DECIMAL(15,2) DEFAULT 0.00,
                `is_active` TINYINT(1) DEFAULT 1,
                `sync_status` ENUM('synced','pending','conflict') DEFAULT 'synced',
                `device_id` VARCHAR(100) DEFAULT NULL,
                `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                `deleted_at` TIMESTAMP NULL DEFAULT NULL,
                CONSTRAINT `fk_customers_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE,
                UNIQUE KEY `uq_customer_code` (`tenant_id`, `code`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

            CREATE TABLE IF NOT EXISTS `suppliers` (
                `id` INT AUTO_INCREMENT PRIMARY KEY,
                `uuid` VARCHAR(36) NOT NULL UNIQUE,
                `tenant_id` INT NOT NULL,
                `code` VARCHAR(30) NOT NULL,
                `name` VARCHAR(150) NOT NULL,
                `phone` VARCHAR(50) DEFAULT NULL,
                `address` VARCHAR(255) DEFAULT NULL,
                `notes` TEXT DEFAULT NULL,
                `opening_balance` DECIMAL(15,2) DEFAULT 0.00,
                `balance_type` ENUM('debit','credit') DEFAULT 'credit',
                `current_balance` DECIMAL(15,2) DEFAULT 0.00,
                `is_active` TINYINT(1) DEFAULT 1,
                `sync_status` ENUM('synced','pending','conflict') DEFAULT 'synced',
                `device_id` VARCHAR(100) DEFAULT NULL,
                `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                `deleted_at` TIMESTAMP NULL DEFAULT NULL,
                CONSTRAINT `fk_suppliers_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE,
                UNIQUE KEY `uq_supplier_code` (`tenant_id`, `code`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

            CREATE TABLE IF NOT EXISTS `transactions` (
                `id` INT AUTO_INCREMENT PRIMARY KEY,
                `uuid` VARCHAR(36) NOT NULL UNIQUE,
                `tenant_id` INT NOT NULL,
                `account_type` ENUM('customer','supplier') NOT NULL,
                `account_id` INT NOT NULL,
                `account_code` VARCHAR(30) NOT NULL,
                `account_name` VARCHAR(150) NOT NULL,
                `type` ENUM('sale','customer_payment','purchase','supplier_payment','opening_balance') NOT NULL,
                `document_no` VARCHAR(50) NOT NULL,
                `tx_date` DATE NOT NULL,
                `amount` DECIMAL(15,2) NOT NULL,
                `debit` DECIMAL(15,2) DEFAULT 0.00,
                `credit` DECIMAL(15,2) DEFAULT 0.00,
                `balance_after` DECIMAL(15,2) NOT NULL,
                `payment_method` ENUM('cash','bank_transfer','check','other') DEFAULT 'cash',
                `description` VARCHAR(255) NOT NULL,
                `notes` TEXT DEFAULT NULL,
                `user_id` INT DEFAULT NULL,
                `user_name` VARCHAR(120) NOT NULL,
                `sync_status` ENUM('synced','pending','conflict') DEFAULT 'synced',
                `device_id` VARCHAR(100) DEFAULT NULL,
                `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                CONSTRAINT `fk_tx_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE,
                INDEX `idx_tx_account` (`account_type`, `account_id`),
                INDEX `idx_tx_date` (`tx_date`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

            CREATE TABLE IF NOT EXISTS `audit_logs` (
                `id` INT AUTO_INCREMENT PRIMARY KEY,
                `tenant_id` INT NOT NULL,
                `user_id` INT DEFAULT NULL,
                `user_name` VARCHAR(100) NOT NULL,
                `action` VARCHAR(100) NOT NULL,
                `details` TEXT DEFAULT NULL,
                `ip_address` VARCHAR(45) NOT NULL DEFAULT '127.0.0.1',
                `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT `fk_audit_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE,
                INDEX `idx_audit_created` (`created_at`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

            CREATE TABLE IF NOT EXISTS `backups` (
                `id` INT AUTO_INCREMENT PRIMARY KEY,
                `tenant_id` INT NOT NULL,
                `filename` VARCHAR(255) NOT NULL,
                `size_str` VARCHAR(50) NOT NULL,
                `records_count` INT DEFAULT 0,
                `backup_type` ENUM('manual','auto') DEFAULT 'manual',
                `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT `fk_backups_tenant` FOREIGN KEY (`tenant_id`) REFERENCES `tenants`(`id`) ON DELETE CASCADE
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
        ");

        // إنشاء المستأجر والمدير الافتراضيين (مرة واحدة فقط عند التثبيت)
        $pdo->exec("
            INSERT IGNORE INTO `tenants` (`id`, `uuid`, `name`, `currency`) VALUES
            (1, 'tenant-01', 'دفتر الديون الذكي', 'د.ع');

            INSERT IGNORE INTO `settings` (`id`, `tenant_id`, `store_name`, `app_name`) VALUES
            (1, 1, 'دفتر الديون الذكي', 'دفتر الحسابات والديون');

            INSERT IGNORE INTO `users` (`id`, `tenant_id`, `uuid`, `username`, `password_hash`, `full_name`, `role`, `permissions`) VALUES
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
