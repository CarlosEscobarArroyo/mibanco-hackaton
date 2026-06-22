# Resumen Ejecutivo — EDA Tabla de Clientes (Reto 2, Mibanco)

**Fuente:** `01_Tabla_de_Clientes.xlsx` · **Registros:** 50,000 clientes · **Variables:** 20 · **Calidad:** 0 nulos, 0 duplicados (`cliente_id` único)

Gráficas en `eda_outputs/` · Script reproducible en `eda_clientes.py` · Tabla de segmentos en `eda_outputs/segmentos_resumen.csv`

---

## 1. Hallazgo metodológico más importante (leer primero)

El dataset está **limpio y completo**, pero el análisis estadístico revela que **es un conjunto sintético**: la mayoría de las variables siguen distribuciones uniformes y son **estadísticamente independientes entre sí**.

- Toda la matriz de correlación es ≈ 0.00, con **una sola excepción**: `uso_whatsapp ↔ canal_whatsapp = 0.79` (esperable, miden lo mismo).
- La tasa de adopción digital es **idéntica (~64.8%) en todos los segmentos** (región, zona, género, tipo de cliente).
- La probabilidad de default **no cambia** entre clientes digitales y no digitales (0.495 vs 0.499), ni con la edad.

**Implicancia:** con los datos tal como están **no existen relaciones predictivas reales que explotar** (un modelo de riesgo o de propensión digital tendría poder de discriminación nulo). El valor del reto está, por tanto, en:
1. Caracterizar y **segmentar la cartera** (sí es posible y útil).
2. Diseñar el **framework de targeting y los productos de datos** que, alimentados con datos reales de producción, generarían el impacto descrito en la sección 5.

> Recomendación: validar con el equipo si existe una versión con datos reales/etiquetas. Si el objetivo es demostrar la *metodología*, este dataset sirve perfectamente como banco de pruebas.

---

## 2. Panorama de la cartera  → `01_panorama_demografico.png`

| Dimensión | Composición |
|---|---|
| **Edad** | 21–69 años, media **45**, distribución plana (sin sesgo generacional) |
| **Género** | 50.2% F / 49.8% M (balanceado) |
| **Región** | Lima 25.2% · Norte 25.2% · Sur 24.9% · Centro 24.7% (homogéneo) |
| **Zona** | **Urbano 70.1%** / Rural 29.9% |
| **Tipo de cliente** | **Recurrente 60.2%** / Nuevo 39.8% |

> 6 de cada 10 clientes son recurrentes y 7 de cada 10 son urbanos: base estable y mayoritariamente concentrada en ciudades.

---

## 3. Adopción digital  → `02_adopcion_digital.png`

- **64.8%** son clientes digitales; **70.1%** usan WhatsApp.
- Intensidad de uso de App y score de interacción digital están repartidos de forma pareja (media ~50/100) — hay tanto usuarios intensivos como ocasionales.
- **~35% de la cartera (≈17,600 clientes) NO es digital** → bolsa principal de oportunidad de migración.

---

## 4. Canales de contacto  → `03_canales.png`

| Canal | Alcance |
|---|---|
| Llamada | **100%** (canal universal, único sin variación) |
| SMS | 80.1% |
| WhatsApp | 79.1% |
| Campo | 39.9% (el más costoso) |

- **51% de clientes tiene 3 canales disponibles** y 25% tiene los 4; solo 3% depende de un único canal.
- **Palanca de eficiencia:** ~79% es alcanzable por WhatsApp. Sustituir gestiones de campo/llamada por canales digitales en ese grupo reduce costo de servicio y cobranza sin perder cobertura.

---

## 5. Riesgo y comportamiento de pago  → `04_riesgo.png`

| Variable | Rango | Media |
|---|---|---|
| Score de riesgo | 300–849 | 574 |
| Prob. de default | 0–1 | 0.50 |
| Atrasos previos | 0–10 | 2 |
| Días de mora promedio | 0–59 | 29 |
| Ratio de pago | 0–1 | 0.50 |
| Días desde último pago | 0–89 | 44 |

> Las variables de riesgo están bien formadas y en rangos realistas, pero (ver sección 1) hoy no se correlacionan con ninguna otra. Son insumos listos para un modelo cuando se incorporen datos reales.

---

## 6. Matriz estratégica accionable  → `06_matriz_estrategica.png`

Cruzando **madurez digital** (score ≥ 50) × **riesgo** (prob. default ≥ 0.5) se obtiene una segmentación operable. Con este dataset los 4 cuadrantes pesan ~25% c/u (consecuencia de la independencia de variables); con datos reales los tamaños cambiarían y revelarían dónde concentrar esfuerzo:

| Cuadrante | Clientes | Acción recomendada |
|---|---|---|
| 🟢 **Estrella** (digital alto · riesgo bajo) | ~12,500 (25%) | Venta cruzada 100% digital, fidelización, embajadores |
| 🟠 **Vigilar** (digital alto · riesgo alto) | ~12,400 (25%) | Cobranza preventiva por App/WhatsApp, alertas tempranas |
| 🔵 **Migrar** (digital bajo · riesgo bajo) | ~12,600 (25%) | Campañas de onboarding digital (mayor ROI esperado) |
| 🔴 **Prioridad** (digital bajo · riesgo alto) | ~12,400 (25%) | Cobranza asistida (campo/llamada), atención humana |

---

## 7. Qué se puede conseguir (oportunidades)

1. **Migración digital dirigida:** ~17,600 clientes no digitales, 79% alcanzables por WhatsApp → campañas de adopción de App de bajo costo.
2. **Optimización de costo de canal:** mover gestiones de campo (39.9%, el más caro) a digital en clientes con canales alternativos disponibles.
3. **Cobranza inteligente:** priorizar gestión humana solo en el cuadrante "Prioridad" y resolver el resto por canales automáticos.
4. **Motor de venta cruzada** sobre el segmento "Estrella" (clientes digitales y de bajo riesgo).
5. **Productos de datos a construir** (cuando haya datos reales): scoring de propensión a adopción digital, scoring de riesgo/cobranza, y un *next-best-channel* por cliente.

## 8. Próximos pasos sugeridos

- [ ] Confirmar si hay versión del dataset con datos reales/etiquetas históricas.
- [ ] Enriquecer con variables de producto (saldo, tipo de crédito, antigüedad, transaccionalidad).
- [ ] Definir KPIs objetivo (tasa de adopción digital, costo por gestión, % mora) para medir impacto.
- [ ] Prototipar los modelos del punto 7.5 una vez disponibles datos con señal.
