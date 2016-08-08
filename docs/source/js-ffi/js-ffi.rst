JavaScript interaction
======================


.. _sloppy-javascript-quine:

sloppy-javascript-quine
-----------------------

Call with ``mode constructor-tag top-level-vars``

Creates an (:ref:`encapsulated-string` ...) with self-contained JavaScript that captures the given cons list of variable name strings and synchronously calls a function corresponding to the given constructor tag, using the definitions currently existing in this runtime, passing it :doc:`a Cene client object <js-client>` with access to the captured variables. This will make no attempt to serialize first-class values; it will only put all Cene code and dependency data into a single massive JavaScript file together with a Cene interpreter that can re-run the build (including re-running the (:ref:`sloppy-javascript-quine` ...) operation itself!). The given mode must be a current one, and it must permit CLI-time operations.


.. _string-to-javascript-utf-16:

string-to-javascript-utf-16
---------------------------

Call with ``string``

Translates a Cene string into a JavaScript string.


.. _javascript-utf-16-to-string:

javascript-utf-16-to-string
---------------------------

Call with ``string``

Translates a JavaScript string into a Cene string, reading it according to the utf-16 encoding, replacing invalid sequences with the Unicode replacement character if necessary.


.. _done-js-effects:

done-js-effects
---------------

Call with ``result``

Creates a JavaScript effects value that does nothing and results in the given value.


.. _then-js-effects:

then-js-effects
---------------

Call with ``js-effects (fn intermediate)``

Creates a JavaScript effects value that executes the given ``js-effects`` value, calls the given callback with the intermediate result, and proceeds by running the JavaScript effects value it returns.


.. _give-unwrapped-js-effects:

give-unwrapped-js-effects
-------------------------

Call with ``js-effects js-val (js-fn val)``

Creates a JavaScript effects value that calls the given JavaScript function passing an unwrapped version of the given JavaScript value, and proceeds by running the resulting wrapped Cene JavaScript effects value.


.. _give-js-effects:

give-js-effects
---------------

Call with ``js-effects cene-val (js-fn val)``

Creates a JavaScript effects value that calls the given JavaScript function passing a wrapped version of the given Cene value, and proceeds by running the resulting wrapped Cene JavaScript effects value.


.. _compile-function-js-effects:

compile-function-js-effects
---------------------------

Call with ``params body``

Creates a JavaScript effects value that results in a new JavaScript function created out of the given cons list of parameter strings and the given body string.
