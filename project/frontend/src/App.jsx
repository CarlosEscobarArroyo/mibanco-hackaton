import React, { useEffect, useState } from 'react'
import { api } from './api.js'

const STEPS = [
  { n: 1, lbl: 'Recepción', ic: '📥' },
  { n: 2, lbl: 'Redacción IA', ic: '✍️' },
  { n: 3, lbl: 'Marca / Imágenes IA', ic: '🎨' },
  { n: 4, lbl: 'Legal y Cumplimiento', ic: '⚖️' },
  { n: 5, lbl: 'Brief + Aprobación CX', ic: '🏁' },
]
const ST_TXT = { ok: 'Completado', obs: 'Observado', proc: 'En proceso', wait: 'Esperando CX', locked: 'Bloqueado' }
const TIPOS = ['SMS', 'Email', 'WhatsApp', 'Push notification', 'Carta', 'Speech']

// Isotipo Mibanco: "espiral de progreso" — rayos amarillos de longitud creciente alrededor de un sol.
function Sol({ cls = 'sol', label }) {
  const rays = [0, 40, 80, 120, 160, 200, 240, 280, 320]
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': 'true' }
  return (
    <svg className={cls} viewBox="0 0 48 48" {...a11y}>
      <g fill="#F8D000">
        {rays.map((deg, i) => {
          const L = 5 + i * 1.3
          return <rect key={i} x="22.5" y={16 - L} width="3" height={L} rx="1.5" transform={`rotate(${deg} 24 24)`} />
        })}
      </g>
      <circle cx="24" cy="24" r="7" fill="#F8D000" />
    </svg>
  )
}

// Isotipo "mi banquito": un pan tostado humeante (quemado).
function PanQuemado({ cls = 'pan', label }) {
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': 'true' }
  return (
    <svg className={cls} viewBox="0 0 48 48" {...a11y}>
      {/* humo */}
      <g fill="none" stroke="#9AA0A6" strokeWidth="2" strokeLinecap="round" opacity=".55">
        <path d="M16 17c-3-2 2-4-1-7" />
        <path d="M24 16c-3-2 2-4-1-7" />
        <path d="M32 17c-3-2 2-4-1-7" />
      </g>
      {/* cuerpo del pan */}
      <path d="M8 34c0-9 7-16 16-16s16 7 16 16c0 2-1 3-3 3H11c-2 0-3-1-3-3z" fill="#B5772B" />
      {/* corteza inferior */}
      <path d="M8.2 31C8 32 8 33 8 34c0 2 1 3 3 3h26c2 0 3-1 3-3 0-1 0-2-.2-3H8.2z" fill="#7A4A18" />
      {/* zonas quemadas */}
      <g fill="#2E1A0B">
        <ellipse cx="18" cy="24" rx="4.5" ry="3.2" />
        <ellipse cx="29.5" cy="26" rx="5" ry="3.6" />
        <ellipse cx="24" cy="21" rx="3" ry="2.2" />
        <circle cx="34" cy="29" r="2.2" />
        <circle cx="12.5" cy="30" r="2" />
      </g>
    </svg>
  )
}

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
  const [pending, setPending] = useState(null) // { id, paso, label } — cambio del agente en segundo plano
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

  // -------- acciones (en segundo plano: cierra el modal y procesa sin bloquear) --------
  async function runBg(id, paso, label, fn, done) {
    setModalStep(null)
    setPending({ id, paso, label })
    showToast('🤖 ' + label)
    try { const s = await fn(); upsert(s); if (done) showToast(done(s)) }
    catch (e) { showToast('Error: ' + e.message) }
    finally { setPending(p => (p && p.id === id ? null : p)) }
  }
  const onAceptar2 = (id) => runBg(id, 2, 'Aplicando la corrección de redacción…', () => api.aceptarPaso2(id), () => '✔ Corrección aplicada')
  const onRevalidar2 = (id, txt) => runBg(id, 2, 'Re-validando tu redacción con IA…', () => api.revalidarPaso2(id, txt), s => s.estados.paso2 === 'ok' ? '✔ La IA aprobó tu versión' : '⚠ La IA encontró observaciones')
  const onSubirImg = (id, file, repl) => runBg(id, 3, 'Validando la imagen con IA…', () => api.subirImagen(id, file, repl), s => s.estados.paso3 === 'ok' ? '✔ Imagen validada' : '⚠ La imagen aún tiene observaciones')
  const onAceptar4 = (id) => runBg(id, 4, 'Aplicando el ajuste legal…', () => api.aceptarPaso4(id), () => '✔ Ajuste legal aplicado')
  const onRevalidar4 = (id, txt) => runBg(id, 4, 'Re-validando con Legal…', () => api.revalidarPaso4(id, txt), s => s.estados.paso4 === 'ok' ? '✔ Conforme' : '⚠ Aún hay observaciones legales')
  const onAprobar = (id) => runBg(id, 5, 'Registrando la aprobación de CX…', () => api.aprobar(id), () => '✔ Solicitud aprobada por CX')
  const onPublicar = (id) => runBg(id, 5, 'Publicando la comunicación…', () => api.publicar(id), () => '🚀 Comunicación publicada')

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
    ? 'Vista CX · Monitoreas TODAS las solicitudes de todas las áreas. Intervienes en el Paso 5 (aprobación final).'
    : 'Vista Solicitante · Ves SOLO tus solicitudes (Área Productos). Atiendes observaciones en los Pasos 2, 3 y 4 y publicas cuando CX aprueba.'

  // Métricas del dashboard — derivadas de la lista, sin llamadas API nuevas.
  const stats = {
    total: lista.length,
    obs: lista.filter(r => Object.values(r.estados || {}).includes('obs')).length,
    wait: lista.filter(r => !r.aprobadoCX && !r.publicado && Object.values(r.estados || {}).includes('wait')).length,
    ok: lista.filter(r => r.aprobadoCX || r.publicado).length,
  }

  return (
    <>
      <header>
        <span className="logo"><PanQuemado cls="pan" label="mi banquito" /><b>mi banquito</b></span>
        <span className="sub">Validación de Comunicaciones · IA Multiagente</span>
        <span className="spacer"></span>
        {cfg && <span className="envtag"><span className="live"></span>🧠 {cfg.modelo?.model} · {cfg.storage?.backend}</span>}
        {vista === 'sol' && <button className="newbtn" onClick={() => setNuevaOpen(true)}><span className="plus">+</span> Nueva solicitud</button>}
        <div className="viewtoggle" role="tablist" aria-label="Cambiar de vista">
          <button className={vista === 'cx' ? 'active' : ''} aria-current={vista === 'cx'} onClick={() => setVista('cx')}>👁 Vista CX</button>
          <button className={vista === 'sol' ? 'active' : ''} aria-current={vista === 'sol'} onClick={() => setVista('sol')}>✍ Vista Solicitante</button>
        </div>
      </header>

      <div className="wrap">
        <div className={'who' + (vista === 'cx' ? ' cx' : '')}>
          <span className="role-chip">{vista === 'cx' ? '👁 CX' : '✍ Solicitante'}</span>
          <span>{who}</span>
        </div>

        <div className="stats">
          <div className="stat s-total"><span className="ic" aria-hidden="true">📋</span><div className="big">{stats.total}</div><div className="lbl">Solicitudes</div></div>
          <div className="stat s-obs"><span className="ic" aria-hidden="true">🟡</span><div className="big">{stats.obs}</div><div className="lbl">Con observaciones</div></div>
          <div className="stat s-wait"><span className="ic" aria-hidden="true">⏳</span><div className="big">{stats.wait}</div><div className="lbl">Esperando CX</div></div>
          <div className="stat s-ok"><span className="ic" aria-hidden="true">✅</span><div className="big">{stats.ok}</div><div className="lbl">Aprobadas / publicadas</div></div>
        </div>

        <div className="grid">
          <div className="card">
            <h3>{vista === 'cx' ? 'Solicitudes de todas las áreas' : 'Mis solicitudes · Área Productos'}<span className="count">{lista.length}</span></h3>
            {lista.length === 0
              ? <div className="empty"><Sol cls="sol" /><span>No hay solicitudes.</span></div>
              : lista.map(r => {
                const st = estadoBadge(r, vista)
                return (
                  <div key={r.id} className={'req' + (selId === r.id ? ' sel' : '')} onClick={() => setSelId(r.id)}>
                    <div className="meta">
                      <div className="ttl"><span className={'sdot ' + st.cls} aria-hidden="true"></span>{r.titulo}</div>
                      <div className="info">{r.id} · {r.remitente} · {r.fecha}</div>
                      <div className="pills">
                        <span className="pill area">{r.area}</span>
                        <span className="pill tipo">{r.tipo}</span>
                        {r.requiereRevisionHumana && <span className="pill riesgo">⚠ Revisión humana</span>}
                      </div>
                    </div>
                    <span className={'badge ' + st.cls}>{st.txt}</span>
                  </div>
                )
              })}
          </div>

          <div className="card">
            {selected
              ? <Detalle sol={selected} vista={vista} onOpenStep={setModalStep} pending={pending} />
              : <div className="empty"><Sol cls="sol" /><span>Selecciona una solicitud de la izquierda para ver su flujo de validación.</span></div>}
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

      {busy && (
        <div className="busy" role="status" aria-live="polite">
          <div className="ring"><Sol cls="sol" /></div>
          <div className="msg">{busy}</div>
          <div className="agents" aria-hidden="true"><i /><i /><i /><i /><i /></div>
        </div>
      )}
      {toast && <div className="toast" role="status" aria-live="polite">{toast}</div>}
    </>
  )
}

function Detalle({ sol, vista, onOpenStep, pending }) {
  const st = estadoBadge(sol, vista)
  const done = Object.values(sol.estados).filter(e => e === 'ok').length
  const pct = Math.round((done / 5) * 100)
  const working = pending && pending.id === sol.id ? pending.paso : null
  return (
    <div className="detail">
      <div className="head">
        <div>
          <h2>{sol.titulo}</h2>
          <div className="desc">
            <span className="chip">{sol.id}</span>
            <span className="chip">{sol.tipo}</span>
            <span className="chip">Área {sol.area}</span>
            <span>{sol.remitente}</span>
            {sol.importadoDe === 'msg' && <span className="chip msg">📧 .msg</span>}
          </div>
        </div>
        <span className={'badge ' + st.cls}>{st.txt}</span>
      </div>

      {sol.requiereRevisionHumana && (
        <div className="riesgo-banner">
          <span className="ic" aria-hidden="true">⚠</span>
          <span><b>Requiere revisión humana obligatoria</b>Clasificada como «{sol.tipoRiesgo}». No se auto-aprueba en los pasos de IA.</span>
        </div>
      )}

      {working && (
        <div className="working-banner" role="status" aria-live="polite">
          <span className="wspin" aria-hidden="true"><Sol cls="sol" /></span>
          <span><b>El agente IA está procesando el Paso {working}…</b> El cambio se aplica en segundo plano, puedes seguir navegando.</span>
        </div>
      )}

      <div className="flow-head">
        <span className="t">Flujo de 5 agentes de IA</span>
        <span className="s">Gemini · Vertex AI</span>
      </div>

      <div className="flow">
        {STEPS.map((s, i) => {
          const estado = sol.estados['paso' + s.n]
          const isWorking = working === s.n
          const clickable = estado !== 'locked' && !isWorking
          return (
            <React.Fragment key={s.n}>
              <div className={'step ' + (isWorking ? 'working' : estado)}>
                <div className="box" role="button" tabIndex={clickable ? 0 : -1} aria-disabled={!clickable}
                  aria-label={`Paso ${s.n}: ${s.lbl} — ${isWorking ? 'Procesando' : ST_TXT[estado]}`}
                  onClick={() => clickable && onOpenStep(s.n)}
                  onKeyDown={ev => { if (clickable && (ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); onOpenStep(s.n) } }}>
                  {isWorking && <span className="box-spin" aria-hidden="true" />}
                  <div className="num">{s.n}</div>
                  <div className="ic" aria-hidden="true">{s.ic}</div>
                  <div className="lbl">{s.lbl}</div>
                  <div className="st">{isWorking ? 'Procesando…' : ST_TXT[estado]}</div>
                </div>
              </div>
              {i < 4 && <div className="arrow" aria-hidden="true">→</div>}
            </React.Fragment>
          )
        })}
      </div>
      <div className="hint">
        <span className="lg ok"><i></i>Completado</span>
        <span className="lg obs"><i></i>Observado</span>
        <span className="lg proc"><i></i>Procesando</span>
        <span className="lg wait"><i></i>Espera CX</span>
        <span className="lg locked"><i></i>Bloqueado</span>
      </div>

      <div className={'progress' + (done === 5 ? ' done' : '') + (working ? ' busy' : '')}>
        <div className="ptop"><span className="lab">Progreso de validación</span><span className="val">{done === 5 ? '✓ Listo para publicar' : `${done}/5 pasos · ${pct}%`}</span></div>
        <div className="track"><div className="fill" style={{ width: pct + '%' }}></div></div>
      </div>

      <PreviewPanel sol={sol} />

      {sol.historial && sol.historial.length > 0 && (
        <div className="histbox">
          <h4>Historial</h4>
          {sol.historial.slice(-6).map((h, i) => (
            <div key={i} className="hist"><span><b>{h.actor}</b> · {h.accion}</span><span>{h.ts}</span></div>
          ))}
        </div>
      )}
    </div>
  )
}

function Modal({ title, chip, children, footer, onClose, wide }) {
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden' // bloquea el scroll de fondo mientras el modal está abierto
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prevOverflow }
  }, [onClose])
  return (
    <div className="overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className={'modal' + (wide ? ' wide' : '')} role="dialog" aria-modal="true" aria-label={title}>
        <div className="mh">
          <div className="mt">
            {chip && <span className={'stepchip ' + (chip.cls || '')} aria-hidden="true">{chip.n}</span>}
            <h3>{title}</h3>
          </div>
          <button className="x" aria-label="Cerrar" onClick={onClose}>×</button>
        </div>
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
  const chip = { n: step, cls: e(step) }

  // ---- PASO 1 ----
  if (step === 1) return (
    <Modal title="Paso 1 · Recepción de solicitud" chip={chip} onClose={onClose}
      footer={<button className="btn ghost" onClick={onClose}>Cerrar</button>}>
      <div className="note ok">{sol.importadoDe === 'msg'
        ? 'Correo (.msg) de Outlook importado e interpretado automáticamente. ✔'
        : 'Solicitud recibida e interpretada automáticamente desde el correo. ✔'}</div>
      <PreviewPanel sol={sol} texto={sol.contenidoOriginal} />
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
      <Modal title="Paso 2 · Validación de redacción (IA)" chip={chip} onClose={onClose}
        footer={<button className="btn ghost" onClick={onClose}>Cerrar</button>}>
        <div className="note ok">El agente IA revisó tono, claridad, simplicidad y formato. Sin observaciones. ✔</div>
        <PreviewPanel sol={sol} texto={sol.contenidoActual} />
      </Modal>
    )
    const fb = sol.feedbackPaso2 || {}
    return (
      <Modal title="Paso 2 · Validación de redacción (IA)" chip={chip} onClose={onClose} wide
        footer={vista === 'sol' ? <>
          <button className="btn ghost" onClick={() => setOwn2(v => !v)}>{own2 ? 'Cancelar' : 'Hacer mi propia versión'}</button>
          {own2 && <button className="btn warn" onClick={() => actions.onRevalidar2(sol.id, txt2)}>Re-validar con IA</button>}
          <button className="btn primary" onClick={() => actions.onAceptar2(sol.id)}>Aceptar cambio y continuar</button>
        </> : <button className="btn ghost" onClick={onClose}>Cerrar</button>}>
        <RoleTip>{vista === 'sol'
          ? '✍ Como SOLICITANTE: revisa la propuesta del agente y decide. Acepta el cambio o escribe tu propia versión para re-validar.'
          : '👁 Vista CX: monitoreo. La acción de aceptar/editar la realiza el área solicitante.'}</RoleTip>
        <div className="note bad"><b>El agente detectó observaciones en la redacción:</b>
          <ul className="chk">{(fb.fallos || []).map((f, i) => <li key={i}>{f}</li>)}</ul>
          {(fb.principios || []).length > 0 && <div style={{ fontSize: 12, color: 'var(--gray-d)' }}>Principios afectados: {fb.principios.join(' · ')}</div>}
        </div>
        <BeforeAfter sol={sol} antes={sol.contenidoOriginal} despues={fb.contenidoCorregido}
          lblAntes="Versión original" lblDespues="Versión corregida por IA" />
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
    const cdn = (sol.preview && sol.preview.imagenesCdn) || []
    // Sin imágenes validadas: si el correo traía imágenes, muéstralas igual (galería de las detectadas).
    if (!sol.imagenes || sol.imagenes.length === 0) {
      if (cdn.length) return (
        <Modal title="Paso 3 · Imágenes detectadas en el correo" chip={chip} onClose={onClose}
          footer={<button className="btn ghost" onClick={onClose}>Cerrar</button>}>
          <div className="note">Se detectaron <b>{cdn.length} imágenes</b> en el correo. Así aparecen en la pieza:</div>
          <div className="img-gallery">
            {cdn.slice(0, 9).map((u, i) => (
              <div key={i} className="gimg"><img src={u} alt={'Imagen ' + (i + 1)} loading="lazy"
                onError={ev => { ev.target.closest('.gimg').style.display = 'none' }} /></div>
            ))}
          </div>
          {chan(sol.tipo) === 'email' && <PreviewPanel sol={sol} texto={sol.contenidoActual} defaultOpen={false} />}
        </Modal>
      )
      return (
        <Modal title="Paso 3 · Validación de marca / imágenes (IA)" chip={chip} onClose={onClose}
          footer={<button className="btn ghost" onClick={onClose}>Cerrar</button>}>
          <div className="note ok">Esta pieza ({sol.tipo}) no tiene imágenes adjuntas. Validación de marca no aplica. ✔</div>
        </Modal>
      )
    }
    const allOk = sol.imagenes.every(i => i.ok)
    return (
      <Modal title="Paso 3 · Validación de marca / imágenes (IA)" chip={chip} onClose={onClose}
        footer={<button className="btn ghost" onClick={onClose}>Cerrar</button>}>
        <RoleTip>{vista === 'sol'
          ? '✍ Como SOLICITANTE: revisa cada imagen. Si hay observaciones, sube una nueva versión y el agente la validará.'
          : '👁 Vista CX: monitoreo. El reemplazo de imágenes lo hace el área solicitante.'}</RoleTip>
        <div className={'note' + (allOk ? ' ok' : ' bad')}>El agente comparó cada imagen contra las referencias de branding (logo, colores institucionales, proporciones).</div>
        <div className="img-row">
          {sol.imagenes.map((im, idx) => {
            const fb = im.origen && /^https?:/i.test(im.origen) ? im.origen : null
            return (
              <div key={idx} className={'img-card ' + (im.ok ? 'ok' : 'bad')}>
                <div className="img-thumb">{(im.url || fb)
                  ? <img src={im.url || fb} alt={im.nombre} loading="lazy"
                    onError={ev => { if (fb && ev.target.src !== fb) ev.target.src = fb; else { ev.target.style.display = 'none'; ev.target.insertAdjacentText('afterend', '🖼 ' + (im.nombre || '')) } }} />
                  : <span>🖼 {im.nombre}</span>}</div>
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
            )
          })}
        </div>
        {chan(sol.tipo) === 'email' && <PreviewPanel sol={sol} texto={sol.contenidoActual} defaultOpen={false} />}
      </Modal>
    )
  }

  // ---- PASO 4 ----
  if (step === 4) {
    if (e(4) === 'ok') return (
      <Modal title="Paso 4 · Validación legal y cumplimiento" chip={chip} onClose={onClose}
        footer={<button className="btn ghost" onClick={onClose}>Cerrar</button>}>
        <div className="note ok">Revisión de normativa, riesgos y cumplimiento completada. Sin observaciones. ✔</div>
        <ul className="chk"><li>Sin datos sensibles expuestos</li><li>No promete de más / no parece fraude</li><li>Cumple normativa aplicable</li></ul>
        <PreviewPanel sol={sol} texto={sol.contenidoActual} />
      </Modal>
    )
    const lg = sol.feedbackPaso4 || {}
    return (
      <Modal title="Paso 4 · Validación legal y cumplimiento" chip={chip} onClose={onClose} wide
        footer={vista === 'sol' ? <>
          <button className="btn ghost" onClick={() => setOwn4(v => !v)}>{own4 ? 'Cancelar' : 'Hacer mi propia versión'}</button>
          {own4 && <button className="btn warn" onClick={() => actions.onRevalidar4(sol.id, txt4)}>Re-validar con Legal</button>}
          <button className="btn primary" onClick={() => actions.onAceptar4(sol.id)}>Aceptar ajuste y continuar</button>
        </> : <button className="btn ghost" onClick={onClose}>Cerrar</button>}>
        <RoleTip>{vista === 'sol'
          ? '✍ Como SOLICITANTE: revisa las observaciones legales. Acepta el ajuste sugerido o escribe tu propia versión para re-validar.'
          : '👁 Vista CX: monitoreo. El ajuste por temas legales lo realiza el área solicitante.'}</RoleTip>
        <div className="note bad"><b>Legal y Cumplimiento detectó observaciones:</b>
          <ul className="chk">{(lg.observaciones || []).map((o, i) => <li key={i}>{o}</li>)}</ul>
          {(lg.sugerencias || []).length > 0 && <div style={{ fontSize: 12, color: 'var(--gray-d)' }}>Sugerencias: {lg.sugerencias.join(' · ')}</div>}
        </div>
        <BeforeAfter sol={sol} antes={sol.contenidoActual} despues={lg.contenidoCorregido}
          lblAntes="Versión actual" lblDespues="Versión ajustada (legal)" />
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
          <b style={{ minWidth: 220 }}>{s.lbl}</b><span>{ST_TXT[est]}</span>
        </div>
      )
    })
    const brief = (
      <>
        <div className="note ok"><b>Brief generado automáticamente</b> · resumen de todos los pasos.</div>
        <div className="brief-box">{sol.brief || 'Generando brief…'}</div>
        <PreviewPanel sol={sol} texto={sol.contenidoActual} defaultOpen={false} />
        <div className="kv" style={{ marginTop: 12 }}><b>Pieza</b><span>{sol.tipo} — {sol.titulo}</span></div>
        <div className="kv"><b>Área</b><span>{sol.area}</span></div>
        <div className="kv"><b>Versión final</b><span>{sol.contenidoActual}</span></div>
        <div style={{ marginTop: 12 }}>{summary}</div>
        {sol.requiereRevisionHumana && <div className="note bad" style={{ marginTop: 12 }}>⚠ Requiere revisión humana obligatoria ({sol.tipoRiesgo}).</div>}
      </>
    )
    if (vista === 'cx') {
      if (sol.aprobadoCX) return <Modal title="Paso 5 · Brief + Aprobación CX" chip={chip} onClose={onClose} footer={<button className="btn ghost" onClick={onClose}>Cerrar</button>}>{brief}<div className="note ok">✔ Solicitud aprobada por CX.</div></Modal>
      return (
        <Modal title="Paso 5 · Brief + Aprobación CX" chip={chip} onClose={onClose}
          footer={<>
            <button className="btn ghost" onClick={onClose}>Cerrar</button>
            <button className="btn primary" onClick={() => actions.onAprobar(sol.id)}>Aprobar solicitud</button>
          </>}>
          <RoleTip>👁 Vista CX: aquí es donde realmente intervienes. Revisa el brief y da el visto bueno final.</RoleTip>
          {brief}
        </Modal>
      )
    }
    // vista solicitante
    if (sol.publicado) return <Modal title="Paso 5 · Publicado" chip={chip} onClose={onClose} footer={<button className="btn ghost" onClick={onClose}>Cerrar</button>}>{brief}<div className="note ok">🚀 Comunicación publicada / enviada al cliente.</div></Modal>
    if (sol.aprobadoCX) return (
      <Modal title="Paso 5 · Aprobado · Publicar" chip={chip} onClose={onClose}
        footer={<>
          <button className="btn ghost" onClick={onClose}>Cerrar</button>
          <button className="btn primary" onClick={() => actions.onPublicar(sol.id)}>Publicar comunicación</button>
        </>}>{brief}<div className="note ok">✔ CX aprobó tu solicitud. Ya puedes publicarla.</div></Modal>
    )
    return <Modal title="Paso 5 · Esperando aprobación CX" chip={chip} onClose={onClose} footer={<button className="btn ghost" onClick={onClose}>Cerrar</button>}>{brief}<div className="note">⏳ Tu solicitud está completa y a la espera de la aprobación del equipo CX.</div></Modal>
  }

  return null
}

// ============================================================
//  Vista previa de la pieza — mockups realistas por canal
// ============================================================

// Diff de palabras (LCS) para resaltar el antes/después de la copy del agente.
function tokenize(s) { return (s || '').split(/(\s+)/) }
function wordDiff(a, b) {
  const A = tokenize(a), B = tokenize(b), n = A.length, m = B.length
  const dp = Array.from({ length: n + 1 }, () => new Array(m + 1).fill(0))
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--)
    dp[i][j] = A[i] === B[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
  const out = []; let i = 0, j = 0
  while (i < n && j < m) {
    if (A[i] === B[j]) { out.push({ t: A[i], k: 'same' }); i++; j++ }
    else if (dp[i + 1][j] >= dp[i][j + 1]) { out.push({ t: A[i], k: 'del' }); i++ }
    else { out.push({ t: B[j], k: 'add' }); j++ }
  }
  while (i < n) out.push({ t: A[i++], k: 'del' })
  while (j < m) out.push({ t: B[j++], k: 'add' })
  return out
}

function chan(tipo) {
  const t = (tipo || '').toLowerCase()
  if (t.includes('email') || t.includes('correo') || t.includes('mail')) return 'email'
  if (t.includes('whatsapp') || t.includes('wsp')) return 'whatsapp'
  if (t.includes('sms')) return 'sms'
  if (t.includes('push')) return 'push'
  if (t.includes('carta')) return 'carta'
  if (t.includes('speech') || t.includes('guion') || t.includes('guión')) return 'speech'
  return 'sms'
}
const cleanName = s => (s || '').replace(/<[^>]*>/g, '').trim() || 'Cliente Mibanco'
const sinAsunto = s => (s || '').replace(/^\s*(test|fwd|re)\s*:\s*/i, '').trim()

// Renderiza el cuerpo de texto: saluda en grande, párrafos y placeholders {Nombre}/{Asesor} como chips.
function bodyLines(texto, asesor) {
  const raw = (texto || '').replace(/\{Asesor\}/g, asesor?.nombre ? asesor.nombre : '{Asesor}')
  const lines = raw.split(/\n+/).map(s => s.trim()).filter(Boolean)
  let greeting = null
  if (lines.length && /^(hola|estimad[oa]s?|buen[oa]s|hey)\b/i.test(lines[0])) greeting = lines.shift()
  return { greeting, paras: lines }
}
function Txt({ s }) {
  const parts = (s || '').split(/(\{[^}]+\})/g)
  return <>{parts.map((p, i) => /^\{[^}]+\}$/.test(p) ? <span key={i} className="ph">{p}</span> : <span key={i}>{p}</span>)}</>
}

// Cuerpo de texto reutilizable: saludo grande + párrafos, o diff verde si hay diffFrom.
function Body({ texto, diffFrom, asesor, greet = true }) {
  if (diffFrom != null) return <div className="copy-diff"><DiffInline antes={diffFrom} despues={texto || ''} only="despues" /></div>
  const { greeting, paras } = bodyLines(texto, asesor)
  return <>
    {greet && greeting && <div className="em-greet"><Txt s={greeting} /></div>}
    {!greet && greeting && <p><Txt s={greeting} /></p>}
    {paras.map((p, i) => <p key={i}><Txt s={p} /></p>)}
  </>
}

// Banner que carga del proxy y cae al CDN público si el server no pudo descargarlo.
function Banner({ pv }) {
  const src = pv.bannerUrl || pv.bannerUrlCdn
  if (!src) return null
  const fb = pv.bannerUrlCdn
  return <div className="em-banner"><img src={src} alt="banner" loading="lazy"
    onError={e => { if (fb && e.target.src !== fb) e.target.src = fb; else e.target.closest('.em-banner').style.display = 'none' }} /></div>
}

// Mockup de correo branded (cabecera tipo cliente + banner real + copy).
function EmailMock({ sol, texto, diffFrom }) {
  const pv = sol.preview || {}
  const asunto = sinAsunto(pv.asunto || sol.asunto || sol.titulo)
  const remitente = pv.remitenteNombre || sol.remitente || 'MiBanco'
  const email = pv.remitenteEmail || 'comunicaciones@mibanco.com.pe'
  const fecha = pv.fecha || sol.fecha || ''
  const ase = sol.asesor
  return (
    <div className="email-mock">
      <div className="em-chrome">
        <div className="em-avatar"><Sol cls="sol" /></div>
        <div className="em-from">
          <div className="em-name">{remitente} <span className="em-mail">&lt;{email}&gt;</span></div>
          <div className="em-to">para {cleanName(pv.para)} ▾</div>
        </div>
        <div className="em-date">{fecha}</div>
      </div>
      <div className="em-subject">{asunto}</div>
      <div className="em-body">
        <Banner pv={pv} />
        <div className="em-copy">
          <Body texto={texto ?? sol.contenidoActual} diffFrom={diffFrom} asesor={ase} />
          {ase?.nombre && diffFrom == null && (
            <div className="em-asesor"><span className="em-asesor-ic"><Sol cls="sol" /></span>
              <div><b>Tu Asesor de Negocios</b><div>{ase.nombre}{ase.telefono ? ` · ${ase.telefono}` : ''}</div></div>
            </div>
          )}
        </div>
        <div className="em-foot"><Sol cls="sol" /><span>Mibanco · comunicaciones@mibanco.com.pe</span></div>
      </div>
    </div>
  )
}

// Teléfono genérico para SMS / WhatsApp / Push.
function Phone({ children, kind }) {
  return <div className={'phone ' + kind}><span className="notch" /><div className="screen">{children}</div></div>
}
function SmsMock({ sol, texto, diffFrom }) {
  const t = texto ?? sol.contenidoActual
  const n = (t || '').length
  return (
    <Phone kind="sms">
      <div className="sms-top"><span className="sms-back">‹</span><div className="sms-who"><span className="sms-ic">M</span>Mibanco</div><span /></div>
      <div className="sms-thread">
        <div className="sms-day">Mensaje de texto · Hoy</div>
        <div className="sms-bubble">{diffFrom != null ? <DiffInline antes={diffFrom} despues={t || ''} only="despues" /> : <Txt s={t} />}</div>
        <div className={'sms-count' + (n > 160 ? ' over' : '')}>{n}/160 caracteres{n > 160 ? ' · excede SMS' : ''}</div>
      </div>
    </Phone>
  )
}
function WhatsMock({ sol, texto, diffFrom }) {
  const t = texto ?? sol.contenidoActual
  return (
    <Phone kind="wa">
      <div className="wa-top"><span className="wa-back">‹</span><span className="wa-ic"><Sol cls="sol" /></span><div className="wa-who">Mibanco<span>en línea</span></div></div>
      <div className="wa-thread">
        <div className="wa-bubble">{diffFrom != null ? <DiffInline antes={diffFrom} despues={t || ''} only="despues" /> : <Txt s={t} />}<span className="wa-time">9:41 ✓✓</span></div>
      </div>
    </Phone>
  )
}
function PushMock({ sol, texto, diffFrom }) {
  const t = texto ?? sol.contenidoActual
  const title = sinAsunto(sol.titulo || sol.asunto || 'Mibanco')
  return (
    <Phone kind="push">
      <div className="push-lock"><div className="push-time">9:41</div><div className="push-date">Hoy</div>
        <div className="push-card"><span className="push-app"><Sol cls="sol" /></span>
          <div className="push-txt"><div className="push-h"><b>Mibanco</b><span>ahora</span></div><div className="push-title">{title}</div><div className="push-body">{diffFrom != null ? <DiffInline antes={diffFrom} despues={t || ''} only="despues" /> : <Txt s={t} />}</div></div>
        </div>
      </div>
    </Phone>
  )
}
function CartaMock({ sol, texto, diffFrom }) {
  return (
    <div className="carta-mock">
      <div className="carta-head"><Sol cls="sol" /><b>mibanco</b><span>Lima, {sol.fecha}</span></div>
      <div className="carta-body">
        <Body texto={texto ?? sol.contenidoActual} diffFrom={diffFrom} asesor={sol.asesor} greet={false} />
        {sol.asesor?.nombre && diffFrom == null && <p className="carta-firma">Atentamente,<br /><b>{sol.asesor.nombre}</b><br />Asesor de Negocios · Mibanco</p>}
      </div>
    </div>
  )
}
function SpeechMock({ sol, texto, diffFrom }) {
  const t = texto ?? sol.contenidoActual
  return (
    <div className="speech-mock">
      <div className="speech-head"><span className="speech-ic">🎧</span>Guión para asesor · llamada</div>
      <div className="speech-bubble">“{diffFrom != null ? <DiffInline antes={diffFrom} despues={t || ''} only="despues" /> : <Txt s={t} />}”</div>
    </div>
  )
}

function DevicePreview({ sol, texto, diffFrom = null }) {
  const k = chan(sol.tipo)
  if (k === 'email') return <EmailMock sol={sol} texto={texto} diffFrom={diffFrom} />
  if (k === 'whatsapp') return <WhatsMock sol={sol} texto={texto} diffFrom={diffFrom} />
  if (k === 'push') return <PushMock sol={sol} texto={texto} diffFrom={diffFrom} />
  if (k === 'carta') return <CartaMock sol={sol} texto={texto} diffFrom={diffFrom} />
  if (k === 'speech') return <SpeechMock sol={sol} texto={texto} diffFrom={diffFrom} />
  return <SmsMock sol={sol} texto={texto} diffFrom={diffFrom} />
}

// HTML real del correo, renderizado inerte en un iframe sandbox (sin scripts).
function EmailRealPreview({ html }) {
  if (!html) return <div className="prev-empty">No hay HTML original del correo.</div>
  return (
    <div className="email-raw-wrap">
      <div className="raw-bar"><i /><i /><i /><span>Correo original recibido · HTML</span></div>
      <iframe title="Correo original" className="email-raw" sandbox="allow-same-origin" srcDoc={html}
        onLoad={e => { try { const d = e.target.contentDocument; if (d) e.target.style.height = Math.min((d.body.scrollHeight || 600) + 28, 1500) + 'px' } catch (_) { } }} />
    </div>
  )
}

// Recolecta los nodos de texto del correo (ignora style/script/etc.) para poder ubicar frases.
function collectTextNodes(node, out, skip) {
  for (let c = node.firstChild; c; c = c.nextSibling) {
    if (c.nodeType === 3) { if (c.nodeValue) out.push(c) }
    else if (c.nodeType === 1 && !skip.has(c.nodeName)) collectTextNodes(c, out, skip)
  }
}

// Inyecta las correcciones de la IA SOBRE el HTML real del correo: localiza cada frase
// original (del word-diff) dentro del texto renderizado y la reemplaza por la versión
// corregida, resaltada en verde. Conserva imágenes y layout intactos. Devuelve nº aplicado.
function applyHtmlDiff(doc, antes, despues) {
  try {
    const root = doc.body
    if (!root) return 0
    const skip = new Set(['STYLE', 'SCRIPT', 'TITLE', 'NOSCRIPT', 'HEAD'])
    const textNodes = []
    collectTextNodes(root, textNodes, skip)
    const nodes = []
    let s = ''
    for (const n of textNodes) { nodes.push({ node: n, start: s.length, len: n.nodeValue.length }); s += n.nodeValue }
    if (!s) return 0
    // Texto normalizado (colapsa espacios) + mapa de vuelta a los índices reales — el cuerpo
    // del .msg (texto plano) trae otros espaciados que el HTML, así la búsqueda es robusta.
    let norm = '', map = [], prevSpace = false
    for (let i = 0; i < s.length; i++) {
      const c = s[i]
      if (c === ' ' || c === '\n' || c === '\t' || c === '\r' || c === ' ') {
        if (prevSpace) continue
        norm += ' '; map.push(i); prevSpace = true
      } else { norm += c; map.push(i); prevSpace = false }
    }
    const hay = norm.toLowerCase()
    map.push(s.length)                               // centinela para offsets al final del texto
    const hayLen = norm.length
    // Agrupa el word-diff en corridas consecutivas del mismo tipo (same / del / add).
    const ops = wordDiff(antes, despues)
    const runs = []
    for (const o of ops) {
      const last = runs[runs.length - 1]
      if (last && last.k === o.k) last.t += o.t; else runs.push({ k: o.k, t: o.t })
    }
    const clean = t => t.replace(/\s+/g, ' ').trim()
    // Recorre las corridas con un cursor sobre el texto renderizado y arma las ediciones:
    // reemplazos (del+add), borrados (del) e inserciones puras (add) en su posición exacta.
    const edits = []
    let cursor = 0
    for (let i = 0; i < runs.length; i++) {
      const run = runs[i]
      const p = clean(run.t)
      if (run.k === 'same') {
        if (!p) continue
        const idx = hay.indexOf(p.toLowerCase(), cursor)
        if (idx >= 0) cursor = idx + p.length
      } else if (run.k === 'del') {
        if (!p) continue
        const idx = hay.indexOf(p.toLowerCase(), cursor)
        if (idx < 0) continue
        const endN = idx + p.length
        const next = runs[i + 1]
        if (next && next.k === 'add' && clean(next.t)) {        // reemplazo: frase original -> corregida
          edits.push({ startS: map[idx], endS: map[endN - 1] + 1, text: clean(next.t), hl: 'add' })
          i++
        } else {                                                // borrado puro (tachado)
          edits.push({ startS: map[idx], endS: map[endN - 1] + 1, text: s.slice(map[idx], map[endN - 1] + 1), hl: 'del' })
        }
        cursor = endN
      } else if (run.k === 'add') {                             // inserción pura, en la posición del cursor
        if (!p) continue
        const at = map[Math.min(cursor, hayLen)]
        edits.push({ startS: at, endS: at, text: p, hl: 'add', insert: true })
      }
    }
    if (!edits.length) return 0
    const locate = g => { for (let k = 0; k < nodes.length; k++) { const nn = nodes[k]; if (g >= nn.start && g <= nn.start + nn.len) return k } return -1 }
    edits.sort((a, b) => b.startS - a.startS)        // aplica de derecha a izquierda: mantiene válidos los offsets
    let applied = 0
    for (const r of edits) {
      const ki = locate(r.startS), kj = locate(r.endS)
      if (ki < 0 || kj < 0) continue
      const a = nodes[ki], b = nodes[kj]
      const offA = r.startS - a.start, offB = r.endS - b.start
      const mark = doc.createElement('mark')
      mark.className = r.hl === 'del' ? 'df-del' : 'df-add'
      mark.textContent = r.insert ? ' ' + r.text + ' ' : r.text
      if (ki === kj) {
        const full = a.node.nodeValue
        const after = doc.createTextNode(full.slice(offB))
        a.node.nodeValue = full.slice(0, offA)
        a.node.parentNode.insertBefore(after, a.node.nextSibling)
        a.node.parentNode.insertBefore(mark, after)
      } else {
        const aFull = a.node.nodeValue, bFull = b.node.nodeValue
        a.node.nodeValue = aFull.slice(0, offA)
        for (let k = ki + 1; k < kj; k++) nodes[k].node.nodeValue = ''
        const after = doc.createTextNode(bFull.slice(offB))
        b.node.nodeValue = ''
        a.node.parentNode.insertBefore(mark, a.node.nextSibling)
        b.node.parentNode.insertBefore(after, b.node.nextSibling)
      }
      applied++
    }
    return applied
  } catch (_) { return 0 }
}

// "Después" sobre el correo real: mismo HTML (todas las imágenes) con la corrección resaltada.
function EmailRealDiff({ html, antes, despues }) {
  if (!html) return <div className="prev-empty">No hay HTML original del correo.</div>
  return (
    <div className="email-raw-wrap">
      <div className="raw-bar"><i /><i /><i /><span>Versión corregida por IA · sobre el correo real</span></div>
      <iframe title="Correo corregido por IA" className="email-raw" sandbox="allow-same-origin" srcDoc={html}
        onLoad={e => {
          try {
            const d = e.target.contentDocument
            if (!d) return
            const st = d.createElement('style')
            st.textContent = 'mark.df-add{background:#d8f5e3;color:#0a7a3d;border-radius:3px;padding:0 1px;text-decoration:none;font-weight:600}mark.df-del{background:#fde4e2;color:#b42318;text-decoration:line-through;border-radius:3px;padding:0 1px}'
            ;(d.head || d.body).appendChild(st)
            applyHtmlDiff(d, antes, despues)
            e.target.style.height = Math.min((d.body.scrollHeight || 600) + 28, 1500) + 'px'
          } catch (_) { }
        }} />
    </div>
  )
}

// Panel de preview. Para correos importados de .msg muestra SIEMPRE el correo original
// (HTML real, fiel a lo recibido). El mockup por canal solo se usa donde no hay HTML real:
// canales que no son email (SMS/WhatsApp/Push/Carta/Speech) o emails escritos a mano.
function PreviewPanel({ sol, texto, defaultOpen = true }) {
  const esEmail = chan(sol.tipo) === 'email'
  const usarHtmlReal = esEmail && !!sol.correoHtml
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="prev-panel">
      <div className="prev-head">
        <span className="prev-t">👁 {usarHtmlReal ? 'Correo original recibido' : 'Vista previa de la pieza'}</span>
        <div className="prev-right">
          <button className="prev-collapse" onClick={() => setOpen(o => !o)} aria-expanded={open}>{open ? 'Ocultar' : 'Mostrar'}</button>
        </div>
      </div>
      {open && (
        <div className="prev-stage">
          {usarHtmlReal ? <EmailRealPreview html={sol.correoHtml} /> : <DevicePreview sol={sol} texto={texto} />}
        </div>
      )}
    </div>
  )
}

// Diff inline: resalta lo añadido (verde Mibanco) y lo eliminado (tachado), conservando saltos de línea.
function DiffInline({ antes, despues, only }) {
  const d = wordDiff(antes, despues).filter(x =>
    only === 'despues' ? x.k !== 'del' : only === 'antes' ? x.k !== 'add' : true)
  return <>{d.map((x, i) => {
    const cls = x.k === 'add' ? 'df-add' : x.k === 'del' ? 'df-del' : ''
    const parts = x.t.split('\n')
    const node = parts.map((p, j) => <React.Fragment key={j}>{j > 0 && <br />}{p}</React.Fragment>)
    return cls ? <mark key={i} className={cls}>{node}</mark> : <span key={i}>{node}</span>
  })}</>
}

// Antes/Después realista: diff héroe en verde Mibanco + dos mockups en contexto.
function BeforeAfter({ sol, antes, despues, lblAntes = 'Versión actual', lblDespues = 'Propuesta del agente' }) {
  const [verMock, setVerMock] = useState(true)
  const cambio = (antes || '').trim() !== (despues || '').trim()
  const adds = wordDiff(antes, despues).filter(x => x.k === 'add' && x.t.trim()).length
  const esEmailHtml = chan(sol.tipo) === 'email' && !!sol.correoHtml   // usar el correo real, no el mockup
  return (
    <div className="ba">
      <div className="ba-hero">
        <div className="ba-hero-top">
          <span className="ba-hero-t"><span className="ba-spark">✦</span> Cambios sugeridos por el agente</span>
          {cambio && <span className="ba-count">{adds} mejora{adds === 1 ? '' : 's'} en verde</span>}
        </div>
        {cambio ? (
          <div className="ba-compare">
            <div className="ba-side antes">
              <div className="ba-side-h"><span className="ba-dot del" />{lblAntes}</div>
              <div className="ba-side-body"><DiffInline antes={antes} despues={despues} only="antes" /></div>
            </div>
            <div className="ba-side despues">
              <div className="ba-side-h"><span className="ba-dot add" />{lblDespues}</div>
              <div className="ba-side-body"><DiffInline antes={antes} despues={despues} only="despues" /></div>
            </div>
          </div>
        ) : (
          <div className="ba-hero-card"><span className="ba-nochange">La redacción se mantiene; el agente solo confirma el formato y la marca.</span></div>
        )}
        <div className="ba-legend"><span className="lg-add">texto nuevo / mejorado</span><span className="lg-del">texto original (se reemplaza)</span></div>
      </div>

      <button className="ba-mocktoggle" onClick={() => setVerMock(v => !v)} aria-expanded={verMock}>
        {verMock ? '▾ Ocultar' : '▸ Ver'} cómo se verá la pieza (antes → después)
      </button>
      {verMock && (esEmailHtml ? (
        // Email .msg: el correo real (todas las imágenes y layout) — original vs. corregido por IA.
        <div className="ba-stack">
          <div className="ba-col"><div className="ba-tag antes">● {lblAntes}</div><div className="ba-stage"><EmailRealPreview html={sol.correoHtml} /></div></div>
          <div className="ba-arrow" aria-hidden="true">↓</div>
          <div className="ba-col"><div className="ba-tag despues">✓ {lblDespues}</div><div className="ba-stage despues"><EmailRealDiff html={sol.correoHtml} antes={antes} despues={despues} /></div></div>
        </div>
      ) : (
        // Otros canales (o email escrito a mano sin HTML): mockup por canal.
        <div className="ba-grid">
          <div className="ba-col"><div className="ba-tag antes">● {lblAntes}</div><div className="ba-stage"><DevicePreview sol={sol} texto={antes} /></div></div>
          <div className="ba-arrow" aria-hidden="true">→</div>
          <div className="ba-col"><div className="ba-tag despues">✓ {lblDespues}</div><div className="ba-stage despues"><DevicePreview sol={sol} texto={despues} diffFrom={cambio ? antes : null} /></div></div>
        </div>
      ))}
    </div>
  )
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
              ? <span style={{ color: 'var(--green-d)', fontWeight: 700 }}>📎 {msgFile.name}</span>
              : <>📧 Haz clic para seleccionar un archivo <b>.msg</b><br /><span style={{ fontSize: 11 }}>Se extraerá asunto, remitente, cuerpo e imágenes (banners) del correo.</span></>}
            <input type="file" accept=".msg" style={{ display: 'none' }} onChange={e => setMsgFile(e.target.files[0] || null)} />
          </label>
        </>
      )}
    </Modal>
  )
}
