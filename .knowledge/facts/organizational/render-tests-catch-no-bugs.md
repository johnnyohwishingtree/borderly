# Fact: Render-Only Tests Catch No Bugs

112 test files contain "it renders" tests that verify a component mounts without crashing but don't test user interactions, state changes, or output correctness. These tests pass with any implementation and have never caught a bug in the project's history.
