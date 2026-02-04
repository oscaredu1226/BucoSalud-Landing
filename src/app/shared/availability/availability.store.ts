import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AppointmentHttpRepository, AvailabilitySettingsRow } from '../../receptionist/infrastructure/http/repositories/appointment.http-repository';

type State = {
  loading: boolean;
  error: string | null;
  settings: AvailabilitySettingsRow | null;
};

@Injectable({ providedIn: 'root' })
export class AvailabilityStore {
  private readonly _state$ = new BehaviorSubject<State>({
    loading: false,
    error: null,
    settings: null,
  });

  readonly state$ = this._state$.asObservable();

  get snapshot() {
    return this._state$.value;
  }

  constructor(private readonly apptRepo: AppointmentHttpRepository) {}

  async refresh() {
    this._state$.next({ ...this._state$.value, loading: true, error: null });

    const { data, error } = await this.apptRepo.getAvailabilitySettings();

    if (error) {
      this._state$.next({ loading: false, error: error.message ?? 'Error', settings: null });
      return;
    }

    this._state$.next({ loading: false, error: null, settings: data ?? null });
  }
}
