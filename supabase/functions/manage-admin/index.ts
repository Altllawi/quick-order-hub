import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey)
    
    // Get the authorization header to verify the requesting user
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Create a client with the user's token to verify their identity
    const userClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    })
    
    const { data: { user }, error: userError } = await userClient.auth.getUser()
    if (userError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid user token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { action, email, password, restaurant_id, user_id } = await req.json()

    // Check if requesting user is super admin or has access to the restaurant
    const { data: isSuperAdmin } = await supabase.rpc('is_super_admin', { _user_id: user.id })
    
    let hasAccess = isSuperAdmin
    if (!hasAccess && restaurant_id) {
      const { data: hasRestaurantAccess } = await supabase.rpc('has_restaurant_access', { 
        _user_id: user.id, 
        _restaurant_id: restaurant_id 
      })
      hasAccess = hasRestaurantAccess
    }

    if (!hasAccess) {
      return new Response(JSON.stringify({ error: 'Access denied' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'create-admin') {
      // Check if user exists
      const { data: existingUsers } = await supabase.auth.admin.listUsers()
      const existingUser = existingUsers?.users?.find(u => u.email === email)

      let targetUserId: string

      if (existingUser) {
        targetUserId = existingUser.id
      } else {
        // Create new user
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        })

        if (createError) {
          return new Response(JSON.stringify({ error: createError.message }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          })
        }

        targetUserId = newUser.user.id
      }

      // Check if already linked to restaurant
      const { data: existingLink } = await supabase
        .from('restaurant_users')
        .select('id')
        .eq('user_id', targetUserId)
        .eq('restaurant_id', restaurant_id)
        .maybeSingle()

      if (existingLink) {
        return new Response(JSON.stringify({ error: 'User is already an admin of this restaurant' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Link user to restaurant
      const { error: linkError } = await supabase
        .from('restaurant_users')
        .insert({ user_id: targetUserId, restaurant_id })

      if (linkError) {
        return new Response(JSON.stringify({ error: linkError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({ success: true, user_id: targetUserId }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'remove-admin') {
      const { error } = await supabase
        .from('restaurant_users')
        .delete()
        .eq('user_id', user_id)
        .eq('restaurant_id', restaurant_id)

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'list-admins') {
      const { data: restaurantUsers, error: ruError } = await supabase
        .from('restaurant_users')
        .select('*')
        .eq('restaurant_id', restaurant_id)

      if (ruError) {
        return new Response(JSON.stringify({ error: ruError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      // Get user details for each admin
      const admins = await Promise.all(
        (restaurantUsers || []).map(async (ru) => {
          const { data: userData } = await supabase.auth.admin.getUserById(ru.user_id)
          return {
            id: ru.id,
            user_id: ru.user_id,
            restaurant_id: ru.restaurant_id,
            created_at: ru.created_at,
            email: userData.user?.email || 'Unknown',
          }
        })
      )

      return new Response(JSON.stringify({ admins }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (action === 'list-all-admins' && isSuperAdmin) {
      const { data: restaurantUsers, error: ruError } = await supabase
        .from('restaurant_users')
        .select('*, restaurants(name)')

      if (ruError) {
        return new Response(JSON.stringify({ error: ruError.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }

      const admins = await Promise.all(
        (restaurantUsers || []).map(async (ru) => {
          const { data: userData } = await supabase.auth.admin.getUserById(ru.user_id)
          return {
            id: ru.id,
            user_id: ru.user_id,
            restaurant_id: ru.restaurant_id,
            restaurant_name: (ru.restaurants as any)?.name || 'Unknown',
            created_at: ru.created_at,
            email: userData.user?.email || 'Unknown',
          }
        })
      )

      return new Response(JSON.stringify({ admins }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error?.message || 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})