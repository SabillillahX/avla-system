# Sistem Autentikasi E-Learning API

Sistem autentikasi berbasis Laravel 12 dengan Laravel Sanctum dan Spatie Permission untuk role management.

## Tech Stack

- Laravel 12
- MySQL/PostgreSQL
- Laravel Sanctum (API Authentication)
- Spatie Laravel Permission (Role Management)

## Role System

Sistem memiliki 3 role:
- **admin** - Dibuat manual via seeder
- **teacher** - Dibuat oleh admin melalui admin panel
- **student** - Dapat register sendiri

## Setup Instructions

### 1. Install Dependencies

Pastikan sudah install Spatie Permission:
```bash
composer require spatie/laravel-permission
```

### 2. Publish Configurations

Publish Spatie Permission migration:
```bash
php artisan vendor:publish --provider="Spatie\Permission\PermissionServiceProvider"
```

### 3. Run Migrations

Jalankan migration untuk membuat tabel yang diperlukan:
```bash
php artisan migrate
```

### 4. Run Seeders

Seed database dengan roles dan admin user:
```bash
php artisan db:seed
```

Ini akan membuat:
- 3 roles: admin, teacher, student
- 1 admin user:
  - Email: `admin@example.com`
  - Password: `password`

## API Endpoints

Base URL: `http://localhost:8000/api`

### Public Endpoints (Tidak perlu autentikasi)

#### 1. Register Student
```
POST /api/register
```

**Request Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "password_confirmation": "password123"
}
```

**Response (201):**
```json
{
  "message": "Registration successful",
  "user": {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "roles": ["student"]
  },
  "token": "1|xxxxxxxxxxxxxxxxxxxxxx"
}
```

#### 2. Login
```
POST /api/login
```

**Request Body:**
```json
{
  "email": "admin@example.com",
  "password": "password"
}
```

**Response (200):**
```json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "name": "Admin",
    "email": "admin@example.com",
    "roles": ["admin"]
  },
  "token": "2|xxxxxxxxxxxxxxxxxxxxxx"
}
```

### Protected Endpoints (Perlu autentikasi)

**Header yang diperlukan:**
```
Authorization: Bearer {token}
Accept: application/json
```

#### 3. Get Current User
```
GET /api/me
```

**Response (200):**
```json
{
  "user": {
    "id": 1,
    "name": "Admin",
    "email": "admin@example.com",
    "email_verified_at": "2024-01-01T00:00:00.000000Z",
    "roles": ["admin"],
    "permissions": []
  }
}
```

#### 4. Logout
```
POST /api/logout
```

**Response (200):**
```json
{
  "message": "Logout successful"
}
```

### Admin Only Endpoints

#### 5. Create Teacher (Admin Only)
```
POST /api/admin/create-teacher
```

**Request Body:**
```json
{
  "name": "Jane Smith",
  "email": "teacher@example.com",
  "password": "password123"
}
```

**Response (201):**
```json
{
  "message": "Teacher created successfully",
  "user": {
    "id": 3,
    "name": "Jane Smith",
    "email": "teacher@example.com",
    "roles": ["teacher"]
  }
}
```

**Response (403) - Jika bukan admin:**
```json
{
  "message": "Unauthorized. You do not have permission to access this resource."
}
```

## Error Responses

### 401 Unauthenticated
```json
{
  "message": "Unauthenticated."
}
```

### 403 Unauthorized
```json
{
  "message": "Unauthorized. You do not have permission to access this resource."
}
```

### 422 Validation Error
```json
{
  "message": "The email has already been taken.",
  "errors": {
    "email": ["The email has already been taken."]
  }
}
```

## Testing dengan Postman/Insomnia

### 1. Register sebagai Student
- Method: POST
- URL: `http://localhost:8000/api/register`
- Body (JSON):
```json
{
  "name": "Student Test",
  "email": "student@test.com",
  "password": "password123",
  "password_confirmation": "password123"
}
```

### 2. Login sebagai Admin
- Method: POST
- URL: `http://localhost:8000/api/login`
- Body (JSON):
```json
{
  "email": "admin@example.com",
  "password": "password"
}
```
- Simpan token dari response

### 3. Get User Info
- Method: GET
- URL: `http://localhost:8000/api/me`
- Headers:
  - Authorization: `Bearer {token}`

### 4. Create Teacher (Admin Only)
- Method: POST
- URL: `http://localhost:8000/api/admin/create-teacher`
- Headers:
  - Authorization: `Bearer {admin_token}`
- Body (JSON):
```json
{
  "name": "Teacher Test",
  "email": "teacher@test.com",
  "password": "password123"
}
```

## File Structure

```
backend/
├── app/
│   ├── Http/
│   │   ├── Controllers/
│   │   │   └── Api/
│   │   │       ├── AuthController.php      # Register, Login, Logout, Me
│   │   │       └── TeacherController.php   # Create Teacher
│   │   └── Middleware/
│   │       └── RoleMiddleware.php          # Role checking middleware
│   └── Models/
│       └── User.php                        # User model dengan HasRoles trait
├── database/
│   └── seeders/
│       ├── RoleSeeder.php                  # Seed roles
│       ├── AdminSeeder.php                 # Seed admin user
│       └── DatabaseSeeder.php              # Main seeder
└── routes/
    └── api.php                             # API routes
```

## Environment Configuration

Pastikan file `.env` sudah dikonfigurasi dengan benar:

```env
# Frontend URL untuk CORS
FRONTEND_URL=http://localhost:3000

# Database
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=learning
DB_USERNAME=root
DB_PASSWORD=root

# Sanctum Stateful Domains
SANCTUM_STATEFUL_DOMAINS=localhost,localhost:3000,127.0.0.1:3000
```

## Notes

1. **Token Management**: Token disimpan di database dan harus dikirim di header `Authorization: Bearer {token}` untuk setiap request yang memerlukan autentikasi.

2. **Role Middleware**: Middleware `role` dapat digunakan di route untuk membatasi akses berdasarkan role:
   ```php
   Route::middleware(['auth:sanctum', 'role:admin'])->group(function () {
       // Admin only routes
   });
   ```

3. **Multiple Roles**: User bisa memiliki multiple roles jika diperlukan di masa depan.

4. **Password Hashing**: Password otomatis di-hash menggunakan bcrypt.

5. **Email Verification**: Field `email_verified_at` sudah diset saat registrasi. Jika ingin mengaktifkan email verification, bisa menggunakan fitur bawaan Laravel.

## Troubleshooting

### PHP Version Error
Jika muncul error PHP version, pastikan menggunakan PHP 8.4+:
```bash
php -v
```

### Migration Error
Jika migration gagal, cek koneksi database di file `.env`.

### Token Not Working
Pastikan header `Accept: application/json` dan `Authorization: Bearer {token}` sudah benar.
