# -*- coding: utf-8 -*-

_copyright_dates = u'2016'


import json
import os
import re
from recommonmark.parser import CommonMarkParser
from pygments.lexer import RegexLexer
from pygments.token import Comment, Name, Keyword, Text

_readthedocs = os.environ.get('READTHEDOCS', None) == 'True'

if not _readthedocs:
    import sphinx_rtd_theme

with open('../../package.json') as package_json_file:
    _package_json = json.load(package_json_file)


# A really basic Pygments lexer for Cene programs

# This is thanks to
# <http://samprocter.com/2014/06/documenting-a-language-using-a-custom-sphinx-domain-and-pygments-lexer/>.

_cene_id = r'[^ \t\r\n`=;\',\.\\/()\[\]]*'

class _CeneLexer(RegexLexer):
    flags = re.DOTALL
    tokens = {
        'root': [
            
            # While there are some elaborate ways to write comments,
            # \= line comments are by far the most common in practice.
            # Highlighting the \;rm(...) comments as code is likely
            # to be the desired behavior anyway. Unfortunately, \;uq=
            # comments inside a string will be highlighted as code
            # right now.
            (r'\\=[^\r\n]*', Comment.Single),
            
            # An identifier preceded by ( or / is likely a macro name.
            # Note that we don't highlight identifiers preceded by [
            # even though it's equivalent to ( because in practice we
            # use [ for delimiting strings.
            (r'(?<=[(/])' + _cene_id, Name.Function),
            
            # An identifier preceded by ; is likely an escape
            # sequence.
            (r'(?<=[;])' + _cene_id, Keyword.Constant),
            
            # Anything else is text. We don't highlight identifiers in
            # other contexts, because we don't know if they're part of
            # a string. Even if we did know, some strings benefit from
            # being highlighted as code.
            (r'.', Text),
        ],
    }


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

highlight_language = 'cene'

todo_include_todos = True

def setup(sphinx):
    sphinx.add_lexer('cene', _CeneLexer())


# Configuration for Sphinx HTML builds

if _readthedocs:
    html_theme = 'default'
    html_theme_path = []
else:
    import sphinx_rtd_theme
    html_theme = 'sphinx_rtd_theme'
    html_theme_path = [sphinx_rtd_theme.get_html_theme_path()]
