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

An s-expression that consists of an embedded value of any type, but usually a name. The program may not know of a way to encode the name as serializable data, but it can still be passed to (:ref:`compile-expression` ...).


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


.. _procure-macro-implementation-getdef:

procure-macro-implementation-getdef
-----------------------------------

Call with ``ns macro-name``

From a standard but obscure location known as ``$$macro-implementation`` in the given namespace, obtains a getdef that is used to associate the given macro name with a macro implementation.


.. _compile-expression:

compile-expression
------------------

Call with ``unique-ns definition-ns stx out-definer``

Monadically, macroexpands the given ``stx`` in a later tick, allowing the macro calls to monadically install definitions over the course of any number of ticks and produce a fully compiled expression. If the expression is successfully computed, it is defined in the given ``out-definer``.

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

  (def-macro list unique-ns definition-ns my-stx-details args then
    (basic-pure-macro unique-ns definition-ns my-stx-details then
    /fn unique-ns s mac
    /foldr args (c s /c mac str.nil /nil) /fn first rest
      (c s /c mac str.cons /cons first /cons rest /nil)))

Defines a macro. The first argument is a syntactic name ((:ref:`istring-nil` ``<string>``) or (:ref:`foreign` ``<name>``)) for the macro. The rest of the arguments are the parameters and body of a curried function. The function will be called whenever a macro by the given syntactic name is expanded.

..
  TODO: Document the namespaces used to resolve syntactic names and to define the macro.
  TODO: Document that this returns (:ref:`nil`).

When a macro is expanded, its implementation function is called with several arguments: ``unique-ns definition-ns my-stx-details args then``

``unique-ns``: A namespace that is supposedly used exclusively for this macroexpansion. It's useful in the way that gensyms are typically useful in other macro-capable languages, but the uniqueness is achieved by playing along: If the macro compiles more than one subexpression, each subexpression should be given a ``unique-ns`` derived in different ways from each other.

``definition-ns``: A namespace that is supposedly shared across all nearby macroexpansions. If the macro needs to install any definitions or look up any definitions, this is the namespace for that purpose. It should usually be passed as-is to any compiled subexpressions, except when a macro needs to establish a local definition scope.

``my-stx-details``: A collection of source location information. This is a value user-level code doesn't know how to deconstruct, but it conveys information about this macro invocation, so the macro can attach it to the :ref:`stx` values it creates in order to receive proper attribution for them.

..
  TODO: Figure out what the format of source location information actually is. For now, this is sort of just an unspecified area, but at least a language implementation can use this to hold filenames and line numbers in practice. An implementation should be able to treat this as a completely empty data structure; it's not needed for any variable scoping purposes.

``args``: The cons list of (:ref:`stx` ``stx-details s-expr``) values that correspond to the subexpressions at the macro call site.

``then``: A callable value that takes compiled code (the result of :ref:`compile-expression`) and returns a monadic effect. Invoking this effect causes the compiled code to be used as the macro result. The macro must invoke this effect exactly once, or else there's an error. The effect doesn't necessarily need to be invoked right away; the macro can use :ref:`later` to invoke more effects in a future tick.

The macro's return value is a monadic effect, which will be invoked by the macroexpander.


.. _let:

let
---

Macro. Example: ``(let a (nil) b (nil) (append a b))``

.. todo:: Document this.
