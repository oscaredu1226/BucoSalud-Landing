import { Component } from '@angular/core';

import { Location } from '@angular/common';
import {Navbar} from '../../sections/navbar/navbar';
import {Footer} from '../../sections/footer/footer';

@Component({
  selector: 'app-privacy-policy',
  standalone: true,
  imports: [
    Navbar,
    Footer
  ],
  templateUrl: './privacy-policy.component.html',
})
export class PrivacyPolicyComponent {
  constructor(private location: Location) {}

  goBack() {
    window.history.length > 1 ? this.location.back() : (window.location.href = '/');
  }

  currentYear = new Date().getFullYear();

}
