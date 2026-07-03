import React, { useState, useMemo } from 'react';
import { 
  User, 
  Phone, 
  Mail, 
  FileText, 
  Plus, 
  Search, 
  Trash2, 
  Edit, 
  Calendar, 
  DollarSign, 
  CheckCircle, 
  AlertCircle,
  Clock,
  ChevronRight,
  UserPlus,
  MessageSquare
} from 'lucide-react';
import { Client, Appointment, FinancialTransaction } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import ConfirmModal from './ConfirmModal';

interface ClientesViewProps {
  clients: Client[];
  appointments: Appointment[];
  transactions: FinancialTransaction[];
  selectedClientId: string | null;
  onSelectClient: (id: string | null) => void;
  onAddClient: (client: Omit<Client, 'id' | 'createdAt'>) => void;
  onUpdateClient: (client: Client) => void;
  onDeleteClient: (id: string) => void;
}

export default function ClientesView({
  clients,
  appointments,
  transactions,
  selectedClientId,
  onSelectClient,
  onAddClient,
  onUpdateClient,
  onDeleteClient,
}: ClientesViewProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);

  // Custom Confirmation Modal state
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmModalTitle, setConfirmModalTitle] = useState('');
  const [confirmModalMessage, setConfirmModalMessage] = useState('');
  const [confirmModalAction, setConfirmModalAction] = useState<() => void>(() => {});

  // Form states
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [cep, setCep] = useState('');
  const [notes, setNotes] = useState('');
  const [hairColor, setHairColor] = useState('');
  const [baseType, setBaseType] = useState('');
  const [formError, setFormError] = useState('');

  // Search filter
  const filteredClients = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();
    if (!query) return clients;
    return clients.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.phone.replace(/\D/g, '').includes(query.replace(/\D/g, ''))
    );
  }, [clients, searchQuery]);

  const activeClient = useMemo(() => {
    return clients.find((c) => c.id === selectedClientId) || null;
  }, [clients, selectedClientId]);

  // Client stats and histories
  const clientData = useMemo(() => {
    if (!activeClient) return null;

    const clientAppts = appointments
      .filter((a) => a.clientId === activeClient.id)
      .sort((a, b) => b.date.localeCompare(a.date) || b.startTime.localeCompare(a.startTime));

    const totalSpent = clientAppts
      .filter((a) => a.paymentStatus === 'Pago')
      .reduce((sum, a) => sum + a.price, 0);

    const totalPending = clientAppts
      .filter((a) => a.paymentStatus === 'Pendente')
      .reduce((sum, a) => sum + a.price, 0);

    return {
      history: clientAppts,
      totalSpent,
      totalPending,
      totalVisits: clientAppts.length,
    };
  }, [appointments, activeClient]);

  // Open modal for creating new client
  const openCreateModal = () => {
    setEditingClient(null);
    setName('');
    setPhone('');
    setEmail('');
    setCep('');
    setNotes('');
    setHairColor('');
    setBaseType('');
    setFormError('');
    setIsModalOpen(true);
  };

  // Open modal for editing existing client
  const openEditModal = (client: Client, e: React.MouseEvent) => {
    e.stopPropagation(); // Avoid selecting/deselecting row
    setEditingClient(client);
    setName(client.name);
    setPhone(client.phone);
    setEmail(client.email || '');
    setCep(client.cep || '');
    setNotes(client.notes || '');
    setHairColor(client.hairColor || '');
    setBaseType(client.baseType || '');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!name.trim()) {
      setFormError('Nome é obrigatório.');
      return;
    }
    if (!phone.trim()) {
      setFormError('Telefone é obrigatório.');
      return;
    }

    if (editingClient) {
      onUpdateClient({
        ...editingClient,
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        cep: cep.trim() || undefined,
        notes: notes.trim() || undefined,
        hairColor: hairColor.trim() || undefined,
        baseType: baseType.trim() || undefined,
      });
    } else {
      onAddClient({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        cep: cep.trim() || undefined,
        notes: notes.trim() || undefined,
        hairColor: hairColor.trim() || undefined,
        baseType: baseType.trim() || undefined,
      });
    }

    setIsModalOpen(false);
  };

  const handleDeleteClick = (clientId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmModalTitle('Excluir Cliente');
    setConfirmModalMessage('Tem certeza de que deseja excluir este cliente? Isso removerá o cadastro do banco de dados permanentemente.');
    setConfirmModalAction(() => () => {
      onDeleteClient(clientId);
      if (selectedClientId === clientId) {
        onSelectClient(null);
      }
      setConfirmModalOpen(false);
    });
    setConfirmModalOpen(true);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const handleSendWhatsApp = (client: Client) => {
    const cleanPhone = client.phone.replace(/\D/g, '');
    const finalPhone = cleanPhone.startsWith('55') ? cleanPhone : '55' + cleanPhone;
    const msg = `Olá, ${client.name}! Tudo bem?`;
    const url = `https://api.whatsapp.com/send?phone=${finalPhone}&text=${encodeURIComponent(msg)}`;
    
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const formatBrazilianDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'Agendado': return 'bg-sky-50 text-sky-700 border-sky-100';
      case 'Confirmado': return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'Realizado': return 'bg-slate-50 text-slate-600 border-slate-100';
      case 'Cancelado': return 'bg-rose-50 text-rose-700 border-rose-100';
      case 'Não compareceu': return 'bg-amber-50 text-amber-700 border-amber-100';
      default: return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getPaymentBadgeStyle = (status: string) => {
    switch (status) {
      case 'Pago': return 'bg-emerald-50 text-emerald-800 border-emerald-200';
      case 'Pendente': return 'bg-amber-50 text-amber-800 border-amber-200';
      case 'Parcialmente pago': return 'bg-indigo-50 text-indigo-800 border-indigo-200';
      case 'Cortesia': return 'bg-purple-50 text-purple-800 border-purple-200';
      default: return 'bg-slate-50 text-slate-600 border-slate-200';
    }
  };

  return (
    <div className="h-[calc(100vh-140px)] flex flex-col md:flex-row gap-6 animate-fade-in overflow-hidden">
      
      {/* LEFT COLUMN: Client List & Search */}
      <div className="w-full md:w-80 lg:w-96 bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col h-full overflow-hidden shrink-0">
        
        {/* List Header */}
        <div className="p-4 border-b border-slate-100 space-y-3 shrink-0">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-slate-800 text-base">Meus Clientes</h3>
            <button
              id="clients-add-btn"
              onClick={openCreateModal}
              className="px-3 py-1.5 md:px-4 md:py-2 bg-orange-600 hover:bg-orange-700 md:bg-blue-600 md:hover:bg-blue-700 text-white rounded-xl text-xs font-bold md:font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-orange-600/15 md:shadow-blue-600/10 cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4 shrink-0" />
              <span className="md:hidden">Cliente Novo</span>
              <span className="hidden md:inline">Cadastrar Novo Cliente</span>
            </button>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
            <input
              id="clients-search-input"
              type="text"
              placeholder="Pesquisar por nome ou celular..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all duration-200"
            />
          </div>
        </div>

        {/* Client Rows */}
        <div className="flex-1 overflow-y-auto divide-y divide-slate-50 p-2 space-y-1">
          {filteredClients.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <User className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-xs">Nenhum cliente cadastrado ou encontrado.</p>
            </div>
          ) : (
            filteredClients.map((client) => {
              const isSelected = selectedClientId === client.id;
              return (
                <div
                  key={client.id}
                  id={`client-row-${client.id}`}
                  onClick={() => onSelectClient(client.id)}
                  className={`p-3 rounded-xl flex items-center justify-between gap-3 cursor-pointer transition-all duration-150 ${
                    isSelected 
                      ? 'bg-blue-50 text-blue-900 border border-blue-100 shadow-sm' 
                      : 'hover:bg-slate-50 text-slate-700 border border-transparent'
                  }`}
                >
                  <div className="flex items-center gap-3 truncate">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 font-bold text-xs ${
                      isSelected ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {client.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="truncate">
                      <h4 className="text-xs font-bold leading-tight truncate">{client.name}</h4>
                      <p className={`text-[10px] mt-0.5 font-mono ${isSelected ? 'text-blue-700' : 'text-slate-400'}`}>
                        {client.phone}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={(e) => openEditModal(client, e)}
                      className="p-1 text-slate-400 hover:text-blue-600 hover:bg-white rounded-md transition-colors"
                      title="Editar cadastro"
                    >
                      <Edit className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleDeleteClick(client.id, e)}
                      className="p-1 text-slate-400 hover:text-rose-600 hover:bg-white rounded-md transition-colors"
                      title="Excluir cliente"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <ChevronRight className="w-4 h-4 text-slate-300 md:hidden" />
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Client Details & Histories */}
      <div className="flex-1 bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden h-full flex flex-col">
        {!activeClient ? (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 space-y-4">
            <div className="w-16 h-16 rounded-full bg-slate-50 text-slate-300 flex items-center justify-center">
              <User className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-700">Nenhum cliente selecionado</h3>
              <p className="text-xs text-slate-400 max-w-sm mt-1">
                Selecione um cliente na lista lateral para visualizar suas informações, histórico de atendimentos e financeiro.
              </p>
            </div>
            <button
              onClick={openCreateModal}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-sm cursor-pointer transition-colors"
            >
              <UserPlus className="w-4 h-4" />
              <span>Cadastrar Novo Cliente</span>
            </button>
          </div>
        ) : (
          <div className="flex-1 flex flex-col h-full overflow-hidden">
            {/* Detail Header */}
            <div className="p-6 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shrink-0 bg-slate-50/50">
              <div className="space-y-1 truncate">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-blue-600 text-white font-extrabold flex items-center justify-center shadow-md shadow-blue-600/10 text-sm">
                    {activeClient.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="truncate">
                    <h3 className="text-base font-extrabold text-slate-800 leading-tight truncate">
                      {activeClient.name}
                    </h3>
                    <p className="text-[10px] text-slate-400">
                      Cadastrado em {new Date(activeClient.createdAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                </div>
              </div>

              {/* Action shortcuts */}
              <div className="flex flex-wrap gap-3 items-center text-xs text-slate-600 shrink-0">
                <a
                  href={`tel:${activeClient.phone.replace(/\D/g, '')}`}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-xl transition-colors font-medium"
                >
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{activeClient.phone}</span>
                </a>
                <button
                  type="button"
                  onClick={() => handleSendWhatsApp(activeClient)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-100 rounded-xl transition-all font-medium cursor-pointer"
                  title="Enviar mensagem pelo WhatsApp"
                >
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                  <span>WhatsApp</span>
                </button>
                {activeClient.email && (
                  <a
                    href={`mailto:${activeClient.email}`}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-xl transition-colors font-medium"
                  >
                    <Mail className="w-3.5 h-3.5 text-slate-400" />
                    <span>{activeClient.email}</span>
                  </a>
                )}
                {activeClient.cep && (
                  <span className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 text-slate-600 border border-slate-200 rounded-xl font-medium font-mono text-[10px]">
                    <span>CEP Funcional:</span>
                    <span>{activeClient.cep}</span>
                  </span>
                )}
              </div>
            </div>

            {/* Client Hair Color & Base Type Section */}
            {(activeClient.hairColor || activeClient.baseType) && (
              <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex flex-wrap gap-4 shrink-0">
                {activeClient.hairColor && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Cor do Cabelo:</span>
                    <span className="text-xs font-semibold text-slate-700 bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
                      {activeClient.hairColor}
                    </span>
                  </div>
                )}
                {activeClient.baseType && (
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tipo de Base Prótese:</span>
                    <span className="text-xs font-semibold text-slate-700 bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
                      {activeClient.baseType}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Client Observações */}
            {activeClient.notes && (
              <div className="px-6 py-3 bg-amber-50/50 border-b border-amber-100 flex items-start gap-2.5 shrink-0">
                <FileText className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="text-xs text-amber-900 leading-relaxed font-medium">
                  <strong>Observações:</strong> {activeClient.notes}
                </div>
              </div>
            )}

            {/* Quick Metrics for Client */}
            <div className="grid grid-cols-3 border-b border-slate-100 bg-white shrink-0">
              <div className="p-4 border-r border-slate-100 text-center space-y-0.5">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Visitas</span>
                <span className="text-lg font-extrabold text-slate-700">{clientData?.totalVisits}</span>
              </div>
              <div className="p-4 border-r border-slate-100 text-center space-y-0.5">
                <span className="text-[10px] text-blue-600 uppercase font-bold tracking-wider block">Total Pago</span>
                <span className="text-lg font-extrabold text-blue-700">{formatCurrency(clientData?.totalSpent || 0)}</span>
              </div>
              <div className="p-4 text-center space-y-0.5">
                <span className="text-[10px] text-amber-600 uppercase font-bold tracking-wider block">Total Pendente</span>
                <span className="text-lg font-extrabold text-amber-700">{formatCurrency(clientData?.totalPending || 0)}</span>
              </div>
            </div>

            {/* Histórico Completo content */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              
              {/* Appointments History Section */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <Calendar className="w-4 h-4" />
                  <span>Histórico de Atendimentos</span>
                </h4>

                {clientData?.history.length === 0 ? (
                  <div className="p-8 border border-dashed border-slate-200 rounded-2xl text-center text-xs text-slate-400">
                    Nenhum atendimento agendado ou realizado para este cliente.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {clientData?.history.map((appt) => (
                      <div
                        key={appt.id}
                        className="p-4 bg-slate-50/50 hover:bg-slate-50 border border-slate-150 rounded-xl space-y-2.5 transition-all"
                      >
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="space-y-0.5">
                            <span className="text-[10px] font-mono text-slate-400 font-semibold block">
                              {formatBrazilianDate(appt.date)} • {appt.startTime}h - {appt.endTime}h
                            </span>
                            <span className="text-xs font-bold text-slate-700">{appt.serviceName}</span>
                          </div>
                          
                          <div className="flex flex-wrap gap-1.5">
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${getStatusBadgeStyle(appt.status)}`}>
                              {appt.status}
                            </span>
                            <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${getPaymentBadgeStyle(appt.paymentStatus)}`}>
                              {appt.paymentStatus}
                            </span>
                          </div>
                        </div>

                        {appt.notes && (
                          <p className="text-[11px] text-slate-500 italic border-l-2 border-slate-200 pl-2">
                            {appt.notes}
                          </p>
                        )}

                        <div className="flex justify-between items-center text-[10px] text-slate-500 pt-1 border-t border-slate-100 font-medium">
                          <span>Valor do Serviço: <strong>{formatCurrency(appt.price)}</strong></span>
                          {appt.paymentMethod && (
                            <span>Forma de Pgto: <strong>{appt.paymentMethod}</strong></span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Histórico Financeiro Section */}
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4" />
                  <span>Histórico Financeiro</span>
                </h4>

                {(() => {
                  const clientTrans = transactions.filter((t) => 
                    t.appointmentId && 
                    appointments.find(a => a.id === t.appointmentId)?.clientId === activeClient.id
                  );

                  if (clientTrans.length === 0) {
                    return (
                      <div className="p-8 border border-dashed border-slate-200 rounded-2xl text-center text-xs text-slate-400">
                        Nenhum registro financeiro direto ou faturamento lançado para este cliente.
                      </div>
                    );
                  }

                  return (
                    <div className="bg-slate-50/50 rounded-xl border border-slate-150 overflow-hidden divide-y divide-slate-100">
                      {clientTrans.map((t) => (
                        <div key={t.id} className="p-3 flex items-center justify-between text-xs">
                          <div className="space-y-0.5">
                            <span className="text-[10px] text-slate-400 font-mono block">
                              {formatBrazilianDate(t.date)}
                            </span>
                            <span className="font-semibold text-slate-700 truncate block max-w-xs sm:max-w-md">
                              {t.description}
                            </span>
                          </div>
                          <span className="font-extrabold text-blue-600 font-mono shrink-0">
                            + {formatCurrency(t.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                })()}
              </div>

            </div>
          </div>
        )}
      </div>

      {/* MODAL: ADD / EDIT CLIENT */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-slate-100 max-w-md w-full overflow-hidden shadow-2xl flex flex-col max-h-[96vh] sm:max-h-[90vh]"
            >
              <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50 shrink-0">
                <h3 className="font-bold text-slate-800 text-xs sm:text-sm">
                  {editingClient ? 'Editar Cliente' : 'Cadastrar Novo Cliente'}
                </h3>
                <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">
                  Preencha os campos abaixo para salvar o cadastro na clínica.
                </p>
              </div>

              <form onSubmit={handleFormSubmit} className="p-4 sm:p-5 space-y-3.5 sm:space-y-4 flex-1 overflow-y-auto">
                {formError && (
                  <div className="p-3 bg-rose-50 text-rose-800 text-xs rounded-xl font-medium flex items-center gap-1.5 border border-rose-100">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <label htmlFor="client-form-name" className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Nome Completo <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="client-form-name"
                    type="text"
                    placeholder="Ex: Roberto Alves"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 border border-slate-200 focus:border-blue-500 focus:outline-none rounded-xl text-xs transition-colors"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1 sm:col-span-2">
                    <label htmlFor="client-form-phone" className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      Celular / Telefone <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="client-form-phone"
                      type="text"
                      placeholder="Ex: (11) 98765-4321"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      className="w-full px-3.5 py-2 border border-slate-200 focus:border-blue-500 focus:outline-none rounded-xl text-xs transition-colors"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="client-form-email" className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      E-mail <span className="text-slate-400 text-[9px]">(Opcional)</span>
                    </label>
                    <input
                      id="client-form-email"
                      type="email"
                      placeholder="Ex: roberto@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3.5 py-2 border border-slate-200 focus:border-blue-500 focus:outline-none rounded-xl text-xs transition-colors"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="client-form-cep" className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      CEP Funcional <span className="text-slate-400 text-[9px]">(Opcional)</span>
                    </label>
                    <input
                      id="client-form-cep"
                      type="text"
                      placeholder="Ex: 01001-000"
                      value={cep}
                      onChange={(e) => setCep(e.target.value)}
                      className="w-full px-3.5 py-2 border border-slate-200 focus:border-blue-500 focus:outline-none rounded-xl text-xs transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-3.5">
                  <div className="space-y-1">
                    <label htmlFor="client-form-hair-color" className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      Cor do Cabelo <span className="text-slate-400 text-[9px]">(Opcional)</span>
                    </label>
                    <input
                      id="client-form-hair-color"
                      type="text"
                      placeholder="Ex: Castanho Escuro, Grisalho..."
                      value={hairColor}
                      onChange={(e) => setHairColor(e.target.value)}
                      className="w-full px-3.5 py-2 border border-slate-200 focus:border-blue-500 focus:outline-none rounded-xl text-xs transition-colors"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="client-form-base-type" className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      Tipo de Base Prótese <span className="text-slate-400 text-[9px]">(Opcional)</span>
                    </label>
                    <input
                      id="client-form-base-type"
                      type="text"
                      placeholder="Ex: Híbrida, Silicone (PU), Lace..."
                      value={baseType}
                      onChange={(e) => setBaseType(e.target.value)}
                      className="w-full px-3.5 py-2 border border-slate-200 focus:border-blue-500 focus:outline-none rounded-xl text-xs transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="client-form-notes" className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Observações <span className="text-slate-400 text-[9px]">(Opcional)</span>
                  </label>
                  <textarea
                    id="client-form-notes"
                    placeholder="Ex: Detalhes de tamanho, tipo de prótese, cola recomendada, fita preferida..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3.5 py-2 border border-slate-200 focus:border-blue-500 focus:outline-none rounded-xl text-xs transition-colors resize-none"
                  />
                </div>

                <div className="flex gap-3 justify-end pt-2 border-t border-slate-50">
                  <button
                    id="client-modal-cancel"
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 font-semibold rounded-xl text-xs transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    id="client-modal-submit"
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs transition-all shadow-md shadow-blue-600/10 cursor-pointer"
                  >
                    {editingClient ? 'Salvar Alterações' : 'Salvar Cadastro'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
