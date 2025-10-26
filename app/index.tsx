// app/index.tsx - This file handles authentication redirection
import { Redirect } from 'expo-router';
// ⚠️ IMPORTANT: Replace this line with the actual path and name of your auth hook or context
// import { useAuth } from '../hooks/useAuth'; 

export default function AuthRedirector() {
  
  // ⚠️ TEMPORARY DUMMY LOGIC: Replace these lines with your actual authentication check
  // You need a way to check if a valid session/token is stored in local storage.
  const isAuthenticated = true; // <--- This MUST be replaced with your state (e.g., useAuth().isAuthenticated)
  const isLoading = false;      // <--- This MUST be replaced with your state (e.g., useAuth().isLoading)
  
  // 1. Show a loading state while checking saved credentials (session/token)
  if (isLoading) {
    return null; // You can replace 'null' with a small loading indicator component
  }

  // 2. If the user is logged in, redirect them immediately to the main tabs screen
  if (isAuthenticated) {
    // This redirects to your (tabs) group's default screen (usually app/(tabs)/index.tsx)
    return <Redirect href="/(tabs)" />; 
  }
  
  // 3. If the user is NOT logged in, redirect them to your public login/onboarding screen
  else {
    return <Redirect href="/login" />; // Assumes you have an app/login.tsx file
  }
}