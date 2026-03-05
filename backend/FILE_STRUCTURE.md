# 📁 FILE STRUCTURE - Sistem Autentikasi E-Learning

Berikut adalah struktur lengkap file yang telah dibuat/dimodifikasi untuk sistem autentikasi:

## 🆕 File Baru yang Dibuat

```
backend/
│
├── app/
│   ├── Http/
│   │   ├── Controllers/Api/
│   │   │   ├── AuthController.php ✅ BARU
│   │   │   │   └── Methods: register, login, logout, me
│   │   │   │
│   │   │   └── TeacherController.php ✅ BARU
│   │   │       └── Methods: createTeacher (admin only)
│   │   │
│   │   ├── Middleware/
│   │   │   └── RoleMiddleware.php ✅ BARU
│   │   │       └── Check user role untuk protected routes
│   │   │
│   │   └── Requests/
│   │       ├── RegisterRequest.php ✅ BARU
│   │       │   └── Validasi register dengan pesan Bahasa Indonesia
│   │       │
│   │       ├── LoginRequest.php ✅ BARU
│   │       │   └── Validasi login dengan pesan Bahasa Indonesia
│   │       │
│   │       └── CreateTeacherRequest.php ✅ BARU
│   │           └── Validasi create teacher dengan pesan Bahasa Indonesia
│   │
│   └── Models/
│       └── User.php ⚡ MODIFIED
│           └── Added: HasApiTokens, HasRoles traits
│
├── database/
│   └── seeders/
│       ├── RoleSeeder.php ✅ BARU
│       │   └── Seed 3 roles: admin, teacher, student
│       │
│       ├── AdminSeeder.php ✅ BARU
│       │   └── Seed admin user (admin@example.com)
│       │
│       └── DatabaseSeeder.php ⚡ MODIFIED
│           └── Call RoleSeeder & AdminSeeder
│
├── routes/
│   └── api.php ⚡ MODIFIED
│       └── API routes untuk auth & admin endpoints
│
├── bootstrap/
│   └── app.php ⚡ MODIFIED
│       └── Register 'role' middleware alias
│
├── 📄 API_AUTH_DOCUMENTATION.md ✅ BARU
│   └── Dokumentasi lengkap API endpoints
│
├── 📄 QUICK_START.md ✅ BARU
│   └── Panduan quick start untuk setup
│
├── 📄 IMPLEMENTATION_SUMMARY.md ✅ BARU
│   └── Summary lengkap implementasi
│
├── 📄 FILE_STRUCTURE.md ✅ BARU (file ini)
│   └── Struktur file yang dibuat
│
├── 🔧 setup-auth.sh ✅ BARU
│   └── Setup script untuk Linux/Mac
│
├── 🔧 setup-auth.ps1 ✅ BARU
│   └── Setup script untuk Windows PowerShell
│
└── 📮 E-Learning-Auth-API.postman_collection.json ✅ BARU
    └── Postman collection untuk testing API
```

---

## 📝 Detail Setiap File

### 1. Controllers

#### **AuthController.php**
Location: `app/Http/Controllers/Api/AuthController.php`

**Methods:**
- `register(RegisterRequest $request)` - Register student baru
- `login(LoginRequest $request)` - Login user
- `logout(Request $request)` - Logout dan revoke token
- `me(Request $request)` - Get data user yang sedang login

**Response Format:**
```json
{
  "message": "Success message",
  "user": { ... },
  "token": "token_string"
}
```

#### **TeacherController.php**
Location: `app/Http/Controllers/Api/TeacherController.php`

**Methods:**
- `createTeacher(CreateTeacherRequest $request)` - Create teacher (admin only)

**Middleware:** 
- `auth:sanctum` - Harus login
- `role:admin` - Harus role admin

---

### 2. Middleware

#### **RoleMiddleware.php**
Location: `app/Http/Middleware/RoleMiddleware.php`

**Fungsi:**
- Check apakah user memiliki role tertentu
- Return 401 jika tidak login
- Return 403 jika role tidak sesuai

**Usage:**
```php
Route::middleware(['auth:sanctum', 'role:admin'])->group(function () {
    // Admin only routes
});
```

---

### 3. Form Requests (Validation)

#### **RegisterRequest.php**
Location: `app/Http/Requests/RegisterRequest.php`

**Validation Rules:**
- name: required, string, max 255
- email: required, email, unique
- password: required, min 8, confirmed

**Custom Messages:** Bahasa Indonesia

#### **LoginRequest.php**
Location: `app/Http/Requests/LoginRequest.php`

**Validation Rules:**
- email: required, email
- password: required

**Custom Messages:** Bahasa Indonesia

#### **CreateTeacherRequest.php**
Location: `app/Http/Requests/CreateTeacherRequest.php`

**Validation Rules:**
- name: required, string, max 255
- email: required, email, unique
- password: required, min 8

**Custom Messages:** Bahasa Indonesia

---

### 4. Models

#### **User.php** (Modified)
Location: `app/Models/User.php`

**Added Traits:**
```php
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;
```

**Methods Available:**
- `$user->assignRole('role_name')` - Assign role
- `$user->hasRole('role_name')` - Check role
- `$user->getRoleNames()` - Get all roles
- `$user->createToken('token_name')` - Create API token

---

### 5. Seeders

#### **RoleSeeder.php**
Location: `database/seeders/RoleSeeder.php`

**Creates:**
- admin role
- teacher role
- student role

**Usage:** `php artisan db:seed --class=RoleSeeder`

#### **AdminSeeder.php**
Location: `database/seeders/AdminSeeder.php`

**Creates:**
- Admin user dengan credentials:
  - Email: `admin@example.com`
  - Password: `password`
  - Role: admin

**Usage:** `php artisan db:seed --class=AdminSeeder`

---

### 6. Routes

#### **api.php** (Modified)
Location: `routes/api.php`

**Public Routes:**
```
POST /api/register
POST /api/login
```

**Protected Routes (auth:sanctum):**
```
GET  /api/me
POST /api/logout
```

**Admin Only Routes (auth:sanctum + role:admin):**
```
POST /api/admin/create-teacher
```

---

### 7. Configuration Files

#### **app.php** (Modified)
Location: `bootstrap/app.php`

**Added:**
```php
$middleware->alias([
    'role' => \App\Http\Middleware\RoleMiddleware::class,
]);
```

---

### 8. Documentation Files

#### **API_AUTH_DOCUMENTATION.md**
**Content:**
- Tech stack explanation
- Setup instructions
- All API endpoints documentation
- Request/response examples
- Error responses
- Testing guide with Postman/cURL

#### **QUICK_START.md**
**Content:**
- Prerequisites
- Quick setup guide
- Testing flow
- cURL examples
- Troubleshooting

#### **IMPLEMENTATION_SUMMARY.md**
**Content:**
- Complete implementation summary
- All features list
- Setup steps
- Default credentials
- Next steps for enhancement

#### **FILE_STRUCTURE.md** (This file)
**Content:**
- Complete file structure
- Detailed explanation of each file
- Usage examples

---

### 9. Setup Scripts

#### **setup-auth.sh** (Linux/Mac)
**Functions:**
- Install Spatie Permission
- Publish configurations
- Run migrations
- Seed database
- Display credentials

**Usage:**
```bash
chmod +x setup-auth.sh
./setup-auth.sh
```

#### **setup-auth.ps1** (Windows PowerShell)
**Functions:**
- Install Spatie Permission
- Publish configurations
- Run migrations
- Seed database
- Display credentials

**Usage:**
```powershell
.\setup-auth.ps1
```

---

### 10. Postman Collection

#### **E-Learning-Auth-API.postman_collection.json**
**Content:**
- Register Student request
- Login request (with auto-save token)
- Get Current User request
- Logout request
- Create Teacher request

**Features:**
- Auto-save token after login
- Environment variables: `base_url`, `token`
- Pre-configured headers

**Usage:**
1. Import in Postman
2. Update `base_url` if needed
3. Run requests sequentially

---

## 🗄️ Database Tables

### Tables yang akan dibuat setelah migration:

#### **users** (Already exists)
```sql
- id
- name
- email
- password
- email_verified_at
- remember_token
- created_at
- updated_at
```

#### **roles** (From Spatie Permission)
```sql
- id
- name
- guard_name
- created_at
- updated_at
```

#### **permissions** (From Spatie Permission)
```sql
- id
- name
- guard_name
- created_at
- updated_at
```

#### **model_has_roles** (From Spatie Permission)
```sql
- role_id
- model_type
- model_id
```

#### **model_has_permissions** (From Spatie Permission)
```sql
- permission_id
- model_type
- model_id
```

#### **role_has_permissions** (From Spatie Permission)
```sql
- permission_id
- role_id
```

#### **personal_access_tokens** (From Sanctum)
```sql
- id
- tokenable_type
- tokenable_id
- name
- token
- abilities
- last_used_at
- expires_at
- created_at
- updated_at
```

---

## 🔧 Configuration Files (Existing)

### **.env**
**Important Variables:**
```env
# App
APP_URL=http://localhost:8000
FRONTEND_URL=http://localhost:3000

# Database
DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=learning
DB_USERNAME=root
DB_PASSWORD=root

# Sanctum
SANCTUM_STATEFUL_DOMAINS=localhost,localhost:3000,127.0.0.1:3000
```

### **config/sanctum.php**
**Already configured:**
- Stateful domains untuk frontend
- Guard configuration
- Token expiration settings

### **config/cors.php**
**Already configured:**
- Allowed origins dari FRONTEND_URL
- Supports credentials: true
- Allowed methods & headers: all

---

## 📊 File Count Summary

```
✅ 9 New Files Created
⚡ 4 Files Modified
📄 4 Documentation Files
🔧 2 Setup Scripts
📮 1 Postman Collection

Total: 20 files affected
```

---

## ✨ Quick Reference

### Run Setup:
```bash
# Windows
.\setup-auth.ps1

# Linux/Mac
./setup-auth.sh
```

### Test Login:
```bash
POST http://localhost:8000/api/login
{
  "email": "admin@example.com",
  "password": "password"
}
```

### Create Teacher:
```bash
POST http://localhost:8000/api/admin/create-teacher
Headers: Authorization: Bearer {admin_token}
{
  "name": "Teacher Name",
  "email": "teacher@example.com",
  "password": "password123"
}
```

### Register Student:
```bash
POST http://localhost:8000/api/register
{
  "name": "Student Name",
  "email": "student@example.com",
  "password": "password123",
  "password_confirmation": "password123"
}
```

---

## 🎯 All Features Available

- [x] Student self-registration
- [x] User login with token
- [x] User logout (revoke token)
- [x] Get current user info
- [x] Role-based access control
- [x] Admin create teacher
- [x] Request validation (Bahasa Indonesia)
- [x] Error handling
- [x] CORS configuration
- [x] API documentation
- [x] Postman collection
- [x] Setup automation scripts

**Sistem autentikasi siap digunakan! 🚀**
