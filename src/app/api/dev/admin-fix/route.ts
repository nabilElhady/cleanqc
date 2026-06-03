import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return new NextResponse(
        `<html>
          <head>
            <title>CleanQC Account Diagnostics</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #09090B; color: #E4E4E7; padding: 40px; display: flex; align-items: center; justify-content: center; min-h: 100vh; margin: 0; }
              .card { border: 1px solid #E4E4E715; padding: 32px; max-width: 500px; width: 100%; background: #09090B; box-shadow: 0 4px 30px rgba(0, 0, 0, 0.5); }
              h1 { color: #EF4444; font-size: 20px; font-weight: 700; margin-top: 0; margin-bottom: 16px; font-family: monospace; letter-spacing: -0.5px; }
              p { font-size: 14px; color: #A1A1AA; line-height: 1.5; margin-bottom: 24px; }
              a { display: inline-block; width: 100%; text-align: center; background: #E4E4E7; color: #09090B; padding: 12px; font-weight: bold; text-decoration: none; font-size: 14px; transition: background 0.15s; }
              a:hover { background: #A1A1AA; }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>NOT LOGGED IN</h1>
              <p>We couldn't detect an active user session. Please log in to your account first, then open this page again.</p>
              <a href="/login">Go to Login</a>
            </div>
          </body>
        </html>`,
        { headers: { 'Content-Type': 'text/html' } }
      )
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('org_id, role, display_name')
      .eq('id', user.id)
      .single()

    if (profileError || !profile || !profile.org_id) {
      return new NextResponse(
        `<html>
          <head>
            <title>CleanQC Account Diagnostics</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #09090B; color: #E4E4E7; padding: 40px; display: flex; align-items: center; justify-content: center; min-h: 100vh; margin: 0; }
              .card { border: 1px solid #E4E4E715; padding: 32px; max-width: 500px; width: 100%; background: #09090B; box-shadow: 0 4px 30px rgba(0, 0, 0, 0.5); }
              h1 { color: #F59E0B; font-size: 20px; font-weight: 700; margin-top: 0; margin-bottom: 16px; font-family: monospace; }
              p { font-size: 14px; color: #A1A1AA; line-height: 1.5; margin-bottom: 24px; }
              .meta { font-family: monospace; background: #18181B; padding: 12px; border: 1px solid #E4E4E710; font-size: 12px; color: #E4E4E7; margin-bottom: 24px; }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>ORGANIZATION NOT FOUND</h1>
              <p>We found your account, but there is no associated organization ID to link the subscription to.</p>
              <div class="meta">
                User Email: ${user.email}<br/>
                Profile Status: ${profileError ? profileError.message : 'No Org ID assigned'}
              </div>
            </div>
          </body>
        </html>`,
        { headers: { 'Content-Type': 'text/html' } }
      )
    }

    // Update using admin client
    const adminSupabase = createAdminClient()
    
    // Fetch current status
    const { data: currentOrg } = await adminSupabase
      .from('organizations')
      .select('*')
      .eq('id', profile.org_id)
      .single()

    const { error: updateError } = await adminSupabase
      .from('organizations')
      .update({
        subscription_status: 'active',
      })
      .eq('id', profile.org_id)

    if (updateError) {
      return new NextResponse(
        `<html>
          <head>
            <title>CleanQC Account Diagnostics</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #09090B; color: #E4E4E7; padding: 40px; display: flex; align-items: center; justify-content: center; min-h: 100vh; margin: 0; }
              .card { border: 1px solid #E4E4E715; padding: 32px; max-width: 500px; width: 100%; background: #09090B; box-shadow: 0 4px 30px rgba(0, 0, 0, 0.5); }
              h1 { color: #EF4444; font-size: 20px; font-weight: 700; margin-top: 0; margin-bottom: 16px; font-family: monospace; }
              p { font-size: 14px; color: #A1A1AA; line-height: 1.5; margin-bottom: 24px; }
              .meta { font-family: monospace; background: #18181B; padding: 12px; border: 1px solid #E4E4E710; font-size: 12px; color: #E4E4E7; }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>ACTIVATION FAILED</h1>
              <p>Could not update your organization status in the database.</p>
              <div class="meta">
                Org ID: ${profile.org_id}<br/>
                Error: ${updateError.message}
              </div>
            </div>
          </body>
        </html>`,
        { headers: { 'Content-Type': 'text/html' } }
      )
    }

    return new NextResponse(
      `<html>
        <head>
          <title>CleanQC Account Diagnostics</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #09090B; color: #E4E4E7; padding: 40px; display: flex; align-items: center; justify-content: center; min-h: 100vh; margin: 0; }
            .card { border: 1px solid #E4E4E715; padding: 32px; max-width: 500px; width: 100%; background: #09090B; box-shadow: 0 4px 30px rgba(0, 0, 0, 0.5); }
            h1 { color: #10B981; font-size: 20px; font-weight: 700; margin-top: 0; margin-bottom: 16px; font-family: monospace; }
            p { font-size: 14px; color: #A1A1AA; line-height: 1.5; margin-bottom: 24px; }
            .meta { font-family: monospace; background: #18181B; padding: 16px; border: 1px solid #E4E4E710; font-size: 12px; color: #E4E4E7; margin-bottom: 24px; line-height: 1.6; }
            .badge { background: rgba(16, 185, 129, 0.15); border: 1px solid #10B981; color: #10B981; padding: 2px 6px; font-size: 11px; font-weight: bold; text-transform: uppercase; }
            a { display: inline-block; width: 100%; text-align: center; background: #10B981; color: #FFFFFF; padding: 12px; font-weight: bold; text-decoration: none; font-size: 14px; transition: background 0.15s; }
            a:hover { background: #059669; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>SUBSCRIPTION ACTIVATED</h1>
            <p>Your subscription has been successfully forced to active in the database!</p>
            <div class="meta">
              <strong>User:</strong> ${user.email} (${profile.display_name || 'N/A'})<br/>
              <strong>Org ID:</strong> ${profile.org_id}<br/>
              <strong>Previous Status:</strong> ${currentOrg?.subscription_status || 'null'}<br/>
              <strong>New Status:</strong> <span class="badge">active</span>
            </div>
            <a href="/dashboard">Go to Dashboard</a>
          </div>
        </body>
      </html>`,
      { headers: { 'Content-Type': 'text/html' } }
    )
  } catch (err: any) {
    return new NextResponse(
      `<html>
        <head>
          <title>CleanQC Account Diagnostics</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #09090B; color: #E4E4E7; padding: 40px; display: flex; align-items: center; justify-content: center; min-h: 100vh; margin: 0; }
            .card { border: 1px solid #E4E4E715; padding: 32px; max-width: 500px; width: 100%; background: #09090B; box-shadow: 0 4px 30px rgba(0, 0, 0, 0.5); }
            h1 { color: #EF4444; font-size: 20px; font-weight: 700; margin-top: 0; margin-bottom: 16px; font-family: monospace; }
            pre { font-family: monospace; background: #18181B; padding: 12px; border: 1px solid #E4E4E710; font-size: 12px; color: #EF4444; overflow-x: auto; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>CRITICAL SYSTEM ERROR</h1>
            <pre>${err.stack || err.message || err}</pre>
          </div>
        </body>
      </html>`,
      { headers: { 'Content-Type': 'text/html' } }
    )
  }
}
