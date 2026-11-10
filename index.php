<?php
declare(strict_types=1);

/**
 * Entry Point Utama Eco-LogiX
 * Memuat konfigurasi database, mengambil state awal MySQL, dan merakit komponen View.
 */
session_start();
require_once __DIR__ . '/config/database.php';
require_once __DIR__ . '/app/Models/StateModel.php';

$initialStateJson = 'null';
try {
    $pdo = getDbConnection();
    $initialStateJson = json_encode(StateModel::getFullState($pdo), JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
} catch (Throwable $e) {
    $initialStateJson = 'null';
}

require __DIR__ . '/views/layouts/head.php';
?>
<body>

  <?php require __DIR__ . '/views/layouts/modals.php'; ?>
  <?php require __DIR__ . '/views/auth/login_register.php'; ?>

  <div id="app-authenticated-shell" class="pb-24" hidden>
    <?php require __DIR__ . '/views/layouts/header.php'; ?>

    <main class="max-w-5xl mx-auto px-4 py-5">
      <?php require __DIR__ . '/views/pengirim/index.php'; ?>
      <?php require __DIR__ . '/views/kurir/index.php'; ?>
      <?php require __DIR__ . '/views/vendor/index.php'; ?>
    </main>

    <?php require __DIR__ . '/views/layouts/bottom_nav.php'; ?>
  </div>

  <?php require __DIR__ . '/views/layouts/scripts.php'; ?>
</body>
</html>
