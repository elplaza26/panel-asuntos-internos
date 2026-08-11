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
    channelId, discordUserId, autorizadoPorId, autorizadoPorNombre,
    agenteNombre, agentePlaca, motivo, gravedad, warns, strikes,
  } = body || {};

  if (!channelId) {
    res.status(400).json({ error: 'Falta el ID del canal' });
    return;
  }

  const etiquetaGravedad = { leve: 'Amonestación (Warn)', grave: 'Strike disciplinario', baja: 'Baja del cuerpo' };
  const colorGravedad = { leve: 3900151, grave: 15105570, baja: 15158332 };

  const miembroTexto = discordUserId ? `<@${discordUserId}>` : agenteNombre;
  const autorizoTexto = autorizadoPorId ? `<@${autorizadoPorId}>` : (autorizadoPorNombre || 'Asuntos Internos');

  const payload = {
    embeds: [{
      title: '📋 Notificación de Asuntos Internos',
      description: `Se ha registrado una acción disciplinaria contra ${miembroTexto}.`,
      color: colorGravedad[gravedad] || 3447003,
      fields: [
        { name: 'Oficial sancionado', value: `${miembroTexto}${agentePlaca ? ` · Placa #${agentePlaca}` : ''}`, inline: false },
        { name: 'Registrado por', value: autorizoTexto, inline: false },
        { name: 'Motivo', value: motivo || 'Sin especificar', inline: false },
        { name: 'Tipo de acción', value: etiquetaGravedad[gravedad] || gravedad || '—', inline: true },
        { name: 'Amonestaciones activas', value: `${warns ?? 0}`, inline: true },
        { name: 'Strikes activos', value: `${strikes ?? 0}`, inline: true },
      ],
      footer: { text: 'DAI Rebelión · Este registro puede apelarse ante Asuntos Internos.' },
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
