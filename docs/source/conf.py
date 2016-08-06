# -*- coding: utf-8 -*-

_copyright_dates = u'2016'


import json
import os
from recommonmark.parser import CommonMarkParser

_readthedocs = os.environ.get('READTHEDOCS', None) == 'True'

if not _readthedocs:
    import sphinx_rtd_theme

with open('../../package.json') as package_json_file:
    _package_json = json.load(package_json_file)


# General configuration for Sphinx

extensions = ['sphinx.ext.todo']

source_parsers = {'.md': CommonMarkParser}
source_suffix = ['.rst'] + source_parsers.keys()
master_doc = 'index'

project = u'Cene'
author = _package_json[u'author'][u'name']
copyright = _copyright_dates + u' ' + author
version = _package_json[u'version']
release = version

todo_include_todos = True


# Configuration for Sphinx HTML builds

if _readthedocs:
    html_theme = 'default'
    html_theme_path = []
else:
    import sphinx_rtd_theme
    html_theme = 'sphinx_rtd_theme'
    html_theme_path = [sphinx_rtd_theme.get_html_theme_path()]
