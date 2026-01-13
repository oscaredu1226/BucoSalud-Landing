import { Component } from '@angular/core';
import { ToastService } from './toast.service';

@Component({
  selector: 'app-toast-container',
  standalone: true,
  template: `
    @if (toastService.toast) {
      <div class="fixed top-4 right-4 z-[100] w-[92vw] max-w-sm">
        <div class="bg-card border border-border rounded-xl shadow-lg p-4">
          <div class="flex items-start gap-3">
            <div class="mt-1 h-2 w-2 rounded-full bg-primary"></div>

            <div class="flex-1">
              <p class="font-heading font-semibold text-foreground">
                {{ toastService.toast.title }}
              </p>
              @if (toastService.toast.description) {
                <p class="text-sm text-muted-foreground mt-1 leading-relaxed">
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
