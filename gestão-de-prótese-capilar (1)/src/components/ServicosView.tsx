import React, { useState } from 'react';
import { Service, ServiceCategory } from '../types';
import ConfirmModal from './ConfirmModal';
import { 
  Scissors, 
  Tag, 
  Plus, 
  Trash2, 
  Edit3, 
  Clock, 
  DollarSign, 
  Layers, 
  X,
  AlertCircle,
  FileText
} from 'lucide-react';

interface ServicosViewProps {
  categories: ServiceCategory[];
  services: Service[];
  onAddCategory: (cat: Omit<ServiceCategory, 'id' | 'createdAt'>) => void;
  onUpdateCategory: (cat: ServiceCategory) => void;
  onDeleteCategory: (id: string) => void;
  onAddService: (srv: Omit<Service, 'id' | 'createdAt'>) => void;
  onUpdateService: (srv: Service) => void;
  onDeleteService: (id: string) => void;
}

export default function ServicosView({
  categories,
  services,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  onAddService,
  onUpdateService,
  onDeleteService,
}: ServicosViewProps) {
  // Navigation tab between Services and Categories
  const [activeTab, setActiveTab] = useState<'servicos' | 'categorias'>('servicos');

  // Custom Confirmation Modal state
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmModalTitle, setConfirmModalTitle] = useState('');
  const [confirmModalMessage, setConfirmModalMessage] = useState('');
  const [confirmModalAction, setConfirmModalAction] = useState<() => void>(() => {});

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | 'all'>('all');

  // Track counts to detect additions and auto-select
  const [prevCategoriesCount, setPrevCategoriesCount] = useState(categories.length);
  const [prevServicesCount, setPrevServicesCount] = useState(services.length);

  React.useEffect(() => {
    if (categories.length > prevCategoriesCount) {
      const lastCat = categories[categories.length - 1];
      if (lastCat) {
        setSelectedCategoryId(lastCat.id);
      }
    }
    setPrevCategoriesCount(categories.length);
  }, [categories, prevCategoriesCount]);

  React.useEffect(() => {
    if (services.length > prevServicesCount) {
      const lastSrv = services[services.length - 1];
      if (lastSrv) {
        setSelectedCategoryId(lastSrv.categoryId);
      }
    }
    setPrevServicesCount(services.length);
  }, [services, prevServicesCount]);

  // Category Modal States
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<ServiceCategory | null>(null);
  const [categoryName, setCategoryName] = useState('');
  const [categoryDescription, setCategoryDescription] = useState('');

  // Service Modal States
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [serviceName, setServiceName] = useState('');
  const [serviceCategoryId, setServiceCategoryId] = useState('');
  const [servicePrice, setServicePrice] = useState('');
  const [serviceDuration, setServiceDuration] = useState('90');
  const [serviceDescription, setServiceDescription] = useState('');

  // Helpers for category modal
  const openAddCategoryModal = () => {
    setEditingCategory(null);
    setCategoryName('');
    setCategoryDescription('');
    setIsCategoryModalOpen(true);
  };

  const openEditCategoryModal = (cat: ServiceCategory, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid triggering filter selection
    setEditingCategory(cat);
    setCategoryName(cat.name);
    setCategoryDescription(cat.description || '');
    setIsCategoryModalOpen(true);
  };

  const handleCategorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryName.trim()) return;

    if (editingCategory) {
      onUpdateCategory({
        ...editingCategory,
        name: categoryName.trim(),
        description: categoryDescription.trim() || undefined,
      });
    } else {
      onAddCategory({
        name: categoryName.trim(),
        description: categoryDescription.trim() || undefined,
      });
    }
    setIsCategoryModalOpen(false);
  };

  // Helpers for service modal
  const openAddServiceModal = () => {
    setEditingService(null);
    setServiceName('');
    setServiceCategoryId(selectedCategoryId !== 'all' ? selectedCategoryId : (categories[0]?.id || ''));
    setServicePrice('');
    setServiceDuration('90');
    setServiceDescription('');
    setIsServiceModalOpen(true);
  };

  const openEditServiceModal = (srv: Service) => {
    setEditingService(srv);
    setServiceName(srv.name);
    setServiceCategoryId(srv.categoryId);
    setServicePrice(srv.price.toString());
    setServiceDuration(srv.durationMinutes.toString());
    setServiceDescription(srv.description || '');
    setIsServiceModalOpen(true);
  };

  const handleServiceSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceName.trim() || !serviceCategoryId) return;

    const priceNum = parseFloat(servicePrice) || 0;
    const durationNum = parseInt(serviceDuration) || 60;

    if (editingService) {
      onUpdateService({
        ...editingService,
        name: serviceName.trim(),
        categoryId: serviceCategoryId,
        price: priceNum,
        durationMinutes: durationNum,
        description: serviceDescription.trim() || undefined,
      });
    } else {
      onAddService({
        name: serviceName.trim(),
        categoryId: serviceCategoryId,
        price: priceNum,
        durationMinutes: durationNum,
        description: serviceDescription.trim() || undefined,
      });
    }
    setIsServiceModalOpen(false);
  };

  // Filter and Search logic
  const filteredServices = services.filter(srv => {
    const matchesSearch = srv.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
      (srv.description && srv.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategoryId === 'all' || srv.categoryId === selectedCategoryId;
    
    return matchesSearch && matchesCategory;
  });

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(val);
  };

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-5">
        <div>
          <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
            <Scissors className="w-5 h-5 text-blue-600" />
            <span>Serviços & Procedimentos</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">Organize seus procedimentos e crie grupos de categorias para estruturar seus atendimentos.</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Sub-Tabs Switcher */}
          <div className="flex p-1 bg-slate-100/80 rounded-xl">
            <button
              onClick={() => setActiveTab('servicos')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all text-center flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'servicos'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Scissors className="w-3.5 h-3.5" />
              <span>Serviços</span>
            </button>
            <button
              onClick={() => setActiveTab('categorias')}
              className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all text-center flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'categorias'
                  ? 'bg-white text-slate-800 shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Grupos (Categorias)</span>
            </button>
          </div>

          {/* Contextual Primary Action Button */}
          {activeTab === 'servicos' ? (
            <button
              id="add-service-btn"
              onClick={openAddServiceModal}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-600/10 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Serviço</span>
            </button>
          ) : (
            <button
              id="add-category-btn"
              onClick={openAddCategoryModal}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-600/10 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Novo Grupo</span>
            </button>
          )}
        </div>
      </div>

      {/* VIEW RENDER BASED ON ACTIVE TAB */}
      {activeTab === 'servicos' ? (
        <div className="space-y-5">
          {/* CATEGORIES PILLS FOR GROUPING / FILTERING */}
          <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-1">Filtrar por Grupo (Categoria)</span>
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              <button
                onClick={() => setSelectedCategoryId('all')}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border cursor-pointer ${
                  selectedCategoryId === 'all'
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-600/10'
                    : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'
                }`}
              >
                Todos os Serviços ({services.length})
              </button>
              {categories.map(cat => {
                const count = services.filter(s => s.categoryId === cat.id).length;
                return (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategoryId(cat.id)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border cursor-pointer ${
                      selectedCategoryId === cat.id
                        ? 'bg-blue-600 text-white border-blue-600 shadow-sm shadow-blue-600/10'
                        : 'bg-white text-slate-600 hover:bg-slate-50 border-slate-200'
                    }`}
                  >
                    {cat.name} ({count})
                  </button>
                );
              })}
            </div>
          </div>

          {/* SEARCH & METRIC HEADER */}
          <div className="bg-white p-4 rounded-2xl border border-slate-150 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <input
                type="text"
                placeholder="Buscar serviços..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 focus:border-blue-500 focus:outline-none rounded-xl text-xs transition-colors"
              />
              <Scissors className="absolute left-3 top-2.5 w-4 h-4 text-slate-400 rotate-90" />
            </div>
            
            <div className="text-[11px] text-slate-400 font-bold shrink-0">
              Exibindo <span className="text-slate-700">{filteredServices.length}</span> de <span className="text-slate-700">{services.length}</span> serviços cadastrados
            </div>
          </div>

          {/* SERVICES GRID */}
          {filteredServices.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-150 p-12 text-center flex flex-col items-center justify-center space-y-3">
              <div className="p-4 bg-slate-50 rounded-full text-slate-400">
                <Scissors className="w-8 h-8" />
              </div>
              <p className="text-sm font-bold text-slate-600">Nenhum serviço encontrado</p>
              <p className="text-xs text-slate-400">Tente buscar por outro termo ou selecione outro grupo acima.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredServices.map(srv => {
                const cat = categories.find(c => c.id === srv.categoryId);
                
                return (
                  <div 
                    key={srv.id} 
                    className="bg-white border border-slate-150 hover:border-slate-300 rounded-2xl p-5 shadow-sm hover:shadow transition-all duration-200 flex flex-col justify-between space-y-4 group relative"
                  >
                    <div className="space-y-2">
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <span className="text-[9px] font-black uppercase tracking-wider bg-slate-100 text-slate-500 px-2 py-0.5 rounded-md">
                            {cat?.name || 'Sem Categoria'}
                          </span>
                          <h4 className="text-sm font-extrabold text-slate-800 mt-1.5 group-hover:text-blue-600 transition-colors">
                            {srv.name}
                          </h4>
                        </div>
                        
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => openEditServiceModal(srv)}
                            className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-blue-600 rounded-lg transition-colors cursor-pointer"
                            title="Editar serviço"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setConfirmModalTitle('Excluir Serviço');
                              setConfirmModalMessage(`Tem certeza de que deseja excluir o serviço "${srv.name}"?`);
                              setConfirmModalAction(() => () => {
                                onDeleteService(srv.id);
                                setConfirmModalOpen(false);
                              });
                              setConfirmModalOpen(true);
                            }}
                            className="p-1.5 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                            title="Excluir serviço"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {srv.description ? (
                        <p className="text-xs text-slate-500 leading-relaxed line-clamp-2">
                          {srv.description}
                        </p>
                      ) : (
                        <p className="text-xs text-slate-350 italic">Sem descrição disponível.</p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-50 flex items-center justify-between text-xs font-bold text-slate-600">
                      <div className="flex items-center gap-1 text-slate-500">
                        <Clock className="w-3.5 h-3.5 text-slate-400" />
                        <span>{srv.durationMinutes} minutos</span>
                      </div>
                      
                      <div className="flex items-center gap-0.5 text-emerald-600 text-sm font-extrabold font-mono">
                        <span>{formatCurrency(srv.price)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* CATEGORIES MANAGEMENT TAB */
        <div className="space-y-4">
          <div className="bg-blue-50/50 border border-blue-100/50 p-4 rounded-2xl flex items-start gap-3">
            <Layers className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
            <div>
              <h4 className="text-xs font-bold text-blue-900">Sobre as Categorias</h4>
              <p className="text-xs text-blue-700/85 mt-0.5 leading-relaxed">
                As categorias servem unicamente para agrupar e organizar os seus serviços no painel. 
                Ao excluir uma categoria, todos os serviços cadastrados dentro dela também serão removidos.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {categories.map(cat => {
              const count = services.filter(s => s.categoryId === cat.id).length;
              
              return (
                <div 
                  key={cat.id} 
                  className="bg-white border border-slate-150 hover:border-slate-300 rounded-2xl p-5 shadow-sm hover:shadow transition-all duration-200 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
                          <Tag className="w-4 h-4" />
                        </div>
                        <h4 className="text-sm font-extrabold text-slate-800">
                          {cat.name}
                        </h4>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => openEditCategoryModal(cat, e)}
                          className="p-1.5 hover:bg-slate-100 text-slate-500 hover:text-blue-600 rounded-lg transition-colors cursor-pointer"
                          title="Editar categoria"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        {categories.length > 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmModalTitle('Excluir Categoria (Grupo)');
                              setConfirmModalMessage(`Tem certeza que deseja excluir a categoria "${cat.name}"? Todos os serviços vinculados serão excluídos permanentemente.`);
                              setConfirmModalAction(() => () => {
                                onDeleteCategory(cat.id);
                                if (selectedCategoryId === cat.id) setSelectedCategoryId('all');
                                setConfirmModalOpen(false);
                              });
                              setConfirmModalOpen(true);
                            }}
                            className="p-1.5 hover:bg-rose-50 text-slate-500 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                            title="Excluir categoria"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                    {cat.description ? (
                      <p className="text-xs text-slate-500 leading-relaxed">
                        {cat.description}
                      </p>
                    ) : (
                      <p className="text-xs text-slate-350 italic">Sem descrição disponível.</p>
                    )}
                  </div>
                  <div className="pt-3 border-t border-slate-50 flex items-center justify-between text-xs font-bold text-slate-500">
                    <span>Serviços vinculados:</span>
                    <span className="bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full text-[11px] font-extrabold">
                      {count} {count === 1 ? 'serviço' : 'serviços'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* CATEGORY MODAL */}
      {isCategoryModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-150 max-w-md w-full shadow-2xl p-4 sm:p-6 relative max-h-[96vh] flex flex-col overflow-hidden">
            <button 
              onClick={() => setIsCategoryModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-all"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h3 className="text-xs sm:text-sm font-black text-slate-800 flex items-center gap-2 mb-3.5 sm:mb-4 shrink-0">
              <Tag className="w-4 h-4 text-blue-600" />
              <span>{editingCategory ? 'Editar Categoria' : 'Nova Categoria'}</span>
            </h3>

            <form onSubmit={handleCategorySubmit} className="space-y-3.5 sm:space-y-4 flex-1 overflow-y-auto">
              <div className="space-y-1.5">
                <label className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nome da Categoria</label>
                <input
                  type="text"
                  placeholder="Ex: Manutenção, Colocação, Tratamentos"
                  value={categoryName}
                  onChange={(e) => setCategoryName(e.target.value)}
                  required
                  className="w-full px-3 py-2 border border-slate-200 focus:border-blue-500 focus:outline-none rounded-xl text-xs transition-colors"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Descrição (Opcional)</label>
                <textarea
                  placeholder="Descreva brevemente esta categoria..."
                  value={categoryDescription}
                  onChange={(e) => setCategoryDescription(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-slate-200 focus:border-blue-500 focus:outline-none rounded-xl text-xs transition-colors resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-50">
                <button
                  type="button"
                  onClick={() => setIsCategoryModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-600/10 transition-all cursor-pointer"
                >
                  {editingCategory ? 'Salvar Alterações' : 'Criar Categoria'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SERVICE MODAL */}
      {isServiceModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl border border-slate-150 max-w-lg w-full shadow-2xl p-4 sm:p-6 relative max-h-[96vh] flex flex-col overflow-hidden">
            <button 
              onClick={() => setIsServiceModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-lg transition-all"
            >
              <X className="w-5 h-5" />
            </button>
            
            <h3 className="text-xs sm:text-sm font-black text-slate-800 flex items-center gap-2 mb-3.5 sm:mb-4 shrink-0">
              <Scissors className="w-4 h-4 text-blue-600" />
              <span>{editingService ? 'Editar Serviço' : 'Novo Serviço'}</span>
            </h3>

            <form onSubmit={handleServiceSubmit} className="space-y-3.5 sm:space-y-4 flex-1 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Nome do Serviço</label>
                  <input
                    type="text"
                    placeholder="Ex: Manutenção Completa, Hidratação de Fios"
                    value={serviceName}
                    onChange={(e) => setServiceName(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-200 focus:border-blue-500 focus:outline-none rounded-xl text-xs transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Categoria</label>
                  <select
                    value={serviceCategoryId}
                    onChange={(e) => setServiceCategoryId(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-200 focus:border-blue-500 focus:outline-none rounded-xl text-xs transition-colors"
                  >
                    <option value="" disabled>Selecione uma categoria...</option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Duração (Minutos)</label>
                  <select
                    value={serviceDuration}
                    onChange={(e) => setServiceDuration(e.target.value)}
                    required
                    className="w-full px-3 py-2 border border-slate-200 focus:border-blue-500 focus:outline-none rounded-xl text-xs transition-colors"
                  >
                    <option value="30">30 min</option>
                    <option value="45">45 min</option>
                    <option value="60">60 min (1 hora)</option>
                    <option value="90">90 min (1h30)</option>
                    <option value="120">120 min (2 horas)</option>
                    <option value="150">150 min (2h30)</option>
                    <option value="180">180 min (3 horas)</option>
                  </select>
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Preço (R$)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-xs text-slate-400 font-bold">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      value={servicePrice}
                      onChange={(e) => setServicePrice(e.target.value)}
                      required
                      className="w-full pl-9 pr-3 py-2 border border-slate-200 focus:border-blue-500 focus:outline-none rounded-xl text-xs transition-colors font-mono"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Descrição (Opcional)</label>
                  <textarea
                    placeholder="Descreva detalhes ou etapas deste procedimento..."
                    value={serviceDescription}
                    onChange={(e) => setServiceDescription(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-slate-200 focus:border-blue-500 focus:outline-none rounded-xl text-xs transition-colors resize-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-50">
                <button
                  type="button"
                  onClick={() => setIsServiceModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs shadow-md shadow-blue-600/10 transition-all cursor-pointer"
                >
                  {editingService ? 'Salvar Alterações' : 'Salvar Serviço'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmModal
        isOpen={confirmModalOpen}
        title={confirmModalTitle}
        message={confirmModalMessage}
        onConfirm={confirmModalAction}
        onCancel={() => setConfirmModalOpen(false)}
      />
    </div>
  );
}
