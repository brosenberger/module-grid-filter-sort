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

A JS mixin on `Magento_Ui/js/grid/filters/elements/ui-select`, the component behind
select-type grid filters, sorts a whitelisted filter's options by label. Sorting is
case-insensitive and uses `localeCompare`, so accented labels land where a human expects
them rather than after `Z`.

Nothing is sorted unless it is named in **Stores → Configuration → BroCode → Grid Filter
Sort → Sorted Filters**, one entry per line:

```
cms_block_listing:store_id
cms_page_listing:store_id
```

The left side is the listing namespace (the `ui_component` file name), the right side is
the filter's index (the column it filters on).

## Why opt-in rather than sort-everything

Some filters are already meaningfully ordered. Order status is the standard example: its
options follow the order workflow, and alphabetising them turns a working grid into a
confusing one. An allow-list means a store decides filter by filter, and a store that
installs the module and configures nothing sees no change at all.

## What it will not touch

- Filters not on the whitelist.
- Grouped options (an optgroup-style list). Reordering across groups changes what the
  filter means, so a grouped list is left exactly as it arrived.
- Anything outside grid filters. Form selects use a different component and are not
  mixed into.

## Not in this version

Per-admin drag-and-drop custom ordering is **not** included. It needs a template
override that renders drag handles into the live filter dropdown, and shipping the
storage layer for it without that entry point would mean dead code in a public module.
The default sort above is complete and useful on its own; the custom order will land
only when its UI does.

## Compatibility

- PHP 8.1, 8.2, 8.3, 8.4
- Magento 2.4.6+, untested below that
- Admin only. No frontend code, no database schema, no new tables.

## Verification status

The mixin's sorting logic is covered by a behaviour test (whitelisted sort,
non-whitelisted left alone, re-sort on later option updates without recursion, grouped
options skipped, missing namespace or index as a safe no-op, non-observable options
without a throw). The two component properties it depends on, `options` and `ns`, were
confirmed against the Magento 2.4 sources: `options` is registered in
`Magento_Ui/js/form/element/ui-select::initObservable()`, and `ns` comes from the
`uiElement` defaults. The mixin has not yet been exercised in a running admin.
