import crypto from 'crypto';
import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    }),
  });
}
const db = admin.firestore();

export const config = {
  api: { bodyParser: false },
};

function getRawBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => { data += chunk; });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function verifyDiscordSignature(publicKeyHex, signatureHex, timestamp, body) {
  try {
    const publicKey = crypto.createPublicKey({
      key: Buffer.concat([
        Buffer.from('302a300506032b6570032100', 'hex'), // prefijo SPKI para Ed25519
        Buffer.from(publicKeyHex, 'hex'),
      ]),
      format: 'der',
      type: 'spki',
    });
    const signature = Buffer.from(signatureHex, 'hex');
    const message = Buffer.from(timestamp + body);
    return crypto.verify(null, message, publicKey, signature);
  } catch (e) {
    return false;
  }
}

async function buscarAgentePorDiscord(discordUserId) {
  const snap = await db.collection('agentes').where('discord', '==', discordUserId).limit(1).get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...doc.data() };
}

async function buscarTurnoActivo(agenteId) {
  const snap = await db.collection('bitacoras')
    .where('agenteId', '==', agenteId)
    .where('estadoTurno', '==', 'activo')
    .limit(1).get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...doc.data() };
}

async function crearBitacora(agenteId) {
  const now = Date.now();
  const fecha = new Date().toISOString().slice(0, 10);
  await db.collection('bitacoras').add({
    agenteId,
    tipo: 'Servicio regular',
    fecha,
    desc: 'Turno registrado desde Discord',
    entradaTs: now,
    salidaTs: null,
    estadoTurno: 'activo',
    creado: now,
  });
}

async function cerrarBitacora(turno) {
  const salida = Date.now();
  const duracionMin = Math.max(1, Math.round((salida - turno.entradaTs) / 60000));
  await db.collection('bitacoras').doc(turno.id).update({
    salidaTs: salida,
    estadoTurno: 'completado',
    duracionMin,
  });
  return duracionMin;
}

async function crearAgenteDesdeDiscord({ nombre, nombreOOC, placa, aprobadoPor, discordId }) {
  const id = placa ? ('placa-' + placa) : ('nombre-' + crypto.randomBytes(6).toString('hex'));
  const now = Date.now();
  await db.collection('agentes').doc(id).set({
    placa: placa || '',
    nombre,
    nombreOOC: nombreOOC || '',
    discord: discordId,
    rango: 'Cadete',
    subdivision: '',
    departamento: '',
    estado: 'pendiente',
    notas: aprobadoPor ? `Ingreso vía Discord — aprobado por: ${aprobadoPor}` : 'Ingreso vía Discord',
    creado: now,
  }, { merge: true });
}

export default async function handler(req, res) {
  const signature = req.headers['x-signature-ed25519'];
  const timestamp = req.headers['x-signature-timestamp'];
  const rawBody = await getRawBody(req);

  const isValid = verifyDiscordSignature(process.env.DISCORD_PUBLIC_KEY, signature, timestamp, rawBody);
  if (!isValid) {
    res.status(401).end('invalid request signature');
    return;
  }

  const interaction = JSON.parse(rawBody);

  // Discord verifica que tu servidor esté vivo con un PING
  if (interaction.type === 1) {
    res.status(200).json({ type: 1 });
    return;
  }

  // Clic en un botón
  if (interaction.type === 3) {
    const customId = interaction.data.custom_id;
    const discordUserId = interaction.member?.user?.id || interaction.user?.id;

    // Botón "Postularme al cuerpo" — no requiere estar registrado todavía
    if (customId === 'postularme' || customId === 'postularme_2') {
      res.status(200).json({
        type: 9,
        data: {
          custom_id: 'form_postulacion',
          title: 'Registro de Nuevo Oficial',
          components: [
            { type: 1, components: [{ type: 4, custom_id: 'nombre_ic', label: 'Nombre del personaje (IC)', style: 1, required: true, max_length: 80 }] },
            { type: 1, components: [{ type: 4, custom_id: 'nombre_ooc', label: 'Tu nombre o usuario (OOC)', style: 1, required: true, max_length: 80 }] },
            { type: 1, components: [{ type: 4, custom_id: 'placa', label: 'Número de placa (si ya lo tienes)', style: 1, required: false, max_length: 10 }] },
            { type: 1, components: [{ type: 4, custom_id: 'aprobado_por', label: 'Reclutador que autorizó tu ingreso', style: 1, required: true, max_length: 80 }] },
          ],
        },
      });
      return;
    }

    try {
      const agente = await buscarAgentePorDiscord(discordUserId);
      if (!agente) {
        res.status(200).json({
          type: 4,
          data: { content: '⚠️ No encontramos tu ID de Discord registrado en el panel. Contacta a Asuntos Internos.', flags: 64 },
        });
        return;
      }

      if (customId === 'marcar_entrada') {
        const yaActivo = await buscarTurnoActivo(agente.id);
        if (yaActivo) {
          res.status(200).json({ type: 4, data: { content: '⚠️ Ya tienes un turno activo. Usa "Marcar Salida" primero.', flags: 64 } });
          return;
        }
        await crearBitacora(agente.id);
        res.status(200).json({ type: 4, data: { content: `✅ Entrada registrada — tu turno inició ahora, ${agente.nombre}.`, flags: 64 } });
        return;
      }

      if (customId === 'marcar_salida') {
        const activo = await buscarTurnoActivo(agente.id);
        if (!activo) {
          res.status(200).json({ type: 4, data: { content: '⚠️ No tienes ningún turno activo para cerrar.', flags: 64 } });
          return;
        }
        const duracionMin = await cerrarBitacora(activo);
        res.status(200).json({ type: 4, data: { content: `🔴 Salida registrada — turno de ${duracionMin} minutos guardado en el panel.`, flags: 64 } });
        return;
      }

      res.status(200).json({ type: 4, data: { content: 'Interacción no reconocida.', flags: 64 } });
    } catch (e) {
      res.status(200).json({ type: 4, data: { content: 'Ocurrió un error al procesar tu solicitud. Intenta de nuevo.', flags: 64 } });
    }
    return;
  }

  // Envío de un formulario (modal)
  if (interaction.type === 5) {
    const customId = interaction.data.custom_id;

    if (customId === 'form_postulacion') {
      const discordUserId = interaction.member?.user?.id || interaction.user?.id;
      const valores = {};
      interaction.data.components.forEach((fila) => {
        const campo = fila.components[0];
        valores[campo.custom_id] = campo.value;
      });

      try {
        const yaExiste = await buscarAgentePorDiscord(discordUserId);
        if (yaExiste) {
          res.status(200).json({ type: 4, data: { content: `⚠️ Ya existe un expediente asociado a tu cuenta (${yaExiste.nombre}). Contacta a Asuntos Internos si necesitas corregir algo.`, flags: 64 } });
          return;
        }
        await crearAgenteDesdeDiscord({
          nombre: valores.nombre_ic,
          nombreOOC: valores.nombre_ooc,
          placa: valores.placa,
          aprobadoPor: valores.aprobado_por,
          discordId: discordUserId,
        });
        res.status(200).json({ type: 4, data: { content: `✅ ¡Listo! Tu solicitud quedó registrada y **pendiente de aprobación** por el DAI. En cuanto te acepten, se te asignará tu rol automáticamente.`, flags: 64 } });
      } catch (e) {
        res.status(200).json({ type: 4, data: { content: 'Ocurrió un error al registrar tu ingreso. Avisa a Asuntos Internos.', flags: 64 } });
      }
      return;
    }

    res.status(200).json({ type: 4, data: { content: 'Formulario no reconocido.', flags: 64 } });
    return;
  }

  res.status(200).json({});
}
