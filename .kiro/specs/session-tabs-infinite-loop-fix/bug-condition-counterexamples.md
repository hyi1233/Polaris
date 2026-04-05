# Bug Condition Exploration - Counterexamples Found

## Test Execution Summary

**Date**: Test run on unfixed code
**Result**: All tests FAILED as expected - confirms bug exists
**Error**: "Maximum update depth exceeded. This can happen when a component repeatedly calls setState inside componentWillUpdate or componentDidUpdate. React limits the number of nested updates to prevent infinite loops."

## Counterexamples Documented

### 1. Basic Render with 2 Sessions
**Test**: `should render with stable render count for 2 sessions`
**Result**: FAILED with "Maximum update depth exceeded"
**Counterexample**: Rendering SessionTabs with 2 sessions triggers infinite loop
**Root Cause Confirmed**: New array reference created on every render causes infinite re-renders

### 2. Empty Sessions List (0 Sessions)
**Test**: `should handle empty sessions list without infinite loop`
**Result**: FAILED with "Maximum update depth exceeded"
**Counterexample**: Even with 0 sessions, the component enters infinite loop
**Root Cause Confirmed**: Array.from() creates new empty array reference on every call

### 3. Rapid Successive Re-renders
**Test**: `should handle rapid re-renders without data changes`
**Result**: FAILED with "Maximum update depth exceeded"
**Counterexample**: Multiple re-renders without data changes trigger infinite loop
**Root Cause Confirmed**: Each re-render calls getSnapshot, which creates new array reference

### 4. Property-Based Test - Any Number of Sessions
**Test**: `property: stable reference for any number of unchanged sessions`
**Result**: FAILED after 1 test
**Counterexample**: `[0]` - Failed with 0 sessions
**Fast-check Output**: 
```
Property failed after 1 tests
{ seed: 36208414, path: "0", endOnFailure: true }
Counterexample: [0]
Shrunk 0 time(s)
```
**Root Cause Confirmed**: Bug exists regardless of session count (0-5)

### 5. Stable Reference Test
**Test**: `should return stable reference when sessionMetadata Map is unchanged`
**Result**: FAILED with "Maximum update depth exceeded"
**Counterexample**: useSessionMetadataList does not return stable reference for unchanged data
**Root Cause Confirmed**: `Array.from(state.sessionMetadata.values())` creates new array on every call

## Root Cause Analysis Confirmation

The counterexamples confirm the hypothesized root cause:

1. ✅ **New Array Reference on Every Call**: `Array.from(state.sessionMetadata.values())` creates a new array instance every time the selector is called
2. ✅ **useSyncExternalStore Behavior**: React's `useSyncExternalStore` detects reference change and triggers re-render
3. ✅ **Infinite Loop**: Each re-render calls getSnapshot again, creating another new array reference
4. ✅ **Affects All Cases**: Bug occurs with 0 sessions, 2 sessions, and any number of sessions

## Expected Behavior After Fix

After implementing the caching mechanism:
- All tests should PASS
- Render count should be < 10 for all test cases
- No "Maximum update depth exceeded" errors
- Same array reference returned when sessionMetadata Map hasn't changed
- New array reference only when Map content actually changes

## Next Steps

1. ✅ Bug condition exploration complete - counterexamples documented
2. ⏭️ Implement caching fix in `useSessionMetadataList` hook
3. ⏭️ Re-run tests to verify fix works
4. ⏭️ Write preservation tests to ensure reactivity is maintained
