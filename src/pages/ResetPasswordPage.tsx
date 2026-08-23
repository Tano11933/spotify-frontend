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
          <Link to="/forgot-password" className="font-semibold text-spotify-white hover:underline">
            Minta tautan baru
          </Link>
        }
      >
        <p className="text-sm text-spotify-light-gray">
          Pastikan kamu membuka tautan langsung dari email, tanpa memotong bagian belakangnya.
          Tautan hanya berlaku 15 menit sejak dikirim.
        </p>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Buat password baru"
      description="Password lama akan langsung diganti setelah ini."
      footer={
        <Link to="/login" className="font-semibold text-spotify-white hover:underline">
          Kembali ke halaman masuk
        </Link>
      }
    >
      <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="flex flex-col gap-5" noValidate>
        {serverError && <FormError message={serverError} />}

        <Input
          label="Password baru"
          type="password"
          autoComplete="new-password"
          placeholder="Minimal 8 karakter"
          error={errors.newPassword?.message}
          {...register('newPassword')}
        />

        <Input
          label="Konfirmasi password baru"
          type="password"
          autoComplete="new-password"
          placeholder="Ulangi password baru"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <Button type="submit" isLoading={isSubmitting} className="w-full">
          Simpan password baru
        </Button>
      </form>
    </AuthLayout>
  )
}
