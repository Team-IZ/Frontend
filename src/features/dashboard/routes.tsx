import type { RouteObject } from 'react-router'
import DashboardScreen from './DashboardScreen'

export const dashboardRoutes: RouteObject[] = [{ path: '/dashboard', element: <DashboardScreen /> }]
