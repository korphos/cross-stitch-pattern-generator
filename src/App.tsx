import { useReducer } from 'react'
import { initialProject, projectReducer } from './lib/projectReducer'
import type { WizardStep } from './lib/types'
import { UploadStep } from './components/UploadStep'
import { GridAdjustStep } from './components/GridAdjustStep'
import { PaletteStep } from './components/PaletteStep'
import { PrintView } from './components/PrintView'
import { Stepper } from './components/Stepper'

function canNavigateTo(project: ReturnType<typeof projectReducer>, step: WizardStep): boolean {
  switch (step) {
    case 'upload':
      return true
    case 'adjust':
      return project.confirmedGrid !== null
    case 'palette':
    case 'print':
      return project.palette !== null
  }
}

function App() {
  const [project, dispatch] = useReducer(projectReducer, initialProject)

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="screen-only border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-5xl px-4 py-4">
          <h1 className="text-xl font-semibold text-gray-900">Cross-Stitch Pattern Generator</h1>
          <div className="mt-2">
            <Stepper
              step={project.step}
              canNavigateTo={(step) => canNavigateTo(project, step)}
              onSelect={(step) => dispatch({ type: 'GO_TO_STEP', step })}
            />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        {project.step === 'upload' && <UploadStep dispatch={dispatch} />}
        {project.step === 'adjust' && project.confirmedGrid && (
          <GridAdjustStep project={project} dispatch={dispatch} />
        )}
        {project.step === 'palette' && project.palette && <PaletteStep project={project} dispatch={dispatch} />}
        {project.step === 'print' && project.palette && <PrintView project={project} dispatch={dispatch} />}
      </main>
    </div>
  )
}

export default App
