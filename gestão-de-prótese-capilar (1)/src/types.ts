export interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string;
  cep?: string; // ZIP Code (CEP) optional
  notes?: string;
  hairColor?: string; // Cor do cabelo
  baseType?: string;  // Tipo de base (e.g., base híbrida, base de silicone/PU, base de lace)
  createdAt: string;
}

export type AppointmentStatus = 'Agendado' | 'Confirmado' | 'Realizado' | 'Cancelado' | 'Não compareceu';

export type PaymentStatus = 'Pago' | 'Parcialmente pago' | 'Pendente' | 'Cancelado' | 'Cortesia';

export interface Appointment {
  id: string;
  clientId: string;
  clientName: string; // denormalized for easy rendering
  clientPhone: string; // denormalized for easy rendering
  date: string; // YYYY-MM-DD
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  serviceName: string;
  price: number;
  notes?: string;
  status: AppointmentStatus;
  paymentStatus: PaymentStatus;
  paymentMethod?: string;
  googleEventId?: string;
  recurrence?: 'Único' | 'Diário' | 'Semanal' | 'Mensal';
  createdAt: string;
}

export type TransactionType = 'Entrada' | 'Saída';

export interface FinancialTransaction {
  id: string;
  type: TransactionType;
  amount: number;
  date: string; // YYYY-MM-DD
  description: string;
  appointmentId?: string; // linked appointment if applicable
  createdAt: string;
}

export interface ClinicSettings {
  clinicName: string;
  googleClientId: string;
  calendarId: string;
  enableGoogleCalendar: boolean;
  theme?: 'light' | 'dark';
}

export interface ServiceCategory {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
}

export interface Service {
  id: string;
  name: string;
  categoryId: string; // references ServiceCategory.id
  price: number;
  durationMinutes: number;
  description?: string;
  createdAt: string;
}

