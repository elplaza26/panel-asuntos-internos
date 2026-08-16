export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método no permitido' });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch (e) { body = {}; }
  }
  const { discordUserId, rolAnteriorId, rolNuevoId, rolBaseId, soloRoles, agregarRoles, quitarRoles } = body || {};

  if (!discordUserId || (!rolAnteriorId && !rolNuevoId && !rolBaseId && !soloRoles && !agregarRoles && !quitarRoles)) {
    res.status(400).json({ error: 'Faltan datos (discordUserId y al menos un rol a agregar, quitar, o soloRoles)' });
    return;
  }

  const guildId = process.env.DISCORD_GUILD_ID;
  const botToken = process.env.DISCORD_BOT_TOKEN;
  const headers = { Authorization: `Bot ${botToken}` };

  const resultado = { agregado: false, agregadoBase: false, quitado: false, reemplazado: false, errores: [] };

  try {
    // Modo "expulsión": reemplaza TODOS los roles del miembro por únicamente los indicados
    if (soloRoles) {
      const patchRes = await fetch(
        `https://discord.com/api/guilds/${guildId}/members/${discordUserId}`,
        { method: 'PATCH', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify({ roles: soloRoles }) }
      );
      if (patchRes.ok) {
        resultado.reemplazado = true;
      } else {
        const errText = await patchRes.text();
        resultado.errores.push(`No se pudieron reemplazar los roles (código ${patchRes.status}): ${errText}`);
      }
      res.status(200).json(resultado);
      return;
    }

    // Modo "lista de roles": agrega varios de golpe (ej. divisiones) y/o quita varios
    if (agregarRoles || quitarRoles) {
      for (const rolId of (agregarRoles || [])) {
        const r = await fetch(
          `https://discord.com/api/guilds/${guildId}/members/${discordUserId}/roles/${rolId}`,
          { method: 'PUT', headers }
        );
        if (r.ok) resultado.agregado = true;
        else resultado.errores.push(`No se pudo agregar el rol ${rolId} (código ${r.status})`);
      }
      for (const rolId of (quitarRoles || [])) {
        const r = await fetch(
          `https://discord.com/api/guilds/${guildId}/members/${discordUserId}/roles/${rolId}`,
          { method: 'DELETE', headers }
        );
        if (r.ok) resultado.quitado = true;
        else resultado.errores.push(`No se pudo quitar el rol ${rolId} (código ${r.status})`);
      }
      res.status(200).json(resultado);
      return;
    }

    // Agregar el nuevo rol, si se pidió
    if (rolNuevoId) {
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
    }

    // Agregar el rol base (ej. "Policía"), si se pidió — nunca se quita, siempre se asegura que lo tenga
    if (rolBaseId && rolBaseId !== rolNuevoId) {
      const baseRes = await fetch(
        `https://discord.com/api/guilds/${guildId}/members/${discordUserId}/roles/${rolBaseId}`,
        { method: 'PUT', headers }
      );
      if (baseRes.ok) {
        resultado.agregadoBase = true;
      } else {
        const errText = await baseRes.text();
        resultado.errores.push(`No se pudo agregar el rol base (código ${baseRes.status}): ${errText}`);
      }
    }

    // Quitar el rol anterior, si aplica y es distinto del nuevo o del base
    if (rolAnteriorId && rolAnteriorId !== rolNuevoId && rolAnteriorId !== rolBaseId) {
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
