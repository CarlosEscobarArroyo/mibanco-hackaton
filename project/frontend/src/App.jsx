import React, { useEffect, useState } from 'react'
import { api } from './api.js'

// ============================================================
//  Íconos SVG inline (estilo Lucide, sin dependencia externa)
// ============================================================
function LI({ size = 16, style, children, ...rest }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"
      style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, ...style }}
      aria-hidden="true" {...rest}>
      {children}
    </svg>
  )
}
const LayoutDashboard = ({ size = 16, ...p }) => <LI size={size} {...p}><rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" /><rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" /></LI>
const ShieldCheck = ({ size = 16, ...p }) => <LI size={size} {...p}><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" /><path d="m9 12 2 2 4-4" /></LI>
const UserCircle = ({ size = 16, ...p }) => <LI size={size} {...p}><circle cx="12" cy="12" r="10" /><circle cx="12" cy="10" r="3" /><path d="M7 20.662V19a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v1.662" /></LI>
const FileText = ({ size = 16, ...p }) => <LI size={size} {...p}><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" /><path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M10 9H8" /><path d="M16 13H8" /><path d="M16 17H8" /></LI>
const Clock = ({ size = 16, ...p }) => <LI size={size} {...p}><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></LI>
const CheckSquare = ({ size = 16, ...p }) => <LI size={size} {...p}><path d="M21 10.5V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h12.5" /><path d="m9 11 3 3L22 4" /></LI>
const Inbox = ({ size = 16, ...p }) => <LI size={size} {...p}><polyline points="22 12 16 12 14 15 10 15 8 12 2 12" /><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" /></LI>
const PenLine = ({ size = 16, ...p }) => <LI size={size} {...p}><path d="M12 20h9" /><path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z" /></LI>
const Palette = ({ size = 16, ...p }) => <LI size={size} {...p}><circle cx="13.5" cy="6.5" r=".5" fill="currentColor" /><circle cx="17.5" cy="10.5" r=".5" fill="currentColor" /><circle cx="8.5" cy="7.5" r=".5" fill="currentColor" /><circle cx="6.5" cy="12.5" r=".5" fill="currentColor" /><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" /></LI>
const Scale = ({ size = 16, ...p }) => <LI size={size} {...p}><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" /><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" /><path d="M7 21h10" /><path d="M12 3v18" /><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" /></LI>
const ClipboardCheck = ({ size = 16, ...p }) => <LI size={size} {...p}><rect width="8" height="4" x="8" y="2" rx="1" ry="1" /><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" /><path d="m9 14 2 2 4-4" /></LI>
const Eye = ({ size = 16, ...p }) => <LI size={size} {...p}><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></LI>
const FileSearch = ({ size = 16, ...p }) => <LI size={size} {...p}><path d="M14 2v4a2 2 0 0 0 2 2h4" /><path d="M4.268 21a2 2 0 0 0 1.727 1H18a2 2 0 0 0 2-2V7l-5-5H6a2 2 0 0 0-2 2v3" /><path d="m9 18-1.5-1.5" /><circle cx="5" cy="14" r="3" /></LI>
const AlertTriangle = ({ size = 16, ...p }) => <LI size={size} {...p}><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" /><path d="M12 9v4" /><path d="M12 17h.01" /></LI>
const UserCheck = ({ size = 16, ...p }) => <LI size={size} {...p}><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><polyline points="16 11 18 13 22 9" /></LI>
const Headphones = ({ size = 16, ...p }) => <LI size={size} {...p}><path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3" /></LI>
const Mail = ({ size = 16, ...p }) => <LI size={size} {...p}><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></LI>
const AlertCircle = ({ size = 16, ...p }) => <LI size={size} {...p}><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></LI>
const BadgeCheck = ({ size = 16, ...p }) => <LI size={size} {...p}><path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.77 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.74 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.74z" /><path d="m9 12 2 2 4-4" /></LI>
const Upload = ({ size = 16, ...p }) => <LI size={size} {...p}><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" /></LI>
const Maximize = ({ size = 16, ...p }) => <LI size={size} {...p}><path d="M8 3H5a2 2 0 0 0-2 2v3" /><path d="M21 8V5a2 2 0 0 0-2-2h-3" /><path d="M3 16v3a2 2 0 0 0 2 2h3" /><path d="M16 21h3a2 2 0 0 0 2-2v-3" /></LI>

const STEPS = [
  { n: 1, lbl: 'Recepción', Ic: Inbox },
  { n: 2, lbl: 'Redacción IA', Ic: PenLine },
  { n: 3, lbl: 'Marca / Imágenes IA', Ic: Palette },
  { n: 4, lbl: 'Legal y Cumplimiento', Ic: Scale },
  { n: 5, lbl: 'Brief + Aprobación CX', Ic: ClipboardCheck },
]
const ST_TXT = { ok: 'Completado', obs: 'Observado', proc: 'En proceso', wait: 'Esperando CX', locked: 'Pendiente' }
const TIPOS = ['SMS', 'Email', 'WhatsApp', 'Push notification', 'Pieza visual', 'Documento', 'Otro']

// Isotipo Mibanco: sol amarillo con rayos triangulares — reutilizado en mockups de canal.
function Sol({ cls = 'sol', label }) {
  const rays = [0, 40, 80, 120, 160, 200, 240, 280, 320]
  const a11y = label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': 'true' }
  return (
    <svg className={cls} viewBox="0 0 48 48" {...a11y}>
      <g fill="#FFD100">
        {rays.map((deg, i) => {
          const L = 5 + i * 1.3
          return <rect key={i} x="22.5" y={16 - L} width="3" height={L} rx="1.5" transform={`rotate(${deg} 24 24)`} />
        })}
      </g>
      <circle cx="24" cy="24" r="7" fill="#FFD100" />
    </svg>
  )
}

function MibancoLogo({ dark = false }) {
  const cx = 40, cy = 40, innerR = 20, outerR = 36
  const rays = Array.from({ length: 8 }, (_, i) => {
    const a = (i * 45) * Math.PI / 180, dA = 0.35
    const tx = cx + outerR * Math.cos(a), ty = cy + outerR * Math.sin(a)
    const lx = cx + innerR * Math.cos(a - dA), ly = cy + innerR * Math.sin(a - dA)
    const rx = cx + innerR * Math.cos(a + dA), ry = cy + innerR * Math.sin(a + dA)
    return `${lx.toFixed(1)},${ly.toFixed(1)} ${tx.toFixed(1)},${ty.toFixed(1)} ${rx.toFixed(1)},${ry.toFixed(1)}`
  })
  return (
    <div style={{ position:'relative', width:140, height:36, overflow:'hidden', flexShrink:0 }}>
      <svg width="80" height="80" viewBox="0 0 80 80"
        style={{ position:'absolute', top:-8, left:-12 }} aria-hidden="true">
        {rays.map((pts, i) => <polygon key={i} points={pts} fill="#FFD100" />)}
        <circle cx={cx} cy={cy} r={innerR} fill="#FFD100" />
      </svg>
      <span style={{ position:'absolute', left:26, top:0, right:0, bottom:0,
        display:'flex', alignItems:'center', fontFamily:"'Nunito','Poppins',sans-serif",
        fontWeight:800, fontSize:22, color: dark ? '#00964B' : '#FFFFFF',
        letterSpacing:'-0.01em', whiteSpace:'nowrap', zIndex:2 }}>mibanco</span>
    </div>
  )
}

// Modal de carga moderno con logo, dots animados, nodos de etapa y tagline.
function LoadingModal({ message }) {
  const [activeStep, setActiveStep] = useState(1)
  useEffect(() => {
    let step = 1
    const timer = setInterval(() => {
      step++
      if (step > 5) { clearInterval(timer); return }
      setActiveStep(step)
    }, 2400)
    return () => clearInterval(timer)
  }, [])
  return (
    <div className="busy-overlay" role="status" aria-live="polite">
      <div className="busy-card">
        <MibancoLogo dark />
        <div className="busy-dots">
          {[0, 1, 2, 3, 4].map(i => (
            <span key={i} className="busy-dot" style={{ animationDelay: `${i * 0.18}s` }} />
          ))}
        </div>
        <div className="busy-stages">
          {STEPS.map((s, i) => {
            const done = s.n < activeStep
            const active = s.n === activeStep
            return (
              <div key={s.n} className={`busy-sitem ${done ? 'sdone' : active ? 'sactive' : 'spend'}`}>
                <div className="busy-snum">{s.n}</div>
                <div className="busy-slbl">{s.lbl}</div>
              </div>
            )
          })}
        </div>
        <p className="busy-tagline">
          Escribimos juntos <span>historias de progreso</span>
        </p>
      </div>
    </div>
  )
}

function estadoBadge(r, vista) {
  if (r.publicado) return { cls: 'b-pub', txt: 'Publicado' }
  if (r.aprobadoCX) return { cls: 'b-pub', txt: vista === 'sol' ? 'Aprobado · listo para publicar' : 'Aprobado' }
  const e = Object.values(r.estados || {})
  if (e.includes('obs')) return { cls: 'b-obs', txt: 'Con observaciones' }
  if (e.includes('wait')) return { cls: 'b-proc', txt: vista === 'sol' ? 'Esperando aprobación CX' : 'Pendiente de tu aprobación' }
  if (e.includes('proc')) return { cls: 'b-proc', txt: 'Procesando…' }
  return { cls: 'b-proc', txt: 'En proceso' }
}

function macroEstado(r) {
  if (r.publicado) return 'pub'
  if (r.aprobadoCX) return 'aprob'
  const e = Object.values(r.estados || {})
  if (e.includes('obs')) return 'obs'
  if (e.includes('wait')) return 'wait'
  return 'proc'
}

function parseTs(ts) {
  if (!ts) return 0
  const m = ts.match(/(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})/)
  if (!m) return 0
  return new Date(+m[3], +m[2] - 1, +m[1], +m[4], +m[5]).getTime()
}

function tiempoEspera(sol) {
  const est = macroEstado(sol)
  if (!['obs', 'wait'].includes(est)) return null
  const ts = sol.fechaCreacion || sol.historial?.[0]?.ts
  if (!ts) return null
  const t = parseTs(ts)
  if (!t) return null
  const diffMin = Math.floor((Date.now() - t) / 60000)
  const diffHrs = Math.floor(diffMin / 60)
  const diffDias = Math.floor(diffHrs / 24)
  if (diffMin < 60) return { txt: `Hace ${diffMin} minuto${diffMin === 1 ? '' : 's'}`, urgente: false }
  if (diffHrs < 24) return { txt: `Hace ${diffHrs} hora${diffHrs === 1 ? '' : 's'}`, urgente: false }
  return { txt: `Hace ${diffDias} dia${diffDias === 1 ? '' : 's'}`, urgente: diffDias >= 7 }
}

function motivoRevision(tipoRiesgo) {
  const t = (tipoRiesgo || '').toLowerCase()
  if (t.includes('oferta')) return 'Contiene oferta comercial'
  if (t.includes('reclamo')) return 'Contiene información de reclamo'
  if (t.includes('crisis')) return 'Comunicación de crisis detectada'
  return 'Requiere revisión por el equipo CX'
}

export default function App() {
  const [vista, setVista] = useState('cx')
  const [lista, setLista] = useState([])
  const [selId, setSelId] = useState(null)
  const [modalStep, setModalStep] = useState(null)
  const [nuevaOpen, setNuevaOpen] = useState(false)
  const [busy, setBusy] = useState(null)
  const [pending, setPending] = useState(null)
  const [toast, setToast] = useState(null)
  const [cfg, setCfg] = useState(null)
  const [activeFilter, setActiveFilter] = useState(null)

  const selected = lista.find(s => s.id === selId) || null

  useEffect(() => { api.config().then(setCfg).catch(() => {}) }, [])

  function reloadLista(v = vista) {
    return api.listar(v).then(data => {
      setLista(data)
      setSelId(id => (id && !data.find(s => s.id === id) ? null : id))
      return data
    }).catch(e => showToast('No se pudo cargar: ' + e.message))
  }

  useEffect(() => { reloadLista(vista) }, [vista])

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

  async function runBg(id, paso, label, fn, done) {
    setModalStep(null)
    setPending({ id, paso, label })
    showToast(label)
    try { const s = await fn(); upsert(s); if (done) showToast(done(s)) }
    catch (e) { showToast('Error: ' + e.message) }
    finally { setPending(p => (p && p.id === id ? null : p)) }
  }
  const onAceptar2 = (id) => runBg(id, 2, 'Aplicando la corrección de redacción…', () => api.aceptarPaso2(id), () => 'Corrección aplicada')
  const onRevalidar2 = (id, txt) => runBg(id, 2, 'Re-validando tu redacción con IA…', () => api.revalidarPaso2(id, txt), s => s.estados.paso2 === 'ok' ? 'La IA aprobó tu versión' : 'La IA encontró observaciones')
  const onSubirImg = (id, file, repl) => runBg(id, 3, 'Validando la imagen con IA…', () => api.subirImagen(id, file, repl), s => s.estados.paso3 === 'ok' ? 'Imagen validada' : 'La imagen aún tiene observaciones')
  const onAceptar4 = (id) => runBg(id, 4, 'Aplicando el ajuste legal…', () => api.aceptarPaso4(id), () => 'Ajuste legal aplicado')
  const onRevalidar4 = (id, txt) => runBg(id, 4, 'Re-validando con Legal…', () => api.revalidarPaso4(id, txt), s => s.estados.paso4 === 'ok' ? 'Conforme' : 'Aún hay observaciones legales')
  const onAprobar = (id) => runBg(id, 5, 'Registrando la aprobación de CX…', () => api.aprobar(id), () => 'Solicitud aprobada por CX')
  const onPublicar = (id) => runBg(id, 5, 'Publicando la comunicación…', () => api.publicar(id), () => 'Comunicación publicada')
  const onRechazar = (id, mensaje) => runBg(id, 5, 'Registrando rechazo…', () => api.rechazar(id, mensaje), () => 'Solicitud rechazada con observaciones')

  async function onImportar(file, area) {
    setNuevaOpen(false)
    await withBusy('Importando correo (.msg) y validando con IA…', async () => {
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
    await withBusy('Los agentes IA están validando tu comunicación…', async () => {
      const sol = await api.crear(form)
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

  const sortedLista = [...lista].sort((a, b) => {
    if (vista === 'cx' && a.requiereRevisionHumana !== b.requiereRevisionHumana)
      return a.requiereRevisionHumana ? -1 : 1
    return parseTs(a.fechaCreacion) - parseTs(b.fechaCreacion)
  })
  const displayLista = activeFilter
    ? sortedLista.filter(r => {
        if (activeFilter === 'obs') return Object.values(r.estados || {}).includes('obs')
        if (activeFilter === 'wait') return !r.aprobadoCX && !r.publicado && Object.values(r.estados || {}).includes('wait')
        if (activeFilter === 'ok') return r.aprobadoCX || r.publicado
        return true
      })
    : sortedLista

  const stats = {
    total: lista.length,
    obs: lista.filter(r => Object.values(r.estados || {}).includes('obs')).length,
    wait: lista.filter(r => !r.aprobadoCX && !r.publicado && Object.values(r.estados || {}).includes('wait')).length,
    ok: lista.filter(r => r.aprobadoCX || r.publicado).length,
  }

  return (
    <>
      <header>
        <div style={{ display:'flex', alignItems:'center', gap:0 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <svg height="44" viewBox="0 0 88 103.02" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{ flexShrink:0 }}>
              <path fill="#F7D417" d="M17.32,65.28c-0.79-3.47-1.05-6.91-0.83-10.28L2.65,64.45c-3.99,2.71-3.42,5.51,1.3,6.46l16.74,3.4C19.22,71.53,18.07,68.51,17.32,65.28z"/>
              <path fill="#F7D417" d="M44.17,22.05c3.01-0.72,6.04-1.05,8.98-0.99L43.2,4.62c-4.19-6.89-8.1-5.96-8.71,2.08l-1.53,20.15C36.32,24.67,40.07,23.01,44.17,22.05z"/>
              <path fill="#F7D417" d="M80.9,34.68l7.17-26.63c2.29-8.41-1.16-10.5-7.62-4.68L60.01,21.8C68.23,23.52,75.65,28.09,80.9,34.68z"/>
              <path fill="#F7D417" d="M17.55,48.23c1.72-6.69,5.34-12.76,10.38-17.47l-17.48-4.83c-7.77-2.13-9.97,1.23-4.89,7.49L17.55,48.23z"/>
              <path fill="#F7D417" d="M83.67,75.72c-1.93,3.21-4.32,6.15-7.15,8.64l3.99,1.18c7.75,2.29,9.99-1.03,5.06-7.39L83.67,75.72z"/>
              <path fill="#F7D417" d="M25.74,81.46l-2.5,14.22c-0.85,4.74,1.57,6.3,5.53,3.59l11.71-7.98C34.84,89.3,29.77,85.9,25.74,81.46z"/>
              <path fill="#F7D417" d="M61.03,92.4c-2.59,0.62-5.12,0.93-7.64,0.99l5.23,7.11c2.86,3.89,5.64,3.21,6.42-1.54l1.38-8.31C64.7,91.38,62.88,91.96,61.03,92.4z"/>
            </svg>
            <span style={{ fontFamily:"'Nunito',sans-serif", fontWeight:800, fontSize:26, color:'#FFFFFF', letterSpacing:'-0.3px', lineHeight:1 }}>mibanco</span>
          </div>
          <div style={{ width:1, height:20, background:'rgba(255,255,255,0.3)', margin:'0 16px', flexShrink:0 }} />
          <span style={{ fontSize:13, color:'#fff', whiteSpace:'nowrap' }}>
            <span style={{ fontWeight:600 }}>Garra IA</span>
            <span style={{ fontWeight:400, opacity:0.75 }}> · Validación de Comunicaciones</span>
          </span>
        </div>
        <span className="spacer"></span>
        {cfg && (
          <span className="envtag">
            <span className="live"></span>
            {cfg.modelo?.model} · {cfg.storage?.backend}
          </span>
        )}
        {vista === 'sol' && <button className="newbtn" onClick={() => setNuevaOpen(true)}><span className="plus">+</span> Nueva solicitud</button>}
        <div className="viewtoggle" role="tablist" aria-label="Cambiar de vista">
          <button className={vista === 'dash' ? 'active' : ''} aria-current={vista === 'dash'} onClick={() => setVista('dash')}>
            <LayoutDashboard size={16} /> Dashboard
          </button>
          <button className={vista === 'cx' ? 'active' : ''} aria-current={vista === 'cx'} onClick={() => setVista('cx')}>
            <ShieldCheck size={16} /> Vista CX
          </button>
          <button className={vista === 'sol' ? 'active' : ''} aria-current={vista === 'sol'} onClick={() => setVista('sol')}>
            <UserCircle size={16} /> Vista Solicitante
          </button>
        </div>
      </header>

      <div className="wrap">
        {vista === 'dash' ? (
          <Dashboard lista={lista} cfg={cfg} onRefresh={() => reloadLista('dash')} onVerCX={() => setVista('cx')} />
        ) : (
        <>
        <div className={'who' + (vista === 'cx' ? ' cx' : '')}>
          <span className="role-chip">
            {vista === 'cx'
              ? <><ShieldCheck size={12} style={{ marginRight: 4 }} />CX</>
              : <><UserCircle size={12} style={{ marginRight: 4 }} />Solicitante</>}
          </span>
          <span>{who}</span>
        </div>

        <div className="stats">
          <div className={'stat s-total' + (!activeFilter ? ' stat-active' : '')}
            onClick={() => setActiveFilter(null)} style={{ cursor: 'pointer' }}>
            <span className="ic" aria-hidden="true"><FileText size={18} /></span>
            <div className="big">{stats.total}</div><div className="lbl">Solicitudes</div>
          </div>
          <div className={'stat s-obs' + (activeFilter === 'obs' ? ' stat-active' : '')}
            onClick={() => setActiveFilter(f => f === 'obs' ? null : 'obs')} style={{ cursor: 'pointer' }}>
            <span className="ic" aria-hidden="true"><AlertCircle size={18} /></span>
            <div className="big">{stats.obs}</div><div className="lbl">Con observaciones</div>
          </div>
          <div className={'stat s-wait' + (activeFilter === 'wait' ? ' stat-active' : '')}
            onClick={() => setActiveFilter(f => f === 'wait' ? null : 'wait')} style={{ cursor: 'pointer' }}>
            <span className="ic" aria-hidden="true"><Clock size={18} /></span>
            <div className="big">{stats.wait}</div><div className="lbl">Esperando CX</div>
          </div>
          <div className={'stat s-ok' + (activeFilter === 'ok' ? ' stat-active' : '')}
            onClick={() => setActiveFilter(f => f === 'ok' ? null : 'ok')} style={{ cursor: 'pointer' }}>
            <span className="ic" aria-hidden="true"><CheckSquare size={18} /></span>
            <div className="big">{stats.ok}</div><div className="lbl">Aprobadas / publicadas</div>
          </div>
        </div>

        {activeFilter && (
          <div className="filter-indicator">
            <span>Filtrando: <b>{activeFilter === 'obs' ? 'Con observaciones' : activeFilter === 'wait' ? 'Esperando CX' : 'Aprobadas / publicadas'}</b> - {displayLista.length} resultado{displayLista.length === 1 ? '' : 's'}</span>
            <button className="filter-clear" onClick={() => setActiveFilter(null)}>Ver todas</button>
          </div>
        )}

        <div className="grid">
          <div className="card">
            <h3>{vista === 'cx' ? 'Solicitudes de todas las áreas' : 'Mis solicitudes - Área Productos'}<span className="count">{displayLista.length}</span></h3>
            {displayLista.length === 0
              ? <div className="empty"><FileSearch size={46} style={{ opacity: .4 }} /><span>{activeFilter ? 'No hay solicitudes con ese filtro.' : 'No hay solicitudes.'}</span></div>
              : displayLista.map(r => {
                const st = estadoBadge(r, vista)
                const espera = tiempoEspera(r)
                return (
                  <div key={r.id} className={'req' + (selId === r.id ? ' sel' : '')} onClick={() => setSelId(r.id)}>
                    <div className="meta">
                      <div className="ttl"><span className={'sdot ' + st.cls} aria-hidden="true"></span>{r.titulo}
                        {r.requiereRevisionHumana && vista === 'cx' && <span className="rev-humana-badge"><AlertTriangle size={9} /> Rev. humana</span>}
                      </div>
                      <div className="info">{r.id} - {r.remitente} - {r.fecha}</div>
                      <div className="pills">
                        <span className="pill area">{r.area}</span>
                        <span className="pill tipo">{r.tipo}</span>
                      </div>
                      {espera && <div className={'req-espera' + (espera.urgente ? ' urgente' : '')}><Clock size={10} /> {espera.txt}</div>}
                    </div>
                    <span className={'badge ' + st.cls}>{st.txt}</span>
                  </div>
                )
              })}
          </div>

          <div className="card">
            {selected
              ? <Detalle sol={selected} vista={vista} onOpenStep={setModalStep} pending={pending} />
              : <div className="empty"><FileSearch size={46} style={{ opacity: .4 }} /><span>Selecciona una solicitud de la izquierda para ver su flujo de validación.</span></div>}
          </div>
        </div>
        </>
        )}
      </div>

      {modalStep && selected && (
        <StepModal
          sol={selected} step={modalStep} vista={vista}
          onClose={() => setModalStep(null)}
          actions={{ onAceptar2, onRevalidar2, onSubirImg, onAceptar4, onRevalidar4, onAprobar, onPublicar, onRechazar }}
        />
      )}

      {nuevaOpen && <NuevaModal onClose={() => setNuevaOpen(false)} onCrear={onCrear} onImportar={onImportar} />}

      {busy && <LoadingModal message={busy} />}
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
            {sol.importadoDe === 'msg' && <span className="chip msg"><Mail size={11} /> .msg</span>}
          </div>
        </div>
        <span className={'badge ' + st.cls}>{st.txt}</span>
      </div>

      {sol.requiereRevisionHumana && vista === 'cx' && (
        <div className="riesgo-banner">
          <span className="ic" aria-hidden="true"><AlertTriangle size={18} /></span>
          <span><b>Requiere revisión humana obligatoria</b> - Clasificada como "{sol.tipoRiesgo}". No se auto-aprueba en los pasos de IA.</span>
        </div>
      )}
      {sol.requiereRevisionHumana && vista === 'sol' && (
        <div className="rev-humana-banner-sol">
          <span aria-hidden="true" style={{ color:'#D97706', flexShrink:0, marginTop:1 }}><AlertTriangle size={18} /></span>
          <div>
            <b>Esta comunicación requiere revisión humana obligatoria</b>
            <div style={{ fontSize:12, color:'#6B7280', marginTop:3 }}>{motivoRevision(sol.tipoRiesgo)}</div>
          </div>
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
                  aria-label={`Paso ${s.n}: ${s.lbl} - ${isWorking ? 'Procesando' : ST_TXT[estado]}`}
                  onClick={() => clickable && onOpenStep(s.n)}
                  onKeyDown={ev => { if (clickable && (ev.key === 'Enter' || ev.key === ' ')) { ev.preventDefault(); onOpenStep(s.n) } }}>
                  {isWorking && <span className="box-spin" aria-hidden="true" />}
                  <div className="num">{s.n}</div>
                  <div className="ic" aria-hidden="true"><s.Ic size={20} /></div>
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
        <span className="lg locked"><i></i>Pendiente</span>
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
    document.body.style.overflow = 'hidden'
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
  const [rejectMode, setRejectMode] = useState(false)
  const [rejectMsg, setRejectMsg] = useState('')
  const [rejectTab, setRejectTab] = useState('ia')
  const [consejo, setConsejo] = useState('')
  const [loadingConsejo, setLoadingConsejo] = useState(false)
  const e = (n) => sol.estados['paso' + n]
  const chip = { n: step, cls: e(step) }

  async function handleGenerarConsejo() {
    setLoadingConsejo(true)
    try {
      const res = await api.generarConsejoRechazo(sol.id)
      setConsejo(res.consejo || '')
    } catch (_) {}
    finally { setLoadingConsejo(false) }
  }

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
      <div className="kv"><b>Asesor</b><span>{sol.asesor?.nombre || '-'} {sol.asesor?.telefono ? '· ' + sol.asesor.telefono : ''}</span></div>
      <div className="kv"><b>Contenido recibido</b><span>{sol.contenidoOriginal}</span></div>
      {sol.requiereRevisionHumana && <div className="note bad">Clasificada como <b>{sol.tipoRiesgo}</b>: requiere revisión humana obligatoria.</div>}
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
        <RoleTip>
          {vista === 'sol'
            ? <><PenLine size={13} style={{ marginRight: 5 }} />Como SOLICITANTE: revisa la propuesta del agente y decide. Acepta el cambio o escribe tu propia versión para re-validar.{sol.requiereRevisionHumana ? ' Esta pieza es de riesgo alto: CX dará la aprobación final en el Paso 5.' : ''}</>
            : <><Eye size={13} style={{ marginRight: 5 }} />Vista CX: monitoreo. La acción de aceptar/editar la realiza el área solicitante.</>}
        </RoleTip>
        <div className="note bad"><b>El agente detectó observaciones en la redacción:</b>
          <ul className="chk">{(fb.fallos || []).map((f, i) => <li key={i}>{f}</li>)}</ul>
          {(fb.principios || []).length > 0 && <div style={{ fontSize: 12, color: 'var(--gray-d)' }}>Principios afectados: {fb.principios.join(' · ')}</div>}
        </div>
        <BeforeAfter sol={sol} antes={sol.contenidoOriginal} despues={fb.contenidoCorregido}
          lblAntes="Versión original" lblDespues="Versión corregida por IA" />
        {own2 && vista === 'sol' && (
          <div style={{ marginTop: 12 }}>
            <label className="fld">Edita el contenido antes de revalidar:</label>
            <textarea value={txt2} onChange={ev => setTxt2(ev.target.value)} />
          </div>
        )}
      </Modal>
    )
  }

  // ---- PASO 3 ----
  if (step === 3) {
    const cdn = (sol.preview && sol.preview.imagenesCdn) || []
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
        <RoleTip>
          {vista === 'sol'
            ? <><Eye size={13} style={{ marginRight: 5 }} />Solo lectura: el equipo CX gestiona la corrección de imágenes.</>
            : <><PenLine size={13} style={{ marginRight: 5 }} />Vista CX: para cada imagen con observaciones, sube la versión corregida y el agente la revalidará automáticamente.</>}
        </RoleTip>
        <div className={'note' + (allOk ? ' ok' : ' bad')}>El agente comparó cada imagen contra las referencias de branding (logo, colores institucionales, proporciones).</div>
        <div className="img-row">
          {sol.imagenes.map((im, idx) => {
            const fb = im.origen && /^https?:/i.test(im.origen) ? im.origen : null
            return (
              <div key={idx} className={'img-card ' + (im.ok ? 'ok' : 'bad')}>
                <div className="img-thumb">{(im.url || fb)
                  ? <img src={im.url || fb} alt={im.nombre} loading="lazy"
                    onError={ev => { if (fb && ev.target.src !== fb) ev.target.src = fb; else { ev.target.style.display = 'none'; ev.target.insertAdjacentText('afterend', im.nombre || '') } }} />
                  : <span>{im.nombre}</span>}</div>
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
        <RoleTip>
          {vista === 'sol'
            ? <><PenLine size={13} style={{ marginRight: 5 }} />Como SOLICITANTE: revisa las observaciones legales. Acepta el ajuste sugerido o escribe tu propia versión para re-validar.{sol.requiereRevisionHumana ? ' Esta pieza es de riesgo alto: CX dará la aprobación final en el Paso 5.' : ''}</>
            : <><Eye size={13} style={{ marginRight: 5 }} />Vista CX: monitoreo. El ajuste por temas legales lo realiza el área solicitante.</>}
        </RoleTip>
        <div className="note bad"><b>Legal y Cumplimiento detectó observaciones:</b>
          <ul className="chk">{(lg.observaciones || []).map((o, i) => <li key={i}>{o}</li>)}</ul>
          {(lg.sugerencias || []).length > 0 && <div style={{ fontSize: 12, color: 'var(--gray-d)' }}>Sugerencias: {lg.sugerencias.join(' · ')}</div>}
        </div>
        <BeforeAfter sol={sol} antes={sol.contenidoActual} despues={lg.contenidoCorregido}
          lblAntes="Versión actual" lblDespues="Versión ajustada (legal)" />
        {own4 && vista === 'sol' && (
          <div style={{ marginTop: 12 }}>
            <label className="fld">Edita el contenido antes de revalidar:</label>
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
          <span className={'dot ' + (est === 'ok' ? 'ok' : est)}>
            {est === 'ok' ? '✓' : est === 'obs' ? '!' : est === 'wait' ? <Clock size={10} strokeWidth={3} /> : '·'}
          </span>
          <b style={{ minWidth: 220 }}>{s.lbl}</b><span>{ST_TXT[est]}</span>
        </div>
      )
    })
    const brief = (
      <>
        <div className="note ok"><b>Brief generado automáticamente</b> · resumen de todos los pasos.</div>
        <div className="brief-box">{sol.brief || 'Generando brief…'}</div>
        <PreviewPanel sol={sol} texto={sol.contenidoActual} defaultOpen={false} />
        <div className="kv" style={{ marginTop: 12 }}><b>Pieza</b><span>{sol.tipo} - {sol.titulo}</span></div>
        <div className="kv"><b>Área</b><span>{sol.area}</span></div>
        <div className="kv"><b>Versión final</b><span>{sol.contenidoActual}</span></div>
        <div style={{ marginTop: 12 }}>{summary}</div>
        {sol.requiereRevisionHumana && <div className="note bad" style={{ marginTop: 12 }}>Requiere revisión humana obligatoria ({sol.tipoRiesgo}).</div>}
      </>
    )
    if (vista === 'cx') {
      if (sol.aprobadoCX) return <Modal title="Paso 5 - Brief + Aprobación CX" chip={chip} onClose={onClose} footer={<button className="btn ghost" onClick={onClose}>Cerrar</button>}>{brief}<div className="note ok">Solicitud aprobada por CX.</div></Modal>
      if (sol.estados?.paso5 === 'obs' && sol.mensajeRechazo) return (
        <Modal title="Paso 5 - Rechazado por CX" chip={chip} onClose={onClose} footer={<button className="btn ghost" onClick={onClose}>Cerrar</button>}>
          <div className="note bad"><b>Esta solicitud fue rechazada por CX</b><br />{sol.mensajeRechazo}</div>
          {brief}
        </Modal>
      )
      const msgFinal = rejectTab === 'ia' ? consejo : rejectMsg
      return (
        <Modal title="Paso 5 - Brief + Aprobación CX" chip={chip} onClose={onClose}
          footer={rejectMode ? <>
            <button className="btn ghost" onClick={() => { setRejectMode(false); setConsejo(''); setRejectMsg(''); setRejectTab('ia') }}>Cancelar</button>
            <button style={{ background:'#E63946', color:'#fff', border:'none', borderRadius:8, padding:'7px 16px', fontSize:13, fontWeight:600, cursor:'pointer', opacity: msgFinal.trim() ? 1 : 0.45 }}
              disabled={!msgFinal.trim()}
              onClick={() => { actions.onRechazar(sol.id, msgFinal); onClose() }}>Enviar rechazo</button>
          </> : <>
            <button className="btn ghost" onClick={onClose}>Cerrar</button>
            <button style={{ background:'#fff', border:'1px solid #E63946', color:'#E63946', borderRadius:8, padding:'7px 16px', fontSize:13, fontWeight:600, cursor:'pointer' }}
              onClick={() => setRejectMode(true)}>Rechazar y notificar al solicitante</button>
            <button style={{ background:'#00964B', color:'#fff', border:'none', borderRadius:8, padding:'7px 16px', fontSize:13, fontWeight:600, cursor:'pointer' }}
              onClick={() => actions.onAprobar(sol.id)}>Aprobar comunicación</button>
          </>}>
          <RoleTip><Eye size={13} style={{ marginRight: 5 }} />Vista CX: aquí es donde realmente intervienes. Revisa el brief y da el visto bueno final.</RoleTip>
          {rejectMode ? (
            <div className="rechazo-panel">
              <div style={{ fontSize:13, fontWeight:700, color:'var(--ink)', marginBottom:10 }}>Mensaje para el solicitante</div>
              <div className="rechazo-tabs">
                <button className={'rtab' + (rejectTab === 'ia' ? ' active' : '')} onClick={() => setRejectTab('ia')}>Generar con IA</button>
                <button className={'rtab' + (rejectTab === 'propio' ? ' active' : '')} onClick={() => setRejectTab('propio')}>Escribir propio</button>
              </div>
              {rejectTab === 'ia' ? (
                <div>
                  <button className="btn primary" style={{ fontSize:12, marginBottom:8 }} onClick={handleGenerarConsejo} disabled={loadingConsejo}>
                    {loadingConsejo ? 'Generando...' : 'Generar consejo'}
                  </button>
                  {consejo && <textarea value={consejo} onChange={e => setConsejo(e.target.value)} style={{ height:120 }} />}
                </div>
              ) : (
                <textarea value={rejectMsg} onChange={e => setRejectMsg(e.target.value)}
                  placeholder="Escribe aquí el motivo del rechazo y las sugerencias para el solicitante..." style={{ height:120 }} />
              )}
            </div>
          ) : brief}
        </Modal>
      )
    }
    if (sol.publicado) return <Modal title="Paso 5 · Publicado" chip={chip} onClose={onClose} footer={<button className="btn ghost" onClick={onClose}>Cerrar</button>}>{brief}<div className="note ok">Comunicación publicada / enviada al cliente.</div></Modal>
    if (sol.aprobadoCX) return (
      <Modal title="Paso 5 · Aprobado · Publicar" chip={chip} onClose={onClose}
        footer={<>
          <button className="btn ghost" onClick={onClose}>Cerrar</button>
          <button className="btn primary" onClick={() => actions.onPublicar(sol.id)}>Publicar comunicación</button>
        </>}>{brief}<div className="note ok">✔ CX aprobó tu solicitud. Ya puedes publicarla.</div></Modal>
    )
    return <Modal title="Paso 5 · Esperando aprobación CX" chip={chip} onClose={onClose} footer={<button className="btn ghost" onClick={onClose}>Cerrar</button>}>{brief}<div className="note">Tu solicitud está completa y a la espera de la aprobación del equipo CX.</div></Modal>
  }

  return null
}

// ============================================================
//  Vista previa de la pieza — mockups realistas por canal
// ============================================================

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
  if (t.includes('speech') || t.includes('guion') || t.includes('guion')) return 'speech'
  if (t.includes('banner')) return 'banner'
  if (t.includes('pieza')) return 'pieza'
  return 'sms'
}
const cleanName = s => (s || '').replace(/<[^>]*>/g, '').trim() || 'Cliente Mibanco'
const sinAsunto = s => (s || '').replace(/^\s*(test|fwd|re)\s*:\s*/i, '').trim()

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

function Body({ texto, diffFrom, asesor, greet = true }) {
  if (diffFrom != null) return <div className="copy-diff"><DiffInline antes={diffFrom} despues={texto || ''} only="despues" /></div>
  const { greeting, paras } = bodyLines(texto, asesor)
  return <>
    {greet && greeting && <div className="em-greet"><Txt s={greeting} /></div>}
    {!greet && greeting && <p><Txt s={greeting} /></p>}
    {paras.map((p, i) => <p key={i}><Txt s={p} /></p>)}
  </>
}

function Banner({ pv }) {
  const src = pv.bannerUrl || pv.bannerUrlCdn
  if (!src) return null
  const fb = pv.bannerUrlCdn
  return <div className="em-banner"><img src={src} alt="banner" loading="lazy"
    onError={e => { if (fb && e.target.src !== fb) e.target.src = fb; else e.target.closest('.em-banner').style.display = 'none' }} /></div>
}

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
      <div className="speech-head"><span className="speech-ic"><Headphones size={16} /></span>Guión para asesor · llamada</div>
      <div className="speech-bubble">"{diffFrom != null ? <DiffInline antes={diffFrom} despues={t || ''} only="despues" /> : <Txt s={t} />}"</div>
    </div>
  )
}

function BannerMock({ sol, texto }) {
  const cx = 40, cy = 40, innerR = 20, outerR = 36
  const rays = Array.from({ length: 8 }, (_, i) => {
    const a = (i * 45) * Math.PI / 180, dA = 0.35
    const tx = cx + outerR * Math.cos(a), ty = cy + outerR * Math.sin(a)
    const lx = cx + innerR * Math.cos(a - dA), ly = cy + innerR * Math.sin(a - dA)
    const rx = cx + innerR * Math.cos(a + dA), ry = cy + innerR * Math.sin(a + dA)
    return `${lx.toFixed(1)},${ly.toFixed(1)} ${tx.toFixed(1)},${ty.toFixed(1)} ${rx.toFixed(1)},${ry.toFixed(1)}`
  })
  return (
    <div className="monitor-frame">
      <div className="monitor-screen">
        <div className="banner-preview">
          <svg width="48" height="48" viewBox="0 0 80 80" style={{ opacity: .85 }} aria-hidden="true">
            {rays.map((pts, i) => <polygon key={i} points={pts} fill="#FFD100" />)}
            <circle cx={cx} cy={cy} r={innerR} fill="#FFD100" />
          </svg>
          <div style={{ color: '#fff', fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 13, marginTop: 4 }}>mibanco</div>
          {texto && <div style={{ color: 'rgba(255,255,255,.85)', fontSize: 11, marginTop: 8, maxWidth: 200, textAlign: 'center', lineHeight: 1.4 }}>{texto.slice(0, 120)}</div>}
        </div>
      </div>
      <div className="monitor-stand" />
    </div>
  )
}

function PiezaMock({ sol, texto }) {
  return (
    <div className="tablet-frame">
      <div className="tablet-notch" />
      <div className="tablet-screen">
        <div className="pieza-preview">
          <Sol cls="sol" label="Mibanco" />
          <div style={{ fontFamily: "'Nunito',sans-serif", fontWeight: 800, fontSize: 15, color: 'var(--brand)', marginTop: 8 }}>mibanco</div>
          {texto && <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 10, lineHeight: 1.5, maxWidth: 180, textAlign: 'center' }}>{texto.slice(0, 150)}</div>}
        </div>
      </div>
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
  if (k === 'banner') return <BannerMock sol={sol} texto={texto} />
  if (k === 'pieza') return <PiezaMock sol={sol} texto={texto} />
  return <SmsMock sol={sol} texto={texto} diffFrom={diffFrom} />
}

// Normaliza el HTML del correo dentro del iframe: sin márgenes del body, imágenes y
// tablas que se ajustan al ancho del marco y un scrollbar delgado. Esto elimina la
// barra de desplazamiento horizontal que aparecía con las tablas/imágenes de 600px.
function normalizeEmailDoc(doc) {
  try {
    const st = doc.createElement('style')
    st.textContent =
      'html,body{margin:0!important;padding:0!important;background:#fff!important;-webkit-text-size-adjust:100%}' +
      'body{overflow-x:hidden!important}' +
      'img{max-width:100%!important;height:auto!important}' +
      'table{max-width:100%!important}' +
      '::-webkit-scrollbar{width:9px;height:9px}' +
      '::-webkit-scrollbar-thumb{background:#c7d0cb;border-radius:6px}' +
      '::-webkit-scrollbar-thumb:hover{background:#aab4ad}' +
      '::-webkit-scrollbar-track{background:transparent}'
    ;(doc.head || doc.body || doc.documentElement).appendChild(st)
  } catch (_) { }
}

// Inyecta los estilos del diff (resaltado verde/rojo) dentro del iframe del correo.
function applyDiffStyles(d) {
  try {
    const st = d.createElement('style')
    st.textContent = 'mark.df-add{background:#d8f5e3;color:#0a7a3d;border-radius:3px;padding:0 1px;text-decoration:none;font-weight:600}mark.df-del{background:#fde4e2;color:#b42318;text-decoration:line-through;border-radius:3px;padding:0 1px}'
    ;(d.head || d.body).appendChild(st)
  } catch (_) { }
}

// Lightbox: muestra el correo completo en una ventana grande centrada, con su propio
// scroll. Es la vista "Ver completo" del preview en miniatura.
function EmailLightbox({ html, title, prepareDoc, onClose }) {
  useEffect(() => {
    const onKey = e => { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [onClose])
  return (
    <div className="lb-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="lb-card" role="dialog" aria-modal="true" aria-label={title}>
        <div className="lb-head">
          <i className="lb-dot r" /><i className="lb-dot y" /><i className="lb-dot g" />
          <span className="lb-t">{title}</span>
          <span className="lb-hint">Esc o clic afuera para cerrar</span>
          <button className="lb-x" aria-label="Cerrar" onClick={onClose}>×</button>
        </div>
        <div className="lb-body">
          <iframe title={title} className="lb-frame" sandbox="allow-same-origin" srcDoc={html}
            onLoad={e => { const d = e.target.contentDocument; if (d) { normalizeEmailDoc(d); if (prepareDoc) prepareDoc(d) } }} />
        </div>
      </div>
    </div>
  )
}

// Preview del correo: miniatura compacta (peek) SIN scroll, con degradado al pie y un
// botón "Ver correo completo" que abre el lightbox. `prepareDoc` permite inyectar el
// diff cuando se usa para la versión corregida por IA.
function EmailViewer({ html, title, prepareDoc }) {
  const [full, setFull] = useState(false)
  if (!html) return <div className="prev-empty">No hay HTML original del correo.</div>
  const onLoadDoc = e => { const d = e.target.contentDocument; if (d) { normalizeEmailDoc(d); if (prepareDoc) prepareDoc(d) } }
  return (
    <div className="email-raw-wrap">
      <div className="raw-bar">
        <i /><i /><i /><span>{title}</span>
        <button className="raw-expand" onClick={() => setFull(true)} title="Ver completo"><Maximize size={12} /> Ampliar</button>
      </div>
      <div className="email-peek" role="button" tabIndex={0} title="Ver correo completo"
        onClick={() => setFull(true)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFull(true) } }}>
        <iframe title={title} className="email-raw peek" scrolling="no" sandbox="allow-same-origin" srcDoc={html}
          onLoad={onLoadDoc} />
        <div className="peek-fade" />
        <span className="peek-cta"><Maximize size={14} /> Ver correo completo</span>
      </div>
      {full && <EmailLightbox html={html} title={title} prepareDoc={prepareDoc} onClose={() => setFull(false)} />}
    </div>
  )
}

function EmailRealPreview({ html }) {
  return <EmailViewer html={html} title="Correo original recibido · HTML" />
}

function collectTextNodes(node, out, skip) {
  for (let c = node.firstChild; c; c = c.nextSibling) {
    if (c.nodeType === 3) { if (c.nodeValue) out.push(c) }
    else if (c.nodeType === 1 && !skip.has(c.nodeName)) collectTextNodes(c, out, skip)
  }
}

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
    let norm = '', map = [], prevSpace = false
    for (let i = 0; i < s.length; i++) {
      const c = s[i]
      if (c === ' ' || c === '\n' || c === '\t' || c === '\r' || c === ' ') {
        if (prevSpace) continue
        norm += ' '; map.push(i); prevSpace = true
      } else { norm += c; map.push(i); prevSpace = false }
    }
    const hay = norm.toLowerCase()
    map.push(s.length)
    const hayLen = norm.length
    const ops = wordDiff(antes, despues)
    const runs = []
    for (const o of ops) {
      const last = runs[runs.length - 1]
      if (last && last.k === o.k) last.t += o.t; else runs.push({ k: o.k, t: o.t })
    }
    const clean = t => t.replace(/\s+/g, ' ').trim()
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
        if (next && next.k === 'add' && clean(next.t)) {
          edits.push({ startS: map[idx], endS: map[endN - 1] + 1, text: clean(next.t), hl: 'add' })
          i++
        } else {
          edits.push({ startS: map[idx], endS: map[endN - 1] + 1, text: s.slice(map[idx], map[endN - 1] + 1), hl: 'del' })
        }
        cursor = endN
      } else if (run.k === 'add') {
        if (!p) continue
        const at = map[Math.min(cursor, hayLen)]
        edits.push({ startS: at, endS: at, text: p, hl: 'add', insert: true })
      }
    }
    if (!edits.length) return 0
    const locate = g => { for (let k = 0; k < nodes.length; k++) { const nn = nodes[k]; if (g >= nn.start && g <= nn.start + nn.len) return k } return -1 }
    edits.sort((a, b) => b.startS - a.startS)
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

function EmailRealDiff({ html, antes, despues }) {
  return <EmailViewer html={html} title="Versión corregida por IA · sobre el correo real"
    prepareDoc={d => { applyDiffStyles(d); applyHtmlDiff(d, antes, despues) }} />
}

function PreviewPanel({ sol, texto, defaultOpen = true }) {
  const esEmail = chan(sol.tipo) === 'email'
  const usarHtmlReal = esEmail && !!sol.correoHtml
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className="prev-panel">
      <div className="prev-head">
        <span className="prev-t"><Eye size={14} style={{ marginRight: 5 }} />{usarHtmlReal ? 'Correo original recibido' : 'Vista previa de la pieza'}</span>
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

function BeforeAfter({ sol, antes, despues, lblAntes = 'Versión actual', lblDespues = 'Propuesta del agente' }) {
  const [verMock, setVerMock] = useState(true)
  const cambio = (antes || '').trim() !== (despues || '').trim()
  const adds = wordDiff(antes, despues).filter(x => x.k === 'add' && x.t.trim()).length
  const esEmailHtml = chan(sol.tipo) === 'email' && !!sol.correoHtml
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
        <div className="ba-stack">
          <div className="ba-col"><div className="ba-tag antes">● {lblAntes}</div><div className="ba-stage"><EmailRealPreview html={sol.correoHtml} /></div></div>
          <div className="ba-arrow" aria-hidden="true">↓</div>
          <div className="ba-col"><div className="ba-tag despues">✓ {lblDespues}</div><div className="ba-stage despues"><EmailRealDiff html={sol.correoHtml} antes={antes} despues={despues} /></div></div>
        </div>
      ) : (
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
  const AREA = 'Productos'
  const NOMBRE = 'Solicitante'
  const [tipo, setTipo] = useState('SMS')
  const [tipoCustom, setTipoCustom] = useState('')
  const [titulo, setTitulo] = useState('')
  const [contenido, setContenido] = useState('')
  const [asesorNombre, setAsesorNombre] = useState('')
  const [adjuntos, setAdjuntos] = useState([])

  function submit() {
    const msgFile = adjuntos.find(f => f.name.toLowerCase().endsWith('.msg'))
    if (msgFile) { onImportar(msgFile, AREA); return }
    if (!contenido.trim()) { alert('Escribe el contenido de la comunicación.'); return }
    if (tipo === 'Otro' && !tipoCustom.trim()) { alert('Especifica el tipo de pieza.'); return }
    const tipoFinal = tipo === 'Otro' ? tipoCustom.trim() : tipo
    const fd = new FormData()
    fd.append('titulo', titulo || `Comunicación ${tipoFinal}`)
    fd.append('remitente', NOMBRE)
    fd.append('area', AREA)
    fd.append('tipo', tipoFinal)
    fd.append('contenido', contenido)
    fd.append('asesorNombre', asesorNombre)
    adjuntos.filter(f => f.type.startsWith('image/')).forEach(f => fd.append('imagenes', f))
    onCrear(fd)
  }

  const adjNombres = adjuntos.map(f => f.name).join(', ')
  const hasMsgFile = adjuntos.some(f => f.name.toLowerCase().endsWith('.msg'))

  return (
    <Modal title="Nueva solicitud de comunicación" onClose={onClose}
      footer={<>
        <button className="btn ghost" onClick={onClose}>Cancelar</button>
        <button className="btn primary" onClick={submit}>{hasMsgFile ? 'Importar y validar con IA' : 'Enviar y validar con IA'}</button>
      </>}>

      <div className="identity-strip">
        Solicitando como: <b>{NOMBRE}</b> - Área <b>{AREA}</b>
      </div>

      <label className="fld">Tipo de pieza</label>
      <select value={tipo} onChange={e => setTipo(e.target.value)}>{TIPOS.map(t => <option key={t}>{t}</option>)}</select>
      {tipo === 'Otro' && (
        <>
          <label className="fld">Especifica el tipo de pieza</label>
          <input type="text" value={tipoCustom} onChange={e => setTipoCustom(e.target.value)} placeholder="Describe el tipo de comunicación..." />
        </>
      )}
      <label className="fld">Titulo</label>
      <input type="text" value={titulo} onChange={e => setTitulo(e.target.value)} placeholder={`Comunicación ${tipo === 'Otro' ? (tipoCustom || 'personalizado') : tipo}`} />
      <label className="fld">Contenido del mensaje</label>
      <textarea value={contenido} onChange={e => setContenido(e.target.value)} placeholder="Escribe el mensaje a validar..." style={{ minHeight: 110 }} />
      <label className="fld">Asesor (nombre)</label>
      <input type="text" value={asesorNombre} onChange={e => setAsesorNombre(e.target.value)} placeholder="Luis Perez" />
      <label className="fld">Archivos adjuntos <span style={{ fontWeight: 600, color: 'var(--gray-d)' }}>(imágenes para validación de marca)</span></label>
      <label className="adj-drop">
        <input type="file" accept=".msg,.pdf,.docx,.png,.jpg,.jpeg,.gif,image/*" multiple style={{ display: 'none' }}
          onChange={e => setAdjuntos(Array.from(e.target.files))} />
        <div className="adj-file-row">
          <Upload size={14} />
          <span>{adjuntos.length > 0 ? adjNombres : 'Seleccionar archivos (.msg, PDF, DOCX, imágenes)'}</span>
        </div>
      </label>
      {hasMsgFile && <div style={{ fontSize: 11, color: 'var(--gray-d)', marginTop: 4 }}>Se extraerá asunto, remitente, cuerpo e imágenes del correo .msg.</div>}
    </Modal>
  )
}

// ============================================================
//  Dashboard — KPIs y gráficos del avance (derivados de la lista)
// ============================================================

// Paleta oficial Mibanco (hex literal: SVG no resuelve var() en atributos de presentación).
const DC = {
  brand: '#00964B', brand300: '#71B74C', sun: '#FFD100',
  obs: '#E63946', info: '#2563EB', wait: '#7E57C2',
  gray: '#9CA3AF', danger: '#E63946', track: '#EEF1F3',
}
const ESTADO_META = [
  { k: 'pub', lbl: 'Publicadas', color: '#00964B' },
  { k: 'aprob', lbl: 'Aprobadas CX', color: '#71B74C' },
  { k: 'wait', lbl: 'Esperando CX', color: '#7E57C2' },
  { k: 'obs', lbl: 'Con observaciones', color: '#CA7C2F' },
  { k: 'proc', lbl: 'En proceso', color: '#2563EB' },
]

function groupCount(items, keyFn) {
  const m = new Map()
  for (const it of items) {
    const k = keyFn(it) || '-'
    m.set(k, (m.get(k) || 0) + 1)
  }
  return [...m.entries()].map(([k, v]) => ({ k, v })).sort((a, b) => b.v - a.v)
}

function Ring({ pct, size = 104, stroke = 11, color = DC.brand, label }) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const dash = (Math.max(0, Math.min(100, pct)) / 100) * c
  return (
    <div className="ring-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={DC.track} strokeWidth={stroke} />
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke}
            strokeLinecap="round" strokeDasharray={`${dash} ${c - dash}`} className="ring-fill" />
        </g>
      </svg>
      <div className="ring-center"><b>{pct}%</b>{label && <span>{label}</span>}</div>
    </div>
  )
}

function Donut({ segments, size = 176, stroke = 28, centerTop, centerBottom }) {
  const total = segments.reduce((a, s) => a + s.value, 0)
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  let acc = 0
  const visibles = segments.filter(s => s.value > 0)
  return (
    <div className="donut-wrap" style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Distribución por estado">
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={DC.track} strokeWidth={stroke} />
          {total > 0 && visibles.map((s, i) => {
            const len = (s.value / total) * c
            const off = -acc
            acc += len
            return <circle key={i} cx={size / 2} cy={size / 2} r={r} fill="none"
              strokeWidth={stroke} strokeDasharray={`${len} ${c - len}`} strokeDashoffset={off}
              className="donut-seg" style={{ stroke: s.color, '--di': i }} />
          })}
        </g>
      </svg>
      <div className="donut-center"><b>{centerTop}</b><span>{centerBottom}</span></div>
    </div>
  )
}

function CompBar({ segments, total, max }) {
  const fillPct = max ? Math.max(6, (total / max) * 100) : 0
  return (
    <div className="cbar-track">
      <div className="cbar-fill" style={{ width: fillPct + '%' }}>
        {segments.filter(s => s.value > 0).map((s, i) => (
          <span key={i} className="cbar-seg" style={{ flex: s.value, background: s.color }} title={`${s.lbl}: ${s.value}`} />
        ))}
      </div>
    </div>
  )
}

function Dashboard({ lista, cfg, onRefresh, onVerCX }) {
  const total = lista.length

  const macro = { pub: 0, aprob: 0, wait: 0, obs: 0, proc: 0 }
  lista.forEach(r => { macro[macroEstado(r)]++ })
  const segEstado = ESTADO_META.map(m => ({ ...m, value: macro[m.k] }))

  const pasosOk = lista.reduce((a, r) => a + Object.values(r.estados || {}).filter(e => e === 'ok').length, 0)
  const avgPct = total ? Math.round((pasosOk / (total * 5)) * 100) : 0

  const publicadas = macro.pub
  const aprobadas = macro.pub + macro.aprob
  const pendientes = macro.obs + macro.wait
  const tasaAprob = total ? Math.round((aprobadas / total) * 100) : 0
  const erroresDetectados = lista.reduce((a, r) => {
    const obs = Object.values(r.estados || {}).filter(e => e === 'obs').length
    return a + obs
  }, 0)
  const revHumana = lista.filter(r => r.requiereRevisionHumana).length

  const etapas = STEPS.map(s => ({
    ...s,
    ok: lista.filter(r => r.estados['paso' + s.n] === 'ok').length,
  }))

  const areas = groupCount(lista, r => r.area)
  const maxArea = Math.max(1, ...areas.map(a => a.v))
  const areaSegs = (area) => ESTADO_META.map(m => ({
    lbl: m.lbl, color: m.color,
    value: lista.filter(r => r.area === area && macroEstado(r) === m.k).length,
  }))

  const tipos = groupCount(lista, r => r.tipo)
  const maxTipo = Math.max(1, ...tipos.map(t => t.v))

  const atencion = [...lista]
    .filter(r => ['obs', 'wait'].includes(macroEstado(r)))
    .sort((a, b) => parseTs(a.fechaCreacion) - parseTs(b.fechaCreacion))

  if (total === 0) return (
    <div className="empty"><FileSearch size={46} style={{ opacity: .4 }} /><span>Aún no hay solicitudes para graficar. Crea una desde la Vista Solicitante.</span></div>
  )

  return (
    <div className="dash">
      <div className="dash-head">
        <div>
          <h2>Dashboard de avance</h2>
          <p>Métricas en vivo del flujo de validación - {total} solicitud{total === 1 ? '' : 'es'} de todas las áreas</p>
        </div>
        <div className="dash-head-right">
          {cfg && <span className="envtag dark"><span className="live"></span>{cfg.modelo?.model}</span>}
          <button className="btn ghost dash-refresh" onClick={onRefresh} title="Actualizar métricas">Actualizar</button>
        </div>
      </div>

      {/* Fila 1: Tarjetas de impacto */}
      <div className="dash-impact">
        <div className="dk dk-impact" style={{ '--imp-color': '#00964B', '--imp-bg': '#EAF5EE' }}>
          <div className="dk-ic"><ShieldCheck size={26} /></div>
          <div className="dk-body">
            <div className="dk-big">{publicadas}</div>
            <div className="dk-lbl">Comunicaciones protegidas</div>
            <div className="dk-sub">publicadas y aprobadas por IA + CX</div>
          </div>
        </div>
        <div className="dk dk-impact" style={{ '--imp-color': '#E63946', '--imp-bg': '#FDECEA' }}>
          <div className="dk-ic"><AlertCircle size={26} /></div>
          <div className="dk-body">
            <div className="dk-big">{erroresDetectados}</div>
            <div className="dk-lbl">Errores detectados</div>
            <div className="dk-sub">observaciones de IA en total</div>
          </div>
        </div>
        <div className="dk dk-impact" style={{ '--imp-color': '#2563EB', '--imp-bg': '#EAF0FB' }}>
          <div className="dk-ic"><BadgeCheck size={26} /></div>
          <div className="dk-body">
            <div className="dk-big">{tasaAprob}%</div>
            <div className="dk-lbl">Cumplimiento regulatorio</div>
            <div className="dk-sub">{aprobadas} de {total} aprobadas sin bloqueos</div>
          </div>
        </div>
      </div>

      {/* Fila 2: KPIs operacionales */}
      <div className="dash-kpis" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        <div className="dk">
          <div className="dk-ic" style={{ background: '#EAF5EE', color: '#00964B' }}><FileText size={22} /></div>
          <div className="dk-body"><div className="dk-big">{total}</div><div className="dk-lbl">Solicitudes totales</div></div>
        </div>
        <div className="dk">
          <Ring pct={avgPct} label="completado" />
          <div className="dk-body"><div className="dk-lbl">Avance global</div><div className="dk-sub">{pasosOk} de {total * 5} pasos validados</div></div>
        </div>
        <div className="dk">
          <div className="dk-ic" style={{ background: '#FEE8E8', color: '#E63946' }}><AlertTriangle size={22} /></div>
          <div className="dk-body"><div className="dk-big">{pendientes}</div><div className="dk-lbl">Requieren acción</div><div className="dk-sub">{macro.obs} observadas - {macro.wait} esperando CX</div></div>
        </div>
        <div className="dk">
          <div className="dk-ic" style={{ background: '#EAF0FB', color: '#2563EB' }}><UserCheck size={22} /></div>
          <div className="dk-body"><div className="dk-big">{revHumana}</div><div className="dk-lbl">Revisión humana</div><div className="dk-sub">clasificadas como riesgo</div></div>
        </div>
      </div>

      {/* Fila 3: Dona + Avance por etapa */}
      <div className="dash-grid">
        <div className="panel">
          <div className="panel-h"><h3>Estado del pipeline</h3><span className="panel-s">distribución de solicitudes</span></div>
          <div className="donut-row">
            <Donut segments={segEstado} centerTop={total} centerBottom="solicitudes" />
            <div className="donut-legend">
              {segEstado.map(s => (
                <div key={s.k} className="leg-item">
                  <span className="leg-dot" style={{ background: s.color }} />
                  <span className="leg-lbl">{s.lbl}</span>
                  <span className="leg-val">{s.value}</span>
                  <span className="leg-pct">{total ? Math.round((s.value / total) * 100) : 0}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="panel">
          <div className="panel-h"><h3>Avance por etapa</h3><span className="panel-s">solicitudes que completaron cada paso</span></div>
          <div className="etapas">
            {etapas.map(s => {
              const pct = total ? Math.round((s.ok / total) * 100) : 0
              return (
                <div key={s.n} className="etapa-row">
                  <div className="etapa-lbl">
                    <span className="etapa-ic"><s.Ic size={16} /></span>
                    <span>{s.n}. {s.lbl}</span>
                  </div>
                  <div className="etapa-track"><div className="etapa-fill" style={{ width: pct + '%' }} /></div>
                  <div className="etapa-val">{s.ok}/{total}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Fila 4: Por área solicitante */}
      {areas.length > 0 && (
        <div className="panel">
          <div className="panel-h"><h3>Por área solicitante</h3><span className="panel-s">distribución por estado</span></div>
          <div className="cbars">
            {areas.map(a => (
              <div key={a.k} className="cbar-row">
                <div className="cbar-name">{a.k}</div>
                <CompBar segments={areaSegs(a.k)} total={a.v} max={maxArea} />
                <div className="cbar-val">{a.v}</div>
              </div>
            ))}
          </div>
          <div className="cbar-legend">
            {ESTADO_META.filter(m => areas.some(a => areaSegs(a.k).find(s => s.lbl === m.lbl && s.value > 0))).map(m => (
              <div key={m.k} className="leg-item">
                <span className="leg-dot" style={{ background: m.color }} />
                <span className="leg-lbl">{m.lbl}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Fila 5: Tabla de atencion ordenada por antiguedad */}
      <div className="panel attn">
        <div className="panel-h">
          <h3>Requieren atención</h3>
          <span className="panel-s">{atencion.length} solicitud{atencion.length === 1 ? '' : 'es'} - ordenadas por tiempo de espera</span>
        </div>
        {atencion.length === 0 ? (
          <div className="attn-empty">Todo al día: ninguna solicitud pendiente de acción.</div>
        ) : (
          <div className="attn-list">
            {atencion.map(r => {
              const m = macroEstado(r)
              const meta = ESTADO_META.find(x => x.k === m)
              const done = Object.values(r.estados || {}).filter(e => e === 'ok').length
              const espera = tiempoEspera(r)
              return (
                <div key={r.id} className="attn-row">
                  <span className="attn-dot" style={{ background: meta?.color }} />
                  <div className="attn-meta">
                    <div className="attn-ttl">{r.titulo}</div>
                    <div className="attn-sub">{r.id} - {r.area} - {r.tipo}{r.requiereRevisionHumana ? ' - revisión humana' : ''}{espera ? ` - ${espera.txt}` : ''}</div>
                  </div>
                  <div className="attn-prog"><div className="attn-prog-track"><div className="attn-prog-fill" style={{ width: (done / 5 * 100) + '%' }} /></div><span>{done}/5</span></div>
                  <span className="attn-badge" style={{ background: meta?.color }}>{meta?.lbl}</span>
                </div>
              )
            })}
            {onVerCX && <button className="btn ghost attn-cta" onClick={onVerCX}>Ir a la Vista CX para gestionarlas</button>}
          </div>
        )}
      </div>
    </div>
  )
}
