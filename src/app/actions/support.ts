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

  // Send email notification via Resend API
  try {
    const emailRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.RESEND_API_KEY || ''}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "support@getcrewmark.com",
        to: "support@getcrewmark.com",
        subject: "New Contact Form Submission",
        html: `<p><strong>From:</strong> ${validatedFields.data.name}</p>
               <p><strong>Email:</strong> ${validatedFields.data.email}</p>
               <p><strong>Message:</strong> ${validatedFields.data.message}</p>`
      })
    })

    if (!emailRes.ok) {
      const errText = await emailRes.text()
      console.error('Resend error status:', emailRes.status, errText)
    } else {
      const data = await emailRes.json()
      console.log('Resend success:', data)
    }
  } catch (emailErr) {
    console.error('Error calling Resend API:', emailErr)
  }

  return { success: true }
}
