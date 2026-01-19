import {Component, OnInit} from '@angular/core';
import {RouterLink} from '@angular/router';
import {Meta, Title} from '@angular/platform-browser';

@Component({
  selector: 'app-not-found',
  imports: [
    RouterLink
  ],
  templateUrl: './not-found.html',
  standalone: true,

})
export class NotFoundComponent implements OnInit {
  constructor(private title: Title, private meta: Meta) {
    this.title.setTitle('404 | Rehabilitación BucoMaxilofacial Perú');
    this.meta.updateTag({
      name: 'description',
      content: 'La página que buscas no existe. Regresa al inicio para continuar.',
    });
  }
  ngOnInit(): void {
    const fullPath =
      window.location.pathname + window.location.search + window.location.hash;

    console.error(
      '404 Error: User attempted to access non-existent route:',
      fullPath
    );
  }
}
