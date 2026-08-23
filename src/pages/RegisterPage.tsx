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
      // confirmPassword sengaja TIDAK dikirim. Field itu murni urusan UI —
      // backend tidak mengenalnya (lihat RegisterRequest di auth_dto.go), dan
      // mengirim field asing hanya menambah data yang harus diabaikan server.
      await registerUser({
        name: values.name,
        email: values.email,
        password: values.password,
      })

      // Endpoint register mengembalikan User tanpa token, jadi login dipanggil
      // menyusul supaya user tidak perlu mengetik kredensial yang sama dua kali.
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
          <Link to="/login" className="font-semibold text-spotify-white hover:underline">
            Masuk di sini
          </Link>
        </>
      }
    >
      <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="flex flex-col gap-5" noValidate>
        {serverError && <FormError message={serverError} />}

        <Input
          label="Nama"
          type="text"
          autoComplete="name"
          placeholder="Nama kamu"
          error={errors.name?.message}
          {...register('name')}
        />

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
          // autoComplete="new-password" memberi tahu password manager bahwa ini
          // pendaftaran, sehingga yang ditawarkan adalah password baru yang kuat,
          // bukan mengisi otomatis password lama.
          autoComplete="new-password"
          placeholder="Minimal 8 karakter"
          error={errors.password?.message}
          {...register('password')}
        />

        <Input
          label="Konfirmasi password"
          type="password"
          autoComplete="new-password"
          placeholder="Ulangi password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <Button type="submit" isLoading={isSubmitting} className="w-full">
          Daftar
        </Button>
      </form>
    </AuthLayout>
  )
}
