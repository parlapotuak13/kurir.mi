# Eco-LogiX — Arsitektur Modular (PHP + MySQL)

Proyek aplikasi web **Eco-LogiX** dengan struktur folder modular berbasis **MVC (Models, Views, Controllers)** dan pemisahan aset CSS/JS per fitur untuk mempermudah pemeliharaan serta pengeditan kode.

## Peta Struktur Folder

```text
eco-logix-php-modular/
├── index.php                           # Entry point halaman utama
├── api.php                             # Router REST API utama
├── .htaccess                           # Konfigurasi server Apache
│
├── config/                             # [1] KONFIGURASI SISTEM & DATABASE
│   ├── constants.php                   # Konstanta kapasitas kurir & parameter sistem
│   └── database.php                    # Koneksi PDO MySQL (DB_HOST, DB_NAME, DB_USER, DB_PASS)
│
├── database/                           # [2] SKEMA & MIGRASI DATABASE MYSQL
│   ├── database.sql                    # File SQL lengkap siap import di phpMyAdmin
│   ├── schema.sql                      # Struktur tabel (users, shipments, system_state, vendor_history, handover_logs)
│   ├── seed.sql                        # Data awal bawaan
│   └── migrator.php                    # Pembuat database & tabel otomatis
│
├── app/                                # [3] LOGIKA BACKEND PHP (MODELS & CONTROLLERS)
│   ├── Models/
│   │   ├── UserModel.php               # Query tabel `users`
│   │   ├── ShipmentModel.php           # Query tabel `shipments` (Berat CMEM & Dimensi P×L×T)
│   │   ├── StateModel.php              # Query tabel `system_state`
│   │   ├── VendorModel.php             # Query tabel `vendor_history`
│   │   └── HandoverModel.php           # Query tabel `handover_logs`
│   │
│   └── Controllers/
│       ├── AuthController.php          # Proses Login, Register, & Logout
│       ├── ShipmentController.php      # Proses pembuatan resi, pilih resi, & update tahap
│       ├── CourierController.php       # Proses update kurir, progres rute, & verifikasi OTP
│       ├── VendorController.php        # Proses update kebijakan δ, detour, & keputusan Setuju/Tolak
│       └── SystemController.php        # Proses update bobot fungsi objektif α/β & reset data
│
├── views/                              # [4] KOMPONEN TAMPILAN HTML/PHP PER BAGIAN
│   ├── layouts/
│   │   ├── head.php                    # Tag <head> & pemuatan pustaka
│   │   ├── header.php                  # Navigasi atas & profil pengguna aktif
│   │   ├── bottom_nav.php              # Navigasi bawah untuk tiap peran
│   │   ├── modals.php                  # Komponen notifikasi Toast & modal konfirmasi Reset
│   │   └── scripts.php                 # Pemuatan seluruh modul JavaScript
│   │
│   ├── auth/
│   │   └── login_register.php          # Tampilan halaman Masuk & Daftar Akun
│   │
│   ├── pengirim/                       # Tampilan khusus Peran Pengirim
│   │   ├── index.php                   # Pembungkus modul Pengirim
│   │   ├── tab_create.php              # Tab Buat Pengiriman, Input Berat/Dimensi, & Kalkulator Z
│   │   ├── tab_track.php               # Tab Lacak Pengiriman, OTP, & Skema Rute
│   │   ├── tab_history.php             # Tab Riwayat Pengiriman
│   │   └── tab_impact.php              # Tab Dampak Penghematan Emisi CO₂
│   │
│   ├── kurir/                          # Tampilan khusus Peran Kurir
│   │   ├── index.php                   # Pembungkus modul Kurir
│   │   ├── tab_dashboard.php           # Tab Dasbor Peta & Perbandingan Efisiensi
│   │   ├── tab_tasks.php               # Tab Mesin Pencocokan Rute & Sisa Kapasitas (V_rem)
│   │   ├── tab_route.php               # Tab Navigasi Rute Perjalanan
│   │   ├── tab_hub.php                 # Tab Konsolidasi Paket di Hub Merjosari
│   │   └── tab_verify.php              # Tab Kode QR & Verifikasi OTP
│   │
│   └── vendor/                         # Tampilan khusus Peran Vendor 3PL
│       ├── index.php                   # Pembungkus modul Vendor 3PL
│       ├── tab_dashboard.php           # Tab Dasbor Operasional Vendor
│       ├── tab_fleet.php               # Tab Status Kapasitas Armada
│       ├── tab_collab.php              # Tab Pengaturan Parameter δ & Persetujuan Kolaborasi
│       └── tab_report.php              # Tab Laporan Kolaborasi & Pembagian Biaya
│
└── assets/                             # [5] ASET FRONTEND TERPISAH (CSS & JS)
    ├── css/
    │   └── style.css                   # Desain visual & variabel tema
    └── js/
        ├── state.js                    # State global & konstanta titik koordinat Malang
        ├── math_engine.js              # Rumus Haversine, δ, Emisi CMEM, Volume P×L×T, & Fungsi Objektif Z
        ├── api_client.js               # Klien Fetch ke api.php & sinkronisasi antar-tab
        ├── map_manager.js              # Pengelola peta interaktif Leaflet
        ├── render_pengirim.js          # Fungsi pembaruan UI Pengirim
        ├── render_kurir.js             # Fungsi pembaruan UI Kurir
        ├── render_vendor.js            # Fungsi pembaruan UI Vendor 3PL
        └── app.js                      # Event listeners, pindah tab, & inisialisasi aplikasi
```

## Panduan Cepat Pengeditan
- **Ubah koneksi database MySQL**: Edit `config/database.php`.
- **Ubah rumus CMEM / Fungsi Objektif / Haversine**: Edit `assets/js/math_engine.js`.
- **Ubah form input Pengirim**: Edit `views/pengirim/tab_create.php` dan `app/Controllers/ShipmentController.php`.
- **Ubah tampilan Pencocokan Rute Kurir**: Edit `views/kurir/tab_tasks.php` dan `assets/js/render_kurir.js`.
- **Ubah aturan Kolaborasi Vendor 3PL**: Edit `views/vendor/tab_collab.php` dan `app/Controllers/VendorController.php`.
