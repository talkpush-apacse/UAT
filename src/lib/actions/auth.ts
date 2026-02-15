'use server'

import { redirect } from 'next/navigation'
import {
  verifyAdminPassword,
  createAdminSession,
  destroyAdminSession,
} from '@/lib/utils/admin-auth'

export interface AuthState {
  error?: string
}

export async function loginAdmin(
  _prevState: AuthState,
  formData: FormData
): Promise<AuthState> {
  const password = formData.get('password') as string

  if (!password) {
    return { error: 'Password is required' }
  }

  if (!verifyAdminPassword(password)) {
    return { error: 'Invalid password' }
  }

  await createAdminSession()
  redirect('/admin')
}

export async function logoutAdmin(): Promise<void> {
  destroyAdminSession()
  redirect('/admin/login')
}
