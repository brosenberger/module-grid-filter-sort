/**
 * Copyright (C) 2026 Benjamin Rosenberger <bensch.rosenberger@gmail.com>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 *
 * @copyright 2026 Benjamin Rosenberger
 * @author bensch.rosenberger@gmail.com
 * @license MIT
 * @link https://brocode.at
 */

'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { isDeepStrictEqual } = require('node:util');

const MIXIN_PATH = path.join(
    __dirname,
    '..',
    '..',
    'view',
    'adminhtml',
    'web',
    'js',
    'mixin',
    'ui-select-sort-mixin.js'
);

/**
 * Minimal stand-in for Knockout: enough of an observable to exercise
 * subscribe()/notify, nothing else.
 */
function makeObservable(initial) {
    let value = initial;
    const subscribers = [];

    const observable = function (nextValue) {
        if (arguments.length === 0) {
            return value;
        }

        value = nextValue;
        subscribers.slice().forEach((fn) => fn(value));

        return observable;
    };

    observable.subscribe = function (fn) {
        subscribers.push(fn);
    };
    observable.__isObservable = true;

    return observable;
}

const ko = {
    isObservable: (candidate) => !!(candidate && candidate.__isObservable)
};

const underscore = {
    isArray: Array.isArray,
    isObject: (value) => value !== null && typeof value === 'object',
    contains: (list, item) => list.indexOf(item) !== -1,
    some: (list, predicate) => list.some(predicate),
    isEqual: isDeepStrictEqual
};

/**
 * Evaluates the real mixin source in a sandboxed AMD shim and returns the
 * factory function it registers via define(['ko', 'underscore'], factory).
 */
function loadMixinFactory() {
    const source = fs.readFileSync(MIXIN_PATH, 'utf8');
    const modules = { ko, underscore };
    let captured;

    const sandbox = {
        window: global.window,
        define(deps, factory) {
            captured = factory(...deps.map((dep) => modules[dep]));
        }
    };

    vm.createContext(sandbox);
    vm.runInContext(source, sandbox, { filename: MIXIN_PATH });

    return captured;
}

/**
 * A bare uiClass-like base with just enough of `extend()` and `_super()` to
 * mirror how Magento_Ui's Component base actually behaves for this mixin.
 */
function makeBaseComponent() {
    function Base() {}

    Base.prototype.initialize = function () {
        return this;
    };

    Base.extend = function (protoProps) {
        function Sub() {}

        Sub.prototype = Object.create(Base.prototype);

        Object.keys(protoProps).forEach((key) => {
            if (key === 'initialize' && typeof protoProps[key] === 'function') {
                Sub.prototype[key] = function (...args) {
                    this._super = Base.prototype.initialize.bind(this);

                    return protoProps[key].apply(this, args);
                };

                return;
            }

            Sub.prototype[key] = protoProps[key];
        });

        return Sub;
    };

    return Base;
}

function makeInstance(props) {
    const mixin = loadMixinFactory();
    const Sub = mixin(makeBaseComponent());
    const instance = new Sub();

    Object.assign(instance, props);

    return instance;
}

test.beforeEach(() => {
    global.window = {};
});

test('sorts a whitelisted filter\'s options alphabetically by label', () => {
    global.window.brocodeGridFilterSortWhitelist = ['cms_page_listing:store_id'];

    const options = makeObservable([
        { value: '3', label: 'Zurich' },
        { value: '1', label: 'amsterdam' },
        { value: '2', label: 'Berlin' }
    ]);

    const instance = makeInstance({
        ns: 'cms_page_listing',
        index: 'store_id',
        options
    });

    instance.initialize();

    assert.deepEqual(
        options().map((option) => option.label),
        ['amsterdam', 'Berlin', 'Zurich']
    );
});

test('leaves a non-whitelisted filter untouched', () => {
    global.window.brocodeGridFilterSortWhitelist = ['some_other_listing:store_id'];

    const original = [
        { value: '3', label: 'Zurich' },
        { value: '1', label: 'amsterdam' }
    ];
    const options = makeObservable(original.slice());

    const instance = makeInstance({
        ns: 'cms_page_listing',
        index: 'store_id',
        options
    });

    instance.initialize();

    assert.deepEqual(options(), original);
});

test('re-sorts later option updates without recursing into itself', () => {
    global.window.brocodeGridFilterSortWhitelist = ['cms_page_listing:store_id'];

    const options = makeObservable([
        { value: '1', label: 'B' },
        { value: '2', label: 'A' }
    ]);

    let subscriberInvocations = 0;
    const rawSubscribe = options.subscribe;

    options.subscribe = function (fn) {
        rawSubscribe.call(options, function (value) {
            subscriberInvocations += 1;

            if (subscriberInvocations > 10) {
                throw new Error('subscriber recursion guard did not hold');
            }

            fn(value);
        });
    };

    const instance = makeInstance({
        ns: 'cms_page_listing',
        index: 'store_id',
        options
    });

    instance.initialize();
    assert.deepEqual(options().map((o) => o.label), ['A', 'B']);

    options([
        { value: '3', label: 'D' },
        { value: '4', label: 'C' }
    ]);

    assert.deepEqual(options().map((o) => o.label), ['C', 'D']);
    assert.ok(subscriberInvocations <= 10, 'subscriber must not loop unboundedly');
});

test('skips a filter whose options contain a nested option group', () => {
    global.window.brocodeGridFilterSortWhitelist = ['cms_page_listing:store_id'];

    const original = [
        { value: '2', label: 'Group B', options: [{ value: '2a', label: 'x' }] },
        { value: '1', label: 'Group A' }
    ];
    const options = makeObservable(original.slice());

    const instance = makeInstance({
        ns: 'cms_page_listing',
        index: 'store_id',
        options
    });

    instance.initialize();

    assert.deepEqual(options(), original);
});

test('treats a missing namespace or index as a safe no-op', () => {
    global.window.brocodeGridFilterSortWhitelist = ['cms_page_listing:store_id'];

    const original = [
        { value: '3', label: 'Zurich' },
        { value: '1', label: 'amsterdam' }
    ];
    const options = makeObservable(original.slice());

    const instance = makeInstance({
        ns: undefined,
        index: 'store_id',
        options
    });

    assert.doesNotThrow(() => instance.initialize());
    assert.deepEqual(options(), original);
});

test('does not throw when options is not a Knockout observable', () => {
    global.window.brocodeGridFilterSortWhitelist = ['cms_page_listing:store_id'];

    const instance = makeInstance({
        ns: 'cms_page_listing',
        index: 'store_id',
        options: [{ value: '1', label: 'Zurich' }]
    });

    assert.doesNotThrow(() => instance.initialize());
});
