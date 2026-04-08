// SUBSTITUIR apenas o método _headers() no api.js existente:
_headers() {
  const client = Auth._getClient();
  // Pega o token JWT da sessão atual do Supabase Auth
  const session = client.auth.session ? client.auth.session() : null;
  // Para Supabase JS v2, o token fica no storage
  let token = NEXO.SUPABASE_KEY; // fallback: anon key
  try {
    const stored = localStorage.getItem(
      'sb-' + NEXO.SUPABASE_URL.split('//')[1].split('.')[0] + '-auth-token'
    );
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed && parsed.access_token) token = parsed.access_token;
    }
  } catch(e) {}
  return {
    'apikey':        NEXO.SUPABASE_KEY,
    'Authorization': 'Bearer ' + token,
    'Content-Type':  'application/json',
    'Prefer':        'return=representation'
  };
},
