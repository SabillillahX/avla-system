# Frontend Authentication - Next.js 14

Dokumentasi lengkap sistem autentikasi frontend menggunakan Next.js 14, TypeScript, dan TailwindCSS.

## 📋 Tech Stack

- **Next.js 14** (App Router)
- **TypeScript**
- **TailwindCSS**
- **Axios** (HTTP Client)
- **React Hook Form** (Form Management)
- **Zod** (Validation)
- **Shadcn/ui** (UI Components)

## 🚀 Features

✅ User Login
✅ User Registration (Student)
✅ Token-based Authentication
✅ Protected Routes
✅ Auto-redirect jika sudah/belum login
✅ Logout functionality
✅ Form validation dengan error messages
✅ Loading states
✅ Error handling
✅ Persistent authentication (localStorage)
✅ Auto token refresh check

## 📁 File Structure

```
├── app/
│   ├── auth/
│   │   ├── login/
│   │   │   └── page.tsx          # Login page
│   │   └── register/
│   │       └── page.tsx          # Register page
│   ├── dashboard/
│   │   └── page.tsx              # Protected dashboard page
│   └── layout.tsx                # Root layout dengan AuthProvider
│
├── components/
│   ├── auth/
│   │   ├── ProtectedRoute.tsx    # HOC untuk protected routes
│   │   ├── GuestRoute.tsx        # HOC untuk guest-only routes
│   │   └── UserNav.tsx           # User navigation menu
│   └── dashboard-layout.tsx      # Dashboard layout dengan logout
│
├── contexts/
│   └── AuthContext.tsx           # Auth Context Provider
│
├── lib/
│   ├── api/
│   │   ├── axios.ts              # Axios instance dengan interceptors
│   │   └── auth.ts               # Auth API functions
│   └── types/
│       └── auth.ts               # Auth TypeScript types
│
└── .env.local                     # Environment variables
```

## 🔧 Setup & Installation

### 1. Install Dependencies

```bash
npm install axios
# atau
pnpm add axios
```

### 2. Environment Variables

Create `.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api
```

### 3. Wrap App dengan AuthProvider

File: `app/layout.tsx`

```tsx
import { AuthProvider } from "@/contexts/AuthContext"

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  )
}
```

## 📝 Usage Guide

### Using Auth Context

```tsx
'use client';

import { useAuth } from '@/contexts/AuthContext';

export default function MyComponent() {
  const { user, isAuthenticated, login, logout } = useAuth();

  if (isAuthenticated) {
    return <div>Welcome, {user?.name}!</div>;
  }

  return <div>Please login</div>;
}
```

### Protected Routes

Wrap component dengan `ProtectedRoute`:

```tsx
'use client';

import { ProtectedRoute } from '@/components/auth/ProtectedRoute';

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <div>Protected Content</div>
    </ProtectedRoute>
  );
}
```

### Role-based Protection

```tsx
<ProtectedRoute requireRole="admin">
  <div>Admin Only Content</div>
</ProtectedRoute>

<ProtectedRoute requireRole={["admin", "teacher"]}>
  <div>Admin or Teacher Content</div>
</ProtectedRoute>
```

### Guest Routes

Untuk halaman yang hanya boleh diakses jika BELUM login (login, register):

```tsx
'use client';

import { GuestRoute } from '@/components/auth/GuestRoute';

export default function LoginPage() {
  return (
    <GuestRoute>
      <div>Login Form</div>
    </GuestRoute>
  );
}
```

## 🎯 API Integration

### Auth API Functions

File: `lib/api/auth.ts`

```typescript
import { authApi } from '@/lib/api/auth';

// Register
const response = await authApi.register({
  name: 'John Doe',
  email: 'john@example.com',
  password: 'password123',
  password_confirmation: 'password123'
});

// Login
const response = await authApi.login({
  email: 'john@example.com',
  password: 'password123'
});

// Logout
await authApi.logout();

// Get current user
const { user } = await authApi.me();
```

### Axios Interceptors

**Request Interceptor**: Automatically attach token to every request

**Response Interceptor**: Handle 401 errors (auto logout if token expired)

File: `lib/api/axios.ts`

```typescript
// Token otomatis di-attach ke setiap request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto logout jika token invalid
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token');
      window.location.href = '/auth/login';
    }
    return Promise.reject(error);
  }
);
```

## 🔐 Authentication Flow

### Login Flow

1. User mengisi form login
2. Form validation menggunakan Zod
3. Submit data ke `POST /api/login`
4. Jika berhasil:
   - Save token ke `localStorage`
   - Save user data ke `localStorage`
   - Update AuthContext state
   - Redirect ke `/dashboard`
5. Jika gagal:
   - Show error message

### Register Flow

1. User mengisi form register
2. Form validation (termasuk password confirmation)
3. Submit data ke `POST /api/register`
4. Jika berhasil:
   - Save token ke `localStorage`
   - Save user data ke `localStorage`
   - Update AuthContext state
   - Auto assign role "student"
   - Redirect ke `/dashboard`
5. Jika gagal:
   - Show error message

### Logout Flow

1. User click logout button
2. Call `POST /api/logout` untuk revoke token
3. Clear token dari `localStorage`
4. Clear user dari `localStorage`
5. Update AuthContext state
6. Redirect ke `/auth/login`

### Auto-authentication on Load

1. Check `localStorage` untuk token
2. Jika token ada:
   - Set token dan user dari localStorage
   - Verify token dengan `GET /api/me`
   - Update user data jika valid
   - Jika invalid, logout otomatis
3. Jika token tidak ada:
   - User tetap sebagai guest

## 🎨 UI Components

### Login Page

Location: `app/auth/login/page.tsx`

**Features:**
- Email validation
- Password field
- Loading state
- Error handling
- Link to register
- Auto-redirect if authenticated

### Register Page

Location: `app/auth/register/page.tsx`

**Features:**
- Name, email, password fields
- Password confirmation
- Client-side validation
- Server-side error handling
- Loading state
- Link to login
- Auto-redirect if authenticated

### User Navigation

Location: `components/auth/UserNav.tsx`

**Features:**
- User avatar with initials
- Dropdown menu
- User info display
- Logout button

## 🔒 Security Features

✅ **Token Storage**: Token disimpan di localStorage (dapat dipindah ke httpOnly cookie untuk production)
✅ **Auto Token Attachment**: Token otomatis di-attach ke setiap API request
✅ **Token Expiry Handling**: Auto logout jika token expired
✅ **CSRF Protection**: Axios withCredentials untuk CORS
✅ **Form Validation**: Client & server-side validation
✅ **Password Confirmation**: Verify password saat register
✅ **Protected Routes**: Automatic redirect jika tidak authenticated
✅ **Role-based Access**: Support role checking

## 📱 Testing Guide

### Test Login

1. Buka `http://localhost:3000/auth/login`
2. Login dengan credentials:
   ```
   Email: admin@example.com
   Password: password
   ```
3. Verify redirect ke `/dashboard`
4. Check user info di dashboard
5. Verify token di localStorage

### Test Register

1. Buka `http://localhost:3000/auth/register`
2. Isi form dengan data valid
3. Submit form
4. Verify auto-login dan redirect ke dashboard
5. Verify role = "student"

### Test Protected Routes

1. Logout dari app
2. Try access `http://localhost:3000/dashboard`
3. Verify auto-redirect ke `/auth/login`
4. Login kembali
5. Verify dapat access dashboard

### Test Logout

1. Login dulu
2. Click user avatar di header
3. Click "Sign Out"
4. Verify redirect ke `/auth/login`
5. Check localStorage token sudah cleared
6. Try access dashboard → should redirect to login

## 🐛 Troubleshooting

### CORS Error

**Problem**: "No 'Access-Control-Allow-Origin' header"

**Solution**: 
1. Check Laravel backend CORS config di `config/cors.php`
2. Pastikan `FRONTEND_URL` di `.env` sudah benar
3. Pastikan `SANCTUM_STATEFUL_DOMAINS` include frontend domain

### Token Not Attached

**Problem**: Token tidak ter-attach ke request

**Solution**:
1. Check localStorage ada token atau tidak
2. Verify axios interceptor berjalan
3. Check header Authorization di Network tab

### Auto-logout Terus

**Problem**: Selalu logout otomatis setelah login

**Solution**:
1. Check token di localStorage valid
2. Verify API `/api/me` returns user data
3. Check axios interceptor tidak ada infinite loop

### Infinite Redirect Loop

**Problem**: Redirect loop antara login dan dashboard

**Solution**:
1. Check ProtectedRoute dan GuestRoute logic
2. Verify isLoading state
3. Check AuthContext initialization

## 📋 Types & Interfaces

### User Type

```typescript
interface User {
  id: number;
  name: string;
  email: string;
  email_verified_at?: string | null;
  roles: string[];
  permissions?: string[];
}
```

### Auth Context Type

```typescript
interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}
```

## 🚀 Next Steps

### Additional Features to Implement:

1. **Remember Me** functionality
2. **Email Verification** flow
3. **Password Reset** flow
4. **Profile Management** page
5. **Two-Factor Authentication** (2FA)
6. **Social Login** (Google, Facebook)
7. **Session Management** (view active sessions)
8. **Token Refresh** mechanism
9. **Auto-save form** on network error
10. **Offline Support** with service worker

## 🔗 Related Files

- Backend API Documentation: `backend/API_AUTH_DOCUMENTATION.md`
- Backend Quick Start: `backend/QUICK_START.md`
- Backend Implementation: `backend/IMPLEMENTATION_SUMMARY.md`

---

**Last Updated**: March 5, 2026
**Version**: 1.0.0
**Status**: Production Ready ✅
