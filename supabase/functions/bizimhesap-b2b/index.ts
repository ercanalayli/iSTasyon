import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"
import { legacyB2BRequestGuard, safeVendorId } from "./legacy-read-guard.js"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const BH_BASE = 'https://bizimhesap.com/api/b2b'

function sb() {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
}

async function getCreds(supabase: any) {
  const { data, error } = await supabase
    .from('integrations')
    .select('api_token')
    .eq('provider', 'bizimhesap')
    .eq('is_active', true)
    .single()
  if (error || !data?.api_token) throw new Error('BizimHesap token integrations tablosunda bulunamadi.')
  return { token: data.api_token }
}

async function bhGet(path: string, token: string) {
  const res = await fetch(`${BH_BASE}${path}`, { headers: { token } })
  return { status: res.status, data: await res.json().catch(() => ({})) }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const url = new URL(req.url)
    const action = url.searchParams.get('action')
    const guard = legacyB2BRequestGuard(req.method, action)
    if (!guard.allowed) {
      return new Response(JSON.stringify({ ok: false, error: guard.error, financialWrites: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: guard.status,
      })
    }
    const needsId = action === 'inventory' || action === 'abstract' || action === 'supplierabstract'
    const safeId = needsId ? safeVendorId(url.searchParams.get(action === 'inventory' ? 'depoId' : 'musteriId')) : null
    if (needsId && !safeId) return new Response(JSON.stringify({ ok: false, error: 'INVALID_VENDOR_ID' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
    })
    const supabase = sb()
    const { token } = await getCreds(supabase)

    let result
    if (action === 'products') result = await bhGet('/products', token)
    else if (action === 'warehouses') result = await bhGet('/warehouses', token)
    else if (action === 'inventory') result = await bhGet(`/inventory/${encodeURIComponent(safeId!)}`, token)
    else if (action === 'customers') result = await bhGet('/customers', token)
    else if (action === 'suppliers') result = await bhGet('/suppliers', token)
    else if (action === 'abstract') result = await bhGet(`/abstract/${encodeURIComponent(safeId!)}`, token)
    else if (action === 'supplierabstract') result = await bhGet(`/supplierabstract/${encodeURIComponent(safeId!)}`, token)
    return new Response(JSON.stringify(result.data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: result.status,
    })
  } catch (error) {
    return new Response(JSON.stringify({ ok: false, error: 'UPSTREAM_READ_UNAVAILABLE', financialWrites: 0 }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 502,
    })
  }
})
