'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useAuth } from '@/lib/contexts/AuthContext';
import { GuestRoute } from '@/lib/components/auth/GuestRoute';
import { Button } from '@/lib/components/ui/button';
import { Input } from '@/lib/components/ui/input';
import { Label } from '@/lib/components/ui/label';
import { Alert, AlertDescription } from '@/lib/components/ui/alert';
import { Loader2 } from 'lucide-react';
import Image from 'next/image';

const registerSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi').max(255, 'Nama maksimal 255 karakter'),
  email: z.string().email('Email tidak valid'),
  password: z.string().min(8, 'Password minimal 8 karakter'),
  password_confirmation: z.string().min(8, 'Konfirmasi password minimal 8 karakter'),
}).refine((data) => data.password === data.password_confirmation, {
  message: 'Konfirmasi password tidak cocok',
  path: ['password_confirmation'],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const { register: registerUser } = useAuth();
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const onSubmit = async (data: RegisterFormData) => {
    setError('');
    setIsLoading(true);

    try {
      await registerUser(data);

    } catch (err: any) {
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err.response?.data?.errors) {
        const errors = err.response.data.errors;
        const firstError = Object.values(errors)[0];
        setError(Array.isArray(firstError) ? firstError[0] : 'Registrasi gagal');
      } else {
        setError('Terjadi kesalahan. Silakan coba lagi.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <GuestRoute>
      <section className="flex min-h-screen bg-zinc-50 px-4 py-16 md:py-32 dark:bg-transparent">
        <div className="m-auto h-fit w-full max-w-md">
          <div className="p-6 bg-white dark:bg-zinc-900 rounded-2xl shadow-sm border border-zinc-200 dark:border-zinc-800">
            <div>
              <Link
                href="/"
                aria-label="go home"
                className="inline-block mb-4"
              >
                <Image src="/logo-black.png" alt="Avla Logo" width={200} height={64} className="h-8 md:h-16 w-auto dark:hidden" />
                <Image src="/logo-white.png" alt="Avla Logo" width={200} height={64} className="h-8 md:h-16 w-auto hidden dark:block" />
              </Link>
              <h1 className="mb-1 mt-4 text-xl font-semibold">Create an Account</h1>
              <p className="text-muted-foreground text-sm">Welcome! Create an account to get started</p>
            </div>

            <div className="mt-6">
              <Button
                type="button"
                variant="outline"
                className="w-full flex items-center justify-center gap-2 font-medium"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="1em"
                  height="1em"
                  viewBox="0 0 256 262">
                  <path
                    fill="#4285f4"
                    d="M255.878 133.451c0-10.734-.871-18.567-2.756-26.69H130.55v48.448h71.947c-1.45 12.04-9.283 30.172-26.69 42.356l-.244 1.622l38.755 30.023l2.685.268c24.659-22.774 38.875-56.282 38.875-96.027"></path>
                  <path
                    fill="#34a853"
                    d="M130.55 261.1c35.248 0 64.839-11.605 86.453-31.622l-41.196-31.913c-11.024 7.688-25.82 13.055-45.257 13.055c-34.523 0-63.824-22.773-74.269-54.25l-1.531.13l-40.298 31.187l-.527 1.465C35.393 231.798 79.49 261.1 130.55 261.1"></path>
                  <path
                    fill="#fbbc05"
                    d="M56.281 156.37c-2.756-8.123-4.351-16.827-4.351-25.82c0-8.994 1.595-17.697 4.206-25.82l-.073-1.73L15.26 71.312l-1.335.635C5.077 89.644 0 109.517 0 130.55s5.077 40.905 13.925 58.602z"></path>
                  <path
                    fill="#eb4335"
                    d="M130.55 50.479c24.514 0 41.05 10.589 50.479 19.438l36.844-35.974C195.245 12.91 165.798 0 130.55 0C79.49 0 35.393 29.301 13.925 71.947l42.211 32.783c10.59-31.477 39.891-54.251 74.414-54.251"></path>
                </svg>
                <span>Continue with Google</span>
              </Button>
            </div>

            <div className="my-6 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <hr className="border-dashed border-zinc-200 dark:border-zinc-800" />
              <span className="text-muted-foreground text-xs">Or continue with email</span>
              <hr className="border-dashed border-zinc-200 dark:border-zinc-800" />
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="name" className="block text-sm">Nama Lengkap</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Doe"
                  {...register('name')}
                  disabled={isLoading}
                  className="bg-zinc-50 dark:bg-zinc-900/50"
                />
                {errors.name && (
                  <p className="text-sm text-red-500">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="block text-sm">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="nama@example.com"
                  {...register('email')}
                  disabled={isLoading}
                  className="bg-zinc-50 dark:bg-zinc-900/50"
                />
                {errors.email && (
                  <p className="text-sm text-red-500">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="block text-sm">Password</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  {...register('password')}
                  disabled={isLoading}
                  className="bg-zinc-50 dark:bg-zinc-900/50"
                />
                {errors.password && (
                  <p className="text-sm text-red-500">{errors.password.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="password_confirmation" className="block text-sm">Konfirmasi Password</Label>
                <Input
                  id="password_confirmation"
                  type="password"
                  placeholder="••••••••"
                  {...register('password_confirmation')}
                  disabled={isLoading}
                  className="bg-zinc-50 dark:bg-zinc-900/50"
                />
                {errors.password_confirmation && (
                  <p className="text-sm text-red-500">{errors.password_confirmation.message}</p>
                )}
              </div>

              <Button type="submit" className="w-full font-medium" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Continue
              </Button>
            </form>
          </div>

          <p className="text-muted-foreground text-center text-sm mt-6">
            Have an account?
            <Button asChild variant="link" className="px-2 font-semibold">
              <Link href="/auth/login">Sign In</Link>
            </Button>
          </p>
        </div>
      </section>
    </GuestRoute>
  );
}
