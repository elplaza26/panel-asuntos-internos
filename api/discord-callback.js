export default async function handler(req, res) {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: 'Falta el código de autorización' });
  }

  try {
    const params = new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID,
      client_secret: process.env.DISCORD_CLIENT_SECRET,
      grant_type: 'authorization_code',
      code,
      redirect_uri: process.env.DISCORD_REDIRECT_URI,
    });

    const tokenRes = await fetch('https://discord.com/api/v10/oauth2/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params,
    });
    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      return res.status(400).json({ error: 'No se pudo validar el código con Discord', detalle: tokenData });
    }

    const userRes = await fetch('https://discord.com/api/v10/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const user = await userRes.json();

    const guildId = process.env.DISCORD_GUILD_ID;
    const botToken = process.env.DISCORD_BOT_TOKEN;

    const memberRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${user.id}`, {
      headers: { Authorization: `Bot ${botToken}` },
    });

    if (!memberRes.ok) {
      const errorText = await memberRes.text();
      return res.status(403).json({ 
        error: `Error al leer tu miembro en el servidor (Status ${memberRes.status})`, 
        detalle: errorText 
      });
    }

    const memberData = await memberRes.json();
    const userRoles = memberData.roles || [];

    // MUESTRA TUS ROLES EN LA PANTALLA ROJA
    return res.status(403).json({ 
      error: `Tus roles detectados por el bot son: [${userRoles.join(', ')}] | Tu ID de usuario es: ${user.id}` 
    });

  } catch (e) {
    return res.status(500).json({ error: 'Error interno en el servidor', detalle: String(e) });
  }
}
