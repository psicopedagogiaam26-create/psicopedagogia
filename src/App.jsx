import { useState, useRef, useEffect, useCallback } from "react";
import { db } from "./firebase";
import {
  collection, doc, getDocs, setDoc, deleteDoc, onSnapshot
} from "firebase/firestore";

// ── Colecciones en Firestore ──
const COLS = ["pacientes","tutores","obrasSociales","turnos","sesiones","tests","cobros","anamnesis","informes"];

const initData = {
  profesional: { nombre: "Martín, Andrea L.", matricula: "MP-U Nº430", especialidad: "Lic. en Psicopedagogía", telefono: "", email: "", direccion: "Av. San Martín 1544 - Resistencia - Chaco", logo: "" },
  pacientes: [], tutores: [], obrasSociales: [
    { id: "os1", nombre: "OSDE", cobertura: 70, demoraDias: 30 },
    { id: "os2", nombre: "PAMI", cobertura: 100, demoraDias: 45 },
    { id: "os3", nombre: "Swiss Medical", cobertura: 80, demoraDias: 20 },
  ],
  turnos: [], sesiones: [], tests: [], cobros: [], anamnesis: [], informes: [],
};

const PARENTESCOS = ["Padre","Madre","Padrastro","Madrastra","Tutor legal","Abuelo","Abuela","Tío","Tía","Primo","Prima","Hermano mayor","Hermana mayor"];
const TIPOS_TEST = ["WISC-V","Bender","HTP","Familia Kinética","Test de la Figura Humana","Prueba de Lectura","Evaluación Fonológica","Otro"];

function uid() { return Date.now() + Math.random().toString(36).slice(2); }
function edadAnios(fnac) {
  if (!fnac) return "";
  const d = new Date(fnac), n = new Date();
  let a = n.getFullYear() - d.getFullYear();
  if (n.getMonth() < d.getMonth() || (n.getMonth() === d.getMonth() && n.getDate() < d.getDate())) a--;
  return a;
}

// ── Hook Firebase ──
function useFirebase() {
  const [data, setData] = useState(initData);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);

  // Escuchar cambios en tiempo real para todas las colecciones
  useEffect(() => {
    const unsubs = [];
    let loaded = 0;
    COLS.forEach(col => {
      const unsub = onSnapshot(collection(db, col), snap => {
        const items = snap.docs.map(d => ({ ...d.data(), id: d.id }));
        setData(prev => ({ ...prev, [col]: items }));
        loaded++;
        if (loaded >= COLS.length) setLoading(false);
      });
      unsubs.push(unsub);
    });
    // Cargar configuración del profesional
    const profUnsub = onSnapshot(doc(db, "config", "profesional"), snap => {
      if (snap.exists()) setData(prev => ({ ...prev, profesional: snap.data() }));
      setLoading(false);
    });
    unsubs.push(profUnsub);
    return () => unsubs.forEach(u => u());
  }, []);

  // Guardar un item en una colección
  const saveItem = useCallback(async (colName, item) => {
    setSyncing(true);
    try {
      await setDoc(doc(db, colName, item.id), item);
    } finally { setSyncing(false); }
  }, []);

  // Eliminar un item de una colección
  const deleteItem = useCallback(async (colName, id) => {
    setSyncing(true);
    try {
      await deleteDoc(doc(db, colName, id));
    } finally { setSyncing(false); }
  }, []);

  // Guardar configuración del profesional
  const saveProfesional = useCallback(async (prof) => {
    setSyncing(true);
    try {
      await setDoc(doc(db, "config", "profesional"), prof);
      setData(prev => ({ ...prev, profesional: prof }));
    } finally { setSyncing(false); }
  }, []);

  return { data, loading, syncing, saveItem, deleteItem, saveProfesional };
}

// ── FIELD COMPONENT ──
function Field({ l, k, type="text", opts=null, full=false, value, onChange }) {
  return (
    <div className={`form-group${full?" form-full":""}`}>
      <label>{l}</label>
      {opts
        ? <select value={value||""} onChange={e => onChange(k, e.target.value)}>
            <option value="">— seleccionar —</option>
            {opts.map(o => <option key={o}>{o}</option>)}
          </select>
        : type==="textarea"
          ? <textarea value={value||""} onChange={e => onChange(k, e.target.value)} />
          : <input type={type} value={value||""} onChange={e => onChange(k, e.target.value)} />
      }
    </div>
  );
}

const css = `
* { box-sizing: border-box; margin: 0; padding: 0; }
body { font-family: var(--font-sans, system-ui); font-size: 15px; color: #4a3f35; background: #f0ece8; }
.layout { display: flex; min-height: 100vh; }
.sidebar { width: 220px; min-width: 220px; background: #faf8f5; border-right: 1px solid #e2ddd8; padding: 1rem 0; display: flex; flex-direction: column; }
.sidebar-logo { padding: 0 1rem 1rem; border-bottom: 1px solid #e2ddd8; margin-bottom: 0.5rem; }
.sidebar-logo h2 { font-size: 13px; font-weight: 500; color: #4a3f35; line-height: 1.4; }
.sidebar-logo p { font-size: 12px; color: #8a7e74; }
.nav-item { display: flex; align-items: center; gap: 8px; padding: 9px 1rem; cursor: pointer; font-size: 14px; color: #8a7e74; border-left: 2px solid transparent; transition: all 0.15s; }
.nav-item:hover { background: #ece8e2; color: #4a3f35; }
.nav-item.active { color: #6b5b8e; border-left-color: #6b5b8e; background: #ede8f5; font-weight: 500; }
.nav-section { font-size: 10px; font-weight: 500; color: #b0a898; padding: 1rem 1rem 0.25rem; text-transform: uppercase; letter-spacing: 0.05em; }
.sync-bar { padding: 6px 1rem; font-size: 12px; background: #ede8f5; color: #6b5b8e; display: flex; align-items: center; gap: 6px; }
.main { flex: 1; overflow: auto; }
.topbar { background: #faf8f5; border-bottom: 1px solid #e2ddd8; padding: 0.75rem 1.5rem; display: flex; align-items: center; justify-content: space-between; }
.topbar h1 { font-size: 17px; font-weight: 500; color: #4a3f35; }
.content { padding: 1.5rem; }
.card { background: #faf8f5; border: 1px solid #e2ddd8; border-radius: 12px; padding: 1rem 1.25rem; margin-bottom: 1rem; }
.card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; flex-wrap: wrap; gap: 8px; }
.card-title { font-size: 15px; font-weight: 500; color: #4a3f35; }
.btn { display: inline-flex; align-items: center; gap: 6px; padding: 7px 15px; border: 1px solid #c8c0b8; border-radius: 8px; background: #faf8f5; cursor: pointer; font-size: 14px; color: #4a3f35; transition: background 0.15s; }
.btn:hover { background: #ece8e2; }
.btn-primary { background: #6b5b8e; color: #fff; border-color: #6b5b8e; }
.btn-primary:hover { background: #5a4a7a; }
.btn-success { background: #5a8a6a; color: #fff; border-color: #5a8a6a; }
.btn-success:hover { background: #4a7a5a; }
.btn-danger { color: #a05050; border-color: #d8b0b0; background: #fdf5f5; }
.btn-danger:hover { background: #fae8e8; }
.btn-sm { padding: 4px 11px; font-size: 13px; }
input, select, textarea { width: 100%; padding: 8px 11px; border: 1px solid #c8c0b8; border-radius: 8px; background: #fff; color: #4a3f35; font-size: 15px; font-family: inherit; }
textarea { resize: vertical; min-height: 80px; }
input:focus, select:focus, textarea:focus { outline: none; border-color: #6b5b8e; box-shadow: 0 0 0 2px #ede8f5; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.form-full { grid-column: 1 / -1; }
.form-group { display: flex; flex-direction: column; gap: 5px; }
.form-group label { font-size: 13px; color: #7a6e64; font-weight: 500; }
.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-size: 14px; }
th { text-align: left; padding: 9px 12px; font-size: 12px; font-weight: 500; color: #8a7e74; border-bottom: 1px solid #e2ddd8; text-transform: uppercase; letter-spacing: 0.04em; background: #f5f1ec; }
td { padding: 10px 12px; border-bottom: 1px solid #ece8e2; vertical-align: middle; color: #4a3f35; }
tr:last-child td { border-bottom: none; }
tr:hover td { background: #f5f1ec; }
.badge { display: inline-flex; align-items: center; padding: 3px 9px; border-radius: 6px; font-size: 12px; font-weight: 500; }
.badge-purple { background: #ede8f5; color: #6b5b8e; }
.badge-green { background: #e8f5ee; color: #4a7a5a; }
.badge-amber { background: #fdf3e0; color: #8a6a20; }
.badge-red { background: #fde8e8; color: #a05050; }
.badge-blue { background: #e8f0fd; color: #3a5a9a; }
.modal-overlay { position: fixed; inset: 0; background: rgba(30,20,10,0.82); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 1rem; backdrop-filter: blur(4px); }
.modal { background: #faf8f5; border-radius: 14px; width: 100%; max-width: 700px; max-height: 92vh; overflow-y: auto; padding: 1.5rem; box-shadow: 0 20px 60px rgba(0,0,0,0.4); border: 1px solid #e2ddd8; }
.modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.25rem; padding-bottom: 1rem; border-bottom: 1px solid #e2ddd8; }
.modal-title { font-size: 17px; font-weight: 500; color: #4a3f35; }
.modal-footer { display: flex; justify-content: flex-end; gap: 8px; margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid #e2ddd8; }
.tabs { display: flex; gap: 2px; border-bottom: 1px solid #e2ddd8; margin-bottom: 1.25rem; overflow-x: auto; background: #f5f1ec; border-radius: 8px 8px 0 0; padding: 4px 4px 0; }
.tab { padding: 8px 14px; cursor: pointer; font-size: 13px; color: #8a7e74; border-bottom: 2px solid transparent; margin-bottom: -1px; white-space: nowrap; border-radius: 6px 6px 0 0; transition: all 0.15s; }
.tab:hover { background: #ece8e2; color: #4a3f35; }
.tab.active { color: #6b5b8e; border-bottom-color: #6b5b8e; background: #faf8f5; font-weight: 500; }
.stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; margin-bottom: 1rem; }
.stat-card { background: #faf8f5; border: 1px solid #e2ddd8; border-radius: 10px; padding: 1rem; }
.stat-label { font-size: 13px; color: #8a7e74; margin-bottom: 4px; }
.stat-value { font-size: 24px; font-weight: 500; color: #4a3f35; }
.avatar { width: 34px; height: 34px; border-radius: 50%; background: #ede8f5; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 500; color: #6b5b8e; flex-shrink: 0; }
.section-title { font-size: 12px; font-weight: 500; color: #8a7e74; margin: 1.25rem 0 0.6rem; padding-bottom: 5px; border-bottom: 1px solid #e2ddd8; text-transform: uppercase; letter-spacing: 0.05em; }
.hermanos-table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 4px; }
.hermanos-table th { background: #f5f1ec; padding: 7px 8px; font-size: 12px; border-bottom: 1px solid #e2ddd8; color: #8a7e74; }
.hermanos-table td { padding: 5px; border-bottom: 1px solid #ece8e2; }
.hermanos-table td input { padding: 5px 8px; font-size: 13px; }
.hamburger { display: none; background: none; border: none; cursor: pointer; padding: 4px; color: #4a3f35; }
.sidebar-overlay { display: none; }
.info-box { background: #ede8f5; border: 1px solid #c8b8e8; border-radius: 8px; padding: 10px 14px; font-size: 13px; color: #5a4a7a; margin-bottom: 12px; }
.loading-screen { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; gap: 16px; background: #f0ece8; }
.spinner { width: 40px; height: 40px; border: 3px solid #e2ddd8; border-top-color: #6b5b8e; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }
@media (max-width: 768px) {
  .sidebar { position: fixed; left: -220px; top: 0; height: 100vh; z-index: 200; transition: left 0.2s; }
  .sidebar.open { left: 0; }
  .sidebar-overlay { display: block; position: fixed; inset: 0; background: rgba(0,0,0,0.3); z-index: 199; }
  .hamburger { display: flex; }
  .content { padding: 1rem; }
  .form-grid { grid-template-columns: 1fr; }
  .form-full { grid-column: 1; }
}
@media print {
  body * { visibility: hidden; }
  #informe-print, #informe-print * { visibility: visible; }
  #informe-print { position: fixed; inset: 0; padding: 1.5cm 2cm; background: white; font-family: Arial, sans-serif; font-size: 11pt; color: #000; }
}
`;

// ══════════════════════════════════════════════════════
//  APP PRINCIPAL
// ══════════════════════════════════════════════════════
export default function App() {
  const { data, loading, syncing, saveItem, deleteItem, saveProfesional } = useFirebase();
  const [view, setView] = useState("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [logoSrc, setLogoSrc] = useState("");

  useEffect(() => {
    if (data.profesional?.logo) setLogoSrc(data.profesional.logo);
  }, [data.profesional?.logo]);

  const nav = (v) => { setView(v); setSidebarOpen(false); };

  const navItems = [
    { key:"dashboard", label:"Dashboard" },
    { section:"Clínica" },
    { key:"pacientes", label:"Pacientes" },
    { key:"turnos", label:"Turnos" },
    { key:"sesiones", label:"Sesiones" },
    { key:"tests", label:"Tests" },
    { key:"informes", label:"Informes" },
    { section:"Administración" },
    { key:"cobros", label:"Cobros" },
    { key:"obrasSociales", label:"Obras Sociales" },
    { section:"Sistema" },
    { key:"profesional", label:"Mi Perfil" },
  ];
  const titles = { dashboard:"Dashboard", pacientes:"Pacientes", turnos:"Turnos", sesiones:"Sesiones", tests:"Tests", informes:"Informes", cobros:"Cobros", obrasSociales:"Obras Sociales", profesional:"Mi Perfil" };

  if (loading) return (
    <>
      <style>{css}</style>
      <div className="loading-screen">
        <div className="spinner" />
        <div style={{fontSize:15,color:"#8a7e74"}}>Conectando con la base de datos...</div>
      </div>
    </>
  );

  const ctx = { data, saveItem, deleteItem, saveProfesional, logoSrc, setLogoSrc };

  return (
    <>
      <style>{css}</style>
      <div className="layout">
        {sidebarOpen && <div className="sidebar-overlay" onClick={()=>setSidebarOpen(false)} />}
        <div className={`sidebar${sidebarOpen?" open":""}`}>
          <div className="sidebar-logo">
            <h2>{data.profesional?.nombre || "Psicopedagogía"}</h2>
            <p>{data.profesional?.matricula}</p>
          </div>
          {navItems.map((item,i) =>
            item.section
              ? <div key={i} className="nav-section">{item.section}</div>
              : <div key={item.key} className={`nav-item${view===item.key?" active":""}`} onClick={()=>nav(item.key)}>{item.label}</div>
          )}
          {syncing && <div className="sync-bar"><div className="spinner" style={{width:12,height:12,borderWidth:2}} />Guardando...</div>}
          {!syncing && <div style={{padding:"6px 1rem",fontSize:12,color:"#5a8a6a"}}>✓ Sincronizado</div>}
        </div>
        <div className="main">
          <div className="topbar">
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <button className="hamburger" onClick={()=>setSidebarOpen(true)}>
                <svg width="20" height="20" viewBox="0 0 20 20"><rect y="4" width="20" height="2" rx="1" fill="currentColor"/><rect y="9" width="20" height="2" rx="1" fill="currentColor"/><rect y="14" width="20" height="2" rx="1" fill="currentColor"/></svg>
              </button>
              <h1>{titles[view]}</h1>
            </div>
          </div>
          <div className="content">
            {view==="dashboard" && <Dashboard ctx={ctx} nav={nav} />}
            {view==="pacientes" && <Pacientes ctx={ctx} />}
            {view==="turnos" && <Turnos ctx={ctx} />}
            {view==="sesiones" && <Sesiones ctx={ctx} />}
            {view==="tests" && <Tests ctx={ctx} />}
            {view==="informes" && <Informes ctx={ctx} />}
            {view==="cobros" && <Cobros ctx={ctx} />}
            {view==="obrasSociales" && <ObrasSociales ctx={ctx} />}
            {view==="profesional" && <Profesional ctx={ctx} />}
          </div>
        </div>
      </div>
    </>
  );
}

// ── DASHBOARD ──
function Dashboard({ ctx, nav }) {
  const { data } = ctx;
  const hoy = new Date().toISOString().slice(0,10);
  return (
    <div>
      <div className="stat-grid">
        <div className="stat-card"><div className="stat-label">Pacientes</div><div className="stat-value">{data.pacientes.length}</div></div>
        <div className="stat-card"><div className="stat-label">Turnos hoy</div><div className="stat-value">{data.turnos.filter(t=>t.fecha===hoy).length}</div></div>
        <div className="stat-card"><div className="stat-label">Cobros pendientes</div><div className="stat-value">{data.cobros.filter(c=>c.estado==="Pendiente").length}</div></div>
        <div className="stat-card"><div className="stat-label">Sesiones totales</div><div className="stat-value">{data.sesiones.length}</div></div>
      </div>
      <div className="card">
        <div className="card-header"><span className="card-title">Próximos turnos</span><button className="btn btn-sm" onClick={()=>nav("turnos")}>Ver todos</button></div>
        {data.turnos.filter(t=>t.fecha>=hoy).sort((a,b)=>a.fecha>b.fecha?1:-1).slice(0,6).map(t=>{
          const p = data.pacientes.find(p=>p.id===t.pacienteId);
          const nombre = p?`${p.nombre} ${p.apellido}`:(t.descripcionLibre||"Sin especificar");
          return <div key={t.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"9px 0",borderBottom:"1px solid #ece8e2"}}>
            <span>{nombre}</span>
            <span style={{fontSize:13,color:"#8a7e74"}}>{t.fecha} {t.hora}</span>
            <span className={`badge badge-${t.estado==="Confirmado"?"green":t.estado==="Cancelado"?"red":t.estado==="Ausente"?"amber":"purple"}`}>{t.estado}</span>
          </div>;
        })}
        {data.turnos.filter(t=>t.fecha>=hoy).length===0 && <p style={{fontSize:14,color:"#8a7e74"}}>Sin turnos próximos</p>}
      </div>
    </div>
  );
}

// ── PACIENTES ──
const ESCOLARIDAD_OPTS = ["Primario Incompleto","Primario Completo","Secundario Incompleto","Secundario Completo","Universitario Incompleto","Universitario Completo"];
const emptyPaciente = { nombre:"", apellido:"", dni:"", fechaNac:"", apodo:"", religion:"", escuela:"", alergias:"No", manoDominante:"Derecha", medicoC:"", motivoConsulta:"", direccion:"", consentimientoInformado:"No", padreNombre:"", padreEdad:"", padreOcupacion:"", padreEscolaridad:"", padreAntecedentes:"", padreTelefono:"", padreDni:"", madreNombre:"", madreEdad:"", madreOcupacion:"", madreEscolaridad:"", madreAntecedentes:"", madreTelefono:"", madreDni:"", hermanos:[], conQuienVive:"", relacionMadre:"", relacionPadre:"", relacionHermanos:"" };
const emptyAnam = { fechaEntrevista:"", pesoNacer:"", embarazo:"Normal", termino:"A término", fueplanificado:"", buenaAlimentacion:"", cuidadosNecesarios:"", tabaco:"No", alcohol:"No", medicacion:"", otrosConsumo:"", traumaPsiquico:"", noticiaEmbarazo:"", dificultadEmbarazo:"", estadoAnimo:"", parto:"Normal", sexoDeseado:"", circularCordon:"No", podal:"No", incompatibilidadSanguinea:"No", incubadora:"No", tiempoIncubadora:"", dificultadParto:"", enfermedadesPostnatal:"", cirugias:"", lactanciaMaterna:"", lactanciaMixta:"", chupete:"No", succionDedo:"No", mamadera:"No", alimentacionSemis:"", alimentacionSolida:"", alimentoNoGusta:"", denticion:"", esfinterDiurno:"", esfinterNocturno:"", higieneSolo:"", banoSolo:"", quienBana:"", controlCefalico:"", controlTronco:"", marcha:"", suenhoLugar:"", suenhoHoras:"", suenhoHorario:"", suenhoElemento:"", suenhoDispositivo:"No", vocalizaciones:"", palabras:"", frase:"", gestual:"", manifestaDeseos:"", preferencias:"", consignasSimples:"", repetirConsigna:"", activo:"", tiendaAislarse:"", esAgresivo:"", juegos:"", conQuienJuega:"", dominadoPorOtros:"", esCarinoso:"", esInquieto:"", problemasDisciplina:"", jardinMaternal:"", edadIngreso:"", jardinInfantes:"", pasoPorJardin:"", escuelaPrimaria:"", gradoActual:"", materiasGusta:"", actividadesExtra:"", otrosDatos:"" };
const ANAM_TABS = [{key:"embarazo",label:"Embarazo"},{key:"parto",label:"Parto y nacimiento"},{key:"alimentacion",label:"Alimentación"},{key:"esfinteres",label:"Esfínteres"},{key:"psicomotricidad",label:"Psicomotricidad"},{key:"suenho",label:"Sueño"},{key:"comunicacion",label:"Comunicación"},{key:"socializacion",label:"Socialización"},{key:"escolar",label:"Trayectoria escolar"},{key:"otros",label:"Otros"}];

function AnamnesisForm({ form, setField }) {
  const [tab, setTab] = useState("embarazo");
  return (
    <div>
      <div className="tabs" style={{flexWrap:"wrap"}}>
        {ANAM_TABS.map(t=><div key={t.key} className={`tab${tab===t.key?" active":""}`} onClick={()=>setTab(t.key)}>{t.label}</div>)}
      </div>
      {tab==="embarazo" && <div className="form-grid">
        <Field l="Fecha de entrevista" k="fechaEntrevista" type="date" value={form.fechaEntrevista} onChange={setField} />
        <Field l="Peso al nacer" k="pesoNacer" value={form.pesoNacer} onChange={setField} />
        <Field l="Tipo de embarazo" k="embarazo" opts={["Normal","Con complicaciones"]} value={form.embarazo} onChange={setField} />
        <Field l="Término" k="termino" opts={["A término","Prematuro","Postérmino"]} value={form.termino} onChange={setField} />
        <Field l="¿Fue planificado?" k="fueplanificado" opts={["Sí","No"]} value={form.fueplanificado} onChange={setField} />
        <Field l="¿Buena alimentación?" k="buenaAlimentacion" opts={["Sí","No"]} value={form.buenaAlimentacion} onChange={setField} />
        <Field l="¿Cuidados necesarios?" k="cuidadosNecesarios" opts={["Sí","No"]} value={form.cuidadosNecesarios} onChange={setField} />
        <Field l="Consumo: tabaco" k="tabaco" opts={["No","Sí"]} value={form.tabaco} onChange={setField} />
        <Field l="Consumo: alcohol" k="alcohol" opts={["No","Sí"]} value={form.alcohol} onChange={setField} />
        <Field l="Consumo: medicación" k="medicacion" value={form.medicacion} onChange={setField} />
        <Field l="Consumo: otros" k="otrosConsumo" value={form.otrosConsumo} onChange={setField} />
        <Field l="Sexo deseado" k="sexoDeseado" opts={["Masculino","Femenino","Sin preferencia"]} value={form.sexoDeseado} onChange={setField} />
        <Field l="¿Trauma psíquico o caída?" k="traumaPsiquico" value={form.traumaPsiquico} onChange={setField} />
        <Field l="¿Cómo tomaron la noticia?" k="noticiaEmbarazo" value={form.noticiaEmbarazo} onChange={setField} />
        <Field l="Estado de ánimo durante el embarazo" k="estadoAnimo" type="textarea" full value={form.estadoAnimo} onChange={setField} />
        <Field l="Dificultades durante el embarazo" k="dificultadEmbarazo" type="textarea" full value={form.dificultadEmbarazo} onChange={setField} />
      </div>}
      {tab==="parto" && <div className="form-grid">
        <Field l="Tipo de parto" k="parto" opts={["Normal","Cesárea","Fórceps"]} value={form.parto} onChange={setField} />
        <Field l="Circular de cordón" k="circularCordon" opts={["No","Sí"]} value={form.circularCordon} onChange={setField} />
        <Field l="Nacimiento podálico" k="podal" opts={["No","Sí"]} value={form.podal} onChange={setField} />
        <Field l="Incompatibilidad sanguínea" k="incompatibilidadSanguinea" opts={["No","Sí"]} value={form.incompatibilidadSanguinea} onChange={setField} />
        <Field l="Incubadora" k="incubadora" opts={["No","Sí"]} value={form.incubadora} onChange={setField} />
        <Field l="¿Cuánto tiempo en incubadora?" k="tiempoIncubadora" value={form.tiempoIncubadora} onChange={setField} />
        <Field l="Dificultad en el parto" k="dificultadParto" type="textarea" full value={form.dificultadParto} onChange={setField} />
        <Field l="Enfermedades post-natal" k="enfermedadesPostnatal" type="textarea" full value={form.enfermedadesPostnatal} onChange={setField} />
        <Field l="Cirugías" k="cirugias" type="textarea" full value={form.cirugias} onChange={setField} />
      </div>}
      {tab==="alimentacion" && <div className="form-grid">
        <Field l="Lactancia materna (hasta cuándo)" k="lactanciaMaterna" value={form.lactanciaMaterna} onChange={setField} />
        <Field l="Lactancia mixta (hasta cuándo)" k="lactanciaMixta" value={form.lactanciaMixta} onChange={setField} />
        <Field l="Uso del chupete" k="chupete" opts={["No","Sí"]} value={form.chupete} onChange={setField} />
        <Field l="Succión del dedo" k="succionDedo" opts={["No","Sí"]} value={form.succionDedo} onChange={setField} />
        <Field l="Usa mamadera" k="mamadera" opts={["No","Sí"]} value={form.mamadera} onChange={setField} />
        <Field l="Alimentación semisólida (cuándo)" k="alimentacionSemis" value={form.alimentacionSemis} onChange={setField} />
        <Field l="Alimentación sólida (cuándo)" k="alimentacionSolida" value={form.alimentacionSolida} onChange={setField} />
        <Field l="Alimento que no le agrada" k="alimentoNoGusta" value={form.alimentoNoGusta} onChange={setField} />
        <Field l="Dentición (cuándo)" k="denticion" value={form.denticion} onChange={setField} />
      </div>}
      {tab==="esfinteres" && <div className="form-grid">
        <Field l="Control diurno (edad)" k="esfinterDiurno" value={form.esfinterDiurno} onChange={setField} />
        <Field l="Control nocturno (edad)" k="esfinterNocturno" value={form.esfinterNocturno} onChange={setField} />
        <Field l="¿Se higieniza solo/a?" k="higieneSolo" opts={["Sí","No"]} value={form.higieneSolo} onChange={setField} />
        <Field l="¿Se baña solo/a?" k="banoSolo" opts={["Sí","No","Con ayuda"]} value={form.banoSolo} onChange={setField} />
        <Field l="¿Quién lo/la baña?" k="quienBana" value={form.quienBana} onChange={setField} />
      </div>}
      {tab==="psicomotricidad" && <div className="form-grid">
        <Field l="Control cefálico (cuándo)" k="controlCefalico" value={form.controlCefalico} onChange={setField} />
        <Field l="Control de tronco (cuándo)" k="controlTronco" value={form.controlTronco} onChange={setField} />
        <Field l="Marcha (cuándo)" k="marcha" value={form.marcha} onChange={setField} />
      </div>}
      {tab==="suenho" && <div className="form-grid">
        <Field l="Lugar y con quién duerme" k="suenhoLugar" value={form.suenhoLugar} onChange={setField} />
        <Field l="Cantidad de horas" k="suenhoHoras" value={form.suenhoHoras} onChange={setField} />
        <Field l="Horario nocturno" k="suenhoHorario" value={form.suenhoHorario} onChange={setField} />
        <Field l="¿Duerme con algún elemento?" k="suenhoElemento" value={form.suenhoElemento} onChange={setField} />
        <Field l="¿Mira dispositivo para dormir?" k="suenhoDispositivo" opts={["No","Sí"]} value={form.suenhoDispositivo} onChange={setField} />
      </div>}
      {tab==="comunicacion" && <div className="form-grid">
        <Field l="Vocalizaciones" k="vocalizaciones" value={form.vocalizaciones} onChange={setField} />
        <Field l="Palabras" k="palabras" value={form.palabras} onChange={setField} />
        <Field l="Frases" k="frase" value={form.frase} onChange={setField} />
        <Field l="Gestual" k="gestual" value={form.gestual} onChange={setField} />
        <Field l="¿Cómo manifiesta sus deseos?" k="manifestaDeseos" full value={form.manifestaDeseos} onChange={setField} />
        <Field l="Preferencias (¿con quién?)" k="preferencias" value={form.preferencias} onChange={setField} />
        <Field l="¿Responde a consignas simples?" k="consignasSimples" opts={["Sí","No","A veces"]} value={form.consignasSimples} onChange={setField} />
        <Field l="¿Es necesario repetir la consigna?" k="repetirConsigna" opts={["Sí","No","A veces"]} value={form.repetirConsigna} onChange={setField} />
      </div>}
      {tab==="socializacion" && <div className="form-grid">
        <Field l="¿Es activo/a?" k="activo" opts={["Sí","No","A veces"]} value={form.activo} onChange={setField} />
        <Field l="¿Tiende a aislarse?" k="tiendaAislarse" opts={["Sí","No","A veces"]} value={form.tiendaAislarse} onChange={setField} />
        <Field l="¿Es agresivo/a?" k="esAgresivo" opts={["Sí","No","A veces"]} value={form.esAgresivo} onChange={setField} />
        <Field l="¿Con qué juegos se divierte?" k="juegos" value={form.juegos} onChange={setField} />
        <Field l="¿Con quién juega?" k="conQuienJuega" value={form.conQuienJuega} onChange={setField} />
        <Field l="¿Es dominado por otros niños?" k="dominadoPorOtros" opts={["Sí","No","A veces","No Sabe"]} value={form.dominadoPorOtros} onChange={setField} />
        <Field l="¿Es cariñoso/a?" k="esCarinoso" opts={["Sí","No"]} value={form.esCarinoso} onChange={setField} />
        <Field l="¿Es inquieto/a?" k="esInquieto" opts={["Sí","No","A veces"]} value={form.esInquieto} onChange={setField} />
        <Field l="¿Problemas de disciplina?" k="problemasDisciplina" opts={["Sí","No","A veces"]} value={form.problemasDisciplina} onChange={setField} />
      </div>}
      {tab==="escolar" && <div className="form-grid">
        <Field l="Jardín maternal (institución)" k="jardinMaternal" value={form.jardinMaternal} onChange={setField} />
        <Field l="¿A qué edad ingresó?" k="edadIngreso" value={form.edadIngreso} onChange={setField} />
        <Field l="Jardín de infantes" k="jardinInfantes" value={form.jardinInfantes} onChange={setField} />
        <Field l="Su paso por el jardín" k="pasoPorJardin" type="textarea" full value={form.pasoPorJardin} onChange={setField} />
        <Field l="Escuela primaria" k="escuelaPrimaria" value={form.escuelaPrimaria} onChange={setField} />
        <Field l="Grado actual" k="gradoActual" value={form.gradoActual} onChange={setField} />
        <Field l="Materias que le gustan" k="materiasGusta" value={form.materiasGusta} onChange={setField} />
        <Field l="Actividades extraescolares" k="actividadesExtra" value={form.actividadesExtra} onChange={setField} />
      </div>}
      {tab==="otros" && <div className="form-grid">
        <Field l="Otros datos o informaciones" k="otrosDatos" type="textarea" full value={form.otrosDatos} onChange={setField} />
      </div>}
    </div>
  );
}

const PAC_TABS = [{key:"nino",label:"Datos del niño/a"},{key:"familiar",label:"Grupo familiar"},{key:"convivencia",label:"Convivencia"},{key:"anam",label:"Historia clínica"}];

function Pacientes({ ctx }) {
  const { data, saveItem, deleteItem } = ctx;
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState(null);
  const [detailId, setDetailId] = useState(null);
  const [search, setSearch] = useState("");
  const [detailTab, setDetailTab] = useState("nino");
  const [formTab, setFormTab] = useState("nino");
  const [pacForm, setPacForm] = useState({...emptyPaciente,hermanos:[]});
  const [anamForm, setAnamForm] = useState({...emptyAnam});

  const filtered = data.pacientes.filter(p=>`${p.nombre} ${p.apellido} ${p.dni}`.toLowerCase().includes(search.toLowerCase()));
  const setPacField = (k,v) => setPacForm(f=>({...f,[k]:v}));
  const setAnamField = (k,v) => setAnamForm(f=>({...f,[k]:v}));

  const open = (p=null) => {
    setPacForm(p?{...emptyPaciente,...p,hermanos:p.hermanos||[]}:{...emptyPaciente,hermanos:[]});
    const ex = p ? data.anamnesis.find(a=>a.pacienteId===p.id) : null;
    setAnamForm(ex?{...emptyAnam,...ex}:{...emptyAnam});
    setEditId(p?p.id:null); setFormTab("nino"); setShowForm(true);
  };

  const submit = async () => {
    const id = editId || uid();
    const paciente = {...pacForm, id};
    await saveItem("pacientes", paciente);
    const anamId = data.anamnesis.find(a=>a.pacienteId===id)?.id || uid();
    await saveItem("anamnesis", {...anamForm, id: anamId, pacienteId: id});
    setShowForm(false);
  };

  const del = async (id) => {
    await deleteItem("pacientes", id);
    const anam = data.anamnesis.find(a=>a.pacienteId===id);
    if (anam) await deleteItem("anamnesis", anam.id);
  };

  const addHermano = () => setPacForm(f=>({...f,hermanos:[...f.hermanos,{nombre:"",edad:"",escolaridad:"",enfermedad:""}]}));
  const updHermano = (i,field,val) => { const h=[...pacForm.hermanos]; h[i]={...h[i],[field]:val}; setPacForm(f=>({...f,hermanos:h})); };
  const delHermano = (i) => setPacForm(f=>({...f,hermanos:f.hermanos.filter((_,idx)=>idx!==i)}));
  const detail = detailId ? data.pacientes.find(p=>p.id===detailId) : null;

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <input style={{maxWidth:260}} placeholder="Buscar paciente..." value={search} onChange={e=>setSearch(e.target.value)} />
          <button className="btn btn-primary" onClick={()=>open()}>+ Nuevo paciente</button>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Paciente</th><th>DNI</th><th>Edad</th><th>Motivo</th><th>Acciones</th></tr></thead>
            <tbody>
              {filtered.map(p=>(
                <tr key={p.id}>
                  <td><div style={{display:"flex",alignItems:"center",gap:8}}>
                    <div className="avatar">{(p.nombre[0]||"")+(p.apellido[0]||"")}</div>
                    <span>{p.nombre} {p.apellido}</span>
                  </div></td>
                  <td>{p.dni}</td>
                  <td>{edadAnios(p.fechaNac)}{p.fechaNac?" años":""}</td>
                  <td style={{maxWidth:180,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{p.motivoConsulta}</td>
                  <td><div style={{display:"flex",gap:6}}>
                    <button className="btn btn-sm" onClick={()=>{setDetailId(p.id);setDetailTab("nino");}}>Ver</button>
                    <button className="btn btn-sm" onClick={()=>open(p)}>Editar</button>
                    <button className="btn btn-sm btn-danger" onClick={()=>del(p.id)}>Eliminar</button>
                  </div></td>
                </tr>
              ))}
              {filtered.length===0 && <tr><td colSpan={5} style={{textAlign:"center",color:"#8a7e74"}}>Sin pacientes registrados</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {showForm && (
        <div className="modal-overlay" onClick={()=>setShowForm(false)}>
          <div className="modal" style={{maxWidth:740}} onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{editId?"Editar paciente":"Nuevo paciente"}</span>
              <button className="btn btn-sm" onClick={()=>setShowForm(false)}>✕</button>
            </div>
            <div className="tabs">
              {PAC_TABS.map(t=><div key={t.key} className={`tab${formTab===t.key?" active":""}`} onClick={()=>setFormTab(t.key)}>{t.label}</div>)}
            </div>
            {formTab==="nino" && <div className="form-grid">
              <Field l="Nombre" k="nombre" value={pacForm.nombre} onChange={setPacField} />
              <Field l="Apellido" k="apellido" value={pacForm.apellido} onChange={setPacField} />
              <Field l="DNI" k="dni" value={pacForm.dni} onChange={setPacField} />
              <Field l="Fecha de nacimiento" k="fechaNac" type="date" value={pacForm.fechaNac} onChange={setPacField} />
              <Field l="Apodo" k="apodo" value={pacForm.apodo} onChange={setPacField} />
              <Field l="Religión" k="religion" value={pacForm.religion} onChange={setPacField} />
              <Field l="Escuela a la que asiste" k="escuela" full value={pacForm.escuela} onChange={setPacField} />
              <Field l="¿Es alérgico/a?" k="alergias" opts={["No","Sí"]} value={pacForm.alergias} onChange={setPacField} />
              <Field l="Mano dominante" k="manoDominante" opts={["Derecha","Izquierda","Ambidiestro"]} value={pacForm.manoDominante} onChange={setPacField} />
              <Field l="Médico de cabecera" k="medicoC" value={pacForm.medicoC} onChange={setPacField} />
              <Field l="Dirección" k="direccion" full value={pacForm.direccion} onChange={setPacField} />
              <Field l="Consentimiento informado" k="consentimientoInformado" opts={["No","Sí"]} value={pacForm.consentimientoInformado} onChange={setPacField} />
              <Field l="Motivo de consulta" k="motivoConsulta" type="textarea" full value={pacForm.motivoConsulta} onChange={setPacField} />
            </div>}
            {formTab==="familiar" && <div>
              <div className="section-title">Datos del padre</div>
              <div className="form-grid">
                <Field l="Nombre y apellido" k="padreNombre" value={pacForm.padreNombre} onChange={setPacField} />
                <Field l="DNI" k="padreDni" value={pacForm.padreDni} onChange={setPacField} />
                <Field l="Edad" k="padreEdad" value={pacForm.padreEdad} onChange={setPacField} />
                <Field l="Teléfono" k="padreTelefono" value={pacForm.padreTelefono} onChange={setPacField} />
                <Field l="Ocupación" k="padreOcupacion" value={pacForm.padreOcupacion} onChange={setPacField} />
                <Field l="Escolaridad" k="padreEscolaridad" opts={ESCOLARIDAD_OPTS} value={pacForm.padreEscolaridad} onChange={setPacField} />
                <Field l="Antecedentes de enfermedades" k="padreAntecedentes" full value={pacForm.padreAntecedentes} onChange={setPacField} />
              </div>
              <div className="section-title">Datos de la madre</div>
              <div className="form-grid">
                <Field l="Nombre y apellido" k="madreNombre" value={pacForm.madreNombre} onChange={setPacField} />
                <Field l="DNI" k="madreDni" value={pacForm.madreDni} onChange={setPacField} />
                <Field l="Edad" k="madreEdad" value={pacForm.madreEdad} onChange={setPacField} />
                <Field l="Teléfono" k="madreTelefono" value={pacForm.madreTelefono} onChange={setPacField} />
                <Field l="Ocupación" k="madreOcupacion" value={pacForm.madreOcupacion} onChange={setPacField} />
                <Field l="Escolaridad" k="madreEscolaridad" opts={ESCOLARIDAD_OPTS} value={pacForm.madreEscolaridad} onChange={setPacField} />
                <Field l="Antecedentes de enfermedades" k="madreAntecedentes" full value={pacForm.madreAntecedentes} onChange={setPacField} />
              </div>
              <div className="section-title">Hermanos</div>
              <table className="hermanos-table">
                <thead><tr><th>Nombre</th><th>Edad</th><th>Escolaridad</th><th>Enfermedad</th><th></th></tr></thead>
                <tbody>{pacForm.hermanos.map((h,i)=>(
                  <tr key={i}>
                    <td><input value={h.nombre} onChange={e=>updHermano(i,"nombre",e.target.value)} placeholder="Nombre" /></td>
                    <td><input value={h.edad} onChange={e=>updHermano(i,"edad",e.target.value)} placeholder="Edad" /></td>
                    <td><input value={h.escolaridad} onChange={e=>updHermano(i,"escolaridad",e.target.value)} placeholder="Escolaridad" /></td>
                    <td><input value={h.enfermedad} onChange={e=>updHermano(i,"enfermedad",e.target.value)} placeholder="Enfermedad" /></td>
                    <td><button className="btn btn-sm btn-danger" onClick={()=>delHermano(i)}>✕</button></td>
                  </tr>
                ))}</tbody>
              </table>
              <button className="btn btn-sm" style={{marginTop:10}} onClick={addHermano}>+ Agregar hermano/a</button>
            </div>}
            {formTab==="convivencia" && <div className="form-grid">
              <Field l="¿Con quién vive el paciente?" k="conQuienVive" full value={pacForm.conQuienVive} onChange={setPacField} />
              <Field l="Relación con la madre" k="relacionMadre" type="textarea" full value={pacForm.relacionMadre} onChange={setPacField} />
              <Field l="Relación con el padre" k="relacionPadre" type="textarea" full value={pacForm.relacionPadre} onChange={setPacField} />
              <Field l="Relación con los hermanos" k="relacionHermanos" type="textarea" full value={pacForm.relacionHermanos} onChange={setPacField} />
            </div>}
            {formTab==="anam" && <AnamnesisForm form={anamForm} setField={setAnamField} />}
            <div className="modal-footer">
              <button className="btn" onClick={()=>setShowForm(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={submit}>Guardar paciente</button>
            </div>
          </div>
        </div>
      )}

      {detailId && detail && (
        <div className="modal-overlay" onClick={()=>setDetailId(null)}>
          <div className="modal" style={{maxWidth:760}} onClick={e=>e.stopPropagation()}>
            <div className="modal-header">
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div className="avatar" style={{width:42,height:42,fontSize:15}}>{(detail.nombre[0]||"")+(detail.apellido[0]||"")}</div>
                <div><div className="modal-title">{detail.nombre} {detail.apellido}</div>
                <div style={{fontSize:13,color:"#8a7e74"}}>{detail.dni} · {edadAnios(detail.fechaNac)} años</div></div>
              </div>
              <div style={{display:"flex",gap:6}}>
                <button className="btn btn-sm btn-primary" onClick={()=>{setDetailId(null);open(detail);}}>Editar</button>
                <button className="btn btn-sm" onClick={()=>setDetailId(null)}>✕</button>
              </div>
            </div>
            <div className="tabs">
              {[...PAC_TABS,{key:"tutores",label:"Tutores"}].map(t=>(
                <div key={t.key} className={`tab${detailTab===t.key?" active":""}`} onClick={()=>setDetailTab(t.key)}>{t.label}</div>
              ))}
            </div>
            {detailTab==="nino" && <div className="form-grid">
              {[["Nombre",detail.nombre],["Apellido",detail.apellido],["DNI",detail.dni],["Fecha nac.",detail.fechaNac],["Apodo",detail.apodo],["Religión",detail.religion],["Escuela",detail.escuela],["Alergias",detail.alergias],["Mano dominante",detail.manoDominante],["Médico de cabecera",detail.medicoC]].map(([k,v])=>(
                <div key={k} className="form-group"><label>{k}</label><div style={{padding:"8px 11px",background:"#f5f1ec",borderRadius:8,fontSize:15,minHeight:36,border:"1px solid #e2ddd8"}}>{v||"—"}</div></div>
              ))}
              <div className="form-group form-full"><label>Motivo de consulta</label><div style={{padding:"8px 11px",background:"#f5f1ec",borderRadius:8,fontSize:15,minHeight:60,border:"1px solid #e2ddd8"}}>{detail.motivoConsulta||"—"}</div></div>
            </div>}
            {detailTab==="familiar" && <div>
              <div className="section-title">Padre</div>
              <div className="form-grid">{[["Nombre",detail.padreNombre],["Edad",detail.padreEdad],["Ocupación",detail.padreOcupacion],["Escolaridad",detail.padreEscolaridad],["Antecedentes",detail.padreAntecedentes]].map(([k,v])=>(
                <div key={k} className="form-group"><label>{k}</label><div style={{padding:"8px 11px",background:"#f5f1ec",borderRadius:8,fontSize:15,minHeight:36,border:"1px solid #e2ddd8"}}>{v||"—"}</div></div>
              ))}</div>
              <div className="section-title">Madre</div>
              <div className="form-grid">{[["Nombre",detail.madreNombre],["Edad",detail.madreEdad],["Ocupación",detail.madreOcupacion],["Escolaridad",detail.madreEscolaridad],["Antecedentes",detail.madreAntecedentes]].map(([k,v])=>(
                <div key={k} className="form-group"><label>{k}</label><div style={{padding:"8px 11px",background:"#f5f1ec",borderRadius:8,fontSize:15,minHeight:36,border:"1px solid #e2ddd8"}}>{v||"—"}</div></div>
              ))}</div>
              <div className="section-title">Hermanos</div>
              {(detail.hermanos||[]).length>0
                ? <table className="hermanos-table"><thead><tr><th>Nombre</th><th>Edad</th><th>Escolaridad</th><th>Enfermedad</th></tr></thead>
                    <tbody>{(detail.hermanos||[]).map((h,i)=><tr key={i}><td>{h.nombre}</td><td>{h.edad}</td><td>{h.escolaridad}</td><td>{h.enfermedad}</td></tr>)}</tbody>
                  </table>
                : <p style={{fontSize:14,color:"#8a7e74"}}>Sin hermanos registrados</p>}
            </div>}
            {detailTab==="convivencia" && <div className="form-grid">
              {[["¿Con quién vive?",detail.conQuienVive],["Relación con la madre",detail.relacionMadre],["Relación con el padre",detail.relacionPadre],["Relación con hermanos",detail.relacionHermanos]].map(([k,v])=>(
                <div key={k} className="form-group form-full"><label>{k}</label><div style={{padding:"8px 11px",background:"#f5f1ec",borderRadius:8,fontSize:15,minHeight:50,border:"1px solid #e2ddd8"}}>{v||"—"}</div></div>
              ))}
            </div>}
            {detailTab==="anam" && (() => {
              const anam = data.anamnesis.find(a=>a.pacienteId===detailId);
              return anam ? <AnamnesisForm form={anam} setField={()=>{}} /> : <p style={{fontSize:14,color:"#8a7e74"}}>Sin anamnesis cargada.</p>;
            })()}
            {detailTab==="tutores" && <TutoresTab ctx={ctx} pacienteId={detailId} />}
          </div>
        </div>
      )}
    </div>
  );
}

function TutoresTab({ ctx, pacienteId }) {
  const { data, saveItem, deleteItem } = ctx;
  const tutores = data.tutores.filter(t=>t.pacienteId===pacienteId);
  const empty = { nombre:"", apellido:"", parentesco:"Padre", dni:"", telefono:"", email:"", ocupacion:"", escolaridad:"", antecedentes:"", pacienteId };
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [showF, setShowF] = useState(false);
  const setField = (k,v) => setForm(f=>({...f,[k]:v}));
  const open = (t=null) => { setForm(t?{...t}:{...empty}); setEditId(t?t.id:null); setShowF(true); };
  const submit = async () => {
    const id = editId || uid();
    await saveItem("tutores", {...form, id});
    setShowF(false);
  };
  const del = async (id) => await deleteItem("tutores", id);
  return (
    <div>
      <button className="btn btn-primary btn-sm" style={{marginBottom:12}} onClick={()=>open()}>+ Agregar tutor</button>
      {tutores.map(t=>(
        <div key={t.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid #ece8e2"}}>
          <div><div style={{fontWeight:500,fontSize:15}}>{t.nombre} {t.apellido}</div><div style={{fontSize:13,color:"#8a7e74"}}>{t.parentesco} · {t.telefono}</div></div>
          <div style={{display:"flex",gap:6}}>
            <button className="btn btn-sm" onClick={()=>open(t)}>Editar</button>
            <button className="btn btn-sm btn-danger" onClick={()=>del(t.id)}>Eliminar</button>
          </div>
        </div>
      ))}
      {tutores.length===0 && <p style={{fontSize:14,color:"#8a7e74"}}>Sin tutores cargados</p>}
      {showF && (
        <div className="modal-overlay" onClick={()=>setShowF(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-header"><span className="modal-title">Tutor / Responsable</span><button className="btn btn-sm" onClick={()=>setShowF(false)}>✕</button></div>
            <div className="form-grid">
              <Field l="Nombre" k="nombre" value={form.nombre} onChange={setField} />
              <Field l="Apellido" k="apellido" value={form.apellido} onChange={setField} />
              <Field l="Parentesco" k="parentesco" opts={PARENTESCOS} value={form.parentesco} onChange={setField} />
              <Field l="DNI" k="dni" value={form.dni} onChange={setField} />
              <Field l="Teléfono" k="telefono" value={form.telefono} onChange={setField} />
              <Field l="Email" k="email" value={form.email} onChange={setField} />
              <Field l="Ocupación" k="ocupacion" value={form.ocupacion} onChange={setField} />
              <Field l="Escolaridad" k="escolaridad" value={form.escolaridad} onChange={setField} />
              <Field l="Antecedentes de enfermedades" k="antecedentes" type="textarea" full value={form.antecedentes} onChange={setField} />
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={()=>setShowF(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={submit}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Turnos({ ctx }) {
  const { data, saveItem, deleteItem } = ctx;
  const empty = { pacienteId:"", descripcionLibre:"", fecha:"", hora:"", estado:"Pendiente", notas:"" };
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [showF, setShowF] = useState(false);
  const setField = (k,v) => setForm(f=>({...f,[k]:v}));
  const open = (t=null) => { setForm(t?{...empty,...t}:empty); setEditId(t?t.id:null); setShowF(true); };
  const submit = async () => { await saveItem("turnos", {...form, id: editId||uid()}); setShowF(false); };
  const del = async (id) => await deleteItem("turnos", id);
  const sorted = [...data.turnos].sort((a,b)=>a.fecha>b.fecha?-1:1);
  return (
    <div>
      <div className="card">
        <div className="card-header"><span className="card-title">Turnos</span><button className="btn btn-primary" onClick={()=>open()}>+ Nuevo turno</button></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Paciente / Descripción</th><th>Fecha</th><th>Hora</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
              {sorted.map(t=>{
                const p = data.pacientes.find(p=>p.id===t.pacienteId);
                const nombre = p?`${p.nombre} ${p.apellido}`:(t.descripcionLibre||"Sin especificar");
                return <tr key={t.id}>
                  <td>{nombre}{!p&&<span className="badge badge-amber" style={{marginLeft:6}}>Provisional</span>}</td>
                  <td>{t.fecha}</td><td>{t.hora}</td>
                  <td><span className={`badge badge-${t.estado==="Confirmado"?"green":t.estado==="Cancelado"?"red":t.estado==="Ausente"?"amber":t.estado==="Realizado"?"blue":"purple"}`}>{t.estado}</span></td>
                  <td><div style={{display:"flex",gap:6}}>
                    <button className="btn btn-sm" onClick={()=>open(t)}>Editar</button>
                    <button className="btn btn-sm btn-danger" onClick={()=>del(t.id)}>Eliminar</button>
                  </div></td>
                </tr>;
              })}
              {sorted.length===0 && <tr><td colSpan={5} style={{textAlign:"center",color:"#8a7e74"}}>Sin turnos</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      {showF && (
        <div className="modal-overlay" onClick={()=>setShowF(false)}>
          <div className="modal" style={{maxWidth:500}} onClick={e=>e.stopPropagation()}>
            <div className="modal-header"><span className="modal-title">{editId?"Editar turno":"Nuevo turno"}</span><button className="btn btn-sm" onClick={()=>setShowF(false)}>✕</button></div>
            <div className="info-box">Si el paciente aún no está registrado, escribí una descripción libre como "Madre de nena de 9 años".</div>
            <div className="form-grid">
              <div className="form-group form-full"><label>Paciente (si ya está registrado)</label>
                <select value={form.pacienteId} onChange={e=>setField("pacienteId",e.target.value)}>
                  <option value="">— Sin paciente registrado —</option>
                  {data.pacientes.map(p=><option key={p.id} value={p.id}>{p.nombre} {p.apellido}</option>)}
                </select>
              </div>
              {!form.pacienteId && <Field l="Descripción libre" k="descripcionLibre" full value={form.descripcionLibre} onChange={setField} />}
              <Field l="Fecha" k="fecha" type="date" value={form.fecha} onChange={setField} />
              <Field l="Hora" k="hora" type="time" value={form.hora} onChange={setField} />
              <div className="form-group form-full"><label>Estado</label>
                <select value={form.estado} onChange={e=>setField("estado",e.target.value)}>
                  {["Pendiente","Confirmado","Cancelado","Ausente","Realizado"].map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
              <Field l="Notas" k="notas" type="textarea" full value={form.notas} onChange={setField} />
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={()=>setShowF(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={submit}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Sesiones({ ctx }) {
  const { data, saveItem, deleteItem } = ctx;
  const empty = { pacienteId:"", fecha:"", descripcion:"", observaciones:"", objetivos:"" };
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [showF, setShowF] = useState(false);
  const [filter, setFilter] = useState("");
  const setField = (k,v) => setForm(f=>({...f,[k]:v}));
  const open = (s=null) => { setForm(s?{...s}:empty); setEditId(s?s.id:null); setShowF(true); };
  const submit = async () => { await saveItem("sesiones", {...form, id: editId||uid()}); setShowF(false); };
  const del = async (id) => await deleteItem("sesiones", id);
  const filtered = [...data.sesiones].filter(s=>!filter||s.pacienteId===filter).sort((a,b)=>a.fecha>b.fecha?-1:1);
  return (
    <div>
      <div className="card">
        <div className="card-header">
          <select style={{maxWidth:240}} value={filter} onChange={e=>setFilter(e.target.value)}>
            <option value="">Todos los pacientes</option>
            {data.pacientes.map(p=><option key={p.id} value={p.id}>{p.nombre} {p.apellido}</option>)}
          </select>
          <button className="btn btn-primary" onClick={()=>open()}>+ Nueva sesión</button>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Paciente</th><th>Fecha</th><th>Descripción</th><th>Objetivos</th><th>Acciones</th></tr></thead>
            <tbody>
              {filtered.map(s=>{
                const p = data.pacientes.find(p=>p.id===s.pacienteId);
                return <tr key={s.id}>
                  <td>{p?`${p.nombre} ${p.apellido}`:"—"}</td><td>{s.fecha}</td>
                  <td style={{maxWidth:200,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.descripcion}</td>
                  <td style={{maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{s.objetivos}</td>
                  <td><div style={{display:"flex",gap:6}}>
                    <button className="btn btn-sm" onClick={()=>open(s)}>Editar</button>
                    <button className="btn btn-sm btn-danger" onClick={()=>del(s.id)}>Eliminar</button>
                  </div></td>
                </tr>;
              })}
              {filtered.length===0 && <tr><td colSpan={5} style={{textAlign:"center",color:"#8a7e74"}}>Sin sesiones</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      {showF && (
        <div className="modal-overlay" onClick={()=>setShowF(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-header"><span className="modal-title">{editId?"Editar sesión":"Nueva sesión"}</span><button className="btn btn-sm" onClick={()=>setShowF(false)}>✕</button></div>
            <div className="form-grid">
              <div className="form-group form-full"><label>Paciente</label>
                <select value={form.pacienteId} onChange={e=>setField("pacienteId",e.target.value)}>
                  <option value="">Seleccionar...</option>
                  {data.pacientes.map(p=><option key={p.id} value={p.id}>{p.nombre} {p.apellido}</option>)}
                </select>
              </div>
              <Field l="Fecha" k="fecha" type="date" value={form.fecha} onChange={setField} />
              <Field l="Descripción breve" k="descripcion" value={form.descripcion} onChange={setField} />
              <Field l="Observaciones del día" k="observaciones" type="textarea" full value={form.observaciones} onChange={setField} />
              <Field l="Objetivos a cumplir" k="objetivos" type="textarea" full value={form.objetivos} onChange={setField} />
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={()=>setShowF(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={submit}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Tests({ ctx }) {
  const { data, saveItem, deleteItem } = ctx;
  const empty = { pacienteId:"", tipo:"", fecha:"", resultado:"", conclusiones:"" };
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [showF, setShowF] = useState(false);
  const [filter, setFilter] = useState("");
  const setField = (k,v) => setForm(f=>({...f,[k]:v}));
  const open = (t=null) => { setForm(t?{...t}:empty); setEditId(t?t.id:null); setShowF(true); };
  const submit = async () => { await saveItem("tests", {...form, id: editId||uid()}); setShowF(false); };
  const del = async (id) => await deleteItem("tests", id);
  const filtered = [...data.tests].filter(t=>!filter||t.pacienteId===filter).sort((a,b)=>a.fecha>b.fecha?-1:1);
  return (
    <div>
      <div className="card">
        <div className="card-header">
          <select style={{maxWidth:240}} value={filter} onChange={e=>setFilter(e.target.value)}>
            <option value="">Todos los pacientes</option>
            {data.pacientes.map(p=><option key={p.id} value={p.id}>{p.nombre} {p.apellido}</option>)}
          </select>
          <button className="btn btn-primary" onClick={()=>open()}>+ Nuevo test</button>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Paciente</th><th>Test</th><th>Fecha</th><th>Resultado</th><th>Acciones</th></tr></thead>
            <tbody>
              {filtered.map(t=>{
                const p = data.pacientes.find(p=>p.id===t.pacienteId);
                return <tr key={t.id}>
                  <td>{p?`${p.nombre} ${p.apellido}`:"—"}</td><td>{t.tipo}</td><td>{t.fecha}</td>
                  <td style={{maxWidth:160,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.resultado}</td>
                  <td><div style={{display:"flex",gap:6}}>
                    <button className="btn btn-sm" onClick={()=>open(t)}>Editar</button>
                    <button className="btn btn-sm btn-danger" onClick={()=>del(t.id)}>Eliminar</button>
                  </div></td>
                </tr>;
              })}
              {filtered.length===0 && <tr><td colSpan={5} style={{textAlign:"center",color:"#8a7e74"}}>Sin tests</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      {showF && (
        <div className="modal-overlay" onClick={()=>setShowF(false)}>
          <div className="modal" onClick={e=>e.stopPropagation()}>
            <div className="modal-header"><span className="modal-title">{editId?"Editar test":"Nuevo test"}</span><button className="btn btn-sm" onClick={()=>setShowF(false)}>✕</button></div>
            <div className="form-grid">
              <div className="form-group form-full"><label>Paciente</label>
                <select value={form.pacienteId} onChange={e=>setField("pacienteId",e.target.value)}>
                  <option value="">Seleccionar...</option>
                  {data.pacientes.map(p=><option key={p.id} value={p.id}>{p.nombre} {p.apellido}</option>)}
                </select>
              </div>
              <div className="form-group"><label>Tipo de test</label>
                <select value={form.tipo} onChange={e=>setField("tipo",e.target.value)}>
                  <option value="">Seleccionar...</option>
                  {TIPOS_TEST.map(t=><option key={t}>{t}</option>)}
                </select>
              </div>
              <Field l="Fecha" k="fecha" type="date" value={form.fecha} onChange={setField} />
              <Field l="Resultado" k="resultado" full value={form.resultado} onChange={setField} />
              <Field l="Conclusiones" k="conclusiones" type="textarea" full value={form.conclusiones} onChange={setField} />
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={()=>setShowF(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={submit}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InformeHeader({ prof, logoSrc }) {
  return (
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"2.5px solid #6b5b8e",paddingBottom:"1rem",marginBottom:"1.25rem"}}>
      <div style={{width:100,height:100,flexShrink:0}}>
        {logoSrc ? <img src={logoSrc} alt="Logo" style={{width:100,height:100,objectFit:"contain",borderRadius:8}} />
          : <div style={{width:100,height:100,background:"#f5f1ec",borderRadius:8,border:"1px dashed #c8b8e8",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:"#b0a898",textAlign:"center",padding:8}}>Sin logo</div>}
      </div>
      <div style={{textAlign:"right",lineHeight:1.7}}>
        <div style={{fontWeight:500,fontSize:17,color:"#6b5b8e"}}>{prof.nombre}</div>
        <div style={{fontSize:15,color:"#7a6e64"}}>{prof.especialidad}</div>
        <div style={{fontSize:14,color:"#8a7e74"}}>{prof.matricula}</div>
        {prof.telefono && <div style={{fontSize:14,color:"#8a7e74"}}>{prof.telefono}</div>}
        {prof.email && <div style={{fontSize:14,color:"#8a7e74"}}>{prof.email}</div>}
        <div style={{fontSize:14,color:"#8a7e74"}}>{prof.direccion}</div>
      </div>
    </div>
  );
}

function Informes({ ctx }) {
  const { data, saveItem, deleteItem, logoSrc } = ctx;
  const [showF, setShowF] = useState(false);
  const [pacienteId, setPacienteId] = useState("");
  const [selSesiones, setSelSesiones] = useState([]);
  const [selTests, setSelTests] = useState([]);
  const [conclusiones, setConclusiones] = useState("");
  const [preview, setPreview] = useState(null);
  const [editId, setEditId] = useState(null);
  const informes = data.informes || [];

  const openNew = () => { setPacienteId(""); setSelSesiones([]); setSelTests([]); setConclusiones(""); setEditId(null); setShowF(true); };
  const openEdit = (inf) => { setPacienteId(inf.pacienteId); setSelSesiones(inf.selSesiones||[]); setSelTests(inf.selTests||[]); setConclusiones(inf.conclusiones||""); setEditId(inf.id); setShowF(true); };
  const toggle = (arr,set,id) => set(arr.includes(id)?arr.filter(x=>x!==id):[...arr,id]);
  const submit = async () => {
    const inf = { id:editId||uid(), pacienteId, fecha:new Date().toISOString().slice(0,10), selSesiones, selTests, conclusiones };
    await saveItem("informes", inf); setShowF(false);
  };
  const del = async (id) => await deleteItem("informes", id);
  const genPreview = (inf) => {
    const p = data.pacientes.find(x=>x.id===inf.pacienteId);
    const secs = (inf.selSesiones||[]).map(id=>data.sesiones.find(s=>s.id===id)).filter(Boolean);
    const ts = (inf.selTests||[]).map(id=>data.tests.find(t=>t.id===id)).filter(Boolean);
    setPreview({inf,p,secs,ts});
  };

  if (preview) {
    const {inf,p,secs,ts} = preview;
    return (
      <div>
        <div style={{display:"flex",gap:8,marginBottom:14}}>
          <button className="btn" onClick={()=>setPreview(null)}>← Volver</button>
          <button className="btn btn-primary" onClick={()=>window.print()}>Imprimir / PDF</button>
        </div>
        <div className="card" id="informe-print">
          <InformeHeader prof={data.profesional} logoSrc={logoSrc} />
          <div style={{marginBottom:18}}>
            <div style={{fontWeight:500,fontSize:17,marginBottom:6,color:"#6b5b8e"}}>Informe Psicopedagógico</div>
            <div style={{fontSize:15,color:"#7a6e64"}}>Paciente: <b style={{color:"#4a3f35"}}>{p?`${p.apellido}, ${p.nombre}`:"—"}</b>{p?.fechaNac&&<> · Edad: <b>{edadAnios(p.fechaNac)} años</b></>}{p?.dni&&<> · DNI: {p.dni}</>}{" · "}Fecha: {inf.fecha}</div>
          </div>
          {secs.length>0 && <><div className="section-title">Observaciones de sesiones</div>
            {secs.map(s=>(
              <div key={s.id} style={{marginBottom:14,padding:"12px 16px",background:"#f5f1ec",borderRadius:10,borderLeft:"3px solid #6b5b8e"}}>
                <div style={{fontWeight:500,fontSize:15,marginBottom:6}}>Sesión del {s.fecha}{s.descripcion?` — ${s.descripcion}`:""}</div>
                {s.observaciones && <div style={{fontSize:15,marginBottom:4}}><b>Observaciones:</b> {s.observaciones}</div>}
                {s.objetivos && <div style={{fontSize:15}}><b>Objetivos:</b> {s.objetivos}</div>}
              </div>
            ))}</>}
          {ts.length>0 && <><div className="section-title">Resultados de tests</div>
            {ts.map(t=>(
              <div key={t.id} style={{marginBottom:14,padding:"12px 16px",background:"#f5f1ec",borderRadius:10,borderLeft:"3px solid #3a5a9a"}}>
                <div style={{fontWeight:500,fontSize:15,marginBottom:6}}>{t.tipo}{t.fecha?` — ${t.fecha}`:""}</div>
                {t.resultado && <div style={{fontSize:15,marginBottom:4}}><b>Resultado:</b> {t.resultado}</div>}
                {t.conclusiones && <div style={{fontSize:15}}><b>Conclusiones:</b> {t.conclusiones}</div>}
              </div>
            ))}</>}
          {inf.conclusiones && <><div className="section-title">Conclusiones generales</div>
            <div style={{fontSize:15,lineHeight:1.8,whiteSpace:"pre-wrap"}}>{inf.conclusiones}</div></>}
          <div style={{marginTop:44,paddingTop:16,borderTop:"1px solid #e2ddd8",display:"flex",justifyContent:"flex-end"}}>
            <div style={{textAlign:"center"}}>
              <div style={{borderTop:"1px solid #8a7e74",paddingTop:8,minWidth:220,fontSize:14,color:"#7a6e64"}}>
                {data.profesional.nombre}<br/>{data.profesional.especialidad}<br/>{data.profesional.matricula}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const sesPac = data.sesiones.filter(s=>s.pacienteId===pacienteId);
  const testsPac = data.tests.filter(t=>t.pacienteId===pacienteId);
  return (
    <div>
      <div className="card">
        <div className="card-header"><span className="card-title">Informes psicopedagógicos</span><button className="btn btn-primary" onClick={openNew}>+ Nuevo informe</button></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Paciente</th><th>Fecha</th><th>Sesiones</th><th>Tests</th><th>Acciones</th></tr></thead>
            <tbody>
              {informes.map(inf=>{
                const p = data.pacientes.find(x=>x.id===inf.pacienteId);
                return <tr key={inf.id}>
                  <td>{p?`${p.nombre} ${p.apellido}`:"—"}</td><td>{inf.fecha}</td>
                  <td>{(inf.selSesiones||[]).length}</td><td>{(inf.selTests||[]).length}</td>
                  <td><div style={{display:"flex",gap:6}}>
                    <button className="btn btn-sm" onClick={()=>genPreview(inf)}>Ver</button>
                    <button className="btn btn-sm" onClick={()=>openEdit(inf)}>Editar</button>
                    <button className="btn btn-sm btn-danger" onClick={()=>del(inf.id)}>Eliminar</button>
                  </div></td>
                </tr>;
              })}
              {informes.length===0 && <tr><td colSpan={5} style={{textAlign:"center",color:"#8a7e74"}}>Sin informes</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      {showF && (
        <div className="modal-overlay" onClick={()=>setShowF(false)}>
          <div className="modal" style={{maxWidth:700}} onClick={e=>e.stopPropagation()}>
            <div className="modal-header"><span className="modal-title">Redactar informe</span><button className="btn btn-sm" onClick={()=>setShowF(false)}>✕</button></div>
            <div className="form-group" style={{marginBottom:14}}>
              <label>Paciente</label>
              <select value={pacienteId} onChange={e=>{setPacienteId(e.target.value);setSelSesiones([]);setSelTests([]);}}>
                <option value="">Seleccionar...</option>
                {data.pacientes.map(p=><option key={p.id} value={p.id}>{p.nombre} {p.apellido}</option>)}
              </select>
            </div>
            {pacienteId && <>
              <div className="section-title">Sesiones a incluir</div>
              {sesPac.length===0 && <p style={{fontSize:13,color:"#8a7e74",marginBottom:8}}>Sin sesiones para este paciente</p>}
              {sesPac.map(s=>(
                <label key={s.id} style={{display:"flex",alignItems:"center",gap:9,padding:"7px 0",cursor:"pointer",fontSize:15}}>
                  <input type="checkbox" checked={selSesiones.includes(s.id)} onChange={()=>toggle(selSesiones,setSelSesiones,s.id)} style={{width:"auto",accentColor:"#6b5b8e"}} />
                  {s.fecha} — {s.descripcion}
                </label>
              ))}
              <div className="section-title">Tests a incluir</div>
              {testsPac.length===0 && <p style={{fontSize:13,color:"#8a7e74",marginBottom:8}}>Sin tests para este paciente</p>}
              {testsPac.map(t=>(
                <label key={t.id} style={{display:"flex",alignItems:"center",gap:9,padding:"7px 0",cursor:"pointer",fontSize:15}}>
                  <input type="checkbox" checked={selTests.includes(t.id)} onChange={()=>toggle(selTests,setSelTests,t.id)} style={{width:"auto",accentColor:"#6b5b8e"}} />
                  {t.fecha} — {t.tipo}
                </label>
              ))}
              <div className="form-group" style={{marginTop:14}}>
                <label>Conclusiones generales</label>
                <textarea value={conclusiones} onChange={e=>setConclusiones(e.target.value)} style={{minHeight:130}} />
              </div>
            </>}
            <div className="modal-footer">
              <button className="btn" onClick={()=>setShowF(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={submit}>Guardar informe</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Cobros({ ctx }) {
  const { data, saveItem, deleteItem } = ctx;
  const empty = { pacienteId:"", fecha:"", monto:"", modalidad:"Particular", obraSocialId:"", estado:"Pendiente", notas:"" };
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [showF, setShowF] = useState(false);
  const [filter, setFilter] = useState("");
  const setField = (k,v) => setForm(f=>({...f,[k]:v}));
  const open = (c=null) => { setForm(c?{...empty,...c}:empty); setEditId(c?c.id:null); setShowF(true); };
  const submit = async () => { await saveItem("cobros", {...form, id: editId||uid()}); setShowF(false); };
  const del = async (id) => await deleteItem("cobros", id);
  const filtered = [...data.cobros].filter(c=>!filter||c.estado===filter).sort((a,b)=>a.fecha>b.fecha?-1:1);
  const total = filtered.reduce((s,c)=>s+(parseFloat(c.monto)||0),0);
  const pendiente = data.cobros.filter(c=>c.estado==="Pendiente").reduce((s,c)=>s+(parseFloat(c.monto)||0),0);
  return (
    <div>
      <div className="stat-grid">
        <div className="stat-card"><div className="stat-label">Total en vista</div><div className="stat-value">${total.toLocaleString("es-AR",{minimumFractionDigits:0})}</div></div>
        <div className="stat-card"><div className="stat-label">Pendiente de cobro</div><div className="stat-value">${pendiente.toLocaleString("es-AR",{minimumFractionDigits:0})}</div></div>
      </div>
      <div className="card">
        <div className="card-header">
          <select style={{maxWidth:200}} value={filter} onChange={e=>setFilter(e.target.value)}>
            <option value="">Todos los estados</option>
            {["Pendiente","Cobrado","En gestión"].map(s=><option key={s}>{s}</option>)}
          </select>
          <button className="btn btn-primary" onClick={()=>open()}>+ Nuevo cobro</button>
        </div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Paciente</th><th>Fecha</th><th>Monto</th><th>Modalidad</th><th>Obra social</th><th>Estado</th><th>Acciones</th></tr></thead>
            <tbody>
              {filtered.map(c=>{
                const p = data.pacientes.find(p=>p.id===c.pacienteId);
                const os = data.obrasSociales.find(o=>String(o.id)===String(c.obraSocialId));
                return <tr key={c.id}>
                  <td>{p?`${p.nombre} ${p.apellido}`:"—"}</td><td>{c.fecha}</td>
                  <td>${parseFloat(c.monto||0).toLocaleString("es-AR")}</td>
                  <td>{c.modalidad}</td><td>{os?os.nombre:"—"}</td>
                  <td><span className={`badge badge-${c.estado==="Cobrado"?"green":c.estado==="En gestión"?"amber":"purple"}`}>{c.estado}</span></td>
                  <td><div style={{display:"flex",gap:6}}>
                    <button className="btn btn-sm" onClick={()=>open(c)}>Editar</button>
                    <button className="btn btn-sm btn-danger" onClick={()=>del(c.id)}>Eliminar</button>
                  </div></td>
                </tr>;
              })}
              {filtered.length===0 && <tr><td colSpan={7} style={{textAlign:"center",color:"#8a7e74"}}>Sin cobros</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      {showF && (
        <div className="modal-overlay" onClick={()=>setShowF(false)}>
          <div className="modal" style={{maxWidth:540}} onClick={e=>e.stopPropagation()}>
            <div className="modal-header"><span className="modal-title">{editId?"Editar cobro":"Nuevo cobro"}</span><button className="btn btn-sm" onClick={()=>setShowF(false)}>✕</button></div>
            <div className="form-grid">
              <div className="form-group form-full"><label>Paciente</label>
                <select value={form.pacienteId} onChange={e=>setField("pacienteId",e.target.value)}>
                  <option value="">Seleccionar...</option>
                  {data.pacientes.map(p=><option key={p.id} value={p.id}>{p.nombre} {p.apellido}</option>)}
                </select>
              </div>
              <Field l="Fecha" k="fecha" type="date" value={form.fecha} onChange={setField} />
              <Field l="Monto ($)" k="monto" type="number" value={form.monto} onChange={setField} />
              <div className="form-group"><label>Modalidad</label>
                <select value={form.modalidad} onChange={e=>setField("modalidad",e.target.value)}>
                  <option>Particular</option><option>Obra Social / Prepaga</option>
                </select>
              </div>
              {form.modalidad!=="Particular" && <div className="form-group"><label>Obra social</label>
                <select value={form.obraSocialId} onChange={e=>setField("obraSocialId",e.target.value)}>
                  <option value="">Seleccionar...</option>
                  {data.obrasSociales.map(o=><option key={o.id} value={o.id}>{o.nombre} ({o.cobertura}%)</option>)}
                </select>
              </div>}
              <div className="form-group"><label>Estado</label>
                <select value={form.estado} onChange={e=>setField("estado",e.target.value)}>
                  {["Pendiente","Cobrado","En gestión"].map(s=><option key={s}>{s}</option>)}
                </select>
              </div>
              <Field l="Notas" k="notas" type="textarea" full value={form.notas} onChange={setField} />
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={()=>setShowF(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={submit}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ObrasSociales({ ctx }) {
  const { data, saveItem, deleteItem } = ctx;
  const empty = { nombre:"", cobertura:70, demoraDias:30 };
  const [form, setForm] = useState(empty);
  const [editId, setEditId] = useState(null);
  const [showF, setShowF] = useState(false);
  const setField = (k,v) => setForm(f=>({...f,[k]:v}));
  const open = (o=null) => { setForm(o?{...o}:empty); setEditId(o?o.id:null); setShowF(true); };
  const submit = async () => { await saveItem("obrasSociales", {...form, id: editId||uid()}); setShowF(false); };
  const del = async (id) => await deleteItem("obrasSociales", id);
  return (
    <div>
      <div className="card">
        <div className="card-header"><span className="card-title">Obras sociales y prepagas</span><button className="btn btn-primary" onClick={()=>open()}>+ Nueva</button></div>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Nombre</th><th>Cobertura</th><th>Demora estimada</th><th>Acciones</th></tr></thead>
            <tbody>
              {data.obrasSociales.map(o=>(
                <tr key={o.id}>
                  <td>{o.nombre}</td>
                  <td><span className="badge badge-green">{o.cobertura}%</span></td>
                  <td>{o.demoraDias} días</td>
                  <td><div style={{display:"flex",gap:6}}>
                    <button className="btn btn-sm" onClick={()=>open(o)}>Editar</button>
                    <button className="btn btn-sm btn-danger" onClick={()=>del(o.id)}>Eliminar</button>
                  </div></td>
                </tr>
              ))}
              {data.obrasSociales.length===0 && <tr><td colSpan={4} style={{textAlign:"center",color:"#8a7e74"}}>Sin obras sociales</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      {showF && (
        <div className="modal-overlay" onClick={()=>setShowF(false)}>
          <div className="modal" style={{maxWidth:420}} onClick={e=>e.stopPropagation()}>
            <div className="modal-header"><span className="modal-title">{editId?"Editar":"Nueva"} obra social</span><button className="btn btn-sm" onClick={()=>setShowF(false)}>✕</button></div>
            <div style={{display:"flex",flexDirection:"column",gap:12}}>
              <Field l="Nombre" k="nombre" value={form.nombre} onChange={setField} />
              <Field l="Cobertura (%)" k="cobertura" type="number" value={form.cobertura} onChange={setField} />
              <Field l="Demora estimada de pago (días)" k="demoraDias" type="number" value={form.demoraDias} onChange={setField} />
            </div>
            <div className="modal-footer">
              <button className="btn" onClick={()=>setShowF(false)}>Cancelar</button>
              <button className="btn btn-primary" onClick={submit}>Guardar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Profesional({ ctx }) {
  const { data, saveProfesional, logoSrc, setLogoSrc } = ctx;
  const [form, setForm] = useState({...data.profesional});
  const [saved, setSaved] = useState(false);
  const fileRef = useRef();
  const setField = (k,v) => setForm(f=>({...f,[k]:v}));
  const handleLogo = (e) => {
    const file = e.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => { const b64=ev.target.result; setLogoSrc(b64); setForm(f=>({...f,logo:b64})); };
    reader.readAsDataURL(file);
  };
  const submit = async () => {
    await saveProfesional({...form, logo: logoSrc});
    setSaved(true); setTimeout(()=>setSaved(false),2000);
  };
  return (
    <div className="card" style={{maxWidth:620}}>
      <div className="card-title" style={{marginBottom:16}}>Datos del profesional</div>
      <div style={{display:"flex",alignItems:"center",gap:18,marginBottom:18,padding:14,background:"#f5f1ec",borderRadius:10,border:"1px solid #e2ddd8"}}>
        <div>
          {logoSrc ? <img src={logoSrc} alt="Logo" style={{width:90,height:90,objectFit:"contain",borderRadius:8,border:"1px solid #e2ddd8"}} />
            : <div style={{width:90,height:90,background:"#fff",borderRadius:8,border:"1px dashed #c8b8e8",display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,color:"#b0a898",textAlign:"center",padding:8}}>Sin logo</div>}
        </div>
        <div>
          <div style={{fontSize:15,fontWeight:500,marginBottom:6,color:"#4a3f35"}}>Logo del consultorio</div>
          <div style={{fontSize:13,color:"#8a7e74",marginBottom:10}}>Aparece en el encabezado de los informes</div>
          <div style={{display:"flex",gap:8}}>
            <button className="btn btn-sm btn-primary" onClick={()=>fileRef.current.click()}>Subir imagen</button>
            {logoSrc && <button className="btn btn-sm btn-danger" onClick={()=>{setLogoSrc("");setForm(f=>({...f,logo:""}));}}>Eliminar</button>}
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleLogo} />
        </div>
      </div>
      <div className="form-grid">
        <Field l="Nombre y apellido" k="nombre" value={form.nombre} onChange={setField} />
        <Field l="Matrícula" k="matricula" value={form.matricula} onChange={setField} />
        <Field l="Especialidad" k="especialidad" full value={form.especialidad} onChange={setField} />
        <Field l="Teléfono" k="telefono" value={form.telefono} onChange={setField} />
        <Field l="Email" k="email" type="email" value={form.email} onChange={setField} />
        <Field l="Dirección del consultorio" k="direccion" full value={form.direccion} onChange={setField} />
      </div>
      <div style={{marginTop:14,display:"flex",gap:8,alignItems:"center"}}>
        <button className="btn btn-primary" onClick={submit}>Guardar cambios</button>
        {saved && <span style={{fontSize:14,color:"#4a7a5a"}}>✓ Guardado en la nube</span>}
      </div>
    </div>
  );
}
