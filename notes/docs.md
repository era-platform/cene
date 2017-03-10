# Cene language reference


(**TODO**: The docs now reside in the docs/ directory instead of this file. This file contains only some lingering documentation that hasn't been organized yet.)


## Candidate built-in definitions

-
```
(defn name-metacompare a b ...)
```
(**TODO**: Figure out where to put this extensive documentation now that `name-metacompare` is implemented in prelude-util.cene. It's not a built-in definition anymore.)

Compares two names. For inequal names, the result will be in a format user-level code does not know how to deconstruct. For equal names, the result will be (nil).

Names are somewhat useful for access control, and they're opaque external tokens to an extent, but they're not entirely opaque. They can be compared for equality.

Macros would be less expressive if they had to treat names as uncomparable values, and what benefit would that bring? The macros would still have a range of expression close to that anyway: A macro could still dive into one of its syntax parameters and extract names from there into its own bag of tricks, so names wouldn't really be secrets between macros. A macro could still reconstruct a syntax parameter while inserting two occurrences of any name it likes, just to ensure that the two occurrences are equal. A macro could still do a hackish equality assertion by defining something by one name and looking up the definition by another. A macro could still do a hackish *inequality* assertion by installing two definitions under the (supposedly) two names.

If macros couldn't check names for equality, one thing a macro couldn't do... is to associate a variable binding site with a variable usage site. It couldn't act as a compiler of some other DSL, unless that DSL completely forewent the namespace system and just used string names everywhere. So people who have adventurous new syntaxes to try would want to build new namespace systems for them, and this macro system would have complicated the Cene language for no purpose that couldn't have been accomplished with an exhaustive suite of built-in syntaxes.

(**TODO**: Do nominal types already support an equality check? James Cheney's "Simple Nominal Type Theory" presents systems with and without equality checks. If this is very common, maybe we can rationalize this decision in terms of standard practice too.)

So, macros will be able to compare names for equality. As long as they can do that, we could promote better efficiency by permitting ordered comparisons instead of just equality checks. That way, names could be lookup keys in AVL trees and other efficiently indexed data structures.

It's tricky, because names have no natural ordering. Even if they were arbitrarily associated with strings and ordered that way, that ordering would not be stable in the face of capture-avoiding alpha-renaming! So whatever order we use, it will expose implementation details and make namespace sandboxing into a headache... unless, that is, the implementation details were hidden in a familiar way: By using obscure naming (and enforcing this obscurity with code-signing if necessary).

To wit, we can refrain from exposing implementation details by defining "metacompare" operations that usually work like "compare" operations, but sometimes return values that user-defined macro code doesn't know how to deconstruct. (The "meta" stands for "metacircular", under the idea that there may be a few layers of the reflective tower all running as macros in the same macroexpansion phase. Each layer must be implemented with obscure names that its interpreted layer doesn't know about.) Once we have metacomparison operations, we can provide encapsulated data structures that sort their data using a metacomparison.

If we just support encapsulated AVL trees, that might go a long way, especially if it serves as a complete model of computation over unordered collections. We can get quite a range of computational ability all at once if we simply add a metacomparator over the AVL trees themselves. For instance, that lets us detect emptiness by comparing to the empty tree, and it lets us detect singletonhood by looping over the entries and comparing to the singletons of each.

In the process, a lot of ugliness may arise: If concatenation of encapsulated AVL trees doesn't somehow check that their metacomparators are equivalent, we may end up with malformed encapsulated AVL trees that leak implementation details. We could potentially avoid this situation by passing some sort of equality certifier to the concatenation operation, but then we'd need a specialized language (or at least a collection of combinators) for defining equality certifiers. An easier approach would be to use a specialized language (or combinators) for the metacomparators themselves. This language would quickly resemble a static type system, much like our "cmpd" utilities already resemble algebraic data type definitions. So, this probably isn't worth solving until we take a typed approach.

For now, we can start small, merely providing a single metacomparator over names (`name-metacompare`), rather than aiming for efficiency and general computation. As long as we have that, we can use inefficient association lists to track free variables (`free-vars-object`).

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



## Layout of the definition namespace

During macroexpansion, Cene code may interact with the definition namespace by using operations like the referentially transparent `procure-name` and the monadic `procure-contribute-listener`. Even the built-in definitions reside in the definition namespace.

The namespace also has standard places to find fully qualified names for various concepts. These are just like any other name, but the specific location to obtain them from is standardized.

In the following namespace paths, the initial `.` represents the definition namespace, slashes followed by hyphenated identifiers or `<string: ___>` mean the sub-namespace keyed by the given string, slashes followed by any other `<___>` mean the sub-namespace keyed by the given name, slashes followed by `.name` mean the namespace's name, and slashes followed by `___.el` mean the namespace's contributed element keyed by the string `___`:

-
```
./<obscure name $$constructor-glossary>/<source main tag name>.el
```
A `constructor-glossary` value indicating the main tag name of the constructor representation and an ordered one-to-one mapping from source-level projection names to representation-level projection names. Projections should only be treated as an ordered list or referred to by the source-level names in manually keyboarded code and in macros that take manually keyboarded code as input.

-
```
./<obscure name $$macro-string-reference>/<string: macro name>.el
```
A value that can be invoked with the arguments of a macro call, as described in the documentation for `def-macro`.

-
```
./<obscure name $$function-implementations>/val.el

functions/<`constructor-tag` value>/call/val.el
```
Another namespace, on which `./<`constructor-tag` value>.el` is the place to associate a particular constructor with a particular function implementation. The function implementation is a value, usually a builtin or a value obtained by `function-implementation-from-cexpr`, that the Cene runtime can use to call a value of the specified constructor as a function with another value as its argument.

-

The usual definition forms generate various definitions (plus potential intermediate definitions using names the Cene program doesn't know how to obtain):

#### `(def-struct ...)`
  * The constructor glossary information desired.
  * A macro so that it's easy to construct and call values with this constructor. The macro implementation is a value user-level code doesn't know how to deconstruct, but it may be called as a macro.

#### `(defn ...)`
  * Constructor glossary information for a first-class representation of the function.
  * A macro so that it's easy to construct and call values with this constructor. The macro implementation is a value user-level code doesn't know how to deconstruct, but it may be called as a macro.
  * The function implementation desired. The function implementation is a value user-level code doesn't know how to deconstruct, and when called with an appropriate structure, it returns a callable value user-level code doesn't know how to deconstruct.

#### `(def-macro ...)`
  * The macro desired.
