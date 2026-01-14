
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { ICONS, MOCK_DATA, MOCK_USERS } from './constants';
import { Seal, SealStatus, FilterOptions, MovementHistory, User, UserRole, AppSettings } from './types';
import * as XLSX from 'xlsx';
import { PieChart, Pie, Cell, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Legend } from 'recharts';

// --- HELPERS ---

const getStatusStyles = (status: SealStatus) => {
  switch (status) {
    case SealStatus.ENTRADA_INVENTARIO:
      return "bg-emerald-50 text-emerald-800 border-emerald-200 icon-bg-emerald-500 text-emerald-600";
    case SealStatus.ASIGNADO:
      return "bg-sky-50 text-sky-800 border-sky-200 icon-bg-sky-500 text-sky-600";
    case SealStatus.ENTREGADO:
      return "bg-amber-50 text-amber-800 border-amber-200 icon-bg-amber-500 text-amber-600";
    case SealStatus.INSTALADO:
      return "bg-orange-50 text-orange-800 border-orange-200 icon-bg-orange-500 text-orange-600";
    case SealStatus.NO_INSTALADO:
      return "bg-[#F5F5DC] text-stone-800 border-stone-300 icon-bg-stone-500 text-stone-600";
    case SealStatus.SALIDA_FABRICA:
      return "bg-gray-100 text-gray-700 border-gray-300 icon-bg-gray-500 text-gray-600";
    case SealStatus.DESTRUIDO:
      return "bg-red-50 text-red-800 border-red-200 icon-bg-red-500 text-red-600";
    default:
      return "bg-slate-100 text-slate-800 border-slate-200 icon-bg-slate-500 text-slate-600";
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

// --- EXPORT FUNCTIONS ---

const exportToExcel = (data: any[], fileName: string) => {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Datos");
  XLSX.writeFile(wb, `${fileName}.xlsx`);
};

// --- COMPONENTS ---

const DashboardView: React.FC<{ seals: Seal[]; user: User; cities: string[] }> = ({ seals, user, cities }) => {
  const citySeals = seals.filter(s => s.city === user.city);
  
  const stats = useMemo(() => {
    return {
      total: citySeals.length,
      available: citySeals.filter(s => s.status === SealStatus.ENTRADA_INVENTARIO || s.status === SealStatus.NO_INSTALADO).length,
      assigned: citySeals.filter(s => s.status === SealStatus.ASIGNADO || s.status === SealStatus.ENTREGADO).length,
      finalized: citySeals.filter(s => s.status === SealStatus.INSTALADO || s.status === SealStatus.SALIDA_FABRICA).length,
      destroyed: citySeals.filter(s => s.status === SealStatus.DESTRUIDO).length,
    };
  }, [citySeals]);

  const pieData = useMemo(() => {
    const counts: Record<string, number> = {};
    citySeals.forEach(s => {
      counts[s.status] = (counts[s.status] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({ name: name.replace('_', ' '), value, rawName: name }));
  }, [citySeals]);

  const cityData = useMemo(() => {
    return cities.map(city => ({
      name: city,
      cantidad: seals.filter(s => s.city === city).length
    }));
  }, [seals, cities]);

  const recentMovements = useMemo(() => {
    return seals
      .flatMap(s => s.history.map(h => ({ ...h, sealId: s.id, city: s.city })))
      .filter(m => user.role === UserRole.ADMIN || m.city === user.city)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(0, 5);
  }, [seals, user]);

  return (
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h3 className="text-3xl font-black text-custom-blue uppercase tracking-tighter italic">Centro de Operaciones</h3>
          <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Estadísticas en Tiempo Real - Sede: <span className="text-custom-blue">{user.city}</span></p>
        </div>
        <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
          <div className="text-right">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Estado Global</p>
            <p className="text-sm font-black text-custom-blue uppercase tracking-tighter">RED OPERATIVA ACTIVA</p>
          </div>
          <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse"></div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6">
        {[
          { label: 'Total Inventario', value: stats.total, color: 'text-custom-blue', bg: 'bg-white', icon: <ICONS.Truck /> },
          { label: 'Disponibles', value: stats.available, color: 'text-emerald-600', bg: 'bg-emerald-50/50', icon: <ICONS.Plus /> },
          { label: 'En Tránsito', value: stats.assigned, color: 'text-sky-600', bg: 'bg-sky-50/50', icon: <ICONS.Move /> },
          { label: 'Instalados', value: stats.finalized, color: 'text-orange-600', bg: 'bg-orange-50/50', icon: <ICONS.StopCircle /> },
          { label: 'Bajas/Deterioro', value: stats.destroyed, color: 'text-red-600', bg: 'bg-red-50/50', icon: <ICONS.Trash /> },
        ].map((card, idx) => (
          <div key={idx} className={`${card.bg} p-6 rounded-3xl border border-slate-200 shadow-sm transition-all hover:shadow-md hover:-translate-y-1 group`}>
            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center mb-4 transition-colors ${card.color.replace('text', 'bg').replace('600', '100')} ${card.color}`}>
              {card.icon}
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">{card.label}</p>
            <p className={`text-3xl font-black ${card.color} tracking-tighter italic`}>{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Distribución por Estado */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h4 className="text-xs font-black text-custom-blue uppercase tracking-widest mb-8 border-l-4 border-custom-blue pl-4">Distribución por Estado</h4>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={getStatusColorHex(entry.rawName as SealStatus)} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontWeight: 'bold' }}
                />
                <Legend layout="vertical" verticalAlign="middle" align="right" wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase' }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Actividad Reciente */}
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-8">
            <h4 className="text-xs font-black text-custom-blue uppercase tracking-widest border-l-4 border-custom-blue pl-4">Últimos Movimientos</h4>
            <div className="bg-slate-100 px-3 py-1 rounded-full text-[9px] font-black text-slate-500">TIEMPO REAL</div>
          </div>
          <div className="space-y-4">
            {recentMovements.length > 0 ? recentMovements.map((move, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                <div className={`w-2 h-10 rounded-full ${getStatusIconColor(move.toStatus)}`}></div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                    <p className="text-[11px] font-black text-custom-blue uppercase">Sello {move.sealId}</p>
                    <p className="text-[9px] font-bold text-slate-400 font-mono">{move.date.split(' ')[0]}</p>
                  </div>
                  <p className="text-[10px] text-slate-600 font-medium italic line-clamp-1">{move.details}</p>
                </div>
                <div className="text-right">
                  <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded border ${getStatusStyles(move.toStatus).split('icon-bg-')[0]}`}>
                    {move.toStatus.replace('_', ' ')}
                  </span>
                </div>
              </div>
            )) : (
              <div className="h-64 flex flex-col items-center justify-center text-slate-300 space-y-4 italic">
                <ICONS.History className="w-12 h-12 opacity-20" />
                <p className="text-xs font-bold uppercase tracking-widest">Sin actividad registrada</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {user.role === UserRole.ADMIN && (
        <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
          <h4 className="text-xs font-black text-custom-blue uppercase tracking-widest mb-8 border-l-4 border-custom-blue pl-4">Inventario por Sede</h4>
          <div className="h-[300px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={cityData}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                <Tooltip cursor={{ fill: '#f1f5f9' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="cantidad" fill="#003594" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </div>
  );
};

// --- SETTINGS VIEW WITH DB MANAGEMENT ---

const SettingsView: React.FC<{ 
  settings: AppSettings; 
  onUpdate: (s: AppSettings) => void;
  onRestoreDB: (data: any) => void;
}> = ({ settings, onUpdate, onRestoreDB }) => {
  const [title, setTitle] = useState(settings.title);
  const [logoPreview, setLogoPreview] = useState<string | null>(settings.logo);
  const [newType, setNewType] = useState('');
  const [sealTypes, setSealTypes] = useState<string[]>(settings.sealTypes);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dbFileRef = useRef<HTMLInputElement>(null);

  const addSealType = () => {
    if (newType.trim() && !sealTypes.includes(newType.trim().toUpperCase())) { setSealTypes([...sealTypes, newType.trim().toUpperCase()]); setNewType(''); }
  };
  const removeSealType = (type: string) => setSealTypes(sealTypes.filter(t => t !== type));
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setLogoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => { onUpdate({ title, logo: logoPreview, sealTypes }); alert('Configuración guardada satisfactoriamente.'); };

  const handleExportDB = () => {
    const dbData = {
      seals: JSON.parse(localStorage.getItem('selloData') || '[]'),
      users: JSON.parse(localStorage.getItem('selloUsers') || '[]'),
      cities: JSON.parse(localStorage.getItem('selloCities') || '[]'),
      settings: JSON.parse(localStorage.getItem('selloSettings') || '{}'),
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(dbData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `SelloMaster_Backup_${new Date().toLocaleDateString()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleImportDB = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = JSON.parse(evt.target?.result as string);
        if (window.confirm("¿Restaurar base de datos? Esto sobrescribirá la información actual.")) {
          onRestoreDB(data);
          alert("Base de datos restaurada. La aplicación se reiniciará.");
          window.location.reload();
        }
      } catch (err) {
        alert("Archivo de respaldo inválido.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
      <div><h3 className="text-2xl font-black text-custom-blue uppercase tracking-tighter italic">Configuración Maestro</h3><p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Personalice la identidad corporativa y parámetros globales</p></div>
      
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-10 space-y-10 max-w-4xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
          <div className="space-y-4">
            <label className="text-[10px] font-black text-custom-blue uppercase tracking-widest block">Logo Corporativo</label>
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0 relative group">
                {logoPreview ? <img src={logoPreview} className="w-full h-full object-cover" /> : <ICONS.Truck className="w-8 h-8 text-slate-300" />}
                <div onClick={() => fileInputRef.current?.click()} className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer"><ICONS.Plus className="text-white w-6 h-6" /></div>
              </div>
              <div className="space-y-2">
                <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
                <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-black text-custom-blue uppercase hover:bg-slate-50">Cambiar Logo</button>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <label className="text-[10px] font-black text-custom-blue uppercase tracking-widest block">Nombre de la Plataforma</label>
            <input type="text" className="w-full border border-slate-200 bg-slate-50 rounded-xl px-6 py-4 text-xl font-black text-custom-blue focus:bg-white focus:ring-4 focus:ring-blue-50 outline-none transition-all uppercase" value={title} onChange={(e) => setTitle(e.target.value.toUpperCase())} />
          </div>
        </div>

        <div className="space-y-4">
          <label className="text-[10px] font-black text-custom-blue uppercase tracking-widest block">Catálogo de Precintos</label>
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100">
            <div className="flex gap-3 mb-4">
              <input type="text" placeholder="Ej: Sello Metálico" className="flex-1 border border-slate-200 bg-white p-3.5 rounded-xl text-sm font-bold text-custom-blue outline-none uppercase" value={newType} onChange={e => setNewType(e.target.value.toUpperCase())} />
              <button onClick={addSealType} className="bg-custom-blue text-white px-6 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black">Añadir</button>
            </div>
            <div className="flex flex-wrap gap-2">{sealTypes.map(t => <div key={t} className="bg-white border border-slate-200 px-4 py-2 rounded-lg flex items-center gap-3 font-bold text-[11px] text-custom-blue shadow-sm group">{t}<button onClick={() => removeSealType(t)} className="text-slate-300 hover:text-red-500 transition-colors"><ICONS.Trash className="w-3.5 h-3.5" /></button></div>)}</div>
          </div>
        </div>

        {/* DATABASE MANAGEMENT SECTION */}
        <div className="pt-6 border-t border-slate-100">
          <label className="text-[10px] font-black text-custom-blue uppercase tracking-widest block mb-4">Gestión de Base de Datos (LocalStorage)</label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-black text-custom-blue uppercase tracking-widest mb-1">Exportar Backup</h4>
                <p className="text-[10px] text-slate-500 font-medium leading-relaxed">Descargue una copia completa de la base de datos (sellos, historial y usuarios) en formato JSON.</p>
              </div>
              <button onClick={handleExportDB} className="mt-4 w-full bg-white border border-custom-blue text-custom-blue font-black py-3 rounded-xl text-[10px] uppercase tracking-widest hover:bg-custom-blue hover:text-white transition-all">Generar Backup (.json)</button>
            </div>
            <div className="bg-emerald-50 p-6 rounded-2xl border border-emerald-100 flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-black text-emerald-800 uppercase tracking-widest mb-1">Restaurar Datos</h4>
                <p className="text-[10px] text-slate-500 font-medium leading-relaxed">Cargue un archivo de respaldo previo para migrar o recuperar su información.</p>
              </div>
              <input ref={dbFileRef} type="file" accept=".json" onChange={handleImportDB} className="hidden" />
              <button onClick={() => dbFileRef.current?.click()} className="mt-4 w-full bg-emerald-600 text-white font-black py-3 rounded-xl text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all">Cargar Respaldo</button>
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-slate-100 flex justify-end">
          <button onClick={handleSave} className="bg-custom-blue text-white px-10 py-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-xl hover:bg-custom-blue-dark transition-all">Guardar Cambios Generales</button>
        </div>
      </div>
    </div>
  );
};

// ... Rest of components (CityManagement, UserManagement, LoginScreen, etc.) ...
// Keep existing CityManagement and UserManagement as they were in the previous version

const CityManagement: React.FC<{ 
  cities: string[]; 
  onAddCity: (city: string) => void; 
  onDeleteCity: (city: string) => void;
  onUpdateCity: (oldCity: string, newCity: string) => void;
}> = ({ cities, onAddCity, onDeleteCity, onUpdateCity }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCity, setEditingCity] = useState<string | null>(null);
  const [newCityName, setNewCityName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCityName.trim()) return;
    const cleanCity = newCityName.trim().toUpperCase();
    if (editingCity) onUpdateCity(editingCity, cleanCity);
    else {
      if (cities.includes(cleanCity)) return alert('La ciudad ya existe');
      onAddCity(cleanCity);
    }
    setIsModalOpen(false); setEditingCity(null); setNewCityName('');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div><h3 className="text-2xl font-black text-custom-blue uppercase tracking-tighter italic">Sedes Operativas</h3><p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Configuración Maestro de Puntos Logísticos</p></div>
        <button onClick={() => { setEditingCity(null); setNewCityName(''); setIsModalOpen(true); }} className="flex items-center gap-2 bg-custom-blue text-white px-6 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-custom-blue-dark transition-all"><ICONS.Plus className="w-4 h-4" /> Registrar Ciudad</button>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100"><tr><th className="px-8 py-5 text-[10px] font-black text-custom-blue uppercase tracking-widest">Nombre de Ciudad</th><th className="px-8 py-5 text-[10px] font-black text-custom-blue uppercase tracking-widest text-right">Acciones</th></tr></thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {cities.map(city => (
              <tr key={city} className="hover:bg-slate-50/50 transition-colors"><td className="px-8 py-5 font-black text-custom-blue uppercase">{city}</td>
                <td className="px-8 py-5 text-right flex justify-end gap-2">
                  <button onClick={() => { setEditingCity(city); setNewCityName(city); setIsModalOpen(true); }} className="text-slate-400 hover:text-custom-blue p-2 rounded-lg hover:bg-slate-100"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg></button>
                  <button onClick={() => onDeleteCity(city)} className="text-slate-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50"><ICONS.Trash className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-200">
            <div className="bg-custom-blue px-8 py-5 text-white font-black text-xs uppercase tracking-widest">{editingCity ? 'Actualizar Sede' : 'Nueva Sede'}</div>
            <form onSubmit={handleSubmit} className="p-8 space-y-4">
              <div className="space-y-1.5"><label className="text-[10px] font-black text-custom-blue uppercase tracking-widest">Nombre de la Ciudad</label><input type="text" required className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold text-custom-blue focus:bg-white outline-none uppercase" value={newCityName} onChange={e => setNewCityName(e.target.value)} /></div>
              <div className="flex gap-4 pt-4"><button type="button" onClick={() => { setIsModalOpen(false); setEditingCity(null); }} className="flex-1 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cancelar</button><button type="submit" className="flex-1 bg-custom-blue text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black shadow-lg">{editingCity ? 'Guardar Cambios' : 'Registrar'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const UserManagement: React.FC<{ 
  users: User[]; 
  cities: string[];
  onAddUser: (u: User) => void; 
  onUpdateUser: (u: User) => void;
  onDeleteUser: (id: string) => void 
}> = ({ users, cities, onAddUser, onUpdateUser, onDeleteUser }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [formData, setFormData] = useState({ username: '', fullName: '', password: '', role: UserRole.GESTOR, city: cities[0] || '' });
  
  useEffect(() => {
    if (editingUser) setFormData({ username: editingUser.username, fullName: editingUser.fullName, password: editingUser.password || '', role: editingUser.role, city: editingUser.city });
    else setFormData({ username: '', fullName: '', password: '', role: UserRole.GESTOR, city: cities[0] || '' });
  }, [editingUser, cities]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username || !formData.password) return alert('Usuario y contraseña obligatorios');
    if (editingUser) onUpdateUser({ ...editingUser, ...formData });
    else {
      const u: User = { ...formData, id: Math.random().toString(36).substr(2, 9), organization: 'Logistic Global' };
      onAddUser(u);
    }
    setIsModalOpen(false); setEditingUser(null);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end">
        <div><h3 className="text-2xl font-black text-custom-blue uppercase tracking-tighter italic">Personal Operativo</h3><p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Directorio Maestro de Accesos por Sede</p></div>
        <button onClick={() => { setEditingUser(null); setIsModalOpen(true); }} className="flex items-center gap-2 bg-custom-blue text-white px-6 py-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-custom-blue-dark transition-all"><ICONS.Plus className="w-4 h-4" /> Registrar Usuario</button>
      </div>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-100"><tr><th className="px-8 py-5 text-[10px] font-black text-custom-blue uppercase tracking-widest">Nombre Completo</th><th className="px-8 py-5 text-[10px] font-black text-custom-blue uppercase tracking-widest">ID / Ciudad</th><th className="px-8 py-5 text-[10px] font-black text-custom-blue uppercase tracking-widest">Permisos</th><th className="px-8 py-5 text-[10px] font-black text-custom-blue uppercase tracking-widest text-right">Acciones</th></tr></thead>
          <tbody className="divide-y divide-slate-100 text-sm">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-slate-50/50 transition-colors"><td className="px-8 py-5 font-black text-custom-blue uppercase">{u.fullName}</td>
                <td className="px-8 py-5"><p className="text-slate-600 font-mono text-xs font-bold uppercase">{u.username}</p><p className="text-[10px] text-custom-blue font-black uppercase">{u.city}</p></td>
                <td className="px-8 py-5"><span className={`px-2 py-1 rounded text-[9px] font-black uppercase border ${u.role === UserRole.ADMIN ? 'bg-custom-blue text-white border-custom-blue' : 'bg-slate-100 text-slate-800 border-slate-200'}`}>{u.role}</span></td>
                <td className="px-8 py-5 text-right flex justify-end gap-2">
                  <button onClick={() => { setEditingUser(u); setIsModalOpen(true); }} className="text-slate-400 hover:text-custom-blue p-2 rounded-lg hover:bg-slate-100"><svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg></button>
                  {u.username !== 'admin' && <button onClick={() => onDeleteUser(u.id)} className="text-slate-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50"><ICONS.Trash className="w-4 h-4" /></button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-200">
            <div className="bg-custom-blue px-8 py-5 text-white font-black text-xs uppercase tracking-widest">{editingUser ? 'Actualizar Personal' : 'Nuevo Registro de Personal'}</div>
            <form onSubmit={handleSubmit} className="p-8 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><label className="text-[10px] font-black text-custom-blue uppercase tracking-widest">Nombre Completo</label><input type="text" required className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold text-custom-blue focus:bg-white outline-none uppercase" value={formData.fullName} onChange={e => setFormData({...formData, fullName: e.target.value.toUpperCase()})} /></div>
                <div className="space-y-1.5"><label className="text-[10px] font-black text-custom-blue uppercase tracking-widest">ID Usuario (Login)</label><input type="text" required className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 text-sm font-mono font-bold text-custom-blue focus:bg-white outline-none uppercase" value={formData.username} onChange={e => setFormData({...formData, username: e.target.value.toUpperCase()})} /></div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5"><label className="text-[10px] font-black text-custom-blue uppercase tracking-widest">Contraseña</label><input type="password" required className="w-full border border-slate-200 bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold text-custom-blue focus:bg-white outline-none" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} /></div>
                <div className="space-y-1.5"><label className="text-[10px] font-black text-custom-blue uppercase tracking-widest">Sede Asignada</label><select className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-3 text-sm font-bold text-custom-blue focus:bg-white outline-none appearance-none" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})}>{cities.map(city => <option key={city} value={city}>{city}</option>)}</select></div>
              </div>
              <div className="space-y-1.5"><label className="text-[10px] font-black text-custom-blue uppercase tracking-widest">Rol / Permisos</label><select className="w-full border border-gray-200 bg-gray-50 rounded-xl px-4 py-3.5 text-sm font-bold text-custom-blue focus:bg-white outline-none appearance-none" value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as UserRole})}><option value={UserRole.GESTOR}>Gestor Operativo (Local)</option><option value={UserRole.ADMIN}>Administrador Maestro</option></select></div>
              <div className="flex gap-4 pt-4"><button type="button" onClick={() => { setIsModalOpen(false); setEditingUser(null); }} className="flex-1 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cancelar</button><button type="submit" className="flex-1 bg-custom-blue text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black shadow-lg">{editingUser ? 'Guardar Cambios' : 'Registrar'}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

const InventorySearchModal: React.FC<{ 
  isOpen: boolean;
  onClose: () => void;
  onSearch: (filters: FilterOptions) => void; 
  sealTypes: string[] 
}> = ({ isOpen, onClose, onSearch, sealTypes }) => {
  const [filters, setFilters] = useState<FilterOptions>({ idSello: '', estado: '', tipo: 'Todos', fechaInicio: '', fechaFin: '' });
  if (!isOpen) return null;
  const handleSubmit = (e: React.FormEvent) => { e.preventDefault(); onSearch(filters); onClose(); };
  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-200 animate-in zoom-in duration-200">
        <div className="bg-custom-blue px-6 py-5 flex justify-between items-center text-white"><div className="flex items-center gap-2"><ICONS.Filter className="w-4 h-4" /><h3 className="text-[10px] font-black uppercase tracking-widest">Filtros de Búsqueda</h3></div><button onClick={onClose} className="hover:rotate-90 transition-transform">✕</button></div>
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-1.5"><label className="text-[10px] font-black text-custom-blue uppercase tracking-widest">ID Sello</label><input type="text" placeholder="Ej: BOG-001" className="w-full border border-gray-200 bg-gray-50 rounded-xl p-3.5 text-sm font-mono font-bold text-custom-blue focus:bg-white focus:ring-4 focus:ring-blue-100 outline-none transition-all uppercase" value={filters.idSello} onChange={(e) => setFilters({...filters, idSello: e.target.value.toUpperCase()})} /></div>
          <div className="space-y-1.5"><label className="text-[10px] font-black text-custom-blue uppercase tracking-widest">Estado Logístico</label><select className="w-full border border-gray-200 bg-gray-50 rounded-xl p-3.5 text-sm font-bold text-custom-blue focus:bg-white outline-none appearance-none" value={filters.estado} onChange={(e) => setFilters({...filters, estado: e.target.value})}><option value="">Cualquier estado</option>{Object.values(SealStatus).map(s => <option key={s} value={s}>{s.replace('_', ' ')}</option>)}</select></div>
          <div className="space-y-1.5"><label className="text-[10px] font-black text-custom-blue uppercase tracking-widest">Clasificación de Tipo</label><select className="w-full border border-gray-200 bg-gray-50 rounded-xl p-3.5 text-sm font-bold text-custom-blue focus:bg-white outline-none appearance-none" value={filters.tipo} onChange={(e) => setFilters({...filters, tipo: e.target.value})}><option value="Todos">Todos los tipos</option>{sealTypes.map(t => <option key={t} value={t}>{t}</option>)}</select></div>
          <div className="flex gap-4 pt-6"><button type="button" onClick={onClose} className="flex-1 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cerrar</button><button type="submit" className="flex-1 bg-custom-blue text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl hover:bg-black transition-all flex items-center justify-center gap-2"><ICONS.SearchSmall className="w-4 h-4" /> Ejecutar Filtro</button></div>
        </form>
      </div>
    </div>
  );
};

const TraceabilityView: React.FC<{ seals: Seal[]; user: User }> = ({ seals, user }) => {
  const [searchId, setSearchId] = useState('');
  const foundSeal = useMemo(() => { if (!searchId) return null; return seals.find(s => s.id.toLowerCase() === searchId.toLowerCase() && s.city === user.city) || null; }, [seals, searchId, user.city]);
  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); if (!foundSeal && searchId) alert(`No se encontró ningún precinto con el ID "${searchId}" en la sede ${user.city}`); };
  const handleDownloadHistory = () => { if (!foundSeal) return; const historyData = foundSeal.history.map(h => ({ Fecha: h.date, "Estado Origen": h.fromStatus || "REGISTRO INICIAL", "Estado Destino": h.toStatus, Operador: h.user, Detalles: h.details })); exportToExcel(historyData, `Trazabilidad_Sello_${foundSeal.id}`); };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center"><div><h3 className="text-2xl font-black text-custom-blue uppercase tracking-tighter italic">Consulta de Trazabilidad</h3><p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Sede Actual: <span className="text-custom-blue">{user.city}</span></p></div>{foundSeal && <button onClick={handleDownloadHistory} className="flex items-center gap-2 bg-emerald-600 text-white px-5 py-3 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-emerald-700 transition-all"><ICONS.Excel className="w-4 h-4" /> Descargar Historial</button>}</div>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-2xl"><form onSubmit={handleSearch} className="flex gap-4"><div className="flex-1 relative"><div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400"><ICONS.Search className="w-5 h-5" /></div><input type="text" placeholder="Ingrese el ID del Sello" className="w-full pl-12 pr-4 py-4 border border-gray-200 bg-gray-50 rounded-xl text-lg font-mono font-bold text-custom-blue focus:bg-white focus:ring-4 focus:ring-blue-100 outline-none transition-all uppercase" value={searchId} onChange={(e) => setSearchId(e.target.value.toUpperCase())} /></div><button type="submit" className="bg-custom-blue text-white px-8 py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-custom-blue-dark transition-all shadow-lg">Consultar</button></form></div>
      {foundSeal ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 animate-in slide-in-from-bottom-4">
          <div className="lg:col-span-1 space-y-6"><div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm"><h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Estado en {user.city}</h4><div className={`p-4 rounded-xl border-2 text-center font-black text-lg uppercase mb-4 transition-all duration-500 ${getStatusStyles(foundSeal.status).split('icon-bg-')[0]}`}>{foundSeal.status.replace('_', ' ')}</div><div className="space-y-4 pt-4 border-t border-slate-100 text-[11px]"><div className="flex justify-between"><span className="font-black text-slate-400 uppercase">Tipo:</span><span className="font-bold text-black uppercase">{foundSeal.type}</span></div><div className="flex justify-between"><span className="font-black text-slate-400 uppercase">Alta:</span><span className="font-bold text-black">{foundSeal.creationDate}</span></div><div className="flex justify-between"><span className="font-black text-slate-400 uppercase">Sede:</span><span className="font-bold text-custom-blue uppercase">{foundSeal.city}</span></div></div></div></div>
          <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-8 shadow-sm"><h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8">Bitácora de Eventos (Historial)</h4><div className="relative space-y-8 before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-200 before:to-transparent">{foundSeal.history.map((h, i) => (<div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active"><div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 border-white text-white shadow-md shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 transition-colors duration-500 ${getStatusIconColor(h.toStatus)}`}><ICONS.History className="w-5 h-5" /></div><div className={`w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white p-4 rounded-xl border-l-4 shadow-sm transition-all hover:shadow-md ${h.toStatus === SealStatus.DESTRUIDO ? 'border-red-500 bg-red-50/20' : h.toStatus === SealStatus.SALIDA_FABRICA ? 'border-gray-400 bg-gray-50/50' : h.toStatus === SealStatus.NO_INSTALADO ? 'border-stone-400 bg-stone-50' : 'border-custom-blue'}`}><div className="flex items-center justify-between space-x-2 mb-1"><div className={`font-black uppercase text-[10px] transition-colors ${getStatusTextColor(h.toStatus)}`}>{h.toStatus.replace('_', ' ')}</div><time className="font-mono text-[9px] text-slate-400 font-bold">{h.date}</time></div><div className="text-slate-700 text-[10px] font-medium italic leading-relaxed">{h.details}</div><div className="mt-2 pt-2 border-t border-slate-50 text-[9px] font-black text-slate-400 uppercase">Operador: {h.user}</div></div></div>))}</div></div>
        </div>
      ) : <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl p-20 text-center space-y-4"><div className="bg-white w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-sm"><ICONS.Search className="w-8 h-8 text-blue-100" /></div><p className="font-black text-slate-300 uppercase text-xs tracking-[0.3em]">Esperando ID de Precinto en Sede {user.city}</p></div>}
    </div>
  );
};

const MovementsView: React.FC<{ 
  seals: Seal[]; 
  onInitiateMove: (s: Seal[], status: SealStatus) => void; 
  user: User;
}> = ({ seals, onInitiateMove, user }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const foundSeals = useMemo(() => { if (!searchQuery) return []; const ids = searchQuery.split(',').map(id => id.trim().toUpperCase()).filter(id => id !== ''); return seals.filter(s => ids.includes(s.id) && s.city === user.city); }, [seals, searchQuery, user.city]);
  const allFound = useMemo(() => { if (!searchQuery) return false; const ids = searchQuery.split(',').map(id => id.trim().toUpperCase()).filter(id => id !== ''); return foundSeals.length === ids.length; }, [foundSeals, searchQuery]);
  const commonStatus = useMemo(() => { if (foundSeals.length === 0) return null; const status = foundSeals[0].status; return foundSeals.every(s => s.status === status) ? status : 'MIXED'; }, [foundSeals]);
  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); const ids = searchQuery.split(',').map(id => id.trim().toUpperCase()).filter(id => id !== ''); if (foundSeals.length < ids.length) alert(`Uno o más precintos no existen en la sede ${user.city} o han sido escritos incorrectamente.`); else if (commonStatus === 'MIXED') alert(`Error de Lote: Todos los precintos deben estar en el mismo estado para realizar una operación masiva.`); };
  const isFinal = commonStatus === SealStatus.SALIDA_FABRICA || commonStatus === SealStatus.DESTRUIDO;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-end"><div><h3 className="text-2xl font-black text-custom-blue uppercase tracking-tighter italic">Movimiento Operativo</h3><p className="text-xs text-slate-500 font-bold uppercase tracking-widest mt-1">Gestión Centralizada - Sede: <span className="text-custom-blue">{user.city}</span></p></div></div>
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-2xl"><form onSubmit={handleSearch} className="flex flex-col gap-4"><label className="text-[10px] font-black text-custom-blue uppercase tracking-widest">Ingrese IDs separados por coma para gestión masiva</label><div className="flex gap-4"><div className="flex-1 relative"><div className="absolute inset-y-0 left-4 flex items-center pointer-events-none text-slate-400"><ICONS.Move className="w-5 h-5" /></div><input type="text" placeholder="Ej: BOG-001, BOG-002, BOG-003" className="w-full pl-12 pr-4 py-4 border border-gray-200 bg-gray-50 rounded-xl text-lg font-mono font-bold text-custom-blue focus:bg-white focus:ring-4 focus:ring-blue-100 outline-none transition-all uppercase" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} /></div><button type="submit" className="bg-custom-blue text-white px-8 py-4 rounded-xl font-black text-xs uppercase tracking-widest hover:bg-custom-blue-dark transition-all shadow-lg">Validar Lote</button></div></form></div>
      {foundSeals.length > 0 && allFound && commonStatus !== 'MIXED' ? (
        <div className="max-w-2xl bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden animate-in zoom-in duration-200">
          <div className="bg-custom-blue px-8 py-4 text-white flex justify-between items-center"><p className="text-[10px] font-black uppercase tracking-widest">{foundSeals.length > 1 ? `OPERACIÓN POR LOTE (${foundSeals.length} UNIDADES)` : `ID: ${foundSeals[0].id}`}</p><p className="text-[10px] font-black uppercase tracking-widest">Sede: {user.city}</p></div>
          <div className="p-8 space-y-6"><div className="text-center space-y-2"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Estado Actual del Lote</p><div className={`p-3 rounded-2xl border-2 text-center font-black text-xl uppercase shadow-inner transition-all duration-500 ${getStatusStyles(commonStatus as SealStatus).split('icon-bg-')[0]}`}>{(commonStatus as SealStatus).replace('_', ' ')}</div></div>
            {!isFinal ? (
              <div className="space-y-4"><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-center">Seleccione el Cambio de Estado para el Lote</p><div className="grid grid-cols-1 gap-2">
                  {(commonStatus === SealStatus.ENTRADA_INVENTARIO || commonStatus === SealStatus.NO_INSTALADO) && <button onClick={() => onInitiateMove(foundSeals, SealStatus.ASIGNADO)} className="bg-sky-600 text-white p-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg hover:scale-[1.01] transition-all">Asignar Lote a Pedido</button>}
                  {commonStatus === SealStatus.ASIGNADO && <button onClick={() => onInitiateMove(foundSeals, SealStatus.ENTREGADO)} className="bg-amber-600 text-white p-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg hover:scale-[1.01] transition-all">Entregar Despacho del Lote</button>}
                  {commonStatus === SealStatus.ENTREGADO && (<><button onClick={() => onInitiateMove(foundSeals, SealStatus.INSTALADO)} className="bg-orange-600 text-white p-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg hover:scale-[1.01] transition-all">Confirmar Instalación de Lote</button><button onClick={() => onInitiateMove(foundSeals, SealStatus.NO_INSTALADO)} className="bg-stone-500 text-white p-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg hover:scale-[1.01] transition-all">Reportar No Instalado (Reutilizar)</button></>)}
                  {commonStatus === SealStatus.INSTALADO && <button onClick={() => onInitiateMove(foundSeals, SealStatus.SALIDA_FABRICA)} className="bg-gray-500 text-white p-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg hover:scale-[1.01] transition-all">Liberar Salida Lote (Final)</button>}
                  <button onClick={() => onInitiateMove(foundSeals, SealStatus.DESTRUIDO)} className="bg-red-600 text-white p-4 rounded-xl font-black text-xs uppercase tracking-widest shadow-lg hover:scale-[1.01] transition-all">Reportar Lote Destruido</button>
                </div></div>
            ) : <div className="bg-slate-50 p-6 rounded-2xl border-2 border-dashed border-slate-200 text-center space-y-4 animate-in zoom-in"><p className={`text-sm font-black uppercase tracking-widest transition-colors ${getStatusTextColor(commonStatus as SealStatus)}`}>Ciclo operativo finalizado ({(commonStatus as SealStatus).replace('_', ' ')})</p></div>}
          </div>
        </div>
      ) : searchQuery !== '' ? <div className="bg-red-50 border-2 border-dashed border-red-200 rounded-3xl p-12 text-center space-y-4"><div className="bg-white w-16 h-16 rounded-full flex items-center justify-center mx-auto shadow-sm"><ICONS.StopCircle className="w-8 h-8 text-red-500" /></div><div className="space-y-1"><p className="font-black text-red-800 uppercase text-xs tracking-widest">Inconsistencia en el Lote</p><p className="text-[10px] text-red-600 font-bold uppercase tracking-wider">Verifique que todos los precintos existan y tengan el mismo estado actual.</p></div></div> : <div className="bg-gray-50 border-2 border-dashed border-gray-200 rounded-3xl p-20 text-center space-y-4"><div className="bg-white w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-sm"><ICONS.Move className="w-8 h-8 text-blue-100" /></div><p className="font-black text-slate-300 uppercase text-xs tracking-[0.3em]">Ingrese IDs para iniciar gestión masiva en {user.city}</p></div>}
    </div>
  );
};

const LoginScreen: React.FC<{ onLogin: (user: User) => void; users: User[]; settings: AppSettings }> = ({ onLogin, users, settings }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const handleLogin = (e: React.FormEvent) => { e.preventDefault(); const user = users.find(u => u.username.toLowerCase() === username.toLowerCase()); if (user) { if (user.password === password) onLogin(user); else setError('Contraseña incorrecta.'); } else setError('Usuario no encontrado o no asignado a ninguna sede.'); };
  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200">
        <div className="bg-custom-blue p-12 text-center text-white"><div className="bg-white/10 w-24 h-24 rounded-3xl flex items-center justify-center mx-auto mb-6 overflow-hidden backdrop-blur-md border border-white/20 shadow-2xl">{settings.logo ? <img src={settings.logo} className="w-full h-full object-cover" /> : <ICONS.Truck className="w-10 h-10" />}</div><h1 className="text-3xl font-black tracking-tight uppercase italic">{settings.title}</h1></div>
        <form onSubmit={handleLogin} className="p-10 space-y-8">{error && <div className="bg-red-50 text-red-700 p-4 rounded-xl text-[11px] font-bold border border-red-200 animate-pulse">{error}</div>}<div className="space-y-2"><label className="text-[10px] font-black text-custom-blue uppercase tracking-widest">Identificación de Usuario</label><input type="text" required className="w-full border border-slate-200 bg-slate-50 rounded-xl px-5 py-4 focus:bg-white focus:ring-4 focus:ring-blue-50 font-bold text-custom-blue outline-none transition-all uppercase" value={username} onChange={(e) => setUsername(e.target.value.toUpperCase())} /></div><div className="space-y-2"><label className="text-[10px] font-black text-custom-blue uppercase tracking-widest">Contraseña de Acceso</label><input type="password" required className="w-full border border-slate-200 bg-slate-50 rounded-xl px-5 py-4 focus:bg-white focus:ring-4 focus:ring-blue-50 font-bold text-custom-blue outline-none transition-all" value={password} onChange={(e) => setPassword(e.target.value)} /></div><button type="submit" className="w-full bg-custom-blue text-white font-black py-5 rounded-xl hover:bg-black transition-all shadow-2xl uppercase tracking-[0.2em] text-xs">Validar Credenciales</button></form>
      </div>
    </div>
  );
};

// --- MAIN APP ---

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [seals, setSeals] = useState<Seal[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [cities, setCities] = useState<string[]>(['BOGOTÁ', 'MEDELLÍN', 'CALI', 'BARRANQUILLA']);
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
  
  const [appSettings, setAppSettings] = useState<AppSettings>({ title: 'SelloMaster Pro', logo: null, sealTypes: ['Botella', 'Cable', 'Plástico', 'Metálico'] });
  const fileExcelRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const savedUser = localStorage.getItem('selloUser');
    const savedSettings = localStorage.getItem('selloSettings');
    const savedSeals = localStorage.getItem('selloData');
    const savedUsers = localStorage.getItem('selloUsers');
    const savedCities = localStorage.getItem('selloCities');
    if (savedSettings) setAppSettings(JSON.parse(savedSettings));
    if (savedCities) setCities(JSON.parse(savedCities));
    setSeals(savedSeals ? JSON.parse(savedSeals) : MOCK_DATA);
    setUsers(savedUsers ? JSON.parse(savedUsers) : MOCK_USERS);
    if (savedUser) setCurrentUser(JSON.parse(savedUser));
  }, []);

  useEffect(() => { if (seals.length > 0) localStorage.setItem('selloData', JSON.stringify(seals)); }, [seals]);
  useEffect(() => { if (users.length > 0) localStorage.setItem('selloUsers', JSON.stringify(users)); }, [users]);
  useEffect(() => { localStorage.setItem('selloCities', JSON.stringify(cities)); }, [cities]);
  useEffect(() => { if (toast) { const timer = setTimeout(() => setToast(null), 4000); return () => clearTimeout(timer); } }, [toast]);

  const handleRestoreDB = (data: any) => {
    if (data.seals) localStorage.setItem('selloData', JSON.stringify(data.seals));
    if (data.users) localStorage.setItem('selloUsers', JSON.stringify(data.users));
    if (data.cities) localStorage.setItem('selloCities', JSON.stringify(data.cities));
    if (data.settings) localStorage.setItem('selloSettings', JSON.stringify(data.settings));
  };

  const handleLogin = (u: User) => { setCurrentUser(u); localStorage.setItem('selloUser', JSON.stringify(u)); setIsSearchPerformed(false); setFilteredSeals([]); };
  const handleLogout = () => { setCurrentUser(null); localStorage.removeItem('selloUser'); setActiveTab('dashboard'); setIsSearchPerformed(false); setIsDeleteModeActive(false); };
  const handleUpdateSettings = (s: AppSettings) => { setAppSettings(s); localStorage.setItem('selloSettings', JSON.stringify(s)); };
  const handleAddUser = (u: User) => setUsers([...users, u]);
  const handleUpdateUser = (updatedUser: User) => { setUsers(users.map(u => u.id === updatedUser.id ? updatedUser : u)); if (currentUser?.id === updatedUser.id) { setCurrentUser(updatedUser); localStorage.setItem('selloUser', JSON.stringify(updatedUser)); } };
  const handleDeleteUser = (id: string) => setUsers(users.filter(u => u.id !== id));
  const handleAddCity = (city: string) => setCities([...cities, city]);
  const handleDeleteCity = (city: string) => { if (users.some(u => u.city === city)) return alert('No se puede eliminar una ciudad que tiene usuarios asociados.'); setCities(cities.filter(c => c !== city)); };
  const handleUpdateCity = (oldCity: string, newCity: string) => { setCities(cities.map(c => c === oldCity ? newCity : c)); setUsers(users.map(u => u.city === oldCity ? { ...u, city: newCity } : u)); setSeals(seals.map(s => s.city === oldCity ? { ...s, city: newCity } : s)); };
  const checkSealDuplicate = (id: string, type: string) => seals.some(s => s.id === id && s.type === type);
  const handleAddSeal = (s: Seal) => { if (checkSealDuplicate(s.id, s.type)) { setToast({message: "Sello ya existe, favor verificar", type: 'error'}); return false; } const sealWithCity = { ...s, city: currentUser?.city || 'Sede Central' }; setSeals([sealWithCity, ...seals]); return true; };
  const handleDeleteSeal = (id: string) => { if (window.confirm(`¿Está seguro de eliminar permanentemente el sello ${id}? Esta acción no se puede deshacer.`)) { const updatedSeals = seals.filter(s => s.id !== id); setSeals(updatedSeals); if (isSearchPerformed) setFilteredSeals(filteredSeals.filter(s => s.id !== id)); setToast({message: "Sello eliminado con éxito", type: 'success'}); } };
  const handleInventoryDownload = () => { const exportData = (isSearchPerformed ? filteredSeals : seals).filter(s => s.city === currentUser?.city).map(s => ({ ID: s.id, Estado: s.status, Tipo: s.type, "Fecha Alta": s.creationDate, "Último Movimiento": s.lastMovement, Operador: s.entryUser })); exportToExcel(exportData, `Inventario_SelloMaster_${currentUser?.city}`); };
  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (!file || !currentUser) return; const reader = new FileReader(); reader.onload = (evt) => { const bstr = evt.target?.result; const wb = XLSX.read(bstr, { type: 'binary' }); const wsname = wb.SheetNames[0]; const ws = wb.Sheets[wsname]; const data = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][]; const now = new Date().toLocaleString('es-ES'); const newSealsBatch: Seal[] = []; let duplicateCount = 0; for (let i = 1; i < data.length; i++) { const sealId = String(data[i][0] || '').toUpperCase(); const sealType = appSettings.sealTypes[0] || 'Genérico'; if (sealId) { const isDuplicate = seals.some(s => s.id === sealId && s.type === sealType) || newSealsBatch.some(s => s.id === sealId && s.type === sealType); if (!isDuplicate) newSealsBatch.push({ id: sealId, type: sealType, status: SealStatus.ENTRADA_INVENTARIO, creationDate: now, lastMovement: now, entryUser: currentUser.fullName, orderNumber: '-', containerId: '-', notes: 'Carga Masiva Excel', city: currentUser.city, history: [{ date: now, fromStatus: null, toStatus: SealStatus.ENTRADA_INVENTARIO, user: currentUser.fullName, details: `Alta masiva Excel en ${currentUser.city}` }] }); else duplicateCount++; } } if (newSealsBatch.length > 0) { setSeals([...newSealsBatch, ...seals]); let msg = "SELLOS CARGADOS EXITOSAMENTE"; if (duplicateCount > 0) msg += ` (${duplicateCount} omitidos por duplicidad)`; setToast({message: msg, type: duplicateCount > 0 ? 'error' : 'success'}); } else if (duplicateCount > 0) setToast({message: "Sello ya existe, favor verificar (Todos los registros del Excel ya existen)", type: 'error'}); else alert("No se encontraron registros válidos en el archivo."); }; reader.readAsBinaryString(file); if (fileExcelRef.current) fileExcelRef.current.value = ''; };
  const handleInventorySearch = (filters: FilterOptions) => { if (!currentUser) return; let result = seals.filter(s => s.city === currentUser.city); if (filters.idSello) result = result.filter(s => s.id.toLowerCase().includes(filters.idSello.toLowerCase())); if (filters.estado) result = result.filter(s => s.status === filters.estado); if (filters.tipo !== 'Todos') result = result.filter(s => s.type === filters.tipo); setFilteredSeals(result); setIsSearchPerformed(true); };
  const initiateMovement = (selectedBatch: Seal[], status: SealStatus) => { setSelectedSeals(selectedBatch); setTargetStatus(status); setMoveData({ requester: '', observations: '', vehiclePlate: '', trailerContainer: '', deliveredSub: '' }); setIsMoveFormOpen(true); };
  const handleConfirmMovement = () => { if (selectedSeals.length === 0 || !targetStatus) return; let details = ""; if (targetStatus === SealStatus.ASIGNADO || targetStatus === SealStatus.ENTREGADO) { if (!moveData.requester) return alert("El Usuario Receptor es obligatorio."); details = `USUARIO RECEPTOR: ${moveData.requester} | OBSERVACIONES: ${moveData.observations || 'Sin observaciones'}`; } else if (targetStatus === SealStatus.INSTALADO) { if (!moveData.vehiclePlate || !moveData.trailerContainer) return alert("Placa y Contenedor obligatorios."); details = `PLACA VEHÍCULO: ${moveData.vehiclePlate} | TRAILER/CONTENEDOR: ${moveData.trailerContainer} | OBSERVACIONES: ${moveData.observations || 'Sin observaciones'}`; } else if (targetStatus === SealStatus.NO_INSTALADO) { if (!moveData.deliveredSub) return alert("El campo 'Entregado sub:' es obligatorio."); details = `ENTREGADO SUB: ${moveData.deliveredSub} | OBSERVACIONES: ${moveData.observations || 'Sin observaciones'}`; } else if (targetStatus === SealStatus.DESTRUIDO) { if (!moveData.observations) return alert("El Motivo es obligatorio."); details = `MOTIVO DESTRUCCIÓN: ${moveData.observations}`; } else details = moveData.observations || `Cambio de estado a ${targetStatus.replace('_', ' ')}`; const now = new Date().toLocaleString('es-ES'); const selectedIds = selectedSeals.map(s => s.id); const updated = seals.map(s => { if (selectedIds.includes(s.id)) return { ...s, status: targetStatus, lastMovement: now, entryUser: currentUser?.fullName || 'SISTEMA', history: [{ date: now, fromStatus: s.status, toStatus: targetStatus, user: currentUser?.fullName || 'SISTEMA', details: selectedSeals.length > 1 ? `[MASIVO] ${details}` : details }, ...s.history] }; return s; }); setSeals(updated); if (isSearchPerformed) setFilteredSeals(prev => prev.map(s => { const match = updated.find(u => u.id === s.id); return match ? match : s; })); setIsMoveFormOpen(false); setSelectedSeals([]); setTargetStatus(null); setToast({message: "Movimiento procesado correctamente", type: 'success'}); };

  if (!currentUser) return <LoginScreen onLogin={handleLogin} users={users} settings={appSettings} />;

  return (
    <div className="min-h-screen bg-slate-50 flex text-slate-900 font-sans">
      {toast && <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] animate-in slide-in-from-top-4"><div className={`px-8 py-4 rounded-2xl shadow-2xl border flex items-center gap-3 ${toast.type === 'success' ? 'bg-emerald-600 border-emerald-500 text-white' : 'bg-red-600 border-red-500 text-white'}`}><div className="w-6 h-6 rounded-full bg-white/20 flex items-center justify-center">{toast.type === 'success' ? <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"/></svg> : <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M6 18L18 6M6 6l12 12"/></svg>}</div><p className="text-xs font-black uppercase tracking-widest">{toast.message}</p></div></div>}
      <aside className="w-64 bg-slate-900 text-white h-screen fixed left-0 top-0 overflow-y-auto hidden md:block border-r border-slate-800 shadow-2xl z-20"><div className="p-8 h-full flex flex-col"><div className="flex items-center gap-4 mb-12"><div className="bg-custom-blue p-2 rounded-xl shadow-lg w-11 h-11 flex items-center justify-center shrink-0 border border-blue-400/30">{appSettings.logo ? <img src={appSettings.logo} className="w-full h-full object-cover" /> : <ICONS.Truck className="text-white" />}</div><h1 className="text-sm font-black tracking-tight leading-tight uppercase italic text-white">{appSettings.title}</h1></div><nav className="space-y-1.5 flex-1"><button onClick={() => setActiveTab('dashboard')} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all font-bold text-xs uppercase tracking-widest ${activeTab === 'dashboard' ? 'bg-custom-blue text-white shadow-xl translate-x-1' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><ICONS.Dashboard className="w-5 h-5" /> Dashboard</button><button onClick={() => { setActiveTab('inventory'); setIsSearchPerformed(false); }} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all font-bold text-xs uppercase tracking-widest ${activeTab === 'inventory' ? 'bg-custom-blue text-white shadow-xl translate-x-1' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><ICONS.Search className="w-5 h-5" /> Inventario</button><button onClick={() => setActiveTab('movements')} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all font-bold text-xs uppercase tracking-widest ${activeTab === 'movements' ? 'bg-custom-blue text-white shadow-xl translate-x-1' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><ICONS.Move className="w-5 h-5" /> Movimientos</button><button onClick={() => setActiveTab('traceability')} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all font-bold text-xs uppercase tracking-widest ${activeTab === 'traceability' ? 'bg-custom-blue text-white shadow-xl translate-x-1' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><ICONS.History className="w-5 h-5" /> Trazabilidad</button>{currentUser.role === UserRole.ADMIN && (<><div className="h-px bg-slate-800 my-6"></div><button onClick={() => setActiveTab('users')} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all font-bold text-xs uppercase tracking-widest ${activeTab === 'users' ? 'bg-custom-blue text-white shadow-xl translate-x-1' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><ICONS.Users className="w-5 h-5" /> Usuarios</button><button onClick={() => setActiveTab('cities')} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all font-bold text-xs uppercase tracking-widest ${activeTab === 'cities' ? 'bg-custom-blue text-white shadow-xl translate-x-1' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><ICONS.Map className="w-5 h-5" /> Ciudades</button><button onClick={() => setActiveTab('settings')} className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl transition-all font-bold text-xs uppercase tracking-widest ${activeTab === 'settings' ? 'bg-custom-blue text-white shadow-xl translate-x-1' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924-1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/></svg> Configuración</button></>)}</nav><div className="pt-8 border-t border-slate-800 mt-auto text-center"><p className="text-[10px] font-black uppercase text-slate-500 mb-2">Sede: {currentUser.city}</p><button onClick={handleLogout} className="w-full flex items-center justify-center gap-2 px-3 py-3 rounded-lg text-red-400 hover:text-white transition-all text-[10px] font-black uppercase tracking-widest hover:bg-red-900/20"><ICONS.Logout className="w-4 h-4" /> Salir del Sistema</button></div></div></aside>
      <main className="flex-1 md:ml-64 pt-16 min-w-0 bg-slate-50 min-h-screen"><header className="h-16 bg-white border-b border-slate-200 fixed top-0 right-0 left-0 md:left-64 z-10 flex items-center justify-between px-10"><h2 className="text-sm font-black text-custom-blue uppercase tracking-[0.2em]">{activeTab.toUpperCase()}</h2><div className="flex items-center gap-6">{currentUser.role === UserRole.ADMIN && activeTab === 'inventory' && <div className="flex items-center gap-3 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200"><span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Modo Seguro (Borrado)</span><button onClick={() => setIsDeleteModeActive(!isDeleteModeActive)} className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isDeleteModeActive ? 'bg-red-500' : 'bg-slate-200'}`}><span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isDeleteModeActive ? 'translate-x-5' : 'translate-x-0'}`}></span></button></div>}<div className="flex items-center gap-3"><span className="text-[10px] font-bold text-custom-blue uppercase tracking-widest">Sede {currentUser.city}</span><div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse border border-white"></div></div></div></header>
        <div className="p-8 sm:p-12">
          {activeTab === 'dashboard' && <DashboardView seals={seals} user={currentUser} cities={cities} />}
          {activeTab === 'inventory' && <div className="space-y-8 animate-in fade-in duration-500"><div className="flex flex-wrap items-center justify-between bg-white p-5 rounded-3xl border border-slate-200 shadow-sm gap-4"><div className="flex flex-wrap gap-4"><button onClick={() => setIsNewSealModalOpen(true)} className="bg-custom-blue text-white px-7 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-custom-blue-dark transition-all shadow-lg">Nuevo Sello</button><button onClick={() => fileExcelRef.current?.click()} className="bg-white text-custom-blue border border-custom-blue px-7 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 flex items-center gap-2"><ICONS.Import className="w-4 h-4" /> Carga Masiva</button><button onClick={() => setIsSearchModalOpen(true)} className="bg-white text-custom-blue border border-custom-blue px-7 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 flex items-center gap-2"><ICONS.Search className="w-4 h-4" /> Búsqueda</button></div><button onClick={handleInventoryDownload} className="bg-emerald-600 text-white px-7 py-4 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-700 transition-all flex items-center gap-2 shadow-lg"><ICONS.Excel className="w-4 h-4" /> Exportar Inventario</button><input ref={fileExcelRef} type="file" accept=".xlsx, .xls, .csv" onChange={handleExcelImport} className="hidden" /></div>{isSearchPerformed ? <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-300"><div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-slate-200 shadow-sm"><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Resultados: <span className="text-custom-blue">{filteredSeals.length} precintos encontrados</span></p><button onClick={() => setIsSearchPerformed(false)} className="text-[10px] font-black text-custom-blue uppercase hover:underline">Limpiar Resultados</button></div><div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden overflow-x-auto"><table className="w-full text-left text-[11px]"><thead className="bg-slate-50 border-b border-slate-100 text-slate-500 font-black uppercase tracking-widest"><tr><th className="px-8 py-6 text-custom-blue">ID Sello</th><th className="px-8 py-6 text-custom-blue">Estado Logístico</th><th className="px-8 py-6 text-custom-blue">Tipo</th><th className="px-8 py-6 text-custom-blue">Operador</th><th className="px-8 py-6 text-custom-blue">Ciudad</th>{isDeleteModeActive && currentUser.role === UserRole.ADMIN && <th className="px-8 py-6 text-red-600 text-right">Acciones</th>}</tr></thead><tbody className="divide-y divide-slate-100 font-bold text-slate-900">{filteredSeals.length > 0 ? filteredSeals.map(s => (<tr key={s.id} onClick={() => !isDeleteModeActive && initiateMovement([s], s.status)} className={`group transition-all ${!isDeleteModeActive ? 'hover:bg-blue-50/30 cursor-pointer' : ''}`}><td className="px-8 py-5 font-black font-mono text-[14px] text-custom-blue group-hover:text-blue-600 uppercase">{s.id}</td><td className="px-8 py-5"><span className={`px-2.5 py-1 rounded-lg border text-[9px] font-black uppercase tracking-widest transition-all ${getStatusStyles(s.status).split('icon-bg-')[0]}`}>{s.status.replace('_', ' ')}</span></td><td className="px-8 py-5 text-slate-700 font-bold uppercase text-[9px]">{s.type}</td><td className="px-8 py-5 uppercase font-black text-[10px] text-slate-700">{s.entryUser}</td><td className="px-8 py-5 text-custom-blue font-black text-[10px]">{s.city}</td>{isDeleteModeActive && currentUser.role === UserRole.ADMIN && (<td className="px-8 py-5 text-right"><button onClick={(e) => { e.stopPropagation(); handleDeleteSeal(s.id); }} className="p-2 text-red-400 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors" title="Eliminar Precinto Permanentemente"><ICONS.Trash className="w-4 h-4" /></button></td>)}</tr>)) : (<tr><td colSpan={isDeleteModeActive ? 6 : 5} className="px-8 py-20 text-center font-bold text-slate-400 uppercase tracking-widest">No se encontraron registros</td></tr>)}</tbody></table></div></div> : <div className="bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl p-32 text-center space-y-4"><div className="bg-white w-20 h-20 rounded-full flex items-center justify-center mx-auto shadow-sm"><ICONS.Search className="w-8 h-8 text-blue-100 opacity-50" /></div><p className="font-black text-slate-300 uppercase text-xs tracking-[0.3em]">Utilice el botón "Búsqueda" para consultar el inventario de {currentUser.city}</p></div>}</div>}
          {activeTab === 'movements' && <MovementsView seals={seals} onInitiateMove={initiateMovement} user={currentUser} />}
          {activeTab === 'traceability' && <TraceabilityView seals={seals} user={currentUser} />}
          {activeTab === 'users' && currentUser.role === UserRole.ADMIN && <UserManagement users={users} cities={cities} onAddUser={handleAddUser} onUpdateUser={handleUpdateUser} onDeleteUser={handleDeleteUser} />}
          {activeTab === 'cities' && currentUser.role === UserRole.ADMIN && <CityManagement cities={cities} onAddCity={handleAddCity} onDeleteCity={handleDeleteCity} onUpdateCity={handleUpdateCity} />}
          {activeTab === 'settings' && currentUser.role === UserRole.ADMIN && <SettingsView settings={appSettings} onUpdate={handleUpdateSettings} onRestoreDB={handleRestoreDB} />}
        </div>
      </main>

      {/* Modal Alta Precinto */}
      {isNewSealModalOpen && <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"><div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-slate-200"><div className="bg-custom-blue px-6 py-5 text-white font-black text-xs uppercase tracking-widest">Alta de Precinto - {currentUser.city}</div><div className="p-8 space-y-6"><div className="space-y-1.5"><label className="text-[10px] font-black text-custom-blue uppercase tracking-widest">ID Precinto</label><input type="text" className="w-full border border-slate-200 bg-slate-50 rounded-xl p-3.5 text-sm font-mono font-bold text-custom-blue outline-none uppercase" placeholder="Ej: BOG-4432" id="new-seal-id" /></div><div className="space-y-1.5"><label className="text-[10px] font-black text-custom-blue uppercase tracking-widest">Tipo</label><select className="w-full border border-slate-200 bg-slate-50 rounded-xl p-3.5 text-sm font-bold text-custom-blue outline-none appearance-none" id="new-seal-type">{appSettings.sealTypes.map(t => <option key={t} value={t}>{t}</option>)}</select></div><div className="flex gap-4 pt-6"><button onClick={() => setIsNewSealModalOpen(false)} className="flex-1 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Cancelar</button><button onClick={() => { const idEl = document.getElementById('new-seal-id') as HTMLInputElement; const typeEl = document.getElementById('new-seal-type') as HTMLSelectElement; const id = idEl.value.toUpperCase(); const type = typeEl.value; if (!id) return alert('ID obligatorio'); const now = new Date().toLocaleString('es-ES'); const success = handleAddSeal({ id, type, status: SealStatus.ENTRADA_INVENTARIO, creationDate: now, lastMovement: now, entryUser: currentUser.fullName, orderNumber: '-', containerId: '-', notes: 'Alta Sede', city: currentUser.city, history: [{ date: now, fromStatus: null, toStatus: SealStatus.ENTRADA_INVENTARIO, user: currentUser.fullName, details: `Alta inicial en ${currentUser.city}` }] }); if (success) { setIsNewSealModalOpen(false); setToast({message: "PRECINTO REGISTRADO", type: 'success'}); } }} className="flex-1 bg-custom-blue text-white py-4 rounded-xl font-black text-[10px] uppercase shadow-xl hover:bg-black">Registrar</button></div></div></div></div>}

      {/* Modal de Movimiento */}
      {isMoveFormOpen && selectedSeals.length > 0 && <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"><div className="bg-white rounded-3xl shadow-2xl w-full max-w-lg border border-gray-200 overflow-hidden animate-in zoom-in duration-200"><div className="bg-custom-blue px-8 py-5 flex justify-between items-center text-white"><h3 className="text-[10px] font-black uppercase tracking-widest">{selectedSeals.length > 1 ? `GESTIÓN MASIVA: ${selectedSeals.length} UNIDADES` : `GESTIONAR: ${selectedSeals[0].id}`}</h3><button onClick={() => setIsMoveFormOpen(false)}>✕</button></div><div className="p-8 space-y-6">{targetStatus === selectedSeals[0].status ? <div className="space-y-4 text-center"><p className={`text-[10px] font-black uppercase tracking-widest ${getStatusTextColor(selectedSeals[0].status)}`}>Estado Actual: {selectedSeals[0].status.replace('_', ' ')}</p><div className="grid grid-cols-1 gap-2">{(selectedSeals[0].status === SealStatus.ENTRADA_INVENTARIO || selectedSeals[0].status === SealStatus.NO_INSTALADO) && <button onClick={() => setTargetStatus(SealStatus.ASIGNADO)} className="bg-sky-600 text-white p-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest">Mover Lote a Asignado</button>}{selectedSeals[0].status === SealStatus.ASIGNADO && <button onClick={() => setTargetStatus(SealStatus.ENTREGADO)} className="bg-amber-600 text-white p-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest">Mover Lote a Entregado</button>}{selectedSeals[0].status === SealStatus.ENTREGADO && (<><button onClick={() => setTargetStatus(SealStatus.INSTALADO)} className="bg-orange-600 text-white p-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest">Mover Lote a Instalado</button><button onClick={() => setTargetStatus(SealStatus.NO_INSTALADO)} className="bg-stone-500 text-white p-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest">Reportar No Instalado</button></>)}{selectedSeals[0].status === SealStatus.INSTALADO && <button onClick={() => setTargetStatus(SealStatus.SALIDA_FABRICA)} className="bg-gray-500 text-white p-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest">Mover Lote a Salida</button>}<button onClick={() => setTargetStatus(SealStatus.DESTRUIDO)} className="bg-red-600 text-white p-3.5 rounded-xl font-black text-[10px] uppercase tracking-widest">Mover Lote a Destruido</button></div></div> : <div className="space-y-6"><div className="flex items-center justify-center gap-3 bg-slate-50 p-4 rounded-xl"><span className={`text-[9px] font-black uppercase px-2 py-1 rounded border ${getStatusStyles(selectedSeals[0].status).split('icon-bg-')[0]}`}>{selectedSeals[0].status.replace('_', ' ')}</span><ICONS.ArrowRightTiny className="text-slate-300" /><span className={`text-[9px] font-black uppercase px-2 py-1 rounded border shadow-sm ${targetStatus ? getStatusStyles(targetStatus).split('icon-bg-')[0] : ''}`}>{targetStatus?.replace('_', ' ')}</span></div><div className="max-h-[45vh] overflow-y-auto pr-2 space-y-4 custom-scrollbar">{(targetStatus === SealStatus.ASIGNADO || targetStatus === SealStatus.ENTREGADO) ? <div className="space-y-1.5"><label className="text-[10px] font-black text-custom-blue uppercase tracking-widest">Usuario Receptor:</label><input type="text" className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm font-bold text-custom-blue outline-none uppercase" value={moveData.requester} onChange={e => setMoveData({...moveData, requester: e.target.value.toUpperCase()})} placeholder="Nombre del receptor" /></div> : targetStatus === SealStatus.INSTALADO ? <><div className="space-y-1.5"><label className="text-[10px] font-black text-custom-blue uppercase tracking-widest">Placa Vehículo:</label><input type="text" className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm font-black font-mono text-custom-blue outline-none uppercase" value={moveData.vehiclePlate} onChange={e => setMoveData({...moveData, vehiclePlate: e.target.value.toUpperCase()})} placeholder="ABC-123" /></div><div className="space-y-1.5"><label className="text-[10px] font-black text-custom-blue uppercase tracking-widest">Trailer/Contenedor:</label><input type="text" className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm font-black font-mono text-custom-blue outline-none uppercase" value={moveData.trailerContainer} onChange={e => setMoveData({...moveData, trailerContainer: e.target.value.toUpperCase()})} placeholder="Nro Contenedor" /></div></> : targetStatus === SealStatus.NO_INSTALADO ? <div className="space-y-1.5"><label className="text-[10px] font-black text-custom-blue uppercase tracking-widest">Entregado sub:</label><input type="text" required className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm font-bold text-custom-blue outline-none uppercase" value={moveData.deliveredSub} onChange={e => setMoveData({...moveData, deliveredSub: e.target.value.toUpperCase()})} placeholder="Receptor secundario" /></div> : null}<div className="space-y-1.5"><label className="text-[10px] font-black text-custom-blue uppercase tracking-widest">Observaciones:</label><textarea className="w-full border border-slate-200 bg-slate-50 rounded-xl px-4 py-3 text-sm font-bold text-custom-blue outline-none h-24 uppercase" value={moveData.observations} onChange={e => setMoveData({...moveData, observations: e.target.value.toUpperCase()})} placeholder="Detalles..." /></div></div><div className="flex gap-4 pt-4"><button type="button" onClick={() => setTargetStatus(selectedSeals[0]?.status || null)} className="flex-1 py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest">Atrás</button><button onClick={handleConfirmMovement} className={`flex-1 text-white py-4 rounded-xl font-black text-[10px] uppercase shadow-xl ${targetStatus === SealStatus.DESTRUIDO ? 'bg-red-600' : 'bg-custom-blue'}`}>Confirmar Lote</button></div></div>}</div></div></div>}
      <style>{`.custom-scrollbar::-webkit-scrollbar { width: 4px; } .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; } .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }`}</style>
      <InventorySearchModal isOpen={isSearchModalOpen} onClose={() => setIsSearchModalOpen(false)} onSearch={handleInventorySearch} sealTypes={appSettings.sealTypes} />
    </div>
  );
}
