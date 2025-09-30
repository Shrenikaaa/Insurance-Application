import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthGuard } from './auth.guard';

describe('AuthGuard', () => {
  let guard: AuthGuard;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(() => {
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    spyOn(window.localStorage, 'getItem').and.callFake((key: string) => {
      if (key === 'token') return 'mock-token';
      if (key === 'userRole') return 'Admin';
      return null;
    });
    spyOn(window.localStorage, 'setItem').and.stub();
    spyOn(window.localStorage, 'removeItem').and.stub();
    spyOn(window, 'alert').and.stub();
    if (!window.location.assign) { window.location.assign = () => {}; }
    spyOn(window.location, 'assign').and.stub();
    TestBed.configureTestingModule({
      providers: [
        AuthGuard,
        { provide: Router, useValue: routerSpy }
      ]
    });
    guard = TestBed.inject(AuthGuard);
  });

  it('should allow access with valid token and role', () => {
    const route: any = { url: '/admin-dashboard' };
    const state: any = { url: '/admin-dashboard' };
    expect(guard.canActivate(route, state)).toBeTrue();
  });

  it('should deny access with no token', () => {
    (window.localStorage.getItem as jasmine.Spy).and.callFake(() => null);
    const route: any = { url: '/admin-dashboard' };
    const state: any = { url: '/admin-dashboard' };
    expect(guard.canActivate(route, state)).toBeFalse();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/home']);
  });

  it('should deny access for wrong role', () => {
    (window.localStorage.getItem as jasmine.Spy).and.callFake((key: string) => {
      if (key === 'token') return 'mock-token';
      if (key === 'userRole') return 'Customer';
      return null;
    });
    const route: any = { url: '/admin-dashboard' };
    const state: any = { url: '/admin-dashboard' };
    expect(guard.canActivate(route, state)).toBeFalse();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/home']);
  });
});
