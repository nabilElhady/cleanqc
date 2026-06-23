export interface SendEmailParams {
  to: string
  subject: string
  html: string
}

/**
 * Reusable helper to send transactional emails using Resend's REST API.
 * Uses native fetch to remain lightweight and dependency-free.
 */
export async function sendTransactionalEmail({ to, subject, html }: SendEmailParams): Promise<{ id: string }> {
  const apiKey = process.env.RESEND_API_KEY

  if (!apiKey) {
    console.error('[Resend Utility] RESEND_API_KEY environment variable is missing.')
    throw new Error('Email provider API key is not configured.')
  }

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Crewmark Support <support@getcrewmark.com>',
        to,
        subject,
        html,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('[Resend Utility] Failed to send email via Resend API:', {
        status: response.status,
        statusText: response.statusText,
        error: errorText,
      })
      throw new Error(`Resend API error: ${response.status} - ${errorText}`)
    }

    const data = await response.json()
    console.log(`[Resend Utility] Email successfully sent to ${to}. Message ID: ${data.id}`)
    return data
  } catch (error: any) {
    console.error('[Resend Utility] Exception during email dispatch:', error)
    throw error
  }
}
