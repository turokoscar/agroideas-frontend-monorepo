import { ComponentFixture, TestBed } from '@angular/core/testing';
import { UiSelectSearchComponent } from './ui-select-search.component';

describe('UiSelectSearchComponent', () => {
  let component: UiSelectSearchComponent;
  let fixture: ComponentFixture<UiSelectSearchComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UiSelectSearchComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(UiSelectSearchComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
