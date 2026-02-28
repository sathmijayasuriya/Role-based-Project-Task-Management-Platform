import { TestBed } from '@angular/core/testing';
import {
  HttpClientTestingModule,
  HttpTestingController,
} from '@angular/common/http/testing';
import { ProjectMembersService } from './project-members.service';
import { environment } from '@environments/environment';

describe('ProjectMembersService', () => {
  let service: ProjectMembersService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [ProjectMembersService],
    });

    service = TestBed.inject(ProjectMembersService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should fetch members for a project', () => {
    const projectId = 'project-1';
    const mockMembers = [{ project_id: projectId, user_id: 'user-1' }];

    service.listMembers(projectId).subscribe((members) => {
      expect(members).toEqual(mockMembers);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/projects/${projectId}/members`);
    expect(req.request.method).toBe('GET');
    req.flush(mockMembers);
  });

  it('should sync members with add and remove arrays', () => {
    const projectId = 'project-2';
    const payload = { add: ['a'], remove: ['b'] };
    const mockResponse = { members: [] };

    service.syncMembers(projectId, payload).subscribe((res) => {
      expect(res).toEqual(mockResponse);
    });

    const req = httpMock.expectOne(`${environment.apiUrl}/projects/${projectId}/members`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush(mockResponse);
  });

  it('should search users with query params', () => {
    service.searchUsers({ search: 'john', page: 2, pageSize: 5 }).subscribe((res) => {
      expect(res?.items?.length).toBe(0);
    });

    const req = httpMock.expectOne((request) => request.url === `${environment.apiUrl}/users`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('search')).toBe('john');
    expect(req.request.params.get('page')).toBe('2');
    expect(req.request.params.get('pageSize')).toBe('5');
    req.flush({ items: [], total: 0, page: 2, pageSize: 5, totalPages: 0 });
  });
});
