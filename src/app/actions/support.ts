'use server'

import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const SupportMessageSchema = z.object({
  name: z.string().min(1, 'Name is required.').max(100).trim(),
  email: z.string().email('Invalid email address.').max(254).toLowerCase().trim(),
  message: z.string().min(10, 'Message must be at least 10 characters.').max(2000).trim()
})

export type SupportFormState = {
  success?: boolean
  error?: string
}

export async function submitSupportMessage(
  prevState: SupportFormState | null,
  formData: FormData
): Promise<SupportFormState> {
  const rawFields = {
    name: formData.get('name'),
    email: formData.get('email'),
    message: formData.get('message')
  }

  const validatedFields = SupportMessageSchema.safeParse(rawFields)

  if (!validatedFields.success) {
    const errorMsg = Object.values(validatedFields.error.flatten().fieldErrors)
      .flat()
      .join(' ')
    return { error: errorMsg }
  }

  const supabase = await createClient()

  const { error } = await supabase
    .from('support_messages')
    .insert([
      {
        name: validatedFields.data.name,
        email: validatedFields.data.email,
        message: validatedFields.data.message
      }
    ])

  if (error) {
    console.error('Support message insert error:', error)
    return { error: 'Failed to send message. Please try again later or use the direct email.' }
  }

  return { success: true }
}
