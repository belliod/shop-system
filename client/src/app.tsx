import React from 'react';
import { Route, Routes } from 'react-router-dom';

import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import NotFound from './pages/NotFound/NotFound';
import LoginPage from './pages/Login/LoginPage';
import DashboardPage from './pages/Dashboard/DashboardPage';
import StoresPage from './pages/Stores/StoresPage';
import RevenuePage from './pages/Revenue/RevenuePage';
import UsersPage from './pages/Users/UsersPage';
import SettingsPage from './pages/Settings/SettingsPage';

const RoutesComponent = () => {
  return (
    <AuthProvider>
      <Routes>
        <Route path="login" element={<LoginPage />} />
        <Route
          element={
            <ProtectedRoute>
              <Layout />
            </ProtectedRoute>
          }
        >
          <Route index element={<DashboardPage />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="stores" element={<StoresPage />} />
          <Route path="revenue" element={<RevenuePage />} />
                  <Route
                    path="users"
                    element={
                      <ProtectedRoute roles={['admin']}>
                        <UsersPage />
                      </ProtectedRoute>
                    }
                  />
                  <Route
                    path="settings"
                    element={
                      <ProtectedRoute roles={['admin']}>
                        <SettingsPage />
                      </ProtectedRoute>
                    }
                  />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AuthProvider>
  );
};

export default RoutesComponent;
