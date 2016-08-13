Effects, modalities, and definers
=================================


.. _no-effects:

no-effects
----------

Call with ``(ignored)``

Monadically, does nothing.


.. _join-effects:

join-effects
------------

Call with ``a b``

Monadically, performs the effects of both of the given monadic computations.


.. _get-mode:

get-mode
--------

Call with ``(fn mode)``

Monadically, passes the current modality to the given monadic callback in the same tick.

A modality must be passed to certain effectful primitives as a way to give the effects something to be deterministic by. (The terms "mode" and "modality" might be idiosyncrasies of Cene. A more standard term is "world-passing style.")


.. _assert-current-mode:

assert-current-mode
-------------------

Call with ``mode``

Returns (:ref:`nil`). The given modality must be the current one. If it isn't, this causes an error.


.. _later:

later
-----

Call with ``effects``

Monadically, executes the given monadic computation in a later tick.

This is useful mainly for concurrency. It allows the given computation to depend on values that might not be available right now.


.. _make-promise-later:

make-promise-later
------------------

Call with ``(fn getdef)``

Monadically, creates a new uninitialized piece of state, and calls a monadic callback in a later tick with a getdef that retrieves and defines the value of that state.

**Rationale**: Cene expressions are designed so they can have consistent performance each time they run. Therefore, algorithms written as Cene expressions cannot rely on laziness or JIT techniques (even though an implementation of Cene may in fact implement such things as optimizations). However, laziness is useful to reduce the amortized computational complexity of data structures like finger trees, which are good for representing strings. To support this data structure technique, Cene offers :ref:`make-promise-later`, a standard way to allocate promise state even from a computation that has no other access to state.

Not all Cene modalities will necessarily support the :ref:`make-promise-later` side effect. However, the macroexpansion and unit test modalities do, and that's everything for now.


.. _getdef:

getdef
------

Construct with ``get def``

A value that indicates a function ``get`` that takes a mode and obtains a value, along with indicating a definer ``def`` to determine that value.


.. _definer-define:

definer-define
--------------

Call with ``definer value``

Monadically, writes to the given definer. If the definition cannot be installed, the program is in error; other computations that depend on the defined value may or may not be canceled or retroactively voided.


.. _definer-commit-later:

definer-commit-later
--------------------

Call with ``definer effects``

.. todo:: Implement and use this.

Monadically, executes the effects in a later tick and commits to writing to the given definer in that tick or later. This is only useful to suppress error messages about the definition not existing if there's an error in this logical thread.
