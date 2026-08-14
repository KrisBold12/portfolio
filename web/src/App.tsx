import { Route, Routes } from 'react-router-dom'
import Home from './pages/Home'
import DogBreedProject from './pages/DogBreedProject'
import ReadoutRailDemo from './pages/ReadoutRailDemo'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/projects/dog-breed" element={<DogBreedProject />} />
      {/* TEMPORARY — Task 2's "done when" route. Removed by Task 6
          (Responsive, accessibility and motion pass), which deletes any
          scaffolding left from earlier tasks. */}
      <Route path="/dev/readout-rail" element={<ReadoutRailDemo />} />
    </Routes>
  )
}

export default App
