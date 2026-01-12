import { Component } from '@angular/core';
import {Footer} from '../../sections/footer/footer';
import {Navbar} from '../../sections/navbar/navbar';


@Component({
  selector: 'app-accessibility',
  standalone: true,
  imports: [
    Footer,
    Navbar
  ],
  templateUrl: './accessibility.component.html',
})
export class AccessibilityComponent {
  currentYear = new Date().getFullYear();

  goBack() {
    if (window.history.length > 1) window.history.back();
    else window.location.href = '/';
  }
}
