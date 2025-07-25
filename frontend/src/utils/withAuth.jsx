import { useEffect } from "react";
import { useNavigate } from "react-router";

const withAuth = (WrappedComponent) => {
    const AuthComponent = (props) => {
        const router = useNavigate();

        const isAuth = () => {
            if(localStorage.getItem("token")) {
                return true;
            }
            return false;
        }

        useEffect(() => {
            if(!isAuth) {
                router("/auth");
            }
        }, []);  
        
        return <WrappedComponent {...props} />;
    }
    return AuthComponent;
}

export default withAuth;