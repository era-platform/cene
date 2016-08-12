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

Call with ``dexable-key maybe-val table``

.. todo:: Document this.


.. _table-zip:

table-zip
---------

Call with ``as bs (fn key-table maybe-a maybe-b)``

Given two tables and a function, makes a new table by iterating over the tables' combined set of keys; calling the function with a singleton table with (:ref:`nil`) under that key and with both tables' (:ref:`yep` ...) or (:ref:`nil`) obtained by that key; and using the function's (:ref:`yep` ...) or (:ref:`nil`) result to determine the value for the final table. The function will never be called with (:ref:`nil`) and (:ref:`nil`).


.. _tables-fuse:

tables-fuse
-----------

Call with ``a b fuse``

Given two tables and a fuse, fuses all the values of both tables together into a single (:ref:`yep` ...) or (:ref:`nil`) result. If neither table has any values, the result is (:ref:`nil`).

..
  TODO: See if we can add these notes to the documentation.
  
  NOTE: Due to :ref:`tables-fuse`, clients can see the contents of the table as a finite multiset of values, even if they don't have the keys. Due to :ref:`tables-fuse`, :ref:`table-zip`, and :ref:`procure-sub-ns-table`, they can observe keys in terms of other keys, but they still can't view them directly.
  
  If you want a table where clients can iterate over the keys too, make a table where the values are key-value pairs.
  
  If you want a table where clients can't see the values unless they know the keys, try using values that are themselves encapsulated, or try holding the table inside something encapsulated. (This is really open-ended advice, but there are also many possible interpretations of this requirement.)
  
  If you want a table where multiplicity of values doesn't matter, try defining an encapsulated type that replicates most of the table operations but requires a dex for values (in addition to a dex for keys) and only allows :ref:`tables-fuse` for a merge, not a general fuse.
  
  If you want an orderless collection whose equality with other collections is based only on what elements are present, and not which keys they're looked up by, try using the same value as both the key and the value.


.. _table-get:

table-get
---------

Call with ``dexable-key table``

.. todo:: Document this.

..
  NOTE: Due to :ref:`table-zip` and :ref:`tables-fuse`, this is redundant, but we keep it for efficiency.
