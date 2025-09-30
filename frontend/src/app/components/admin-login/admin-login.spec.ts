
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AdminLogin } from './admin-login';
import { Router } from '@angular/router';
import { AdminService } from '../../services/admin.service';

describe('AdminLogin', () => {
  let component: AdminLogin;
  let fixture: ComponentFixture<AdminLogin>;
  let routerSpy: jasmine.SpyObj<Router>;
  let adminServiceSpy: jasmine.SpyObj<AdminService>;

  beforeEach(async () => {
    routerSpy = jasmine.createSpyObj('Router', ['navigate']);
    adminServiceSpy = jasmine.createSpyObj('AdminService', ['setToken', 'setAdminData']);

    spyOn(window.localStorage, 'getItem').and.returnValue(null);
    spyOn(window.localStorage, 'setItem').and.stub();
    spyOn(window.localStorage, 'removeItem').and.stub();
    spyOn(window, 'alert').and.stub();
    if (!window.location.assign) { window.location.assign = () => {}; }
    spyOn(window.location, 'assign').and.stub();

    await TestBed.configureTestingModule({
      imports: [AdminLogin],
      providers: [
        { provide: Router, useValue: routerSpy },
        { provide: AdminService, useValue: adminServiceSpy }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AdminLogin);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should show error for empty email and password', () => {
    component.formData.email = '';
    component.formData.password = '';
    component.onSubmit();
    expect(component.isLoading).toBeTrue();
    // You can add more assertions based on error handling logic
  });

  it('should bypass login for admin/admin credentials', () => {
    component.formData.email = 'admin';
    component.formData.password = 'admin';
    component.onSubmit();
    expect(component.isLoading).toBeFalse();
    expect(adminServiceSpy.setToken).toHaveBeenCalled();
    expect(adminServiceSpy.setAdminData).toHaveBeenCalled();
    expect(component.successMessage).toContain('Login successful');
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/admin-dashboard']);
  });
});
