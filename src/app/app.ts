import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import {ToastHostComponent} from './shared/toast/toast-host.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, ToastHostComponent],
  templateUrl: './app.html',
  styleUrl: './app.css',
  standalone: true,
})
export class App {
  protected readonly title = signal('BucoSaludLanding');
}
