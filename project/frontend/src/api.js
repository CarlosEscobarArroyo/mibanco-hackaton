const BASE = '/api'

async function jget(url) {
  const r = await fetch(BASE + url)
  if (!r.ok) throw new Error('Error ' + r.status)
  return r.json()
}

async function jpost(url, body) {
  const r = await fetch(BASE + url, {
    method: 'POST',
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  })
  if (!r.ok) throw new Error('Error ' + r.status)
  return r.json()
}

export const api = {
  config: () => jget('/config'),
  listar: (vista) => jget(`/solicitudes?vista=${vista}`),
  detalle: (id) => jget(`/solicitudes/${id}`),
  crear: (formData) => fetch(BASE + '/solicitudes', { method: 'POST', body: formData }).then(r => {
    if (!r.ok) throw new Error('Error ' + r.status)
    return r.json()
  }),
  importarMsg: (file, area) => {
    const fd = new FormData()
    fd.append('archivo', file)
    if (area) fd.append('area', area)
    return fetch(BASE + '/solicitudes/importar', { method: 'POST', body: fd }).then(async r => {
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).detail || ('Error ' + r.status))
      return r.json()
    })
  },
  aceptarPaso2: (id) => jpost(`/solicitudes/${id}/paso2/aceptar`),
  revalidarPaso2: (id, contenido) => jpost(`/solicitudes/${id}/paso2/revalidar`, { contenido }),
  subirImagen: (id, file, reemplazaId) => {
    const fd = new FormData()
    fd.append('imagen', file)
    if (reemplazaId) fd.append('reemplazaId', reemplazaId)
    return fetch(BASE + `/solicitudes/${id}/paso3/imagen`, { method: 'POST', body: fd }).then(r => {
      if (!r.ok) throw new Error('Error ' + r.status)
      return r.json()
    })
  },
  revalidarPaso4: (id, contenido) => jpost(`/solicitudes/${id}/paso4/revalidar`, { contenido }),
  aceptarPaso4: (id) => jpost(`/solicitudes/${id}/paso4/aceptar`),
  aprobar: (id) => jpost(`/solicitudes/${id}/aprobar`),
  publicar: (id) => jpost(`/solicitudes/${id}/publicar`),
  rechazar: (id, mensaje) => jpost(`/solicitudes/${id}/rechazar`, { mensaje }),
  generarConsejoRechazo: (id) => jpost(`/solicitudes/${id}/consejo_rechazo`),
}
