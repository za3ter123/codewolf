#!/usr/bin/env node
import { createRequire as __cwCreateRequire } from 'node:module'; const require = __cwCreateRequire(import.meta.url);
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __commonJS = (cb, mod) => function __require2() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// node_modules/yaml/dist/nodes/identity.js
var require_identity = __commonJS({
  "node_modules/yaml/dist/nodes/identity.js"(exports) {
    "use strict";
    var ALIAS = /* @__PURE__ */ Symbol.for("yaml.alias");
    var DOC = /* @__PURE__ */ Symbol.for("yaml.document");
    var MAP = /* @__PURE__ */ Symbol.for("yaml.map");
    var PAIR = /* @__PURE__ */ Symbol.for("yaml.pair");
    var SCALAR = /* @__PURE__ */ Symbol.for("yaml.scalar");
    var SEQ = /* @__PURE__ */ Symbol.for("yaml.seq");
    var NODE_TYPE = /* @__PURE__ */ Symbol.for("yaml.node.type");
    var isAlias = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === ALIAS;
    var isDocument = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === DOC;
    var isMap = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === MAP;
    var isPair = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === PAIR;
    var isScalar = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === SCALAR;
    var isSeq = (node) => !!node && typeof node === "object" && node[NODE_TYPE] === SEQ;
    function isCollection(node) {
      if (node && typeof node === "object")
        switch (node[NODE_TYPE]) {
          case MAP:
          case SEQ:
            return true;
        }
      return false;
    }
    function isNode(node) {
      if (node && typeof node === "object")
        switch (node[NODE_TYPE]) {
          case ALIAS:
          case MAP:
          case SCALAR:
          case SEQ:
            return true;
        }
      return false;
    }
    var hasAnchor = (node) => (isScalar(node) || isCollection(node)) && !!node.anchor;
    exports.ALIAS = ALIAS;
    exports.DOC = DOC;
    exports.MAP = MAP;
    exports.NODE_TYPE = NODE_TYPE;
    exports.PAIR = PAIR;
    exports.SCALAR = SCALAR;
    exports.SEQ = SEQ;
    exports.hasAnchor = hasAnchor;
    exports.isAlias = isAlias;
    exports.isCollection = isCollection;
    exports.isDocument = isDocument;
    exports.isMap = isMap;
    exports.isNode = isNode;
    exports.isPair = isPair;
    exports.isScalar = isScalar;
    exports.isSeq = isSeq;
  }
});

// node_modules/yaml/dist/visit.js
var require_visit = __commonJS({
  "node_modules/yaml/dist/visit.js"(exports) {
    "use strict";
    var identity = require_identity();
    var BREAK = /* @__PURE__ */ Symbol("break visit");
    var SKIP = /* @__PURE__ */ Symbol("skip children");
    var REMOVE = /* @__PURE__ */ Symbol("remove node");
    function visit(node, visitor) {
      const visitor_ = initVisitor(visitor);
      if (identity.isDocument(node)) {
        const cd = visit_(null, node.contents, visitor_, Object.freeze([node]));
        if (cd === REMOVE)
          node.contents = null;
      } else
        visit_(null, node, visitor_, Object.freeze([]));
    }
    visit.BREAK = BREAK;
    visit.SKIP = SKIP;
    visit.REMOVE = REMOVE;
    function visit_(key, node, visitor, path13) {
      const ctrl = callVisitor(key, node, visitor, path13);
      if (identity.isNode(ctrl) || identity.isPair(ctrl)) {
        replaceNode(key, path13, ctrl);
        return visit_(key, ctrl, visitor, path13);
      }
      if (typeof ctrl !== "symbol") {
        if (identity.isCollection(node)) {
          path13 = Object.freeze(path13.concat(node));
          for (let i = 0; i < node.items.length; ++i) {
            const ci = visit_(i, node.items[i], visitor, path13);
            if (typeof ci === "number")
              i = ci - 1;
            else if (ci === BREAK)
              return BREAK;
            else if (ci === REMOVE) {
              node.items.splice(i, 1);
              i -= 1;
            }
          }
        } else if (identity.isPair(node)) {
          path13 = Object.freeze(path13.concat(node));
          const ck = visit_("key", node.key, visitor, path13);
          if (ck === BREAK)
            return BREAK;
          else if (ck === REMOVE)
            node.key = null;
          const cv = visit_("value", node.value, visitor, path13);
          if (cv === BREAK)
            return BREAK;
          else if (cv === REMOVE)
            node.value = null;
        }
      }
      return ctrl;
    }
    async function visitAsync(node, visitor) {
      const visitor_ = initVisitor(visitor);
      if (identity.isDocument(node)) {
        const cd = await visitAsync_(null, node.contents, visitor_, Object.freeze([node]));
        if (cd === REMOVE)
          node.contents = null;
      } else
        await visitAsync_(null, node, visitor_, Object.freeze([]));
    }
    visitAsync.BREAK = BREAK;
    visitAsync.SKIP = SKIP;
    visitAsync.REMOVE = REMOVE;
    async function visitAsync_(key, node, visitor, path13) {
      const ctrl = await callVisitor(key, node, visitor, path13);
      if (identity.isNode(ctrl) || identity.isPair(ctrl)) {
        replaceNode(key, path13, ctrl);
        return visitAsync_(key, ctrl, visitor, path13);
      }
      if (typeof ctrl !== "symbol") {
        if (identity.isCollection(node)) {
          path13 = Object.freeze(path13.concat(node));
          for (let i = 0; i < node.items.length; ++i) {
            const ci = await visitAsync_(i, node.items[i], visitor, path13);
            if (typeof ci === "number")
              i = ci - 1;
            else if (ci === BREAK)
              return BREAK;
            else if (ci === REMOVE) {
              node.items.splice(i, 1);
              i -= 1;
            }
          }
        } else if (identity.isPair(node)) {
          path13 = Object.freeze(path13.concat(node));
          const ck = await visitAsync_("key", node.key, visitor, path13);
          if (ck === BREAK)
            return BREAK;
          else if (ck === REMOVE)
            node.key = null;
          const cv = await visitAsync_("value", node.value, visitor, path13);
          if (cv === BREAK)
            return BREAK;
          else if (cv === REMOVE)
            node.value = null;
        }
      }
      return ctrl;
    }
    function initVisitor(visitor) {
      if (typeof visitor === "object" && (visitor.Collection || visitor.Node || visitor.Value)) {
        return Object.assign({
          Alias: visitor.Node,
          Map: visitor.Node,
          Scalar: visitor.Node,
          Seq: visitor.Node
        }, visitor.Value && {
          Map: visitor.Value,
          Scalar: visitor.Value,
          Seq: visitor.Value
        }, visitor.Collection && {
          Map: visitor.Collection,
          Seq: visitor.Collection
        }, visitor);
      }
      return visitor;
    }
    function callVisitor(key, node, visitor, path13) {
      if (typeof visitor === "function")
        return visitor(key, node, path13);
      if (identity.isMap(node))
        return visitor.Map?.(key, node, path13);
      if (identity.isSeq(node))
        return visitor.Seq?.(key, node, path13);
      if (identity.isPair(node))
        return visitor.Pair?.(key, node, path13);
      if (identity.isScalar(node))
        return visitor.Scalar?.(key, node, path13);
      if (identity.isAlias(node))
        return visitor.Alias?.(key, node, path13);
      return void 0;
    }
    function replaceNode(key, path13, node) {
      const parent = path13[path13.length - 1];
      if (identity.isCollection(parent)) {
        parent.items[key] = node;
      } else if (identity.isPair(parent)) {
        if (key === "key")
          parent.key = node;
        else
          parent.value = node;
      } else if (identity.isDocument(parent)) {
        parent.contents = node;
      } else {
        const pt = identity.isAlias(parent) ? "alias" : "scalar";
        throw new Error(`Cannot replace node with ${pt} parent`);
      }
    }
    exports.visit = visit;
    exports.visitAsync = visitAsync;
  }
});

// node_modules/yaml/dist/doc/directives.js
var require_directives = __commonJS({
  "node_modules/yaml/dist/doc/directives.js"(exports) {
    "use strict";
    var identity = require_identity();
    var visit = require_visit();
    var escapeChars = {
      "!": "%21",
      ",": "%2C",
      "[": "%5B",
      "]": "%5D",
      "{": "%7B",
      "}": "%7D"
    };
    var escapeTagName = (tn) => tn.replace(/[!,[\]{}]/g, (ch) => escapeChars[ch]);
    var Directives = class _Directives {
      constructor(yaml, tags) {
        this.docStart = null;
        this.docEnd = false;
        this.yaml = Object.assign({}, _Directives.defaultYaml, yaml);
        this.tags = Object.assign({}, _Directives.defaultTags, tags);
      }
      clone() {
        const copy = new _Directives(this.yaml, this.tags);
        copy.docStart = this.docStart;
        return copy;
      }
      /**
       * During parsing, get a Directives instance for the current document and
       * update the stream state according to the current version's spec.
       */
      atDocument() {
        const res = new _Directives(this.yaml, this.tags);
        switch (this.yaml.version) {
          case "1.1":
            this.atNextDocument = true;
            break;
          case "1.2":
            this.atNextDocument = false;
            this.yaml = {
              explicit: _Directives.defaultYaml.explicit,
              version: "1.2"
            };
            this.tags = Object.assign({}, _Directives.defaultTags);
            break;
        }
        return res;
      }
      /**
       * @param onError - May be called even if the action was successful
       * @returns `true` on success
       */
      add(line, onError) {
        if (this.atNextDocument) {
          this.yaml = { explicit: _Directives.defaultYaml.explicit, version: "1.1" };
          this.tags = Object.assign({}, _Directives.defaultTags);
          this.atNextDocument = false;
        }
        const parts = line.trim().split(/[ \t]+/);
        const name = parts.shift();
        switch (name) {
          case "%TAG": {
            if (parts.length !== 2) {
              onError(0, "%TAG directive should contain exactly two parts");
              if (parts.length < 2)
                return false;
            }
            const [handle, prefix] = parts;
            this.tags[handle] = prefix;
            return true;
          }
          case "%YAML": {
            this.yaml.explicit = true;
            if (parts.length !== 1) {
              onError(0, "%YAML directive should contain exactly one part");
              return false;
            }
            const [version] = parts;
            if (version === "1.1" || version === "1.2") {
              this.yaml.version = version;
              return true;
            } else {
              const isValid = /^\d+\.\d+$/.test(version);
              onError(6, `Unsupported YAML version ${version}`, isValid);
              return false;
            }
          }
          default:
            onError(0, `Unknown directive ${name}`, true);
            return false;
        }
      }
      /**
       * Resolves a tag, matching handles to those defined in %TAG directives.
       *
       * @returns Resolved tag, which may also be the non-specific tag `'!'` or a
       *   `'!local'` tag, or `null` if unresolvable.
       */
      tagName(source, onError) {
        if (source === "!")
          return "!";
        if (source[0] !== "!") {
          onError(`Not a valid tag: ${source}`);
          return null;
        }
        if (source[1] === "<") {
          const verbatim = source.slice(2, -1);
          if (verbatim === "!" || verbatim === "!!") {
            onError(`Verbatim tags aren't resolved, so ${source} is invalid.`);
            return null;
          }
          if (source[source.length - 1] !== ">")
            onError("Verbatim tags must end with a >");
          return verbatim;
        }
        const [, handle, suffix] = source.match(/^(.*!)([^!]*)$/s);
        if (!suffix)
          onError(`The ${source} tag has no suffix`);
        const prefix = this.tags[handle];
        if (prefix) {
          try {
            return prefix + decodeURIComponent(suffix);
          } catch (error) {
            onError(String(error));
            return null;
          }
        }
        if (handle === "!")
          return source;
        onError(`Could not resolve tag: ${source}`);
        return null;
      }
      /**
       * Given a fully resolved tag, returns its printable string form,
       * taking into account current tag prefixes and defaults.
       */
      tagString(tag) {
        for (const [handle, prefix] of Object.entries(this.tags)) {
          if (tag.startsWith(prefix))
            return handle + escapeTagName(tag.substring(prefix.length));
        }
        return tag[0] === "!" ? tag : `!<${tag}>`;
      }
      toString(doc) {
        const lines = this.yaml.explicit ? [`%YAML ${this.yaml.version || "1.2"}`] : [];
        const tagEntries = Object.entries(this.tags);
        let tagNames;
        if (doc && tagEntries.length > 0 && identity.isNode(doc.contents)) {
          const tags = {};
          visit.visit(doc.contents, (_key, node) => {
            if (identity.isNode(node) && node.tag)
              tags[node.tag] = true;
          });
          tagNames = Object.keys(tags);
        } else
          tagNames = [];
        for (const [handle, prefix] of tagEntries) {
          if (handle === "!!" && prefix === "tag:yaml.org,2002:")
            continue;
          if (!doc || tagNames.some((tn) => tn.startsWith(prefix)))
            lines.push(`%TAG ${handle} ${prefix}`);
        }
        return lines.join("\n");
      }
    };
    Directives.defaultYaml = { explicit: false, version: "1.2" };
    Directives.defaultTags = { "!!": "tag:yaml.org,2002:" };
    exports.Directives = Directives;
  }
});

// node_modules/yaml/dist/doc/anchors.js
var require_anchors = __commonJS({
  "node_modules/yaml/dist/doc/anchors.js"(exports) {
    "use strict";
    var identity = require_identity();
    var visit = require_visit();
    function anchorIsValid(anchor) {
      if (/[\x00-\x19\s,[\]{}]/.test(anchor)) {
        const sa = JSON.stringify(anchor);
        const msg = `Anchor must not contain whitespace or control characters: ${sa}`;
        throw new Error(msg);
      }
      return true;
    }
    function anchorNames(root) {
      const anchors = /* @__PURE__ */ new Set();
      visit.visit(root, {
        Value(_key, node) {
          if (node.anchor)
            anchors.add(node.anchor);
        }
      });
      return anchors;
    }
    function findNewAnchor(prefix, exclude) {
      for (let i = 1; true; ++i) {
        const name = `${prefix}${i}`;
        if (!exclude.has(name))
          return name;
      }
    }
    function createNodeAnchors(doc, prefix) {
      const aliasObjects = [];
      const sourceObjects = /* @__PURE__ */ new Map();
      let prevAnchors = null;
      return {
        onAnchor: (source) => {
          aliasObjects.push(source);
          prevAnchors ?? (prevAnchors = anchorNames(doc));
          const anchor = findNewAnchor(prefix, prevAnchors);
          prevAnchors.add(anchor);
          return anchor;
        },
        /**
         * With circular references, the source node is only resolved after all
         * of its child nodes are. This is why anchors are set only after all of
         * the nodes have been created.
         */
        setAnchors: () => {
          for (const source of aliasObjects) {
            const ref = sourceObjects.get(source);
            if (typeof ref === "object" && ref.anchor && (identity.isScalar(ref.node) || identity.isCollection(ref.node))) {
              ref.node.anchor = ref.anchor;
            } else {
              const error = new Error("Failed to resolve repeated object (this should not happen)");
              error.source = source;
              throw error;
            }
          }
        },
        sourceObjects
      };
    }
    exports.anchorIsValid = anchorIsValid;
    exports.anchorNames = anchorNames;
    exports.createNodeAnchors = createNodeAnchors;
    exports.findNewAnchor = findNewAnchor;
  }
});

// node_modules/yaml/dist/doc/applyReviver.js
var require_applyReviver = __commonJS({
  "node_modules/yaml/dist/doc/applyReviver.js"(exports) {
    "use strict";
    function applyReviver(reviver, obj, key, val) {
      if (val && typeof val === "object") {
        if (Array.isArray(val)) {
          for (let i = 0, len = val.length; i < len; ++i) {
            const v0 = val[i];
            const v1 = applyReviver(reviver, val, String(i), v0);
            if (v1 === void 0)
              delete val[i];
            else if (v1 !== v0)
              val[i] = v1;
          }
        } else if (val instanceof Map) {
          for (const k of Array.from(val.keys())) {
            const v0 = val.get(k);
            const v1 = applyReviver(reviver, val, k, v0);
            if (v1 === void 0)
              val.delete(k);
            else if (v1 !== v0)
              val.set(k, v1);
          }
        } else if (val instanceof Set) {
          for (const v0 of Array.from(val)) {
            const v1 = applyReviver(reviver, val, v0, v0);
            if (v1 === void 0)
              val.delete(v0);
            else if (v1 !== v0) {
              val.delete(v0);
              val.add(v1);
            }
          }
        } else {
          for (const [k, v0] of Object.entries(val)) {
            const v1 = applyReviver(reviver, val, k, v0);
            if (v1 === void 0)
              delete val[k];
            else if (v1 !== v0)
              val[k] = v1;
          }
        }
      }
      return reviver.call(obj, key, val);
    }
    exports.applyReviver = applyReviver;
  }
});

// node_modules/yaml/dist/nodes/toJS.js
var require_toJS = __commonJS({
  "node_modules/yaml/dist/nodes/toJS.js"(exports) {
    "use strict";
    var identity = require_identity();
    function toJS(value, arg, ctx) {
      if (Array.isArray(value))
        return value.map((v, i) => toJS(v, String(i), ctx));
      if (value && typeof value.toJSON === "function") {
        if (!ctx || !identity.hasAnchor(value))
          return value.toJSON(arg, ctx);
        const data = { aliasCount: 0, count: 1, res: void 0 };
        ctx.anchors.set(value, data);
        ctx.onCreate = (res2) => {
          data.res = res2;
          delete ctx.onCreate;
        };
        const res = value.toJSON(arg, ctx);
        if (ctx.onCreate)
          ctx.onCreate(res);
        return res;
      }
      if (typeof value === "bigint" && !ctx?.keep)
        return Number(value);
      return value;
    }
    exports.toJS = toJS;
  }
});

// node_modules/yaml/dist/nodes/Node.js
var require_Node = __commonJS({
  "node_modules/yaml/dist/nodes/Node.js"(exports) {
    "use strict";
    var applyReviver = require_applyReviver();
    var identity = require_identity();
    var toJS = require_toJS();
    var NodeBase = class {
      constructor(type) {
        Object.defineProperty(this, identity.NODE_TYPE, { value: type });
      }
      /** Create a copy of this node.  */
      clone() {
        const copy = Object.create(Object.getPrototypeOf(this), Object.getOwnPropertyDescriptors(this));
        if (this.range)
          copy.range = this.range.slice();
        return copy;
      }
      /** A plain JavaScript representation of this node. */
      toJS(doc, { mapAsMap, maxAliasCount, onAnchor, reviver } = {}) {
        if (!identity.isDocument(doc))
          throw new TypeError("A document argument is required");
        const ctx = {
          anchors: /* @__PURE__ */ new Map(),
          doc,
          keep: true,
          mapAsMap: mapAsMap === true,
          mapKeyWarned: false,
          maxAliasCount: typeof maxAliasCount === "number" ? maxAliasCount : 100
        };
        const res = toJS.toJS(this, "", ctx);
        if (typeof onAnchor === "function")
          for (const { count, res: res2 } of ctx.anchors.values())
            onAnchor(res2, count);
        return typeof reviver === "function" ? applyReviver.applyReviver(reviver, { "": res }, "", res) : res;
      }
    };
    exports.NodeBase = NodeBase;
  }
});

// node_modules/yaml/dist/nodes/Alias.js
var require_Alias = __commonJS({
  "node_modules/yaml/dist/nodes/Alias.js"(exports) {
    "use strict";
    var anchors = require_anchors();
    var visit = require_visit();
    var identity = require_identity();
    var Node = require_Node();
    var toJS = require_toJS();
    var Alias = class extends Node.NodeBase {
      constructor(source) {
        super(identity.ALIAS);
        this.source = source;
        Object.defineProperty(this, "tag", {
          set() {
            throw new Error("Alias nodes cannot have tags");
          }
        });
      }
      /**
       * Resolve the value of this alias within `doc`, finding the last
       * instance of the `source` anchor before this node.
       */
      resolve(doc, ctx) {
        if (ctx?.maxAliasCount === 0)
          throw new ReferenceError("Alias resolution is disabled");
        let nodes;
        if (ctx?.aliasResolveCache) {
          nodes = ctx.aliasResolveCache;
        } else {
          nodes = [];
          visit.visit(doc, {
            Node: (_key, node) => {
              if (identity.isAlias(node) || identity.hasAnchor(node))
                nodes.push(node);
            }
          });
          if (ctx)
            ctx.aliasResolveCache = nodes;
        }
        let found = void 0;
        for (const node of nodes) {
          if (node === this)
            break;
          if (node.anchor === this.source)
            found = node;
        }
        if (found && ctx) {
          const { anchors: anchors2, doc: doc2, maxAliasCount } = ctx;
          let data = anchors2.get(found);
          if (!data) {
            toJS.toJS(found, null, ctx);
            data = anchors2.get(found);
          }
          if (data?.res === void 0) {
            const msg = "This should not happen: Alias anchor was not resolved?";
            throw new ReferenceError(msg);
          }
          if (maxAliasCount >= 0) {
            data.count += 1;
            if (data.aliasCount === 0)
              data.aliasCount = getAliasCount(doc2, found, anchors2);
            if (data.count * data.aliasCount > maxAliasCount) {
              const msg = "Excessive alias count indicates a resource exhaustion attack";
              throw new ReferenceError(msg);
            }
          }
        }
        return found;
      }
      toJSON(_arg, ctx) {
        if (!ctx)
          return { source: this.source };
        const source = this.resolve(ctx.doc, ctx);
        if (!source) {
          const msg = `Unresolved alias (the anchor must be set before the alias): ${this.source}`;
          throw new ReferenceError(msg);
        }
        return ctx.anchors.get(source).res;
      }
      toString(ctx, _onComment, _onChompKeep) {
        const src = `*${this.source}`;
        if (ctx) {
          anchors.anchorIsValid(this.source);
          if (ctx.options.verifyAliasOrder && !ctx.anchors.has(this.source)) {
            const msg = `Unresolved alias (the anchor must be set before the alias): ${this.source}`;
            throw new Error(msg);
          }
          if (ctx.implicitKey)
            return `${src} `;
        }
        return src;
      }
    };
    function getAliasCount(doc, node, anchors2) {
      if (identity.isAlias(node)) {
        const source = node.resolve(doc);
        const anchor = anchors2 && source && anchors2.get(source);
        return anchor ? anchor.count * anchor.aliasCount : 0;
      } else if (identity.isCollection(node)) {
        let count = 0;
        for (const item of node.items) {
          const c = getAliasCount(doc, item, anchors2);
          if (c > count)
            count = c;
        }
        return count;
      } else if (identity.isPair(node)) {
        const kc = getAliasCount(doc, node.key, anchors2);
        const vc = getAliasCount(doc, node.value, anchors2);
        return Math.max(kc, vc);
      }
      return 1;
    }
    exports.Alias = Alias;
  }
});

// node_modules/yaml/dist/nodes/Scalar.js
var require_Scalar = __commonJS({
  "node_modules/yaml/dist/nodes/Scalar.js"(exports) {
    "use strict";
    var identity = require_identity();
    var Node = require_Node();
    var toJS = require_toJS();
    var isScalarValue = (value) => !value || typeof value !== "function" && typeof value !== "object";
    var Scalar = class extends Node.NodeBase {
      constructor(value) {
        super(identity.SCALAR);
        this.value = value;
      }
      toJSON(arg, ctx) {
        return ctx?.keep ? this.value : toJS.toJS(this.value, arg, ctx);
      }
      toString() {
        return String(this.value);
      }
    };
    Scalar.BLOCK_FOLDED = "BLOCK_FOLDED";
    Scalar.BLOCK_LITERAL = "BLOCK_LITERAL";
    Scalar.PLAIN = "PLAIN";
    Scalar.QUOTE_DOUBLE = "QUOTE_DOUBLE";
    Scalar.QUOTE_SINGLE = "QUOTE_SINGLE";
    exports.Scalar = Scalar;
    exports.isScalarValue = isScalarValue;
  }
});

// node_modules/yaml/dist/doc/createNode.js
var require_createNode = __commonJS({
  "node_modules/yaml/dist/doc/createNode.js"(exports) {
    "use strict";
    var Alias = require_Alias();
    var identity = require_identity();
    var Scalar = require_Scalar();
    var defaultTagPrefix = "tag:yaml.org,2002:";
    function findTagObject(value, tagName, tags) {
      if (tagName) {
        const match = tags.filter((t) => t.tag === tagName);
        const tagObj = match.find((t) => !t.format) ?? match[0];
        if (!tagObj)
          throw new Error(`Tag ${tagName} not found`);
        return tagObj;
      }
      return tags.find((t) => t.identify?.(value) && !t.format);
    }
    function createNode(value, tagName, ctx) {
      if (identity.isDocument(value))
        value = value.contents;
      if (identity.isNode(value))
        return value;
      if (identity.isPair(value)) {
        const map = ctx.schema[identity.MAP].createNode?.(ctx.schema, null, ctx);
        map.items.push(value);
        return map;
      }
      if (value instanceof String || value instanceof Number || value instanceof Boolean || typeof BigInt !== "undefined" && value instanceof BigInt) {
        value = value.valueOf();
      }
      const { aliasDuplicateObjects, onAnchor, onTagObj, schema, sourceObjects } = ctx;
      let ref = void 0;
      if (aliasDuplicateObjects && value && typeof value === "object") {
        ref = sourceObjects.get(value);
        if (ref) {
          ref.anchor ?? (ref.anchor = onAnchor(value));
          return new Alias.Alias(ref.anchor);
        } else {
          ref = { anchor: null, node: null };
          sourceObjects.set(value, ref);
        }
      }
      if (tagName?.startsWith("!!"))
        tagName = defaultTagPrefix + tagName.slice(2);
      let tagObj = findTagObject(value, tagName, schema.tags);
      if (!tagObj) {
        if (value && typeof value.toJSON === "function") {
          value = value.toJSON();
        }
        if (!value || typeof value !== "object") {
          const node2 = new Scalar.Scalar(value);
          if (ref)
            ref.node = node2;
          return node2;
        }
        tagObj = value instanceof Map ? schema[identity.MAP] : Symbol.iterator in Object(value) ? schema[identity.SEQ] : schema[identity.MAP];
      }
      if (onTagObj) {
        onTagObj(tagObj);
        delete ctx.onTagObj;
      }
      const node = tagObj?.createNode ? tagObj.createNode(ctx.schema, value, ctx) : typeof tagObj?.nodeClass?.from === "function" ? tagObj.nodeClass.from(ctx.schema, value, ctx) : new Scalar.Scalar(value);
      if (tagName)
        node.tag = tagName;
      else if (!tagObj.default)
        node.tag = tagObj.tag;
      if (ref)
        ref.node = node;
      return node;
    }
    exports.createNode = createNode;
  }
});

// node_modules/yaml/dist/nodes/Collection.js
var require_Collection = __commonJS({
  "node_modules/yaml/dist/nodes/Collection.js"(exports) {
    "use strict";
    var createNode = require_createNode();
    var identity = require_identity();
    var Node = require_Node();
    function collectionFromPath(schema, path13, value) {
      let v = value;
      for (let i = path13.length - 1; i >= 0; --i) {
        const k = path13[i];
        if (typeof k === "number" && Number.isInteger(k) && k >= 0) {
          const a = [];
          a[k] = v;
          v = a;
        } else {
          v = /* @__PURE__ */ new Map([[k, v]]);
        }
      }
      return createNode.createNode(v, void 0, {
        aliasDuplicateObjects: false,
        keepUndefined: false,
        onAnchor: () => {
          throw new Error("This should not happen, please report a bug.");
        },
        schema,
        sourceObjects: /* @__PURE__ */ new Map()
      });
    }
    var isEmptyPath = (path13) => path13 == null || typeof path13 === "object" && !!path13[Symbol.iterator]().next().done;
    var Collection = class extends Node.NodeBase {
      constructor(type, schema) {
        super(type);
        Object.defineProperty(this, "schema", {
          value: schema,
          configurable: true,
          enumerable: false,
          writable: true
        });
      }
      /**
       * Create a copy of this collection.
       *
       * @param schema - If defined, overwrites the original's schema
       */
      clone(schema) {
        const copy = Object.create(Object.getPrototypeOf(this), Object.getOwnPropertyDescriptors(this));
        if (schema)
          copy.schema = schema;
        copy.items = copy.items.map((it) => identity.isNode(it) || identity.isPair(it) ? it.clone(schema) : it);
        if (this.range)
          copy.range = this.range.slice();
        return copy;
      }
      /**
       * Adds a value to the collection. For `!!map` and `!!omap` the value must
       * be a Pair instance or a `{ key, value }` object, which may not have a key
       * that already exists in the map.
       */
      addIn(path13, value) {
        if (isEmptyPath(path13))
          this.add(value);
        else {
          const [key, ...rest] = path13;
          const node = this.get(key, true);
          if (identity.isCollection(node))
            node.addIn(rest, value);
          else if (node === void 0 && this.schema)
            this.set(key, collectionFromPath(this.schema, rest, value));
          else
            throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
        }
      }
      /**
       * Removes a value from the collection.
       * @returns `true` if the item was found and removed.
       */
      deleteIn(path13) {
        const [key, ...rest] = path13;
        if (rest.length === 0)
          return this.delete(key);
        const node = this.get(key, true);
        if (identity.isCollection(node))
          return node.deleteIn(rest);
        else
          throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
      }
      /**
       * Returns item at `key`, or `undefined` if not found. By default unwraps
       * scalar values from their surrounding node; to disable set `keepScalar` to
       * `true` (collections are always returned intact).
       */
      getIn(path13, keepScalar) {
        const [key, ...rest] = path13;
        const node = this.get(key, true);
        if (rest.length === 0)
          return !keepScalar && identity.isScalar(node) ? node.value : node;
        else
          return identity.isCollection(node) ? node.getIn(rest, keepScalar) : void 0;
      }
      hasAllNullValues(allowScalar) {
        return this.items.every((node) => {
          if (!identity.isPair(node))
            return false;
          const n = node.value;
          return n == null || allowScalar && identity.isScalar(n) && n.value == null && !n.commentBefore && !n.comment && !n.tag;
        });
      }
      /**
       * Checks if the collection includes a value with the key `key`.
       */
      hasIn(path13) {
        const [key, ...rest] = path13;
        if (rest.length === 0)
          return this.has(key);
        const node = this.get(key, true);
        return identity.isCollection(node) ? node.hasIn(rest) : false;
      }
      /**
       * Sets a value in this collection. For `!!set`, `value` needs to be a
       * boolean to add/remove the item from the set.
       */
      setIn(path13, value) {
        const [key, ...rest] = path13;
        if (rest.length === 0) {
          this.set(key, value);
        } else {
          const node = this.get(key, true);
          if (identity.isCollection(node))
            node.setIn(rest, value);
          else if (node === void 0 && this.schema)
            this.set(key, collectionFromPath(this.schema, rest, value));
          else
            throw new Error(`Expected YAML collection at ${key}. Remaining path: ${rest}`);
        }
      }
    };
    exports.Collection = Collection;
    exports.collectionFromPath = collectionFromPath;
    exports.isEmptyPath = isEmptyPath;
  }
});

// node_modules/yaml/dist/stringify/stringifyComment.js
var require_stringifyComment = __commonJS({
  "node_modules/yaml/dist/stringify/stringifyComment.js"(exports) {
    "use strict";
    var stringifyComment = (str3) => str3.replace(/^(?!$)(?: $)?/gm, "#");
    function indentComment(comment, indent) {
      if (/^\n+$/.test(comment))
        return comment.substring(1);
      return indent ? comment.replace(/^(?! *$)/gm, indent) : comment;
    }
    var lineComment = (str3, indent, comment) => str3.endsWith("\n") ? indentComment(comment, indent) : comment.includes("\n") ? "\n" + indentComment(comment, indent) : (str3.endsWith(" ") ? "" : " ") + comment;
    exports.indentComment = indentComment;
    exports.lineComment = lineComment;
    exports.stringifyComment = stringifyComment;
  }
});

// node_modules/yaml/dist/stringify/foldFlowLines.js
var require_foldFlowLines = __commonJS({
  "node_modules/yaml/dist/stringify/foldFlowLines.js"(exports) {
    "use strict";
    var FOLD_FLOW = "flow";
    var FOLD_BLOCK = "block";
    var FOLD_QUOTED = "quoted";
    function foldFlowLines(text, indent, mode = "flow", { indentAtStart, lineWidth = 80, minContentWidth = 20, onFold, onOverflow } = {}) {
      if (!lineWidth || lineWidth < 0)
        return text;
      if (lineWidth < minContentWidth)
        minContentWidth = 0;
      const endStep = Math.max(1 + minContentWidth, 1 + lineWidth - indent.length);
      if (text.length <= endStep)
        return text;
      const folds = [];
      const escapedFolds = {};
      let end = lineWidth - indent.length;
      if (typeof indentAtStart === "number") {
        if (indentAtStart > lineWidth - Math.max(2, minContentWidth))
          folds.push(0);
        else
          end = lineWidth - indentAtStart;
      }
      let split = void 0;
      let prev = void 0;
      let overflow = false;
      let i = -1;
      let escStart = -1;
      let escEnd = -1;
      if (mode === FOLD_BLOCK) {
        i = consumeMoreIndentedLines(text, i, indent.length);
        if (i !== -1)
          end = i + endStep;
      }
      for (let ch; ch = text[i += 1]; ) {
        if (mode === FOLD_QUOTED && ch === "\\") {
          escStart = i;
          switch (text[i + 1]) {
            case "x":
              i += 3;
              break;
            case "u":
              i += 5;
              break;
            case "U":
              i += 9;
              break;
            default:
              i += 1;
          }
          escEnd = i;
        }
        if (ch === "\n") {
          if (mode === FOLD_BLOCK)
            i = consumeMoreIndentedLines(text, i, indent.length);
          end = i + indent.length + endStep;
          split = void 0;
        } else {
          if (ch === " " && prev && prev !== " " && prev !== "\n" && prev !== "	") {
            const next = text[i + 1];
            if (next && next !== " " && next !== "\n" && next !== "	")
              split = i;
          }
          if (i >= end) {
            if (split) {
              folds.push(split);
              end = split + endStep;
              split = void 0;
            } else if (mode === FOLD_QUOTED) {
              while (prev === " " || prev === "	") {
                prev = ch;
                ch = text[i += 1];
                overflow = true;
              }
              const j = i > escEnd + 1 ? i - 2 : escStart - 1;
              if (escapedFolds[j])
                return text;
              folds.push(j);
              escapedFolds[j] = true;
              end = j + endStep;
              split = void 0;
            } else {
              overflow = true;
            }
          }
        }
        prev = ch;
      }
      if (overflow && onOverflow)
        onOverflow();
      if (folds.length === 0)
        return text;
      if (onFold)
        onFold();
      let res = text.slice(0, folds[0]);
      for (let i2 = 0; i2 < folds.length; ++i2) {
        const fold = folds[i2];
        const end2 = folds[i2 + 1] || text.length;
        if (fold === 0)
          res = `
${indent}${text.slice(0, end2)}`;
        else {
          if (mode === FOLD_QUOTED && escapedFolds[fold])
            res += `${text[fold]}\\`;
          res += `
${indent}${text.slice(fold + 1, end2)}`;
        }
      }
      return res;
    }
    function consumeMoreIndentedLines(text, i, indent) {
      let end = i;
      let start = i + 1;
      let ch = text[start];
      while (ch === " " || ch === "	") {
        if (i < start + indent) {
          ch = text[++i];
        } else {
          do {
            ch = text[++i];
          } while (ch && ch !== "\n");
          end = i;
          start = i + 1;
          ch = text[start];
        }
      }
      return end;
    }
    exports.FOLD_BLOCK = FOLD_BLOCK;
    exports.FOLD_FLOW = FOLD_FLOW;
    exports.FOLD_QUOTED = FOLD_QUOTED;
    exports.foldFlowLines = foldFlowLines;
  }
});

// node_modules/yaml/dist/stringify/stringifyString.js
var require_stringifyString = __commonJS({
  "node_modules/yaml/dist/stringify/stringifyString.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    var foldFlowLines = require_foldFlowLines();
    var getFoldOptions = (ctx, isBlock) => ({
      indentAtStart: isBlock ? ctx.indent.length : ctx.indentAtStart,
      lineWidth: ctx.options.lineWidth,
      minContentWidth: ctx.options.minContentWidth
    });
    var containsDocumentMarker = (str3) => /^(%|---|\.\.\.)/m.test(str3);
    function lineLengthOverLimit(str3, lineWidth, indentLength) {
      if (!lineWidth || lineWidth < 0)
        return false;
      const limit = lineWidth - indentLength;
      const strLen = str3.length;
      if (strLen <= limit)
        return false;
      for (let i = 0, start = 0; i < strLen; ++i) {
        if (str3[i] === "\n") {
          if (i - start > limit)
            return true;
          start = i + 1;
          if (strLen - start <= limit)
            return false;
        }
      }
      return true;
    }
    function doubleQuotedString(value, ctx) {
      const json = JSON.stringify(value);
      if (ctx.options.doubleQuotedAsJSON)
        return json;
      const { implicitKey } = ctx;
      const minMultiLineLength = ctx.options.doubleQuotedMinMultiLineLength;
      const indent = ctx.indent || (containsDocumentMarker(value) ? "  " : "");
      let str3 = "";
      let start = 0;
      for (let i = 0, ch = json[i]; ch; ch = json[++i]) {
        if (ch === " " && json[i + 1] === "\\" && json[i + 2] === "n") {
          str3 += json.slice(start, i) + "\\ ";
          i += 1;
          start = i;
          ch = "\\";
        }
        if (ch === "\\")
          switch (json[i + 1]) {
            case "u":
              {
                str3 += json.slice(start, i);
                const code = json.substr(i + 2, 4);
                switch (code) {
                  case "0000":
                    str3 += "\\0";
                    break;
                  case "0007":
                    str3 += "\\a";
                    break;
                  case "000b":
                    str3 += "\\v";
                    break;
                  case "001b":
                    str3 += "\\e";
                    break;
                  case "0085":
                    str3 += "\\N";
                    break;
                  case "00a0":
                    str3 += "\\_";
                    break;
                  case "2028":
                    str3 += "\\L";
                    break;
                  case "2029":
                    str3 += "\\P";
                    break;
                  default:
                    if (code.substr(0, 2) === "00")
                      str3 += "\\x" + code.substr(2);
                    else
                      str3 += json.substr(i, 6);
                }
                i += 5;
                start = i + 1;
              }
              break;
            case "n":
              if (implicitKey || json[i + 2] === '"' || json.length < minMultiLineLength) {
                i += 1;
              } else {
                str3 += json.slice(start, i) + "\n\n";
                while (json[i + 2] === "\\" && json[i + 3] === "n" && json[i + 4] !== '"') {
                  str3 += "\n";
                  i += 2;
                }
                str3 += indent;
                if (json[i + 2] === " ")
                  str3 += "\\";
                i += 1;
                start = i + 1;
              }
              break;
            default:
              i += 1;
          }
      }
      str3 = start ? str3 + json.slice(start) : json;
      return implicitKey ? str3 : foldFlowLines.foldFlowLines(str3, indent, foldFlowLines.FOLD_QUOTED, getFoldOptions(ctx, false));
    }
    function singleQuotedString(value, ctx) {
      if (ctx.options.singleQuote === false || ctx.implicitKey && value.includes("\n") || /[ \t]\n|\n[ \t]/.test(value))
        return doubleQuotedString(value, ctx);
      const indent = ctx.indent || (containsDocumentMarker(value) ? "  " : "");
      const res = "'" + value.replace(/'/g, "''").replace(/\n+/g, `$&
${indent}`) + "'";
      return ctx.implicitKey ? res : foldFlowLines.foldFlowLines(res, indent, foldFlowLines.FOLD_FLOW, getFoldOptions(ctx, false));
    }
    function quotedString(value, ctx) {
      const { singleQuote } = ctx.options;
      let qs;
      if (singleQuote === false)
        qs = doubleQuotedString;
      else {
        const hasDouble = value.includes('"');
        const hasSingle = value.includes("'");
        if (hasDouble && !hasSingle)
          qs = singleQuotedString;
        else if (hasSingle && !hasDouble)
          qs = doubleQuotedString;
        else
          qs = singleQuote ? singleQuotedString : doubleQuotedString;
      }
      return qs(value, ctx);
    }
    var blockEndNewlines;
    try {
      blockEndNewlines = new RegExp("(^|(?<!\n))\n+(?!\n|$)", "g");
    } catch {
      blockEndNewlines = /\n+(?!\n|$)/g;
    }
    function blockString({ comment, type, value }, ctx, onComment, onChompKeep) {
      const { blockQuote, commentString, lineWidth } = ctx.options;
      if (!blockQuote || /\n[\t ]+$/.test(value)) {
        return quotedString(value, ctx);
      }
      const indent = ctx.indent || (ctx.forceBlockIndent || containsDocumentMarker(value) ? "  " : "");
      const literal = blockQuote === "literal" ? true : blockQuote === "folded" || type === Scalar.Scalar.BLOCK_FOLDED ? false : type === Scalar.Scalar.BLOCK_LITERAL ? true : !lineLengthOverLimit(value, lineWidth, indent.length);
      if (!value)
        return literal ? "|\n" : ">\n";
      let chomp;
      let endStart;
      for (endStart = value.length; endStart > 0; --endStart) {
        const ch = value[endStart - 1];
        if (ch !== "\n" && ch !== "	" && ch !== " ")
          break;
      }
      let end = value.substring(endStart);
      const endNlPos = end.indexOf("\n");
      if (endNlPos === -1) {
        chomp = "-";
      } else if (value === end || endNlPos !== end.length - 1) {
        chomp = "+";
        if (onChompKeep)
          onChompKeep();
      } else {
        chomp = "";
      }
      if (end) {
        value = value.slice(0, -end.length);
        if (end[end.length - 1] === "\n")
          end = end.slice(0, -1);
        end = end.replace(blockEndNewlines, `$&${indent}`);
      }
      let startWithSpace = false;
      let startEnd;
      let startNlPos = -1;
      for (startEnd = 0; startEnd < value.length; ++startEnd) {
        const ch = value[startEnd];
        if (ch === " ")
          startWithSpace = true;
        else if (ch === "\n")
          startNlPos = startEnd;
        else
          break;
      }
      let start = value.substring(0, startNlPos < startEnd ? startNlPos + 1 : startEnd);
      if (start) {
        value = value.substring(start.length);
        start = start.replace(/\n+/g, `$&${indent}`);
      }
      const indentSize = indent ? "2" : "1";
      let header = (startWithSpace ? indentSize : "") + chomp;
      if (comment) {
        header += " " + commentString(comment.replace(/ ?[\r\n]+/g, " "));
        if (onComment)
          onComment();
      }
      if (!literal) {
        const foldedValue = value.replace(/\n+/g, "\n$&").replace(/(?:^|\n)([\t ].*)(?:([\n\t ]*)\n(?![\n\t ]))?/g, "$1$2").replace(/\n+/g, `$&${indent}`);
        let literalFallback = false;
        const foldOptions = getFoldOptions(ctx, true);
        if (blockQuote !== "folded" && type !== Scalar.Scalar.BLOCK_FOLDED) {
          foldOptions.onOverflow = () => {
            literalFallback = true;
          };
        }
        const body = foldFlowLines.foldFlowLines(`${start}${foldedValue}${end}`, indent, foldFlowLines.FOLD_BLOCK, foldOptions);
        if (!literalFallback)
          return `>${header}
${indent}${body}`;
      }
      value = value.replace(/\n+/g, `$&${indent}`);
      return `|${header}
${indent}${start}${value}${end}`;
    }
    function plainString(item, ctx, onComment, onChompKeep) {
      const { type, value } = item;
      const { actualString, implicitKey, indent, indentStep, inFlow } = ctx;
      if (implicitKey && value.includes("\n") || inFlow && /[[\]{},]/.test(value)) {
        return quotedString(value, ctx);
      }
      if (/^[\n\t ,[\]{}#&*!|>'"%@`]|^[?-]$|^[?-][ \t]|[\n:][ \t]|[ \t]\n|[\n\t ]#|[\n\t :]$/.test(value)) {
        return implicitKey || inFlow || !value.includes("\n") ? quotedString(value, ctx) : blockString(item, ctx, onComment, onChompKeep);
      }
      if (!implicitKey && !inFlow && type !== Scalar.Scalar.PLAIN && value.includes("\n")) {
        return blockString(item, ctx, onComment, onChompKeep);
      }
      if (containsDocumentMarker(value)) {
        if (indent === "") {
          ctx.forceBlockIndent = true;
          return blockString(item, ctx, onComment, onChompKeep);
        } else if (implicitKey && indent === indentStep) {
          return quotedString(value, ctx);
        }
      }
      const str3 = value.replace(/\n+/g, `$&
${indent}`);
      if (actualString) {
        const test = (tag) => tag.default && tag.tag !== "tag:yaml.org,2002:str" && tag.test?.test(str3);
        const { compat, tags } = ctx.doc.schema;
        if (tags.some(test) || compat?.some(test))
          return quotedString(value, ctx);
      }
      return implicitKey ? str3 : foldFlowLines.foldFlowLines(str3, indent, foldFlowLines.FOLD_FLOW, getFoldOptions(ctx, false));
    }
    function stringifyString(item, ctx, onComment, onChompKeep) {
      const { implicitKey, inFlow } = ctx;
      const ss = typeof item.value === "string" ? item : Object.assign({}, item, { value: String(item.value) });
      let { type } = item;
      if (type !== Scalar.Scalar.QUOTE_DOUBLE) {
        if (/[\x00-\x08\x0b-\x1f\x7f-\x9f\u{D800}-\u{DFFF}]/u.test(ss.value))
          type = Scalar.Scalar.QUOTE_DOUBLE;
      }
      const _stringify = (_type) => {
        switch (_type) {
          case Scalar.Scalar.BLOCK_FOLDED:
          case Scalar.Scalar.BLOCK_LITERAL:
            return implicitKey || inFlow ? quotedString(ss.value, ctx) : blockString(ss, ctx, onComment, onChompKeep);
          case Scalar.Scalar.QUOTE_DOUBLE:
            return doubleQuotedString(ss.value, ctx);
          case Scalar.Scalar.QUOTE_SINGLE:
            return singleQuotedString(ss.value, ctx);
          case Scalar.Scalar.PLAIN:
            return plainString(ss, ctx, onComment, onChompKeep);
          default:
            return null;
        }
      };
      let res = _stringify(type);
      if (res === null) {
        const { defaultKeyType, defaultStringType } = ctx.options;
        const t = implicitKey && defaultKeyType || defaultStringType;
        res = _stringify(t);
        if (res === null)
          throw new Error(`Unsupported default string type ${t}`);
      }
      return res;
    }
    exports.stringifyString = stringifyString;
  }
});

// node_modules/yaml/dist/stringify/stringify.js
var require_stringify = __commonJS({
  "node_modules/yaml/dist/stringify/stringify.js"(exports) {
    "use strict";
    var anchors = require_anchors();
    var identity = require_identity();
    var stringifyComment = require_stringifyComment();
    var stringifyString = require_stringifyString();
    function createStringifyContext(doc, options) {
      const opt = Object.assign({
        blockQuote: true,
        commentString: stringifyComment.stringifyComment,
        defaultKeyType: null,
        defaultStringType: "PLAIN",
        directives: null,
        doubleQuotedAsJSON: false,
        doubleQuotedMinMultiLineLength: 40,
        falseStr: "false",
        flowCollectionPadding: true,
        indentSeq: true,
        lineWidth: 80,
        minContentWidth: 20,
        nullStr: "null",
        simpleKeys: false,
        singleQuote: null,
        trailingComma: false,
        trueStr: "true",
        verifyAliasOrder: true
      }, doc.schema.toStringOptions, options);
      let inFlow;
      switch (opt.collectionStyle) {
        case "block":
          inFlow = false;
          break;
        case "flow":
          inFlow = true;
          break;
        default:
          inFlow = null;
      }
      return {
        anchors: /* @__PURE__ */ new Set(),
        doc,
        flowCollectionPadding: opt.flowCollectionPadding ? " " : "",
        indent: "",
        indentStep: typeof opt.indent === "number" ? " ".repeat(opt.indent) : "  ",
        inFlow,
        options: opt
      };
    }
    function getTagObject(tags, item) {
      if (item.tag) {
        const match = tags.filter((t) => t.tag === item.tag);
        if (match.length > 0)
          return match.find((t) => t.format === item.format) ?? match[0];
      }
      let tagObj = void 0;
      let obj;
      if (identity.isScalar(item)) {
        obj = item.value;
        let match = tags.filter((t) => t.identify?.(obj));
        if (match.length > 1) {
          const testMatch = match.filter((t) => t.test);
          if (testMatch.length > 0)
            match = testMatch;
        }
        tagObj = match.find((t) => t.format === item.format) ?? match.find((t) => !t.format);
      } else {
        obj = item;
        tagObj = tags.find((t) => t.nodeClass && obj instanceof t.nodeClass);
      }
      if (!tagObj) {
        const name = obj?.constructor?.name ?? (obj === null ? "null" : typeof obj);
        throw new Error(`Tag not resolved for ${name} value`);
      }
      return tagObj;
    }
    function stringifyProps(node, tagObj, { anchors: anchors$1, doc }) {
      if (!doc.directives)
        return "";
      const props = [];
      const anchor = (identity.isScalar(node) || identity.isCollection(node)) && node.anchor;
      if (anchor && anchors.anchorIsValid(anchor)) {
        anchors$1.add(anchor);
        props.push(`&${anchor}`);
      }
      const tag = node.tag ?? (tagObj.default ? null : tagObj.tag);
      if (tag)
        props.push(doc.directives.tagString(tag));
      return props.join(" ");
    }
    function stringify(item, ctx, onComment, onChompKeep) {
      if (identity.isPair(item))
        return item.toString(ctx, onComment, onChompKeep);
      if (identity.isAlias(item)) {
        if (ctx.doc.directives)
          return item.toString(ctx);
        if (ctx.resolvedAliases?.has(item)) {
          throw new TypeError(`Cannot stringify circular structure without alias nodes`);
        } else {
          if (ctx.resolvedAliases)
            ctx.resolvedAliases.add(item);
          else
            ctx.resolvedAliases = /* @__PURE__ */ new Set([item]);
          item = item.resolve(ctx.doc);
        }
      }
      let tagObj = void 0;
      const node = identity.isNode(item) ? item : ctx.doc.createNode(item, { onTagObj: (o) => tagObj = o });
      tagObj ?? (tagObj = getTagObject(ctx.doc.schema.tags, node));
      const props = stringifyProps(node, tagObj, ctx);
      if (props.length > 0)
        ctx.indentAtStart = (ctx.indentAtStart ?? 0) + props.length + 1;
      const str3 = typeof tagObj.stringify === "function" ? tagObj.stringify(node, ctx, onComment, onChompKeep) : identity.isScalar(node) ? stringifyString.stringifyString(node, ctx, onComment, onChompKeep) : node.toString(ctx, onComment, onChompKeep);
      if (!props)
        return str3;
      return identity.isScalar(node) || str3[0] === "{" || str3[0] === "[" ? `${props} ${str3}` : `${props}
${ctx.indent}${str3}`;
    }
    exports.createStringifyContext = createStringifyContext;
    exports.stringify = stringify;
  }
});

// node_modules/yaml/dist/stringify/stringifyPair.js
var require_stringifyPair = __commonJS({
  "node_modules/yaml/dist/stringify/stringifyPair.js"(exports) {
    "use strict";
    var identity = require_identity();
    var Scalar = require_Scalar();
    var stringify = require_stringify();
    var stringifyComment = require_stringifyComment();
    function stringifyPair({ key, value }, ctx, onComment, onChompKeep) {
      const { allNullValues, doc, indent, indentStep, options: { commentString, indentSeq, simpleKeys } } = ctx;
      let keyComment = identity.isNode(key) && key.comment || null;
      if (simpleKeys) {
        if (keyComment) {
          throw new Error("With simple keys, key nodes cannot have comments");
        }
        if (identity.isCollection(key) || !identity.isNode(key) && typeof key === "object") {
          const msg = "With simple keys, collection cannot be used as a key value";
          throw new Error(msg);
        }
      }
      let explicitKey = !simpleKeys && (!key || keyComment && value == null && !ctx.inFlow || identity.isCollection(key) || (identity.isScalar(key) ? key.type === Scalar.Scalar.BLOCK_FOLDED || key.type === Scalar.Scalar.BLOCK_LITERAL : typeof key === "object"));
      ctx = Object.assign({}, ctx, {
        allNullValues: false,
        implicitKey: !explicitKey && (simpleKeys || !allNullValues),
        indent: indent + indentStep
      });
      let keyCommentDone = false;
      let chompKeep = false;
      let str3 = stringify.stringify(key, ctx, () => keyCommentDone = true, () => chompKeep = true);
      if (!explicitKey && !ctx.inFlow && str3.length > 1024) {
        if (simpleKeys)
          throw new Error("With simple keys, single line scalar must not span more than 1024 characters");
        explicitKey = true;
      }
      if (ctx.inFlow) {
        if (allNullValues || value == null) {
          if (keyCommentDone && onComment)
            onComment();
          return str3 === "" ? "?" : explicitKey ? `? ${str3}` : str3;
        }
      } else if (allNullValues && !simpleKeys || value == null && explicitKey) {
        str3 = `? ${str3}`;
        if (keyComment && !keyCommentDone) {
          str3 += stringifyComment.lineComment(str3, ctx.indent, commentString(keyComment));
        } else if (chompKeep && onChompKeep)
          onChompKeep();
        return str3;
      }
      if (keyCommentDone)
        keyComment = null;
      if (explicitKey) {
        if (keyComment)
          str3 += stringifyComment.lineComment(str3, ctx.indent, commentString(keyComment));
        str3 = `? ${str3}
${indent}:`;
      } else {
        str3 = `${str3}:`;
        if (keyComment)
          str3 += stringifyComment.lineComment(str3, ctx.indent, commentString(keyComment));
      }
      let vsb, vcb, valueComment;
      if (identity.isNode(value)) {
        vsb = !!value.spaceBefore;
        vcb = value.commentBefore;
        valueComment = value.comment;
      } else {
        vsb = false;
        vcb = null;
        valueComment = null;
        if (value && typeof value === "object")
          value = doc.createNode(value);
      }
      ctx.implicitKey = false;
      if (!explicitKey && !keyComment && identity.isScalar(value))
        ctx.indentAtStart = str3.length + 1;
      chompKeep = false;
      if (!indentSeq && indentStep.length >= 2 && !ctx.inFlow && !explicitKey && identity.isSeq(value) && !value.flow && !value.tag && !value.anchor) {
        ctx.indent = ctx.indent.substring(2);
      }
      let valueCommentDone = false;
      const valueStr = stringify.stringify(value, ctx, () => valueCommentDone = true, () => chompKeep = true);
      let ws = " ";
      if (keyComment || vsb || vcb) {
        ws = vsb ? "\n" : "";
        if (vcb) {
          const cs = commentString(vcb);
          ws += `
${stringifyComment.indentComment(cs, ctx.indent)}`;
        }
        if (valueStr === "" && !ctx.inFlow) {
          if (ws === "\n" && valueComment)
            ws = "\n\n";
        } else {
          ws += `
${ctx.indent}`;
        }
      } else if (!explicitKey && identity.isCollection(value)) {
        const vs0 = valueStr[0];
        const nl0 = valueStr.indexOf("\n");
        const hasNewline = nl0 !== -1;
        const flow = ctx.inFlow ?? value.flow ?? value.items.length === 0;
        if (hasNewline || !flow) {
          let hasPropsLine = false;
          if (hasNewline && (vs0 === "&" || vs0 === "!")) {
            let sp0 = valueStr.indexOf(" ");
            if (vs0 === "&" && sp0 !== -1 && sp0 < nl0 && valueStr[sp0 + 1] === "!") {
              sp0 = valueStr.indexOf(" ", sp0 + 1);
            }
            if (sp0 === -1 || nl0 < sp0)
              hasPropsLine = true;
          }
          if (!hasPropsLine)
            ws = `
${ctx.indent}`;
        }
      } else if (valueStr === "" || valueStr[0] === "\n") {
        ws = "";
      }
      str3 += ws + valueStr;
      if (ctx.inFlow) {
        if (valueCommentDone && onComment)
          onComment();
      } else if (valueComment && !valueCommentDone) {
        str3 += stringifyComment.lineComment(str3, ctx.indent, commentString(valueComment));
      } else if (chompKeep && onChompKeep) {
        onChompKeep();
      }
      return str3;
    }
    exports.stringifyPair = stringifyPair;
  }
});

// node_modules/yaml/dist/log.js
var require_log = __commonJS({
  "node_modules/yaml/dist/log.js"(exports) {
    "use strict";
    var node_process = __require("process");
    function debug(logLevel, ...messages) {
      if (logLevel === "debug")
        console.log(...messages);
    }
    function warn(logLevel, warning) {
      if (logLevel === "debug" || logLevel === "warn") {
        if (typeof node_process.emitWarning === "function")
          node_process.emitWarning(warning);
        else
          console.warn(warning);
      }
    }
    exports.debug = debug;
    exports.warn = warn;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/merge.js
var require_merge = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/merge.js"(exports) {
    "use strict";
    var identity = require_identity();
    var Scalar = require_Scalar();
    var MERGE_KEY = "<<";
    var merge = {
      identify: (value) => value === MERGE_KEY || typeof value === "symbol" && value.description === MERGE_KEY,
      default: "key",
      tag: "tag:yaml.org,2002:merge",
      test: /^<<$/,
      resolve: () => Object.assign(new Scalar.Scalar(Symbol(MERGE_KEY)), {
        addToJSMap: addMergeToJSMap
      }),
      stringify: () => MERGE_KEY
    };
    var isMergeKey = (ctx, key) => (merge.identify(key) || identity.isScalar(key) && (!key.type || key.type === Scalar.Scalar.PLAIN) && merge.identify(key.value)) && ctx?.doc.schema.tags.some((tag) => tag.tag === merge.tag && tag.default);
    function addMergeToJSMap(ctx, map, value) {
      const source = resolveAliasValue(ctx, value);
      if (identity.isSeq(source))
        for (const it of source.items)
          mergeValue(ctx, map, it);
      else if (Array.isArray(source))
        for (const it of source)
          mergeValue(ctx, map, it);
      else
        mergeValue(ctx, map, source);
    }
    function mergeValue(ctx, map, value) {
      const source = resolveAliasValue(ctx, value);
      if (!identity.isMap(source))
        throw new Error("Merge sources must be maps or map aliases");
      const srcMap = source.toJSON(null, ctx, Map);
      for (const [key, value2] of srcMap) {
        if (map instanceof Map) {
          if (!map.has(key))
            map.set(key, value2);
        } else if (map instanceof Set) {
          map.add(key);
        } else if (!Object.prototype.hasOwnProperty.call(map, key)) {
          Object.defineProperty(map, key, {
            value: value2,
            writable: true,
            enumerable: true,
            configurable: true
          });
        }
      }
      return map;
    }
    function resolveAliasValue(ctx, value) {
      return ctx && identity.isAlias(value) ? value.resolve(ctx.doc, ctx) : value;
    }
    exports.addMergeToJSMap = addMergeToJSMap;
    exports.isMergeKey = isMergeKey;
    exports.merge = merge;
  }
});

// node_modules/yaml/dist/nodes/addPairToJSMap.js
var require_addPairToJSMap = __commonJS({
  "node_modules/yaml/dist/nodes/addPairToJSMap.js"(exports) {
    "use strict";
    var log = require_log();
    var merge = require_merge();
    var stringify = require_stringify();
    var identity = require_identity();
    var toJS = require_toJS();
    function addPairToJSMap(ctx, map, { key, value }) {
      if (identity.isNode(key) && key.addToJSMap)
        key.addToJSMap(ctx, map, value);
      else if (merge.isMergeKey(ctx, key))
        merge.addMergeToJSMap(ctx, map, value);
      else {
        const jsKey = toJS.toJS(key, "", ctx);
        if (map instanceof Map) {
          map.set(jsKey, toJS.toJS(value, jsKey, ctx));
        } else if (map instanceof Set) {
          map.add(jsKey);
        } else {
          const stringKey = stringifyKey(key, jsKey, ctx);
          const jsValue = toJS.toJS(value, stringKey, ctx);
          if (stringKey in map)
            Object.defineProperty(map, stringKey, {
              value: jsValue,
              writable: true,
              enumerable: true,
              configurable: true
            });
          else
            map[stringKey] = jsValue;
        }
      }
      return map;
    }
    function stringifyKey(key, jsKey, ctx) {
      if (jsKey === null)
        return "";
      if (typeof jsKey !== "object")
        return String(jsKey);
      if (identity.isNode(key) && ctx?.doc) {
        const strCtx = stringify.createStringifyContext(ctx.doc, {});
        strCtx.anchors = /* @__PURE__ */ new Set();
        for (const node of ctx.anchors.keys())
          strCtx.anchors.add(node.anchor);
        strCtx.inFlow = true;
        strCtx.inStringifyKey = true;
        const strKey = key.toString(strCtx);
        if (!ctx.mapKeyWarned) {
          let jsonStr = JSON.stringify(strKey);
          if (jsonStr.length > 40)
            jsonStr = jsonStr.substring(0, 36) + '..."';
          log.warn(ctx.doc.options.logLevel, `Keys with collection values will be stringified due to JS Object restrictions: ${jsonStr}. Set mapAsMap: true to use object keys.`);
          ctx.mapKeyWarned = true;
        }
        return strKey;
      }
      return JSON.stringify(jsKey);
    }
    exports.addPairToJSMap = addPairToJSMap;
  }
});

// node_modules/yaml/dist/nodes/Pair.js
var require_Pair = __commonJS({
  "node_modules/yaml/dist/nodes/Pair.js"(exports) {
    "use strict";
    var createNode = require_createNode();
    var stringifyPair = require_stringifyPair();
    var addPairToJSMap = require_addPairToJSMap();
    var identity = require_identity();
    function createPair(key, value, ctx) {
      const k = createNode.createNode(key, void 0, ctx);
      const v = createNode.createNode(value, void 0, ctx);
      return new Pair(k, v);
    }
    var Pair = class _Pair {
      constructor(key, value = null) {
        Object.defineProperty(this, identity.NODE_TYPE, { value: identity.PAIR });
        this.key = key;
        this.value = value;
      }
      clone(schema) {
        let { key, value } = this;
        if (identity.isNode(key))
          key = key.clone(schema);
        if (identity.isNode(value))
          value = value.clone(schema);
        return new _Pair(key, value);
      }
      toJSON(_, ctx) {
        const pair = ctx?.mapAsMap ? /* @__PURE__ */ new Map() : {};
        return addPairToJSMap.addPairToJSMap(ctx, pair, this);
      }
      toString(ctx, onComment, onChompKeep) {
        return ctx?.doc ? stringifyPair.stringifyPair(this, ctx, onComment, onChompKeep) : JSON.stringify(this);
      }
    };
    exports.Pair = Pair;
    exports.createPair = createPair;
  }
});

// node_modules/yaml/dist/stringify/stringifyCollection.js
var require_stringifyCollection = __commonJS({
  "node_modules/yaml/dist/stringify/stringifyCollection.js"(exports) {
    "use strict";
    var identity = require_identity();
    var stringify = require_stringify();
    var stringifyComment = require_stringifyComment();
    function stringifyCollection(collection, ctx, options) {
      const flow = ctx.inFlow ?? collection.flow;
      const stringify2 = flow ? stringifyFlowCollection : stringifyBlockCollection;
      return stringify2(collection, ctx, options);
    }
    function stringifyBlockCollection({ comment, items }, ctx, { blockItemPrefix, flowChars, itemIndent, onChompKeep, onComment }) {
      const { indent, options: { commentString } } = ctx;
      const itemCtx = Object.assign({}, ctx, { indent: itemIndent, type: null });
      let chompKeep = false;
      const lines = [];
      for (let i = 0; i < items.length; ++i) {
        const item = items[i];
        let comment2 = null;
        if (identity.isNode(item)) {
          if (!chompKeep && item.spaceBefore)
            lines.push("");
          addCommentBefore(ctx, lines, item.commentBefore, chompKeep);
          if (item.comment)
            comment2 = item.comment;
        } else if (identity.isPair(item)) {
          const ik = identity.isNode(item.key) ? item.key : null;
          if (ik) {
            if (!chompKeep && ik.spaceBefore)
              lines.push("");
            addCommentBefore(ctx, lines, ik.commentBefore, chompKeep);
          }
        }
        chompKeep = false;
        let str4 = stringify.stringify(item, itemCtx, () => comment2 = null, () => chompKeep = true);
        if (comment2)
          str4 += stringifyComment.lineComment(str4, itemIndent, commentString(comment2));
        if (chompKeep && comment2)
          chompKeep = false;
        lines.push(blockItemPrefix + str4);
      }
      let str3;
      if (lines.length === 0) {
        str3 = flowChars.start + flowChars.end;
      } else {
        str3 = lines[0];
        for (let i = 1; i < lines.length; ++i) {
          const line = lines[i];
          str3 += line ? `
${indent}${line}` : "\n";
        }
      }
      if (comment) {
        str3 += "\n" + stringifyComment.indentComment(commentString(comment), indent);
        if (onComment)
          onComment();
      } else if (chompKeep && onChompKeep)
        onChompKeep();
      return str3;
    }
    function stringifyFlowCollection({ items }, ctx, { flowChars, itemIndent }) {
      const { indent, indentStep, flowCollectionPadding: fcPadding, options: { commentString } } = ctx;
      itemIndent += indentStep;
      const itemCtx = Object.assign({}, ctx, {
        indent: itemIndent,
        inFlow: true,
        type: null
      });
      let reqNewline = false;
      let linesAtValue = 0;
      const lines = [];
      for (let i = 0; i < items.length; ++i) {
        const item = items[i];
        let comment = null;
        if (identity.isNode(item)) {
          if (item.spaceBefore)
            lines.push("");
          addCommentBefore(ctx, lines, item.commentBefore, false);
          if (item.comment)
            comment = item.comment;
        } else if (identity.isPair(item)) {
          const ik = identity.isNode(item.key) ? item.key : null;
          if (ik) {
            if (ik.spaceBefore)
              lines.push("");
            addCommentBefore(ctx, lines, ik.commentBefore, false);
            if (ik.comment)
              reqNewline = true;
          }
          const iv = identity.isNode(item.value) ? item.value : null;
          if (iv) {
            if (iv.comment)
              comment = iv.comment;
            if (iv.commentBefore)
              reqNewline = true;
          } else if (item.value == null && ik?.comment) {
            comment = ik.comment;
          }
        }
        if (comment)
          reqNewline = true;
        let str3 = stringify.stringify(item, itemCtx, () => comment = null);
        reqNewline || (reqNewline = lines.length > linesAtValue || str3.includes("\n"));
        if (i < items.length - 1) {
          str3 += ",";
        } else if (ctx.options.trailingComma) {
          if (ctx.options.lineWidth > 0) {
            reqNewline || (reqNewline = lines.reduce((sum, line) => sum + line.length + 2, 2) + (str3.length + 2) > ctx.options.lineWidth);
          }
          if (reqNewline) {
            str3 += ",";
          }
        }
        if (comment)
          str3 += stringifyComment.lineComment(str3, itemIndent, commentString(comment));
        lines.push(str3);
        linesAtValue = lines.length;
      }
      const { start, end } = flowChars;
      if (lines.length === 0) {
        return start + end;
      } else {
        if (!reqNewline) {
          const len = lines.reduce((sum, line) => sum + line.length + 2, 2);
          reqNewline = ctx.options.lineWidth > 0 && len > ctx.options.lineWidth;
        }
        if (reqNewline) {
          let str3 = start;
          for (const line of lines)
            str3 += line ? `
${indentStep}${indent}${line}` : "\n";
          return `${str3}
${indent}${end}`;
        } else {
          return `${start}${fcPadding}${lines.join(" ")}${fcPadding}${end}`;
        }
      }
    }
    function addCommentBefore({ indent, options: { commentString } }, lines, comment, chompKeep) {
      if (comment && chompKeep)
        comment = comment.replace(/^\n+/, "");
      if (comment) {
        const ic = stringifyComment.indentComment(commentString(comment), indent);
        lines.push(ic.trimStart());
      }
    }
    exports.stringifyCollection = stringifyCollection;
  }
});

// node_modules/yaml/dist/nodes/YAMLMap.js
var require_YAMLMap = __commonJS({
  "node_modules/yaml/dist/nodes/YAMLMap.js"(exports) {
    "use strict";
    var stringifyCollection = require_stringifyCollection();
    var addPairToJSMap = require_addPairToJSMap();
    var Collection = require_Collection();
    var identity = require_identity();
    var Pair = require_Pair();
    var Scalar = require_Scalar();
    function findPair(items, key) {
      const k = identity.isScalar(key) ? key.value : key;
      for (const it of items) {
        if (identity.isPair(it)) {
          if (it.key === key || it.key === k)
            return it;
          if (identity.isScalar(it.key) && it.key.value === k)
            return it;
        }
      }
      return void 0;
    }
    var YAMLMap = class extends Collection.Collection {
      static get tagName() {
        return "tag:yaml.org,2002:map";
      }
      constructor(schema) {
        super(identity.MAP, schema);
        this.items = [];
      }
      /**
       * A generic collection parsing method that can be extended
       * to other node classes that inherit from YAMLMap
       */
      static from(schema, obj, ctx) {
        const { keepUndefined, replacer } = ctx;
        const map = new this(schema);
        const add = (key, value) => {
          if (typeof replacer === "function")
            value = replacer.call(obj, key, value);
          else if (Array.isArray(replacer) && !replacer.includes(key))
            return;
          if (value !== void 0 || keepUndefined)
            map.items.push(Pair.createPair(key, value, ctx));
        };
        if (obj instanceof Map) {
          for (const [key, value] of obj)
            add(key, value);
        } else if (obj && typeof obj === "object") {
          for (const key of Object.keys(obj))
            add(key, obj[key]);
        }
        if (typeof schema.sortMapEntries === "function") {
          map.items.sort(schema.sortMapEntries);
        }
        return map;
      }
      /**
       * Adds a value to the collection.
       *
       * @param overwrite - If not set `true`, using a key that is already in the
       *   collection will throw. Otherwise, overwrites the previous value.
       */
      add(pair, overwrite) {
        let _pair;
        if (identity.isPair(pair))
          _pair = pair;
        else if (!pair || typeof pair !== "object" || !("key" in pair)) {
          _pair = new Pair.Pair(pair, pair?.value);
        } else
          _pair = new Pair.Pair(pair.key, pair.value);
        const prev = findPair(this.items, _pair.key);
        const sortEntries = this.schema?.sortMapEntries;
        if (prev) {
          if (!overwrite)
            throw new Error(`Key ${_pair.key} already set`);
          if (identity.isScalar(prev.value) && Scalar.isScalarValue(_pair.value))
            prev.value.value = _pair.value;
          else
            prev.value = _pair.value;
        } else if (sortEntries) {
          const i = this.items.findIndex((item) => sortEntries(_pair, item) < 0);
          if (i === -1)
            this.items.push(_pair);
          else
            this.items.splice(i, 0, _pair);
        } else {
          this.items.push(_pair);
        }
      }
      delete(key) {
        const it = findPair(this.items, key);
        if (!it)
          return false;
        const del = this.items.splice(this.items.indexOf(it), 1);
        return del.length > 0;
      }
      get(key, keepScalar) {
        const it = findPair(this.items, key);
        const node = it?.value;
        return (!keepScalar && identity.isScalar(node) ? node.value : node) ?? void 0;
      }
      has(key) {
        return !!findPair(this.items, key);
      }
      set(key, value) {
        this.add(new Pair.Pair(key, value), true);
      }
      /**
       * @param ctx - Conversion context, originally set in Document#toJS()
       * @param {Class} Type - If set, forces the returned collection type
       * @returns Instance of Type, Map, or Object
       */
      toJSON(_, ctx, Type) {
        const map = Type ? new Type() : ctx?.mapAsMap ? /* @__PURE__ */ new Map() : {};
        if (ctx?.onCreate)
          ctx.onCreate(map);
        for (const item of this.items)
          addPairToJSMap.addPairToJSMap(ctx, map, item);
        return map;
      }
      toString(ctx, onComment, onChompKeep) {
        if (!ctx)
          return JSON.stringify(this);
        for (const item of this.items) {
          if (!identity.isPair(item))
            throw new Error(`Map items must all be pairs; found ${JSON.stringify(item)} instead`);
        }
        if (!ctx.allNullValues && this.hasAllNullValues(false))
          ctx = Object.assign({}, ctx, { allNullValues: true });
        return stringifyCollection.stringifyCollection(this, ctx, {
          blockItemPrefix: "",
          flowChars: { start: "{", end: "}" },
          itemIndent: ctx.indent || "",
          onChompKeep,
          onComment
        });
      }
    };
    exports.YAMLMap = YAMLMap;
    exports.findPair = findPair;
  }
});

// node_modules/yaml/dist/schema/common/map.js
var require_map = __commonJS({
  "node_modules/yaml/dist/schema/common/map.js"(exports) {
    "use strict";
    var identity = require_identity();
    var YAMLMap = require_YAMLMap();
    var map = {
      collection: "map",
      default: true,
      nodeClass: YAMLMap.YAMLMap,
      tag: "tag:yaml.org,2002:map",
      resolve(map2, onError) {
        if (!identity.isMap(map2))
          onError("Expected a mapping for this tag");
        return map2;
      },
      createNode: (schema, obj, ctx) => YAMLMap.YAMLMap.from(schema, obj, ctx)
    };
    exports.map = map;
  }
});

// node_modules/yaml/dist/nodes/YAMLSeq.js
var require_YAMLSeq = __commonJS({
  "node_modules/yaml/dist/nodes/YAMLSeq.js"(exports) {
    "use strict";
    var createNode = require_createNode();
    var stringifyCollection = require_stringifyCollection();
    var Collection = require_Collection();
    var identity = require_identity();
    var Scalar = require_Scalar();
    var toJS = require_toJS();
    var YAMLSeq = class extends Collection.Collection {
      static get tagName() {
        return "tag:yaml.org,2002:seq";
      }
      constructor(schema) {
        super(identity.SEQ, schema);
        this.items = [];
      }
      add(value) {
        this.items.push(value);
      }
      /**
       * Removes a value from the collection.
       *
       * `key` must contain a representation of an integer for this to succeed.
       * It may be wrapped in a `Scalar`.
       *
       * @returns `true` if the item was found and removed.
       */
      delete(key) {
        const idx = asItemIndex(key);
        if (typeof idx !== "number")
          return false;
        const del = this.items.splice(idx, 1);
        return del.length > 0;
      }
      get(key, keepScalar) {
        const idx = asItemIndex(key);
        if (typeof idx !== "number")
          return void 0;
        const it = this.items[idx];
        return !keepScalar && identity.isScalar(it) ? it.value : it;
      }
      /**
       * Checks if the collection includes a value with the key `key`.
       *
       * `key` must contain a representation of an integer for this to succeed.
       * It may be wrapped in a `Scalar`.
       */
      has(key) {
        const idx = asItemIndex(key);
        return typeof idx === "number" && idx < this.items.length;
      }
      /**
       * Sets a value in this collection. For `!!set`, `value` needs to be a
       * boolean to add/remove the item from the set.
       *
       * If `key` does not contain a representation of an integer, this will throw.
       * It may be wrapped in a `Scalar`.
       */
      set(key, value) {
        const idx = asItemIndex(key);
        if (typeof idx !== "number")
          throw new Error(`Expected a valid index, not ${key}.`);
        const prev = this.items[idx];
        if (identity.isScalar(prev) && Scalar.isScalarValue(value))
          prev.value = value;
        else
          this.items[idx] = value;
      }
      toJSON(_, ctx) {
        const seq = [];
        if (ctx?.onCreate)
          ctx.onCreate(seq);
        let i = 0;
        for (const item of this.items)
          seq.push(toJS.toJS(item, String(i++), ctx));
        return seq;
      }
      toString(ctx, onComment, onChompKeep) {
        if (!ctx)
          return JSON.stringify(this);
        return stringifyCollection.stringifyCollection(this, ctx, {
          blockItemPrefix: "- ",
          flowChars: { start: "[", end: "]" },
          itemIndent: (ctx.indent || "") + "  ",
          onChompKeep,
          onComment
        });
      }
      static from(schema, obj, ctx) {
        const { replacer } = ctx;
        const seq = new this(schema);
        if (obj && Symbol.iterator in Object(obj)) {
          let i = 0;
          for (let it of obj) {
            if (typeof replacer === "function") {
              const key = obj instanceof Set ? it : String(i++);
              it = replacer.call(obj, key, it);
            }
            seq.items.push(createNode.createNode(it, void 0, ctx));
          }
        }
        return seq;
      }
    };
    function asItemIndex(key) {
      let idx = identity.isScalar(key) ? key.value : key;
      if (idx && typeof idx === "string")
        idx = Number(idx);
      return typeof idx === "number" && Number.isInteger(idx) && idx >= 0 ? idx : null;
    }
    exports.YAMLSeq = YAMLSeq;
  }
});

// node_modules/yaml/dist/schema/common/seq.js
var require_seq = __commonJS({
  "node_modules/yaml/dist/schema/common/seq.js"(exports) {
    "use strict";
    var identity = require_identity();
    var YAMLSeq = require_YAMLSeq();
    var seq = {
      collection: "seq",
      default: true,
      nodeClass: YAMLSeq.YAMLSeq,
      tag: "tag:yaml.org,2002:seq",
      resolve(seq2, onError) {
        if (!identity.isSeq(seq2))
          onError("Expected a sequence for this tag");
        return seq2;
      },
      createNode: (schema, obj, ctx) => YAMLSeq.YAMLSeq.from(schema, obj, ctx)
    };
    exports.seq = seq;
  }
});

// node_modules/yaml/dist/schema/common/string.js
var require_string = __commonJS({
  "node_modules/yaml/dist/schema/common/string.js"(exports) {
    "use strict";
    var stringifyString = require_stringifyString();
    var string = {
      identify: (value) => typeof value === "string",
      default: true,
      tag: "tag:yaml.org,2002:str",
      resolve: (str3) => str3,
      stringify(item, ctx, onComment, onChompKeep) {
        ctx = Object.assign({ actualString: true }, ctx);
        return stringifyString.stringifyString(item, ctx, onComment, onChompKeep);
      }
    };
    exports.string = string;
  }
});

// node_modules/yaml/dist/schema/common/null.js
var require_null = __commonJS({
  "node_modules/yaml/dist/schema/common/null.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    var nullTag = {
      identify: (value) => value == null,
      createNode: () => new Scalar.Scalar(null),
      default: true,
      tag: "tag:yaml.org,2002:null",
      test: /^(?:~|[Nn]ull|NULL)?$/,
      resolve: () => new Scalar.Scalar(null),
      stringify: ({ source }, ctx) => typeof source === "string" && nullTag.test.test(source) ? source : ctx.options.nullStr
    };
    exports.nullTag = nullTag;
  }
});

// node_modules/yaml/dist/schema/core/bool.js
var require_bool = __commonJS({
  "node_modules/yaml/dist/schema/core/bool.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    var boolTag = {
      identify: (value) => typeof value === "boolean",
      default: true,
      tag: "tag:yaml.org,2002:bool",
      test: /^(?:[Tt]rue|TRUE|[Ff]alse|FALSE)$/,
      resolve: (str3) => new Scalar.Scalar(str3[0] === "t" || str3[0] === "T"),
      stringify({ source, value }, ctx) {
        if (source && boolTag.test.test(source)) {
          const sv = source[0] === "t" || source[0] === "T";
          if (value === sv)
            return source;
        }
        return value ? ctx.options.trueStr : ctx.options.falseStr;
      }
    };
    exports.boolTag = boolTag;
  }
});

// node_modules/yaml/dist/stringify/stringifyNumber.js
var require_stringifyNumber = __commonJS({
  "node_modules/yaml/dist/stringify/stringifyNumber.js"(exports) {
    "use strict";
    function stringifyNumber({ format, minFractionDigits, tag, value }) {
      if (typeof value === "bigint")
        return String(value);
      const num = typeof value === "number" ? value : Number(value);
      if (!isFinite(num))
        return isNaN(num) ? ".nan" : num < 0 ? "-.inf" : ".inf";
      let n = Object.is(value, -0) ? "-0" : JSON.stringify(value);
      if (!format && minFractionDigits && (!tag || tag === "tag:yaml.org,2002:float") && /^-?\d/.test(n) && !n.includes("e")) {
        let i = n.indexOf(".");
        if (i < 0) {
          i = n.length;
          n += ".";
        }
        let d = minFractionDigits - (n.length - i - 1);
        while (d-- > 0)
          n += "0";
      }
      return n;
    }
    exports.stringifyNumber = stringifyNumber;
  }
});

// node_modules/yaml/dist/schema/core/float.js
var require_float = __commonJS({
  "node_modules/yaml/dist/schema/core/float.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    var stringifyNumber = require_stringifyNumber();
    var floatNaN = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      test: /^(?:[-+]?\.(?:inf|Inf|INF)|\.nan|\.NaN|\.NAN)$/,
      resolve: (str3) => str3.slice(-3).toLowerCase() === "nan" ? NaN : str3[0] === "-" ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY,
      stringify: stringifyNumber.stringifyNumber
    };
    var floatExp = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      format: "EXP",
      test: /^[-+]?(?:\.[0-9]+|[0-9]+(?:\.[0-9]*)?)[eE][-+]?[0-9]+$/,
      resolve: (str3) => parseFloat(str3),
      stringify(node) {
        const num = Number(node.value);
        return isFinite(num) ? num.toExponential() : stringifyNumber.stringifyNumber(node);
      }
    };
    var float = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      test: /^[-+]?(?:\.[0-9]+|[0-9]+\.[0-9]*)$/,
      resolve(str3) {
        const node = new Scalar.Scalar(parseFloat(str3));
        const dot = str3.indexOf(".");
        if (dot !== -1 && str3[str3.length - 1] === "0")
          node.minFractionDigits = str3.length - dot - 1;
        return node;
      },
      stringify: stringifyNumber.stringifyNumber
    };
    exports.float = float;
    exports.floatExp = floatExp;
    exports.floatNaN = floatNaN;
  }
});

// node_modules/yaml/dist/schema/core/int.js
var require_int = __commonJS({
  "node_modules/yaml/dist/schema/core/int.js"(exports) {
    "use strict";
    var stringifyNumber = require_stringifyNumber();
    var intIdentify = (value) => typeof value === "bigint" || Number.isInteger(value);
    var intResolve = (str3, offset, radix, { intAsBigInt }) => intAsBigInt ? BigInt(str3) : parseInt(str3.substring(offset), radix);
    function intStringify(node, radix, prefix) {
      const { value } = node;
      if (intIdentify(value) && value >= 0)
        return prefix + value.toString(radix);
      return stringifyNumber.stringifyNumber(node);
    }
    var intOct = {
      identify: (value) => intIdentify(value) && value >= 0,
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "OCT",
      test: /^0o[0-7]+$/,
      resolve: (str3, _onError, opt) => intResolve(str3, 2, 8, opt),
      stringify: (node) => intStringify(node, 8, "0o")
    };
    var int2 = {
      identify: intIdentify,
      default: true,
      tag: "tag:yaml.org,2002:int",
      test: /^[-+]?[0-9]+$/,
      resolve: (str3, _onError, opt) => intResolve(str3, 0, 10, opt),
      stringify: stringifyNumber.stringifyNumber
    };
    var intHex = {
      identify: (value) => intIdentify(value) && value >= 0,
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "HEX",
      test: /^0x[0-9a-fA-F]+$/,
      resolve: (str3, _onError, opt) => intResolve(str3, 2, 16, opt),
      stringify: (node) => intStringify(node, 16, "0x")
    };
    exports.int = int2;
    exports.intHex = intHex;
    exports.intOct = intOct;
  }
});

// node_modules/yaml/dist/schema/core/schema.js
var require_schema = __commonJS({
  "node_modules/yaml/dist/schema/core/schema.js"(exports) {
    "use strict";
    var map = require_map();
    var _null = require_null();
    var seq = require_seq();
    var string = require_string();
    var bool2 = require_bool();
    var float = require_float();
    var int2 = require_int();
    var schema = [
      map.map,
      seq.seq,
      string.string,
      _null.nullTag,
      bool2.boolTag,
      int2.intOct,
      int2.int,
      int2.intHex,
      float.floatNaN,
      float.floatExp,
      float.float
    ];
    exports.schema = schema;
  }
});

// node_modules/yaml/dist/schema/json/schema.js
var require_schema2 = __commonJS({
  "node_modules/yaml/dist/schema/json/schema.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    var map = require_map();
    var seq = require_seq();
    function intIdentify(value) {
      return typeof value === "bigint" || Number.isInteger(value);
    }
    var stringifyJSON = ({ value }) => JSON.stringify(value);
    var jsonScalars = [
      {
        identify: (value) => typeof value === "string",
        default: true,
        tag: "tag:yaml.org,2002:str",
        resolve: (str3) => str3,
        stringify: stringifyJSON
      },
      {
        identify: (value) => value == null,
        createNode: () => new Scalar.Scalar(null),
        default: true,
        tag: "tag:yaml.org,2002:null",
        test: /^null$/,
        resolve: () => null,
        stringify: stringifyJSON
      },
      {
        identify: (value) => typeof value === "boolean",
        default: true,
        tag: "tag:yaml.org,2002:bool",
        test: /^true$|^false$/,
        resolve: (str3) => str3 === "true",
        stringify: stringifyJSON
      },
      {
        identify: intIdentify,
        default: true,
        tag: "tag:yaml.org,2002:int",
        test: /^-?(?:0|[1-9][0-9]*)$/,
        resolve: (str3, _onError, { intAsBigInt }) => intAsBigInt ? BigInt(str3) : parseInt(str3, 10),
        stringify: ({ value }) => intIdentify(value) ? value.toString() : JSON.stringify(value)
      },
      {
        identify: (value) => typeof value === "number",
        default: true,
        tag: "tag:yaml.org,2002:float",
        test: /^-?(?:0|[1-9][0-9]*)(?:\.[0-9]*)?(?:[eE][-+]?[0-9]+)?$/,
        resolve: (str3) => parseFloat(str3),
        stringify: stringifyJSON
      }
    ];
    var jsonError = {
      default: true,
      tag: "",
      test: /^/,
      resolve(str3, onError) {
        onError(`Unresolved plain scalar ${JSON.stringify(str3)}`);
        return str3;
      }
    };
    var schema = [map.map, seq.seq].concat(jsonScalars, jsonError);
    exports.schema = schema;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/binary.js
var require_binary = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/binary.js"(exports) {
    "use strict";
    var node_buffer = __require("buffer");
    var Scalar = require_Scalar();
    var stringifyString = require_stringifyString();
    var binary = {
      identify: (value) => value instanceof Uint8Array,
      // Buffer inherits from Uint8Array
      default: false,
      tag: "tag:yaml.org,2002:binary",
      /**
       * Returns a Buffer in node and an Uint8Array in browsers
       *
       * To use the resulting buffer as an image, you'll want to do something like:
       *
       *   const blob = new Blob([buffer], { type: 'image/jpeg' })
       *   document.querySelector('#photo').src = URL.createObjectURL(blob)
       */
      resolve(src, onError) {
        if (typeof node_buffer.Buffer === "function") {
          return node_buffer.Buffer.from(src, "base64");
        } else if (typeof atob === "function") {
          const str3 = atob(src.replace(/[\n\r]/g, ""));
          const buffer = new Uint8Array(str3.length);
          for (let i = 0; i < str3.length; ++i)
            buffer[i] = str3.charCodeAt(i);
          return buffer;
        } else {
          onError("This environment does not support reading binary tags; either Buffer or atob is required");
          return src;
        }
      },
      stringify({ comment, type, value }, ctx, onComment, onChompKeep) {
        if (!value)
          return "";
        const buf = value;
        let str3;
        if (typeof node_buffer.Buffer === "function") {
          str3 = buf instanceof node_buffer.Buffer ? buf.toString("base64") : node_buffer.Buffer.from(buf.buffer).toString("base64");
        } else if (typeof btoa === "function") {
          let s2 = "";
          for (let i = 0; i < buf.length; ++i)
            s2 += String.fromCharCode(buf[i]);
          str3 = btoa(s2);
        } else {
          throw new Error("This environment does not support writing binary tags; either Buffer or btoa is required");
        }
        type ?? (type = Scalar.Scalar.BLOCK_LITERAL);
        if (type !== Scalar.Scalar.QUOTE_DOUBLE) {
          const lineWidth = Math.max(ctx.options.lineWidth - ctx.indent.length, ctx.options.minContentWidth);
          const n = Math.ceil(str3.length / lineWidth);
          const lines = new Array(n);
          for (let i = 0, o = 0; i < n; ++i, o += lineWidth) {
            lines[i] = str3.substr(o, lineWidth);
          }
          str3 = lines.join(type === Scalar.Scalar.BLOCK_LITERAL ? "\n" : " ");
        }
        return stringifyString.stringifyString({ comment, type, value: str3 }, ctx, onComment, onChompKeep);
      }
    };
    exports.binary = binary;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/pairs.js
var require_pairs = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/pairs.js"(exports) {
    "use strict";
    var identity = require_identity();
    var Pair = require_Pair();
    var Scalar = require_Scalar();
    var YAMLSeq = require_YAMLSeq();
    function resolvePairs(seq, onError) {
      if (identity.isSeq(seq)) {
        for (let i = 0; i < seq.items.length; ++i) {
          let item = seq.items[i];
          if (identity.isPair(item))
            continue;
          else if (identity.isMap(item)) {
            if (item.items.length > 1)
              onError("Each pair must have its own sequence indicator");
            const pair = item.items[0] || new Pair.Pair(new Scalar.Scalar(null));
            if (item.commentBefore)
              pair.key.commentBefore = pair.key.commentBefore ? `${item.commentBefore}
${pair.key.commentBefore}` : item.commentBefore;
            if (item.comment) {
              const cn = pair.value ?? pair.key;
              cn.comment = cn.comment ? `${item.comment}
${cn.comment}` : item.comment;
            }
            item = pair;
          }
          seq.items[i] = identity.isPair(item) ? item : new Pair.Pair(item);
        }
      } else
        onError("Expected a sequence for this tag");
      return seq;
    }
    function createPairs(schema, iterable, ctx) {
      const { replacer } = ctx;
      const pairs2 = new YAMLSeq.YAMLSeq(schema);
      pairs2.tag = "tag:yaml.org,2002:pairs";
      let i = 0;
      if (iterable && Symbol.iterator in Object(iterable))
        for (let it of iterable) {
          if (typeof replacer === "function")
            it = replacer.call(iterable, String(i++), it);
          let key, value;
          if (Array.isArray(it)) {
            if (it.length === 2) {
              key = it[0];
              value = it[1];
            } else
              throw new TypeError(`Expected [key, value] tuple: ${it}`);
          } else if (it && it instanceof Object) {
            const keys = Object.keys(it);
            if (keys.length === 1) {
              key = keys[0];
              value = it[key];
            } else {
              throw new TypeError(`Expected tuple with one key, not ${keys.length} keys`);
            }
          } else {
            key = it;
          }
          pairs2.items.push(Pair.createPair(key, value, ctx));
        }
      return pairs2;
    }
    var pairs = {
      collection: "seq",
      default: false,
      tag: "tag:yaml.org,2002:pairs",
      resolve: resolvePairs,
      createNode: createPairs
    };
    exports.createPairs = createPairs;
    exports.pairs = pairs;
    exports.resolvePairs = resolvePairs;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/omap.js
var require_omap = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/omap.js"(exports) {
    "use strict";
    var identity = require_identity();
    var toJS = require_toJS();
    var YAMLMap = require_YAMLMap();
    var YAMLSeq = require_YAMLSeq();
    var pairs = require_pairs();
    var YAMLOMap = class _YAMLOMap extends YAMLSeq.YAMLSeq {
      constructor() {
        super();
        this.add = YAMLMap.YAMLMap.prototype.add.bind(this);
        this.delete = YAMLMap.YAMLMap.prototype.delete.bind(this);
        this.get = YAMLMap.YAMLMap.prototype.get.bind(this);
        this.has = YAMLMap.YAMLMap.prototype.has.bind(this);
        this.set = YAMLMap.YAMLMap.prototype.set.bind(this);
        this.tag = _YAMLOMap.tag;
      }
      /**
       * If `ctx` is given, the return type is actually `Map<unknown, unknown>`,
       * but TypeScript won't allow widening the signature of a child method.
       */
      toJSON(_, ctx) {
        if (!ctx)
          return super.toJSON(_);
        const map = /* @__PURE__ */ new Map();
        if (ctx?.onCreate)
          ctx.onCreate(map);
        for (const pair of this.items) {
          let key, value;
          if (identity.isPair(pair)) {
            key = toJS.toJS(pair.key, "", ctx);
            value = toJS.toJS(pair.value, key, ctx);
          } else {
            key = toJS.toJS(pair, "", ctx);
          }
          if (map.has(key))
            throw new Error("Ordered maps must not include duplicate keys");
          map.set(key, value);
        }
        return map;
      }
      static from(schema, iterable, ctx) {
        const pairs$1 = pairs.createPairs(schema, iterable, ctx);
        const omap2 = new this();
        omap2.items = pairs$1.items;
        return omap2;
      }
    };
    YAMLOMap.tag = "tag:yaml.org,2002:omap";
    var omap = {
      collection: "seq",
      identify: (value) => value instanceof Map,
      nodeClass: YAMLOMap,
      default: false,
      tag: "tag:yaml.org,2002:omap",
      resolve(seq, onError) {
        const pairs$1 = pairs.resolvePairs(seq, onError);
        const seenKeys = [];
        for (const { key } of pairs$1.items) {
          if (identity.isScalar(key)) {
            if (seenKeys.includes(key.value)) {
              onError(`Ordered maps must not include duplicate keys: ${key.value}`);
            } else {
              seenKeys.push(key.value);
            }
          }
        }
        return Object.assign(new YAMLOMap(), pairs$1);
      },
      createNode: (schema, iterable, ctx) => YAMLOMap.from(schema, iterable, ctx)
    };
    exports.YAMLOMap = YAMLOMap;
    exports.omap = omap;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/bool.js
var require_bool2 = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/bool.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    function boolStringify({ value, source }, ctx) {
      const boolObj = value ? trueTag : falseTag;
      if (source && boolObj.test.test(source))
        return source;
      return value ? ctx.options.trueStr : ctx.options.falseStr;
    }
    var trueTag = {
      identify: (value) => value === true,
      default: true,
      tag: "tag:yaml.org,2002:bool",
      test: /^(?:Y|y|[Yy]es|YES|[Tt]rue|TRUE|[Oo]n|ON)$/,
      resolve: () => new Scalar.Scalar(true),
      stringify: boolStringify
    };
    var falseTag = {
      identify: (value) => value === false,
      default: true,
      tag: "tag:yaml.org,2002:bool",
      test: /^(?:N|n|[Nn]o|NO|[Ff]alse|FALSE|[Oo]ff|OFF)$/,
      resolve: () => new Scalar.Scalar(false),
      stringify: boolStringify
    };
    exports.falseTag = falseTag;
    exports.trueTag = trueTag;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/float.js
var require_float2 = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/float.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    var stringifyNumber = require_stringifyNumber();
    var floatNaN = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      test: /^(?:[-+]?\.(?:inf|Inf|INF)|\.nan|\.NaN|\.NAN)$/,
      resolve: (str3) => str3.slice(-3).toLowerCase() === "nan" ? NaN : str3[0] === "-" ? Number.NEGATIVE_INFINITY : Number.POSITIVE_INFINITY,
      stringify: stringifyNumber.stringifyNumber
    };
    var floatExp = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      format: "EXP",
      test: /^[-+]?(?:[0-9][0-9_]*)?(?:\.[0-9_]*)?[eE][-+]?[0-9]+$/,
      resolve: (str3) => parseFloat(str3.replace(/_/g, "")),
      stringify(node) {
        const num = Number(node.value);
        return isFinite(num) ? num.toExponential() : stringifyNumber.stringifyNumber(node);
      }
    };
    var float = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      test: /^[-+]?(?:[0-9][0-9_]*)?\.[0-9_]*$/,
      resolve(str3) {
        const node = new Scalar.Scalar(parseFloat(str3.replace(/_/g, "")));
        const dot = str3.indexOf(".");
        if (dot !== -1) {
          const f = str3.substring(dot + 1).replace(/_/g, "");
          if (f[f.length - 1] === "0")
            node.minFractionDigits = f.length;
        }
        return node;
      },
      stringify: stringifyNumber.stringifyNumber
    };
    exports.float = float;
    exports.floatExp = floatExp;
    exports.floatNaN = floatNaN;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/int.js
var require_int2 = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/int.js"(exports) {
    "use strict";
    var stringifyNumber = require_stringifyNumber();
    var intIdentify = (value) => typeof value === "bigint" || Number.isInteger(value);
    function intResolve(str3, offset, radix, { intAsBigInt }) {
      const sign = str3[0];
      if (sign === "-" || sign === "+")
        offset += 1;
      str3 = str3.substring(offset).replace(/_/g, "");
      if (intAsBigInt) {
        switch (radix) {
          case 2:
            str3 = `0b${str3}`;
            break;
          case 8:
            str3 = `0o${str3}`;
            break;
          case 16:
            str3 = `0x${str3}`;
            break;
        }
        const n2 = BigInt(str3);
        return sign === "-" ? BigInt(-1) * n2 : n2;
      }
      const n = parseInt(str3, radix);
      return sign === "-" ? -1 * n : n;
    }
    function intStringify(node, radix, prefix) {
      const { value } = node;
      if (intIdentify(value)) {
        const str3 = value.toString(radix);
        return value < 0 ? "-" + prefix + str3.substr(1) : prefix + str3;
      }
      return stringifyNumber.stringifyNumber(node);
    }
    var intBin = {
      identify: intIdentify,
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "BIN",
      test: /^[-+]?0b[0-1_]+$/,
      resolve: (str3, _onError, opt) => intResolve(str3, 2, 2, opt),
      stringify: (node) => intStringify(node, 2, "0b")
    };
    var intOct = {
      identify: intIdentify,
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "OCT",
      test: /^[-+]?0[0-7_]+$/,
      resolve: (str3, _onError, opt) => intResolve(str3, 1, 8, opt),
      stringify: (node) => intStringify(node, 8, "0")
    };
    var int2 = {
      identify: intIdentify,
      default: true,
      tag: "tag:yaml.org,2002:int",
      test: /^[-+]?[0-9][0-9_]*$/,
      resolve: (str3, _onError, opt) => intResolve(str3, 0, 10, opt),
      stringify: stringifyNumber.stringifyNumber
    };
    var intHex = {
      identify: intIdentify,
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "HEX",
      test: /^[-+]?0x[0-9a-fA-F_]+$/,
      resolve: (str3, _onError, opt) => intResolve(str3, 2, 16, opt),
      stringify: (node) => intStringify(node, 16, "0x")
    };
    exports.int = int2;
    exports.intBin = intBin;
    exports.intHex = intHex;
    exports.intOct = intOct;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/set.js
var require_set = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/set.js"(exports) {
    "use strict";
    var identity = require_identity();
    var Pair = require_Pair();
    var YAMLMap = require_YAMLMap();
    var YAMLSet = class _YAMLSet extends YAMLMap.YAMLMap {
      constructor(schema) {
        super(schema);
        this.tag = _YAMLSet.tag;
      }
      add(key) {
        let pair;
        if (identity.isPair(key))
          pair = key;
        else if (key && typeof key === "object" && "key" in key && "value" in key && key.value === null)
          pair = new Pair.Pair(key.key, null);
        else
          pair = new Pair.Pair(key, null);
        const prev = YAMLMap.findPair(this.items, pair.key);
        if (!prev)
          this.items.push(pair);
      }
      /**
       * If `keepPair` is `true`, returns the Pair matching `key`.
       * Otherwise, returns the value of that Pair's key.
       */
      get(key, keepPair) {
        const pair = YAMLMap.findPair(this.items, key);
        return !keepPair && identity.isPair(pair) ? identity.isScalar(pair.key) ? pair.key.value : pair.key : pair;
      }
      set(key, value) {
        if (typeof value !== "boolean")
          throw new Error(`Expected boolean value for set(key, value) in a YAML set, not ${typeof value}`);
        const prev = YAMLMap.findPair(this.items, key);
        if (prev && !value) {
          this.items.splice(this.items.indexOf(prev), 1);
        } else if (!prev && value) {
          this.items.push(new Pair.Pair(key));
        }
      }
      toJSON(_, ctx) {
        return super.toJSON(_, ctx, Set);
      }
      toString(ctx, onComment, onChompKeep) {
        if (!ctx)
          return JSON.stringify(this);
        if (this.hasAllNullValues(true))
          return super.toString(Object.assign({}, ctx, { allNullValues: true }), onComment, onChompKeep);
        else
          throw new Error("Set items must all have null values");
      }
      static from(schema, iterable, ctx) {
        const { replacer } = ctx;
        const set2 = new this(schema);
        if (iterable && Symbol.iterator in Object(iterable))
          for (let value of iterable) {
            if (typeof replacer === "function")
              value = replacer.call(iterable, value, value);
            set2.items.push(Pair.createPair(value, null, ctx));
          }
        return set2;
      }
    };
    YAMLSet.tag = "tag:yaml.org,2002:set";
    var set = {
      collection: "map",
      identify: (value) => value instanceof Set,
      nodeClass: YAMLSet,
      default: false,
      tag: "tag:yaml.org,2002:set",
      createNode: (schema, iterable, ctx) => YAMLSet.from(schema, iterable, ctx),
      resolve(map, onError) {
        if (identity.isMap(map)) {
          if (map.hasAllNullValues(true))
            return Object.assign(new YAMLSet(), map);
          else
            onError("Set items must all have null values");
        } else
          onError("Expected a mapping for this tag");
        return map;
      }
    };
    exports.YAMLSet = YAMLSet;
    exports.set = set;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/timestamp.js
var require_timestamp = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/timestamp.js"(exports) {
    "use strict";
    var stringifyNumber = require_stringifyNumber();
    function parseSexagesimal(str3, asBigInt) {
      const sign = str3[0];
      const parts = sign === "-" || sign === "+" ? str3.substring(1) : str3;
      const num = (n) => asBigInt ? BigInt(n) : Number(n);
      const res = parts.replace(/_/g, "").split(":").reduce((res2, p) => res2 * num(60) + num(p), num(0));
      return sign === "-" ? num(-1) * res : res;
    }
    function stringifySexagesimal(node) {
      let { value } = node;
      let num = (n) => n;
      if (typeof value === "bigint")
        num = (n) => BigInt(n);
      else if (isNaN(value) || !isFinite(value))
        return stringifyNumber.stringifyNumber(node);
      let sign = "";
      if (value < 0) {
        sign = "-";
        value *= num(-1);
      }
      const _60 = num(60);
      const parts = [value % _60];
      if (value < 60) {
        parts.unshift(0);
      } else {
        value = (value - parts[0]) / _60;
        parts.unshift(value % _60);
        if (value >= 60) {
          value = (value - parts[0]) / _60;
          parts.unshift(value);
        }
      }
      return sign + parts.map((n) => String(n).padStart(2, "0")).join(":").replace(/000000\d*$/, "");
    }
    var intTime = {
      identify: (value) => typeof value === "bigint" || Number.isInteger(value),
      default: true,
      tag: "tag:yaml.org,2002:int",
      format: "TIME",
      test: /^[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+$/,
      resolve: (str3, _onError, { intAsBigInt }) => parseSexagesimal(str3, intAsBigInt),
      stringify: stringifySexagesimal
    };
    var floatTime = {
      identify: (value) => typeof value === "number",
      default: true,
      tag: "tag:yaml.org,2002:float",
      format: "TIME",
      test: /^[-+]?[0-9][0-9_]*(?::[0-5]?[0-9])+\.[0-9_]*$/,
      resolve: (str3) => parseSexagesimal(str3, false),
      stringify: stringifySexagesimal
    };
    var timestamp = {
      identify: (value) => value instanceof Date,
      default: true,
      tag: "tag:yaml.org,2002:timestamp",
      // If the time zone is omitted, the timestamp is assumed to be specified in UTC. The time part
      // may be omitted altogether, resulting in a date format. In such a case, the time part is
      // assumed to be 00:00:00Z (start of day, UTC).
      test: RegExp("^([0-9]{4})-([0-9]{1,2})-([0-9]{1,2})(?:(?:t|T|[ \\t]+)([0-9]{1,2}):([0-9]{1,2}):([0-9]{1,2}(\\.[0-9]+)?)(?:[ \\t]*(Z|[-+][012]?[0-9](?::[0-9]{2})?))?)?$"),
      resolve(str3) {
        const match = str3.match(timestamp.test);
        if (!match)
          throw new Error("!!timestamp expects a date, starting with yyyy-mm-dd");
        const [, year, month, day, hour, minute, second] = match.map(Number);
        const millisec = match[7] ? Number((match[7] + "00").substr(1, 3)) : 0;
        let date = Date.UTC(year, month - 1, day, hour || 0, minute || 0, second || 0, millisec);
        const tz = match[8];
        if (tz && tz !== "Z") {
          let d = parseSexagesimal(tz, false);
          if (Math.abs(d) < 30)
            d *= 60;
          date -= 6e4 * d;
        }
        return new Date(date);
      },
      stringify: ({ value }) => value?.toISOString().replace(/(T00:00:00)?\.000Z$/, "") ?? ""
    };
    exports.floatTime = floatTime;
    exports.intTime = intTime;
    exports.timestamp = timestamp;
  }
});

// node_modules/yaml/dist/schema/yaml-1.1/schema.js
var require_schema3 = __commonJS({
  "node_modules/yaml/dist/schema/yaml-1.1/schema.js"(exports) {
    "use strict";
    var map = require_map();
    var _null = require_null();
    var seq = require_seq();
    var string = require_string();
    var binary = require_binary();
    var bool2 = require_bool2();
    var float = require_float2();
    var int2 = require_int2();
    var merge = require_merge();
    var omap = require_omap();
    var pairs = require_pairs();
    var set = require_set();
    var timestamp = require_timestamp();
    var schema = [
      map.map,
      seq.seq,
      string.string,
      _null.nullTag,
      bool2.trueTag,
      bool2.falseTag,
      int2.intBin,
      int2.intOct,
      int2.int,
      int2.intHex,
      float.floatNaN,
      float.floatExp,
      float.float,
      binary.binary,
      merge.merge,
      omap.omap,
      pairs.pairs,
      set.set,
      timestamp.intTime,
      timestamp.floatTime,
      timestamp.timestamp
    ];
    exports.schema = schema;
  }
});

// node_modules/yaml/dist/schema/tags.js
var require_tags = __commonJS({
  "node_modules/yaml/dist/schema/tags.js"(exports) {
    "use strict";
    var map = require_map();
    var _null = require_null();
    var seq = require_seq();
    var string = require_string();
    var bool2 = require_bool();
    var float = require_float();
    var int2 = require_int();
    var schema = require_schema();
    var schema$1 = require_schema2();
    var binary = require_binary();
    var merge = require_merge();
    var omap = require_omap();
    var pairs = require_pairs();
    var schema$2 = require_schema3();
    var set = require_set();
    var timestamp = require_timestamp();
    var schemas = /* @__PURE__ */ new Map([
      ["core", schema.schema],
      ["failsafe", [map.map, seq.seq, string.string]],
      ["json", schema$1.schema],
      ["yaml11", schema$2.schema],
      ["yaml-1.1", schema$2.schema]
    ]);
    var tagsByName = {
      binary: binary.binary,
      bool: bool2.boolTag,
      float: float.float,
      floatExp: float.floatExp,
      floatNaN: float.floatNaN,
      floatTime: timestamp.floatTime,
      int: int2.int,
      intHex: int2.intHex,
      intOct: int2.intOct,
      intTime: timestamp.intTime,
      map: map.map,
      merge: merge.merge,
      null: _null.nullTag,
      omap: omap.omap,
      pairs: pairs.pairs,
      seq: seq.seq,
      set: set.set,
      timestamp: timestamp.timestamp
    };
    var coreKnownTags = {
      "tag:yaml.org,2002:binary": binary.binary,
      "tag:yaml.org,2002:merge": merge.merge,
      "tag:yaml.org,2002:omap": omap.omap,
      "tag:yaml.org,2002:pairs": pairs.pairs,
      "tag:yaml.org,2002:set": set.set,
      "tag:yaml.org,2002:timestamp": timestamp.timestamp
    };
    function getTags(customTags, schemaName, addMergeTag) {
      const schemaTags = schemas.get(schemaName);
      if (schemaTags && !customTags) {
        return addMergeTag && !schemaTags.includes(merge.merge) ? schemaTags.concat(merge.merge) : schemaTags.slice();
      }
      let tags = schemaTags;
      if (!tags) {
        if (Array.isArray(customTags))
          tags = [];
        else {
          const keys = Array.from(schemas.keys()).filter((key) => key !== "yaml11").map((key) => JSON.stringify(key)).join(", ");
          throw new Error(`Unknown schema "${schemaName}"; use one of ${keys} or define customTags array`);
        }
      }
      if (Array.isArray(customTags)) {
        for (const tag of customTags)
          tags = tags.concat(tag);
      } else if (typeof customTags === "function") {
        tags = customTags(tags.slice());
      }
      if (addMergeTag)
        tags = tags.concat(merge.merge);
      return tags.reduce((tags2, tag) => {
        const tagObj = typeof tag === "string" ? tagsByName[tag] : tag;
        if (!tagObj) {
          const tagName = JSON.stringify(tag);
          const keys = Object.keys(tagsByName).map((key) => JSON.stringify(key)).join(", ");
          throw new Error(`Unknown custom tag ${tagName}; use one of ${keys}`);
        }
        if (!tags2.includes(tagObj))
          tags2.push(tagObj);
        return tags2;
      }, []);
    }
    exports.coreKnownTags = coreKnownTags;
    exports.getTags = getTags;
  }
});

// node_modules/yaml/dist/schema/Schema.js
var require_Schema = __commonJS({
  "node_modules/yaml/dist/schema/Schema.js"(exports) {
    "use strict";
    var identity = require_identity();
    var map = require_map();
    var seq = require_seq();
    var string = require_string();
    var tags = require_tags();
    var sortMapEntriesByKey = (a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0;
    var Schema = class _Schema {
      constructor({ compat, customTags, merge, resolveKnownTags, schema, sortMapEntries, toStringDefaults }) {
        this.compat = Array.isArray(compat) ? tags.getTags(compat, "compat") : compat ? tags.getTags(null, compat) : null;
        this.name = typeof schema === "string" && schema || "core";
        this.knownTags = resolveKnownTags ? tags.coreKnownTags : {};
        this.tags = tags.getTags(customTags, this.name, merge);
        this.toStringOptions = toStringDefaults ?? null;
        Object.defineProperty(this, identity.MAP, { value: map.map });
        Object.defineProperty(this, identity.SCALAR, { value: string.string });
        Object.defineProperty(this, identity.SEQ, { value: seq.seq });
        this.sortMapEntries = typeof sortMapEntries === "function" ? sortMapEntries : sortMapEntries === true ? sortMapEntriesByKey : null;
      }
      clone() {
        const copy = Object.create(_Schema.prototype, Object.getOwnPropertyDescriptors(this));
        copy.tags = this.tags.slice();
        return copy;
      }
    };
    exports.Schema = Schema;
  }
});

// node_modules/yaml/dist/stringify/stringifyDocument.js
var require_stringifyDocument = __commonJS({
  "node_modules/yaml/dist/stringify/stringifyDocument.js"(exports) {
    "use strict";
    var identity = require_identity();
    var stringify = require_stringify();
    var stringifyComment = require_stringifyComment();
    function stringifyDocument(doc, options) {
      const lines = [];
      let hasDirectives = options.directives === true;
      if (options.directives !== false && doc.directives) {
        const dir = doc.directives.toString(doc);
        if (dir) {
          lines.push(dir);
          hasDirectives = true;
        } else if (doc.directives.docStart)
          hasDirectives = true;
      }
      if (hasDirectives)
        lines.push("---");
      const ctx = stringify.createStringifyContext(doc, options);
      const { commentString } = ctx.options;
      if (doc.commentBefore) {
        if (lines.length !== 1)
          lines.unshift("");
        const cs = commentString(doc.commentBefore);
        lines.unshift(stringifyComment.indentComment(cs, ""));
      }
      let chompKeep = false;
      let contentComment = null;
      if (doc.contents) {
        if (identity.isNode(doc.contents)) {
          if (doc.contents.spaceBefore && hasDirectives)
            lines.push("");
          if (doc.contents.commentBefore) {
            const cs = commentString(doc.contents.commentBefore);
            lines.push(stringifyComment.indentComment(cs, ""));
          }
          ctx.forceBlockIndent = !!doc.comment;
          contentComment = doc.contents.comment;
        }
        const onChompKeep = contentComment ? void 0 : () => chompKeep = true;
        let body = stringify.stringify(doc.contents, ctx, () => contentComment = null, onChompKeep);
        if (contentComment)
          body += stringifyComment.lineComment(body, "", commentString(contentComment));
        if ((body[0] === "|" || body[0] === ">") && lines[lines.length - 1] === "---") {
          lines[lines.length - 1] = `--- ${body}`;
        } else
          lines.push(body);
      } else {
        lines.push(stringify.stringify(doc.contents, ctx));
      }
      if (doc.directives?.docEnd) {
        if (doc.comment) {
          const cs = commentString(doc.comment);
          if (cs.includes("\n")) {
            lines.push("...");
            lines.push(stringifyComment.indentComment(cs, ""));
          } else {
            lines.push(`... ${cs}`);
          }
        } else {
          lines.push("...");
        }
      } else {
        let dc = doc.comment;
        if (dc && chompKeep)
          dc = dc.replace(/^\n+/, "");
        if (dc) {
          if ((!chompKeep || contentComment) && lines[lines.length - 1] !== "")
            lines.push("");
          lines.push(stringifyComment.indentComment(commentString(dc), ""));
        }
      }
      return lines.join("\n") + "\n";
    }
    exports.stringifyDocument = stringifyDocument;
  }
});

// node_modules/yaml/dist/doc/Document.js
var require_Document = __commonJS({
  "node_modules/yaml/dist/doc/Document.js"(exports) {
    "use strict";
    var Alias = require_Alias();
    var Collection = require_Collection();
    var identity = require_identity();
    var Pair = require_Pair();
    var toJS = require_toJS();
    var Schema = require_Schema();
    var stringifyDocument = require_stringifyDocument();
    var anchors = require_anchors();
    var applyReviver = require_applyReviver();
    var createNode = require_createNode();
    var directives = require_directives();
    var Document = class _Document {
      constructor(value, replacer, options) {
        this.commentBefore = null;
        this.comment = null;
        this.errors = [];
        this.warnings = [];
        Object.defineProperty(this, identity.NODE_TYPE, { value: identity.DOC });
        let _replacer = null;
        if (typeof replacer === "function" || Array.isArray(replacer)) {
          _replacer = replacer;
        } else if (options === void 0 && replacer) {
          options = replacer;
          replacer = void 0;
        }
        const opt = Object.assign({
          intAsBigInt: false,
          keepSourceTokens: false,
          logLevel: "warn",
          prettyErrors: true,
          strict: true,
          stringKeys: false,
          uniqueKeys: true,
          version: "1.2"
        }, options);
        this.options = opt;
        let { version } = opt;
        if (options?._directives) {
          this.directives = options._directives.atDocument();
          if (this.directives.yaml.explicit)
            version = this.directives.yaml.version;
        } else
          this.directives = new directives.Directives({ version });
        this.setSchema(version, options);
        this.contents = value === void 0 ? null : this.createNode(value, _replacer, options);
      }
      /**
       * Create a deep copy of this Document and its contents.
       *
       * Custom Node values that inherit from `Object` still refer to their original instances.
       */
      clone() {
        const copy = Object.create(_Document.prototype, {
          [identity.NODE_TYPE]: { value: identity.DOC }
        });
        copy.commentBefore = this.commentBefore;
        copy.comment = this.comment;
        copy.errors = this.errors.slice();
        copy.warnings = this.warnings.slice();
        copy.options = Object.assign({}, this.options);
        if (this.directives)
          copy.directives = this.directives.clone();
        copy.schema = this.schema.clone();
        copy.contents = identity.isNode(this.contents) ? this.contents.clone(copy.schema) : this.contents;
        if (this.range)
          copy.range = this.range.slice();
        return copy;
      }
      /** Adds a value to the document. */
      add(value) {
        if (assertCollection(this.contents))
          this.contents.add(value);
      }
      /** Adds a value to the document. */
      addIn(path13, value) {
        if (assertCollection(this.contents))
          this.contents.addIn(path13, value);
      }
      /**
       * Create a new `Alias` node, ensuring that the target `node` has the required anchor.
       *
       * If `node` already has an anchor, `name` is ignored.
       * Otherwise, the `node.anchor` value will be set to `name`,
       * or if an anchor with that name is already present in the document,
       * `name` will be used as a prefix for a new unique anchor.
       * If `name` is undefined, the generated anchor will use 'a' as a prefix.
       */
      createAlias(node, name) {
        if (!node.anchor) {
          const prev = anchors.anchorNames(this);
          node.anchor = // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
          !name || prev.has(name) ? anchors.findNewAnchor(name || "a", prev) : name;
        }
        return new Alias.Alias(node.anchor);
      }
      createNode(value, replacer, options) {
        let _replacer = void 0;
        if (typeof replacer === "function") {
          value = replacer.call({ "": value }, "", value);
          _replacer = replacer;
        } else if (Array.isArray(replacer)) {
          const keyToStr = (v) => typeof v === "number" || v instanceof String || v instanceof Number;
          const asStr = replacer.filter(keyToStr).map(String);
          if (asStr.length > 0)
            replacer = replacer.concat(asStr);
          _replacer = replacer;
        } else if (options === void 0 && replacer) {
          options = replacer;
          replacer = void 0;
        }
        const { aliasDuplicateObjects, anchorPrefix, flow, keepUndefined, onTagObj, tag } = options ?? {};
        const { onAnchor, setAnchors, sourceObjects } = anchors.createNodeAnchors(
          this,
          // eslint-disable-next-line @typescript-eslint/prefer-nullish-coalescing
          anchorPrefix || "a"
        );
        const ctx = {
          aliasDuplicateObjects: aliasDuplicateObjects ?? true,
          keepUndefined: keepUndefined ?? false,
          onAnchor,
          onTagObj,
          replacer: _replacer,
          schema: this.schema,
          sourceObjects
        };
        const node = createNode.createNode(value, tag, ctx);
        if (flow && identity.isCollection(node))
          node.flow = true;
        setAnchors();
        return node;
      }
      /**
       * Convert a key and a value into a `Pair` using the current schema,
       * recursively wrapping all values as `Scalar` or `Collection` nodes.
       */
      createPair(key, value, options = {}) {
        const k = this.createNode(key, null, options);
        const v = this.createNode(value, null, options);
        return new Pair.Pair(k, v);
      }
      /**
       * Removes a value from the document.
       * @returns `true` if the item was found and removed.
       */
      delete(key) {
        return assertCollection(this.contents) ? this.contents.delete(key) : false;
      }
      /**
       * Removes a value from the document.
       * @returns `true` if the item was found and removed.
       */
      deleteIn(path13) {
        if (Collection.isEmptyPath(path13)) {
          if (this.contents == null)
            return false;
          this.contents = null;
          return true;
        }
        return assertCollection(this.contents) ? this.contents.deleteIn(path13) : false;
      }
      /**
       * Returns item at `key`, or `undefined` if not found. By default unwraps
       * scalar values from their surrounding node; to disable set `keepScalar` to
       * `true` (collections are always returned intact).
       */
      get(key, keepScalar) {
        return identity.isCollection(this.contents) ? this.contents.get(key, keepScalar) : void 0;
      }
      /**
       * Returns item at `path`, or `undefined` if not found. By default unwraps
       * scalar values from their surrounding node; to disable set `keepScalar` to
       * `true` (collections are always returned intact).
       */
      getIn(path13, keepScalar) {
        if (Collection.isEmptyPath(path13))
          return !keepScalar && identity.isScalar(this.contents) ? this.contents.value : this.contents;
        return identity.isCollection(this.contents) ? this.contents.getIn(path13, keepScalar) : void 0;
      }
      /**
       * Checks if the document includes a value with the key `key`.
       */
      has(key) {
        return identity.isCollection(this.contents) ? this.contents.has(key) : false;
      }
      /**
       * Checks if the document includes a value at `path`.
       */
      hasIn(path13) {
        if (Collection.isEmptyPath(path13))
          return this.contents !== void 0;
        return identity.isCollection(this.contents) ? this.contents.hasIn(path13) : false;
      }
      /**
       * Sets a value in this document. For `!!set`, `value` needs to be a
       * boolean to add/remove the item from the set.
       */
      set(key, value) {
        if (this.contents == null) {
          this.contents = Collection.collectionFromPath(this.schema, [key], value);
        } else if (assertCollection(this.contents)) {
          this.contents.set(key, value);
        }
      }
      /**
       * Sets a value in this document. For `!!set`, `value` needs to be a
       * boolean to add/remove the item from the set.
       */
      setIn(path13, value) {
        if (Collection.isEmptyPath(path13)) {
          this.contents = value;
        } else if (this.contents == null) {
          this.contents = Collection.collectionFromPath(this.schema, Array.from(path13), value);
        } else if (assertCollection(this.contents)) {
          this.contents.setIn(path13, value);
        }
      }
      /**
       * Change the YAML version and schema used by the document.
       * A `null` version disables support for directives, explicit tags, anchors, and aliases.
       * It also requires the `schema` option to be given as a `Schema` instance value.
       *
       * Overrides all previously set schema options.
       */
      setSchema(version, options = {}) {
        if (typeof version === "number")
          version = String(version);
        let opt;
        switch (version) {
          case "1.1":
            if (this.directives)
              this.directives.yaml.version = "1.1";
            else
              this.directives = new directives.Directives({ version: "1.1" });
            opt = { resolveKnownTags: false, schema: "yaml-1.1" };
            break;
          case "1.2":
          case "next":
            if (this.directives)
              this.directives.yaml.version = version;
            else
              this.directives = new directives.Directives({ version });
            opt = { resolveKnownTags: true, schema: "core" };
            break;
          case null:
            if (this.directives)
              delete this.directives;
            opt = null;
            break;
          default: {
            const sv = JSON.stringify(version);
            throw new Error(`Expected '1.1', '1.2' or null as first argument, but found: ${sv}`);
          }
        }
        if (options.schema instanceof Object)
          this.schema = options.schema;
        else if (opt)
          this.schema = new Schema.Schema(Object.assign(opt, options));
        else
          throw new Error(`With a null YAML version, the { schema: Schema } option is required`);
      }
      // json & jsonArg are only used from toJSON()
      toJS({ json, jsonArg, mapAsMap, maxAliasCount, onAnchor, reviver } = {}) {
        const ctx = {
          anchors: /* @__PURE__ */ new Map(),
          doc: this,
          keep: !json,
          mapAsMap: mapAsMap === true,
          mapKeyWarned: false,
          maxAliasCount: typeof maxAliasCount === "number" ? maxAliasCount : 100
        };
        const res = toJS.toJS(this.contents, jsonArg ?? "", ctx);
        if (typeof onAnchor === "function")
          for (const { count, res: res2 } of ctx.anchors.values())
            onAnchor(res2, count);
        return typeof reviver === "function" ? applyReviver.applyReviver(reviver, { "": res }, "", res) : res;
      }
      /**
       * A JSON representation of the document `contents`.
       *
       * @param jsonArg Used by `JSON.stringify` to indicate the array index or
       *   property name.
       */
      toJSON(jsonArg, onAnchor) {
        return this.toJS({ json: true, jsonArg, mapAsMap: false, onAnchor });
      }
      /** A YAML representation of the document. */
      toString(options = {}) {
        if (this.errors.length > 0)
          throw new Error("Document with errors cannot be stringified");
        if ("indent" in options && (!Number.isInteger(options.indent) || Number(options.indent) <= 0)) {
          const s2 = JSON.stringify(options.indent);
          throw new Error(`"indent" option must be a positive integer, not ${s2}`);
        }
        return stringifyDocument.stringifyDocument(this, options);
      }
    };
    function assertCollection(contents) {
      if (identity.isCollection(contents))
        return true;
      throw new Error("Expected a YAML collection as document contents");
    }
    exports.Document = Document;
  }
});

// node_modules/yaml/dist/errors.js
var require_errors = __commonJS({
  "node_modules/yaml/dist/errors.js"(exports) {
    "use strict";
    var YAMLError = class extends Error {
      constructor(name, pos, code, message) {
        super();
        this.name = name;
        this.code = code;
        this.message = message;
        this.pos = pos;
      }
    };
    var YAMLParseError = class extends YAMLError {
      constructor(pos, code, message) {
        super("YAMLParseError", pos, code, message);
      }
    };
    var YAMLWarning = class extends YAMLError {
      constructor(pos, code, message) {
        super("YAMLWarning", pos, code, message);
      }
    };
    var prettifyError = (src, lc) => (error) => {
      if (error.pos[0] === -1)
        return;
      error.linePos = error.pos.map((pos) => lc.linePos(pos));
      const { line, col } = error.linePos[0];
      error.message += ` at line ${line}, column ${col}`;
      let ci = col - 1;
      let lineStr = src.substring(lc.lineStarts[line - 1], lc.lineStarts[line]).replace(/[\n\r]+$/, "");
      if (ci >= 60 && lineStr.length > 80) {
        const trimStart = Math.min(ci - 39, lineStr.length - 79);
        lineStr = "\u2026" + lineStr.substring(trimStart);
        ci -= trimStart - 1;
      }
      if (lineStr.length > 80)
        lineStr = lineStr.substring(0, 79) + "\u2026";
      if (line > 1 && /^ *$/.test(lineStr.substring(0, ci))) {
        let prev = src.substring(lc.lineStarts[line - 2], lc.lineStarts[line - 1]);
        if (prev.length > 80)
          prev = prev.substring(0, 79) + "\u2026\n";
        lineStr = prev + lineStr;
      }
      if (/[^ ]/.test(lineStr)) {
        let count = 1;
        const end = error.linePos[1];
        if (end?.line === line && end.col > col) {
          count = Math.max(1, Math.min(end.col - col, 80 - ci));
        }
        const pointer = " ".repeat(ci) + "^".repeat(count);
        error.message += `:

${lineStr}
${pointer}
`;
      }
    };
    exports.YAMLError = YAMLError;
    exports.YAMLParseError = YAMLParseError;
    exports.YAMLWarning = YAMLWarning;
    exports.prettifyError = prettifyError;
  }
});

// node_modules/yaml/dist/compose/resolve-props.js
var require_resolve_props = __commonJS({
  "node_modules/yaml/dist/compose/resolve-props.js"(exports) {
    "use strict";
    function resolveProps(tokens, { flow, indicator, next, offset, onError, parentIndent, startOnNewline }) {
      let spaceBefore = false;
      let atNewline = startOnNewline;
      let hasSpace = startOnNewline;
      let comment = "";
      let commentSep = "";
      let hasNewline = false;
      let reqSpace = false;
      let tab = null;
      let anchor = null;
      let tag = null;
      let newlineAfterProp = null;
      let comma = null;
      let found = null;
      let start = null;
      for (const token of tokens) {
        if (reqSpace) {
          if (token.type !== "space" && token.type !== "newline" && token.type !== "comma")
            onError(token.offset, "MISSING_CHAR", "Tags and anchors must be separated from the next token by white space");
          reqSpace = false;
        }
        if (tab) {
          if (atNewline && token.type !== "comment" && token.type !== "newline") {
            onError(tab, "TAB_AS_INDENT", "Tabs are not allowed as indentation");
          }
          tab = null;
        }
        switch (token.type) {
          case "space":
            if (!flow && (indicator !== "doc-start" || next?.type !== "flow-collection") && token.source.includes("	")) {
              tab = token;
            }
            hasSpace = true;
            break;
          case "comment": {
            if (!hasSpace)
              onError(token, "MISSING_CHAR", "Comments must be separated from other tokens by white space characters");
            const cb = token.source.substring(1) || " ";
            if (!comment)
              comment = cb;
            else
              comment += commentSep + cb;
            commentSep = "";
            atNewline = false;
            break;
          }
          case "newline":
            if (atNewline) {
              if (comment)
                comment += token.source;
              else if (!found || indicator !== "seq-item-ind")
                spaceBefore = true;
            } else
              commentSep += token.source;
            atNewline = true;
            hasNewline = true;
            if (anchor || tag)
              newlineAfterProp = token;
            hasSpace = true;
            break;
          case "anchor":
            if (anchor)
              onError(token, "MULTIPLE_ANCHORS", "A node can have at most one anchor");
            if (token.source.endsWith(":"))
              onError(token.offset + token.source.length - 1, "BAD_ALIAS", "Anchor ending in : is ambiguous", true);
            anchor = token;
            start ?? (start = token.offset);
            atNewline = false;
            hasSpace = false;
            reqSpace = true;
            break;
          case "tag": {
            if (tag)
              onError(token, "MULTIPLE_TAGS", "A node can have at most one tag");
            tag = token;
            start ?? (start = token.offset);
            atNewline = false;
            hasSpace = false;
            reqSpace = true;
            break;
          }
          case indicator:
            if (anchor || tag)
              onError(token, "BAD_PROP_ORDER", `Anchors and tags must be after the ${token.source} indicator`);
            if (found)
              onError(token, "UNEXPECTED_TOKEN", `Unexpected ${token.source} in ${flow ?? "collection"}`);
            found = token;
            atNewline = indicator === "seq-item-ind" || indicator === "explicit-key-ind";
            hasSpace = false;
            break;
          case "comma":
            if (flow) {
              if (comma)
                onError(token, "UNEXPECTED_TOKEN", `Unexpected , in ${flow}`);
              comma = token;
              atNewline = false;
              hasSpace = false;
              break;
            }
          // else fallthrough
          default:
            onError(token, "UNEXPECTED_TOKEN", `Unexpected ${token.type} token`);
            atNewline = false;
            hasSpace = false;
        }
      }
      const last = tokens[tokens.length - 1];
      const end = last ? last.offset + last.source.length : offset;
      if (reqSpace && next && next.type !== "space" && next.type !== "newline" && next.type !== "comma" && (next.type !== "scalar" || next.source !== "")) {
        onError(next.offset, "MISSING_CHAR", "Tags and anchors must be separated from the next token by white space");
      }
      if (tab && (atNewline && tab.indent <= parentIndent || next?.type === "block-map" || next?.type === "block-seq"))
        onError(tab, "TAB_AS_INDENT", "Tabs are not allowed as indentation");
      return {
        comma,
        found,
        spaceBefore,
        comment,
        hasNewline,
        anchor,
        tag,
        newlineAfterProp,
        end,
        start: start ?? end
      };
    }
    exports.resolveProps = resolveProps;
  }
});

// node_modules/yaml/dist/compose/util-contains-newline.js
var require_util_contains_newline = __commonJS({
  "node_modules/yaml/dist/compose/util-contains-newline.js"(exports) {
    "use strict";
    function containsNewline(key) {
      if (!key)
        return null;
      switch (key.type) {
        case "alias":
        case "scalar":
        case "double-quoted-scalar":
        case "single-quoted-scalar":
          if (key.source.includes("\n"))
            return true;
          if (key.end) {
            for (const st of key.end)
              if (st.type === "newline")
                return true;
          }
          return false;
        case "flow-collection":
          for (const it of key.items) {
            for (const st of it.start)
              if (st.type === "newline")
                return true;
            if (it.sep) {
              for (const st of it.sep)
                if (st.type === "newline")
                  return true;
            }
            if (containsNewline(it.key) || containsNewline(it.value))
              return true;
          }
          return false;
        default:
          return true;
      }
    }
    exports.containsNewline = containsNewline;
  }
});

// node_modules/yaml/dist/compose/util-flow-indent-check.js
var require_util_flow_indent_check = __commonJS({
  "node_modules/yaml/dist/compose/util-flow-indent-check.js"(exports) {
    "use strict";
    var utilContainsNewline = require_util_contains_newline();
    function flowIndentCheck(indent, fc, onError) {
      if (fc?.type === "flow-collection") {
        const end = fc.end[0];
        if (end.indent === indent && (end.source === "]" || end.source === "}") && utilContainsNewline.containsNewline(fc)) {
          const msg = "Flow end indicator should be more indented than parent";
          onError(end, "BAD_INDENT", msg, true);
        }
      }
    }
    exports.flowIndentCheck = flowIndentCheck;
  }
});

// node_modules/yaml/dist/compose/util-map-includes.js
var require_util_map_includes = __commonJS({
  "node_modules/yaml/dist/compose/util-map-includes.js"(exports) {
    "use strict";
    var identity = require_identity();
    function mapIncludes(ctx, items, search) {
      const { uniqueKeys } = ctx.options;
      if (uniqueKeys === false)
        return false;
      const isEqual = typeof uniqueKeys === "function" ? uniqueKeys : (a, b) => a === b || identity.isScalar(a) && identity.isScalar(b) && a.value === b.value;
      return items.some((pair) => isEqual(pair.key, search));
    }
    exports.mapIncludes = mapIncludes;
  }
});

// node_modules/yaml/dist/compose/resolve-block-map.js
var require_resolve_block_map = __commonJS({
  "node_modules/yaml/dist/compose/resolve-block-map.js"(exports) {
    "use strict";
    var Pair = require_Pair();
    var YAMLMap = require_YAMLMap();
    var resolveProps = require_resolve_props();
    var utilContainsNewline = require_util_contains_newline();
    var utilFlowIndentCheck = require_util_flow_indent_check();
    var utilMapIncludes = require_util_map_includes();
    var startColMsg = "All mapping items must start at the same column";
    function resolveBlockMap({ composeNode, composeEmptyNode }, ctx, bm, onError, tag) {
      const NodeClass = tag?.nodeClass ?? YAMLMap.YAMLMap;
      const map = new NodeClass(ctx.schema);
      if (ctx.atRoot)
        ctx.atRoot = false;
      let offset = bm.offset;
      let commentEnd = null;
      for (const collItem of bm.items) {
        const { start, key, sep, value } = collItem;
        const keyProps = resolveProps.resolveProps(start, {
          indicator: "explicit-key-ind",
          next: key ?? sep?.[0],
          offset,
          onError,
          parentIndent: bm.indent,
          startOnNewline: true
        });
        const implicitKey = !keyProps.found;
        if (implicitKey) {
          if (key) {
            if (key.type === "block-seq")
              onError(offset, "BLOCK_AS_IMPLICIT_KEY", "A block sequence may not be used as an implicit map key");
            else if ("indent" in key && key.indent !== bm.indent)
              onError(offset, "BAD_INDENT", startColMsg);
          }
          if (!keyProps.anchor && !keyProps.tag && !sep) {
            commentEnd = keyProps.end;
            if (keyProps.comment) {
              if (map.comment)
                map.comment += "\n" + keyProps.comment;
              else
                map.comment = keyProps.comment;
            }
            continue;
          }
          if (keyProps.newlineAfterProp || utilContainsNewline.containsNewline(key)) {
            onError(key ?? start[start.length - 1], "MULTILINE_IMPLICIT_KEY", "Implicit keys need to be on a single line");
          }
        } else if (keyProps.found?.indent !== bm.indent) {
          onError(offset, "BAD_INDENT", startColMsg);
        }
        ctx.atKey = true;
        const keyStart = keyProps.end;
        const keyNode = key ? composeNode(ctx, key, keyProps, onError) : composeEmptyNode(ctx, keyStart, start, null, keyProps, onError);
        if (ctx.schema.compat)
          utilFlowIndentCheck.flowIndentCheck(bm.indent, key, onError);
        ctx.atKey = false;
        if (utilMapIncludes.mapIncludes(ctx, map.items, keyNode))
          onError(keyStart, "DUPLICATE_KEY", "Map keys must be unique");
        const valueProps = resolveProps.resolveProps(sep ?? [], {
          indicator: "map-value-ind",
          next: value,
          offset: keyNode.range[2],
          onError,
          parentIndent: bm.indent,
          startOnNewline: !key || key.type === "block-scalar"
        });
        offset = valueProps.end;
        if (valueProps.found) {
          if (implicitKey) {
            if (value?.type === "block-map" && !valueProps.hasNewline)
              onError(offset, "BLOCK_AS_IMPLICIT_KEY", "Nested mappings are not allowed in compact mappings");
            if (ctx.options.strict && keyProps.start < valueProps.found.offset - 1024)
              onError(keyNode.range, "KEY_OVER_1024_CHARS", "The : indicator must be at most 1024 chars after the start of an implicit block mapping key");
          }
          const valueNode = value ? composeNode(ctx, value, valueProps, onError) : composeEmptyNode(ctx, offset, sep, null, valueProps, onError);
          if (ctx.schema.compat)
            utilFlowIndentCheck.flowIndentCheck(bm.indent, value, onError);
          offset = valueNode.range[2];
          const pair = new Pair.Pair(keyNode, valueNode);
          if (ctx.options.keepSourceTokens)
            pair.srcToken = collItem;
          map.items.push(pair);
        } else {
          if (implicitKey)
            onError(keyNode.range, "MISSING_CHAR", "Implicit map keys need to be followed by map values");
          if (valueProps.comment) {
            if (keyNode.comment)
              keyNode.comment += "\n" + valueProps.comment;
            else
              keyNode.comment = valueProps.comment;
          }
          const pair = new Pair.Pair(keyNode);
          if (ctx.options.keepSourceTokens)
            pair.srcToken = collItem;
          map.items.push(pair);
        }
      }
      if (commentEnd && commentEnd < offset)
        onError(commentEnd, "IMPOSSIBLE", "Map comment with trailing content");
      map.range = [bm.offset, offset, commentEnd ?? offset];
      return map;
    }
    exports.resolveBlockMap = resolveBlockMap;
  }
});

// node_modules/yaml/dist/compose/resolve-block-seq.js
var require_resolve_block_seq = __commonJS({
  "node_modules/yaml/dist/compose/resolve-block-seq.js"(exports) {
    "use strict";
    var YAMLSeq = require_YAMLSeq();
    var resolveProps = require_resolve_props();
    var utilFlowIndentCheck = require_util_flow_indent_check();
    function resolveBlockSeq({ composeNode, composeEmptyNode }, ctx, bs, onError, tag) {
      const NodeClass = tag?.nodeClass ?? YAMLSeq.YAMLSeq;
      const seq = new NodeClass(ctx.schema);
      if (ctx.atRoot)
        ctx.atRoot = false;
      if (ctx.atKey)
        ctx.atKey = false;
      let offset = bs.offset;
      let commentEnd = null;
      for (const { start, value } of bs.items) {
        const props = resolveProps.resolveProps(start, {
          indicator: "seq-item-ind",
          next: value,
          offset,
          onError,
          parentIndent: bs.indent,
          startOnNewline: true
        });
        if (!props.found) {
          if (props.anchor || props.tag || value) {
            if (value?.type === "block-seq")
              onError(props.end, "BAD_INDENT", "All sequence items must start at the same column");
            else
              onError(offset, "MISSING_CHAR", "Sequence item without - indicator");
          } else {
            commentEnd = props.end;
            if (props.comment)
              seq.comment = props.comment;
            continue;
          }
        }
        const node = value ? composeNode(ctx, value, props, onError) : composeEmptyNode(ctx, props.end, start, null, props, onError);
        if (ctx.schema.compat)
          utilFlowIndentCheck.flowIndentCheck(bs.indent, value, onError);
        offset = node.range[2];
        seq.items.push(node);
      }
      seq.range = [bs.offset, offset, commentEnd ?? offset];
      return seq;
    }
    exports.resolveBlockSeq = resolveBlockSeq;
  }
});

// node_modules/yaml/dist/compose/resolve-end.js
var require_resolve_end = __commonJS({
  "node_modules/yaml/dist/compose/resolve-end.js"(exports) {
    "use strict";
    function resolveEnd(end, offset, reqSpace, onError) {
      let comment = "";
      if (end) {
        let hasSpace = false;
        let sep = "";
        for (const token of end) {
          const { source, type } = token;
          switch (type) {
            case "space":
              hasSpace = true;
              break;
            case "comment": {
              if (reqSpace && !hasSpace)
                onError(token, "MISSING_CHAR", "Comments must be separated from other tokens by white space characters");
              const cb = source.substring(1) || " ";
              if (!comment)
                comment = cb;
              else
                comment += sep + cb;
              sep = "";
              break;
            }
            case "newline":
              if (comment)
                sep += source;
              hasSpace = true;
              break;
            default:
              onError(token, "UNEXPECTED_TOKEN", `Unexpected ${type} at node end`);
          }
          offset += source.length;
        }
      }
      return { comment, offset };
    }
    exports.resolveEnd = resolveEnd;
  }
});

// node_modules/yaml/dist/compose/resolve-flow-collection.js
var require_resolve_flow_collection = __commonJS({
  "node_modules/yaml/dist/compose/resolve-flow-collection.js"(exports) {
    "use strict";
    var identity = require_identity();
    var Pair = require_Pair();
    var YAMLMap = require_YAMLMap();
    var YAMLSeq = require_YAMLSeq();
    var resolveEnd = require_resolve_end();
    var resolveProps = require_resolve_props();
    var utilContainsNewline = require_util_contains_newline();
    var utilMapIncludes = require_util_map_includes();
    var blockMsg = "Block collections are not allowed within flow collections";
    var isBlock = (token) => token && (token.type === "block-map" || token.type === "block-seq");
    function resolveFlowCollection({ composeNode, composeEmptyNode }, ctx, fc, onError, tag) {
      const isMap = fc.start.source === "{";
      const fcName = isMap ? "flow map" : "flow sequence";
      const NodeClass = tag?.nodeClass ?? (isMap ? YAMLMap.YAMLMap : YAMLSeq.YAMLSeq);
      const coll = new NodeClass(ctx.schema);
      coll.flow = true;
      const atRoot = ctx.atRoot;
      if (atRoot)
        ctx.atRoot = false;
      if (ctx.atKey)
        ctx.atKey = false;
      let offset = fc.offset + fc.start.source.length;
      for (let i = 0; i < fc.items.length; ++i) {
        const collItem = fc.items[i];
        const { start, key, sep, value } = collItem;
        const props = resolveProps.resolveProps(start, {
          flow: fcName,
          indicator: "explicit-key-ind",
          next: key ?? sep?.[0],
          offset,
          onError,
          parentIndent: fc.indent,
          startOnNewline: false
        });
        if (!props.found) {
          if (!props.anchor && !props.tag && !sep && !value) {
            if (i === 0 && props.comma)
              onError(props.comma, "UNEXPECTED_TOKEN", `Unexpected , in ${fcName}`);
            else if (i < fc.items.length - 1)
              onError(props.start, "UNEXPECTED_TOKEN", `Unexpected empty item in ${fcName}`);
            if (props.comment) {
              if (coll.comment)
                coll.comment += "\n" + props.comment;
              else
                coll.comment = props.comment;
            }
            offset = props.end;
            continue;
          }
          if (!isMap && ctx.options.strict && utilContainsNewline.containsNewline(key))
            onError(
              key,
              // checked by containsNewline()
              "MULTILINE_IMPLICIT_KEY",
              "Implicit keys of flow sequence pairs need to be on a single line"
            );
        }
        if (i === 0) {
          if (props.comma)
            onError(props.comma, "UNEXPECTED_TOKEN", `Unexpected , in ${fcName}`);
        } else {
          if (!props.comma)
            onError(props.start, "MISSING_CHAR", `Missing , between ${fcName} items`);
          if (props.comment) {
            let prevItemComment = "";
            loop: for (const st of start) {
              switch (st.type) {
                case "comma":
                case "space":
                  break;
                case "comment":
                  prevItemComment = st.source.substring(1);
                  break loop;
                default:
                  break loop;
              }
            }
            if (prevItemComment) {
              let prev = coll.items[coll.items.length - 1];
              if (identity.isPair(prev))
                prev = prev.value ?? prev.key;
              if (prev.comment)
                prev.comment += "\n" + prevItemComment;
              else
                prev.comment = prevItemComment;
              props.comment = props.comment.substring(prevItemComment.length + 1);
            }
          }
        }
        if (!isMap && !sep && !props.found) {
          const valueNode = value ? composeNode(ctx, value, props, onError) : composeEmptyNode(ctx, props.end, sep, null, props, onError);
          coll.items.push(valueNode);
          offset = valueNode.range[2];
          if (isBlock(value))
            onError(valueNode.range, "BLOCK_IN_FLOW", blockMsg);
        } else {
          ctx.atKey = true;
          const keyStart = props.end;
          const keyNode = key ? composeNode(ctx, key, props, onError) : composeEmptyNode(ctx, keyStart, start, null, props, onError);
          if (isBlock(key))
            onError(keyNode.range, "BLOCK_IN_FLOW", blockMsg);
          ctx.atKey = false;
          const valueProps = resolveProps.resolveProps(sep ?? [], {
            flow: fcName,
            indicator: "map-value-ind",
            next: value,
            offset: keyNode.range[2],
            onError,
            parentIndent: fc.indent,
            startOnNewline: false
          });
          if (valueProps.found) {
            if (!isMap && !props.found && ctx.options.strict) {
              if (sep)
                for (const st of sep) {
                  if (st === valueProps.found)
                    break;
                  if (st.type === "newline") {
                    onError(st, "MULTILINE_IMPLICIT_KEY", "Implicit keys of flow sequence pairs need to be on a single line");
                    break;
                  }
                }
              if (props.start < valueProps.found.offset - 1024)
                onError(valueProps.found, "KEY_OVER_1024_CHARS", "The : indicator must be at most 1024 chars after the start of an implicit flow sequence key");
            }
          } else if (value) {
            if ("source" in value && value.source?.[0] === ":")
              onError(value, "MISSING_CHAR", `Missing space after : in ${fcName}`);
            else
              onError(valueProps.start, "MISSING_CHAR", `Missing , or : between ${fcName} items`);
          }
          const valueNode = value ? composeNode(ctx, value, valueProps, onError) : valueProps.found ? composeEmptyNode(ctx, valueProps.end, sep, null, valueProps, onError) : null;
          if (valueNode) {
            if (isBlock(value))
              onError(valueNode.range, "BLOCK_IN_FLOW", blockMsg);
          } else if (valueProps.comment) {
            if (keyNode.comment)
              keyNode.comment += "\n" + valueProps.comment;
            else
              keyNode.comment = valueProps.comment;
          }
          const pair = new Pair.Pair(keyNode, valueNode);
          if (ctx.options.keepSourceTokens)
            pair.srcToken = collItem;
          if (isMap) {
            const map = coll;
            if (utilMapIncludes.mapIncludes(ctx, map.items, keyNode))
              onError(keyStart, "DUPLICATE_KEY", "Map keys must be unique");
            map.items.push(pair);
          } else {
            const map = new YAMLMap.YAMLMap(ctx.schema);
            map.flow = true;
            map.items.push(pair);
            const endRange = (valueNode ?? keyNode).range;
            map.range = [keyNode.range[0], endRange[1], endRange[2]];
            coll.items.push(map);
          }
          offset = valueNode ? valueNode.range[2] : valueProps.end;
        }
      }
      const expectedEnd = isMap ? "}" : "]";
      const [ce, ...ee] = fc.end;
      let cePos = offset;
      if (ce?.source === expectedEnd)
        cePos = ce.offset + ce.source.length;
      else {
        const name = fcName[0].toUpperCase() + fcName.substring(1);
        const msg = atRoot ? `${name} must end with a ${expectedEnd}` : `${name} in block collection must be sufficiently indented and end with a ${expectedEnd}`;
        onError(offset, atRoot ? "MISSING_CHAR" : "BAD_INDENT", msg);
        if (ce && ce.source.length !== 1)
          ee.unshift(ce);
      }
      if (ee.length > 0) {
        const end = resolveEnd.resolveEnd(ee, cePos, ctx.options.strict, onError);
        if (end.comment) {
          if (coll.comment)
            coll.comment += "\n" + end.comment;
          else
            coll.comment = end.comment;
        }
        coll.range = [fc.offset, cePos, end.offset];
      } else {
        coll.range = [fc.offset, cePos, cePos];
      }
      return coll;
    }
    exports.resolveFlowCollection = resolveFlowCollection;
  }
});

// node_modules/yaml/dist/compose/compose-collection.js
var require_compose_collection = __commonJS({
  "node_modules/yaml/dist/compose/compose-collection.js"(exports) {
    "use strict";
    var identity = require_identity();
    var Scalar = require_Scalar();
    var YAMLMap = require_YAMLMap();
    var YAMLSeq = require_YAMLSeq();
    var resolveBlockMap = require_resolve_block_map();
    var resolveBlockSeq = require_resolve_block_seq();
    var resolveFlowCollection = require_resolve_flow_collection();
    function resolveCollection(CN, ctx, token, onError, tagName, tag) {
      const coll = token.type === "block-map" ? resolveBlockMap.resolveBlockMap(CN, ctx, token, onError, tag) : token.type === "block-seq" ? resolveBlockSeq.resolveBlockSeq(CN, ctx, token, onError, tag) : resolveFlowCollection.resolveFlowCollection(CN, ctx, token, onError, tag);
      const Coll = coll.constructor;
      if (tagName === "!" || tagName === Coll.tagName) {
        coll.tag = Coll.tagName;
        return coll;
      }
      if (tagName)
        coll.tag = tagName;
      return coll;
    }
    function composeCollection(CN, ctx, token, props, onError) {
      const tagToken = props.tag;
      const tagName = !tagToken ? null : ctx.directives.tagName(tagToken.source, (msg) => onError(tagToken, "TAG_RESOLVE_FAILED", msg));
      if (token.type === "block-seq") {
        const { anchor, newlineAfterProp: nl } = props;
        const lastProp = anchor && tagToken ? anchor.offset > tagToken.offset ? anchor : tagToken : anchor ?? tagToken;
        if (lastProp && (!nl || nl.offset < lastProp.offset)) {
          const message = "Missing newline after block sequence props";
          onError(lastProp, "MISSING_CHAR", message);
        }
      }
      const expType = token.type === "block-map" ? "map" : token.type === "block-seq" ? "seq" : token.start.source === "{" ? "map" : "seq";
      if (!tagToken || !tagName || tagName === "!" || tagName === YAMLMap.YAMLMap.tagName && expType === "map" || tagName === YAMLSeq.YAMLSeq.tagName && expType === "seq") {
        return resolveCollection(CN, ctx, token, onError, tagName);
      }
      let tag = ctx.schema.tags.find((t) => t.tag === tagName && t.collection === expType);
      if (!tag) {
        const kt = ctx.schema.knownTags[tagName];
        if (kt?.collection === expType) {
          ctx.schema.tags.push(Object.assign({}, kt, { default: false }));
          tag = kt;
        } else {
          if (kt) {
            onError(tagToken, "BAD_COLLECTION_TYPE", `${kt.tag} used for ${expType} collection, but expects ${kt.collection ?? "scalar"}`, true);
          } else {
            onError(tagToken, "TAG_RESOLVE_FAILED", `Unresolved tag: ${tagName}`, true);
          }
          return resolveCollection(CN, ctx, token, onError, tagName);
        }
      }
      const coll = resolveCollection(CN, ctx, token, onError, tagName, tag);
      const res = tag.resolve?.(coll, (msg) => onError(tagToken, "TAG_RESOLVE_FAILED", msg), ctx.options) ?? coll;
      const node = identity.isNode(res) ? res : new Scalar.Scalar(res);
      node.range = coll.range;
      node.tag = tagName;
      if (tag?.format)
        node.format = tag.format;
      return node;
    }
    exports.composeCollection = composeCollection;
  }
});

// node_modules/yaml/dist/compose/resolve-block-scalar.js
var require_resolve_block_scalar = __commonJS({
  "node_modules/yaml/dist/compose/resolve-block-scalar.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    function resolveBlockScalar(ctx, scalar, onError) {
      const start = scalar.offset;
      const header = parseBlockScalarHeader(scalar, ctx.options.strict, onError);
      if (!header)
        return { value: "", type: null, comment: "", range: [start, start, start] };
      const type = header.mode === ">" ? Scalar.Scalar.BLOCK_FOLDED : Scalar.Scalar.BLOCK_LITERAL;
      const lines = scalar.source ? splitLines(scalar.source) : [];
      let chompStart = lines.length;
      for (let i = lines.length - 1; i >= 0; --i) {
        const content = lines[i][1];
        if (content === "" || content === "\r")
          chompStart = i;
        else
          break;
      }
      if (chompStart === 0) {
        const value2 = header.chomp === "+" && lines.length > 0 ? "\n".repeat(Math.max(1, lines.length - 1)) : "";
        let end2 = start + header.length;
        if (scalar.source)
          end2 += scalar.source.length;
        return { value: value2, type, comment: header.comment, range: [start, end2, end2] };
      }
      let trimIndent = scalar.indent + header.indent;
      let offset = scalar.offset + header.length;
      let contentStart = 0;
      for (let i = 0; i < chompStart; ++i) {
        const [indent, content] = lines[i];
        if (content === "" || content === "\r") {
          if (header.indent === 0 && indent.length > trimIndent)
            trimIndent = indent.length;
        } else {
          if (indent.length < trimIndent) {
            const message = "Block scalars with more-indented leading empty lines must use an explicit indentation indicator";
            onError(offset + indent.length, "MISSING_CHAR", message);
          }
          if (header.indent === 0)
            trimIndent = indent.length;
          contentStart = i;
          if (trimIndent === 0 && !ctx.atRoot) {
            const message = "Block scalar values in collections must be indented";
            onError(offset, "BAD_INDENT", message);
          }
          break;
        }
        offset += indent.length + content.length + 1;
      }
      for (let i = lines.length - 1; i >= chompStart; --i) {
        if (lines[i][0].length > trimIndent)
          chompStart = i + 1;
      }
      let value = "";
      let sep = "";
      let prevMoreIndented = false;
      for (let i = 0; i < contentStart; ++i)
        value += lines[i][0].slice(trimIndent) + "\n";
      for (let i = contentStart; i < chompStart; ++i) {
        let [indent, content] = lines[i];
        offset += indent.length + content.length + 1;
        const crlf = content[content.length - 1] === "\r";
        if (crlf)
          content = content.slice(0, -1);
        if (content && indent.length < trimIndent) {
          const src = header.indent ? "explicit indentation indicator" : "first line";
          const message = `Block scalar lines must not be less indented than their ${src}`;
          onError(offset - content.length - (crlf ? 2 : 1), "BAD_INDENT", message);
          indent = "";
        }
        if (type === Scalar.Scalar.BLOCK_LITERAL) {
          value += sep + indent.slice(trimIndent) + content;
          sep = "\n";
        } else if (indent.length > trimIndent || content[0] === "	") {
          if (sep === " ")
            sep = "\n";
          else if (!prevMoreIndented && sep === "\n")
            sep = "\n\n";
          value += sep + indent.slice(trimIndent) + content;
          sep = "\n";
          prevMoreIndented = true;
        } else if (content === "") {
          if (sep === "\n")
            value += "\n";
          else
            sep = "\n";
        } else {
          value += sep + content;
          sep = " ";
          prevMoreIndented = false;
        }
      }
      switch (header.chomp) {
        case "-":
          break;
        case "+":
          for (let i = chompStart; i < lines.length; ++i)
            value += "\n" + lines[i][0].slice(trimIndent);
          if (value[value.length - 1] !== "\n")
            value += "\n";
          break;
        default:
          value += "\n";
      }
      const end = start + header.length + scalar.source.length;
      return { value, type, comment: header.comment, range: [start, end, end] };
    }
    function parseBlockScalarHeader({ offset, props }, strict, onError) {
      if (props[0].type !== "block-scalar-header") {
        onError(props[0], "IMPOSSIBLE", "Block scalar header not found");
        return null;
      }
      const { source } = props[0];
      const mode = source[0];
      let indent = 0;
      let chomp = "";
      let error = -1;
      for (let i = 1; i < source.length; ++i) {
        const ch = source[i];
        if (!chomp && (ch === "-" || ch === "+"))
          chomp = ch;
        else {
          const n = Number(ch);
          if (!indent && n)
            indent = n;
          else if (error === -1)
            error = offset + i;
        }
      }
      if (error !== -1)
        onError(error, "UNEXPECTED_TOKEN", `Block scalar header includes extra characters: ${source}`);
      let hasSpace = false;
      let comment = "";
      let length = source.length;
      for (let i = 1; i < props.length; ++i) {
        const token = props[i];
        switch (token.type) {
          case "space":
            hasSpace = true;
          // fallthrough
          case "newline":
            length += token.source.length;
            break;
          case "comment":
            if (strict && !hasSpace) {
              const message = "Comments must be separated from other tokens by white space characters";
              onError(token, "MISSING_CHAR", message);
            }
            length += token.source.length;
            comment = token.source.substring(1);
            break;
          case "error":
            onError(token, "UNEXPECTED_TOKEN", token.message);
            length += token.source.length;
            break;
          /* istanbul ignore next should not happen */
          default: {
            const message = `Unexpected token in block scalar header: ${token.type}`;
            onError(token, "UNEXPECTED_TOKEN", message);
            const ts = token.source;
            if (ts && typeof ts === "string")
              length += ts.length;
          }
        }
      }
      return { mode, indent, chomp, comment, length };
    }
    function splitLines(source) {
      const split = source.split(/\n( *)/);
      const first = split[0];
      const m = first.match(/^( *)/);
      const line0 = m?.[1] ? [m[1], first.slice(m[1].length)] : ["", first];
      const lines = [line0];
      for (let i = 1; i < split.length; i += 2)
        lines.push([split[i], split[i + 1]]);
      return lines;
    }
    exports.resolveBlockScalar = resolveBlockScalar;
  }
});

// node_modules/yaml/dist/compose/resolve-flow-scalar.js
var require_resolve_flow_scalar = __commonJS({
  "node_modules/yaml/dist/compose/resolve-flow-scalar.js"(exports) {
    "use strict";
    var Scalar = require_Scalar();
    var resolveEnd = require_resolve_end();
    function resolveFlowScalar(scalar, strict, onError) {
      const { offset, type, source, end } = scalar;
      let _type;
      let value;
      const _onError = (rel, code, msg) => onError(offset + rel, code, msg);
      switch (type) {
        case "scalar":
          _type = Scalar.Scalar.PLAIN;
          value = plainValue(source, _onError);
          break;
        case "single-quoted-scalar":
          _type = Scalar.Scalar.QUOTE_SINGLE;
          value = singleQuotedValue(source, _onError);
          break;
        case "double-quoted-scalar":
          _type = Scalar.Scalar.QUOTE_DOUBLE;
          value = doubleQuotedValue(source, _onError);
          break;
        /* istanbul ignore next should not happen */
        default:
          onError(scalar, "UNEXPECTED_TOKEN", `Expected a flow scalar value, but found: ${type}`);
          return {
            value: "",
            type: null,
            comment: "",
            range: [offset, offset + source.length, offset + source.length]
          };
      }
      const valueEnd = offset + source.length;
      const re = resolveEnd.resolveEnd(end, valueEnd, strict, onError);
      return {
        value,
        type: _type,
        comment: re.comment,
        range: [offset, valueEnd, re.offset]
      };
    }
    function plainValue(source, onError) {
      let badChar = "";
      switch (source[0]) {
        /* istanbul ignore next should not happen */
        case "	":
          badChar = "a tab character";
          break;
        case ",":
          badChar = "flow indicator character ,";
          break;
        case "%":
          badChar = "directive indicator character %";
          break;
        case "|":
        case ">": {
          badChar = `block scalar indicator ${source[0]}`;
          break;
        }
        case "@":
        case "`": {
          badChar = `reserved character ${source[0]}`;
          break;
        }
      }
      if (badChar)
        onError(0, "BAD_SCALAR_START", `Plain value cannot start with ${badChar}`);
      return unfoldLines(source);
    }
    function singleQuotedValue(source, onError) {
      if (source[source.length - 1] !== "'" || source.length === 1)
        onError(source.length, "MISSING_CHAR", "Missing closing 'quote");
      return unfoldLines(source.slice(1, -1)).replace(/''/g, "'");
    }
    function unfoldLines(source) {
      const line = /(.*?)\r?\n/sy;
      let match = line.exec(source);
      if (!match)
        return source;
      let trimEnd, trimBoth;
      try {
        trimEnd = new RegExp("(?<![ 	])[ 	]+$");
        trimBoth = new RegExp("^[ 	]+|(?<![ 	])[ 	]+$", "g");
      } catch {
        trimEnd = /[ \t]+$/;
        trimBoth = /^[ \t]+|[ \t]+$/g;
      }
      let res = match[1].replace(trimEnd, "");
      let sep = " ";
      let pos = line.lastIndex;
      while (match = line.exec(source)) {
        const lm = match[1].replace(trimBoth, "");
        if (lm === "") {
          if (sep === "\n")
            res += sep;
          else
            sep = "\n";
        } else {
          res += sep + lm;
          sep = " ";
        }
        pos = line.lastIndex;
      }
      const last = /[ \t]*(.*)/sy;
      last.lastIndex = pos;
      match = last.exec(source);
      return res + sep + (match?.[1] ?? "");
    }
    function doubleQuotedValue(source, onError) {
      let res = "";
      for (let i = 1; i < source.length - 1; ++i) {
        const ch = source[i];
        if (ch === "\r" && source[i + 1] === "\n")
          continue;
        if (ch === "\n") {
          const { fold, offset } = foldNewline(source, i);
          res += fold;
          i = offset;
        } else if (ch === "\\") {
          let next = source[++i];
          const cc = escapeCodes[next];
          if (cc)
            res += cc;
          else if (next === "\n") {
            next = source[i + 1];
            while (next === " " || next === "	")
              next = source[++i + 1];
          } else if (next === "\r" && source[i + 1] === "\n") {
            next = source[++i + 1];
            while (next === " " || next === "	")
              next = source[++i + 1];
          } else if (next === "x" || next === "u" || next === "U") {
            const length = next === "x" ? 2 : next === "u" ? 4 : 8;
            res += parseCharCode(source, i + 1, length, onError);
            i += length;
          } else {
            const raw = source.substr(i - 1, 2);
            onError(i - 1, "BAD_DQ_ESCAPE", `Invalid escape sequence ${raw}`);
            res += raw;
          }
        } else if (ch === " " || ch === "	") {
          const wsStart = i;
          let next = source[i + 1];
          while (next === " " || next === "	")
            next = source[++i + 1];
          if (next !== "\n" && !(next === "\r" && source[i + 2] === "\n"))
            res += i > wsStart ? source.slice(wsStart, i + 1) : ch;
        } else {
          res += ch;
        }
      }
      if (source[source.length - 1] !== '"' || source.length === 1)
        onError(source.length, "MISSING_CHAR", 'Missing closing "quote');
      return res;
    }
    function foldNewline(source, offset) {
      let fold = "";
      let ch = source[offset + 1];
      while (ch === " " || ch === "	" || ch === "\n" || ch === "\r") {
        if (ch === "\r" && source[offset + 2] !== "\n")
          break;
        if (ch === "\n")
          fold += "\n";
        offset += 1;
        ch = source[offset + 1];
      }
      if (!fold)
        fold = " ";
      return { fold, offset };
    }
    var escapeCodes = {
      "0": "\0",
      // null character
      a: "\x07",
      // bell character
      b: "\b",
      // backspace
      e: "\x1B",
      // escape character
      f: "\f",
      // form feed
      n: "\n",
      // line feed
      r: "\r",
      // carriage return
      t: "	",
      // horizontal tab
      v: "\v",
      // vertical tab
      N: "\x85",
      // Unicode next line
      _: "\xA0",
      // Unicode non-breaking space
      L: "\u2028",
      // Unicode line separator
      P: "\u2029",
      // Unicode paragraph separator
      " ": " ",
      '"': '"',
      "/": "/",
      "\\": "\\",
      "	": "	"
    };
    function parseCharCode(source, offset, length, onError) {
      const cc = source.substr(offset, length);
      const ok = cc.length === length && /^[0-9a-fA-F]+$/.test(cc);
      const code = ok ? parseInt(cc, 16) : NaN;
      try {
        return String.fromCodePoint(code);
      } catch {
        const raw = source.substr(offset - 2, length + 2);
        onError(offset - 2, "BAD_DQ_ESCAPE", `Invalid escape sequence ${raw}`);
        return raw;
      }
    }
    exports.resolveFlowScalar = resolveFlowScalar;
  }
});

// node_modules/yaml/dist/compose/compose-scalar.js
var require_compose_scalar = __commonJS({
  "node_modules/yaml/dist/compose/compose-scalar.js"(exports) {
    "use strict";
    var identity = require_identity();
    var Scalar = require_Scalar();
    var resolveBlockScalar = require_resolve_block_scalar();
    var resolveFlowScalar = require_resolve_flow_scalar();
    function composeScalar(ctx, token, tagToken, onError) {
      const { value, type, comment, range } = token.type === "block-scalar" ? resolveBlockScalar.resolveBlockScalar(ctx, token, onError) : resolveFlowScalar.resolveFlowScalar(token, ctx.options.strict, onError);
      const tagName = tagToken ? ctx.directives.tagName(tagToken.source, (msg) => onError(tagToken, "TAG_RESOLVE_FAILED", msg)) : null;
      let tag;
      if (ctx.options.stringKeys && ctx.atKey) {
        tag = ctx.schema[identity.SCALAR];
      } else if (tagName)
        tag = findScalarTagByName(ctx.schema, value, tagName, tagToken, onError);
      else if (token.type === "scalar")
        tag = findScalarTagByTest(ctx, value, token, onError);
      else
        tag = ctx.schema[identity.SCALAR];
      let scalar;
      try {
        const res = tag.resolve(value, (msg) => onError(tagToken ?? token, "TAG_RESOLVE_FAILED", msg), ctx.options);
        scalar = identity.isScalar(res) ? res : new Scalar.Scalar(res);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        onError(tagToken ?? token, "TAG_RESOLVE_FAILED", msg);
        scalar = new Scalar.Scalar(value);
      }
      scalar.range = range;
      scalar.source = value;
      if (type)
        scalar.type = type;
      if (tagName)
        scalar.tag = tagName;
      if (tag.format)
        scalar.format = tag.format;
      if (comment)
        scalar.comment = comment;
      return scalar;
    }
    function findScalarTagByName(schema, value, tagName, tagToken, onError) {
      if (tagName === "!")
        return schema[identity.SCALAR];
      const matchWithTest = [];
      for (const tag of schema.tags) {
        if (!tag.collection && tag.tag === tagName) {
          if (tag.default && tag.test)
            matchWithTest.push(tag);
          else
            return tag;
        }
      }
      for (const tag of matchWithTest)
        if (tag.test?.test(value))
          return tag;
      const kt = schema.knownTags[tagName];
      if (kt && !kt.collection) {
        schema.tags.push(Object.assign({}, kt, { default: false, test: void 0 }));
        return kt;
      }
      onError(tagToken, "TAG_RESOLVE_FAILED", `Unresolved tag: ${tagName}`, tagName !== "tag:yaml.org,2002:str");
      return schema[identity.SCALAR];
    }
    function findScalarTagByTest({ atKey, directives, schema }, value, token, onError) {
      const tag = schema.tags.find((tag2) => (tag2.default === true || atKey && tag2.default === "key") && tag2.test?.test(value)) || schema[identity.SCALAR];
      if (schema.compat) {
        const compat = schema.compat.find((tag2) => tag2.default && tag2.test?.test(value)) ?? schema[identity.SCALAR];
        if (tag.tag !== compat.tag) {
          const ts = directives.tagString(tag.tag);
          const cs = directives.tagString(compat.tag);
          const msg = `Value may be parsed as either ${ts} or ${cs}`;
          onError(token, "TAG_RESOLVE_FAILED", msg, true);
        }
      }
      return tag;
    }
    exports.composeScalar = composeScalar;
  }
});

// node_modules/yaml/dist/compose/util-empty-scalar-position.js
var require_util_empty_scalar_position = __commonJS({
  "node_modules/yaml/dist/compose/util-empty-scalar-position.js"(exports) {
    "use strict";
    function emptyScalarPosition(offset, before, pos) {
      if (before) {
        pos ?? (pos = before.length);
        for (let i = pos - 1; i >= 0; --i) {
          let st = before[i];
          switch (st.type) {
            case "space":
            case "comment":
            case "newline":
              offset -= st.source.length;
              continue;
          }
          st = before[++i];
          while (st?.type === "space") {
            offset += st.source.length;
            st = before[++i];
          }
          break;
        }
      }
      return offset;
    }
    exports.emptyScalarPosition = emptyScalarPosition;
  }
});

// node_modules/yaml/dist/compose/compose-node.js
var require_compose_node = __commonJS({
  "node_modules/yaml/dist/compose/compose-node.js"(exports) {
    "use strict";
    var Alias = require_Alias();
    var identity = require_identity();
    var composeCollection = require_compose_collection();
    var composeScalar = require_compose_scalar();
    var resolveEnd = require_resolve_end();
    var utilEmptyScalarPosition = require_util_empty_scalar_position();
    var CN = { composeNode, composeEmptyNode };
    function composeNode(ctx, token, props, onError) {
      const atKey = ctx.atKey;
      const { spaceBefore, comment, anchor, tag } = props;
      let node;
      let isSrcToken = true;
      switch (token.type) {
        case "alias":
          node = composeAlias(ctx, token, onError);
          if (anchor || tag)
            onError(token, "ALIAS_PROPS", "An alias node must not specify any properties");
          break;
        case "scalar":
        case "single-quoted-scalar":
        case "double-quoted-scalar":
        case "block-scalar":
          node = composeScalar.composeScalar(ctx, token, tag, onError);
          if (anchor)
            node.anchor = anchor.source.substring(1);
          break;
        case "block-map":
        case "block-seq":
        case "flow-collection":
          try {
            node = composeCollection.composeCollection(CN, ctx, token, props, onError);
            if (anchor)
              node.anchor = anchor.source.substring(1);
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            onError(token, "RESOURCE_EXHAUSTION", message);
          }
          break;
        default: {
          const message = token.type === "error" ? token.message : `Unsupported token (type: ${token.type})`;
          onError(token, "UNEXPECTED_TOKEN", message);
          isSrcToken = false;
        }
      }
      node ?? (node = composeEmptyNode(ctx, token.offset, void 0, null, props, onError));
      if (anchor && node.anchor === "")
        onError(anchor, "BAD_ALIAS", "Anchor cannot be an empty string");
      if (atKey && ctx.options.stringKeys && (!identity.isScalar(node) || typeof node.value !== "string" || node.tag && node.tag !== "tag:yaml.org,2002:str")) {
        const msg = "With stringKeys, all keys must be strings";
        onError(tag ?? token, "NON_STRING_KEY", msg);
      }
      if (spaceBefore)
        node.spaceBefore = true;
      if (comment) {
        if (token.type === "scalar" && token.source === "")
          node.comment = comment;
        else
          node.commentBefore = comment;
      }
      if (ctx.options.keepSourceTokens && isSrcToken)
        node.srcToken = token;
      return node;
    }
    function composeEmptyNode(ctx, offset, before, pos, { spaceBefore, comment, anchor, tag, end }, onError) {
      const token = {
        type: "scalar",
        offset: utilEmptyScalarPosition.emptyScalarPosition(offset, before, pos),
        indent: -1,
        source: ""
      };
      const node = composeScalar.composeScalar(ctx, token, tag, onError);
      if (anchor) {
        node.anchor = anchor.source.substring(1);
        if (node.anchor === "")
          onError(anchor, "BAD_ALIAS", "Anchor cannot be an empty string");
      }
      if (spaceBefore)
        node.spaceBefore = true;
      if (comment) {
        node.comment = comment;
        node.range[2] = end;
      }
      return node;
    }
    function composeAlias({ options }, { offset, source, end }, onError) {
      const alias = new Alias.Alias(source.substring(1));
      if (alias.source === "")
        onError(offset, "BAD_ALIAS", "Alias cannot be an empty string");
      if (alias.source.endsWith(":"))
        onError(offset + source.length - 1, "BAD_ALIAS", "Alias ending in : is ambiguous", true);
      const valueEnd = offset + source.length;
      const re = resolveEnd.resolveEnd(end, valueEnd, options.strict, onError);
      alias.range = [offset, valueEnd, re.offset];
      if (re.comment)
        alias.comment = re.comment;
      return alias;
    }
    exports.composeEmptyNode = composeEmptyNode;
    exports.composeNode = composeNode;
  }
});

// node_modules/yaml/dist/compose/compose-doc.js
var require_compose_doc = __commonJS({
  "node_modules/yaml/dist/compose/compose-doc.js"(exports) {
    "use strict";
    var Document = require_Document();
    var composeNode = require_compose_node();
    var resolveEnd = require_resolve_end();
    var resolveProps = require_resolve_props();
    function composeDoc(options, directives, { offset, start, value, end }, onError) {
      const opts = Object.assign({ _directives: directives }, options);
      const doc = new Document.Document(void 0, opts);
      const ctx = {
        atKey: false,
        atRoot: true,
        directives: doc.directives,
        options: doc.options,
        schema: doc.schema
      };
      const props = resolveProps.resolveProps(start, {
        indicator: "doc-start",
        next: value ?? end?.[0],
        offset,
        onError,
        parentIndent: 0,
        startOnNewline: true
      });
      if (props.found) {
        doc.directives.docStart = true;
        if (value && (value.type === "block-map" || value.type === "block-seq") && !props.hasNewline)
          onError(props.end, "MISSING_CHAR", "Block collection cannot start on same line with directives-end marker");
      }
      doc.contents = value ? composeNode.composeNode(ctx, value, props, onError) : composeNode.composeEmptyNode(ctx, props.end, start, null, props, onError);
      const contentEnd = doc.contents.range[2];
      const re = resolveEnd.resolveEnd(end, contentEnd, false, onError);
      if (re.comment)
        doc.comment = re.comment;
      doc.range = [offset, contentEnd, re.offset];
      return doc;
    }
    exports.composeDoc = composeDoc;
  }
});

// node_modules/yaml/dist/compose/composer.js
var require_composer = __commonJS({
  "node_modules/yaml/dist/compose/composer.js"(exports) {
    "use strict";
    var node_process = __require("process");
    var directives = require_directives();
    var Document = require_Document();
    var errors = require_errors();
    var identity = require_identity();
    var composeDoc = require_compose_doc();
    var resolveEnd = require_resolve_end();
    function getErrorPos(src) {
      if (typeof src === "number")
        return [src, src + 1];
      if (Array.isArray(src))
        return src.length === 2 ? src : [src[0], src[1]];
      const { offset, source } = src;
      return [offset, offset + (typeof source === "string" ? source.length : 1)];
    }
    function parsePrelude(prelude) {
      let comment = "";
      let atComment = false;
      let afterEmptyLine = false;
      for (let i = 0; i < prelude.length; ++i) {
        const source = prelude[i];
        switch (source[0]) {
          case "#":
            comment += (comment === "" ? "" : afterEmptyLine ? "\n\n" : "\n") + (source.substring(1) || " ");
            atComment = true;
            afterEmptyLine = false;
            break;
          case "%":
            if (prelude[i + 1]?.[0] !== "#")
              i += 1;
            atComment = false;
            break;
          default:
            if (!atComment)
              afterEmptyLine = true;
            atComment = false;
        }
      }
      return { comment, afterEmptyLine };
    }
    var Composer = class {
      constructor(options = {}) {
        this.doc = null;
        this.atDirectives = false;
        this.prelude = [];
        this.errors = [];
        this.warnings = [];
        this.onError = (source, code, message, warning) => {
          const pos = getErrorPos(source);
          if (warning)
            this.warnings.push(new errors.YAMLWarning(pos, code, message));
          else
            this.errors.push(new errors.YAMLParseError(pos, code, message));
        };
        this.directives = new directives.Directives({ version: options.version || "1.2" });
        this.options = options;
      }
      decorate(doc, afterDoc) {
        const { comment, afterEmptyLine } = parsePrelude(this.prelude);
        if (comment) {
          const dc = doc.contents;
          if (afterDoc) {
            doc.comment = doc.comment ? `${doc.comment}
${comment}` : comment;
          } else if (afterEmptyLine || doc.directives.docStart || !dc) {
            doc.commentBefore = comment;
          } else if (identity.isCollection(dc) && !dc.flow && dc.items.length > 0) {
            let it = dc.items[0];
            if (identity.isPair(it))
              it = it.key;
            const cb = it.commentBefore;
            it.commentBefore = cb ? `${comment}
${cb}` : comment;
          } else {
            const cb = dc.commentBefore;
            dc.commentBefore = cb ? `${comment}
${cb}` : comment;
          }
        }
        if (afterDoc) {
          for (let i = 0; i < this.errors.length; ++i)
            doc.errors.push(this.errors[i]);
          for (let i = 0; i < this.warnings.length; ++i)
            doc.warnings.push(this.warnings[i]);
        } else {
          doc.errors = this.errors;
          doc.warnings = this.warnings;
        }
        this.prelude = [];
        this.errors = [];
        this.warnings = [];
      }
      /**
       * Current stream status information.
       *
       * Mostly useful at the end of input for an empty stream.
       */
      streamInfo() {
        return {
          comment: parsePrelude(this.prelude).comment,
          directives: this.directives,
          errors: this.errors,
          warnings: this.warnings
        };
      }
      /**
       * Compose tokens into documents.
       *
       * @param forceDoc - If the stream contains no document, still emit a final document including any comments and directives that would be applied to a subsequent document.
       * @param endOffset - Should be set if `forceDoc` is also set, to set the document range end and to indicate errors correctly.
       */
      *compose(tokens, forceDoc = false, endOffset = -1) {
        for (const token of tokens)
          yield* this.next(token);
        yield* this.end(forceDoc, endOffset);
      }
      /** Advance the composer by one CST token. */
      *next(token) {
        if (node_process.env.LOG_STREAM)
          console.dir(token, { depth: null });
        switch (token.type) {
          case "directive":
            this.directives.add(token.source, (offset, message, warning) => {
              const pos = getErrorPos(token);
              pos[0] += offset;
              this.onError(pos, "BAD_DIRECTIVE", message, warning);
            });
            this.prelude.push(token.source);
            this.atDirectives = true;
            break;
          case "document": {
            const doc = composeDoc.composeDoc(this.options, this.directives, token, this.onError);
            if (this.atDirectives && !doc.directives.docStart)
              this.onError(token, "MISSING_CHAR", "Missing directives-end/doc-start indicator line");
            this.decorate(doc, false);
            if (this.doc)
              yield this.doc;
            this.doc = doc;
            this.atDirectives = false;
            break;
          }
          case "byte-order-mark":
          case "space":
            break;
          case "comment":
          case "newline":
            this.prelude.push(token.source);
            break;
          case "error": {
            const msg = token.source ? `${token.message}: ${JSON.stringify(token.source)}` : token.message;
            const error = new errors.YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", msg);
            if (this.atDirectives || !this.doc)
              this.errors.push(error);
            else
              this.doc.errors.push(error);
            break;
          }
          case "doc-end": {
            if (!this.doc) {
              const msg = "Unexpected doc-end without preceding document";
              this.errors.push(new errors.YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", msg));
              break;
            }
            this.doc.directives.docEnd = true;
            const end = resolveEnd.resolveEnd(token.end, token.offset + token.source.length, this.doc.options.strict, this.onError);
            this.decorate(this.doc, true);
            if (end.comment) {
              const dc = this.doc.comment;
              this.doc.comment = dc ? `${dc}
${end.comment}` : end.comment;
            }
            this.doc.range[2] = end.offset;
            break;
          }
          default:
            this.errors.push(new errors.YAMLParseError(getErrorPos(token), "UNEXPECTED_TOKEN", `Unsupported token ${token.type}`));
        }
      }
      /**
       * Call at end of input to yield any remaining document.
       *
       * @param forceDoc - If the stream contains no document, still emit a final document including any comments and directives that would be applied to a subsequent document.
       * @param endOffset - Should be set if `forceDoc` is also set, to set the document range end and to indicate errors correctly.
       */
      *end(forceDoc = false, endOffset = -1) {
        if (this.doc) {
          this.decorate(this.doc, true);
          yield this.doc;
          this.doc = null;
        } else if (forceDoc) {
          const opts = Object.assign({ _directives: this.directives }, this.options);
          const doc = new Document.Document(void 0, opts);
          if (this.atDirectives)
            this.onError(endOffset, "MISSING_CHAR", "Missing directives-end indicator line");
          doc.range = [0, endOffset, endOffset];
          this.decorate(doc, false);
          yield doc;
        }
      }
    };
    exports.Composer = Composer;
  }
});

// node_modules/yaml/dist/parse/cst-scalar.js
var require_cst_scalar = __commonJS({
  "node_modules/yaml/dist/parse/cst-scalar.js"(exports) {
    "use strict";
    var resolveBlockScalar = require_resolve_block_scalar();
    var resolveFlowScalar = require_resolve_flow_scalar();
    var errors = require_errors();
    var stringifyString = require_stringifyString();
    function resolveAsScalar(token, strict = true, onError) {
      if (token) {
        const _onError = (pos, code, message) => {
          const offset = typeof pos === "number" ? pos : Array.isArray(pos) ? pos[0] : pos.offset;
          if (onError)
            onError(offset, code, message);
          else
            throw new errors.YAMLParseError([offset, offset + 1], code, message);
        };
        switch (token.type) {
          case "scalar":
          case "single-quoted-scalar":
          case "double-quoted-scalar":
            return resolveFlowScalar.resolveFlowScalar(token, strict, _onError);
          case "block-scalar":
            return resolveBlockScalar.resolveBlockScalar({ options: { strict } }, token, _onError);
        }
      }
      return null;
    }
    function createScalarToken(value, context) {
      const { implicitKey = false, indent, inFlow = false, offset = -1, type = "PLAIN" } = context;
      const source = stringifyString.stringifyString({ type, value }, {
        implicitKey,
        indent: indent > 0 ? " ".repeat(indent) : "",
        inFlow,
        options: { blockQuote: true, lineWidth: -1 }
      });
      const end = context.end ?? [
        { type: "newline", offset: -1, indent, source: "\n" }
      ];
      switch (source[0]) {
        case "|":
        case ">": {
          const he = source.indexOf("\n");
          const head = source.substring(0, he);
          const body = source.substring(he + 1) + "\n";
          const props = [
            { type: "block-scalar-header", offset, indent, source: head }
          ];
          if (!addEndtoBlockProps(props, end))
            props.push({ type: "newline", offset: -1, indent, source: "\n" });
          return { type: "block-scalar", offset, indent, props, source: body };
        }
        case '"':
          return { type: "double-quoted-scalar", offset, indent, source, end };
        case "'":
          return { type: "single-quoted-scalar", offset, indent, source, end };
        default:
          return { type: "scalar", offset, indent, source, end };
      }
    }
    function setScalarValue(token, value, context = {}) {
      let { afterKey = false, implicitKey = false, inFlow = false, type } = context;
      let indent = "indent" in token ? token.indent : null;
      if (afterKey && typeof indent === "number")
        indent += 2;
      if (!type)
        switch (token.type) {
          case "single-quoted-scalar":
            type = "QUOTE_SINGLE";
            break;
          case "double-quoted-scalar":
            type = "QUOTE_DOUBLE";
            break;
          case "block-scalar": {
            const header = token.props[0];
            if (header.type !== "block-scalar-header")
              throw new Error("Invalid block scalar header");
            type = header.source[0] === ">" ? "BLOCK_FOLDED" : "BLOCK_LITERAL";
            break;
          }
          default:
            type = "PLAIN";
        }
      const source = stringifyString.stringifyString({ type, value }, {
        implicitKey: implicitKey || indent === null,
        indent: indent !== null && indent > 0 ? " ".repeat(indent) : "",
        inFlow,
        options: { blockQuote: true, lineWidth: -1 }
      });
      switch (source[0]) {
        case "|":
        case ">":
          setBlockScalarValue(token, source);
          break;
        case '"':
          setFlowScalarValue(token, source, "double-quoted-scalar");
          break;
        case "'":
          setFlowScalarValue(token, source, "single-quoted-scalar");
          break;
        default:
          setFlowScalarValue(token, source, "scalar");
      }
    }
    function setBlockScalarValue(token, source) {
      const he = source.indexOf("\n");
      const head = source.substring(0, he);
      const body = source.substring(he + 1) + "\n";
      if (token.type === "block-scalar") {
        const header = token.props[0];
        if (header.type !== "block-scalar-header")
          throw new Error("Invalid block scalar header");
        header.source = head;
        token.source = body;
      } else {
        const { offset } = token;
        const indent = "indent" in token ? token.indent : -1;
        const props = [
          { type: "block-scalar-header", offset, indent, source: head }
        ];
        if (!addEndtoBlockProps(props, "end" in token ? token.end : void 0))
          props.push({ type: "newline", offset: -1, indent, source: "\n" });
        for (const key of Object.keys(token))
          if (key !== "type" && key !== "offset")
            delete token[key];
        Object.assign(token, { type: "block-scalar", indent, props, source: body });
      }
    }
    function addEndtoBlockProps(props, end) {
      if (end)
        for (const st of end)
          switch (st.type) {
            case "space":
            case "comment":
              props.push(st);
              break;
            case "newline":
              props.push(st);
              return true;
          }
      return false;
    }
    function setFlowScalarValue(token, source, type) {
      switch (token.type) {
        case "scalar":
        case "double-quoted-scalar":
        case "single-quoted-scalar":
          token.type = type;
          token.source = source;
          break;
        case "block-scalar": {
          const end = token.props.slice(1);
          let oa = source.length;
          if (token.props[0].type === "block-scalar-header")
            oa -= token.props[0].source.length;
          for (const tok of end)
            tok.offset += oa;
          delete token.props;
          Object.assign(token, { type, source, end });
          break;
        }
        case "block-map":
        case "block-seq": {
          const offset = token.offset + source.length;
          const nl = { type: "newline", offset, indent: token.indent, source: "\n" };
          delete token.items;
          Object.assign(token, { type, source, end: [nl] });
          break;
        }
        default: {
          const indent = "indent" in token ? token.indent : -1;
          const end = "end" in token && Array.isArray(token.end) ? token.end.filter((st) => st.type === "space" || st.type === "comment" || st.type === "newline") : [];
          for (const key of Object.keys(token))
            if (key !== "type" && key !== "offset")
              delete token[key];
          Object.assign(token, { type, indent, source, end });
        }
      }
    }
    exports.createScalarToken = createScalarToken;
    exports.resolveAsScalar = resolveAsScalar;
    exports.setScalarValue = setScalarValue;
  }
});

// node_modules/yaml/dist/parse/cst-stringify.js
var require_cst_stringify = __commonJS({
  "node_modules/yaml/dist/parse/cst-stringify.js"(exports) {
    "use strict";
    var stringify = (cst) => "type" in cst ? stringifyToken(cst) : stringifyItem(cst);
    function stringifyToken(token) {
      switch (token.type) {
        case "block-scalar": {
          let res = "";
          for (const tok of token.props)
            res += stringifyToken(tok);
          return res + token.source;
        }
        case "block-map":
        case "block-seq": {
          let res = "";
          for (const item of token.items)
            res += stringifyItem(item);
          return res;
        }
        case "flow-collection": {
          let res = token.start.source;
          for (const item of token.items)
            res += stringifyItem(item);
          for (const st of token.end)
            res += st.source;
          return res;
        }
        case "document": {
          let res = stringifyItem(token);
          if (token.end)
            for (const st of token.end)
              res += st.source;
          return res;
        }
        default: {
          let res = token.source;
          if ("end" in token && token.end)
            for (const st of token.end)
              res += st.source;
          return res;
        }
      }
    }
    function stringifyItem({ start, key, sep, value }) {
      let res = "";
      for (const st of start)
        res += st.source;
      if (key)
        res += stringifyToken(key);
      if (sep)
        for (const st of sep)
          res += st.source;
      if (value)
        res += stringifyToken(value);
      return res;
    }
    exports.stringify = stringify;
  }
});

// node_modules/yaml/dist/parse/cst-visit.js
var require_cst_visit = __commonJS({
  "node_modules/yaml/dist/parse/cst-visit.js"(exports) {
    "use strict";
    var BREAK = /* @__PURE__ */ Symbol("break visit");
    var SKIP = /* @__PURE__ */ Symbol("skip children");
    var REMOVE = /* @__PURE__ */ Symbol("remove item");
    function visit(cst, visitor) {
      if ("type" in cst && cst.type === "document")
        cst = { start: cst.start, value: cst.value };
      _visit(Object.freeze([]), cst, visitor);
    }
    visit.BREAK = BREAK;
    visit.SKIP = SKIP;
    visit.REMOVE = REMOVE;
    visit.itemAtPath = (cst, path13) => {
      let item = cst;
      for (const [field, index] of path13) {
        const tok = item?.[field];
        if (tok && "items" in tok) {
          item = tok.items[index];
        } else
          return void 0;
      }
      return item;
    };
    visit.parentCollection = (cst, path13) => {
      const parent = visit.itemAtPath(cst, path13.slice(0, -1));
      const field = path13[path13.length - 1][0];
      const coll = parent?.[field];
      if (coll && "items" in coll)
        return coll;
      throw new Error("Parent collection not found");
    };
    function _visit(path13, item, visitor) {
      let ctrl = visitor(item, path13);
      if (typeof ctrl === "symbol")
        return ctrl;
      for (const field of ["key", "value"]) {
        const token = item[field];
        if (token && "items" in token) {
          for (let i = 0; i < token.items.length; ++i) {
            const ci = _visit(Object.freeze(path13.concat([[field, i]])), token.items[i], visitor);
            if (typeof ci === "number")
              i = ci - 1;
            else if (ci === BREAK)
              return BREAK;
            else if (ci === REMOVE) {
              token.items.splice(i, 1);
              i -= 1;
            }
          }
          if (typeof ctrl === "function" && field === "key")
            ctrl = ctrl(item, path13);
        }
      }
      return typeof ctrl === "function" ? ctrl(item, path13) : ctrl;
    }
    exports.visit = visit;
  }
});

// node_modules/yaml/dist/parse/cst.js
var require_cst = __commonJS({
  "node_modules/yaml/dist/parse/cst.js"(exports) {
    "use strict";
    var cstScalar = require_cst_scalar();
    var cstStringify = require_cst_stringify();
    var cstVisit = require_cst_visit();
    var BOM = "\uFEFF";
    var DOCUMENT = "";
    var FLOW_END = "";
    var SCALAR = "";
    var isCollection = (token) => !!token && "items" in token;
    var isScalar = (token) => !!token && (token.type === "scalar" || token.type === "single-quoted-scalar" || token.type === "double-quoted-scalar" || token.type === "block-scalar");
    function prettyToken(token) {
      switch (token) {
        case BOM:
          return "<BOM>";
        case DOCUMENT:
          return "<DOC>";
        case FLOW_END:
          return "<FLOW_END>";
        case SCALAR:
          return "<SCALAR>";
        default:
          return JSON.stringify(token);
      }
    }
    function tokenType(source) {
      switch (source) {
        case BOM:
          return "byte-order-mark";
        case DOCUMENT:
          return "doc-mode";
        case FLOW_END:
          return "flow-error-end";
        case SCALAR:
          return "scalar";
        case "---":
          return "doc-start";
        case "...":
          return "doc-end";
        case "":
        case "\n":
        case "\r\n":
          return "newline";
        case "-":
          return "seq-item-ind";
        case "?":
          return "explicit-key-ind";
        case ":":
          return "map-value-ind";
        case "{":
          return "flow-map-start";
        case "}":
          return "flow-map-end";
        case "[":
          return "flow-seq-start";
        case "]":
          return "flow-seq-end";
        case ",":
          return "comma";
      }
      switch (source[0]) {
        case " ":
        case "	":
          return "space";
        case "#":
          return "comment";
        case "%":
          return "directive-line";
        case "*":
          return "alias";
        case "&":
          return "anchor";
        case "!":
          return "tag";
        case "'":
          return "single-quoted-scalar";
        case '"':
          return "double-quoted-scalar";
        case "|":
        case ">":
          return "block-scalar-header";
      }
      return null;
    }
    exports.createScalarToken = cstScalar.createScalarToken;
    exports.resolveAsScalar = cstScalar.resolveAsScalar;
    exports.setScalarValue = cstScalar.setScalarValue;
    exports.stringify = cstStringify.stringify;
    exports.visit = cstVisit.visit;
    exports.BOM = BOM;
    exports.DOCUMENT = DOCUMENT;
    exports.FLOW_END = FLOW_END;
    exports.SCALAR = SCALAR;
    exports.isCollection = isCollection;
    exports.isScalar = isScalar;
    exports.prettyToken = prettyToken;
    exports.tokenType = tokenType;
  }
});

// node_modules/yaml/dist/parse/lexer.js
var require_lexer = __commonJS({
  "node_modules/yaml/dist/parse/lexer.js"(exports) {
    "use strict";
    var cst = require_cst();
    function isEmpty(ch) {
      switch (ch) {
        case void 0:
        case " ":
        case "\n":
        case "\r":
        case "	":
          return true;
        default:
          return false;
      }
    }
    var hexDigits = new Set("0123456789ABCDEFabcdef");
    var tagChars = new Set("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz-#;/?:@&=+$_.!~*'()");
    var flowIndicatorChars = new Set(",[]{}");
    var invalidAnchorChars = new Set(" ,[]{}\n\r	");
    var isNotAnchorChar = (ch) => !ch || invalidAnchorChars.has(ch);
    var Lexer = class {
      constructor() {
        this.atEnd = false;
        this.blockScalarIndent = -1;
        this.blockScalarKeep = false;
        this.buffer = "";
        this.flowKey = false;
        this.flowLevel = 0;
        this.indentNext = 0;
        this.indentValue = 0;
        this.lineEndPos = null;
        this.next = null;
        this.pos = 0;
      }
      /**
       * Generate YAML tokens from the `source` string. If `incomplete`,
       * a part of the last line may be left as a buffer for the next call.
       *
       * @returns A generator of lexical tokens
       */
      *lex(source, incomplete = false) {
        if (source) {
          if (typeof source !== "string")
            throw TypeError("source is not a string");
          this.buffer = this.buffer ? this.buffer + source : source;
          this.lineEndPos = null;
        }
        this.atEnd = !incomplete;
        let next = this.next ?? "stream";
        while (next && (incomplete || this.hasChars(1)))
          next = yield* this.parseNext(next);
      }
      atLineEnd() {
        let i = this.pos;
        let ch = this.buffer[i];
        while (ch === " " || ch === "	")
          ch = this.buffer[++i];
        if (!ch || ch === "#" || ch === "\n")
          return true;
        if (ch === "\r")
          return this.buffer[i + 1] === "\n";
        return false;
      }
      charAt(n) {
        return this.buffer[this.pos + n];
      }
      continueScalar(offset) {
        let ch = this.buffer[offset];
        if (this.indentNext > 0) {
          let indent = 0;
          while (ch === " ")
            ch = this.buffer[++indent + offset];
          if (ch === "\r") {
            const next = this.buffer[indent + offset + 1];
            if (next === "\n" || !next && !this.atEnd)
              return offset + indent + 1;
          }
          return ch === "\n" || indent >= this.indentNext || !ch && !this.atEnd ? offset + indent : -1;
        }
        if (ch === "-" || ch === ".") {
          const dt = this.buffer.substr(offset, 3);
          if ((dt === "---" || dt === "...") && isEmpty(this.buffer[offset + 3]))
            return -1;
        }
        return offset;
      }
      getLine() {
        let end = this.lineEndPos;
        if (typeof end !== "number" || end !== -1 && end < this.pos) {
          end = this.buffer.indexOf("\n", this.pos);
          this.lineEndPos = end;
        }
        if (end === -1)
          return this.atEnd ? this.buffer.substring(this.pos) : null;
        if (this.buffer[end - 1] === "\r")
          end -= 1;
        return this.buffer.substring(this.pos, end);
      }
      hasChars(n) {
        return this.pos + n <= this.buffer.length;
      }
      setNext(state) {
        this.buffer = this.buffer.substring(this.pos);
        this.pos = 0;
        this.lineEndPos = null;
        this.next = state;
        return null;
      }
      peek(n) {
        return this.buffer.substr(this.pos, n);
      }
      *parseNext(next) {
        switch (next) {
          case "stream":
            return yield* this.parseStream();
          case "line-start":
            return yield* this.parseLineStart();
          case "block-start":
            return yield* this.parseBlockStart();
          case "doc":
            return yield* this.parseDocument();
          case "flow":
            return yield* this.parseFlowCollection();
          case "quoted-scalar":
            return yield* this.parseQuotedScalar();
          case "block-scalar":
            return yield* this.parseBlockScalar();
          case "plain-scalar":
            return yield* this.parsePlainScalar();
        }
      }
      *parseStream() {
        let line = this.getLine();
        if (line === null)
          return this.setNext("stream");
        if (line[0] === cst.BOM) {
          yield* this.pushCount(1);
          line = line.substring(1);
        }
        if (line[0] === "%") {
          let dirEnd = line.length;
          let cs = line.indexOf("#");
          while (cs !== -1) {
            const ch = line[cs - 1];
            if (ch === " " || ch === "	") {
              dirEnd = cs - 1;
              break;
            } else {
              cs = line.indexOf("#", cs + 1);
            }
          }
          while (true) {
            const ch = line[dirEnd - 1];
            if (ch === " " || ch === "	")
              dirEnd -= 1;
            else
              break;
          }
          const n = (yield* this.pushCount(dirEnd)) + (yield* this.pushSpaces(true));
          yield* this.pushCount(line.length - n);
          this.pushNewline();
          return "stream";
        }
        if (this.atLineEnd()) {
          const sp = yield* this.pushSpaces(true);
          yield* this.pushCount(line.length - sp);
          yield* this.pushNewline();
          return "stream";
        }
        yield cst.DOCUMENT;
        return yield* this.parseLineStart();
      }
      *parseLineStart() {
        const ch = this.charAt(0);
        if (!ch && !this.atEnd)
          return this.setNext("line-start");
        if (ch === "-" || ch === ".") {
          if (!this.atEnd && !this.hasChars(4))
            return this.setNext("line-start");
          const s2 = this.peek(3);
          if ((s2 === "---" || s2 === "...") && isEmpty(this.charAt(3))) {
            yield* this.pushCount(3);
            this.indentValue = 0;
            this.indentNext = 0;
            return s2 === "---" ? "doc" : "stream";
          }
        }
        this.indentValue = yield* this.pushSpaces(false);
        if (this.indentNext > this.indentValue && !isEmpty(this.charAt(1)))
          this.indentNext = this.indentValue;
        return yield* this.parseBlockStart();
      }
      *parseBlockStart() {
        const [ch0, ch1] = this.peek(2);
        if (!ch1 && !this.atEnd)
          return this.setNext("block-start");
        if ((ch0 === "-" || ch0 === "?" || ch0 === ":") && isEmpty(ch1)) {
          const n = (yield* this.pushCount(1)) + (yield* this.pushSpaces(true));
          this.indentNext = this.indentValue + 1;
          this.indentValue += n;
          return "block-start";
        }
        return "doc";
      }
      *parseDocument() {
        yield* this.pushSpaces(true);
        const line = this.getLine();
        if (line === null)
          return this.setNext("doc");
        let n = yield* this.pushIndicators();
        switch (line[n]) {
          case "#":
            yield* this.pushCount(line.length - n);
          // fallthrough
          case void 0:
            yield* this.pushNewline();
            return yield* this.parseLineStart();
          case "{":
          case "[":
            yield* this.pushCount(1);
            this.flowKey = false;
            this.flowLevel = 1;
            return "flow";
          case "}":
          case "]":
            yield* this.pushCount(1);
            return "doc";
          case "*":
            yield* this.pushUntil(isNotAnchorChar);
            return "doc";
          case '"':
          case "'":
            return yield* this.parseQuotedScalar();
          case "|":
          case ">":
            n += yield* this.parseBlockScalarHeader();
            n += yield* this.pushSpaces(true);
            yield* this.pushCount(line.length - n);
            yield* this.pushNewline();
            return yield* this.parseBlockScalar();
          default:
            return yield* this.parsePlainScalar();
        }
      }
      *parseFlowCollection() {
        let nl, sp;
        let indent = -1;
        do {
          nl = yield* this.pushNewline();
          if (nl > 0) {
            sp = yield* this.pushSpaces(false);
            this.indentValue = indent = sp;
          } else {
            sp = 0;
          }
          sp += yield* this.pushSpaces(true);
        } while (nl + sp > 0);
        const line = this.getLine();
        if (line === null)
          return this.setNext("flow");
        if (indent !== -1 && indent < this.indentNext && line[0] !== "#" || indent === 0 && (line.startsWith("---") || line.startsWith("...")) && isEmpty(line[3])) {
          const atFlowEndMarker = indent === this.indentNext - 1 && this.flowLevel === 1 && (line[0] === "]" || line[0] === "}");
          if (!atFlowEndMarker) {
            this.flowLevel = 0;
            yield cst.FLOW_END;
            return yield* this.parseLineStart();
          }
        }
        let n = 0;
        while (line[n] === ",") {
          n += yield* this.pushCount(1);
          n += yield* this.pushSpaces(true);
          this.flowKey = false;
        }
        n += yield* this.pushIndicators();
        switch (line[n]) {
          case void 0:
            return "flow";
          case "#":
            yield* this.pushCount(line.length - n);
            return "flow";
          case "{":
          case "[":
            yield* this.pushCount(1);
            this.flowKey = false;
            this.flowLevel += 1;
            return "flow";
          case "}":
          case "]":
            yield* this.pushCount(1);
            this.flowKey = true;
            this.flowLevel -= 1;
            return this.flowLevel ? "flow" : "doc";
          case "*":
            yield* this.pushUntil(isNotAnchorChar);
            return "flow";
          case '"':
          case "'":
            this.flowKey = true;
            return yield* this.parseQuotedScalar();
          case ":": {
            const next = this.charAt(1);
            if (this.flowKey || isEmpty(next) || next === ",") {
              this.flowKey = false;
              yield* this.pushCount(1);
              yield* this.pushSpaces(true);
              return "flow";
            }
          }
          // fallthrough
          default:
            this.flowKey = false;
            return yield* this.parsePlainScalar();
        }
      }
      *parseQuotedScalar() {
        const quote = this.charAt(0);
        let end = this.buffer.indexOf(quote, this.pos + 1);
        if (quote === "'") {
          while (end !== -1 && this.buffer[end + 1] === "'")
            end = this.buffer.indexOf("'", end + 2);
        } else {
          while (end !== -1) {
            let n = 0;
            while (this.buffer[end - 1 - n] === "\\")
              n += 1;
            if (n % 2 === 0)
              break;
            end = this.buffer.indexOf('"', end + 1);
          }
        }
        const qb = this.buffer.substring(0, end);
        let nl = qb.indexOf("\n", this.pos);
        if (nl !== -1) {
          while (nl !== -1) {
            const cs = this.continueScalar(nl + 1);
            if (cs === -1)
              break;
            nl = qb.indexOf("\n", cs);
          }
          if (nl !== -1) {
            end = nl - (qb[nl - 1] === "\r" ? 2 : 1);
          }
        }
        if (end === -1) {
          if (!this.atEnd)
            return this.setNext("quoted-scalar");
          end = this.buffer.length;
        }
        yield* this.pushToIndex(end + 1, false);
        return this.flowLevel ? "flow" : "doc";
      }
      *parseBlockScalarHeader() {
        this.blockScalarIndent = -1;
        this.blockScalarKeep = false;
        let i = this.pos;
        while (true) {
          const ch = this.buffer[++i];
          if (ch === "+")
            this.blockScalarKeep = true;
          else if (ch > "0" && ch <= "9")
            this.blockScalarIndent = Number(ch) - 1;
          else if (ch !== "-")
            break;
        }
        return yield* this.pushUntil((ch) => isEmpty(ch) || ch === "#");
      }
      *parseBlockScalar() {
        let nl = this.pos - 1;
        let indent = 0;
        let ch;
        loop: for (let i2 = this.pos; ch = this.buffer[i2]; ++i2) {
          switch (ch) {
            case " ":
              indent += 1;
              break;
            case "\n":
              nl = i2;
              indent = 0;
              break;
            case "\r": {
              const next = this.buffer[i2 + 1];
              if (!next && !this.atEnd)
                return this.setNext("block-scalar");
              if (next === "\n")
                break;
            }
            // fallthrough
            default:
              break loop;
          }
        }
        if (!ch && !this.atEnd)
          return this.setNext("block-scalar");
        if (indent >= this.indentNext) {
          if (this.blockScalarIndent === -1)
            this.indentNext = indent;
          else {
            this.indentNext = this.blockScalarIndent + (this.indentNext === 0 ? 1 : this.indentNext);
          }
          do {
            const cs = this.continueScalar(nl + 1);
            if (cs === -1)
              break;
            nl = this.buffer.indexOf("\n", cs);
          } while (nl !== -1);
          if (nl === -1) {
            if (!this.atEnd)
              return this.setNext("block-scalar");
            nl = this.buffer.length;
          }
        }
        let i = nl + 1;
        ch = this.buffer[i];
        while (ch === " ")
          ch = this.buffer[++i];
        if (ch === "	") {
          while (ch === "	" || ch === " " || ch === "\r" || ch === "\n")
            ch = this.buffer[++i];
          nl = i - 1;
        } else if (!this.blockScalarKeep) {
          do {
            let i2 = nl - 1;
            let ch2 = this.buffer[i2];
            if (ch2 === "\r")
              ch2 = this.buffer[--i2];
            const lastChar = i2;
            while (ch2 === " ")
              ch2 = this.buffer[--i2];
            if (ch2 === "\n" && i2 >= this.pos && i2 + 1 + indent > lastChar)
              nl = i2;
            else
              break;
          } while (true);
        }
        yield cst.SCALAR;
        yield* this.pushToIndex(nl + 1, true);
        return yield* this.parseLineStart();
      }
      *parsePlainScalar() {
        const inFlow = this.flowLevel > 0;
        let end = this.pos - 1;
        let i = this.pos - 1;
        let ch;
        while (ch = this.buffer[++i]) {
          if (ch === ":") {
            const next = this.buffer[i + 1];
            if (isEmpty(next) || inFlow && flowIndicatorChars.has(next))
              break;
            end = i;
          } else if (isEmpty(ch)) {
            let next = this.buffer[i + 1];
            if (ch === "\r") {
              if (next === "\n") {
                i += 1;
                ch = "\n";
                next = this.buffer[i + 1];
              } else
                end = i;
            }
            if (next === "#" || inFlow && flowIndicatorChars.has(next))
              break;
            if (ch === "\n") {
              const cs = this.continueScalar(i + 1);
              if (cs === -1)
                break;
              i = Math.max(i, cs - 2);
            }
          } else {
            if (inFlow && flowIndicatorChars.has(ch))
              break;
            end = i;
          }
        }
        if (!ch && !this.atEnd)
          return this.setNext("plain-scalar");
        yield cst.SCALAR;
        yield* this.pushToIndex(end + 1, true);
        return inFlow ? "flow" : "doc";
      }
      *pushCount(n) {
        if (n > 0) {
          yield this.buffer.substr(this.pos, n);
          this.pos += n;
          return n;
        }
        return 0;
      }
      *pushToIndex(i, allowEmpty) {
        const s2 = this.buffer.slice(this.pos, i);
        if (s2) {
          yield s2;
          this.pos += s2.length;
          return s2.length;
        } else if (allowEmpty)
          yield "";
        return 0;
      }
      *pushIndicators() {
        let n = 0;
        loop: while (true) {
          switch (this.charAt(0)) {
            case "!":
              n += yield* this.pushTag();
              n += yield* this.pushSpaces(true);
              continue loop;
            case "&":
              n += yield* this.pushUntil(isNotAnchorChar);
              n += yield* this.pushSpaces(true);
              continue loop;
            case "-":
            // this is an error
            case "?":
            // this is an error outside flow collections
            case ":": {
              const inFlow = this.flowLevel > 0;
              const ch1 = this.charAt(1);
              if (isEmpty(ch1) || inFlow && flowIndicatorChars.has(ch1)) {
                if (!inFlow)
                  this.indentNext = this.indentValue + 1;
                else if (this.flowKey)
                  this.flowKey = false;
                n += yield* this.pushCount(1);
                n += yield* this.pushSpaces(true);
                continue loop;
              }
            }
          }
          break loop;
        }
        return n;
      }
      *pushTag() {
        if (this.charAt(1) === "<") {
          let i = this.pos + 2;
          let ch = this.buffer[i];
          while (!isEmpty(ch) && ch !== ">")
            ch = this.buffer[++i];
          return yield* this.pushToIndex(ch === ">" ? i + 1 : i, false);
        } else {
          let i = this.pos + 1;
          let ch = this.buffer[i];
          while (ch) {
            if (tagChars.has(ch))
              ch = this.buffer[++i];
            else if (ch === "%" && hexDigits.has(this.buffer[i + 1]) && hexDigits.has(this.buffer[i + 2])) {
              ch = this.buffer[i += 3];
            } else
              break;
          }
          return yield* this.pushToIndex(i, false);
        }
      }
      *pushNewline() {
        const ch = this.buffer[this.pos];
        if (ch === "\n")
          return yield* this.pushCount(1);
        else if (ch === "\r" && this.charAt(1) === "\n")
          return yield* this.pushCount(2);
        else
          return 0;
      }
      *pushSpaces(allowTabs) {
        let i = this.pos - 1;
        let ch;
        do {
          ch = this.buffer[++i];
        } while (ch === " " || allowTabs && ch === "	");
        const n = i - this.pos;
        if (n > 0) {
          yield this.buffer.substr(this.pos, n);
          this.pos = i;
        }
        return n;
      }
      *pushUntil(test) {
        let i = this.pos;
        let ch = this.buffer[i];
        while (!test(ch))
          ch = this.buffer[++i];
        return yield* this.pushToIndex(i, false);
      }
    };
    exports.Lexer = Lexer;
  }
});

// node_modules/yaml/dist/parse/line-counter.js
var require_line_counter = __commonJS({
  "node_modules/yaml/dist/parse/line-counter.js"(exports) {
    "use strict";
    var LineCounter = class {
      constructor() {
        this.lineStarts = [];
        this.addNewLine = (offset) => this.lineStarts.push(offset);
        this.linePos = (offset) => {
          let low = 0;
          let high = this.lineStarts.length;
          while (low < high) {
            const mid = low + high >> 1;
            if (this.lineStarts[mid] < offset)
              low = mid + 1;
            else
              high = mid;
          }
          if (this.lineStarts[low] === offset)
            return { line: low + 1, col: 1 };
          if (low === 0)
            return { line: 0, col: offset };
          const start = this.lineStarts[low - 1];
          return { line: low, col: offset - start + 1 };
        };
      }
    };
    exports.LineCounter = LineCounter;
  }
});

// node_modules/yaml/dist/parse/parser.js
var require_parser = __commonJS({
  "node_modules/yaml/dist/parse/parser.js"(exports) {
    "use strict";
    var node_process = __require("process");
    var cst = require_cst();
    var lexer = require_lexer();
    function includesToken(list, type) {
      for (let i = 0; i < list.length; ++i)
        if (list[i].type === type)
          return true;
      return false;
    }
    function findNonEmptyIndex(list) {
      for (let i = 0; i < list.length; ++i) {
        switch (list[i].type) {
          case "space":
          case "comment":
          case "newline":
            break;
          default:
            return i;
        }
      }
      return -1;
    }
    function isFlowToken(token) {
      switch (token?.type) {
        case "alias":
        case "scalar":
        case "single-quoted-scalar":
        case "double-quoted-scalar":
        case "flow-collection":
          return true;
        default:
          return false;
      }
    }
    function getPrevProps(parent) {
      switch (parent.type) {
        case "document":
          return parent.start;
        case "block-map": {
          const it = parent.items[parent.items.length - 1];
          return it.sep ?? it.start;
        }
        case "block-seq":
          return parent.items[parent.items.length - 1].start;
        /* istanbul ignore next should not happen */
        default:
          return [];
      }
    }
    function getFirstKeyStartProps(prev) {
      if (prev.length === 0)
        return [];
      let i = prev.length;
      loop: while (--i >= 0) {
        switch (prev[i].type) {
          case "doc-start":
          case "explicit-key-ind":
          case "map-value-ind":
          case "seq-item-ind":
          case "newline":
            break loop;
        }
      }
      while (prev[++i]?.type === "space") {
      }
      return prev.splice(i, prev.length);
    }
    function arrayPushArray(target, source) {
      if (source.length < 1e5)
        Array.prototype.push.apply(target, source);
      else
        for (let i = 0; i < source.length; ++i)
          target.push(source[i]);
    }
    function fixFlowSeqItems(fc) {
      if (fc.start.type === "flow-seq-start") {
        for (const it of fc.items) {
          if (it.sep && !it.value && !includesToken(it.start, "explicit-key-ind") && !includesToken(it.sep, "map-value-ind")) {
            if (it.key)
              it.value = it.key;
            delete it.key;
            if (isFlowToken(it.value)) {
              if (it.value.end)
                arrayPushArray(it.value.end, it.sep);
              else
                it.value.end = it.sep;
            } else
              arrayPushArray(it.start, it.sep);
            delete it.sep;
          }
        }
      }
    }
    var Parser = class {
      /**
       * @param onNewLine - If defined, called separately with the start position of
       *   each new line (in `parse()`, including the start of input).
       */
      constructor(onNewLine) {
        this.atNewLine = true;
        this.atScalar = false;
        this.indent = 0;
        this.offset = 0;
        this.onKeyLine = false;
        this.stack = [];
        this.source = "";
        this.type = "";
        this.lexer = new lexer.Lexer();
        this.onNewLine = onNewLine;
      }
      /**
       * Parse `source` as a YAML stream.
       * If `incomplete`, a part of the last line may be left as a buffer for the next call.
       *
       * Errors are not thrown, but yielded as `{ type: 'error', message }` tokens.
       *
       * @returns A generator of tokens representing each directive, document, and other structure.
       */
      *parse(source, incomplete = false) {
        if (this.onNewLine && this.offset === 0)
          this.onNewLine(0);
        for (const lexeme of this.lexer.lex(source, incomplete))
          yield* this.next(lexeme);
        if (!incomplete)
          yield* this.end();
      }
      /**
       * Advance the parser by the `source` of one lexical token.
       */
      *next(source) {
        this.source = source;
        if (node_process.env.LOG_TOKENS)
          console.log("|", cst.prettyToken(source));
        if (this.atScalar) {
          this.atScalar = false;
          yield* this.step();
          this.offset += source.length;
          return;
        }
        const type = cst.tokenType(source);
        if (!type) {
          const message = `Not a YAML token: ${source}`;
          yield* this.pop({ type: "error", offset: this.offset, message, source });
          this.offset += source.length;
        } else if (type === "scalar") {
          this.atNewLine = false;
          this.atScalar = true;
          this.type = "scalar";
        } else {
          this.type = type;
          yield* this.step();
          switch (type) {
            case "newline":
              this.atNewLine = true;
              this.indent = 0;
              if (this.onNewLine)
                this.onNewLine(this.offset + source.length);
              break;
            case "space":
              if (this.atNewLine && source[0] === " ")
                this.indent += source.length;
              break;
            case "explicit-key-ind":
            case "map-value-ind":
            case "seq-item-ind":
              if (this.atNewLine)
                this.indent += source.length;
              break;
            case "doc-mode":
            case "flow-error-end":
              return;
            default:
              this.atNewLine = false;
          }
          this.offset += source.length;
        }
      }
      /** Call at end of input to push out any remaining constructions */
      *end() {
        while (this.stack.length > 0)
          yield* this.pop();
      }
      get sourceToken() {
        const st = {
          type: this.type,
          offset: this.offset,
          indent: this.indent,
          source: this.source
        };
        return st;
      }
      *step() {
        const top = this.peek(1);
        if (this.type === "doc-end" && top?.type !== "doc-end") {
          while (this.stack.length > 0)
            yield* this.pop();
          this.stack.push({
            type: "doc-end",
            offset: this.offset,
            source: this.source
          });
          return;
        }
        if (!top)
          return yield* this.stream();
        switch (top.type) {
          case "document":
            return yield* this.document(top);
          case "alias":
          case "scalar":
          case "single-quoted-scalar":
          case "double-quoted-scalar":
            return yield* this.scalar(top);
          case "block-scalar":
            return yield* this.blockScalar(top);
          case "block-map":
            return yield* this.blockMap(top);
          case "block-seq":
            return yield* this.blockSequence(top);
          case "flow-collection":
            return yield* this.flowCollection(top);
          case "doc-end":
            return yield* this.documentEnd(top);
        }
        yield* this.pop();
      }
      peek(n) {
        return this.stack[this.stack.length - n];
      }
      *pop(error) {
        const token = error ?? this.stack.pop();
        if (!token) {
          const message = "Tried to pop an empty stack";
          yield { type: "error", offset: this.offset, source: "", message };
        } else if (this.stack.length === 0) {
          yield token;
        } else {
          const top = this.peek(1);
          if (token.type === "block-scalar") {
            token.indent = "indent" in top ? top.indent : 0;
          } else if (token.type === "flow-collection" && top.type === "document") {
            token.indent = 0;
          }
          if (token.type === "flow-collection")
            fixFlowSeqItems(token);
          switch (top.type) {
            case "document":
              top.value = token;
              break;
            case "block-scalar":
              top.props.push(token);
              break;
            case "block-map": {
              const it = top.items[top.items.length - 1];
              if (it.value) {
                top.items.push({ start: [], key: token, sep: [] });
                this.onKeyLine = true;
                return;
              } else if (it.sep) {
                it.value = token;
              } else {
                Object.assign(it, { key: token, sep: [] });
                this.onKeyLine = !it.explicitKey;
                return;
              }
              break;
            }
            case "block-seq": {
              const it = top.items[top.items.length - 1];
              if (it.value)
                top.items.push({ start: [], value: token });
              else
                it.value = token;
              break;
            }
            case "flow-collection": {
              const it = top.items[top.items.length - 1];
              if (!it || it.value)
                top.items.push({ start: [], key: token, sep: [] });
              else if (it.sep)
                it.value = token;
              else
                Object.assign(it, { key: token, sep: [] });
              return;
            }
            /* istanbul ignore next should not happen */
            default:
              yield* this.pop();
              yield* this.pop(token);
          }
          if ((top.type === "document" || top.type === "block-map" || top.type === "block-seq") && (token.type === "block-map" || token.type === "block-seq")) {
            const last = token.items[token.items.length - 1];
            if (last && !last.sep && !last.value && last.start.length > 0 && findNonEmptyIndex(last.start) === -1 && (token.indent === 0 || last.start.every((st) => st.type !== "comment" || st.indent < token.indent))) {
              if (top.type === "document")
                top.end = last.start;
              else
                top.items.push({ start: last.start });
              token.items.splice(-1, 1);
            }
          }
        }
      }
      *stream() {
        switch (this.type) {
          case "directive-line":
            yield { type: "directive", offset: this.offset, source: this.source };
            return;
          case "byte-order-mark":
          case "space":
          case "comment":
          case "newline":
            yield this.sourceToken;
            return;
          case "doc-mode":
          case "doc-start": {
            const doc = {
              type: "document",
              offset: this.offset,
              start: []
            };
            if (this.type === "doc-start")
              doc.start.push(this.sourceToken);
            this.stack.push(doc);
            return;
          }
        }
        yield {
          type: "error",
          offset: this.offset,
          message: `Unexpected ${this.type} token in YAML stream`,
          source: this.source
        };
      }
      *document(doc) {
        if (doc.value)
          return yield* this.lineEnd(doc);
        switch (this.type) {
          case "doc-start": {
            if (findNonEmptyIndex(doc.start) !== -1) {
              yield* this.pop();
              yield* this.step();
            } else
              doc.start.push(this.sourceToken);
            return;
          }
          case "anchor":
          case "tag":
          case "space":
          case "comment":
          case "newline":
            doc.start.push(this.sourceToken);
            return;
        }
        const bv = this.startBlockValue(doc);
        if (bv)
          this.stack.push(bv);
        else {
          yield {
            type: "error",
            offset: this.offset,
            message: `Unexpected ${this.type} token in YAML document`,
            source: this.source
          };
        }
      }
      *scalar(scalar) {
        if (this.type === "map-value-ind") {
          const prev = getPrevProps(this.peek(2));
          const start = getFirstKeyStartProps(prev);
          let sep;
          if (scalar.end) {
            sep = scalar.end;
            sep.push(this.sourceToken);
            delete scalar.end;
          } else
            sep = [this.sourceToken];
          const map = {
            type: "block-map",
            offset: scalar.offset,
            indent: scalar.indent,
            items: [{ start, key: scalar, sep }]
          };
          this.onKeyLine = true;
          this.stack[this.stack.length - 1] = map;
        } else
          yield* this.lineEnd(scalar);
      }
      *blockScalar(scalar) {
        switch (this.type) {
          case "space":
          case "comment":
          case "newline":
            scalar.props.push(this.sourceToken);
            return;
          case "scalar":
            scalar.source = this.source;
            this.atNewLine = true;
            this.indent = 0;
            if (this.onNewLine) {
              let nl = this.source.indexOf("\n") + 1;
              while (nl !== 0) {
                this.onNewLine(this.offset + nl);
                nl = this.source.indexOf("\n", nl) + 1;
              }
            }
            yield* this.pop();
            break;
          /* istanbul ignore next should not happen */
          default:
            yield* this.pop();
            yield* this.step();
        }
      }
      *blockMap(map) {
        const it = map.items[map.items.length - 1];
        switch (this.type) {
          case "newline":
            this.onKeyLine = false;
            if (it.value) {
              const end = "end" in it.value ? it.value.end : void 0;
              const last = Array.isArray(end) ? end[end.length - 1] : void 0;
              if (last?.type === "comment")
                end?.push(this.sourceToken);
              else
                map.items.push({ start: [this.sourceToken] });
            } else if (it.sep) {
              it.sep.push(this.sourceToken);
            } else {
              it.start.push(this.sourceToken);
            }
            return;
          case "space":
          case "comment":
            if (it.value) {
              map.items.push({ start: [this.sourceToken] });
            } else if (it.sep) {
              it.sep.push(this.sourceToken);
            } else {
              if (this.atIndentedComment(it.start, map.indent)) {
                const prev = map.items[map.items.length - 2];
                const end = prev?.value?.end;
                if (Array.isArray(end)) {
                  arrayPushArray(end, it.start);
                  end.push(this.sourceToken);
                  map.items.pop();
                  return;
                }
              }
              it.start.push(this.sourceToken);
            }
            return;
        }
        if (this.indent >= map.indent) {
          const atMapIndent = !this.onKeyLine && this.indent === map.indent;
          const atNextItem = atMapIndent && (it.sep || it.explicitKey) && this.type !== "seq-item-ind";
          let start = [];
          if (atNextItem && it.sep && !it.value) {
            const nl = [];
            for (let i = 0; i < it.sep.length; ++i) {
              const st = it.sep[i];
              switch (st.type) {
                case "newline":
                  nl.push(i);
                  break;
                case "space":
                  break;
                case "comment":
                  if (st.indent > map.indent)
                    nl.length = 0;
                  break;
                default:
                  nl.length = 0;
              }
            }
            if (nl.length >= 2)
              start = it.sep.splice(nl[1]);
          }
          switch (this.type) {
            case "anchor":
            case "tag":
              if (atNextItem || it.value) {
                start.push(this.sourceToken);
                map.items.push({ start });
                this.onKeyLine = true;
              } else if (it.sep) {
                it.sep.push(this.sourceToken);
              } else {
                it.start.push(this.sourceToken);
              }
              return;
            case "explicit-key-ind":
              if (!it.sep && !it.explicitKey) {
                it.start.push(this.sourceToken);
                it.explicitKey = true;
              } else if (atNextItem || it.value) {
                start.push(this.sourceToken);
                map.items.push({ start, explicitKey: true });
              } else {
                this.stack.push({
                  type: "block-map",
                  offset: this.offset,
                  indent: this.indent,
                  items: [{ start: [this.sourceToken], explicitKey: true }]
                });
              }
              this.onKeyLine = true;
              return;
            case "map-value-ind":
              if (it.explicitKey) {
                if (!it.sep) {
                  if (includesToken(it.start, "newline")) {
                    Object.assign(it, { key: null, sep: [this.sourceToken] });
                  } else {
                    const start2 = getFirstKeyStartProps(it.start);
                    this.stack.push({
                      type: "block-map",
                      offset: this.offset,
                      indent: this.indent,
                      items: [{ start: start2, key: null, sep: [this.sourceToken] }]
                    });
                  }
                } else if (it.value) {
                  map.items.push({ start: [], key: null, sep: [this.sourceToken] });
                } else if (includesToken(it.sep, "map-value-ind")) {
                  this.stack.push({
                    type: "block-map",
                    offset: this.offset,
                    indent: this.indent,
                    items: [{ start, key: null, sep: [this.sourceToken] }]
                  });
                } else if (isFlowToken(it.key) && !includesToken(it.sep, "newline")) {
                  const start2 = getFirstKeyStartProps(it.start);
                  const key = it.key;
                  const sep = it.sep;
                  sep.push(this.sourceToken);
                  delete it.key;
                  delete it.sep;
                  this.stack.push({
                    type: "block-map",
                    offset: this.offset,
                    indent: this.indent,
                    items: [{ start: start2, key, sep }]
                  });
                } else if (start.length > 0) {
                  it.sep = it.sep.concat(start, this.sourceToken);
                } else {
                  it.sep.push(this.sourceToken);
                }
              } else {
                if (!it.sep) {
                  Object.assign(it, { key: null, sep: [this.sourceToken] });
                } else if (it.value || atNextItem) {
                  map.items.push({ start, key: null, sep: [this.sourceToken] });
                } else if (includesToken(it.sep, "map-value-ind")) {
                  this.stack.push({
                    type: "block-map",
                    offset: this.offset,
                    indent: this.indent,
                    items: [{ start: [], key: null, sep: [this.sourceToken] }]
                  });
                } else {
                  it.sep.push(this.sourceToken);
                }
              }
              this.onKeyLine = true;
              return;
            case "alias":
            case "scalar":
            case "single-quoted-scalar":
            case "double-quoted-scalar": {
              const fs = this.flowScalar(this.type);
              if (atNextItem || it.value) {
                map.items.push({ start, key: fs, sep: [] });
                this.onKeyLine = true;
              } else if (it.sep) {
                this.stack.push(fs);
              } else {
                Object.assign(it, { key: fs, sep: [] });
                this.onKeyLine = true;
              }
              return;
            }
            default: {
              const bv = this.startBlockValue(map);
              if (bv) {
                if (bv.type === "block-seq") {
                  if (!it.explicitKey && it.sep && !includesToken(it.sep, "newline")) {
                    yield* this.pop({
                      type: "error",
                      offset: this.offset,
                      message: "Unexpected block-seq-ind on same line with key",
                      source: this.source
                    });
                    return;
                  }
                } else if (atMapIndent) {
                  map.items.push({ start });
                }
                this.stack.push(bv);
                return;
              }
            }
          }
        }
        yield* this.pop();
        yield* this.step();
      }
      *blockSequence(seq) {
        const it = seq.items[seq.items.length - 1];
        switch (this.type) {
          case "newline":
            if (it.value) {
              const end = "end" in it.value ? it.value.end : void 0;
              const last = Array.isArray(end) ? end[end.length - 1] : void 0;
              if (last?.type === "comment")
                end?.push(this.sourceToken);
              else
                seq.items.push({ start: [this.sourceToken] });
            } else
              it.start.push(this.sourceToken);
            return;
          case "space":
          case "comment":
            if (it.value)
              seq.items.push({ start: [this.sourceToken] });
            else {
              if (this.atIndentedComment(it.start, seq.indent)) {
                const prev = seq.items[seq.items.length - 2];
                const end = prev?.value?.end;
                if (Array.isArray(end)) {
                  arrayPushArray(end, it.start);
                  end.push(this.sourceToken);
                  seq.items.pop();
                  return;
                }
              }
              it.start.push(this.sourceToken);
            }
            return;
          case "anchor":
          case "tag":
            if (it.value || this.indent <= seq.indent)
              break;
            it.start.push(this.sourceToken);
            return;
          case "seq-item-ind":
            if (this.indent !== seq.indent)
              break;
            if (it.value || includesToken(it.start, "seq-item-ind"))
              seq.items.push({ start: [this.sourceToken] });
            else
              it.start.push(this.sourceToken);
            return;
        }
        if (this.indent > seq.indent) {
          const bv = this.startBlockValue(seq);
          if (bv) {
            this.stack.push(bv);
            return;
          }
        }
        yield* this.pop();
        yield* this.step();
      }
      *flowCollection(fc) {
        const it = fc.items[fc.items.length - 1];
        if (this.type === "flow-error-end") {
          let top;
          do {
            yield* this.pop();
            top = this.peek(1);
          } while (top?.type === "flow-collection");
        } else if (fc.end.length === 0) {
          switch (this.type) {
            case "comma":
            case "explicit-key-ind":
              if (!it || it.sep)
                fc.items.push({ start: [this.sourceToken] });
              else
                it.start.push(this.sourceToken);
              return;
            case "map-value-ind":
              if (!it || it.value)
                fc.items.push({ start: [], key: null, sep: [this.sourceToken] });
              else if (it.sep)
                it.sep.push(this.sourceToken);
              else
                Object.assign(it, { key: null, sep: [this.sourceToken] });
              return;
            case "space":
            case "comment":
            case "newline":
            case "anchor":
            case "tag":
              if (!it || it.value)
                fc.items.push({ start: [this.sourceToken] });
              else if (it.sep)
                it.sep.push(this.sourceToken);
              else
                it.start.push(this.sourceToken);
              return;
            case "alias":
            case "scalar":
            case "single-quoted-scalar":
            case "double-quoted-scalar": {
              const fs = this.flowScalar(this.type);
              if (!it || it.value)
                fc.items.push({ start: [], key: fs, sep: [] });
              else if (it.sep)
                this.stack.push(fs);
              else
                Object.assign(it, { key: fs, sep: [] });
              return;
            }
            case "flow-map-end":
            case "flow-seq-end":
              fc.end.push(this.sourceToken);
              return;
          }
          const bv = this.startBlockValue(fc);
          if (bv)
            this.stack.push(bv);
          else {
            yield* this.pop();
            yield* this.step();
          }
        } else {
          const parent = this.peek(2);
          if (parent.type === "block-map" && (this.type === "map-value-ind" && parent.indent === fc.indent || this.type === "newline" && !parent.items[parent.items.length - 1].sep)) {
            yield* this.pop();
            yield* this.step();
          } else if (this.type === "map-value-ind" && parent.type !== "flow-collection") {
            const prev = getPrevProps(parent);
            const start = getFirstKeyStartProps(prev);
            fixFlowSeqItems(fc);
            const sep = fc.end.splice(1, fc.end.length);
            sep.push(this.sourceToken);
            const map = {
              type: "block-map",
              offset: fc.offset,
              indent: fc.indent,
              items: [{ start, key: fc, sep }]
            };
            this.onKeyLine = true;
            this.stack[this.stack.length - 1] = map;
          } else {
            yield* this.lineEnd(fc);
          }
        }
      }
      flowScalar(type) {
        if (this.onNewLine) {
          let nl = this.source.indexOf("\n") + 1;
          while (nl !== 0) {
            this.onNewLine(this.offset + nl);
            nl = this.source.indexOf("\n", nl) + 1;
          }
        }
        return {
          type,
          offset: this.offset,
          indent: this.indent,
          source: this.source
        };
      }
      startBlockValue(parent) {
        switch (this.type) {
          case "alias":
          case "scalar":
          case "single-quoted-scalar":
          case "double-quoted-scalar":
            return this.flowScalar(this.type);
          case "block-scalar-header":
            return {
              type: "block-scalar",
              offset: this.offset,
              indent: this.indent,
              props: [this.sourceToken],
              source: ""
            };
          case "flow-map-start":
          case "flow-seq-start":
            return {
              type: "flow-collection",
              offset: this.offset,
              indent: this.indent,
              start: this.sourceToken,
              items: [],
              end: []
            };
          case "seq-item-ind":
            return {
              type: "block-seq",
              offset: this.offset,
              indent: this.indent,
              items: [{ start: [this.sourceToken] }]
            };
          case "explicit-key-ind": {
            this.onKeyLine = true;
            const prev = getPrevProps(parent);
            const start = getFirstKeyStartProps(prev);
            start.push(this.sourceToken);
            return {
              type: "block-map",
              offset: this.offset,
              indent: this.indent,
              items: [{ start, explicitKey: true }]
            };
          }
          case "map-value-ind": {
            this.onKeyLine = true;
            const prev = getPrevProps(parent);
            const start = getFirstKeyStartProps(prev);
            return {
              type: "block-map",
              offset: this.offset,
              indent: this.indent,
              items: [{ start, key: null, sep: [this.sourceToken] }]
            };
          }
        }
        return null;
      }
      atIndentedComment(start, indent) {
        if (this.type !== "comment")
          return false;
        if (this.indent <= indent)
          return false;
        return start.every((st) => st.type === "newline" || st.type === "space");
      }
      *documentEnd(docEnd) {
        if (this.type !== "doc-mode") {
          if (docEnd.end)
            docEnd.end.push(this.sourceToken);
          else
            docEnd.end = [this.sourceToken];
          if (this.type === "newline")
            yield* this.pop();
        }
      }
      *lineEnd(token) {
        switch (this.type) {
          case "comma":
          case "doc-start":
          case "doc-end":
          case "flow-seq-end":
          case "flow-map-end":
          case "map-value-ind":
            yield* this.pop();
            yield* this.step();
            break;
          case "newline":
            this.onKeyLine = false;
          // fallthrough
          case "space":
          case "comment":
          default:
            if (token.end)
              token.end.push(this.sourceToken);
            else
              token.end = [this.sourceToken];
            if (this.type === "newline")
              yield* this.pop();
        }
      }
    };
    exports.Parser = Parser;
  }
});

// node_modules/yaml/dist/public-api.js
var require_public_api = __commonJS({
  "node_modules/yaml/dist/public-api.js"(exports) {
    "use strict";
    var composer = require_composer();
    var Document = require_Document();
    var errors = require_errors();
    var log = require_log();
    var identity = require_identity();
    var lineCounter = require_line_counter();
    var parser = require_parser();
    function parseOptions(options) {
      const prettyErrors = options.prettyErrors !== false;
      const lineCounter$1 = options.lineCounter || prettyErrors && new lineCounter.LineCounter() || null;
      return { lineCounter: lineCounter$1, prettyErrors };
    }
    function parseAllDocuments(source, options = {}) {
      const { lineCounter: lineCounter2, prettyErrors } = parseOptions(options);
      const parser$1 = new parser.Parser(lineCounter2?.addNewLine);
      const composer$1 = new composer.Composer(options);
      const docs = Array.from(composer$1.compose(parser$1.parse(source)));
      if (prettyErrors && lineCounter2)
        for (const doc of docs) {
          doc.errors.forEach(errors.prettifyError(source, lineCounter2));
          doc.warnings.forEach(errors.prettifyError(source, lineCounter2));
        }
      if (docs.length > 0)
        return docs;
      return Object.assign([], { empty: true }, composer$1.streamInfo());
    }
    function parseDocument(source, options = {}) {
      const { lineCounter: lineCounter2, prettyErrors } = parseOptions(options);
      const parser$1 = new parser.Parser(lineCounter2?.addNewLine);
      const composer$1 = new composer.Composer(options);
      let doc = null;
      for (const _doc of composer$1.compose(parser$1.parse(source), true, source.length)) {
        if (!doc)
          doc = _doc;
        else if (doc.options.logLevel !== "silent") {
          doc.errors.push(new errors.YAMLParseError(_doc.range.slice(0, 2), "MULTIPLE_DOCS", "Source contains multiple documents; please use YAML.parseAllDocuments()"));
          break;
        }
      }
      if (prettyErrors && lineCounter2) {
        doc.errors.forEach(errors.prettifyError(source, lineCounter2));
        doc.warnings.forEach(errors.prettifyError(source, lineCounter2));
      }
      return doc;
    }
    function parse(src, reviver, options) {
      let _reviver = void 0;
      if (typeof reviver === "function") {
        _reviver = reviver;
      } else if (options === void 0 && reviver && typeof reviver === "object") {
        options = reviver;
      }
      const doc = parseDocument(src, options);
      if (!doc)
        return null;
      doc.warnings.forEach((warning) => log.warn(doc.options.logLevel, warning));
      if (doc.errors.length > 0) {
        if (doc.options.logLevel !== "silent")
          throw doc.errors[0];
        else
          doc.errors = [];
      }
      return doc.toJS(Object.assign({ reviver: _reviver }, options));
    }
    function stringify(value, replacer, options) {
      let _replacer = null;
      if (typeof replacer === "function" || Array.isArray(replacer)) {
        _replacer = replacer;
      } else if (options === void 0 && replacer) {
        options = replacer;
      }
      if (typeof options === "string")
        options = options.length;
      if (typeof options === "number") {
        const indent = Math.round(options);
        options = indent < 1 ? void 0 : indent > 8 ? { indent: 8 } : { indent };
      }
      if (value === void 0) {
        const { keepUndefined } = options ?? replacer ?? {};
        if (!keepUndefined)
          return void 0;
      }
      if (identity.isDocument(value) && !_replacer)
        return value.toString(options);
      return new Document.Document(value, _replacer, options).toString(options);
    }
    exports.parse = parse;
    exports.parseAllDocuments = parseAllDocuments;
    exports.parseDocument = parseDocument;
    exports.stringify = stringify;
  }
});

// node_modules/yaml/dist/index.js
var require_dist = __commonJS({
  "node_modules/yaml/dist/index.js"(exports) {
    "use strict";
    var composer = require_composer();
    var Document = require_Document();
    var Schema = require_Schema();
    var errors = require_errors();
    var Alias = require_Alias();
    var identity = require_identity();
    var Pair = require_Pair();
    var Scalar = require_Scalar();
    var YAMLMap = require_YAMLMap();
    var YAMLSeq = require_YAMLSeq();
    var cst = require_cst();
    var lexer = require_lexer();
    var lineCounter = require_line_counter();
    var parser = require_parser();
    var publicApi = require_public_api();
    var visit = require_visit();
    exports.Composer = composer.Composer;
    exports.Document = Document.Document;
    exports.Schema = Schema.Schema;
    exports.YAMLError = errors.YAMLError;
    exports.YAMLParseError = errors.YAMLParseError;
    exports.YAMLWarning = errors.YAMLWarning;
    exports.Alias = Alias.Alias;
    exports.isAlias = identity.isAlias;
    exports.isCollection = identity.isCollection;
    exports.isDocument = identity.isDocument;
    exports.isMap = identity.isMap;
    exports.isNode = identity.isNode;
    exports.isPair = identity.isPair;
    exports.isScalar = identity.isScalar;
    exports.isSeq = identity.isSeq;
    exports.Pair = Pair.Pair;
    exports.Scalar = Scalar.Scalar;
    exports.YAMLMap = YAMLMap.YAMLMap;
    exports.YAMLSeq = YAMLSeq.YAMLSeq;
    exports.CST = cst;
    exports.Lexer = lexer.Lexer;
    exports.LineCounter = lineCounter.LineCounter;
    exports.Parser = parser.Parser;
    exports.parse = publicApi.parse;
    exports.parseAllDocuments = publicApi.parseAllDocuments;
    exports.parseDocument = publicApi.parseDocument;
    exports.stringify = publicApi.stringify;
    exports.visit = visit.visit;
    exports.visitAsync = visit.visitAsync;
  }
});

// src/cli.ts
import { existsSync as existsSync7, readFileSync as readFileSync11, writeFileSync as writeFileSync6 } from "node:fs";
import path12 from "node:path";
import { parseArgs } from "node:util";

// src/cli/git.ts
import { spawnSync } from "node:child_process";
import { lstatSync, readFileSync } from "node:fs";
import path from "node:path";
var EMPTY_TREE = "4b825dc642cb6eb9a060e54bf8d69288fbee4904";
var MAX_UNTRACKED_BYTES = 1024 * 1024;
var BINARY_SNIFF_BYTES = 8e3;
var DIFF_FLAGS = ["--no-color", "--no-ext-diff", "--no-textconv", "--find-renames", "--src-prefix=a/", "--dst-prefix=b/", "--submodule=short"];
var GitError = class extends Error {
  name = "GitError";
};
function git(args, cwd) {
  const r = spawnSync("git", ["-c", "core.quotepath=off", ...args], { cwd, encoding: "utf8", maxBuffer: 512 * 1024 * 1024, windowsHide: true });
  if (r.error) throw new GitError(`git not available: ${r.error.message}`);
  if (r.status !== 0) throw new GitError(`git ${args[0]} failed: ${(r.stderr || "").trim().split("\n")[0] || `exit ${r.status}`}`);
  return r.stdout;
}
function tryGit(args, cwd) {
  try {
    return git(args, cwd).trim();
  } catch {
    return void 0;
  }
}
function repoRoot(cwd) {
  const top = tryGit(["rev-parse", "--show-toplevel"], cwd);
  return top ? path.resolve(top) : void 0;
}
function hasHead(cwd) {
  return tryGit(["rev-parse", "--verify", "--quiet", "HEAD^{commit}"], cwd) !== void 0;
}
function defaultBranch(cwd) {
  const sym = tryGit(["symbolic-ref", "--quiet", "refs/remotes/origin/HEAD"], cwd);
  if (sym) return sym.replace(/^refs\/remotes\//, "");
  for (const c of ["origin/main", "origin/master", "main", "master"]) {
    if (tryGit(["rev-parse", "--verify", "--quiet", `${c}^{commit}`], cwd)) return c;
  }
  throw new GitError("cannot find the default branch (no origin/HEAD, main or master); use --base <ref>");
}
function mergeBase(ref, cwd) {
  if (ref.startsWith("-")) throw new GitError(`invalid ref: ${ref}`);
  const mb = tryGit(["merge-base", ref, "HEAD"], cwd);
  if (!mb) throw new GitError(`no merge base between ${ref} and HEAD (does the ref exist? try git fetch)`);
  return mb;
}
function untrackedPatch(root, rel) {
  const header = `diff --git a/${rel} b/${rel}
new file mode 100644
`;
  const abs = path.join(root, rel);
  let size;
  try {
    const st = lstatSync(abs);
    if (!st.isFile()) return "";
    size = st.size;
  } catch {
    return "";
  }
  if (size > MAX_UNTRACKED_BYTES) return `${header}Binary files /dev/null and b/${rel} differ
`;
  const buf = readFileSync(abs);
  if (buf.subarray(0, BINARY_SNIFF_BYTES).includes(0)) return `${header}Binary files /dev/null and b/${rel} differ
`;
  const text = buf.toString("utf8");
  if (!text.length) return header;
  const endsWithNewline = text.endsWith("\n");
  const lines = (endsWithNewline ? text.slice(0, -1) : text).split("\n").map((l) => l.replace(/\r$/, ""));
  const body = lines.map((l) => `+${l}`).join("\n");
  return `${header}--- /dev/null
+++ b/${rel}
@@ -0,0 +1,${lines.length} @@
${body}
${endsWithNewline ? "" : "\\ No newline at end of file\n"}`;
}
function untrackedFiles(root) {
  return git(["ls-files", "--others", "--exclude-standard", "-z"], root).split("\0").filter(Boolean);
}
function collectDiff(scope, cwd) {
  const root = repoRoot(cwd);
  if (!root) throw new GitError("not inside a git repository (use --diff <file> to review a patch file)");
  const head = hasHead(root);
  let tracked;
  let withUntracked = true;
  switch (scope.kind) {
    case "staged":
      tracked = git(["diff", "--cached", ...DIFF_FLAGS, ...head ? [] : [EMPTY_TREE]], root);
      withUntracked = false;
      break;
    case "base":
      tracked = git(["diff", ...DIFF_FLAGS, mergeBase(scope.ref, root)], root);
      break;
    case "committed": {
      if (!head) throw new GitError("no commits yet; nothing committed to review");
      tracked = git(["diff", ...DIFF_FLAGS, mergeBase(defaultBranch(root), root), "HEAD"], root);
      withUntracked = false;
      break;
    }
    default:
      tracked = git(["diff", ...DIFF_FLAGS, head ? "HEAD" : EMPTY_TREE], root);
  }
  if (!withUntracked) return tracked;
  const extra = untrackedFiles(root).map((f) => untrackedPatch(root, f)).filter(Boolean);
  return [tracked.replace(/\n?$/, "\n"), ...extra].join("").replace(/^\n$/, "");
}

// src/cli/agent.ts
function detectAgent(env, isTTY = process.stdout.isTTY === true) {
  if (env.CLAUDECODE || env.CLAUDE_CODE_ENTRYPOINT) return "claude";
  if (env.CURSOR_AGENT) return "cursor";
  if (env.GEMINI_CLI) return "gemini";
  if (env.OPENCODE) return "opencode";
  if (!isTTY && (env.CODEX_SANDBOX || env.CODEX_HOME)) return "codex";
  if (!isTTY && Object.keys(env).some((k) => k.startsWith("AIDER_") && env[k])) return "aider";
  return null;
}

// src/cli/apply.ts
import { lstatSync as lstatSync2, readFileSync as readFileSync3, realpathSync, writeFileSync as writeFileSync2 } from "node:fs";
import path3 from "node:path";

// src/core/store.ts
import { spawnSync as spawnSync2 } from "node:child_process";
import { mkdirSync, readFileSync as readFileSync2, renameSync, rmSync, writeFileSync } from "node:fs";
import path2 from "node:path";
var STATUSES = ["open", "dismissed", "fixed"];
function stateDir(root) {
  const r = spawnSync2("git", ["rev-parse", "--git-path", "codewolf"], { cwd: root, encoding: "utf8", windowsHide: true });
  const out = r.status === 0 ? r.stdout.trim() : "";
  return out ? path2.resolve(root, out) : null;
}
function readJson(file) {
  try {
    return JSON.parse(readFileSync2(file, "utf8"));
  } catch (e) {
    return e.code === "ENOENT" ? void 0 : null;
  }
}
function writeJson(dir, name, value) {
  mkdirSync(dir, { recursive: true });
  const file = path2.join(dir, name);
  const tmp = `${file}.${process.pid}.tmp`;
  writeFileSync(tmp, JSON.stringify(value, null, 2) + "\n");
  renameSync(tmp, file);
}
var emptyStore = () => ({ version: 1, head: null, reviewedAt: "", findings: [] });
var warnedCorrupt = false;
function validFinding(x) {
  const f = x;
  return !!f && typeof f === "object" && typeof f.id === "string" && typeof f.fingerprint === "string" && typeof f.file === "string" && Number.isInteger(f.line) && f.line > 0 && typeof f.title === "string" && typeof f.snippet === "string" && STATUSES.includes(f.status);
}
function readStore(root) {
  const dir = stateDir(root);
  if (!dir) return emptyStore();
  const raw = readJson(path2.join(dir, "findings.json"));
  if (raw === void 0) return emptyStore();
  if (!raw || raw.version !== 1 || !Array.isArray(raw.findings) || !raw.findings.every(validFinding)) {
    if (!warnedCorrupt) process.stderr.write("codewolf: warning: the findings store is corrupt; starting from an empty one\n");
    warnedCorrupt = true;
    return emptyStore();
  }
  return { version: 1, head: typeof raw.head === "string" ? raw.head : null, reviewedAt: String(raw.reviewedAt ?? ""), findings: raw.findings };
}
function writeStore(root, s2) {
  const dir = stateDir(root);
  if (!dir) throw new Error("not inside a git repository; the findings store lives in the git dir");
  writeJson(dir, "findings.json", s2);
}
function relocate(f, fileText) {
  const lines = fileText.split(/\r?\n/);
  if (lines.at(-1) === "") lines.pop();
  if (!f.snippet.trim()) return lines[f.line - 1] === f.snippet ? f.line : null;
  let best = null;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i] !== f.snippet) continue;
    if (best === null || Math.abs(i + 1 - f.line) < Math.abs(best - f.line)) best = i + 1;
  }
  return best;
}
function readSuppressed(dir) {
  const raw = readJson(path2.join(dir, "suppressed.json"));
  return raw && raw.version === 1 && Array.isArray(raw.items) ? { version: 1, items: raw.items.filter((i) => i && typeof i.fingerprint === "string") } : { version: 1, items: [] };
}
function suppressed(root) {
  const dir = stateDir(root);
  return new Set(dir ? readSuppressed(dir).items.map((i) => i.fingerprint) : []);
}
function addSuppressed(root, fingerprints, reason) {
  const dir = stateDir(root);
  if (!dir) throw new Error("not inside a git repository; suppressions live in the git dir");
  const s2 = readSuppressed(dir);
  const have = new Set(s2.items.map((i) => i.fingerprint));
  const at = (/* @__PURE__ */ new Date()).toISOString();
  for (const fp of fingerprints) if (!have.has(fp)) s2.items.push({ fingerprint: fp, ...reason ? { reason } : {}, at });
  writeJson(dir, "suppressed.json", s2);
}
function readCheckpoint(root) {
  const dir = stateDir(root);
  const raw = dir ? readJson(path2.join(dir, "checkpoint.json")) : void 0;
  return raw && raw.version === 1 && raw.files && typeof raw.files === "object" ? raw : null;
}
function writeCheckpoint(root, c) {
  const dir = stateDir(root);
  if (dir) writeJson(dir, "checkpoint.json", c);
}
function clearCheckpoint(root) {
  const dir = stateDir(root);
  if (dir) rmSync(path2.join(dir, "checkpoint.json"), { force: true });
}
function newId(fp, taken) {
  for (const n of [8, 12, fp.length]) {
    const id = fp.slice(0, n);
    const owner = taken.get(id);
    if (owner === void 0 || owner === fp) return id;
  }
  return fp;
}
function mergeStore(prev, found, reviewed, snippetOf, head) {
  const byFp = new Map(prev.findings.map((f) => [f.fingerprint, f]));
  const taken = new Map(prev.findings.map((f) => [f.id, f.fingerprint]));
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  for (const f of found) {
    if (seen.has(f.fingerprint)) continue;
    seen.add(f.fingerprint);
    const old = byFp.get(f.fingerprint);
    const id = old?.id ?? newId(f.fingerprint, taken);
    taken.set(id, f.fingerprint);
    out.push({ ...f, id, status: old?.status === "dismissed" ? "dismissed" : "open", snippet: snippetOf(f) });
  }
  for (const f of prev.findings) {
    if (seen.has(f.fingerprint)) continue;
    out.push(f.status === "open" && reviewed.has(f.file) ? { ...f, status: "fixed" } : f);
  }
  return { version: 1, head, reviewedAt: (/* @__PURE__ */ new Date()).toISOString(), findings: out };
}

// src/cli/apply.ts
function repoFile(root, rel) {
  if (!rel || path3.isAbsolute(rel) || /^([a-z]:|[\\/])/i.test(rel) || rel.split(/[\\/]/).includes("..")) throw new Error(`unsafe path in finding: ${rel}`);
  const realRoot = realpathSync(root);
  let abs;
  try {
    abs = realpathSync(path3.join(realRoot, rel));
  } catch {
    throw new Error(`file not found: ${rel}`);
  }
  const r = path3.relative(realRoot, abs);
  if (!r || r === ".." || r.startsWith(".." + path3.sep) || path3.isAbsolute(r)) throw new Error(`path escapes the repository: ${rel}`);
  if (!lstatSync2(abs).isFile()) throw new Error(`not a regular file: ${rel}`);
  return abs;
}
function openStore(cwd) {
  const root = repoRoot(cwd);
  if (!root) throw new Error("not inside a git repository: the findings store is disabled");
  return { root, store: readStore(root) };
}
function byIds(store, ids) {
  return ids.map((id) => {
    const f = store.findings.find((x) => x.id === id);
    if (!f) throw new Error(`no stored finding with id ${id} (run codewolf findings)`);
    return f;
  });
}
function applyOne(root, f, dryRun) {
  if (typeof f.suggestion !== "string") return "it has no suggestion";
  let abs;
  try {
    abs = repoFile(root, f.file);
  } catch (e) {
    return e.message;
  }
  const text = readFileSync3(abs, "utf8");
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const lines = text.split("\n").map((l) => l.replace(/\r$/, ""));
  const start = relocate(f, text);
  if (start === null) return "its line changed since the review (snippet not found)";
  const end = start + Math.max(0, (f.endLine ?? f.line) - f.line);
  if (lines[start - 1] !== f.snippet || end > lines.length) return "the target text no longer matches";
  const replacement = f.suggestion === "" ? [] : f.suggestion.replace(/\r?\n$/, "").split(/\r?\n/);
  const old = lines.slice(start - 1, end);
  if (dryRun) {
    process.stdout.write([`--- ${f.file}:${start}${end > start ? "-" + end : ""} (${f.id})`, ...old.map((l) => `-${l}`), ...replacement.map((l) => `+${l}`)].join("\n") + "\n");
    return null;
  }
  lines.splice(start - 1, end - start + 1, ...replacement);
  writeFileSync2(abs, lines.join(eol));
  process.stdout.write(`applied ${f.id} to ${f.file}:${start}
`);
  return null;
}
function cmdApply(ids, opts, cwd) {
  if (!ids.length) throw new Error("usage: codewolf apply <id...> [--dry-run]");
  const { root, store } = openStore(cwd);
  let failed = 0;
  for (const f of byIds(store, ids)) {
    const err = applyOne(root, f, !!opts["dry-run"]);
    if (err) {
      failed++;
      process.stderr.write(`codewolf: refused ${f.id} (${f.file}:${f.line}): ${err}; file untouched
`);
      continue;
    }
    if (!opts["dry-run"]) f.status = "fixed";
  }
  if (!opts["dry-run"]) writeStore(root, store);
  return failed ? 2 : 0;
}

// src/cli/doctor.ts
import { spawnSync as spawnSync3 } from "node:child_process";
import { mkdirSync as mkdirSync3, unlinkSync, writeFileSync as writeFileSync3 } from "node:fs";
import path7 from "node:path";

// src/core/config.ts
var import_yaml = __toESM(require_dist(), 1);
import { existsSync as existsSync2, readFileSync as readFileSync5 } from "node:fs";
import path5 from "node:path";

// src/shared/mask.ts
var known = /* @__PURE__ */ new Set();
function maskKey(key) {
  if (!key) return "(none)";
  if (key.length <= 8) return "***";
  const dash = key.indexOf("-");
  const prefix = dash > 0 && dash <= 6 ? key.slice(0, dash + 1) : key.slice(0, Math.min(3, key.length - 8));
  return `${prefix}...${key.slice(-4)}`;
}
function registerSecret(value) {
  if (value && value.length >= 4) known.add(value);
}
function redact(text) {
  let out = text;
  for (const s2 of [...known].sort((a, b) => b.length - a.length)) {
    if (out.includes(s2)) out = out.split(s2).join(maskKey(s2));
  }
  return out;
}

// src/shared/types.ts
var SEVERITIES = ["critical", "major", "minor", "nit"];
var CATEGORIES = ["bug", "security", "performance", "maintainability", "style", "test"];
var PROVIDER_NAMES = ["anthropic", "openai", "gemini", "ollama", "claude-code"];

// src/core/learnings.ts
import { appendFileSync, existsSync, mkdirSync as mkdirSync2, readFileSync as readFileSync4 } from "node:fs";
import path4 from "node:path";
function learningsPath(root) {
  return path4.join(root, ".codewolf", "learnings.md");
}
function readLearnings(root) {
  const file = learningsPath(root);
  if (!existsSync(file)) return [];
  let text;
  try {
    text = readFileSync4(file, "utf8");
  } catch {
    return [];
  }
  return text.replace(/^\uFEFF/, "").split(/\r?\n/).map((l) => l.trim().replace(/^(?:[-*+]|\d+[.)])\s+/, "").trim()).filter((l) => l && !l.startsWith("#") && !l.startsWith("<!--"));
}
function appendLearning(root, text) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) throw new Error("learning text is empty");
  const file = learningsPath(root);
  mkdirSync2(path4.dirname(file), { recursive: true });
  let prefix = "";
  if (!existsSync(file)) prefix = "# CodeWolf learnings\n\n<!-- Reviewer preferences for this repo, one per line. CodeWolf adds them to every review prompt. -->\n\n";
  else {
    const cur = readFileSync4(file, "utf8");
    if (cur.length && !cur.endsWith("\n")) prefix = "\n";
  }
  appendFileSync(file, `${prefix}- ${clean}
`);
  return file;
}
var GUIDELINE_FILES = ["CLAUDE.md", "AGENTS.md", ".cursorrules", ".github/copilot-instructions.md"];
var GUIDELINES_CAP = 4e3;
function readGuidelines(root, cap = GUIDELINES_CAP) {
  const parts = [];
  let used = 0;
  for (const name of GUIDELINE_FILES) {
    const file = path4.join(root, name);
    if (!existsSync(file)) continue;
    let text;
    try {
      text = readFileSync4(file, "utf8").replace(/^\uFEFF/, "").replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();
    } catch {
      continue;
    }
    if (!text) continue;
    const room = cap - used - name.length - 8;
    if (room <= 200) break;
    const body = text.length > room ? text.slice(0, room).replace(/\n[^\n]*$/, "") + "\n[...truncated]" : text;
    parts.push(`From ${name}:
${body}`);
    used += body.length + name.length + 8;
  }
  return parts.join("\n\n");
}

// src/core/config.ts
var ConfigError = class extends Error {
  name = "ConfigError";
};
var CONFIG_FILENAMES = [".codewolf.yaml", ".codewolf.yml"];
var DEFAULT_EXCLUDES = [
  "**/package-lock.json",
  "**/npm-shrinkwrap.json",
  "**/yarn.lock",
  "**/pnpm-lock.yaml",
  "**/bun.lockb",
  "**/bun.lock",
  "**/*.lock",
  "**/go.sum",
  "**/composer.lock",
  "**/Gemfile.lock",
  "**/Pipfile.lock",
  "**/poetry.lock",
  "**/Cargo.lock",
  "dist/**",
  "**/node_modules/**",
  "**/*.min.js",
  "**/*.min.css",
  "**/*.map",
  "**/*.snap",
  "**/*.{png,jpg,jpeg,gif,bmp,ico,webp,avif,tiff,psd}",
  "**/*.{pdf,zip,gz,tgz,bz2,xz,7z,rar,jar,war,whl}",
  "**/*.{exe,dll,so,dylib,a,o,obj,lib,class,pyc,wasm,bin,dat}",
  "**/*.{woff,woff2,ttf,otf,eot}",
  "**/*.{mp3,mp4,mov,avi,mkv,wav,flac,ogg,webm}",
  "**/*.{sqlite,db}"
];
var DEFAULTS = {
  anthropic: { baseUrl: "https://api.anthropic.com", model: "claude-sonnet-5-5", timeoutMs: 18e4 },
  openai: { baseUrl: "https://api.openai.com/v1", model: "gpt-5-mini", timeoutMs: 18e4 },
  gemini: { baseUrl: "https://generativelanguage.googleapis.com", model: "gemini-2.5-flash", timeoutMs: 18e4 },
  ollama: { baseUrl: "http://127.0.0.1:11434", model: "qwen2.5-coder:7b", timeoutMs: 9e5 },
  "claude-code": { baseUrl: "", model: "", timeoutMs: 9e5 }
};
var OPENROUTER_BASE = "https://openrouter.ai/api/v1";
var DEFAULT_MAX_TOKENS = 8192;
function splitList(v) {
  return v.split(/[,\n\r]+/).map((s2) => s2.trim()).filter(Boolean);
}
function expandKeys(entries, env, where, allowEnv = true, warn = () => {
}) {
  if (entries === void 0 || entries === null) return [];
  const list = typeof entries === "string" ? splitList(entries) : Array.isArray(entries) ? entries : null;
  if (!list) throw new ConfigError(`${where}: keys must be a list or a comma separated string`);
  const out = [];
  for (const e of list) {
    if (typeof e !== "string") throw new ConfigError(`${where}: every key must be a string`);
    const t = e.trim();
    if (t.startsWith("env:")) {
      if (allowEnv) out.push(...splitList(env[t.slice(4).trim()] ?? ""));
      else warn(`${where}: ignoring ${t} from the repository config; env references only work in a file passed with --config`);
    } else if (t) out.push(...splitList(t));
  }
  return [...new Set(out)];
}
function envKeys(env, ...names) {
  const out = [];
  for (const n of names) out.push(...splitList(env[n] ?? ""));
  return [...new Set(out)];
}
function isOpenAIHost(baseUrl) {
  try {
    return new URL(baseUrl).hostname === "api.openai.com";
  } catch {
    return false;
  }
}
function defaultKeysFor(name, baseUrl, env) {
  switch (name) {
    case "anthropic":
      return envKeys(env, "ANTHROPIC_API_KEYS", "ANTHROPIC_API_KEY", "CODEWOLF_API_KEYS");
    case "gemini":
      return envKeys(env, "GEMINI_API_KEYS", "GEMINI_API_KEY", "GOOGLE_API_KEY", "CODEWOLF_API_KEYS");
    case "openai":
      if (baseUrl.includes("openrouter.ai")) return envKeys(env, "OPENROUTER_API_KEYS", "OPENROUTER_API_KEY", "CODEWOLF_API_KEYS");
      if (isOpenAIHost(baseUrl)) return envKeys(env, "OPENAI_API_KEYS", "OPENAI_API_KEY", "CODEWOLF_API_KEYS");
      return envKeys(env, "CODEWOLF_API_KEYS");
    default:
      return [];
  }
}
var OFFICIAL_HOSTS = {
  anthropic: ["api.anthropic.com"],
  gemini: ["generativelanguage.googleapis.com"],
  openai: ["api.openai.com", "openrouter.ai"],
  ollama: [],
  "claude-code": []
};
function isOfficialHost(name, baseUrl) {
  try {
    const u = new URL(baseUrl);
    return u.protocol === "https:" && OFFICIAL_HOSTS[name].includes(u.hostname);
  } catch {
    return false;
  }
}
function normName(raw, where) {
  if (typeof raw !== "string" || !raw.trim()) throw new ConfigError(`${where}: provider name is required`);
  const n = raw.trim().toLowerCase();
  if (n === "openrouter") return { name: "openai", baseUrl: OPENROUTER_BASE };
  if (n === "claude" || n === "claudecode" || n === "claude_code") return { name: "claude-code" };
  if (n === "openai-compatible" || n === "openai_compatible") return { name: "openai" };
  if (!PROVIDER_NAMES.includes(n)) {
    throw new ConfigError(`${where}: unknown provider "${raw}" (expected one of ${PROVIDER_NAMES.join(", ")}, openrouter)`);
  }
  return { name: n };
}
function str(v, where) {
  if (v === void 0 || v === null || v === "") return void 0;
  if (typeof v !== "string" && typeof v !== "number") throw new ConfigError(`${where} must be a string`);
  return String(v).trim();
}
function posInt(v, where) {
  if (v === void 0 || v === null || v === "") return void 0;
  const n = Number(v);
  if (!Number.isFinite(n) || n <= 0) throw new ConfigError(`${where} must be a positive number`);
  return Math.floor(n);
}
function ollamaBase(env) {
  const h = env.OLLAMA_HOST?.trim();
  if (!h) return void 0;
  const withProto = /^https?:\/\//.test(h) ? h : `http://${h}`;
  return withProto.replace("://0.0.0.0", "://127.0.0.1");
}
function buildProvider(raw, ctx, where) {
  const { env, warn } = ctx;
  const { name, baseUrl: aliasBase } = normName(raw.name, where);
  const d = DEFAULTS[name];
  const fileBase = str(raw.baseUrl ?? raw.base_url ?? raw.baseURL, `${where}.baseUrl`);
  const baseUrl = (ctx.baseOverride ?? fileBase ?? aliasBase ?? (name === "ollama" ? ollamaBase(env) : void 0) ?? d.baseUrl).replace(/\/+$/, "");
  let model = str(raw.model, `${where}.model`);
  if (!model) model = name === "openai" && baseUrl === OPENROUTER_BASE ? "qwen/qwen3-coder" : d.model;
  const baseTrusted = ctx.trusted || ctx.baseOverride !== void 0 || fileBase === void 0 || isOfficialHost(name, baseUrl);
  const withhold = (what) => warn(`${where}: not sending ${what} to ${baseUrl}, a base URL set by the repository config. Pass --base-url or --config to allow it.`);
  const fileKeys = raw.keys !== void 0 ? expandKeys(raw.keys, env, `${where}.keys`, ctx.trusted, warn) : [];
  let keys;
  if (ctx.keyOverride?.length) {
    keys = baseTrusted ? ctx.keyOverride : fileKeys;
    if (!baseTrusted) withhold("--keys");
  } else if (fileKeys.length) {
    keys = fileKeys;
  } else {
    const fromEnv = defaultKeysFor(name, baseUrl, env);
    keys = baseTrusted ? fromEnv : [];
    if (!baseTrusted && fromEnv.length) withhold("API keys from the environment");
  }
  const timeoutSec = posInt(raw.timeout, `${where}.timeout`);
  const p = {
    name,
    model,
    baseUrl,
    keys,
    timeoutMs: timeoutSec ? timeoutSec * 1e3 : d.timeoutMs,
    maxTokens: posInt(raw.maxTokens ?? raw.max_tokens, `${where}.maxTokens`) ?? DEFAULT_MAX_TOKENS
  };
  if (raw.command !== void 0 && raw.command !== null && raw.command !== "") {
    warn(`${where}: ignoring "command" from the config file; set CODEWOLF_CLAUDE_BIN or pass --claude-bin instead`);
  }
  if (name === "claude-code") {
    const command = ctx.claudeBin?.trim() || env.CODEWOLF_CLAUDE_BIN?.trim();
    if (command) p.command = command;
  }
  return p;
}
function autoChain(env) {
  const chain = [];
  if (envKeys(env, "ANTHROPIC_API_KEYS", "ANTHROPIC_API_KEY").length) chain.push({ name: "anthropic" });
  if (envKeys(env, "OPENAI_API_KEYS", "OPENAI_API_KEY").length) chain.push({ name: "openai" });
  if (envKeys(env, "OPENROUTER_API_KEYS", "OPENROUTER_API_KEY").length) chain.push({ name: "openrouter" });
  if (envKeys(env, "GEMINI_API_KEYS", "GEMINI_API_KEY", "GOOGLE_API_KEY").length) chain.push({ name: "gemini" });
  chain.push({ name: "ollama" });
  return chain;
}
function parseSeverity(v, where) {
  const s2 = str(v, where)?.toLowerCase();
  if (!s2) return void 0;
  if (s2 === "none" || s2 === "off" || s2 === "never") return "none";
  if (s2 === "high") return "major";
  if (s2 === "low") return "minor";
  if (!SEVERITIES.includes(s2)) throw new ConfigError(`${where} must be one of ${SEVERITIES.join(", ")}, none`);
  return s2;
}
function parseProfile(v, where) {
  const s2 = str(v, where)?.toLowerCase();
  if (!s2) return void 0;
  if (s2 !== "quiet" && s2 !== "chill" && s2 !== "assertive") throw new ConfigError(`${where} must be quiet, chill or assertive`);
  return s2;
}
function asObject(v, where) {
  if (v === void 0 || v === null) return {};
  if (typeof v !== "object" || Array.isArray(v)) throw new ConfigError(`${where} must be a mapping`);
  return v;
}
function stringList(v, where) {
  if (v === void 0 || v === null) return [];
  if (typeof v === "string") return [v];
  if (!Array.isArray(v) || v.some((x) => typeof x !== "string")) throw new ConfigError(`${where} must be a list of strings`);
  return v;
}
var stderrWarn = (m) => {
  process.stderr.write(`codewolf: warning: ${m}
`);
};
function bool(v, where, dflt) {
  if (v === void 0 || v === null) return dflt;
  if (typeof v === "boolean") return v;
  if (v === "true" || v === "false") return v === "true";
  throw new ConfigError(`${where} must be true or false`);
}
function resolveConfig(raw, overrides = {}, opts = {}) {
  const env = opts.env ?? process.env;
  const cfg = asObject(raw, "config");
  const review2 = asObject(cfg.review, "review");
  const rawProviders = cfg.providers === void 0 || cfg.providers === null ? [] : cfg.providers;
  if (!Array.isArray(rawProviders)) throw new ConfigError("providers must be a list");
  const chainRaw = rawProviders.map((p, i) => {
    if (typeof p === "string") return { name: p };
    return asObject(p, `providers[${i}]`);
  });
  const keyOverride = overrides.keys !== void 0 ? expandKeys(overrides.keys, env, "--keys") : void 0;
  const warn = opts.warn ?? stderrWarn;
  const baseOverride = overrides.baseUrl || env.CODEWOLF_BASE_URL?.trim() || void 0;
  let chain;
  if (overrides.provider) {
    const want = normName(overrides.provider, "--provider");
    const match = chainRaw.find((p) => {
      try {
        return normName(p.name, "").name === want.name;
      } catch {
        return false;
      }
    });
    chain = [{ ...match ?? {}, name: match ? match.name : overrides.provider }];
    if (want.baseUrl && !overrides.baseUrl && !match) chain[0].baseUrl = want.baseUrl;
  } else {
    chain = chainRaw.length ? chainRaw : autoChain(env);
  }
  if (overrides.model) chain[0] = { ...chain[0], model: overrides.model };
  const providers = chain.map((p, i) => buildProvider(p, {
    env,
    warn,
    trusted: opts.trusted === true,
    baseOverride: i === 0 ? baseOverride : void 0,
    keyOverride: i === 0 ? keyOverride : void 0,
    claudeBin: overrides.claudeBin
  }, i === 0 && overrides.provider ? "--provider" : `providers[${i}]`));
  for (const p of providers) for (const k of p.keys) registerSecret(k);
  const pathInstructions = [];
  const pi = review2.pathInstructions ?? review2.path_instructions ?? cfg.pathInstructions;
  if (pi !== void 0 && pi !== null) {
    if (!Array.isArray(pi)) throw new ConfigError("review.pathInstructions must be a list");
    pi.forEach((e, i) => {
      const o = asObject(e, `review.pathInstructions[${i}]`);
      const p = str(o.path, `review.pathInstructions[${i}].path`);
      const ins = str(o.instructions, `review.pathInstructions[${i}].instructions`);
      if (!p || !ins) throw new ConfigError(`review.pathInstructions[${i}] needs path and instructions`);
      pathInstructions.push({ path: p, instructions: ins });
    });
  }
  const toolsRaw = cfg.tools;
  const toolsDefault = toolsRaw === false ? false : true;
  const tools = typeof toolsRaw === "object" && toolsRaw !== null ? asObject(toolsRaw, "tools") : {};
  const guidelinesOn = bool(review2.guidelines, "review.guidelines", true);
  const root = path5.resolve(opts.root ?? (opts.configPath ? path5.dirname(opts.configPath) : process.cwd()));
  const resolved = {
    profile: parseProfile(overrides.profile, "--profile") ?? parseProfile(cfg.profile, "profile") ?? "chill",
    language: str(overrides.language, "--language") ?? str(cfg.language, "language") ?? "en",
    providers,
    review: {
      exclude: [...DEFAULT_EXCLUDES, ...stringList(review2.exclude ?? cfg.exclude, "review.exclude")],
      pathInstructions,
      failOn: parseSeverity(overrides.failOn, "--fail-on") ?? parseSeverity(review2.failOn ?? review2.fail_on ?? cfg.failOn, "review.failOn") ?? "none",
      concurrency: posInt(review2.concurrency, "review.concurrency") ?? 4,
      maxChunkTokens: posInt(review2.maxChunkTokens ?? review2.max_chunk_tokens, "review.maxChunkTokens") ?? 12e3,
      guidelines: guidelinesOn
    },
    tools: {
      ruff: bool(tools.ruff, "tools.ruff", toolsDefault),
      eslint: bool(tools.eslint, "tools.eslint", toolsDefault),
      semgrep: bool(tools.semgrep, "tools.semgrep", toolsDefault),
      gitleaks: bool(tools.gitleaks, "tools.gitleaks", toolsDefault)
    },
    learnings: opts.learnings ?? readLearnings(root),
    guidelines: guidelinesOn ? readGuidelines(root) : "",
    root
  };
  if (opts.configPath) resolved.configPath = opts.configPath;
  return resolved;
}
function findConfigFile(cwd) {
  let dir = path5.resolve(cwd);
  for (; ; ) {
    for (const name of CONFIG_FILENAMES) {
      const p = path5.join(dir, name);
      if (existsSync2(p)) return p;
    }
    const up = path5.dirname(dir);
    if (up === dir) return void 0;
    dir = up;
  }
}
function readConfigFile(file) {
  let text;
  try {
    text = readFileSync5(file, "utf8");
  } catch (e) {
    throw new ConfigError(`cannot read config ${file}: ${e.message}`);
  }
  try {
    return (0, import_yaml.parse)(text.replace(/^\uFEFF/, "")) ?? {};
  } catch (e) {
    throw new ConfigError(`invalid YAML in ${file}: ${e.message}`);
  }
}
function loadConfig(opts = {}) {
  const cwd = opts.cwd ?? process.cwd();
  let file;
  if (opts.configPath) {
    file = path5.resolve(cwd, opts.configPath);
    if (!existsSync2(file)) throw new ConfigError(`config file not found: ${file}`);
  } else {
    file = findConfigFile(cwd);
  }
  const raw = file ? readConfigFile(file) : {};
  const ro = { root: opts.root ?? (file && !opts.configPath ? path5.dirname(file) : cwd) };
  if (opts.env) ro.env = opts.env;
  if (opts.trusted) ro.trusted = true;
  if (opts.warn) ro.warn = opts.warn;
  if (file) ro.configPath = file;
  return resolveConfig(raw, opts.overrides ?? {}, ro);
}

// src/providers/claude-code.ts
import { spawn } from "node:child_process";
import { existsSync as existsSync3 } from "node:fs";
import path6 from "node:path";

// src/providers/http.ts
var ProviderError = class extends Error {
  name = "ProviderError";
  kind;
  status;
  retryAfterSec;
  constructor(message, kind2, status, retryAfterSec) {
    super(redact(message));
    this.kind = kind2;
    this.status = status;
    this.retryAfterSec = retryAfterSec;
  }
};
var MAX_RETRY_AFTER_SEC = 3600;
function parseRetryAfter(v, now = Date.now()) {
  if (!v) return void 0;
  const t = v.trim();
  if (/^\d+(\.\d+)?$/.test(t)) return Math.min(Math.ceil(Number(t)), MAX_RETRY_AFTER_SEC);
  const d = Date.parse(t);
  if (Number.isNaN(d)) return void 0;
  return Math.min(Math.max(0, Math.ceil((d - now) / 1e3)), MAX_RETRY_AFTER_SEC);
}
function classifyStatus(status) {
  if (status === 429) return "rate";
  if (status === 401 || status === 403) return "auth";
  if (status === 408 || status === 409 || status >= 500) return "server";
  return "client";
}
function errorText(body) {
  try {
    const j = JSON.parse(body);
    const m = typeof j.error === "string" ? j.error : j.error?.message ?? j.message;
    if (m) return String(m).slice(0, 300);
  } catch {
  }
  return body.replace(/\s+/g, " ").trim().slice(0, 300);
}
async function postJson(url, headers, body, opts) {
  const timeout = AbortSignal.timeout(opts.timeoutMs);
  const signal = opts.signal ? AbortSignal.any([opts.signal, timeout]) : timeout;
  let res;
  try {
    res = await fetch(url, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body), signal });
  } catch (e) {
    if (opts.signal?.aborted) throw e;
    if (timeout.aborted) throw new ProviderError(`timed out after ${Math.round(opts.timeoutMs / 1e3)}s`, "timeout");
    const err = e;
    const code = err.cause?.code ?? "";
    const detail = err.cause?.message ?? err.message;
    if (code === "ECONNREFUSED" || code === "ENOTFOUND" || code === "EAI_AGAIN") throw new ProviderError(`cannot reach ${new URL(url).host}: ${detail}`, "unavailable");
    throw new ProviderError(`network error: ${detail}`, "server");
  }
  let text;
  try {
    text = await res.text();
  } catch (e) {
    if (opts.signal?.aborted) throw e;
    if (timeout.aborted) throw new ProviderError(`timed out after ${Math.round(opts.timeoutMs / 1e3)}s`, "timeout");
    throw new ProviderError(`network error reading response: ${e.message}`, "server");
  }
  if (!res.ok) {
    const kind2 = classifyStatus(res.status);
    throw new ProviderError(`HTTP ${res.status}: ${errorText(text) || res.statusText}`, kind2, res.status, parseRetryAfter(res.headers.get("retry-after")));
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new ProviderError(`response is not JSON: ${text.slice(0, 120)}`, "server", res.status);
  }
}

// src/providers/claude-code.ts
var SAFE_ARG = /^[\w.:@/\-[\]]+$/;
function whichSync(cmd, env = process.env) {
  const isWin = process.platform === "win32";
  const exts = isWin ? (env.PATHEXT ?? ".EXE;.CMD;.BAT;.COM").split(";").filter(Boolean) : [""];
  const hasExt = isWin && /\.[a-z0-9]+$/i.test(cmd);
  const candidates2 = hasExt ? [cmd] : exts.map((e) => cmd + e.toLowerCase());
  if (cmd.includes("/") || cmd.includes("\\")) return candidates2.concat(cmd).find((c) => existsSync3(c));
  for (const dir of (env.PATH ?? env.Path ?? "").split(path6.delimiter).filter(Boolean)) {
    for (const c of candidates2) {
      const full = path6.join(dir, c);
      if (existsSync3(full)) return full;
    }
  }
  return void 0;
}
function resolveSpawn(command, args) {
  if (/\.(c|m)?js$/i.test(command)) return { file: process.execPath, args: [command, ...args], verbatim: false };
  const found = whichSync(command);
  if (!found) throw new ProviderError(`claude-code: "${command}" not found on PATH (install Claude Code or set provider command)`, "unavailable");
  if (process.platform === "win32" && /\.(cmd|bat)$/i.test(found)) {
    const quoted = args.map((a) => `"${a.replace(/"/g, '""')}"`).join(" ");
    return { file: process.env.ComSpec ?? "cmd.exe", args: ["/d", "/s", "/c", `""${found}" ${quoted}"`], verbatim: true };
  }
  return { file: found, args, verbatim: false };
}
function parseClaudeOutput(stdout) {
  const t = stdout.trim();
  let data;
  try {
    data = JSON.parse(t);
  } catch {
    const last = t.split(/\r?\n/).filter(Boolean).pop() ?? "";
    try {
      data = JSON.parse(last);
    } catch {
      throw new ProviderError(`claude-code printed non-JSON output: ${t.slice(0, 160)}`, "server");
    }
  }
  const obj = Array.isArray(data) ? [...data].reverse().find((x) => x && x.type === "result") : data;
  if (!obj || typeof obj.result !== "string") throw new ProviderError("claude-code output has no result field", "server");
  if (obj.is_error) {
    const kind2 = /rate|limit|quota|usage/i.test(obj.result) ? "rate" : /log ?in|auth|credential/i.test(obj.result) ? "auth" : "server";
    throw new ProviderError(`claude-code error: ${obj.result.slice(0, 200)}`, kind2);
  }
  return obj.result;
}
function runClaudeCode(p, req) {
  const args = ["-p", "--output-format", "json", "--no-session-persistence", "--strict-mcp-config", "--setting-sources", ""];
  if (p.model) {
    if (!SAFE_ARG.test(p.model)) throw new ProviderError(`claude-code: invalid model name "${p.model}"`, "client");
    args.push("--model", p.model);
  }
  args.push("--tools", "");
  const spec = resolveSpawn(p.command ?? "claude", args);
  const env = { ...process.env };
  delete env.CLAUDECODE;
  const input = `<reviewer_instructions>
${req.system}
</reviewer_instructions>

${req.prompt}`;
  return new Promise((resolve, reject) => {
    const child = spawn(spec.file, spec.args, { env, windowsHide: true, windowsVerbatimArguments: spec.verbatim, stdio: ["pipe", "pipe", "pipe"] });
    let out = "", err = "", done = false;
    const finish2 = (fn) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      req.signal?.removeEventListener("abort", onAbort);
      fn();
    };
    const timer = setTimeout(() => {
      child.kill();
      finish2(() => reject(new ProviderError(`claude-code timed out after ${Math.round(p.timeoutMs / 1e3)}s`, "timeout")));
    }, p.timeoutMs);
    const onAbort = () => {
      child.kill();
      finish2(() => reject(req.signal.reason ?? new Error("aborted")));
    };
    req.signal?.addEventListener("abort", onAbort, { once: true });
    child.stdout.setEncoding("utf8").on("data", (d) => out += d);
    child.stderr.setEncoding("utf8").on("data", (d) => err += d);
    child.on("error", (e) => finish2(() => reject(new ProviderError(`claude-code failed to start: ${e.message}`, e.code === "ENOENT" ? "unavailable" : "server"))));
    child.on("close", (code) => finish2(() => {
      if (code !== 0 && !out.trim()) {
        reject(new ProviderError(`claude-code exited ${code}: ${err.trim().slice(0, 200)}`, "server"));
        return;
      }
      try {
        resolve(parseClaudeOutput(out));
      } catch (e) {
        reject(e);
      }
    }));
    child.stdin.on("error", () => {
    });
    child.stdin.end(input);
  });
}

// src/cli/doctor.ts
var OLLAMA_DEFAULT = "http://127.0.0.1:11434";
var OLLAMA_TIMEOUT_MS = 1e3;
var MIN_NODE = 20;
async function cmdDoctor(opts, cwd) {
  const lines = [];
  const add = (l, msg) => lines.push([l, msg]);
  const major = Number(process.versions.node.split(".")[0]);
  add(major >= MIN_NODE ? "OK" : "FAIL", `node ${process.versions.node}${major >= MIN_NODE ? "" : ` (needs ${MIN_NODE} or newer)`}`);
  const gv = spawnSync3("git", ["--version"], { encoding: "utf8", windowsHide: true });
  add(gv.status === 0 ? "OK" : "FAIL", gv.status === 0 ? gv.stdout.trim() : "git not found on PATH");
  const root = gv.status === 0 ? repoRoot(cwd) : void 0;
  add(root ? "OK" : "WARN", root ? `git repository ${root}` : "not inside a git repository (review --diff still works; local state is off)");
  const file = opts.config ? path7.resolve(cwd, opts.config) : findConfigFile(cwd);
  let config;
  try {
    const lo = { cwd, overrides: opts.overrides, root: root ?? cwd, warn: () => {
    } };
    if (opts.config) {
      lo.configPath = opts.config;
      lo.trusted = true;
    }
    config = loadConfig(lo);
    if (!file) add("OK", "config: none found, using defaults and environment");
    else if (opts.config) add("OK", `config ${file} (trusted: passed with --config)`);
    else add("OK", `config ${file} (untrusted repo file: no env: refs, no commands, keys only to official hosts)`);
  } catch (e) {
    add("FAIL", `config: ${redact(e.message)}`);
  }
  for (const [i, p] of (config?.providers ?? []).entries()) {
    const keys = p.keys.length ? `${p.keys.length} key(s): ${p.keys.map(maskKey).join(", ")}` : "no key";
    const needsKey = p.name !== "ollama" && p.name !== "claude-code" && isOfficialHost(p.name, p.baseUrl);
    add(needsKey && !p.keys.length ? "WARN" : "OK", `provider ${i + 1} ${p.name} model=${p.model || "(cli default)"}${p.baseUrl ? ` baseUrl=${p.baseUrl}` : ""} ${keys}`);
  }
  const ollama2 = (config?.providers.find((p) => p.name === "ollama")?.baseUrl || ollamaBase(process.env) || OLLAMA_DEFAULT).replace(/\/+$/, "");
  try {
    const res = await fetch(`${ollama2}/api/tags`, { signal: AbortSignal.timeout(OLLAMA_TIMEOUT_MS) });
    await res.body?.cancel();
    add(res.ok ? "OK" : "WARN", `ollama at ${ollama2} ${res.ok ? "reachable" : `answered ${res.status}`}`);
  } catch {
    add("WARN", `ollama not reachable at ${ollama2}`);
  }
  const claude = opts.overrides.claudeBin ?? process.env.CODEWOLF_CLAUDE_BIN ?? "claude";
  const found = whichSync(claude);
  add(found ? "OK" : "WARN", found ? `claude CLI ${found}` : `claude CLI "${claude}" not found (the claude-code provider and fix --to claude need it)`);
  for (const tool of ["ruff", "eslint", "semgrep", "gitleaks"]) {
    if (config && !config.tools[tool]) {
      add("OK", `${tool} disabled in config`);
      continue;
    }
    const at = whichSync(tool);
    add(at ? "OK" : "WARN", at ? `${tool} ${at}` : `${tool} not found (optional linter, skipped in reviews)`);
  }
  if (!root) add("WARN", "state dir: unavailable outside a git repository");
  else {
    try {
      const dir = stateDir(root);
      if (!dir) throw new Error("git did not report a git dir");
      mkdirSync3(dir, { recursive: true });
      const probe = path7.join(dir, `.doctor-${process.pid}`);
      writeFileSync3(probe, "ok");
      unlinkSync(probe);
      add("OK", `state dir ${dir} writable`);
    } catch (e) {
      add("FAIL", `state dir not writable: ${e.message}`);
    }
  }
  process.stdout.write(lines.map(([l, m]) => `${l.padEnd(4)} ${redact(m)}`).join("\n") + "\n");
  return lines.some(([l]) => l === "FAIL") ? 1 : 0;
}

// src/cli/fix.ts
import { spawn as spawn2 } from "node:child_process";
import { readFileSync as readFileSync6 } from "node:fs";

// src/action/render.ts
function stripComments(text) {
  return text.replace(/<!--[\s\S]*?(?:-->|$)/g, "");
}
function isBotAuthored(c) {
  return c.user?.type === "Bot";
}
var HELP_TEXT = [
  "CodeWolf commands (mention `@codewolf` followed by one of these):",
  "",
  "| Command | What it does |",
  "| --- | --- |",
  "| `review` | Review the commits pushed since the last review |",
  "| `full review` | Review the whole pull request again from scratch |",
  "| `pause` | Stop automatic reviews on this pull request |",
  "| `resume` | Start automatic reviews again |",
  "| `summary` | Regenerate the summary comment |",
  "| `configuration` | Show the settings CodeWolf is using (keys are never shown) |",
  "| `help` | Show this list |",
  "",
  "Anything else is treated as a question about the pull request."
].join("\n");
function oneLine(s2) {
  return stripComments(s2).replace(/\s*\r?\n\s*/g, " ").trim();
}
function prose(s2) {
  return stripComments(s2).trim();
}
var loc = (f) => `${f.file}:${f.line}${f.endLine && f.endLine > f.line ? "-" + f.endLine : ""}`;
function agentPromptFor(f) {
  if (f.agentPrompt?.trim()) return prose(f.agentPrompt);
  const fix = typeof f.suggestion === "string" ? ` Replace those lines with:
${f.suggestion.replace(/\n$/, "")}` : "";
  return `In ${loc(f)}, fix this ${f.severity} ${f.category} issue: ${oneLine(f.title)}. ${oneLine(f.body)}${fix}`;
}

// src/cli/fix.ts
var FIX_TARGETS = {
  claude: { bin: "claude", args: ["-p"] },
  codex: { bin: "codex", args: ["exec", "-"] },
  opencode: { bin: "opencode", args: ["run"] },
  gemini: { bin: "gemini", args: ["-p"] }
};
function clipboardCommands() {
  if (process.platform === "win32") return [["clip", []]];
  if (process.platform === "darwin") return [["pbcopy", []]];
  return [["wl-copy", []], ["xclip", ["-selection", "clipboard"]]];
}
var HEADER = `Fix these code review findings from CodeWolf in this repository.
For each one: open the file, check that the problem is real, and make the smallest change that fixes it.
If a finding is wrong, leave that code alone and say why. Do not change unrelated code.
When done, list each id with fixed or skipped and one line of why.`;
function buildFixPrompt(root, findings) {
  const items = findings.map((f, i) => {
    let line = f.line;
    try {
      line = relocate(f, readFileSync6(repoFile(root, f.file), "utf8"));
    } catch {
    }
    const moved = line === null ? " (the code at this line has changed since the review)" : "";
    const at = line ?? f.line;
    const shifted = { ...f, line: at, ...f.endLine ? { endLine: f.endLine + at - f.line } : {} };
    return `${i + 1}. [${f.id}] ${agentPromptFor(shifted)}${moved}`;
  });
  return `${HEADER}

${items.join("\n\n")}
`;
}
function pipeTo(bin, args, text, showOutput) {
  const spec = resolveSpawn(bin, args);
  const env = { ...process.env };
  delete env.CLAUDECODE;
  return new Promise((resolve, reject) => {
    const child = spawn2(spec.file, spec.args, { env, windowsHide: true, windowsVerbatimArguments: spec.verbatim, stdio: ["pipe", showOutput ? "inherit" : "ignore", "inherit"] });
    child.on("error", reject);
    child.on("close", (code) => resolve(code ?? 1));
    child.stdin.on("error", () => {
    });
    child.stdin.end(text);
  });
}
async function deliver(target, prompt, claudeBin) {
  if (target === "clipboard") {
    for (const [bin2, args] of clipboardCommands()) {
      if (!whichSync(bin2)) continue;
      try {
        if (await pipeTo(bin2, args, prompt, false) === 0) {
          process.stderr.write(`codewolf: fix prompt copied to the clipboard (${bin2})
`);
          return null;
        }
      } catch {
      }
    }
    return "no clipboard tool worked";
  }
  const t = FIX_TARGETS[target];
  const bin = target === "claude" ? claudeBin ?? process.env.CODEWOLF_CLAUDE_BIN ?? t.bin : t.bin;
  if (!/\.(c|m)?js$/i.test(bin) && !whichSync(bin)) return `${bin} not found on PATH`;
  try {
    const code = await pipeTo(bin, t.args, prompt, true);
    return code === 0 ? null : `${target} exited ${code}`;
  } catch (e) {
    return e.message;
  }
}
async function cmdFix(ids, opts, cwd) {
  if (ids.length && (opts.all || opts.nits)) throw new Error("give finding ids or --all / --nits, not both");
  const targets = ["print", "clipboard", ...Object.keys(FIX_TARGETS)];
  if (opts.to && !targets.includes(opts.to)) throw new Error(`unknown --to ${opts.to} (one of: ${targets.join(", ")})`);
  const { root, store } = openStore(cwd);
  const open = store.findings.filter((f) => f.status === "open");
  const picked = ids.length ? byIds(store, ids).map((f) => {
    if (f.status !== "open") throw new Error(`finding ${f.id} is ${f.status}`);
    return f;
  }) : open.filter((f) => opts.nits ? f.severity === "nit" : f.severity !== "nit");
  if (!picked.length) {
    process.stdout.write("codewolf: no open findings to fix\n");
    return 0;
  }
  const prompt = buildFixPrompt(root, picked);
  const target = opts.to ?? (!process.stdout.isTTY || detectAgent(process.env) ? "print" : Object.keys(FIX_TARGETS).find((t) => whichSync(FIX_TARGETS[t].bin)) ?? "print");
  if (target !== "print") {
    const err = await deliver(target, prompt, opts["claude-bin"]);
    if (!err) return 0;
    process.stderr.write(`codewolf: fix target ${target} failed (${err}); printing the prompt instead
`);
  }
  process.stdout.write(prompt);
  return 0;
}

// src/cli/format.ts
function loc2(f) {
  return `${f.file}:${f.line}${f.endLine ? `-${f.endLine}` : ""}`;
}
function counts(r) {
  const parts = Object.entries(r.stats.bySeverity).filter(([, n]) => n > 0).map(([s2, n]) => `${n} ${s2}`);
  return parts.length ? ` (${parts.join(", ")})` : "";
}
function via(r) {
  return r.provider.model ? `${r.provider.name}/${r.provider.model}` : r.provider.name;
}
var kind = (f) => f.kind ?? (f.severity === "nit" ? "nitpick" : "issue");
function formatPlain(r) {
  const block = (f) => {
    const lines = [`${loc2(f)} ${f.severity} ${kind(f)} ${f.category} ${f.title}`, f.body];
    if (f.suggestion !== void 0) lines.push("suggestion:", f.suggestion);
    if (f.rewrite) lines.push(`rewrite (${f.rewrite.language}): ${f.rewrite.reason}`);
    return lines.join("\n");
  };
  const blocks = r.findings.map(block);
  const outside = r.outsideDiff ?? [];
  if (outside.length) blocks.push(`outside the diff (${outside.length}, on changed files but not on changed lines; check before acting):`, ...outside.map(block));
  const tail = r.findings.length ? `codewolf: ${r.findings.length} finding(s)${counts(r)} in ${r.stats.files} file(s) via ${via(r)}` : `codewolf: no findings in ${r.stats.files} file(s) via ${via(r)}`;
  return [...blocks, tail].join("\n\n") + "\n";
}
var mdCell = (s2) => s2.replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
function fence(code, lang = "") {
  const ticks = code.includes("```") ? "````" : "```";
  return `${ticks}${lang}
${code}
${ticks}`;
}
function formatMarkdown(r) {
  const out = ["# CodeWolf review", "", r.summary, ""];
  out.push(`Review effort: ${r.effort.score}/5, about ${r.effort.minutes} min. Model: ${via(r)}.`, "");
  if (r.walkthrough.length) {
    out.push("## Walkthrough", "", "| File | Change |", "| --- | --- |");
    for (const w of r.walkthrough) out.push(`| \`${mdCell(w.file)}\` | ${mdCell(w.change)} |`);
    out.push("");
  }
  if (r.diagram) out.push("## Flow", "", fence(r.diagram, "mermaid"), "");
  const section = (fs) => {
    for (const f of fs) {
      out.push(`### ${f.severity} / ${f.category}: ${f.title}`, "", `\`${loc2(f)}\` ${kind(f)}${f.cwe ? ` ${f.cwe}` : ""}${f.source !== "llm" ? ` (${f.source})` : ""}`, "", f.body, "");
      if (f.suggestion !== void 0) out.push("Suggested replacement:", "", fence(f.suggestion), "");
      if (f.rewrite) out.push(`Rewrite in ${f.rewrite.language}: ${f.rewrite.reason}`, "", fence(f.rewrite.code, f.rewrite.language.toLowerCase()), "");
    }
  };
  out.push(`## Findings: ${r.findings.length}${counts(r)}`, "");
  section(r.findings);
  if (r.outsideDiff?.length) {
    out.push(`## Outside the diff: ${r.outsideDiff.length}`, "", "On changed files, but not on changed lines. Check each one before acting.", "");
    section(r.outsideDiff);
  }
  if (r.warnings?.length) out.push("## Warnings", "", ...r.warnings.map((w) => `- ${w}`), "");
  return out.join("\n");
}
var C = { reset: "\x1B[0m", bold: "\x1B[1m", dim: "\x1B[2m", red: "\x1B[31m", yellow: "\x1B[33m", cyan: "\x1B[36m", gray: "\x1B[90m", green: "\x1B[32m" };
var SEV_COLOR = { critical: C.red, major: C.yellow, minor: C.cyan, nit: C.gray };
function formatPretty(r, color) {
  const c = (code, s2) => color ? `${code}${s2}${C.reset}` : s2;
  const out = [c(C.bold, "CodeWolf review"), r.summary, ""];
  for (const w of r.walkthrough) out.push(`  ${c(C.dim, w.file)}  ${w.change}`);
  if (r.walkthrough.length) out.push("");
  const entry = (f) => {
    out.push(`${c(SEV_COLOR[f.severity] ?? "", f.severity.toUpperCase().padEnd(8))} ${c(C.bold, f.title)}`);
    out.push(`         ${c(C.dim, `${loc2(f)} ${kind(f)} ${f.category}${f.cwe ? ` ${f.cwe}` : ""}${f.source !== "llm" ? ` ${f.source}` : ""}`)}`);
    for (const l of f.body.split("\n")) out.push(`         ${l}`);
    if (f.suggestion !== void 0) for (const l of f.suggestion.split("\n")) out.push(`         ${c(C.green, `+ ${l}`)}`);
    if (f.rewrite) out.push(`         ${c(C.dim, `rewrite in ${f.rewrite.language}: ${f.rewrite.reason}`)}`);
    out.push("");
  };
  r.findings.forEach(entry);
  if (r.outsideDiff?.length) {
    out.push(c(C.bold, `Outside the diff (${r.outsideDiff.length})`) + c(C.dim, "  on changed files, not on changed lines"), "");
    r.outsideDiff.forEach(entry);
  }
  out.push(r.findings.length ? `${r.findings.length} finding(s)${counts(r)}` : c(C.green, "No findings."));
  out.push(c(C.dim, `${r.stats.files} file(s), effort ${r.effort.score}/5 (~${r.effort.minutes} min), ${via(r)}`));
  return out.join("\n") + "\n";
}
function formatNdjson(r) {
  const lines = r.findings.map((f) => JSON.stringify({ type: "finding", ...f }));
  lines.push(JSON.stringify({ type: "summary", summary: r.summary, stats: r.stats, effort: r.effort, provider: r.provider, walkthrough: r.walkthrough, ...r.outsideDiff?.length ? { outsideDiff: r.outsideDiff } : {}, ...r.warnings?.length ? { warnings: r.warnings } : {} }));
  return lines.join("\n") + "\n";
}
function formatResult(r, format, color) {
  switch (format) {
    case "json":
      return JSON.stringify(r, null, 2) + "\n";
    case "markdown":
      return formatMarkdown(r);
    case "pretty":
      return formatPretty(r, color);
    default:
      return formatPlain(r);
  }
}

// src/cli/hook.ts
import { chmodSync, existsSync as existsSync4, mkdirSync as mkdirSync4, readFileSync as readFileSync7, statSync, unlinkSync as unlinkSync2, writeFileSync as writeFileSync4 } from "node:fs";
import path8 from "node:path";
var BEGIN = "# >>> codewolf:managed post-commit (codewolf hook uninstall removes this block) >>>";
var END = "# <<< codewolf:managed post-commit <<<";
var BLOCK_RE = /\n?# >>> codewolf:managed post-commit[^\n]*\n[\s\S]*?# <<< codewolf:managed post-commit <<<\n?/;
var SH_SHEBANG = /^#!\s*\S*\b(sh|bash|dash|zsh|ksh)\b|^#!\s*\S*env\s+(sh|bash|dash|zsh|ksh)\b/;
var shq = (s2) => `'${s2.replace(/\\/g, "/").replace(/'/g, `'\\''`)}'`;
function hookBlock(node, cli, out) {
  return `${BEGIN}
( ${shq(node)} ${shq(cli)} review --committed --format plain --fail-on none > ${shq(out)} 2>&1 < /dev/null & ) > /dev/null 2>&1
${END}
`;
}
function hookFile(root) {
  return path8.join(path8.resolve(root, git(["rev-parse", "--git-path", "hooks"], root).trim()), "post-commit");
}
function cmdHook(sub, cwd) {
  const root = repoRoot(cwd);
  if (!root) throw new Error("not inside a git repository");
  const file = hookFile(root);
  const cur = existsSync4(file) ? readFileSync7(file, "utf8").replace(/\r\n/g, "\n") : null;
  const ours = cur !== null && BLOCK_RE.test(cur);
  switch (sub) {
    case "install": {
      const dir = stateDir(root);
      if (!dir) throw new Error("cannot find the git dir for hook state");
      mkdirSync4(dir, { recursive: true });
      const block = hookBlock(process.execPath, path8.resolve(process.argv[1] ?? ""), path8.join(dir, "last-hook-review.txt"));
      let next;
      if (cur === null) next = `#!/bin/sh
${block}`;
      else if (ours) next = cur.replace(BLOCK_RE, (m) => (m.startsWith("\n") ? "\n" : "") + block);
      else {
        const first = cur.split("\n", 1)[0];
        if (first.startsWith("#!") && !SH_SHEBANG.test(first)) throw new Error(`${file} is not a shell script (${first}); add CodeWolf to it by hand`);
        next = first.startsWith("#!") ? `${first}
${block}${cur.slice(first.length + 1)}` : `${block}${cur}`;
      }
      mkdirSync4(path8.dirname(file), { recursive: true });
      writeFileSync4(file, next);
      try {
        chmodSync(file, 493);
      } catch {
      }
      process.stdout.write(`${ours ? "updated" : cur === null ? "installed" : "chained into existing"} post-commit hook: ${file}
reviews land in ${path8.join(dir, "last-hook-review.txt")}
`);
      return 0;
    }
    case "uninstall": {
      if (!ours) {
        process.stdout.write("codewolf: no CodeWolf block in the post-commit hook; nothing to remove\n");
        return 0;
      }
      const rest = cur.replace(BLOCK_RE, "\n").replace(/^\n/, "").replace(/\n{3,}/g, "\n\n");
      if (/^(#![^\n]*)?\s*$/.test(rest)) unlinkSync2(file);
      else writeFileSync4(file, rest);
      process.stdout.write(`removed the CodeWolf block from ${file}
`);
      return 0;
    }
    case "status": {
      const state = stateDir(root);
      const last = state ? path8.join(state, "last-hook-review.txt") : null;
      process.stdout.write(`post-commit hook: ${ours ? "installed" : cur === null ? "not installed" : "not installed (another hook exists; install will chain it)"}  ${file}
`);
      if (last && existsSync4(last)) process.stdout.write(`last hook review: ${last} (${statSync(last).mtime.toISOString()})
`);
      return 0;
    }
    default:
      throw new Error("usage: codewolf hook install | uninstall | status");
  }
}

// src/cli/install.ts
import { existsSync as existsSync5, mkdirSync as mkdirSync5, readFileSync as readFileSync8, realpathSync as realpathSync2, writeFileSync as writeFileSync5 } from "node:fs";
import { homedir } from "node:os";
import path9 from "node:path";
var MANAGED = "codewolf:managed";
var MD_MARK = `<!-- ${MANAGED}: written by codewolf install. Delete this line to keep your own edits safe from reinstalls. -->`;
var DESCRIPTION = "Review local changes with the CodeWolf AI code reviewer, fix critical and major findings, and report what is left.";
var STEPS = `# CodeWolf review loop

CodeWolf reviews a git diff and reports findings with a severity, a category and often a ready replacement.

1. Run \`codewolf review --format plain\` plus any flags the user gave (\`--staged\`, \`--base main\`, \`--committed\`).
   When \`codewolf\` is not installed use \`npx -y github:za3ter123/codewolf\` in its place.
   Exit 0 or 1 means the review ran. Exit 2 means CodeWolf failed: show its stderr and stop.
2. No provider configured (no API key, no Ollama, no claude CLI)? You are the reviewer instead:
   run \`codewolf packet\` (same scope flags), follow its \`instructions\` on its \`chunks\`, write your answer
   as JSON matching its \`schema\` to a temporary file outside the repository, then run
   \`codewolf ingest <that file>\` with the same scope flags. It checks, filters and stores your findings.
3. Each finding block starts with \`file:line\`, the severity and the title, then the explanation,
   then an optional \`suggestion:\` holding replacement text for that line range.
4. Fix every \`critical\` and \`major\` finding after confirming it in the code. Useful helpers:
   \`codewolf findings\` lists stored findings with ids, \`codewolf apply <id>\` writes a finding's suggestion,
   \`codewolf dismiss <id> --reason "<why>"\` silences a false positive in future reviews.
5. Review again. Stop when no critical or major finding is left, or after 3 rounds.
6. Report: each fix as \`file:line\` and one sentence, the findings you dismissed and why, and the minor
   and nit findings you left, one line each.

Findings come from a model and can be wrong, so verify before editing. Never put API keys in a command line.
`;
var skill = () => `---
name: codewolf
description: ${DESCRIPTION} Use before a commit or pull request, after a large edit, or when asked for a review or security check.
---

${MD_MARK}

${STEPS}`;
var INSTALL_AGENTS = {
  claude: {
    project: ".claude",
    user: (env) => env.CLAUDE_CONFIG_DIR || path9.join(homedir(), ".claude"),
    files: [
      ["commands/codewolf.md", () => `---
description: ${DESCRIPTION}
argument-hint: "[codewolf review flags, e.g. --staged or --base main]"
allowed-tools: Bash(codewolf:*), Bash(npx:*), Bash(git status:*), Bash(git diff:*), Read, Edit, Write, Grep, Glob
---

${MD_MARK}

Extra flags from the user (may be empty): \`$ARGUMENTS\`

${STEPS}`],
      ["skills/codewolf/SKILL.md", skill]
    ]
  },
  codex: { project: ".codex", user: (env) => env.CODEX_HOME || path9.join(homedir(), ".codex"), files: [["skills/codewolf/SKILL.md", skill]] },
  cursor: {
    project: ".cursor",
    user: () => null,
    // Cursor keeps user rules in its settings UI, not in files
    files: [["rules/codewolf.mdc", () => `---
description: ${DESCRIPTION}
globs:
alwaysApply: false
---

${MD_MARK}

${STEPS}`]]
  },
  gemini: {
    project: ".gemini",
    user: () => path9.join(homedir(), ".gemini"),
    files: [["commands/codewolf.toml", () => `# ${MANAGED}: written by codewolf install. Delete this line to keep your own edits safe from reinstalls.
description = "${DESCRIPTION}"
prompt = """
Extra flags from the user (may be empty): {{args}}

${STEPS}"""
`]]
  },
  opencode: {
    project: ".opencode",
    user: (env) => path9.join(env.XDG_CONFIG_HOME || path9.join(homedir(), ".config"), "opencode"),
    files: [["command/codewolf.md", () => `---
description: ${DESCRIPTION}
---

${MD_MARK}

Extra flags from the user (may be empty): $ARGUMENTS

${STEPS}`]]
  },
  agents: { project: ".agents", user: () => path9.join(homedir(), ".agents"), files: [["skills/codewolf/SKILL.md", skill]] }
};
function nearestReal(p) {
  let dir = path9.resolve(p);
  const rest = [];
  while (!existsSync5(dir)) {
    const up = path9.dirname(dir);
    if (up === dir) break;
    rest.unshift(path9.basename(dir));
    dir = up;
  }
  return path9.join(realpathSync2(dir), ...rest);
}
function inside(boundary, target) {
  const r = path9.relative(nearestReal(boundary), nearestReal(target));
  return !!r && r !== ".." && !r.startsWith(".." + path9.sep) && !path9.isAbsolute(r);
}
function cmdInstall(names, opts, cwd, env = process.env) {
  if (opts.project && opts.user) throw new Error("choose --project or --user, not both");
  const known2 = Object.keys(INSTALL_AGENTS);
  let agents = opts.all ? known2 : names;
  if (!agents.length) {
    const here = detectAgent(env);
    if (here && known2.includes(here)) agents = [here];
    else throw new Error(`usage: codewolf install <agent...> | --all  [--project | --user] [--yes]   agents: ${known2.join(", ")}`);
  }
  for (const a of agents) if (!known2.includes(a)) throw new Error(`unknown agent "${a}" (one of: ${known2.join(", ")})`);
  const scope = opts.user ? "user" : "project";
  const root = scope === "project" ? repoRoot(cwd) : void 0;
  if (scope === "project" && !root) throw new Error("project install needs a git repository (or use --user)");
  const steps = [];
  for (const a of agents) {
    const t = INSTALL_AGENTS[a];
    const base = scope === "user" ? t.user(env) : path9.join(root, t.project);
    if (!base) {
      process.stderr.write(`codewolf: ${a} has no user-level file to install; use --project
`);
      continue;
    }
    const boundary = scope === "user" ? base : root;
    for (const [rel, make] of t.files) {
      const file = path9.join(base, rel);
      const content = make();
      let action;
      if (!inside(boundary, file)) action = "refused (outside the allowed dir)";
      else if (!existsSync5(file)) action = "create";
      else {
        const cur = readFileSync8(file, "utf8");
        action = cur === content ? "unchanged" : cur.includes(MANAGED) || opts.force ? "overwrite" : "skip (not ours, use --force)";
      }
      steps.push({ file, content, action });
    }
  }
  for (const s2 of steps) process.stdout.write(`${s2.action.padEnd(10)} ${s2.file}
`);
  if (!opts.yes) {
    process.stdout.write("codewolf: plan only, nothing written. Re-run with --yes to install.\n");
    return 0;
  }
  for (const s2 of steps) {
    if (s2.action !== "create" && s2.action !== "overwrite") continue;
    mkdirSync5(path9.dirname(s2.file), { recursive: true });
    writeFileSync5(s2.file, s2.content);
  }
  const blocked = steps.filter((s2) => s2.action.startsWith("skip") || s2.action.startsWith("refused")).length;
  process.stdout.write(`codewolf: installed ${steps.filter((s2) => s2.action === "create" || s2.action === "overwrite").length} file(s)${blocked ? `, ${blocked} left alone` : ""}
`);
  return blocked ? 2 : 0;
}

// src/cli/pr.ts
import { spawnSync as spawnSync4 } from "node:child_process";

// src/action/github.ts
var PER_PAGE = 100;
var MAX_PAGES = 30;
var TIMEOUT_MS = 3e4;
var RETRIES = 2;
var GitHubError = class extends Error {
  status;
  method;
  path;
  constructor(method, path13, status, detail) {
    super(`GitHub API ${method} ${path13} failed with ${status}: ${detail}${hint(status, method)}`);
    this.name = "GitHubError";
    this.status = status;
    this.method = method;
    this.path = path13;
  }
};
function hint(status, method) {
  if (status === 401) return " (the github-token input is missing or invalid)";
  if (status === 403 && method !== "GET") return ' (the token cannot write here: grant "pull-requests: write" in the workflow permissions; pull requests from forks get a read-only token)';
  if (status === 404) return " (check the repository, the pull request number, and that the token can read this repository)";
  return "";
}
var GitHub = class {
  baseUrl;
  #token;
  constructor(baseUrl, token) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
    this.#token = token;
  }
  async request(method, path13, body) {
    const res = await this.#send(method, path13, body);
    if (res.status === 204) return void 0;
    return await res.json();
  }
  /** GETs every page of a list endpoint. Stops on a short page, so it works with or without Link headers. */
  async paginate(path13) {
    const out = [];
    const sep = path13.includes("?") ? "&" : "?";
    for (let page = 1; page <= MAX_PAGES; page++) {
      const res = await this.#send("GET", `${path13}${sep}per_page=${PER_PAGE}&page=${page}`);
      const items = await res.json();
      if (!Array.isArray(items)) throw new GitHubError("GET", path13, res.status, "expected a JSON array");
      out.push(...items);
      if (items.length < PER_PAGE) break;
    }
    return out;
  }
  async #send(method, path13, body) {
    let lastErr;
    for (let attempt = 0; attempt <= RETRIES; attempt++) {
      let res;
      try {
        res = await fetch(this.baseUrl + path13, {
          method,
          headers: {
            authorization: `Bearer ${this.#token}`,
            accept: "application/vnd.github+json",
            "x-github-api-version": "2022-11-28",
            "user-agent": "codewolf-action",
            ...body === void 0 ? {} : { "content-type": "application/json" }
          },
          body: body === void 0 ? void 0 : JSON.stringify(body),
          signal: AbortSignal.timeout(TIMEOUT_MS)
        });
      } catch (err) {
        lastErr = err;
        if (attempt < RETRIES) {
          await sleep(1e3 * (attempt + 1));
          continue;
        }
        throw new Error(`GitHub API ${method} ${path13} failed: ${err instanceof Error ? err.message : String(err)}`);
      }
      if (res.ok) return res;
      const retryable = res.status >= 500 || res.status === 429 || res.status === 403 && res.headers.get("retry-after");
      if (retryable && method === "GET" && attempt < RETRIES) {
        const wait = Math.min(Number(res.headers.get("retry-after")) || attempt + 1, 30);
        await res.body?.cancel();
        await sleep(wait * 1e3);
        continue;
      }
      throw new GitHubError(method, path13, res.status, await errorDetail(res));
    }
    throw lastErr instanceof Error ? lastErr : new Error(`GitHub API ${method} ${path13} failed`);
  }
};
async function errorDetail(res) {
  const text = await res.text().catch(() => "");
  try {
    const j = JSON.parse(text);
    const extra = Array.isArray(j.errors) && j.errors.length ? " " + JSON.stringify(j.errors).slice(0, 500) : "";
    return (j.message ?? res.statusText) + extra;
  } catch {
    return text.slice(0, 300) || res.statusText;
  }
}
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// src/cli/pr.ts
var NAME = /^(?!\.+$)[\w.-]+$/;
var FP_RE = /<!-- codewolf:fp:([^\s>]+) -->/;
function parsePrRef(ref, repo, cwd) {
  const url = ref.match(/^https?:\/\/[^/]+\/([^/]+)\/([^/]+)\/pull\/(\d+)/);
  let full = repo, num = ref;
  if (url) {
    full = `${url[1]}/${url[2]}`;
    num = url[3];
  }
  if (!/^\d+$/.test(num)) throw new Error("usage: codewolf pr <number|url> [--repo owner/name] [--json]");
  if (!full) {
    let remote = "";
    try {
      remote = git(["remote", "get-url", "origin"], cwd).trim();
    } catch {
    }
    const m = remote.match(/github\.com[:/]([^/]+)\/([^/]+?)(?:\.git)?\/?$/);
    if (!m) throw new Error("cannot tell the repository; pass --repo owner/name or a PR URL");
    full = `${m[1]}/${m[2]}`;
  }
  const [owner = "", name = ""] = full.split("/");
  if (!NAME.test(owner) || !NAME.test(name) || full.split("/").length !== 2) throw new Error(`invalid repository "${full}" (expected owner/name)`);
  return { owner, name, number: Number(num) };
}
function toItems(comments) {
  const out = [];
  for (const c of comments) {
    const body = c.body ?? "";
    const fp = body.match(FP_RE)?.[1];
    if (!fp || !isBotAuthored(c)) continue;
    const [category = "", severity = ""] = (body.match(/^_([^_\n]+)_/)?.[1] ?? "").split(" \xB7 ");
    const title = body.match(/\*\*([^\n]+?)\*\*/)?.[1] ?? "";
    const prompt = body.match(/Prompt for your coding agent<\/summary>\s*(`{3,})text\n([\s\S]*?)\n\1/)?.[2]?.trim();
    const suggestion = body.match(/(`{3,})suggestion\n([\s\S]*?)\n\1/)?.[2];
    const line = c.line ?? c.original_line ?? null;
    const item = { file: c.path ?? "", line, severity, category, title, fingerprint: fp, prompt: prompt || `In ${c.path}:${line ?? "?"}, fix: ${title}` };
    if (suggestion !== void 0) item.suggestion = suggestion;
    if (c.html_url) item.url = c.html_url;
    out.push(item);
  }
  return out;
}
async function fetchComments(owner, name, n, env) {
  const token = env.GITHUB_TOKEN || env.GH_TOKEN;
  if (token) return new GitHub(env.GITHUB_API_URL || "https://api.github.com", token).paginate(`/repos/${owner}/${name}/pulls/${n}/comments`);
  let spec;
  try {
    spec = resolveSpawn("gh", ["api", `repos/${owner}/${name}/pulls/${n}/comments?per_page=100`, "--paginate", "--jq", ".[]"]);
  } catch {
    throw new Error("set GITHUB_TOKEN or GH_TOKEN, or install and log in to the gh CLI");
  }
  const r = spawnSync4(spec.file, spec.args, { encoding: "utf8", windowsHide: true, windowsVerbatimArguments: spec.verbatim, maxBuffer: 256 * 1024 * 1024 });
  if (r.status !== 0) throw new Error(`gh api failed: ${(r.stderr || r.error?.message || "").trim().split("\n")[0]}`);
  return r.stdout.split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l));
}
async function cmdPr(ref, opts, cwd, env = process.env) {
  const { owner, name, number } = parsePrRef(ref ?? "", opts.repo, cwd);
  const items = toItems(await fetchComments(owner, name, number, env));
  if (opts.json) {
    process.stdout.write(JSON.stringify(items, null, 2) + "\n");
    return 0;
  }
  if (!items.length) {
    process.stdout.write(`codewolf: no CodeWolf review comments on ${owner}/${name}#${number}
`);
    return 0;
  }
  const head = `Fix these CodeWolf review comments from pull request ${owner}/${name}#${number}. Check each one in the code first; skip and explain any that are wrong.`;
  const blocks = items.map((it, i) => `${i + 1}. [${[it.severity, it.category].filter(Boolean).join(" ")}] ${it.file}:${it.line ?? "?"} ${it.title}
${it.prompt}`);
  process.stdout.write(`${head}

${blocks.join("\n\n")}
`);
  return 0;
}

// src/cli/state.ts
import { spawnSync as spawnSync5 } from "node:child_process";
import { readFileSync as readFileSync10 } from "node:fs";
import path11 from "node:path";

// src/core/diff.ts
var HUNK_RE = /^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/;
function unquotePath(p) {
  if (!(p.length >= 2 && p.startsWith('"') && p.endsWith('"'))) return p;
  const body = p.slice(1, -1);
  const bytes = [];
  const simple = { n: 10, t: 9, r: 13, '"': 34, "\\": 92, a: 7, b: 8, f: 12, v: 11 };
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (c !== "\\") {
      for (const b of Buffer.from(c, "utf8")) bytes.push(b);
      continue;
    }
    const n = body[i + 1] ?? "";
    if (/[0-7]/.test(n)) {
      const oct = body.slice(i + 1, i + 4).match(/^[0-7]{1,3}/)[0];
      bytes.push(parseInt(oct, 8));
      i += oct.length;
    } else {
      bytes.push(simple[n] ?? n.charCodeAt(0));
      i++;
    }
  }
  return Buffer.from(bytes).toString("utf8");
}
function cleanPath(raw, prefix) {
  let p = raw.replace(/\t.*$/, "").trimEnd();
  p = unquotePath(p);
  if (p === "/dev/null") return null;
  if (p.startsWith(prefix)) p = p.slice(2);
  return p;
}
function parseGitHeader(line) {
  const rest = line.slice("diff --git ".length);
  const quoted = rest.match(/^("(?:[^"\\]|\\.)*"|\S+) ("(?:[^"\\]|\\.)*"|\S+)$/);
  if (quoted && (quoted[1].startsWith('"') || quoted[2].startsWith('"'))) {
    return [cleanPath(quoted[1], "a/") ?? "", cleanPath(quoted[2], "b/") ?? ""];
  }
  if (rest.startsWith("a/") && (rest.length - 5) % 2 === 0) {
    const half = (rest.length - 5) / 2;
    const left = rest.slice(2, 2 + half);
    if (rest.slice(2 + half) === ` b/${left}`) return [left, left];
  }
  const m = rest.match(/^a\/(.+?) b\/(.+)$/);
  if (m) return [m[1], m[2]];
  return null;
}
function finish(b) {
  const f = b.file;
  if (b.isDeleted || b.newNull) f.status = "deleted";
  else if (b.isNew || b.oldNull) f.status = "added";
  else if (b.isRename || f.oldPath !== void 0 && f.oldPath !== f.path) f.status = "renamed";
  else f.status = "modified";
  if (f.status === "deleted" && f.oldPath && !f.path) f.path = f.oldPath;
  if (f.status !== "renamed" || f.oldPath === f.path) delete f.oldPath;
  if (f.status === "renamed" && !f.oldPath) f.status = "modified";
  f.patch = b.raw.join("\n");
  return f;
}
function parseDiff(patch) {
  const lines = patch.replace(/^\uFEFF/, "").split(/\r?\n/);
  if (lines.length && lines[lines.length - 1] === "") lines.pop();
  const files = [];
  let cur = null;
  let hunk = null;
  let oldLeft = 0, newLeft = 0, oldNo = 0, newNo = 0;
  const start = () => {
    if (cur) files.push(finish(cur));
    hunk = null;
    oldLeft = 0;
    newLeft = 0;
    cur = { file: { path: "", status: "modified", hunks: [], patch: "" }, raw: [], oldNull: false, newNull: false, isNew: false, isDeleted: false, isRename: false, sawPaths: false };
    return cur;
  };
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const inHunk = hunk !== null && (oldLeft > 0 || newLeft > 0);
    if (inHunk && cur && hunk) {
      const h = hunk;
      const c = line[0];
      if (c === "+") {
        h.lines.push({ type: "add", text: line.slice(1), newLine: newNo++ });
        newLeft--;
      } else if (c === "-") {
        h.lines.push({ type: "del", text: line.slice(1), oldLine: oldNo++ });
        oldLeft--;
      } else if (c === " " || line === "") {
        h.lines.push({ type: "ctx", text: line.slice(1), oldLine: oldNo++, newLine: newNo++ });
        oldLeft--;
        newLeft--;
      } else if (c === "\\") {
      } else {
        hunk = null;
        i--;
        continue;
      }
      cur.raw.push(line);
      continue;
    }
    if (line.startsWith("diff --git ")) {
      const b2 = start();
      const paths = parseGitHeader(line);
      if (paths) {
        b2.file.oldPath = paths[0];
        b2.file.path = paths[1];
      }
      b2.raw.push(line);
      continue;
    }
    if (line.startsWith("diff --cc ") || line.startsWith("diff --combined ")) {
      start();
      cur = null;
      continue;
    }
    if (line.startsWith("--- ") && lines[i + 1]?.startsWith("+++ ")) {
      if (!cur || cur.sawPaths || cur.file.hunks.length > 0) start();
      const b2 = cur;
      b2.sawPaths = true;
      const oldP = cleanPath(line.slice(4), "a/");
      const newP = cleanPath(lines[i + 1].slice(4), "b/");
      b2.oldNull = oldP === null;
      b2.newNull = newP === null;
      if (oldP !== null) b2.file.oldPath = oldP;
      if (newP !== null) b2.file.path = newP;
      else if (oldP !== null) b2.file.path = oldP;
      b2.raw.push(line, lines[i + 1]);
      i++;
      continue;
    }
    const hm = line.match(HUNK_RE);
    if (hm) {
      const b2 = cur ?? start();
      const h = {
        oldStart: +hm[1],
        oldLines: hm[2] === void 0 ? 1 : +hm[2],
        newStart: +hm[3],
        newLines: hm[4] === void 0 ? 1 : +hm[4],
        lines: []
      };
      b2.file.hunks.push(h);
      hunk = h;
      oldLeft = h.oldLines;
      newLeft = h.newLines;
      oldNo = h.oldStart;
      newNo = h.newStart;
      b2.raw.push(line);
      continue;
    }
    if (!cur) continue;
    const b = cur;
    b.raw.push(line);
    if (line.startsWith("new file mode")) b.isNew = true;
    else if (line.startsWith("deleted file mode")) b.isDeleted = true;
    else if (line.startsWith("rename from ")) {
      b.isRename = true;
      b.file.oldPath = unquotePath(line.slice(12));
    } else if (line.startsWith("rename to ")) {
      b.isRename = true;
      b.file.path = unquotePath(line.slice(10));
    } else if (line.startsWith("copy from ")) {
      b.isNew = true;
    } else if (line.startsWith("copy to ")) {
      b.file.path = unquotePath(line.slice(8));
    } else if (line.startsWith("Binary files ") || line.startsWith("GIT binary patch")) {
      b.file.binary = true;
      const m = line.match(/^Binary files (.+) and (.+) differ$/);
      if (m) {
        const o = cleanPath(m[1], "a/"), n = cleanPath(m[2], "b/");
        b.oldNull = o === null;
        b.newNull = n === null;
        if (n !== null) b.file.path = n;
        else if (o !== null) b.file.path = o;
      }
    }
  }
  if (cur) files.push(finish(cur));
  return files.filter((f) => (f.path !== "" || f.hunks.length > 0) && isSafePath(f.path) && (f.oldPath === void 0 || isSafePath(f.oldPath)));
}
function isSafePath(p) {
  if (p === "") return true;
  if (p.includes("\0") || /^[/\\]/.test(p) || /^[a-zA-Z]:/.test(p)) return false;
  return !p.split(/[/\\]/).includes("..");
}
function commentableLines(file) {
  const s2 = /* @__PURE__ */ new Set();
  for (const h of file.hunks) for (const l of h.lines) if (l.type !== "del" && l.newLine !== void 0) s2.add(l.newLine);
  return s2;
}
function newLineText(file, line) {
  for (const h of file.hunks) for (const l of h.lines) if (l.type !== "del" && l.newLine === line) return l.text;
  return void 0;
}

// src/shared/glob.ts
var cache = /* @__PURE__ */ new Map();
function globToRegExp(pattern) {
  const hit = cache.get(pattern);
  if (hit) return hit;
  let p = pattern.replace(/\\/g, "/").trim();
  if (p.startsWith("./")) p = p.slice(2);
  if (!p.includes("/")) p = "**/" + p;
  else if (p.startsWith("/")) p = p.slice(1);
  if (p.endsWith("/")) p += "**";
  let re = "";
  let braces = 0;
  for (let i = 0; i < p.length; i++) {
    const c = p[i];
    if (c === "*") {
      if (p[i + 1] === "*") {
        const atStart = i === 0 || p[i - 1] === "/";
        const atEnd = i + 2 === p.length || p[i + 2] === "/";
        if (atStart && atEnd) {
          if (i + 2 === p.length) re += ".*";
          else {
            re += "(?:.*/)?";
            i++;
          }
          i++;
          continue;
        }
        re += "[^/]*";
        i++;
        continue;
      }
      re += "[^/]*";
    } else if (c === "?") re += "[^/]";
    else if (c === "[") {
      const close = p.indexOf("]", i + 1);
      if (close === -1) {
        re += "\\[";
        continue;
      }
      let cls = p.slice(i + 1, close).replace(/\\/g, "\\\\");
      if (cls.startsWith("!")) cls = "^" + cls.slice(1);
      re += `[${cls}]`;
      i = close;
    } else if (c === "{") {
      braces++;
      re += "(?:";
    } else if (c === "}" && braces > 0) {
      braces--;
      re += ")";
    } else if (c === "," && braces > 0) re += "|";
    else re += c.replace(/[.+^$()|\\]/g, "\\$&");
  }
  const out = new RegExp(`^${re}$`);
  cache.set(pattern, out);
  return out;
}
function matchGlob(path13, pattern) {
  return globToRegExp(pattern).test(path13.replace(/\\/g, "/").replace(/^\.\//, ""));
}
function isExcluded(path13, patterns) {
  let excluded = false;
  for (const raw of patterns) {
    const neg = raw.startsWith("!");
    const pat = neg ? raw.slice(1) : raw;
    if (pat && matchGlob(path13, pat)) excluded = !neg;
  }
  return excluded;
}

// src/shared/log.ts
var order = { debug: 0, info: 1, warn: 2, error: 3 };
function stderrLogger(min = "info") {
  return (level, message) => {
    if (order[level] < order[min]) return;
    const tag = level === "info" ? "" : `${level}: `;
    process.stderr.write(`codewolf: ${tag}${redact(message)}
`);
  };
}
function errorMessage(err) {
  if (err instanceof Error) return err.message;
  return String(err);
}

// src/providers/adapters.ts
function nonEmpty(text, provider) {
  if (!text.trim()) throw new ProviderError(`${provider} returned an empty response`, "client");
  return text;
}
var anthropic = async (p, key, req) => {
  const headers = { "anthropic-version": "2023-06-01" };
  if (key) headers["x-api-key"] = key;
  const res = await postJson(`${p.baseUrl}/v1/messages`, headers, {
    model: p.model,
    max_tokens: req.maxTokens,
    system: req.system,
    messages: [{ role: "user", content: req.prompt }]
  }, { timeoutMs: p.timeoutMs, signal: req.signal });
  const text = (res.content ?? []).filter((c) => c.type === "text").map((c) => c.text ?? "").join("");
  return nonEmpty(text, "anthropic");
};
var openai = async (p, key, req) => {
  const headers = {};
  if (key) headers.authorization = `Bearer ${key}`;
  const official = /\/\/api\.openai\.com\b/.test(p.baseUrl);
  const body = {
    model: p.model,
    messages: [{ role: "system", content: req.system }, { role: "user", content: req.prompt }]
  };
  body[official ? "max_completion_tokens" : "max_tokens"] = req.maxTokens;
  const res = await postJson(`${p.baseUrl}/chat/completions`, headers, body, { timeoutMs: p.timeoutMs, signal: req.signal });
  const content = res.choices?.[0]?.message?.content;
  const text = typeof content === "string" ? content : Array.isArray(content) ? content.map((c) => c.text ?? "").join("") : "";
  return nonEmpty(text, "openai");
};
var gemini = async (p, key, req) => {
  const headers = {};
  if (key) headers["x-goog-api-key"] = key;
  const generationConfig = { temperature: 0.2, maxOutputTokens: req.maxTokens };
  if (req.json) generationConfig.responseMimeType = "application/json";
  const res = await postJson(`${p.baseUrl}/v1beta/models/${encodeURIComponent(p.model)}:generateContent`, headers, {
    systemInstruction: { parts: [{ text: req.system }] },
    contents: [{ role: "user", parts: [{ text: req.prompt }] }],
    generationConfig
  }, { timeoutMs: p.timeoutMs, signal: req.signal });
  if (res.promptFeedback?.blockReason) throw new ProviderError(`gemini blocked the prompt: ${res.promptFeedback.blockReason}`, "client");
  const text = (res.candidates?.[0]?.content?.parts ?? []).map((x) => x.text ?? "").join("");
  return nonEmpty(text, "gemini");
};
var OLLAMA_MIN_CTX = 8192;
var OLLAMA_MAX_CTX = 65536;
var ollama = async (p, key, req) => {
  const headers = {};
  if (key) headers.authorization = `Bearer ${key}`;
  const need = Math.ceil((req.system.length + req.prompt.length) / 3) + req.maxTokens;
  const numCtx = Math.min(OLLAMA_MAX_CTX, Math.max(OLLAMA_MIN_CTX, 2 ** Math.ceil(Math.log2(need))));
  const body = {
    model: p.model,
    stream: false,
    // thinking models (gemma4, qwen3, deepseek-r1) otherwise spend the whole token budget reasoning and return no content
    think: false,
    messages: [{ role: "system", content: req.system }, { role: "user", content: req.prompt }],
    options: { temperature: 0.1, num_ctx: numCtx, num_predict: req.maxTokens }
  };
  if (req.json) body.format = "json";
  const call = () => postJson(`${p.baseUrl}/api/chat`, headers, body, { timeoutMs: p.timeoutMs, signal: req.signal });
  let res;
  try {
    res = await call();
  } catch (e) {
    if (e instanceof ProviderError && e.status === 400 && /think/i.test(e.message)) {
      delete body.think;
      res = await call();
    } else if (e instanceof ProviderError && e.status === 404) {
      throw new ProviderError(`${e.message} (is the model pulled? try: ollama pull ${p.model})`, "client", 404);
    } else throw e;
  }
  const content = res.message?.content ?? "";
  if (!content.trim() && res.done_reason === "length") throw new ProviderError(`ollama hit the ${req.maxTokens} token output limit before answering`, "client");
  return nonEmpty(content, "ollama");
};
var claudeCode = async (p, _key, req) => nonEmpty(await runClaudeCode(p, req), "claude-code");
var ADAPTERS = { anthropic, openai, gemini, ollama, "claude-code": claudeCode };

// src/providers/chain.ts
var ChainExhaustedError = class extends Error {
  name = "ChainExhaustedError";
};
var DEFAULT_COOLDOWN_SEC = 60;
var MAX_RETRIES_PER_KEY = 2;
var KeyPool = class {
  keys;
  cursor = 0;
  constructor(keys) {
    this.keys = (keys.length ? keys : [null]).map((key) => ({ key, cooldownUntil: 0, disabled: false, reason: "" }));
  }
  /** Next healthy key in round-robin order, skipping `exclude`. */
  next(now, exclude = () => false) {
    for (let i = 0; i < this.keys.length; i++) {
      const k = this.keys[(this.cursor + i) % this.keys.length];
      if (k.disabled || k.cooldownUntil > now || exclude(k)) continue;
      this.cursor = (this.cursor + i + 1) % this.keys.length;
      return k;
    }
    return void 0;
  }
  describe(now) {
    return this.keys.map((k) => {
      const who = k.key ? `key ${maskKey(k.key)}` : "no key";
      if (k.disabled) return `${who}: disabled (${k.reason})`;
      if (k.cooldownUntil > now) return `${who}: cooling ${Math.ceil((k.cooldownUntil - now) / 1e3)}s (${k.reason})`;
      return `${who}: ${k.reason || "unused"}`;
    }).join("; ");
  }
};
var sleep2 = (ms, signal) => new Promise((resolve, reject) => {
  if (ms <= 0) {
    resolve();
    return;
  }
  const t = setTimeout(resolve, ms);
  signal?.addEventListener("abort", () => {
    clearTimeout(t);
    reject(signal.reason);
  }, { once: true });
});
function createChain(providers, opts = {}) {
  const log = opts.log ?? (() => {
  });
  const now = opts.now ?? Date.now;
  const retryDelay = opts.retryDelayMs ?? 250;
  const pools = providers.map((p) => new KeyPool(p.keys));
  const adapterFor = (p) => opts.adapters?.[p.name] ?? ADAPTERS[p.name];
  async function viaProvider(p, pool, req) {
    const attempts = /* @__PURE__ */ new Map();
    const adapter = adapterFor(p);
    for (; ; ) {
      req.signal?.throwIfAborted();
      const k = pool.next(now(), (s2) => (attempts.get(s2) ?? 0) > MAX_RETRIES_PER_KEY);
      if (!k) throw new ProviderError(pool.describe(now()) || "no usable keys", "client");
      const who = k.key ? maskKey(k.key) : "no key";
      const tries = attempts.get(k) ?? 0;
      if (tries > 0) await sleep2(retryDelay * tries, req.signal);
      try {
        const text = await adapter(p, k.key, { system: req.system, prompt: req.prompt, json: req.json ?? false, maxTokens: req.maxTokens ?? p.maxTokens, signal: req.signal });
        k.reason = "ok";
        return text;
      } catch (e) {
        if (req.signal?.aborted) throw e;
        const err = e instanceof ProviderError ? e : new ProviderError(e instanceof Error ? e.message : String(e), "server");
        k.reason = err.message;
        switch (err.kind) {
          case "rate": {
            const sec = err.retryAfterSec ?? DEFAULT_COOLDOWN_SEC;
            k.cooldownUntil = now() + sec * 1e3;
            k.reason = `rate limited: ${err.message}`;
            log("warn", `${p.name} ${who}: rate limited, cooling ${sec}s`);
            break;
          }
          case "auth":
            k.disabled = true;
            log("warn", `${p.name} ${who}: rejected (${err.message}), disabled for this run`);
            break;
          case "server":
            attempts.set(k, tries + 1);
            log("warn", `${p.name} ${who}: ${err.message}${tries + 1 > MAX_RETRIES_PER_KEY ? "" : ", retrying"}`);
            break;
          case "timeout":
            attempts.set(k, MAX_RETRIES_PER_KEY + 1);
            log("warn", `${p.name} ${who}: ${err.message}`);
            break;
          default:
            throw err;
        }
      }
    }
  }
  return {
    providers,
    async complete(req) {
      if (!providers.length) throw new ChainExhaustedError("no providers configured");
      const reasons = [];
      for (let i = 0; i < providers.length; i++) {
        const p = providers[i];
        try {
          const text = await viaProvider(p, pools[i], req);
          return { text, provider: { name: p.name, model: p.model } };
        } catch (e) {
          if (req.signal?.aborted) throw e;
          const why = redact(e instanceof Error ? e.message : String(e));
          reasons.push(`${p.name}${p.model ? ` (${p.model})` : ""}: ${why}`);
          if (i + 1 < providers.length) log("warn", `${p.name} unavailable, falling back to ${providers[i + 1].name}`);
        }
      }
      throw new ChainExhaustedError(`all providers failed. ${reasons.join(" | ")}`);
    }
  };
}

// src/core/json.ts
function sanitizeJson(src) {
  let out = "";
  let inStr = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (inStr) {
      if (c === "\\") {
        out += c + (src[i + 1] ?? "");
        i++;
        continue;
      }
      if (c === '"') {
        inStr = false;
        out += c;
        continue;
      }
      if (c === "\n") {
        out += "\\n";
        continue;
      }
      if (c === "\r") continue;
      if (c === "	") {
        out += "\\t";
        continue;
      }
      out += c;
      continue;
    }
    if (c === '"') {
      inStr = true;
      out += c;
      continue;
    }
    if (c === "/" && src[i + 1] === "/") {
      while (i < src.length && src[i] !== "\n") i++;
      out += "\n";
      continue;
    }
    if (c === "/" && src[i + 1] === "*") {
      const end = src.indexOf("*/", i + 2);
      i = end === -1 ? src.length : end + 1;
      continue;
    }
    if (c === ",") {
      let j = i + 1;
      while (j < src.length && /\s/.test(src[j])) j++;
      if (src[j] === "}" || src[j] === "]") continue;
    }
    const word = src.slice(i).match(/^(True|False|None|undefined)\b/);
    if (word && !/[\w$]/.test(src[i - 1] ?? "")) {
      out += word[1] === "True" ? "true" : word[1] === "False" ? "false" : "null";
      i += word[1].length - 1;
      continue;
    }
    out += c;
  }
  return out;
}
function matchBracket(s2, start) {
  const stack = [];
  let inStr = false;
  for (let i = start; i < s2.length; i++) {
    const c = s2[i];
    if (inStr) {
      if (c === "\\") i++;
      else if (c === '"') inStr = false;
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === "{" || c === "[") stack.push(c === "{" ? "}" : "]");
    else if (c === "}" || c === "]") {
      if (stack.pop() !== c) return -1;
      if (!stack.length) return i;
    }
  }
  return -1;
}
function closeTruncated(s2) {
  const stack = [];
  let inStr = false;
  let lastSafe = 0;
  for (let i = 0; i < s2.length; i++) {
    const c = s2[i];
    if (inStr) {
      if (c === "\\") i++;
      else if (c === '"') {
        inStr = false;
        lastSafe = i + 1;
      }
      continue;
    }
    if (c === '"') inStr = true;
    else if (c === "{" || c === "[") stack.push(c === "{" ? "}" : "]");
    else if (c === "}" || c === "]") {
      stack.pop();
      lastSafe = i + 1;
    } else if (/[\d\w]/.test(c)) lastSafe = i + 1;
  }
  let body = inStr ? s2 + '"' : s2.slice(0, Math.max(lastSafe, 1));
  body = body.replace(/,\s*$/, "").replace(/,\s*"[^"]*"\s*:?\s*$/, "").replace(/\{\s*"[^"]*"\s*:?\s*$/, "{").replace(/:\s*$/, ": null");
  const open = [];
  let str3 = false;
  for (let i = 0; i < body.length; i++) {
    const c = body[i];
    if (str3) {
      if (c === "\\") i++;
      else if (c === '"') str3 = false;
      continue;
    }
    if (c === '"') str3 = true;
    else if (c === "{" || c === "[") open.push(c === "{" ? "}" : "]");
    else if (c === "}" || c === "]") open.pop();
  }
  return body + open.reverse().join("");
}
var MAX_STARTS = 40;
function tryParse(s2) {
  try {
    return JSON.parse(s2);
  } catch {
    return void 0;
  }
}
function candidates(text) {
  const out = [];
  const fence2 = /```[a-zA-Z0-9_-]*\s*\n?([\s\S]*?)```/g;
  for (const m of text.matchAll(fence2)) if (/[{[]/.test(m[1])) out.push(m[1].trim());
  const unterminated = text.match(/```[a-zA-Z0-9_-]*\s*\n([\s\S]*)$/);
  if (unterminated && !unterminated[1].includes("```")) out.push(unterminated[1].trim());
  out.push(text);
  return out;
}
function extractJson(raw) {
  const text = raw.replace(/^\uFEFF/, "").replace(/<think>[\s\S]*?<\/think>/gi, "").replace(/[“”]/g, '"').trim();
  for (const cand of candidates(text)) {
    const direct = tryParse(cand);
    if (direct !== void 0 && typeof direct === "object" && direct !== null) return direct;
    const clean = sanitizeJson(sanitizeJson(cand));
    let tries = 0;
    for (let start = clean.search(/[{[]/); start !== -1 && tries < MAX_STARTS; start = nextStart(clean, start), tries++) {
      const end = matchBracket(clean, start);
      const slice = end === -1 ? clean.slice(start) : clean.slice(start, end + 1);
      const v = tryParse(slice) ?? (end === -1 ? tryParse(closeTruncated(slice)) : void 0);
      if (v !== void 0 && typeof v === "object" && v !== null) return v;
    }
  }
  return void 0;
}
function nextStart(s2, from) {
  const i = s2.slice(from + 1).search(/[{[]/);
  return i === -1 ? -1 : from + 1 + i;
}

// src/core/linters.ts
import { spawn as spawn3 } from "node:child_process";
import { existsSync as existsSync6, mkdtempSync, readFileSync as readFileSync9, rmSync as rmSync2 } from "node:fs";
import { tmpdir } from "node:os";
import path10 from "node:path";

// src/core/fingerprint.ts
import { createHash } from "node:crypto";
var norm = (s2) => s2.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
function fingerprint(file, title, lineText) {
  const text = lineText.replace(/\s+/g, " ").trim();
  return createHash("sha256").update(`${file}
${norm(title)}
${text}`).digest("hex").slice(0, 16);
}

// src/core/linters.ts
var TOOL_TIMEOUT_MS = 12e4;
var MAX_FILES = 200;
function parseRuff(stdout) {
  const arr = JSON.parse(stdout || "[]");
  return arr.filter((r) => r.location?.row).map((r) => {
    const code = r.code ?? "ruff";
    const security = /^S\d/.test(code);
    return { file: r.filename, line: r.location.row, code, message: r.message, severity: security ? "major" : "minor", category: security ? "security" : /^(E|W|I|N|D|Q|COM)\d*/.test(code) ? "style" : "bug" };
  });
}
function parseEslint(stdout) {
  const arr = JSON.parse(stdout || "[]");
  return arr.flatMap((f) => f.messages.filter((m) => m.line && m.ruleId).map((m) => ({
    file: f.filePath,
    line: m.line,
    code: m.ruleId,
    message: m.message,
    severity: m.severity === 2 ? "minor" : "nit",
    category: /security|no-eval|no-implied-eval/i.test(m.ruleId) ? "security" : "bug"
  })));
}
function parseSemgrep(stdout) {
  const data = JSON.parse(stdout || "{}");
  return (data.results ?? []).map((r) => {
    const sev = (r.extra?.severity ?? "").toUpperCase();
    return {
      file: r.path,
      line: r.start.line,
      code: r.check_id,
      message: r.extra?.message ?? r.check_id,
      severity: sev === "ERROR" ? "major" : sev === "WARNING" ? "minor" : "nit",
      category: /secur|inject|xss|sqli|crypto|secret/i.test(r.check_id) ? "security" : "bug"
    };
  });
}
function parseGitleaks(stdout) {
  const arr = JSON.parse(stdout || "[]");
  return arr.map((r) => ({ file: r.File, line: r.StartLine, code: r.RuleID, message: r.Description || `secret matched rule ${r.RuleID}`, severity: "critical", category: "security" }));
}
function toolFindings(tool, hits, files, root) {
  const byPath = new Map(files.map((f) => [f.path, f]));
  const out = [];
  for (const h of hits) {
    const rel = (path10.isAbsolute(h.file) ? path10.relative(root, h.file) : h.file).replace(/\\/g, "/").replace(/^\.\//, "");
    const f = byPath.get(rel);
    if (!f) continue;
    const added = f.hunks.some((hk) => hk.lines.some((l) => l.type === "add" && l.newLine === h.line));
    if (!added) continue;
    const title = `${h.code}: ${h.message}`.replace(/\s+/g, " ").slice(0, 160);
    out.push({
      file: f.path,
      line: h.line,
      severity: h.severity,
      category: h.category,
      title,
      body: `${tool} reports ${h.code} on this changed line: ${h.message}`,
      source: `tool:${tool}`,
      effort: "quick",
      fingerprint: fingerprint(f.path, title, newLineText(f, h.line) ?? "")
    });
  }
  return out;
}
function exec(cmd, args, cwd) {
  return new Promise((resolve) => {
    let spec;
    try {
      spec = resolveSpawn(cmd, args);
    } catch {
      resolve({ code: null, stdout: "" });
      return;
    }
    const child = spawn3(spec.file, spec.args, { cwd, windowsHide: true, windowsVerbatimArguments: spec.verbatim, stdio: ["ignore", "pipe", "ignore"] });
    let stdout = "";
    const t = setTimeout(() => child.kill(), TOOL_TIMEOUT_MS);
    child.stdout.setEncoding("utf8").on("data", (d) => stdout += d);
    child.on("error", () => {
      clearTimeout(t);
      resolve({ code: null, stdout: "" });
    });
    child.on("close", (code) => {
      clearTimeout(t);
      resolve({ code, stdout });
    });
  });
}
var PY = /\.pyi?$/i;
var JS = /\.(m|c)?(j|t)sx?$/i;
async function runLinters(files, config, log = () => {
}) {
  const root = config.root;
  const present = files.filter((f) => f.status !== "deleted" && !f.binary && existsSync6(path10.join(root, f.path))).slice(0, MAX_FILES);
  if (!present.length) return [];
  const rel = (re) => present.filter((f) => re.test(f.path)).map((f) => `./${f.path}`);
  const jobs = [];
  const job = (tool, run) => {
    if (!config.tools[tool] || !whichSync(tool)) return;
    jobs.push(run().then((hits) => toolFindings(tool, hits, present, root)).catch((e) => {
      log(`${tool} output ignored: ${e.message}`);
      return [];
    }));
  };
  const py = rel(PY), js = rel(JS);
  if (py.length) job("ruff", async () => parseRuff((await exec("ruff", ["check", "--output-format=json", "--exit-zero", "--no-cache", ...py], root)).stdout));
  if (js.length) job("eslint", async () => {
    const r = await exec("eslint", ["--format", "json", "--no-error-on-unmatched-pattern", ...js], root);
    return r.stdout.trim().startsWith("[") ? parseEslint(r.stdout) : [];
  });
  const semgrepCfg = [".semgrep.yml", ".semgrep.yaml", ".semgrep"].find((c) => existsSync6(path10.join(root, c)));
  if (semgrepCfg) job("semgrep", async () => parseSemgrep((await exec("semgrep", ["scan", "--json", "--quiet", "--metrics=off", "--config", semgrepCfg, ...present.map((f) => `./${f.path}`)], root)).stdout));
  job("gitleaks", async () => {
    const dir = mkdtempSync(path10.join(tmpdir(), "cw-gitleaks-"));
    try {
      const hits = [];
      for (const f of present) {
        const report = path10.join(dir, "r.json");
        await exec("gitleaks", ["detect", "--no-git", "--no-banner", "--exit-code", "0", "--report-format", "json", "--report-path", report, "--source", `./${f.path}`], root);
        if (existsSync6(report)) hits.push(...parseGitleaks(readFileSync9(report, "utf8")).map((h) => ({ ...h, file: f.path })));
        rmSync2(report, { force: true });
      }
      return hits;
    } finally {
      rmSync2(dir, { recursive: true, force: true });
    }
  });
  return (await Promise.all(jobs)).flat();
}

// src/core/normalize.ts
var SEVERITY_ALIASES = {
  blocker: "critical",
  critical: "critical",
  severe: "critical",
  high: "major",
  major: "major",
  error: "major",
  important: "major",
  medium: "minor",
  moderate: "minor",
  minor: "minor",
  warning: "minor",
  warn: "minor",
  low: "minor",
  nit: "nit",
  nitpick: "nit",
  trivial: "nit",
  info: "nit",
  informational: "nit",
  suggestion: "nit",
  style: "nit"
};
var CATEGORY_ALIASES = {
  bug: "bug",
  bugs: "bug",
  correctness: "bug",
  logic: "bug",
  error: "bug",
  "error-handling": "bug",
  reliability: "bug",
  concurrency: "bug",
  security: "security",
  vulnerability: "security",
  sec: "security",
  secrets: "security",
  injection: "security",
  performance: "performance",
  perf: "performance",
  efficiency: "performance",
  maintainability: "maintainability",
  readability: "maintainability",
  design: "maintainability",
  documentation: "maintainability",
  docs: "maintainability",
  complexity: "maintainability",
  "best-practice": "maintainability",
  style: "style",
  formatting: "style",
  naming: "style",
  nit: "style",
  test: "test",
  tests: "test",
  testing: "test",
  coverage: "test"
};
function s(v) {
  if (typeof v === "string") return v.trim();
  if (typeof v === "number") return String(v);
  return "";
}
function toSeverity(v) {
  const k = s(v).toLowerCase();
  return SEVERITY_ALIASES[k] ?? (SEVERITIES.includes(k) ? k : "minor");
}
function toCategory(v) {
  const k = s(v).toLowerCase().replace(/[\s_]+/g, "-");
  return CATEGORY_ALIASES[k] ?? (CATEGORIES.includes(k) ? k : "maintainability");
}
function parseLine(v) {
  if (typeof v === "number" && Number.isInteger(v) && v > 0) return [v, void 0];
  const m = s(v).match(/^L?(\d+)(?:\s*(?:-|:|to|–)\s*L?(\d+))?$/i);
  if (!m) return void 0;
  const a = +m[1], b = m[2] ? +m[2] : void 0;
  return a > 0 ? [a, b && b > a ? b : void 0] : void 0;
}
function normPath(p) {
  return p.replace(/\\/g, "/").replace(/^\.?\//, "").replace(/^[ab]\//, "");
}
function matchFile(name, files) {
  const n = normPath(name);
  if (!n) return void 0;
  const exact = files.find((f) => f.path === n) ?? files.find((f) => f.path === name);
  if (exact) return exact;
  const suffix = files.filter((f) => f.path.endsWith("/" + n));
  return suffix.length === 1 ? suffix[0] : void 0;
}
function stripFences(code) {
  const m = code.match(/^\s*```[\w+-]*\s*\n([\s\S]*?)\n?```\s*$/);
  return (m ? m[1] : code).replace(/\r\n/g, "\n").replace(/\n$/, "");
}
function reindent(suggestion, original) {
  const indent = original.match(/^[ \t]*/)[0];
  const lines = suggestion.split("\n");
  const first = lines.find((l) => l.trim());
  if (!indent || !first || /^[ \t]/.test(first)) return suggestion;
  return lines.map((l) => l.trim() ? indent + l : l).join("\n");
}
function normalizeModelOutput(raw, files) {
  const o = Array.isArray(raw) ? { findings: raw } : raw && typeof raw === "object" ? raw : {};
  const out = { summary: s(o.summary ?? o.overview), walkthrough: [], findings: [], outside: [], dropped: 0 };
  const wt = Array.isArray(o.walkthrough) ? o.walkthrough : [];
  for (const w of wt) {
    if (!w || typeof w !== "object") continue;
    const e = w;
    const f = matchFile(s(e.file ?? e.path), files);
    const change = s(e.change ?? e.summary ?? e.description);
    if (f && change) out.walkthrough.push({ file: f.path, change });
  }
  const list = Array.isArray(o.findings) ? o.findings : Array.isArray(o.comments) ? o.comments : Array.isArray(o.issues) ? o.issues : [];
  for (const item of list) {
    if (!item || typeof item !== "object") {
      out.dropped++;
      continue;
    }
    const e = item;
    const file = matchFile(s(e.file ?? e.path ?? e.filename), files);
    const parsed = parseLine(e.line ?? e.startLine ?? e.start_line ?? e.line_number);
    if (!file || !parsed) {
      out.dropped++;
      continue;
    }
    const ok = commentableLines(file);
    const line = parsed[0];
    const inDiff = ok.has(line);
    let endLine = parseLine(e.endLine ?? e.end_line)?.[0] ?? parsed[1];
    if (endLine !== void 0) {
      let valid = endLine > line;
      for (let n = line; inDiff && valid && n <= endLine; n++) if (!ok.has(n)) valid = false;
      if (!valid) endLine = void 0;
    }
    const body = s(e.body ?? e.description ?? e.message ?? e.comment ?? e.explanation);
    const title = (s(e.title ?? e.summary) || body.split(/(?<=[.!?])\s/)[0] || "").slice(0, 200);
    if (!title) {
      out.dropped++;
      continue;
    }
    const finding = {
      file: file.path,
      line,
      severity: toSeverity(e.severity ?? e.priority ?? e.level),
      category: toCategory(e.category ?? e.type ?? e.kind),
      title,
      body: body || title,
      source: "llm",
      fingerprint: fingerprint(file.path, title, newLineText(file, line) ?? "")
    };
    if (endLine !== void 0) finding.endLine = endLine;
    const sug = typeof e.suggestion === "string" ? reindent(stripFences(e.suggestion), newLineText(file, line) ?? "") : "";
    if (sug.trim()) {
      const span = endLine ?? line;
      const current = [];
      for (let n = line; n <= span; n++) current.push(newLineText(file, n) ?? "");
      const multi = sug.includes("\n");
      const askedEnd = e.endLine ?? e.end_line ?? parsed[1];
      const rangeOk = !multi || endLine !== void 0 || askedEnd === void 0;
      if (rangeOk && sug !== current.join("\n")) finding.suggestion = sug;
    }
    const rw = e.rewrite;
    if (rw && typeof rw === "object" && s(rw.reason) && s(rw.code) && s(rw.language)) {
      finding.rewrite = { language: s(rw.language), reason: s(rw.reason), code: stripFences(String(rw.code)) };
    }
    const effort = s(e.effort).toLowerCase();
    if (effort === "quick" || effort === "heavy") finding.effort = effort;
    if (s(e.kind).toLowerCase() === "refactor") finding.kind = "refactor";
    const cwe = s(e.cwe).toUpperCase();
    if (finding.category === "security" && /^CWE-\d{1,5}$/.test(cwe)) finding.cwe = cwe;
    (inDiff ? out.findings : out.outside).push(finding);
  }
  const diagram = typeof o.diagram === "string" ? stripFences(o.diagram).trim() : "";
  if (/^sequenceDiagram\b/.test(diagram)) out.diagram = diagram;
  return out;
}

// src/core/prompt.ts
var PROFILE_RULES = {
  quiet: "Profile QUIET: report only critical findings (exploitable vulnerabilities, data loss, crashes on common paths, exposed secrets). Say nothing about anything less severe.",
  chill: "Profile CHILL: report critical and major findings. Add a minor finding only when it is clearly worth the author's time, at most a few per review. No nits, no style comments.",
  assertive: "Profile ASSERTIVE: report every concrete, actionable problem you are confident about, including minor issues and nits. Still no vague advice and no praise."
};
function systemPrompt(profile, language) {
  return `You are CodeWolf, a senior staff engineer reviewing a pull request. You read a diff the way an attacker, an on-call engineer and the next maintainer would, and you only speak up when it matters.

How the diff is shown: each file starts with "=== path (status) ===", then hunks. Every line carries its new-file line number and a marker:
  "  42 + code"   added line 42
  "  43   code"   unchanged context line 43
  "     - code"   removed line (it has no new-file number, so it cannot be commented on)

Review lenses, highest priority first:
1. Bugs: wrong conditions, off-by-one, null or undefined access, unhandled errors and promise rejections, races, leaked resources (files, sockets, locks), broken edge cases (empty, zero, negative, unicode, huge input), API misuse, wrong types or units, branches that hide a mistake.
2. Security: injection of any kind (SQL, shell or command, template, header, LDAP, XPath, NoSQL), missing or broken authorization and authentication (no ownership check, IDOR, trusting client-supplied ids or roles), hardcoded secrets and tokens, unsafe deserialization (pickle, yaml.load, eval, new Function, unserialize, Java/.NET object streams), SSRF (server fetches a URL the user controls), path traversal (user input joined into file paths), XSS, weak crypto or non-cryptographic randomness used for security, secrets or personal data written to logs.
3. Performance: work that scales badly (N+1 queries, quadratic loops on large inputs, repeated parsing, allocation or regex compilation inside hot loops, blocking I/O on async paths, unbounded queries without limits or pagination). When code is plainly CPU-bound and hot (tight numeric loops, parsing at scale, image, compression or crypto work) and moving it to a faster language or library would remove a real bottleneck, you may add a "rewrite" with the target language, the code, and a "reason" that says why this code is hot. Never propose a rewrite without that reason.
4. Maintainability: misleading names, duplicated logic that will drift apart, functions doing unrelated things, magic values with business meaning, errors rethrown without context.
5. Tests: new behavior or a bug fix with no test, tests that cannot fail, assertions on the wrong value.

Rules:
- Comment on what this diff changes. Cite a context line only when an added line makes it wrong.
- "line" is the new-file number printed at the start of the line you mean. For a problem spanning lines, "line" is the first and "endLine" the last, both inside the same hunk. Never invent line numbers.
- Be specific: name the variable, call or input that causes the problem and the concrete consequence. No generic advice, no praise, no restating what the code does, no questions to the author, no guesses about code you cannot see.
- One finding per distinct problem. If the same mistake repeats, report the first occurrence and list the other lines in the body.
- "suggestion" is optional. When present it is the exact replacement text for lines line..endLine (or just line): complete lines with their original indentation, no diff markers, no code fences, nothing else changed. Leave it out when the fix needs code outside the diff or is not mechanical.
- severity: critical = exploitable vulnerability, data loss or corruption, crash on a common path, exposed secret. major = real bug or security weakness that will bite under realistic use. minor = edge-case bug, notable inefficiency, or a maintainability problem likely to cause a bug. nit = polish with no behavior impact.
- category: exactly one of bug, security, performance, maintainability, style, test.
- effort: "quick" when the fix is small and local, "heavy" when it needs a design change or touches many places.
- kind: add "kind": "refactor" when the finding is a structural improvement rather than a defect; otherwise leave it out.
- cwe: on a security finding, add the matching CWE id (for example "CWE-89") when you are sure of it; otherwise leave it out.
- If nothing is wrong, return an empty findings list. An empty list is the right answer for good code.

${PROFILE_RULES[profile]}

Reply with one JSON object and nothing else (no markdown fences, no prose):
{"summary": "...", "walkthrough": [{"file": "...", "change": "..."}], "findings": [{"file": "...", "line": 12, "endLine": 14, "severity": "major", "category": "bug", "title": "...", "body": "...", "suggestion": "...", "effort": "quick", "kind": "refactor", "cwe": "CWE-89", "rewrite": {"language": "...", "reason": "...", "code": "..."}}], "diagram": "..."}
- summary: one to three sentences on what the change does and its main risk, for someone who has not read it.
- walkthrough: one entry per file with one sentence on what changed in it.
- title: under 80 characters, names the problem (for example "SQL query built from user input"), not the fix.
- body: why it is wrong and what to do, one to four sentences.
- Leave out optional keys you do not use. Include "diagram" only when the change adds or alters a real call flow between several components: a mermaid sequenceDiagram. Otherwise leave it out.
Write summary, walkthrough, titles and bodies in language "${language}". Keep code, identifiers and JSON keys as they are.`;
}
var MAX_LINE_CHARS = 1500;
function pad(n, width) {
  return (n === void 0 ? "" : String(n)).padStart(width, " ");
}
function renderHunk(h, header = true) {
  const width = Math.max(4, String(h.newStart + h.newLines).length);
  const out = [];
  if (header) out.push(`@@ -${h.oldStart},${h.oldLines} +${h.newStart},${h.newLines} @@`);
  for (const l of h.lines) {
    const mark = l.type === "add" ? "+" : l.type === "del" ? "-" : " ";
    const text = l.text.length > MAX_LINE_CHARS ? `${l.text.slice(0, MAX_LINE_CHARS)} [... ${l.text.length - MAX_LINE_CHARS} more chars]` : l.text;
    out.push(`${pad(l.type === "del" ? void 0 : l.newLine, width)} ${mark} ${text}`);
  }
  return out.join("\n");
}
function fileHeader(f, part) {
  const status = f.status === "renamed" && f.oldPath ? `renamed from ${f.oldPath}` : f.status;
  return `=== ${f.path} (${status})${part ? ` ${part}` : ""} ===`;
}
function instructionsFor(paths, rules) {
  const out = [];
  for (const r of rules) {
    const hits = paths.filter((p) => matchGlob(p, r.path));
    if (hits.length) out.push(`- ${r.path} (applies to ${hits.join(", ")}): ${r.instructions}`);
  }
  return out;
}
function userPrompt(body, paths, ctx) {
  const parts = ["Review the following change."];
  if (ctx.guidelines.trim()) {
    parts.push(`Project guidelines from the repository (apply them where they are relevant to code review):
<guidelines>
${ctx.guidelines.trim()}
</guidelines>`);
  }
  if (ctx.learnings.length) {
    parts.push(`Reviewer preferences this team taught you (follow them; they override your defaults):
${ctx.learnings.map((l) => `- ${l}`).join("\n")}`);
  }
  const ins = instructionsFor(paths, ctx.pathInstructions);
  if (ins.length) parts.push(`Extra instructions for specific paths:
${ins.join("\n")}`);
  if (ctx.part && ctx.part.total > 1) {
    parts.push(`This is part ${ctx.part.index} of ${ctx.part.total} of a larger change. Review only the files shown here; the walkthrough covers only these files.`);
  }
  parts.push(`<diff>
${body}
</diff>`);
  return parts.join("\n\n");
}
function repairPrompt(badOutput) {
  return {
    system: "You convert malformed model output into valid JSON. Output one JSON object only, no fences, no prose.",
    prompt: `The text below was supposed to be a JSON object with keys "summary" (string), "walkthrough" (array of {"file","change"}) and "findings" (array of {"file","line","endLine"?,"severity","category","title","body","suggestion"?,"effort"?,"kind"?,"cwe"?,"rewrite"?}). Rewrite it as valid JSON with exactly that shape, keeping the content. If a part cannot be recovered, drop it.

<text>
${badOutput.slice(0, 6e4)}
</text>`
  };
}
function mergeSummaryPrompt(summaries, language) {
  return {
    system: 'You write short pull request summaries. Output one JSON object only: {"summary": "..."}.',
    prompt: `These are summaries of different parts of one pull request. Merge them into one summary of two to four sentences in language "${language}" that says what the change does overall and its main risk.

${summaries.map((s2, i) => `Part ${i + 1}: ${s2}`).join("\n")}`
  };
}

// src/core/secrets.ts
var RULES = [
  { kind: "AWS access key id", re: /\b((?:AKIA|ASIA|ABIA|ACCA)[0-9A-Z]{16})\b/ },
  { kind: "private key block", re: /(-----BEGIN [A-Z0-9 ]*PRIVATE KEY(?: BLOCK)?-----)/ },
  { kind: "GitHub token", re: /\b(gh[pousr]_[A-Za-z0-9]{36,255})\b/ },
  { kind: "GitHub fine-grained token", re: /\b(github_pat_[A-Za-z0-9_]{60,255})\b/ },
  { kind: "Slack token", re: /\b(xox[abposr]-[A-Za-z0-9-]{10,})/ },
  { kind: "Slack webhook URL", re: /(https:\/\/hooks\.slack\.com\/services\/[A-Za-z0-9/_-]{20,})/ },
  { kind: "Anthropic API key", re: /\b(sk-ant-[A-Za-z0-9_-]{20,})/ },
  { kind: "OpenAI API key", re: /\b(sk-(?!ant-)(?:proj-|svcacct-|admin-)?[A-Za-z0-9_-]{32,})/ },
  { kind: "Google API key", re: /\b(AIza[0-9A-Za-z_-]{35})/ },
  { kind: "Stripe live secret key", re: /\b((?:sk|rk)_live_[0-9a-zA-Z]{20,})/ },
  {
    kind: "credential",
    generic: true,
    re: /(?:api[_-]?key|apikey|secret[_-]?key|client[_-]?secret|secret|auth[_-]?token|access[_-]?token|token|passwd|password|access[_-]?key)["']?\s*(?::=|=>|[:=])\s*["'`]([^"'`\s]{16,})["'`]/i
  }
];
var PLACEHOLDER = /^(?:x{3,}|\*{3,}|<[^>]*>|\$\{|\{\{|your[_-]|change[_-]?me|example|dummy|sample|fake|placeholder|redacted|test|todo)|xxxx|process\.env|os\.environ|getenv/i;
var MIN_ENTROPY = 3.5;
function entropy(s2) {
  const freq = /* @__PURE__ */ new Map();
  for (const c of s2) freq.set(c, (freq.get(c) ?? 0) + 1);
  let h = 0;
  for (const n of freq.values()) {
    const p = n / s2.length;
    h -= p * Math.log2(p);
  }
  return h;
}
function detectSecret(line) {
  for (const r of RULES) {
    const m = line.match(r.re);
    if (!m) continue;
    const value = m[1];
    if (r.generic && (PLACEHOLDER.test(value) || entropy(value) < MIN_ENTROPY)) continue;
    return { kind: r.kind, value };
  }
  return void 0;
}
function scanSecrets(files) {
  const out = [];
  for (const f of files) {
    if (f.binary) continue;
    for (const h of f.hunks) {
      for (const l of h.lines) {
        if (l.type !== "add" || l.newLine === void 0) continue;
        const hit = detectSecret(l.text);
        if (!hit) continue;
        const title = `Hardcoded ${hit.kind}`;
        out.push({
          file: f.path,
          line: l.newLine,
          severity: "critical",
          category: "security",
          title,
          body: `This line adds what looks like a ${hit.kind} (${hit.kind === "private key block" ? "PEM header" : maskKey(hit.value)}). Anyone who can read the repository or its history can use it. Remove it, rotate the credential now (it stays in git history), and load it from an environment variable or a secret manager.`,
          source: "builtin",
          effort: "quick",
          fingerprint: fingerprint(f.path, title, l.text)
        });
      }
    }
  }
  return out;
}

// src/core/engine.ts
var CHARS_PER_TOKEN = 4;
var CHILL_MINOR_CAP = 3;
var rank = (s2) => SEVERITIES.indexOf(s2);
function reviewableFiles(files, exclude) {
  const keep = [], skipped = [];
  for (const f of files) {
    const ok = !f.binary && f.status !== "deleted" && f.hunks.length > 0 && f.path !== "" && isSafePath(f.path) && !isExcluded(f.path, exclude) && f.hunks.some((h) => h.lines.some((l) => l.type === "add"));
    (ok ? keep : skipped).push(f);
  }
  return { keep, skipped };
}
function splitHunk(h, maxChars) {
  const out = [];
  let cur = null, size = 0;
  for (const l of h.lines) {
    const len = l.text.length + 8;
    if (!cur || size + len > maxChars && cur.lines.length) {
      const first = l.newLine ?? h.newStart;
      cur = { oldStart: l.oldLine ?? h.oldStart, oldLines: 0, newStart: first, newLines: 0, lines: [] };
      out.push(cur);
      size = 0;
    }
    cur.lines.push(l);
    if (l.type !== "add") cur.oldLines++;
    if (l.type !== "del") cur.newLines++;
    size += len;
  }
  return out;
}
function chunkFiles(files, maxTokens) {
  const maxChars = Math.max(2e3, maxTokens * CHARS_PER_TOKEN);
  const pieces = [];
  for (const f of files) {
    const hunks = f.hunks.flatMap((h) => renderHunk(h).length > maxChars ? splitHunk(h, maxChars) : [h]);
    const groups = [];
    let g = [], size2 = 0;
    for (const h of hunks) {
      const len = renderHunk(h).length + 1;
      if (g.length && size2 + len > maxChars) {
        groups.push(g);
        g = [];
        size2 = 0;
      }
      g.push(h);
      size2 += len;
    }
    if (g.length) groups.push(g);
    groups.forEach((hs, i) => {
      const part = groups.length > 1 ? `(part ${i + 1} of ${groups.length})` : void 0;
      pieces.push({ file: { ...f, hunks: hs }, text: `${fileHeader(f, part)}
${hs.map((h) => renderHunk(h)).join("\n")}` });
    });
  }
  const chunks = [];
  let cur = null, size = 0;
  for (const p of pieces) {
    if (!cur || size + p.text.length > maxChars) {
      cur = { files: [], body: "", paths: [] };
      chunks.push(cur);
      size = 0;
    }
    cur.files.push(p.file);
    if (!cur.paths.includes(p.file.path)) cur.paths.push(p.file.path);
    cur.body += (cur.body ? "\n\n" : "") + p.text;
    size += p.text.length + 2;
  }
  return chunks;
}
async function mapLimit(items, limit, fn) {
  const out = new Array(items.length);
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const i = next++;
      out[i] = await fn(items[i], i);
    }
  };
  await Promise.all(Array.from({ length: Math.min(Math.max(1, limit), items.length) }, worker));
  return out;
}
function applyProfile(findings, profile) {
  if (profile === "assertive") return findings;
  if (profile === "quiet") return findings.filter((f) => f.severity === "critical");
  let minors = 0;
  return findings.filter((f) => f.severity === "critical" || f.severity === "major" || f.severity === "minor" && minors++ < CHILL_MINOR_CAP);
}
var SECRET_WORDS = /secret|credential|api.?key|access.?key|token|password|hard-?coded|private key/i;
function dedupe(findings) {
  const byFp = /* @__PURE__ */ new Map();
  for (const f of findings) {
    const prev = byFp.get(f.fingerprint);
    if (!prev || rank(f.severity) < rank(prev.severity)) byFp.set(f.fingerprint, f);
  }
  const all = [...byFp.values()];
  const builtin = new Set(all.filter((f) => f.source === "builtin").map((f) => `${f.file}:${f.line}`));
  return all.filter((f) => f.source === "builtin" || !(f.category === "security" && builtin.has(`${f.file}:${f.line}`) && SECRET_WORDS.test(`${f.title} ${f.body}`)));
}
function agentPrompt(f) {
  const where = `${f.file} line${f.endLine ? `s ${f.line}-${f.endLine}` : ` ${f.line}`}`;
  const parts = [
    "Check this against the current code before you edit; if it is already fixed or the code has moved on, do nothing.",
    `Location: ${where}.`,
    `Problem (${f.severity} ${f.category}): ${f.title}.`
  ];
  if (f.body && f.body !== f.title) parts.push(f.body);
  if (f.suggestion !== void 0) parts.push(`Fix: replace ${f.endLine ? "those lines" : "that line"} with exactly:
${f.suggestion}`);
  else if (f.rewrite) parts.push(`Fix: consider moving this to ${f.rewrite.language} (${f.rewrite.reason}).`);
  else parts.push("Fix: make the smallest change that resolves it and keep all other behavior the same.");
  return parts.join(" ");
}
function estimateEffort(files, findings) {
  let changed = 0;
  for (const f of files) for (const h of f.hunks) for (const l of h.lines) if (l.type !== "ctx") changed++;
  const serious = findings.filter((f) => f.severity === "critical").length * 8 + findings.filter((f) => f.severity === "major").length * 4;
  const minutes = Math.max(1, Math.round(2 + changed / 15 + files.length * 1.5 + serious));
  const score = minutes <= 10 ? 1 : minutes <= 25 ? 2 : minutes <= 50 ? 3 : minutes <= 90 ? 4 : 5;
  return { score, minutes };
}
function defaultChange(f) {
  if (f.status === "added") return "New file.";
  if (f.status === "deleted") return "File deleted.";
  if (f.status === "renamed") return `Renamed from ${f.oldPath ?? "another path"}.`;
  return f.binary ? "Binary file changed." : "Modified.";
}
async function reviewChunk(chunk, idx, total, config, chain, signal, warn) {
  const req = {
    system: systemPrompt(config.profile, config.language),
    prompt: userPrompt(chunk.body, chunk.paths, { learnings: config.learnings, guidelines: config.guidelines, pathInstructions: config.review.pathInstructions, part: { index: idx + 1, total } }),
    json: true,
    ...signal ? { signal } : {}
  };
  const res = await chain.complete(req);
  let parsed = extractJson(res.text);
  if (parsed === void 0) {
    warn(`chunk ${idx + 1}/${total}: model output was not valid JSON, asking for a repair`);
    try {
      const fix = repairPrompt(res.text);
      parsed = extractJson((await chain.complete({ ...fix, json: true, ...signal ? { signal } : {} })).text);
    } catch (e) {
      if (signal?.aborted) throw e;
      warn(`chunk ${idx + 1}/${total}: repair request failed: ${errorMessage(e)}`);
    }
  }
  if (parsed === void 0) {
    warn(`chunk ${idx + 1}/${total} (${chunk.paths.join(", ")}): unparseable model output, no findings from it`);
    return void 0;
  }
  const review2 = normalizeModelOutput(parsed, chunk.files);
  if (review2.dropped) warn(`chunk ${idx + 1}/${total}: dropped ${review2.dropped} finding(s) outside the diff or malformed`);
  return { review: review2, provider: `${res.provider.name}\0${res.provider.model}` };
}
async function review(files, config, opts = {}) {
  const log = opts.log ?? (() => {
  });
  const warnings = [];
  const warn = (m) => {
    const r = redact(m);
    warnings.push(r);
    log("warn", r);
  };
  const chain = opts.chain ?? createChain(config.providers, { log: (lvl, m) => log(lvl, m) });
  const { keep } = reviewableFiles(files, config.review.exclude);
  const first = config.providers[0];
  const providerUsed = /* @__PURE__ */ new Map();
  const chunks = chunkFiles(keep, config.review.maxChunkTokens);
  if (chunks.length > 1) log("info", `reviewing ${keep.length} file(s) in ${chunks.length} chunks`);
  const lintersOn = opts.linters !== false && Object.values(config.tools).some(Boolean);
  const stop = new AbortController();
  const signal = opts.signal ? AbortSignal.any([opts.signal, stop.signal]) : stop.signal;
  const [results, toolHits] = await Promise.all([
    mapLimit(chunks, config.review.concurrency, (c, i) => reviewChunk(c, i, chunks.length, config, chain, signal, warn).catch((e) => {
      stop.abort(e);
      throw e;
    })),
    lintersOn ? runLinters(keep, config, (m) => log("debug", m)).catch(() => []) : Promise.resolve([])
  ]);
  const findings = [...scanSecrets(keep), ...toolHits];
  const outside = [];
  const walk = /* @__PURE__ */ new Map();
  const summaries = [];
  let diagram;
  for (const r of results) {
    if (!r) continue;
    providerUsed.set(r.provider, (providerUsed.get(r.provider) ?? 0) + 1);
    findings.push(...r.review.findings);
    outside.push(...r.review.outside);
    for (const w of r.review.walkthrough) walk.set(w.file, walk.has(w.file) ? `${walk.get(w.file)} ${w.change}` : w.change);
    if (r.review.summary) summaries.push(r.review.summary);
    diagram ??= r.review.diagram;
  }
  let summary = summaries[0] ?? "";
  if (summaries.length > 1) {
    try {
      const m = mergeSummaryPrompt(summaries, config.language);
      const out = extractJson((await chain.complete({ ...m, json: true, ...opts.signal ? { signal: opts.signal } : {} })).text);
      summary = typeof out?.summary === "string" && out.summary.trim() ? out.summary.trim() : summaries.join(" ");
    } catch (e) {
      if (opts.signal?.aborted) throw e;
      summary = summaries.join(" ");
    }
  }
  const top = [...providerUsed.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const [pname, pmodel] = top ? top.split("\0") : [first?.name ?? "none", first?.model ?? ""];
  return buildResult(files, keep, config, { findings, outside, walk, summary, ...diagram ? { diagram } : {}, provider: { name: pname ?? "none", model: pmodel ?? "" }, warnings }, opts.suppressed);
}
function finalize(list, config, suppressed2) {
  return applyProfile(dedupe(suppressed2?.size ? list.filter((f) => !suppressed2.has(f.fingerprint)) : list), config.profile).sort((a, b) => rank(a.severity) - rank(b.severity) || a.file.localeCompare(b.file) || a.line - b.line).map((f) => ({ ...f, kind: f.kind ?? (f.severity === "nit" ? "nitpick" : "issue"), agentPrompt: agentPrompt(f) }));
}
function buildResult(files, keep, config, c, suppressed2) {
  const summary = c.summary || (keep.length ? `Reviewed ${keep.length} file(s).` : "No reviewable changes.");
  const final = finalize(c.findings, config, suppressed2);
  const seen = new Set(final.map((f) => f.fingerprint));
  const outsideDiff = finalize(c.outside, config, suppressed2).filter((f) => !seen.has(f.fingerprint));
  const shown = files.filter((f) => !isExcluded(f.path, config.review.exclude));
  const walkthrough = shown.map((f) => ({ file: f.path, change: c.walk.get(f.path) ?? defaultChange(f) }));
  const result = {
    summary,
    walkthrough,
    findings: final,
    outsideDiff,
    stats: { files: shown.length, findings: final.length, bySeverity: countSeverities(final) },
    provider: c.provider,
    effort: estimateEffort(keep, final)
  };
  if (c.diagram) result.diagram = c.diagram;
  if (c.warnings.length) result.warnings = c.warnings;
  return result;
}
function countSeverities(findings) {
  const bySeverity = { critical: 0, major: 0, minor: 0, nit: 0 };
  for (const f of findings) bySeverity[f.severity] = (bySeverity[f.severity] ?? 0) + 1;
  return bySeverity;
}

// src/cli/state.ts
var rank2 = (s2) => SEVERITIES.indexOf(s2);
function blobIds(root, paths, committed) {
  const out = {};
  if (!paths.length) return out;
  try {
    if (committed) {
      const want = new Set(paths);
      for (const rec of git(["ls-tree", "-r", "-z", "HEAD"], root).split("\0")) {
        const m = rec.match(/^\d+ blob ([0-9a-f]+)\t(.*)$/s);
        if (m && want.has(m[2])) out[m[2]] = m[1];
      }
      return out;
    }
    const r = spawnSync5("git", ["hash-object", "--stdin-paths"], { cwd: root, input: paths.join("\n") + "\n", encoding: "utf8", windowsHide: true });
    const ids = r.status === 0 ? r.stdout.trim().split("\n") : [];
    if (ids.length === paths.length) paths.forEach((p, i) => out[p] = ids[i]);
  } catch {
  }
  return out;
}
function headSha(root) {
  try {
    return git(["rev-parse", "--verify", "--quiet", "HEAD"], root).trim() || null;
  } catch {
    return null;
  }
}
function strip(f) {
  const { id: _id, status: _status, snippet: _snippet, ...rest } = f;
  return rest;
}
function prepareReview(scope, all, config, cwd, opts) {
  const repo = repoRoot(cwd) ?? null;
  const root = scope.kind === "file" ? null : repo;
  const incremental = root !== null && scope.kind !== "staged" && scope.kind !== "file";
  const keep = reviewableFiles(all, config.review.exclude).keep;
  const hashes = incremental ? blobIds(root, keep.map((f) => f.path), scope.kind === "committed") : {};
  const cp = incremental && !opts.fresh ? readCheckpoint(root) : null;
  const skipped = cp ? keep.filter((f) => hashes[f.path] && cp.files[f.path] === hashes[f.path]).map((f) => f.path) : [];
  const skip = new Set(skipped);
  const carried = skipped.length ? readStore(root).findings.filter((f) => f.status === "open" && skip.has(f.file)).map(strip) : [];
  if (skipped.length) {
    opts.log("info", `skipped ${skipped.length} file(s) unchanged since the last review${carried.length ? `, ${carried.length} open finding(s) on them carried over` : ""} (--fresh reviews everything)`);
  }
  const files = all.filter((f) => !skip.has(f.path));
  const tokens = Math.round(reviewableFiles(files, config.review.exclude).keep.reduce((n, f) => n + f.patch.length, 0) / 4);
  const limit = config.review.maxChunkTokens * config.review.concurrency * 4;
  if (tokens > limit) {
    opts.log("warn", `this change is large (about ${tokens} tokens, over ${limit}); reviewing it anyway. Smaller reviews are sharper: try --staged, a path-limited diff (git diff <base> -- <path> | codewolf review --diff -), or splitting the commit`);
  }
  return {
    scope,
    all,
    files,
    skipped,
    root,
    incremental,
    head: root ? headSha(root) : null,
    hashes,
    carried,
    suppressed: repo ? suppressed(repo) : /* @__PURE__ */ new Set()
  };
}
function fileLine(root, file, line) {
  if (!isSafePath(file)) return "";
  try {
    return readFileSync10(path11.join(root, file), "utf8").split(/\r?\n/)[line - 1] ?? "";
  } catch {
    return "";
  }
}
function recordReview(prep, result, config, log) {
  const have = new Set([...result.findings, ...result.outsideDiff ?? []].map((f) => f.fingerprint));
  const extra = prep.carried.filter((f) => !have.has(f.fingerprint) && !prep.suppressed.has(f.fingerprint));
  let out = result;
  if (extra.length) {
    const findings = [...result.findings, ...extra].sort((a, b) => rank2(a.severity) - rank2(b.severity) || a.file.localeCompare(b.file) || a.line - b.line);
    out = { ...result, findings, stats: { ...result.stats, findings: findings.length, bySeverity: countSeverities(findings) } };
  }
  const root = prep.root;
  if (!root) return out;
  try {
    const byPath = new Map(prep.all.map((f) => [f.path, f]));
    const snippetOf = (f) => {
      const d = byPath.get(f.file);
      return (d && newLineText(d, f.line)) ?? fileLine(root, f.file, f.line);
    };
    const reviewed = new Set(reviewableFiles(prep.files, config.review.exclude).keep.map((f) => f.path));
    writeStore(root, mergeStore(readStore(root), [...out.findings, ...out.outsideDiff ?? []], reviewed, snippetOf, prep.head));
    if (prep.incremental) writeCheckpoint(root, { version: 1, head: prep.head, files: prep.hashes });
  } catch (e) {
    log("warn", `could not save review state: ${errorMessage(e)}`);
  }
  return out;
}
function stateRoot(cwd) {
  const root = repoRoot(cwd);
  if (!root || !stateDir(root)) throw new Error("not inside a git repository; CodeWolf keeps findings in the git dir, so this command needs one");
  return root;
}
function currentLine(root, f) {
  if (!isSafePath(f.file)) return f.line;
  try {
    return relocate(f, readFileSync10(path11.join(root, f.file), "utf8")) ?? f.line;
  } catch {
    return f.line;
  }
}
function cmdFindings(v, cwd) {
  const root = stateRoot(cwd);
  if (v.clear) {
    writeStore(root, emptyStore());
    clearCheckpoint(root);
    process.stdout.write("cleared the findings store; the next review covers every changed file\n");
    return 0;
  }
  const list = readStore(root).findings.filter((f) => v.all || f.status === "open").map((f) => ({ ...f, line: currentLine(root, f) }));
  if (v.json) {
    process.stdout.write(JSON.stringify(list, null, 2) + "\n");
    return 0;
  }
  if (!list.length) {
    process.stdout.write(v.all ? "no stored findings. run codewolf review first\n" : "no open findings\n");
    return 0;
  }
  const rows = list.map((f) => [f.id, `${f.file}:${f.line}`, f.severity, f.kind ?? "issue", ...v.all ? [f.status] : [], f.title.replace(/\s*\r?\n\s*/g, " ")].join(" "));
  process.stdout.write(rows.join("\n") + "\n");
  return 0;
}
function cmdDismiss(ids, v, cwd) {
  if (!ids.length) throw new Error('usage: codewolf dismiss <id...> [--reason "<text>"] [--learn]');
  const reason = v.reason?.replace(/\s+/g, " ").trim();
  if (v.learn && !reason) throw new Error('--learn needs --reason "<what to stop flagging and why>"');
  const root = stateRoot(cwd);
  const store = readStore(root);
  const picked = ids.map((id) => store.findings.find((f) => f.id === id || f.fingerprint === id));
  const unknown = ids.filter((_, i) => !picked[i]);
  if (unknown.length) throw new Error(`unknown finding id(s): ${unknown.join(", ")} (see codewolf findings --all)`);
  const fps = new Set(picked.map((f) => f.fingerprint));
  writeStore(root, { ...store, findings: store.findings.map((f) => fps.has(f.fingerprint) ? { ...f, status: "dismissed" } : f) });
  addSuppressed(root, [...fps], reason);
  const learned = v.learn && reason ? appendLearning(root, reason) : void 0;
  process.stdout.write(`dismissed ${fps.size} finding(s); future reviews will not report them${learned ? `. learned: saved to ${learned}` : ""}
`);
  return 0;
}

// src/cli/template.ts
var INIT_TEMPLATE = `# CodeWolf configuration. Every key is optional; CLI flags override this file.
# Docs: https://github.com/za3ter123/codewolf

# quiet = critical only, chill = critical + major and a few minor, assertive = everything including nits
profile: chill

# Language for summaries and comments
language: en

# Providers are tried in order. When every key of one provider is rate limited or rejected,
# CodeWolf falls through to the next. keys accepts literal keys or env:NAME (comma or newline list).
providers:
  - name: anthropic
    model: claude-sonnet-5-5
    keys: [env:ANTHROPIC_API_KEYS]
  # Any OpenAI-compatible server: OpenAI, OpenRouter, Groq, Together, LM Studio, vLLM
  # - name: openai
  #   baseUrl: https://openrouter.ai/api/v1
  #   model: qwen/qwen3-coder
  #   keys: [env:OPENROUTER_API_KEY]
  # - name: gemini
  #   model: gemini-2.5-flash
  #   keys: [env:GEMINI_API_KEYS]
  # Your Claude subscription through the local Claude Code CLI, no API key
  # - name: claude-code
  # Local and free
  - name: ollama
    model: qwen2.5-coder:7b
    # baseUrl: http://127.0.0.1:11434
    # timeout: 900          # seconds

review:
  # Added to the built-in excludes (lockfiles, dist/, minified files, binaries). Prefix with ! to re-include.
  exclude: []
  # Extra instructions for matching paths
  pathInstructions: []
  #  - path: "src/api/**"
  #    instructions: "Check authorization on every handler."
  # Exit 1 when a finding is at or above this severity: critical | major | minor | nit | none
  failOn: none
  # Include CLAUDE.md, AGENTS.md, .cursorrules and .github/copilot-instructions.md as project guidelines
  guidelines: true
  # concurrency: 4
  # maxChunkTokens: 12000

# Local linters fused into the review when installed. Set one to false to skip it.
tools:
  ruff: true
  eslint: true
  semgrep: true
  gitleaks: true
`;

// src/core/host.ts
var str2 = { type: "string" };
var int = { type: "integer", minimum: 1 };
var ANSWER_SCHEMA = {
  type: "object",
  required: ["findings"],
  properties: {
    summary: str2,
    walkthrough: { type: "array", items: { type: "object", required: ["file", "change"], properties: { file: str2, change: str2 } } },
    findings: {
      type: "array",
      items: {
        type: "object",
        required: ["file", "line", "severity", "category", "title", "body"],
        properties: {
          file: str2,
          line: int,
          endLine: int,
          severity: { enum: ["critical", "major", "minor", "nit"] },
          category: { enum: ["bug", "security", "performance", "maintainability", "style", "test"] },
          title: str2,
          body: str2,
          suggestion: str2,
          effort: { enum: ["quick", "heavy"] },
          kind: { enum: ["refactor"] },
          cwe: { type: "string", pattern: "^CWE-\\d+$" },
          rewrite: { type: "object", required: ["language", "reason", "code"], properties: { language: str2, reason: str2, code: str2 } }
        }
      }
    },
    diagram: str2
  }
};
var HOST_NOTE = `Host-agent mode: you, the coding agent that ran \`codewolf packet\`, are the reviewer. Review every entry of "chunks" (each "diff" uses the format described above), then write ONE JSON answer covering all chunks, shaped like "schema", and pass it to \`codewolf ingest\` with the same scope flags you gave \`codewolf packet\`. "builtin" lists what deterministic scanners already found; do not repeat those. Apply "learnings" (team preferences, they override your defaults) and "guidelines" (repository rules) as a reviewer would.`;
async function builtinFindings(keep, config, linters, log) {
  const on = linters && Object.values(config.tools).some(Boolean);
  const tools = on ? await runLinters(keep, config, (m) => log("debug", m)).catch(() => []) : [];
  return [...scanSecrets(keep), ...tools];
}
async function buildPacket(files, config, opts = {}) {
  const { keep } = reviewableFiles(files, config.review.exclude);
  const ins = instructionsFor(keep.map((f) => f.path), config.review.pathInstructions);
  const instructions = [systemPrompt(config.profile, config.language), HOST_NOTE];
  if (ins.length) instructions.push(`Extra instructions for specific paths:
${ins.join("\n")}`);
  const builtin = (await builtinFindings(keep, config, opts.linters !== false, opts.log ?? (() => {
  }))).filter((f) => !opts.suppressed?.has(f.fingerprint));
  return {
    version: 1,
    instructions: instructions.join("\n\n"),
    chunks: chunkFiles(keep, config.review.maxChunkTokens).map((c, i) => ({ id: `c${i + 1}`, files: c.paths, diff: c.body })),
    builtin,
    learnings: config.learnings,
    guidelines: config.guidelines,
    schema: ANSWER_SCHEMA
  };
}
async function ingestAnswer(text, files, config, opts = {}) {
  const raw = extractJson(text);
  if (raw === void 0) throw new Error('the answer is not valid JSON; expected {"summary", "walkthrough", "findings": [...]}');
  const log = opts.log ?? (() => {
  });
  const { keep } = reviewableFiles(files, config.review.exclude);
  const answer = normalizeModelOutput(raw, keep);
  const warnings = [];
  if (answer.dropped) {
    warnings.push(`dropped ${answer.dropped} finding(s) on files outside the diff or malformed`);
    log("warn", warnings[0]);
  }
  const walk = new Map(answer.walkthrough.map((w) => [w.file, w.change]));
  const builtin = await builtinFindings(keep, config, opts.linters !== false, log);
  return buildResult(files, keep, config, {
    findings: [...builtin, ...answer.findings],
    outside: answer.outside,
    walk,
    summary: answer.summary,
    ...answer.diagram ? { diagram: answer.diagram } : {},
    provider: { name: "host-agent", model: "" },
    warnings
  }, opts.suppressed);
}

// package.json
var package_default = {
  name: "codewolf",
  version: "0.2.0",
  description: "Open-source AI code reviewer. Bring your own keys, many keys at once, or a local model. It eats rabbits.",
  type: "module",
  license: "MIT",
  bin: {
    codewolf: "dist/cli.js"
  },
  files: [
    "dist",
    "README.md",
    "LICENSE"
  ],
  engines: {
    node: ">=20"
  },
  scripts: {
    build: "tsc --noEmit && node scripts/build.mjs",
    typecheck: "tsc --noEmit",
    test: 'node --test "test/**/*.test.ts" "test/**/*.test.mjs"'
  },
  repository: {
    type: "git",
    url: "git+https://github.com/za3ter123/codewolf.git"
  },
  keywords: [
    "code-review",
    "ai",
    "llm",
    "cli",
    "github-action",
    "ollama",
    "coderabbit-alternative"
  ],
  dependencies: {
    yaml: "2.9.1"
  },
  devDependencies: {
    "@types/node": "26.6.5",
    esbuild: "0.28.2",
    typescript: "7.0.2"
  }
};

// src/shared/version.ts
var VERSION = package_default.version;

// src/cli.ts
var HELP = `codewolf ${VERSION}: AI code review with your own keys, many keys, or a local model.

Usage:
  codewolf review [scope] [options]   Review changes (default: working tree vs HEAD, untracked files included)
  codewolf init [--force]             Write a commented .codewolf.yaml in the current directory
  codewolf learn "<text>"             Teach a reviewer preference (.codewolf/learnings.md)
  codewolf learnings                  List learned preferences
  codewolf providers [--check]        Show the provider chain and key counts; --check pings every key
  codewolf packet [scope]             Print the review job as JSON for your own coding agent (no API key needed)
  codewolf ingest <file|-> [scope]    Validate your agent's JSON answer and print it like review (same scope flags)
  codewolf findings [--all] [--json] [--clear]   List open findings from the last reviews (--all adds dismissed, fixed)
  codewolf dismiss <id...> [--reason "<text>"] [--learn]   Stop reporting findings; --learn saves the reason
  codewolf fix [<id...> | --all | --nits] [--to <target>]
                                      Hand stored open findings to an agent as one fix prompt (stdin only).
                                      Targets: print | claude | codex | opencode | gemini | clipboard
  codewolf apply <id...> [--dry-run]  Write a stored finding's suggestion into its file
  codewolf install [<agent...> | --all] [--project | --user] [--yes] [--force]
                                      Install the CodeWolf command/skill into claude, codex, cursor, gemini,
                                      opencode or agents. Prints the plan; writes only with --yes
  codewolf hook install|uninstall|status
                                      Opt-in post-commit hook: background review, never blocks a commit
  codewolf doctor                     Check node, git, config, providers (masked keys), Ollama, claude, linters
  codewolf pr <number|url> [--repo owner/name] [--json]
                                      Print CodeWolf's comments on a GitHub PR as fix prompts (read-only)
  codewolf --version | --help

Scope (pick one):
  --uncommitted        Working tree vs HEAD, staged + unstaged + untracked (default)
  --staged             Staged changes only
  --committed          HEAD vs merge-base with the default branch
  --base <ref>         Merge-base(ref, HEAD) to working tree
  --diff <file|->      Review a patch file, or stdin with -

Options:
  --format <f>         pretty | plain | markdown | json   (default: pretty on a TTY, plain otherwise or inside
                       a coding agent: Claude Code, Codex, Cursor, Gemini CLI, opencode, aider)
  --agent              NDJSON for coding agents: one finding per line, then a summary line;
                       exit 1 if any critical or major finding remains
  --provider <name>    anthropic | openai | gemini | ollama | claude-code | openrouter
  --model <id>         Model id
  --base-url <url>     Provider base URL (OpenAI-compatible servers, proxies, remote Ollama)
  --keys <a,b,c>       API keys for the provider (round-robin; env:NAME reads an env var)
  --profile <p>        quiet | chill | assertive
  --config <path>      Config file (default: nearest .codewolf.yaml upward from cwd)
  --fail-on <sev>      Exit 1 if any finding is at or above: critical | major | minor | nit | none
  --claude-bin <path>  Claude Code binary for the claude-code provider (or CODEWOLF_CLAUDE_BIN)
  --no-tools           Do not run local linters (ruff, eslint, semgrep, gitleaks)
  --fresh              Review every changed file, ignoring the incremental checkpoint
  --verbose            Debug logs on stderr

Exit codes: 0 ok, 1 --fail-on threshold hit (or --agent found critical/major), 2 error.
Keys from env: ANTHROPIC_API_KEY(S), OPENAI_API_KEY(S), GEMINI_API_KEY(S), OPENROUTER_API_KEY(S), CODEWOLF_API_KEYS.
Safety: a .codewolf.yaml found in the repository cannot read env vars (env:NAME), run commands, or receive your
keys at a non-official base URL. Pass the file with --config, or use --base-url / CODEWOLF_BASE_URL, to allow keys.
`;
var OPTIONS = {
  format: { type: "string" },
  agent: { type: "boolean" },
  provider: { type: "string" },
  model: { type: "string" },
  "base-url": { type: "string" },
  keys: { type: "string" },
  profile: { type: "string" },
  config: { type: "string" },
  "fail-on": { type: "string" },
  base: { type: "string" },
  staged: { type: "boolean" },
  diff: { type: "string" },
  uncommitted: { type: "boolean" },
  committed: { type: "boolean" },
  "claude-bin": { type: "string" },
  check: { type: "boolean" },
  force: { type: "boolean" },
  "no-tools": { type: "boolean" },
  verbose: { type: "boolean" },
  all: { type: "boolean" },
  nits: { type: "boolean" },
  to: { type: "string" },
  "dry-run": { type: "boolean" },
  project: { type: "boolean" },
  user: { type: "boolean" },
  yes: { type: "boolean" },
  json: { type: "boolean" },
  repo: { type: "string" },
  version: { type: "boolean", short: "v" },
  help: { type: "boolean", short: "h" },
  fresh: { type: "boolean" },
  clear: { type: "boolean" },
  reason: { type: "string" },
  learn: { type: "boolean" }
};
var UsageError = class extends Error {
};
async function readStdin() {
  const chunks = [];
  for await (const c of process.stdin) chunks.push(typeof c === "string" ? Buffer.from(c) : c);
  return Buffer.concat(chunks).toString("utf8");
}
function overridesFrom(v) {
  const o = {};
  if (v.provider) o.provider = v.provider;
  if (v.model) o.model = v.model;
  if (v["base-url"]) o.baseUrl = v["base-url"];
  if (v.keys) o.keys = v.keys;
  if (v.profile) o.profile = v.profile;
  if (v["fail-on"]) o.failOn = v["fail-on"];
  if (v["claude-bin"]) o.claudeBin = v["claude-bin"];
  return o;
}
function configFor(v, cwd) {
  const opts = { cwd, overrides: overridesFrom(v), root: repoRoot(cwd) ?? cwd };
  if (v.config) {
    opts.configPath = v.config;
    opts.trusted = true;
  }
  return loadConfig(opts);
}
function scopeFrom(v) {
  const picked = [v.diff !== void 0 && "diff", v.staged && "staged", v.base !== void 0 && "base", v.committed && "committed", v.uncommitted && "uncommitted"].filter(Boolean);
  if (picked.length > 1) throw new UsageError(`choose one scope, got --${picked.join(" --")}`);
  if (v.diff !== void 0) return { kind: "file", path: v.diff };
  if (v.staged) return { kind: "staged" };
  if (v.base !== void 0) return { kind: "base", ref: v.base };
  if (v.committed) return { kind: "committed" };
  return { kind: "uncommitted" };
}
async function loadReview(v, cwd, log) {
  const config = configFor(v, cwd);
  const scope = scopeFrom(v);
  let patch;
  if (scope.kind === "file") {
    if (scope.path === "-") patch = await readStdin();
    else {
      const p = path12.resolve(cwd, scope.path);
      if (!existsSync7(p)) throw new UsageError(`diff file not found: ${scope.path}`);
      patch = readFileSync11(p, "utf8");
    }
  } else {
    patch = collectDiff(scope, cwd);
  }
  return { config, prep: prepareReview(scope, parseDiff(patch), config, cwd, { fresh: v.fresh === true, log }) };
}
async function readAnswer(from, v, cwd) {
  if (from === "-") {
    if (v.diff === "-") throw new UsageError("ingest - and --diff - cannot both read stdin");
    return readStdin();
  }
  const p = path12.resolve(cwd, from);
  if (!existsSync7(p)) throw new UsageError(`answer file not found: ${from}`);
  return readFileSync11(p, "utf8");
}
async function cmdPacket(v, cwd) {
  const log = stderrLogger(v.verbose ? "debug" : "info");
  const { config, prep } = await loadReview(v, cwd, log);
  const packet = await buildPacket(prep.files, config, { linters: !v["no-tools"], log, suppressed: prep.suppressed });
  process.stdout.write(JSON.stringify(packet, null, 2) + "\n");
  return 0;
}
async function cmdReview(v, cwd, answerFrom) {
  const log = stderrLogger(v.verbose ? "debug" : "info");
  let format = process.stdout.isTTY && !detectAgent(process.env) ? "pretty" : "plain";
  if (v.format) {
    if (!["pretty", "plain", "markdown", "json"].includes(v.format)) throw new UsageError(`unknown --format ${v.format}`);
    format = v.format;
  }
  const answer = answerFrom === void 0 ? void 0 : await readAnswer(answerFrom, v, cwd);
  const { config, prep } = await loadReview(v, cwd, log);
  const files = prep.files;
  if (!prep.all.length) log("info", "no changes to review");
  else log("debug", `reviewing ${files.length} file(s) with ${config.providers.map((p) => p.name).join(" -> ")}`);
  const ac = new AbortController();
  const onSig = () => ac.abort(new Error("interrupted"));
  process.once("SIGINT", onSig);
  let result;
  try {
    result = answer === void 0 ? await review(files, config, { signal: ac.signal, log, linters: !v["no-tools"], suppressed: prep.suppressed }) : await ingestAnswer(answer, prep.all, config, { log, linters: !v["no-tools"], suppressed: prep.suppressed });
  } finally {
    process.off("SIGINT", onSig);
  }
  result = recordReview(prep, result, config, log);
  const rank3 = (s2) => SEVERITIES.indexOf(s2);
  if (v.agent) {
    process.stdout.write(formatNdjson(result));
    return result.findings.some((f) => rank3(f.severity) <= rank3("major")) ? 1 : 0;
  }
  const color = format === "pretty" && process.stdout.isTTY === true && !process.env.NO_COLOR;
  process.stdout.write(formatResult(result, format, color));
  const failOn = config.review.failOn;
  if (failOn !== "none" && result.findings.some((f) => rank3(f.severity) <= rank3(failOn))) return 1;
  return 0;
}
function cmdInit(v, cwd) {
  const file = path12.join(cwd, ".codewolf.yaml");
  if (existsSync7(file) && !v.force) throw new UsageError(`${file} already exists (use --force to overwrite)`);
  writeFileSync6(file, INIT_TEMPLATE);
  process.stdout.write(`wrote ${file}
`);
  return 0;
}
function cmdLearn(text, cwd) {
  if (!text.trim()) throw new UsageError('usage: codewolf learn "<preference>"');
  const file = appendLearning(repoRoot(cwd) ?? cwd, text);
  process.stdout.write(`learned. saved to ${file}
`);
  return 0;
}
function cmdLearnings(cwd) {
  const root = repoRoot(cwd) ?? cwd;
  const items = readLearnings(root);
  if (!items.length) {
    process.stdout.write(`no learnings yet. add one with: codewolf learn "<preference>"  (${learningsPath(root)})
`);
    return 0;
  }
  process.stdout.write(items.map((l, i) => `${i + 1}. ${l}`).join("\n") + "\n");
  return 0;
}
var CHECK_TIMEOUT_MS = 12e4;
async function cmdProviders(v, cwd) {
  const config = configFor(v, cwd);
  const out = [];
  let ok = 0, failed = 0;
  for (const [i, p] of config.providers.entries()) {
    const keyInfo = p.keys.length ? `${p.keys.length} key(s): ${p.keys.map(maskKey).join(", ")}` : "no key";
    out.push(`${i + 1}. ${p.name}  model=${p.model || "(cli default)"}${p.baseUrl ? `  baseUrl=${p.baseUrl}` : ""}  ${keyInfo}`);
    if (!v.check) continue;
    process.stdout.write(out.splice(0).join("\n") + "\n");
    for (const key of p.keys.length ? p.keys : [null]) {
      const single = { ...p, keys: key ? [key] : [], timeoutMs: Math.min(p.timeoutMs, CHECK_TIMEOUT_MS) };
      const started = Date.now();
      try {
        await createChain([single], { retryDelayMs: 0 }).complete({ system: "You are a health check. Reply with the single word ok.", prompt: "ping", maxTokens: 16 });
        ok++;
        out.push(`   ok    ${key ? maskKey(key) : "no key"}  ${((Date.now() - started) / 1e3).toFixed(1)}s`);
      } catch (e) {
        failed++;
        out.push(`   FAIL  ${key ? maskKey(key) : "no key"}  ${redact(errorMessage(e)).replace(/^all providers failed\. /, "")}`);
      }
      process.stdout.write(out.splice(0).join("\n") + "\n");
    }
  }
  if (out.length) process.stdout.write(out.join("\n") + "\n");
  if (v.check) process.stdout.write(`${ok} ok, ${failed} failed
`);
  return v.check && ok === 0 ? 2 : 0;
}
async function main(argv, cwd = process.cwd()) {
  let parsed;
  try {
    parsed = parseArgs({ args: argv, options: OPTIONS, allowPositionals: true, strict: true });
  } catch (e) {
    process.stderr.write(`codewolf: ${errorMessage(e)}
Run codewolf --help for usage.
`);
    return 2;
  }
  const { values: v, positionals } = parsed;
  if (v.version) {
    process.stdout.write(`codewolf ${VERSION}
`);
    return 0;
  }
  const [cmd, ...rest] = positionals;
  if (v.help || !cmd || cmd === "help") {
    process.stdout.write(HELP);
    return 0;
  }
  try {
    switch (cmd) {
      case "review":
        return await cmdReview(v, cwd);
      case "init":
        return cmdInit(v, cwd);
      case "learn":
        return cmdLearn(rest.join(" "), cwd);
      case "learnings":
        return cmdLearnings(cwd);
      case "providers":
        return await cmdProviders(v, cwd);
      case "packet":
        return await cmdPacket(v, cwd);
      case "ingest":
        if (!rest[0]) throw new UsageError("usage: codewolf ingest <answer.json|-> [scope flags]");
        return await cmdReview(v, cwd, rest[0]);
      case "findings":
        return cmdFindings(v, cwd);
      case "dismiss":
        return cmdDismiss(rest, v, cwd);
      case "fix":
        return await cmdFix(rest, v, cwd);
      case "apply":
        return cmdApply(rest, v, cwd);
      case "install":
        return cmdInstall(rest, v, cwd);
      case "hook":
        return cmdHook(rest[0], cwd);
      case "doctor":
        return await cmdDoctor({ config: v.config, overrides: overridesFrom(v) }, cwd);
      case "pr":
        return await cmdPr(rest[0], v, cwd);
      case "version":
        process.stdout.write(`codewolf ${VERSION}
`);
        return 0;
      default:
        throw new UsageError(`unknown command "${cmd}". Run codewolf --help for usage.`);
    }
  } catch (e) {
    process.stderr.write(`codewolf: error: ${redact(errorMessage(e))}
`);
    return 2;
  }
}
process.exitCode = await main(process.argv.slice(2));
export {
  main
};
