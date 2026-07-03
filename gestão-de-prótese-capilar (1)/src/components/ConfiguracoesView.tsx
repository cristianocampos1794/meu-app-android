import React, { useState } from 'react';
import { 
  Settings, 
  Calendar, 
  Database, 
  CheckCircle, 
  HelpCircle, 
  AlertTriangle,
  RotateCcw,
  Save,
  Globe,
  Lock,
  RefreshCw,
  Scissors
} from 'lucide-react';
import { ClinicSettings } from '../types';
import ConfirmModal from './ConfirmModal';

interface ConfiguracoesViewProps {
  settings: ClinicSettings;
  googleAccessToken: string | null;
  onUpdateSettings: (settings: ClinicSettings) => void;
  onResetData: () => void;
  onGoogleSignIn: () => void;
  onGoogleSignOut: () => void;
}

export default function ConfiguracoesView({
  settings,
  googleAccessToken,
  onUpdateSettings,
  onResetData,
  onGoogleSignIn,
  onGoogleSignOut,
}: ConfiguracoesViewProps) {
  
  const [clinicName, setClinicName] = useState(settings.clinicName);
  const [googleClientId, setGoogleClientId] = useState(settings.googleClientId);
  const [calendarId, setCalendarId] = useState(settings.calendarId);
  const [enableGoogleCalendar, setEnableGoogleCalendar] = useState(settings.enableGoogleCalendar);
  const [theme, setTheme] = useState<'light' | 'dark'>(settings.theme || 'light');
  const [showSavedMsg, setShowSavedMsg] = useState(false);

  // Custom Confirmation Modal state
  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [confirmModalTitle, setConfirmModalTitle] = useState('');
  const [confirmModalMessage, setConfirmModalMessage] = useState('');
  const [confirmModalAction, setConfirmModalAction] = useState<() => void>(() => {});

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdateSettings({
      clinicName: clinicName.trim(),
      googleClientId: googleClientId.trim(),
      calendarId: calendarId.trim(),
      enableGoogleCalendar,
      theme,
    });
    
    setShowSavedMsg(true);
    setTimeout(() => setShowSavedMsg(false), 3000);
  };

  const handleResetClick = () => {
    setConfirmModalTitle('Atenção: Resetar Dados');
    setConfirmModalMessage('Atenção: Isso redefinirá todos os seus clientes, atendimentos da agenda e registros do financeiro de volta aos valores demonstrativos originais (Seed Data). Deseja prosseguir? Esta ação não pode ser desfeita.');
    setConfirmModalAction(() => () => {
      onResetData();
      setConfirmModalOpen(false);
      window.location.reload();
    });
    setConfirmModalOpen(true);
  };

  return (
    <div className="max-w-4xl space-y-8 animate-fade-in pb-12">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-800 tracking-tight">Configurações do Sistema</h2>
        <p className="text-sm text-slate-500">Gerencie as preferências da clínica, integração com Google Agenda e dados de backup.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Navigation Sidebar/Shortcuts */}
        <div className="space-y-2 shrink-0 md:col-span-1">
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-1">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-3 mb-2">Painel</h3>
            <a href="#perfil" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-bold text-slate-700 bg-slate-50 hover:bg-slate-100 transition-colors">
              <Scissors className="w-4 h-4 text-slate-500" />
              <span>Perfil da Clínica</span>
            </a>
            <a href="#google" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors">
              <Calendar className="w-4 h-4 text-slate-400" />
              <span>Google Calendar</span>
            </a>
            <a href="#dados" className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-800 transition-colors">
              <Database className="w-4 h-4 text-slate-400" />
              <span>Manutenção de Dados</span>
            </a>
          </div>
        </div>

        {/* Content Section */}
        <div className="md:col-span-2 space-y-8">
          
          <form onSubmit={handleSaveSettings} className="space-y-8">
            
            {/* PROFILE SECTION */}
            <div id="perfil" className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <div className="border-b border-slate-50 pb-3 flex items-center gap-2">
                <Settings className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-800 text-sm">Perfil da Clínica</h3>
              </div>

              <div className="space-y-1">
                <label htmlFor="settings-clinic-name" className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Nome da Clínica ou Estabelecimento <span className="text-rose-500">*</span>
                </label>
                <input
                  id="settings-clinic-name"
                  type="text"
                  placeholder="Ex: Clínica Fio de Ouro"
                  value={clinicName}
                  onChange={(e) => setClinicName(e.target.value)}
                  required
                  className="w-full px-3.5 py-2 border border-slate-200 focus:border-blue-500 focus:outline-none rounded-xl text-xs transition-colors"
                />
                <span className="text-[10px] text-slate-400">Este nome aparecerá no menu lateral e nos cabeçalhos de relatórios.</span>
              </div>

              {/* Tema do Sistema (Light / Dark Mode) */}
              <div className="space-y-2 pt-4 border-t border-slate-100">
                <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                  Tema Visual do Sistema
                </label>
                <div className="grid grid-cols-2 gap-4">
                  <button
                    type="button"
                    onClick={() => setTheme('light')}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs font-semibold cursor-pointer ${
                      theme === 'light'
                        ? 'border-blue-500 bg-blue-50/40 text-blue-800 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 text-slate-600 bg-slate-50/10'
                    }`}
                  >
                    <span className="text-lg">☀️</span>
                    <span>Modo Claro (Light)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTheme('dark')}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-1.5 transition-all text-xs font-semibold cursor-pointer ${
                      theme === 'dark'
                        ? 'border-blue-500 bg-blue-950/20 text-blue-400 shadow-sm'
                        : 'border-slate-200 hover:border-slate-300 text-slate-400 bg-slate-900/40'
                    }`}
                  >
                    <span className="text-lg">🌙</span>
                    <span>Modo Escuro (Dark)</span>
                  </button>
                </div>
              </div>
            </div>

            {/* GOOGLE CALENDAR SECTION */}
            <div id="google" className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
              <div className="border-b border-slate-50 pb-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <h3 className="font-bold text-slate-800 text-sm">Integração com Google Calendar</h3>
                </div>
                
                {/* Sync Toggle */}
                <button
                  id="settings-calendar-toggle"
                  type="button"
                  onClick={() => setEnableGoogleCalendar(!enableGoogleCalendar)}
                  className={`w-11 h-6 rounded-full transition-colors relative focus:outline-none ${
                    enableGoogleCalendar ? 'bg-blue-600' : 'bg-slate-200'
                  }`}
                >
                  <span className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all ${
                    enableGoogleCalendar ? 'left-6' : 'left-1'
                  }`} />
                </button>
              </div>

              {enableGoogleCalendar && (
                <div className="space-y-5 animate-slide-down">
                  
                  {/* OAuth Connection Buttons */}
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-150 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
                    <div className="space-y-1 text-center sm:text-left">
                      <p className="font-bold text-slate-700">Autenticação do Usuário</p>
                      <p className="text-[11px] text-slate-500">
                        {googleAccessToken 
                          ? 'Sua conta Google está conectada e autorizada.' 
                          : 'Conecte sua conta do Google para permitir a sincronização.'}
                      </p>
                    </div>

                    {googleAccessToken ? (
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="flex items-center gap-1 text-[10px] bg-blue-50 text-blue-800 border border-blue-200 px-2.5 py-1 rounded-full font-bold">
                          <CheckCircle className="w-3.5 h-3.5 text-blue-500" />
                          Conectado
                        </span>
                        <button
                          id="settings-logout-google"
                          type="button"
                          onClick={onGoogleSignOut}
                          className="px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-100 hover:bg-rose-100 rounded-lg text-[10px] font-bold uppercase transition-colors cursor-pointer"
                        >
                          Sair
                        </button>
                      </div>
                    ) : (
                      <button
                        id="settings-login-google"
                        type="button"
                        onClick={onGoogleSignIn}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[11px] font-bold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer shrink-0"
                      >
                        <RefreshCw className="w-3.5 h-3.5" />
                        <span>Conectar com Google</span>
                      </button>
                    )}
                  </div>

                  {/* Client ID Setup Fields */}
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5">
                        <label htmlFor="settings-google-client-id" className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                          Google Client ID <span className="text-rose-500">*</span>
                        </label>
                        <span className="group relative">
                          <HelpCircle className="w-3.5 h-3.5 text-slate-400 cursor-pointer" />
                          {/* Tooltip help */}
                          <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 hidden group-hover:block bg-slate-900 text-slate-100 text-[9px] p-2 rounded shadow-xl w-60 z-20 leading-normal font-normal">
                            Criado no Console do Google Cloud. Necessário para a autenticação OAuth 2.0 segura no navegador.
                          </span>
                        </span>
                      </div>
                      <input
                        id="settings-google-client-id"
                        type="password"
                        placeholder="Ex: 848538387549-abcedf...apps.googleusercontent.com"
                        value={googleClientId}
                        onChange={(e) => setGoogleClientId(e.target.value)}
                        required={enableGoogleCalendar}
                        className="w-full px-3.5 py-2 border border-slate-200 focus:border-blue-500 focus:outline-none rounded-xl text-xs transition-colors font-mono"
                      />
                    </div>

                    <div className="space-y-1">
                      <label htmlFor="settings-calendar-id" className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                        Calendar ID <span className="text-rose-500">*</span>
                      </label>
                      <input
                        id="settings-calendar-id"
                        type="text"
                        placeholder="Ex: primary"
                        value={calendarId}
                        onChange={(e) => setCalendarId(e.target.value)}
                        required={enableGoogleCalendar}
                        className="w-full px-3.5 py-2 border border-slate-200 focus:border-blue-500 focus:outline-none rounded-xl text-xs transition-colors font-mono"
                      />
                      <span className="text-[10px] text-slate-400 block mt-0.5">Use "primary" para usar sua agenda pessoal principal do Google.</span>
                    </div>
                  </div>

                  {/* Tutorial/Guide block */}
                  <div className="p-4 bg-blue-50/50 border border-blue-100 rounded-xl space-y-2 text-xs text-blue-900">
                    <p className="font-bold flex items-center gap-1.5">
                      <Globe className="w-4 h-4 text-blue-600" />
                      Como Configurar sua Integração no Google Cloud Console:
                    </p>
                    <ol className="list-decimal pl-4 space-y-1 text-[11px] leading-relaxed text-blue-800">
                      <li>Acesse o <a href="https://console.cloud.google.com" target="_blank" rel="noreferrer" className="underline font-semibold">Google Cloud Console</a>.</li>
                      <li>Crie um projeto e ative a <strong>Google Calendar API</strong> no menu "APIs & Services".</li>
                      <li>Configure a "OAuth Consent Screen" como "External" (ou "Internal" se usar Google Workspace).</li>
                      <li>Adicione os escopos de Agenda: <code>calendar</code> e <code>calendar.events</code>.</li>
                      <li>Crie uma credencial do tipo <strong>OAuth Client ID</strong> (Web Application).</li>
                      <li>Adicione no campo <strong>Authorized JavaScript Origins</strong> o seguinte link:<br/>
                        <code className="bg-blue-100/80 px-1 py-0.5 rounded font-mono text-[10px] select-all">{window.location.origin}</code>
                      </li>
                      <li>Copie o Client ID gerado e cole no campo acima para salvar. Pronto!</li>
                    </ol>
                  </div>
                </div>
              )}
            </div>

            {/* Submit settings */}
            <div className="flex items-center justify-between">
              {showSavedMsg ? (
                <div id="settings-success-msg" className="text-blue-600 text-xs font-semibold flex items-center gap-1.5 animate-pulse">
                  <CheckCircle className="w-4 h-4" />
                  <span>Configurações salvas com sucesso!</span>
                </div>
              ) : <div />}

              <button
                id="settings-save-btn"
                type="submit"
                className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs shadow-md shadow-blue-600/10 cursor-pointer flex items-center gap-1.5 transition-all"
              >
                <Save className="w-4 h-4" />
                <span>Salvar Configurações</span>
              </button>
            </div>

          </form>

          {/* DANGEROUS DATABASE MAINTENANCE SECTION */}
          <div id="dados" className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="border-b border-slate-50 pb-3 flex items-center gap-2 text-rose-600">
              <Database className="w-5 h-5" />
              <h3 className="font-bold text-slate-800 text-sm">Manutenção de Dados</h3>
            </div>

            <div className="p-4 bg-rose-50/50 border border-rose-100 rounded-xl flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-2 text-xs text-rose-950">
                <p className="font-bold">Resetar Banco de Dados Local</p>
                <p className="text-[11px] leading-relaxed text-rose-900">
                  Esta ação é irreversível e substituirá todas as suas alterações atuais de Clientes, Atendimentos e Fluxo Financeiro de volta para os dados demonstrativos de demonstração padrão (Roberto Alves, Cláudio Souza, etc).
                </p>
                <button
                  id="settings-reset-db-btn"
                  onClick={handleResetClick}
                  className="flex items-center gap-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-[10px] uppercase shadow-sm transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Resetar para Estado Demonstrativo</span>
                </button>
              </div>
            </div>
          </div>

        </div>

      </div>

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
