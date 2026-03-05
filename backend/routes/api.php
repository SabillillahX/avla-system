<?php

use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\TeacherController;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

// Public routes
Route::post('/register', [AuthController::class, 'register']);
Route::post('/login', [AuthController::class, 'login']);

// Protected routes
Route::middleware(['auth:sanctum'])->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
    
    // Admin only routes
    Route::middleware(['role:admin'])->group(function () {
        Route::post('/admin/create-teacher', [TeacherController::class, 'createTeacher']);
    });
});

Route::get('/test-koneksi', function () {
    return response()->json([
        'status' => 'success',
        'message' => 'Laravel sudah terhubung!',
        'database' => 'Terhubung ke PGSQL'
    ]);
});