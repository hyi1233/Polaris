# SessionTabs Infinite Loop Bugfix Design

## Overview

The SessionTabs component experiences an infinite render loop due to the `useSessionMetadataList` hook in `sessionStoreManager.ts` creating new array references on every call. The fix implements a caching mechanism that returns stable references when the underlying `sessionMetadata` Map hasn't changed, preventing unnecessary re-renders while maintaining reactivity to actual data changes.

## Glossary

- **Bug_Condition (C)**: The condition that triggers the bug - when `useSessionMetadataList` is called and creates a new array reference despite unchanged data
- **Property (P)**: The desired behavior - return cached array reference when data hasn't changed, create new reference only when data changes
- **Preservation**: Existing reactivity to session metadata changes (status updates, additions, deletions) must remain unchanged
- **useSessionMetadataList**: The hook in `sessionStoreManager.ts:497` that returns an array of session metadata
- **sessionMetadata**: The Map<string, SessionMetadata> that stores metadata for all sessions
- **getSnapshot**: The selector function passed to zustand's useStore, which is called by React's useSyncExternalStore

## Bug Details

### Bug Condition

The bug manifests when the SessionTabs component renders and calls `useSessionMetadataList`. The selector function `(state) => Array.from(state.sessionMetadata.values())` creates a new array reference on every call, even when the underlying Map hasn't changed. React's `useSyncExternalStore` detects the reference change and triggers a re-render, which calls the selector again, creating an infinite loop.

**Formal Specification:**
```
FUNCTION isBugCondition(input)
  INPUT: input of type { renderCount: number, sessionMetadata: Map<string, SessionMetadata> }
  OUTPUT: boolean
  
  RETURN input.renderCount > 1
         AND sessionMetadata_unchanged(input.sessionMetadata)
         AND new_array_reference_created()
END FUNCTION
```

### Examples

- **Example 1**: SessionTabs renders with 2 sessions → useSessionMetadataList creates array [session1, session2] → Component re-renders → useSessionMetadataList creates new array [session1, session2] with different reference → Infinite loop
- **Example 2**: User switches sessions → SessionTabs re-renders → useSessionMetadataList creates new array reference → Component re-renders again → Infinite loop continues
- **Example 3**: Session status changes from 'idle' to 'running' → useSessionMetadataList should create new array → Component updates correctly (expected behavior, not a bug)
- **Edge Case**: Empty sessions list (length 0) → Should return cached empty array reference on subsequent calls

## Expected Behavior

### Preservation Requirements

**Unchanged Behaviors:**
- Session metadata updates (status changes, updatedAt changes) must continue to trigger component re-renders
- Session additions and deletions must continue to be reflected in the SessionTabs component
- The custom equality function's comparison logic (checking length, id, status, updatedAt) must remain unchanged
- Other components using useSessionMetadataList must continue to receive correct session metadata

**Scope:**
All inputs that do NOT involve unchanged sessionMetadata Map should be completely unaffected by this fix. This includes:
- Actual session metadata changes (status, updatedAt, title)
- Session additions (new sessions created)
- Session deletions (sessions removed)
- Session switching (activeSessionId changes)

## Hypothesized Root Cause

Based on the bug description and code analysis, the root cause is:

1. **New Array Reference on Every Call**: `Array.from(state.sessionMetadata.values())` creates a new array instance every time the selector is called, even when the Map contents are identical

2. **useSyncExternalStore Behavior**: React's `useSyncExternalStore` (used internally by zustand's `useStore`) requires the getSnapshot function to return a stable reference when data hasn't changed. It uses `Object.is()` for reference equality checking before the custom equality function is applied

3. **Custom Equality Function Timing**: The custom equality function in `useSessionMetadataList` only runs after React detects a reference change, but by then it's too late - the re-render has already been scheduled

4. **Render Loop Trigger**: Each re-render calls getSnapshot again, which creates another new array reference, triggering another re-render, creating an infinite loop that exceeds React's maximum update depth

## Correctness Properties

Property 1: Bug Condition - Stable Reference for Unchanged Data

_For any_ call to useSessionMetadataList where the sessionMetadata Map has not changed (same keys, same values for id/status/updatedAt), the fixed hook SHALL return the same cached array reference, preventing unnecessary re-renders and infinite loops.

**Validates: Requirements 2.1, 2.3, 2.4**

Property 2: Preservation - Reactivity to Data Changes

_For any_ change to the sessionMetadata Map (additions, deletions, or modifications to id/status/updatedAt), the fixed hook SHALL create and cache a new array reference, ensuring the component re-renders to reflect the changes and preserving existing reactivity behavior.

**Validates: Requirements 3.1, 3.2, 3.3, 3.4**

## Fix Implementation

### Changes Required

Assuming our root cause analysis is correct:

**File**: `src/stores/conversationStore/sessionStoreManager.ts`

**Function**: `useSessionMetadataList`

**Specific Changes**:
1. **Add Cache Variables**: Introduce module-level variables to cache the previous Map reference and the computed array
   - `let cachedMetadataMap: Map<string, SessionMetadata> | null = null`
   - `let cachedMetadataArray: SessionMetadata[] | null = null`

2. **Implement Caching Logic in Selector**: Modify the selector function to check if the Map reference has changed before creating a new array
   - Compare current Map reference with cached Map reference
   - If same reference, return cached array
   - If different reference, create new array and update cache

3. **Preserve Equality Function**: Keep the existing custom equality function unchanged to maintain the same comparison semantics for when new arrays are created

4. **Handle Edge Cases**: Ensure caching works correctly for:
   - Initial render (null cache)
   - Empty sessions list
   - Rapid successive changes

5. **Alternative Approach (if needed)**: If module-level caching proves insufficient, consider using a WeakMap keyed by the Map instance or implementing a memoization helper function

## Testing Strategy

### Validation Approach

The testing strategy follows a two-phase approach: first, surface counterexamples that demonstrate the bug on unfixed code, then verify the fix works correctly and preserves existing behavior.

### Exploratory Bug Condition Checking

**Goal**: Surface counterexamples that demonstrate the bug BEFORE implementing the fix. Confirm or refute the root cause analysis. If we refute, we will need to re-hypothesize.

**Test Plan**: Write tests that render SessionTabs component and monitor render count. Run these tests on the UNFIXED code to observe infinite loop failures and confirm the root cause.

**Test Cases**:
1. **Basic Render Test**: Render SessionTabs with 2 sessions, monitor render count (will fail on unfixed code with "Maximum update depth exceeded")
2. **Re-render Test**: Render SessionTabs, trigger parent re-render without changing session data, verify render count stays low (will fail on unfixed code)
3. **Empty Sessions Test**: Render SessionTabs with 0 sessions, monitor render count (may fail on unfixed code)
4. **Rapid Re-renders Test**: Trigger multiple rapid re-renders without data changes (will fail on unfixed code)

**Expected Counterexamples**:
- Render count exceeds 50 (React's maximum update depth)
- Console error: "Maximum update depth exceeded"
- Possible causes: new array reference on every call, useSyncExternalStore triggering re-renders, custom equality function not preventing re-renders

### Fix Checking

**Goal**: Verify that for all inputs where the bug condition holds, the fixed function produces the expected behavior.

**Pseudocode:**
```
FOR ALL input WHERE isBugCondition(input) DO
  result := useSessionMetadataList_fixed()
  ASSERT same_reference_returned(result)
  ASSERT render_count_stable()
END FOR
```

### Preservation Checking

**Goal**: Verify that for all inputs where the bug condition does NOT hold, the fixed function produces the same result as the original function.

**Pseudocode:**
```
FOR ALL input WHERE NOT isBugCondition(input) DO
  ASSERT useSessionMetadataList_original(input) = useSessionMetadataList_fixed(input)
  ASSERT component_updates_on_data_change()
END FOR
```

**Testing Approach**: Property-based testing is recommended for preservation checking because:
- It generates many test cases automatically across the input domain
- It catches edge cases that manual unit tests might miss
- It provides strong guarantees that behavior is unchanged for all data-changing inputs

**Test Plan**: Observe behavior on UNFIXED code first for session metadata changes, then write property-based tests capturing that behavior.

**Test Cases**:
1. **Status Change Preservation**: Observe that changing session status from 'idle' to 'running' triggers re-render on unfixed code, then write test to verify this continues after fix
2. **Session Addition Preservation**: Observe that adding a new session updates the component on unfixed code, then write test to verify this continues after fix
3. **Session Deletion Preservation**: Observe that deleting a session updates the component on unfixed code, then write test to verify this continues after fix
4. **UpdatedAt Change Preservation**: Observe that changing updatedAt timestamp triggers re-render on unfixed code, then write test to verify this continues after fix

### Unit Tests

- Test that useSessionMetadataList returns same reference when Map hasn't changed
- Test that useSessionMetadataList returns new reference when Map has changed
- Test edge cases (empty list, single session, many sessions)
- Test that custom equality function still works correctly

### Property-Based Tests

- Generate random session metadata changes and verify component updates correctly
- Generate random sequences of renders without data changes and verify stable references
- Test across many scenarios with different session counts and state combinations

### Integration Tests

- Test full SessionTabs component render cycle with stable data
- Test SessionTabs with session status changes and verify updates
- Test SessionTabs with session additions/deletions and verify updates
