import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SystemIntegrationTriggerComponent } from './system-integration-trigger.component';

describe('SystemIntegrationTriggerComponent', () => {
  let component: SystemIntegrationTriggerComponent;
  let fixture: ComponentFixture<SystemIntegrationTriggerComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SystemIntegrationTriggerComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SystemIntegrationTriggerComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
