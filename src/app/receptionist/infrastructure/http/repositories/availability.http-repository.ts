import { Injectable } from '@angular/core';
import { supabase } from '../../supabase/supabase.client';

export type DayKey = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';

export type WorkingHoursDay = {
  enabled: boolean;
  start: string; // "HH:mm"
  end: string;   // "HH:mm"
};

export type WorkingHours = Record<DayKey, WorkingHoursDay>;

export type AvailabilitySettingsRow = {
  id: string;
  timezone: string | null;
  slot_minutes: number;
  working_hours: any; // jsonb
  created_at: string;
  updated_at: string;
};

export type BlockedSlotRow = {
  id: string;
  start_at: string; // timestamptz iso
  end_at: string;   // timestamptz iso
  reason: string | null;
  created_at: string;
  time_range?: any; // tsrange (lo ignoramos)
};

@Injectable({ providedIn: 'root' })
export class AvailabilityHttpRepository {
  /**
   * ✅ Trae la configuración global (1 fila).
   * Si tienes varias filas por error, nos quedamos con la más reciente.
   */
  async getSettings() {
    return await supabase
      .from('availability_settings')
      .select('id, timezone, slot_minutes, working_hours, created_at, updated_at')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle()
      .returns<AvailabilitySettingsRow | null>();
  }
  async upsertSettings(payload: {
    id?: string;
    timezone: string | null;
    slot_minutes: number;
    working_hours: any;
  }) {
    // OJO: para que upsert funcione con onConflict necesitas pasar id si ya existe.
    // Si no hay id, hacemos insert normal.
    if (!payload.id) {
      return await supabase
        .from('availability_settings')
        .insert({
          timezone: payload.timezone,
          slot_minutes: payload.slot_minutes,
          working_hours: payload.working_hours,
        })
        .select('id, timezone, slot_minutes, working_hours, created_at, updated_at')
        .single()
        .returns<AvailabilitySettingsRow>();
    }

    return await supabase
      .from('availability_settings')
      .upsert(
        {
          id: payload.id,
          timezone: payload.timezone,
          slot_minutes: payload.slot_minutes,
          working_hours: payload.working_hours,
        },
        { onConflict: 'id' }
      )
      .select('id, timezone, slot_minutes, working_hours, created_at, updated_at')
      .single()
      .returns<AvailabilitySettingsRow>();
  }

  async listBlockedSlots(limit = 500) {
    return await supabase
      .from('blocked_slots')
      .select('id, start_at, end_at, reason, created_at, time_range')
      .order('start_at', { ascending: false })
      .limit(limit)
      .returns<BlockedSlotRow[]>();
  }

  async createBlockedSlot(payload: { start_at: string; end_at: string; reason: string | null }) {
    return await supabase
      .from('blocked_slots')
      .insert(payload)
      .select('id, start_at, end_at, reason, created_at, time_range')
      .single()
      .returns<BlockedSlotRow>();
  }

  async removeBlockedSlot(id: string) {
    return await supabase
      .from('blocked_slots')
      .delete()
      .eq('id', id);
  }
}
