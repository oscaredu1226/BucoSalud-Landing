import { Component } from '@angular/core';
import {Navbar} from '../../sections/navbar/navbar';
import {Footer} from '../../sections/footer/footer';


@Component({
  selector: 'app-terms',
  standalone: true,
  imports: [Navbar, Footer],
  templateUrl: './terms.component.html',
})
export class TermsComponent {
  currentYear = new Date().getFullYear();

  goBack() {
    if (window.history.length > 1) window.history.back();
    else window.location.href = '/';
  }
}
