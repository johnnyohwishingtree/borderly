# Fact: Test Count Inflates Confidence

Borderly has 10,222 tests but the three real bugs in its history (boolean field defaults, timezone date parsing, keychain access groups) were all found in production or manual testing, not by the automated suite. High test count does not correlate with bug detection in this codebase.
