# BroCode_GridFilterSort

Sorts the option list of opt-in Magento 2 admin grid filter dropdowns alphabetically
by label.

```bash
composer require brocode/module-grid-filter-sort
bin/magento module:enable BroCode_GridFilterSort
bin/magento setup:upgrade
bin/magento cache:flush
```

## The problem

A select-type grid filter lists its options in whatever order the data source returned,
usually insertion order. A website filter lists sites in creation order, a store view
filter does the same, and core offers no setting anywhere to change it.

## What this does

A JS mixin on `Magento_Ui/js/form/element/ui-select`, the component behind most
select-type grid filters (confirmed at runtime against a real admin grid — core's
`Magento_Ui/js/grid/filters/elements/ui-select` looks like the obvious target but is
actually a narrow subclass only a handful of Media Gallery grids use), sorts a
whitelisted filter's options by label. Sorting is case-insensitive and uses
`localeCompare`, so accented labels land where a human expects them rather than after
`Z`.

Not every select-type filter renders through this component. Store View filters in
particular use a different, native `<select>` component and are not covered by this
mixin — see [Not in this version](#not-in-this-version).

Nothing is sorted unless it is named in **Stores → Configuration → BroCode → Grid Filter
Sort → Sorted Filters**, one entry per line:

```
cms_page_listing:is_active
cms_block_listing:is_active
```

The left side is the listing namespace (the `ui_component` file name), the right side is
the filter's index (the column it filters on). `store_id` is deliberately not used as
the example here — see [Not in this version](#not-in-this-version).

## Why opt-in rather than sort-everything

Some filters are already meaningfully ordered. Order status is the standard example: its
options follow the order workflow, and alphabetising them turns a working grid into a
confusing one. An allow-list means a store decides filter by filter, and a store that
installs the module and configures nothing sees no change at all.

## What it will not touch

- Filters not on the whitelist. This is the actual safety boundary — `Magento_Ui/js/form/element/ui-select`
  is also used by ordinary form selects outside grids, not only grid filters, but the
  mixin only acts on a filter whose exact `namespace:index` pair is whitelisted, so an
  unrelated select elsewhere is never touched.
- Grouped options (an optgroup-style list). Reordering across groups changes what the
  filter means, so a grouped list is left exactly as it arrived.

## Not in this version

- **Store View filters.** Magento renders these through `Magento_Ui/js/form/element/select`,
  a native `<select>` with real `<option>`/`<optgroup>` elements — a different rendering
  mechanism than the knockout-templated widget this mixin sorts. Whitelisting a
  `store_id` filter currently has no effect. Support for this filter type needs its own
  design pass, not a mixin retarget.
- Per-admin drag-and-drop custom ordering. It needs a template override that renders
  drag handles into the live filter dropdown, and shipping the storage layer for it
  without that entry point would mean dead code in a public module. The default sort
  above is complete and useful on its own for the filter types it does cover; the custom
  order will land only when its UI does.

## Compatibility

- PHP 8.1, 8.2, 8.3, 8.4
- Magento 2.4.6+, untested below that
- Admin only. No frontend code, no database schema, no new tables.

## Verification status

The mixin's sorting logic is covered by a committed, runnable behaviour test at
`Test/mixin/ui-select-sort-mixin.test.js` (whitelisted sort, non-whitelisted left alone,
re-sort on later option updates without recursion, grouped options skipped, missing
namespace or index as a safe no-op, non-observable options without a throw). It loads
the real mixin source through a minimal AMD/Knockout shim, no build step or npm
dependency required:

```bash
node --test Test/mixin/ui-select-sort-mixin.test.js
```

The two component properties it depends on, `options` and `ns`, were confirmed against
the Magento 2.4 sources: `options` is registered in
`Magento_Ui/js/form/element/ui-select::initObservable()`, and `ns` comes from the
`uiElement` defaults.
