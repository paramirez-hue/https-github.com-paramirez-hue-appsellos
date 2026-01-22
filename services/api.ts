
import { Seal, User, SealStatus, AppSettings } from '../types';

// Configura aquí la URL de tu API que conecta con SQL
const API_BASE_URL = 'https://tu-api-sql-backend.com/api';

/**
 * SERVICIO MAESTRO DE DATOS
 * Centraliza la comunicación con el backend SQL.
 */
export const ApiService = {
  // --- SELLOS / PRECINTOS ---
  async getSeals(): Promise<Seal[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/seals`);
      if (!response.ok) throw new Error('Error al obtener sellos');
      return await response.json();
    } catch (error) {
      console.error('SQL Connection Error:', error);
      // Fallback a localStorage si no hay conexión
      return JSON.parse(localStorage.getItem('selloData') || '[]');
    }
  },

  async createSeal(seal: Seal): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/seals`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(seal),
      });
      return response.ok;
    } catch (error) {
      console.error('Error al guardar en SQL:', error);
      return false;
    }
  },

  async updateSealStatus(ids: string[], status: SealStatus, details: string, user: string): Promise<boolean> {
    try {
      const response = await fetch(`${API_BASE_URL}/seals/movement`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids, status, details, user, date: new Date().toLocaleString('es-ES') }),
      });
      return response.ok;
    } catch (error) {
      return false;
    }
  },

  // --- USUARIOS ---
  async getUsers(): Promise<User[]> {
    try {
      const response = await fetch(`${API_BASE_URL}/users`);
      return await response.json();
    } catch {
      return JSON.parse(localStorage.getItem('selloUsers') || '[]');
    }
  },

  // --- CONFIGURACIÓN ---
  async getSettings(): Promise<AppSettings> {
    try {
      const response = await fetch(`${API_BASE_URL}/settings`);
      return await response.json();
    } catch {
      return JSON.parse(localStorage.getItem('selloSettings') || '{"title": "SelloMaster Pro", "logo": null, "sealTypes": ["Botella", "Cable", "Plástico"]}');
    }
  }
};
