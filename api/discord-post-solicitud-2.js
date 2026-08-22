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
        'Esto **no es el ingreso final** — al presionar el botón solo se te asigna el rol de **Preseleccionado**, sin crear ningún expediente todavía.\n\n' +
        '**Pasos a seguir:**\n' +
        '1. Presiona **Presolicitar** — no hay formulario, es un clic directo.\n' +
        '2. Se te asigna el rol de Preseleccionado.\n' +
        '3. Con ese rol, ve al canal de **"Solicitar rango"** y completa tu ingreso real ahí.',
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
