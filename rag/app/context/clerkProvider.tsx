import { createContext, useContext } from "react";
import { useUser, useAuth } from "@clerk/clerk-react";

const AuthContext = createContext<any>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const { user, isLoaded, isSignedIn } = useUser();
  const { getToken } = useAuth(); // ✅ CORRECT SOURCE

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoaded,
        isSignedIn,
        clerkUserId: user?.id || null,
        getToken, // ✅ now works
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAppAuth = () => useContext(AuthContext);
