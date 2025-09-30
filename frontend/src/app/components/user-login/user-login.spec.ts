import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { UserLogin } from './user-login';
import { FormsModule } from '@angular/forms';

describe('UserLogin Component', () => {
  let component: UserLogin;
  let fixture: ComponentFixture<UserLogin>;
  let httpMock: HttpTestingController;
  let routerSpy: jasmine.SpyObj<Router>;

  beforeEach(async () => {
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);

    spyOn(window.localStorage, 'getItem').and.returnValue(null);
    spyOn(window.localStorage, 'setItem').and.stub();
    spyOn(window.localStorage, 'removeItem').and.stub();
    spyOn(window, 'alert').and.stub();
    if (!window.location.assign) {
      window.location.assign = () => {};
    }
    spyOn(window.location, 'assign').and.stub();

    await TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, FormsModule, UserLogin],
      providers: [{ provide: Router, useValue: routerSpy }]
    }).compileComponents();

    fixture = TestBed.createComponent(UserLogin);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  describe('Form Validation', () => {
    it('should fail if email is empty', () => {
      component.formData.email = '';
      component.formData.password = '123456';
      expect(component.validateForm()).toBeFalse();
      expect(component.errorMessage).toBe('Email is required');
    });

    it('should fail for invalid email format', () => {
      component.formData.email = 'wrongemail';
      component.formData.password = '123456';
      expect(component.validateForm()).toBeFalse();
      expect(component.errorMessage).toBe('Please enter a valid email address');
    });

    it('should fail if password is empty', () => {
      component.formData.email = 'test@example.com';
      component.formData.password = '';
      expect(component.validateForm()).toBeFalse();
      expect(component.errorMessage).toBe('Password is required');
    });

    it('should fail if password is less than 6 chars', () => {
      component.formData.email = 'test@example.com';
      component.formData.password = '123';
      expect(component.validateForm()).toBeFalse();
      expect(component.errorMessage).toBe('Password must be at least 6 characters long');
    });

    it('should pass if valid data is entered', () => {
      component.formData.email = 'test@example.com';
      component.formData.password = '123456';
      expect(component.validateForm()).toBeTrue();
      expect(component.errorMessage).toBe('');
    });
  });

  describe('Password Visibility', () => {
    it('should toggle password visibility', () => {
      expect(component.showPassword).toBeFalse();
      component.togglePasswordVisibility();
      expect(component.showPassword).toBeTrue();
    });
  });

  describe('Login Flow', () => {
    it('should call API and handle success', fakeAsync(() => {
      component.formData.email = 'test@example.com';
      component.formData.password = '123456';

      component.onSubmit();

      const req = httpMock.expectOne('http://localhost:3000/api/v1/users/login');
      expect(req.request.method).toBe('POST');

      const mockResponse = {
        token: 'abc123',
        user: { role: 'Customer', name: 'Test User' }
      };
      req.flush(mockResponse);

      tick(1000); // for setTimeout navigation

      expect(localStorage.getItem('token')).toBe('abc123');
      expect(localStorage.getItem('userRole')).toBe('Customer');
      expect(component.successMessage).toContain('Successfully logged in');
      expect(component.showLoginSuccess).toBeTrue();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/customer-dashboard']);
    }));

    it('should handle 401 invalid password error', () => {
      component.formData.email = 'test@example.com';
      component.formData.password = '123456';

      component.onSubmit();

      const req = httpMock.expectOne('http://localhost:3000/api/v1/users/login');
      req.flush({}, { status: 401, statusText: 'Unauthorized' });

      expect(component.errorMessage).toBe('Invalid password entered');
      expect(component.errorSuggestion).toBe('Please check your password and try again');
      expect(component.showLoginSuccess).toBeFalse();
    });

    it('should handle server error (500)', () => {
      component.formData.email = 'test@example.com';
      component.formData.password = '123456';

      component.onSubmit();

      const req = httpMock.expectOne('http://localhost:3000/api/v1/users/login');
      req.flush({}, { status: 500, statusText: 'Server Error' });

      expect(component.errorMessage).toBe('Server temporarily unavailable');
      expect(component.errorSuggestion).toBe('Please try again in a few moments');
    });
  });

  describe('Reset Functions', () => {
    it('should reset form data', () => {
      component.formData.email = 'test@example.com';
      component.formData.password = '123456';
      component.resetLoginForm();
      expect(component.formData.email).toBe('');
      expect(component.formData.password).toBe('');
      expect(component.formData.role).toBe('Customer');
    });

    it('should reset login state', () => {
      component.successMessage = 'Success!';
      component.errorMessage = 'Error!';
      component.showLoginSuccess = true;

      component.resetLoginState();

      expect(component.successMessage).toBe('');
      expect(component.errorMessage).toBe('');
      expect(component.showLoginSuccess).toBeFalse();
    });
  });
});
