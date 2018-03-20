#!/usr/bin/env bash

# integer literals
curl https://raw.githubusercontent.com/WebAssembly/spec/master/test/core/int_literals.wast \
	| head -n70 \
	| grep -oP "(i(32|64).const\K\s*((\d|-|x|_|\+)*))" \
	> packages/wast-parser/test/tokenizer/raw/int_literals.txt

# float literals
# TODO

