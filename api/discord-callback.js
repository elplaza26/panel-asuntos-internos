export default async function handler(req, res) {
  const { code } = req.query;

  if (!code) {
    res.status(400).json({ error: 'Falta el código de autorización' });
    return;
  }

  try {
    const params = new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID,
      client_secret: process.env.DISCORD_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.DISCORD_REDIRECT_URI,
    });

    const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });
    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      res.status(400).json({ error: 'No se pudo validar el código con Discord', detalle: tokenData });
      return;
    }

    const userRes = await fetch('https://discord.com/api/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const user = await userRes.json();

    // Verificar los roles del usuario dentro del servidor, usando el bot
    let autorizado = false;
    let esDai = false;
    let esPolicia = false;
    let debugInfo = '';

    try {
      const guildId = process.env.DISCORD_GUILD_ID;
      const memberRes = await fetch(`https://discord.com/api/guilds/${guildId}/members/${user.id}`, {
        headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` },
      });

      if (memberRes.ok) {
        const member = await memberRes.json();
        const rolesUsuario = member.roles || [];

        const rolesDai = (process.env.DISCORD_ALLOWED_ROLE_IDS || '')
          .split(',').map(r => r.trim()).filter(Boolean);
        const rolesPolicia = (process.env.DISCORD_ROLE_POLICIA_IDS || '')
          .split(',').map(r => r.trim()).filter(Boolean);

        esDai = rolesDai.some(r => rolesUsuario.includes(r));
        esPolicia = rolesPolicia.some(r => rolesUsuario.includes(r));
        autorizado = esDai || esPolicia;

        if (!autorizado) {
          debugInfo = `No se encontró ninguno de los roles autorizados en tu cuenta. Roles detectados: [${rolesUsuario.join(', ')}]`;
        }
      } else {
        const errBody = await memberRes.text();
        debugInfo = `No se pudo leer tu membresía en el servidor (código ${memberRes.status}). Revisa que el bot esté agregado al servidor "Rebelión" y que DISCORD_GUILD_ID / DISCORD_BOT_TOKEN estén bien puestos en Vercel. Detalle: ${errBody}`;
      }
    } catch (e) {
      debugInfo = 'Error al verificar el rol: ' + String(e);
    }

    res.status(200).json({
      id: user.id,
      username: user.username,
      global_name: user.global_name || user.username,
      avatar: user.avatar
        ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
        : null,
      autorizado,
      esDai,
      esPolicia,
      debugInfo,
    });
  } catch (e) {
    res.status(500).json({ error: 'Error interno en el servidor', detalle: String(e) });
  }
}
