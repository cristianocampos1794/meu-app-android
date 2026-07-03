import React, { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  User, 
  Plus, 
  ChevronLeft, 
  ChevronRight, 
  Scissors, 
  FileText, 
  AlertCircle,
  Trash2,
  Edit,
  Globe,
  CheckCircle,
  HelpCircle,
  CheckSquare,
  MessageSquare,
  X,
  Lock,
  UserPlus
} from 'lucide-react';
import { Client, Appointment, AppointmentStatus, PaymentStatus, ServiceCategory, Service } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import ConfirmModal from './ConfirmModal';

const timeToNumber = (t: string): number => {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h + (m || 0) / 60;
};

const formatDuration = (hours: number): string => {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h > 0 && m > 0) return `${h}h ${m}min`;
  if (h > 0) return `${h}h`;
  return `${m}min`;
};

interface AgendaViewProps {
  clients: Client[];
  appointments: Appointment[];
  categories: ServiceCategory[];
  services: Service[];
  selectedDate: string; // YYYY-MM-DD
  setSelectedDate: (date: string) => void;
  onAddAppointment: (appt: Omit<Appointment, 'id' | 'createdAt'> & { repeatCount?: number }) => Promise<void>;
  onUpdateAppointment: (appt: Appointment) => Promise<void>;
  onDeleteAppointment: (id: string) => Promise<void>;
  onAddClient: (client: Omit<Client, 'id' | 'createdAt'>) => Client;
  googleAccessToken: string | null;
  enableGoogleCalendar: boolean;
  shouldOpenNewAppointment?: boolean;
  onNewAppointmentOpened?: () => void;
}

type ViewMode = 'diario' | 'semanal' | 'mensal';

export default function AgendaView({
  clients,
  appointments,
  categories,
  services,
  selectedDate,
  setSelectedDate,
  onAddAppointment,
  onUpdateAppointment,
  onDeleteAppointment,
  onAddClient,
  googleAccessToken,
  enableGoogleCalendar,
  shouldOpenNewAppointment,
  onNewAppointmentOpened,
}: AgendaViewProps) {
  
  const [viewMode, setViewMode] = useState<ViewMode>('semanal');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingAppt, setEditingAppt] = useState<Appointment | null>(null);

  // Form states
  const [clientId, setClientId] = useState('');
  const [date, setDate] = useState(selectedDate);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');
  const [serviceName, setServiceName] = useState('');
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<AppointmentStatus>('Agendado');
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('Pendente');
  const [paymentMethod, setPaymentMethod] = useState('Pix');
  const [formError, setFormError] = useState('');

  // Recurrence states
  const [recurrence, setRecurrence] = useState<'Único' | 'Diário' | 'Semanal' | 'Mensal'>('Único');
  const [repeatCount, setRepeatCount] = useState<number>(4);

  // Service Selection Dropdown States
  const [isServiceDropdownOpen, setIsServiceDropdownOpen] = useState(false);
  const [activeCategoryForServiceDropdown, setActiveCategoryForServiceDropdown] = useState<string | null>(null);

  // Custom Confirmation Modal state
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmModalTitle, setConfirmModalTitle] = useState('');
  const [confirmModalMessage, setConfirmModalMessage] = useState('');
  const [confirmModalAction, setConfirmModalAction] = useState<() => void>(() => {});

  // New Client Pop-up Modal states
  const [isNewClientModalOpen, setIsNewClientModalOpen] = useState(false);
  const [newClientName, setNewClientName] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientEmail, setNewClientEmail] = useState('');
  const [newClientNotes, setNewClientNotes] = useState('');
  const [newClientCep, setNewClientCep] = useState('');
  const [newClientHairColor, setNewClientHairColor] = useState('');
  const [newClientBaseType, setNewClientBaseType] = useState('');

  // Client Autocomplete States
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [isClientSuggestionsOpen, setIsClientSuggestionsOpen] = useState(false);
  const clientSearchContainerRef = useRef<HTMLDivElement>(null);

  // Close client search suggestions when clicking outside
  useEffect(() => {
    function handleClickOutsideClientSearch(event: MouseEvent) {
      if (
        clientSearchContainerRef.current &&
        !clientSearchContainerRef.current.contains(event.target as Node)
      ) {
        setIsClientSuggestionsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutsideClientSearch);
    return () => {
      document.removeEventListener('mousedown', handleClickOutsideClientSearch);
    };
  }, []);

  // Open create modal if triggered globally
  useEffect(() => {
    if (shouldOpenNewAppointment) {
      handleOpenCreate();
      if (onNewAppointmentOpened) {
        onNewAppointmentOpened();
      }
    }
  }, [shouldOpenNewAppointment]);

  // Calendar Helpers
  const daysOfWeek = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const months = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];

  const currentDateObj = useMemo(() => new Date(selectedDate + 'T00:00:00'), [selectedDate]);

  // Adjust selected date
  const changeDate = (days: number) => {
    const d = new Date(currentDateObj);
    d.setDate(d.getDate() + days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const setToday = () => {
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  const handleSendWhatsAppReminder = (appt: Appointment) => {
    const cleanPhone = appt.clientPhone.replace(/\D/g, '');
    const finalPhone = cleanPhone.startsWith('55') ? cleanPhone : '55' + cleanPhone;
    
    // Format date from YYYY-MM-DD to DD/MM/YYYY
    const [year, month, day] = appt.date.split('-');
    const formattedDate = `${day}/${month}/${year}`;

    const msg = `Olá, ${appt.clientName}! Passando para confirmar seu agendamento de *${appt.serviceName}* no dia *${formattedDate}* às *${appt.startTime}h*. Confirma sua presença? Obrigado! 💇‍♂️✨`;
    const url = `https://api.whatsapp.com/send?phone=${finalPhone}&text=${encodeURIComponent(msg)}`;
    
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Get start of the week (Sunday) for Semanal view
  const startOfWeek = useMemo(() => {
    const d = new Date(currentDateObj);
    const day = d.getDay();
    d.setDate(d.getDate() - day);
    return d;
  }, [currentDateObj]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      return d.toISOString().split('T')[0];
    });
  }, [startOfWeek]);

  // Get days in month for Mensal view
  const monthDays = useMemo(() => {
    const year = currentDateObj.getFullYear();
    const month = currentDateObj.getMonth();
    
    // First day of the month
    const firstDay = new Date(year, month, 1);
    // Day of the week of first day (0-6)
    const firstDayOfWeek = firstDay.getDay();
    
    // Last day of the month
    const lastDay = new Date(year, month + 1, 0);
    const totalDays = lastDay.getDate();

    // Fill previous month days for grid spacing
    const days: { dateStr: string; label: number; isCurrentMonth: boolean }[] = [];
    
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, prevMonthLastDay - i);
      days.push({
        dateStr: d.toISOString().split('T')[0],
        label: prevMonthLastDay - i,
        isCurrentMonth: false,
      });
    }

    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      const d = new Date(year, month, i);
      days.push({
        dateStr: d.toISOString().split('T')[0],
        label: i,
        isCurrentMonth: true,
      });
    }

    // Fill next month days for grid spacing to make complete rows of 7
    const remaining = 42 - days.length;
    for (let i = 1; i <= remaining; i++) {
      const d = new Date(year, month + 1, i);
      days.push({
        dateStr: d.toISOString().split('T')[0],
        label: i,
        isCurrentMonth: false,
      });
    }

    return days;
  }, [currentDateObj]);

  // Filter clients for modal search dropdown
  const filteredClientsForDropdown = useMemo(() => {
    const q = clientSearchQuery.toLowerCase().trim();
    if (!q) return clients;
    return clients.filter(c => c.name.toLowerCase().includes(q));
  }, [clients, clientSearchQuery]);

  // Get appointments for a specific date
  const getApptsForDate = (dateStr: string) => {
    return appointments
      .filter((a) => a.date === dateStr && a.status !== 'Cancelado')
      .sort((a, b) => a.startTime.localeCompare(b.startTime));
  };

  const handleOpenCreate = (initialTime?: string, initialDate?: string) => {
    setEditingAppt(null);
    setClientId('');
    setClientSearchQuery('');
    setIsClientSuggestionsOpen(false);
    
    // If opened from a calendar slot/grid (with initialTime/initialDate), prefill.
    // Otherwise (from general "+ Novo Atendimento"), leave date and times completely blank!
    if (initialTime || initialDate) {
      setDate(initialDate || selectedDate);
      setStartTime(initialTime || '');
      
      if (initialTime) {
        const [h, m] = initialTime.split(':').map(Number);
        const endH = String((h + 1) % 24).padStart(2, '0');
        setEndTime(`${endH}:${String(m).padStart(2, '0')}`);
      } else {
        setEndTime('');
      }
    } else {
      setDate('');
      setStartTime('');
      setEndTime('');
    }

    setServiceName('');
    setPrice('');
    setNotes('');
    setStatus('Agendado');
    setPaymentStatus('Pendente');
    setPaymentMethod('Pix');
    setRecurrence('Único');
    setRepeatCount(4);
    setIsServiceDropdownOpen(false);
    setActiveCategoryForServiceDropdown(null);
    setFormError('');
    setIsNewClientModalOpen(false);
    setNewClientName('');
    setNewClientPhone('');
    setNewClientEmail('');
    setNewClientNotes('');
    setNewClientCep('');
    setNewClientHairColor('');
    setNewClientBaseType('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (appt: Appointment, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingAppt(appt);
    setClientId(appt.clientId);
    setClientSearchQuery(appt.clientName);
    setIsClientSuggestionsOpen(false);
    setDate(appt.date);
    setStartTime(appt.startTime);
    setEndTime(appt.endTime);
    setServiceName(appt.serviceName);
    setPrice(appt.price.toString());
    setNotes(appt.notes || '');
    setStatus(appt.status);
    setPaymentStatus(appt.paymentStatus);
    setPaymentMethod(appt.paymentMethod || 'Pix');
    setRecurrence(appt.recurrence || 'Único');
    setRepeatCount(4);
    setIsServiceDropdownOpen(false);
    setActiveCategoryForServiceDropdown(null);
    setFormError('');
    setIsNewClientModalOpen(false);
    setNewClientName('');
    setNewClientPhone('');
    setNewClientEmail('');
    setNewClientNotes('');
    setNewClientCep('');
    setNewClientHairColor('');
    setNewClientBaseType('');
    setIsModalOpen(true);
  };

  const handleNewClientSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim() || !newClientPhone.trim()) {
      alert('Nome e Telefone são obrigatórios.');
      return;
    }

    const addedClient = onAddClient({
      name: newClientName.trim(),
      phone: newClientPhone.trim(),
      email: newClientEmail.trim() || undefined,
      notes: newClientNotes.trim() || undefined,
      cep: newClientCep.trim() || undefined,
      hairColor: newClientHairColor.trim() || undefined,
      baseType: newClientBaseType.trim() || undefined,
    });

    if (addedClient && addedClient.id) {
      setClientId(addedClient.id);
      setClientSearchQuery(addedClient.name);
    }
    
    setNewClientName('');
    setNewClientPhone('');
    setNewClientEmail('');
    setNewClientNotes('');
    setNewClientCep('');
    setNewClientHairColor('');
    setNewClientBaseType('');
    setIsNewClientModalOpen(false);
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!clientId) {
      setFormError('Por favor, selecione um cliente.');
      return;
    }
    if (!serviceName.trim()) {
      setFormError('Por favor, insira o serviço realizado.');
      return;
    }
    const parsedPrice = parseFloat(price.replace(',', '.'));
    if (isNaN(parsedPrice) || parsedPrice < 0) {
      setFormError('Por favor, insira um preço válido (ex: 220.00).');
      return;
    }

    // Start/End Time bounds check
    if (startTime >= endTime) {
      setFormError('O horário de início deve ser anterior ao horário de término.');
      return;
    }

    const selectedClient = clients.find((c) => c.id === clientId);
    if (!selectedClient) {
      setFormError('Cliente inválido.');
      return;
    }

    const apptDetails = {
      clientId,
      clientName: selectedClient.name,
      clientPhone: selectedClient.phone,
      date,
      startTime,
      endTime,
      serviceName: serviceName.trim(),
      price: parsedPrice,
      notes: notes.trim() || undefined,
      status,
      paymentStatus,
      paymentMethod,
      recurrence,
      repeatCount: recurrence !== 'Único' ? repeatCount : undefined,
    };

    try {
      if (editingAppt) {
        await onUpdateAppointment({
          ...editingAppt,
          ...apptDetails,
        });
      } else {
        await onAddAppointment(apptDetails);
      }
      setIsModalOpen(false);
    } catch (err: any) {
      setFormError(err.message || 'Erro ao agendar o atendimento.');
    }
  };

  const handleDeleteClick = async () => {
    if (!editingAppt) return;
    
    setConfirmModalTitle('Cancelar Atendimento');
    setConfirmModalMessage(`Deseja realmente CANCELAR / EXCLUIR o atendimento de ${editingAppt.clientName}?\nSe o Google Calendar estiver ativo, o evento correspondente também será apagado permanentemente.`);
    setConfirmModalAction(() => async () => {
      try {
        await onDeleteAppointment(editingAppt.id);
        setIsModalOpen(false);
        setConfirmModalOpen(false);
      } catch (err: any) {
        setFormError(err.message || 'Erro ao excluir atendimento.');
        setConfirmModalOpen(false);
      }
    });
    setConfirmModalOpen(true);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
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
    <div className="space-y-6 animate-fade-in pb-8">
      
      {/* Controls: Navigation bar and Agenda View Selector */}
      <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-3 sm:gap-4 bg-white p-3 sm:p-4 rounded-2xl border border-slate-100 shadow-sm">
        
        {/* Row 1 for Mobile: Navigation Buttons and "+ Agendar" Button */}
        <div className="flex justify-between items-center w-full sm:w-auto gap-2">
          {/* Navigation Controls */}
          <div className="flex items-center gap-1.5 sm:gap-3">
            <button 
              onClick={() => changeDate(viewMode === 'diario' ? -1 : viewMode === 'semanal' ? -7 : -30)} 
              className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            
            <button 
              onClick={setToday} 
              className="px-2.5 py-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
            >
              Hoje
            </button>
            
            <button 
              onClick={() => changeDate(viewMode === 'diario' ? 1 : viewMode === 'semanal' ? 7 : 30)} 
              className="p-1.5 border border-slate-200 rounded-lg hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Add - Brought to top row on mobile */}
          <button
            id="agenda-new-appt-btn"
            onClick={() => handleOpenCreate()}
            className="flex sm:hidden items-center justify-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-xl text-[11px] font-bold shadow-md shadow-blue-600/10 cursor-pointer transition-all active:scale-95 shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Novo Atendimento</span>
          </button>

          <button
            onClick={() => setIsNewClientModalOpen(true)}
            className="flex sm:hidden items-center justify-center gap-1 bg-white hover:bg-slate-50 text-blue-600 border border-blue-200 px-3 py-1.5 rounded-xl text-[11px] font-bold shadow-sm cursor-pointer transition-all active:scale-95 shrink-0"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Cliente Novo</span>
          </button>
        </div>

        {/* Date Title/Label (Centered on mobile, left-aligned on sm+) */}
        <div className="text-center sm:text-left pl-0 sm:pl-2">
          <span className="font-extrabold sm:font-bold text-slate-800 text-[11px] sm:text-sm">
            {viewMode === 'diario' && currentDateObj.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            {viewMode === 'semanal' && `Semana de ${new Date(weekDays[0] + 'T00:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' })} a ${new Date(weekDays[6] + 'T00:00:00').toLocaleDateString('pt-BR', { day: 'numeric', month: 'short', year: 'numeric' })}`}
            {viewMode === 'mensal' && `${months[currentDateObj.getMonth()]} de ${currentDateObj.getFullYear()}`}
          </span>
        </div>

        {/* View Mode & Add Trigger (Desktop) */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Tabs */}
          <div className="flex p-0.5 bg-slate-50 rounded-xl border border-slate-150 w-full justify-around sm:w-auto shrink-0">
            {(['diario', 'semanal', 'mensal'] as ViewMode[]).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`flex-1 sm:flex-none px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[10px] sm:text-xs font-bold uppercase tracking-wider transition-all cursor-pointer text-center ${
                  viewMode === mode 
                    ? 'bg-white text-slate-800 shadow-sm' 
                    : 'text-slate-400 hover:text-slate-600'
                }`}
              >
                {mode === 'diario' ? 'Diário' : mode === 'semanal' ? 'Semanal' : 'Mensal'}
              </button>
            ))}
          </div>

          {/* Quick Add (Desktop only) */}
          <button
            id="agenda-new-appt-btn-desktop"
            onClick={() => handleOpenCreate()}
            className="hidden sm:flex items-center justify-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-xs font-semibold shadow-md shadow-blue-600/10 cursor-pointer transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Novo Atendimento</span>
          </button>

          <button
            onClick={() => setIsNewClientModalOpen(true)}
            className="hidden sm:flex items-center justify-center gap-1.5 bg-white hover:bg-slate-50 text-blue-600 border border-blue-200 px-4 py-2 rounded-xl text-xs font-semibold shadow-sm cursor-pointer transition-all shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>Cadastrar Cliente Novo</span>
          </button>
        </div>

      </div>

      {/* CALENDAR DISPLAY TYPES */}
      
      {/* 1. DIÁRIO VIEW */}
      {viewMode === 'diario' && (
        <div className="bg-white rounded-2xl border border-slate-300 shadow-sm overflow-hidden divide-y divide-slate-300">
          <div className="p-3 sm:p-4 bg-slate-50 flex justify-between items-center">
            <h3 className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-widest">Cronograma Diário</h3>
            <span className="text-[9px] sm:text-[10px] text-slate-600 font-mono font-bold">
              {getApptsForDate(selectedDate).length} agendamento(s)
            </span>
          </div>

          <div className="divide-y divide-slate-300">
            {/* Standard hour slots: 08:00 to 19:00 */}
            {Array.from({ length: 12 }).map((_, idx) => {
              const hour = 8 + idx;
              const hourStr = `${String(hour).padStart(2, '0')}:00`;
              
              // Appointments starting exactly or during this hour slot
              const hourAppts = getApptsForDate(selectedDate).filter(
                (a) => {
                  const startNum = timeToNumber(a.startTime);
                  return Math.floor(startNum) === hour;
                }
              );

              // Appointments starting in an earlier slot but continuing into/through this hour slot
              const blockingAppts = getApptsForDate(selectedDate).filter(
                (a) => {
                  const startNum = timeToNumber(a.startTime);
                  const endNum = timeToNumber(a.endTime);
                  const startsEarlier = Math.floor(startNum) < hour;
                  const overlapsThisHour = startNum < hour + 1 && endNum > hour;
                  return startsEarlier && overlapsThisHour;
                }
              );

              return (
                <div key={hourStr} className="flex h-20 sm:h-24 group relative">
                  {/* Hour Label */}
                  <div className="w-12 sm:w-16 px-1 sm:px-4 py-2 sm:py-3 text-center sm:text-right text-[10px] sm:text-xs font-bold font-mono text-slate-500 border-r border-slate-300 bg-slate-50/50 shrink-0 flex items-center justify-center sm:justify-end">
                    {hourStr}
                  </div>
                  
                  {/* Appointments stage */}
                  <div className="flex-1 relative bg-white hover:bg-slate-50/20 transition-colors">
                    {hourAppts.length === 0 && blockingAppts.length === 0 ? (
                      <button
                        onClick={() => handleOpenCreate(hourStr, selectedDate)}
                        className="absolute inset-0 w-full h-full opacity-0 group-hover:opacity-100 flex items-center justify-center text-[10px] sm:text-xs font-bold text-blue-600 gap-1.5 transition-all cursor-pointer hover:bg-blue-50/20"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Agendar às {hourStr}</span>
                      </button>
                    ) : (
                      hourAppts.map((appt, idx) => {
                        const startVal = timeToNumber(appt.startTime);
                        const endVal = timeToNumber(appt.endTime);
                        const durationHours = Math.max(endVal - startVal, 0.5);
                        
                        const widthPercent = 100 / hourAppts.length;
                        const leftPercent = idx * widthPercent;
                        
                        const cardStyle: React.CSSProperties = {
                          position: 'absolute',
                          top: '6px',
                          left: `calc(${leftPercent}% + 8px)`,
                          width: `calc(${widthPercent}% - 16px)`,
                          height: durationHours > 1 
                            ? `calc(${durationHours} * 100% + ${durationHours - 1} * 1px - 12px)` 
                            : 'calc(100% - 12px)',
                          zIndex: durationHours > 1 ? 20 : 10,
                        };

                        return (
                          <div
                            key={appt.id}
                            onClick={(e) => handleOpenEdit(appt, e)}
                            style={cardStyle}
                            className="p-2.5 sm:p-3 bg-slate-50 dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800/80 border border-slate-200 dark:border-slate-800 rounded-xl flex flex-col justify-between cursor-pointer shadow-sm hover:shadow-md transition-all duration-150"
                          >
                            <div className="flex items-start gap-1.5 sm:gap-2.5 min-w-0 flex-1">
                              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400 flex items-center justify-center shrink-0 font-bold text-[8px] sm:text-[10px]">
                                {appt.clientName.charAt(0).toUpperCase()}
                              </div>
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <h4 className="text-[11px] sm:text-xs font-bold text-slate-800 dark:text-slate-100 leading-tight truncate">
                                    {appt.clientName}
                                  </h4>
                                  {durationHours > 1 && (
                                    <span className="bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 text-[8px] font-bold px-1.5 py-0.25 rounded-md shrink-0 uppercase tracking-wide">
                                      {formatDuration(durationHours)}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 font-medium truncate flex items-center flex-wrap gap-1 mt-0.5">
                                  <span className="font-semibold text-slate-700 dark:text-slate-300">{appt.startTime} - {appt.endTime}</span>
                                  <span>•</span>
                                  <span>{appt.serviceName}</span>
                                  {appt.recurrence && appt.recurrence !== 'Único' && (
                                    <span className="inline-flex items-center gap-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1 py-0.25 rounded-md font-bold text-[8px] sm:text-[9px] scale-90">
                                      🔄 {appt.recurrence}
                                    </span>
                                  )}
                                </p>
                              </div>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-1 sm:gap-2 shrink-0 border-t border-slate-100 dark:border-slate-800/80 pt-1.5 mt-1">
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSendWhatsAppReminder(appt);
                                  }}
                                  className="p-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition-colors cursor-pointer border border-emerald-100"
                                  title="Enviar lembrete por WhatsApp"
                                >
                                  <MessageSquare className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                                </button>
                                <span className={`text-[7px] sm:text-[8px] px-1 sm:px-1.5 py-0.25 rounded-full font-bold border ${getStatusBadgeStyle(appt.status)}`}>
                                  {appt.status}
                                </span>
                                <span className={`text-[7px] sm:text-[8px] px-1 sm:px-1.5 py-0.25 rounded-full font-bold border ${getPaymentBadgeStyle(appt.paymentStatus)}`}>
                                  {appt.paymentStatus}
                                </span>
                              </div>
                              <span className="text-[10px] sm:text-xs font-bold text-slate-800 dark:text-slate-100 font-mono">
                                {formatCurrency(appt.price)}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. SEMANAL VIEW */}
      {viewMode === 'semanal' && (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
          {weekDays.map((dateStr, i) => {
            const isToday = dateStr === new Date().toISOString().split('T')[0];
            const isSelected = dateStr === selectedDate;
            const dayAppts = getApptsForDate(dateStr);
            const dateObj = new Date(dateStr + 'T00:00:00');

            return (
              <div
                key={dateStr}
                onClick={() => setSelectedDate(dateStr)}
                className={`bg-white rounded-2xl border shadow-sm p-4 flex flex-col min-h-64 transition-all duration-150 cursor-pointer ${
                  isSelected 
                    ? 'border-blue-500 ring-1 ring-blue-500/20' 
                    : isToday 
                    ? 'border-blue-200 bg-blue-50/5' 
                    : 'border-slate-200 hover:border-slate-300'
                }`}
              >
                {/* Header of Column */}
                <div className="border-b border-slate-100 pb-2 mb-3 text-center space-y-0.5 shrink-0">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                    {daysOfWeek[i]}
                  </span>
                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full font-extrabold text-xs leading-none ${
                    isToday 
                      ? 'bg-blue-600 text-white' 
                      : 'text-slate-700'
                  }`}>
                    {dateObj.getDate()}
                  </span>
                </div>

                {/* Day's appointments stack */}
                <div className="flex-1 space-y-2 overflow-y-auto max-h-96 pr-0.5">
                  {dayAppts.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center py-8 opacity-40">
                      <Clock className="w-4 h-4 text-slate-300 mb-1" />
                      <span className="text-[9px] text-slate-400">Sem horários</span>
                    </div>
                  ) : (
                    dayAppts.map((appt) => (
                      <div
                        key={appt.id}
                        onClick={(e) => handleOpenEdit(appt, e)}
                        className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-150 rounded-xl space-y-1.5 transition-all text-left"
                      >
                        <div className="truncate">
                          <p className="text-[10px] font-extrabold text-slate-800 leading-tight truncate">
                            {appt.clientName}
                          </p>
                          <p className="text-[9px] text-slate-500 truncate mt-0.5">
                            {appt.serviceName}
                          </p>
                          {appt.recurrence && appt.recurrence !== 'Único' && (
                            <p className="text-[8px] font-bold text-slate-400 flex items-center gap-0.5 mt-0.5">
                              🔄 {appt.recurrence}
                            </p>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between text-[8px] border-t border-slate-100 pt-1 text-slate-400">
                          <span className="font-semibold">{appt.startTime}h</span>
                          <span className="font-bold text-slate-700">{formatCurrency(appt.price)}</span>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Quick Add at column footer */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleOpenCreate(undefined, dateStr);
                  }}
                  className="mt-3 py-1 text-[9px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg w-full flex items-center justify-center gap-1 border border-transparent hover:border-blue-200 transition-all shrink-0 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Novo</span>
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* 3. MENSAL VIEW */}
      {viewMode === 'mensal' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {/* Day Names Grid Header */}
          <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50/50 text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest py-3">
            {daysOfWeek.map(d => <div key={d}>{d}</div>)}
          </div>

          {/* Calendario Grid (6 weeks, 42 squares) */}
          <div className="grid grid-cols-7 divide-x divide-y divide-slate-300 bg-slate-300">
            {monthDays.map((cell, index) => {
              const isToday = cell.dateStr === new Date().toISOString().split('T')[0];
              const isSelected = cell.dateStr === selectedDate;
              const cellAppts = getApptsForDate(cell.dateStr);

              return (
                <div
                  key={`${cell.dateStr}-${index}`}
                  onClick={() => setSelectedDate(cell.dateStr)}
                  className={`bg-white min-h-24 p-2 flex flex-col justify-between transition-all duration-150 cursor-pointer relative hover:bg-slate-50/30 ${
                    isSelected 
                      ? 'ring-1 ring-blue-500 ring-inset bg-blue-50/5 z-10' 
                      : ''
                  }`}
                >
                  {/* Day Indicator */}
                  <div className="flex justify-between items-center mb-1 shrink-0">
                    <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-extrabold ${
                      isToday 
                        ? 'bg-blue-600 text-white' 
                        : cell.isCurrentMonth 
                        ? 'text-slate-700' 
                        : 'text-slate-300'
                    }`}>
                      {cell.label}
                    </span>
                    
                    {cellAppts.length > 0 && (
                      <span className="text-[8px] bg-slate-100 text-slate-500 font-extrabold px-1 rounded">
                        {cellAppts.length}
                      </span>
                    )}
                  </div>

                  {/* Indicators / Dot stack */}
                  <div className="flex-1 overflow-y-auto space-y-1 max-h-16 pr-0.5">
                    {cellAppts.slice(0, 3).map((appt) => (
                      <div
                        key={appt.id}
                        className="text-[8px] leading-tight px-1.5 py-0.5 bg-slate-50 hover:bg-slate-100 border border-slate-150 rounded truncate text-slate-600 font-medium"
                        title={`${appt.clientName} - ${appt.serviceName}`}
                      >
                        {appt.startTime} • {appt.clientName.split(' ')[0]}
                      </div>
                    ))}
                    {cellAppts.length > 3 && (
                      <p className="text-[7px] text-slate-400 font-semibold pl-1">
                        + {cellAppts.length - 3} outros
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT APPOINTMENT */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-slate-100 max-w-lg w-full overflow-hidden shadow-2xl flex flex-col max-h-[96vh] sm:max-h-[90vh]"
            >
              <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50 flex justify-between items-center shrink-0">
                <div>
                  <h3 className="font-bold text-slate-800 text-xs sm:text-sm">
                    {editingAppt ? 'Editar Atendimento' : 'Novo Atendimento'}
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">
                    Selecione o cliente, defina os serviços e sincronize com a clínica.
                  </p>
                </div>
                {editingAppt && (
                  <button
                    id="agenda-modal-delete-btn"
                    type="button"
                    onClick={handleDeleteClick}
                    className="p-1.5 sm:p-2 text-rose-500 hover:bg-rose-50 hover:text-rose-700 rounded-xl transition-all cursor-pointer"
                    title="Cancelar agendamento"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4 sm:space-y-5">
                
                {formError && (
                  <div className="p-3 bg-rose-50 text-rose-800 text-xs rounded-xl font-medium flex items-center gap-1.5 border border-rose-100">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                {/* CLIENT SELECT & QUICK CREATION */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label htmlFor="appt-client-search" className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      Cliente do Atendimento <span className="text-rose-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsNewClientModalOpen(true)}
                      className="text-[10px] font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                    >
                      + Cadastrar Cliente Novo
                    </button>
                  </div>

                  <div className="relative" ref={clientSearchContainerRef}>
                    <input
                      id="appt-client-search"
                      type="text"
                      placeholder="Pesquisar cliente pelo nome... (ex: Roberto)"
                      value={clientSearchQuery}
                      onChange={(e) => {
                        const val = e.target.value;
                        setClientSearchQuery(val);
                        setIsClientSuggestionsOpen(true);
                        
                        // Check if typed text matches exactly any client's name
                        const exactMatch = clients.find(
                          (c) => c.name.toLowerCase() === val.trim().toLowerCase()
                        );
                        if (exactMatch) {
                          setClientId(exactMatch.id);
                        } else {
                          // Clear selected clientId if no exact match or if empty
                          setClientId('');
                        }
                      }}
                      onFocus={() => setIsClientSuggestionsOpen(true)}
                      required
                      className="w-full px-2.5 sm:px-3.5 py-1.5 sm:py-2 border border-slate-200 focus:border-blue-500 focus:outline-none rounded-xl text-xs bg-white dark:bg-slate-900 dark:border-slate-800 transition-colors"
                    />
                    
                    {/* Floating suggestions list */}
                    {isClientSuggestionsOpen && (
                      <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl max-h-48 overflow-y-auto z-50 p-1">
                        {filteredClientsForDropdown.length === 0 ? (
                          <div className="p-3 text-center text-xs text-slate-400">
                            Nenhum cliente encontrado
                          </div>
                        ) : (
                          filteredClientsForDropdown.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                setClientId(c.id);
                                setClientSearchQuery(c.name);
                                setIsClientSuggestionsOpen(false);
                              }}
                              className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center justify-between ${
                                clientId === c.id
                                  ? 'bg-blue-50 text-blue-700 font-bold dark:bg-blue-950/40 dark:text-blue-400'
                                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/60 text-slate-700 dark:text-slate-300'
                              }`}
                            >
                              <span>{c.name}</span>
                              {clientId === c.id && <CheckCircle className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                    {/* Hidden required field to maintain native form validation */}
                    <input 
                      type="hidden" 
                      value={clientId} 
                      required 
                      title="Selecione um cliente válido da lista"
                    />
                  </div>
                </div>

                <form onSubmit={handleFormSubmit} className="space-y-3.5 sm:space-y-4">
                  
                  {/* DATE & START/END TIMES */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                    <div className="space-y-1">
                      <label htmlFor="appt-date" className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                        Data <span className="text-rose-500">*</span>
                      </label>
                      <input
                        id="appt-date"
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        required
                        className="w-full px-2.5 sm:px-3.5 py-1.5 sm:py-2 border border-slate-200 focus:border-blue-500 focus:outline-none rounded-xl text-xs transition-colors"
                      />
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="appt-start-time" className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                        Hora Início <span className="text-rose-500">*</span>
                      </label>
                      <input
                        id="appt-start-time"
                        type="time"
                        value={startTime}
                        onChange={(e) => setStartTime(e.target.value)}
                        required
                        className="w-full px-2.5 sm:px-3.5 py-1.5 sm:py-2 border border-slate-200 focus:border-blue-500 focus:outline-none rounded-xl text-xs transition-colors"
                      />
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="appt-end-time" className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                        Hora Término <span className="text-rose-500">*</span>
                      </label>
                      <input
                        id="appt-end-time"
                        type="time"
                        value={endTime}
                        onChange={(e) => setEndTime(e.target.value)}
                        required
                        className="w-full px-2.5 sm:px-3.5 py-1.5 sm:py-2 border border-slate-200 focus:border-blue-500 focus:outline-none rounded-xl text-xs transition-colors"
                      />
                    </div>
                  </div>

                  {/* SERVICE NAME & PRICE */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                    <div className="space-y-1 sm:col-span-2 relative">
                      <label htmlFor="appt-service" className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                        Serviço Realizado <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          id="appt-service"
                          type="text"
                          placeholder="Ex: Manutenção Mensal Prótese de Micropele"
                          value={serviceName}
                          onChange={(e) => setServiceName(e.target.value)}
                          required
                          className="w-full pl-3.5 pr-10 py-1.5 sm:py-2 border border-slate-200 focus:border-blue-500 focus:outline-none rounded-xl text-xs transition-colors"
                          onClick={() => setIsServiceDropdownOpen(true)}
                          onFocus={() => setIsServiceDropdownOpen(true)}
                        />
                        <button
                          type="button"
                          onClick={() => setIsServiceDropdownOpen(!isServiceDropdownOpen)}
                          className="absolute right-0 top-0 h-full px-3 flex items-center text-slate-400 hover:text-slate-600 focus:outline-none border-l border-slate-100"
                          title="Selecionar da lista de serviços"
                        >
                          <ChevronLeft className="w-4 h-4 transform -rotate-90 text-slate-500" />
                        </button>
                      </div>

                      {isServiceDropdownOpen && (
                        <>
                          <div 
                            className="fixed inset-0 z-20" 
                            onClick={() => setIsServiceDropdownOpen(false)}
                          />
                          <div className="absolute left-0 mt-1 w-full bg-white border border-slate-200 rounded-2xl shadow-xl z-30 max-h-80 overflow-y-auto p-3 space-y-3">
                            <div className="flex items-center justify-between border-b border-slate-100 pb-2 text-[11px] font-bold text-slate-600">
                              <span>Selecione por Categoria (Grupo)</span>
                              <button 
                                type="button" 
                                onClick={() => setIsServiceDropdownOpen(false)}
                                className="text-slate-400 hover:text-slate-600 text-[10px]"
                              >
                                Fechar ×
                              </button>
                            </div>

                            {categories.length === 0 ? (
                              <div className="text-center py-6 text-slate-400 text-[11px]">
                                Nenhuma categoria cadastrada. Cadastre em Serviços.
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {categories.map((category) => {
                                  const categoryServices = services.filter(s => s.categoryId === category.id);
                                  const isExpanded = activeCategoryForServiceDropdown === category.id;
                                  
                                  return (
                                    <div key={category.id} className="border border-slate-100 rounded-xl overflow-hidden bg-slate-50/50">
                                      <button
                                        type="button"
                                        onClick={() => setActiveCategoryForServiceDropdown(isExpanded ? null : category.id)}
                                        className="w-full flex items-center justify-between px-3 py-2 text-left font-bold text-slate-700 bg-slate-100/60 hover:bg-slate-100 transition-colors text-[11px]"
                                      >
                                        <div className="flex items-center gap-1.5">
                                          <Scissors className="w-3.5 h-3.5 text-slate-500" />
                                          <span>{category.name}</span>
                                        </div>
                                        <div className="flex items-center gap-1">
                                          <span className="text-[9px] bg-slate-200/80 px-1.5 py-0.5 rounded-full text-slate-600 font-extrabold">
                                            {categoryServices.length}
                                          </span>
                                          <ChevronLeft className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-200 ${isExpanded ? '-rotate-90' : ''}`} />
                                        </div>
                                      </button>

                                      {isExpanded && (
                                        <div className="divide-y divide-slate-100 bg-white p-1">
                                          {categoryServices.length === 0 ? (
                                            <div className="text-center py-3 text-slate-400 text-[10px] italic">
                                              Sem serviços nesta categoria.
                                            </div>
                                          ) : (
                                            categoryServices.map((service) => (
                                              <button
                                                key={service.id}
                                                type="button"
                                                onClick={() => {
                                                  setServiceName(service.name);
                                                  setPrice(service.price.toString());
                                                  
                                                  if (startTime) {
                                                    try {
                                                      const [h, m] = startTime.split(':').map(Number);
                                                      const totalMin = h * 60 + m + service.durationMinutes;
                                                      const endH = String(Math.floor(totalMin / 60) % 24).padStart(2, '0');
                                                      const endM = String(totalMin % 60).padStart(2, '0');
                                                      setEndTime(`${endH}:${endM}`);
                                                    } catch (err) {
                                                      console.error(err);
                                                    }
                                                  }
                                                  setIsServiceDropdownOpen(false);
                                                }}
                                                className="w-full flex items-center justify-between px-3 py-1.5 hover:bg-blue-50/55 text-left transition-colors text-[11px] rounded-lg group"
                                              >
                                                <span className="font-medium text-slate-600 group-hover:text-blue-700">{service.name}</span>
                                                <div className="flex items-center gap-2 text-[10px] text-slate-400 font-semibold shrink-0">
                                                  <span>{service.durationMinutes} min</span>
                                                  <span className="text-slate-200">•</span>
                                                  <span className="text-blue-600 font-bold bg-blue-50 group-hover:bg-blue-100/70 px-1.5 py-0.5 rounded">
                                                    R$ {service.price.toFixed(2).replace('.', ',')}
                                                  </span>
                                                </div>
                                              </button>
                                            ))
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="appt-price" className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                        Valor Cobrado (R$) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        id="appt-price"
                        type="text"
                        placeholder="Ex: 220,00"
                        value={price}
                        onChange={(e) => setPrice(e.target.value)}
                        required
                        className="w-full px-2.5 sm:px-3.5 py-1.5 sm:py-2 border border-slate-200 focus:border-blue-500 focus:outline-none rounded-xl text-xs transition-colors"
                      />
                    </div>
                  </div>

                  {/* STATUSES & PAYMENT FIELDS */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                    <div className="space-y-1">
                      <label htmlFor="appt-status" className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                        Status do Serviço <span className="text-rose-500">*</span>
                      </label>
                      <select
                        id="appt-status"
                        value={status}
                        onChange={(e) => setStatus(e.target.value as AppointmentStatus)}
                        className="w-full px-2.5 sm:px-3.5 py-1.5 sm:py-2 border border-slate-200 focus:border-blue-500 focus:outline-none rounded-xl text-xs bg-white transition-colors"
                      >
                        <option value="Agendado">Agendado</option>
                        <option value="Confirmado">Confirmado</option>
                        <option value="Realizado">Realizado</option>
                        <option value="Cancelado">Cancelado</option>
                        <option value="Não compareceu">Não compareceu</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="appt-payment-status" className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                        Status de Pagamento <span className="text-rose-500">*</span>
                      </label>
                      <select
                        id="appt-payment-status"
                        value={paymentStatus}
                        onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                        className="w-full px-2.5 sm:px-3.5 py-1.5 sm:py-2 border border-slate-200 focus:border-blue-500 focus:outline-none rounded-xl text-xs bg-white transition-colors"
                      >
                        <option value="Pendente">Pendente</option>
                        <option value="Pago">Pago</option>
                        <option value="Parcialmente pago">Parcialmente pago</option>
                        <option value="Cortesia">Cortesia</option>
                        <option value="Cancelado">Cancelado</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="appt-payment-method" className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                        Forma de Pagamento
                      </label>
                      <select
                        id="appt-payment-method"
                        value={paymentMethod}
                        disabled={paymentStatus !== 'Pago' && paymentStatus !== 'Parcialmente pago'}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-full px-2.5 sm:px-3.5 py-1.5 sm:py-2 border border-slate-200 focus:border-blue-500 focus:outline-none rounded-xl text-xs bg-white transition-colors disabled:opacity-50"
                      >
                        <option value="Pix">Pix</option>
                        <option value="Cartão de Crédito">Cartão de Crédito</option>
                        <option value="Cartão de Débito">Cartão de Débito</option>
                        <option value="Dinheiro">Dinheiro</option>
                        <option value="Transferência">Transferência</option>
                      </select>
                    </div>
                  </div>

                  {/* RECURRENCE SETTINGS */}
                  {!editingAppt && (
                    <div className="bg-slate-50 border border-slate-200/60 p-4 rounded-2xl space-y-3">
                      <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
                        <span className="p-1 bg-white border border-slate-200 rounded-lg shadow-sm">🔄</span>
                        <span>Agendamento Recorrente (Diário, Semanal ou Mensal)</span>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div className="space-y-1">
                          <label htmlFor="appt-recurrence" className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                            Frequência
                          </label>
                          <select
                            id="appt-recurrence"
                            value={recurrence}
                            onChange={(e) => setRecurrence(e.target.value as any)}
                            className="w-full px-2.5 sm:px-3.5 py-1.5 sm:py-2 border border-slate-200 focus:border-blue-500 focus:outline-none rounded-xl text-xs bg-white transition-colors"
                          >
                            <option value="Único">Único (Sem repetição)</option>
                            <option value="Diário">Diário</option>
                            <option value="Semanal">Semanal</option>
                            <option value="Mensal">Mensal</option>
                          </select>
                        </div>

                        {recurrence !== 'Único' && (
                          <div className="space-y-1">
                            <label htmlFor="appt-repeat-count" className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                              Quantidade de Repetições <span className="text-rose-500">*</span>
                            </label>
                            <input
                              id="appt-repeat-count"
                              type="number"
                              min={2}
                              max={24}
                              value={repeatCount}
                              onChange={(e) => setRepeatCount(Math.max(2, parseInt(e.target.value) || 2))}
                              required
                              className="w-full px-2.5 sm:px-3.5 py-1.5 sm:py-2 border border-slate-200 focus:border-blue-500 focus:outline-none rounded-xl text-xs transition-colors"
                            />
                            <p className="text-[10px] text-slate-400">Irão ser criados {repeatCount} agendamentos no total.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* OBSERVATIONS / NOTES */}
                  <div className="space-y-1">
                    <label htmlFor="appt-notes" className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      Observações e Detalhes do Agendamento <span className="text-slate-400 text-[9px]">(Opcional)</span>
                    </label>
                    <textarea
                      id="appt-notes"
                      placeholder="Ex: Utilizar cola específica no contorno da micropele, corte integrado com tesoura fio laser..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={2}
                      className="w-full px-2.5 sm:px-3.5 py-1.5 sm:py-2 border border-slate-200 focus:border-blue-500 focus:outline-none rounded-xl text-xs transition-colors resize-none"
                    />
                  </div>

                  {/* GOOGLE CALENDAR ACTIVE BADGE */}
                  {enableGoogleCalendar && (
                    <div className="p-3 bg-blue-50/50 border border-blue-100 rounded-xl flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2 text-blue-950 font-medium">
                        <Globe className="w-4 h-4 text-blue-600 animate-pulse" />
                        <span>Sincronização Ativa</span>
                      </div>
                      <span className="text-[10px] text-blue-700 bg-white border border-blue-150 px-2 py-0.5 rounded-full font-bold">
                        {googleAccessToken ? 'Google Calendar Conectado' : 'Apenas Local'}
                      </span>
                    </div>
                  )}

                  {/* FOOTER ACTIONS */}
                  <div className="flex gap-3 justify-end pt-3 border-t border-slate-50">
                    {editingAppt && (
                      <button
                        type="button"
                        onClick={() => handleSendWhatsAppReminder(editingAppt)}
                        className="mr-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs transition-all shadow-md shadow-emerald-600/10 cursor-pointer flex items-center gap-1.5"
                      >
                        <MessageSquare className="w-4 h-4" />
                        <span>Lembrete WhatsApp</span>
                      </button>
                    )}
                    <button
                      id="appt-modal-cancel"
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="px-4 py-2 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 font-semibold rounded-xl text-xs transition-all cursor-pointer"
                    >
                      Cancelar
                    </button>
                    <button
                      id="appt-modal-submit"
                      type="submit"
                      className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs transition-all shadow-md shadow-blue-600/10 cursor-pointer"
                    >
                      {editingAppt ? 'Salvar Alterações' : 'Confirmar Atendimento'}
                    </button>
                  </div>

                </form>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Pop-up de Cadastrar Cliente Novo */}
      <AnimatePresence>
        {isNewClientModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsNewClientModalOpen(false)}
              className="absolute inset-0 bg-slate-900/45 backdrop-blur-sm"
            />
            
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-2xl border border-slate-100 max-w-md w-full overflow-hidden shadow-2xl flex flex-col max-h-[96vh] sm:max-h-[90vh] z-10"
            >
              <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50 shrink-0 flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-800 text-xs sm:text-sm">
                    Cadastrar Novo Cliente
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5">
                    Preencha os campos abaixo para salvar o cadastro na clínica.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsNewClientModalOpen(false)}
                  className="p-1.5 hover:bg-slate-100 text-slate-400 hover:text-slate-600 rounded-full transition-colors animate-none"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleNewClientSubmit} className="p-4 sm:p-5 space-y-3.5 sm:space-y-4 flex-1 overflow-y-auto">
                <div className="space-y-1">
                  <label htmlFor="new-client-name" className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Nome Completo <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="new-client-name"
                    type="text"
                    placeholder="Ex: Roberto Alves"
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 border border-slate-200 focus:border-blue-500 focus:outline-none rounded-xl text-xs transition-colors bg-white text-slate-800"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1 sm:col-span-2">
                    <label htmlFor="new-client-phone" className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      Celular / Telefone <span className="text-rose-500">*</span>
                    </label>
                    <input
                      id="new-client-phone"
                      type="text"
                      placeholder="Ex: (11) 98765-4321"
                      value={newClientPhone}
                      onChange={(e) => setNewClientPhone(e.target.value)}
                      required
                      className="w-full px-3.5 py-2 border border-slate-200 focus:border-blue-500 focus:outline-none rounded-xl text-xs transition-colors bg-white text-slate-800"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="new-client-email" className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      E-mail <span className="text-slate-400 text-[9px]">(Opcional)</span>
                    </label>
                    <input
                      id="new-client-email"
                      type="email"
                      placeholder="Ex: roberto@email.com"
                      value={newClientEmail}
                      onChange={(e) => setNewClientEmail(e.target.value)}
                      className="w-full px-3.5 py-2 border border-slate-200 focus:border-blue-500 focus:outline-none rounded-xl text-xs transition-colors bg-white text-slate-800"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="new-client-cep" className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      CEP Funcional <span className="text-slate-400 text-[9px]">(Opcional)</span>
                    </label>
                    <input
                      id="new-client-cep"
                      type="text"
                      placeholder="Ex: 01001-000"
                      value={newClientCep}
                      onChange={(e) => setNewClientCep(e.target.value)}
                      className="w-full px-3.5 py-2 border border-slate-200 focus:border-blue-500 focus:outline-none rounded-xl text-xs transition-colors bg-white text-slate-800"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-3.5">
                  <div className="space-y-1">
                    <label htmlFor="new-client-hair-color" className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      Cor do Cabelo <span className="text-slate-400 text-[9px]">(Opcional)</span>
                    </label>
                    <input
                      id="new-client-hair-color"
                      type="text"
                      placeholder="Ex: Castanho Escuro, Grisalho..."
                      value={newClientHairColor}
                      onChange={(e) => setNewClientHairColor(e.target.value)}
                      className="w-full px-3.5 py-2 border border-slate-200 focus:border-blue-500 focus:outline-none rounded-xl text-xs transition-colors bg-white text-slate-800"
                    />
                  </div>

                  <div className="space-y-1">
                    <label htmlFor="new-client-base-type" className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                      Tipo de Base Prótese <span className="text-slate-400 text-[9px]">(Opcional)</span>
                    </label>
                    <input
                      id="new-client-base-type"
                      type="text"
                      placeholder="Ex: Híbrida, Silicone (PU), Lace..."
                      value={newClientBaseType}
                      onChange={(e) => setNewClientBaseType(e.target.value)}
                      className="w-full px-3.5 py-2 border border-slate-200 focus:border-blue-500 focus:outline-none rounded-xl text-xs transition-colors bg-white text-slate-800"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label htmlFor="new-client-notes" className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Observações <span className="text-slate-400 text-[9px]">(Opcional)</span>
                  </label>
                  <textarea
                    id="new-client-notes"
                    placeholder="Ex: Detalhes de tamanho, tipo de prótese, cola recomendada, fita preferida..."
                    value={newClientNotes}
                    onChange={(e) => setNewClientNotes(e.target.value)}
                    rows={3}
                    className="w-full px-3.5 py-2 border border-slate-200 focus:border-blue-500 focus:outline-none rounded-xl text-xs transition-colors resize-none bg-white text-slate-800"
                  />
                </div>

                <div className="flex gap-3 justify-end pt-2 border-t border-slate-50">
                  <button
                    type="button"
                    onClick={() => setIsNewClientModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 font-semibold rounded-xl text-xs transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs transition-all shadow-md shadow-blue-600/10 cursor-pointer"
                  >
                    Salvar Cadastro
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
