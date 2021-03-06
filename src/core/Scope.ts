/**
 * Namespace of the jquery-scope-watch.
 * @namespace
 */
module scope {

  /**
   * Watch of scope.
   * @class scope.Scope
   */
  export class Scope {

    /**
     * Reference to the root scope.
     * @member scope.Scope._root
     * @static
     * @private
     * @type {scope.Scope}
     */
    private static _root: Scope;

    /**
     * Reference to the parent scope.
     * @member scope.Scope#parent
     * @type {scope.Scope}
     */
    parent: Scope = undefined;

    /**
     * Reference to child scopes.
     * @member scope.Scope#children
     * @type {scope.Scope}
     */
    children: Scope[] = [];

    /**
     * Reference to watchers.
     * @member scope.Scope#watchers
     * @private
     * @type {Array}
     */
    private watchers: any[] = [];

    /**
     * Reference to listeners.
     * @member scope.Scope#listeners
     * @private
     * @type {{}}
     */
    private listeners: {} = {};

    /**
     * "true" after destroy method is called.
     * "false" before that.
     * @member scope.Scope#destroyed
     * @private
     * @type {boolean}
     */
    private destroyed: boolean = false;

    /**
     * Generate a new child scope of the root scope.
     * @method scope.Scope.generate
     * @static
     * @returns {scope.Scope}
     */
    static generate(): Scope {

      return Scope.root.generate();
    }

    /**
     * If the values has been changed, it apply.
     * @method scope.Scope.apply
     * @static
     */
    static apply() {

      Scope.root.apply();
    }

    /**
     * Generate a new child scope.
     * @method scope.Scope#generate
     * @returns {scope.Scope}
     */
    generate(): Scope {

      var scope = <Scope>Object.create(this);

      scope.parent = this;
      scope.children = [];
      scope.watchers = [];
      scope.listeners = [];
      scope.destroyed = false;

      this.children.push(scope);

      return scope;
    }

    /**
     * Registers a apply callback to be executed the value changes.
     * @method scope.Scope#watch
     * @param {*} expression
     * @param {(newValue?: any, oldValue?: any) => void} apply
     * @returns {Function} A deregistration function for this apply.
     */
    watch(expression: any, apply?: (newValue?: any, oldValue?: any) => void): Function {
      var watcher = new Watcher(this.generateValueGetter(expression), apply);
      this.watchers.push(watcher);
      return () => {this.watchers.splice(this.watchers.indexOf(watcher), 1)};
    }

    /**
     * Registers a apply callback to be executed the value changes.
     * Shallow watch the properties of an object, and to applied.
     * @method scope.Scope#watchCollection
     * @param {*} expression
     * @param {(newValue?: any, oldValue?: any) => void} apply
     * @returns {Function} A deregistration function for this apply.
     */
    watchCollection(expression: any, apply?: (newValue?: any, oldValue?: any) => void): Function {
      var watcher = new CollectionWatcher(this.generateValueGetter(expression), apply);
      this.watchers.push(watcher);
      return () => {this.watchers.splice(this.watchers.indexOf(watcher), 1)};
    }

    /**
     * If the values has been changed, it apply.
     * @method scope.Scope#apply
     */
    apply() {

      if (this.destroyed) return;
      this.watchers.forEach((w: IWatcher) => w.call());
      this.children.forEach((s: Scope) => s.apply());
    }

    /**
     * Listens on events of a given type.
     * @method scope.Scope#on
     * @param {string} name
     * @param {(args: *, argsN: *) => void} listener
     * @returns {Function} A deregistration function for this apply.
     */
    on(name: string, listener: (...args: any[]) => void): Function {

      if (!this.listeners[name]) this.listeners[name] = [];
      this.listeners[name].push(listener);

      return () => {

        var index = this.listeners[name].indexOf(listener);
        if (index === -1) return;
        this.listeners[name].splice(this.listeners[name].indexOf(listener), 1);
      };
    }

    /**
     * Notice an event 'name' to children scopes.
     * @method scope.Scope#broadcast
     * @param {string} name
     * @param {*} args, argsN
     */
    broadcast(name: string, ...args: any[]) {

      if (this.destroyed) return;
      if (this.listeners[name])
        this.listeners[name].forEach((l: Function) => l.apply(null, args));
      this.children.forEach((s: Scope) => s.broadcast(name, args));
    }

    /**
     * Notice an event 'name' to parent scopes.
     * @method scope.Scope#emit
     * @param {string} name
     * @param {*} args, argsN
     */
    emit(name: string, ...args: any[]) {

      if (this.destroyed) return;
      if (this.listeners[name])
        this.listeners[name].forEach((l: Function) => l.apply(null, args));
      this.parent.emit(name, args);
    }

    /**
     * Remove the current scope (and all of its children) from parent scope.
     * @method scope.Scope#destory
     */
    destroy() {

      if (this.destroyed) return;

      var destroy = function(scope) {

        $.extend([], this.children).forEach((s: Scope) => destroy(s));

        scope.destroyed = true;

        if (scope.parent) // If is not the root scope.
          scope.parent.children.splice(scope.parent.children.indexOf(scope), 1);

        scope.parent = null;
        scope.children = null;
        scope.watchers = null;
        scope.listeners = null;
      };

      this.broadcast('destroy');
      destroy(this);
      if (this === Scope.root) Scope._root = undefined;
    }

    /**
     * Bind value to DOM text.
     * @param {*} expression
     * @param {*} selector
     */
    bind(expression: any, selector: any) {
      BindWorker.apply(this, expression, $(selector));
    }

    /**
     * Show DOM, if expression result is true.
     * Otherwise hide DOM.
     * @param {*} expression
     * @param {*} selector
     */
    show(expression: any, selector: any) {
      ShowWorker.apply(this, expression, $(selector));
    }

    /**
     * Hide DOM, if expression result is true.
     * Otherwise show DOM.
     * @param {*} expression
     * @param {*} selector
     */
    hide(expression: any, selector: any) {
      HideWorker.apply(this, expression, $(selector));
    }

    /**
     * Add class to DOM, if expression result is true.
     * Otherwise remove class from DOM.
     * @param {*} expression
     * @param {*} selector
     * @param {string} klass
     */
    klass(expression: any, selector: any, klass: string) {
      KlassWorker.apply(this, expression, $(selector), klass);
    }

    /**
     * Bind value attr of DOM.
     * @param {*} expression
     * @param {*} selector
     * @param {string} attr
     */
    attr(expression: any, selector: any, attr: string) {
      AttrWorker.apply(this, expression, $(selector), attr);
    }

    /**
     * Call callback when click.
     * @param {*} selector
     * @param {string|Function} callback
     */
    click(selector: any, callback: string|Function) {
      ClickWorker.apply(this, $(selector), callback);
    }

    /**
     * Return InputWorker instance.
     * Bind scope value to input value, and bind input value to scope value.
     * @param {string} expression
     * @param {*} selector
     * @returns {InputWorker}
     */
    input(expression: string, selector: any): InputWorker {
      return InputWorker.generate(this, expression, $(selector));
    }

    /**
     * Return SelectWorker instance.
     * Bind scope value to input value, and bind input value to scope value.
     * @param {string} expression
     * @param {*} selector
     * @param {*} dataExpression
     * @param {string} valueKey
     * @param {string} labelKey
     * @returns {SelectWorker}
     */
    select(expression: string, selector: any,
           dataExpression: any, valueKey?: string, labelKey?: string): SelectWorker {
      return SelectWorker.generate(this, expression, $(selector), dataExpression, valueKey, labelKey);
    }

    /**
     * Call callback when submit.
     * @param {*} selector
     * @param {string|Function} callback
     */
    submit(selector: any, callback: string|Function) {
      SubmitWorker.apply(this, $(selector), callback);
    }

    /**
     *
     * @method scope.Scope#repeat
     * @param {*} expression
     * @param {string} valueKey
     * @param {(s: Scope) => JQuery} rowGenerator
     * @param {string} primaryKey
     * @returns {JQuery}
     */
    repeat(expression: any,
           valueKey: string,
           rowGenerator: (s: Scope) => JQuery,
           primaryKey: string): JQuery {

      return RepeatWorker.generate(this, expression, valueKey, rowGenerator, primaryKey);
    }

    /**
     * Generate getter to expression result.
     * @param expression
     * @returns {(): any}
     */
    private generateValueGetter(expression: any): () => any {
      switch (typeof expression) {
        case 'string': return Parser.generate(expression).bind(null, this);
        case 'function': return <() => any>expression;
        default: return () => expression;
      }
    }

    /**
     * Reference to the root scope.
     * @method scope.Scope.root
     * @static
     * @returns {scope.Scope}
     */
    static get root(): Scope {
      return Scope._root || (Scope._root = new Scope());
    }
  }
}
