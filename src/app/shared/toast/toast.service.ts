import { Injectable } from '@angular/core';

export type ToastMessage = {
  title: string;
  description?: string;
};

@Injectable({ providedIn: 'root' })
export class ToastService {
  private _toast: ToastMessage | null = null;
  private _timeoutId: any;

  get toast() {
    return this._toast;
  }

  show(message: ToastMessage, durationMs = 3500) {
    this._toast = message;

    if (this._timeoutId) clearTimeout(this._timeoutId);
    this._timeoutId = setTimeout(() => {
      this._toast = null;
      this._timeoutId = null;
    }, durationMs);
  }

  close() {
    this._toast = null;
    if (this._timeoutId) {
      clearTimeout(this._timeoutId);
      this._timeoutId = null;
    }
  }
}
