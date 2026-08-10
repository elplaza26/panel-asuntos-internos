export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  const { discordUserId, rolAnteriorId, rolNuevoId } = body || {};

  if (!discordUserId || !rolNuevoId) {
    res.status(400).json({ error: 'Faltan datos (discordUserId o rolNuevoId)' });
    return;
  }

  const guildId = process.env.DISCORD_GUILD_ID;
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const headers = { Authorization: `Bot ${botToken}` };

  const resultado = { agregado: false, quitado: false, errores: [] };

  try {
    // Agregar el nuevo rol
    const addRes = await fetch(
      `https://discord.com/api/guilds/${guildId}/members/${discordUserId}/roles/${rolNuevoId}`,
      { method: 'PUT', headers }
    );
    if (addRes.ok) {
      resultado.agregado = true;
    } else {
      const errText = await addRes.text();
      resultado.errores.push(`No se pudo agregar el rol nuevo (código ${addRes.status}): ${errText}`);
    }

    // Quitar el rol anterior, si aplica y es distinto del nuevo
    if (rolAnteriorId && rolAnteriorId !== rolNuevoId) {
      const removeRes = await fetch(
        `https://discord.com/api/guilds/${guildId}/members/${discordUserId}/roles/${rolAnteriorId}`,
        { method: 'DELETE', headers }
      );
      if (removeRes.ok) {
        resultado.quitado = true;
      } else {
        const errText = await removeRes.text();
        resultado.errores.push(`No se pudo quitar el rol anterior (código ${removeRes.status}): ${errText}`);
      }
    }

    res.status(200).json(resultado);
  } catch (e) {
    res.status(500).json({ error: 'Error interno', detalle: String(e) });
  }
}
