import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { UserSignup } from './user-signup';

describe('UserSignup Component', () => {
  let component: UserSignup;
  let fixture: ComponentFixture<UserSignup>;
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
      imports: [HttpClientTestingModule, FormsModule, UserSignup],
      providers: [
        { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } },
        { provide: ActivatedRoute, useValue: {} }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(UserSignup);
    component = fixture.componentInstance;
    httpMock = TestBed.inject(HttpTestingController);
    fixture.detectChanges();
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should create the component', () => {
    expect(component).toBeTruthy();
  });

  describe('Form Validation', () => {
    it('should fail if name is empty', () => {
      component.formData.name = '';
      component.formData.email = 'test@example.com';
      component.formData.password = '123456';
      const result = component.validateForm();
      expect(result.isValid).toBeFalse();
      expect(result.error).toBe('Name is required');
    });

    it('should fail if name length is less than 3', () => {
      component.formData.name = 'ab';
      component.formData.email = 'test@example.com';
      component.formData.password = '123456';
      const result = component.validateForm();
      expect(result.isValid).toBeFalse();
      expect(result.error).toContain('Name must be between');
    });

    it('should fail if email is empty', () => {
      component.formData.name = 'Valid Name';
      component.formData.email = '';
      component.formData.password = '123456';
      const result = component.validateForm();
      expect(result.isValid).toBeFalse();
      expect(result.error).toBe('Email is required');
    });

    it('should fail for invalid email format', () => {
      component.formData.name = 'Valid Name';
      component.formData.email = 'invalidemail';
      component.formData.password = '123456';
      const result = component.validateForm();
      expect(result.isValid).toBeFalse();
      expect(result.error).toBe('Please enter a valid email address');
    });

    it('should fail if password is empty', () => {
      component.formData.name = 'Valid Name';
      component.formData.email = 'test@example.com';
      component.formData.password = '';
      const result = component.validateForm();
      expect(result.isValid).toBeFalse();
      expect(result.error).toBe('Password is required');
    });

    it('should fail if password length < 6', () => {
      component.formData.name = 'Valid Name';
      component.formData.email = 'test@example.com';
      component.formData.password = '123';
      const result = component.validateForm();
      expect(result.isValid).toBeFalse();
      expect(result.error).toContain('Password must be at least');
    });

    it('should pass for valid inputs', () => {
      component.formData.name = 'Valid Name';
      component.formData.email = 'test@example.com';
      component.formData.password = '123456';
      const result = component.validateForm();
      expect(result.isValid).toBeTrue();
    });
  });

  describe('Agent Role', () => {
    it('should return true if role is Agent', () => {
      component.formData.role = 'Agent';
      expect(component.isAgentRole()).toBeTrue();
    });

    it('should return false if role is Customer', () => {
      component.formData.role = 'Customer';
      expect(component.isAgentRole()).toBeFalse();
    });
  });

  describe('Password Visibility', () => {
    it('should toggle password visibility', () => {
      expect(component.showPassword).toBeFalse();
      component.togglePasswordVisibility();
      expect(component.showPassword).toBeTrue();
    });
  });

  describe('Form Reset', () => {
    it('should reset the form after registration', () => {
      component.formData = {
        name: 'Test',
        email: 'test@example.com',
        password: '123456',
        role: 'Agent',
        branch: 'Branch'
      };
      component.resetForm();
      expect(component.formData.name).toBe('');
      expect(component.formData.email).toBe('');
      expect(component.formData.password).toBe('');
      expect(component.formData.role).toBe('Customer');
      expect(component.formData.branch).toBe('');
    });
  });

  describe('Registration Flow', () => {
    it('should call API and handle success', fakeAsync(() => {
      component.formData = {
        name: 'Test User',
        email: 'test@example.com',
        password: '123456',
        role: 'Customer',
        branch: ''
      };

      component.onSubmit();

      const req = httpMock.expectOne('http://localhost:3000/api/v1/users/register');
      expect(req.request.method).toBe('POST');
      req.flush({ message: 'Registered successfully' });

      tick(4000); // wait for navigation timeout

      expect(component.successMessage).toContain('Congratulations');
      expect(component.showCongratulations).toBeTrue();
      expect(routerSpy.navigate).toHaveBeenCalledWith(['/login']);
    }));

    it('should handle 409 conflict error (email exists)', () => {
      component.formData = {
        name: 'Test User',
        email: 'test@example.com',
        password: '123456',
        role: 'Customer',
        branch: ''
      };

      component.onSubmit();
      const req = httpMock.expectOne('http://localhost:3000/api/v1/users/register');
      req.flush({}, { status: 409, statusText: 'Conflict' });

      expect(component.errorMessage).toBe('An account with this email already exists');
      expect(component.errorSuggestion).toBe('Please use a different email or try logging in');
      expect(component.showCongratulations).toBeFalse();
    });

    it('should handle 400 bad request error', () => {
      component.onSubmit();
      const req = httpMock.expectOne('http://localhost:3000/api/v1/users/register');
      req.flush({ error: 'Invalid input', suggestion: 'Check again' }, { status: 400, statusText: 'Bad Request' });

      expect(component.errorMessage).toBe('Invalid input');
      expect(component.errorSuggestion).toBe('Check again');
    });

    it('should handle 500 server error', () => {
      component.onSubmit();
      const req = httpMock.expectOne('http://localhost:3000/api/v1/users/register');
      req.flush({}, { status: 500, statusText: 'Server Error' });

      expect(component.errorMessage).toBe('Server temporarily unavailable');
      expect(component.errorSuggestion).toBe('Please try again in a few moments');
    });

    it('should handle 0 network error', () => {
      component.onSubmit();
      const req = httpMock.expectOne('http://localhost:3000/api/v1/users/register');
      req.error(new ProgressEvent('error'), { status: 0, statusText: 'Unknown Error' });

      expect(component.errorMessage).toBe('Unable to connect to server');
      expect(component.errorSuggestion).toBe('Please check your internet connection');
    });

    it('should handle backend error message', () => {
      component.onSubmit();
      const req = httpMock.expectOne('http://localhost:3000/api/v1/users/register');
      req.flush({ error: 'Custom error', suggestion: 'Custom suggestion' }, { status: 422, statusText: 'Unprocessable Entity' });

      expect(component.errorMessage).toBe('Custom error');
      expect(component.errorSuggestion).toBe('Custom suggestion');
    });
  });

  describe('prepareRegistrationData', () => {
    it('should lowercase email and trim name', () => {
      component.formData = {
        name: '  Test User  ',
        email: 'TEST@EXAMPLE.COM',
        password: '123456',
        role: 'Customer',
        branch: ''
      };
      const data = component.prepareRegistrationData();
      expect(data.name).toBe('Test User');
      expect(data.email).toBe('test@example.com');
    });

    it('should include branch only for Agent role', () => {
      component.formData = {
        name: 'Agent User',
        email: 'agent@example.com',
        password: '123456',
        role: 'Agent',
        branch: 'NYC'
      };
      const data = component.prepareRegistrationData();
      expect(data.branch).toBe('NYC');
    });
  });
});
