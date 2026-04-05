# Bugfix Requirements Document

## Introduction

The SessionTabs component experiences an infinite render loop causing a "Maximum update depth exceeded" error. The root cause is in the `useSessionMetadataList` hook in `sessionStoreManager.ts:497`, where the selector function `(state) => Array.from(state.sessionMetadata.values())` creates a new array reference on every call. Despite having a custom equality function, zustand's `useStore` internally uses `useSyncExternalStore`, which requires the getSnapshot function to return a stable reference when the underlying data hasn't changed. The new array reference on each call triggers React to detect a change, causing a re-render, which calls getSnapshot again, creating an infinite loop.

## Bug Analysis

### Current Behavior (Defect)

1.1 WHEN SessionTabs component renders and calls useSessionMetadataList THEN the system creates a new array reference from `Array.from(state.sessionMetadata.values())` on every getSnapshot call

1.2 WHEN the getSnapshot function returns a new array reference THEN React's useSyncExternalStore detects a reference change and triggers a re-render

1.3 WHEN the re-render occurs THEN the system calls getSnapshot again, creating an infinite loop that results in "Maximum update depth exceeded" error

1.4 WHEN the infinite loop is triggered THEN the application crashes and the SessionTabs component becomes unusable

### Expected Behavior (Correct)

2.1 WHEN SessionTabs component renders and calls useSessionMetadataList THEN the system SHALL return a cached array reference when the underlying sessionMetadata Map has not changed

2.2 WHEN the sessionMetadata Map content changes (items added, removed, or modified) THEN the system SHALL create and cache a new array reference

2.3 WHEN getSnapshot is called multiple times with unchanged data THEN the system SHALL return the same cached array reference to prevent unnecessary re-renders

2.4 WHEN the SessionTabs component uses the hook THEN the system SHALL render successfully without infinite loops or crashes

### Unchanged Behavior (Regression Prevention)

3.1 WHEN session metadata is updated (status change, updatedAt change) THEN the system SHALL CONTINUE TO detect the change and update the component

3.2 WHEN sessions are added or removed THEN the system SHALL CONTINUE TO reflect these changes in the SessionTabs component

3.3 WHEN the custom equality function compares arrays THEN the system SHALL CONTINUE TO use the existing comparison logic (checking length, id, status, and updatedAt)

3.4 WHEN other components use useSessionMetadataList THEN the system SHALL CONTINUE TO provide them with the correct session metadata list
