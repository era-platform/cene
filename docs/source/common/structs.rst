Structs and function calls
==========================


.. _dex-struct:

dex-struct
----------

Macro. Example:
``(dex-struct cons (dex-struct nil) (dex-struct nil))``

.. todo:: Document this.


.. _merge-struct:

merge-struct
------------

Macro. Example:
``(merge-struct cons (merge-struct nil) (merge-struct nil))``

.. todo:: Document this.


.. _fuse-struct:

fuse-struct
-----------

Macro. Example:
``(fuse-struct cons (fuse-struct nil) (fuse-struct nil))``

.. todo:: Document this.


.. _constructor-tag:

constructor-tag
---------------

Construct with ``main-tag projections``

A value that refers to the tag of a struct value with the indicated main tag name and the projection names appearing as keys in the indicated table of (:ref:`nil`).

Function behaviors are associated with this aspect of a struct, so this struct is the kind of value :ref:`procure-function-definer` expects. A :ref:`defn` call builds and uses this value internally.


.. _function-implementation-opaque:

function-implementation-opaque
------------------------------

Call with ``impl``

.. todo:: Document this.


.. _constructor-glossary:

constructor-glossary
--------------------

Construct with ``main-tag source-to-rep``

Indicates a constructor's main tag name and an association list (list of :ref:`assoc`) mapping mutually unique source-level names to the constructor's mutually unique projection names. This is a data structure :ref:`def-struct` puts in the definition namespace usin :ref:`procure-constructor-glossary-getdef` so macros like :ref:`case` can determine details of a constructor based on a source-level name. The names used in the representation of the constructor may be different from the names used in the source code.


.. _procure-constructor-glossary-getdef:

procure-constructor-glossary-getdef
-----------------------------------

Call with ``ns source-main-tag-name``

From a standard but obscure location known as ``$$constructor-glossary`` in the given namespace, obtains a getdef that is used to associate the given source-level main tag name with data about a constructor. The built-in macros that deal with constructors (e.g. :ref:`case`) will expect the value to be a (:ref:`constructor-glossary` ...) struct containing a main tag name and an association list (list of :ref:`assoc`) mapping mutually unique source-level projection names to the mutually unique projection names that are actually used in the struct's representation.


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


.. _case:

case
----

Macro. Example::

  (case rev-past cons elem rev-past
    (rev-append rev-past /cons elem rest)
    rest)

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


.. _isa:

isa
---

Macro. Example: ``(isa nil /append (nil) (nil))``

.. todo:: Document this.


.. _c:

c
-

Macro. Example: ``(c combiner a b)``

.. todo:: Document this.


.. _fn:

fn
--

Macro. Example: ``(fn a b /int-minus b a)``

.. todo:: Document this.
