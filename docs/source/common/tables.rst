Tables
======


.. _dex-table:

dex-table
---------

Call with ``val-dex``

.. todo:: Document this.


.. _merge-table:

merge-table
-----------

Call with ``val-merge``

.. todo:: Document this.


.. _fuse-table:

fuse-table
----------

Call with ``val-fuse``

.. todo:: Document this.


.. _table-empty:

table-empty
-----------

Call with ``(ignored)``

.. todo:: Document this.


.. _table-shadow:

table-shadow
------------

Call with ``key maybe-val table``

.. todo:: Document this.


.. _table-get:

table-get
---------

Call with ``key table``

.. todo:: Document this.


.. _table-map-fuse:

table-map-fuse
--------------

Call with ``table fuse (fn key)``

Given a table, a fuse, and a function, calls that function with each key of the table, and returns a (:ref:`yep` ...) containing the fused value of all the function results. If the table is empty or if any element is outside the fuse's domain, this returns (:reF:`nil`) instead.

..
  TODO: See if we can add these notes to the documentation.
  
  NOTE: We can model multisets as tables if we have the ability to obtain sufficiently unique keys.
  
  If you want a table where clients can't see the values unless they know the keys, try using values that are themselves encapsulated, or try holding the table inside something encapsulated. (This is really open-ended advice, but there are also many possible interpretations of this requirement.)
  
  If you want a table that models a set rather than a multiset, try defining an encapsulated value that replicates most of the table operations but requires a dex for values, and where the key is the value's own name.


.. _table-sort:

table-sort
----------

Call with ``cline table``

Given a cline and a table, returns (:ref:`yep` ``<ranks>``) or (:ref:`nil`), where ``<ranks>`` is a :ref:`cons` list of tables that partition that table's entries. The result tables are in the order determined by the cline, and no two elements of a single result table are candidly ordered with respect to each other using that cline. The result is (:ref:`nil`) if any element of the table doesn't belong to the cline's domain.
