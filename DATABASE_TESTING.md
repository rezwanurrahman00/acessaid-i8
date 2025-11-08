# Database Testing Guide

## Quick Start - Test from Your App

Since AsyncStorage only works in React Native/Expo environment, you need to test from within your app.

### Method 1: Add Temporary Test Button (Recommended)

Add this to your ProfileScreen temporarily (you can remove it after testing):

1. **Add import at the top of ProfileScreen.tsx:**
```typescript
import { runDatabaseTests } from '../utils/databaseTest';
```

2. **Add this function inside your ProfileScreen component:**
```typescript
const testDatabase = async () => {
  Alert.alert(
    'Database Test',
    'This will clear all app data and run tests. Continue?',
    [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Run Tests',
        onPress: async () => {
          const results = await runDatabaseTests(true);
          console.log('Test Results:', results);
        },
      },
    ]
  );
};
```

3. **Add a test button in your ProfileScreen JSX (temporarily):**
```typescript
<ModernButton
  title="Test Database"
  onPress={testDatabase}
  style={{ marginTop: 20, backgroundColor: '#6366f1' }}
/>
```

4. **Run your app and tap the "Test Database" button**
5. **Check the console/logs for detailed test results**
6. **Remove the button and import after testing**

### Method 2: Test from React Native Debugger Console ✅ READY TO USE

**Setup is complete!** The test function is now available globally.

1. **Start your app:**
   ```bash
   cd acessaid-i8
   npx expo start
   ```

2. **Open the console:**
   - Press `j` in Expo terminal to open debugger
   - Or open `http://localhost:19002` in browser
   - Or shake device and select "Debug"
   - Or use Metro bundler terminal (where expo start is running)

3. **Run the tests in console:**
   ```javascript
   // Clear storage and run all tests
   runDatabaseTests(true)
   
   // Or keep existing data
   runDatabaseTests(false)
   ```

4. **View results:**
   - Check console for detailed output
   - Alert dialog will appear in app with summary

## What Gets Tested

The test suite verifies:

1. **User Storage** - Save, retrieve, and update user data
2. **Users Directory** - Manage multiple users  
3. **Reminders Storage** - Full CRUD operations (Create, Read, Update, Delete)
4. **Accessibility Settings** - Save and retrieve settings
5. **Setup Flag** - Store setup completion status
6. **Data Persistence** - Verify data persists correctly

## Test Results

The test will output to console:
- ✅ Pass/Fail status for each test
- Summary statistics (total tests, passed, failed, pass rate)
- Alert dialog with summary

## Important Notes

⚠️ **The test clears AsyncStorage before running** - This ensures clean test conditions but will delete all your app data. Only run this for testing purposes!

## For Capstone Project

This test utility:
- ✅ Doesn't require modifying your main app code permanently
- ✅ Can be added temporarily for testing
- ✅ Provides clear pass/fail results
- ✅ Can be included in your project documentation
- ✅ Demonstrates database functionality testing
- ✅ Works in React Native/Expo environment

## Example Test Output

```
========================================
   ACCESS AID DATABASE TEST SUITE
========================================

📦 Testing User Storage...
✅ Save User: User saved successfully
✅ Retrieve User: User retrieved correctly
✅ Update User: User updated successfully

📦 Testing Reminders Storage...
✅ Save Reminders: Reminders saved
✅ Retrieve Reminders: Reminders retrieved correctly
...

========================================
   TEST SUMMARY
========================================
Total Tests: 18
✅ Passed: 18
❌ Failed: 0
Pass Rate: 100.0%
========================================
```

