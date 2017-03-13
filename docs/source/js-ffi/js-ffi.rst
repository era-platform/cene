JavaScript interaction
======================


.. _sloppy-javascript-program:

sloppy-javascript-program
-------------------------

Call with ``mode cexpr top-level-vars``

Creates an (:ref:`encapsulated-string` ...) with self-contained JavaScript that captures the given cons list of variable name strings and synchronously executes the given compiled expression, using the definitions currently existing in this runtime, passing the result :doc:`a Cene client object <js-client>` with access to the captured variables. This will make no attempt to serialize first-class values; it will only put all Cene code and dependency data into a single massive JavaScript file together with a Cene interpreter that can re-run the build (including re-running the (:ref:`sloppy-javascript-program` ...) operation itself!). The given mode must be a current one, and it must permit CLI-time operations.


.. _picky-javascript-program:

picky-javascript-program
------------------------

Call with ``mode cexpr top-level-vars``

Creates an (:ref:`encapsulated-string` ...) with self-contained JavaScript that captures the given cons list of variable name strings and synchronously executes the given compiled expression, using the definitions currently existing in this runtime, passing the result :doc:`a Cene client object <js-client>` with access to the captured variables. This will crawl the compiled expression and only produce code for the case branches and function implementations corresponding to the constructors it calls. It will serialize reified strings, but not other kinds of reified value. The given mode must be a current one, and it must permit CLI-time operations.


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


.. _later-js-effects:

later-js-effects
----------------

Call with ``(fn js-effects-definer)``

Given a function that takes a definer and monadically installs a ``js-effects`` value into that definer, creates a JavaScript effects value that executes those monadic effects and then proceeds by running the JavaScript effects value that has been installed into the definer.


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


.. _cexpr-js:

cexpr-js
--------

Call with ``code``

Given a string containing a JavaScript function body, returns a compiled expression with no free variables. It represents an expression which creates a JavaScript effects value which calls the given JavaScript function body with no arguments and results in a JavaScript value. In a generated JavaScript program, the function body is compiled by passing it to ``Function`` early on in the loading of the program.


.. _js:

js
--

Macro. Example: ``js.\;qq[return 1 + 2;]``

.. todo:: Document this.
