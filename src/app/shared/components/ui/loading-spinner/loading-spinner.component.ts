import { Component } from '@angular/core';
import { LoadingService } from '../../../../core/services/system/loading.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-loading-spinner',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './loading-spinner.component.html',
  styleUrl: './loading-spinner.component.scss'
})
export class LoadingSpinnerComponent {

  constructor(public loadingService: LoadingService) {}

}
