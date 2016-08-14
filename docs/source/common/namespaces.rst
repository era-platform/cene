Namespaces
==========


.. _procure-sub-ns-table:

procure-sub-ns-table
--------------------

Call with ``table ns``

Makes a table with entries corresponding to the given table, except each value is replaced with a sub-namespace, which is to say a namespace uniquely determined by the given namespace and the entry's key. The entry's value is ignored.

Unless the sub-namespaces are shadowed (which can happen using :ref:`shadow-procure-sub-ns-table`), distinct keys will yield distinct sub-namespaces.


.. _shadow-procure-sub-ns-table:

shadow-procure-sub-ns-table
---------------------------

Call with ``table ns``

Creates a new namespace that behaves like the given namespace in almost every way, except that when it's used with :ref:`procure-sub-ns-table` where some of the keys are from the given table, the corresponding values of the table are returned as the sub-namespaces instead. The values of the table must be namespaces.

A namespace created this way works the same way as the old one when it's used in any other ``procure-...`` primitive. This way, we can imagine that the namespace's identity (:ref:`procure-name`) and contribution state (:ref:`procure-contributed-elements` etc.) are stored under a sub-namespace somewhere, just using a key that we don't have the ability to construct.

One useful purpose of this tool is to establish local macros. The layout of the definition namespace has been designed so that specific parts can be shadowed conveniently.


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


.. _contributing-only-to:

contributing-only-to
--------------------

Call with ``ns effects``

Monadically, schedules the effects to occur in a future tick where contributing to multimethods outside the given namespace is not allowed, but reading closed-world-assumption collections of contributions outside the given namespace is allowed.
