import React, { useState, useMemo } from 'react';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Plus, 
  Calendar, 
  FileText, 
  Trash2, 
  Filter, 
  CheckCircle,
  AlertCircle,
  User,
  Search,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';
import { FinancialTransaction, Appointment, Client } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import ConfirmModal from './ConfirmModal';

interface FinanceiroViewProps {
  transactions: FinancialTransaction[];
  appointments: Appointment[];
  clients: Client[];
  onAddTransaction: (tx: Omit<FinancialTransaction, 'id' | 'createdAt'>) => void;
  onDeleteTransaction: (id: string) => void;
  onMarkAppointmentPaid: (apptId: string, paymentMethod: string) => void;
}

type PeriodFilter = 'hoje' | 'semana' | 'mes' | 'ano' | 'todos';

export default function FinanceiroView({
  transactions,
  appointments,
  clients,
  onAddTransaction,
  onDeleteTransaction,
  onMarkAppointmentPaid
}: FinanceiroViewProps) {
  
  const [period, setPeriod] = useState<PeriodFilter>('mes');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Transaction Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'Entrada' | 'Saída'>('Entrada');
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [formError, setFormError] = useState('');

  // Custom Confirmation Modal state
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmModalTitle, setConfirmModalTitle] = useState('');
  const [confirmModalMessage, setConfirmModalMessage] = useState('');
  const [confirmModalAction, setConfirmModalAction] = useState<() => void>(() => {});

  // Payment confirmation popup for a pending appointment
  const [selectedPendingAppt, setSelectedPendingAppt] = useState<Appointment | null>(null);
  const [confirmPaymentMethod, setConfirmPaymentMethod] = useState('Pix');

  // Helpers to check dates
  const todayStr = new Date().toISOString().split('T')[0];
  const currentYearMonth = todayStr.substring(0, 7); // "YYYY-MM"
  const currentYear = todayStr.substring(0, 4); // "YYYY"

  const isCurrentWeek = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    const sunday = new Date(today);
    sunday.setDate(today.getDate() - today.getDay());
    sunday.setHours(0, 0, 0, 0);
    const saturday = new Date(sunday);
    saturday.setDate(sunday.getDate() + 6);
    saturday.setHours(23, 59, 59, 999);
    return d >= sunday && d <= saturday;
  };

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // 1. Period check
      let matchesPeriod = true;
      if (period === 'hoje') {
        matchesPeriod = t.date === todayStr;
      } else if (period === 'semana') {
        matchesPeriod = isCurrentWeek(t.date);
      } else if (period === 'mes') {
        matchesPeriod = t.date.startsWith(currentYearMonth);
      } else if (period === 'ano') {
        matchesPeriod = t.date.startsWith(currentYear);
      }

      // 2. Search query check
      let matchesSearch = true;
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        matchesSearch = t.description.toLowerCase().includes(query) || 
                        t.amount.toString().includes(query) ||
                        t.date.includes(query);
      }

      return matchesPeriod && matchesSearch;
    }).sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, period, searchQuery, todayStr, currentYearMonth, currentYear]);

  // Calculations for current selected period
  const stats = useMemo(() => {
    let totalEntradas = 0;
    let totalSaidas = 0;

    filteredTransactions.forEach(t => {
      if (t.type === 'Entrada') {
        totalEntradas += t.amount;
      } else {
        totalSaidas += t.amount;
      }
    });

    const lucro = totalEntradas - totalSaidas;
    
    // Overall balance (using ALL transactions historically)
    const saldoAtual = transactions.reduce((sum, t) => {
      return sum + (t.type === 'Entrada' ? t.amount : -t.amount);
    }, 0);

    return {
      entradas: totalEntradas,
      saidas: totalSaidas,
      lucro,
      saldoAtual
    };
  }, [filteredTransactions, transactions]);

  // Pending payments list
  const pendingAppointments = useMemo(() => {
    return appointments
      .filter(a => a.paymentStatus === 'Pendente' && a.status !== 'Cancelado')
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [appointments]);

  const openAddModal = (type: 'Entrada' | 'Saída') => {
    setModalType(type);
    setAmount('');
    setDate(new Date().toISOString().split('T')[0]);
    setDescription('');
    setFormError('');
    setIsModalOpen(true);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    const parsedAmount = parseFloat(amount.replace(',', '.'));
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      setFormError('Insira um valor válido maior que R$ 0,00.');
      return;
    }
    if (!description.trim()) {
      setFormError('Insira uma descrição para o lançamento.');
      return;
    }

    onAddTransaction({
      type: modalType,
      amount: parsedAmount,
      date,
      description: description.trim()
    });

    setIsModalOpen(false);
  };

  const handleDeleteClick = (id: string) => {
    setConfirmModalTitle('Excluir Lançamento');
    setConfirmModalMessage('Tem certeza de que deseja excluir este lançamento financeiro? Essa ação não pode ser desfeita.');
    setConfirmModalAction(() => () => {
      onDeleteTransaction(id);
      setConfirmModalOpen(false);
    });
    setConfirmModalOpen(true);
  };

  const handleConfirmPaymentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPendingAppt) return;

    onMarkAppointmentPaid(selectedPendingAppt.id, confirmPaymentMethod);
    setSelectedPendingAppt(null);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
  };

  const formatBrazilianDate = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header section with shortcuts */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Fluxo Financeiro</h2>
          <p className="text-sm text-slate-500">Controle de caixa, receitas de agendamentos e despesas.</p>
        </div>
        
        {/* Quick Launch Buttons */}
        <div className="flex gap-3">
          <button
            id="finance-add-entry-btn"
            onClick={() => openAddModal('Entrada')}
            className="flex items-center gap-2 bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-100 px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <ArrowUpRight className="w-4 h-4 text-emerald-600" />
            <span>Nova Entrada</span>
          </button>
          
          <button
            id="finance-add-exit-btn"
            onClick={() => openAddModal('Saída')}
            className="flex items-center gap-2 bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-100 px-4 py-2 rounded-xl text-xs font-semibold shadow-sm transition-colors cursor-pointer"
          >
            <ArrowDownRight className="w-4 h-4 text-rose-600" />
            <span>Nova Saída</span>
          </button>
        </div>
      </div>

      {/* Finance Filter and Overall Balance Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Card Saldo Atual */}
        <div className="bg-slate-900 text-slate-100 p-6 rounded-2xl shadow-sm border border-slate-800 flex flex-col justify-between h-36">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Saldo Geral em Caixa</span>
            <span className="p-1.5 bg-slate-800 text-blue-400 rounded-lg text-xs font-mono">Real</span>
          </div>
          <div>
            <span className="text-2xl font-extrabold block leading-tight">{formatCurrency(stats.saldoAtual)}</span>
            <span className="text-[10px] text-slate-500 font-mono">Consolidado histórico</span>
          </div>
        </div>

        {/* Card Entradas */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between h-36">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Total Entradas</span>
            <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-extrabold text-emerald-700 block leading-tight">{formatCurrency(stats.entradas)}</span>
            <span className="text-[10px] text-slate-400">No período selecionado</span>
          </div>
        </div>

        {/* Card Saídas */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between h-36">
          <div className="flex justify-between items-start">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">Total Saídas</span>
            <div className="p-2 bg-rose-50 rounded-xl text-rose-600">
              <TrendingDown className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className="text-2xl font-extrabold text-rose-700 block leading-tight">{formatCurrency(stats.saidas)}</span>
            <span className="text-[10px] text-slate-400">No período selecionado</span>
          </div>
        </div>

        {/* Card Lucro */}
        <div className={`p-6 rounded-2xl border shadow-sm flex flex-col justify-between h-36 ${
          stats.lucro >= 0 
            ? 'bg-emerald-50/40 border-emerald-100/60' 
            : 'bg-rose-50/40 border-rose-100/60'
        }`}>
          <div className="flex justify-between items-start">
            <span className={`text-xs font-semibold uppercase tracking-wider block ${
              stats.lucro >= 0 ? 'text-emerald-800' : 'text-rose-800'
            }`}>Lucro do Período</span>
            <div className={`p-2 rounded-xl ${
              stats.lucro >= 0 ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
            }`}>
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div>
            <span className={`text-2xl font-extrabold block leading-tight ${
              stats.lucro >= 0 ? 'text-emerald-900' : 'text-rose-900'
            }`}>{formatCurrency(stats.lucro)}</span>
            <span className="text-[10px] text-slate-400">Faturamento líquido</span>
          </div>
        </div>

      </div>

      {/* Main Layout: Left Side Transactions, Right Side Pending Receivables */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Transactions list & Filters */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm col-span-1 lg:col-span-2 space-y-6">
          
          {/* List Toolbar */}
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-50 pb-4">
            
            {/* Tab Period Filters */}
            <div className="flex flex-wrap gap-1.5 p-1 bg-slate-50 rounded-xl border border-slate-200">
              {(['hoje', 'semana', 'mes', 'ano', 'todos'] as PeriodFilter[]).map((p) => (
                <button
                  key={p}
                  onClick={() => setPeriod(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer ${
                    period === p 
                      ? 'bg-white text-slate-800 shadow-sm' 
                      : 'text-slate-400 hover:text-slate-600'
                  }`}
                >
                  {p === 'mes' ? 'Mês' : p}
                </button>
              ))}
            </div>

            {/* Quick search in descriptions */}
            <div className="relative w-full sm:w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-3.5 h-3.5" />
              <input
                id="finance-tx-search"
                type="text"
                placeholder="Filtrar lançamentos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all duration-200"
              />
            </div>
          </div>

          {/* Transactions Feed */}
          {filteredTransactions.length === 0 ? (
            <div className="py-16 text-center text-slate-400 space-y-2">
              <DollarSign className="w-8 h-8 mx-auto text-slate-300" />
              <p className="text-xs">Nenhum lançamento financeiro neste período.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-50 overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[500px]">
                <thead>
                  <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest border-b border-slate-50">
                    <th className="py-3 px-2">Data</th>
                    <th className="py-3 px-2">Tipo</th>
                    <th className="py-3 px-2">Descrição</th>
                    <th className="py-3 px-2 text-right">Valor</th>
                    <th className="py-3 px-2 text-center w-12">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredTransactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors group">
                      <td className="py-3 px-2 font-mono text-slate-500">
                        {formatBrazilianDate(tx.date)}
                      </td>
                      <td className="py-3 px-2">
                        <span className={`inline-flex items-center gap-1.5 font-bold px-2.5 py-0.5 rounded-full text-[10px] border ${
                          tx.type === 'Entrada' 
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-100' 
                            : 'bg-rose-50 text-rose-800 border-rose-100'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${tx.type === 'Entrada' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          {tx.type}
                        </span>
                      </td>
                      <td className="py-3 px-2 font-medium text-slate-700 max-w-xs truncate">
                        {tx.description}
                      </td>
                      <td className={`py-3 px-2 text-right font-bold font-mono text-sm ${
                        tx.type === 'Entrada' ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        {tx.type === 'Entrada' ? '+' : '-'} {formatCurrency(tx.amount)}
                      </td>
                      <td className="py-3 px-2 text-center">
                        <button
                          onClick={() => handleDeleteClick(tx.id)}
                          className="p-1.5 text-slate-300 hover:text-rose-600 hover:bg-slate-100 rounded-lg transition-all"
                          title="Excluir lançamento"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pending receivables sidebar */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 h-fit">
          <div className="pb-2 border-b border-slate-50">
            <h3 className="font-bold text-slate-800 text-base">Controle de Recebíveis</h3>
            <p className="text-[11px] text-slate-400">Atendimentos na agenda marcados como "Pendente". Marque como Pago para registrar faturamento.</p>
          </div>

          <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
            {pendingAppointments.length === 0 ? (
              <div className="text-center py-10 text-slate-400 space-y-1">
                <CheckCircle className="w-7 h-7 mx-auto text-emerald-500" />
                <p className="text-xs font-semibold text-slate-600">Caixa em dia!</p>
                <p className="text-[10px]">Nenhum valor pendente de recebimento.</p>
              </div>
            ) : (
              pendingAppointments.map((appt) => {
                return (
                  <div 
                    key={appt.id} 
                    className="p-3 bg-amber-50/30 hover:bg-amber-50/50 border border-amber-100 rounded-xl flex items-start justify-between gap-3 transition-colors"
                  >
                    <div className="space-y-1 truncate">
                      <p className="text-xs font-bold text-slate-800 truncate">{appt.clientName}</p>
                      <p className="text-[10px] text-slate-500 font-medium truncate">{appt.serviceName}</p>
                      <div className="flex items-center gap-1.5 text-[9px] text-slate-400 font-medium">
                        <span>{formatBrazilianDate(appt.date)}</span>
                        <span>•</span>
                        <span className="font-mono font-bold text-amber-800">{formatCurrency(appt.price)}</span>
                      </div>
                    </div>

                    <button
                      onClick={() => setSelectedPendingAppt(appt)}
                      className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-[9px] font-bold rounded-lg transition-colors shadow-sm shrink-0 uppercase tracking-wider cursor-pointer"
                    >
                      Receber
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* MODAL: ADD TRANSACTION */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-slate-100 max-w-sm w-full overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="p-5 border-b border-slate-100 bg-slate-50">
                <h3 className="font-bold text-slate-800 text-sm">
                  Lançar {modalType} avulsa
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Adicione um fluxo financeiro manual para controle do caixa da clínica.
                </p>
              </div>

              <form onSubmit={handleFormSubmit} className="p-5 space-y-4 flex-1">
                {formError && (
                  <div className="p-3 bg-rose-50 text-rose-800 text-xs rounded-xl font-medium flex items-center gap-1.5 border border-rose-100">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{formError}</span>
                  </div>
                )}

                <div className="space-y-1">
                  <label htmlFor="tx-amount" className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Valor (R$) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="tx-amount"
                    type="text"
                    placeholder="Ex: 150,00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 border border-slate-200 focus:border-blue-500 focus:outline-none rounded-xl text-xs transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="tx-date" className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Data <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="tx-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 border border-slate-200 focus:border-blue-500 focus:outline-none rounded-xl text-xs transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="tx-desc" className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Descrição <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="tx-desc"
                    type="text"
                    placeholder={modalType === 'Entrada' ? 'Ex: Venda de escova ou acessório' : 'Ex: Conta de energia ou Aluguel'}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 border border-slate-200 focus:border-blue-500 focus:outline-none rounded-xl text-xs transition-colors"
                  />
                </div>

                <div className="flex gap-3 justify-end pt-2 border-t border-slate-50">
                  <button
                    id="tx-modal-cancel"
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 font-semibold rounded-xl text-xs transition-all cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button
                    id="tx-modal-submit"
                    type="submit"
                    className={`px-4 py-2 text-white font-semibold rounded-xl text-xs transition-all shadow-md cursor-pointer ${
                      modalType === 'Entrada'
                        ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/10'
                        : 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/10'
                    }`}
                  >
                    Confirmar Lançamento
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: CONFIRM PENDING PAYMENT */}
      <AnimatePresence>
        {selectedPendingAppt && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-2xl border border-slate-100 max-w-sm w-full overflow-hidden shadow-2xl flex flex-col"
            >
              <div className="p-5 border-b border-slate-100 bg-slate-50">
                <h3 className="font-bold text-slate-800 text-sm">
                  Confirmar Recebimento de Valor
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Confirmar pagamento do atendimento de <strong>{selectedPendingAppt.clientName}</strong>.
                </p>
              </div>

              <form onSubmit={handleConfirmPaymentSubmit} className="p-5 space-y-4 flex-1">
                <div className="bg-slate-50 p-4 rounded-xl space-y-1 border border-slate-100 text-xs">
                  <p className="text-slate-500">Serviço: <span className="font-bold text-slate-700">{selectedPendingAppt.serviceName}</span></p>
                  <p className="text-slate-500">Valor a receber: <span className="font-extrabold text-emerald-600 text-sm font-mono">{formatCurrency(selectedPendingAppt.price)}</span></p>
                </div>

                <div className="space-y-1">
                  <label htmlFor="confirm-payment-method" className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                    Forma de Pagamento <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="confirm-payment-method"
                    value={confirmPaymentMethod}
                    onChange={(e) => setConfirmPaymentMethod(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 focus:border-blue-500 focus:outline-none rounded-xl text-xs bg-white transition-colors"
                  >
                    <option value="Pix">Pix</option>
                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                    <option value="Cartão de Débito">Cartão de Débito</option>
                    <option value="Dinheiro">Dinheiro</option>
                    <option value="Transferência">Transferência Bancária</option>
                  </select>
                </div>

                <div className="flex gap-3 justify-end pt-2 border-t border-slate-50">
                  <button
                    id="confirm-payment-cancel"
                    type="button"
                    onClick={() => setSelectedPendingAppt(null)}
                    className="px-4 py-2 border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-600 font-semibold rounded-xl text-xs transition-all cursor-pointer"
                  >
                    Voltar
                  </button>
                  <button
                    id="confirm-payment-submit"
                    type="submit"
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-xl text-xs transition-all shadow-md shadow-emerald-600/10 cursor-pointer"
                  >
                    Confirmar Recebimento
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
