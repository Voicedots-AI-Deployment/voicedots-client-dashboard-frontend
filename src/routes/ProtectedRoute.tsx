import { Navigate, Outlet, useLocation } from "react-router-dom";

const isAuthenticated = () => {
  return !!localStorage.getItem("access_token");
};

const ProtectedRoute = () => {
  const location = useLocation();
  const isAuth = isAuthenticated();

  if (!isAuth) {
    return (
      <Navigate
        to="/login"
        replace
        state={{ from: location }}
      />
    );
  }

  return <Outlet />;
};

export default ProtectedRoute;