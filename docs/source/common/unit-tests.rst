Unit tests
==========


.. _test-async:

test-async
----------

Macro. Example::

  (test-async (dex-string/nil)
    (fn out
      (string-append-later str.\;qq[Hello,\s] str.\;qq[world!] /fn str
      /definer-define out (dex-give-up/nil) str))
    (fn out
      (definer-define out (dex-give-up/nil) str.\;qq[Hello, world!])))

.. todo:: Document this.
