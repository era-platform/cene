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

An s-expression that consists of any first-class value, but usually an (:ref:`obtain-by-unqualified-name` ...), an (:ref:`obtain-by-qualified-name` ...), an (:ref:`obtain-directly` ...), or a name. The program may not know of a way to encode the name as serializable data, but it can still be passed to (:ref:`compile-expression` ...).


.. _scope:

scope
-----

Construct with ``unique-ns def-ns qualify``

A bundle of a unique namespace, a definition namespace, and a function to qualify unqualified names.

Macros use these values. A macro has access to the lexical scope and uniqueness where it was defined, as well as the lexical scope and uniqueness of its caller.


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


.. _stx:

stx
---

Construct with ``stx-details s-expr``

An s-expression tagged with source location information.


.. _macro-stx-details:

macro-stx-details
-----------------

Call with ``mode unique-ns definition-ns stx``

Constructs a syntax details object that refers to a macro's input, so that the macro's output can be associated with it. The ``stx`` must be a located cons list whose first element is a string or foreign name referring to a macro. The ``mode`` doesn't need to be the current modality; it's just part of the macro call information.


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


.. _compiled-code-from-cexpr:

compiled-code-from-cexpr
------------------------

Call with ``cexpr``

Given a compiled expression, returns compiled code in a format suitable for a macroexpansion result. The compiled expression must have no free variables.

.. todo:: Refactor macroexpansion so it expects a compiled expression, instead of having two different formats for this.


.. _compile-expression:

compile-expression
------------------

Call with ``caller-scope stx out-definer``

Monadically, macroexpands the given ``stx`` in a later tick, allowing the macro calls to monadically install definitions over the course of any number of ticks and produce compiled code in a format suitable for a macroexpansion result. If the compiled code is successfully computed, it is defined in the given ``out-definer``.

..
  TODO: Decide if this should conform to the ``...-later`` calling convention with a simple callback or if all the ``...-later`` utilities should instead conform to the :ref:`compile-expression` calling convention with an ``out-definer``.


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
    /fn unique-ns s mac
    /foldr args (c s /c mac str.nil /nil) /fn first rest
      (c s /c mac str.cons /cons first /cons rest /nil)))

Defines a macro. The first argument is a syntactic name ((:ref:`istring-nil` ``<string>``) or (:ref:`foreign` ``<name>``)) for the macro. The rest of the arguments are the parameters and body of a curried function. The function will be called immediately with the :ref:`scope` where the macro is defined, and the result will then be called whenever a macro by the given syntactic name is expanded.

..
  TODO: Document the namespaces used to resolve syntactic names and to define the macro.
  TODO: Document that this returns (:ref:`nil`).

When a macro is expanded, its implementation function is called with several arguments: ``caller-scope my-stx-details args then``

``caller-scope``: A (:ref:`scope` ``unique-ns def-ns qualify``) value representing the caller's scope.

The ``caller-scope``'s ``unique-ns``: A namespace that is supposedly used exclusively for this macroexpansion. It's useful in the way that gensyms are typically useful in other macro-capable languages, but the uniqueness is achieved by playing along: If the macro compiles more than one subexpression, each subexpression should be given a ``unique-ns`` derived in different ways from each other.

The ``caller-scope``'s ``def-ns``: A namespace that is supposedly shared across all nearby macroexpansions. If the macro needs to install any definitions or look up any definitions using names that come from the caller, this is the namespace for that purpose. It should usually be passed as-is to any compiled subexpressions, except when a macro needs to establish a local definition scope.

The ``caller-scope``'s ``qualify``: A function that takes an unqualified name and returns a qualified name. This is useful for establishing local definition scopes that work by translating the local names to obscure global names.

``my-stx-details``: A collection of source location information. This is a value user-level code doesn't know how to deconstruct, but it conveys information about this macro invocation, so the macro can attach it to the :ref:`stx` values it creates in order to receive proper attribution for them.

..
  TODO: Figure out what the format of source location information actually is. For now, this is sort of just an unspecified area, but at least a language implementation can use this to hold filenames and line numbers in practice. An implementation should be able to treat this as a completely empty data structure; it's not needed for any variable scoping purposes.

``args``: The cons list of (:ref:`stx` ``stx-details s-expr``) values that correspond to the subexpressions at the macro call site.

``then``: A callable value that takes compiled code (the result of :ref:`compile-expression`) and returns a monadic effect. Invoking this effect causes the compiled code to be used as the macro result. The macro must invoke this effect exactly once, or else there's an error. The effect doesn't necessarily need to be invoked right away; the macro can use :ref:`later` to invoke more effects in a future tick.

The macro's return value is a monadic effect, which will be invoked by the macroexpander.
