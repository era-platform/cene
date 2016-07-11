# Cene language reference



## Built-in definitions

(**TODO**: Add documentation for all the other primitives defined in era-staccato-lib-runner-mini.js and era-cene-api.js. Some of this documentation has already been written in cene-design-goals.txt.)

-
```
(defn string-append a b ...)
```
Concatenates two strings.

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
(**TODO**: Figure out where to put this extensive documentation now that `name-metacompare` is implemented in era-staccato-lib.stc. It's not a built-in definition anymore.)

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
(defn ns-get-name name ns ...)
```
Obtains a sub-namespace determined by the given namespace, using the given name as a "folder name." Usually, distinct "folder names" will yield distinct sub-namespaces, but sometimes the interpreter may be configured so that this isn't the case.

-
```
(defn ns-get-string string ns ...)
```
Obtains a sub-namespace determined by the first namespace, using the given string as a "folder name." Usually, distinct "folder names" will yield distinct sub-namespaces, but sometimes the interpreter may be configured so that this isn't the case.

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
(defn procure-name mode ns ...)
```
Uses the given namespace to obtain a first-class name value. The given modality must be the current one.

-
```
(defn procure-defined mode ns ...)
```
Blocks until the given namespace has a defined value and then returns it. The given modality must be the current one.

-
```
(defn procure-put-defined ns value ...)
```
Constructs a monad that, if invoked, installs a definition so that the given namespace has a defined value, namely the given one. If the definition cannot be installed, the program is in error; other computations that depend on the defined value may or may not be canceled or retroactively voided.

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
(defn assert-current-modality mode ...)
```
Returns `(nil)`. The given modality must be the current one. If it isn't, this causes an error.

-
```
(defn compile-expression unique-ns definition-ns stx out-ns ...)
```
Constructs a monad that, if invoked, macroexpands the given `stx` in a later tick, allowing the macro calls to monadically install definitions over the course of any number of ticks and produce a fully compiled expression. If the expression is successfully computed, it is defined directly in the given `out-ns`.

-
```
(defn get-mode body ...)
body (fn mode ...)
```
Constructs a monad. If invoked, it calls the callback in the same tick with the current modality, and it performs the callback's monadic side effects.

A modality must be passed to certain effectful primitives as a way to give the effects something to be deterministic by. (The terms "mode" and "modality" might be idiosyncrasies of this codebase. A more standard term is "world-passing style.")

-



## Layout of the definition namespace

During macroexpansion, Cene code may interact with the definition namespace by using the referentially transparent operation `procure-defined` and the monadic operation `procure-put-defined`. (Putting two definitions into one name is an error.) Even the built-in definitions reside in the definition namespace.

The namespace also has standard places to find fully qualified names for various concepts. These are just like any other name, but the specific location to obtain them from is standardized.

In the following namespace paths, slashes represent names derived by `ns-get-string` or `ns-get-name` (usually `ns-get-name` unless noted by `<string: ...>`), and the initial `.` represents the definition namespace:

-
```
./constructor-names/<string: constructor name>/name
```

A name: The proper identity to use for the constructor in macro-generated Cene code.

-
```
./constructors/<constructor identity>/tag
```
A name: The identity to use for the constructor in fully compiled code.

-
```
./constructors/<constructor identity>/projection-list
```
A defined value: An ordered list of projection name strings. Projections should only be treated as an ordered list in manually keyboarded code and in macros that take manually keyboarded code as input.

-
```
./constructors/<constructor identity>/projection-names/
  <string: projection name>/name
```
A name: The proper identity to use for the projection in everything except manually keyboarded code.

-
```
./macro-names/<string: macro name>/name
```
A name: The proper identity to use for the macro in everything except manually keyboarded code.

-
```
./macros/<macro identity>/function
```
A defined value: A value that can be invoked with the arguments of a macro call, as described below.

-
```
./functions/<`make-tuple-tag` result>/call
```
A defined value: A value that can be invoked with a value of the specified tuple tag (constructor tag and projection tags) to coerce it into a callable value. Usually, it only takes one or two of these coercions to get to a value the runtime innately knows how to call, e.g. because the value contains fully compiled code in a format the host platform can execute directly.

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
