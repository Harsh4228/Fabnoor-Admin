import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const ScrollToTop = () => {
    const { pathname } = useLocation();

    useEffect(() => {
        // Scroll the main window
        window.scrollTo(0, 0);

        // Then find the layout's main scroll container and scroll it too
        // We use a small timeout to ensure DOM is settled
        const timer = setTimeout(() => {
            const mainContent = document.querySelector('main');
            if (mainContent) {
                mainContent.scrollTo({ top: 0, behavior: 'instant' });
            }
        }, 0);

        return () => clearTimeout(timer);
    }, [pathname]);

    return null;
};

export default ScrollToTop;
