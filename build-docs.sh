#!/bin/bash

# NOTE: This expects Python 3's pip to be installed, and it expects
#
#  pip install sphinx
#  pip install recommonmark
#  pip install sphinx_rtd_theme

sphinx-build -b html -d build/doctrees docs/source fin/docs
