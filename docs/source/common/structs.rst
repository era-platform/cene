Structs and function calls
==========================


.. _cexpr-dex-struct:

cexpr-dex-struct
----------------

Call with ``main-tag-name projections``

Given a main tag name and an ordered :ref:`assoc` list from mutually unique projection names to compiled expressions, returns another compiled expression with the union of their free variables. It represents an expression that returns a dex of the specified constructor which applies a different dex to each projection.


.. _dex-struct:

dex-struct
----------

Macro. Example:
``(dex-struct cons (dex-struct nil) (dex-struct nil))``

.. todo:: Document this.


.. _cexpr-merge-struct:

cexpr-merge-struct
------------------

Call with ``main-tag-name projections``

Given a main tag name and an ordered :ref:`assoc` list from mutually unique projection names to compiled expressions, returns another compiled expression with the union of their free variables. It represents an expression that returns a merge of the specified constructor which applies a different merge to each projection.


.. _merge-struct:

merge-struct
------------

Macro. Example:
``(merge-struct cons (merge-struct nil) (merge-struct nil))``

.. todo:: Document this.


.. _cexpr-fuse-struct:

cexpr-fuse-struct
-----------------

Call with ``main-tag-name projections``

Given a main tag name and an ordered :ref:`assoc` list from mutually unique projection names to compiled expressions, returns another compiled expression with the union of their free variables. It represents an expression that returns a fuse of the specified constructor which applies a different fuse to each projection.


.. _fuse-struct:

fuse-struct
-----------

Macro. Example:
``(fuse-struct cons (fuse-struct nil) (fuse-struct nil))``

.. todo:: Document this.


.. _cexpr-construct:

cexpr-construct
---------------

Call with ``main-tag-name projections``

Given a main tag name and an ordered :ref:`assoc` list from mutually unique projection names to compiled expressions, returns another compiled expression with the union of their free variables. It represents a construction of the specified constructor.


.. _cexpr-case:

cexpr-case
----------

Call with ``subject main-tag-name bindings then else``

Given a main tag name, a compiled expression ``subject``, a table from projection names to mutually unique local variable names, a compiled expression ``then``, and a compiled expression ``else``, returns another compiled expression with all the free variables of ``subject`` and ``else`` and all but the given local variable names out of the free variables of ``then``. It represents a destructuring branch that conditionally evaluates ``then`` or ``else`` depending on whether ``subject`` has the specified constructor.


.. _case:

case
----

Macro. Example::

  (case rev-past cons elem rev-past
    (rev-append rev-past /cons elem rest)
    rest)

.. todo:: Document this.


.. _cexpr-call:

cexpr-call
----------

Call with ``func arg``

Given two compiled expressions, returns another compiled expression with the union of their free variables. It represents a function call invoking the first expression's result with the second expression's result.


.. _c:

c
-

Macro. Example: ``(c combiner a b)``

.. todo:: Document this.


.. _constructor-tag:

constructor-tag
---------------

Construct with ``main-tag projections``

A value that refers to the tag of a struct value with the indicated main tag name and the projection names appearing as keys in the indicated table of (:ref:`nil`).

Function behaviors are associated with this aspect of a struct, so this struct is the kind of value :ref:`procure-function-definer` expects. A :ref:`defn` call builds and uses this value internally.


.. _function-implementation-from-cexpr:

function-implementation-from-cexpr
----------------------------------

Call with ``cexpr``

Given a compiled expression, returns a compiled function implementation. Whenever this implementation is used, the expression will be evaluated, and its result will be invoked with the value being called and the argument it's being called with. The expression must have no free variables.


.. _constructor-glossary:

constructor-glossary
--------------------

Construct with ``main-tag source-to-rep``

Indicates a constructor's main tag name and an :ref:`assoc` list mapping mutually unique source-level names to the constructor's mutually unique projection names. This is a data structure :ref:`def-struct` puts in the definition namespace usin :ref:`procure-constructor-glossary-getdef` so macros like :ref:`case` can determine details of a constructor based on a source-level name. The names used in the representation of the constructor may be different from the names used in the source code.


.. _procure-constructor-glossary-getdef:

procure-constructor-glossary-getdef
-----------------------------------

Call with ``ns source-main-tag-name``

From a standard but obscure location known as ``$$constructor-glossary`` in the given namespace, obtains a getdef that is used to associate the given source-level main tag name with data about a constructor. The built-in macros that deal with constructors (e.g. :ref:`case`) will expect the value to be a (:ref:`constructor-glossary` ...) struct containing a main tag name and an :ref:`assoc` list mapping mutually unique source-level projection names to the mutually unique projection names that are actually used in the struct's representation.


.. _copy-function-implementations:

copy-function-implementations
-----------------------------

Call with ``from-ns to-ns``

Monadically, blocks until the first given namespace has a function implementation namespace defined (at a standard but obscure location known as ``$$function-implementations``) and defines it in the second given namespace.


.. _committing-to-define-function-implementations:

committing-to-define-function-implementations
---------------------------------------------

Call with ``ns effects``

.. todo:: Implement and use this.

Monadically, executes the given effects in a later tick and commits to defining a function implementation namespace on the given namespace (using :ref:`copy-function-implementations`) in that tick or later.

This is only useful to suppress error messages about the definition not existing if there's an error in this logical thread.


.. _procure-function-definer:

procure-function-definer
------------------------

Call with ``ns constructor-tag``

Blocks until the given namespace has a function implementation namespace defined (at a standard but obscure location known as ``$$function-implementations``) and obtains a definer that establishes an association from a given :ref:`constructor-tag` to a defined compiled function implementation.


.. _def-struct:

def-struct
----------

Macro. Example: ``(def-struct cons car cdr)``

.. todo:: Document this.


.. _defn:

defn
----

Macro. Example::

  (defn rev-append rev-past rest
    (case rev-past cons elem rev-past
      (rev-append rev-past /cons elem rest)
      rest))

.. todo:: Document this.


.. _caselet:

caselet
-------

Macro. Example::

  (caselet combiner-result (c combiner a b) yep -
    combiner-result
  /do-something-else/nil)

.. todo:: Document this.


.. _cast:

cast
----

Macro. Example::

  (cast rev-past cons elem rev-past
    rest
  /rev-append rev-past /cons elem rest)

.. todo:: Document this.


.. _fn:

fn
--

Macro. Example: ``(fn a b /int-minus b a)``

.. todo:: Document this.
