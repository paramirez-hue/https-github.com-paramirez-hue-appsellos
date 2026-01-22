
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { ICONS, MOCK_DATA, MOCK_USERS } from './constants';
import { Seal, SealStatus, User, UserRole, AppSettings, MovementHistory } from './types';
import * as XLSX from 'xlsx';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

const API_BASE_URL = 'http://localhost:5000/api';
const USE_MOCK_BACKEND = true;

const ALLOWED_TRANSITIONS: Record<SealStatus, SealStatus[]> = {
  [SealStatus.ENTRADA_INVENTARIO]: [SealStatus.ASIGNADO, SealStatus.DESTRUIDO],
  [SealStatus.ASIGNADO]: [SealStatus.ENTREGADO, SealStatus.ENTRADA_INVENTARIO, SealStatus.DESTRUIDO],
  [SealStatus.ENTREGADO]: [SealStatus.INSTALADO, SealStatus.NO_INSTALADO, SealStatus.DESTRUIDO],
  [SealStatus.INSTALADO]: [SealStatus.SALIDA_FABRICA, SealStatus.DESTRUIDO],
  [SealStatus.SALIDA_FABRICA]: [], 
  [SealStatus.NO_INSTALADO]: [SealStatus.DESTRUIDO, SealStatus.ENTRADA_INVENTARIO],
  [SealStatus.DESTRUIDO]: [] 
};

const SealService = {
  async getAllSeals(): Promise<Seal[]> {
    if (USE_MOCK_BACKEND) {
      const data = localStorage.getItem('selloData');
      return data ? JSON.parse(data) : MOCK_DATA;
    }
    const response = await fetch(`${API_BASE_URL}/seals`);
    return await response.json();
  },
  async saveSeal(seal: Seal) {
    if (USE_MOCK_BACKEND) {
      const seals = await this.getAllSeals();
      localStorage.setItem('selloData', JSON.stringify([seal, ...seals]));
      return true;
    }
    const response = await fetch(`${API_BASE_URL}/seals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(seal)
    });
    return response.ok;
  },
  async updateSeal(updatedSeal: Seal) {
    if (USE_MOCK_BACKEND) {
      const seals = await this.getAllSeals();
      const updated = seals.map(s => s.id === updatedSeal.id ? updatedSeal : s);
      localStorage.setItem('selloData', JSON.stringify(updated));
      return true;
    }
    const response = await fetch(`${API_BASE_URL}/seals/${updatedSeal.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedSeal)
    });
    return response.ok;
  },
  async deleteSeal(id: string) {
    if (USE_MOCK_BACKEND) {
      const seals = await this.getAllSeals();
      const filtered = seals.filter(s => s.id !== id);
      localStorage.setItem('selloData', JSON.stringify(filtered));
      return true;
    }
    const response = await fetch(`${API_BASE_URL}/seals/${id}`, {
      method: 'DELETE'
    });
    return response.ok;
  },
  async saveSettings(settings: AppSettings) {
    localStorage.setItem('selloSettings', JSON.stringify(settings));
  }
};

const getStatusStyles = (status: SealStatus) => {
  switch (status) {
    case SealStatus.ENTRADA_INVENTARIO: return "bg-emerald-50 text-emerald-800 border-emerald-200";
    case SealStatus.ASIGNADO: return "bg-sky-50 text-sky-800 border-sky-200";
    case SealStatus.ENTREGADO: return "bg-indigo-50 text-indigo-800 border-indigo-200";
    case SealStatus.INSTALADO: return "bg-orange-50 text-orange-800 border-orange-200";
    case SealStatus.NO_INSTALADO: return "bg-stone-50 text-stone-800 border-stone-300";
    case SealStatus.SALIDA_FABRICA: return "bg-blue-600 text-white border-blue-700";
    case SealStatus.DESTRUIDO: return "bg-red-50 text-red-800 border-red-200";
    default: return "bg-slate-100 text-slate-800";
  }
};

const getStatusColorHex = (status: SealStatus) => {
  const colors: Record<string, string> = {
    [SealStatus.ENTRADA_INVENTARIO]: "#10b981", // Emerald
    [SealStatus.ASIGNADO]: "#0ea5e9", // Sky
    [SealStatus.ENTREGADO]: "#6366f1", // Indigo
    [SealStatus.INSTALADO]: "#f97316", // Orange
    [SealStatus.NO_INSTALADO]: "#a8a29e", // Stone
    [SealStatus.SALIDA_FABRICA]: "#1d4ed8", // Blue
    [SealStatus.DESTRUIDO]: "#ef4444" // Red
  };
  return colors[status] || "#94a3b8";
};

const DashboardView: React.FC<{ seals: Seal[]; user: User }> = ({ seals, user }) => {
  const citySeals = seals.filter(s => s.city === user.city);
  const stats = {
    total: citySeals.length,
    available: citySeals.filter(s => s.status === SealStatus.ENTRADA_INVENTARIO).length,
    installed: citySeals.filter(s => s.status === SealStatus.INSTALADO).length
  };

  const pieData = useMemo(() => {
    const counts: Record<string, number> = {};
    citySeals.forEach(s => counts[s.status] = (counts[s.status] || 0) + 1);
    return Object.entries(counts).map(([name, value]) => ({ name: name.replace('_', ' '), value, rawName: name }));
  }, [citySeals]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm border-b-8 border-b-[#003594]">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Inventario Sede</p>
          <p className="text-4xl font-black text-[#003594] italic">{stats.total}</p>
        </div>
        <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm border-b-8 border-b-emerald-500">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">En Bodega</p>
          <p className="text-4xl font-black text-emerald-600 italic">{stats.available}</p>
        </div>
        <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm border-b-8 border-b-orange-500">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Instalados</p>
          <p className="text-4xl font-black text-orange-600 italic">{stats.installed}</p>
        </div>
      </div>
      <div className="bg-white p-10 rounded-[2.5rem] border border-slate-200 shadow-sm h-[450px]">
        <h4 className="text-xs font-black text-[#003594] uppercase tracking-[0.2em] mb-8 italic">Distribución de Estados en {user.city}</h4>
        <ResponsiveContainer width="100%" height="85%">
          <PieChart>
            <Pie data={pieData} cx="50%" cy="50%" innerRadius={70} outerRadius={110} paddingAngle={8} dataKey="value">
              {pieData.map((entry, index) => <Cell key={index} fill={getStatusColorHex(entry.rawName as SealStatus)} />)}
            </Pie>
            <Tooltip />
            <Legend verticalAlign="bottom" height={36} iconType="circle"/>
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [seals, setSeals] = useState<Seal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [safeMode, setSafeMode] = useState(false);
  const [showInventoryResults, setShowInventoryResults] = useState(false);
  const [movementInput, setMovementInput] = useState('');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [selectedSeals, setSelectedSeals] = useState<Seal[]>([]);
  const [searchId, setSearchId] = useState('');
  const [traceSearchId, setTraceSearchId] = useState('');
  const [searchResult, setSearchResult] = useState<Seal | null>(null);
  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);
  
  const [appSettings] = useState<AppSettings>({ 
    title: 'GESTIÓN DE SELLOS CNCH', 
    logo: null, 
    sealTypes: ['Botella', 'Cable', 'Plástico'], 
    themeColor: '#003594' 
  });
  
  const [moveForm, setMoveForm] = useState<Partial<Seal>>({
    status: undefined,
    observations: '',
    assignedTo: '',
    deliveredTo: '',
    vehiclePlate: '',
    containerId: '',
    driverName: '',
    destination: '',
    orderNumber: ''
  });

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const data = await SealService.getAllSeals();
      setSeals(data);
      const savedUser = localStorage.getItem('selloUser');
      if (savedUser) setCurrentUser(JSON.parse(savedUser));
      setIsLoading(false);
    };
    load();
  }, []);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const handleBulkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const data = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]) as any[];
      const now = new Date().toLocaleString();
      const newSeals: Seal[] = data.map(row => ({
        id: String(row.ID || row.id || '').toUpperCase(),
        type: String(row.Tipo || 'Botella'),
        status: SealStatus.ENTRADA_INVENTARIO,
        creationDate: now,
        lastMovement: now,
        entryUser: currentUser?.fullName || 'SISTEMA',
        city: currentUser?.city || 'BOGOTÁ',
        history: [{ date: now, fromStatus: null, toStatus: SealStatus.ENTRADA_INVENTARIO, user: currentUser?.fullName || 'SISTEMA', details: 'CARGA MASIVA EXCEL' }]
      }));
      for(const s of newSeals) await SealService.saveSeal(s);
      setSeals(await SealService.getAllSeals());
      setToast({ msg: `Se cargaron ${newSeals.length} precintos`, type: 'success' });
    };
    reader.readAsBinaryString(file);
  };

  const handleMassiveMovement = () => {
    if (!movementInput.trim()) {
        setToast({ msg: 'Ingrese al menos un ID de sello', type: 'error' });
        return;
    }
    const ids = movementInput.split(',').map(id => id.trim().toUpperCase()).filter(id => id !== '');
    
    // VALIDACIÓN ESTRICTA DE EXISTENCIA
    const invalidIds: string[] = [];
    const wrongCityIds: string[] = [];
    const validFoundSeals: Seal[] = [];

    ids.forEach(id => {
        const found = seals.find(s => s.id === id);
        if (!found) {
            invalidIds.push(id);
        } else if (found.city !== currentUser?.city) {
            wrongCityIds.push(id);
        } else {
            validFoundSeals.push(found);
        }
    });

    if (invalidIds.length > 0) {
        setToast({ msg: `Error: Los sellos [${invalidIds.join(', ')}] no existen en la base de datos.`, type: 'error' });
        return;
    }

    if (wrongCityIds.length > 0) {
        setToast({ msg: `Error: Los sellos [${wrongCityIds.join(', ')}] pertenecen a otra sede.`, type: 'error' });
        return;
    }

    setSelectedSeals(validFoundSeals);
    setMoveForm({ status: undefined, observations: '', assignedTo: '', orderNumber: '' });
    setIsMoveModalOpen(true);
  };

  const handleDeleteSeal = async (id: string) => {
    if (!window.confirm(`¿Está seguro de eliminar el precinto ${id} permanentemente?`)) return;
    setIsLoading(true);
    const success = await SealService.deleteSeal(id);
    if (success) {
      setSeals(await SealService.getAllSeals());
      setToast({ msg: `Precinto ${id} eliminado`, type: 'success' });
      if (searchResult?.id === id) setSearchResult(null);
    } else {
      setToast({ msg: 'Error al eliminar', type: 'error' });
    }
    setIsLoading(false);
  };

  const handleConfirmMove = async () => {
    if (!moveForm.status) return;
    setIsLoading(true);
    const now = new Date().toLocaleString();
    const fieldEntries = Object.entries(moveForm).filter(([k, v]) => v && k !== 'status' && k !== 'history');
    const details = `Movimiento a ${moveForm.status}. ` + fieldEntries.map(([k, v]) => `${k}: ${v}`).join(', ');

    for (const s of selectedSeals) {
      const updated: Seal = {
        ...s,
        ...moveForm,
        status: moveForm.status as SealStatus,
        lastMovement: now,
        history: [{ 
          date: now, 
          fromStatus: s.status, 
          toStatus: moveForm.status as SealStatus, 
          user: currentUser?.fullName || 'SISTEMA', 
          details,
          fields: moveForm as any
        }, ...s.history]
      };
      await SealService.updateSeal(updated);
    }
    
    setSeals(await SealService.getAllSeals());
    setIsMoveModalOpen(false);
    setSelectedSeals([]);
    setMovementInput('');
    setToast({ msg: 'Movimiento validado y guardado', type: 'success' });
    setIsLoading(false);
  };

  const renderStatusFields = () => {
    const status = moveForm.status;
    if (!status) return <p className="text-[10px] text-slate-400 uppercase font-black text-center p-4 italic">Seleccione el estado destino arriba</p>;
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
        {status === SealStatus.ASIGNADO && (
          <>
            <div className="md:col-span-2 space-y-1">
              <label className="text-[10px] font-black uppercase text-[#003594]">Nombre a quien se asigna</label>
              <input type="text" className="w-full border-2 border-slate-200 p-3 rounded-xl font-bold uppercase text-xs focus:ring-4 focus:ring-[#0ea5e9]/10 outline-none focus:border-[#0ea5e9]" value={moveForm.assignedTo || ''} onChange={e => setMoveForm({...moveForm, assignedTo: e.target.value})} placeholder="Ej: Juan Perez" />
            </div>
            <div className="md:col-span-2 space-y-1">
              <label className="text-[10px] font-black uppercase text-[#003594]">Número de transporte</label>
              <input type="text" className="w-full border-2 border-slate-200 p-3 rounded-xl font-bold uppercase text-xs focus:ring-4 focus:ring-[#0ea5e9]/10 outline-none focus:border-[#0ea5e9]" value={moveForm.orderNumber || ''} onChange={e => setMoveForm({...moveForm, orderNumber: e.target.value})} placeholder="Ej: TR-0099" />
            </div>
          </>
        )}
        {status === SealStatus.INSTALADO && (
          <>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-[#003594]">Placa Vehículo</label>
              <input type="text" className="w-full border-2 border-slate-200 p-3 rounded-xl font-bold uppercase text-xs outline-none focus:border-[#f97316]" value={moveForm.vehiclePlate || ''} onChange={e => setMoveForm({...moveForm, vehiclePlate: e.target.value})} placeholder="XYZ-123" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-[#003594]">Contenedor</label>
              <input type="text" className="w-full border-2 border-slate-200 p-3 rounded-xl font-bold uppercase text-xs outline-none focus:border-[#f97316]" value={moveForm.containerId || ''} onChange={e => setMoveForm({...moveForm, containerId: e.target.value})} placeholder="CONT-9988" />
            </div>
          </>
        )}
        <div className="md:col-span-2 space-y-1">
            <label className="text-[10px] font-black uppercase text-[#003594]">Observaciones Adicionales</label>
            <textarea className="w-full border-2 border-slate-200 p-3 rounded-xl font-bold uppercase text-xs h-20 outline-none focus:border-slate-400" value={moveForm.observations || ''} onChange={e => setMoveForm({...moveForm, observations: e.target.value})} />
        </div>
      </div>
    );
  };

  const getCommonNextStatuses = () => {
    if (selectedSeals.length === 0) return [];
    const firstStatus = selectedSeals[0].status;
    const allSame = selectedSeals.every(s => s.status === firstStatus);
    if (!allSame) return []; 
    return ALLOWED_TRANSITIONS[firstStatus] || [];
  };

  const navItems = [
    { id: 'dashboard', label: 'DASHBOARD', icon: ICONS.Dashboard },
    { id: 'inventario', label: 'INVENTARIO', icon: ICONS.SearchSmall },
    { id: 'movimientos', label: 'MOVIMIENTOS', icon: ICONS.Move },
    { id: 'trazabilidad', label: 'TRAZABILIDAD', icon: ICONS.History },
    { id: 'usuarios', label: 'USUARIOS', icon: ICONS.Users },
    { id: 'ciudades', label: 'CIUDADES', icon: ICONS.Map },
    { id: 'configuración', label: 'CONFIGURACIÓN', icon: ICONS.Settings },
  ];

  if (!currentUser) return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-10 border-t-8 border-[#003594]">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-slate-50 rounded-2xl mx-auto mb-6 flex items-center justify-center border-2 border-slate-100 p-2 shadow-inner">
             <ICONS.Truck className="text-[#003594]" />
          </div>
          <h1 className="text-xl font-black text-[#003594] uppercase italic tracking-tight">{appSettings.title}</h1>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); const user = MOCK_USERS[0]; setCurrentUser(user); localStorage.setItem('selloUser', JSON.stringify(user)); }} className="space-y-6">
          <div className="space-y-1"><label className="text-[10px] font-black uppercase text-[#003594]">Usuario</label><input type="text" required className="w-full border p-4 rounded-xl font-bold bg-slate-50 outline-none" defaultValue="admin" /></div>
          <div className="space-y-1"><label className="text-[10px] font-black uppercase text-[#003594]">Password</label><input type="password" required className="w-full border p-4 rounded-xl font-bold bg-slate-50 outline-none" defaultValue="admin" /></div>
          <button type="submit" className="w-full bg-[#003594] text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl">Ingresar al Sistema</button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] flex text-slate-900">
      {/* SIDEBAR */}
      <aside className="w-64 bg-[#0f172a] fixed h-screen hidden md:flex flex-col z-20 shadow-2xl">
        <div className="p-10 border-b border-slate-800/50 mb-8">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center p-1.5 shadow-xl">
              <ICONS.Truck className="text-[#003594] w-6 h-6" />
            </div>
            <div className="overflow-hidden">
              <h1 className="text-[10px] font-black italic uppercase text-white leading-tight tracking-tighter">GESTIÓN DE SELLOS CNCH</h1>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item, index) => (
            <React.Fragment key={item.id}>
              {index === 4 && <div className="h-px bg-slate-800/50 my-6 mx-4"></div>}
              <button 
                onClick={() => {
                  setActiveTab(item.id);
                  if (item.id === 'inventario') setShowInventoryResults(false);
                  if (item.id === 'trazabilidad') setTraceSearchId('');
                }} 
                className={`w-full text-left px-5 py-4 rounded-xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 flex items-center gap-4 group ${activeTab === item.id ? 'bg-[#003594] text-white shadow-lg scale-[1.02]' : 'text-slate-400 hover:bg-white/5 hover:text-white'}`}
              >
                <item.icon className={`w-5 h-5 ${activeTab === item.id ? 'text-white' : 'text-slate-500 group-hover:text-slate-300'}`} />
                {item.label}
              </button>
            </React.Fragment>
          ))}
        </nav>

        <div className="p-6">
          <div className="mb-4 flex items-center gap-4 p-4 bg-slate-800/30 rounded-2xl border border-white/5">
            <div className="w-9 h-9 rounded-xl bg-[#003594] flex items-center justify-center text-white text-xs font-black shadow-inner border border-white/10">{currentUser.fullName.charAt(0)}</div>
            <div className="overflow-hidden">
               <p className="text-[10px] font-black text-white truncate">{currentUser.fullName}</p>
               <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">SEDE: {currentUser.city}</p>
            </div>
          </div>
          <button onClick={() => { setCurrentUser(null); localStorage.removeItem('selloUser'); }} className="w-full flex items-center justify-center gap-3 py-3.5 bg-red-500/5 text-red-500 font-black text-[10px] uppercase rounded-xl hover:bg-red-50 hover:text-white transition-all duration-300 border border-red-500/20"><ICONS.Logout /> SALIR DEL SISTEMA</button>
        </div>
      </aside>

      <main className="flex-1 md:ml-64 min-h-screen">
        <header className="flex justify-between items-center px-10 py-6 border-b border-slate-200 bg-white sticky top-0 z-10">
          <div>
            <h2 className="text-[14px] font-black uppercase text-[#003594] tracking-widest italic">
              {activeTab.toUpperCase()}
            </h2>
          </div>
          <div className="flex items-center gap-8">
            {activeTab === 'inventario' && (
                <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-full border border-slate-100 transition-all hover:border-slate-300">
                    <span className={`text-[10px] font-black uppercase transition-colors ${safeMode ? 'text-[#003594]' : 'text-slate-500'}`}>MODO SEGURO (BORRADO)</span>
                    <button onClick={() => setSafeMode(!safeMode)} className={`w-12 h-6 rounded-full relative transition-all shadow-inner ${safeMode ? 'bg-[#003594]' : 'bg-slate-300'}`}>
                        <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-transform ${safeMode ? 'translate-x-7' : 'translate-x-1'}`}></div>
                    </button>
                </div>
            )}
            <div className="flex items-center gap-2">
               <span className="text-[10px] font-black text-[#003594] uppercase italic">SEDE {currentUser.city.toUpperCase()}</span>
               <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm animate-pulse"></div>
            </div>
          </div>
        </header>

        <div className="p-10">
          {activeTab === 'dashboard' && <DashboardView seals={seals} user={currentUser} />}

          {activeTab === 'inventario' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex flex-wrap items-center gap-4">
                  <button onClick={() => setIsNewModalOpen(true)} className="bg-[#003594] text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase shadow-lg hover:brightness-110 active:scale-95 transition-all">NUEVO SELLO</button>
                  <label className="bg-white border-2 border-[#003594] text-[#003594] px-8 py-3 rounded-2xl font-black text-[10px] uppercase cursor-pointer flex items-center gap-2 hover:bg-blue-50 transition-all">
                    <ICONS.Import className="w-4 h-4" /> CARGA MASIVA
                    <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleBulkUpload} />
                  </label>
                  <button onClick={() => setShowInventoryResults(!showInventoryResults)} className={`bg-white border-2 border-[#003594] text-[#003594] px-8 py-3 rounded-2xl font-black text-[10px] uppercase flex items-center gap-2 transition-all ${showInventoryResults ? 'bg-blue-50 shadow-inner' : 'hover:bg-blue-50'}`}><ICONS.SearchSmall className="w-4 h-4" /> BÚSQUEDA</button>
                </div>
                <button onClick={() => setToast({msg: 'Exportando...', type: 'success'})} className="bg-[#059669] text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase flex items-center gap-2 shadow-lg hover:brightness-110 active:scale-95 transition-all"><ICONS.Excel className="w-4 h-4" /> EXPORTAR INVENTARIO</button>
              </div>

              {!showInventoryResults ? (
                <div className="bg-white rounded-[2rem] border-2 border-dashed border-slate-200 p-24 flex flex-col items-center justify-center text-center space-y-6">
                   <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100 shadow-inner">
                      <ICONS.SearchSmall className="w-10 h-10 text-slate-200" />
                   </div>
                   <p className="text-[12px] font-black text-slate-400 uppercase tracking-[0.3em]">UTILICE EL BOTÓN "BÚSQUEDA" PARA CONSULTAR EL INVENTARIO DE {currentUser.city.toUpperCase()}</p>
                </div>
              ) : (
                <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden animate-in zoom-in duration-300">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-[#003594] uppercase tracking-widest">
                      <tr>
                        <th className="px-10 py-7">SERIAL ID</th>
                        <th className="px-10 py-7">CATEGORÍA</th>
                        <th className="px-10 py-7">ESTADO SEGURIDAD</th>
                        <th className="px-10 py-7 text-center">ACCIONES</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 font-bold">
                      {seals.filter(s => s.city === currentUser.city).map(s => (
                        <tr key={s.id} className="hover:bg-slate-50 transition-all cursor-pointer group" onClick={() => setSearchResult(s)}>
                          <td className="px-10 py-6 font-mono text-[#003594]">{s.id}</td>
                          <td className="px-10 py-6 uppercase text-slate-400 font-black">{s.type}</td>
                          <td className="px-10 py-6">
                            <span className={`px-5 py-2 rounded-2xl text-[9px] font-black uppercase border-2 shadow-sm ${getStatusStyles(s.status)}`}>
                              {s.status.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-10 py-6 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button onClick={(e) => { e.stopPropagation(); setSearchResult(s); }} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"><ICONS.SearchSmall className="w-5 h-5" /></button>
                                {safeMode && currentUser?.role === UserRole.ADMIN && (
                                    <button onClick={(e) => { e.stopPropagation(); handleDeleteSeal(s.id); }} className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors"><ICONS.Trash className="w-5 h-5" /></button>
                                )}
                              </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'movimientos' && (
            <div className="space-y-12 animate-in fade-in duration-500">
               <div className="bg-white p-12 rounded-[3rem] border border-slate-200 shadow-sm space-y-10">
                  <div className="space-y-2">
                    <h3 className="text-3xl font-black text-[#003594] uppercase italic tracking-tighter">MOVIMIENTO OPERATIVO</h3>
                    <p className="text-[11px] text-[#003594] font-black uppercase tracking-[0.2em]">GESTIÓN CENTRALIZADA - SEDE: <span className="text-[#003594] font-black">{currentUser.city.toUpperCase()}</span></p>
                  </div>
                  
                  <div className="bg-slate-50/50 p-10 rounded-[2.5rem] border border-slate-100 border-l-[12px] border-l-[#003594]/10 space-y-6">
                    <label className="text-[11px] font-black uppercase text-[#003594] tracking-[0.1em] block">INGRESE IDS SEPARADOS POR COMA PARA GESTIÓN MASIVA</label>
                    <div className="flex flex-col md:flex-row items-center gap-6">
                        <div className="flex-1 w-full relative">
                            <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400">
                                <ICONS.Move className="w-5 h-5" />
                            </div>
                            <input 
                                type="text" 
                                placeholder="EJ: BOG-001, BOG-002, BOG-003" 
                                className="w-full bg-white border-2 border-slate-200 p-6 rounded-[1.5rem] pl-16 font-black uppercase text-xs outline-none focus:border-[#003594] transition-all shadow-sm"
                                value={movementInput}
                                onChange={(e) => setMovementInput(e.target.value)}
                                onKeyPress={(e) => e.key === 'Enter' && handleMassiveMovement()}
                            />
                        </div>
                        <button 
                            onClick={handleMassiveMovement}
                            className="w-full md:w-auto bg-[#003594] text-white px-12 py-6 rounded-[1.5rem] font-black uppercase text-[11px] tracking-widest shadow-xl hover:brightness-110 active:scale-95 transition-all"
                        >
                            MOVIMIENTO SELLOS
                        </button>
                    </div>
                  </div>
               </div>

               <div className="bg-white rounded-[3rem] border-2 border-dashed border-slate-200 p-24 flex flex-col items-center justify-center text-center space-y-6 opacity-60">
                    <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100">
                        <ICONS.Move className="w-8 h-8 text-slate-300" />
                    </div>
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">
                        INGRESE IDS PARA INICIAR GESTIÓN MASIVA EN {currentUser.city.toUpperCase()}
                    </p>
               </div>
            </div>
          )}

          {activeTab === 'trazabilidad' && (
            <div className="space-y-8 animate-in fade-in duration-500">
               <div className="bg-white p-12 rounded-[3rem] border border-slate-200 shadow-sm border-t-8 border-[#003594] space-y-6">
                  <div>
                    <h3 className="text-2xl font-black text-[#003594] uppercase italic tracking-tighter">MÓDULO DE TRAZABILIDAD Y AUDITORÍA</h3>
                    <p className="text-[11px] font-black text-[#003594]/60 uppercase tracking-widest">RASTREO COMPLETO DE LA CADENA DE CUSTODIA</p>
                  </div>
                  <div className="relative">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-400">
                        <ICONS.SearchSmall className="w-5 h-5" />
                    </div>
                    <input 
                        type="text" 
                        placeholder="BUSCAR POR SERIAL ID EXACTO (EJ: B001)..." 
                        className="w-full bg-slate-50 border-2 border-slate-100 p-6 rounded-[1.5rem] pl-16 font-black uppercase tracking-widest text-xs outline-none focus:border-[#003594] transition-all" 
                        value={traceSearchId} 
                        onChange={e => setTraceSearchId(e.target.value.toUpperCase())} 
                    />
                  </div>
               </div>

               <div className="grid grid-cols-1 gap-8">
               {traceSearchId.length > 0 ? (
                seals
                 .filter(s => s.id.toUpperCase().includes(traceSearchId))
                 .map(s => (
                 <div key={s.id} className="bg-white p-12 rounded-[4rem] border border-slate-200 shadow-sm space-y-10 animate-in zoom-in duration-300 hover:shadow-xl transition-shadow">
                    <div className="flex justify-between items-center pb-8 border-b border-slate-100">
                      <div className="flex items-center gap-6">
                         <div className={`w-14 h-14 bg-[#003594] text-white flex items-center justify-center rounded-2xl shadow-lg`}>
                            <ICONS.History className="w-7 h-7" />
                         </div>
                         <div>
                            <h4 className="font-black text-[#003594] italic text-3xl uppercase tracking-tighter">{s.id}</h4>
                            <div className="flex items-center gap-2 mt-1">
                                <span className="text-[10px] font-black uppercase bg-slate-100 px-3 py-1 rounded-lg text-slate-500 border border-slate-200">{s.type}</span>
                                <span className="text-[10px] font-black uppercase bg-slate-100 px-3 py-1 rounded-lg text-slate-500 border border-slate-200">{s.city.toUpperCase()}</span>
                            </div>
                         </div>
                      </div>
                      <div className="text-right">
                         <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Estado Actual Certificado</p>
                         <p className={`text-[12px] font-black uppercase px-6 py-2 rounded-2xl border-2 shadow-sm ${getStatusStyles(s.status)}`}>{s.status.replace('_', ' ')}</p>
                      </div>
                    </div>
                    
                    <div className="space-y-12 pl-6">
                       {s.history.map((h, i) => (
                         <div key={i} className="flex gap-10 items-start relative pb-12 last:pb-0">
                           {i < s.history.length - 1 && (
                               <div className="w-1 h-full absolute left-[19px] top-10 -z-10 bg-slate-100"></div>
                           )}
                           <div 
                                className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0 border-4 shadow-lg z-10 transition-all hover:scale-125"
                                style={{ borderColor: getStatusColorHex(h.toStatus) }}
                           >
                            {h.fromStatus ? <ICONS.ArrowRightTiny className="w-4 h-4" style={{ color: getStatusColorHex(h.toStatus) }} /> : <div className="w-3 h-3 rounded-full" style={{ backgroundColor: getStatusColorHex(h.toStatus) }}></div>}
                           </div>
                           <div className="bg-slate-50/30 p-8 rounded-[2.5rem] flex-1 border border-slate-100 group hover:border-slate-300 transition-all shadow-sm">
                             <div className="flex flex-col md:flex-row justify-between mb-6 border-b border-slate-100 pb-4 gap-4">
                                <div className="flex items-center gap-4">
                                  {h.fromStatus && (
                                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter line-through">{h.fromStatus.replace('_', ' ')}</span>
                                  )}
                                  {h.fromStatus && <ICONS.ArrowRightTiny className="w-3 h-3 text-slate-300" />}
                                  <span 
                                    className="text-[12px] font-black uppercase tracking-widest px-4 py-1.5 rounded-xl border shadow-sm"
                                    style={{ 
                                        backgroundColor: `${getStatusColorHex(h.toStatus)}10`,
                                        borderColor: `${getStatusColorHex(h.toStatus)}30`,
                                        color: getStatusColorHex(h.toStatus)
                                    }}
                                  >
                                    {h.toStatus.replace('_', ' ')}
                                  </span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase">{h.date}</span>
                                    <span className="text-[10px] text-slate-300">|</span>
                                    <span className="text-[10px] text-slate-500 font-black uppercase">{h.user}</span>
                                </div>
                             </div>
                             <div className="space-y-4">
                                <p className="text-[12px] text-slate-600 italic font-medium bg-white p-5 rounded-2xl border border-slate-100 shadow-inner">
                                    {h.details}
                                </p>
                             </div>
                           </div>
                         </div>
                       ))}
                    </div>
                 </div>
               ))
               ) : (
                <div className="bg-white rounded-[3rem] border-2 border-dashed border-slate-200 p-24 flex flex-col items-center justify-center text-center space-y-6 opacity-40">
                    <ICONS.History className="w-12 h-12 text-slate-300" />
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">Ingrese un Serial ID para auditar su historia</p>
                </div>
               )}
               </div>
            </div>
          )}

          {(activeTab === 'usuarios' || activeTab === 'ciudades' || activeTab === 'configuración') && (
             <div className="p-10 bg-white rounded-[3rem] border border-slate-200 shadow-sm text-center">
                <ICONS.Settings className="w-16 h-16 text-slate-200 mx-auto mb-6" />
                <h3 className="text-xl font-black text-[#003594] uppercase">Módulo Administrativo</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">Próximamente disponible en la versión Cloud</p>
             </div>
          )}
        </div>
      </main>

      {/* MODAL MOVIMIENTO REFORZADO */}
      {isMoveModalOpen && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-xl z-[110] flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-[4rem] shadow-2xl w-full max-w-4xl my-8 animate-in slide-in-from-bottom-20 border-t-[16px] border-[#003594]">
             <div className="p-12">
                <div className="flex justify-between items-center mb-12 border-b border-slate-100 pb-8">
                   <div>
                      <h3 className="font-black uppercase text-3xl italic text-[#003594] tracking-tighter">Gestión de Movimiento Masivo</h3>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-[10px] text-slate-400 font-bold uppercase italic">Validando {selectedSeals.length} precinto(s) para {currentUser?.city.toUpperCase()}</span>
                      </div>
                   </div>
                   <button onClick={() => setIsMoveModalOpen(false)} className="w-14 h-14 rounded-full border-2 border-slate-100 flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all font-black text-xl">✕</button>
                </div>

                <div className="space-y-12">
                  <div className="space-y-4">
                    <label className="text-[11px] font-black uppercase text-[#003594] tracking-[0.2em]">Seleccione Nuevo Estado de Seguridad</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {getCommonNextStatuses().map(st => (
                        <button 
                            key={st} 
                            onClick={() => setMoveForm({...moveForm, status: st})} 
                            className={`px-5 py-6 rounded-3xl text-[10px] font-black uppercase border-2 transition-all shadow-sm ${moveForm.status === st ? 'text-white scale-105 ring-4 ring-[#003594]/10' : 'bg-white text-slate-500 border-slate-100 hover:border-[#003594]/40'}`}
                            style={moveForm.status === st ? { backgroundColor: getStatusColorHex(st), borderColor: getStatusColorHex(st) } : {}}
                        >
                            {st.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  {moveForm.status && (
                    <div className="bg-slate-50/50 p-10 rounded-[3rem] border-2 border-slate-100 space-y-8 animate-in fade-in zoom-in duration-300">
                        <h4 className="text-[11px] font-black text-[#003594] uppercase tracking-widest border-b-2 border-slate-200 pb-4">Validación de Datos Operativos</h4>
                        {renderStatusFields()}
                    </div>
                  )}

                  <div className="flex gap-6">
                    <button onClick={() => setIsMoveModalOpen(false)} className="flex-1 py-6 border-2 border-slate-100 rounded-[2rem] font-black uppercase text-[12px] text-slate-400 hover:bg-slate-50 transition-all">Abortar</button>
                    <button 
                        disabled={!moveForm.status} 
                        onClick={handleConfirmMove} 
                        className={`flex-1 py-6 text-white rounded-[2rem] font-black uppercase text-[12px] shadow-2xl transition-all ${moveForm.status ? 'hover:brightness-110 active:scale-95' : 'bg-slate-300 cursor-not-allowed'}`}
                        style={moveForm.status ? { backgroundColor: getStatusColorHex(moveForm.status) } : {}}
                    >
                        {moveForm.status === SealStatus.ASIGNADO ? 'ASIGNAR' : 'VALIDAR MOVIMIENTO'}
                    </button>
                  </div>
                </div>
             </div>
          </div>
        </div>
      )}

      {isNewModalOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[110] flex items-center justify-center p-4">
           <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in border-t-8 border-[#003594]">
              <div className="p-12 space-y-10">
                 <div className="text-center"><h3 className="font-black uppercase text-3xl italic text-[#003594] tracking-tighter">Alta Técnica</h3><p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">Registro inicial de precinto</p></div>
                 <div className="space-y-8">
                    <div className="space-y-2"><label className="text-[11px] font-black uppercase text-[#003594] tracking-widest">Serial Alfanumérico</label><input type="text" id="nid" className="w-full border-2 border-slate-100 p-6 rounded-[1.5rem] font-black uppercase text-[#003594] outline-none focus:border-[#003594] transition-all" /></div>
                    <div className="space-y-2"><label className="text-[11px] font-black uppercase text-[#003594] tracking-widest">Modelo</label><select id="ntype" className="w-full border-2 border-slate-100 p-6 rounded-[1.5rem] font-black uppercase text-xs outline-none focus:border-[#003594]">{appSettings.sealTypes.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
                 </div>
                 <div className="flex gap-4 pt-6">
                    <button onClick={() => setIsNewModalOpen(false)} className="flex-1 py-5 text-[11px] font-black text-slate-400 uppercase border-2 border-slate-100 rounded-2xl">Abortar</button>
                    <button onClick={async () => { 
                        const idInput = document.getElementById('nid') as HTMLInputElement; 
                        const typeInput = document.getElementById('ntype') as HTMLSelectElement; 
                        if(!idInput.value) return; 
                        if(seals.find(s => s.id === idInput.value.toUpperCase())) { setToast({msg: 'Error: El ID ya existe', type: 'error'}); return; }
                        const now = new Date().toLocaleString(); 
                        await SealService.saveSeal({ id: idInput.value.toUpperCase(), type: typeInput.value, status: SealStatus.ENTRADA_INVENTARIO, creationDate: now, lastMovement: now, entryUser: currentUser.fullName, city: currentUser.city, history: [{ date: now, fromStatus: null, toStatus: SealStatus.ENTRADA_INVENTARIO, user: currentUser.fullName, details: 'ALTA INICIAL' }] }); 
                        setSeals(await SealService.getAllSeals()); 
                        setIsNewModalOpen(false); 
                        setToast({msg: 'Alta exitosa', type: 'success'}); 
                    }} className="flex-1 bg-[#003594] text-white py-5 rounded-2xl font-black uppercase text-[11px] shadow-2xl">Registrar</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {searchResult && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[4rem] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in duration-300 border-t-[12px] border-[#003594]">
            <div className="p-12 space-y-10">
               <div className="flex justify-between items-start border-b border-slate-100 pb-8">
                  <div><p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Ficha Técnica</p><p className="text-5xl font-black text-[#003594] italic tracking-tighter">{searchResult.id}</p></div>
                  <div className={`px-6 py-3 rounded-2xl text-[11px] font-black uppercase border-2 shadow-md ${getStatusStyles(searchResult.status)}`}>{searchResult.status.replace('_', ' ')}</div>
               </div>
               <div className="grid grid-cols-2 gap-10">
                  <div><p className="text-[10px] font-black text-slate-400 uppercase mb-2">Ubicación Actual</p><p className="text-[13px] font-black text-slate-700 uppercase">{searchResult.city}</p></div>
                  <div><p className="text-[10px] font-black text-slate-400 uppercase mb-2">Tipo de Precinto</p><p className="text-[13px] font-black text-slate-700 uppercase">{searchResult.type}</p></div>
               </div>
               <div className="flex gap-6">
                  {ALLOWED_TRANSITIONS[searchResult.status].length > 0 ? (
                    <button onClick={() => { setSelectedSeals([searchResult]); setIsMoveModalOpen(true); }} className="flex-1 bg-[#003594] text-white py-6 rounded-[2rem] font-black uppercase text-[12px] shadow-2xl">Cambiar Estado</button>
                  ) : null}
                  <button onClick={() => setSearchResult(null)} className="px-12 py-6 border-2 border-slate-100 rounded-[2rem] font-black uppercase text-[12px] text-slate-400 hover:bg-slate-50">Cerrar</button>
               </div>
            </div>
          </div>
        </div>
      )}

      {toast && (
          <div className={`fixed bottom-10 right-10 z-[200] px-8 py-5 rounded-2xl shadow-2xl font-black uppercase text-[11px] animate-in slide-in-from-right-10 ${toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-red-600 text-white'}`}>
              {toast.msg}
          </div>
      )}
    </div>
  );
}
