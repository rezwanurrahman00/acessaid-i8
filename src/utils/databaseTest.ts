/**
 * Database Test Utility for AccessAid
 * 
 * This utility can be run from within your Expo app to test AsyncStorage.
 * 
 * Usage:
 *   1. Import this file in any screen (temporarily for testing)
 *   2. Call runDatabaseTests() from a button or useEffect
 *   3. Check console for results
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

interface TestResult {
  test: string;
  passed: boolean;
  message: string;
  error?: string;
}

const results: TestResult[] = [];

function logResult(test: string, passed: boolean, message: string, error?: string) {
  results.push({ test, passed, message, error });
  const icon = passed ? '✅' : '❌';
  console.log(`${icon} ${test}: ${message}`);
  if (error) {
    console.log(`   Error: ${error}`);
  }
}

// Test User Data
async function testUserStorage() {
  console.log('\n📦 Testing User Storage...');
  
  const testUser = {
    id: 'test-user-1',
    email: 'test@example.com',
    pin: '1234',
    name: 'Test User',
    bio: 'Test bio',
  };

  try {
    // Save user
    await AsyncStorage.setItem('user', JSON.stringify(testUser));
    logResult('Save User', true, 'User saved successfully');

    // Retrieve user
    const retrieved = await AsyncStorage.getItem('user');
    if (!retrieved) {
      logResult('Retrieve User', false, 'User not found');
      return;
    }

    const parsed = JSON.parse(retrieved);
    if (parsed.id === testUser.id && parsed.email === testUser.email) {
      logResult('Retrieve User', true, 'User retrieved correctly');
    } else {
      logResult('Retrieve User', false, 'Retrieved data does not match');
    }

    // Update user
    const updated = { ...testUser, name: 'Updated Name' };
    await AsyncStorage.setItem('user', JSON.stringify(updated));
    const checkUpdated = JSON.parse(await AsyncStorage.getItem('user')!);
    if (checkUpdated.name === 'Updated Name') {
      logResult('Update User', true, 'User updated successfully');
    } else {
      logResult('Update User', false, 'User update failed');
    }
  } catch (error: any) {
    logResult('User Storage', false, 'Test failed', error.message);
  }
}

// Test Users Directory
async function testUsersDirectory() {
  console.log('\n📦 Testing Users Directory...');

  const user1 = { id: 'user-1', email: 'user1@test.com', pin: '1111', name: 'User 1' };
  const user2 = { id: 'user-2', email: 'user2@test.com', pin: '2222', name: 'User 2' };

  try {
    // Initialize
    await AsyncStorage.setItem('users', JSON.stringify([user1]));
    logResult('Initialize Users', true, 'Users directory initialized');

    // Add user
    const usersRaw = await AsyncStorage.getItem('users');
    const users = usersRaw ? JSON.parse(usersRaw) : [];
    users.push(user2);
    await AsyncStorage.setItem('users', JSON.stringify(users));

    const checkUsers = JSON.parse(await AsyncStorage.getItem('users')!);
    if (checkUsers.length === 2) {
      logResult('Add User', true, 'User added to directory');
    } else {
      logResult('Add User', false, `Expected 2 users, found ${checkUsers.length}`);
    }
  } catch (error: any) {
    logResult('Users Directory', false, 'Test failed', error.message);
  }
}

// Test Reminders
async function testReminders() {
  console.log('\n📦 Testing Reminders Storage...');

  const userId = 'test-user-reminders';
  const reminder1 = {
    id: 'reminder-1',
    title: 'Test Reminder 1',
    description: 'Test description',
    date: new Date().toISOString(),
    time: new Date().toISOString(),
    isCompleted: false,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const reminder2 = {
    id: 'reminder-2',
    title: 'Test Reminder 2',
    description: 'Test description 2',
    date: new Date().toISOString(),
    time: new Date().toISOString(),
    isCompleted: false,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    const key = `reminders_${userId}`;

    // Save reminders
    await AsyncStorage.setItem(key, JSON.stringify([reminder1]));
    logResult('Save Reminders', true, 'Reminders saved');

    // Retrieve reminders
    const retrieved = await AsyncStorage.getItem(key);
    if (!retrieved) {
      logResult('Retrieve Reminders', false, 'Reminders not found');
      return;
    }

    const parsed = JSON.parse(retrieved);
    if (parsed.length === 1 && parsed[0].id === reminder1.id) {
      logResult('Retrieve Reminders', true, 'Reminders retrieved correctly');
    } else {
      logResult('Retrieve Reminders', false, 'Retrieved data does not match');
    }

    // Add reminder
    const updated = [...parsed, reminder2];
    await AsyncStorage.setItem(key, JSON.stringify(updated));
    const checkAdd = JSON.parse(await AsyncStorage.getItem(key)!);
    if (checkAdd.length === 2) {
      logResult('Add Reminder', true, 'Reminder added successfully');
    } else {
      logResult('Add Reminder', false, `Expected 2 reminders, found ${checkAdd.length}`);
    }

    // Update reminder
    const updatedReminder = { ...reminder1, title: 'Updated Reminder' };
    const updatedList = checkAdd.map((r: any) => r.id === reminder1.id ? updatedReminder : r);
    await AsyncStorage.setItem(key, JSON.stringify(updatedList));
    const checkUpdate = JSON.parse(await AsyncStorage.getItem(key)!);
    const found = checkUpdate.find((r: any) => r.id === reminder1.id);
    if (found && found.title === 'Updated Reminder') {
      logResult('Update Reminder', true, 'Reminder updated successfully');
    } else {
      logResult('Update Reminder', false, 'Reminder update failed');
    }

    // Delete reminder
    const withoutDeleted = checkUpdate.filter((r: any) => r.id !== reminder2.id);
    await AsyncStorage.setItem(key, JSON.stringify(withoutDeleted));
    const afterDelete = JSON.parse(await AsyncStorage.getItem(key)!);
    if (afterDelete.length === 1 && afterDelete[0].id === reminder1.id) {
      logResult('Delete Reminder', true, 'Reminder deleted successfully');
    } else {
      logResult('Delete Reminder', false, 'Reminder deletion failed');
    }
  } catch (error: any) {
    logResult('Reminders Storage', false, 'Test failed', error.message);
  }
}

// Test Accessibility Settings
async function testAccessibilitySettings() {
  console.log('\n📦 Testing Accessibility Settings...');

  const settings = {
    brightness: 75,
    textZoom: 150,
    voiceSpeed: 1.5,
    isDarkMode: true,
  };

  try {
    // Save settings
    await AsyncStorage.setItem('accessibilitySettings', JSON.stringify(settings));
    logResult('Save Settings', true, 'Settings saved');

    // Retrieve settings
    const retrieved = await AsyncStorage.getItem('accessibilitySettings');
    if (!retrieved) {
      logResult('Retrieve Settings', false, 'Settings not found');
      return;
    }

    const parsed = JSON.parse(retrieved);
    if (
      parsed.brightness === settings.brightness &&
      parsed.textZoom === settings.textZoom &&
      parsed.voiceSpeed === settings.voiceSpeed &&
      parsed.isDarkMode === settings.isDarkMode
    ) {
      logResult('Retrieve Settings', true, 'Settings retrieved correctly');
    } else {
      logResult('Retrieve Settings', false, 'Retrieved settings do not match');
    }

    // Update settings
    const updated = { ...settings, brightness: 90 };
    await AsyncStorage.setItem('accessibilitySettings', JSON.stringify(updated));
    const checkUpdate = JSON.parse(await AsyncStorage.getItem('accessibilitySettings')!);
    if (checkUpdate.brightness === 90) {
      logResult('Update Settings', true, 'Settings updated successfully');
    } else {
      logResult('Update Settings', false, 'Settings update failed');
    }
  } catch (error: any) {
    logResult('Accessibility Settings', false, 'Test failed', error.message);
  }
}

// Test Setup Flag
async function testSetupFlag() {
  console.log('\n📦 Testing Setup Flag...');

  try {
    // Save flag
    await AsyncStorage.setItem('hasCompletedSetup', JSON.stringify(true));
    logResult('Save Setup Flag', true, 'Setup flag saved');

    // Retrieve flag
    const retrieved = await AsyncStorage.getItem('hasCompletedSetup');
    if (retrieved && JSON.parse(retrieved) === true) {
      logResult('Retrieve Setup Flag', true, 'Setup flag retrieved correctly');
    } else {
      logResult('Retrieve Setup Flag', false, 'Setup flag not found or incorrect');
    }

    // Update flag
    await AsyncStorage.setItem('hasCompletedSetup', JSON.stringify(false));
    const updated = JSON.parse(await AsyncStorage.getItem('hasCompletedSetup')!);
    if (updated === false) {
      logResult('Update Setup Flag', true, 'Setup flag updated successfully');
    } else {
      logResult('Update Setup Flag', false, 'Setup flag update failed');
    }
  } catch (error: any) {
    logResult('Setup Flag', false, 'Test failed', error.message);
  }
}

// Test Data Persistence
async function testDataPersistence() {
  console.log('\n📦 Testing Data Persistence...');

  const testUser = {
    id: 'persistence-test',
    email: 'persist@test.com',
    pin: '1234',
    name: 'Persistence Test',
  };

  const reminder = {
    id: 'persist-reminder',
    title: 'Persist Test',
    date: new Date().toISOString(),
    time: new Date().toISOString(),
    isCompleted: false,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  try {
    // Save all data
    await AsyncStorage.setItem('user', JSON.stringify(testUser));
    await AsyncStorage.setItem(`reminders_${testUser.id}`, JSON.stringify([reminder]));
    await AsyncStorage.setItem('accessibilitySettings', JSON.stringify({
      brightness: 50,
      textZoom: 100,
      voiceSpeed: 1.0,
      isDarkMode: false,
    }));

    // Simulate app restart - read all data back
    const savedUser = await AsyncStorage.getItem('user');
    const savedReminders = await AsyncStorage.getItem(`reminders_${testUser.id}`);
    const savedSettings = await AsyncStorage.getItem('accessibilitySettings');

    if (savedUser && savedReminders && savedSettings) {
      const parsedUser = JSON.parse(savedUser);
      const parsedReminders = JSON.parse(savedReminders);
      const parsedSettings = JSON.parse(savedSettings);

      if (
        parsedUser.id === testUser.id &&
        parsedReminders.length === 1 &&
        parsedReminders[0].id === reminder.id &&
        parsedSettings.brightness === 50
      ) {
        logResult('Data Persistence', true, 'All data persisted correctly');
      } else {
        logResult('Data Persistence', false, 'Data persistence check failed');
      }
    } else {
      logResult('Data Persistence', false, 'Some data was not persisted');
    }
  } catch (error: any) {
    logResult('Data Persistence', false, 'Test failed', error.message);
  }
}

// Main test runner
export async function runDatabaseTests(clearStorage: boolean = true) {
  // Clear results array
  results.length = 0;

  console.log('========================================');
  console.log('   ACCESS AID DATABASE TEST SUITE');
  console.log('========================================\n');

  // Clear storage before testing if requested
  if (clearStorage) {
    try {
      await AsyncStorage.clear();
      console.log('🧹 Storage cleared for clean testing\n');
    } catch (error) {
      console.log('⚠️  Could not clear storage\n');
    }
  }

  // Run all tests
  await testUserStorage();
  await testUsersDirectory();
  await testReminders();
  await testAccessibilitySettings();
  await testSetupFlag();
  await testDataPersistence();

  // Print summary
  console.log('\n========================================');
  console.log('   TEST SUMMARY');
  console.log('========================================');
  
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const passRate = total > 0 ? ((passed / total) * 100).toFixed(1) : '0';

  console.log(`Total Tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Pass Rate: ${passRate}%`);
  console.log('========================================\n');

  // Show alert with summary
  Alert.alert(
    'Database Tests Complete',
    `Total: ${total}\n✅ Passed: ${passed}\n❌ Failed: ${failed}\nPass Rate: ${passRate}%`,
    [{ text: 'OK' }]
  );

  return {
    total,
    passed,
    failed,
    passRate: parseFloat(passRate),
    results: [...results],
  };
}

