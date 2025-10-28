import React, { createContext, useContext, useEffect, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface User {
  id: string;
  name: string;
  email: string;
  password: string;
  profilePicture?: string;
  age?: string;
  height?: string;
  weight?: string;
  bloodGroup?: string;
  foodAllergy?: string;
}

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; message: string }>;
  signUp: (name: string, email: string, password: string) => Promise<{ success: boolean; message: string }>;
  signOut: () => Promise<void>;
  updateUser: (updates: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    try {
      const userData = await AsyncStorage.getItem('user');
      if (userData) {
        const parsedUser = JSON.parse(userData);
        setUser(parsedUser);
      }
    } catch (error) {
      console.error('Error loading user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const usersData = await AsyncStorage.getItem('users');
      if (!usersData) {
        return { success: false, message: 'Invalid email or password.' };
      }

      const users: User[] = JSON.parse(usersData);
      const foundUser = users.find(u => u.email === email);
      
      if (!foundUser) {
        return { success: false, message: 'Invalid email or password.' };
      }

      // Check if password matches (in a real app, you'd hash the password and compare hashes)
      if (foundUser.password !== password) {
        return { success: false, message: 'Invalid email or password.' };
      }

      console.log('Sign in successful, setting user:', foundUser);
      setUser(foundUser);
      await AsyncStorage.setItem('user', JSON.stringify(foundUser));
      console.log('User saved to AsyncStorage');
      return { success: true, message: 'Sign in successful!' };
    } catch (error) {
      return { success: false, message: 'An error occurred during sign in.' };
    }
  };

  const signUp = async (name: string, email: string, password: string) => {
    try {
      const usersData = await AsyncStorage.getItem('users');
      const users: User[] = usersData ? JSON.parse(usersData) : [];

      // Check if user already exists
      const existingUser = users.find(u => u.email === email);
      if (existingUser) {
        return { success: false, message: 'Account already exists.' };
      }

      const newUser: User = {
        id: Date.now().toString(),
        name,
        email,
        password,
      };

      users.push(newUser);
      await AsyncStorage.setItem('users', JSON.stringify(users));
      console.log('Sign up successful, setting user:', newUser);
      setUser(newUser);
      await AsyncStorage.setItem('user', JSON.stringify(newUser));
      console.log('User saved to AsyncStorage');
      
      return { success: true, message: 'Account created successfully!' };
    } catch (error) {
      return { success: false, message: 'An error occurred during sign up.' };
    }
  };

  const signOut = async () => {
    try {
      await AsyncStorage.removeItem('user');
      setUser(null);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const updateUser = async (updates: Partial<User>) => {
    if (!user) return;

    try {
      const updatedUser = { ...user, ...updates };
      setUser(updatedUser);
      await AsyncStorage.setItem('user', JSON.stringify(updatedUser));

      // Also update in users array
      const usersData = await AsyncStorage.getItem('users');
      if (usersData) {
        const users: User[] = JSON.parse(usersData);
        const userIndex = users.findIndex(u => u.id === user.id);
        if (userIndex !== -1) {
          users[userIndex] = updatedUser;
          await AsyncStorage.setItem('users', JSON.stringify(users));
        }
      }
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      isLoading,
      signIn,
      signUp,
      signOut,
      updateUser,
    }}>
      {children}
    </AuthContext.Provider>
  );
};
