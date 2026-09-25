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

const MailIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className="h-5 w-5" aria-hidden="true">
    <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5v-11Z" />
    <path d="m4.5 6.5 7.2 6.3a1.5 1.5 0 0 0 2 0L21 6.5" />
  </svg>
)

const LockIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className="h-5 w-5" aria-hidden="true">
    <rect x="6" y="10" width="12" height="9" rx="1.5" />
    <path d="M9 10V8a3 3 0 0 1 6 0v2" />
    <circle cx="12" cy="14.5" r="1" fill="currentColor" stroke="none" />
  </svg>
)

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
          <Link to="/register" className="font-semibold text-spotify-white underline decoration-white/20 underline-offset-4 hover:decoration-white">
            Daftar sekarang
          </Link>
        </>
      }
    >
      <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="flex flex-col gap-4" noValidate>
        {serverError && <FormError message={serverError} />}

        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="nama@email.com"
          leftIcon={MailIcon}
          error={errors.email?.message}
          {...register('email')}
        />

        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          placeholder="••••••••"
          leftIcon={LockIcon}
          error={errors.password?.message}
          {...register('password')}
        />

        <div className="flex justify-end -mt-1">
          <Link
            to="/forgot-password"
            className="text-sm text-spotify-light-gray underline decoration-transparent underline-offset-4 transition-colors hover:text-spotify-white hover:decoration-white/30"
          >
            Lupa password?
          </Link>
        </div>

        <Button type="submit" isLoading={isSubmitting} className="mt-1 w-full py-3.5 text-[0.9375rem]">
          Masuk
        </Button>
      </form>
    </AuthLayout>
  )
}
