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
      title: '📝 Solicitud de Ingreso al Cuerpo',
      description:
        '**Pasos a seguir:**\n' +
        '1. Presiona **Solicitar rango** (solo cuando estés aprobado).\n' +
        '2. Completa tus datos en el formulario.\n' +
        '3. Tu solicitud queda pendiente de revisión.\n' +
        '4. En cuanto te aprueben, ya eres parte del cuerpo policial.',
      color: 3066993,
      footer: { text: 'DAI Rebelión · Sistema de reclutamiento' },
    }],
    components: [{
      type: 1,
      components: [
        { type: 2, style: 1, label: 'Solicitar rango', custom_id: 'postularme', emoji: { name: '📝' } },
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
