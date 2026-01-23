import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ToastService, ToastItem } from './toast.service';

@Component({
  selector: 'app-toast-host',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './toast-host.component.html',
})
export class ToastHostComponent {
  constructor(public readonly toast: ToastService) {}

  trackById = (_: number, t: ToastItem) => t.id;

  iconPath(t: ToastItem): 'success' | 'error' | 'info' | 'warning' {
    return t.type;
  }

  pillClasses(t: ToastItem): string {
    switch (t.type) {
      case 'success':
        return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700';
      case 'error':
        return 'border-rose-500/30 bg-rose-500/10 text-rose-700';
      case 'warning':
        return 'border-amber-500/30 bg-amber-500/10 text-amber-700';
      default:
        return 'border-sky-500/30 bg-sky-500/10 text-sky-700';
    }
  }
}
