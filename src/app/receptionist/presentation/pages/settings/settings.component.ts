import { Component } from '@angular/core';
import {FormsModule} from '@angular/forms';

type Theme = 'system' | 'light' | 'dark';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    FormsModule
  ],
  templateUrl: './settings.component.html',
})
export class SettingsComponent {
  isSaving = false;

  // UI state mock
  clinicName = 'BucoPerú';
  notificationsEmail = true;
  notificationsWhatsapp = true;
  theme: Theme = 'system';

  async save() {
    this.isSaving = true;
    await new Promise((r) => setTimeout(r, 700));
    this.isSaving = false;
  }
}
