import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";

function App() {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Navigate to="/login" replace />;
}

export default App;