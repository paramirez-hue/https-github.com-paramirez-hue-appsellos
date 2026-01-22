
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ICONS, MOCK_DATA, MOCK_USERS } from './constants';
import { Seal, SealStatus, FilterOptions, MovementHistory, User, UserRole, AppSettings } from './types';
import * as XLSX from 'xlsx';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

// --- SERVICE LAYER (Abstracción para SQL) ---
// Para conectar a SQL, cambia la implementación de estas funciones por 'fetch' a tu API interna
const api = {
  getSeals: async (): Promise<Seal[]> => {
    const data = localStorage.getItem('selloData');
    return data ? JSON.parse(data) : MOCK_DATA;
  },
  saveSeals: async (seals: Seal[]) => {
    localStorage.setItem('selloData', JSON.stringify(seals));
  },
  getUsers: async (): Promise<User[]> => {
    const data = localStorage.getItem('selloUsers');
    return data ? JSON.parse(data) : MOCK_USERS;
  },
  saveUsers: async (users: User[]) => {
    localStorage.setItem('selloUsers', JSON.stringify(users));
  },
  getCities: async (): Promise<string[]> => {
    const data = localStorage.getItem('selloCities');
    return data ? JSON.parse(data) : ['BOGOTÁ', 'MEDELLÍN', 'CALI', 'BARRANQUILLA'];
  },
  saveCities: async (cities: string[]) => {
    localStorage.setItem('selloCities', JSON.stringify(cities));
  },
  getSettings: async (): Promise<AppSettings> => {
    const data = localStorage.getItem('selloSettings');
    return data ? JSON.parse(data) : { 
      title: 'SelloMaster Pro', 
      logo: null, 
      sealTypes: ['Botella', 'Cable', 'Plástico', 'Metálico'],
      themeColor: '#003594'
    };
  },
  saveSettings: async (settings: AppSettings) => {
    localStorage.setItem('selloSettings', JSON.stringify(settings));
  }
};

// --- HELPERS ---

const getStatusStyles = (status: SealStatus) => {
  switch (status) {
    case SealStatus.ENTRADA_INVENTARIO: return "bg-emerald-50 text-emerald-800 border-emerald-200 icon-bg-emerald-500 text-emerald-600";
    case SealStatus.ASIGNADO: return "bg-sky-50 text-sky-800 border-sky-200 icon-bg-sky-500 text-sky-600";
    case SealStatus.ENTREGADO: return "bg-amber-50 text-amber-800 border-amber-200 icon-bg-amber-500 text-amber-600";
    case SealStatus.INSTALADO: return "bg-orange-50 text-orange-800 border-orange-200 icon-bg-orange-500 text-orange-600";
    case SealStatus.NO_INSTALADO: return "bg-[#F5F5DC] text-stone-800 border-stone-300 icon-bg-stone-500 text-stone-600";
    case SealStatus.SALIDA_FABRICA: return "bg-gray-100 text-gray-700 border-gray-300 icon-bg-gray-500 text-gray-600";
    case SealStatus.DESTRUIDO: return "bg-red-50 text-red-800 border-red-200 icon-bg-red-500 text-red-600";
    default: return "bg-slate-100 text-slate-800 border-slate-200 icon-bg-slate-500 text-slate-600";
  }
};

const getStatusColorHex = (status: SealStatus) => {
  switch (status) {
    case SealStatus.ENTRADA_INVENTARIO: return "#10b981";
    case SealStatus.ASIGNADO: return "#0ea5e9";
    case SealStatus.ENTREGADO: return "#f59e0b";
    case SealStatus.INSTALADO: return "#f97316";
    case SealStatus.NO_INSTALADO: return "#a8a29e";
    case SealStatus.SALIDA_FABRICA: return "#64748b";
    case SealStatus.DESTRUIDO: return "#ef4444";
    default: return "#94a3b8";
  }
};

const getStatusIconColor = (status: SealStatus) => {
  switch (status) {
    case SealStatus.ENTRADA_INVENTARIO: return "bg-emerald-500";
    case SealStatus.ASIGNADO: return "bg-sky-500";
    case SealStatus.ENTREGADO: return "bg-amber-500";
    case SealStatus.INSTALADO: return "bg-orange-500";
    case SealStatus.NO_INSTALADO: return "bg-stone-400";
    case SealStatus.SALIDA_FABRICA: return "bg-gray-500";
    case SealStatus.DESTRUIDO: return "bg-red-500";
    default: return "bg-slate-500";
  }
};

const getStatusTextColor = (status: SealStatus) => {
  switch (status) {
    case SealStatus.ENTRADA_INVENTARIO: return "text-emerald-600";
    case SealStatus.ASIGNADO: return "text-sky-600";
    case SealStatus.ENTREGADO: return "text-amber-600";
    case SealStatus.INSTALADO: return "text-orange-600";
    case SealStatus.NO_INSTALADO: return "text-stone-600";
    case SealStatus.SALIDA_FABRICA: return "text-gray-600";
    case SealStatus.DESTRUIDO: return "text-red-600";
    default: return "text-slate-600";
  }
};

const adjustHex = (hex: string, amt: number) => {
  let usePound = false;
  if (hex[0] === "#") { hex = hex.slice(1); usePound = true; }
  const num = parseInt(hex, 16);
  let r = (num >> 16) + amt; if (r > 255) r = 255; else if (r < 0) r = 0;
  let b = ((num >> 8) & 0x00FF) + amt; if (b > 255) b = 255; else if (b < 0) b = 0;
  let g = (num & 0x0000FF) + amt; if (g > 255) g = 255; else if (g < 0) g = 0;
  return (usePound ? "#" : "") + (g | (b << 8) | (r << 16)).toString(16).padStart(6, '0');
};

const exportToExcel = (data: any[], fileName: string) => {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Datos");
  XLSX.writeFile(wb, `${fileName}.xlsx`);
};

// --- COMPONENTS ---

const DashboardView: React.FC<{ seals: Seal[]; user: User; cities: string[]; brandColor: string }> = ({ seals, user, cities, brandColor }) => {
  const citySeals = seals.filter(s => s.city === user.city);
  const stats = useMemo(() => ({
    total: citySeals.length,
    available: citySeals.filter(s => s.status === SealStatus.ENTRADA_INVENTARIO || s.status === SealStatus.NO_INSTALADO).length,
    assigned: citySeals.filter(s => s.status === SealStatus.ASIGNADO || s.status === SealStatus.ENTREGADO).length,
    finalized: citySeals.filter(s => s.status === SealStatus.INSTALADO || s.status === SealStatus.SALIDA_FABRICA).length,
    destroyed: citySeals.filter(s => s.status === SealStatus.DESTRUIDO).length,
  }), [citySeals]);

  const pieData = useMemo(() => {
    const counts: Record<string, number> = {};
    citySeals.forEach(s => counts[s.status] = (counts[s.status] || 0) + 1);
    return Object.entries(counts).map(([name, value]) => ({ name: name.replace('_', ' '), value, rawName: name }));
  }, [citySeals]);

  const cityData = useMemo(() => cities.map(city => ({ name: city, cantidad: seals.filter(s => s.city === city).length })), [seals, cities]);

  const recentMovements = useMemo(() => seals
    .flatMap(s => s.history.map(h => ({ ...h, sealId: s.id, city: s.city })))
    .filter(m => user.role === UserRole.ADMIN || m.city === user.city)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5), [seals, user]);

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h3 className="text-3xl font-black text-custom-blue uppercase tracking-tighter italic">Consola de Control</h3>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Sede Operativa: <span className="text-custom-blue">{user.city}</span></p>
        </div>
        <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="text-right">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Base de Datos SQL</p>
            <p className="text-sm font-black text-custom-blue uppercase tracking-tighter">SINCRONIZADA</p>
          </div>
          <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        {[
          { label: 'Total Inventario', value: stats.total, color: 'text-custom-blue', bg: 'bg-white', icon: <ICONS.Truck /> },
          { label: 'Disponibles', value: stats.available, color: 'text-emerald-600', bg: 'bg-emerald-50/50', icon: <ICONS.Plus /> },
          { label: 'En Tránsito', value: stats.assigned, color: 'text-sky-600', bg: 'bg-sky-50/50', icon: <ICONS.Move /> },
          { label: 'Instalados', value: stats.finalized, color: 'text-orange-600', bg: 'bg-orange-50/50', icon: <ICONS.StopCircle /> },
          { label: 'Bajas/Deterioro', value: stats.destroyed, color: 'text-red-600', bg: 'bg-red-50/50', icon: <ICONS.Trash /> },
        ].map((card, idx) => (
          <div key={idx} className={`${card.bg} p-6 rounded-3xl border border-slate-200 shadow-sm transition-all hover:shadow-md hover:-translate-y-1 group`}>
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-4 transition-colors ${card.color.replace('text', 'bg').replace('600', '100')} ${card.color}`}>{card.icon}</div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{card.label}</p>
            <p className={`text-3xl font-black ${card.color} tracking-tighter italic`}>{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h4 className="text-xs font-black text-custom-blue uppercase tracking-widest mb-8 border-l-4 border-custom-blue pl-4">Distribución por Estado</h4>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={getStatusColorHex(entry.rawName as SealStatus)} />)}
                </Pie>
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontWeight: 'bold' }} />
                <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <h4 className="text-xs font-black text-custom-blue uppercase tracking-widest border-l-4 border-custom-blue pl-4">Bitácora de Eventos</h4>
            <div className="bg-slate-100 px-3 py-1 rounded-full text-[9px] font-black text-slate-500 tracking-tighter">CONECTADO A SQL</div>
          </div>
          <div className="space-y-4">
            {recentMovements.length > 0 ? recentMovements.map((move, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                <div className={`w-2 h-10 rounded-full ${getStatusIconColor(move.toStatus)}`}></div>
                <div className="flex-1">
                  <div className="flex justify-between items-start"><p className="text-[11px] font-black text-custom-blue uppercase">Sello {move.sealId}</p><p className="text-[9px] font-bold text-slate-400 font-mono">{move.date.split(' ')[0]}</p></div>
                  <p className="text-[10px] text-slate-600 font-medium italic line-clamp-1">{move.details}</p>
                </div>
                <div className="text-right"><span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${getStatusStyles(move.toStatus).split('icon-bg-')[0]}`}>{move.toStatus.replace('_', ' ')}</span></div>
              </div>
            )) : <div className="h-64 flex flex-col items-center justify-center text-slate-300 space-y-4 italic"><ICONS.History className="w-12 h-12 opacity-20" /><p className="text-xs font-bold uppercase tracking-widest">Sin actividad registrada</p></div>}
          </div>
        </div>
      </div>

      {user.role === UserRole.ADMIN && (
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h4 className="text-xs font-black text-custom-blue uppercase tracking-widest mb-8 border-l-4 border-custom-blue pl-4">Stock Crítico por Sede</h4>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cityData}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="cantidad" fill={brandColor} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

// --- SUB-VIEWS ---

// Fix: Implemented missing MovementsView component
const MovementsView: React.FC<{ seals: Seal[]; onInitiateMove: (selected: Seal[], status: SealStatus) => void; user: User }> = ({ seals, onInitiateMove, user }) => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const citySeals = seals.filter(s => s.city === user.city);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const handleAction = (status: SealStatus) => {
    const selected = citySeals.filter(s => selectedIds.includes(s.id));
    if (selected.length === 0) return;
    onInitiateMove(selected, status);
    setSelectedIds([]);
  };

  return (
    <div className="space-y-8 animate-in fade-in">
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-wrap gap-4 items-center justify-between">
        <div className="flex flex-wrap gap-2">
          {Object.values(SealStatus).map(status => (
            <button 
              key={status}
              onClick={() => handleAction(status)}
              disabled={selectedIds.length === 0}
              className={`px-4 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${selectedIds.length > 0 ? 'bg-custom-blue text-white shadow-lg' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
            >
              Pasar a {status.replace('_', ' ')}
            </button>
          ))}
        </div>
        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
          {selectedIds.length} Precintos Seleccionados
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100">
            <tr>
              <th className="px-8 py-5 w-10"></th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">ID Precinto</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Estado Actual</th>
              <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Tipo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {citySeals.map(s => (
              <tr key={s.id} className={`hover:bg-slate-50/50 transition-colors ${selectedIds.includes(s.id) ? 'bg-blue-50/50' : ''}`}>
                <td className="px-8 py-5">
                  <input 
                    type="checkbox" 
                    checked={selectedIds.includes(s.id)}
                    onChange={() => toggleSelect(s.id)}
                    className="w-4 h-4 rounded border-slate-300 text-custom-blue focus:ring-custom-blue"
                  />
                </td>
                <td className="px-8 py-5 font-black font-mono text-custom-blue text-sm uppercase">{s.id}</td>
                <td className="px-8 py-5">
                  <span className={`px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase tracking-widest ${getStatusStyles(s.status).split('icon-bg-')[0]}`}>
                    {s.status.replace('_', ' ')}
                  </span>
                </td>
                <td className="px-8 py-5 text-slate-500 text-[10px] font-bold uppercase">{s.type}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Fix: Implemented missing TraceabilityView component
const TraceabilityView: React.FC<{ seals: Seal[]; user: User }> = ({ seals, user }) => {
  const citySeals = seals.filter(s => s.city === user.city);
  const allHistory = citySeals.flatMap(s => s.history.map(h => ({ ...h, sealId: s.id })))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-8 animate-in fade-in">
      <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="p-8 border-b border-slate-100 bg-slate-50/30">
          <h3 className="text-xs font-black text-custom-blue uppercase tracking-widest border-l-4 border-custom-blue pl-4">Historial de Auditoría de Movimientos</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Fecha y Hora</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">ID Sello</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Cambio de Estado</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Usuario Responsable</th>
                <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Notas de SQL</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {allHistory.map((h, i) => (
                <tr key={i} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-5 text-[10px] font-bold text-slate-400 font-mono">{h.date}</td>
                  <td className="px-8 py-5 font-black font-mono text-custom-blue text-sm uppercase">{h.sealId}</td>
                  <td className="px-8 py-5">
                    <span className={`px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase tracking-widest ${getStatusStyles(h.toStatus).split('icon-bg-')[0]}`}>
                      {h.toStatus.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-8 py-5 text-slate-600 text-[10px] font-bold uppercase">{h.user}</td>
                  <td className="px-8 py-5 text-slate-500 text-[10px] italic font-medium">{h.details}</td>
                </tr>
              ))}
              {allHistory.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-8 py-20 text-center italic text-slate-300 font-bold uppercase tracking-widest">No se encontraron movimientos históricos en esta sede</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [seals, setSeals] = useState<Seal[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [filteredSeals, setFilteredSeals] = useState<Seal[]>([]);
  const [isSearchPerformed, setIsSearchPerformed] = useState(false);
  const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
  const [isNewSealModalOpen, setIsNewSealModalOpen] = useState(false);
  const [selectedSeals, setSelectedSeals] = useState<Seal[]>([]);
  const [targetStatus, setTargetStatus] = useState<SealStatus | null>(null);
  const [isMoveFormOpen, setIsMoveFormOpen] = useState(false);
  const [moveData, setMoveData] = useState({ requester: '', observations: '', vehiclePlate: '', trailerContainer: '', deliveredSub: '' });
  const [toast, setToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [isDeleteModeActive, setIsDeleteModeActive] = useState(false);
  const [appSettings, setAppSettings] = useState<AppSettings>({ title: '', logo: null, sealTypes: [], themeColor: '#003594' });
  const fileExcelRef = useRef<HTMLInputElement>(null);

  // EFECTO CARGA INICIAL (Sincronización con "API")
  useEffect(() => {
    const initApp = async () => {
      const [s, u, c, set, cur] = await Promise.all([
        api.getSeals(), api.getUsers(), api.getCities(), api.getSettings(),
        localStorage.getItem('selloUser') ? JSON.parse(localStorage.getItem('selloUser')!) : null
      ]);
      setSeals(s); setUsers(u); setCities(c); setAppSettings(set); setCurrentUser(cur);
    };
    initApp();
  }, []);

  // PERSISTENCIA (Para SQL, estas funciones enviarán datos al servidor)
  useEffect(() => { if (seals.length > 0) api.saveSeals(seals); }, [seals]);
  useEffect(() => { if (users.length > 0) api.saveUsers(users); }, [users]);
  useEffect(() => { if (cities.length > 0) api.saveCities(cities); }, [cities]);
  useEffect(() => { if (appSettings.title) api.saveSettings(appSettings); }, [appSettings]);

  useEffect(() => {
    const root = document.documentElement;
    const primary = appSettings.themeColor || '#003594';
    root.style.setProperty('--brand-primary', primary);
    root.style.setProperty('--brand-dark', adjustHex(primary, -30));
    root.style.setProperty('--brand-light', adjustHex(primary, 40));
  }, [appSettings.themeColor]);

  const handleLogin = (u: User) => { setCurrentUser(u); localStorage.setItem('selloUser', JSON.stringify(u)); };
  const handleLogout = () => { setCurrentUser(null); localStorage.removeItem('selloUser'); };
  const handleAddSeal = (s: Seal) => { if (seals.some(x => x.id === s.id)) { setToast({message: "Sello ya existe", type: 'error'}); return false; } setSeals([s, ...seals]); return true; };
  
  // Lógica de Movimiento
  const handleConfirmMovement = () => {
    if (!targetStatus) return;
    const now = new Date().toLocaleString('es-ES');
    const selectedIds = selectedSeals.map(s => s.id);
    const updated = seals.map(s => {
      if (selectedIds.includes(s.id)) {
        return {
          ...s, status: targetStatus, lastMovement: now,
          history: [{ date: now, fromStatus: s.status, toStatus: targetStatus, user: currentUser?.fullName || 'SISTEMA', details: moveData.observations || 'Movimiento' }, ...s.history]
        };
      }
      return s;
    });
    setSeals(updated); setIsMoveFormOpen(false); setToast({message: "Movimiento registrado", type: 'success'});
  };

  if (!currentUser) return <LoginScreen onLogin={handleLogin} users={users} settings={appSettings} />;

  return (
    <div className="min-h-screen bg-slate-50 flex text-slate-900 font-sans">
      <style>{`
        .text-custom-blue { color: var(--brand-primary); }
        .bg-custom-blue { background-color: var(--brand-primary); }
        .border-custom-blue { border-color: var(--brand-primary); }
        .focus\\:ring-custom-blue:focus { --tw-ring-color: var(--brand-primary); }
      `}</style>
      <aside className="w-64 bg-slate-900 text-white h-screen fixed left-0 top-0 hidden md:block border-r border-slate-800 shadow-2xl z-20">
        <div className="p-8 h-full flex flex-col">
          <div className="flex items-center gap-4 mb-12">
            <div className="bg-custom-blue p-2 rounded-xl shadow-lg w-11 h-11 flex items-center justify-center border border-blue-400/30">
              {appSettings.logo ? <img src={appSettings.logo} className="w-full h-full object-cover" /> : <ICONS.Truck className="text-white" />}
            </div>
            <h1 className="text-sm font-black tracking-tight uppercase italic text-white">{appSettings.title || 'SelloMaster'}</h1>
          </div>
          <nav className="space-y-1.5 flex-1">
            <button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all font-bold text-xs uppercase tracking-widest ${activeTab === 'dashboard' ? 'bg-custom-blue text-white shadow-xl' : 'text-slate-400 hover:text-white'}`}><ICONS.Dashboard /> Dashboard</button>
            <button onClick={() => setActiveTab('inventory')} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all font-bold text-xs uppercase tracking-widest ${activeTab === 'inventory' ? 'bg-custom-blue text-white shadow-xl' : 'text-slate-400 hover:text-white'}`}><ICONS.Search /> Inventario</button>
            <button onClick={() => setActiveTab('movements')} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all font-bold text-xs uppercase tracking-widest ${activeTab === 'movements' ? 'bg-custom-blue text-white shadow-xl' : 'text-slate-400 hover:text-white'}`}><ICONS.Move /> Movimientos</button>
            <button onClick={() => setActiveTab('traceability')} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all font-bold text-xs uppercase tracking-widest ${activeTab === 'traceability' ? 'bg-custom-blue text-white shadow-xl' : 'text-slate-400 hover:text-white'}`}><ICONS.History /> Trazabilidad</button>
          </nav>
          <div className="pt-8 border-t border-slate-800 mt-auto text-center">
            <p className="text-[10px] font-black uppercase text-slate-500 mb-2">{currentUser.fullName}</p>
            <button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-3 py-3 rounded-lg text-red-400 hover:bg-red-900/10 text-[10px] font-black uppercase tracking-widest"><ICONS.Logout /> Salir</button>
          </div>
        </div>
      </aside>

      <main className="flex-1 md:ml-64 pt-16 min-h-screen">
        <header className="h-16 bg-white border-b border-slate-200 fixed top-0 right-0 left-0 md:left-64 z-10 flex items-center justify-between px-10">
          <h2 className="text-sm font-black text-custom-blue uppercase tracking-[0.2em]">{activeTab.toUpperCase()}</h2>
          <div className="flex items-center gap-6">
            <div className="bg-slate-100 px-4 py-1.5 rounded-full border border-slate-200">
               <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Sede actual: </span>
               <span className="text-[9px] font-black uppercase text-custom-blue">{currentUser.city}</span>
            </div>
          </div>
        </header>

        <div className="p-8 sm:p-12">
          {activeTab === 'dashboard' && <DashboardView seals={seals} user={currentUser} cities={cities} brandColor={appSettings.themeColor} />}
          {activeTab === 'inventory' && (
            <div className="space-y-8 animate-in fade-in">
              <div className="flex items-center justify-between bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
                <div className="flex gap-4">
                  <button onClick={() => setIsNewSealModalOpen(true)} className="bg-custom-blue text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest shadow-lg">Registrar Precinto</button>
                  <button onClick={() => setIsSearchModalOpen(true)} className="bg-slate-50 text-custom-blue border border-slate-200 px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-white transition-all">Búsqueda Avanzada</button>
                </div>
              </div>
              <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                 <table className="w-full text-left">
                   <thead className="bg-slate-50 border-b border-slate-100">
                     <tr>
                       <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">ID Precinto</th>
                       <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Estado</th>
                       <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-widest">Último Movimiento</th>
                     </tr>
                   </thead>
                   <tbody className="divide-y divide-slate-100">
                     {seals.filter(s => s.city === currentUser.city).map(s => (
                       <tr key={s.id} className="hover:bg-slate-50/50 transition-colors">
                         <td className="px-8 py-5 font-black font-mono text-custom-blue text-sm uppercase">{s.id}</td>
                         <td className="px-8 py-5">
                            <span className={`px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase tracking-widest ${getStatusStyles(s.status).split('icon-bg-')[0]}`}>
                              {s.status.replace('_', ' ')}
                            </span>
                         </td>
                         <td className="px-8 py-5 text-slate-500 text-[10px] font-bold uppercase">{s.lastMovement}</td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
              </div>
            </div>
          )}
          {activeTab === 'movements' && <MovementsView seals={seals} onInitiateMove={(b, s) => { setSelectedSeals(b); setTargetStatus(s); setIsMoveFormOpen(true); }} user={currentUser} />}
          {activeTab === 'traceability' && <TraceabilityView seals={seals} user={currentUser} />}
        </div>
      </main>

      {/* Modales y Notificaciones se mantienen para la interfaz */}
      {isMoveFormOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-200">
             <div className="bg-custom-blue px-8 py-5 text-white flex justify-between items-center"><h3 className="text-[10px] font-black uppercase tracking-widest">Confirmar Acción SQL</h3></div>
             <div className="p-8 space-y-4">
                <div className="bg-slate-50 p-4 rounded-xl border-2 border-dashed border-slate-200 text-center">
                  <p className="text-xs font-black text-slate-400 uppercase mb-2">Nuevo Estado:</p>
                  <p className={`text-xl font-black uppercase ${getStatusTextColor(targetStatus || SealStatus.ENTRADA_INVENTARIO)}`}>{targetStatus?.replace('_', ' ')}</p>
                </div>
                <div className="space-y-1"><label className="text-[9px] font-black text-slate-400 uppercase">Observaciones / Referencia:</label><textarea className="w-full bg-slate-50 border border-slate-200 rounded-xl p-4 text-sm font-bold uppercase" value={moveData.observations} onChange={e => setMoveData({...moveData, observations: e.target.value.toUpperCase()})} /></div>
                <div className="flex gap-4 pt-4"><button onClick={() => setIsMoveFormOpen(false)} className="flex-1 py-4 text-[10px] font-black text-slate-400 uppercase">Cancelar</button><button onClick={handleConfirmMovement} className="flex-1 bg-custom-blue text-white py-4 rounded-xl font-black text-[10px] uppercase shadow-lg">Confirmar en Base de Datos</button></div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}

const LoginScreen: React.FC<{ onLogin: (user: User) => void; users: User[]; settings: AppSettings }> = ({ onLogin, users, settings }) => {
  const [u, setU] = useState(''); const [p, setP] = useState('');
  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
       <div className="bg-white rounded-3xl shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in duration-500">
          <div className="bg-custom-blue p-10 text-center">
             <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/30 backdrop-blur-sm">
                <ICONS.Truck className="text-white w-8 h-8" />
             </div>
             <h2 className="text-white font-black uppercase tracking-tighter italic text-xl">{settings.title || 'SelloMaster Pro'}</h2>
             <p className="text-white/50 text-[9px] font-bold uppercase tracking-widest mt-1">Acceso Intranet Corporativa</p>
          </div>
          <form className="p-10 space-y-6" onSubmit={e => { e.preventDefault(); const user = users.find(x => x.username === u && x.password === p); user ? onLogin(user) : alert('Error de acceso'); }}>
             <div className="space-y-1"><label className="text-[10px] font-black text-custom-blue uppercase">Usuario</label><input type="text" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-bold uppercase" value={u} onChange={e => setU(e.target.value.toUpperCase())} /></div>
             <div className="space-y-1"><label className="text-[10px] font-black text-custom-blue uppercase">Contraseña</label><input type="password" required className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm" value={p} onChange={e => setP(e.target.value)} /></div>
             <button type="submit" className="w-full bg-custom-blue text-white py-4 rounded-xl font-black text-[10px] uppercase shadow-xl hover:bg-slate-900 transition-all">Iniciar Sesión</button>
          </form>
       </div>
    </div>
  );
};
