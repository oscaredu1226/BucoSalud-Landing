import {Component, OnInit} from '@angular/core';
import {RouterLink} from '@angular/router';

@Component({
  selector: 'app-not-found',
  imports: [
    RouterLink
  ],
  templateUrl: './not-found.html',
})
export class NotFoundComponent implements OnInit {
  ngOnInit(): void {
    const fullPath =
      window.location.pathname + window.location.search + window.location.hash;

    console.error(
      '404 Error: User attempted to access non-existent route:',
      fullPath
    );
  }
}
