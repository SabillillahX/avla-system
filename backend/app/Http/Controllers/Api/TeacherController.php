<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\CreateTeacherRequest;
use App\Models\User;
use Illuminate\Support\Facades\Hash;

class TeacherController extends Controller
{
    /**
     * Create a new teacher (admin only)
     */
    public function createTeacher(CreateTeacherRequest $request)
    {
        $teacher = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'email_verified_at' => now(),
        ]);

        // Assign teacher role
        $teacher->assignRole('teacher');

        return response()->json([
            'message' => 'Teacher created successfully',
            'user' => [
                'id' => $teacher->id,
                'name' => $teacher->name,
                'email' => $teacher->email,
                'roles' => $teacher->getRoleNames(),
            ],
        ], 201);
    }
}
