# Quick Start Guide - Sistem Autentikasi E-Learning

## 📋 Prerequisites

- PHP 8.4+ (Laravel 12 requirement)
- Composer
- PostgreSQL atau MySQL
- Postman/Insomnia (untuk testing API)

## 🚀 Quick Setup

### Cara 1: Manual Setup

```bash
# 1. Publish Spatie Permission
php artisan vendor:publish --provider="Spatie\Permission\PermissionServiceProvider"

# 2. Run migrations
php artisan migrate

# 3. Seed database (create roles & admin)
php artisan db:seed
```

### Cara 2: Menggunakan Script (Recommended)

**Windows (PowerShell):**
```powershell
.\setup-auth.ps1
```

**Linux/Mac:**
```bash
chmod +x setup-auth.sh
./setup-auth.sh
```

## 🧪 Testing API

### 1. Import Postman Collection

Import file: `E-Learning-Auth-API.postman_collection.json`

Collection ini sudah include:
- Register Student
- Login
- Get Current User
- Logout
- Create Teacher (Admin only)

### 2. Test Manual dengan cURL

**Register Student:**
```bash
curl -X POST http://localhost:8000/api/register \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "name": "Student Test",
    "email": "student@test.com",
    "password": "password123",
    "password_confirmation": "password123"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:8000/api/login \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "email": "admin@example.com",
    "password": "password"
  }'
```

**Get User Info:**
```bash
curl -X GET http://localhost:8000/api/me \
  -H "Accept: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

**Create Teacher (Admin Only):**
```bash
curl -X POST http://localhost:8000/api/admin/create-teacher \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN_HERE" \
  -d '{
    "name": "Teacher Test",
    "email": "teacher@test.com",
    "password": "password123"
  }'
```

## 🔑 Default Credentials

Setelah seeding, gunakan credentials ini untuk login sebagai admin:

```
Email: admin@example.com
Password: password
```

## 📝 Flow Testing yang Disarankan

1. **Login sebagai Admin**
   - POST `/api/login`
   - Simpan token yang didapat

2. **Get Admin Info**
   - GET `/api/me` dengan token admin
   - Verify role adalah "admin"

3. **Create Teacher**
   - POST `/api/admin/create-teacher` dengan token admin
   - Verify teacher berhasil dibuat

4. **Register sebagai Student**
   - POST `/api/register`
   - Verify student berhasil dibuat dan dapat token

5. **Try Create Teacher dengan Student Token (Should Fail)**
   - POST `/api/admin/create-teacher` dengan token student
   - Verify mendapat error 403 Unauthorized

6. **Logout**
   - POST `/api/logout`
   - Verify token di-revoke

## ⚙️ Environment Setup

Pastikan `.env` sudah dikonfigurasi:

```env
APP_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000

DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=learning
DB_USERNAME=root
DB_PASSWORD=root

SANCTUM_STATEFUL_DOMAINS=localhost,localhost:3000,127.0.0.1:3000
```

## 🔧 Troubleshooting

### Issue: "Composer detected issues in your platform"
**Solusi:** Upgrade PHP ke versi 8.4+ atau gunakan flag `--ignore-platform-reqs`

### Issue: Migration error
**Solusi:** 
1. Cek koneksi database di `.env`
2. Pastikan database `learning` sudah dibuat
3. Test koneksi: `php artisan migrate:status`

### Issue: "Unauthenticated" meski sudah kirim token
**Solusi:**
1. Pastikan header `Authorization: Bearer {token}` benar
2. Pastikan token belum expired/revoked
3. Pastikan header `Accept: application/json` ada

### Issue: Role middleware tidak berfungsi
**Solusi:**
1. Pastikan sudah migrate Spatie Permission tables
2. Pastikan user sudah di-assign role
3. Cek dengan endpoint `/api/me` untuk verify role

## 📂 File Structure

```
backend/
├── app/
│   ├── Http/
│   │   ├── Controllers/Api/
│   │   │   ├── AuthController.php
│   │   │   └── TeacherController.php
│   │   └── Middleware/
│   │       └── RoleMiddleware.php
│   └── Models/
│       └── User.php
├── database/
│   └── seeders/
│       ├── RoleSeeder.php
│       ├── AdminSeeder.php
│       └── DatabaseSeeder.php
├── routes/
│   └── api.php
├── API_AUTH_DOCUMENTATION.md
├── E-Learning-Auth-API.postman_collection.json
├── setup-auth.sh
└── setup-auth.ps1
```

## 📚 Dokumentasi Lengkap

Lihat [API_AUTH_DOCUMENTATION.md](./API_AUTH_DOCUMENTATION.md) untuk dokumentasi API yang lebih detail.

## 🎯 Next Steps

Setelah sistem autentikasi berjalan, Anda bisa:

1. Menambah permission management
2. Membuat endpoint CRUD untuk courses
3. Implementasi enrollment system
4. Menambah password reset functionality
5. Implementasi email verification
6. Menambah profile management

## 🆘 Support

Jika ada pertanyaan atau issue, silakan buat issue di repository atau hubungi tim development.
