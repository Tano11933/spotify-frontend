import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link, useNavigate, useSearchParams } from 'react-router'

import { AuthLayout, FormError } from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { authApi, getApiErrorMessage } from '@/lib/api'
import { resetPasswordSchema, type ResetPasswordInput } from '@/schemas/auth.schema'
import { useToastStore } from '@/store/toastStore'

const LockIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className="h-5 w-5" aria-hidden="true">
    <rect x="6" y="10" width="12" height="9" rx="1.5" />
    <path d="M9 10V8a3 3 0 0 1 6 0v2" />
    <circle cx="12" cy="14.5" r="1" fill="currentColor" stroke="none" />
  </svg>
)

export function ResetPasswordPage() {
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const navigate = useNavigate()
  const pushToast = useToastStore((state) => state.push)
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetPasswordInput>({
    resolver: zodResolver(resetPasswordSchema),
    mode: 'onTouched',
  })

  async function onSubmit(values: ResetPasswordInput) {
    if (!token) return
    setServerError(null)
    try {
      await authApi.resetPassword({ token, new_password: values.newPassword })
      pushToast({
        title: 'Password berhasil diubah',
        description: 'Silakan masuk dengan password barumu.',
        variant: 'success',
      })
      void navigate('/login', { replace: true })
    } catch (error) {
      setServerError(getApiErrorMessage(error))
    }
  }

  if (!token) {
    return (
      <AuthLayout
        title="Tautan tidak valid"
        description="Tautan reset password tidak lengkap atau sudah kedaluwarsa."
        footer={
          <Link to="/forgot-password" className="font-semibold text-spotify-white underline decoration-white/20 underline-offset-4 hover:decoration-white">
            Minta tautan baru
          </Link>
        }
      >
        <div className="rounded-lg border border-amber-500/20 bg-amber-500/10 px-4 py-3">
          <p className="text-sm leading-relaxed text-amber-200">
            Pastikan kamu membuka tautan langsung dari email, tanpa memotong bagian belakangnya. Tautan hanya berlaku 15 menit sejak dikirim.
          </p>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Buat password baru"
      description="Password lama akan langsung diganti setelah ini."
      footer={
        <Link to="/login" className="font-semibold text-spotify-white underline decoration-white/20 underline-offset-4 hover:decoration-white">
          Kembali ke halaman masuk
        </Link>
      }
    >
      <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="flex flex-col gap-4" noValidate>
        {serverError && <FormError message={serverError} />}

        <Input
          label="Password baru"
          type="password"
          autoComplete="new-password"
          placeholder="Minimal 8 karakter"
          leftIcon={LockIcon}
          hint="Minimal 8 karakter, kombinasi huruf & angka lebih aman"
          error={errors.newPassword?.message}
          {...register('newPassword')}
        />

        <Input
          label="Konfirmasi password baru"
          type="password"
          autoComplete="new-password"
          placeholder="Ulangi password baru"
          leftIcon={LockIcon}
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <Button type="submit" isLoading={isSubmitting} className="mt-1 w-full py-3.5 text-[0.9375rem]">
          Simpan password baru
        </Button>
      </form>
    </AuthLayout>
  )
}
