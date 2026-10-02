import { APP_NAME } from "@/lib/constants";

const Footer = () => {
    const currentYear = new Date().getFullYear();
    
    
    return (
        <footer className="w-full border-t">
            <div className="wrapper flex-between">
                <span className="text-sm text-muted-foreground">
                    &copy; {currentYear} {APP_NAME}. All rights reserved.
                </span>
            </div>
        </footer>
    );
}

export default Footer;