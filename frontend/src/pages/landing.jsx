import { Link, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import "../App.css"

function LandingPage() {
    let navigate = useNavigate();

    useEffect(() => {
    if(localStorage.getItem("token"))
        navigate("/home");
    },[])

    return ( 
        <div className="lp-container">
            <nav>
                <div>
                    <span style={{display: "flex", justifyContent: "center", alignItems: "center"}}>
                        <h1 className="brand-name">Video</h1>
                        <h1 className="brand-name" style={{color: "#ff9839"}}>Meet</h1>
                    </span>
                </div>
                <div>
                    <div id="nav-links">
                        <Link to="/joinasguest" className="link guest-link">Join as Guest</Link>
                        <Link to="/joinasguest" className="plus-btn">
                            <button>
                                <i class="lni lni-facetime"></i>
                            </button>
                        </Link>
                        <Link to ="/auth" className="link register-link">Register Now</Link>
                        <Link to="/auth" className="link">
                            <button>Login</button>
                        </Link>
                    </div>
                </div>
            </nav>
            <div className="lp-main">
                <div className="lp-line">
                    <div style={{width: "auto"}}>
                        <h1>
                        <span style={{color: "#ff9839"}}>Connect</span> with your <br/> Loved Ones
                    </h1>
                    <h3>Cover a distance by our video call app</h3>
                    <Link to="/auth">
                        <button>Get Started</button>
                    </Link>
                    </div>
                </div>
                <div className="lp-image">
                    <img src="/mobile.png" alt="" />
                </div>
                <div className="lp-image-mobile ">
                    <img src="/Monitor-bro.svg" alt="" />
                </div>
            </div>
        </div>
     );
}

export default LandingPage;