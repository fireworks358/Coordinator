import { Routes, Route } from 'react-router-dom'
import TheatreDashboard from './TheatreDashboard.jsx'
import LunchRequestInput from './components/LunchRequestInput.jsx'
import LunchDisplayBoard from './components/LunchDisplayBoard.jsx'
import './App.css'

function App() {
  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<TheatreDashboard />} />
        <Route path="/lunch-request" element={<LunchRequestInput />} />
        <Route path="/lunch-display" element={<LunchDisplayBoard />} />
      </Routes>
    </div>
  )
}

export default App