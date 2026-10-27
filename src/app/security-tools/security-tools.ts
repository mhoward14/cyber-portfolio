/* ============================================================
   SECURITY-TOOLS.TS — THE SECURITY TOOLS PAGE
   Everything interactive in one place, grouped by the kind of work it
   shows. The portfolio's home page is the academic record; this page
   is where the tools live, with a scope note up front and the
   Engagement Mode recording.
   ============================================================ */

import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TOOLS, TOOL_GROUPS, toolsInGroup } from '../tools-data';

@Component({
  selector: 'app-security-tools',
  changeDetection: ChangeDetectionStrategy.Eager,
  standalone: true,
  imports: [RouterLink],
  templateUrl: './security-tools.html',
  styleUrl: './security-tools.css',
})
export class SecurityTools {
  readonly count = TOOLS.length;
  readonly groups = TOOL_GROUPS.map((group) => ({ ...group, tools: toolsInGroup(group) }));
}
