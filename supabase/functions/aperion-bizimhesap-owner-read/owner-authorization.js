/**
 * Owner JWT access gate for AperiON BizimHesap read-only endpoint.
 * Never treat a Supabase anon token or service_role credential as owner identity.
 * Auth identity is established by Supabase Auth getUser, not by decoding JWT
 * claims locally. Admin authorization comes from aperion_users in the database.
 */
export function bearerToken(headers) {
  const value = String(headers.get('authorization') || '').trim();
  const match = /^Bearer\s+([A-Za-z0-9._~+/-]+={0,2})$/i.exec(value);
  return match ? match[1] : '';
}

export async function authorizeOwnerRead({
  request, anonKey, serviceRoleKey, authClient, dbClient
}) {
  const token = bearerToken(request.headers);
  if (!token || token === anonKey || token === serviceRoleKey) {
    return {authorized:false,reason:'OWNER_USER_JWT_REQUIRED'};
  }
  if (!authClient || !dbClient) {
    return {authorized:false,reason:'OWNER_AUTH_NOT_CONFIGURED'};
  }
  try {
    const {data:userData,error:userError} = await authClient.auth.getUser(token);
    const userId=userData?.user?.id;
    if (userError || !userId) return {authorized:false,reason:'OWNER_JWT_INVALID'};
    const {data:admins,error:roleError} = await dbClient
      .from('aperion_users')
      .select('rol')
      .eq('user_id',userId)
      .eq('rol','admin')
      .limit(1);
    if (roleError || !admins?.length) return {authorized:false,reason:'OWNER_ADMIN_ROLE_REQUIRED'};
    return {authorized:true,reason:'OWNER_SESSION_VERIFIED'};
  } catch {
    return {authorized:false,reason:'OWNER_AUTH_UNAVAILABLE'};
  }
}
