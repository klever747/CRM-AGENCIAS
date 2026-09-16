import React, { useState, useEffect, useMemo } from 'react';
import { 
  MapPin, Search, Plus, Edit2, Trash2, X, Check, Eye, 
  ChevronLeft, ChevronRight, LayoutGrid, Table, ArrowUpRight, 
  DollarSign, Building, Sparkles, Filter, RefreshCw, AlertCircle, Layers,
  Copy, Calculator, Percent, Tag, ShieldCheck, CheckCircle2, SlidersHorizontal, ArrowRight, ChevronDown
} from 'lucide-react';
import { formatCurrency } from '../lib/utils';
import { Urbanizacion, LotCategory } from '../types';
import { subscribeToDbSync } from '../lib/databaseSync';

const INITIAL_FALLBACK: Urbanizacion[] = [
  { 
    id: 1, 
    name: 'Vista del Valle', 
    code: 'VDV-01', 
    city: 'Quito', 
    status: 'Activo', 
    available: 38, 
    refPrice: 180, 
    description: 'Exclusiva urbanización en el valle de Cumbayá con vistas panorámicas y alta plusvalía.',
    categories: [
      { name: 'Premium - Vista', cost: 210, area: 220, term: 12, down: 25000 },
      { name: 'Comercial - Calle', cost: 160, area: 200, term: 12, down: 5000 },
      { name: 'Estándar - Interior', cost: 110, area: 200, term: 60, down: 3000 }
    ]
  },
  { 
    id: 2, 
    name: 'Ciudad Verde Norte', 
    code: 'CVN-02', 
    city: 'Quito', 
    status: 'Activo', 
    available: 22, 
    refPrice: 165, 
    description: 'Desarrollo eco-amigable con ciclovías, parques comunales y seguridad privada 24/7.',
    categories: [
      { name: 'Premium', cost: 195, area: 240, term: 36, down: 5000 },
      { name: 'General', cost: 160, area: 190, term: 36, down: 3000 }
    ]
  },
  { 
    id: 3, 
    name: 'Terrazas del Río', 
    code: 'TDR-03', 
    city: 'Guayaquil', 
    status: 'Activo', 
    available: 54, 
    refPrice: 145, 
    description: 'Urbanización frente a la ribera con club náutico, canchas deportivas y piscina comunal.',
    categories: [
      { name: 'Única', cost: 145, area: 250, term: 48, down: 4000 }
    ]
  },
  { 
    id: 4, 
    name: 'Bosques de Samborondón', 
    code: 'BDS-04', 
    city: 'Samborondón', 
    status: 'Preventa', 
    available: 70, 
    refPrice: 210, 
    description: 'Macro-loteo privado de lujo con doble control de acceso en km 10.5 de Samborondón.',
    categories: [
      { name: 'Premium Esquinero', cost: 230, area: 220, term: 36, down: 10000 },
      { name: 'Interior Estándar', cost: 185, area: 210, term: 36, down: 5000 }
    ]
  }
];

const PAGE_SIZE = 15;

export function computeCategoryFinancials(cat: Partial<LotCategory>): LotCategory {
  const cost = Math.max(0, Number(cat.costo_m2 ?? cat.cost) || 0);
  const area = Math.max(1, Number(cat.area_minima ?? cat.area) || 200);
  const valContado = Math.round(cost * area * 100) / 100;
  const esContado = Boolean(cat.es_contado);

  if (esContado) {
    return {
      id: cat.id,
      id_categoria: cat.id_categoria,
      name: (cat.name || 'RESIDENCIAL').trim().toUpperCase(),
      cost,
      costo_m2: cost,
      area,
      area_minima: area,
      term: 0,
      meses_plazo: 0,
      anios_plazo: 0,
      down: valContado,
      entrada_minima: valContado,
      es_contado: true,
      plazo_entrada: 'CONTADO',
      valor_contado: valContado,
      saldo: 0,
      tasa_financiamiento: 0,
      cuota: 0,
      valor_final: valContado
    };
  }

  const term = Math.max(1, Number(cat.meses_plazo ?? cat.term) || 36);
  const anios = Number(cat.anios_plazo) || (term > 0 ? term / 12 : 3);
  let down = cat.entrada_minima !== undefined 
    ? Number(cat.entrada_minima) 
    : (cat.down !== undefined ? Number(cat.down) : 4000);
  if (down < 0) down = 0;
  if (down > valContado) down = valContado;
  
  const saldo = Math.max(0, valContado - down);
  const tasa = cat.tasa_financiamiento !== undefined ? Number(cat.tasa_financiamiento) : 8.00;
  
  // Formula: Cuota mensual = (Saldo * (1 + (Tasa * Años / 100))) / Meses
  const interesTotal = saldo * ((tasa * anios) / 100);
  const cuota = term > 0 ? Math.round((saldo + interesTotal) / term) : 0;
  const valFinal = Math.round(down + (cuota * term));

  return {
    id: cat.id,
    id_categoria: cat.id_categoria,
    name: (cat.name || 'RESIDENCIAL').trim().toUpperCase(),
    cost,
    costo_m2: cost,
    area,
    area_minima: area,
    term,
    meses_plazo: term,
    anios_plazo: anios,
    down,
    entrada_minima: down,
    es_contado: false,
    plazo_entrada: cat.plazo_entrada || '2 MESES',
    valor_contado: valContado,
    saldo,
    tasa_financiamiento: tasa,
    cuota,
    valor_final: valFinal
  };
}

const DEFAULT_CATEGORY: LotCategory = computeCategoryFinancials({
  name: 'RESIDENCIAL',
  cost: 140,
  costo_m2: 140,
  area: 200,
  area_minima: 200,
  es_contado: false,
  meses_plazo: 36,
  term: 36,
  anios_plazo: 3,
  entrada_minima: 4000,
  down: 4000,
  plazo_entrada: '2 MESES',
  tasa_financiamiento: 8.00
});

export default function ProyectosView() {
  const [urbanizaciones, setUrbanizaciones] = useState<Urbanizacion[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedUrbanizacionId, setSelectedUrbanizacionId] = useState<number | null>(null);

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCity, setFilterCity] = useState('Todas');
  const [filterStatus, setFilterStatus] = useState('Todos');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [currentPage, setCurrentPage] = useState(1);

  // Modal Create / Edit State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Urbanizacion | null>(null);
  const [saving, setSaving] = useState(false);

  // Available Normalized Categories for Autocomplete
  const [availableCategories, setAvailableCategories] = useState<string[]>([
    'COMERCIAL',
    'RESIDENCIAL',
    'PREMIUM',
    'SECUNDARIO',
    'PRINCIPAL',
    'COMERCIAL 2',
    'RESIDENCIAL 1',
    'RESIDENCIAL 2',
    'COMERCIAL O PREMIUM',
    'PRINCIPAL Y SECUNDARIO',
    'PRINCIPAL Y ESQUINERO',
    'COMERCIAL Y ESQUINERO',
    'FRENTE AL RIO',
    'RESERVADO',
    'INTERMEDIO',
    'ASFALTO',
    'CAMPESINO'
  ]);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    city: 'Santo Domingo',
    status: 'Activo',
    available: 35,
    refPrice: 140,
    description: '',
    categories: [{ ...DEFAULT_CATEGORY }]
  });

  // Fetch Urbanizaciones from API
  const fetchUrbanizaciones = async () => {
    try {
      setRefreshing(true);
      const res = await fetch('/api/urbanizaciones');
      if (!res.ok) throw new Error('Error al cargar urbanizaciones');
      const data = await res.json();
      if (Array.isArray(data)) {
        setUrbanizaciones(data);
      }
    } catch (error) {
      console.warn('API error, using initial fallback:', error);
      if (urbanizaciones.length === 0) {
        setUrbanizaciones(INITIAL_FALLBACK);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Fetch Normalized Categories
  const fetchCategorias = async () => {
    try {
      const res = await fetch('/api/categorias');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          const names = data.map((c: any) => c.nombre).filter(Boolean);
          setAvailableCategories(prev => Array.from(new Set([...prev, ...names])));
        }
      }
    } catch (err) {
      console.warn('Could not fetch categories list:', err);
    }
  };

  useEffect(() => {
    fetchUrbanizaciones();
    fetchCategorias();

    const unsubscribe = subscribeToDbSync(['proyectos', 'all'], () => {
      fetchUrbanizaciones();
      fetchCategorias();
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Filtered list
  const filteredList = useMemo(() => {
    return urbanizaciones.filter(item => {
      const matchSearch = searchTerm === '' || 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchCity = filterCity === 'Todas' || item.city.toLowerCase() === filterCity.toLowerCase();
      const matchStatus = filterStatus === 'Todos' || item.status.toLowerCase() === filterStatus.toLowerCase();

      return matchSearch && matchCity && matchStatus;
    });
  }, [urbanizaciones, searchTerm, filterCity, filterStatus]);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterCity, filterStatus]);

  // Pagination calculations (15 records per page)
  const totalPages = Math.max(1, Math.ceil(filteredList.length / PAGE_SIZE));
  const effectivePage = Math.min(currentPage, totalPages);
  const startIndex = (effectivePage - 1) * PAGE_SIZE;
  const endIndex = Math.min(startIndex + PAGE_SIZE, filteredList.length);
  const paginatedList = filteredList.slice(startIndex, endIndex);

  // Available unique cities for filter dropdown
  const uniqueCities = useMemo(() => {
    const set = new Set<string>(['Santo Domingo', 'La Concordia']);
    urbanizaciones.forEach(u => {
      if (u.city) set.add(u.city);
    });
    return Array.from(set);
  }, [urbanizaciones]);

  // KPI calculations
  const totalDisponibles = useMemo(() => {
    return urbanizaciones.reduce((acc, curr) => acc + (Number(curr.available) || 0), 0);
  }, [urbanizaciones]);

  const activeCount = useMemo(() => {
    return urbanizaciones.filter(u => u.status === 'Activo').length;
  }, [urbanizaciones]);

  // Open Create Modal
  const handleOpenCreate = () => {
    setEditingItem(null);
    const nextCode = `PRJ-${String(urbanizaciones.length + 1).padStart(2, '0')}`;
    const initialCat1 = computeCategoryFinancials({
      name: 'RESIDENCIAL',
      costo_m2: 140,
      cost: 140,
      area_minima: 200,
      area: 200,
      es_contado: false,
      meses_plazo: 36,
      term: 36,
      anios_plazo: 3,
      entrada_minima: 4000,
      down: 4000,
      plazo_entrada: '2 MESES',
      tasa_financiamiento: 8.00
    });
    const initialCat2 = computeCategoryFinancials({
      name: 'COMERCIAL',
      costo_m2: 175,
      cost: 175,
      area_minima: 200,
      area: 200,
      es_contado: false,
      meses_plazo: 36,
      term: 36,
      anios_plazo: 3,
      entrada_minima: 5000,
      down: 5000,
      plazo_entrada: '2 MESES',
      tasa_financiamiento: 8.00
    });

    setFormData({
      name: '',
      code: nextCode,
      city: 'Santo Domingo',
      status: 'Activo',
      available: 35,
      refPrice: 140,
      description: '',
      categories: [initialCat1, initialCat2]
    });
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEdit = (u: Urbanizacion, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEditingItem(u);
    const validCity = (u.city === 'La Concordia' || u.city === 'Santo Domingo') ? u.city : 'Santo Domingo';
    const loadedCategories = Array.isArray(u.categories) && u.categories.length > 0 
      ? u.categories.map(c => computeCategoryFinancials(c)) 
      : [{ ...DEFAULT_CATEGORY }];

    setFormData({
      name: u.name,
      code: u.code,
      city: validCity,
      status: u.status,
      available: u.available,
      refPrice: u.refPrice || u.ref_price || 0,
      description: u.description || '',
      categories: loadedCategories
    });
    setIsModalOpen(true);
  };

  // Save (Create / Update)
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    setSaving(true);
    try {
      const payload = {
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        city: formData.city.trim(),
        status: formData.status,
        available: Number(formData.available) || 0,
        refPrice: Number(formData.refPrice) || 0,
        description: formData.description.trim(),
        categories: formData.categories
      };

      if (editingItem) {
        // Update in PostgreSQL
        const res = await fetch(`/api/urbanizaciones/${editingItem.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Error al actualizar');
        await fetchUrbanizaciones();
      } else {
        // Create in PostgreSQL
        const res = await fetch('/api/urbanizaciones', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });
        if (!res.ok) throw new Error('Error al crear');
        await fetchUrbanizaciones();
      }

      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving urbanizacion:', error);
      // Local optimistic fallback
      if (editingItem) {
        setUrbanizaciones(prev => prev.map(item => 
          item.id === editingItem.id ? { ...item, ...formData, id: editingItem.id } : item
        ));
      } else {
        const fallbackNew: Urbanizacion = {
          id: Date.now(),
          ...formData
        };
        setUrbanizaciones(prev => [...prev, fallbackNew]);
      }
      setIsModalOpen(false);
    } finally {
      setSaving(false);
    }
  };

  // Toggle status (Activo / Inactivo) in PostgreSQL
  const handleToggleStatus = async (id: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      const res = await fetch(`/api/urbanizaciones/${id}/toggle`, { method: 'PATCH' });
      const data = await res.json();
      if (data.success) {
        await fetchUrbanizaciones();
      } else {
        // Toggle locally
        setUrbanizaciones(prev => prev.map(u => {
          if (u.id === id) {
            const nextSt = u.status === 'Activo' ? 'Inactivo' : 'Activo';
            return { ...u, status: nextSt };
          }
          return u;
        }));
      }
    } catch (err) {
      setUrbanizaciones(prev => prev.map(u => {
        if (u.id === id) {
          const nextSt = u.status === 'Activo' ? 'Inactivo' : 'Activo';
          return { ...u, status: nextSt };
        }
        return u;
      }));
    }
  };

  // Delete Urbanización from PostgreSQL Database
  const handleDeleteUrbanizacion = async (id: number, name: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!window.confirm(`¿Estás seguro de eliminar la urbanización "${name}" de la base de datos? Esta acción es permanente.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/urbanizaciones/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchUrbanizaciones();
        if (selectedUrbanizacionId === id) {
          setSelectedUrbanizacionId(null);
        }
      } else {
        alert('Error al eliminar urbanización de la base de datos.');
      }
    } catch (err) {
      console.error('Error al eliminar urbanización:', err);
    }
  };

  // Category helpers for the normalized modal form
  const handleAddCategory = () => {
    const newCat = computeCategoryFinancials({
      name: 'RESIDENCIAL',
      costo_m2: formData.refPrice || 140,
      cost: formData.refPrice || 140,
      area_minima: 200,
      area: 200,
      es_contado: false,
      meses_plazo: 36,
      term: 36,
      anios_plazo: 3,
      entrada_minima: 4000,
      down: 4000,
      plazo_entrada: '2 MESES',
      tasa_financiamiento: 8.00
    });
    setFormData(prev => ({
      ...prev,
      categories: [...prev.categories, newCat]
    }));
  };

  const handleDuplicateCategory = (index: number) => {
    const source = formData.categories[index];
    const duplicated = computeCategoryFinancials({
      ...source,
      id: undefined,
      id_categoria: undefined,
      name: `${source.name} (COPIA)`
    });
    setFormData(prev => ({
      ...prev,
      categories: [...prev.categories, duplicated]
    }));
  };

  const handleUpdateCategory = (index: number, field: string, value: any) => {
    setFormData(prev => {
      const updated = [...prev.categories];
      const target = { ...updated[index] };

      if (field === 'name') {
        target.name = value;
      } else if (field === 'es_contado') {
        target.es_contado = Boolean(value);
        if (target.es_contado) {
          target.plazo_entrada = 'CONTADO';
          target.term = 0;
          target.meses_plazo = 0;
          target.anios_plazo = 0;
          target.tasa_financiamiento = 0;
        } else {
          target.plazo_entrada = '2 MESES';
          target.term = 36;
          target.meses_plazo = 36;
          target.anios_plazo = 3;
          target.tasa_financiamiento = 8.00;
        }
      } else if (field === 'plazo_entrada') {
        target.plazo_entrada = value;
      } else if (field === 'meses_plazo' || field === 'term') {
        const m = Math.max(0, Number(value) || 0);
        target.meses_plazo = m;
        target.term = m;
        target.anios_plazo = m > 0 ? m / 12 : 0;
      } else if (field === 'costo_m2' || field === 'cost') {
        const c = Math.max(0, Number(value) || 0);
        target.costo_m2 = c;
        target.cost = c;
      } else if (field === 'area_minima' || field === 'area') {
        const a = Math.max(1, Number(value) || 0);
        target.area_minima = a;
        target.area = a;
      } else if (field === 'entrada_minima' || field === 'down') {
        const d = Math.max(0, Number(value) || 0);
        target.entrada_minima = d;
        target.down = d;
      } else if (field === 'tasa_financiamiento') {
        target.tasa_financiamiento = Math.max(0, Number(value) || 0);
      }

      updated[index] = computeCategoryFinancials(target);
      return { ...prev, categories: updated };
    });
  };

  const handleSetQuickEntradaPercent = (index: number, pct: number) => {
    setFormData(prev => {
      const updated = [...prev.categories];
      const target = { ...updated[index] };
      const valContado = (target.costo_m2 || target.cost || 0) * (target.area_minima || target.area || 0);
      const calculatedDown = Math.round(valContado * (pct / 100));
      target.entrada_minima = calculatedDown;
      target.down = calculatedDown;
      updated[index] = computeCategoryFinancials(target);
      return { ...prev, categories: updated };
    });
  };

  const handleRemoveCategory = (index: number) => {
    if (formData.categories.length <= 1) return;
    setFormData(prev => ({
      ...prev,
      categories: prev.categories.filter((_, i) => i !== index)
    }));
  };

  const handleAutoCalcRefPrice = () => {
    if (formData.categories.length > 0) {
      const costs = formData.categories.map(c => Number(c.costo_m2 || c.cost) || 0).filter(c => c > 0);
      if (costs.length > 0) {
        setFormData(prev => ({ ...prev, refPrice: Math.min(...costs) }));
      }
    }
  };

  // DETAIL VIEW FOR SELECTED URBANIZACIÓN
  if (selectedUrbanizacionId !== null) {
    const proj = urbanizaciones.find(p => p.id === selectedUrbanizacionId);
    return (
      <div className="space-y-6 animate-in fade-in duration-200">
        <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setSelectedUrbanizacionId(null)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition"
            >
              <ChevronLeft size={14} />
              Volver a Urbanizaciones
            </button>
            <div>
              <h2 className="text-lg font-bold text-slate-800 font-display flex items-center gap-2">
                {proj?.name}
                <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-100 text-slate-600 rounded">
                  {proj?.code}
                </span>
              </h2>
              <p className="text-xs text-slate-400 flex items-center gap-1">
                <MapPin size={12} className="text-rose-500" />
                <span>{proj?.city} &bull; {proj?.available} lotes disponibles &bull; Ref. ${proj?.refPrice || proj?.ref_price} / m²</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => proj && handleOpenEdit(proj)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg shadow-sm transition"
            >
              <Edit2 size={13} className="text-slate-500" />
              Editar Urbanización
            </button>
            <button
              onClick={(e) => proj && handleDeleteUrbanizacion(proj.id, proj.name, e)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-50 border border-red-200 hover:bg-red-100 text-red-700 text-xs font-bold rounded-lg shadow-sm transition"
              title="Eliminar de la base de datos"
            >
              <Trash2 size={13} className="text-red-600" />
              Eliminar
            </button>
            <span className={`text-[11px] px-3 py-1 rounded-full uppercase font-bold border ${
              proj?.status === 'Activo' 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200' 
                : proj?.status === 'Preventa'
                ? 'bg-amber-50 text-amber-800 border-amber-200'
                : 'bg-slate-100 text-slate-600 border-slate-200'
            }`}>
              {proj?.status}
            </span>
          </div>
        </div>

        {proj?.description && (
          <div className="bg-rose-50/50 border border-rose-100/70 p-4 rounded-xl text-xs text-slate-600">
            <span className="font-bold text-rose-800">Descripción del desarrollo: </span>
            {proj.description}
          </div>
        )}

        <div className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-slate-800 font-display">Categorías y Tipologías de Lote</h3>
              <p className="text-xs text-slate-400">Planes financieros sugeridos, entradas mínimas y costos por metro cuadrado</p>
            </div>
            <span className="text-xs font-semibold text-slate-500 bg-slate-50 px-2.5 py-1 rounded-md border border-slate-100">
              {proj?.categories?.length || 0} configuraciones registradas
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-500 border-collapse">
              <thead className="bg-slate-50 text-[10px] uppercase text-slate-400 font-bold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Categoría / Tipología</th>
                  <th className="py-3 px-4 text-center">Costo m² ($ USD)</th>
                  <th className="py-3 px-4 text-center">Área Mínima</th>
                  <th className="py-3 px-4 text-center">Entrada Mínima ($ USD)</th>
                  <th className="py-3 px-4 text-center">Plazo Sugerido</th>
                  <th className="py-3 px-4 text-right">Precio Contado ($ USD)</th>
                </tr>
              </thead>
              <tbody>
                {proj?.categories && proj.categories.length > 0 ? (
                  proj.categories.map((c, idx) => {
                    const costVal = c.cost || c.costo_m2 || 0;
                    const areaVal = c.area || c.area_minima || 0;
                    const contado = c.valor_contado || (costVal * areaVal);
                    const downVal = c.down ?? c.entrada_minima ?? 0;
                    const termVal = c.term ?? c.meses_plazo ?? 0;
                    return (
                      <tr key={idx} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition">
                        <td className="py-3.5 px-4 font-bold text-slate-800 flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-rose-500"></span>
                          <span>{c.name}</span>
                          {c.es_contado && (
                            <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 font-bold border border-emerald-200">
                              Contado
                            </span>
                          )}
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-slate-700">${costVal} USD</td>
                        <td className="py-3.5 px-4 text-center font-semibold text-slate-700">{areaVal} m²</td>
                        <td className="py-3.5 px-4 text-center font-black text-rose-700">{formatCurrency(downVal, true)}</td>
                        <td className="py-3.5 px-4 text-center font-medium text-slate-500">
                          {c.es_contado ? 'Al Contado' : `${termVal} meses`}
                        </td>
                        <td className="py-3.5 px-4 text-right font-black text-slate-800">{formatCurrency(contado, true)}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-400 italic">
                      No hay categorías específicas configuradas para esta urbanización.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // MAIN VIEW
  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-slate-800 font-display">Urbanizaciones / Proyectos</h2>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Base de Datos Conectada
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Cartera inmobiliaria cargada y sincronizada directamente con la tabla urbanizaciones de la base de datos
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Refresh Button */}
          <button
            onClick={fetchUrbanizaciones}
            disabled={refreshing}
            title="Actualizar catálogo"
            className="p-2.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl shadow-sm transition disabled:opacity-50"
          >
            <RefreshCw size={15} className={refreshing ? 'animate-spin text-rose-600' : ''} />
          </button>

          {/* ADD URBANIZACIÓN BUTTON (MANDATORY REQUEST) */}
          <button
            onClick={handleOpenCreate}
            id="btn-agregar-urbanizacion"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-rose-700 hover:bg-rose-800 active:bg-rose-900 text-white text-xs font-bold rounded-xl shadow-sm hover:shadow transition"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Agregar Urbanización</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white border border-slate-100 rounded-xl p-3.5 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Urbanizaciones</p>
          <p className="text-xl font-black text-slate-800 mt-1">{urbanizaciones.length}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">En catálogo nacional</p>
        </div>

        <div className="bg-white border border-slate-100 rounded-xl p-3.5 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Lotes Disponibles</p>
          <p className="text-xl font-black text-rose-700 mt-1">{totalDisponibles}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Unidades listas para venta</p>
        </div>

        <div className="bg-white border border-slate-100 rounded-xl p-3.5 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Activas / Preventa</p>
          <p className="text-xl font-black text-emerald-600 mt-1">{activeCount}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Comercialización abierta</p>
        </div>

        <div className="bg-white border border-slate-100 rounded-xl p-3.5 shadow-sm">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Ciudades con Presencia</p>
          <p className="text-xl font-black text-indigo-600 mt-1">{uniqueCities.length}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">{uniqueCities.slice(0, 3).join(', ') || 'Nacional'}</p>
        </div>
      </div>

      {/* Control Bar: Search, Filters & View Toggle */}
      <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* SEARCH INPUT (MANDATORY REQUEST) */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={15} />
            <input
              type="text"
              id="input-buscar-urbanizaciones"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar urbanización por nombre, código, ciudad o descripción..."
              className="w-full pl-9 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 transition"
            />
            {searchTerm && (
              <button 
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5"
                title="Limpiar búsqueda"
              >
                <X size={13} />
              </button>
            )}
          </div>

          {/* FILTERS & VIEW TOGGLE */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Filter by City */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
              <MapPin size={13} className="text-slate-400" />
              <select
                id="select-filtro-ciudad"
                value={filterCity}
                onChange={(e) => setFilterCity(e.target.value)}
                className="bg-transparent text-xs text-slate-700 font-medium focus:outline-none cursor-pointer pr-1"
              >
                <option value="Todas">Todas las ciudades</option>
                {uniqueCities.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            {/* Filter by Status */}
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs">
              <Filter size={13} className="text-slate-400" />
              <select
                id="select-filtro-estado"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-transparent text-xs text-slate-700 font-medium focus:outline-none cursor-pointer pr-1"
              >
                <option value="Todos">Todos los estados</option>
                <option value="Activo">Activo</option>
                <option value="Preventa">Preventa</option>
                <option value="Inactivo">Inactivo</option>
              </select>
            </div>

            {/* Clear filters if active */}
            {(searchTerm || filterCity !== 'Todas' || filterStatus !== 'Todos') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFilterCity('Todas');
                  setFilterStatus('Todos');
                }}
                className="text-xs text-rose-700 hover:text-rose-800 font-bold px-2 py-1 hover:bg-rose-50 rounded-lg transition"
              >
                Limpiar
              </button>
            )}

            {/* View Mode Toggle: Grid vs Table */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 ml-auto">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                  viewMode === 'grid' 
                    ? 'bg-white text-slate-800 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
                title="Vista en Tarjetas"
              >
                <LayoutGrid size={14} />
                <span className="hidden sm:inline text-[11px]">Tarjetas</span>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg text-xs font-semibold flex items-center gap-1 transition ${
                  viewMode === 'table' 
                    ? 'bg-white text-slate-800 shadow-sm' 
                    : 'text-slate-500 hover:text-slate-700'
                }`}
                title="Vista en Tabla (15 por página)"
              >
                <Table size={14} />
                <span className="hidden sm:inline text-[11px]">Tabla (15)</span>
              </button>
            </div>
          </div>
        </div>

        {/* Counter Legend in Live View */}
        <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-50">
          <div>
            Mostrando <strong className="text-slate-700 font-bold">{filteredList.length === 0 ? 0 : startIndex + 1}</strong> a <strong className="text-slate-700 font-bold">{endIndex}</strong> de <strong className="text-slate-700 font-bold">{filteredList.length}</strong> urbanizaciones
            {filteredList.length !== urbanizaciones.length && (
              <span className="text-slate-400 ml-1">
                (filtradas de un total de {urbanizaciones.length})
              </span>
            )}
          </div>
          {totalPages > 1 && (
            <div className="text-[11px] text-slate-400">
              Página {effectivePage} de {totalPages}
            </div>
          )}
        </div>
      </div>

      {/* CONTENT: GRID OR TABLE VIEW */}
      {filteredList.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-xl p-12 text-center shadow-sm">
          <Building className="mx-auto text-slate-300 mb-3" size={40} />
          <h3 className="text-sm font-bold text-slate-700">No se encontraron urbanizaciones</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            No hay registros que coincidan con la búsqueda o los filtros seleccionados.
          </p>
          <button
            onClick={() => {
              setSearchTerm('');
              setFilterCity('Todas');
              setFilterStatus('Todos');
            }}
            className="mt-4 px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition"
          >
            Restablecer filtros
          </button>
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {paginatedList.map((p) => {
            const refPriceVal = p.refPrice || p.ref_price || 0;
            return (
              <div 
                key={p.id}
                className="bg-white border border-slate-100 rounded-xl p-5 shadow-sm flex flex-col justify-between hover:border-rose-300 hover:shadow-md transition group relative"
              >
                <div>
                  {/* Top Bar: Code, Status & Edit Button */}
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase font-mono bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                      {p.code}
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase border ${
                        p.status === 'Activo' 
                          ? 'bg-emerald-50 text-emerald-800 border-emerald-100' 
                          : p.status === 'Preventa'
                          ? 'bg-amber-50 text-amber-800 border-amber-100'
                          : 'bg-slate-100 text-slate-600 border-slate-200'
                      }`}>
                        {p.status}
                      </span>

                      {/* EDIT BUTTON ON CARD (MANDATORY REQUEST) */}
                      <button
                        onClick={(e) => handleOpenEdit(p, e)}
                        title="Editar Urbanización"
                        className="p-1 text-slate-400 hover:text-rose-700 hover:bg-rose-50 rounded-md transition"
                      >
                        <Edit2 size={13} />
                      </button>

                      {/* DELETE BUTTON ON CARD */}
                      <button
                        onClick={(e) => handleDeleteUrbanizacion(p.id, p.name, e)}
                        title="Eliminar de la base de datos"
                        className="p-1 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-md transition"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  {/* Title & City */}
                  <h3 
                    onClick={() => setSelectedUrbanizacionId(p.id)}
                    className="text-sm font-bold text-slate-800 font-display mt-2.5 leading-tight group-hover:text-rose-700 transition cursor-pointer"
                  >
                    {p.name}
                  </h3>
                  <p className="text-[11px] text-slate-400 font-medium mt-1 flex items-center gap-1">
                    <MapPin size={11} className="text-rose-500 shrink-0" />
                    <span>{p.city}</span>
                  </p>

                  {p.description && (
                    <p className="text-[11px] text-slate-500 mt-2 line-clamp-2 leading-relaxed">
                      {p.description}
                    </p>
                  )}
                </div>

                {/* Footer Info: Lots & Price & Action */}
                <div className="pt-4 border-t border-slate-50 mt-4 space-y-3">
                  <div className="flex justify-between items-center text-xs">
                    <div>
                      <p className="text-[9px] text-slate-400 uppercase font-bold">Lotes Disp.</p>
                      <p className="font-black text-slate-700">{p.available} unidades</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[9px] text-slate-400 uppercase font-bold">Ref. m²</p>
                      <p className="font-black text-rose-700">${refPriceVal} USD</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 pt-1">
                    <button
                      onClick={() => setSelectedUrbanizacionId(p.id)}
                      className="flex-1 py-1.5 bg-slate-50 hover:bg-rose-50 hover:text-rose-700 text-slate-600 text-[11px] font-bold rounded-lg border border-slate-100 transition flex items-center justify-center gap-1"
                    >
                      <Layers size={12} />
                      Ver Categorías ({p.categories?.length || 0})
                    </button>
                    <button
                      onClick={(e) => handleOpenEdit(p, e)}
                      className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-[11px] font-bold rounded-lg transition"
                      title="Editar parámetros"
                    >
                      Editar
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW (15 RECORDS PER PAGE) */
        <div className="bg-white border border-slate-100 rounded-xl shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left text-slate-500">
              <thead className="bg-slate-50 text-[10px] uppercase text-slate-400 font-bold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Código</th>
                  <th className="py-3 px-4">Urbanización</th>
                  <th className="py-3 px-4">Ciudad</th>
                  <th className="py-3 px-4 text-center">Estado</th>
                  <th className="py-3 px-4 text-center">Lotes Disponibles</th>
                  <th className="py-3 px-4 text-right">Precio Ref. m²</th>
                  <th className="py-3 px-4 text-center">Categorías</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {paginatedList.map((p) => {
                  const refPriceVal = p.refPrice || p.ref_price || 0;
                  return (
                    <tr key={p.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50/50 transition">
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-500 text-[11px]">
                        {p.code}
                      </td>
                      <td className="py-3.5 px-4">
                        <div 
                          onClick={() => setSelectedUrbanizacionId(p.id)}
                          className="font-bold text-slate-800 hover:text-rose-700 cursor-pointer transition"
                        >
                          {p.name}
                        </div>
                        {p.description && (
                          <div className="text-[10px] text-slate-400 truncate max-w-xs">{p.description}</div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-600">
                        <span className="flex items-center gap-1">
                          <MapPin size={11} className="text-slate-400" />
                          {p.city}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={(e) => handleToggleStatus(p.id, e)}
                          title="Haga clic para alternar estado"
                          className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase transition ${
                            p.status === 'Activo'
                              ? 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                              : p.status === 'Preventa'
                              ? 'bg-amber-50 text-amber-800 hover:bg-amber-100'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          {p.status}
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-center font-bold text-slate-700">
                        {p.available} unds
                      </td>
                      <td className="py-3.5 px-4 text-right font-black text-rose-700">
                        ${refPriceVal} USD
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => setSelectedUrbanizacionId(p.id)}
                          className="text-[11px] font-bold text-slate-600 hover:text-rose-700 bg-slate-50 hover:bg-rose-50 px-2 py-1 rounded border border-slate-100 transition"
                        >
                          {p.categories?.length || 0} tipos
                        </button>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* EDIT BUTTON (MANDATORY REQUEST) */}
                          <button
                            onClick={(e) => handleOpenEdit(p, e)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 text-xs font-bold rounded-lg border border-slate-200 shadow-sm transition"
                            title="Editar Urbanización"
                          >
                            <Edit2 size={12} />
                            <span>Editar</span>
                          </button>
                          <button
                            onClick={(e) => handleDeleteUrbanizacion(p.id, p.name, e)}
                            className="p-1 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-lg border border-slate-200 transition"
                            title="Eliminar de la base de datos"
                          >
                            <Trash2 size={12} />
                          </button>
                          <button
                            onClick={() => setSelectedUrbanizacionId(p.id)}
                            className="p-1 text-slate-400 hover:text-slate-700 transition"
                            title="Ver detalles"
                          >
                            <Eye size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* PAGINATION CONTROLS (15 PER PAGE) */}
      {totalPages > 1 && (
        <div className="bg-white border border-slate-100 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            Página <strong className="text-slate-800">{effectivePage}</strong> de <strong className="text-slate-800">{totalPages}</strong> &bull; Mostrando {startIndex + 1} a {endIndex} de {filteredList.length} urbanizaciones (15 por página)
          </p>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={effectivePage === 1}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 transition"
            >
              <ChevronLeft size={14} />
              Anterior
            </button>

            <div className="flex items-center gap-1 px-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                <button
                  key={pageNum}
                  onClick={() => setCurrentPage(pageNum)}
                  className={`w-7 h-7 rounded-lg text-xs font-bold transition ${
                    effectivePage === pageNum
                      ? 'bg-rose-700 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {pageNum}
                </button>
              ))}
            </div>

            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={effectivePage === totalPages}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-lg border border-slate-200 transition"
            >
              Siguiente
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* CREATE / EDIT URBANIZACIÓN MODAL (NUEVA FORMA NORMALIZADA) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl flex flex-col max-h-[92vh] my-auto animate-in zoom-in-95 duration-150 border border-slate-200 overflow-hidden">
            {/* Modal Header (Pinned) */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0 bg-white">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-rose-50 text-rose-700 rounded-xl border border-rose-100">
                  <Building size={20} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base sm:text-lg font-bold text-slate-800 font-display">
                      {editingItem ? 'Editar Urbanización / Proyecto' : 'Agregar Nueva Urbanización'}
                    </h3>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
                      Estructura Relacional
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {editingItem 
                      ? 'Actualice los datos maestros del proyecto y sus planes de financiamiento normalizados' 
                      : 'Registre un nuevo proyecto y configure sus planes de financiamiento y tipologías de lote'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} className="flex flex-col flex-1 overflow-hidden">
              {/* Scrollable Form Body */}
              <div className="overflow-y-auto px-6 py-5 space-y-6 flex-1">
                {/* SECCIÓN 1: DATOS GENERALES DEL PROYECTO */}
                <div className="bg-slate-50/70 border border-slate-200/80 rounded-xl p-4 sm:p-5 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200/60 pb-2.5">
                    <div className="flex items-center gap-2">
                      <Layers size={15} className="text-rose-700" />
                      <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        1. Datos Generales del Proyecto
                      </h4>
                    </div>
                    <span className="text-[11px] text-slate-400">Tabla: <code className="font-mono text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">proyectos</code></span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {/* Nombre */}
                    <div className="sm:col-span-2">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Nombre del Proyecto / Urbanización <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Ej: DIVINA MISERICORDIA I, SAN RAFAEL, VENECIA II..."
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 transition"
                      />
                    </div>

                    {/* Código */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Código de Proyecto <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.code}
                        onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                        placeholder="Ej: PRJ-18"
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 font-mono font-bold focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 transition uppercase"
                      />
                    </div>

                    {/* Ciudad */}
                    <div>
                      <label htmlFor="modal-select-ciudad" className="block text-xs font-bold text-slate-700 mb-1">
                        Ciudad / Ubicación <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <select
                          id="modal-select-ciudad"
                          required
                          value={formData.city}
                          onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                          className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 transition cursor-pointer appearance-none pr-8"
                        >
                          <option value="Santo Domingo">Santo Domingo</option>
                          <option value="La Concordia">La Concordia</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-slate-400">
                          <MapPin size={13} />
                        </div>
                      </div>
                    </div>

                    {/* Estado Comercial */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Estado Comercial
                      </label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 transition"
                      >
                        <option value="Activo">Activo (En Venta)</option>
                        <option value="Preventa">Preventa (Lanzamiento)</option>
                        <option value="Inactivo">Inactivo (Cerrado/Agotado)</option>
                      </select>
                    </div>

                    {/* Lotes Disponibles */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Lotes Disponibles
                      </label>
                      <input
                        type="number"
                        min="0"
                        value={formData.available}
                        onChange={(e) => setFormData({ ...formData, available: Number(e.target.value) })}
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 transition"
                      />
                    </div>

                    {/* Precio Referencial m² */}
                    <div className="sm:col-span-2 md:col-span-3">
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-slate-700">
                          Precio Referencial por m² ($ USD)
                        </label>
                        <button
                          type="button"
                          onClick={handleAutoCalcRefPrice}
                          className="text-[10px] font-bold text-rose-700 hover:text-rose-800 hover:underline inline-flex items-center gap-1"
                        >
                          <Sparkles size={11} />
                          Auto-calcular menor m² de planes
                        </button>
                      </div>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">$</span>
                        <input
                          type="number"
                          min="1"
                          value={formData.refPrice}
                          onChange={(e) => setFormData({ ...formData, refPrice: Number(e.target.value) })}
                          placeholder="140"
                          className="w-full pl-7 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 font-bold focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 transition"
                        />
                      </div>
                    </div>

                    {/* Descripción */}
                    <div className="sm:col-span-2 md:col-span-3">
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Descripción y Atributos Comerciales
                      </label>
                      <textarea
                        rows={2}
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        placeholder="Ubicación estratégica, servicios básicos garantizados, calles afirmadas, alumbrado público..."
                        className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 transition resize-none"
                      />
                    </div>
                  </div>
                </div>

                {/* SECCIÓN 2: PLANES DE FINANCIAMIENTO Y CATEGORÍAS (TABLA: planes_financiamiento & categorias) */}
                <div className="space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <DollarSign size={15} className="text-rose-700" />
                        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                          2. Planes de Financiamiento y Categorías ({formData.categories.length})
                        </h4>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Define tipología de lote, costos m², modalidad contado/crédito, plazos y cálculo automático de cuotas
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddCategory}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-white bg-rose-700 hover:bg-rose-800 px-3 py-1.5 rounded-xl shadow-xs transition shrink-0"
                    >
                      <Plus size={13} />
                      Agregar Tipología / Plan
                    </button>
                  </div>

                  {/* Lista de Planes / Categorías */}
                  <div className="space-y-3.5">
                    {formData.categories.map((cat, idx) => {
                      const valContado = cat.valor_contado || ((cat.costo_m2 || cat.cost || 0) * (cat.area_minima || cat.area || 0));
                      const isContado = Boolean(cat.es_contado);

                      return (
                        <div 
                          key={idx} 
                          className={`rounded-xl border p-4 transition space-y-3.5 shadow-xs ${
                            isContado 
                              ? 'bg-amber-50/30 border-amber-200/80' 
                              : 'bg-white border-slate-200'
                          }`}
                        >
                          {/* Card Header */}
                          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                            <div className="flex items-center gap-2">
                              <span className="w-5 h-5 rounded-full bg-slate-800 text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                              <span className="text-xs font-bold text-slate-800 tracking-wide font-mono">
                                {cat.name || 'CATEGORÍA'}
                              </span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                isContado 
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200' 
                                  : 'bg-blue-50 text-blue-700 border border-blue-200'
                              }`}>
                                {isContado ? '💵 Venta Contado' : `💳 Crédito ${cat.meses_plazo || cat.term || 36}m`}
                              </span>
                            </div>

                            {/* Controles de Modalidad y Acciones */}
                            <div className="flex items-center gap-2">
                              {/* Modalidad Contado / Crédito Switch */}
                              <div className="inline-flex p-0.5 bg-slate-100 rounded-lg border border-slate-200">
                                <button
                                  type="button"
                                  onClick={() => handleUpdateCategory(idx, 'es_contado', false)}
                                  className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition ${
                                    !isContado
                                      ? 'bg-white text-rose-700 shadow-xs'
                                      : 'text-slate-500 hover:text-slate-800'
                                  }`}
                                >
                                  A Crédito
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateCategory(idx, 'es_contado', true)}
                                  className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition ${
                                    isContado
                                      ? 'bg-white text-amber-700 shadow-xs'
                                      : 'text-slate-500 hover:text-slate-800'
                                  }`}
                                >
                                  Al Contado
                                </button>
                              </div>

                              {/* Duplicar Plan */}
                              <button
                                type="button"
                                onClick={() => handleDuplicateCategory(idx)}
                                className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 border border-slate-200 px-2 py-1 rounded-lg transition"
                                title="Duplicar este plan para crear otra variante (ej: plazo o contado)"
                              >
                                <Copy size={12} />
                                <span className="hidden sm:inline">Duplicar</span>
                              </button>

                              {/* Eliminar Plan */}
                              {formData.categories.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveCategory(idx)}
                                  className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition"
                                  title="Eliminar tipología"
                                >
                                  <Trash2 size={13} />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Card Inputs Grid */}
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {/* Selector de Tipología / Categoría */}
                            <div>
                              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                                Tipología / Categoría <span className="text-rose-500">*</span>
                              </label>
                              <div className="relative">
                                <select
                                  required
                                  value={cat.name}
                                  onChange={(e) => handleUpdateCategory(idx, 'name', e.target.value)}
                                  className="w-full pl-3 pr-8 py-1.5 bg-slate-50/60 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 uppercase focus:outline-none focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 transition cursor-pointer appearance-none"
                                >
                                  {!cat.name && (
                                    <option value="" disabled>
                                      -- Seleccione Categoría --
                                    </option>
                                  )}
                                  {cat.name && !availableCategories.includes(cat.name) && (
                                    <option value={cat.name}>{cat.name}</option>
                                  )}
                                  {availableCategories.map((cName) => (
                                    <option key={cName} value={cName}>
                                      {cName}
                                    </option>
                                  ))}
                                </select>
                                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                              </div>
                            </div>

                            {/* Costo m² */}
                            <div>
                              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                                Costo por m² ($ USD) <span className="text-rose-500">*</span>
                              </label>
                              <div className="relative">
                                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">$</span>
                                <input
                                  type="number"
                                  min="1"
                                  required
                                  value={cat.costo_m2 ?? cat.cost ?? 140}
                                  onChange={(e) => handleUpdateCategory(idx, 'costo_m2', e.target.value)}
                                  className="w-full pl-6 pr-3 py-1.5 bg-slate-50/60 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 transition"
                                />
                              </div>
                            </div>

                            {/* Área Mínima */}
                            <div>
                              <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                                Área Mínima (m²) <span className="text-rose-500">*</span>
                              </label>
                              <div className="relative">
                                <input
                                  type="number"
                                  min="1"
                                  required
                                  value={cat.area_minima ?? cat.area ?? 200}
                                  onChange={(e) => handleUpdateCategory(idx, 'area_minima', e.target.value)}
                                  className="w-full px-3 py-1.5 bg-slate-50/60 border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:bg-white focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 transition"
                                />
                                <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-slate-400">m²</span>
                              </div>
                            </div>
                          </div>

                          {/* Campos de Financiamiento (Si no es contado) */}
                          {!isContado ? (
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1 border-t border-slate-100">
                              {/* Plazo Meses */}
                              <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                                  Plazo Meses
                                </label>
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="number"
                                    min="1"
                                    max="120"
                                    value={cat.meses_plazo ?? cat.term ?? 36}
                                    onChange={(e) => handleUpdateCategory(idx, 'meses_plazo', e.target.value)}
                                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 transition"
                                  />
                                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-1.5 rounded-lg shrink-0">
                                    {((cat.meses_plazo ?? cat.term ?? 36) / 12).toFixed(1)} años
                                  </span>
                                </div>
                              </div>

                              {/* Entrada Mínima con botones rápidos */}
                              <div>
                                <div className="flex items-center justify-between mb-1">
                                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                    Entrada Mínima ($)
                                  </label>
                                  <div className="flex items-center gap-1">
                                    <button
                                      type="button"
                                      onClick={() => handleSetQuickEntradaPercent(idx, 10)}
                                      className="text-[9px] font-bold text-slate-500 hover:text-rose-700 bg-slate-100 px-1 rounded transition"
                                      title="Calcular 10% de valor contado"
                                    >
                                      10%
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleSetQuickEntradaPercent(idx, 15)}
                                      className="text-[9px] font-bold text-slate-500 hover:text-rose-700 bg-slate-100 px-1 rounded transition"
                                      title="Calcular 15% de valor contado"
                                    >
                                      15%
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleSetQuickEntradaPercent(idx, 20)}
                                      className="text-[9px] font-bold text-slate-500 hover:text-rose-700 bg-slate-100 px-1 rounded transition"
                                      title="Calcular 20% de valor contado"
                                    >
                                      20%
                                    </button>
                                  </div>
                                </div>
                                <div className="relative">
                                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">$</span>
                                  <input
                                    type="number"
                                    min="0"
                                    max={valContado}
                                    value={cat.entrada_minima ?? cat.down ?? 4000}
                                    onChange={(e) => handleUpdateCategory(idx, 'entrada_minima', e.target.value)}
                                    className="w-full pl-6 pr-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 transition"
                                  />
                                </div>
                              </div>

                              {/* Plazo para Entrada */}
                              <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                                  Plazo Pago Entrada
                                </label>
                                <select
                                  value={cat.plazo_entrada || '2 MESES'}
                                  onChange={(e) => handleUpdateCategory(idx, 'plazo_entrada', e.target.value)}
                                  className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 transition cursor-pointer"
                                >
                                  <option value="CONTADO">CONTADO (Inmediato)</option>
                                  <option value="2 MESES">2 MESES</option>
                                  <option value="3 MESES">3 MESES</option>
                                  <option value="4 MESES">4 MESES</option>
                                  <option value="6 MESES">6 MESES</option>
                                </select>
                              </div>

                              {/* Tasa Financiamiento */}
                              <div>
                                <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1">
                                  Tasa Anual (%)
                                </label>
                                <div className="relative">
                                  <input
                                    type="number"
                                    step="0.1"
                                    min="0"
                                    value={cat.tasa_financiamiento ?? 8.00}
                                    onChange={(e) => handleUpdateCategory(idx, 'tasa_financiamiento', e.target.value)}
                                    className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-600 transition"
                                  />
                                  <Percent size={12} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                                </div>
                              </div>
                            </div>
                          ) : (
                            /* Banner informativo para modalidad Contado */
                            <div className="flex items-center gap-2 p-2.5 bg-amber-50/80 border border-amber-200 rounded-lg text-amber-800 text-xs">
                              <ShieldCheck size={16} className="shrink-0 text-amber-600" />
                              <div>
                                <span className="font-bold">Plan al Contado Directo:</span> Sin financiamiento ni cuotas mensuales. El cliente adquiere el lote por el valor total de contado.
                              </div>
                            </div>
                          )}

                          {/* Resumen Financiero Calculado en Tiempo Real */}
                          <div className="bg-slate-100/80 rounded-lg p-2.5 border border-slate-200/80 grid grid-cols-2 sm:grid-cols-5 gap-2 text-center text-xs">
                            <div>
                              <div className="text-[9px] uppercase font-bold text-slate-400">Valor Contado</div>
                              <div className="font-bold text-slate-700">${formatCurrency(valContado, true)}</div>
                            </div>
                            <div>
                              <div className="text-[9px] uppercase font-bold text-slate-400">Entrada Mínima</div>
                              <div className="font-bold text-slate-700">${formatCurrency(cat.entrada_minima ?? cat.down ?? 0, true)}</div>
                            </div>
                            <div>
                              <div className="text-[9px] uppercase font-bold text-slate-400">Saldo a Financiar</div>
                              <div className="font-bold text-slate-700">${formatCurrency(cat.saldo ?? (valContado - (cat.entrada_minima ?? cat.down ?? 0)), true)}</div>
                            </div>
                            <div>
                              <div className="text-[9px] uppercase font-bold text-slate-400">Cuota Mensual</div>
                              <div className="font-bold text-rose-700 font-mono">
                                {isContado ? 'Sin Cuota' : `$${formatCurrency(cat.cuota ?? 0, true)}/mes`}
                              </div>
                            </div>
                            <div className="col-span-2 sm:col-span-1 border-t sm:border-t-0 sm:border-l border-slate-200 pt-1 sm:pt-0 sm:pl-2">
                              <div className="text-[9px] uppercase font-bold text-slate-400">Valor Final Total</div>
                              <div className="font-extrabold text-slate-900">${formatCurrency(cat.valor_final ?? valContado, true)}</div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Modal Footer (Pinned) */}
              <div className="flex items-center justify-between px-6 py-4 border-t border-slate-100 shrink-0 bg-slate-50">
                <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
                  <CheckCircle2 size={15} className="text-emerald-600" />
                  <span>
                    <strong>{formData.categories.length}</strong> tipología(s) de lote configurada(s)
                  </span>
                </div>

                <div className="flex items-center gap-2.5 ml-auto">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 bg-white hover:bg-slate-100 text-slate-600 text-xs font-bold rounded-xl border border-slate-200 transition shadow-2xs"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="inline-flex items-center gap-2 px-5 py-2 bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold rounded-xl shadow-sm transition disabled:opacity-50"
                  >
                    {saving ? (
                      <>
                        <RefreshCw size={14} className="animate-spin" />
                        <span>Guardando en Base de Datos...</span>
                      </>
                    ) : (
                      <>
                        <Check size={15} />
                        <span>{editingItem ? 'Guardar Cambios' : 'Registrar Urbanización'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
