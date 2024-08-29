import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { FileUploadComponent } from './file-upload.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, FileUploadComponent],
  template: `
    <main>
      <app-file-upload></app-file-upload>
    </main>
    <router-outlet></router-outlet>
  `,
  styles: [`
    main {
      margin: auto;
      padding: 1.5rem;
      max-width: 60ch;
    }
  `],
})
export class AppComponent { }
