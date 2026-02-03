import { Injectable } from '@angular/core';
import { supabase } from '../../supabase/supabase.client';

export type PatientRow = {
  id: string;
  first_names: string;
  last_names: string;
  dni: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

@Injectable({ providedIn: 'root' })
export class PatientHttpRepository {
  async list(limit = 100) {
    return await supabase
      .from('patients')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit)
      .returns<PatientRow[]>();
  }

  async searchByNameOrDni(q: string, limit = 50) {
    const query = q.trim();
    if (!query) return this.list(limit);

    // dni exacto OR nombres/apellidos parciales
    return await supabase
      .from('patients')
      .select('*')
      .or(
        `dni.eq.${query},first_names.ilike.%${query}%,last_names.ilike.%${query}%`
      )
      .order('created_at', { ascending: false })
      .limit(limit)
      .returns<PatientRow[]>();
  }

  async create(payload: any) {
    return await supabase
      .from('patients')
      .insert(payload)
      .select('*')
      .maybeSingle();
  }

  async update(id: string, payload: any) {
    return await supabase
      .from('patients')
      .upsert(
        { id, ...payload },
        { onConflict: 'id' }
      )
      .select('*')
      .single();
  }


  async remove(id: string) {
    return await supabase
      .from('patients')
      .delete()
      .eq('id', id);
  }

  async findByDni(dni: string) {
    return await supabase
      .from('patients')
      .select('id, first_names, last_names, dni, phone')
      .eq('dni', dni)
      .maybeSingle();
  }

}
