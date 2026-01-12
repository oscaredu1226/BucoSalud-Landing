import { Component } from '@angular/core';
import {NgOptimizedImage} from '@angular/common';

@Component({
  selector: 'app-hero-section',
  imports: [
    NgOptimizedImage
  ],
  templateUrl: './hero-section.html',
})
export class HeroSection {
  scrollToSection(id: string) {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  }

}
