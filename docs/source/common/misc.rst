Miscellaneous
=============


.. _nil:

nil
---

Construct with no projections

A value that signifies an optional value that has been omitted, an ordered comparison that resulted in equality, or an empty list.


.. _yep:

yep
---

Construct with ``val``

A value that signifies a successful result, an optional value that is present, or an ordered comparison that determines the inputs were successfully in ascending order already.


.. _nope:

nope
----

Construct with ``nope``

A value that signifies an unsuccessful result or an ordered comparison that determines the inputs were not successfully in ascending order already.


.. _cons:

cons
----

Construct with ``car cdr``

Represents a linked list with the indicated ``car`` as its head element and the indicated ``cdr`` as its linked list tail.


.. _assoc:

assoc
-----

Construct with ``key val``

Represents a key-value pair.

A linked list can have these as its elements to represent an ordered mapping known as an association list.
