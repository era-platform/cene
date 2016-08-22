Unit tests
==========


.. _test-async:

test-async
----------

Macro. Example::

  (test-async (dex-string/nil)
    (fn out
      (string-append-later str.\;qq[Hello,\s] str.\;qq[world!] /fn str
      /definer-define out str))
    (fn out /definer-define out str.\;qq[Hello, world!]))

.. todo:: Document this.
