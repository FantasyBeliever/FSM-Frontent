import { Injectable } from '@angular/core';
import { BehaviorSubject, filter } from 'rxjs';
import { Router, NavigationEnd, NavigationStart } from '@angular/router';
import { ApiService } from '../api/api.service';

export interface PerformanceMetric {
  type: 'navigation' | 'api' | 'load' | 'custom';
  name: string;
  duration: number;
  timestamp: number;
  extra?: Record<string, any>;
}

@Injectable({ providedIn: 'root' })
export class PerformanceService {
  private metricsSubject = new BehaviorSubject<PerformanceMetric | null>(null);
  metrics$ = this.metricsSubject.asObservable();

  private lastNavStartTime = 0;
  private readonly performance =
    typeof window !== 'undefined' && 'performance' in window ? window.performance : undefined;

  private appLoadStart = performance.now();

  constructor(private router: Router, private api: ApiService) {
    this.monitorAppLoad();
    this.monitorNavigation();
    this.attachApiTiming();
  }

  // ---------- App Load ----------
  private monitorAppLoad(): void {
    window.addEventListener('load', () => {
      const duration = performance.now() - this.appLoadStart;
      this.record({
        type: 'load',
        name: 'app-initial-load',
        duration,
        timestamp: Date.now()
      });
      console.log(`[PerformanceService] App load time: ${duration.toFixed(1)} ms`);
    });
  }

  // ---------- Navigation Monitoring ----------
  private monitorNavigation(): void {
    this.router.events.pipe(filter(e => e instanceof NavigationStart)).subscribe((e: any) => {
      this.lastNavStartTime = performance.now();
    });

    this.router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe((e: any) => {
      if (this.lastNavStartTime) {
        const duration = performance.now() - this.lastNavStartTime;
        this.record({
          type: 'navigation',
          name: e.urlAfterRedirects || e.url,
          duration,
          timestamp: Date.now()
        });
        console.log(`[PerformanceService] Navigation ${e.urlAfterRedirects} took ${duration.toFixed(1)} ms`);
      }
    });
  }

  // ---------- API Latency Monitoring ----------
  // The ApiService should expose a hook or emit event when requests finish
  private attachApiTiming(): void {
    // Simple patch: wrap ApiService HTTP methods to record timing.
    const originalGet = this.api.get.bind(this.api);
    const originalPost = this.api.post.bind(this.api);
    const originalPut = this.api.put.bind(this.api);
    const originalDelete = this.api.delete.bind(this.api);

    const wrapper =
      (fn: any, method: string) =>
      (...args: any[]) => {
        const start = performance.now();
        return fn(...args).pipe({
          next: (res: any) => {
            const duration = performance.now() - start;
            this.record({
              type: 'api',
              name: `${method} ${args[0]}`,
              duration,
              timestamp: Date.now()
            });
            return res;
          },
          error: (err: any) => {
            const duration = performance.now() - start;
            this.record({
              type: 'api',
              name: `${method} ${args[0]}`,
              duration,
              timestamp: Date.now(),
              extra: { error: true }
            });
            throw err;
          }
        });
      };

    this.api.get = wrapper(originalGet, 'GET');
    this.api.post = wrapper(originalPost, 'POST');
    this.api.put = wrapper(originalPut, 'PUT');
    this.api.delete = wrapper(originalDelete, 'DELETE');
  }

  // ---------- Recording ----------
  private record(metric: PerformanceMetric): void {
    this.metricsSubject.next(metric);
  }

  // ---------- Manual Measures ----------
  startMeasure(label: string): number {
    const start = performance.now();
    performance.mark(`${label}-start`);
    return start;
  }

  endMeasure(label: string): number {
    const end = performance.now();
    const startEntry = performance.getEntriesByName(`${label}-start`).pop();
    const startTime = startEntry ? startEntry.startTime : this.appLoadStart;
    const duration = end - startTime;
    performance.measure(label, `${label}-start`);
    this.record({
      type: 'custom',
      name: label,
      duration,
      timestamp: Date.now()
    });
    return duration;
  }

  // ---------- Snapshot ----------
  getRecentMetrics(limit = 20): PerformanceMetric[] {
    const entries = performance.getEntriesByType('measure');
    return entries.slice(-limit).map(e => ({
      type: 'custom',
      name: e.name,
      duration: e.duration,
      timestamp: Date.now()
    }));
  }
}
