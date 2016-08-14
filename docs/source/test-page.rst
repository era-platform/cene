Sphinx/reStructuredText test page
=================================

This is a page where we're testing Sphinx/reStructuredText syntaxes as we develop the Cene documentation.

No highlighting:

.. code-block:: none

    \;rm(def-struct foo a b c)
    
    str.\;qq[Hello, world!]  \= Hello, comment!
    
    (defn ns-path ns path
      (let dex-component (dex-default (dex-string/nil) (dex-name/nil))
      /foldl ns path /fn ns component
        (table-get-singleton/procure-sub-ns-table
          (table-shadow (name-of/dexable dex-component component)
            (yep/nil)
          /table-empty/nil)
          ns)))

Default code highlighting (Cene)::

    \;rm(def-struct foo a b c)
    
    str.\;qq[Hello, world!]  \= Hello, comment!
    
    (defn ns-path ns path
      (let dex-component (dex-default (dex-string/nil) (dex-name/nil))
      /foldl ns path /fn ns component
        (table-get-singleton/procure-sub-ns-table
          (table-shadow (name-of/dexable dex-component component)
            (yep/nil)
          /table-empty/nil)
          ns)))

Scheme highlighting, which apparently doesn't look very good applied to Cene code:

.. code-block:: scheme

    (defn ns-path ns path
      (let dex-component (dex-default (dex-string/nil) (dex-name/nil))
      /foldl ns path /fn ns component
        (table-get-singleton/procure-sub-ns-table
          (table-shadow (name-of/dexable dex-component component)
            (yep/nil)
          /table-empty/nil)
          ns)))

Explicit Cene highlighting:

.. code-block:: cene

    \;rm(def-struct foo a b c)
    
    str.\;qq[Hello, world!]  \= Hello, comment!
    
    (defn ns-path ns path
      (let dex-component (dex-default (dex-string/nil) (dex-name/nil))
      /foldl ns path /fn ns component
        (table-get-singleton/procure-sub-ns-table
          (table-shadow (name-of/dexable dex-component component)
            (yep/nil)
          /table-empty/nil)
          ns)))
