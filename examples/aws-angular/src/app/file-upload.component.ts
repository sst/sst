import { Component, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-file-upload',
  standalone: true,
  imports: [FormsModule],
  template: `
    <form (ngSubmit)="onSubmit($event)">
      <input type="file" name="file">
      <button type="submit">Upload</button>
    </form>
  `,
  styles: [`
    form {
      color: white;
      padding: 2rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      background-color: #23262d;
      background-image: none;
      background-size: 400%;
      border-radius: 0.6rem;
      background-position: 100%;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -2px rgba(0, 0, 0, 0.1);
    }
    button {
      appearance: none;
      border: 0;
      font-weight: 500;
      border-radius: 5px;
      font-size: 0.875rem;
      padding: 0.5rem 0.75rem;
      background-color: white;
      color: black;
    }
    button:active:enabled {
      background-color: #EEE;
    }
  `]
})
export class FileUploadComponent {
  private http = inject(HttpClient);

  presignedApi = import.meta.env['NG_APP_PRESIGNED_API'];

  async onSubmit(event: Event): Promise<void> {
    const file = (event.target as HTMLFormElement)['file'].files?.[0]!;

    this.http.get(this.presignedApi, { responseType: 'text' }).subscribe({
      next: async (url: string) => {
        const image = await fetch(url, {
          body: file,
          method: "PUT",
          headers: {
            "Content-Type": file.type,
            "Content-Disposition": `attachment; filename="${file.name}"`,
          },
        });

        window.location.href = image.url.split("?")[0];
      },
    });
  }
}
