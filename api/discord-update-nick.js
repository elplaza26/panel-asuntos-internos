export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  const { discordUserId, nick } = body || {};

  if (!discordUserId || !nick) {
    res.status(400).json({ error: 'Faltan datos (discordUserId o nick)' });
    return;
  }

  const guildId = process.env.DISCORD_GUILD_ID;
  const botToken = process.env.DISCORD_BOT_TOKEN;

  try {
    const resp = await fetch(`https://discord.com/api/guilds/${guildId}/members/${discordUserId}`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bot ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ nick: String(nick).slice(0, 32) }),
    });

    if (!resp.ok) {
      const errBody = await resp.text();
      res.status(400).json({ error: 'No se pudo cambiar el apodo', detalle: errBody, status: resp.status });
      return;
    }

    res.status(200).json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Error interno', detalle: String(e) });
  }
}
