/**
 * Copyright (C) 2026 Benjamin Rosenberger <bensch.rosenberger@gmail.com>
 *
 * @copyright 2026 Benjamin Rosenberger
 * @author bensch.rosenberger@gmail.com
 * @license MIT
 * @link https://brocode.at
 */

/**
 * Sorts the option list of whitelisted admin grid filters alphabetically by label.
 *
 * Mixed into Magento_Ui/js/form/element/ui-select, the component behind select-type
 * grid filters (confirmed at runtime via uiRegistry against a real admin grid — core's
 * own `Magento_Ui/js/grid/filters/elements/ui-select` is a red herring: it exists, but
 * only a handful of Media Gallery asset-picker grids actually use it as their filter
 * component). Two properties this mixin relies on, both verified against the Magento
 * 2.4 sources:
 *
 * - `options` is registered in this component's own initObservable(), so it is a
 *   Knockout observable holding the option list.
 * - `ns` comes from the uiElement defaults (`ns: '${ $.name.split(".")[0] }'`) and holds
 *   the parent listing's namespace.
 *
 * A filter that is not whitelisted is never touched, and neither is a filter whose
 * options arrive in a shape this cannot sort.
 */
define([
    'ko',
    'underscore'
], function (ko, _) {
    'use strict';

    return function (Component) {
        return Component.extend({

            /**
             * Guards against the write-back inside the options subscription
             * re-triggering itself.
             *
             * @private
             */
            brocodeSorting: false,

            /**
             * @returns {Object} Chainable.
             */
            initialize: function () {
                this._super();
                this.brocodeInitSort();

                return this;
            },

            /**
             * Applies the sort to the current options and to every later update.
             *
             * @returns {void}
             */
            brocodeInitSort: function () {
                var self = this;

                if (!this.brocodeIsWhitelisted() || !ko.isObservable(this.options)) {
                    return;
                }

                this.brocodeSortOptions();

                this.options.subscribe(function () {
                    if (!self.brocodeSorting) {
                        self.brocodeSortOptions();
                    }
                });
            },

            /**
             * Whether this filter was opted in through system config.
             *
             * @returns {Boolean}
             */
            brocodeIsWhitelisted: function () {
                var whitelist = window.brocodeGridFilterSortWhitelist;

                if (!_.isArray(whitelist) || !this.ns || !this.index) {
                    return false;
                }

                return _.contains(whitelist, this.ns + ':' + this.index);
            },

            /**
             * Sorts options by label, case-insensitively, leaving nested option groups
             * in place: an entry carrying its own options is a group, and reordering
             * across groups would change what the filter means.
             *
             * @returns {void}
             */
            brocodeSortOptions: function () {
                var current = this.options(),
                    sorted;

                if (!_.isArray(current) || current.length < 2) {
                    return;
                }

                if (_.some(current, function (option) {
                    return !_.isObject(option) || _.isArray(option.options);
                })) {
                    return;
                }

                sorted = current.slice().sort(function (a, b) {
                    var labelA = String(a.label === undefined || a.label === null ? '' : a.label).toLowerCase(),
                        labelB = String(b.label === undefined || b.label === null ? '' : b.label).toLowerCase();

                    return labelA.localeCompare(labelB);
                });

                if (_.isEqual(sorted, current)) {
                    return;
                }

                this.brocodeSorting = true;
                this.options(sorted);
                this.brocodeSorting = false;
            }
        });
    };
});
