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
        'Esto **no es el ingreso final** — es una preselección que revisa el equipo antes de que puedas pedir tu rango real. Se completa en **2 fases cortas** (Discord no deja hacer formularios más largos de una).\n\n' +
        '**Pasos a seguir:**\n' +
        '1. Presiona **Presolicitar** y completa la Fase 1.\n' +
        '2. Al terminar, te va a salir un botón para pasar a la Fase 2 — complétala también.\n' +
        '3. Tu presolicitud queda pendiente de revisión en el panel.\n' +
        '4. El DAI o Directiva la aprueba o la rechaza.\n' +
        '5. Si te aprueban, ahí se te asigna el rol de **Preseleccionado** — recién entonces puedes usar el botón de "Solicitar rango".',
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
