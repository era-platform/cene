Namespaces
==========


.. _procure-sub-ns-table:

procure-sub-ns-table
--------------------

Call with ``table ns``

.. todo:: Now that tables expose their keys well enough to implement this in terms of a single-key lookup, consider replacing this with a single-key lookup again.

Makes a table with entries corresponding to the given table, except each value is replaced with a sub-namespace, which is to say a namespace uniquely determined by the given namespace and the entry's key. The entry's value is ignored.

Distinct keys yield distinct sub-namespaces.


.. _procure-name:

procure-name
------------

Call with ``mode ns``

Uses the given namespace to obtain a first-class name value. The given modality must be the current one.


.. _procure-contributed-element-getdef:

procure-contributed-element-getdef
----------------------------------

Call with ``ns key``

Given a namespace and a name to use as a key, obtains a getdef that is used to contribute its defined value to the element contribution map on the namespace. When the getdef's definer is used, if more than one element contribution is given for the same key at the same timestamp, an error occurs; all listener contributors, element contributors, and ticks begun by these contributions are in error, and their ticks' side effects are invalidated. When the getdef's definer is used, the then-current modality's ancestors must not have used restrictions like ``contributing-only-...`` restrictions in a way that now disallows making element contributions to the given namespace.


.. _procure-contribute-listener:

procure-contribute-listener
---------------------------

Call with ``ns key (fn singleton-table)``

Monadically, given a namespace, a name to use as a key, and a listener function, contributes to the listener contribution map on the namespace. The listener function will be called monadically in a different future tick each time an entry is contributed to the namespace's element contribution map. The listener is given a singleton table containing the entry contributed. If more than one listener contribution is given for the same key, an error occurs; all listener contributors, element contributors, and ticks begun by these contributions are in error, and their ticks' side effects are invalidated.

This is a way to make frameworks that are extensible in the sense of the open-world assumption (OWA).


.. _procure-contributed-elements:

procure-contributed-elements
----------------------------

Call with ``mode ns``

Gets the namespace's full element contribution map as a table. The given modality must be the current one, and its ancestors must have used ``contributing-only-...`` restrictions in a way that now disallows making contributions to the given namespace.

During macroexpansion, this operation will not compute a result until at least all the original macroexpansion ticks have completed, since they are not limited by any ``contributing-only-...`` restrictions.

This is a way to make frameworks that are extensible in the sense of the closed-world assumption (CWA).


.. _nsset-empty:

nsset-empty
-----------

Call with ``(ignored)``

Returns an empty set of namespaces.


.. _fuse-nsset-by-union:

fuse-nsset-by-union
-------------------

Call with ``(ignored)``

Returns a fuse that takes the union of sets of namespaces.


.. _nsset-not:

nsset-not
---------

Call with ``nsset``

Returns a set of namespaces that contains all namespaces except the ones in the given set of namespaces.


.. _nsset-ns-descendants:

nsset-ns-descendants
--------------------

Call with ``ns``

Returns the set of namespaces descending from the given namespace, including the given namespace itself.


.. _contributing-only-to:

contributing-only-to
--------------------

Call with ``nsset effects``

Monadically, schedules the effects to occur in a future tick where the allowable actions outside the given set of namespaces are different: Contributing there is not allowed, but reading closed-world-assumption collections of contributions there is allowed.
