import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { App } from './app';
import { FoodDeliveryApi } from './core/food-delivery-api';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        // App's template uses routerLink / router-outlet and it injects Router, so the test needs
        // the router wired up (this also supplies ActivatedRoute). Empty route table is enough.
        provideRouter([]),
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
