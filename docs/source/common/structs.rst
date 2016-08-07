Structs
=======


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


.. _def-type:

def-type
--------

Macro. Example: ``(def-type cons car cdr)``

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
