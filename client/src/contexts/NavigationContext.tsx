import React, { createContext, useContext, useState, useCallback, useEffect } from "react";
import { useLocation } from "wouter";

export interface PageState {
  path: string;
  title: string;
  timestamp: number;
  scrollPosition?: number;
  state?: Record<string, any>;
}

type ReferrerSource = "dashboard" | "projects" | null;

interface NavigationContextType {
  getReferrerSource: () => ReferrerSource;
  setReferrerSource: (source: ReferrerSource) => void;
  pageStack: PageState[];
  currentPage: PageState | null;
  canGoBack: boolean;
  goBack: () => void;
  navigateTo: (path: string, title: string, state?: Record<string, any>) => void;
  saveScrollPosition: (position: number) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export function NavigationProvider({ children }: { children: React.ReactNode }) {
  const [, setLocation] = useLocation();
  const [pageStack, setPageStack] = useState<PageState[]>([]);
  const [currentPage, setCurrentPage] = useState<PageState | null>(null);
  const [isBackNavigation, setIsBackNavigation] = useState(false);

  // Initialize with current page
  useEffect(() => {
    const currentPath = window.location.pathname;
    const title = document.title || "Page";
    
    if (!currentPage || currentPage.path !== currentPath) {
      const newPage: PageState = {
        path: currentPath,
        title,
        timestamp: Date.now(),
        scrollPosition: 0,
      };
      
      setCurrentPage(newPage);
      
      // Only add to stack if it's not the first page or if it's different from the last page
      if (pageStack.length === 0 || pageStack[pageStack.length - 1].path !== currentPath) {
        setPageStack([...pageStack, newPage]);
      }
    }
  }, []);

  const getReferrerSource = (): ReferrerSource => {
    const state = window.history.state;
    return state?.referrerSource || null;
  };

  const setReferrerSource = (source: ReferrerSource) => {
    window.history.replaceState(
      { ...window.history.state, referrerSource: source },
      ""
    );
  };

  const saveScrollPosition = useCallback((position: number) => {
    if (currentPage) {
      const updatedPage = { ...currentPage, scrollPosition: position };
      setCurrentPage(updatedPage);
      
      // Update in stack
      setPageStack(prevStack => {
        const newStack = [...prevStack];
        if (newStack.length > 0) {
          newStack[newStack.length - 1] = updatedPage;
        }
        return newStack;
      });
    }
  }, [currentPage]);

  const navigateTo = useCallback((path: string, title: string, state?: Record<string, any>) => {
    const newPage: PageState = {
      path,
      title,
      timestamp: Date.now(),
      scrollPosition: 0,
      state,
    };

    // Add to stack only if different from current page
    if (!currentPage || currentPage.path !== path) {
      setPageStack(prevStack => [...prevStack, newPage]);
      setCurrentPage(newPage);
      setIsBackNavigation(false);
      setLocation(path);
      
      // Scroll to top when navigating to a new page
      window.scrollTo(0, 0);
    }
  }, [currentPage, setLocation]);

  const canGoBack = pageStack.length > 1;

  const goBack = useCallback(() => {
    if (pageStack.length > 1) {
      const newStack = [...pageStack];
      newStack.pop(); // Remove current page
      const previousPage = newStack[newStack.length - 1];
      
      setPageStack(newStack);
      setCurrentPage(previousPage);
      setIsBackNavigation(true);
      setLocation(previousPage.path);
      
      // Restore scroll position after a small delay to ensure DOM is ready
      setTimeout(() => {
        if (previousPage.scrollPosition) {
          window.scrollTo(0, previousPage.scrollPosition);
        }
      }, 100);
    }
  }, [pageStack, setLocation]);

  // Listen for browser back button
  useEffect(() => {
    const handlePopState = () => {
      if (pageStack.length > 1) {
        goBack();
      }
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, [pageStack, goBack]);

  return (
    <NavigationContext.Provider
      value={{
        getReferrerSource,
        setReferrerSource,
        pageStack,
        currentPage,
        canGoBack,
        goBack,
        navigateTo,
        saveScrollPosition,
      }}
    >
      {children}
    </NavigationContext.Provider>
  );
}

export function useNavigation() {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error("useNavigation must be used within NavigationProvider");
  }
  return context;
}
