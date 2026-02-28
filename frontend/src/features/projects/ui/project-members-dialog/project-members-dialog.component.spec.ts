import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of } from 'rxjs';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ProjectMembersDialogComponent } from './project-members-dialog.component';
import { ProjectMembersService } from '@features/projects/data-access/project-members.service';

describe('ProjectMembersDialogComponent', () => {
  let component: ProjectMembersDialogComponent;
  let fixture: ComponentFixture<ProjectMembersDialogComponent>;
  let dialogRefCloseSpy: jasmine.Spy;
  let syncMembersSpy: jasmine.Spy;

  const mockMembers = [
    { project_id: 'p1', user_id: 'u1', user: { id: 'u1', first_name: 'Ada', last_name: 'Lovelace', email: 'ada@test.com' } },
    { project_id: 'p1', user_id: 'u2', user: { id: 'u2', first_name: 'Grace', last_name: 'Hopper', email: 'grace@test.com' } },
  ];

  beforeEach(async () => {
    dialogRefCloseSpy = jasmine.createSpy('close');

    await TestBed.configureTestingModule({
      imports: [ProjectMembersDialogComponent, NoopAnimationsModule],
      providers: [
        {
          provide: MAT_DIALOG_DATA,
          useValue: { projectId: 'p1', projectName: 'Demo', members: mockMembers },
        },
        { provide: MatDialogRef, useValue: { close: dialogRefCloseSpy } },
        {
          provide: ProjectMembersService,
          useValue: {
            listMembers: () => of(mockMembers),
            syncMembers: (...args: any[]) => of({ members: mockMembers }),
            searchUsers: () => of({ items: [], total: 0, page: 1, pageSize: 10, totalPages: 0 }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectMembersDialogComponent);
    component = fixture.componentInstance;

    const service = TestBed.inject(ProjectMembersService);
    syncMembersSpy = spyOn(service, 'syncMembers').and.callThrough();

    fixture.detectChanges();
  });

  it('should render and start with existing members selected', () => {
    expect(component.selectedIds().has('u1')).toBeTrue();
    expect(component.selectedIds().has('u2')).toBeTrue();
    expect(component.hasChanges()).toBeFalse();
  });

  it('should calculate additions and call syncMembers on save', fakeAsync(() => {
    component.toggleUser({
      id: 'u3',
      first_name: 'New',
      last_name: 'User',
      email: 'new@test.com',
    });
    expect(component.hasChanges()).toBeTrue();

    component.save();
    tick();

    expect(syncMembersSpy).toHaveBeenCalledWith('p1', {
      add: ['u3'],
      remove: [],
    });
    expect(dialogRefCloseSpy).toHaveBeenCalled();
  }));

  it('should confirm removals of existing members', fakeAsync(() => {
    spyOn(window, 'confirm').and.returnValue(true);
    component.removeChip('u1');
    tick();
    expect(component.selectedIds().has('u1')).toBeFalse();
  }));
});
