Integers
========


.. _cline-int:

cline-int
---------

Call with ``(ignored)``

Returns a cline that applies to all integers in ascending order.


.. _int-zero:

int-zero
--------

Call with ``(ignored)``

Returns the integer 0.


.. _int-one:

int-one
-------

Call with ``(ignored)``

Returns the integer 1.


.. _fuse-int-by-plus:

fuse-int-by-plus
----------------

Call with ``(ignored)``

Returns a fuse that fuses integers by adding them together.


.. _fuse-int-by-times:

fuse-int-by-times
-----------------

Call with ``(ignored)``

Returns a fuse that fuses integers by multiplying them.


.. _int-minus:

int-minus
---------

Call with ``minuend subtrahend``

Subtracts the second given integer from the first.


.. _int-div-rounded-down:

int-div-rounded-down
--------------------

Call with ``dividend divisor``

Divides the first given integer by the second. Returns (:ref:`nil`) for a zero divisor or otherwise (:ref:`carried` ``<quotient>`` ``<remainder>``), where ``<quotient>`` is the greatest integer that when multiplied by the divisor is no greater than the dividend and ``<remainder>`` is the remaining amount that must be added to reach the dividend.


.. _carried:

carried
-------

Construct with ``main carry``

An approximated value along with a carry value that makes up for the missing information.

This constructor is needed to deconstruct the result of :ref:`int-div-rounded-down`.
