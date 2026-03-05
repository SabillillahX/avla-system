<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::middleware(['auth:sanctum'])->get('/user', function (Request $request) {
    return $request->user();
});

Route::get('/test-koneksi', function () {
    return response()->json([
        'status' => 'success',
        'message' => 'Laravel sudah terhubung!',
        'database' => 'Terhubung ke PGSQL'
    ]);
});