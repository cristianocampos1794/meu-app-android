import { useState, useEffect, useRef } from 'react';
import { Search, Calendar, User, Plus, CheckCircle, AlertCircle, RefreshCw } from 'lucide-react';
import { Client, Appointment } from '../types';

interface HeaderProps {
  clients: Client[];
  appointments: Appointment[];
  googleAccessToken: string | null;
  enableGoogleCalendar: boolean;
  onSelectClient: (clientId: string) => void;
  onSelectAppointment: (appointment: Appointment) => void;
  onQuickAddAppointment: () => void;
  onGoogleSignIn: () => void;
}

export default function Header({
  clients,
  appointments,
  googleAccessToken,
  enableGoogleCalendar,
  onSelectClient,
  onSelectAppointment,
  onQuickAddAppointment,
  onGoogleSignIn,
}: HeaderProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close search results when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter clients and appointments based on query
  const searchResults = (() => {
    if (!searchQuery.trim()) return { clients: [], appointments: [] };
    const query = searchQuery.toLowerCase();

    // Match clients
    const matchedClients = clients.filter(
      (c) =>
        c.name.toLowerCase().includes(query) ||
        c.phone.replace(/\D/g, '').includes(query.replace(/\D/g, ''))
    );

    // Match appointments by client name, service, date, or notes
    const matchedAppointments = appointments.filter((a) => {
      const clientNameMatch = a.clientName.toLowerCase().includes(query);
      const serviceMatch = a.serviceName.toLowerCase().includes(query);
      const notesMatch = a.notes?.toLowerCase().includes(query) || false;
      
      // Date matching (accept formats like YYYY-MM-DD or DD/MM/YYYY)
      const dateParts = a.date.split('-'); // [YYYY, MM, DD]
      const formattedBrazilianDate = `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;
      const dateMatch = a.date.includes(query) || formattedBrazilianDate.includes(query);

      return clientNameMatch || serviceMatch || notesMatch || dateMatch;
    });

    return {
      clients: matchedClients.slice(0, 5),
      appointments: matchedAppointments.slice(0, 5),
    };
  })();

  const hasResults = searchResults.clients.length > 0 || searchResults.appointments.length > 0;

  const handleClientClick = (clientId: string) => {
    onSelectClient(clientId);
    setSearchQuery('');
    setShowResults(false);
  };

  const handleAppointmentClick = (appt: Appointment) => {
    onSelectAppointment(appt);
    setSearchQuery('');
    setShowResults(false);
  };

  const formatDateLabel = (dateStr: string) => {
    const [year, month, day] = dateStr.split('-');
    return `${day}/${month}/${year}`;
  };

  return (
    <header className="bg-white border-b border-slate-100 py-4 px-6 flex flex-col sm:flex-row items-center justify-between gap-4 sticky top-0 z-10">
      {/* Search Input Container */}
      <div ref={containerRef} className="relative w-full sm:max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 w-4 h-4" />
          <input
            id="global-search-input"
            type="text"
            placeholder="Pesquisar clientes, atendimentos, datas..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setShowResults(true);
            }}
            onFocus={() => setShowResults(true)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-full text-sm placeholder-slate-400 focus:outline-none focus:border-blue-500 focus:bg-white transition-all duration-200"
          />
        </div>

        {/* Results Overlay */}
        {showResults && searchQuery && (
          <div id="search-results-overlay" className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl border border-slate-100 shadow-2xl max-h-96 overflow-y-auto z-50 p-2">
            {!hasResults ? (
              <div className="p-4 text-center text-xs text-slate-400">
                Nenhum resultado encontrado para "{searchQuery}"
              </div>
            ) : (
              <div className="space-y-3">
                {/* Clients Section */}
                {searchResults.clients.length > 0 && (
                  <div>
                    <h3 className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Clientes
                    </h3>
                    <div className="mt-1 space-y-0.5">
                      {searchResults.clients.map((c) => (
                        <button
                          key={c.id}
                          onClick={() => handleClientClick(c.id)}
                          className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 flex items-center gap-3 transition-colors text-slate-700"
                        >
                          <div className="w-7 h-7 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                            <User className="w-4 h-4" />
                          </div>
                          <div className="truncate">
                            <p className="text-xs font-semibold">{c.name}</p>
                            <p className="text-[10px] text-slate-400">{c.phone}</p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Appointments Section */}
                {searchResults.appointments.length > 0 && (
                  <div>
                    <h3 className="px-3 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Atendimentos
                    </h3>
                    <div className="mt-1 space-y-0.5">
                      {searchResults.appointments.map((a) => (
                        <button
                          key={a.id}
                          onClick={() => handleAppointmentClick(a)}
                          className="w-full text-left px-3 py-2 rounded-xl hover:bg-slate-50 flex items-center gap-3 transition-colors text-slate-700"
                        >
                          <div className="w-7 h-7 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                            <Calendar className="w-4 h-4" />
                          </div>
                          <div className="truncate flex-1">
                            <div className="flex justify-between items-center gap-2">
                              <p className="text-xs font-semibold truncate">{a.clientName}</p>
                              <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded-md shrink-0 font-mono">
                                {formatDateLabel(a.date)}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-500 truncate">
                              {a.startTime}h • {a.serviceName}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right side controls: Sync state and Quick Add */}
      <div className="flex items-center justify-end gap-3 w-full sm:w-auto">
        {/* Google Calendar Sync Indicator */}
        {enableGoogleCalendar && (
          <div className="flex items-center gap-2">
            {googleAccessToken ? (
              <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 border border-blue-100 rounded-full text-xs font-medium">
                <CheckCircle className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Agenda Sincronizada</span>
                <span className="lg:hidden">Sincronizado</span>
              </div>
            ) : (
              <button
                id="header-connect-google"
                onClick={onGoogleSignIn}
                className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 rounded-full text-xs font-medium transition-colors"
                title="Google Calendar deslogado. Clique para autenticar."
              >
                <AlertCircle className="w-3.5 h-3.5" />
                <span className="hidden lg:inline">Conectar Google Agenda</span>
                <span className="lg:hidden">Conectar</span>
              </button>
            )}
          </div>
        )}

        {/* Global Quick Add Action */}
        <button
          id="header-quick-add-appt"
          onClick={onQuickAddAppointment}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-full text-xs font-semibold shadow-md shadow-blue-600/10 transition-all hover:scale-102 cursor-pointer active:scale-98"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Atendimento</span>
        </button>
      </div>
    </header>
  );
}
