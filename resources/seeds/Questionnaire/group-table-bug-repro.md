# group-table: rows disappear on Cancel

**Repro:** `group-table-bug-repro.yaml`  
**Bug in:** `@beda.software/web-item-controls` → `GroupTable/hooks.js` (not in YAML)

## Steps

1. Open `group-table-bug-repro` in EMR
2. **+ Add entry** → fill Name → **OK**
3. **+ Add entry** → **Cancel**

**Expected:** first row remains. **Actual (before fix):** table is empty.

Same bug in `curated-ips` → Allergies.

## Cause

Cancel restores the snapshot via `onChange({ items: e })`, but `e` is already `{ items: [...] }` → nested structure, table goes empty.

## Fix

```diff
- onChange({ items: e ?? undefined });
+ onChange(cloneDeep(e ?? { items: undefined }));
```

Options: upstream PR to `web-item-controls`, or `patch-package` in fhir-emr. Cannot fix from questionnaire YAML.

## Verified locally

Patch in `contrib/fhir-emr` — first row survives Cancel (restart Vite after `node_modules` change).
