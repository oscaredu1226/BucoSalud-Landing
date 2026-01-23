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

@Injectable({ providedIn: 'root' })
export class AppointmentHttpRepository {
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

  // ✅ MISMA SOLUCIÓN QUE PACIENTS: upsert (POST) para evitar PATCH/CORS
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
    return await supabase
      .from('appointments')
      .delete()
      .eq('id', id);
  }

  async lastByPatientIds(patientIds: string[], limit = 5000) {
    return await supabase
      .from('appointments')
      .select('id, patient_id, start_at')
      .in('patient_id', patientIds)
      .order('start_at', { ascending: false })
      .limit(limit);
  }

}
