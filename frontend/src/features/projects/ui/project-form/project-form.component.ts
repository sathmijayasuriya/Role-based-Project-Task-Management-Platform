import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';

type ProjectPriority = 'low' | 'medium' | 'high' | 'critical';

export interface ProjectFormModel {
  id?: string | null;
  name: string;
  description?: string;
  priority: ProjectPriority;
  client_id?: string;
  start_date?: string;
  end_date?: string;
}

@Component({
  selector: 'app-project-form',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatButtonModule],
  templateUrl: './project-form.component.html',
  styleUrls: ['./project-form.component.scss'],
})
export class ProjectFormComponent implements OnChanges {
  @Input() mode: 'create' | 'edit' = 'create';
  @Input() project: ProjectFormModel | null = null;
  @Input() loading = false;

  @Output() save = new EventEmitter<ProjectFormModel>();
  @Output() cancel = new EventEmitter<void>();

  form: ProjectFormModel = {
    id: null,
    name: '',
    description: '',
    priority: 'medium',
    client_id: '',
    start_date: '',
    end_date: '',
  };

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['project']) {
      this.form = {
        id: this.project?.id ?? null,
        name: this.project?.name ?? '',
        description: this.project?.description ?? '',
        priority: (this.project?.priority as ProjectPriority) || 'medium',
        client_id: this.project?.client_id || '',
        start_date: this.project?.start_date || '',
        end_date: this.project?.end_date || '',
      };
    }
  }

  onSubmit(): void {
    if (!this.form.name.trim()) return;
    this.save.emit({
      ...this.form,
      name: this.form.name.trim(),
      description: this.form.description?.trim(),
      client_id: this.form.client_id?.trim(),
    });
  }
}
