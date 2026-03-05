# E-Learning Auth Setup Script (PowerShell)
# Script untuk setup sistem autentikasi di Windows

Write-Host "==================================" -ForegroundColor Green
Write-Host "E-Learning Auth Setup" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Green
Write-Host ""

# 1. Install Dependencies
Write-Host "📦 Installing Spatie Laravel Permission..." -ForegroundColor Yellow
composer require spatie/laravel-permission --ignore-platform-reqs
Write-Host ""

# 2. Publish Configuration
Write-Host "📄 Publishing Spatie Permission configuration..." -ForegroundColor Yellow
php artisan vendor:publish --provider="Spatie\Permission\PermissionServiceProvider"
Write-Host ""

# 3. Run Migrations
Write-Host "🗄️  Running migrations..." -ForegroundColor Yellow
php artisan migrate
Write-Host ""

# 4. Seed Database
Write-Host "🌱 Seeding database (creating roles and admin)..." -ForegroundColor Yellow
php artisan db:seed
Write-Host ""

Write-Host "==================================" -ForegroundColor Green
Write-Host "✅ Setup Complete!" -ForegroundColor Green
Write-Host "==================================" -ForegroundColor Green
Write-Host ""
Write-Host "Admin Credentials:" -ForegroundColor Cyan
Write-Host "  Email: admin@example.com"
Write-Host "  Password: password"
Write-Host ""
Write-Host "API Endpoints:" -ForegroundColor Cyan
Write-Host "  POST /api/register - Register student"
Write-Host "  POST /api/login - Login"
Write-Host "  GET  /api/me - Get current user"
Write-Host "  POST /api/logout - Logout"
Write-Host "  POST /api/admin/create-teacher - Create teacher (admin only)"
Write-Host ""
Write-Host "Test the API at: http://localhost:8000/api" -ForegroundColor Yellow
Write-Host ""
