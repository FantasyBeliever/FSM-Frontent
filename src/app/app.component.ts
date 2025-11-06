import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ApiService } from './core/services/api/api.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent {
  title = 'fieldflow-pwa';

  constructor(private api: ApiService) {}

ngOnInit() {
  this.api.get<any>('/health').subscribe({
    next: (res) => console.log('API OK:', res),
    error: (err) => console.error('API ERROR:', err)
  });
}

}
