
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

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('inventario');
  const [seals, setSeals] = useState<Seal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [safeMode, setSafeMode] = useState(false);
  const [showInventoryResults, setShowInventoryResults] = useState(false);
  const [appSettings, setAppSettings] = useState<AppSettings>({ 
    title: 'GESTIÓN DE SELLOS', 
    logo: null, 
    sealTypes: ['Botella', 'Cable', 'Plástico'], 
    themeColor: '#003594' 
  });
  
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isMoveModalOpen, setIsMoveModalOpen] = useState(false);
  const [selectedSeals, setSelectedSeals] = useState<Seal[]>([]);
  const [searchId, setSearchId] = useState('');
  const [searchResult, setSearchResult] = useState<Seal | null>(null);
  const [toast, setToast] = useState<{msg: string, type: 'success' | 'error'} | null>(null);
  
  const [moveForm, setMoveForm] = useState<Partial<Seal>>({
    status: undefined,
    observations: '',
    assignedTo: '',
    deliveredTo: '',
    vehiclePlate: '',
    containerId: '',
    driverName: '',
    destination: ''
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const load = async () => {
      setIsLoading(true);
      const data = await SealService.getAllSeals();
      setSeals(data);
      const savedSettings = localStorage.getItem('selloSettings');
      if (savedSettings) setAppSettings(JSON.parse(savedSettings));
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

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setAppSettings(prev => ({ ...prev, logo: reader.result as string }));
    };
    reader.readAsDataURL(file);
  };

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

  const handleSearch = () => {
    setShowInventoryResults(true);
    const found = seals.find(s => s.id.toUpperCase() === searchId.toUpperCase());
    if (found) setSearchResult(found);
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
    setSearchResult(null);
    setToast({ msg: 'Movimiento validado y guardado', type: 'success' });
    setIsLoading(false);
  };

  const renderStatusFields = () => {
    const status = moveForm.status;
    if (!status) return <p className="text-[10px] text-slate-400 uppercase font-black text-center p-4">Seleccione el siguiente estado arriba</p>;
    
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2">
        {status === SealStatus.ASIGNADO && (
          <div className="md:col-span-2 space-y-1">
            <label className="text-[10px] font-black uppercase text-custom-blue">Asignado a</label>
            <input type="text" className="w-full border p-3 rounded-xl font-bold uppercase text-xs" value={moveForm.assignedTo || ''} onChange={e => setMoveForm({...moveForm, assignedTo: e.target.value})} placeholder="Nombre del responsable" />
          </div>
        )}
        {status === SealStatus.INSTALADO && (
          <>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-custom-blue">Placa Vehículo</label>
              <input type="text" className="w-full border p-3 rounded-xl font-bold uppercase text-xs" value={moveForm.vehiclePlate || ''} onChange={e => setMoveForm({...moveForm, vehiclePlate: e.target.value})} placeholder="XYZ-123" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-custom-blue">Contenedor</label>
              <input type="text" className="w-full border p-3 rounded-xl font-bold uppercase text-xs" value={moveForm.containerId || ''} onChange={e => setMoveForm({...moveForm, containerId: e.target.value})} placeholder="CONT-9988" />
            </div>
          </>
        )}
        {status === SealStatus.SALIDA_FABRICA && (
          <div className="md:col-span-2 space-y-1">
            <label className="text-[10px] font-black uppercase text-custom-blue">Destino Final</label>
            <input type="text" className="w-full border p-3 rounded-xl font-bold uppercase text-xs" value={moveForm.destination || ''} onChange={e => setMoveForm({...moveForm, destination: e.target.value})} placeholder="Ciudad destino" />
          </div>
        )}
        <div className="md:col-span-2 space-y-1">
            <label className="text-[10px] font-black uppercase text-custom-blue">Observaciones</label>
            <textarea className="w-full border p-3 rounded-xl font-bold uppercase text-xs h-20" value={moveForm.observations || ''} onChange={e => setMoveForm({...moveForm, observations: e.target.value})} />
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
    { id: 'inventario', label: 'INVENTARIO', icon: ICONS.SearchSmall },
    { id: 'movimientos', label: 'MOVIMIENTOS', icon: ICONS.Move },
    { id: 'trazabilidad', label: 'TRAZABILIDAD', icon: ICONS.History },
    { id: 'usuarios', label: 'USUARIOS', icon: ICONS.Users },
    { id: 'ciudades', label: 'CIUDADES', icon: ICONS.Map },
    { id: 'configuración', label: 'CONFIGURACIÓN', icon: ICONS.Settings },
  ];

  if (!currentUser) return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md p-10 border-t-8 border-[#003594]">
        <div className="text-center mb-10">
          <div className="w-20 h-20 bg-slate-50 rounded-2xl mx-auto mb-6 flex items-center justify-center border-2 border-slate-100 p-2 shadow-inner">
             <ICONS.Truck className="text-[#003594]" />
          </div>
          <h1 className="text-xl font-black text-[#003594] uppercase italic tracking-tight">GESTIÓN DE SELLOS</h1>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); const user = MOCK_USERS[0]; setCurrentUser(user); localStorage.setItem('selloUser', JSON.stringify(user)); }} className="space-y-6">
          <div className="space-y-1"><label className="text-[10px] font-black uppercase text-[#003594]">Usuario</label><input type="text" required className="w-full border p-4 rounded-xl font-bold bg-slate-50 outline-none" defaultValue="admin" /></div>
          <div className="space-y-1"><label className="text-[10px] font-black uppercase text-[#003594]">Password</label><input type="password" required className="w-full border p-4 rounded-xl font-bold bg-slate-50 outline-none" defaultValue="admin" /></div>
          <button type="submit" className="w-full bg-[#003594] text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-xl">Ingresar</button>
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
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/5 p-1.5 shadow-xl backdrop-blur-md">
              {appSettings.logo ? <img src={appSettings.logo} className="max-w-full max-h-full object-contain" /> : <ICONS.Truck className="text-white w-6 h-6" />}
            </div>
            <div className="overflow-hidden">
              <h1 className="text-[10px] font-black italic uppercase text-white leading-none tracking-tighter whitespace-nowrap">SELLOS APP</h1>
              <span className="text-[8px] font-bold text-slate-500 uppercase tracking-tighter">V.2.5 SQL SECURE</span>
            </div>
          </div>
        </div>
        
        <nav className="flex-1 px-4 space-y-1">
          {navItems.map((item, index) => (
            <React.Fragment key={item.id}>
              {index === 3 && <div className="h-px bg-slate-800/50 my-6 mx-4"></div>}
              <button 
                onClick={() => {
                  setActiveTab(item.id);
                  if (item.id === 'inventario') setShowInventoryResults(false);
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
               <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest">{currentUser.city}</p>
            </div>
          </div>
          <button onClick={() => { setCurrentUser(null); localStorage.removeItem('selloUser'); }} className="w-full flex items-center justify-center gap-3 py-3.5 bg-red-500/5 text-red-500 font-black text-[10px] uppercase rounded-xl hover:bg-red-500 hover:text-white transition-all duration-300 border border-red-500/20"><ICONS.Logout /> Salir</button>
        </div>
      </aside>

      <main className="flex-1 md:ml-64 min-h-screen">
        {/* CABECERA DINÁMICA SEGÚN IMAGEN */}
        <header className="flex justify-between items-center px-10 py-6 border-b border-slate-200 bg-white sticky top-0 z-10">
          <div>
            <h2 className="text-[14px] font-black uppercase text-[#003594] tracking-widest">
              {activeTab.toUpperCase()}
            </h2>
          </div>
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-full border border-slate-100">
               <span className="text-[10px] font-black text-slate-500 uppercase">MODO SEGURO (BORRADO)</span>
               <button 
                onClick={() => setSafeMode(!safeMode)}
                className={`w-10 h-5 rounded-full relative transition-colors ${safeMode ? 'bg-[#003594]' : 'bg-slate-300'}`}
               >
                 <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${safeMode ? 'translate-x-5.5' : 'translate-x-0.5'}`}></div>
               </button>
            </div>
            <div className="flex items-center gap-2">
               <span className="text-[10px] font-black text-[#003594] uppercase italic">SEDE {currentUser.city.toUpperCase()}</span>
               <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm animate-pulse"></div>
            </div>
          </div>
        </header>

        <div className="p-10">
          {activeTab === 'inventario' && (
            <div className="space-y-8 animate-in fade-in duration-500">
              {/* BARRA DE ACCIONES SEGÚN IMAGEN */}
              <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex flex-wrap items-center gap-4">
                  <button 
                    onClick={() => setIsNewModalOpen(true)}
                    className="bg-[#003594] text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase shadow-lg hover:brightness-110 active:scale-95 transition-all"
                  >
                    NUEVO SELLO
                  </button>
                  <label className="bg-white border-2 border-[#003594] text-[#003594] px-8 py-3 rounded-2xl font-black text-[10px] uppercase cursor-pointer flex items-center gap-2 hover:bg-blue-50 transition-all">
                    <ICONS.Import className="w-4 h-4" /> CARGA MASIVA
                    <input type="file" className="hidden" accept=".xlsx, .xls" onChange={handleBulkUpload} />
                  </label>
                  <button 
                    onClick={() => {
                        setShowInventoryResults(!showInventoryResults);
                        if (!showInventoryResults) setToast({msg: 'Cargando listado completo...', type: 'success'});
                    }}
                    className={`bg-white border-2 border-[#003594] text-[#003594] px-8 py-3 rounded-2xl font-black text-[10px] uppercase flex items-center gap-2 transition-all ${showInventoryResults ? 'bg-blue-50 shadow-inner' : 'hover:bg-blue-50'}`}
                  >
                    <ICONS.SearchSmall className="w-4 h-4" /> BÚSQUEDA
                  </button>
                </div>

                <button 
                  onClick={() => setToast({msg: 'Exportando a Excel...', type: 'success'})}
                  className="bg-[#059669] text-white px-8 py-3 rounded-2xl font-black text-[10px] uppercase flex items-center gap-2 shadow-lg hover:brightness-110 active:scale-95 transition-all"
                >
                  <ICONS.Excel className="w-4 h-4" /> EXPORTAR INVENTARIO
                </button>
              </div>

              {/* CONTENEDOR DE RESULTADOS O PLACEHOLDER */}
              {!showInventoryResults ? (
                <div className="bg-white rounded-[2rem] border-2 border-dashed border-slate-200 p-24 flex flex-col items-center justify-center text-center space-y-6">
                   <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100 shadow-inner">
                      <ICONS.SearchSmall className="w-10 h-10 text-slate-200" />
                   </div>
                   <p className="text-[12px] font-black text-slate-400 uppercase tracking-[0.3em]">
                      UTILICE EL BOTÓN "BÚSQUEDA" PARA CONSULTAR EL INVENTARIO DE {currentUser.city.toUpperCase()}
                   </p>
                </div>
              ) : (
                <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden animate-in zoom-in duration-300">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-[#003594] uppercase tracking-widest">
                      <tr><th className="px-10 py-7">SERIAL ID</th><th className="px-10 py-7">CATEGORÍA</th><th className="px-10 py-7">ESTADO SEGURIDAD</th><th className="px-10 py-7">UBICACIÓN</th></tr>
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
                          <td className="px-10 py-6 text-slate-400 uppercase font-black">{s.city}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {activeTab === 'movimientos' && (
            <div className="space-y-8 animate-in fade-in duration-500">
               <div className="bg-white p-10 rounded-[3rem] border border-slate-200 flex justify-between items-center shadow-sm border-l-8 border-l-[#003594]">
                <div>
                  <h3 className="text-2xl font-black text-[#003594] uppercase italic tracking-tighter">Tránsito de Precintos</h3>
                  <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[0.2em]">Gestión de estados y cadena de custodia</p>
                </div>
                <button 
                  disabled={selectedSeals.length === 0} 
                  onClick={() => {
                    setMoveForm({ status: undefined, observations: '' });
                    setIsMoveModalOpen(true);
                  }} 
                  className={`px-12 py-6 rounded-[2rem] font-black text-[11px] uppercase shadow-2xl transition-all ${selectedSeals.length > 0 ? 'bg-[#003594] text-white hover:scale-105' : 'bg-slate-100 text-slate-400 cursor-not-allowed opacity-50'}`}
                >
                  Ejecutar Movimiento ({selectedSeals.length})
                </button>
              </div>
              {/* Tabla de movimientos similar a inventario */}
              <div className="bg-white rounded-[3rem] border border-slate-200 shadow-sm overflow-hidden">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-[#003594] uppercase">
                    <tr>
                      <th className="px-10 py-7 w-10">
                        <input type="checkbox" className="w-5 h-5 rounded-lg border-slate-300 text-[#003594] cursor-pointer" onChange={(e) => setSelectedSeals(e.target.checked ? seals.filter(s => s.city === currentUser.city) : [])} />
                      </th>
                      <th className="px-10 py-7">ID PRECINTO</th>
                      <th className="px-10 py-7">ESTADO ACTUAL</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-bold">
                    {seals.filter(s => s.city === currentUser.city).map(s => {
                      const isTerminal = ALLOWED_TRANSITIONS[s.status].length === 0;
                      return (
                        <tr key={s.id} className={`${selectedSeals.find(sel => sel.id === s.id) ? 'bg-blue-50/50' : isTerminal ? 'bg-slate-50/30' : 'hover:bg-slate-50'} transition-colors`}>
                          <td className="px-10 py-6">
                            {!isTerminal && (
                              <input 
                                type="checkbox" className="w-5 h-5 rounded-lg border-slate-300 text-[#003594] cursor-pointer"
                                checked={!!selectedSeals.find(sel => sel.id === s.id)} 
                                onChange={() => setSelectedSeals(prev => prev.find(sel => sel.id === s.id) ? prev.filter(sel => sel.id !== s.id) : [...prev, s])} 
                              />
                            )}
                          </td>
                          <td className={`px-10 py-6 font-mono ${isTerminal ? 'text-slate-300 line-through' : 'text-[#003594]'}`}>{s.id}</td>
                          <td className="px-10 py-6">
                            <span className={`px-5 py-2 rounded-2xl text-[9px] font-black uppercase border-2 ${getStatusStyles(s.status)}`}>
                              {s.status.replace('_', ' ')}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'trazabilidad' && (
            <div className="space-y-8">
               <div className="bg-white p-10 rounded-[3rem] border border-slate-200 shadow-sm border-t-8 border-[#003594]">
                  <p className="text-[11px] font-black text-[#003594] uppercase tracking-widest mb-4">Módulo de Auditoría SQL</p>
                  <input type="text" placeholder="ID DEL SELLO PARA RASTREO COMPLETO..." className="w-full bg-slate-50 border-2 border-slate-100 p-5 rounded-[1.5rem] font-black uppercase tracking-widest text-xs outline-none focus:border-[#003594] transition-all" value={searchId} onChange={e => setSearchId(e.target.value.toUpperCase())} />
               </div>
               {seals.filter(s => s.id.includes(searchId) && searchId.length > 1).map(s => (
                 <div key={s.id} className="bg-white p-12 rounded-[4rem] border border-slate-200 shadow-sm space-y-10 animate-in zoom-in duration-300">
                    <div className="flex justify-between items-center pb-8 border-b border-slate-100">
                      <div className="flex items-center gap-6">
                         <div className="w-14 h-14 bg-[#003594] text-white flex items-center justify-center rounded-2xl shadow-2xl"><ICONS.History className="w-7 h-7" /></div>
                         <div>
                            <h4 className="font-black text-[#003594] italic text-3xl uppercase tracking-tighter">{s.id}</h4>
                            <span className="text-[10px] font-black uppercase bg-slate-100 px-4 py-1.5 rounded-xl text-slate-500 border border-slate-200">{s.type}</span>
                         </div>
                      </div>
                      <div className="text-right">
                         <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Estado Final</p>
                         <p className={`text-[12px] font-black uppercase px-6 py-2 rounded-2xl border-2 shadow-sm ${getStatusStyles(s.status)}`}>{s.status.replace('_', ' ')}</p>
                      </div>
                    </div>
                    {/* Historial detallado */}
                    <div className="space-y-12 pl-6">
                       {s.history.map((h, i) => (
                         <div key={i} className="flex gap-10 items-start relative pb-12 last:pb-0">
                           {i < s.history.length - 1 && <div className="w-1 h-full bg-slate-100 absolute left-[19px] top-10 -z-10"></div>}
                           <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0 border-4 border-[#003594] shadow-xl z-10 transition-transform hover:scale-125">
                            {h.fromStatus ? <ICONS.ArrowRightTiny className="w-4 h-4 text-[#003594]" /> : <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-lg"></div>}
                           </div>
                           <div className="bg-slate-50/50 p-8 rounded-[2.5rem] flex-1 border border-slate-100 group hover:border-[#003594]/30 transition-all">
                             <div className="flex justify-between mb-6 border-b border-slate-200 pb-4">
                                <div className="flex items-center gap-4">
                                  {h.fromStatus && <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{h.fromStatus.replace('_', ' ')}</span>}
                                  {h.fromStatus && <ICONS.ArrowRightTiny className="w-3 h-3 text-slate-300" />}
                                  <span className="text-[12px] font-black text-[#003594] uppercase tracking-widest">{h.toStatus.replace('_', ' ')}</span>
                                </div>
                                <span className="text-[10px] text-slate-400 font-bold uppercase">{h.date}</span>
                             </div>
                             <p className="text-[12px] text-slate-600 italic font-medium bg-white/50 p-4 rounded-xl border border-slate-100">{h.details}</p>
                           </div>
                         </div>
                       ))}
                    </div>
                 </div>
               ))}
            </div>
          )}

          {/* OTRAS SECCIONES SIMPLES */}
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
                      <h3 className="font-black uppercase text-3xl italic text-[#003594] tracking-tighter">Transición de Estados</h3>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-[10px] text-slate-400 font-bold uppercase">Origen:</span>
                        <span className={`text-[11px] font-black uppercase px-4 py-1.5 rounded-xl border-2 ${getStatusStyles(selectedSeals[0]?.status)}`}>{selectedSeals[0]?.status.replace('_', ' ')}</span>
                      </div>
                   </div>
                   <button onClick={() => setIsMoveModalOpen(false)} className="w-14 h-14 rounded-full border-2 border-slate-100 flex items-center justify-center text-slate-400 hover:bg-red-50 hover:text-red-500 transition-all font-black text-xl">✕</button>
                </div>

                <div className="space-y-12">
                  <div className="space-y-4">
                    <label className="text-[11px] font-black uppercase text-[#003594] tracking-[0.2em]">Destino Validado</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {getCommonNextStatuses().map(st => (
                        <button 
                          key={st} 
                          onClick={() => setMoveForm({...moveForm, status: st})}
                          className={`px-5 py-6 rounded-3xl text-[10px] font-black uppercase border-2 transition-all ${moveForm.status === st ? 'bg-[#003594] text-white border-[#003594] shadow-lg scale-105' : 'bg-white text-slate-500 border-slate-100 hover:border-[#003594]/40'}`}
                        >
                          {st.replace('_', ' ')}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="bg-slate-50/50 p-10 rounded-[3rem] border-2 border-slate-100 space-y-8">
                    <h4 className="text-[11px] font-black text-[#003594] uppercase tracking-widest border-b-2 border-slate-200 pb-4">Registrar Datos de Operación</h4>
                    {renderStatusFields()}
                  </div>

                  <div className="flex gap-6">
                    <button onClick={() => setIsMoveModalOpen(false)} className="flex-1 py-6 border-2 border-slate-100 rounded-[2rem] font-black uppercase text-[12px] text-slate-400 hover:bg-slate-50 transition-all">Cancelar</button>
                    <button 
                      disabled={!moveForm.status}
                      onClick={handleConfirmMove} 
                      className={`flex-1 py-6 text-white rounded-[2rem] font-black uppercase text-[12px] shadow-2xl transition-all ${moveForm.status ? 'bg-[#003594] hover:brightness-110 active:scale-95' : 'bg-slate-300 cursor-not-allowed'}`}
                    >
                      Confirmar Movimiento
                    </button>
                  </div>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* MODAL ALTA NUEVA */}
      {isNewModalOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[110] flex items-center justify-center p-4">
           <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in border-t-8 border-[#003594]">
              <div className="p-12 space-y-10">
                 <div className="text-center">
                    <h3 className="font-black uppercase text-3xl italic text-[#003594] tracking-tighter">Alta Técnica</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-2">Registro inicial de precinto</p>
                 </div>
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
                      const now = new Date().toLocaleString();
                      await SealService.saveSeal({
                        id: idInput.value.toUpperCase(), type: typeInput.value, status: SealStatus.ENTRADA_INVENTARIO, creationDate: now, lastMovement: now, entryUser: currentUser.fullName, city: currentUser.city,
                        history: [{ date: now, fromStatus: null, toStatus: SealStatus.ENTRADA_INVENTARIO, user: currentUser.fullName, details: 'ALTA INICIAL' }]
                      });
                      setSeals(await SealService.getAllSeals());
                      setIsNewModalOpen(false);
                      setToast({msg: 'Alta exitosa', type: 'success'});
                    }} className="flex-1 bg-[#003594] text-white py-5 rounded-2xl font-black uppercase text-[11px] shadow-2xl">Registrar</button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* DETALLE DE SELLO */}
      {searchResult && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-[4rem] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in duration-300 border-t-[12px] border-[#003594]">
            <div className="p-12 space-y-10">
               <div className="flex justify-between items-start border-b border-slate-100 pb-8">
                  <div>
                    <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest mb-2">Ficha Técnica</p>
                    <p className="text-5xl font-black text-[#003594] italic tracking-tighter">{searchResult.id}</p>
                  </div>
                  <div className={`px-6 py-3 rounded-2xl text-[11px] font-black uppercase border-2 ${getStatusStyles(searchResult.status)}`}>{searchResult.status.replace('_', ' ')}</div>
               </div>
               <div className="grid grid-cols-2 gap-10">
                  <div><p className="text-[10px] font-black text-slate-400 uppercase mb-2">Ubicación</p><p className="text-[13px] font-black text-slate-700 uppercase">{searchResult.city}</p></div>
                  <div><p className="text-[10px] font-black text-slate-400 uppercase mb-2">Tipo</p><p className="text-[13px] font-black text-slate-700 uppercase">{searchResult.type}</p></div>
               </div>
               <div className="flex gap-6">
                  <button onClick={() => { setSelectedSeals([searchResult]); setIsMoveModalOpen(true); }} className="flex-1 bg-[#003594] text-white py-6 rounded-[2rem] font-black uppercase text-[12px] shadow-2xl hover:brightness-110 active:scale-95 transition-all">Cambiar Estado</button>
                  <button onClick={() => setSearchResult(null)} className="px-12 py-6 border-2 border-slate-100 rounded-[2rem] font-black uppercase text-[12px] text-slate-400 hover:bg-slate-50 transition-all">Cerrar</button>
               </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
