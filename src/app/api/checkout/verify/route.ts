import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { Paddle, Environment } from '@paddle/paddle-node-sdk'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

const paddleApiKey = process.env.PADDLE_API_KEY
const paddleEnv = process.env.NEXT_PUBLIC_PADDLE_ENV || 'sandbox'

const paddle = new Paddle(paddleApiKey || '', {
  environment: paddleEnv === 'production' ? Environment.production : Environment.sandbox,
})

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const txnId = searchParams.get('txnId')

  if (!txnId) {
    return NextResponse.json({ error: 'Missing transaction ID parameter' }, { status: 400 })
  }

  if (!paddleApiKey) {
    return NextResponse.json({ error: 'Server key configuration error' }, { status: 500 })
  }

  // 1. Authenticate user
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // 2. Fetch user's profile to get org_id
  const { data: profile } = await supabase
    .from('profiles')
    .select('org_id')
    .eq('id', user.id)
    .single()

  if (!profile?.org_id) {
    return NextResponse.json({ error: 'No organization associated with this user' }, { status: 400 })
  }

  try {
    // 3. Fetch transaction details from Paddle API
    const transaction = await paddle.transactions.get(txnId)

    if (!transaction) {
      return NextResponse.json({ error: 'Transaction not found in Paddle' }, { status: 404 })
    }

    // 4. Verify transaction customData matches user's orgId to prevent spoofing
    const customDataOrgId = transaction.customData?.orgId
    if (customDataOrgId !== profile.org_id) {
      console.warn(`Verify fraud check warning: Transaction orgId (${customDataOrgId}) does not match user orgId (${profile.org_id})`)
      return NextResponse.json({ error: 'Unauthorized: Transaction organization mismatch' }, { status: 403 })
    }

    // 5. Verify transaction is paid / billed / completed
    const paidStatuses = ['completed', 'paid', 'billed']
    const isPaid = paidStatuses.includes(transaction.status)

    if (!isPaid) {
      return NextResponse.json({
        success: false,
        error: `Transaction status is '${transaction.status}' (not paid)`,
      })
    }

    // 6. Update subscription status in Supabase using the admin service role client
    const supabaseAdmin = createAdminClient()
    const { error: dbError } = await supabaseAdmin
      .from('organizations')
      .update({
        subscription_status: 'active', // Mark active
        paddle_subscription_id: transaction.subscriptionId || null,
      })
      .eq('id', profile.org_id)

    if (dbError) {
      console.error(`Database error during transaction verification update:`, dbError)
      return NextResponse.json({ error: 'Failed to update organization billing state' }, { status: 500 })
    }

    console.log(`Transaction verification success: Org ${profile.org_id} upgraded to active via transaction ${txnId}`)

    return NextResponse.json({ success: true, status: 'active' })
  } catch (err: any) {
    console.error('Error verifying Paddle transaction:', err)
    return NextResponse.json({ error: err.message || 'Error checking transaction' }, { status: 500 })
  }
}
