import { environment } from './../environments/environment';
import { Component } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
})
export class AppComponent {
  response = '0';
  constructor(private http: HttpClient) {}

  onClick() {
    this.http.post(environment.API_URL, {}).subscribe((data: any) => {
      this.response = data;
    });
  }
}
