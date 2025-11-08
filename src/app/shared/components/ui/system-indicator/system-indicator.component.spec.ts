import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SystemIndicatorComponent } from './system-indicator.component';

describe('SystemIndicatorComponent', () => {
  let component: SystemIndicatorComponent;
  let fixture: ComponentFixture<SystemIndicatorComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SystemIndicatorComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SystemIndicatorComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
