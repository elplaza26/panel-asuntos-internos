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
      title: '📝 Presolicitud de Ingreso al Cuerpo',
      description:
        'Esto es una **preinscripción**, no el ingreso final — sirve para dejar registrado tu interés en unirte antes de completar el proceso formal.\n\n' +
        '**Pasos a seguir:**\n' +
        '1. Presiona **Presolicitar** y completa tus datos.\n' +
        '2. Tu preinscripción queda pendiente de revisión.\n' +
        '3. Un reclutador la evalúa y te contacta.\n' +
        '4. Si calificas, ahí se te da la aprobación final y pasas a formar parte del cuerpo.',
      color: 3066993,
      footer: { text: 'DAI Rebelión · Presolicitud de reclutamiento' },
    }],
    components: [{
      type: 1,
      components: [
        { type: 2, style: 1, label: 'Presolicitar', custom_id: 'postularme_2', emoji: { name: '📝' } },
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
