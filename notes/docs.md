# Cene language reference



## Built-in definitions

(**TODO**: Add documentation for all the other primitives defined in era-cene-runtime.js and era-cene-api.js. Some of this documentation has already been written in cene-design-goals.txt.)

-
```
\= TODO: Document all of these. (These aren't the only undocumented
primitives.)


### Integers

(defn dex-int - ...)
(defn fuse-int-by-plus - ...)
(defn fuse-int-by-times - ...)

(defn int-zero - ...)
(defn int-one - ...)
(defn int-compare a b ...)
  \= TODO: See if we should make this available as a dex (becoming the
  \= first dex with a visible order to it) or as a merge (in the form
  \= of a max or min operation).
(defn int-minus a b ...)
(defn int-div-rounded-down a b ...)
  \= NOTE: This one's result uses (carried main carry), where `carry`
  \= is the remainder. It may also return (nil) for a zero divisor.
  \= TODO: See if we should choose a different rounding policy.


### Strings

(defn string-length string ...)

(defn string-empty - ...)

(defn string-singleton unicode-scalar ...)

(defn string-cut-later string start stop then ...)
(then substring)

(defn string-get-unicode-scalar-later string start then ...)
(then unicode-scalar)
```

-
```
(defn string-append-later a b then ...)
(then result)
```
Monadically, concatenates two strings, and calls the given callback monadically in a future tick.

-
```
macro (str \;qq[example string])
```
Obtains a first-class string value with the given literal text.

-
```
(defn make-tuple-tag tuple-name proj-names)
```
Takes a name for the constructor and a list of names for the projections, and returns the name used to dynamically tag a tuple of that combination of names. The projection name list must be made out of `(cons car cdr)` and `(nil)` values, with elements that are strings, and the list must not have duplicates. The order of the list will be ignored.

-
```
(defn name-metacompare a b ...)
```
(**TODO**: Figure out where to put this extensive documentation now that `name-metacompare` is implemented in era-cene-prelude.cene. It's not a built-in definition anymore.)

Compares two names. For inequal names, the result will be in a format user-level code does not know how to deconstruct. For equal names, the result will be (nil).

Names are somewhat useful for access control, and they're opaque external tokens to an extent, but they're not entirely opaque. They can be compared for equality.

Macros would be less expressive if they had to treat names as uncomparable values, and what benefit would that bring? The macros would still have a range of expression close to that anyway: A macro could still dive into one of its syntax parameters and extract names from there into its own bag of tricks, so names wouldn't really be secrets between macros. A macro could still reconstruct a syntax parameter while inserting two occurrences of any name it likes, just to ensure that the two occurrences are equal. A macro could still do a hackish equality assertion by defining something by one name and looking up the definition by another. A macro could still do a hackish *inequality* assertion by installing two definitions under the (supposedly) two names.

If macros couldn't check names for equality, one thing a macro couldn't do... is to associate a variable binding site with a variable usage site. It couldn't act as a compiler of some other DSL, unless that DSL completely forewent the namespace system and just used string names everywhere. So people who have adventurous new syntaxes to try would want to build new namespace systems for them, and this macro system would have complicated the Cene language for no purpose that couldn't have been accomplished with an exhaustive suite of built-in syntaxes.

(**TODO**: Do nominal types already support an equality check? James Cheney's "Simple Nominal Type Theory" presents systems with and without equality checks. If this is very common, maybe we can rationalize this decision in terms of standard practice too.)

So, macros will be able to compare names for equality. As long as they can do that, we could promote better efficiency by permitting ordered comparisons instead of just equality checks. That way, names could be lookup keys in AVL trees and other efficiently indexed data structures.

It's tricky, because names have no natural ordering. Even if they were arbitrarily associated with strings and ordered that way, that ordering would not be stable in the face of capture-avoiding alpha-renaming! So whatever order we use, it will expose implementation details and make namespace sandboxing into a headache... unless, that is, the implementation details were hidden in a familiar way: By using obscure naming (and enforcing this obscurity with code-signing if necessary).

To wit, we can refrain from exposing implementation details by defining "metacompare" operations that usually work like "compare" operations, but sometimes return values that user-defined macro code doesn't know how to deconstruct. (The "meta" stands for "metacircular", under the idea that there may be a few layers of the reflective tower all running as macros in the same macroexpansion phase. Each layer must be implemented with obscure names that its interpreted layer doesn't know about.) Once we have metacomparison operations, we can provide encapsulated data types that sort their data using a metacomparison.

If we just support encapsulated AVL trees, that might go a long way, especially if it serves as a complete model of computation over unordered collections. We can get quite a range of computational ability all at once if we simply add a metacomparator over the AVL trees themselves. For instance, that lets us detect emptiness by comparing to the empty tree, and it lets us detect singletonhood by looping over the entries and comparing to the singletons of each.

In the process, a lot of ugliness may arise: If concatenation of encapsulated AVL trees doesn't somehow check that their metacomparators are equivalent, we may end up with malformed encapsulated AVL trees that leak implementation details. We could potentially avoid this situation by passing some sort of equality certifier to the concatenation operation, but then we'd need a specialized language (or at least a collection of combinators) for defining equality certifiers. An easier approach would be to use a specialized language (or combinators) for the metacomparators themselves. This language would quickly resemble a static type system, much like our "cmpd" utilities already resemble algebraic data type definitions. So, this probably isn't worth solving until we take a typed approach.

For now, we can start small, merely providing a single metacomparator over names (`name-metacompare`), rather than aiming for efficiency and general computation. As long as we have that, we can use inefficient association lists to track free variables (`free-vars-object`).

-
```
(def-type istring-nil string)
```
An interpolated string s-expression that consists of a string with no interpolations.

-
```
(def-type istring-cons string-past interpolated istring-rest)
```
(**TODO**: Use this.)

An interpolated string s-expression that consists of a string, a single interpolated value to go after that string, and a remaining interpolated string s-expression to go after that.

-
```
(def-type foreign val)
```
An s-expression that consists of an embedded value of any type, but usually a name. The program may not know of a way to encode the name as serializable data, but it can still be passed to `(compile ...)`.

-
```
(def-type stx stx-details s-expr)
```
An s-expression tagged with source location information.

-
```
(defn macro-stx-details mode unique-ns definition-ns stx ...)
```
Constructs a syntax details object that refers to a macro's input, so that the macro's output can be associated with it. The `stx` must be a located cons list whose first element is a string or foreign name referring to a macro.

-
```
(defn contributing-only-to ns effects ...)
```
Monadically, schedules the effects to occur in a future tick where contributing to multimethods outside the given namespace is not allowed, but reading closed-world-assumption collections of contributions outside the given namespace is allowed.

-
```
(defn ns-get-name name ns ...)
```
Obtains a sub-namespace determined by the given namespace, using the given name as a "folder name." Unless the sub-namespaces are shadowed, distinct "folder names" will yield distinct sub-namespaces.

-
```
(defn ns-get-string string ns ...)
```
Obtains a sub-namespace determined by the first namespace, using the given string as a "folder name." Unless the sub-namespaces are shadowed, distinct "folder names" will yield distinct sub-namespaces.

-
```
(defn procure-sub-ns-table table ns ...)
```
Makes a table with entries corresponding to the given table, except each value is a namespace uniquely determined by the given namespace and the entry's key. The entry's value is ignored.

-
```
(defn ns-shadow-name name sub-ns ns ...)
```
Creates a new namespace that behaves like the second namespace in almost every way, except when the given name is requested as a "folder name", in which case the first namespace is returned instead.

-
```
(defn ns-shadow-string string sub-ns ns ...)
```
Creates a new namespace that behaves like the second namespace in almost every way, except when the given string is requested as a "folder name", in which case the first namespace is returned instead.

The `ns-shadow-name` and `ns-shadow-string` functions can be used to establish local macros. A namespace created this way even works the same way as the old one when it's used in a `procure-...` primitive. This way, we can imagine that the namespace's own identity is stored under an entry somewhere in the namespace, just using a key that we don't have the ability to construct.

-
```
(defn shadow-procure-sub-ns-table table ns ...)
```
Creates a new namespace that behaves like the given namespace in almost every way, except when a key from the given table is requested as a "folder name", in which case the corresponding value of the table is returned instead. The values of the table must be namespaces.

-
```
(defn procure-name mode ns ...)
```
Uses the given namespace to obtain a first-class name value. The given modality must be the current one.

-
```
(defn procure-contributed-element-definer ns dexable-key ...)
```
Construts a definer that contributes its defined value to the element contribution map on the namespace. The given modality must be the current one. When the definer is used, if more than one element contribution is given for the same key at the same timestamp, an error occurs; all listener contributors, element contributors, and ticks begun by these contributions are in error, and their ticks' side effects are invalidated. When the definer is used, the then-current modality's ancestors must not have used `contributing-only-to` to disallow making element contributions to the given namespace. Furthermore, if the then-current modality is a live service modality, the ancestors must not have used `contributing-only-to-unless-after` or `contributing-only-to-unless-before` in a way that conflicts with the timestamp at which the definer was obtained.

(**TODO**: Implement `contributing-only-to-unless-before`, `contributing-only-to-unless-after`, and live service modalities.)

-
```
(defn procure-contributed-element mode ns dexable-key ...)
```
Blocks until the given namespace has a contributed element under the given key, and returns that element value. The given modality must be the current one.

-
```
(defn procure-contribute-listener ns dexable-key listener ...)
(listener singleton-table)
```
Monadically, contributes to the listener contribution map on the namespace. The listener will be called monadically in a different future tick each time an entry is contributed to the namespace's element contribution map. The listener is given a singleton table containing the entry contributed. If more than one listener contribution is given for the same key, an error occurs; all listener contributors, element contributors, and ticks begun by these contributions are in error, and their ticks' side effects are invalidated.

This is a way to make frameworks that are extensible in the sense of the open-world assumption (OWA).

-
```
(defn procure-contributed-elements mode ns ...)
```
Gets the namespace's full element contribution map as a table. The given modality must be the current one, and its ancestors must have used `contributing-only-to` to disallow making contributions to the given namespace. During macroexpansion, this operation will not compute a result until at least all the original macroexpansion ticks have completed, since they are capable of contributing to any namespace.

This is a way to make frameworks that are extensible in the sense of the closed-world assumption (CWA).

-
```
(defn no-effects ignored ...)
```
Constructs a monad that, if invoked, does nothing.

-
```
(defn join-effects a b ...)
```
Constructs a monad that, if invoked, performs the effects of both of the given monads.

-
```
(defn later effects ...)
```
Monadically, executes the effects in a later tick.

This is useful mainly for concurrency. It allows the given effects' computation to depend on values that might not be available right now.

-
```
(defn make-promise-later then ...)
then (fn definer read ...)
read (fn mode ...)
```
Monadically, calls a callback in a later tick with a definer and a pure function that takes the current mode and reads the defined value. The read function must be called in a later tick than the one the value is defined in.

**Rationale**: Cene expressions are designed so they can have consistent performance each time they run. Therefore, algorithms written as Cene expressions cannot rely on laziness or JIT techniques (even though an implementation of Cene may in fact implement such things as optimizations). However, laziness is useful to reduce the amortized computational complexity of data structures like finger trees, which are good for representing strings. To support this data structure technique, Cene offers `make-promise-later`, a standard way to allocate promise state even from a computation that has no other access to state.

Not all Cene modes will necessarily support the `make-promise-later` side effect.

```
\= TODO: Don't implement this as a primitive. Implement it in terms of
\= `make-promise-later`.
(defn later-concurrent-later a b then ...)
(a a-then)
(b b-then)
(a-then a-result)
(b-then b-result)
(then a-result b-result)
Monadically, takes two functions that monadically pass results to
callbacks in later ticks, calls each of them in a separate later tick,
and in a third later tick, passes their results monadically to the
given two-argument callback.
```

-
```
(defn definer-define definer value ...)
```
Monadically, writes to the given definer. If the definition cannot be installed, the program is in error; other computations that depend on the defined value may or may not be canceled or retroactively voided.

-
```
(defn definer-commit-later definer effects ...)
```
(**TODO**: Implement and use this.)

Monadically, executes the effects in a later tick and commits to writing to the given definer in that tick or later. This is only useful to suppress error messages about the definition not existing if there's an error in this logical thread.

-
```
(defn assert-current-modality mode ...)
```
Returns `(nil)`. The given modality must be the current one. If it isn't, this causes an error.

-
```
(defn compile-expression unique-ns definition-ns stx out-definer ...)
```
Constructs a monad that, if invoked, macroexpands the given `stx` in a later tick, allowing the macro calls to monadically install definitions over the course of any number of ticks and produce a fully compiled expression. If the expression is successfully computed, it is defined in the given `out-definer`.

(**TODO**: Decide if this should conform to the `...-later` calling convention with a simple callback or if all the `...-later` utilities should instead conform to the `compile-expression` calling convention with an `out-definer`.)

-
```
(defn get-mode body ...)
body (fn mode ...)
```
Constructs a monad. If invoked, it calls the callback in the same tick with the current modality, and it performs the callback's monadic side effects.

A modality must be passed to certain effectful primitives as a way to give the effects something to be deterministic by. (The terms "mode" and "modality" might be idiosyncrasies of this codebase. A more standard term is "world-passing style.")

-
```
(defn table-zip a b func ...)
(func maybe-a-val maybe-b-val)
```
Given two tables and a function to combine values, makes a new table by iterating over the tables' combined set of keys, calling the function with both tables' `(yep ...)` or `(nil)` values for the keys, and using the function's `(yep ...)` or `(nil)` result to determine the value for the final table. The function will never be called with `(nil)` and `(nil)`.

-



## Layout of the definition namespace

During macroexpansion, Cene code may interact with the definition namespace by using operations like the referentially transparent `procure-contributed-element` and `procure-contributed-element-definer` and the monadic `definer-define`. (Putting two definitions into one name is an error.) Even the built-in definitions reside in the definition namespace.

The namespace also has standard places to find fully qualified names for various concepts. These are just like any other name, but the specific location to obtain them from is standardized.

In the following namespace paths, the initial `.` represents the definition namespace, slashes followed by hyphenated identifiers or `<string: ___>` mean the sub-namespace keyed by the given string, slashes followed by any other `<___>` mean the sub-namespace keyed by the given name, slashes followed by `.name` mean the namespace's name, and slashes followed by `___.el` mean the namespace's contributed element keyed by the string `___`:

-
```
./constructor-names/<string: constructor name>/name/.name
```

The proper identity to use for the constructor in macro-generated Cene code.

-
```
./constructors/<constructor identity>/tag/.name
```
The identity to use for the constructor in fully compiled code.

-
```
./constructors/<constructor identity>/projection-list/val.el
```
An ordered list of projection name strings. Projections should only be treated as an ordered list in manually keyboarded code and in macros that take manually keyboarded code as input.

-
```
./constructors/<constructor identity>/projection-names/
  <string: projection name>/name/.name
```
The proper identity to use for the projection in everything except manually keyboarded code.

-
```
./macro-names/<string: macro name>/name/.name
```
The proper identity to use for the macro in everything except manually keyboarded code.

-
```
./macros/<macro identity>/function/val.el
```
A value that can be invoked with the arguments of a macro call, as described below.

-
```
./functions/<`make-tuple-tag` result>/call/val.el
```
A value that can be invoked with a value of the specified tuple tag (constructor tag and projection tags) to coerce it into a callable value. Usually, it only takes one or two of these coercions to get to a value the runtime innately knows how to call, e.g. because the value contains fully compiled code in a format the host platform can execute directly.

-

The usual definition forms generate various definitions (plus potential intermediate definitions using names the Cene program doesn't know how to obtain):

#### `(def-type ...)`
  * The constructor name information desired.
  * A macro so that it's easy to construct and call values with this constructor. The macro implementation is a value user-level code doesn't know how to deconstruct, but it may be called as a macro.

#### `(defn ...)`
  * Constructor name information for a first-class representation of the function.
  * A macro so that it's easy to construct and call values with this constructor. The macro implementation is a value user-level code doesn't know how to deconstruct, but it may be called as a macro.
  * The function implementation desired. The function implementation is a value user-level code doesn't know how to deconstruct, and when called with an appropriate structure, it returns a callable value user-level code doesn't know how to deconstruct.

#### `(def-macro ...)`
  * The macro desired.



## Parameters to a macro

When a macro is expanded, its implementation function is called with several arguments: `unique-ns definition-ns my-stx-details args then`

`unique-ns`: A namespace that is supposedly used exclusively for this macroexpansion. It's useful in the way that gensyms are typically useful in other macro-capable languages, but the uniqueness is achieved by playing along: If the macro compiles more than one subexpression, each subexpression should be given a `unique-ns` derived in different ways from each other.

`definition-ns`: A namespace that is supposedly shared across all nearby macroexpansions. If the macro needs to install any definitions or look up any definitions, this is the namespace for that purpose. It should usually be passed as-is to any compiled subexpressions, except when a macro needs to establish a local definition scope.

`my-stx-details`: A collection of source location information. This is a value user-level code doesn't know how to deconstruct, but it conveys information about this macro invocation, so the macro can attach it to the `stx` values it creates in order to receive proper attribution for them.

(**TODO**: Figure out what the format of source location information actually is. For now, this is sort of just an unspecified area, but at least a language implementation can use this to hold filenames and line numbers in practice. An implementation should be able to treat this as a completely empty data structure; it's not needed for any variable scoping purposes.)

`args`: The cons list of `(stx stx-details s-expr)` values that correspond to the subexpressions at the macro call site.

`then`: A callable value that takes compiled code (the result of `compile-expression`) and returns a monadic effect. Invoking this effect causes the compiled code to be used as the macro result. The macro must invoke this effect exactly once, or else there's an error. The effect doesn't necessarily need to be invoked right away; the macro can use `later` to invoke more effects in a future tick.

The macro's return value is a monadic effect, which will be invoked by the macroexpander.
