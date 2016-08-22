Errors and conscience
=====================


.. _follow-heart:

follow-heart
------------

Call with ``clamor``

Does whatever is best, considering only the information in the given clamor. (Any value can be a clamor, but some values have no other purpose.)

Different implementations of the Cene language may encode different understandings of what is best. However, if they recognize a particular kind of clamor value, they will usually implement it as the clamor value's own design intends.

In the present implementation of Cene, a program that follows its heart always terminates with an error. If the clamor is a :ref:`clamor-err`, the error message is a little bit nicer.


.. _clamor-err:

clamor-err
----------

Construct with ``message``

A clamor that recommends for the program to terminate with the indicated error message.


.. _err:

err
---

Macro. Example: ``err.\;qq[Divided by zero]``

Makes a call to :ref:`follow-heart` using a :ref:`clamor-err` with the given error message. This recommends for the program to terminate with that message.
