# Implementation Plan

- [x] 1. Write bug condition exploration test
  - **Property 1: Bug Condition** - Stable Reference for Unchanged Data
  - **CRITICAL**: This test MUST FAIL on unfixed code - failure confirms the bug exists
  - **DO NOT attempt to fix the test or the code when it fails**
  - **NOTE**: This test encodes the expected behavior - it will validate the fix when it passes after implementation
  - **GOAL**: Surface counterexamples that demonstrate the infinite loop bug exists
  - **Scoped PBT Approach**: Scope the property to concrete failing cases: SessionTabs rendering with unchanged sessionMetadata Map
  - Test that useSessionMetadataList returns same reference when sessionMetadata Map hasn't changed
  - Test that SessionTabs component render count stays stable (< 50) when data is unchanged
  - Test cases:
    - Basic render with 2 sessions, monitor render count
    - Re-render triggered without changing session data
    - Empty sessions list (0 sessions)
    - Rapid successive re-renders without data changes
  - Run test on UNFIXED code
  - **EXPECTED OUTCOME**: Test FAILS with "Maximum update depth exceeded" error (this is correct - it proves the bug exists)
  - Document counterexamples found (e.g., "Render count exceeds 50", "Console error: Maximum update depth exceeded")
  - Mark task complete when test is written, run, and failure is documented
  - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 2. Write preservation property tests (BEFORE implementing fix)
  - **Property 2: Preservation** - Reactivity to Data Changes
  - **IMPORTANT**: Follow observation-first methodology
  - Observe behavior on UNFIXED code for session metadata changes (status updates, additions, deletions)
  - Write property-based tests capturing observed behavior patterns:
    - Session status change (idle → running) triggers component re-render
    - Session addition updates SessionTabs component
    - Session deletion updates SessionTabs component
    - UpdatedAt timestamp change triggers component re-render
    - Custom equality function comparison logic remains unchanged
  - Property-based testing generates many test cases for stronger guarantees
  - Run tests on UNFIXED code
  - **EXPECTED OUTCOME**: Tests PASS (this confirms baseline behavior to preserve)
  - Mark task complete when tests are written, run, and passing on unfixed code
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 3. Fix for SessionTabs infinite loop

  - [x] 3.1 Implement the caching mechanism in useSessionMetadataList
    - Add module-level cache variables in sessionStoreManager.ts:
      - `let cachedMetadataMap: Map<string, SessionMetadata> | null = null`
      - `let cachedMetadataArray: SessionMetadata[] | null = null`
    - Modify the selector function in useSessionMetadataList to implement caching logic:
      - Compare current sessionMetadata Map reference with cachedMetadataMap
      - If same reference, return cachedMetadataArray
      - If different reference, create new array with Array.from(), update both cache variables
    - Preserve the existing custom equality function unchanged
    - Handle edge cases: initial render (null cache), empty sessions list
    - _Bug_Condition: isBugCondition(input) where input.renderCount > 1 AND sessionMetadata_unchanged AND new_array_reference_created_
    - _Expected_Behavior: Return cached array reference when sessionMetadata Map hasn't changed, create new reference only when Map changes_
    - _Preservation: Session metadata updates, additions, deletions must continue to trigger re-renders; custom equality function logic unchanged; other components using useSessionMetadataList unaffected_
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 3.1, 3.2, 3.3, 3.4_

  - [x] 3.2 Verify bug condition exploration test now passes
    - **Property 1: Expected Behavior** - Stable Reference for Unchanged Data
    - **IMPORTANT**: Re-run the SAME test from task 1 - do NOT write a new test
    - The test from task 1 encodes the expected behavior
    - When this test passes, it confirms the expected behavior is satisfied
    - Run bug condition exploration test from step 1
    - **EXPECTED OUTCOME**: Test PASSES (confirms bug is fixed - no more infinite loop)
    - Verify render count stays stable (< 50) for unchanged data
    - Verify same array reference is returned for unchanged sessionMetadata Map
    - _Requirements: 2.1, 2.3, 2.4_

  - [x] 3.3 Verify preservation tests still pass
    - **Property 2: Preservation** - Reactivity to Data Changes
    - **IMPORTANT**: Re-run the SAME tests from task 2 - do NOT write new tests
    - Run preservation property tests from step 2
    - **EXPECTED OUTCOME**: Tests PASS (confirms no regressions)
    - Confirm session metadata changes still trigger re-renders
    - Confirm session additions/deletions still update component
    - Confirm custom equality function still works correctly
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
