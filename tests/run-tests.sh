#!/bin/bash
# Run the engine test suites: templates, mockups, rendering, export,
# storage, and the 3D mockup studio modules.
# Usage: ./tests/run-tests.sh  (from the repository root or anywhere)
# Needs Node 22 or later and python3 with Pillow (the export tests encode JPGs).
set -e
cd "$(dirname "$0")/.."
node --test \
  tests/template-distinctness.test.mjs \
  tests/mockup-fit.test.mjs \
  tests/rendering.test.mjs \
  tests/reconciliation.test.mjs \
  tests/export.test.mjs \
  tests/real-pack.test.mjs \
  tests/storage.test.mjs \
  tests/studio-fit.test.mjs \
  tests/studio-registry.test.mjs \
  tests/studio-batch.test.mjs \
  tests/studio-export.test.mjs
