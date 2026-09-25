import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate } from 'react-router'

import { AuthLayout, FormError } from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { getApiErrorMessage } from '@/lib/api'
import { registerSchema, type RegisterInput } from '@/schemas/auth.schema'
import { useAuthStore } from '@/store/authStore'
import { useToastStore } from '@/store/toastStore'

const UserIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className="h-5 w-5" aria-hidden="true">
    <circle cx="12" cy="8" r="3.2" />
    <path d="M5.5 18.5a6.5 6.5 0 0 1 13 0" />
  </svg>
)
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

export function RegisterPage() {
  const registerUser = useAuthStore((state) => state.register)
  const login = useAuthStore((state) => state.login)
  const pushToast = useToastStore((state) => state.push)
  const navigate = useNavigate()
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    mode: 'onTouched',
  })

  async function onSubmit(values: RegisterInput) {
    setServerError(null)
    try {
      await registerUser({
        name: values.name,
        email: values.email,
        password: values.password,
      })
      await login({ email: values.email, password: values.password })
      pushToast({ title: 'Akun berhasil dibuat', variant: 'success' })
      void navigate('/', { replace: true })
    } catch (error) {
      setServerError(getApiErrorMessage(error))
    }
  }

  return (
    <AuthLayout
      title="Daftar"
      description="Buat akun gratis untuk mulai mendengarkan."
      footer={
        <>
          Sudah punya akun?{' '}
          <Link to="/login" className="font-semibold text-spotify-white underline decoration-white/20 underline-offset-4 hover:decoration-white">
            Masuk di sini
          </Link>
        </>
      }
    >
      <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="flex flex-col gap-4" noValidate>
        {serverError && <FormError message={serverError} />}

        <Input
          label="Nama"
          type="text"
          autoComplete="name"
          placeholder="Nama kamu"
          leftIcon={UserIcon}
          hint="Minimal 2 karakter, maksimal 100"
          error={errors.name?.message}
          {...register('name')}
        />

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
          autoComplete="new-password"
          placeholder="Minimal 8 karakter"
          leftIcon={LockIcon}
          hint="Gunakan kombinasi huruf, angka & simbol"
          error={errors.password?.message}
          {...register('password')}
        />

        <Input
          label="Konfirmasi password"
          type="password"
          autoComplete="new-password"
          placeholder="Ulangi password"
          leftIcon={LockIcon}
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <Button type="submit" isLoading={isSubmitting} className="mt-1 w-full py-3.5 text-[0.9375rem]">
          Daftar
        </Button>
      </form>
    </AuthLayout>
  )
}
