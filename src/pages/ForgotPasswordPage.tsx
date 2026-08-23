import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router'

import { AuthLayout, FormError } from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { authApi, getApiErrorMessage } from '@/lib/api'
import { forgotPasswordSchema, type ForgotPasswordInput } from '@/schemas/auth.schema'

export function ForgotPasswordPage() {
  const [serverError, setServerError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    mode: 'onTouched',
  })

  async function onSubmit(values: ForgotPasswordInput) {
    setServerError(null)
    try {
      const response = await authApi.forgotPassword(values)

      setSuccessMessage(response.message)
    } catch (error) {
      setServerError(getApiErrorMessage(error))
    }
  }

  return (
    <AuthLayout
      title="Lupa password"
      description="Masukkan email akunmu. Kami kirimkan tautan untuk membuat password baru."
      footer={
        <Link to="/login" className="font-semibold text-spotify-white hover:underline">
          Kembali ke halaman masuk
        </Link>
      }
    >
      {successMessage ? (
        <div className="rounded-md border-l-4 border-spotify-green bg-spotify-elevated px-4 py-3">
          <p className="text-sm text-spotify-white">{successMessage}</p>
          <p className="mt-2 text-sm text-spotify-light-gray">
            Cek juga folder spam kalau emailnya belum muncul. Tautannya berlaku 15 menit.
          </p>
        </div>
      ) : (
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

          <Button type="submit" isLoading={isSubmitting} className="w-full">
            Kirim tautan reset
          </Button>
        </form>
      )}
    </AuthLayout>
  )
}
