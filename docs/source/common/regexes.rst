Regexes
=======


The purpose of Cene's regexes is to make it efficient to tokenize a string. Since many platforms support regexes (particularly PCREs of some form), Cene provides a small subset of regex functionality that may take advantage of those compilation targets and while being sufficient for this purpose. Cene's regexes do not backtrack.

On the other hand, Cene's regexes are a little different. For the sake of using regexes to tokenize ongoing streams, Cene's regexes can return a result indicating that they're waiting for more input past the end of the string.


.. _regex-give-up:

regex-give-up
-------------

Call with ``(ignored)``

Creates a regex that doesn't match.


.. _regex-empty:

regex-empty
-----------

Call with ``(ignored)``

Creates a regex that matches the empty string.


.. _regex-one:

regex-one
---------

Call with ``(ignored)``

Creates a regex that matches any one Unicode scalar.


.. _regex-if:

regex-if
--------

Call with ``condition-regex then-regex else-regex``

Creates a regex that first tries to match the first given regex. If it succeeds, it tries to match the second given regex after that. If it fails, it tries to match the third given regex at the original location instead.


.. _regex-while:

regex-while
-----------

Call with ``condition-regex body-regex``

Creates a regex that matches by matching the two given regexes in succession any number of times until the first given regex doesn't match. If the first ever matches and the second doesn't match, the overall match fails. If any iteration's combined match is empty, that must be the last iteration, or the overall match fails.


.. _regex-until:

regex-until
-----------

Call with ``body-regex condition-regex``

Creates a regex that matches by matching the first given regex in succession any number of times as long as the second given regex wouldn't match instead, then finally matches the second given regex and finishes. If any iteration determines that the second regex doesn't match but the first one doesn't either, the overall match fails. If any iteration's match is empty, that must be the last iteration, or the overall match fails.


.. _regex-from-string:

regex-from-string
-----------------

Call with ``string``

Creates a regex that matches the given string.


.. _regex-one-in-string:

regex-one-in-string
-------------------

Call with ``string``

Creates a regex that matches one Unicode scalar if it appears in the given string.


.. _regex-one-in-range:

regex-one-in-range
------------------

Call with ``min max``

Creates a regex that matches one Unicode scalar if it's at least the given minimum and at most the given maximum.


.. _optimize-regex-later:

optimize-regex-later
--------------------

Call with ``regex (fn optimized-regex)``

Monadically, takes a regex and a callback, and in a later tick, monadically calls the callback with an optimized regex.


.. _optimized-regex-match-later:

optimized-regex-match-later
---------------------------

Call with ``optimized-regex string start stop (fn regex-result)``

Monadically, takes an optimized regex, a string, a starting position in the string, a stopping position in the string, and a callback, and in a later tick, monadically calls the callback with a (:ref:`regex-result-matched` ``<stop>``) indicating a match stopping position, a (:ref:`regex-result-failed`), or a (:ref:`regex-result-passed-end`).


.. _regex-result-matched:

regex-result-matched
--------------------

Construct with ``stop``

A regex result that indicates the regex has matched, and that the match stops at the indicated position.

This constructor is needed to deconstruct the result of :ref:`optimized-regex-match-later`.


.. _regex-result-failed:

regex-result-failed
-------------------

Construct with no projections

A regex result that indicates the regex has positively failed to match.

This constructor is needed to deconstruct the result of :ref:`optimized-regex-match-later`.


.. _regex-result-passed-end:

regex-result-passed-end
-----------------------

Construct with no projections

A regex result that indicates the regex needs to look past the end of the allowed range of the string before it can determine a match or failure result.

This constructor is needed to deconstruct the result of :ref:`optimized-regex-match-later`.
