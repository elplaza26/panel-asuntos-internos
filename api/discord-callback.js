export default async function handler(req, res) {
  const { code } = req.query;

  if (!code) {
    return res.status(400).json({ error: 'Falta el código de autorización' });
  }

  try {
    // 1. Obtener access_token del usuario
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

    // 2. Obtener datos del usuario
    const userRes = await fetch('https://discord.com/api/v10/users/@me', {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const user = await userRes.json();

    // 3. Consultar datos del miembro en el servidor con el Bot Token
    const guildId = process.env.DISCORD_GUILD_ID;
    const botToken = process.env.DISCORD_BOT_TOKEN;
    const DAI_ROLE_ID = "1521954294017036340"; // ID fija del rol DAI

    const memberRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${user.id}`, {
      headers: { Authorization: `Bot ${botToken}` },
    });

    if (!memberRes.ok) {
      return res.status(403).json({ error: 'El usuario no pertenece al servidor de Discord especificado.' });
    }

    const memberData = await memberRes.json();
    const userRoles = memberData.roles || [];

    // 4. Comprobar si el usuario posee el rol de DAI
    const hasDaiRole = userRoles.includes(DAI_ROLE_ID);

    if (!hasDaiRole) {
      return res.status(403).json({ error: 'Tu cuenta de Discord no tiene el rol autorizado para entrar a este panel.' });
    }

    // 5. Retornar éxito
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
