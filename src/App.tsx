import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import AppRoutes from "./routes/AppRoutes";

async function loadPreline() {
  return import('preline/dist/index.js');
}

function App() {
  const location = useLocation();

  useEffect(() => {
    const initPreline = async () => {
      await loadPreline();

      if (
        window.HSStaticMethods &&
        typeof window.HSStaticMethods.autoInit === 'function'
      ) {
        window.HSStaticMethods.autoInit();
      }
    };

    initPreline();
  }, [location.pathname]);
  return <AppRoutes />;
}

export default App;
