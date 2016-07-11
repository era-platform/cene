"use strict";
var rocketnia = rocketnia || {};
rocketnia.eraFiles = rocketnia.eraFiles || {};
rocketnia.eraFiles[ "test.stc" ] =
"\\= test.stc\n\\= Copyright 2015, 2016 Ross Angle. Released under the MIT License.\n\\=\n\\= These are some tests for Staccato. They depend on\n\\= era-staccato-lib.stc as well as the `test` macro implemented in\n\\= era-staccato-lib-runner.js.\n\\=\n\\= See era-staccato.js for more information about what Staccato is.\n\n(test\n  (rev/cons (yep/nil) /cons (nope/nil) /nil)\n  (cons (nope/nil) /cons (yep/nil) /nil))\n\n(test\n  (rev/nil)\n  (nil))\n\n(test\n  (not/yep/nil)\n  (nope/nil))\n\n(test\n  (let x (nope/nil) y (yep/nil)\n  /let x y y x\n  /cons x y)\n  (cons (yep/nil) (nope/nil)))\n\n(test\n  (list (nil) (nil))\n  (cons (nil) /cons (nil) /nil))\n\n(test\n  (cmp-struct cons cmp-struct.nil cmp-struct.nil)\n  (cmp-struct cons cmp-struct.nil cmp-struct.nil))\n\n(test\n  (call-cmp (cmp-struct cons cmp-struct.nil cmp-struct.nil)\n    (cons (nil) /nil)\n    (cons (nil) /nil))\n  (yep/nil))\n\n(test\n  (case\n    (proj1 yep /call-cmp\n      (cmp-default cmp-struct.nil (cmp-struct yep cmp-struct.nil))\n      (nil)\n      (yep/nil))\n    nil\n    (yep/nil)\n    (nope/nil))\n  (nope/nil))\n\n(test\n  (table-get str.woo\n    (table-shadow str.woo (yep/nope/nil) /table-empty/cmp-string/nil))\n  (yep/nope/nil))\n";
