import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Meta, Title } from '@angular/platform-browser';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './not-found.html',
})
export class NotFoundComponent implements OnInit {
  constructor(private title: Title, private meta: Meta) {
    this.title.setTitle('404 | Rehabilitación BucoMaxilofacial Perú');

    this.meta.updateTag({
      name: 'robots',
      content: 'noindex, nofollow',
    });
  }

  ngOnInit(): void {
    const fullPath =
      window.location.pathname +
      window.location.search +
      window.location.hash;

    console.error(
      '404 Error: User attempted to access non-existent route:',
      fullPath
    );
  }
}
