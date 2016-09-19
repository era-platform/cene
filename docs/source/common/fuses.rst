Clines, dexes, merges, and fuses
================================

..
  TODO: Incorporate the following notes into the documentation.
  
  Cene keeps track of stateful external resources using hierarchical paths. Thus, for a framework or interpreter to *pretend* to offer an external resource, it needs to be able to offer a path data structure that it can use to look up and track state. This is a use case for efficient key-value tables.
  
  For writing extensible frameworks, it's useful to be able to process collections of extensions without unnecessarily depending on their order, and it's useful to be able to take a definition-time state resource (a namespace, in Cene) and divide it up across the elements of a collection of extensions in a deterministic way. This is a use case for encapsulated key-value tables where the keys are hidden but the entries remain coordinated across keyed collections. That is, their coordination allows these tables to be zipped with namespaces and other tables.
  
  Tables rely on the ability to compare the keys for equality. We usually don't want external resource paths to be compared in a *visibly ordered* way because that would make it possible to observe when one external resource identification scheme has been globally replaced by another (e.g. if the program has been serialized, transported, and resuscitated on another machine). In a sense, this would be a violation of alpha-equivalence.
  
  Cene is not statically typed (yet). If we want to provide table values with a well-defined and deterministic API, we need to ensure that the run time behavior of key-to-key comparisons does not expose implementation details of the keys, such as ordering, breaking that alpha-equivalence. Yet, ordering information is valuable so the collection can be implemented efficiently. To enforce encapsulation and yet compute an ordering, we offer various ad hoc ways to build well-behaved comparators (and other kinds of well-behaved operators).
  
  This approach is at least as complex as certain static type systems already. In the long run, it will likely accumulate lots of ad hoc extensions. That said, before too long, there will hopefully be enough building blocks here that Cene libraries can bootstrap their own type systems.

A "cline" is based on a total ordering on values in its domain, or in other words a binary relation that is reflexive, transitive, and antisymmetric. Its antisymmetry is as fine-grained as possible: If any two values in a cline's domain are related by that cline in both directions, there will be no Cene code at all that can distinguish the two values.

However, a cline does not merely expose this total ordering. Within the cline's domain, there may be equivalence classes of values for which every two nonequal values will not have their relative order exposed to Cene code. When Cene code uses :ref:`call-quine` to compare two values by a cline, it can get several results:

- (:ref:`nil`): The values are not both in the domain.

- (:ref:`yep` (:ref:`yep` (:ref:`nil`))): The first value candidly precedes the second.

- (:ref:`yep` <encapsulated value>): The first value secretly precedes the second.

- (:ref:`yep` (:ref:`nil`)): The first value is equal to the second.

- (:ref:`yep` <encapsulated value>): The first value secretly follows the second.

- (:ref:`yep` (:ref:`nope` (:ref:`nil`))): The first value candidly follows the second.

The "secretly precedes" and "secretly follows" cases are indistinguishable to Cene code.

A "dex" is like a cline, but it never results in the "candidly precedes" and "candidly follows" cases. Thus, a dex is useful as a kind of equality test.

A "merge" is a binary operation that is commutative, associative, and idempotent for values in its domain.

A "fuse" is a binary operation that is commutative and associative for values in its domain.

..
  TODO: Incorporate the following note into the documentation.
  
  TODO: There's something interesting we might be able to do here. Some values may not let us compute an easy yes or no answer as to whether they're indistinguishable because the only way to distinguish them is to send them into the outside world and wait for the ripples to show up. For instance, a message that means "Please send a response eventually" and a message that means "Please don't send a response ever" might only be distinguishable if and when a response arrives. If a response doesn't arrive, we can't destinguish them yet. While we can't define a dex for these two messages (because that dex itself would be a way to distinguish them), we can define a merge that combines them into a result with maximal feedback or a result with minimal feedback. There might be something having to do with definition lookups or OWA extensibility that can make practical use of this technique.



.. _dex-cline:

dex-cline
-------

Call with ``(ignored)``

.. todo:: Document this.

This can distinguish between values that might not have been distinguishable any other way. For instance, it can distinguish between (:ref:`cline-default` (:ref:`cline-give-up`) ``a``) and ``a``.


.. _cline-by-dex:

cline-by-dex
------------

Call with ``dex``

.. todo:: Document this.


.. _cline-give-up:

cline-give-up
-------------

Call with ``(ignored)``

.. todo:: Document this.


.. _cline-default:

cline-default
-------------

Call with ``cline-for-trying-first cline-for-trying-second``

Given two clines, returns a cline over the union of their domains. The resulting cline's ascending order consists of the first cline's ascending order in its domain, followed by the second cline's ascending order outside the first cline's domain.


.. _cline-by-own-method:

cline-by-own-method
-------------------

Call with ``dexable-get-method``

Given a :ref:`dexable` function, returns a cline that works by invoking that function with each value to get (:ref:`yep` ``<cline>``) or (:ref:`nil`), verifying that the two ``<cline>`` values are the same, and then proceeding to invoke that value.


.. _cline-fix:

cline-fix
---------

Call with ``dexable-unwrap``

Given a :ref:`dexable` function, returns a cline that works by passing itself to the function and then invoking the resulting cline.


.. _call-cline:

call-cline
----------

Call with ``cline a b``

.. todo:: Document this.


.. _in-cline:

in-cline
--------

Call with ``cline x``

.. todo:: Document this.


.. _dexable:

dexable
-------

Construct with ``dex val``

A value tagged with a dex that applies to it.


.. _dex-dex:

dex-dex
-------

Call with ``(ignored)``

.. todo:: Document this.

This can distinguish between values that might not have been distinguishable any other way. For instance, it can distinguish between (:ref:`dex-by-cline` (:ref:`cline-by-dex` ``a``)) and ``a``.


.. _dex-by-cline:

dex-by-cline
------------

Call with ``cline``

.. todo:: Document this.


.. _name-of:

name-of
-------

Call with ``dexable``

.. todo:: Document this.


.. _dex-name:

dex-name
--------

Call with ``(ignored)``

Returns a dex that applies to any name. Names are encapsulated values that are good for nothing but comparing using this dex. They are usually obtained by calling :ref:`procure-name` on a namespace.


.. _dex-merge:

dex-merge
---------

Call with ``(ignored)``

.. todo:: Document this.

This can distinguish between values that might not have been distinguishable any other way. For instance, it can distinguish between (:ref:`merge-default` ``a b``) and (:ref:`merge-default` ``b a``).


.. _merge-by-dex:

merge-by-dex
------------

Call with ``dex``

.. todo:: Document this.

This only processes the dex operation once, calling it with the two values being merged. It doesn't sanity-check that the dex is reflexive for either argument.


.. _merge-default:

merge-default
-------------

Call with ``merge-for-trying-first merge-for-trying-second``

.. todo:: Document this.


.. _merge-by-own-method:

merge-by-own-method
-------------------

Call with ``dexable-get-method``

Given a :ref:`dexable` function, returns a merge that works by invoking that function with each value to get (:ref:`yep` ``<merge>``) or (:ref:`nil`), verifying that the two ``<merge>`` values are the same, invoking that value, and invoking the function on the result again to make sure it yields the same ``<merge>``. That final check makes sure this operation is associative.


.. _merge-fix:

merge-fix
---------

Call with ``dexable-unwrap``

Given a :ref:`dexable` function, returns a merge that works by passing itself to the function and then invoking the resulting merge.


.. _call-merge:

call-merge
----------

Call with ``merge a b``

.. todo:: Document this.


.. _dex-fuse:

dex-fuse
--------

Call with ``(ignored)``

.. todo:: Document this.

This can distinguish between values that might not have been distinguishable any other way. For instance, it can distinguish between (:ref:`fuse-default` ``a b``) and (:ref:`fuse-default` ``b a``).


.. _fuse-by-merge:

fuse-by-merge
-------------

Call with ``merge``

.. todo:: Document this.


.. _fuse-default:

fuse-default
------------

Call with ``fuse-for-trying-first fuse-for-trying-second``

.. todo:: Document this.


.. _fuse-by-own-method:

fuse-by-own-method
------------------

Call with ``dexable-get-method``

Given a :ref:`dexable` function, returns a fuse that works by invoking that function with each value to get (:ref:`yep` ``<fuse>``) or (:ref:`nil`), verifying that the two ``<fuse>`` values are the same, invoking that value, and invoking the function on the result again to make sure it yields the same ``<fuse>``. That final check makes sure this operation is associative.


.. _fuse-fix:

fuse-fix
--------

Call with ``dexable-unwrap``

Given a :ref:`dexable` function, returns a fuse that works by passing itself to the function and then invoking the resulting fuse.


.. _call-fuse:

call-fuse
---------

Call with ``fuse a b``

.. todo:: Document this.


..
  TODO: See if the following notes can be integrated into the documentation.
  
  NOTE: We can't have (dex-map <dexable-func> <result-dex>) because it might call things equivalent that are distinguishable from each other, which would make a (merge-by-dex ...) stop being commutative.
  
  NOTE: We can't have (fuse-map <dexable-func> <result-fuse>) because it might not be associative. (For instance, if the fuse is multiplication and the mapped function is adding one, ((1 + a) * (1 + ((1 + b) * (1 + c)))) !== ((1 + ((1 + a) * (1 + b))) + (1 * c)) unless a === c.) For the same reason, we can't have this, either:
  
  .. _fuse-by-calling-twice:
  
  fuse-by-calling-twice
  ---------------------
  
  Call with ``dexable-func result-fuse``
  
  Given a dexable function that takes two values and combines them and a fuse that can combine the results of that function, returns a fuse that works by calling the function twice with the arguments in different orders and fusing the results.
