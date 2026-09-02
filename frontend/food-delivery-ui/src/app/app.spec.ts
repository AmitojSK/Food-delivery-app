import { TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { App } from './app';
import { FoodDeliveryApi } from './core/food-delivery-api';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        {
          provide: FoodDeliveryApi,
          useValue: {
            listUsers: () => of([]),
            listRestaurants: () => of([]),
            listFoodItems: () => of([]),
            listOrders: () => of([])
          }
        }
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render title', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Fresh meals');
  });
});
