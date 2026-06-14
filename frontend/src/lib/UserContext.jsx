import { createContext, useContext } from 'react'

export const UserContext = createContext(null)
export const useCurrentUser = () => useContext(UserContext)
