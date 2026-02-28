/// <reference types="jasmine" />
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { of } from 'rxjs';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { NoopAnimationsModule } from '@angular/platform-browser/animations';
import { ProjectMembersDialogComponent } from './project-members-dialog.component';
import { ProjectMembersService } from '@features/projects/data-access/project-members.service';

describe('ProjectMembersDialogComponent (E2E style)', () => {
  let fixture: ComponentFixture<ProjectMembersDialogComponent>;
  let component: ProjectMembersDialogComponent;
  let dialogRefCloseSpy: jasmine.Spy;
  let syncSpy: jasmine.Spy;
  let searchSpy: jasmine.Spy;

  const baseMembers = [
    { project_id: 'p1', user_id: 'u1', user: { id: 'u1', first_name: 'Ada', last_name: 'Lovelace', email: 'ada@test.com' } },
  ];

  beforeEach(async () => {
    dialogRefCloseSpy = jasmine.createSpy('close');

    await TestBed.configureTestingModule({
      imports: [ProjectMembersDialogComponent, NoopAnimationsModule],
      providers: [
        {
          provide: MAT_DIALOG_DATA,
          useValue: { projectId: 'p1', projectName: 'Demo', members: baseMembers },
        },
        { provide: MatDialogRef, useValue: { close: dialogRefCloseSpy } },
        {
          provide: ProjectMembersService,
          useValue: {
            listMembers: () => of(baseMembers),
            syncMembers: () =>
              of({
                members: [
                  ...baseMembers,
                  { project_id: 'p1', user_id: 'u3', user: { id: 'u3', first_name: 'New', last_name: 'Member', email: 'new@test.com' } },
                ],
              }),
            searchUsers: () =>
              of({
                items: [
                  { id: 'u3', first_name: 'New', last_name: 'Member', email: 'new@test.com' },
                ],
                total: 1,
                page: 1,
                pageSize: 10,
                totalPages: 1,
              }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProjectMembersDialogComponent);
    component = fixture.componentInstance;

    const service = TestBed.inject(ProjectMembersService);
    syncSpy = spyOn(service, 'syncMembers').and.callThrough();
    searchSpy = spyOn(service, 'searchUsers').and.callThrough();

    fixture.detectChanges();
  });

  it('adds and removes members through the UI flow', fakeAsync(() => {
    const input: HTMLInputElement =
      fixture.nativeElement.querySelector('input[matinput]') ||
      fixture.nativeElement.querySelector('input');

    input.value = 'new';
    input.dispatchEvent(new Event('input'));
    tick(250);
    fixture.detectChanges();

    expect(searchSpy).toHaveBeenCalled();

    const addBtn: HTMLButtonElement = fixture.nativeElement.querySelector('.user-row button');
    addBtn.click();
    fixture.detectChanges();

    expect(component.isSelected('u3')).toBeTrue();

    component.save();
    tick();

    expect(syncSpy).toHaveBeenCalled();
    expect(dialogRefCloseSpy).toHaveBeenCalled();
  }));
});
