#!/bin/sh

# Install dependencies
dart pub get

# build the binary
dart compile exe lib/src/main.dart -o .build/bootstrap

# Exit
exit