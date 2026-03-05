#!/bin/bash

# E-Learning Auth Setup Script
# Script untuk setup sistem autentikasi

echo "=================================="
echo "E-Learning Auth Setup"
echo "=================================="
echo ""

# 1. Install Dependencies
echo "📦 Installing Spatie Laravel Permission..."
composer require spatie/laravel-permission --ignore-platform-reqs
echo ""

# 2. Publish Configuration
echo "📄 Publishing Spatie Permission configuration..."
php artisan vendor:publish --provider="Spatie\Permission\PermissionServiceProvider"
echo ""

# 3. Run Migrations
echo "🗄️  Running migrations..."
php artisan migrate
echo ""

# 4. Seed Database
echo "🌱 Seeding database (creating roles and admin)..."
php artisan db:seed
echo ""

echo "=================================="
echo "✅ Setup Complete!"
echo "=================================="
echo ""
echo "Admin Credentials:"
echo "  Email: admin@example.com"
echo "  Password: password"
echo ""
echo "API Endpoints:"
echo "  POST /api/register - Register student"
echo "  POST /api/login - Login"
echo "  GET  /api/me - Get current user"
echo "  POST /api/logout - Logout"
echo "  POST /api/admin/create-teacher - Create teacher (admin only)"
echo ""
echo "Test the API at: http://localhost:8000/api"
echo ""
