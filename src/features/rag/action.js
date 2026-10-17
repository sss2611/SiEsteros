// src/features/rag/action.js
// Ficha de acción sugerida, armada por reglas y plantillas (sin modelo de lenguaje).

import { TYPE_INFO } from '../../shared/constants.js';

export const RESOURCE_LABEL = {
  ambulancia: 'Ambulancia',
  camion_bomberos: 'Camión de bomberos',
  bote_rescate: 'Bote de rescate',
  camioneta_policia: 'Camioneta de policía',
  camion_cisterna: 'Camión cisterna',
  grupo_electrogeno: 'Grupo electrógeno',
  bomba_achique: 'Bomba de achique',
  camioneta_ayuda: 'Camioneta de ayuda (ONG)',
};

const PROTOCOL_ACTION = {
  pr01: { step: 'Enviar embarcación de rescate; indicar subir a planta alta o techo y no cruzar el agua.', resources: ['bote_rescate'] },
  pr02: { step: 'Priorizar traslado asistido por tandas, con personal sanitario; verificar medicación y oxígeno.', resources: ['ambulancia'] },
  pr03: { step: 'Enviar camión cisterna y bidones; indicar potabilizar el agua antes de consumirla.', resources: ['camion_cisterna', 'camioneta_ayuda'] },
  pr04: { step: 'Acordonar el perímetro, cortar gas y electricidad y pedir evaluación de ingeniería civil.', resources: ['camioneta_policia', 'camion_bomberos'] },
  pr05: { step: 'Enviar ambulancia con personal sanitario y derivar al hospital más cercano con acceso.', resources: ['ambulancia'] },
  pr06: { step: 'Usar bote o vehículo alto, informar rutas cortadas y mantener contacto por radio.', resources: ['bote_rescate', 'camion_bomberos'] },
  pr07: { step: 'Resguardar a los menores en planta alta, controlar el listado y derivar a un refugio cuando sea seguro.', resources: ['camioneta_policia'] },
  pr08: { step: 'Cortar el suministro eléctrico antes de ingresar; enviar grupo electrógeno y bomba de achique.', resources: ['grupo_electrogeno', 'bomba_achique'] },
  pr09: { step: 'Enviar bomberos, cortar electricidad y gas, y no aplicar agua sobre instalaciones energizadas.', resources: ['camion_bomberos'] },
};

export function buildAction(report, place, results) {
  const type = TYPE_INFO[report.type]?.label ?? report.type;
  const parts = [
    place?.name ?? 'Ubicación sin lugar cargado',
    `${report.people ?? 'cantidad sin confirmar de'} personas`,
    type.toLowerCase(),
  ];
  if (report.vulnerable) parts.push('hay vulnerables');
  if (report.access === false) parts.push('sin acceso');

  // Pasos: los 2 protocolos más relevantes
  const top = results.slice(0, 2).filter((h) => PROTOCOL_ACTION[h.id]);
  const steps = top.map((h) => PROTOCOL_ACTION[h.id].step);
  const resources = [...new Set(top.flatMap((h) => PROTOCOL_ACTION[h.id].resources))];

  return { summary: parts.join(' · '), steps, resources };
}