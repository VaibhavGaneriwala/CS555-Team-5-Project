import { useState, useEffect, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;
  token: string | null;
}

export function useAuth(requireAuth: boolean = true) {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    token: null,
  });
  const hasRedirected = useRef(false);

  useEffect(() => {
    let mounted = true;
    
    const checkAuth = async () => {
      try {
        const token = await AsyncStorage.getItem('token');
        
        if (!mounted) return;
        
        if (token) {
          setAuthState({
            isAuthenticated: true,
            isLoading: false,
            token,
          });
          hasRedirected.current = false;
        } else {
          setAuthState({
            isAuthenticated: false,
            isLoading: false,
            token: null,
          });
          
          if (requireAuth && !hasRedirected.current) {
            hasRedirected.current = true;
            setTimeout(() => {
              if (mounted) {
                try {
                  router.replace('/');
                } catch {
                }
              }
            }, 500);
          }
        }
      } catch (error) {
        if (!mounted) return;
        
        setAuthState({
          isAuthenticated: false,
          isLoading: false,
          token: null,
        });
        
        if (requireAuth && !hasRedirected.current) {
          hasRedirected.current = true;
          setTimeout(() => {
            if (mounted) {
              try {
                router.replace('/');
              } catch {
              }
            }
          }, 500);
        }
      }
    };

    const timer = setTimeout(checkAuth, 300);

    return () => {
      mounted = false;
      clearTimeout(timer);
    };
  }, [requireAuth]);

  return authState;
}
