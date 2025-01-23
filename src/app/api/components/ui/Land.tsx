import React from 'react'
import {
    SignInButton
  } from '@clerk/nextjs'

const Land = () => {
  return (
    <div>
        <div className='w-[100svw] h-[100svh] bg-black fle-col items-center justify-center'>

        
        <h1 className='text-3xl items-center'>Finding difficulty in Reading the long  documentations</h1>
        <div className='bg-orange-400 w-1/4 p-4'>
        <SignInButton/>
        </div>
        </div>

        
    </div>
  )
}

export default Land