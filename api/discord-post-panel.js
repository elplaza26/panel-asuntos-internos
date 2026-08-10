export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  const { channelId } = body || {};
  if (!channelId) {
    res.status(400).json({ error: 'Falta el ID del canal' });
    return;
  }

  const payload = {
    embeds: [{
      title: '🛡️ DAI Rebelión — Marcaje de Servicio',
      description:
        'Todo oficial activo debe fichar su entrada y salida en cada turno de patrullaje. Esto alimenta directamente tu expediente en el panel de Asuntos Internos.\n\n' +
        '**Cómo usarlo:**\n' +
        '🟢 Presiona **Marcar Entrada** al comenzar tu servicio.\n' +
        '🔴 Presiona **Marcar Salida** al terminar.\n' +
        '📊 Tus horas y tu progreso quedan guardados solos, sin que tengas que avisarle a nadie.',
      color: 15105570,
      footer: { text: 'DAI Rebelión · Sistema de control de personal' },
    }],
    components: [{
      type: 1,
      components: [
        { type: 2, style: 3, label: 'Marcar Entrada', custom_id: 'marcar_entrada', emoji: { name: '✅' } },
        { type: 2, style: 4, label: 'Marcar Salida', custom_id: 'marcar_salida', emoji: { name: '🔴' } },
      ],
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
