import React from 'react';
import Header from '../components/Header';
import Footer from '../components/Footer';
import CartDrawer from '../components/CartDrawer';
import { CartProvider } from '../context/CartContext';
import { ThemeProvider } from '../context/ThemeContext';

interface MainLayoutProps {
  children: React.ReactNode;
}

const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  return (
    <ThemeProvider>
      <CartProvider>
        <div className="flex flex-col min-h-screen bg-gray-50 font-sans text-gray-900">
          <Header />
          <main className="flex-grow">
            {children}
          </main>
          <Footer />
          <CartDrawer />
        </div>
      </CartProvider>
    </ThemeProvider>
  );
};

export default MainLayout;
