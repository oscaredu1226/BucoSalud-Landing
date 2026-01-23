import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export type ToastItem = {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  createdAt: number;
  durationMs: number; // ✅ auto-close
};

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly _toasts = new BehaviorSubject<ToastItem[]>([]);
  readonly toasts$ = this._toasts.asObservable();

  // ✅ default: 3.5s (puedes cambiarlo)
  private readonly DEFAULT_DURATION = 3500;

  success(title: string, message?: string, durationMs?: number) {
    this.push('success', title, message, durationMs);
  }

  error(title: string, message?: string, durationMs?: number) {
    this.push('error', title, message, durationMs ?? 5000); // errores duran un poquito más
  }

  info(title: string, message?: string, durationMs?: number) {
    this.push('info', title, message, durationMs);
  }

  warning(title: string, message?: string, durationMs?: number) {
    this.push('warning', title, message, durationMs);
  }

  dismiss(id: string) {
    this._toasts.next(this._toasts.value.filter(t => t.id !== id));
  }

  clear() {
    this._toasts.next([]);
  }

  private push(type: ToastType, title: string, message?: string, durationMs?: number) {
    const toast: ToastItem = {
      id: crypto?.randomUUID?.() ?? String(Date.now() + Math.random()),
      type,
      title,
      message,
      createdAt: Date.now(),
      durationMs: durationMs ?? this.DEFAULT_DURATION,
    };

    this._toasts.next([toast, ...this._toasts.value]);

    // ✅ auto-close
    window.setTimeout(() => {
      this.dismiss(toast.id);
    }, toast.durationMs);
  }
}
