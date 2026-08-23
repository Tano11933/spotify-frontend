import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useLocation, useNavigate } from 'react-router'

import { AuthLayout, FormError } from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { getApiErrorMessage } from '@/lib/api'
import { loginSchema, type LoginInput } from '@/schemas/auth.schema'
import { useAuthStore } from '@/store/authStore'

export function LoginPage() {
  const login = useAuthStore((state) => state.login)
  const navigate = useNavigate()
  const location = useLocation()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    mode: 'onTouched',
  })

  async function onSubmit(values: LoginInput) {
    setServerError(null)
    try {
      await login(values)

      const redirectTo = (location.state as { from?: string } | null)?.from ?? '/'
      void navigate(redirectTo, { replace: true })
    } catch (error) {
      setServerError(getApiErrorMessage(error))
    }
  }

  return (
    <AuthLayout
      title="Masuk"
      description="Masuk untuk mengikuti aktivitas real-time dan memutar lagu."
      footer={
        <>
          Belum punya akun?{' '}
          <Link to="/register" className="font-semibold text-spotify-white hover:underline">
            Daftar sekarang
          </Link>
        </>
      }
    >
      {/* handleSubmit menjalankan validasi Zod lebih dulu; onSubmit hanya
          dipanggil kalau semua aturan lolos. */}
      <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="flex flex-col gap-5" noValidate>
        {serverError && <FormError message={serverError} />}

        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="nama@email.com"
          error={errors.email?.message}
          {...register('email')}
        />

        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          error={errors.password?.message}
          {...register('password')}
        />

        <div className="flex justify-end">
          <Link
            to="/forgot-password"
            className="text-sm text-spotify-light-gray hover:text-spotify-white hover:underline"
          >
            Lupa password?
          </Link>
        </div>

        <Button type="submit" isLoading={isSubmitting} className="w-full">
          Masuk
        </Button>
      </form>
    </AuthLayout>
  )
}
