import { Component } from '@angular/core';
import {Navbar} from '../../sections/navbar/navbar';
import {ChatWidget} from '../../components/chat-widget/chat-widget';
import {Footer} from '../../sections/footer/footer';
import {ContactSection} from '../../sections/contact-section/contact-section';
import {AppointmentSection} from '../../sections/appointment-section/appointment-section';
import {TestimonialsSection} from '../../sections/testimonials-section/testimonials-section';
import {AboutSection} from '../../sections/about-section/about-section';
import {ServicesSection} from '../../sections/services-section/services-section';
import {FaqSection} from '../../sections/faq-section/faq-section';
import {TeamSection} from '../../sections/team-section/team-section';
import {ProcessSection} from '../../sections/process-section/process-section';
import {HeroSection} from '../../sections/hero-section/hero-section';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    Navbar,
    ChatWidget,
    Footer,
    ContactSection,
    AppointmentSection,
    TestimonialsSection,
    AboutSection,
    ServicesSection,
    FaqSection,
    TeamSection,
    ProcessSection,
    HeroSection

  ],
  templateUrl: '/home.html',
})
export class HomeComponent {}
