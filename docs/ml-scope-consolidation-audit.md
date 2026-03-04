# ML Scope Consolidation Audit

Generated: 2026-03-04 16:19:51 -06:00

Command:
```bash
rg -n "RoleSimilarRoles|role-similar-roles|ClusterScatterChart|cluster-scatter-chart|AdjacentRolesList|adjacent-roles-list|SkillGapForm|skill-gap-form|SkillGapResult|skill-gap-result|/api/ml/clusters|/api/ml/skill-gap" app components lib scripts db
```

Results:
```text
app\api\ml\clusters\route.ts:14:const ROUTE = "/api/ml/clusters";
app\api\ml\skill-gap\roles\route.ts:14:const ROUTE = "/api/ml/skill-gap/roles";
app\api\ml\clusters\adjacent\[slug]\route.ts:13:const ROUTE = "/api/ml/clusters/adjacent/[slug]";
app\roles\[slug]\page.tsx:30:import { RoleSimilarRoles } from "@/components/ui/intelligence/role-similar-roles";
app\roles\[slug]\page.tsx:187:          <RoleSimilarRoles roleSlug={slugStr} />
app\api\ml\skill-gap\analyze\route.ts:13:const ROUTE = "/api/ml/skill-gap/analyze";
components\ui\intelligence\skill-gap-result.tsx:105:export function SkillGapResult({
components\ui\intelligence\skill-gap-form.tsx:17:import { SkillGapResult } from "./skill-gap-result";
components\ui\intelligence\skill-gap-form.tsx:32:export function SkillGapForm() {
components\ui\intelligence\skill-gap-form.tsx:43:    fetch("/api/ml/skill-gap/roles")
components\ui\intelligence\skill-gap-form.tsx:84:      const res = await fetch("/api/ml/skill-gap/analyze", {
components\ui\intelligence\skill-gap-form.tsx:186:      <SkillGapResult result={result} loading={loading} />
components\ui\intelligence\adjacent-roles-list.tsx:29:export function AdjacentRolesList({
components\ui\intelligence\adjacent-roles-list.tsx:41:    fetch(`/api/ml/clusters/adjacent/${encodeURIComponent(roleSlug)}`)
components\ui\intelligence\role-similar-roles.tsx:23:export function RoleSimilarRoles({ roleSlug }: { roleSlug: string }) {
components\ui\intelligence\role-similar-roles.tsx:33:      const res = await fetch(`/api/ml/clusters/adjacent/${encodeURIComponent(roleSlug)}`);
components\ui\intelligence\cluster-scatter-chart.tsx:15:import { AdjacentRolesList } from "./adjacent-roles-list";
components\ui\intelligence\cluster-scatter-chart.tsx:57:export function ClusterScatterChart() {
components\ui\intelligence\cluster-scatter-chart.tsx:64:    fetch("/api/ml/clusters")
components\ui\intelligence\cluster-scatter-chart.tsx:169:          <AdjacentRolesList roleSlug={slugify(selectedRole)} roleName={selectedRole} />
```

## Post-Implementation Reference Check

Generated: 2026-03-04 16:26:02 -06:00

Command:
```bash
rg -n "RoleSimilarRoles|role-similar-roles|ClusterScatterChart|cluster-scatter-chart|AdjacentRolesList|adjacent-roles-list|SkillGapForm|skill-gap-form|SkillGapResult|skill-gap-result|/api/ml/clusters|/api/ml/skill-gap" app components lib scripts db
```

Results:
```text
components\ui\intelligence\cluster-scatter-chart.tsx:15:import { AdjacentRolesList } from "./adjacent-roles-list";
components\ui\intelligence\cluster-scatter-chart.tsx:57:export function ClusterScatterChart() {
components\ui\intelligence\cluster-scatter-chart.tsx:64:    fetch("/api/ml/clusters")
components\ui\intelligence\cluster-scatter-chart.tsx:169:          <AdjacentRolesList roleSlug={slugify(selectedRole)} roleName={selectedRole} />
components\ui\intelligence\adjacent-roles-list.tsx:29:export function AdjacentRolesList({
components\ui\intelligence\adjacent-roles-list.tsx:41:    fetch(`/api/ml/clusters/adjacent/${encodeURIComponent(roleSlug)}`)
components\ui\intelligence\role-similar-roles.tsx:23:export function RoleSimilarRoles({ roleSlug }: { roleSlug: string }) {
components\ui\intelligence\role-similar-roles.tsx:33:      const res = await fetch(`/api/ml/clusters/adjacent/${encodeURIComponent(roleSlug)}`);
components\ui\intelligence\skill-gap-result.tsx:105:export function SkillGapResult({
components\ui\intelligence\skill-gap-form.tsx:17:import { SkillGapResult } from "./skill-gap-result";
components\ui\intelligence\skill-gap-form.tsx:32:export function SkillGapForm() {
components\ui\intelligence\skill-gap-form.tsx:43:    fetch("/api/ml/skill-gap/roles")
components\ui\intelligence\skill-gap-form.tsx:84:      const res = await fetch("/api/ml/skill-gap/analyze", {
components\ui\intelligence\skill-gap-form.tsx:186:      <SkillGapResult result={result} loading={loading} />
```
