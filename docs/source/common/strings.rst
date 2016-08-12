Strings
=======


.. _dex-string:

dex-string
----------

Call with ``(ignored)``

.. todo:: Document this.


.. _string-empty:

string-empty
------------

Call with ``(ignored)``

.. todo:: Document this.


.. _string-singleton:

string-singleton
----------------

Call with ``unicode-scalar``

.. todo:: Document this.


.. _string-append-later:

string-append-later
-------------------

Call with ``a b (fn result)``

Monadically, concatenates two strings, and calls the given callback monadically in a future tick.


.. _str:

str
---

Macro. Example: ``str.\;qq[Hello, world!]``

Obtains a first-class string value with the given literal text.


.. _string-length:

string-length
-------------

Call with ``string``

.. todo:: Document this.


.. _string-get-unicode-scalar:

string-get-unicode-scalar
-------------------------

Call with ``string start``

.. todo:: Document this.


.. _string-cut-later:

string-cut-later
----------------

Call with ``string start stop (fn substring)``

.. todo:: Document this.
