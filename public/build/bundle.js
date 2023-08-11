
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
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

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function append(target, node) {
        target.appendChild(node);
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

    /* src\routes\login.svelte generated by Svelte v3.59.2 */
    const file$4 = "src\\routes\\login.svelte";

    function create_fragment$4(ctx) {
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
    			attr_dev(img, "class", "svelte-826yuj");
    			add_location(img, file$4, 52, 8, 1637);
    			attr_dev(h2, "class", "title svelte-826yuj");
    			add_location(h2, file$4, 53, 8, 1684);
    			attr_dev(input0, "type", "text");
    			attr_dev(input0, "class", "username svelte-826yuj");
    			attr_dev(input0, "placeholder", "Username");
    			attr_dev(input0, "maxlength", "10");
    			add_location(input0, file$4, 54, 8, 1724);
    			attr_dev(input1, "type", "password");
    			attr_dev(input1, "class", "password svelte-826yuj");
    			attr_dev(input1, "placeholder", "Password");
    			attr_dev(input1, "maxlength", "10");
    			add_location(input1, file$4, 55, 8, 1853);
    			attr_dev(h6, "class", "forgot svelte-826yuj");
    			add_location(h6, file$4, 56, 8, 1975);
    			attr_dev(input2, "type", "submit");
    			attr_dev(input2, "class", "submit svelte-826yuj");
    			input2.value = "Login";
    			add_location(input2, file$4, 57, 8, 2025);
    			attr_dev(div0, "class", "form svelte-826yuj");
    			add_location(div0, file$4, 51, 4, 1609);
    			attr_dev(div1, "class", "container svelte-826yuj");
    			add_location(div1, file$4, 50, 0, 1579);
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
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Login', slots, []);
    	const dispatch = createEventDispatcher();
    	let inputUsername;
    	let inputPassword;

    	async function validate() {
    		const username = inputUsername.value;
    		const password = inputPassword.value;

    		if (!username) {
    			alert("Registra el username");
    			inputUsername.focus();
    		} else if (!password) {
    			alert("Registra el password");
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
    					const response_json = await response.json();
    					sessionStorage.setItem("token", response_json.access_token);
    					sessionStorage.setItem("menu", "1");
    					dispatch("login");
    				} else {
    					alert("Credenciales de autenticación inválidas");
    				}

    				;
    			} catch {
    				alert("Sin conexion con el servidor");
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
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Login",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src\routes\trabajadores.svelte generated by Svelte v3.59.2 */

    const { console: console_1$1 } = globals;
    const file$3 = "src\\routes\\trabajadores.svelte";

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
    			add_location(p, file$3, 90, 8, 3269);
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
    			add_location(th0, file$3, 53, 20, 1581);
    			attr_dev(th1, "class", "svelte-6wkptm");
    			add_location(th1, file$3, 54, 20, 1629);
    			attr_dev(th2, "class", "svelte-6wkptm");
    			add_location(th2, file$3, 55, 20, 1666);
    			attr_dev(th3, "class", "svelte-6wkptm");
    			add_location(th3, file$3, 56, 20, 1716);
    			attr_dev(th4, "class", "svelte-6wkptm");
    			add_location(th4, file$3, 57, 20, 1754);
    			attr_dev(th5, "class", "svelte-6wkptm");
    			add_location(th5, file$3, 58, 20, 1790);
    			add_location(tr, file$3, 52, 16, 1555);
    			attr_dev(thead, "class", "svelte-6wkptm");
    			add_location(thead, file$3, 51, 12, 1530);
    			attr_dev(tbody, "class", "svelte-6wkptm");
    			add_location(tbody, file$3, 61, 12, 1880);
    			attr_dev(table, "class", "svelte-6wkptm");
    			add_location(table, file$3, 50, 8, 1509);
    			attr_dev(nav, "class", "pagination svelte-6wkptm");
    			add_location(nav, file$3, 84, 8, 2952);
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
    			add_location(th, file$3, 64, 24, 1990);
    			attr_dev(td0, "class", "svelte-6wkptm");
    			add_location(td0, file$3, 65, 24, 2085);
    			attr_dev(td1, "class", "svelte-6wkptm");
    			add_location(td1, file$3, 66, 24, 2169);
    			attr_dev(td2, "class", "svelte-6wkptm");
    			add_location(td2, file$3, 67, 24, 2236);
    			attr_dev(td3, "class", "svelte-6wkptm");
    			add_location(td3, file$3, 68, 24, 2287);
    			if (!src_url_equal(img0.src, img0_src_value = "Mas.svg")) attr_dev(img0, "src", img0_src_value);
    			attr_dev(img0, "height", "21");
    			attr_dev(img0, "alt", "");
    			add_location(img0, file$3, 72, 36, 2484);
    			attr_dev(button0, "class", "options svelte-6wkptm");
    			add_location(button0, file$3, 71, 32, 2422);
    			if (!src_url_equal(img1.src, img1_src_value = "Del.svg")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "height", "21");
    			attr_dev(img1, "alt", "");
    			add_location(img1, file$3, 75, 36, 2663);
    			attr_dev(button1, "class", "delete svelte-6wkptm");
    			add_location(button1, file$3, 74, 32, 2602);
    			attr_dev(div, "class", "menu svelte-6wkptm");
    			add_location(div, file$3, 70, 28, 2370);
    			attr_dev(td4, "class", "svelte-6wkptm");
    			add_location(td4, file$3, 69, 24, 2336);
    			attr_dev(tr, "class", "svelte-6wkptm");
    			add_location(tr, file$3, 63, 20, 1960);
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
    			add_location(button, file$3, 86, 16, 3080);
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
    			add_location(p, file$3, 48, 8, 1462);
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

    function create_fragment$3(ctx) {
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
    			add_location(h2, file$3, 45, 4, 1400);
    			attr_dev(div, "class", "container svelte-6wkptm");
    			add_location(div, file$3, 44, 0, 1371);
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

    const url$1 = "https://api-jeanoi4212.b4a.run/empleados";

    function instance$3($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Trabajadores",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src\routes\horario.svelte generated by Svelte v3.59.2 */

    const { console: console_1 } = globals;
    const file$2 = "src\\routes\\horario.svelte";

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
    			add_location(p, file$2, 97, 8, 4224);
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
    			add_location(strong, file$2, 28, 19, 813);
    			add_location(p, file$2, 28, 16, 810);
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
    			add_location(th, file$2, 35, 28, 1093);
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
    			add_location(strong, file$2, 46, 36, 1491);
    			attr_dev(td, "class", "svelte-gfow64");
    			add_location(td, file$2, 45, 32, 1449);
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
    			add_location(strong, file$2, 61, 40, 2372);
    			attr_dev(td, "class", "svelte-gfow64");
    			add_location(td, file$2, 60, 36, 2326);
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
    			add_location(strong, file$2, 56, 44, 2076);
    			attr_dev(div, "class", "tooltip svelte-gfow64");
    			attr_dev(div, "data-tooltip", div_data_tooltip_value = /*dia*/ ctx[11]);
    			add_location(div, file$2, 55, 40, 1990);
    			attr_dev(td, "class", "svelte-gfow64");
    			add_location(td, file$2, 54, 36, 1944);
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
    			add_location(strong, file$2, 72, 36, 2928);
    			attr_dev(td, "class", "svelte-gfow64");
    			add_location(td, file$2, 71, 32, 2886);
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
    			add_location(strong, file$2, 87, 40, 3819);
    			attr_dev(td, "class", "svelte-gfow64");
    			add_location(td, file$2, 86, 36, 3773);
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
    			add_location(strong, file$2, 82, 44, 3523);
    			attr_dev(div, "class", "tooltip svelte-gfow64");
    			attr_dev(div, "data-tooltip", div_data_tooltip_value = /*noche*/ ctx[8]);
    			add_location(div, file$2, 81, 40, 3435);
    			attr_dev(td, "class", "svelte-gfow64");
    			add_location(td, file$2, 80, 36, 3389);
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
    			add_location(strong, file$2, 25, 15, 697);
    			add_location(p, file$2, 25, 12, 694);
    			add_location(tr0, file$2, 33, 20, 996);
    			attr_dev(thead, "class", "svelte-gfow64");
    			add_location(thead, file$2, 32, 16, 967);
    			add_location(tr1, file$2, 41, 20, 1270);
    			add_location(tr2, file$2, 67, 20, 2700);
    			attr_dev(tbody, "class", "svelte-gfow64");
    			add_location(tbody, file$2, 40, 16, 1220);
    			attr_dev(table, "class", "svelte-gfow64");
    			add_location(table, file$2, 31, 12, 942);
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
    			add_location(p, file$2, 20, 8, 608);
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

    function create_fragment$2(ctx) {
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
    			add_location(h2, file$2, 17, 4, 550);
    			attr_dev(div, "class", "container svelte-gfow64");
    			add_location(div, file$2, 16, 0, 521);
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
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    const url = "https://api-jeanoi4212.b4a.run/unidades";

    function instance$2($$self, $$props, $$invalidate) {
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
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Horario",
    			options,
    			id: create_fragment$2.name
    		});
    	}
    }

    /* src\routes\home.svelte generated by Svelte v3.59.2 */
    const file$1 = "src\\routes\\home.svelte";

    // (54:31) 
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
    		source: "(54:31) ",
    		ctx
    	});

    	return block;
    }

    // (51:31) 
    function create_if_block_3(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Menu 4";
    			add_location(p, file$1, 51, 12, 1753);
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
    		source: "(51:31) ",
    		ctx
    	});

    	return block;
    }

    // (48:31) 
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
    		source: "(48:31) ",
    		ctx
    	});

    	return block;
    }

    // (45:31) 
    function create_if_block_1(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Menu 2";
    			add_location(p, file$1, 45, 12, 1631);
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
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(45:31) ",
    		ctx
    	});

    	return block;
    }

    // (42:8) {#if menu === "1"}
    function create_if_block$1(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Menu 1";
    			add_location(p, file$1, 42, 12, 1569);
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
    		source: "(42:8) {#if menu === \\\"1\\\"}",
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
    			add_location(img0, file$1, 21, 12, 646);
    			attr_dev(button0, "class", "item item1 svelte-1x5np92");
    			add_location(button0, file$1, 20, 8, 572);
    			if (!src_url_equal(img1.src, img1_src_value = "Servicio.svg")) attr_dev(img1, "src", img1_src_value);
    			attr_dev(img1, "height", "50");
    			attr_dev(img1, "alt", "");
    			add_location(img1, file$1, 24, 12, 788);
    			attr_dev(button1, "class", "item svelte-1x5np92");
    			add_location(button1, file$1, 23, 8, 722);
    			if (!src_url_equal(img2.src, img2_src_value = "Horario.svg")) attr_dev(img2, "src", img2_src_value);
    			attr_dev(img2, "height", "50");
    			attr_dev(img2, "alt", "");
    			add_location(img2, file$1, 27, 12, 950);
    			attr_dev(button2, "class", "item svelte-1x5np92");
    			add_location(button2, file$1, 26, 8, 871);
    			if (!src_url_equal(img3.src, img3_src_value = "Salud.svg")) attr_dev(img3, "src", img3_src_value);
    			attr_dev(img3, "height", "50");
    			attr_dev(img3, "alt", "");
    			add_location(img3, file$1, 30, 12, 1093);
    			attr_dev(button3, "class", "item svelte-1x5np92");
    			add_location(button3, file$1, 29, 8, 1027);
    			if (!src_url_equal(img4.src, img4_src_value = "Personal.svg")) attr_dev(img4, "src", img4_src_value);
    			attr_dev(img4, "height", "50");
    			attr_dev(img4, "alt", "");
    			add_location(img4, file$1, 33, 12, 1240);
    			attr_dev(button4, "class", "item svelte-1x5np92");
    			add_location(button4, file$1, 32, 8, 1174);
    			if (!src_url_equal(img5.src, img5_src_value = "Salir.svg")) attr_dev(img5, "src", img5_src_value);
    			attr_dev(img5, "height", "50");
    			attr_dev(img5, "alt", "");
    			add_location(img5, file$1, 36, 12, 1394);
    			attr_dev(button5, "class", "item close svelte-1x5np92");
    			add_location(button5, file$1, 35, 8, 1328);
    			attr_dev(div0, "class", "sidebar svelte-1x5np92");
    			add_location(div0, file$1, 19, 4, 534);
    			attr_dev(div1, "class", "panel");
    			add_location(div1, file$1, 40, 4, 1497);
    			attr_dev(div2, "class", "container svelte-1x5np92");
    			add_location(div2, file$1, 18, 0, 501);
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
    					listen_dev(button5, "click", deleteCookies, false, false, false, false)
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

    function deleteCookies() {
    	sessionStorage.removeItem("token");
    	sessionStorage.removeItem("menu");
    	location.href = location.href;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Home', slots, []);
    	let menu = sessionStorage.getItem("menu");

    	function showMenu(menu_id) {
    		sessionStorage.setItem("menu", menu_id);
    		$$invalidate(0, menu = menu_id);
    	}
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Home> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => showMenu("1");
    	const click_handler_1 = () => showMenu("2");
    	const click_handler_2 = () => showMenu("3");
    	const click_handler_3 = () => showMenu("4");
    	const click_handler_4 = () => showMenu("5");

    	$$self.$capture_state = () => ({
    		Trabajadores,
    		Horario,
    		menu,
    		showMenu,
    		deleteCookies
    	});

    	$$self.$inject_state = $$props => {
    		if ('menu' in $$props) $$invalidate(0, menu = $$props.menu);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		menu,
    		showMenu,
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

    // (15:1) {:else}
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
    		source: "(15:1) {:else}",
    		ctx
    	});

    	return block;
    }

    // (13:1) {#if !token}
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
    		source: "(13:1) {#if !token}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let main;
    	let current_block_type_index;
    	let if_block;
    	let current;
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
    			if_block.c();
    			add_location(main, file, 11, 0, 248);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
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
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
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

    	$$self.$capture_state = () => ({ Login, Home, token, login_user });

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
