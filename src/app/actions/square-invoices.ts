'use server'

import { createClient } from '@/lib/supabase/server'
import { SquareClient, SquareEnvironment } from 'square'
import { randomUUID } from 'crypto'

// Environment variables — set these in .env.local
// SQUARE_APPLICATION_ID=sq0idp-...
// SQUARE_APPLICATION_SECRET=sq0csp-...
// SQUARE_ENVIRONMENT=sandbox | production
const applicationId = process.env.SQUARE_APPLICATION_ID!
const applicationSecret = process.env.SQUARE_APPLICATION_SECRET!
const env = process.env.SQUARE_ENVIRONMENT || 'sandbox'

// Creates an authenticated SquareClient using the tenant's access token
function getSquareClient(accessToken?: string) {
  return new SquareClient({
    environment: env === 'production' ? SquareEnvironment.Production : SquareEnvironment.Sandbox,
    token: accessToken,
  })
}

// ─────────────────────────────────────────────────────────────
// Just-In-Time Token Refresh
// ─────────────────────────────────────────────────────────────
async function getValidAccessToken(orgId: string): Promise<string | null> {
  const supabase = await createClient()

  const { data: org, error } = await supabase
    .from('organizations')
    .select('square_access_token, square_refresh_token, square_token_expires_at')
    .eq('id', orgId)
    .single()

  if (error || !org?.square_access_token) return null

  // If token expires within the next 5 minutes, refresh it proactively
  const expiresAt = org.square_token_expires_at ? new Date(org.square_token_expires_at) : null
  const nowPlus5 = new Date(Date.now() + 5 * 60 * 1000)

  if (expiresAt && expiresAt < nowPlus5) {
    if (!org.square_refresh_token) return null

    try {
      // Use an unauthenticated client for the refresh token grant
      const authClient = getSquareClient()

      // v44 SDK: oAuth (not oAuthApi)
      const refreshResponse = await authClient.oAuth.obtainToken({
        clientId: applicationId,
        clientSecret: applicationSecret,
        grantType: 'refresh_token',
        refreshToken: org.square_refresh_token,
      })

      const newAccessToken = refreshResponse.accessToken
      const newRefreshToken = refreshResponse.refreshToken
      const newExpiresAt = refreshResponse.expiresAt
        ? new Date(refreshResponse.expiresAt)
        : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

      if (!newAccessToken || !newRefreshToken) {
        throw new Error('Incomplete token refresh response')
      }

      await supabase
        .from('organizations')
        .update({
          square_access_token: newAccessToken,
          square_refresh_token: newRefreshToken,
          square_token_expires_at: newExpiresAt.toISOString(),
        })
        .eq('id', orgId)

      return newAccessToken
    } catch (err) {
      console.error('JIT token refresh failed:', err)
      return null
    }
  }

  return org.square_access_token
}

// ─────────────────────────────────────────────────────────────
// Public types
// ─────────────────────────────────────────────────────────────
export interface LineItem {
  name: string
  /** Amount in cents, e.g. 15000 = $150.00 */
  amountInCents: number
}

export interface InvoiceRequest {
  clientName: string
  clientEmail: string
  lineItems: LineItem[]
}

// ─────────────────────────────────────────────────────────────
// Main Server Action
// ─────────────────────────────────────────────────────────────
export async function createSquareInvoice(req: InvoiceRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) throw new Error('Unauthorized')

    const { data: role } = await supabase
      .from('user_roles')
      .select('org_id')
      .eq('user_id', user.id)
      .single()

    if (!role?.org_id) throw new Error('Organization not found')

    // 1. Get a valid (possibly freshly-refreshed) access token
    const accessToken = await getValidAccessToken(role.org_id)
    if (!accessToken) {
      return {
        error: 'Square disconnected. Please reconnect your account in Settings.',
        requiresReauth: true,
      }
    }

    const client = getSquareClient(accessToken)

    // 2. Get the first active location for this merchant
    // v44 SDK: client.locations (not client.locationsApi)
    const locationsResponse = await client.locations.list()
    const locationId = locationsResponse.locations?.find(loc => loc.status === 'ACTIVE')?.id
    if (!locationId) throw new Error('No active Square location found for this account')

    // 3. Find or create the customer by email
    // v44 SDK: client.customers (not client.customersApi)
    let customerId: string | undefined

    const searchResponse = await client.customers.search({
      query: {
        filter: {
          emailAddress: {
            exact: req.clientEmail,
          },
        },
      },
    })

    if (searchResponse.customers && searchResponse.customers.length > 0) {
      customerId = searchResponse.customers[0].id
    } else {
      const createResponse = await client.customers.create({
        idempotencyKey: randomUUID(),
        givenName: req.clientName.split(' ')[0],
        familyName: req.clientName.split(' ').slice(1).join(' ') || undefined,
        emailAddress: req.clientEmail,
      })
      customerId = createResponse.customer?.id
    }

    if (!customerId) throw new Error('Failed to create or find customer in Square')

    // 4. Create an Order with line items
    // v44 SDK: client.orders (not client.ordersApi)
    // Note: amounts are plain numbers in cents — no BigInt required in v44
    const orderResponse = await client.orders.create({
      idempotencyKey: randomUUID(),
      order: {
        locationId,
        customerId,
        lineItems: req.lineItems.map(item => ({
          name: item.name,
          basePriceMoney: {
            amount: BigInt(item.amountInCents),
            currency: 'USD',
          },
          quantity: '1',
        })),
      },
    })

    const orderId = orderResponse.order?.id
    if (!orderId) throw new Error('Failed to create Square order')

    // 5. Create the Invoice tied to the Order
    // v44 SDK: client.invoices (not client.invoicesApi)
    const invoiceResponse = await client.invoices.create({
      idempotencyKey: randomUUID(),
      invoice: {
        orderId,
        locationId,
        primaryRecipient: { customerId },
        deliveryMethod: 'EMAIL',
        paymentRequests: [
          {
            requestType: 'BALANCE',
            dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
              .toISOString()
              .slice(0, 10), // YYYY-MM-DD, due in 7 days
          },
        ],
      },
    })

    const invoice = invoiceResponse.invoice
    if (!invoice?.id || invoice.version === undefined) {
      throw new Error('Failed to create Square invoice')
    }

    // 6. Publish the Invoice — triggers email delivery to the client
    // v44 SDK: publish() takes a single request object with invoiceId inside
    const publishResponse = await client.invoices.publish({
      invoiceId: invoice.id,
      idempotencyKey: randomUUID(),
      version: invoice.version,
    })

    return {
      success: true,
      invoiceUrl: publishResponse.invoice?.publicUrl,
    }

  } catch (error: any) {
    console.error('Square Invoice Error:', error)
    return { error: error.message || 'An unexpected error occurred while generating the invoice.' }
  }
}
