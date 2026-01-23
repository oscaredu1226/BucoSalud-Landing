import { Component } from '@angular/core';
import { ToastService } from './toast.service';
import { NgClass } from '@angular/common';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  imports: [NgClass],
  template: `
    @if (toastService.toast) {
      <div class="fixed top-4 right-4 z-[100] w-[92vw] max-w-sm">
        <div
          class="rounded-xl border shadow-lg p-4 animate-slide-in"
          [ngClass]="{
            'bg-emerald-50 border-emerald-200': toastService.toast.variant === 'success',
            'bg-rose-50 border-rose-200': toastService.toast.variant === 'error',
            'bg-card border-border': toastService.toast.variant === 'info'
          }"
        >
          <div class="flex items-start gap-3">
            <!-- icon -->
            <div class="mt-0.5">
              @if (toastService.toast.variant === 'success') {
                <svg class="h-5 w-5 text-emerald-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M20 6 9 17l-5-5"></path>
                </svg>
              } @else if (toastService.toast.variant === 'error') {
                <svg class="h-5 w-5 text-rose-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M15 9l-6 6"></path>
                  <path d="M9 9l6 6"></path>
                </svg>
              } @else {
                <svg class="h-5 w-5 text-muted-foreground" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <path d="M12 16v-4"></path>
                  <path d="M12 8h.01"></path>
                </svg>
              }
            </div>

            <div class="flex-1">
              <p
                class="font-heading font-semibold"
                [ngClass]="{
                  'text-emerald-900': toastService.toast.variant === 'success',
                  'text-rose-900': toastService.toast.variant === 'error',
                  'text-foreground': toastService.toast.variant === 'info'
                }"
              >
                {{ toastService.toast.title }}
              </p>

              @if (toastService.toast.description) {
                <p class="text-sm mt-1 leading-relaxed"
                   [ngClass]="{
                     'text-emerald-800': toastService.toast.variant === 'success',
                     'text-rose-800': toastService.toast.variant === 'error',
                     'text-muted-foreground': toastService.toast.variant === 'info'
                   }"
                >
                  {{ toastService.toast.description }}
                </p>
              }
            </div>

            <button
              type="button"
              class="text-muted-foreground hover:text-foreground transition-colors"
              (click)="toastService.close()"
              aria-label="Cerrar"
            >
              ✕
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ToastContainerComponent {
  constructor(public toastService: ToastService) {}
}
