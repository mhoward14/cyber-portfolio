import { Component, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { CROSSWALK_DATA, CrosswalkEntry, FRAMEWORK_LABELS, FRAMEWORK_SOURCE_NAMES, FrameworkKey } from './crosswalk-data';

@Component({
  selector: 'app-crosswalk',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './crosswalk.html',
  styleUrl: './crosswalk.css'
})
export class Crosswalk {
  readonly data = CROSSWALK_DATA;
  readonly frameworkLabels = FRAMEWORK_LABELS;
  readonly frameworkSourceNames = FRAMEWORK_SOURCE_NAMES;
  readonly frameworkKeys: FrameworkKey[] = ['nist', 'cis', 'iso'];

  query = signal('');
  family = signal('all');
  anchor = signal<FrameworkKey>('nist');

  selectedEntry = signal<CrosswalkEntry | null>(null);
  selectedFramework = signal<FrameworkKey>('nist');

  families = computed(() => Array.from(new Set(this.data.map((d) => d.family))).sort());

  filtered = computed(() => {
    const term = this.query().trim().toLowerCase();
    const family = this.family();
    return this.data.filter((entry) => {
      const familyOk = family === 'all' || entry.family === family;
      if (!familyOk) return false;
      if (!term) return true;
      const haystack = [
        entry.family,
        entry.frameworks.nist.id,
        entry.frameworks.nist.title,
        entry.frameworks.cis.id,
        entry.frameworks.cis.title,
        entry.frameworks.iso.id,
        entry.frameworks.iso.title
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(term);
    });
  });

  orderedKeys = computed<FrameworkKey[]>(() => {
    const anchor = this.anchor();
    return [anchor, ...this.frameworkKeys.filter((k) => k !== anchor)];
  });

  setAnchor(key: FrameworkKey) {
    this.anchor.set(key);
  }

  strengthLabel(strength: 'strong' | 'partial'): string {
    return strength === 'strong' ? 'Strong Match' : 'Partial Match';
  }

  openDetail(entry: CrosswalkEntry, framework: FrameworkKey) {
    this.selectedEntry.set(entry);
    this.selectedFramework.set(framework);
  }

  closeDetail() {
    this.selectedEntry.set(null);
  }

  detailOrderedKeys(): FrameworkKey[] {
    const primary = this.selectedFramework();
    return [primary, ...this.frameworkKeys.filter((k) => k !== primary)];
  }
}
