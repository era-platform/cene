File I/O for simple builds
==========================


.. _encapsulated-string:

encapsulated-string
-------------------

Construct with ``val``

.. todo:: Document this.


.. _cli-arguments:

cli-arguments
-------------

Call with ``mode``

Gets the command-line arguments that were provided after the file name to execute. The given mode must be a current one, and it must permit CLI-time operations.


.. _cli-input-directory:

cli-input-directory
-------------------

Call with ``mode``

Gets an input path that corresponds to the input directory provided at the command line. The given mode must be a current one, and it must permit CLI-time operations.


.. _cli-output-directory:

cli-output-directory
--------------------

Call with ``mode``

Gets an output path that corresponds to the output directory provided at the command line. The given mode must be a current one, and it must permit CLI-time operations.


.. _input-path-get:

input-path-get
------------------

Call with ``input-path string``

Gets an input path that is a child of the given one.


.. _input-path-type:

input-path-type
---------------

Call with ``mode input-path``

Gets (:ref:`file-type-directory`), (:ref:`file-type-blob`), or (:ref:`file-type-missing`) depending on what exists at the given input path. The given mode must be a current one, and it must permit CLI-time operations.


.. _file-type-directory:

file-type-directory
-------------------

Construct with no projections

.. todo:: Document this.


.. _file-type-blob:

file-type-blob
--------------

Construct with no projections

.. todo:: Document this.


.. _file-type-missing:

file-type-missing
-----------------

Construct with no projections

.. todo:: Document this.


.. _input-path-directory-list:

input-path-directory-list
-------------------------

Call with ``mode input-path``

Lists the filenames in a directory. The given mode must be a current one, and it must permit CLI-time operations.


.. _input-path-blob-utf-8:

input-path-blob-utf-8
---------------------

Call with ``mode input-path``

Reads a blob as a string in utf-8 encoding, replacing invalid sequences with the Unicode replacement character if necessary. The given mode must be a current one, and it must permit CLI-time operations.


.. _output-path-get:

output-path-get
---------------

Call with ``output-path string``

Gets an output path that is a child of the given one.


.. _output-path-directory:

output-path-directory
---------------------

Call with ``output-path``

Monadically creates the given output path and its ancestors as directories. If a single path is written as a blob and as a directory, at least one of those writes is an error. The current mode must permit CLI-time operations.


.. _output-path-blob-utf-8:

output-path-blob-utf-8
----------------------

Call with ``output-path possibly-encapsulated-string``

Monadically creates the given output path's ancestors as directories, creates the path itself as a blob, and overwrites its content with the given string in utf-8 format. The string may be a string or an (:ref:`encapsulated-string` ...). If a single path is written as a blob and as a directory, or as a blob twice, at least one of those writes is an error. The current mode must permit CLI-time operations.


.. _cli-output-environment-variable-shadow:

cli-output-environment-variable-shadow
--------------------------------------

Call with ``key value``

Monadically sets up the given key-value pair of strings so that it's part of the environment variables during the execution of the CLI interface's ``--command`` option. The value string may be a string or an (:ref:`encapsulated-string` ...). If the same key is shadowed twice, both shadow operations are errors. The current mode must permit CLI-time operations.

.. todo:: Implement the ``--command`` option. Until we do, this operation is useless.
