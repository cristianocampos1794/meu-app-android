import { 
  Users, 
  Calendar, 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  FileText,
  User,
  Scissors
} from 'lucide-react';
import { Client, Appointment, FinancialTransaction } from '../types';
import { motion } from 'motion/react';

interface DashboardViewProps {
  clients: Client[];
  appointments: Appointment[];
  transactions: FinancialTransaction[];
  onSelectClient: (clientId: string) => void;
  onEditAppointment: (appt: Appointment) => void;
}

export default function DashboardView({
  clients,
  appointments,
  transactions,
  onSelectClient,
  onEditAppointment
}: DashboardViewProps) {
  
  const todayStr = new Date().toISOString().split('T')[0];
  const currentYearMonth = todayStr.substring(0, 7); // "YYYY-MM"

  // Helper to check if date is in current week (Sunday to Saturday)
  const isCurrentWeek = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    
    // Get start of current week (Sunday)
    const sunday = new Date(today);
    sunday.setDate(today.getDate() - today.getDay());
    sunday.setHours(0, 0, 0, 0);
    
    // Get end of current week (Saturday)
    const saturday = new Date(sunday);
    saturday.setDate(sunday.getDate() + 6);
    saturday.setHours(23, 59, 59, 999);

    return d >= sunday && d <= saturday;
  };

  // Calculations
  const apptsToday = appointments.filter(a => a.date === todayStr && a.status !== 'Cancelado');
  const apptsThisWeek = appointments.filter(a => isCurrentWeek(a.date) && a.status !== 'Cancelado');
  const apptsThisMonth = appointments.filter(a => a.date.startsWith(currentYearMonth) && a.status !== 'Cancelado');
  
  const totalClients = clients.length;

  const revenueToday = transactions
    .filter(t => t.type === 'Entrada' && t.date === todayStr)
    .reduce((sum, t) => sum + t.amount, 0);

  const revenueThisMonth = transactions
    .filter(t => t.type === 'Entrada' && t.date.startsWith(currentYearMonth))
    .reduce((sum, t) => sum + t.amount, 0);

  const pendingAmount = appointments
    .filter(a => a.paymentStatus === 'Pendente' && a.status !== 'Cancelado')
    .reduce((sum, a) => sum + a.price, 0);

  // Next upcoming appointments (today and in the future, chronological order)
  const upcomingAppointments = appointments
    .filter(a => {
      if (a.status === 'Cancelado' || a.status === 'Realizado') return false;
      // Is today or future
      return a.date >= todayStr;
    })
    .sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      return a.startTime.localeCompare(b.startTime);
    })
    .slice(0, 5);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'Agendado': return 'bg-sky-50 text-sky-700 border-sky-200';
      case 'Confirmado': return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'Realizado': return 'bg-slate-50 text-slate-600 border-slate-200';
      case 'Cancelado': return 'bg-rose-50 text-rose-700 border-rose-200';
      case 'Não compareceu': return 'bg-amber-50 text-amber-700 border-amber-200';
      default: return 'bg-slate-100 text-slate-700';
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Greetings Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Bem-vindo de volta!</h2>
        <p className="text-sm text-slate-500">Veja o resumo geral do dia e gerencie seus agendamentos.</p>
      </div>

      {/* Grid de Métricas (Bento Grid) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Atendimentos Hoje */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Atendimentos Hoje</span>
            <span className="text-2xl font-bold text-slate-850">{apptsToday.length}</span>
            <div className="text-[11px] text-slate-500">
              <span className="text-blue-600 font-semibold">{apptsThisWeek.length}</span> na semana
            </div>
          </div>
          <div className="p-3 bg-blue-50 rounded-xl text-blue-600 shrink-0">
            <Calendar className="w-6 h-6" />
          </div>
        </div>

        {/* Total Clientes */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Clientes Cadastrados</span>
            <span className="text-2xl font-bold text-slate-850">{totalClients}</span>
            <div className="text-[11px] text-slate-500">
              <span className="text-blue-600 font-semibold">{apptsThisMonth.length}</span> atendidos este mês
            </div>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl text-slate-500 shrink-0">
            <Users className="w-6 h-6" />
          </div>
        </div>

        {/* Faturamento do Mês */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between col-span-1 sm:col-span-1 lg:col-span-2">
          <div className="space-y-2 flex-1">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Faturamento e Caixa</span>
            <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <div>
                <span className="text-2xl font-bold text-slate-850">{formatCurrency(revenueThisMonth)}</span>
                <span className="text-[10px] text-slate-400 block">Este mês ({new Date().toLocaleString('pt-BR', { month: 'long' })})</span>
              </div>
              <div className="border-l border-slate-200 pl-4">
                <span className="text-lg font-bold text-slate-700">{formatCurrency(revenueToday)}</span>
                <span className="text-[10px] text-slate-400 block">Hoje</span>
              </div>
            </div>
          </div>
          <div className="p-3 bg-blue-600 rounded-xl text-white shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Valores Pendentes */}
        <div className="bg-amber-50 p-6 rounded-2xl border border-amber-100 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-semibold text-amber-800 uppercase tracking-wider block">A Receber / Pendente</span>
            <span className="text-2xl font-bold text-amber-900">{formatCurrency(pendingAmount)}</span>
            <span className="text-[10px] text-amber-700 block">Em aberto na agenda</span>
          </div>
          <div className="p-3 bg-amber-100 rounded-xl text-amber-800 shrink-0">
            <DollarSign className="w-6 h-6" />
          </div>
        </div>

        {/* Mini Chart / Status Box */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm col-span-1 sm:col-span-2 lg:col-span-3 flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-700 mb-2">Visão Rápida dos Atendimentos</h3>
            <p className="text-xs text-slate-400">Distribuição dos status dos atendimentos deste mês:</p>
          </div>
          
          <div className="mt-4 grid grid-cols-5 gap-2 text-center">
            {['Agendado', 'Confirmado', 'Realizado', 'Cancelado', 'Não compareceu'].map((status) => {
              const count = appointments.filter(a => a.status === status && a.date.startsWith(currentYearMonth)).length;
              const total = appointments.filter(a => a.date.startsWith(currentYearMonth)).length || 1;
              const percentage = Math.round((count / total) * 100);

              return (
                <div key={status} className="bg-slate-50 p-3 rounded-xl flex flex-col justify-between h-20 border border-slate-100">
                  <span className="text-[9px] text-slate-500 font-medium truncate uppercase">{status}</span>
                  <span className="text-lg font-bold text-slate-700 block">{count}</span>
                  <div className="w-full bg-slate-200 h-1 rounded-full overflow-hidden">
                    <div className="bg-blue-500 h-full" style={{ width: `${percentage}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Próximos Agendamentos & Ações Rápidas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Próximos Agendamentos */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm col-span-1 lg:col-span-2 space-y-4">
          <div className="flex justify-between items-center pb-2 border-b border-slate-50">
            <h3 className="font-bold text-slate-800 text-base">Próximos Agendamentos</h3>
            <span className="text-xs font-mono bg-slate-100 text-slate-600 px-2 py-1 rounded-full">
              {upcomingAppointments.length} agendados
            </span>
          </div>

          {upcomingAppointments.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <Calendar className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-xs">Não há próximos agendamentos confirmados ou pendentes.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {upcomingAppointments.map((appt) => {
                const dateParts = appt.date.split('-');
                const formattedDate = `${dateParts[2]}/${dateParts[1]}`;
                
                // Get Portuguese weekday names
                const dateObj = new Date(appt.date + 'T12:00:00');
                const weekdaysShort = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
                const weekdaysLong = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
                const dayOfWeekShort = weekdaysShort[dateObj.getDay()];
                const dayOfWeekLong = weekdaysLong[dateObj.getDay()];
                
                return (
                  <div key={appt.id} className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 first:pt-0 last:pb-0 group">
                    <div className="flex items-start gap-3">
                      {/* Date Indicator badge with Day of the Week */}
                      <div className="w-14 h-12 rounded-xl bg-slate-50 border border-slate-200 flex flex-col items-center justify-center shrink-0">
                        <span className="text-[9px] font-black uppercase text-slate-400 leading-none">{dayOfWeekShort}</span>
                        <span className="text-xs font-extrabold text-slate-700 mt-0.5">{formattedDate}</span>
                      </div>
                      <div className="space-y-0.5 truncate">
                        <h4 className="text-xs font-bold text-slate-700 hover:text-blue-600 transition-colors cursor-pointer truncate" onClick={() => onSelectClient(appt.clientId)}>
                          {appt.clientName}
                        </h4>
                        <p className="text-[11px] text-slate-500 font-medium truncate">{appt.serviceName}</p>
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                          <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{appt.startTime}h - {appt.endTime}h</span>
                          <span>•</span>
                          <span className="font-semibold text-slate-600 bg-slate-100/80 px-1.5 py-0.5 rounded text-[9px] dark:bg-slate-800 dark:text-slate-300">{dayOfWeekLong}</span>
                          <span>•</span>
                          <span className="font-semibold text-slate-700">{formatCurrency(appt.price)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <span className={`text-[10px] px-2.5 py-1 rounded-full font-semibold border ${getStatusBadgeStyle(appt.status)}`}>
                        {appt.status}
                      </span>
                      <button
                        onClick={() => onEditAppointment(appt)}
                        className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-50 rounded-lg transition-all"
                        title="Editar agendamento"
                      >
                        <FileText className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Clientes de Hoje */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="pb-2 border-b border-slate-50 flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-800 text-base">Clientes de Hoje</h3>
              <p className="text-[11px] text-slate-400">Atendimentos agendados para o dia de hoje</p>
            </div>
            {appointments.filter(a => a.date === todayStr).length > 0 && (
              <span className="text-[10px] font-bold bg-blue-50 text-blue-600 px-2.5 py-0.5 rounded-full">
                {appointments.filter(a => a.date === todayStr).length} {appointments.filter(a => a.date === todayStr).length === 1 ? 'cliente' : 'clientes'}
              </span>
            )}
          </div>

          <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
            {appointments
              .filter(a => a.date === todayStr)
              .sort((a, b) => a.startTime.localeCompare(b.startTime))
              .map((appt) => (
                <div
                  key={appt.id}
                  onClick={() => onSelectClient(appt.clientId)}
                  className="p-3 bg-slate-50/50 hover:bg-blue-50/30 border border-slate-200 hover:border-blue-100 rounded-xl flex items-center justify-between gap-3 transition-all duration-200 cursor-pointer group"
                >
                  <div className="flex items-center gap-3 truncate">
                    <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex flex-col items-center justify-center shrink-0 text-[10px] font-black border border-blue-100 shadow-sm">
                      <span className="text-[10px] font-black">{appt.startTime}</span>
                    </div>
                    <div className="truncate">
                      <p className="text-xs font-bold text-slate-700 group-hover:text-blue-700 transition-colors truncate">
                        {appt.clientName}
                      </p>
                      <p className="text-[10px] text-slate-500 font-medium truncate">
                        {appt.serviceName}
                      </p>
                      <p className="text-[9px] text-slate-400 font-mono mt-0.5">{appt.clientPhone}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[8px] sm:text-[9px] px-2 py-0.5 rounded-full font-bold border ${getStatusBadgeStyle(appt.status)}`}>
                      {appt.status}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onEditAppointment(appt);
                      }}
                      className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-slate-100 rounded-lg transition-all"
                      title="Editar agendamento"
                    >
                      <FileText className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

            {appointments.filter(a => a.date === todayStr).length === 0 && (
              <div className="text-center py-12 text-slate-400 text-xs space-y-1">
                <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-bold text-slate-600">Nenhum cliente agendado para hoje.</p>
                <p className="text-[10px] text-slate-400/80">Sua agenda está livre para novos atendimentos.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
