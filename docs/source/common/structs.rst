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


.. _make-tuple-tag:

make-tuple-tag
--------------

Call with ``tuple-name proj-names``

Takes a name for the constructor and a list of names for the projections, and returns the name used to dynamically tag a tuple of that combination of names. The projection name list must be made out of (:ref:`cons` ``car cdr``) and (:ref:`nil`) values, with elements that are strings, and the list must not have duplicates. The order of the list will be ignored.

..
  TODO: For now, this is the only thing that actually uses :ref:`cons` outside of a macro context. Even this should be changed to use tables, though. If anything else uses :ref:`cons`, we should take :ref:`cons` out of the macro docs and put it in miscellaneous.


.. function-implementation-opaque:

function-implementation-opaque
------------------------------

Call with ``impl``

.. todo:: Document this.


.. _def-struct:

def-struct
--------

Macro. Example: ``(def-struct cons car cdr)``

.. todo:: Document this.


.. _defn:

defn
----

Macro. Example::

  (defn rev-append rev-past rest
    (case rev-past cons elem rev-past
      (c-new rev-append rev-past /cons elem rest)
      rest))

.. todo:: Document this.


.. _case:

case
----

Macro. Example::

  (case rev-past cons elem rev-past
    (c-new rev-append rev-past /cons elem rest)
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
  /c-new rev-append rev-past /cons elem rest)

.. todo:: Document this.


.. _isa:

isa
---

Macro. Example: ``(isa nil /append (nil) (nil))``

.. todo:: Document this.


.. _proj1:

proj1
-----

Macro. Example: ``(proj1 yep /risky-operation/nil)``

.. todo:: Document this.


.. _c:

c
-

Macro. Example: ``(c combiner a b)``

.. todo:: Document this.


.. _c-new:

c-new
-----

Macro. Example: ``(c-new rev-append rev-past /cons elem rest)``

.. todo:: Document this.


.. _fn:

fn
--

Macro. Example: ``(fn a b /int-minus b a)``

.. todo:: Document this.
