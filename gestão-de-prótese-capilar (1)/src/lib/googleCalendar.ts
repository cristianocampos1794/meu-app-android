import { Appointment } from '../types';

/**
 * Google Calendar API helper using standard REST fetch calls.
 * Supports implicit grant flow for client-side React apps.
 */

// Helper to format appointment date/time to RFC3339 string (ISO with offset or Z)
function formatToRFC3339(dateStr: string, timeStr: string): string {
  // Assuming local timezone. We will construct a local ISO string.
  return `${dateStr}T${timeStr}:00`;
}

/**
 * Initiates the Google OAuth2 implicit grant flow via a popup window.
 */
export function authenticateGoogle(clientId: string): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!clientId) {
      reject(new Error('Google Client ID não configurado nas Configurações.'));
      return;
    }

    const redirectUri = window.location.origin;
    const scope = encodeURIComponent('https://www.googleapis.com/auth/calendar https://www.googleapis.com/auth/calendar.events');
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=token&scope=${scope}&prompt=select_account`;

    // Open popup
    const width = 500;
    const height = 600;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;
    
    const popup = window.open(
      authUrl,
      'google-oauth-popup',
      `width=${width},height=${height},top=${top},left=${left}`
    );

    if (!popup) {
      reject(new Error('O bloqueador de popups impediu a autenticação. Por favor, permita popups para este site.'));
      return;
    }

    // Check popup URL for token
    const interval = setInterval(() => {
      try {
        if (popup.closed) {
          clearInterval(interval);
          reject(new Error('Autenticação cancelada pelo usuário.'));
          return;
        }

        const popupUrl = popup.location.href;
        if (popupUrl.includes('access_token=')) {
          clearInterval(interval);
          const urlParams = new URLSearchParams(popup.location.hash.substring(1));
          const accessToken = urlParams.get('access_token');
          popup.close();
          
          if (accessToken) {
            resolve(accessToken);
          } else {
            reject(new Error('Token de acesso não encontrado na URL de resposta.'));
          }
        }
      } catch (err) {
        // Cross-origin errors are expected while the popup is on Google's domain.
        // We ignore them and wait until the popup redirects back to window.location.origin.
      }
    }, 500);
  });
}

/**
 * Creates an event in the primary Google Calendar.
 * Returns the googleEventId on success.
 */
export async function createGoogleEvent(
  accessToken: string,
  calendarId: string,
  appointment: Appointment
): Promise<string> {
  const calendar = calendarId || 'primary';
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar)}/events`;

  const eventBody = {
    summary: `✂️ Prótese Capilar: ${appointment.clientName}`,
    description: `Atendimento de Prótese Capilar\nServiço: ${appointment.serviceName}\nValor: R$ ${appointment.price.toFixed(2)}\nStatus do Serviço: ${appointment.status}\nStatus do Pagamento: ${appointment.paymentStatus}\nObservações: ${appointment.notes || 'Nenhuma'}`,
    start: {
      dateTime: formatToRFC3339(appointment.date, appointment.startTime),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    end: {
      dateTime: formatToRFC3339(appointment.date, appointment.endTime),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  };

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(eventBody),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Erro ao criar evento no Google Calendar.');
  }

  const data = await response.json();
  return data.id;
}

/**
 * Updates an existing event in Google Calendar.
 */
export async function updateGoogleEvent(
  accessToken: string,
  calendarId: string,
  eventId: string,
  appointment: Appointment
): Promise<void> {
  const calendar = calendarId || 'primary';
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar)}/events/${eventId}`;

  const eventBody = {
    summary: `✂️ Prótese Capilar: ${appointment.clientName}`,
    description: `Atendimento de Prótese Capilar\nServiço: ${appointment.serviceName}\nValor: R$ ${appointment.price.toFixed(2)}\nStatus do Serviço: ${appointment.status}\nStatus do Pagamento: ${appointment.paymentStatus}\nObservações: ${appointment.notes || 'Nenhuma'}`,
    start: {
      dateTime: formatToRFC3339(appointment.date, appointment.startTime),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    end: {
      dateTime: formatToRFC3339(appointment.date, appointment.endTime),
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
  };

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(eventBody),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Erro ao atualizar evento no Google Calendar.');
  }
}

/**
 * Deletes an event from Google Calendar.
 */
export async function deleteGoogleEvent(
  accessToken: string,
  calendarId: string,
  eventId: string
): Promise<void> {
  const calendar = calendarId || 'primary';
  const url = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar)}/events/${eventId}`;

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok && response.status !== 404) {
    // If it's 404, it might have been deleted already from Calendar, so we ignore
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || 'Erro ao deletar evento do Google Calendar.');
  }
}
