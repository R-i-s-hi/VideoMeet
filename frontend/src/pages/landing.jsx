import { Link } from "react-router";
import "../App.css"

function LandingPage() {
    return ( 
        <div className="lp-container">
            <nav>
                <div>
                    <h1 className="brand-name">VideoMeet</h1>
                </div>
                <div>
                    <div id="nav-links">
                        <Link to="/joinasguest" className="link">Join as Guest</Link>
                        <Link to ="/auth" className="link">Register Now</Link>
                        <Link to="/auth" className="link">
                            <button>Login</button>
                        </Link>
                    </div>
                </div>
            </nav>
            <div className="lp-main">
                <div>
                    <h1>
                        <span style={{color: "#ff9839"}}>Connect</span> with your <br/> Loved Ones
                    </h1>
                    <h3>Cover a distance by our video call app</h3>
                    <Link to="/auth">
                        <button>Get Started</button>
                    </Link>
                </div>
                <div>
                    <img style={{height: "34rem"}} src="/mobile.png" alt="" />
                </div>
            </div>
        </div>
     );
}

export default LandingPage;