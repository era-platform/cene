Macros
======


.. _istring-nil:

istring-nil
-----------

Construct with ``string``

An interpolated string s-expression that consists of a string with no interpolations.


.. _istring-cons:

istring-cons
------------

Construct with ``string-past interpolated string-rest``

.. todo:: Use this.

An interpolated string s-expression that consists of a string, a single interpolated value to go after that string, and a remaining interpolated string s-expression to go after that.


.. _foreign:

foreign
-------

Construct with ``val``

An s-expression that consists of any first-class value.

Most of the built-in macros expect a value embedded this way to be an (:ref:`obtain-by-unqualified-name` ...), an (:ref:`obtain-by-qualified-name` ...), or an (:ref:`obtain-directly` ...).


.. _scope:

scope
-----

Construct with ``unique-ns def-ns qualify``

A bundle of a unique namespace, a definition namespace, and a function to qualify unqualified names.

Macros use these values. A macro has access to the lexical scope and uniqueness where it was defined, as well as the lexical scope and uniqueness of its caller.


.. _macro-occurrence:

macro-occurrence
----------------

Construct with ``string``

.. todo:: Document this.


.. _local-occurrence:

local-occurrence
----------------

Construct with ``string``

.. todo:: Document this.


.. _constructor-occurrence:

constructor-occurrence
----------------------

Construct with ``string``

.. todo:: Document this.


.. _projection-occurrence:

projection-occurrence
---------------------

Construct with ``string main-tag-name``

.. todo:: Document this.


.. _obtain-by-unqualified-name:

obtain-by-unqualified-name
--------------------------

Construct with ``name``

A foreign occurrence in a Cene code s-expression that indicates something should be looked up by the qualification of the indicated unqualified name, instead of by the qualification of the name of a literal string.


.. _obtain-by-qualified-name:

obtain-by-qualified-name
------------------------

Construct with ``name``

A foreign occurrence in a Cene code s-expression that indicates something should be looked up by the indicated qualified name, instead of by the qualification of the name of a literal string.


.. _obtain-directly:

obtain-directly
---------------

Construct with ``val``

A foreign occurrence in a Cene code s-expression that indicates something should be looked up by just using the indicated value, instead of by the name of a literal string.


.. _isa-stx:

isa-stx
-------

Call with ``val``

Returns (:ref:`yep` (:ref:`nil`)) if the given value is a located s-expression (a value containing an s-expression and associated source location information) and (:ref:`nope` (:ref:`nil`)) otherwise.


.. _s-expr-layer-from-stx:

s-expr-layer-from-stx
--------------------

Call with ``stx``

Given a located s-expression, returns either a :ref:`foreign`, a :ref:`cons` and :ref:`nil` list of located s-expressions, or a :ref:`istring-cons` and :ref:`istring-nil` string interpolated with located s-expressions. This operation can be repeated recursively to obtain an s-expression value with no source location information at all.


.. _stx-details-from-stx:

stx-details-from-stx
--------------------

Call with ``stx``

Given a located s-expression, returns a syntax details value (a value designating the source location information).


.. _stx-from-details-and-layer:

stx-from-details-and-layer
--------------------------

Call with ``stx-details s-expr-layer``

Given a syntax details value and an s-expression layer (a :ref:`foreign`, a :ref:`cons` and :ref:`nil` list of located s-expressions, or a :ref:`istring-cons` and :ref:`istring-nil` string interpolated with located s-expressions), returns a located s-expression which returns that s-expression layer when :ref:`stx-details-from-stx` is called. The syntax details are used to enrich the resulting located s-expression's source location information.


.. _stx-details-empty:

stx-details-empty
-----------------

Call with ``(ignored)``

Returns a syntax details value that conveys no information.


.. _stx-details-join:

stx-details-join
----------------

Call with ``outer inner``

Given an outer syntax details value and an inner syntax details value, returns a syntax details value that conveys the same information as each of them, one wrapping the other.


.. _stx-details-macro-call:

stx-details-macro-call
----------------------

Call with ``call-stx-details macro-name-stx-details``

Given a syntax details value corresponding to a macro call location and a syntax details value corresponding to the location of the macro name in that macro call, returns a syntax details value suitable for tagging syntax created by that macro call.


.. _procure-claim:

procure-claim
-------------

Call with ``ns``

Monadically, writes to a standard but obscure location known as ``$$claimed`` in the given namespace.

The point of this is to ensure that two macro calls that use the same unique namespace will cause an error. All the built-in macros write to this location on their given unique namespaces.


.. _procure-macro-implementation-getdef:

procure-macro-implementation-getdef
-----------------------------------

Call with ``ns macro-name``

From a standard but obscure location known as ``$$macro-implementation`` in the given namespace, obtains a getdef that is used to associate the given macro name with a macro implementation.


.. _cexpr-var:

cexpr-var
---------

Call with ``var``

Given a name, returns a compiled expression with just that name in its free variables. It represents an expression which looks up a local variable by the given name.


.. _cexpr-reified:

cexpr-reified
-------------

Call with ``val``

Given any value, returns a compiled expression with no free variables. It represents an expression that returns the given value.


.. _cexpr-located:

cexpr-located
-------------

Call with ``stx-details body``

Given a syntax details value and a compiled expression, returns another compiled expression that's effectively the same as the given one, but attributed to the given syntax details.


.. _cexpr-let:

cexpr-let
---------

Call with ``bindings body``

Given an ordered :ref:`assoc` list from mutually unique names to compiled expressions, and given a compiled expression ``body``, returns another compiled expression with the union of the ``bindings`` expressions' free variables and all but the given variables out of the free variables of ``body``. It represents an expression which runs the binding expressions in order followed by the body expression. The results of the binding expressions are in scope as local variables with the given names in the body expression.


.. _let:

let
---

Macro. Example: ``(let a (nil) b (nil) (append a b))``

.. todo:: Document this.


.. _eval-cexpr:

eval-cexpr
----------

Call with ``mode cexpr``

Given a compiled expression, executes it to produce a result. The compiled expression must have no free variables. The given mode must be current, and it must allow for macroexpansion-time side effects.


.. _compile-expression-later:

compile-expression-later
------------------------

Call with ``caller-scope stx (fn result)``

Monadically, macroexpands the given ``stx`` in a later tick, allowing the macro calls to monadically install definitions over the course of any number of ticks, and either monadically invokes the given callback with the resulting compiled expression itself, or passes the callback on to a macro implementation to do it.

.. note:: This isn't a built-in operation. It's defined in era-prelude.cene.

..
  TODO: Since this isn't a builtin, put this documentation somewhere else. We'll probably want a place for documenting the contents of era-prelude.cene, but that's a very volatile area. They'll be out of date fast.


.. _read-all-force:

read-all-force
--------------

Call with ``string``

.. todo:: Document this.


.. _def-macro:

def-macro
---------

Macro. Example::

  (def-macro list home-scope caller-scope my-stx-details args then
    (basic-pure-macro home-scope caller-scope my-stx-details then
    /fn mode caller-scope s mac
    /foldr args (c mac str.nil /nil) /fn first rest
      (c mac str.cons /cons first /cons rest /nil)))

Defines a macro. The first argument is a syntactic name ((:ref:`istring-nil` ``<string>``) or (:ref:`foreign` ``<name>``)) for the macro. The rest of the arguments are the parameters and body of a curried function. The function will be called immediately with the :ref:`scope` where the macro is defined, and the result will then be called whenever a macro by the given syntactic name is expanded.

..
  TODO: Document the namespaces used to resolve syntactic names and to define the macro.
  TODO: Document that this returns (:ref:`nil`).

When a macro is expanded, its implementation function is called with several arguments: ``caller-scope my-stx-details args then``

``caller-scope``: A (:ref:`scope` ``unique-ns def-ns qualify``) value representing the caller's scope.

The ``caller-scope``'s ``unique-ns``: A namespace that is supposedly used exclusively for this macroexpansion. It's useful in the way that gensyms are typically useful in other macro-capable languages, but the uniqueness is achieved by playing along: If the macro compiles more than one subexpression, each subexpression should be given a ``unique-ns`` derived in different ways from each other.

The ``caller-scope``'s ``def-ns``: A namespace that is supposedly shared across all nearby macroexpansions. If the macro needs to install any definitions or look up any definitions using names that come from the caller, this is the namespace for that purpose. It should usually be passed as-is to any compiled subexpressions, except when a macro needs to establish a local definition scope.

The ``caller-scope``'s ``qualify``: A function that takes an unqualified name and returns a qualified name. This is useful for establishing local definition scopes that work by translating the local names to obscure global names.

``my-stx-details``: A collection of source location information. This is a value user-level code doesn't know how to deconstruct, but it conveys information about this macro invocation, so the macro can attach it to the located s-expressions it creates in order to receive proper attribution for them; see :ref:`stx-from-details-and-layer`.

..
  TODO: Figure out what the format of source location information actually is. For now, this is sort of just an unspecified area, but at least a language implementation can use this to hold filenames and line numbers in practice. An implementation should be able to treat this as a completely empty data structure; it's not needed for any variable scoping purposes.

``args``: The cons list of located s-expressions that correspond to the subexpressions at the macro call site.

``then``: A callable value that takes a compiled expression and returns a monadic effect. Invoking this effect causes the compiled expression to be used as the macro result. A macro should invoke this effect exactly once. The effect doesn't necessarily need to be invoked right away; the macro can use :ref:`later` to invoke more effects in a future tick.

The macro's return value is a monadic effect, which will be invoked by the macroexpander.
