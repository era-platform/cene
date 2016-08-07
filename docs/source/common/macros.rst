Macros
======


.. _cons:

cons
----

Construct with ``car cdr``

Represents a linked list with the indicated car as its head element and the indicated cdr as its linked list tail.


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


.. _compile-expression:

compile-expression
------------------

Call with ``unique-ns definition-ns stx out-definer``

Monadically, macroexpands the given `stx` in a later tick, allowing the macro calls to monadically install definitions over the course of any number of ticks and produce a fully compiled expression. If the expression is successfully computed, it is defined in the given ``out-definer``.

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

Macro. Example:
``(fuse-struct cons (fuse-struct nil) (fuse-struct nil))``

.. todo:: Document this.


.. _let:

let
---

Macro. Example: ``(let a (nil) b (nil) (append a b))``

.. todo:: Document this.
