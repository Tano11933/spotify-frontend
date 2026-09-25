import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router'

import { AuthLayout, FormError } from '@/components/layout/AuthLayout'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { authApi, getApiErrorMessage } from '@/lib/api'
import { forgotPasswordSchema, type ForgotPasswordInput } from '@/schemas/auth.schema'

const MailIcon = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.7} className="h-5 w-5" aria-hidden="true">
    <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4h11A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 17.5v-11Z" />
    <path d="m4.5 6.5 7.2 6.3a1.5 1.5 0 0 0 2 0L21 6.5" />
  </svg>
)

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
        <Link to="/login" className="font-semibold text-spotify-white underline decoration-white/20 underline-offset-4 hover:decoration-white">
          Kembali ke halaman masuk
        </Link>
      }
    >
      {successMessage ? (
        <div className="rounded-lg border border-spotify-green/20 bg-spotify-green/10 px-4 py-4">
          <div className="flex gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-spotify-green text-spotify-black-pure">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="h-4 w-4" aria-hidden="true"><path d="M5 13l4 4L19 7" /></svg>
            </span>
            <div>
              <p className="text-sm font-semibold text-spotify-white">Tautan terkirim</p>
              <p className="mt-1 text-sm leading-relaxed text-spotify-light-gray">{successMessage}</p>
              <p className="mt-2 text-xs leading-relaxed text-spotify-light-gray/70">
                Cek juga folder spam kalau emailnya belum muncul. Tautannya berlaku 15 menit.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="flex flex-col gap-4" noValidate>
          {serverError && <FormError message={serverError} />}

          <Input
            label="Email"
            type="email"
            autoComplete="email"
            placeholder="nama@email.com"
            leftIcon={MailIcon}
            hint="Kami kirim tautan reset ke alamat ini"
            error={errors.email?.message}
            {...register('email')}
          />

          <Button type="submit" isLoading={isSubmitting} className="mt-1 w-full py-3.5 text-[0.9375rem]">
            Kirim tautan reset
          </Button>
        </form>
      )}
    </AuthLayout>
  )
}
