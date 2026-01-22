
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ICONS, MOCK_DATA, MOCK_USERS } from './constants.tsx';
import { Seal, SealStatus, User, AppSettings } from './types.ts';
import * as XLSX from 'xlsx';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';
import { GoogleGenAI } from "@google/genai";

// --- CONFIGURACIÓN DE IA ---
const extractSealIdWithAI = async (base64Image: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const prompt = "Actúa como un experto en logística. En esta imagen hay un precinto de seguridad. Extrae el número de serie o ID alfanumérico que aparece en él. Responde ÚNICAMENTE con el código. Si no detectas ningún código claro, responde 'NOT_FOUND'.";
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: 'image/jpeg', data: base64Image.split(',')[1] } },
          { text: prompt }
        ]
      }
    });
    return response.text?.trim() || 'ERROR';
  } catch (error) {
    console.error("AI OCR Error:", error);
    return 'ERROR';
  }
};

// --- ESTILOS DE ESTADO ---
const getStatusTheme = (status: SealStatus) => {
  const themes: Record<string, { bg: string, border: string, text: string, dot: string }> = {
    [SealStatus.ENTRADA_INVENTARIO]: { bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700', dot: 'bg-emerald-500' },
    [SealStatus.ASIGNADO]: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700', dot: 'bg-indigo-500' },
    [SealStatus.ENTREGADO]: { bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700', dot: 'bg-amber-500' },
    [SealStatus.INSTALADO]: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-700', dot: 'bg-orange-500' },
    [SealStatus.NO_INSTALADO]: { bg: 'bg-stone-50', border: 'border-stone-200', text: 'text-stone-700', dot: 'bg-stone-400' },
    [SealStatus.SALIDA_FABRICA]: { bg: 'bg-slate-100', border: 'border-slate-300', text: 'text-slate-700', dot: 'bg-slate-500' },
    [SealStatus.DESTRUIDO]: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700', dot: 'bg-red-500' },
  };
  return themes[status] || themes[SealStatus.NO_INSTALADO];
};

// --- COMPONENTES UI REUTILIZABLES ---
const Badge = ({ status }: { status: SealStatus }) => {
  const theme = getStatusTheme(status);
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${theme.bg} ${theme.text} ${theme.border}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${theme.dot}`}></span>
      {status.replace('_', ' ')}
    </span>
  );
};

const Card = ({ children, className = "" }: { children?: React.ReactNode, className?: string }) => (
  <div className={`bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden ${className}`}>
    {children}
  </div>
);

// --- VISTA: DASHBOARD ---
const DashboardView = ({ seals, user, cities }: { seals: Seal[], user: User, cities: string[] }) => {
  const citySeals = seals.filter(s => s.city === user.city);
  
  const stats = useMemo(() => ({
    total: citySeals.length,
    available: citySeals.filter(s => [SealStatus.ENTRADA_INVENTARIO, SealStatus.NO_INSTALADO].includes(s.status)).length,
    inProgress: citySeals.filter(s => [SealStatus.ASIGNADO, SealStatus.ENTREGADO].includes(s.status)).length,
    finalized: citySeals.filter(s => [SealStatus.INSTALADO, SealStatus.SALIDA_FABRICA].includes(s.status)).length,
  }), [citySeals]);

  const pieData = useMemo(() => {
    const counts: any = {};
    citySeals.forEach(s => counts[s.status] = (counts[s.status] || 0) + 1);
    return Object.keys(counts).map(key => ({ name: key.replace('_', ' '), value: counts[key], status: key }));
  }, [citySeals]);

  const COLORS = ['#10b981', '#0ea5e9', '#f59e0b', '#f97316', '#64748b', '#ef4444', '#6366f1'];

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-3xl font-black text-primary tracking-tight">RESUMEN OPERATIVO</h2>
          <p className="text-sm text-slate-500 font-medium">Visualización en tiempo real para <span className="text-primary font-bold">{user.city}</span></p>
        </div>
        <div className="hidden sm:flex items-center gap-2 bg-white px-4 py-2 rounded-xl border border-slate-200">
          <div className="w-2 h-2 bg-success rounded-full animate-pulse"></div>
          <span className="text-[10px] font-black uppercase text-slate-500">Sistema Activo</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Inventario', value: stats.total, icon: <ICONS.Truck className="w-5 h-5"/>, color: 'text-primary' },
          { label: 'Disponibles', value: stats.available, icon: <ICONS.PlusCircle className="w-5 h-5"/>, color: 'text-success' },
          { label: 'En Operación', value: stats.inProgress, icon: <ICONS.Move className="w-5 h-5"/>, color: 'text-accent' },
          { label: 'Finalizados', value: stats.finalized, icon: <ICONS.StopCircle className="w-5 h-5"/>, color: 'text-slate-500' },
        ].map((kpi, i) => (
          <Card key={i} className="p-6 transition-all hover:scale-[1.02] hover:shadow-md cursor-default">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 bg-slate-50 ${kpi.color}`}>
              {kpi.icon}
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{kpi.label}</p>
            <p className={`text-3xl font-black ${kpi.color} font-mono mt-1`}>{kpi.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2 p-8">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-8">Movimientos por Sede (Red Global)</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cities.map(c => ({ name: c, qty: seals.filter(s => s.city === c).length }))}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700}} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 700}} />
                <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)'}} />
                <Bar dataKey="qty" fill="#001B44" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card className="p-8">
          <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-8">Estado de Lote</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {pieData.map((_, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" wrapperStyle={{fontSize: '10px', fontWeight: 800, textTransform: 'uppercase'}} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
};

// --- COMPONENTE: ESCÁNER IA ---
const AIScanner = ({ onScanSuccess, onClose }: { onScanSuccess: (id: string) => void, onClose: () => void }) => {
  const [loading, setLoading] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      .then(stream => { if (videoRef.current) videoRef.current.srcObject = stream; })
      .catch(err => alert("No se pudo acceder a la cámara: " + err));
    return () => {
      const stream = videoRef.current?.srcObject as MediaStream;
      stream?.getTracks().forEach(track => track.stop());
    };
  }, []);

  const captureAndProcess = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    setLoading(true);
    const context = canvasRef.current.getContext('2d');
    canvasRef.current.width = videoRef.current.videoWidth;
    canvasRef.current.height = videoRef.current.videoHeight;
    context?.drawImage(videoRef.current, 0, 0);
    const imageData = canvasRef.current.toDataURL('image/jpeg');
    
    const result = await extractSealIdWithAI(imageData);
    if (result === 'NOT_FOUND' || result === 'ERROR') {
      alert("No se pudo detectar el código. Intente de nuevo con más luz.");
    } else {
      onScanSuccess(result);
      onClose();
    }
    setLoading(false);
  };

  return (
    <div className="fixed inset-0 bg-primary/95 z-[100] flex flex-col items-center justify-center p-6 text-white">
      <div className="relative w-full max-w-sm aspect-square rounded-3xl overflow-hidden border-4 border-white/20 shadow-2xl">
        <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
        <div className="absolute inset-0 border-[40px] border-black/40 pointer-events-none">
          <div className="w-full h-full border-2 border-accent/50 animate-pulse"></div>
        </div>
        {loading && (
          <div className="absolute inset-0 bg-primary/60 flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin mb-4"></div>
            <p className="text-xs font-black uppercase tracking-widest">IA Procesando...</p>
          </div>
        )}
      </div>
      <div className="mt-12 flex flex-col gap-4 w-full max-w-sm">
        <button onClick={captureAndProcess} disabled={loading} className="w-full bg-white text-primary font-black py-5 rounded-2xl uppercase tracking-widest shadow-xl active:scale-95 transition-transform disabled:opacity-50">
          Capturar Precinto
        </button>
        <button onClick={onClose} className="w-full bg-transparent text-white/60 font-black py-4 rounded-2xl uppercase tracking-widest text-[10px]">
          Cancelar
        </button>
      </div>
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
};

// --- APP PRINCIPAL ---
export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [seals, setSeals] = useState<Seal[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [appSettings, setAppSettings] = useState<AppSettings>({ title: 'SelloMaster Pro AI', logo: null, sealTypes: ['Botella', 'Cable', 'Metálico', 'Plástico'] });
  const [showScanner, setShowScanner] = useState(false);
  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);
  const [isNewSealOpen, setIsNewSealOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Persistencia
  useEffect(() => {
    const storedUser = localStorage.getItem('sm_user');
    const storedSeals = localStorage.getItem('sm_seals');
    const storedUsers = localStorage.getItem('sm_users');
    const storedCities = localStorage.getItem('sm_cities');
    const storedSettings = localStorage.getItem('sm_settings');

    if (storedUser) setCurrentUser(JSON.parse(storedUser));
    if (storedSeals) setSeals(JSON.parse(storedSeals)); else setSeals(MOCK_DATA);
    if (storedUsers) setUsers(JSON.parse(storedUsers)); else setUsers(MOCK_USERS);
    if (storedCities) setCities(JSON.parse(storedCities)); else setCities(['BOGOTÁ', 'MEDELLÍN', 'CALI', 'BARRANQUILLA', 'CARTAGENA']);
    if (storedSettings) setAppSettings(JSON.parse(storedSettings));
  }, []);

  useEffect(() => {
    if (seals.length) localStorage.setItem('sm_seals', JSON.stringify(seals));
    if (users.length) localStorage.setItem('sm_users', JSON.stringify(users));
    if (cities.length) localStorage.setItem('sm_cities', JSON.stringify(cities));
    if (appSettings) localStorage.setItem('sm_settings', JSON.stringify(appSettings));
  }, [seals, users, cities, appSettings]);

  const triggerToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleLogin = (u: User) => {
    setCurrentUser(u);
    localStorage.setItem('sm_user', JSON.stringify(u));
    triggerToast(`Bienvenido, ${u.fullName}`);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('sm_user');
  };

  const addSeal = (id: string, type: string) => {
    if (seals.some(s => s.id === id)) {
      triggerToast("Este precinto ya está registrado", "error");
      return;
    }
    const now = new Date().toLocaleString('es-ES');
    const newS: Seal = {
      id, type, status: SealStatus.ENTRADA_INVENTARIO, creationDate: now, lastMovement: now,
      entryUser: currentUser?.fullName || 'SISTEMA', orderNumber: '-', containerId: '-', notes: 'Alta manual',
      city: currentUser?.city || 'Sede Central', history: [{
        date: now, fromStatus: null, toStatus: SealStatus.ENTRADA_INVENTARIO,
        user: currentUser?.fullName || 'SISTEMA', details: 'Alta inicial en sede'
      }]
    };
    setSeals([newS, ...seals]);
    triggerToast("Precinto registrado exitosamente");
    setIsNewSealOpen(false);
  };

  const filteredSeals = useMemo(() => {
    const base = seals.filter(s => s.city === currentUser?.city);
    if (!searchQuery) return base;
    return base.filter(s => s.id.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [seals, searchQuery, currentUser]);

  if (!currentUser) return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-primary">
      <Card className="w-full max-w-md p-10 space-y-8 animate-in zoom-in duration-300">
        <div className="text-center">
          <div className="w-16 h-16 bg-primary-light rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xl text-white">
            <ICONS.Truck />
          </div>
          <h1 className="text-2xl font-black text-primary tracking-tighter italic">{appSettings.title}</h1>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Gestión Centralizada de Precintos</p>
        </div>
        <form className="space-y-6" onSubmit={(e) => {
          e.preventDefault();
          const target = e.target as any;
          const user = users.find(u => u.username === target.username.value.toUpperCase());
          if (user && user.password === target.password.value) handleLogin(user);
          else alert("Credenciales inválidas");
        }}>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">ID Operativo</label>
            <input name="username" type="text" required className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-accent outline-none font-bold text-primary uppercase" />
          </div>
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest">PIN de Acceso</label>
            <input name="password" type="password" required className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-accent outline-none font-bold text-primary" />
          </div>
          <button type="submit" className="w-full bg-primary text-white font-black py-5 rounded-2xl uppercase tracking-[0.2em] text-[11px] shadow-2xl active:scale-[0.98] transition-all">
            Ingresar al Sistema
          </button>
        </form>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-[#F8FAFC]">
      {/* Sidebar */}
      <aside className="w-full md:w-72 bg-primary text-white p-8 flex flex-col shrink-0">
        <div className="flex items-center gap-4 mb-16">
          <div className="w-10 h-10 bg-accent rounded-xl flex items-center justify-center shadow-lg border border-white/10">
            <ICONS.Truck />
          </div>
          <h1 className="text-sm font-black italic tracking-tight">{appSettings.title}</h1>
        </div>

        <nav className="space-y-2 flex-1">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: <ICONS.Dashboard /> },
            { id: 'inventory', label: 'Inventario', icon: <ICONS.Search /> },
            { id: 'movements', label: 'Movimientos', icon: <ICONS.Move /> },
            { id: 'traceability', label: 'Trazabilidad', icon: <ICONS.History /> },
          ].map(item => (
            <button key={item.id} onClick={() => setActiveTab(item.id)} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all ${activeTab === item.id ? 'bg-accent text-white shadow-xl translate-x-1' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}>
              {item.icon}
              {item.label}
            </button>
          ))}
        </nav>

        <div className="mt-auto pt-8 border-t border-white/5 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent/20 border border-accent/30 flex items-center justify-center font-black text-xs text-accent">
              {currentUser.username.substring(0, 2)}
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-white/90">{currentUser.fullName}</p>
              <p className="text-[9px] font-bold text-white/40 uppercase tracking-tighter">{currentUser.city}</p>
            </div>
          </div>
          <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-red-400 font-black text-[9px] uppercase tracking-widest hover:bg-red-400/10 transition-colors">
            <ICONS.Logout className="w-4 h-4" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-8 md:p-12 overflow-y-auto max-h-screen custom-scrollbar relative">
        {toast && (
          <div className="fixed top-8 left-1/2 -translate-x-1/2 z-[200] animate-in slide-in-from-top-4">
            <div className={`px-6 py-4 rounded-2xl shadow-2xl border flex items-center gap-3 ${toast.type === 'success' ? 'bg-success text-white' : 'bg-danger text-white'}`}>
              <p className="text-[11px] font-black uppercase tracking-widest">{toast.msg}</p>
            </div>
          </div>
        )}

        {activeTab === 'dashboard' && <DashboardView seals={seals} user={currentUser} cities={cities} />}

        {activeTab === 'inventory' && (
          <div className="space-y-8 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div>
                <h2 className="text-3xl font-black text-primary tracking-tight">INVENTARIO LOCAL</h2>
                <p className="text-sm text-slate-500">Sede: <span className="text-primary font-bold">{currentUser.city}</span></p>
              </div>
              <div className="flex flex-wrap gap-3">
                <button onClick={() => setShowScanner(true)} className="flex items-center gap-2 bg-primary text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-primary-light transition-all">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z"/></svg>
                  Escaneo IA
                </button>
                <button onClick={() => setIsNewSealOpen(true)} className="flex items-center gap-2 bg-accent text-white px-6 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-primary-light transition-all">
                  <ICONS.Plus className="w-4 h-4" />
                  Alta Manual
                </button>
              </div>
            </div>

            <Card className="p-4">
              <div className="flex items-center gap-4">
                <div className="flex-1 relative">
                  <ICONS.Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5" />
                  <input type="text" placeholder="Buscar por ID de precinto..." value={searchQuery} onChange={e => setSearchQuery(e.target.value.toUpperCase())} className="w-full pl-12 pr-6 py-4 bg-slate-50 rounded-xl outline-none focus:bg-white focus:ring-2 focus:ring-accent font-bold text-primary transition-all uppercase" />
                </div>
              </div>
            </Card>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm overflow-x-auto custom-scrollbar">
              <table className="w-full text-left">
                <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-[0.2em]">
                  <tr>
                    <th className="px-8 py-6">ID Precinto</th>
                    <th className="px-8 py-6">Estado</th>
                    <th className="px-8 py-6">Tipo</th>
                    <th className="px-8 py-6">Última Actualización</th>
                    <th className="px-8 py-6 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-bold text-slate-700">
                  {filteredSeals.length > 0 ? filteredSeals.map(s => (
                    <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-5 font-mono text-primary text-sm">{s.id}</td>
                      <td className="px-8 py-5"><Badge status={s.status} /></td>
                      <td className="px-8 py-5 uppercase text-[10px] tracking-wider text-slate-400">{s.type}</td>
                      <td className="px-8 py-5 font-mono text-[10px]">{s.lastMovement}</td>
                      <td className="px-8 py-5 text-right">
                        <button onClick={() => { setActiveTab('traceability'); setSearchQuery(s.id); }} className="text-accent hover:underline text-[9px] uppercase font-black">Historial</button>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={5} className="px-8 py-20 text-center font-bold text-slate-400 uppercase tracking-widest italic">No se encontraron precintos</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Modal Nuevo Sello */}
        {isNewSealOpen && (
          <div className="fixed inset-0 bg-primary/60 backdrop-blur-sm z-[150] flex items-center justify-center p-6">
            <Card className="w-full max-w-sm p-8 animate-in slide-in-from-bottom-4">
              <h3 className="text-xl font-black text-primary tracking-tight mb-6 uppercase italic">Nuevo Registro</h3>
              <form className="space-y-6" onSubmit={e => {
                e.preventDefault();
                const target = e.target as any;
                addSeal(target.id_seal.value.toUpperCase(), target.type_seal.value);
              }}>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">ID del Precinto</label>
                  <input name="id_seal" type="text" required className="w-full px-5 py-4 bg-slate-50 rounded-xl outline-none font-bold text-primary uppercase border border-slate-200" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tipo de Sello</label>
                  <select name="type_seal" className="w-full px-5 py-4 bg-slate-50 rounded-xl outline-none font-bold text-primary uppercase border border-slate-200 appearance-none">
                    {appSettings.sealTypes.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setIsNewSealOpen(false)} className="flex-1 font-black text-[10px] uppercase text-slate-400 py-4">Cerrar</button>
                  <button type="submit" className="flex-1 bg-primary text-white font-black py-4 rounded-xl uppercase tracking-widest text-[10px] shadow-lg">Registrar</button>
                </div>
              </form>
            </Card>
          </div>
        )}

        {/* Resto de Tabs (Movements, Traceability) */}
        {activeTab === 'movements' && (
          <div className="space-y-8 animate-in fade-in duration-500 text-center py-20 opacity-50">
             <ICONS.Move className="w-16 h-16 mx-auto text-primary mb-4" />
             <p className="font-black uppercase tracking-widest text-slate-400">Modulo de movimientos avanzados en construcción</p>
          </div>
        )}

        {activeTab === 'traceability' && (
           <div className="space-y-8 animate-in fade-in duration-500 text-center py-20 opacity-50">
             <ICONS.History className="w-16 h-16 mx-auto text-primary mb-4" />
             <p className="font-black uppercase tracking-widest text-slate-400">Trazabilidad detallada en construcción</p>
          </div>
        )}
      </main>

      {showScanner && <AIScanner onScanSuccess={(id) => { setSearchQuery(id); triggerToast("Precinto detectado: " + id); }} onClose={() => setShowScanner(false)} />}
    </div>
  );
}
