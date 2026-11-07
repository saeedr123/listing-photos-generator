#!/bin/bash
# Run the Phase 2 template, mockup, rendering, and export test suite.
# Usage: ./run-tests.sh  (from ~/workspace/listing-studio)
set -e
cd "$(dirname "$0")/.."
node --test tests/template-distinctness.test.mjs tests/mockup-fit.test.mjs tests/rendering.test.mjs tests/reconciliation.test.mjs tests/export.test.mjs
