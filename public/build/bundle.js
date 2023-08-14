
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    const identity = x => x;
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    // Adapted from https://github.com/then/is-promise/blob/master/index.js
    // Distributed under MIT License https://github.com/then/is-promise/blob/master/LICENSE
    function is_promise(value) {
        return !!value && (typeof value === 'object' || typeof value === 'function') && typeof value.then === 'function';
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    let src_url_equal_anchor;
    function src_url_equal(element_src, url) {
        if (!src_url_equal_anchor) {
            src_url_equal_anchor = document.createElement('a');
        }
        src_url_equal_anchor.href = url;
        return element_src === src_url_equal_anchor.href;
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function validate_store(store, name) {
        if (store != null && typeof store.subscribe !== 'function') {
            throw new Error(`'${name}' is not a store with a 'subscribe' method`);
        }
    }
    function subscribe(store, ...callbacks) {
        if (store == null) {
            return noop;
        }
        const unsub = store.subscribe(...callbacks);
        return unsub.unsubscribe ? () => unsub.unsubscribe() : unsub;
    }
    function component_subscribe(component, store, callback) {
        component.$$.on_destroy.push(subscribe(store, callback));
    }
    function null_to_empty(value) {
        return value == null ? '' : value;
    }
    function split_css_unit(value) {
        const split = typeof value === 'string' && value.match(/^\s*(-?[\d.]+)([^\s]*)\s*$/);
        return split ? [parseFloat(split[1]), split[2] || 'px'] : [value, 'px'];
    }

    const is_client = typeof window !== 'undefined';
    let now = is_client
        ? () => window.performance.now()
        : () => Date.now();
    let raf = is_client ? cb => requestAnimationFrame(cb) : noop;

    const tasks = new Set();
    function run_tasks(now) {
        tasks.forEach(task => {
            if (!task.c(now)) {
                tasks.delete(task);
                task.f();
            }
        });
        if (tasks.size !== 0)
            raf(run_tasks);
    }
    /**
     * Creates a new task that runs on each raf frame
     * until it returns a falsy value or is aborted
     */
    function loop(callback) {
        let task;
        if (tasks.size === 0)
            raf(run_tasks);
        return {
            promise: new Promise(fulfill => {
                tasks.add(task = { c: callback, f: fulfill });
            }),
            abort() {
                tasks.delete(task);
            }
        };
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function append(target, node) {
        target.appendChild(node);
    }
    function get_root_for_style(node) {
        if (!node)
            return document;
        const root = node.getRootNode ? node.getRootNode() : node.ownerDocument;
        if (root && root.host) {
            return root;
        }
        return node.ownerDocument;
    }
    function append_empty_stylesheet(node) {
        const style_element = element('style');
        append_stylesheet(get_root_for_style(node), style_element);
        return style_element.sheet;
    }
    function append_stylesheet(node, style) {
        append(node.head || node, style);
        return style.sheet;
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        if (node.parentNode) {
            node.parentNode.removeChild(node);
        }
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_style(node, key, value, important) {
        if (value == null) {
            node.style.removeProperty(key);
        }
        else {
            node.style.setProperty(key, value, important ? 'important' : '');
        }
    }
    function toggle_class(element, name, toggle) {
        element.classList[toggle ? 'add' : 'remove'](name);
    }
    function custom_event(type, detail, { bubbles = false, cancelable = false } = {}) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, cancelable, detail);
        return e;
    }
    class HtmlTag {
        constructor(is_svg = false) {
            this.is_svg = false;
            this.is_svg = is_svg;
            this.e = this.n = null;
        }
        c(html) {
            this.h(html);
        }
        m(html, target, anchor = null) {
            if (!this.e) {
                if (this.is_svg)
                    this.e = svg_element(target.nodeName);
                /** #7364  target for <template> may be provided as #document-fragment(11) */
                else
                    this.e = element((target.nodeType === 11 ? 'TEMPLATE' : target.nodeName));
                this.t = target.tagName !== 'TEMPLATE' ? target : target.content;
                this.c(html);
            }
            this.i(anchor);
        }
        h(html) {
            this.e.innerHTML = html;
            this.n = Array.from(this.e.nodeName === 'TEMPLATE' ? this.e.content.childNodes : this.e.childNodes);
        }
        i(anchor) {
            for (let i = 0; i < this.n.length; i += 1) {
                insert(this.t, this.n[i], anchor);
            }
        }
        p(html) {
            this.d();
            this.h(html);
            this.i(this.a);
        }
        d() {
            this.n.forEach(detach);
        }
    }

    // we need to store the information for multiple documents because a Svelte application could also contain iframes
    // https://github.com/sveltejs/svelte/issues/3624
    const managed_styles = new Map();
    let active = 0;
    // https://github.com/darkskyapp/string-hash/blob/master/index.js
    function hash(str) {
        let hash = 5381;
        let i = str.length;
        while (i--)
            hash = ((hash << 5) - hash) ^ str.charCodeAt(i);
        return hash >>> 0;
    }
    function create_style_information(doc, node) {
        const info = { stylesheet: append_empty_stylesheet(node), rules: {} };
        managed_styles.set(doc, info);
        return info;
    }
    function create_rule(node, a, b, duration, delay, ease, fn, uid = 0) {
        const step = 16.666 / duration;
        let keyframes = '{\n';
        for (let p = 0; p <= 1; p += step) {
            const t = a + (b - a) * ease(p);
            keyframes += p * 100 + `%{${fn(t, 1 - t)}}\n`;
        }
        const rule = keyframes + `100% {${fn(b, 1 - b)}}\n}`;
        const name = `__svelte_${hash(rule)}_${uid}`;
        const doc = get_root_for_style(node);
        const { stylesheet, rules } = managed_styles.get(doc) || create_style_information(doc, node);
        if (!rules[name]) {
            rules[name] = true;
            stylesheet.insertRule(`@keyframes ${name} ${rule}`, stylesheet.cssRules.length);
        }
        const animation = node.style.animation || '';
        node.style.animation = `${animation ? `${animation}, ` : ''}${name} ${duration}ms linear ${delay}ms 1 both`;
        active += 1;
        return name;
    }
    function delete_rule(node, name) {
        const previous = (node.style.animation || '').split(', ');
        const next = previous.filter(name
            ? anim => anim.indexOf(name) < 0 // remove specific animation
            : anim => anim.indexOf('__svelte') === -1 // remove all Svelte animations
        );
        const deleted = previous.length - next.length;
        if (deleted) {
            node.style.animation = next.join(', ');
            active -= deleted;
            if (!active)
                clear_rules();
        }
    }
    function clear_rules() {
        raf(() => {
            if (active)
                return;
            managed_styles.forEach(info => {
                const { ownerNode } = info.stylesheet;
                // there is no ownerNode if it runs on jsdom.
                if (ownerNode)
                    detach(ownerNode);
            });
            managed_styles.clear();
        });
    }

    function create_animation(node, from, fn, params) {
        if (!from)
            return noop;
        const to = node.getBoundingClientRect();
        if (from.left === to.left && from.right === to.right && from.top === to.top && from.bottom === to.bottom)
            return noop;
        const { delay = 0, duration = 300, easing = identity, 
        // @ts-ignore todo: should this be separated from destructuring? Or start/end added to public api and documentation?
        start: start_time = now() + delay, 
        // @ts-ignore todo:
        end = start_time + duration, tick = noop, css } = fn(node, { from, to }, params);
        let running = true;
        let started = false;
        let name;
        function start() {
            if (css) {
                name = create_rule(node, 0, 1, duration, delay, easing, css);
            }
            if (!delay) {
                started = true;
            }
        }
        function stop() {
            if (css)
                delete_rule(node, name);
            running = false;
        }
        loop(now => {
            if (!started && now >= start_time) {
                started = true;
            }
            if (started && now >= end) {
                tick(1, 0);
                stop();
            }
            if (!running) {
                return false;
            }
            if (started) {
                const p = now - start_time;
                const t = 0 + 1 * easing(p / duration);
                tick(t, 1 - t);
            }
            return true;
        });
        start();
        tick(0, 1);
        return stop;
    }
    function fix_position(node) {
        const style = getComputedStyle(node);
        if (style.position !== 'absolute' && style.position !== 'fixed') {
            const { width, height } = style;
            const a = node.getBoundingClientRect();
            node.style.position = 'absolute';
            node.style.width = width;
            node.style.height = height;
            add_transform(node, a);
        }
    }
    function add_transform(node, a) {
        const b = node.getBoundingClientRect();
        if (a.left !== b.left || a.top !== b.top) {
            const style = getComputedStyle(node);
            const transform = style.transform === 'none' ? '' : style.transform;
            node.style.transform = `${transform} translate(${a.left - b.left}px, ${a.top - b.top}px)`;
        }
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    /**
     * The `onMount` function schedules a callback to run as soon as the component has been mounted to the DOM.
     * It must be called during the component's initialisation (but doesn't need to live *inside* the component;
     * it can be called from an external module).
     *
     * `onMount` does not run inside a [server-side component](/docs#run-time-server-side-component-api).
     *
     * https://svelte.dev/docs#run-time-svelte-onmount
     */
    function onMount(fn) {
        get_current_component().$$.on_mount.push(fn);
    }
    /**
     * Schedules a callback to run immediately before the component is unmounted.
     *
     * Out of `onMount`, `beforeUpdate`, `afterUpdate` and `onDestroy`, this is the
     * only one that runs inside a server-side component.
     *
     * https://svelte.dev/docs#run-time-svelte-ondestroy
     */
    function onDestroy(fn) {
        get_current_component().$$.on_destroy.push(fn);
    }
    /**
     * Creates an event dispatcher that can be used to dispatch [component events](/docs#template-syntax-component-directives-on-eventname).
     * Event dispatchers are functions that can take two arguments: `name` and `detail`.
     *
     * Component events created with `createEventDispatcher` create a
     * [CustomEvent](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent).
     * These events do not [bubble](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Building_blocks/Events#Event_bubbling_and_capture).
     * The `detail` argument corresponds to the [CustomEvent.detail](https://developer.mozilla.org/en-US/docs/Web/API/CustomEvent/detail)
     * property and can contain any type of data.
     *
     * https://svelte.dev/docs#run-time-svelte-createeventdispatcher
     */
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail, { cancelable = false } = {}) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail, { cancelable });
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
                return !event.defaultPrevented;
            }
            return true;
        };
    }

    const dirty_components = [];
    const binding_callbacks = [];
    let render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = /* @__PURE__ */ Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        // Do not reenter flush while dirty components are updated, as this can
        // result in an infinite loop. Instead, let the inner flush handle it.
        // Reentrancy is ok afterwards for bindings etc.
        if (flushidx !== 0) {
            return;
        }
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            try {
                while (flushidx < dirty_components.length) {
                    const component = dirty_components[flushidx];
                    flushidx++;
                    set_current_component(component);
                    update(component.$$);
                }
            }
            catch (e) {
                // reset dirty state to not end up in a deadlocked state and then rethrow
                dirty_components.length = 0;
                flushidx = 0;
                throw e;
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    /**
     * Useful for example to execute remaining `afterUpdate` callbacks before executing `destroy`.
     */
    function flush_render_callbacks(fns) {
        const filtered = [];
        const targets = [];
        render_callbacks.forEach((c) => fns.indexOf(c) === -1 ? filtered.push(c) : targets.push(c));
        targets.forEach((c) => c());
        render_callbacks = filtered;
    }

    let promise;
    function wait() {
        if (!promise) {
            promise = Promise.resolve();
            promise.then(() => {
                promise = null;
            });
        }
        return promise;
    }
    function dispatch(node, direction, kind) {
        node.dispatchEvent(custom_event(`${direction ? 'intro' : 'outro'}${kind}`));
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
        else if (callback) {
            callback();
        }
    }
    const null_transition = { duration: 0 };
    function create_in_transition(node, fn, params) {
        const options = { direction: 'in' };
        let config = fn(node, params, options);
        let running = false;
        let animation_name;
        let task;
        let uid = 0;
        function cleanup() {
            if (animation_name)
                delete_rule(node, animation_name);
        }
        function go() {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            if (css)
                animation_name = create_rule(node, 0, 1, duration, delay, easing, css, uid++);
            tick(0, 1);
            const start_time = now() + delay;
            const end_time = start_time + duration;
            if (task)
                task.abort();
            running = true;
            add_render_callback(() => dispatch(node, true, 'start'));
            task = loop(now => {
                if (running) {
                    if (now >= end_time) {
                        tick(1, 0);
                        dispatch(node, true, 'end');
                        cleanup();
                        return running = false;
                    }
                    if (now >= start_time) {
                        const t = easing((now - start_time) / duration);
                        tick(t, 1 - t);
                    }
                }
                return running;
            });
        }
        let started = false;
        return {
            start() {
                if (started)
                    return;
                started = true;
                delete_rule(node);
                if (is_function(config)) {
                    config = config(options);
                    wait().then(go);
                }
                else {
                    go();
                }
            },
            invalidate() {
                started = false;
            },
            end() {
                if (running) {
                    cleanup();
                    running = false;
                }
            }
        };
    }
    function create_out_transition(node, fn, params) {
        const options = { direction: 'out' };
        let config = fn(node, params, options);
        let running = true;
        let animation_name;
        const group = outros;
        group.r += 1;
        function go() {
            const { delay = 0, duration = 300, easing = identity, tick = noop, css } = config || null_transition;
            if (css)
                animation_name = create_rule(node, 1, 0, duration, delay, easing, css);
            const start_time = now() + delay;
            const end_time = start_time + duration;
            add_render_callback(() => dispatch(node, false, 'start'));
            loop(now => {
                if (running) {
                    if (now >= end_time) {
                        tick(0, 1);
                        dispatch(node, false, 'end');
                        if (!--group.r) {
                            // this will result in `end()` being called,
                            // so we don't need to clean up here
                            run_all(group.c);
                        }
                        return false;
                    }
                    if (now >= start_time) {
                        const t = easing((now - start_time) / duration);
                        tick(1 - t, t);
                    }
                }
                return running;
            });
        }
        if (is_function(config)) {
            wait().then(() => {
                // @ts-ignore
                config = config(options);
                go();
            });
        }
        else {
            go();
        }
        return {
            end(reset) {
                if (reset && config.tick) {
                    config.tick(1, 0);
                }
                if (running) {
                    if (animation_name)
                        delete_rule(node, animation_name);
                    running = false;
                }
            }
        };
    }

    function handle_promise(promise, info) {
        const token = info.token = {};
        function update(type, index, key, value) {
            if (info.token !== token)
                return;
            info.resolved = value;
            let child_ctx = info.ctx;
            if (key !== undefined) {
                child_ctx = child_ctx.slice();
                child_ctx[key] = value;
            }
            const block = type && (info.current = type)(child_ctx);
            let needs_flush = false;
            if (info.block) {
                if (info.blocks) {
                    info.blocks.forEach((block, i) => {
                        if (i !== index && block) {
                            group_outros();
                            transition_out(block, 1, 1, () => {
                                if (info.blocks[i] === block) {
                                    info.blocks[i] = null;
                                }
                            });
                            check_outros();
                        }
                    });
                }
                else {
                    info.block.d(1);
                }
                block.c();
                transition_in(block, 1);
                block.m(info.mount(), info.anchor);
                needs_flush = true;
            }
            info.block = block;
            if (info.blocks)
                info.blocks[index] = block;
            if (needs_flush) {
                flush();
            }
        }
        if (is_promise(promise)) {
            const current_component = get_current_component();
            promise.then(value => {
                set_current_component(current_component);
                update(info.then, 1, info.value, value);
                set_current_component(null);
            }, error => {
                set_current_component(current_component);
                update(info.catch, 2, info.error, error);
                set_current_component(null);
                if (!info.hasCatch) {
                    throw error;
                }
            });
            // if we previously had a then/catch block, destroy it
            if (info.current !== info.pending) {
                update(info.pending, 0);
                return true;
            }
        }
        else {
            if (info.current !== info.then) {
                update(info.then, 1, info.value, promise);
                return true;
            }
            info.resolved = promise;
        }
    }
    function update_await_block_branch(info, ctx, dirty) {
        const child_ctx = ctx.slice();
        const { resolved } = info;
        if (info.current === info.then) {
            child_ctx[info.value] = resolved;
        }
        if (info.current === info.catch) {
            child_ctx[info.error] = resolved;
        }
        info.block.p(child_ctx, dirty);
    }
    function outro_and_destroy_block(block, lookup) {
        transition_out(block, 1, 1, () => {
            lookup.delete(block.key);
        });
    }
    function fix_and_outro_and_destroy_block(block, lookup) {
        block.f();
        outro_and_destroy_block(block, lookup);
    }
    function update_keyed_each(old_blocks, dirty, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
        let o = old_blocks.length;
        let n = list.length;
        let i = o;
        const old_indexes = {};
        while (i--)
            old_indexes[old_blocks[i].key] = i;
        const new_blocks = [];
        const new_lookup = new Map();
        const deltas = new Map();
        const updates = [];
        i = n;
        while (i--) {
            const child_ctx = get_context(ctx, list, i);
            const key = get_key(child_ctx);
            let block = lookup.get(key);
            if (!block) {
                block = create_each_block(key, child_ctx);
                block.c();
            }
            else if (dynamic) {
                // defer updates until all the DOM shuffling is done
                updates.push(() => block.p(child_ctx, dirty));
            }
            new_lookup.set(key, new_blocks[i] = block);
            if (key in old_indexes)
                deltas.set(key, Math.abs(i - old_indexes[key]));
        }
        const will_move = new Set();
        const did_move = new Set();
        function insert(block) {
            transition_in(block, 1);
            block.m(node, next);
            lookup.set(block.key, block);
            next = block.first;
            n--;
        }
        while (o && n) {
            const new_block = new_blocks[n - 1];
            const old_block = old_blocks[o - 1];
            const new_key = new_block.key;
            const old_key = old_block.key;
            if (new_block === old_block) {
                // do nothing
                next = new_block.first;
                o--;
                n--;
            }
            else if (!new_lookup.has(old_key)) {
                // remove old block
                destroy(old_block, lookup);
                o--;
            }
            else if (!lookup.has(new_key) || will_move.has(new_key)) {
                insert(new_block);
            }
            else if (did_move.has(old_key)) {
                o--;
            }
            else if (deltas.get(new_key) > deltas.get(old_key)) {
                did_move.add(new_key);
                insert(new_block);
            }
            else {
                will_move.add(old_key);
                o--;
            }
        }
        while (o--) {
            const old_block = old_blocks[o];
            if (!new_lookup.has(old_block.key))
                destroy(old_block, lookup);
        }
        while (n)
            insert(new_blocks[n - 1]);
        run_all(updates);
        return new_blocks;
    }
    function validate_each_keys(ctx, list, get_context, get_key) {
        const keys = new Set();
        for (let i = 0; i < list.length; i++) {
            const key = get_key(get_context(ctx, list, i));
            if (keys.has(key)) {
                throw new Error('Cannot have duplicate keys in a keyed each');
            }
            keys.add(key);
        }
    }

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }
    function get_spread_object(spread_props) {
        return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = component.$$.on_mount.map(run).filter(is_function);
                // if the component was destroyed immediately
                // it will update the `$$.on_destroy` reference to `null`.
                // the destructured on_destroy may still reference to the old array
                if (component.$$.on_destroy) {
                    component.$$.on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            flush_render_callbacks($$.after_update);
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: [],
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            if (!is_function(callback)) {
                return noop;
            }
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.59.2' }, detail), { bubbles: true }));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation, has_stop_immediate_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        if (has_stop_immediate_propagation)
            modifiers.push('stopImmediatePropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function prop_dev(node, property, value) {
        node[property] = value;
        dispatch_dev('SvelteDOMSetProperty', { node, property, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    function construct_svelte_component_dev(component, props) {
        const error_message = 'this={...} of <svelte:component> should specify a Svelte component.';
        try {
            const instance = new component(props);
            if (!instance.$$ || !instance.$set || !instance.$on || !instance.$destroy) {
                throw new Error(error_message);
            }
            return instance;
        }
        catch (err) {
            const { message } = err;
            if (typeof message === 'string' && message.indexOf('is not a constructor') !== -1) {
                throw new Error(error_message);
            }
            else {
                throw err;
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    function cubicOut(t) {
        const f = t - 1.0;
        return f * f * f + 1.0;
    }

    function fade(node, { delay = 0, duration = 400, easing = identity } = {}) {
        const o = +getComputedStyle(node).opacity;
        return {
            delay,
            duration,
            easing,
            css: t => `opacity: ${t * o}`
        };
    }
    function fly(node, { delay = 0, duration = 400, easing = cubicOut, x = 0, y = 0, opacity = 0 } = {}) {
        const style = getComputedStyle(node);
        const target_opacity = +style.opacity;
        const transform = style.transform === 'none' ? '' : style.transform;
        const od = target_opacity * (1 - opacity);
        const [xValue, xUnit] = split_css_unit(x);
        const [yValue, yUnit] = split_css_unit(y);
        return {
            delay,
            duration,
            easing,
            css: (t, u) => `
			transform: ${transform} translate(${(1 - t) * xValue}${xUnit}, ${(1 - t) * yValue}${yUnit});
			opacity: ${target_opacity - (od * u)}`
        };
    }

    function flip(node, { from, to }, params = {}) {
        const style = getComputedStyle(node);
        const transform = style.transform === 'none' ? '' : style.transform;
        const [ox, oy] = style.transformOrigin.split(' ').map(parseFloat);
        const dx = (from.left + from.width * ox / to.width) - (to.left + ox);
        const dy = (from.top + from.height * oy / to.height) - (to.top + oy);
        const { delay = 0, duration = (d) => Math.sqrt(d) * 120, easing = cubicOut } = params;
        return {
            delay,
            duration: is_function(duration) ? duration(Math.sqrt(dx * dx + dy * dy)) : duration,
            easing,
            css: (t, u) => {
                const x = u * dx;
                const y = u * dy;
                const sx = t + u * from.width / to.width;
                const sy = t + u * from.height / to.height;
                return `transform: ${transform} translate(${x}px, ${y}px) scale(${sx}, ${sy});`;
            }
        };
    }

    const subscriber_queue = [];
    /**
     * Create a `Writable` store that allows both updating and reading by subscription.
     * @param {*=}value initial value
     * @param {StartStopNotifier=} start
     */
    function writable(value, start = noop) {
        let stop;
        const subscribers = new Set();
        function set(new_value) {
            if (safe_not_equal(value, new_value)) {
                value = new_value;
                if (stop) { // store is ready
                    const run_queue = !subscriber_queue.length;
                    for (const subscriber of subscribers) {
                        subscriber[1]();
                        subscriber_queue.push(subscriber, value);
                    }
                    if (run_queue) {
                        for (let i = 0; i < subscriber_queue.length; i += 2) {
                            subscriber_queue[i][0](subscriber_queue[i + 1]);
                        }
                        subscriber_queue.length = 0;
                    }
                }
            }
        }
        function update(fn) {
            set(fn(value));
        }
        function subscribe(run, invalidate = noop) {
            const subscriber = [run, invalidate];
            subscribers.add(subscriber);
            if (subscribers.size === 1) {
                stop = start(set) || noop;
            }
            run(value);
            return () => {
                subscribers.delete(subscriber);
                if (subscribers.size === 0 && stop) {
                    stop();
                    stop = null;
                }
            };
        }
        return { set, update, subscribe };
    }

    /**
     * @typedef {import('svelte').ComponentType} SvelteComponent
     */

    /**
     * @typedef {import('svelte/transition').FlyParams} FlyParams
     */

    /**
     * @typedef {Object} SvelteToastCustomComponent
     * @property {SvelteComponent} src - custom Svelte Component
     * @property {Object<string,any>} [props] - props to pass into custom component
     * @property {string} [sendIdTo] - forward toast id to prop name
     */

    /**
     * @callback SvelteToastOnPopCallback
     * @param {number} [id] - optionally get the toast id if needed
     */

    /**
     * @typedef {Object} SvelteToastOptions
     * @property {number} [id] - unique id generated for every toast
     * @property {string} [target] - container target name to send toast to
     * @property {string} [msg] - toast message
     * @property {number} [duration] - duration of progress bar tween from initial to next
     * @property {number} [initial] - initial progress bar value
     * @property {number} [next] - next progress bar value
     * @property {boolean} [pausable] - pause progress bar tween on mouse hover
     * @property {boolean} [dismissable] - allow dissmiss with close button
     * @property {boolean} [reversed] - display toasts in reverse order
     * @property {FlyParams} [intro] - toast intro fly animation settings
     * @property {Object<string,string|number>} [theme] - css var overrides
     * @property {string[]} [classes] - user-defined classes
     * @property {SvelteToastOnPopCallback} [onpop] - callback that runs on toast dismiss
     * @property {SvelteToastCustomComponent} [component] - send custom Svelte Component as a message
     * @property {number} [progress] - DEPRECATED
     */

    /** @type {SvelteToastOptions} */
    const defaults = {
      duration: 4000,
      initial: 1,
      next: 0,
      pausable: false,
      dismissable: true,
      reversed: false,
      intro: { x: 256 }
    };

    function createToast() {
      const { subscribe, update } = writable(new Array());
      /** @type {Object<string,SvelteToastOptions>} */
      const options = {};
      let count = 0;

      /** @param {any} obj */
      function _obj(obj) {
        return obj instanceof Object
      }

      function _init(target = 'default', opts = {}) {
        options[target] = opts;
        return options
      }

      /**
       * Send a new toast
       * @param {(string|SvelteToastOptions)} msg
       * @param {SvelteToastOptions} [opts]
       * @returns {number}
       */
      function push(msg, opts) {
        const param = {
          target: 'default',
          ...(_obj(msg) ? /** @type {SvelteToastOptions} */ (msg) : { ...opts, msg })
        };
        const conf = options[param.target] || {};
        const entry = {
          ...defaults,
          ...conf,
          ...param,
          theme: { ...conf.theme, ...param.theme },
          classes: [...(conf.classes || []), ...(param.classes || [])],
          id: ++count
        };
        update((n) => (entry.reversed ? [...n, entry] : [entry, ...n]));
        return count
      }

      /**
       * Remove toast(s)
       * - toast.pop() // removes the last toast
       * - toast.pop(0) // remove all toasts
       * - toast.pop(id) // removes the toast with specified `id`
       * - toast.pop({ target: 'foo' }) // remove all toasts from target `foo`
       * @param {(number|Object<'target',string>)} [id]
       */
      function pop(id) {
        update((n) => {
          if (!n.length || id === 0) return []
          // Filter function is deprecated; shim added for backward compatibility
          if (typeof id === 'function') return n.filter((i) => id(i))
          if (_obj(id))
            return n.filter(/** @type {SvelteToastOptions[]} i */ (i) => i.target !== id.target)
          const found = id || Math.max(...n.map((i) => i.id));
          return n.filter((i) => i.id !== found)
        });
      }

      /**
       * Update an existing toast
       * @param {(number|SvelteToastOptions)} id
       * @param {SvelteToastOptions} [opts]
       */
      function set(id, opts) {
        /** @type {any} */
        const param = _obj(id) ? id : { ...opts, id };
        update((n) => {
          const idx = n.findIndex((i) => i.id === param.id);
          if (idx > -1) {
            n[idx] = { ...n[idx], ...param };
          }
          return n
        });
      }

      return { subscribe, push, pop, set, _init }
    }

    const toast = createToast();

    function is_date(obj) {
        return Object.prototype.toString.call(obj) === '[object Date]';
    }

    function get_interpolator(a, b) {
        if (a === b || a !== a)
            return () => a;
        const type = typeof a;
        if (type !== typeof b || Array.isArray(a) !== Array.isArray(b)) {
            throw new Error('Cannot interpolate values of different type');
        }
        if (Array.isArray(a)) {
            const arr = b.map((bi, i) => {
                return get_interpolator(a[i], bi);
            });
            return t => arr.map(fn => fn(t));
        }
        if (type === 'object') {
            if (!a || !b)
                throw new Error('Object cannot be null');
            if (is_date(a) && is_date(b)) {
                a = a.getTime();
                b = b.getTime();
                const delta = b - a;
                return t => new Date(a + t * delta);
            }
            const keys = Object.keys(b);
            const interpolators = {};
            keys.forEach(key => {
                interpolators[key] = get_interpolator(a[key], b[key]);
            });
            return t => {
                const result = {};
                keys.forEach(key => {
                    result[key] = interpolators[key](t);
                });
                return result;
            };
        }
        if (type === 'number') {
            const delta = b - a;
            return t => a + t * delta;
        }
        throw new Error(`Cannot interpolate ${type} values`);
    }
    function tweened(value, defaults = {}) {
        const store = writable(value);
        let task;
        let target_value = value;
        function set(new_value, opts) {
            if (value == null) {
                store.set(value = new_value);
                return Promise.resolve();
            }
            target_value = new_value;
            let previous_task = task;
            let started = false;
            let { delay = 0, duration = 400, easing = identity, interpolate = get_interpolator } = assign(assign({}, defaults), opts);
            if (duration === 0) {
                if (previous_task) {
                    previous_task.abort();
                    previous_task = null;
                }
                store.set(value = target_value);
                return Promise.resolve();
            }
            const start = now() + delay;
            let fn;
            task = loop(now => {
                if (now < start)
                    return true;
                if (!started) {
                    fn = interpolate(value, new_value);
                    if (typeof duration === 'function')
                        duration = duration(value, new_value);
                    started = true;
                }
                if (previous_task) {
                    previous_task.abort();
                    previous_task = null;
                }
                const elapsed = now - start;
                if (elapsed > duration) {
                    store.set(value = new_value);
                    return false;
                }
                // @ts-ignore
                store.set(value = fn(easing(elapsed / duration)));
                return true;
            });
            return task.promise;
        }
        return {
            set,
            update: (fn, opts) => set(fn(target_value, value), opts),
            subscribe: store.subscribe
        };
    }

    /* node_modules\@zerodevx\svelte-toast\ToastItem.svelte generated by Svelte v3.59.2 */
    const file$7 = "node_modules\\@zerodevx\\svelte-toast\\ToastItem.svelte";

    // (98:4) {:else}
    function create_else_block$2(ctx) {
    	let html_tag;
    	let raw_value = /*item*/ ctx[0].msg + "";
    	let html_anchor;

    	const block = {
    		c: function create() {
    			html_tag = new HtmlTag(false);
    			html_anchor = empty();
    			html_tag.a = html_anchor;
    		},
    		m: function mount(target, anchor) {
    			html_tag.m(raw_value, target, anchor);
    			insert_dev(target, html_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*item*/ 1 && raw_value !== (raw_value = /*item*/ ctx[0].msg + "")) html_tag.p(raw_value);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(html_anchor);
    			if (detaching) html_tag.d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$2.name,
    		type: "else",
    		source: "(98:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (96:4) {#if item.component}
    function create_if_block_1$2(ctx) {
    	let switch_instance;
    	let switch_instance_anchor;
    	let current;
    	const switch_instance_spread_levels = [/*cprops*/ ctx[2]];
    	var switch_value = /*item*/ ctx[0].component.src;

    	function switch_props(ctx) {
    		let switch_instance_props = {};

    		for (let i = 0; i < switch_instance_spread_levels.length; i += 1) {
    			switch_instance_props = assign(switch_instance_props, switch_instance_spread_levels[i]);
    		}

    		return {
    			props: switch_instance_props,
    			$$inline: true
    		};
    	}

    	if (switch_value) {
    		switch_instance = construct_svelte_component_dev(switch_value, switch_props());
    	}

    	const block = {
    		c: function create() {
    			if (switch_instance) create_component(switch_instance.$$.fragment);
    			switch_instance_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (switch_instance) mount_component(switch_instance, target, anchor);
    			insert_dev(target, switch_instance_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			const switch_instance_changes = (dirty & /*cprops*/ 4)
    			? get_spread_update(switch_instance_spread_levels, [get_spread_object(/*cprops*/ ctx[2])])
    			: {};

    			if (dirty & /*item*/ 1 && switch_value !== (switch_value = /*item*/ ctx[0].component.src)) {
    				if (switch_instance) {
    					group_outros();
    					const old_component = switch_instance;

    					transition_out(old_component.$$.fragment, 1, 0, () => {
    						destroy_component(old_component, 1);
    					});

    					check_outros();
    				}

    				if (switch_value) {
    					switch_instance = construct_svelte_component_dev(switch_value, switch_props());
    					create_component(switch_instance.$$.fragment);
    					transition_in(switch_instance.$$.fragment, 1);
    					mount_component(switch_instance, switch_instance_anchor.parentNode, switch_instance_anchor);
    				} else {
    					switch_instance = null;
    				}
    			} else if (switch_value) {
    				switch_instance.$set(switch_instance_changes);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			if (switch_instance) transition_in(switch_instance.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			if (switch_instance) transition_out(switch_instance.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(switch_instance_anchor);
    			if (switch_instance) destroy_component(switch_instance, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$2.name,
    		type: "if",
    		source: "(96:4) {#if item.component}",
    		ctx
    	});

    	return block;
    }

    // (102:2) {#if item.dismissable}
    function create_if_block$3(ctx) {
    	let div;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "class", "_toastBtn pe svelte-95rq8t");
    			attr_dev(div, "role", "button");
    			attr_dev(div, "tabindex", "0");
    			add_location(div, file$7, 102, 4, 2271);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);

    			if (!mounted) {
    				dispose = [
    					listen_dev(div, "click", /*close*/ ctx[4], false, false, false, false),
    					listen_dev(div, "keydown", /*keydown_handler*/ ctx[8], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$3.name,
    		type: "if",
    		source: "(102:2) {#if item.dismissable}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$7(ctx) {
    	let div1;
    	let div0;
    	let current_block_type_index;
    	let if_block0;
    	let t0;
    	let t1;
    	let progress_1;
    	let current;
    	let mounted;
    	let dispose;
    	const if_block_creators = [create_if_block_1$2, create_else_block$2];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*item*/ ctx[0].component) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block0 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	let if_block1 = /*item*/ ctx[0].dismissable && create_if_block$3(ctx);

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			if_block0.c();
    			t0 = space();
    			if (if_block1) if_block1.c();
    			t1 = space();
    			progress_1 = element("progress");
    			attr_dev(div0, "class", "_toastMsg svelte-95rq8t");
    			toggle_class(div0, "pe", /*item*/ ctx[0].component);
    			add_location(div0, file$7, 94, 2, 2048);
    			attr_dev(progress_1, "class", "_toastBar svelte-95rq8t");
    			progress_1.value = /*$progress*/ ctx[1];
    			add_location(progress_1, file$7, 112, 2, 2500);
    			attr_dev(div1, "role", "status");
    			attr_dev(div1, "class", "_toastItem svelte-95rq8t");
    			toggle_class(div1, "pe", /*item*/ ctx[0].pausable);
    			add_location(div1, file$7, 85, 0, 1889);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			if_blocks[current_block_type_index].m(div0, null);
    			append_dev(div1, t0);
    			if (if_block1) if_block1.m(div1, null);
    			append_dev(div1, t1);
    			append_dev(div1, progress_1);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(div1, "mouseenter", /*mouseenter_handler*/ ctx[9], false, false, false, false),
    					listen_dev(div1, "mouseleave", /*resume*/ ctx[6], false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block0 = if_blocks[current_block_type_index];

    				if (!if_block0) {
    					if_block0 = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block0.c();
    				} else {
    					if_block0.p(ctx, dirty);
    				}

    				transition_in(if_block0, 1);
    				if_block0.m(div0, null);
    			}

    			if (!current || dirty & /*item*/ 1) {
    				toggle_class(div0, "pe", /*item*/ ctx[0].component);
    			}

    			if (/*item*/ ctx[0].dismissable) {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block$3(ctx);
    					if_block1.c();
    					if_block1.m(div1, t1);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}

    			if (!current || dirty & /*$progress*/ 2) {
    				prop_dev(progress_1, "value", /*$progress*/ ctx[1]);
    			}

    			if (!current || dirty & /*item*/ 1) {
    				toggle_class(div1, "pe", /*item*/ ctx[0].pausable);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block0);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block0);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			if_blocks[current_block_type_index].d();
    			if (if_block1) if_block1.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function check(prop, kind = 'undefined') {
    	return typeof prop === kind;
    }

    function instance$7($$self, $$props, $$invalidate) {
    	let $progress;
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('ToastItem', slots, []);
    	let { item } = $$props;

    	/** @type {any} */
    	let next = item.initial;

    	let prev = next;
    	let paused = false;
    	let cprops = {};

    	/** @type {any} */
    	let unlisten;

    	const progress = tweened(item.initial, { duration: item.duration, easing: identity });
    	validate_store(progress, 'progress');
    	component_subscribe($$self, progress, value => $$invalidate(1, $progress = value));

    	function close() {
    		toast.pop(item.id);
    	}

    	function autoclose() {
    		if ($progress === 1 || $progress === 0) close();
    	}

    	function pause() {
    		if (!paused && $progress !== next) {
    			progress.set($progress, { duration: 0 });
    			paused = true;
    		}
    	}

    	function resume() {
    		if (paused) {
    			const d = /** @type {any} */
    			item.duration;

    			const duration = d - d * (($progress - prev) / (next - prev));
    			progress.set(next, { duration }).then(autoclose);
    			paused = false;
    		}
    	}

    	function listen(d = document) {
    		if (check(d.hidden)) return;
    		const handler = () => d.hidden ? pause() : resume();
    		const name = 'visibilitychange';
    		d.addEventListener(name, handler);
    		unlisten = () => d.removeEventListener(name, handler);
    		handler();
    	}

    	onMount(listen);

    	onDestroy(() => {
    		if (check(item.onpop, 'function')) {
    			// @ts-ignore
    			item.onpop(item.id);
    		}

    		unlisten && unlisten();
    	});

    	$$self.$$.on_mount.push(function () {
    		if (item === undefined && !('item' in $$props || $$self.$$.bound[$$self.$$.props['item']])) {
    			console.warn("<ToastItem> was created without expected prop 'item'");
    		}
    	});

    	const writable_props = ['item'];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<ToastItem> was created with unknown prop '${key}'`);
    	});

    	const keydown_handler = e => {
    		if (e instanceof KeyboardEvent && ['Enter', ' '].includes(e.key)) close();
    	};

    	const mouseenter_handler = () => {
    		if (item.pausable) pause();
    	};

    	$$self.$$set = $$props => {
    		if ('item' in $$props) $$invalidate(0, item = $$props.item);
    	};

    	$$self.$capture_state = () => ({
    		onMount,
    		onDestroy,
    		tweened,
    		linear: identity,
    		toast,
    		item,
    		next,
    		prev,
    		paused,
    		cprops,
    		unlisten,
    		progress,
    		close,
    		autoclose,
    		pause,
    		resume,
    		check,
    		listen,
    		$progress
    	});

    	$$self.$inject_state = $$props => {
    		if ('item' in $$props) $$invalidate(0, item = $$props.item);
    		if ('next' in $$props) $$invalidate(7, next = $$props.next);
    		if ('prev' in $$props) prev = $$props.prev;
    		if ('paused' in $$props) paused = $$props.paused;
    		if ('cprops' in $$props) $$invalidate(2, cprops = $$props.cprops);
    		if ('unlisten' in $$props) unlisten = $$props.unlisten;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*item*/ 1) {
    			// `progress` has been renamed to `next`; shim included for backward compatibility, to remove in next major
    			if (!check(item.progress)) {
    				$$invalidate(0, item.next = item.progress, item);
    			}
    		}

    		if ($$self.$$.dirty & /*next, item, $progress*/ 131) {
    			if (next !== item.next) {
    				$$invalidate(7, next = item.next);
    				prev = $progress;
    				paused = false;
    				progress.set(next).then(autoclose);
    			}
    		}

    		if ($$self.$$.dirty & /*item*/ 1) {
    			if (item.component) {
    				const { props = {}, sendIdTo } = item.component;

    				$$invalidate(2, cprops = {
    					...props,
    					...sendIdTo && { [sendIdTo]: item.id }
    				});
    			}
    		}
    	};

    	return [
    		item,
    		$progress,
    		cprops,
    		progress,
    		close,
    		pause,
    		resume,
    		next,
    		keydown_handler,
    		mouseenter_handler
    	];
    }

    class ToastItem extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, { item: 0 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ToastItem",
    			options,
    			id: create_fragment$7.name
    		});
    	}

    	get item() {
    		throw new Error("<ToastItem>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set item(value) {
    		throw new Error("<ToastItem>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* node_modules\@zerodevx\svelte-toast\SvelteToast.svelte generated by Svelte v3.59.2 */

    const { Object: Object_1 } = globals;
    const file$6 = "node_modules\\@zerodevx\\svelte-toast\\SvelteToast.svelte";

    function get_each_context$2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[4] = list[i];
    	return child_ctx;
    }

    // (26:2) {#each items as item (item.id)}
    function create_each_block$2(key_1, ctx) {
    	let li;
    	let toastitem;
    	let t;
    	let li_class_value;
    	let li_style_value;
    	let li_intro;
    	let li_outro;
    	let rect;
    	let stop_animation = noop;
    	let current;

    	toastitem = new ToastItem({
    			props: { item: /*item*/ ctx[4] },
    			$$inline: true
    		});

    	const block = {
    		key: key_1,
    		first: null,
    		c: function create() {
    			li = element("li");
    			create_component(toastitem.$$.fragment);
    			t = space();
    			attr_dev(li, "class", li_class_value = "" + (null_to_empty(/*item*/ ctx[4].classes?.join(' ')) + " svelte-1u812xz"));
    			attr_dev(li, "style", li_style_value = getCss(/*item*/ ctx[4].theme));
    			add_location(li, file$6, 26, 4, 731);
    			this.first = li;
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			mount_component(toastitem, li, null);
    			append_dev(li, t);
    			current = true;
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    			const toastitem_changes = {};
    			if (dirty & /*items*/ 1) toastitem_changes.item = /*item*/ ctx[4];
    			toastitem.$set(toastitem_changes);

    			if (!current || dirty & /*items*/ 1 && li_class_value !== (li_class_value = "" + (null_to_empty(/*item*/ ctx[4].classes?.join(' ')) + " svelte-1u812xz"))) {
    				attr_dev(li, "class", li_class_value);
    			}

    			if (!current || dirty & /*items*/ 1 && li_style_value !== (li_style_value = getCss(/*item*/ ctx[4].theme))) {
    				attr_dev(li, "style", li_style_value);
    			}
    		},
    		r: function measure() {
    			rect = li.getBoundingClientRect();
    		},
    		f: function fix() {
    			fix_position(li);
    			stop_animation();
    			add_transform(li, rect);
    		},
    		a: function animate() {
    			stop_animation();
    			stop_animation = create_animation(li, rect, flip, { duration: 200 });
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(toastitem.$$.fragment, local);

    			add_render_callback(() => {
    				if (!current) return;
    				if (li_outro) li_outro.end(1);
    				li_intro = create_in_transition(li, fly, /*item*/ ctx[4].intro);
    				li_intro.start();
    			});

    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(toastitem.$$.fragment, local);
    			if (li_intro) li_intro.invalidate();
    			li_outro = create_out_transition(li, fade, {});
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(li);
    			destroy_component(toastitem);
    			if (detaching && li_outro) li_outro.end();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$2.name,
    		type: "each",
    		source: "(26:2) {#each items as item (item.id)}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$6(ctx) {
    	let ul;
    	let each_blocks = [];
    	let each_1_lookup = new Map();
    	let current;
    	let each_value = /*items*/ ctx[0];
    	validate_each_argument(each_value);
    	const get_key = ctx => /*item*/ ctx[4].id;
    	validate_each_keys(ctx, each_value, get_each_context$2, get_key);

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context$2(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each_1_lookup.set(key, each_blocks[i] = create_each_block$2(key, child_ctx));
    	}

    	const block = {
    		c: function create() {
    			ul = element("ul");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(ul, "class", "_toastContainer svelte-1u812xz");
    			add_location(ul, file$6, 24, 0, 664);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, ul, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(ul, null);
    				}
    			}

    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*items, getCss*/ 1) {
    				each_value = /*items*/ ctx[0];
    				validate_each_argument(each_value);
    				group_outros();
    				for (let i = 0; i < each_blocks.length; i += 1) each_blocks[i].r();
    				validate_each_keys(ctx, each_value, get_each_context$2, get_key);
    				each_blocks = update_keyed_each(each_blocks, dirty, get_key, 1, ctx, each_value, each_1_lookup, ul, fix_and_outro_and_destroy_block, create_each_block$2, null, get_each_context$2);
    				for (let i = 0; i < each_blocks.length; i += 1) each_blocks[i].a();
    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},
    		o: function outro(local) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(ul);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d();
    			}
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function getCss(theme) {
    	return theme
    	? Object.keys(theme).reduce((a, c) => `${a}${c}:${theme[c]};`, '')
    	: undefined;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let $toast;
    	validate_store(toast, 'toast');
    	component_subscribe($$self, toast, $$value => $$invalidate(3, $toast = $$value));
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('SvelteToast', slots, []);
    	let { options = {} } = $$props;
    	let { target = 'default' } = $$props;

    	/** @type {import('./stores.js').SvelteToastOptions[]} */
    	let items = [];

    	const writable_props = ['options', 'target'];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<SvelteToast> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('options' in $$props) $$invalidate(1, options = $$props.options);
    		if ('target' in $$props) $$invalidate(2, target = $$props.target);
    	};

    	$$self.$capture_state = () => ({
    		fade,
    		fly,
    		flip,
    		toast,
    		ToastItem,
    		options,
    		target,
    		items,
    		getCss,
    		$toast
    	});

    	$$self.$inject_state = $$props => {
    		if ('options' in $$props) $$invalidate(1, options = $$props.options);
    		if ('target' in $$props) $$invalidate(2, target = $$props.target);
    		if ('items' in $$props) $$invalidate(0, items = $$props.items);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	$$self.$$.update = () => {
    		if ($$self.$$.dirty & /*target, options*/ 6) {
    			toast._init(target, options);
    		}

    		if ($$self.$$.dirty & /*$toast, target*/ 12) {
    			$$invalidate(0, items = $toast.filter(i => i.target === target));
    		}
    	};

    	return [items, options, target, $toast];
    }

    class SvelteToast extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, { options: 1, target: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "SvelteToast",
    			options,
    			id: create_fragment$6.name
    		});
    	}

    	get options() {
    		throw new Error("<SvelteToast>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set options(value) {
    		throw new Error("<SvelteToast>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get target() {
    		throw new Error("<SvelteToast>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set target(value) {
    		throw new Error("<SvelteToast>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\login.svelte generated by Svelte v3.59.2 */
    const file$5 = "src\\login.svelte";

    function create_fragment$5(ctx) {
    	let div1;
    	let div0;
    	let img;
    	let img_src_value;
    	let t0;
    	let h2;
    	let t2;
    	let input0;
    	let t3;
    	let input1;
    	let t4;
    	let h6;
    	let t6;
    	let input2;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			div0 = element("div");
    			img = element("img");
    			t0 = space();
    			h2 = element("h2");
    			h2.textContent = "Welcome";
    			t2 = space();
    			input0 = element("input");
    			t3 = space();
    			input1 = element("input");
    			t4 = space();
    			h6 = element("h6");
    			h6.textContent = "Forgot Password?";
    			t6 = space();
    			input2 = element("input");
    			if (!src_url_equal(img.src, img_src_value = "avatar.svg")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "avatar");
    			attr_dev(img, "class", "svelte-hocngq");
    			add_location(img, file$5, 53, 8, 1736);
    			attr_dev(h2, "class", "title svelte-hocngq");
    			add_location(h2, file$5, 54, 8, 1783);
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "class", "username svelte-hocngq");
    			attr_dev(input0, "placeholder", "Username");
    			attr_dev(input0, "maxlength", "10");
    			add_location(input0, file$5, 55, 8, 1823);
    			attr_dev(input1, "type", "password");
    			attr_dev(input1, "class", "password svelte-hocngq");
    			attr_dev(input1, "placeholder", "Password");
    			attr_dev(input1, "maxlength", "10");
    			add_location(input1, file$5, 56, 8, 1952);
    			attr_dev(h6, "class", "forgot svelte-hocngq");
    			add_location(h6, file$5, 57, 8, 2074);
    			attr_dev(input2, "type", "submit");
    			attr_dev(input2, "class", "submit svelte-hocngq");
    			input2.value = "Login";
    			add_location(input2, file$5, 58, 8, 2124);
    			attr_dev(div0, "class", "form svelte-hocngq");
    			add_location(div0, file$5, 52, 4, 1708);
    			attr_dev(div1, "class", "container svelte-hocngq");
    			add_location(div1, file$5, 51, 0, 1678);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, div0);
    			append_dev(div0, img);
    			append_dev(div0, t0);
    			append_dev(div0, h2);
    			append_dev(div0, t2);
    			append_dev(div0, input0);
    			/*input0_binding*/ ctx[3](input0);
    			append_dev(div0, t3);
    			append_dev(div0, input1);
    			/*input1_binding*/ ctx[4](input1);
    			append_dev(div0, t4);
    			append_dev(div0, h6);
    			append_dev(div0, t6);
    			append_dev(div0, input2);

    			if (!mounted) {
    				dispose = listen_dev(input2, "click", /*validate*/ ctx[2], false, false, false, false);
    				mounted = true;
    			}
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
    			/*input0_binding*/ ctx[3](null);
    			/*input1_binding*/ ctx[4](null);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Login', slots, []);
    	const dispatch = createEventDispatcher();
    	let inputUsername;
    	let inputPassword;

    	async function validate() {
    		const username = inputUsername.value;
    		const password = inputPassword.value;

    		if (!username) {
    			toast.push("Registra el USERNAME");
    			inputUsername.focus();
    		} else if (!password) {
    			toast.push("Registra el PASSWORD");
    			inputPassword.focus();
    		} else {
    			const user = new FormData();
    			user.append("username", username);
    			user.append("password", password);
    			const url = "https://api-jeanoi4212.b4a.run/login";

    			const options = {
    				method: "POST",
    				headers: {
    					"Content-Type": "application/x-www-form-urlencoded"
    				},
    				body: new URLSearchParams(user)
    			};

    			try {
    				const response = await fetch(url, options);

    				if (response.ok) {
    					const json = await response.json();
    					sessionStorage.setItem("token", json.access_token);
    					sessionStorage.setItem("menu", "1");
    					dispatch("login");
    				} else {
    					toast.push("Credenciales de autenticación inválidas");
    					inputUsername.focus();
    				}

    				;
    			} catch {
    				toast.push("Sin conexion con el servidor");
    			}
    		}
    	}
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Login> was created with unknown prop '${key}'`);
    	});

    	function input0_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			inputUsername = $$value;
    			$$invalidate(0, inputUsername);
    		});
    	}

    	function input1_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			inputPassword = $$value;
    			$$invalidate(1, inputPassword);
    		});
    	}

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		toast,
    		dispatch,
    		inputUsername,
    		inputPassword,
    		validate
    	});

    	$$self.$inject_state = $$props => {
    		if ('inputUsername' in $$props) $$invalidate(0, inputUsername = $$props.inputUsername);
    		if ('inputPassword' in $$props) $$invalidate(1, inputPassword = $$props.inputPassword);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [inputUsername, inputPassword, validate, input0_binding, input1_binding];
    }

    class Login extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Login",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    /* src\trabajadores.svelte generated by Svelte v3.59.2 */

    const { console: console_1$1 } = globals;
    const file$4 = "src\\trabajadores.svelte";

    function get_each_context$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[11] = list[i];
    	child_ctx[13] = i;
    	return child_ctx;
    }

    function get_each_context_1$1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[14] = list[i];
    	child_ctx[16] = i;
    	return child_ctx;
    }

    // (90:4) {:catch}
    function create_catch_block$1(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Error";
    			add_location(p, file$4, 90, 8, 3229);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_catch_block$1.name,
    		type: "catch",
    		source: "(90:4) {:catch}",
    		ctx
    	});

    	return block;
    }

    // (50:4) {:then}
    function create_then_block$1(ctx) {
    	let table;
    	let thead;
    	let tr;
    	let th0;
    	let t1;
    	let th1;
    	let t3;
    	let th2;
    	let t5;
    	let th3;
    	let t7;
    	let th4;
    	let t9;
    	let th5;
    	let t11;
    	let tbody;
    	let t12;
    	let nav;
    	let each_value_1 = /*showPage*/ ctx[1];
    	validate_each_argument(each_value_1);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1$1(get_each_context_1$1(ctx, each_value_1, i));
    	}

    	let each_value = Array.from({ length: /*totalPages*/ ctx[2] });
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			table = element("table");
    			thead = element("thead");
    			tr = element("tr");
    			th0 = element("th");
    			th0.textContent = "#";
    			t1 = space();
    			th1 = element("th");
    			th1.textContent = "NOMBRE";
    			t3 = space();
    			th2 = element("th");
    			th2.textContent = "DNI";
    			t5 = space();
    			th3 = element("th");
    			th3.textContent = "INGRESO";
    			t7 = space();
    			th4 = element("th");
    			th4.textContent = "CARGO";
    			t9 = space();
    			th5 = element("th");
    			th5.textContent = "GESTION";
    			t11 = space();
    			tbody = element("tbody");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t12 = space();
    			nav = element("nav");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			attr_dev(th0, "class", "svelte-6wkptm");
    			add_location(th0, file$4, 53, 20, 1541);
    			attr_dev(th1, "class", "svelte-6wkptm");
    			add_location(th1, file$4, 54, 20, 1589);
    			attr_dev(th2, "class", "svelte-6wkptm");
    			add_location(th2, file$4, 55, 20, 1626);
    			attr_dev(th3, "class", "svelte-6wkptm");
    			add_location(th3, file$4, 56, 20, 1676);
    			attr_dev(th4, "class", "svelte-6wkptm");
    			add_location(th4, file$4, 57, 20, 1714);
    			attr_dev(th5, "class", "svelte-6wkptm");
    			add_location(th5, file$4, 58, 20, 1750);
    			add_location(tr, file$4, 52, 16, 1515);
    			attr_dev(thead, "class", "svelte-6wkptm");
    			add_location(thead, file$4, 51, 12, 1490);
    			attr_dev(tbody, "class", "svelte-6wkptm");
    			add_location(tbody, file$4, 61, 12, 1840);
    			attr_dev(table, "class", "svelte-6wkptm");
    			add_location(table, file$4, 50, 8, 1469);
    			attr_dev(nav, "class", "pagination svelte-6wkptm");
    			add_location(nav, file$4, 84, 8, 2912);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, table, anchor);
    			append_dev(table, thead);
    			append_dev(thead, tr);
    			append_dev(tr, th0);
    			append_dev(tr, t1);
    			append_dev(tr, th1);
    			append_dev(tr, t3);
    			append_dev(tr, th2);
    			append_dev(tr, t5);
    			append_dev(tr, th3);
    			append_dev(tr, t7);
    			append_dev(tr, th4);
    			append_dev(tr, t9);
    			append_dev(tr, th5);
    			append_dev(table, t11);
    			append_dev(table, tbody);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				if (each_blocks_1[i]) {
    					each_blocks_1[i].m(tbody, null);
    				}
    			}

    			insert_dev(target, t12, anchor);
    			insert_dev(target, nav, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(nav, null);
    				}
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*showPage, currentPage, itemsPerPage*/ 11) {
    				each_value_1 = /*showPage*/ ctx[1];
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1$1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_1$1(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(tbody, null);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_1.length;
    			}

    			if (dirty & /*getCurrentPageItems, totalPages*/ 36) {
    				each_value = Array.from({ length: /*totalPages*/ ctx[2] });
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context$1(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block$1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(nav, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(table);
    			destroy_each(each_blocks_1, detaching);
    			if (detaching) detach_dev(t12);
    			if (detaching) detach_dev(nav);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_then_block$1.name,
    		type: "then",
    		source: "(50:4) {:then}",
    		ctx
    	});

    	return block;
    }

    // (63:16) {#each showPage as person, index}
    function create_each_block_1$1(ctx) {
    	let tr;
    	let th;
    	let t0_value = /*currentPage*/ ctx[0] * /*itemsPerPage*/ ctx[3] + /*index*/ ctx[16] + 1 + "";
    	let t0;
    	let t1;
    	let td0;
    	let t2_value = /*person*/ ctx[14].paterno + "";
    	let t2;
    	let t3;
    	let t4_value = /*person*/ ctx[14].materno + "";
    	let t4;
    	let t5;
    	let t6_value = /*person*/ ctx[14].nombre + "";
    	let t6;
    	let t7;
    	let td1;
    	let t8_value = /*person*/ ctx[14].dni + "";
    	let t8;
    	let t9;
    	let td2;
    	let t10_value = /*person*/ ctx[14].ingreso + "";
    	let t10;
    	let t11;
    	let td3;
    	let t12_value = /*person*/ ctx[14].cargo + "";
    	let t12;
    	let t13;
    	let td4;
    	let div;
    	let button0;
    	let img0;
    	let img0_src_value;
    	let t14;
    	let button1;
    	let img1;
    	let img1_src_value;
    	let t15;

    	const block = {
    		c: function create() {
    			tr = element("tr");
    			th = element("th");
    			t0 = text(t0_value);
    			t1 = space();
    			td0 = element("td");
    			t2 = text(t2_value);
    			t3 = space();
    			t4 = text(t4_value);
    			t5 = space();
    			t6 = text(t6_value);
    			t7 = space();
    			td1 = element("td");
    			t8 = text(t8_value);
    			t9 = space();
    			td2 = element("td");
    			t10 = text(t10_value);
    			t11 = space();
    			td3 = element("td");
    			t12 = text(t12_value);
    			t13 = space();
    			td4 = element("td");
    			div = element("div");
    			button0 = element("button");
    			img0 = element("img");
    			t14 = space();
    			button1 = element("button");
    			img1 = element("img");
    			t15 = space();
    			attr_dev(th, "class", "svelte-6wkptm");
    			add_location(th, file$4, 64, 24, 1950);
    			attr_dev(td0, "class", "svelte-6wkptm");
    			add_location(td0, file$4, 65, 24, 2045);
    			attr_dev(td1, "class", "svelte-6wkptm");
    			add_location(td1, file$4, 66, 24, 2129);
    			attr_dev(td2, "class", "svelte-6wkptm");
    			add_location(td2, file$4, 67, 24, 2196);
    			attr_dev(td3, "class", "svelte-6wkptm");
    			add_location(td3, file$4, 68, 24, 2247);
    			if (!src_url_equal(img0.src, img0_src_value = "Mas.svg")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "height", "21");
    			attr_dev(img0, "alt", "");
    			add_location(img0, file$4, 72, 36, 2444);
    			attr_dev(button0, "class", "options svelte-6wkptm");
    			add_location(button0, file$4, 71, 32, 2382);
    			if (!src_url_equal(img1.src, img1_src_value = "Del.svg")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "height", "21");
    			attr_dev(img1, "alt", "");
    			add_location(img1, file$4, 75, 36, 2623);
    			attr_dev(button1, "class", "delete svelte-6wkptm");
    			add_location(button1, file$4, 74, 32, 2562);
    			attr_dev(div, "class", "menu svelte-6wkptm");
    			add_location(div, file$4, 70, 28, 2330);
    			attr_dev(td4, "class", "svelte-6wkptm");
    			add_location(td4, file$4, 69, 24, 2296);
    			attr_dev(tr, "class", "svelte-6wkptm");
    			add_location(tr, file$4, 63, 20, 1920);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, tr, anchor);
    			append_dev(tr, th);
    			append_dev(th, t0);
    			append_dev(tr, t1);
    			append_dev(tr, td0);
    			append_dev(td0, t2);
    			append_dev(td0, t3);
    			append_dev(td0, t4);
    			append_dev(td0, t5);
    			append_dev(td0, t6);
    			append_dev(tr, t7);
    			append_dev(tr, td1);
    			append_dev(td1, t8);
    			append_dev(tr, t9);
    			append_dev(tr, td2);
    			append_dev(td2, t10);
    			append_dev(tr, t11);
    			append_dev(tr, td3);
    			append_dev(td3, t12);
    			append_dev(tr, t13);
    			append_dev(tr, td4);
    			append_dev(td4, div);
    			append_dev(div, button0);
    			append_dev(button0, img0);
    			append_dev(div, t14);
    			append_dev(div, button1);
    			append_dev(button1, img1);
    			append_dev(tr, t15);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*currentPage*/ 1 && t0_value !== (t0_value = /*currentPage*/ ctx[0] * /*itemsPerPage*/ ctx[3] + /*index*/ ctx[16] + 1 + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*showPage*/ 2 && t2_value !== (t2_value = /*person*/ ctx[14].paterno + "")) set_data_dev(t2, t2_value);
    			if (dirty & /*showPage*/ 2 && t4_value !== (t4_value = /*person*/ ctx[14].materno + "")) set_data_dev(t4, t4_value);
    			if (dirty & /*showPage*/ 2 && t6_value !== (t6_value = /*person*/ ctx[14].nombre + "")) set_data_dev(t6, t6_value);
    			if (dirty & /*showPage*/ 2 && t8_value !== (t8_value = /*person*/ ctx[14].dni + "")) set_data_dev(t8, t8_value);
    			if (dirty & /*showPage*/ 2 && t10_value !== (t10_value = /*person*/ ctx[14].ingreso + "")) set_data_dev(t10, t10_value);
    			if (dirty & /*showPage*/ 2 && t12_value !== (t12_value = /*person*/ ctx[14].cargo + "")) set_data_dev(t12, t12_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(tr);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1$1.name,
    		type: "each",
    		source: "(63:16) {#each showPage as person, index}",
    		ctx
    	});

    	return block;
    }

    // (86:12) {#each Array.from({ length: totalPages }) as _, i}
    function create_each_block$1(ctx) {
    	let button;
    	let t_value = /*i*/ ctx[13] + 1 + "";
    	let t;
    	let mounted;
    	let dispose;

    	function click_handler() {
    		return /*click_handler*/ ctx[6](/*i*/ ctx[13]);
    	}

    	const block = {
    		c: function create() {
    			button = element("button");
    			t = text(t_value);
    			attr_dev(button, "class", "page svelte-6wkptm");
    			attr_dev(button, "id", "btn" + /*i*/ ctx[13]);
    			toggle_class(button, "active", /*i*/ ctx[13] === 0);
    			add_location(button, file$4, 86, 16, 3040);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    			append_dev(button, t);

    			if (!mounted) {
    				dispose = listen_dev(button, "click", click_handler, false, false, false, false);
    				mounted = true;
    			}
    		},
    		p: function update(new_ctx, dirty) {
    			ctx = new_ctx;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(button);
    			mounted = false;
    			dispose();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block$1.name,
    		type: "each",
    		source: "(86:12) {#each Array.from({ length: totalPages }) as _, i}",
    		ctx
    	});

    	return block;
    }

    // (48:25)           <p>Cargando datos...</p>      {:then}
    function create_pending_block$1(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Cargando datos...";
    			add_location(p, file$4, 48, 8, 1422);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_pending_block$1.name,
    		type: "pending",
    		source: "(48:25)           <p>Cargando datos...</p>      {:then}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$4(ctx) {
    	let div;
    	let h2;
    	let t1;

    	let info = {
    		ctx,
    		current: null,
    		token: null,
    		hasCatch: true,
    		pending: create_pending_block$1,
    		then: create_then_block$1,
    		catch: create_catch_block$1
    	};

    	handle_promise(/*fetchPromise*/ ctx[4], info);

    	const block = {
    		c: function create() {
    			div = element("div");
    			h2 = element("h2");
    			h2.textContent = "Personal";
    			t1 = space();
    			info.block.c();
    			add_location(h2, file$4, 45, 4, 1360);
    			attr_dev(div, "class", "container svelte-6wkptm");
    			add_location(div, file$4, 44, 0, 1331);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h2);
    			append_dev(div, t1);
    			info.block.m(div, info.anchor = null);
    			info.mount = () => div;
    			info.anchor = null;
    		},
    		p: function update(new_ctx, [dirty]) {
    			ctx = new_ctx;
    			update_await_block_branch(info, ctx, dirty);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			info.block.d();
    			info.token = null;
    			info = null;
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const url$1 = "";

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Trabajadores', slots, []);
    	let lista = [];
    	let currentPage = 0;
    	let itemsPerPage = 20;
    	let showPage = [];
    	const token = sessionStorage.getItem("token");
    	const headers = { Authorization: "Bearer " + token };

    	let fetchPromise = fetch(url$1, { headers }).then(response => response.json()).then(persons => {
    		lista = [...persons];
    		$$invalidate(2, totalPages = Math.ceil(lista.length / itemsPerPage));
    		$$invalidate(1, showPage = lista.slice(currentPage, itemsPerPage));
    	});

    	let activePage = 0;
    	let totalPages = 0;

    	function getCurrentPageItems(page) {
    		$$invalidate(0, currentPage = page);
    		const startIndex = currentPage * itemsPerPage;
    		const endIndex = startIndex + itemsPerPage;
    		$$invalidate(1, showPage = lista.slice(startIndex, endIndex));
    		activePage = page;

    		for (let i = 1; i <= totalPages; i++) {
    			let name = "btn" + (i - 1);
    			const elemento = document.getElementById(name);
    			elemento.classList.remove("active");
    			console.log(i - 1);
    		}
    		let btn_activo = "btn" + page;
    		const activo = document.getElementById(btn_activo);
    		activo.classList.add("active");
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1$1.warn(`<Trabajadores> was created with unknown prop '${key}'`);
    	});

    	const click_handler = i => getCurrentPageItems(i);

    	$$self.$capture_state = () => ({
    		lista,
    		currentPage,
    		itemsPerPage,
    		showPage,
    		token,
    		headers,
    		url: url$1,
    		fetchPromise,
    		activePage,
    		totalPages,
    		getCurrentPageItems
    	});

    	$$self.$inject_state = $$props => {
    		if ('lista' in $$props) lista = $$props.lista;
    		if ('currentPage' in $$props) $$invalidate(0, currentPage = $$props.currentPage);
    		if ('itemsPerPage' in $$props) $$invalidate(3, itemsPerPage = $$props.itemsPerPage);
    		if ('showPage' in $$props) $$invalidate(1, showPage = $$props.showPage);
    		if ('fetchPromise' in $$props) $$invalidate(4, fetchPromise = $$props.fetchPromise);
    		if ('activePage' in $$props) activePage = $$props.activePage;
    		if ('totalPages' in $$props) $$invalidate(2, totalPages = $$props.totalPages);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		currentPage,
    		showPage,
    		totalPages,
    		itemsPerPage,
    		fetchPromise,
    		getCurrentPageItems,
    		click_handler
    	];
    }

    class Trabajadores extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Trabajadores",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src\horario.svelte generated by Svelte v3.59.2 */

    const { console: console_1 } = globals;
    const file$3 = "src\\horario.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[5] = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[8] = list[i];
    	return child_ctx;
    }

    function get_each_context_2(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[11] = list[i];
    	return child_ctx;
    }

    function get_each_context_3(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[14] = list[i];
    	child_ctx[16] = i;
    	return child_ctx;
    }

    function get_each_context_4(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[17] = list[i];
    	child_ctx[16] = i;
    	return child_ctx;
    }

    // (97:4) {:catch}
    function create_catch_block(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Error";
    			add_location(p, file$3, 97, 8, 4185);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_catch_block.name,
    		type: "catch",
    		source: "(97:4) {:catch}",
    		ctx
    	});

    	return block;
    }

    // (22:4) {:then}
    function create_then_block(ctx) {
    	let each_1_anchor;
    	let each_value = /*horario*/ ctx[0];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	const block = {
    		c: function create() {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each_1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(target, anchor);
    				}
    			}

    			insert_dev(target, each_1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*horario, color*/ 3) {
    				each_value = /*horario*/ ctx[0];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}
    		},
    		d: function destroy(detaching) {
    			destroy_each(each_blocks, detaching);
    			if (detaching) detach_dev(each_1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_then_block.name,
    		type: "then",
    		source: "(22:4) {:then}",
    		ctx
    	});

    	return block;
    }

    // (28:12) {#each h.trabajadores as t, index}
    function create_each_block_4(ctx) {
    	let p;
    	let strong;
    	let t0_value = /*t*/ ctx[17].slice(0, 1) + "";
    	let t0;
    	let t1_value = /*t*/ ctx[17].slice(1) + "";
    	let t1;

    	const block = {
    		c: function create() {
    			p = element("p");
    			strong = element("strong");
    			t0 = text(t0_value);
    			t1 = text(t1_value);
    			set_style(strong, "color", /*color*/ ctx[1][/*index*/ ctx[16]]);
    			add_location(strong, file$3, 28, 19, 774);
    			add_location(p, file$3, 28, 16, 771);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, strong);
    			append_dev(strong, t0);
    			append_dev(p, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*horario*/ 1 && t0_value !== (t0_value = /*t*/ ctx[17].slice(0, 1) + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*horario*/ 1 && t1_value !== (t1_value = /*t*/ ctx[17].slice(1) + "")) set_data_dev(t1, t1_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_4.name,
    		type: "each",
    		source: "(28:12) {#each h.trabajadores as t, index}",
    		ctx
    	});

    	return block;
    }

    // (35:24) {#each h.turno_dia as _, index}
    function create_each_block_3(ctx) {
    	let th;
    	let t_value = /*index*/ ctx[16] + 1 + "";
    	let t;

    	const block = {
    		c: function create() {
    			th = element("th");
    			t = text(t_value);
    			attr_dev(th, "class", "svelte-gfow64");
    			add_location(th, file$3, 35, 28, 1054);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, th, anchor);
    			append_dev(th, t);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(th);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_3.name,
    		type: "each",
    		source: "(35:24) {#each h.turno_dia as _, index}",
    		ctx
    	});

    	return block;
    }

    // (45:28) {#if typeof dia === "number"}
    function create_if_block_5(ctx) {
    	let td;
    	let strong;
    	let t_value = /*h*/ ctx[5].trabajadores[/*dia*/ ctx[11]].slice(0, 1) + "";
    	let t;

    	const block = {
    		c: function create() {
    			td = element("td");
    			strong = element("strong");
    			t = text(t_value);
    			set_style(strong, "color", /*color*/ ctx[1][/*dia*/ ctx[11]]);
    			add_location(strong, file$3, 46, 36, 1452);
    			attr_dev(td, "class", "svelte-gfow64");
    			add_location(td, file$3, 45, 32, 1410);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, td, anchor);
    			append_dev(td, strong);
    			append_dev(strong, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*horario*/ 1 && t_value !== (t_value = /*h*/ ctx[5].trabajadores[/*dia*/ ctx[11]].slice(0, 1) + "")) set_data_dev(t, t_value);

    			if (dirty & /*horario*/ 1) {
    				set_style(strong, "color", /*color*/ ctx[1][/*dia*/ ctx[11]]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(td);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_5.name,
    		type: "if",
    		source: "(45:28) {#if typeof dia === \\\"number\\\"}",
    		ctx
    	});

    	return block;
    }

    // (53:28) {#if typeof dia === "string"}
    function create_if_block_3$1(ctx) {
    	let if_block_anchor;

    	function select_block_type(ctx, dirty) {
    		if (/*dia*/ ctx[11]) return create_if_block_4$1;
    		return create_else_block_1;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},
    		d: function destroy(detaching) {
    			if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3$1.name,
    		type: "if",
    		source: "(53:28) {#if typeof dia === \\\"string\\\"}",
    		ctx
    	});

    	return block;
    }

    // (60:32) {:else}
    function create_else_block_1(ctx) {
    	let td;
    	let strong;
    	let t1;

    	const block = {
    		c: function create() {
    			td = element("td");
    			strong = element("strong");
    			strong.textContent = "✗";
    			t1 = space();
    			set_style(strong, "color", "#DFE3E4");
    			add_location(strong, file$3, 61, 40, 2333);
    			attr_dev(td, "class", "svelte-gfow64");
    			add_location(td, file$3, 60, 36, 2287);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, td, anchor);
    			append_dev(td, strong);
    			append_dev(td, t1);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(td);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block_1.name,
    		type: "else",
    		source: "(60:32) {:else}",
    		ctx
    	});

    	return block;
    }

    // (54:32) {#if dia}
    function create_if_block_4$1(ctx) {
    	let td;
    	let div;
    	let strong;
    	let div_data_tooltip_value;
    	let t1;

    	const block = {
    		c: function create() {
    			td = element("td");
    			div = element("div");
    			strong = element("strong");
    			strong.textContent = "✔";
    			t1 = space();
    			set_style(strong, "color", "#DFE3E4");
    			add_location(strong, file$3, 56, 44, 2037);
    			attr_dev(div, "class", "tooltip svelte-gfow64");
    			attr_dev(div, "data-tooltip", div_data_tooltip_value = /*dia*/ ctx[11]);
    			add_location(div, file$3, 55, 40, 1951);
    			attr_dev(td, "class", "svelte-gfow64");
    			add_location(td, file$3, 54, 36, 1905);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, td, anchor);
    			append_dev(td, div);
    			append_dev(div, strong);
    			append_dev(td, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*horario*/ 1 && div_data_tooltip_value !== (div_data_tooltip_value = /*dia*/ ctx[11])) {
    				attr_dev(div, "data-tooltip", div_data_tooltip_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(td);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4$1.name,
    		type: "if",
    		source: "(54:32) {#if dia}",
    		ctx
    	});

    	return block;
    }

    // (43:24) {#each h.turno_dia as dia}
    function create_each_block_2(ctx) {
    	let t;
    	let if_block1_anchor;
    	let if_block0 = typeof /*dia*/ ctx[11] === "number" && create_if_block_5(ctx);
    	let if_block1 = typeof /*dia*/ ctx[11] === "string" && create_if_block_3$1(ctx);

    	const block = {
    		c: function create() {
    			if (if_block0) if_block0.c();
    			t = space();
    			if (if_block1) if_block1.c();
    			if_block1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block0) if_block0.m(target, anchor);
    			insert_dev(target, t, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert_dev(target, if_block1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (typeof /*dia*/ ctx[11] === "number") {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_5(ctx);
    					if_block0.c();
    					if_block0.m(t.parentNode, t);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (typeof /*dia*/ ctx[11] === "string") {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block_3$1(ctx);
    					if_block1.c();
    					if_block1.m(if_block1_anchor.parentNode, if_block1_anchor);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (if_block0) if_block0.d(detaching);
    			if (detaching) detach_dev(t);
    			if (if_block1) if_block1.d(detaching);
    			if (detaching) detach_dev(if_block1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_2.name,
    		type: "each",
    		source: "(43:24) {#each h.turno_dia as dia}",
    		ctx
    	});

    	return block;
    }

    // (71:28) {#if typeof noche === "number"}
    function create_if_block_2$1(ctx) {
    	let td;
    	let strong;
    	let t_value = /*h*/ ctx[5].trabajadores[/*noche*/ ctx[8]].slice(0, 1) + "";
    	let t;

    	const block = {
    		c: function create() {
    			td = element("td");
    			strong = element("strong");
    			t = text(t_value);
    			set_style(strong, "color", /*color*/ ctx[1][/*noche*/ ctx[8]]);
    			add_location(strong, file$3, 72, 36, 2889);
    			attr_dev(td, "class", "svelte-gfow64");
    			add_location(td, file$3, 71, 32, 2847);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, td, anchor);
    			append_dev(td, strong);
    			append_dev(strong, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*horario*/ 1 && t_value !== (t_value = /*h*/ ctx[5].trabajadores[/*noche*/ ctx[8]].slice(0, 1) + "")) set_data_dev(t, t_value);

    			if (dirty & /*horario*/ 1) {
    				set_style(strong, "color", /*color*/ ctx[1][/*noche*/ ctx[8]]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(td);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2$1.name,
    		type: "if",
    		source: "(71:28) {#if typeof noche === \\\"number\\\"}",
    		ctx
    	});

    	return block;
    }

    // (79:28) {#if typeof noche === "string"}
    function create_if_block$2(ctx) {
    	let if_block_anchor;

    	function select_block_type_1(ctx, dirty) {
    		if (/*noche*/ ctx[8]) return create_if_block_1$1;
    		return create_else_block$1;
    	}

    	let current_block_type = select_block_type_1(ctx);
    	let if_block = current_block_type(ctx);

    	const block = {
    		c: function create() {
    			if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (current_block_type === (current_block_type = select_block_type_1(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if_block.d(1);
    				if_block = current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},
    		d: function destroy(detaching) {
    			if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$2.name,
    		type: "if",
    		source: "(79:28) {#if typeof noche === \\\"string\\\"}",
    		ctx
    	});

    	return block;
    }

    // (86:32) {:else}
    function create_else_block$1(ctx) {
    	let td;
    	let strong;
    	let t1;

    	const block = {
    		c: function create() {
    			td = element("td");
    			strong = element("strong");
    			strong.textContent = "✗";
    			t1 = space();
    			set_style(strong, "color", "#DFE3E4");
    			add_location(strong, file$3, 87, 40, 3780);
    			attr_dev(td, "class", "svelte-gfow64");
    			add_location(td, file$3, 86, 36, 3734);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, td, anchor);
    			append_dev(td, strong);
    			append_dev(td, t1);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(td);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block$1.name,
    		type: "else",
    		source: "(86:32) {:else}",
    		ctx
    	});

    	return block;
    }

    // (80:32) {#if noche}
    function create_if_block_1$1(ctx) {
    	let td;
    	let div;
    	let strong;
    	let div_data_tooltip_value;
    	let t1;

    	const block = {
    		c: function create() {
    			td = element("td");
    			div = element("div");
    			strong = element("strong");
    			strong.textContent = "✔";
    			t1 = space();
    			set_style(strong, "color", "#DFE3E4");
    			add_location(strong, file$3, 82, 44, 3484);
    			attr_dev(div, "class", "tooltip svelte-gfow64");
    			attr_dev(div, "data-tooltip", div_data_tooltip_value = /*noche*/ ctx[8]);
    			add_location(div, file$3, 81, 40, 3396);
    			attr_dev(td, "class", "svelte-gfow64");
    			add_location(td, file$3, 80, 36, 3350);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, td, anchor);
    			append_dev(td, div);
    			append_dev(div, strong);
    			append_dev(td, t1);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*horario*/ 1 && div_data_tooltip_value !== (div_data_tooltip_value = /*noche*/ ctx[8])) {
    				attr_dev(div, "data-tooltip", div_data_tooltip_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(td);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1$1.name,
    		type: "if",
    		source: "(80:32) {#if noche}",
    		ctx
    	});

    	return block;
    }

    // (69:24) {#each h.turno_noche as noche}
    function create_each_block_1(ctx) {
    	let t;
    	let if_block1_anchor;
    	let if_block0 = typeof /*noche*/ ctx[8] === "number" && create_if_block_2$1(ctx);
    	let if_block1 = typeof /*noche*/ ctx[8] === "string" && create_if_block$2(ctx);

    	const block = {
    		c: function create() {
    			if (if_block0) if_block0.c();
    			t = space();
    			if (if_block1) if_block1.c();
    			if_block1_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block0) if_block0.m(target, anchor);
    			insert_dev(target, t, anchor);
    			if (if_block1) if_block1.m(target, anchor);
    			insert_dev(target, if_block1_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (typeof /*noche*/ ctx[8] === "number") {
    				if (if_block0) {
    					if_block0.p(ctx, dirty);
    				} else {
    					if_block0 = create_if_block_2$1(ctx);
    					if_block0.c();
    					if_block0.m(t.parentNode, t);
    				}
    			} else if (if_block0) {
    				if_block0.d(1);
    				if_block0 = null;
    			}

    			if (typeof /*noche*/ ctx[8] === "string") {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block$2(ctx);
    					if_block1.c();
    					if_block1.m(if_block1_anchor.parentNode, if_block1_anchor);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}
    		},
    		d: function destroy(detaching) {
    			if (if_block0) if_block0.d(detaching);
    			if (detaching) detach_dev(t);
    			if (if_block1) if_block1.d(detaching);
    			if (detaching) detach_dev(if_block1_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block_1.name,
    		type: "each",
    		source: "(69:24) {#each h.turno_noche as noche}",
    		ctx
    	});

    	return block;
    }

    // (24:8) {#each horario as h}
    function create_each_block(ctx) {
    	let p;
    	let strong;
    	let t0_value = /*h*/ ctx[5].unidad + "";
    	let t0;
    	let t1;
    	let t2;
    	let table;
    	let thead;
    	let tr0;
    	let t3;
    	let tbody;
    	let tr1;
    	let t4;
    	let tr2;
    	let t5;
    	let each_value_4 = /*h*/ ctx[5].trabajadores;
    	validate_each_argument(each_value_4);
    	let each_blocks_3 = [];

    	for (let i = 0; i < each_value_4.length; i += 1) {
    		each_blocks_3[i] = create_each_block_4(get_each_context_4(ctx, each_value_4, i));
    	}

    	let each_value_3 = /*h*/ ctx[5].turno_dia;
    	validate_each_argument(each_value_3);
    	let each_blocks_2 = [];

    	for (let i = 0; i < each_value_3.length; i += 1) {
    		each_blocks_2[i] = create_each_block_3(get_each_context_3(ctx, each_value_3, i));
    	}

    	let each_value_2 = /*h*/ ctx[5].turno_dia;
    	validate_each_argument(each_value_2);
    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_2.length; i += 1) {
    		each_blocks_1[i] = create_each_block_2(get_each_context_2(ctx, each_value_2, i));
    	}

    	let each_value_1 = /*h*/ ctx[5].turno_noche;
    	validate_each_argument(each_value_1);
    	let each_blocks = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	const block = {
    		c: function create() {
    			p = element("p");
    			strong = element("strong");
    			t0 = text(t0_value);
    			t1 = space();

    			for (let i = 0; i < each_blocks_3.length; i += 1) {
    				each_blocks_3[i].c();
    			}

    			t2 = space();
    			table = element("table");
    			thead = element("thead");
    			tr0 = element("tr");

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				each_blocks_2[i].c();
    			}

    			t3 = space();
    			tbody = element("tbody");
    			tr1 = element("tr");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t4 = space();
    			tr2 = element("tr");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t5 = space();
    			add_location(strong, file$3, 25, 15, 658);
    			add_location(p, file$3, 25, 12, 655);
    			add_location(tr0, file$3, 33, 20, 957);
    			attr_dev(thead, "class", "svelte-gfow64");
    			add_location(thead, file$3, 32, 16, 928);
    			add_location(tr1, file$3, 41, 20, 1231);
    			add_location(tr2, file$3, 67, 20, 2661);
    			attr_dev(tbody, "class", "svelte-gfow64");
    			add_location(tbody, file$3, 40, 16, 1181);
    			attr_dev(table, "class", "svelte-gfow64");
    			add_location(table, file$3, 31, 12, 903);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, strong);
    			append_dev(strong, t0);
    			insert_dev(target, t1, anchor);

    			for (let i = 0; i < each_blocks_3.length; i += 1) {
    				if (each_blocks_3[i]) {
    					each_blocks_3[i].m(target, anchor);
    				}
    			}

    			insert_dev(target, t2, anchor);
    			insert_dev(target, table, anchor);
    			append_dev(table, thead);
    			append_dev(thead, tr0);

    			for (let i = 0; i < each_blocks_2.length; i += 1) {
    				if (each_blocks_2[i]) {
    					each_blocks_2[i].m(tr0, null);
    				}
    			}

    			append_dev(table, t3);
    			append_dev(table, tbody);
    			append_dev(tbody, tr1);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				if (each_blocks_1[i]) {
    					each_blocks_1[i].m(tr1, null);
    				}
    			}

    			append_dev(tbody, t4);
    			append_dev(tbody, tr2);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				if (each_blocks[i]) {
    					each_blocks[i].m(tr2, null);
    				}
    			}

    			append_dev(table, t5);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*horario*/ 1 && t0_value !== (t0_value = /*h*/ ctx[5].unidad + "")) set_data_dev(t0, t0_value);

    			if (dirty & /*horario, color*/ 3) {
    				each_value_4 = /*h*/ ctx[5].trabajadores;
    				validate_each_argument(each_value_4);
    				let i;

    				for (i = 0; i < each_value_4.length; i += 1) {
    					const child_ctx = get_each_context_4(ctx, each_value_4, i);

    					if (each_blocks_3[i]) {
    						each_blocks_3[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_3[i] = create_each_block_4(child_ctx);
    						each_blocks_3[i].c();
    						each_blocks_3[i].m(t2.parentNode, t2);
    					}
    				}

    				for (; i < each_blocks_3.length; i += 1) {
    					each_blocks_3[i].d(1);
    				}

    				each_blocks_3.length = each_value_4.length;
    			}

    			if (dirty & /*horario*/ 1) {
    				each_value_3 = /*h*/ ctx[5].turno_dia;
    				validate_each_argument(each_value_3);
    				let i;

    				for (i = 0; i < each_value_3.length; i += 1) {
    					const child_ctx = get_each_context_3(ctx, each_value_3, i);

    					if (each_blocks_2[i]) {
    						each_blocks_2[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_2[i] = create_each_block_3(child_ctx);
    						each_blocks_2[i].c();
    						each_blocks_2[i].m(tr0, null);
    					}
    				}

    				for (; i < each_blocks_2.length; i += 1) {
    					each_blocks_2[i].d(1);
    				}

    				each_blocks_2.length = each_value_3.length;
    			}

    			if (dirty & /*horario, color*/ 3) {
    				each_value_2 = /*h*/ ctx[5].turno_dia;
    				validate_each_argument(each_value_2);
    				let i;

    				for (i = 0; i < each_value_2.length; i += 1) {
    					const child_ctx = get_each_context_2(ctx, each_value_2, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(child_ctx, dirty);
    					} else {
    						each_blocks_1[i] = create_each_block_2(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(tr1, null);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}

    				each_blocks_1.length = each_value_2.length;
    			}

    			if (dirty & /*horario, color*/ 3) {
    				each_value_1 = /*h*/ ctx[5].turno_noche;
    				validate_each_argument(each_value_1);
    				let i;

    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block_1(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(tr2, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value_1.length;
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    			if (detaching) detach_dev(t1);
    			destroy_each(each_blocks_3, detaching);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(table);
    			destroy_each(each_blocks_2, detaching);
    			destroy_each(each_blocks_1, detaching);
    			destroy_each(each_blocks, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(24:8) {#each horario as h}",
    		ctx
    	});

    	return block;
    }

    // (20:25)           <p>Cargando datos...</p>      {:then}
    function create_pending_block(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Cargando datos...";
    			add_location(p, file$3, 20, 8, 569);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_pending_block.name,
    		type: "pending",
    		source: "(20:25)           <p>Cargando datos...</p>      {:then}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$3(ctx) {
    	let div;
    	let h2;
    	let t1;

    	let info = {
    		ctx,
    		current: null,
    		token: null,
    		hasCatch: true,
    		pending: create_pending_block,
    		then: create_then_block,
    		catch: create_catch_block
    	};

    	handle_promise(/*fetchPromise*/ ctx[2], info);

    	const block = {
    		c: function create() {
    			div = element("div");
    			h2 = element("h2");
    			h2.textContent = "Horario";
    			t1 = space();
    			info.block.c();
    			add_location(h2, file$3, 17, 4, 511);
    			attr_dev(div, "class", "container svelte-gfow64");
    			add_location(div, file$3, 16, 0, 482);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h2);
    			append_dev(div, t1);
    			info.block.m(div, info.anchor = null);
    			info.mount = () => div;
    			info.anchor = null;
    		},
    		p: function update(new_ctx, [dirty]) {
    			ctx = new_ctx;
    			update_await_block_branch(info, ctx, dirty);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			info.block.d();
    			info.token = null;
    			info = null;
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const url = "";

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Horario', slots, []);
    	const color = ["#F70B04", "#1D3ACB", "#13BD08", "#08C3F1", "#F19D08", "#F604D1"];
    	let horario = [];
    	const token = sessionStorage.getItem("token");
    	const headers = { Authorization: "Bearer " + token };

    	let fetchPromise = fetch(url, { headers }).then(response => response.json()).then(persons => {
    		console.log(persons);
    		$$invalidate(0, horario = [...persons]);
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<Horario> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		color,
    		horario,
    		token,
    		headers,
    		url,
    		fetchPromise
    	});

    	$$self.$inject_state = $$props => {
    		if ('horario' in $$props) $$invalidate(0, horario = $$props.horario);
    		if ('fetchPromise' in $$props) $$invalidate(2, fetchPromise = $$props.fetchPromise);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [horario, color, fetchPromise];
    }

    class Horario extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Horario",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src\servicio.svelte generated by Svelte v3.59.2 */

    const file$2 = "src\\servicio.svelte";

    function create_fragment$2(ctx) {
    	let main;
    	let button;

    	const block = {
    		c: function create() {
    			main = element("main");
    			button = element("button");
    			attr_dev(button, "type", "button");
    			attr_dev(button, "class", "btn10 svelte-1xhd4h3");
    			add_location(button, file$2, 5, 4, 41);
    			add_location(main, file$2, 4, 0, 29);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, button);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Servicio', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Servicio> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class Servicio extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Servicio",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src\home.svelte generated by Svelte v3.59.2 */
    const file$1 = "src\\home.svelte";

    // (51:31) 
    function create_if_block_4(ctx) {
    	let trabajadores;
    	let current;
    	trabajadores = new Trabajadores({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(trabajadores.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(trabajadores, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(trabajadores.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(trabajadores.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(trabajadores, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_4.name,
    		type: "if",
    		source: "(51:31) ",
    		ctx
    	});

    	return block;
    }

    // (49:31) 
    function create_if_block_3(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Menu 4";
    			add_location(p, file$1, 49, 12, 1659);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(49:31) ",
    		ctx
    	});

    	return block;
    }

    // (47:31) 
    function create_if_block_2(ctx) {
    	let horario;
    	let current;
    	horario = new Horario({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(horario.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(horario, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(horario.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(horario.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(horario, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(47:31) ",
    		ctx
    	});

    	return block;
    }

    // (45:31) 
    function create_if_block_1(ctx) {
    	let prueba;
    	let current;
    	prueba = new Servicio({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(prueba.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(prueba, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(prueba.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(prueba.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(prueba, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(45:31) ",
    		ctx
    	});

    	return block;
    }

    // (43:8) {#if menu === "1"}
    function create_if_block$1(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Menu 1";
    			add_location(p, file$1, 43, 12, 1484);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block$1.name,
    		type: "if",
    		source: "(43:8) {#if menu === \\\"1\\\"}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let div2;
    	let div0;
    	let button0;
    	let img0;
    	let img0_src_value;
    	let t0;
    	let button1;
    	let img1;
    	let img1_src_value;
    	let t1;
    	let button2;
    	let img2;
    	let img2_src_value;
    	let t2;
    	let button3;
    	let img3;
    	let img3_src_value;
    	let t3;
    	let button4;
    	let img4;
    	let img4_src_value;
    	let t4;
    	let button5;
    	let img5;
    	let img5_src_value;
    	let t5;
    	let div1;
    	let current_block_type_index;
    	let if_block;
    	let current;
    	let mounted;
    	let dispose;

    	const if_block_creators = [
    		create_if_block$1,
    		create_if_block_1,
    		create_if_block_2,
    		create_if_block_3,
    		create_if_block_4
    	];

    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (/*menu*/ ctx[0] === "1") return 0;
    		if (/*menu*/ ctx[0] === "2") return 1;
    		if (/*menu*/ ctx[0] === "3") return 2;
    		if (/*menu*/ ctx[0] === "4") return 3;
    		if (/*menu*/ ctx[0] === "5") return 4;
    		return -1;
    	}

    	if (~(current_block_type_index = select_block_type(ctx))) {
    		if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    	}

    	const block = {
    		c: function create() {
    			div2 = element("div");
    			div0 = element("div");
    			button0 = element("button");
    			img0 = element("img");
    			t0 = space();
    			button1 = element("button");
    			img1 = element("img");
    			t1 = space();
    			button2 = element("button");
    			img2 = element("img");
    			t2 = space();
    			button3 = element("button");
    			img3 = element("img");
    			t3 = space();
    			button4 = element("button");
    			img4 = element("img");
    			t4 = space();
    			button5 = element("button");
    			img5 = element("img");
    			t5 = space();
    			div1 = element("div");
    			if (if_block) if_block.c();
    			if (!src_url_equal(img0.src, img0_src_value = "Reporte.svg")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "height", "50");
    			attr_dev(img0, "alt", "");
    			attr_dev(img0, "class", "svelte-13f27u3");
    			add_location(img0, file$1, 22, 12, 670);
    			attr_dev(button0, "class", "svelte-13f27u3");
    			add_location(button0, file$1, 21, 8, 619);
    			if (!src_url_equal(img1.src, img1_src_value = "Servicio.svg")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "height", "50");
    			attr_dev(img1, "alt", "");
    			attr_dev(img1, "class", "svelte-13f27u3");
    			add_location(img1, file$1, 25, 12, 795);
    			attr_dev(button1, "class", "svelte-13f27u3");
    			add_location(button1, file$1, 24, 8, 746);
    			if (!src_url_equal(img2.src, img2_src_value = "Horario.svg")) attr_dev(img2, "src", img2_src_value);
    			attr_dev(img2, "height", "50");
    			attr_dev(img2, "alt", "");
    			attr_dev(img2, "class", "svelte-13f27u3");
    			add_location(img2, file$1, 28, 12, 940);
    			attr_dev(button2, "class", "svelte-13f27u3");
    			add_location(button2, file$1, 27, 8, 878);
    			if (!src_url_equal(img3.src, img3_src_value = "Salud.svg")) attr_dev(img3, "src", img3_src_value);
    			attr_dev(img3, "height", "50");
    			attr_dev(img3, "alt", "");
    			attr_dev(img3, "class", "svelte-13f27u3");
    			add_location(img3, file$1, 31, 12, 1066);
    			attr_dev(button3, "class", "svelte-13f27u3");
    			add_location(button3, file$1, 30, 8, 1017);
    			if (!src_url_equal(img4.src, img4_src_value = "Personal.svg")) attr_dev(img4, "src", img4_src_value);
    			attr_dev(img4, "height", "50");
    			attr_dev(img4, "alt", "");
    			attr_dev(img4, "class", "svelte-13f27u3");
    			add_location(img4, file$1, 34, 12, 1196);
    			attr_dev(button4, "class", "svelte-13f27u3");
    			add_location(button4, file$1, 33, 8, 1147);
    			if (!src_url_equal(img5.src, img5_src_value = "Salir.svg")) attr_dev(img5, "src", img5_src_value);
    			attr_dev(img5, "height", "50");
    			attr_dev(img5, "alt", "");
    			attr_dev(img5, "class", "svelte-13f27u3");
    			add_location(img5, file$1, 37, 12, 1323);
    			attr_dev(button5, "class", "svelte-13f27u3");
    			add_location(button5, file$1, 36, 8, 1284);
    			attr_dev(div0, "class", "sidebar svelte-13f27u3");
    			add_location(div0, file$1, 20, 4, 581);
    			add_location(div1, file$1, 41, 4, 1426);
    			attr_dev(div2, "class", "container svelte-13f27u3");
    			add_location(div2, file$1, 19, 0, 548);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div2, anchor);
    			append_dev(div2, div0);
    			append_dev(div0, button0);
    			append_dev(button0, img0);
    			append_dev(div0, t0);
    			append_dev(div0, button1);
    			append_dev(button1, img1);
    			append_dev(div0, t1);
    			append_dev(div0, button2);
    			append_dev(button2, img2);
    			append_dev(div0, t2);
    			append_dev(div0, button3);
    			append_dev(button3, img3);
    			append_dev(div0, t3);
    			append_dev(div0, button4);
    			append_dev(button4, img4);
    			append_dev(div0, t4);
    			append_dev(div0, button5);
    			append_dev(button5, img5);
    			append_dev(div2, t5);
    			append_dev(div2, div1);

    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].m(div1, null);
    			}

    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*click_handler*/ ctx[2], false, false, false, false),
    					listen_dev(button1, "click", /*click_handler_1*/ ctx[3], false, false, false, false),
    					listen_dev(button2, "click", /*click_handler_2*/ ctx[4], false, false, false, false),
    					listen_dev(button3, "click", /*click_handler_3*/ ctx[5], false, false, false, false),
    					listen_dev(button4, "click", /*click_handler_4*/ ctx[6], false, false, false, false),
    					listen_dev(button5, "click", Close, false, false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index !== previous_block_index) {
    				if (if_block) {
    					group_outros();

    					transition_out(if_blocks[previous_block_index], 1, 1, () => {
    						if_blocks[previous_block_index] = null;
    					});

    					check_outros();
    				}

    				if (~current_block_type_index) {
    					if_block = if_blocks[current_block_type_index];

    					if (!if_block) {
    						if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    						if_block.c();
    					}

    					transition_in(if_block, 1);
    					if_block.m(div1, null);
    				} else {
    					if_block = null;
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div2);

    			if (~current_block_type_index) {
    				if_blocks[current_block_type_index].d();
    			}

    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function Close() {
    	sessionStorage.removeItem("token");
    	sessionStorage.removeItem("menu");
    	location.href = location.href;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Home', slots, []);
    	let menu = sessionStorage.getItem("menu");

    	function Menu(select_menu) {
    		sessionStorage.setItem("menu", select_menu);
    		$$invalidate(0, menu = select_menu);
    	}
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Home> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => Menu("1");
    	const click_handler_1 = () => Menu("2");
    	const click_handler_2 = () => Menu("3");
    	const click_handler_3 = () => Menu("4");
    	const click_handler_4 = () => Menu("5");

    	$$self.$capture_state = () => ({
    		Trabajadores,
    		Horario,
    		Prueba: Servicio,
    		menu,
    		Menu,
    		Close
    	});

    	$$self.$inject_state = $$props => {
    		if ('menu' in $$props) $$invalidate(0, menu = $$props.menu);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		menu,
    		Menu,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		click_handler_3,
    		click_handler_4
    	];
    }

    class Home extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Home",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src\App.svelte generated by Svelte v3.59.2 */
    const file = "src\\App.svelte";

    // (17:1) {:else}
    function create_else_block(ctx) {
    	let home;
    	let current;
    	home = new Home({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(home.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(home, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(home.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(home.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(home, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(17:1) {:else}",
    		ctx
    	});

    	return block;
    }

    // (15:1) {#if !token}
    function create_if_block(ctx) {
    	let login;
    	let current;
    	login = new Login({ $$inline: true });
    	login.$on("login", /*login_user*/ ctx[1]);

    	const block = {
    		c: function create() {
    			create_component(login.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(login, target, anchor);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(login.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(login.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(login, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(15:1) {#if !token}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let main;
    	let sveltetoast;
    	let t;
    	let current_block_type_index;
    	let if_block;
    	let current;
    	sveltetoast = new SvelteToast({ $$inline: true });
    	const if_block_creators = [create_if_block, create_else_block];
    	const if_blocks = [];

    	function select_block_type(ctx, dirty) {
    		if (!/*token*/ ctx[0]) return 0;
    		return 1;
    	}

    	current_block_type_index = select_block_type(ctx);
    	if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);

    	const block = {
    		c: function create() {
    			main = element("main");
    			create_component(sveltetoast.$$.fragment);
    			t = space();
    			if_block.c();
    			add_location(main, file, 12, 0, 291);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			mount_component(sveltetoast, main, null);
    			append_dev(main, t);
    			if_blocks[current_block_type_index].m(main, null);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			let previous_block_index = current_block_type_index;
    			current_block_type_index = select_block_type(ctx);

    			if (current_block_type_index === previous_block_index) {
    				if_blocks[current_block_type_index].p(ctx, dirty);
    			} else {
    				group_outros();

    				transition_out(if_blocks[previous_block_index], 1, 1, () => {
    					if_blocks[previous_block_index] = null;
    				});

    				check_outros();
    				if_block = if_blocks[current_block_type_index];

    				if (!if_block) {
    					if_block = if_blocks[current_block_type_index] = if_block_creators[current_block_type_index](ctx);
    					if_block.c();
    				} else {
    					if_block.p(ctx, dirty);
    				}

    				transition_in(if_block, 1);
    				if_block.m(main, null);
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(sveltetoast.$$.fragment, local);
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(sveltetoast.$$.fragment, local);
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(sveltetoast);
    			if_blocks[current_block_type_index].d();
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	let token = sessionStorage.getItem("token");

    	async function login_user() {
    		$$invalidate(0, token = sessionStorage.getItem("token"));
    	}
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		Login,
    		Home,
    		SvelteToast,
    		token,
    		login_user
    	});

    	$$self.$inject_state = $$props => {
    		if ('token' in $$props) $$invalidate(0, token = $$props.token);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [token, login_user];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body	
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
