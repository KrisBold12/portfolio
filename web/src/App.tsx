import { Navigate, Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import DogBreedProject from './pages/DogBreedProject'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/projects/dog-breed" element={<DogBreedProject />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default App
