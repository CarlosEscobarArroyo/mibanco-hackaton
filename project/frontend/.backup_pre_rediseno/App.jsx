import React, { useEffect, useState } from 'react'
import { api } from './api.js'

const STEPS = [
  { n: 1, lbl: 'Recepción de solicitud' },
  { n: 2, lbl: 'Validación de redacción (IA)' },
  { n: 3, lbl: 'Validación de marca / imágenes (IA)' },
  { n: 4, lbl: 'Validación legal y cumplimiento' },
  { n: 5, lbl: 'Brief + Aprobación CX' },
]
const ST_TXT = { ok: 'Completado', obs: 'Observado', proc: 'En proceso', wait: 'Esperando CX', locked: 'Bloqueado' }
const TIPOS = ['SMS', 'Email', 'WhatsApp', 'Push notification', 'Carta', 'Speech']
const AREAS = ['Productos', 'Digital', 'Negocios', 'Marketing', 'Riesgos']

function estadoBadge(r, vista) {
  if (r.publicado) return { cls: 'b-pub', txt: 'Publicado 🚀' }
  if (r.aprobadoCX) return { cls: 'b-pub', txt: vista === 'sol' ? 'Aprobado · listo para publicar' : 'Aprobado' }
  const e = Object.values(r.estados || {})
  if (e.includes('obs')) return { cls: 'b-obs', txt: 'Con observaciones' }
  if (e.includes('wait')) return { cls: 'b-proc', txt: vista === 'sol' ? 'Esperando aprobación CX' : 'Pendiente de tu aprobación' }
  if (e.includes('proc')) return { cls: 'b-proc', txt: 'Procesando…' }
  return { cls: 'b-proc', txt: 'En proceso' }
}

export default function App() {
  const [vista, setVista] = useState('cx')
  const [lista, setLista] = useState([])
  const [selId, setSelId] = useState(null)
  const [modalStep, setModalStep] = useState(null)
  const [nuevaOpen, setNuevaOpen] = useState(false)
  const [busy, setBusy] = useState(null)
  const [toast, setToast] = useState(null)
  const [cfg, setCfg] = useState(null)

  const selected = lista.find(s => s.id === selId) || null

  useEffect(() => { api.config().then(setCfg).catch(() => {}) }, [])

  useEffect(() => {
    api.listar(vista).then(data => {
      setLista(data)
      if (selId && !data.find(s => s.id === selId)) setSelId(null)
    }).catch(e => showToast('No se pudo cargar: ' + e.message))
  }, [vista])

  function showToast(msg) { setToast(msg); setTimeout(() => setToast(null), 3200) }

  async function withBusy(msg, fn) {
    setBusy(msg)
    try { return await fn() } catch (e) { showToast('Error: ' + e.message) } finally { setBusy(null) }
  }

  function upsert(sol) {
    setLista(prev => {
      const exists = prev.find(s => s.id === sol.id)
      return exists ? prev.map(s => (s.id === sol.id ? sol : s)) : [sol, ...prev]
    })
  }

  // -------- acciones --------
  const onAceptar2 = (id) => withBusy('Aplicando corrección…', async () => upsert(await api.aceptarPaso2(id)))
  const onRevalidar2 = (id, txt) => withBusy('🔄 Re-validando redacción con IA…', async () => { const s = await api.revalidarPaso2(id, txt); upsert(s); showToast(s.estados.paso2 === 'ok' ? '✔ La IA aprobó tu versión' : '⚠ La IA encontró observaciones') })
  const onSubirImg = (id, file, repl) => withBusy('📤 Validando imagen con IA…', async () => { const s = await api.subirImagen(id, file, repl); upsert(s); showToast(s.estados.paso3 === 'ok' ? '✔ Imagen validada' : '⚠ La imagen aún tiene observaciones') })
  const onAceptar4 = (id) => withBusy('Aplicando ajuste legal…', async () => upsert(await api.aceptarPaso4(id)))
  const onRevalidar4 = (id, txt) => withBusy('🔄 Re-validando con Legal…', async () => { const s = await api.revalidarPaso4(id, txt); upsert(s); showToast(s.estados.paso4 === 'ok' ? '✔ Conforme' : '⚠ Aún hay observaciones legales') })
  const onAprobar = (id) => withBusy('Aprobando…', async () => { upsert(await api.aprobar(id)); showToast('✔ Solicitud aprobada por CX') })
  const onPublicar = (id) => withBusy('Publicando…', async () => { upsert(await api.publicar(id)); showToast('🚀 Comunicación publicada') })

  async function onImportar(file, area) {
    setNuevaOpen(false)
    await withBusy('📧 Importando correo (.msg) y validando con IA…', async () => {
      const sol = await api.importarMsg(file, area)
      const data = await api.listar(vista)
      setLista(data)
      if (data.find(s => s.id === sol.id)) setSelId(sol.id)
      else { setVista('cx'); setSelId(sol.id) }
      showToast('Correo importado como ' + sol.id)
    })
  }

  async function onCrear(form) {
    setNuevaOpen(false)
    await withBusy('🤖 Los agentes IA están validando tu comunicación…', async () => {
      const sol = await api.crear(form)
      // recarga la lista respetando la vista actual
      const data = await api.listar(vista)
      setLista(data)
      if (data.find(s => s.id === sol.id)) setSelId(sol.id)
      else { setVista('cx'); setSelId(sol.id) }
      showToast('Solicitud ' + sol.id + ' creada y validada')
    })
  }

  const who = vista === 'cx'
    ? '👀 Vista CX: ves TODAS las solicitudes de todas las áreas. CX interviene en el Paso 5 (aprobación final).'
    : '✍ Vista Solicitante: ves SOLO tus solicitudes (Área Productos). Atiendes observaciones en Pasos 2, 3 y 4 y publicas cuando CX aprueba.'

  return (
    <>
      <header>
        <span className="logo">☀ mibanco</span>
        <span className="sub">Validación de Comunicaciones · MVP IA</span>
        <span className="spacer"></span>
        {cfg && <span className="envtag">🧠 {cfg.modelo?.model} · {cfg.storage?.backend}</span>}
        {vista === 'sol' && <button className="newbtn" onClick={() => setNuevaOpen(true)}>+ Nueva solicitud</button>}
        <div className="viewtoggle">
          <button className={vista === 'cx' ? 'active' : ''} onClick={() => setVista('cx')}>Vista CX</button>
          <button className={vista === 'sol' ? 'active' : ''} onClick={() => setVista('sol')}>Vista Solicitante</button>
        </div>
      </header>

      <div className="wrap">
        <div className="who">{who}</div>
        <div className="grid">
          <div className="card">
            <h3>{vista === 'cx' ? 'Solicitudes de todas las áreas' : 'Mis solicitudes (Área Productos)'}</h3>
            {lista.length === 0
              ? <div className="empty">No hay solicitudes.</div>
              : lista.map(r => {
                const st = estadoBadge(r, vista)
                return (
                  <div key={r.id} className={'req' + (selId === r.id ? ' sel' : '')} onClick={() => setSelId(r.id)}>
                    <div className="meta">
                      <div className="ttl">{r.titulo}</div>
                      <div className="info">{r.id} · {r.remitente} · {r.fecha}</div>
                      <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                        <span className="pill area">{r.area}</span>
                        <span className="pill tipo">{r.tipo}</span>
                        {r.requiereRevisionHumana && <span className="pill riesgo">Revisión humana</span>}
                      </div>
                    </div>
                    <span className={'badge ' + st.cls}>{st.txt}</span>
                  </div>
                )
              })}
          </div>

          <div className="card">
            {selected
              ? <Detalle sol={selected} vista={vista} onOpenStep={setModalStep} />
              : <div className="empty">Selecciona una solicitud de la izquierda.</div>}
          </div>
        </div>
      </div>

      {modalStep && selected && (
        <StepModal
          sol={selected} step={modalStep} vista={vista}
          onClose={() => setModalStep(null)}
          actions={{ onAceptar2, onRevalidar2, onSubirImg, onAceptar4, onRevalidar4, onAprobar, onPublicar }}
        />
      )}

      {nuevaOpen && <NuevaModal onClose={() => setNuevaOpen(false)} onCrear={onCrear} onImportar={onImportar} />}

      {busy && <div className="busy"><div className="spinner" /><div className="msg">{busy}</div></div>}
      {toast && <div className="toast">{toast}</div>}
    </>
  )
}

function Detalle({ sol, vista, onOpenStep }) {
  const st = estadoBadge(sol, vista)
  return (
    <div className="detail">
      <div className="head">
        <div>
          <h2>{sol.titulo}</h2>
          <div className="desc">{sol.id} · {sol.tipo} · Área {sol.area} · {sol.remitente}</div>
        </div>
        <span className={'badge ' + st.cls}>{st.txt}</span>
      </div>

      {sol.requiereRevisionHumana && (
        <div className="riesgo-banner">⚠ Requiere revisión humana obligatoria ({sol.tipoRiesgo}). No se auto-aprueba en los pasos IA.</div>
      )}

      <div className="flow">
        {STEPS.map((s, i) => {
          const estado = sol.estados['paso' + s.n]
          const clickable = estado !== 'locked'
          return (
            <React.Fragment key={s.n}>
              <div className={'step ' + estado}>
                <div className="box" onClick={() => clickable && onOpenStep(s.n)}>
                  <div className="num">{s.n}</div>
                  <div className="lbl">{s.lbl}</div>
                  <div className="st">{ST_TXT[estado]}</div>
                </div>
              </div>
              {i < 4 && <div className="arrow">→</div>}
            </React.Fragment>
          )
        })}
      </div>
      <div className="hint">Haz clic en cada paso para abrir su detalle. Verde = OK · Amarillo = observado · Morado = espera CX · Azul = procesando · Gris = bloqueado.</div>

      {sol.historial && sol.historial.length > 0 && (
        <div className="histbox">
          <h4>Historial</h4>
          {sol.historial.slice(-6).map((h, i) => (
            <div key={i} className="hist"><b>{h.actor}</b> · {h.accion} <span style={{ float: 'right' }}>{h.ts}</span></div>
          ))}
        </div>
      )}
    </div>
  )
}

function Modal({ title, children, footer, onClose }) {
  return (
    <div className="overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal">
        <div className="mh"><h3>{title}</h3><button className="x" onClick={onClose}>×</button></div>
        <div className="mb">{children}</div>
        {footer && <div className="mf">{footer}</div>}
      </div>
    </div>
  )
}

function RoleTip({ children }) { return <div className="role-tip">{children}</div> }

function StepModal({ sol, step, vista, onClose, actions }) {
  const [own2, setOwn2] = useState(false)
  const [txt2, setTxt2] = useState(sol.feedbackPaso2?.contenidoCorregido || sol.contenidoActual || '')
  const [own4, setOwn4] = useState(false)
  const [txt4, setTxt4] = useState(sol.feedbackPaso4?.contenidoCorregido || sol.contenidoActual || '')
  const e = (n) => sol.estados['paso' + n]

  // ---- PASO 1 ----
  if (step === 1) return (
    <Modal title="Paso 1 · Recepción de solicitud" onClose={onClose}
      footer={<button className="btn ghost" onClick={onClose}>Cerrar</button>}>
      <div className="note ok">{sol.importadoDe === 'msg'
        ? 'Correo (.msg) de Outlook importado e interpretado automáticamente. ✔'
        : 'Solicitud recibida e interpretada automáticamente desde el correo. ✔'}</div>
      <div className="kv"><b>N° solicitud</b><span>{sol.id}</span></div>
      {sol.asunto && <div className="kv"><b>Asunto del correo</b><span>{sol.asunto}</span></div>}
      <div className="kv"><b>Remitente</b><span>{sol.remitente}</span></div>
      <div className="kv"><b>Fecha</b><span>{sol.fecha}</span></div>
      <div className="kv"><b>Área solicitante</b><span>{sol.area}</span></div>
      <div className="kv"><b>Tipo de pieza</b><span>{sol.tipo}</span></div>
      <div className="kv"><b>Asesor</b><span>{sol.asesor?.nombre || '—'} {sol.asesor?.telefono ? '· ' + sol.asesor.telefono : ''}</span></div>
      <div className="kv"><b>Contenido recibido</b><span>{sol.contenidoOriginal}</span></div>
      {sol.requiereRevisionHumana && <div className="note bad">⚠ Clasificada como <b>{sol.tipoRiesgo}</b>: requiere revisión humana obligatoria.</div>}
    </Modal>
  )

  // ---- PASO 2 ----
  if (step === 2) {
    if (e(2) === 'ok') return (
      <Modal title="Paso 2 · Validación de redacción (IA)" onClose={onClose}
        footer={<button className="btn ghost" onClick={onClose}>Cerrar</button>}>
        <div className="note ok">El agente IA revisó tono, claridad, simplicidad y formato. Sin observaciones. ✔</div>
        <div className="compare"><div className="col new"><span className="tag">Mensaje aprobado</span>{sol.contenidoActual}</div></div>
      </Modal>
    )
    const fb = sol.feedbackPaso2 || {}
    return (
      <Modal title="Paso 2 · Validación de redacción (IA)" onClose={onClose}
        footer={vista === 'sol' ? <>
          <button className="btn ghost" onClick={() => setOwn2(v => !v)}>{own2 ? 'Cancelar' : 'Hacer mi propia versión'}</button>
          {own2 && <button className="btn warn" onClick={() => actions.onRevalidar2(sol.id, txt2)}>Re-validar con IA</button>}
          <button className="btn primary" onClick={() => actions.onAceptar2(sol.id)}>Aceptar cambio y continuar</button>
        </> : <button className="btn ghost" onClick={onClose}>Cerrar</button>}>
        <RoleTip>{vista === 'sol'
          ? 'Como SOLICITANTE: revisa la propuesta del agente y decide. Acepta el cambio o escribe tu propia versión para re-validar.'
          : 'Vista CX: monitoreo. La acción de aceptar/editar la realiza el área solicitante.'}</RoleTip>
        <div className="note bad"><b>El agente detectó observaciones en la redacción:</b>
          <ul className="chk">{(fb.fallos || []).map((f, i) => <li key={i}>{f}</li>)}</ul>
          {(fb.principios || []).length > 0 && <div style={{ fontSize: 12, color: 'var(--gray-d)' }}>Principios afectados: {fb.principios.join(' · ')}</div>}
        </div>
        <div className="compare">
          <div className="col old"><span className="tag">Versión original</span>{sol.contenidoOriginal}</div>
          <div className="col new"><span className="tag">Versión corregida por IA</span>{fb.contenidoCorregido}</div>
        </div>
        {own2 && vista === 'sol' && (
          <div style={{ marginTop: 12 }}>
            <label className="fld">Escribe tu propia versión:</label>
            <textarea value={txt2} onChange={ev => setTxt2(ev.target.value)} />
          </div>
        )}
      </Modal>
    )
  }

  // ---- PASO 3 ----
  if (step === 3) {
    if (!sol.imagenes || sol.imagenes.length === 0) return (
      <Modal title="Paso 3 · Validación de marca / imágenes (IA)" onClose={onClose}
        footer={<button className="btn ghost" onClick={onClose}>Cerrar</button>}>
        <div className="note ok">Esta pieza ({sol.tipo}) no tiene imágenes adjuntas. Validación de marca no aplica. ✔</div>
      </Modal>
    )
    const allOk = sol.imagenes.every(i => i.ok)
    return (
      <Modal title="Paso 3 · Validación de marca / imágenes (IA)" onClose={onClose}
        footer={<button className="btn ghost" onClick={onClose}>Cerrar</button>}>
        <RoleTip>{vista === 'sol'
          ? 'Como SOLICITANTE: revisa cada imagen. Si hay observaciones, sube una nueva versión y el agente la validará.'
          : 'Vista CX: monitoreo. El reemplazo de imágenes lo hace el área solicitante.'}</RoleTip>
        <div className={'note' + (allOk ? ' ok' : ' bad')}>El agente comparó cada imagen contra las referencias de branding (logo, colores institucionales, proporciones).</div>
        <div className="img-row">
          {sol.imagenes.map((im, idx) => (
            <div key={idx} className={'img-card ' + (im.ok ? 'ok' : 'bad')}>
              <div className="img-thumb">{im.url ? <img src={im.url} alt={im.nombre} /> : <span>🖼 {im.nombre}</span>}</div>
              <div className="res">{im.ok ? '✔' : '✖'} {im.resultado}</div>
              <div style={{ fontSize: 11, color: 'var(--gray-d)', marginTop: 4 }}>{im.detalle}</div>
              {!im.ok && (im.sugerencias || []).length > 0 && (
                <ul className="chk" style={{ fontSize: 11 }}>{im.sugerencias.map((s, i) => <li key={i}>{s}</li>)}</ul>
              )}
              {!im.ok && vista === 'sol' && (
                <label className="btn warn" style={{ marginTop: 8, width: '100%', textAlign: 'center', display: 'block' }}>
                  Subir nueva imagen
                  <input type="file" accept="image/*" style={{ display: 'none' }}
                    onChange={ev => { if (ev.target.files[0]) actions.onSubirImg(sol.id, ev.target.files[0], im.id) }} />
                </label>
              )}
            </div>
          ))}
        </div>
      </Modal>
    )
  }

  // ---- PASO 4 ----
  if (step === 4) {
    if (e(4) === 'ok') return (
      <Modal title="Paso 4 · Validación legal y cumplimiento" onClose={onClose}
        footer={<button className="btn ghost" onClick={onClose}>Cerrar</button>}>
        <div className="note ok">Revisión de normativa, riesgos y cumplimiento completada. Sin observaciones. ✔</div>
        <ul className="chk"><li>Sin datos sensibles expuestos</li><li>No promete de más / no parece fraude</li><li>Cumple normativa aplicable</li></ul>
      </Modal>
    )
    const lg = sol.feedbackPaso4 || {}
    return (
      <Modal title="Paso 4 · Validación legal y cumplimiento" onClose={onClose}
        footer={vista === 'sol' ? <>
          <button className="btn ghost" onClick={() => setOwn4(v => !v)}>{own4 ? 'Cancelar' : 'Hacer mi propia versión'}</button>
          {own4 && <button className="btn warn" onClick={() => actions.onRevalidar4(sol.id, txt4)}>Re-validar con Legal</button>}
          <button className="btn primary" onClick={() => actions.onAceptar4(sol.id)}>Aceptar ajuste y continuar</button>
        </> : <button className="btn ghost" onClick={onClose}>Cerrar</button>}>
        <RoleTip>{vista === 'sol'
          ? 'Como SOLICITANTE: revisa las observaciones legales. Acepta el ajuste sugerido o escribe tu propia versión para re-validar.'
          : 'Vista CX: monitoreo. El ajuste por temas legales lo realiza el área solicitante.'}</RoleTip>
        <div className="note bad"><b>Legal y Cumplimiento detectó observaciones:</b>
          <ul className="chk">{(lg.observaciones || []).map((o, i) => <li key={i}>{o}</li>)}</ul>
          {(lg.sugerencias || []).length > 0 && <div style={{ fontSize: 12, color: 'var(--gray-d)' }}>Sugerencias: {lg.sugerencias.join(' · ')}</div>}
        </div>
        <div className="compare">
          <div className="col old"><span className="tag">Versión actual</span>{sol.contenidoActual}</div>
          <div className="col new"><span className="tag">Versión ajustada (legal)</span>{lg.contenidoCorregido}</div>
        </div>
        {own4 && vista === 'sol' && (
          <div style={{ marginTop: 12 }}>
            <label className="fld">Escribe tu propia versión:</label>
            <textarea value={txt4} onChange={ev => setTxt4(ev.target.value)} />
          </div>
        )}
      </Modal>
    )
  }

  // ---- PASO 5 ----
  if (step === 5) {
    const summary = STEPS.map((s, i) => {
      const est = sol.estados['paso' + s.n]
      return (
        <div key={i} className="summary-line">
          <span className={'dot ' + (est === 'ok' ? 'ok' : est)}>{est === 'ok' ? '✓' : est === 'obs' ? '!' : est === 'wait' ? '⏳' : '·'}</span>
          <b style={{ minWidth: 230 }}>{s.lbl}</b><span>{ST_TXT[est]}</span>
        </div>
      )
    })
    const brief = (
      <>
        <div className="note ok"><b>Brief generado automáticamente</b> · resumen de todos los pasos.</div>
        <div className="brief-box">{sol.brief || 'Generando brief…'}</div>
        <div className="kv" style={{ marginTop: 12 }}><b>Pieza</b><span>{sol.tipo} — {sol.titulo}</span></div>
        <div className="kv"><b>Área</b><span>{sol.area}</span></div>
        <div className="kv"><b>Versión final</b><span>{sol.contenidoActual}</span></div>
        <div style={{ marginTop: 12 }}>{summary}</div>
        {sol.requiereRevisionHumana && <div className="note bad" style={{ marginTop: 12 }}>⚠ Requiere revisión humana obligatoria ({sol.tipoRiesgo}).</div>}
      </>
    )
    if (vista === 'cx') {
      if (sol.aprobadoCX) return <Modal title="Paso 5 · Brief + Aprobación CX" onClose={onClose} footer={<button className="btn ghost" onClick={onClose}>Cerrar</button>}>{brief}<div className="note ok">✔ Solicitud aprobada por CX.</div></Modal>
      return (
        <Modal title="Paso 5 · Brief + Aprobación CX" onClose={onClose}
          footer={<>
            <button className="btn ghost" onClick={onClose}>Cerrar</button>
            <button className="btn primary" onClick={() => actions.onAprobar(sol.id)}>Aprobar solicitud</button>
          </>}>
          <RoleTip>Vista CX: aquí es donde realmente intervienes. Revisa el brief y da el visto bueno final.</RoleTip>
          {brief}
        </Modal>
      )
    }
    // vista solicitante
    if (sol.publicado) return <Modal title="Paso 5 · Publicado" onClose={onClose} footer={<button className="btn ghost" onClick={onClose}>Cerrar</button>}>{brief}<div className="note ok">🚀 Comunicación publicada / enviada al cliente.</div></Modal>
    if (sol.aprobadoCX) return (
      <Modal title="Paso 5 · Aprobado · Publicar" onClose={onClose}
        footer={<>
          <button className="btn ghost" onClick={onClose}>Cerrar</button>
          <button className="btn primary" onClick={() => actions.onPublicar(sol.id)}>Publicar comunicación</button>
        </>}>{brief}<div className="note ok">✔ CX aprobó tu solicitud. Ya puedes publicarla.</div></Modal>
    )
    return <Modal title="Paso 5 · Esperando aprobación CX" onClose={onClose} footer={<button className="btn ghost" onClick={onClose}>Cerrar</button>}>{brief}<div className="note">⏳ Tu solicitud está completa y a la espera de la aprobación del equipo CX.</div></Modal>
  }

  return null
}

function NuevaModal({ onClose, onCrear, onImportar }) {
  const AREA = 'Productos' // el solicitante pertenece al Área Productos
  const [modo, setModo] = useState('escribir') // 'escribir' | 'msg'
  const [tipo, setTipo] = useState('SMS')
  const [titulo, setTitulo] = useState('')
  const [remitente, setRemitente] = useState('')
  const [contenido, setContenido] = useState('')
  const [asesorNombre, setAsesorNombre] = useState('')
  const [asesorTelefono, setAsesorTelefono] = useState('')
  const [files, setFiles] = useState([])
  const [msgFile, setMsgFile] = useState(null)

  function submit() {
    if (modo === 'msg') {
      if (!msgFile) { alert('Selecciona un archivo .msg de Outlook.'); return }
      onImportar(msgFile, AREA)
      return
    }
    if (!contenido.trim()) { alert('Escribe el contenido de la comunicación.'); return }
    const fd = new FormData()
    fd.append('titulo', titulo || `Comunicación ${tipo}`)
    fd.append('remitente', remitente || 'Solicitante')
    fd.append('area', AREA)
    fd.append('tipo', tipo)
    fd.append('contenido', contenido)
    fd.append('asesorNombre', asesorNombre)
    fd.append('asesorTelefono', asesorTelefono)
    files.forEach(f => fd.append('imagenes', f))
    onCrear(fd)
  }

  return (
    <Modal title="Nueva solicitud de comunicación" onClose={onClose}
      footer={<>
        <button className="btn ghost" onClick={onClose}>Cancelar</button>
        <button className="btn primary" onClick={submit}>{modo === 'msg' ? 'Importar y validar con IA' : 'Enviar y validar con IA'}</button>
      </>}>
      <div className="note info">Eres el <b>solicitante (Área Productos)</b>. Elige el tipo de mensaje que quieres enviar: puedes escribirlo o adjuntar el correo de Outlook (<b>.msg</b>). Los agentes Gemini lo validan en vivo y la solicitud quedará visible también para el equipo CX.</div>

      <label className="fld">Tipo de mensaje que quieres enviar</label>
      {modo === 'escribir'
        ? <select value={tipo} onChange={e => setTipo(e.target.value)}>{TIPOS.map(t => <option key={t}>{t}</option>)}</select>
        : <select value="Email" disabled><option>Email (se detecta automáticamente del .msg)</option></select>}

      <div className="segmented">
        <button className={modo === 'escribir' ? 'active' : ''} onClick={() => setModo('escribir')}>✍️ Escribir mensaje</button>
        <button className={modo === 'msg' ? 'active' : ''} onClick={() => setModo('msg')}>📧 Adjuntar correo (.msg)</button>
      </div>

      {modo === 'escribir' ? (
        <>
          <label className="fld">Título</label>
          <input type="text" value={titulo} onChange={e => setTitulo(e.target.value)} placeholder={`Comunicación ${tipo}`} />
          <label className="fld">Remitente</label>
          <input type="text" value={remitente} onChange={e => setRemitente(e.target.value)} placeholder="Tu nombre" />
          <label className="fld">Contenido del mensaje</label>
          <textarea value={contenido} onChange={e => setContenido(e.target.value)} placeholder="Escribe el mensaje a validar…" style={{ minHeight: 110 }} />
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div><label className="fld">Asesor (nombre)</label><input type="text" value={asesorNombre} onChange={e => setAsesorNombre(e.target.value)} placeholder="Luis Pérez" /></div>
            <div><label className="fld">Asesor (teléfono)</label><input type="text" value={asesorTelefono} onChange={e => setAsesorTelefono(e.target.value)} placeholder="987 654 321" /></div>
          </div>
          <label className="fld">Imágenes adjuntas (opcional, se validan por marca)</label>
          <input type="file" accept="image/*" multiple onChange={e => setFiles(Array.from(e.target.files))} />
          {files.length > 0 && <div style={{ fontSize: 12, color: 'var(--gray-d)', marginTop: 6 }}>{files.length} imagen(es) seleccionada(s)</div>}
        </>
      ) : (
        <>
          <label className="fld">Correo de Outlook (.msg)</label>
          <label className="msgdrop" style={{ display: 'block', cursor: 'pointer' }}>
            {msgFile
              ? <span style={{ color: 'var(--green-d)', fontWeight: 600 }}>📎 {msgFile.name}</span>
              : <>📧 Haz clic para seleccionar un archivo <b>.msg</b><br /><span style={{ fontSize: 11 }}>Se extraerá asunto, remitente, cuerpo e imágenes (banners) del correo.</span></>}
            <input type="file" accept=".msg" style={{ display: 'none' }} onChange={e => setMsgFile(e.target.files[0] || null)} />
          </label>
        </>
      )}
    </Modal>
  )
}
