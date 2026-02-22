import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';

export interface User {
  id: string;
  name: string;
  email: string;
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

const toAppUser = (supabaseUser: SupabaseUser, profile?: any): User => ({
  id: supabaseUser.id,
  name: profile?.name || supabaseUser.user_metadata?.name || supabaseUser.email?.split('@')[0] || '',
  email: supabaseUser.email || '',
  profilePicture: profile?.profile_picture,
  age: profile?.age?.toString(),
  height: profile?.height?.toString(),
  weight: profile?.weight?.toString(),
  bloodGroup: profile?.blood_group,
  foodAllergy: profile?.food_allergy,
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Check for existing session on startup
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        loadProfile(session.user);
      } else {
        setIsLoading(false);
      }
    });

    // Listen for auth state changes (sign in, sign out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        loadProfile(session.user);
      } else {
        setUser(null);
        setIsLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const loadProfile = async (supabaseUser: SupabaseUser) => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', supabaseUser.id)
        .single();
      setUser(toAppUser(supabaseUser, profile));
    } catch {
      setUser(toAppUser(supabaseUser));
    } finally {
      setIsLoading(false);
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { success: false, message: error.message };
      return { success: true, message: 'Sign in successful!' };
    } catch {
      return { success: false, message: 'An error occurred during sign in.' };
    }
  };

  const signUp = async (name: string, email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { name } },
      });
      if (error) return { success: false, message: error.message };
      return { success: true, message: 'Account created successfully!' };
    } catch {
      return { success: false, message: 'An error occurred during sign up.' };
    }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  const updateUser = async (updates: Partial<User>) => {
    if (!user) return;
    try {
      await supabase
        .from('profiles')
        .update({
          name: updates.name,
          profile_picture: updates.profilePicture,
          age: updates.age,
          height: updates.height,
          weight: updates.weight,
          blood_group: updates.bloodGroup,
          food_allergy: updates.foodAllergy,
        })
        .eq('id', user.id);
      setUser({ ...user, ...updates });
    } catch (error) {
      console.error('Error updating user:', error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signUp, signOut, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};
