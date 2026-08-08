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
    const DAI_ROLE_ID = "1521954294017036340";

    const memberRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${user.id}`, {
      headers: { Authorization: `Bot ${botToken}` },
    });

    if (!memberRes.ok) {
      const errorText = await memberRes.text();
      return res.status(403).json({ 
        error: `El bot no pudo leer tus datos en el servidor (Status: ${memberRes.status})`, 
        detalle: errorText 
      });
    }

    const memberData = await memberRes.json();
    const userRoles = memberData.roles || [];

    const hasDaiRole = userRoles.includes(DAI_ROLE_ID);

    if (!hasDaiRole) {
      return res.status(403).json({ 
        error: `Tu cuenta de Discord no tiene el rol autorizado. Roles detectados: ${userRoles.join(', ')}` 
      });
    }

    return res.status(200).json({
      id: user.id,
      username: user.username,
      global_name: user.global_name || user.username,
      avatar: user.avatar
        ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png`
        : null,
      roles: userRoles,
      authorized: true
    });

  } catch (e) {
    return res.status(500).json({ error: 'Error interno en el servidor', detalle: String(e) });
  }
}
