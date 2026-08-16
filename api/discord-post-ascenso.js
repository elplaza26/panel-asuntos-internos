export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  const {
    channelId, discordUserId, agenteNombre, agentePlaca,
    rangoAnterior, rangoNuevo, aprobadoPorNombre,
  } = body || {};

  if (!channelId) {
    res.status(400).json({ error: 'Falta el ID del canal' });
    return;
  }

  const miembroTexto = discordUserId ? `<@${discordUserId}>` : (agenteNombre || 'Un oficial');

  const payload = {
    embeds: [{
      title: '🎖️ Ascenso de Rango — DAI Rebelión',
      description: `${miembroTexto} fue ascendido dentro del cuerpo. ¡Felicidades por el esfuerzo y la dedicación!`,
      color: 15844367,
      fields: [
        { name: 'Oficial ascendido', value: `${miembroTexto}${agentePlaca ? ` · Placa #${agentePlaca}` : ''}`, inline: false },
        { name: 'Rango anterior', value: rangoAnterior || '—', inline: true },
        { name: 'Rango nuevo', value: rangoNuevo || '—', inline: true },
        ...(aprobadoPorNombre ? [{ name: 'Aprobado por', value: aprobadoPorNombre, inline: false }] : []),
      ],
      footer: { text: 'DAI Rebelión · Sistema de Ascensos' },
      timestamp: new Date().toISOString(),
    }],
  };

  try {
    const resp = await fetch(`https://discord.com/api/channels/${channelId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    const data = await resp.json();
    if (!resp.ok) {
      res.status(400).json({ error: 'No se pudo publicar el mensaje', detalle: data });
      return;
    }
    res.status(200).json({ ok: true, mensajeId: data.id });
  } catch (e) {
    res.status(500).json({ error: 'Error interno', detalle: String(e) });
  }
}
