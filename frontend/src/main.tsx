import {StrictMode} from 'react'
import ReactDOM from 'react-dom/client'
import { createRouter } from '@tanstack/react-router'
import { QueryClient } from '@tanstack/react-query'
import { routeTree } from './routeTree.gen'
import './index.css'
import App from "./App.tsx";


// Initialize query client and router
export const queryClient = new QueryClient()
export const router = createRouter({ routeTree })

declare module '@tanstack/react-router' {
    interface Register {
        router: typeof router
    }
}

const rootElement = document.getElementById('root')!
if (!rootElement.innerHTML) {
    const root = ReactDOM.createRoot(rootElement)
    root.render(
        <StrictMode>
            <App />
        </StrictMode>
    )
}