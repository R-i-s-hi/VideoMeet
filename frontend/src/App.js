import './App.css';
import {BrowserRouter, Routes, Route} from 'react-router-dom';
import LandingPage from './pages/landing.jsx';
import Authentication from './pages/authentication.jsx';
import VideoMeetComponent from './pages/VideoMeet.jsx';
import { AuthProvider } from './contexts/authContext.jsx';

function App() {
  return (
    <>
    
      <BrowserRouter>
        <AuthProvider>
          
          <Routes>

            <Route path="/" element={<LandingPage />} />
            <Route path="/auth" element={<Authentication />} />
            <Route path='/:url' element={<VideoMeetComponent />} />
          </Routes>

        </AuthProvider>
      </BrowserRouter>

    </>
  );
}

export default App;
