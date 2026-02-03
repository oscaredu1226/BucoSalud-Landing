import { Injectable } from '@angular/core';
import { supabase } from '../../supabase/supabase.client';

export type AppointmentPatient = {
  id: string;
  first_names: string;
  last_names: string;
  dni: string;
  phone: string | null;
};

export type AppointmentRow = {
  id: string;
  patient_id: string;
  start_at: string;
  end_at: string;
  status: string;
  notes: string | null;
  created_at: string;
  updated_at: string;

  patient?: AppointmentPatient | null;
};

export type BlockedSlotRow = {
  id: string;
  start_at: string;
  end_at: string;
  reason: string | null;
};

export type AvailabilitySettingsRow = {
  id: string;
  timezone: string;
  slot_minutes: number;
  working_hours: any; // jsonb
  created_at: string;
  updated_at: string;
};

@Injectable({ providedIn: 'root' })
export class AppointmentHttpRepository {
  // =========================
  // APPOINTMENTS
  // =========================
  async list(limit = 200) {
    return await supabase
      .from('appointments')
      .select(`
        id,
        patient_id,
        start_at,
        end_at,
        status,
        notes,
        created_at,
        updated_at,
        patient:patients (
          id,
          first_names,
          last_names,
          dni,
          phone
        )
      `)
      .order('start_at', { ascending: true })
      .limit(limit)
      .returns<AppointmentRow[]>();
  }

  async listByDateRange(fromIso: string, toIso: string, limit = 500) {
    return await supabase
      .from('appointments')
      .select(`
        id,
        patient_id,
        start_at,
        end_at,
        status,
        notes,
        created_at,
        updated_at,
        patient:patients (
          id,
          first_names,
          last_names,
          dni,
          phone
        )
      `)
      .gte('start_at', fromIso)
      .lt('start_at', toIso)
      .order('start_at', { ascending: true })
      .limit(limit)
      .returns<AppointmentRow[]>();
  }

  async create(payload: any) {
    return await supabase
      .from('appointments')
      .insert(payload)
      .select(`
        id,
        patient_id,
        start_at,
        end_at,
        status,
        notes,
        created_at,
        updated_at,
        patient:patients (
          id,
          first_names,
          last_names,
          dni,
          phone
        )
      `)
      .maybeSingle();
  }

  async update(id: string, payload: any) {
    return await supabase
      .from('appointments')
      .upsert({ id, ...payload }, { onConflict: 'id' })
      .select(`
        id,
        patient_id,
        start_at,
        end_at,
        status,
        notes,
        created_at,
        updated_at,
        patient:patients (
          id,
          first_names,
          last_names,
          dni,
          phone
        )
      `)
      .single();
  }

  async remove(id: string) {
    return await supabase.from('appointments').delete().eq('id', id);
  }

  async lastByPatientIds(patientIds: string[], limit = 5000) {
    return await supabase
      .from('appointments')
      .select('id, patient_id, start_at')
      .in('patient_id', patientIds)
      .order('start_at', { ascending: false })
      .limit(limit);
  }

  // ✅ NUEVO: Validar si hay alguna cita que se cruce con el rango
  // overlap: existing.start_at < endIso AND existing.end_at > startIso
  async hasOverlappingAppointment(startIso: string, endIso: string) {
    return await supabase
      .from('appointments')
      .select('id')
      .lt('start_at', endIso)
      .gt('end_at', startIso)
      .limit(1)
      .maybeSingle();
  }

  // =========================
  // BLOQUEOS
  // =========================
  async listBlockedSlotsByRange(fromIso: string, toIso: string, limit = 500) {
    return await supabase
      .from('blocked_slots')
      .select('id, start_at, end_at, reason')
      .lt('start_at', toIso)
      .gt('end_at', fromIso)
      .order('start_at', { ascending: true })
      .limit(limit)
      .returns<BlockedSlotRow[]>();
  }

  async listBlockedSlotsByDayRange(fromIso: string, toIso: string, limit = 500) {
    return await this.listBlockedSlotsByRange(fromIso, toIso, limit);
  }

  async createBlockedSlot(payload: { start_at: string; end_at: string; reason?: string | null }) {
    return await supabase
      .from('blocked_slots')
      .insert({
        start_at: payload.start_at,
        end_at: payload.end_at,
        reason: payload.reason ?? null,
      })
      .select('id, start_at, end_at, reason')
      .single()
      .returns<BlockedSlotRow>();
  }

  // ✅ Bloquear día completo (te paso start/end ya calculados en el componente)
  async createBlockedSlotAllDay(startIso: string, endIso: string, reason?: string | null) {
    return await this.createBlockedSlot({
      start_at: startIso,
      end_at: endIso,
      reason: reason ?? 'Bloqueo día completo',
    });
  }

  // =========================
  // DISPONIBILIDAD (availability_settings)
  // =========================
  async getAvailabilitySettings() {
    return await supabase
      .from('availability_settings')
      .select('id, timezone, slot_minutes, working_hours, created_at, updated_at')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()
      .returns<AvailabilitySettingsRow | null>();
  }

  async updateAvailabilitySettings(
    id: string,
    payload: Partial<Pick<AvailabilitySettingsRow, 'timezone' | 'slot_minutes' | 'working_hours'>>
  ) {
    return await supabase
      .from('availability_settings')
      .update({
        ...payload,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select('id, timezone, slot_minutes, working_hours, created_at, updated_at')
      .single()
      .returns<AvailabilitySettingsRow>();
  }
}
