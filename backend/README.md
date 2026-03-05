# E-Learning API Backend

Backend API untuk sistem E-Learning berbasis AI menggunakan Laravel 12 dengan autentikasi dan role management.

## 🚀 Tech Stack

- **Laravel 12** - PHP Framework
- **Laravel Sanctum** - API Authentication
- **Spatie Laravel Permission** - Role & Permission Management
- **PostgreSQL/MySQL** - Database
- **Docker** - Containerization (optional)

## 🔐 Features

### Sistem Autentikasi
- ✅ User Registration (Student auto-register)
- ✅ Login dengan Token-based Authentication
- ✅ Logout (Token Revocation)
- ✅ Get Current User Info
- ✅ Role-based Access Control

### Role Management
- **Admin** - Full access, dibuat via seeder
- **Teacher** - Dibuat oleh admin
- **Student** - Dapat register sendiri

## 📋 Prerequisites

- PHP 8.4+ (Laravel 12 requirement)
- Composer
- PostgreSQL atau MySQL
- Node.js & npm (optional, untuk Laravel Mix)

## 🛠️ Quick Setup

### 1. Install Dependencies

```bash
composer install
```

### 2. Environment Setup

Copy `.env.example` ke `.env` dan konfigurasi:

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

### 3. Generate Application Key

```bash
php artisan key:generate
```

### 4. Setup Authentication System

**Otomatis (Recommended):**

Windows (PowerShell):
```powershell
.\setup-auth.ps1
```

Linux/Mac:
```bash
chmod +x setup-auth.sh
./setup-auth.sh
```

**Manual:**

```bash
# Publish Spatie Permission
php artisan vendor:publish --provider="Spatie\Permission\PermissionServiceProvider"

# Run migrations
php artisan migrate

# Seed database (create roles & admin)
php artisan db:seed
```

### 5. Run Server

```bash
php artisan serve
```

API akan berjalan di `http://localhost:8000`

## 🔑 Default Credentials

Setelah seeding, gunakan credentials ini:

```
Email: admin@example.com
Password: password
```

## 📚 API Documentation

### Base URL
```
http://localhost:8000/api
```

### Endpoints

#### Public Endpoints

**Register Student**
```http
POST /api/register
Content-Type: application/json

{
  "name": "Student Name",
  "email": "student@example.com",
  "password": "password123",
  "password_confirmation": "password123"
}
```

**Login**
```http
POST /api/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "password"
}
```

#### Protected Endpoints (Requires Token)

**Get Current User**
```http
GET /api/me
Authorization: Bearer {token}
```

**Logout**
```http
POST /api/logout
Authorization: Bearer {token}
```

#### Admin Only Endpoints

**Create Teacher**
```http
POST /api/admin/create-teacher
Authorization: Bearer {admin_token}
Content-Type: application/json

{
  "name": "Teacher Name",
  "email": "teacher@example.com",
  "password": "password123"
}
```

### Response Format

**Success Response:**
```json
{
  "message": "Success message",
  "user": {
    "id": 1,
    "name": "User Name",
    "email": "user@example.com",
    "roles": ["role_name"]
  },
  "token": "token_string"
}
```

**Error Response:**
```json
{
  "message": "Error message",
  "errors": {
    "field": ["error detail"]
  }
}
```

## 🧪 Testing

### Import Postman Collection

Import file `E-Learning-Auth-API.postman_collection.json` ke Postman untuk testing.

### Testing dengan cURL

**Login:**
```bash
curl -X POST http://localhost:8000/api/login \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{"email":"admin@example.com","password":"password"}'
```

## 📖 Detailed Documentation

- **[API_AUTH_DOCUMENTATION.md](./API_AUTH_DOCUMENTATION.md)** - Complete API documentation
- **[QUICK_START.md](./QUICK_START.md)** - Quick start guide
- **[IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)** - Implementation details
- **[FILE_STRUCTURE.md](./FILE_STRUCTURE.md)** - File structure overview

## 🗂️ Project Structure

```
backend/
├── app/
│   ├── Http/
│   │   ├── Controllers/Api/
│   │   │   ├── AuthController.php
│   │   │   └── TeacherController.php
│   │   ├── Middleware/
│   │   │   └── RoleMiddleware.php
│   │   └── Requests/
│   │       ├── RegisterRequest.php
│   │       ├── LoginRequest.php
│   │       └── CreateTeacherRequest.php
│   └── Models/
│       └── User.php
├── database/
│   └── seeders/
│       ├── RoleSeeder.php
│       ├── AdminSeeder.php
│       └── DatabaseSeeder.php
└── routes/
    └── api.php
```

## 🔧 Troubleshooting

### PHP Version Error
**Problem:** "Composer detected issues in your platform: PHP version >= 8.4.0"

**Solution:** Upgrade PHP to 8.4+ or use `--ignore-platform-reqs` flag

### Database Connection Error
**Problem:** "SQLSTATE[HY000] [1049] Unknown database"

**Solution:** 
1. Create database first
```bash
# PostgreSQL
createdb learning

# MySQL
mysql -u root -p
CREATE DATABASE learning;
```

2. Check `.env` configuration

### Token Not Working
**Problem:** "Unauthenticated" error meski sudah kirim token

**Solution:**
- Pastikan header `Authorization: Bearer {token}` benar
- Pastikan header `Accept: application/json` ada
- Check apakah token sudah expired/revoked

## 🎯 Next Steps

Setelah setup selesai, Anda bisa:

1. Implement course management
2. Add student enrollment system
3. Create quiz/assignment features
4. Add email verification
5. Implement password reset
6. Add profile management

## 🤝 Contributing

Contributions, issues, and feature requests are welcome!

## 📝 License

This project is MIT licensed.

In order to ensure that the Laravel community is welcoming to all, please review and abide by the [Code of Conduct](https://laravel.com/docs/contributions#code-of-conduct).

## Security Vulnerabilities

If you discover a security vulnerability within Laravel, please send an e-mail to Taylor Otwell via [taylor@laravel.com](mailto:taylor@laravel.com). All security vulnerabilities will be promptly addressed.

## License

The Laravel framework is open-sourced software licensed under the [MIT license](https://opensource.org/licenses/MIT).
