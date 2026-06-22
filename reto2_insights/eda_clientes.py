"""
EDA - Tabla de Clientes Mibanco (Reto 2)
Genera graficas e insights en reto2_insights/eda_outputs/
"""
import os
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

BASE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(BASE, "eda_outputs")
os.makedirs(OUT, exist_ok=True)

# Paleta Mibanco (naranja/rojo corporativo)
NARANJA = "#F47B20"
ROJO = "#E2231A"
AZUL = "#1B3A6B"
GRIS = "#6B7280"
VERDE = "#2E9E5B"
PAL = [NARANJA, AZUL, VERDE, ROJO, GRIS]
sns.set_theme(style="whitegrid", palette=PAL)
plt.rcParams.update({
    "figure.dpi": 120, "savefig.dpi": 120, "savefig.bbox": "tight",
    "font.size": 10, "axes.titleweight": "bold", "axes.titlesize": 12,
    "figure.titleweight": "bold", "figure.titlesize": 15,
})

df = pd.read_excel(os.path.join(BASE, "01_Tabla_de_Clientes.xlsx"))
N = len(df)
print(f"Cargados {N:,} clientes, {df.shape[1]} columnas")


def save(fig, name, tight=True):
    if tight:
        fig.tight_layout(rect=[0, 0, 1, 0.95])
    path = os.path.join(OUT, name)
    fig.savefig(path)
    plt.close(fig)
    print("  ->", name)


# ----------------------------------------------------------------------
# 1. PANORAMA DEMOGRAFICO
# ----------------------------------------------------------------------
fig, ax = plt.subplots(2, 3, figsize=(15, 8))
fig.suptitle("1. Panorama demografico de la cartera (50,000 clientes)")

ax[0, 0].hist(df["edad"], bins=25, color=NARANJA, edgecolor="white")
ax[0, 0].set_title("Distribucion de edad"); ax[0, 0].set_xlabel("Edad")
ax[0, 0].axvline(df["edad"].mean(), color=ROJO, ls="--", lw=2,
                 label=f"Media {df['edad'].mean():.0f}")
ax[0, 0].legend()

for a, col, ttl in [(ax[0, 1], "genero", "Genero"),
                    (ax[0, 2], "zona", "Zona"),
                    (ax[1, 0], "tipo_cliente", "Tipo de cliente")]:
    vc = df[col].value_counts()
    a.pie(vc, labels=vc.index, autopct="%1.1f%%", colors=PAL, startangle=90,
          wedgeprops=dict(width=0.45, edgecolor="white"))
    a.set_title(ttl)

vc = df["region"].value_counts()
ax[1, 1].bar(vc.index, vc.values, color=AZUL)
ax[1, 1].set_title("Clientes por region")
for i, v in enumerate(vc.values):
    ax[1, 1].text(i, v, f"{v:,}", ha="center", va="bottom", fontsize=9)

# Piramide etaria por genero
bins = [20, 30, 40, 50, 60, 70]
labels = ["21-30", "31-40", "41-50", "51-60", "61-69"]
df["grupo_edad"] = pd.cut(df["edad"], bins=bins, labels=labels, right=True, include_lowest=True)
ct = df.groupby(["grupo_edad", "genero"], observed=True).size().unstack()
ct.plot(kind="barh", ax=ax[1, 2], color=[ROJO, AZUL])
ax[1, 2].set_title("Grupos de edad por genero"); ax[1, 2].set_ylabel("")
save(fig, "01_panorama_demografico.png")

# ----------------------------------------------------------------------
# 2. ADOPCION DIGITAL
# ----------------------------------------------------------------------
fig, ax = plt.subplots(2, 3, figsize=(15, 8))
fig.suptitle("2. Adopcion y comportamiento digital")

dig = df["es_digital"].mean()
ax[0, 0].pie([dig, 1 - dig], labels=["Digital", "No digital"],
             autopct="%1.1f%%", colors=[NARANJA, GRIS], startangle=90,
             wedgeprops=dict(width=0.45, edgecolor="white"))
ax[0, 0].set_title("¿Es cliente digital?")

ax[0, 1].hist(df["uso_app"], bins=20, color=NARANJA, edgecolor="white")
ax[0, 1].set_title("Intensidad de uso de App (0-1)"); ax[0, 1].set_xlabel("uso_app")

ax[0, 2].hist(df["interaccion_digital_score"], bins=25, color=AZUL, edgecolor="white")
ax[0, 2].set_title("Score de interaccion digital (0-100)")
ax[0, 2].axvline(df["interaccion_digital_score"].mean(), color=ROJO, ls="--", lw=2)

# Adopcion por segmento (mostrar uniformidad)
seg = pd.DataFrame({
    "Region": df.groupby("region")["es_digital"].mean(),
    "Zona": df.groupby("zona")["es_digital"].mean(),
}).T
adopt = {}
for c in ["region", "zona", "tipo_cliente", "genero"]:
    for k, v in df.groupby(c)["es_digital"].mean().items():
        adopt[f"{k}"] = v
s = pd.Series(adopt)
ax[1, 0].barh(s.index, s.values, color=VERDE)
ax[1, 0].axvline(dig, color=ROJO, ls="--", lw=2, label=f"Media {dig:.1%}")
ax[1, 0].set_xlim(0, 1); ax[1, 0].set_title("Tasa digital por segmento"); ax[1, 0].legend()

# Uso whatsapp
wa = df["uso_whatsapp"].mean()
ax[1, 1].pie([wa, 1 - wa], labels=["Usa WhatsApp", "No usa"],
             autopct="%1.1f%%", colors=[VERDE, GRIS], startangle=90,
             wedgeprops=dict(width=0.45, edgecolor="white"))
ax[1, 1].set_title("Uso de WhatsApp")

# Score digital por grupo de edad
ge = df.groupby("grupo_edad", observed=True)["interaccion_digital_score"].mean()
ax[1, 2].bar(ge.index.astype(str), ge.values, color=NARANJA)
ax[1, 2].set_title("Score digital promedio por edad")
ax[1, 2].set_ylim(0, 100)
save(fig, "02_adopcion_digital.png")

# ----------------------------------------------------------------------
# 3. ALCANCE DE CANALES
# ----------------------------------------------------------------------
fig, ax = plt.subplots(1, 2, figsize=(15, 6))
fig.suptitle("3. Alcance y disponibilidad de canales de contacto")

canales = {
    "Llamada": df["canal_llamada"].mean(),
    "SMS": df["canal_sms"].mean(),
    "WhatsApp": df["canal_whatsapp"].mean(),
    "Campo": df["canal_campo"].mean(),
}
s = pd.Series(canales).sort_values()
bars = ax[0].barh(s.index, s.values * 100, color=[GRIS, NARANJA, VERDE, AZUL])
ax[0].set_title("% de clientes alcanzables por canal")
ax[0].set_xlabel("% de la cartera"); ax[0].set_xlim(0, 105)
for i, v in enumerate(s.values):
    ax[0].text(v * 100 + 1, i, f"{v:.1%}", va="center", fontsize=10)

# Numero de canales disponibles por cliente
df["n_canales"] = df[["canal_whatsapp", "canal_sms", "canal_llamada", "canal_campo"]].sum(axis=1)
nc = df["n_canales"].value_counts().sort_index()
ax[1].bar(nc.index.astype(str), nc.values, color=AZUL)
ax[1].set_title("Numero de canales disponibles por cliente")
ax[1].set_xlabel("Canales disponibles")
for i, (idx, v) in enumerate(nc.items()):
    ax[1].text(i, v, f"{v:,}\n({v/N:.0%})", ha="center", va="bottom", fontsize=9)
save(fig, "03_canales.png")

# ----------------------------------------------------------------------
# 4. PERFIL DE RIESGO
# ----------------------------------------------------------------------
fig, ax = plt.subplots(2, 3, figsize=(15, 8))
fig.suptitle("4. Perfil de riesgo y comportamiento de pago")

ax[0, 0].hist(df["score_riesgo"], bins=30, color=AZUL, edgecolor="white")
ax[0, 0].set_title("Score de riesgo (300-849)")
ax[0, 0].axvline(df["score_riesgo"].mean(), color=ROJO, ls="--", lw=2)

ax[0, 1].hist(df["prob_default"], bins=25, color=ROJO, edgecolor="white")
ax[0, 1].set_title("Probabilidad de default (0-1)")

ax[0, 2].hist(df["ratio_pago"], bins=25, color=VERDE, edgecolor="white")
ax[0, 2].set_title("Ratio de pago (0-1)")

vc = df["num_atrasos_previos"].value_counts().sort_index()
ax[1, 0].bar(vc.index.astype(str), vc.values, color=NARANJA)
ax[1, 0].set_title("Numero de atrasos previos")
ax[1, 0].set_xlabel("# atrasos")

ax[1, 1].hist(df["dias_mora_promedio"], bins=30, color=ROJO, edgecolor="white")
ax[1, 1].set_title("Dias de mora promedio")

ax[1, 2].hist(df["ultimo_pago_dias"], bins=30, color=AZUL, edgecolor="white")
ax[1, 2].set_title("Dias desde ultimo pago")
save(fig, "04_riesgo.png")

# ----------------------------------------------------------------------
# 5. MATRIZ DE CORRELACION
# ----------------------------------------------------------------------
num = df.select_dtypes("number").drop(columns=["cliente_id", "n_canales"], errors="ignore")
corr = num.corr()
fig, ax = plt.subplots(figsize=(12, 10))
mask = np.triu(np.ones_like(corr, dtype=bool))
sns.heatmap(corr, mask=mask, annot=True, fmt=".2f", cmap="RdBu_r", center=0,
            vmin=-1, vmax=1, square=True, linewidths=.5, cbar_kws={"shrink": .7}, ax=ax)
ax.set_title("5. Matriz de correlacion entre variables\n"
             "(unica relacion relevante: uso_whatsapp <-> canal_whatsapp = 0.79)")
save(fig, "05_correlaciones.png")

# ----------------------------------------------------------------------
# 6. MATRIZ ESTRATEGICA: DIGITAL x RIESGO  (accionable)
# ----------------------------------------------------------------------
# Riesgo: prob_default >= 0.5 = alto ; Digital: interaccion_digital_score >= 50 = alto
df["riesgo_nivel"] = np.where(df["prob_default"] >= 0.5, "Riesgo alto", "Riesgo bajo")
df["digital_nivel"] = np.where(df["interaccion_digital_score"] >= 50, "Digital alto", "Digital bajo")
mat = pd.crosstab(df["digital_nivel"], df["riesgo_nivel"])
mat = mat.reindex(index=["Digital alto", "Digital bajo"],
                  columns=["Riesgo bajo", "Riesgo alto"])

fig, ax = plt.subplots(1, 2, figsize=(15, 6))
fig.suptitle("6. Matriz estrategica: madurez digital x riesgo")

sns.heatmap(mat, annot=mat.map(lambda v: f"{v:,}\n{v/N:.1%}"), fmt="", cmap="Oranges",
            linewidths=2, linecolor="white", cbar=False, ax=ax[0],
            annot_kws={"size": 13, "weight": "bold"})
ax[0].set_title("# de clientes por cuadrante")
ax[0].set_xlabel(""); ax[0].set_ylabel("")

# Etiquetas accionables por cuadrante
quad_labels = {
    ("Digital alto", "Riesgo bajo"): "ESTRELLA\nVenta cruzada\n100% digital",
    ("Digital alto", "Riesgo alto"): "VIGILAR\nCobranza por\napp/WhatsApp",
    ("Digital bajo", "Riesgo bajo"): "MIGRAR\nImpulsar adopcion\ndigital",
    ("Digital bajo", "Riesgo alto"): "PRIORIDAD\nCobranza asistida\n+ campo/llamada",
}
ax[1].axis("off")
ax[1].set_title("Accion recomendada por cuadrante")
colors_q = [[VERDE, NARANJA], [AZUL, ROJO]]
for i, dn in enumerate(["Digital alto", "Digital bajo"]):
    for j, rn in enumerate(["Riesgo bajo", "Riesgo alto"]):
        n_q = mat.loc[dn, rn]
        ax[1].add_patch(plt.Rectangle((j, 1 - i), 1, 1, color=colors_q[i][j], alpha=.85))
        ax[1].text(j + .5, 1 - i + .5, f"{quad_labels[(dn, rn)]}\n\n{n_q:,} ({n_q/N:.0%})",
                   ha="center", va="center", color="white", fontsize=10, weight="bold")
ax[1].set_xlim(0, 2); ax[1].set_ylim(0, 2)
ax[1].text(0.5, 2.08, "Riesgo bajo", ha="center", fontsize=11, weight="bold")
ax[1].text(1.5, 2.08, "Riesgo alto", ha="center", fontsize=11, weight="bold")
ax[1].text(-0.05, 1.5, "Digital\nalto", ha="right", va="center", fontsize=11, weight="bold")
ax[1].text(-0.05, 0.5, "Digital\nbajo", ha="right", va="center", fontsize=11, weight="bold")
save(fig, "06_matriz_estrategica.png", tight=False)

# Exportar tabla de segmentos a CSV
seg_tab = df.groupby(["digital_nivel", "riesgo_nivel"], observed=True).agg(
    clientes=("cliente_id", "count"),
    edad_prom=("edad", "mean"),
    prob_default_prom=("prob_default", "mean"),
    score_digital_prom=("interaccion_digital_score", "mean"),
    pct_whatsapp=("canal_whatsapp", "mean"),
).round(2)
seg_tab.to_csv(os.path.join(OUT, "segmentos_resumen.csv"))
print("\n=== TABLA DE SEGMENTOS ===")
print(seg_tab)
print("\nListo. Graficas en:", OUT)
