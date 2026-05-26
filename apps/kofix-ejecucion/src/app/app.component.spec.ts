import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { AppComponent } from './app.component';
import { AuthRepository } from './domain/repositories/auth.repository';

describe('AppComponent', () => {
  const authRepositoryStub: Partial<AuthRepository> = {
    isLoadingPermissions$: signal(false),
    permissionsInitialized$: signal(true),
    isAuthenticated$: signal(false),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [{ provide: AuthRepository, useValue: authRepositoryStub }],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

});
