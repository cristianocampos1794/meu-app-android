import { useState, useEffect } from 'react';
import { Client, Appointment, FinancialTransaction, ClinicSettings, ServiceCategory, Service } from './types';
import { 
  DEFAULT_SETTINGS, 
  SEED_CLIENTS, 
  SEED_APPOINTMENTS, 
  SEED_TRANSACTIONS,
  SEED_CATEGORIES,
  SEED_SERVICES
} from './lib/seedData';
import { 
  authenticateGoogle, 
  createGoogleEvent, 
  updateGoogleEvent, 
  deleteGoogleEvent 
} from './lib/googleCalendar';
import { 
  getCollectionData, 
  setDocument, 
  deleteDocument, 
  saveCollectionBatch,
  syncCollection
} from './lib/firebase';

// Components
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import DashboardView from './components/DashboardView';
import AgendaView from './components/AgendaView';
import ClientesView from './components/ClientesView';
import ServicosView from './components/ServicosView';
import FinanceiroView from './components/FinanceiroView';
import ConfiguracoesView from './components/ConfiguracoesView';

import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  // Navigation states
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);

  // Database core states
  const [clients, setClients] = useState<Client[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [transactions, setTransactions] = useState<FinancialTransaction[]>([]);
  const [categories, setCategories] = useState<ServiceCategory[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [settings, setSettings] = useState<ClinicSettings>(DEFAULT_SETTINGS);

  // Selected item states for routing
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [shouldOpenNewAppointment, setShouldOpenNewAppointment] = useState(false);

  // Google Calendar session state
  const [googleAccessToken, setGoogleAccessToken] = useState<string | null>(null);

  // 1. Initial Firestore + LocalStorage Hydration
  useEffect(() => {
    async function loadAllData() {
      try {
        // Fetch from Firestore
        let firestoreClients = await getCollectionData<Client>('clients');
        let firestoreAppts = await getCollectionData<Appointment>('appointments');
        let firestoreTxs = await getCollectionData<FinancialTransaction>('transactions');
        let firestoreCategories = await getCollectionData<ServiceCategory>('categories');
        let firestoreServices = await getCollectionData<Service>('services');
        let firestoreSettingsDocs = await getCollectionData<ClinicSettings>('settings');

        const localClientsStr = localStorage.getItem('clinic_clients');
        const localApptsStr = localStorage.getItem('clinic_appointments');
        const localTxsStr = localStorage.getItem('clinic_transactions');
        const localCategoriesStr = localStorage.getItem('clinic_categories');
        const localServicesStr = localStorage.getItem('clinic_services');
        const localSettingsStr = localStorage.getItem('clinic_settings');

        // Parse local storage cache as backup
        let localClients = localClientsStr ? JSON.parse(localClientsStr) : SEED_CLIENTS;
        let localAppts = localApptsStr ? JSON.parse(localApptsStr) : SEED_APPOINTMENTS;
        let localTxs = localTxsStr ? JSON.parse(localTxsStr) : SEED_TRANSACTIONS;
        let localCategories = localCategoriesStr ? JSON.parse(localCategoriesStr) : SEED_CATEGORIES;
        let localServices = localServicesStr ? JSON.parse(localServicesStr) : SEED_SERVICES;
        let localSettings = localSettingsStr ? JSON.parse(localSettingsStr) : DEFAULT_SETTINGS;

        // If Firestore is completely empty of settings, this is likely a brand new database!
        // We will seed Firestore with our local state (either from localStorage or SEED data)
        if (firestoreSettingsDocs.length === 0) {
          console.log('Firestore settings not found. Seeding Firestore with current local data...');
          await saveCollectionBatch('clients', localClients);
          await saveCollectionBatch('appointments', localAppts);
          await saveCollectionBatch('transactions', localTxs);
          await saveCollectionBatch('categories', localCategories);
          await saveCollectionBatch('services', localServices);
          await setDocument('settings', 'default', localSettings);

          firestoreClients = localClients;
          firestoreAppts = localAppts;
          firestoreTxs = localTxs;
          firestoreCategories = localCategories;
          firestoreServices = localServices;
          firestoreSettingsDocs = [localSettings];
        }

        // Proactively ensure Ricardo de Oliveira exists only if database is not deliberately empty
        if (firestoreClients.length > 0) {
          const todayStr = new Date().toISOString().split('T')[0];
          let ricardo = firestoreClients.find(c => c.name.toLowerCase().includes('ricardo de oliveira'));
          if (!ricardo) {
            ricardo = {
              id: 'c4',
              name: 'Ricardo de Oliveira',
              phone: '(11) 95555-4444',
              email: 'ricardo.oliveira@outlook.com',
              notes: 'Novo cliente. Fez avaliação e adquiriu a primeira prótese premium sob medida de cabelo humano.',
              createdAt: new Date().toISOString(),
            };
            firestoreClients = [...firestoreClients, ricardo];
            await setDocument('clients', ricardo.id, ricardo);
          }

          const hasRicardoToday = firestoreAppts.some(a => 
            a.clientName.toLowerCase().includes('ricardo de oliveira') && 
            a.date === todayStr && 
            a.startTime === '14:00'
          );

          if (!hasRicardoToday) {
            const filteredAppts = firestoreAppts.filter(a => !(a.date === todayStr && a.startTime === '14:00'));
            const newAppt: Appointment = {
              id: 'ricardo_14_appointment_forced',
              clientId: ricardo.id,
              clientName: ricardo.name,
              clientPhone: ricardo.phone,
              date: todayStr,
              startTime: '14:00',
              endTime: '16:00',
              serviceName: 'Primeira Colocação de Prótese Premium',
              price: 1200.00,
              notes: 'Colocação da prótese sob medida comprada. Realizar corte de integração para acabamento impecável. Horário reservado de 14:00 às 16:00.',
              status: 'Confirmado',
              paymentStatus: 'Pendente',
              createdAt: todayStr,
            };
            firestoreAppts = [...filteredAppts, newAppt];
            await setDocument('appointments', newAppt.id, newAppt);
          }
        }

        // Apply loaded Firestore data to our state and update local Cache
        setClients(firestoreClients);
        localStorage.setItem('clinic_clients', JSON.stringify(firestoreClients));

        setAppointments(firestoreAppts);
        localStorage.setItem('clinic_appointments', JSON.stringify(firestoreAppts));

        setTransactions(firestoreTxs);
        localStorage.setItem('clinic_transactions', JSON.stringify(firestoreTxs));

        setCategories(firestoreCategories);
        localStorage.setItem('clinic_categories', JSON.stringify(firestoreCategories));

        setServices(firestoreServices);
        localStorage.setItem('clinic_services', JSON.stringify(firestoreServices));

        let firestoreSettings = firestoreSettingsDocs.find(doc => (doc as any).id === 'default') || localSettings;
        if (firestoreSettings.clinicName === 'Clínica Fio de Ouro - Próteses Capilares' || firestoreSettings.clinicName === 'Clínica Fio de Ouro' || firestoreSettings.clinicName === 'Fio de Ouro') {
          firestoreSettings = {
            ...firestoreSettings,
            clinicName: 'CK Próteses Capilares'
          };
          await setDocument('settings', 'default', firestoreSettings);
        }
        setSettings(firestoreSettings);
        localStorage.setItem('clinic_settings', JSON.stringify(firestoreSettings));

      } catch (err) {
        console.warn('Failed to load from Firestore, falling back to offline LocalStorage cache:', err);
        try {
          const storedClients = localStorage.getItem('clinic_clients');
          const storedAppts = localStorage.getItem('clinic_appointments');
          const storedTx = localStorage.getItem('clinic_transactions');
          const storedCategories = localStorage.getItem('clinic_categories');
          const storedServices = localStorage.getItem('clinic_services');
          const storedSettings = localStorage.getItem('clinic_settings');

          setClients(storedClients ? JSON.parse(storedClients) : SEED_CLIENTS);
          setAppointments(storedAppts ? JSON.parse(storedAppts) : SEED_APPOINTMENTS);
          setTransactions(storedTx ? JSON.parse(storedTx) : SEED_TRANSACTIONS);
          setCategories(storedCategories ? JSON.parse(storedCategories) : SEED_CATEGORIES);
          setServices(storedServices ? JSON.parse(storedServices) : SEED_SERVICES);
          setSettings(storedSettings ? JSON.parse(storedSettings) : DEFAULT_SETTINGS);
        } catch (innerErr) {
          console.error('Offline fallback failed as well, seeding default data:', innerErr);
          setClients(SEED_CLIENTS);
          setAppointments(SEED_APPOINTMENTS);
          setTransactions(SEED_TRANSACTIONS);
          setCategories(SEED_CATEGORIES);
          setServices(SEED_SERVICES);
          setSettings(DEFAULT_SETTINGS);
        }
      }
    }

    loadAllData();
  }, []);

  // Helper to persist state updates to LocalStorage and fully synchronize with Firestore
  const saveClients = (newClients: Client[]) => {
    setClients(newClients);
    localStorage.setItem('clinic_clients', JSON.stringify(newClients));
    syncCollection('clients', newClients).catch(e => console.error('Error syncing clients to Firestore:', e));
  };

  const saveAppointments = (newAppts: Appointment[]) => {
    setAppointments(newAppts);
    localStorage.setItem('clinic_appointments', JSON.stringify(newAppts));
    syncCollection('appointments', newAppts).catch(e => console.error('Error syncing appointments to Firestore:', e));
  };

  const saveTransactions = (newTx: FinancialTransaction[]) => {
    setTransactions(newTx);
    localStorage.setItem('clinic_transactions', JSON.stringify(newTx));
    syncCollection('transactions', newTx).catch(e => console.error('Error syncing transactions to Firestore:', e));
  };

  const saveCategories = (newCategories: ServiceCategory[]) => {
    setCategories(newCategories);
    localStorage.setItem('clinic_categories', JSON.stringify(newCategories));
    syncCollection('categories', newCategories).catch(e => console.error('Error syncing categories to Firestore:', e));
  };

  const saveServices = (newServices: Service[]) => {
    setServices(newServices);
    localStorage.setItem('clinic_services', JSON.stringify(newServices));
    syncCollection('services', newServices).catch(e => console.error('Error syncing services to Firestore:', e));
  };

  const saveSettings = (newSettings: ClinicSettings) => {
    setSettings(newSettings);
    localStorage.setItem('clinic_settings', JSON.stringify(newSettings));
    setDocument('settings', 'default', newSettings).catch(e => console.error('Error syncing settings to Firestore:', e));
  };

  // Google Sign In implicit flow popup
  const handleGoogleSignIn = async () => {
    if (!settings.googleClientId) {
      alert('Por favor, configure o seu Google Client ID nas Configurações para realizar a integração.');
      setCurrentTab('configuracoes');
      return;
    }

    try {
      const token = await authenticateGoogle(settings.googleClientId);
      setGoogleAccessToken(token);
      alert('Autenticação com Google efetuada com sucesso! Sincronização de agenda ativa.');
    } catch (err: any) {
      alert(`Erro na autenticação: ${err.message}`);
    }
  };

  const handleGoogleSignOut = () => {
    setGoogleAccessToken(null);
    alert('Desconectado do Google Calendar com sucesso.');
  };

  // CLIENT ACTIONS
  const handleAddClient = (clientData: Omit<Client, 'id' | 'createdAt'>) => {
    const newClient: Client = {
      ...clientData,
      id: `c_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    const updated = [...clients, newClient];
    saveClients(updated);
    return newClient;
  };

  const handleUpdateClient = (updatedClient: Client) => {
    const updated = clients.map(c => c.id === updatedClient.id ? updatedClient : c);
    saveClients(updated);

    // Also update denormalized properties inside appointments
    const updatedAppts = appointments.map(appt => {
      if (appt.clientId === updatedClient.id) {
        return {
          ...appt,
          clientName: updatedClient.name,
          clientPhone: updatedClient.phone,
        };
      }
      return appt;
    });
    saveAppointments(updatedAppts);
  };

  const handleDeleteClient = (id: string) => {
    const updated = clients.filter(c => c.id !== id);
    saveClients(updated);
    // Note: We deliberately keep their appointments history in the database so that past metrics aren't corrupted, 
    // but the client is unlinked/labeled as deleted if needed.
  };

  // APPOINTMENT & INTEGRATION SYNC ENGINE
  const handleAddAppointment = async (apptData: Omit<Appointment, 'id' | 'createdAt'> & { repeatCount?: number }) => {
    const { repeatCount = 1, ...restData } = apptData;
    const recurrenceType = restData.recurrence || 'Único';
    
    let occurrences = 1;
    if (recurrenceType !== 'Único') {
      occurrences = repeatCount > 0 ? repeatCount : 4;
    }
    
    const newApptsToAdd: Appointment[] = [];
    const newTxsToAdd: FinancialTransaction[] = [];
    
    for (let i = 0; i < occurrences; i++) {
      const currentId = `a_${Date.now()}_${i}`;
      
      // Calculate date for this occurrence
      let currentDate = restData.date;
      if (i > 0) {
        const dateObj = new Date(restData.date + 'T12:00:00');
        if (recurrenceType === 'Diário') {
          dateObj.setDate(dateObj.getDate() + i);
        } else if (recurrenceType === 'Semanal') {
          dateObj.setDate(dateObj.getDate() + i * 7);
        } else if (recurrenceType === 'Mensal') {
          dateObj.setMonth(dateObj.getMonth() + i);
        }
        currentDate = dateObj.toISOString().split('T')[0];
      }
      
      const newAppt: Appointment = {
        ...restData,
        id: currentId,
        date: currentDate,
        createdAt: new Date().toISOString(),
      };
      
      // Google Calendar Sync creation trigger
      if (settings.enableGoogleCalendar && googleAccessToken) {
        try {
          const eventId = await createGoogleEvent(googleAccessToken, settings.calendarId, newAppt);
          newAppt.googleEventId = eventId;
        } catch (err: any) {
          console.error('Google Calendar creation failed:', err);
        }
      }
      
      newApptsToAdd.push(newAppt);
      
      // Finance auto sync
      if (newAppt.paymentStatus === 'Pago' && newAppt.status !== 'Cancelado') {
        const newTx: FinancialTransaction = {
          id: `t_${Date.now()}_${i}`,
          type: 'Entrada',
          amount: newAppt.price,
          date: newAppt.date,
          description: `Recebimento: ${newAppt.serviceName} - ${newAppt.clientName}${recurrenceType !== 'Único' ? ` (${i + 1}/${occurrences})` : ''}`,
          appointmentId: newAppt.id,
          createdAt: new Date().toISOString(),
        };
        newTxsToAdd.push(newTx);
      }
    }
    
    saveAppointments([...appointments, ...newApptsToAdd]);
    if (newTxsToAdd.length > 0) {
      saveTransactions([...transactions, ...newTxsToAdd]);
    }
  };

  const handleUpdateAppointment = async (updatedAppt: Appointment) => {
    const originalAppt = appointments.find(a => a.id === updatedAppt.id);
    if (!originalAppt) return;

    // Google Calendar Sync update trigger
    if (settings.enableGoogleCalendar && googleAccessToken) {
      try {
        if (updatedAppt.status === 'Cancelado') {
          // Cancelled appointments should be deleted/cancelled on Calendar: "Excluir o evento caso o atendimento seja cancelado"
          if (originalAppt.googleEventId) {
            await deleteGoogleEvent(googleAccessToken, settings.calendarId, originalAppt.googleEventId);
            updatedAppt.googleEventId = undefined;
          }
        } else if (originalAppt.googleEventId) {
          // Just update details/times
          await updateGoogleEvent(googleAccessToken, settings.calendarId, originalAppt.googleEventId, updatedAppt);
        } else {
          // If they turned on sync after creating this appt, create it now!
          const eventId = await createGoogleEvent(googleAccessToken, settings.calendarId, updatedAppt);
          updatedAppt.googleEventId = eventId;
        }
      } catch (err: any) {
        console.error('Google Calendar sync failed during update:', err);
        alert(`Alerta: Agendamento atualizado localmente, mas a sincronização do Google Calendar falhou: ${err.message}`);
      }
    }

    const updatedAppts = appointments.map(a => a.id === updatedAppt.id ? updatedAppt : a);
    saveAppointments(updatedAppts);

    // Finance sync updates on transition:
    // If status becomes "Pago" now, or if it was paid but price changed
    const linkedTx = transactions.find(t => t.appointmentId === updatedAppt.id);

    if (updatedAppt.paymentStatus === 'Pago' && updatedAppt.status !== 'Cancelado') {
      if (!linkedTx) {
        // Create new entry
        const newTx: FinancialTransaction = {
          id: `t_${Date.now()}`,
          type: 'Entrada',
          amount: updatedAppt.price,
          date: updatedAppt.date,
          description: `Recebimento: ${updatedAppt.serviceName} - ${updatedAppt.clientName}`,
          appointmentId: updatedAppt.id,
          createdAt: new Date().toISOString(),
        };
        saveTransactions([...transactions, newTx]);
      } else if (linkedTx.amount !== updatedAppt.price || linkedTx.date !== updatedAppt.date) {
        // Update existing entry amount/date
        const updatedTxList = transactions.map(t => {
          if (t.id === linkedTx.id) {
            return {
              ...t,
              amount: updatedAppt.price,
              date: updatedAppt.date,
            };
          }
          return t;
        });
        saveTransactions(updatedTxList);
      }
    } else {
      // If it became Pendente or Cancelado, and there was a transaction linked, remove it!
      if (linkedTx) {
        const updatedTxList = transactions.filter(t => t.id !== linkedTx.id);
        saveTransactions(updatedTxList);
      }
    }
  };

  const handleDeleteAppointment = async (id: string) => {
    const appt = appointments.find(a => a.id === id);
    if (!appt) return;

    // Google Calendar delete trigger
    if (settings.enableGoogleCalendar && googleAccessToken && appt.googleEventId) {
      try {
        await deleteGoogleEvent(googleAccessToken, settings.calendarId, appt.googleEventId);
      } catch (err: any) {
        console.error('Google Calendar deletion failed during cancel:', err);
        alert(`Alerta: Agendamento removido localmente, mas falhou ao deletar da agenda Google: ${err.message}`);
      }
    }

    // Remove appointment
    const updated = appointments.filter(a => a.id !== id);
    saveAppointments(updated);

    // Also remove any linked financial transaction
    const updatedTxList = transactions.filter(t => t.appointmentId !== id);
    saveTransactions(updatedTxList);
  };

  // FINANCE MANUAL TRANSACTIONS
  const handleAddTransaction = (txData: Omit<FinancialTransaction, 'id' | 'createdAt'>) => {
    const newTx: FinancialTransaction = {
      ...txData,
      id: `t_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    saveTransactions([...transactions, newTx]);
  };

  const handleDeleteTransaction = (id: string) => {
    const updated = transactions.filter(t => t.id !== id);
    saveTransactions(updated);
  };

  // CATEGORIES & SERVICES CRUD HANDLERS
  const handleAddCategory = (catData: Omit<ServiceCategory, 'id' | 'createdAt'>) => {
    const newCat: ServiceCategory = {
      ...catData,
      id: `cat_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    saveCategories([...categories, newCat]);
  };

  const handleUpdateCategory = (updatedCat: ServiceCategory) => {
    saveCategories(categories.map(c => c.id === updatedCat.id ? updatedCat : c));
  };

  const handleDeleteCategory = (id: string) => {
    saveCategories(categories.filter(c => c.id !== id));
    saveServices(services.filter(s => s.categoryId !== id));
  };

  const handleAddService = (srvData: Omit<Service, 'id' | 'createdAt'>) => {
    const newSrv: Service = {
      ...srvData,
      id: `srv_${Date.now()}`,
      createdAt: new Date().toISOString(),
    };
    saveServices([...services, newSrv]);
  };

  const handleUpdateService = (updatedSrv: Service) => {
    saveServices(services.map(s => s.id === updatedSrv.id ? updatedSrv : s));
  };

  const handleDeleteService = (id: string) => {
    saveServices(services.filter(s => s.id !== id));
  };

  // Mark pending appointment paid from finance receivables list
  const handleMarkAppointmentPaid = (apptId: string, paymentMethod: string) => {
    const appt = appointments.find(a => a.id === apptId);
    if (!appt) return;

    const updated: Appointment = {
      ...appt,
      paymentStatus: 'Pago',
      paymentMethod,
    };

    handleUpdateAppointment(updated);
  };

  // RESET CORE SEED DATA
  const [resetKey, setResetKey] = useState(0); // Trigger reload if needed
  const handleResetData = () => {
    localStorage.removeItem('clinic_clients');
    localStorage.removeItem('clinic_appointments');
    localStorage.removeItem('clinic_transactions');
    localStorage.removeItem('clinic_categories');
    localStorage.removeItem('clinic_services');
    localStorage.removeItem('clinic_settings');
    window.location.reload();
  };

  // Navigation shortcuts
  const handleSelectClient = (clientId: string | null) => {
    setSelectedClientId(clientId);
    setCurrentTab('clientes');
  };

  const handleSelectAppointment = (appt: Appointment) => {
    setSelectedDate(appt.date);
    setCurrentTab('agenda');
    // Open modal directly? Let's scroll or focus them there. Focus on date is clean and easy.
  };

  const handleQuickAddAppointment = () => {
    setCurrentTab('agenda');
    setShouldOpenNewAppointment(true);
  };

  const isDark = settings.theme === 'dark';

  return (
    <div className={`flex flex-col md:flex-row min-h-screen font-sans text-slate-800 antialiased ${isDark ? 'dark bg-slate-950 text-slate-100' : 'bg-slate-50/50'}`}>
      {/* PERSISTENT SIDEBAR MENU */}
      <Sidebar 
        currentTab={currentTab} 
        setCurrentTab={setCurrentTab} 
        clinicName={settings.clinicName}
        isOpen={isMobileSidebarOpen}
        setIsOpen={setIsMobileSidebarOpen}
      />

      {/* MAIN VIEW AREA */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        
        {/* TOP SEARCH & UTILITY HEADER */}
        <Header 
          clients={clients}
          appointments={appointments}
          googleAccessToken={googleAccessToken}
          enableGoogleCalendar={settings.enableGoogleCalendar}
          onSelectClient={handleSelectClient}
          onSelectAppointment={handleSelectAppointment}
          onQuickAddAppointment={handleQuickAddAppointment}
          onGoogleSignIn={handleGoogleSignIn}
        />

        {/* ACTIVE MODULE VIEW WITH ANIMATIONS */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="h-full"
            >
              {currentTab === 'dashboard' && (
                <DashboardView 
                  clients={clients}
                  appointments={appointments}
                  transactions={transactions}
                  onSelectClient={handleSelectClient}
                  onEditAppointment={handleSelectAppointment}
                />
              )}

              {currentTab === 'agenda' && (
                <AgendaView 
                  clients={clients}
                  appointments={appointments}
                  categories={categories}
                  services={services}
                  selectedDate={selectedDate}
                  setSelectedDate={setSelectedDate}
                  onAddAppointment={handleAddAppointment}
                  onUpdateAppointment={handleUpdateAppointment}
                  onDeleteAppointment={handleDeleteAppointment}
                  onAddClient={handleAddClient}
                  googleAccessToken={googleAccessToken}
                  enableGoogleCalendar={settings.enableGoogleCalendar}
                  shouldOpenNewAppointment={shouldOpenNewAppointment}
                  onNewAppointmentOpened={() => setShouldOpenNewAppointment(false)}
                />
              )}

              {currentTab === 'clientes' && (
                <ClientesView 
                  clients={clients}
                  appointments={appointments}
                  transactions={transactions}
                  selectedClientId={selectedClientId}
                  onSelectClient={setSelectedClientId}
                  onAddClient={handleAddClient}
                  onUpdateClient={handleUpdateClient}
                  onDeleteClient={handleDeleteClient}
                />
              )}

              {currentTab === 'servicos' && (
                <ServicosView 
                  categories={categories}
                  services={services}
                  onAddCategory={handleAddCategory}
                  onUpdateCategory={handleUpdateCategory}
                  onDeleteCategory={handleDeleteCategory}
                  onAddService={handleAddService}
                  onUpdateService={handleUpdateService}
                  onDeleteService={handleDeleteService}
                />
              )}

              {currentTab === 'financeiro' && (
                <FinanceiroView 
                  transactions={transactions}
                  appointments={appointments}
                  clients={clients}
                  onAddTransaction={handleAddTransaction}
                  onDeleteTransaction={handleDeleteTransaction}
                  onMarkAppointmentPaid={handleMarkAppointmentPaid}
                />
              )}

              {currentTab === 'configuracoes' && (
                <ConfiguracoesView 
                  settings={settings}
                  googleAccessToken={googleAccessToken}
                  onUpdateSettings={saveSettings}
                  onResetData={handleResetData}
                  onGoogleSignIn={handleGoogleSignIn}
                  onGoogleSignOut={handleGoogleSignOut}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
