import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideRouter } from '@angular/router';
import { routes } from './app/app.routes';
import { provideServiceWorker } from '@angular/service-worker';
import { isDevMode } from '@angular/core';
import { environment } from './environments/environment'; 
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';

bootstrapApplication(AppComponent, {
  providers: [
    provideHttpClient(withInterceptorsFromDi()),
    provideRouter(routes),
    provideServiceWorker('ngsw-worker.js', {
      enabled: environment.serviceWorker, 
      registrationStrategy: 'registerWhenStable:30000',
    }),
  ],
}).catch((err) => console.error(err));

console.log(`🚀 Running in ${environment.envName} mode`, environment);
