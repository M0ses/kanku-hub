# Makefile for KankuHub
# Provides standard CLI developer targets for testing and validation.

.PHONY: all test

# Default target executes the test suite
all: test

# Run automated unit and integration tests using Node.js test runner
test:
	node --test tests/*.test.mjs
